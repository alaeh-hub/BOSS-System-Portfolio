import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';

/* ============================================================
   Hero backdrop: dependency-graph constellation (three.js / WebGL)

   What it is: a few hundred nodes laid out on nested shells, wired
   to their nearest neighbours, with signals running along a subset
   of the edges. It is the product thesis as wallpaper. Operational
   systems are a graph of dependencies with work moving through them,
   so the backdrop says what the headline says.

   How it stays cheap:
     - Node drift, edge signals and all fading live in GLSL. The
       per-frame CPU work is two rotations and three lerps; nothing
       touches a geometry buffer after init.
     - Two draw calls carry the whole field (one Points, one
       LineSegments), plus dust and the outer shell.
     - The loop is torn down, not just skipped, when the hero
       scrolls out of view or the tab is backgrounded.
     - Density and pixel-ratio cap step down on small screens and
       low-core devices.

   How it stays accessible:
     - prefers-reduced-motion renders exactly one frame. The
       composition survives, the movement does not.
     - Decorative throughout: aria-hidden, pointer-events none, and
       the CSS gradient underneath is the fallback when WebGL is
       missing or the context is lost.

   COLOR LOCK: the accent only. Values are written in sRGB and
   passed as plain vec3 uniforms rather than THREE.Color, so three's
   colour management cannot shift them out from under the design.
   ============================================================ */

const ACCENT = [1.0, 0.839, 0.039]; /* --y-500 #ffd60a */
const DEEP = [1.0, 0.722, 0.0]; /* --y-600 #ffb800 */
const HOT = [1.0, 0.972, 0.858]; /* --y-200, near white at the core */

/* Layout constants. A hero is a wide, short box, so the field is a
   wide slab rather than a ball: stretched hard in x, flattened in y,
   and only moderately deep so the parallax tilt reads as depth
   instead of as something spinning on a turntable.

   FIELD_X / FIELD_Y are the half-extents the camera framing below is
   solved against, so changing RADIUS or SPREAD re-frames the shot
   instead of leaving the graph stranded in the middle of the box. */
const RADIUS = 19;
const SPREAD = [2.3, 0.74, 0.98];
const MAX_LINK = 11;
const FOV = 52;
const FIELD_X = RADIUS * SPREAD[0];
const FIELD_Y = RADIUS * SPREAD[1];

/* Deterministic layout. A fixed seed means the composition is a
   decision rather than a per-visit lottery, and a graph that looked
   right in review looks the same in production. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Fibonacci sphere for even angular coverage, pushed out to one of a
   continuum of shells and jittered, so the result reads as a layered
   graph rather than a shrink-wrapped surface. */
function layout(count, rng) {
  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const shell = 0.4 + 0.6 * Math.pow(rng(), 0.7);
    const r = RADIUS * shell;

    pos[i * 3] = Math.cos(theta) * ring * r * SPREAD[0] + (rng() - 0.5) * 2.4;
    pos[i * 3 + 1] = y * r * SPREAD[1] + (rng() - 0.5) * 2.4;
    pos[i * 3 + 2] = Math.sin(theta) * ring * r * SPREAD[2] + (rng() - 0.5) * 2.4;
    seeds[i] = rng();
  }
  return { pos, seeds };
}

/* k-nearest-neighbour wiring, capped by distance so the far shells do
   not reach across the middle. O(n^2) once at init: 300 nodes is 90k
   comparisons, well under a frame, and buys a far better graph than
   any cheaper heuristic. */
function wire(pos, count, k) {
  const edges = [];
  const taken = new Set();
  const degree = new Uint16Array(count);
  const best = [];

  for (let i = 0; i < count; i++) {
    best.length = 0;
    const ax = pos[i * 3];
    const ay = pos[i * 3 + 1];
    const az = pos[i * 3 + 2];

    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const dx = ax - pos[j * 3];
      const dy = ay - pos[j * 3 + 1];
      const dz = az - pos[j * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > MAX_LINK * MAX_LINK) continue;
      best.push([d2, j]);
    }

    best.sort((a, b) => a[0] - b[0]);
    for (let n = 0; n < Math.min(k, best.length); n++) {
      const j = best[n][1];
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (taken.has(key)) continue;
      taken.add(key);
      edges.push([i, j, Math.sqrt(best[n][0])]);
      degree[i]++;
      degree[j]++;
    }
  }
  return { edges, degree };
}

/* Shared between the node and edge vertex shaders. Both have to apply
   the identical displacement from the identical seed, or the lines
   detach from the nodes they connect. */
const DRIFT = `
  vec3 drift(vec3 p, float seed, float t) {
    float a = seed * 6.2831853;
    return p + vec3(
      sin(t * 0.48 + a) * 0.26,
      cos(t * 0.39 + a * 1.7) * 0.26,
      sin(t * 0.31 + a * 2.3) * 0.26
    );
  }
`;

const NODE_VERT = `
  attribute float aSize;
  attribute float aSeed;
  attribute float aBright;
  uniform float uTime;
  uniform float uScale;
  varying float vBright;
  varying float vFade;
  ${DRIFT}
  void main() {
    vec4 mv = modelViewMatrix * vec4(drift(position, aSeed, uTime), 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = -mv.z;
    float beat = 0.76 + 0.24 * sin(uTime * 1.9 + aSeed * 11.0);
    gl_PointSize = min(aSize * beat * uScale / depth, 96.0);

    vBright = aBright * beat;
    vFade = smoothstep(96.0, 26.0, depth);
  }
`;

const NODE_FRAG = `
  uniform vec3 uAccent;
  uniform vec3 uHot;
  varying float vBright;
  varying float vFade;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float halo = pow(1.0 - d * 2.0, 2.4);
    float core = smoothstep(0.17, 0.0, d);
    vec3 c = mix(uAccent, uHot, core);
    gl_FragColor = vec4(c, (halo * 0.8 + core * 1.0) * vBright * vFade);
  }
`;

/* Edges carry their own travelling signal. A moving head in the
   fragment shader costs nothing and keeps the pulse welded to the
   line, where separate pulse geometry would need per-frame CPU work
   and would drift off the edge the moment the node drift kicks in.
   aFlow of zero means an inert edge, which most of them are. */
const LINE_VERT = `
  attribute float aSeed;
  attribute float aAlpha;
  attribute float aT;
  attribute float aFlow;
  attribute float aPhase;
  uniform float uTime;
  varying float vAlpha;
  varying float vFade;
  varying float vT;
  varying float vFlow;
  varying float vPhase;
  ${DRIFT}
  void main() {
    vec4 mv = modelViewMatrix * vec4(drift(position, aSeed, uTime), 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = aAlpha;
    vFade = smoothstep(96.0, 26.0, -mv.z);
    vT = aT;
    vFlow = aFlow;
    vPhase = aPhase;
  }
`;

const LINE_FRAG = `
  uniform float uTime;
  uniform vec3 uAccent;
  uniform vec3 uDeep;
  uniform vec3 uHot;
  varying float vAlpha;
  varying float vFade;
  varying float vT;
  varying float vFlow;
  varying float vPhase;
  void main() {
    vec3 c = mix(uDeep, uAccent, vT * 0.6 + 0.2);
    float a = vAlpha;

    /* Not "active": that is a reserved word in GLSL ES 3.0 and the
       whole shader fails to compile on it. */
    float isLive = step(0.0001, abs(vFlow));
    float head = fract(uTime * vFlow + vPhase);
    float d = abs(vT - head);
    d = min(d, 1.0 - d);
    float signal = exp(-d * d * 110.0) * isLive;

    c = mix(c, uHot, signal * 0.9);
    a += signal * 1.15;

    gl_FragColor = vec4(c, a * vFade);
  }
`;

const DUST_VERT = `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uScale;
  varying float vFade;
  varying float vBright;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(aSize * uScale / -mv.z, 14.0);
    vBright = 0.5 + 0.5 * sin(uTime * 0.6 + aSeed * 20.0);
    vFade = smoothstep(170.0, 40.0, -mv.z);
  }
`;

const DUST_FRAG = `
  uniform vec3 uAccent;
  varying float vFade;
  varying float vBright;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = pow(1.0 - d * 2.0, 2.0) * 0.4 * vBright * vFade;
    gl_FragColor = vec4(uAccent, a);
  }
`;

export default function AuraBackground({ progress = null, className = '' }) {
  const hostRef = useRef(null);
  const reduce = useReducedMotion();

  /* Scroll arrives as a MotionValue and is read inside the render
     loop. Writing it to a ref keeps the hero from re-rendering 60
     times a second to move a camera React does not own. */
  const scrollRef = useRef(0);
  useEffect(() => {
    if (!progress) return undefined;
    scrollRef.current = progress.get();
    return progress.on('change', (v) => {
      scrollRef.current = v;
    });
  }, [progress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const rawDpr = window.devicePixelRatio || 1;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        /* MSAA is the most expensive switch in here. Past ~1.5x the
           buffer is dense enough that the glow hides the stair-stepping
           it would have removed, so it only earns its cost at 1x. */
        antialias: rawDpr < 1.5,
        alpha: true,
        /* Nothing writes depth: every material below is additive with
           depthWrite off. Without this the context still allocates a
           depth attachment and clears it every frame for nothing. */
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
      });
    } catch {
      /* No WebGL. The gradient underneath is already the fallback. */
      return undefined;
    }

    const small = window.matchMedia('(max-width: 768px)').matches;
    const weak = small || (navigator.hardwareConcurrency || 8) <= 4;
    const NODES = weak ? 190 : 430;
    const NEIGHBOURS = weak ? 2 : 3;
    const DUST = weak ? 800 : 2400;

    /* Quality ladder, walked downwards only. This is a full-bleed
       additive field, so the cost is almost entirely fillrate, and the
       two knobs that matter are how many pixels there are and how much
       faint overdraw sits on top of them. Resolution goes first,
       because one step costs little visually; the dust layer goes
       before the final resolution drop, because losing a sparse haze
       reads better than a soft 1x canvas.

       Downgrade-only on purpose. Stepping back up invites a loop that
       oscillates between two tiers forever, and a backdrop that keeps
       changing sharpness is worse than one that settled a notch low. */
    const TIERS = weak
      ? [
          { dpr: 1.5, dust: true },
          { dpr: 1.25, dust: true },
          { dpr: 1.25, dust: false },
          { dpr: 1, dust: false },
        ]
      : [
          { dpr: 1.75, dust: true },
          { dpr: 1.35, dust: true },
          { dpr: 1.35, dust: false },
          { dpr: 1, dust: false },
        ];
    let tier = 0;

    renderer.setPixelRatio(Math.min(rawDpr, TIERS[0].dpr));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
    camera.position.set(0, 0, 44);

    const graph = new THREE.Group();
    scene.add(graph);

    const rng = mulberry32(0x50f7);
    const { pos, seeds } = layout(NODES, rng);
    const { edges, degree } = wire(pos, NODES, NEIGHBOURS);

    const uTime = { value: 0 };
    const uScale = { value: 900 };
    const uAccent = { value: new THREE.Vector3(...ACCENT) };
    const uDeep = { value: new THREE.Vector3(...DEEP) };
    const uHot = { value: new THREE.Vector3(...HOT) };

    /* ---- nodes ---- */
    let maxDegree = 1;
    for (let i = 0; i < NODES; i++) maxDegree = Math.max(maxDegree, degree[i]);

    const sizes = new Float32Array(NODES);
    const bright = new Float32Array(NODES);
    for (let i = 0; i < NODES; i++) {
      /* Hubs are the nodes the graph leans on. Reading them at a
         glance is the whole reason to wire by nearest neighbour
         rather than scatter unconnected points. */
      const hub = Math.pow(degree[i] / maxDegree, 2.2);
      sizes[i] = 0.3 + hub * 0.82 + rng() * 0.07;
      bright[i] = 0.52 + hub * 0.56 + rng() * 0.12;
    }

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    nodeGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    nodeGeo.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));

    const nodeMat = new THREE.ShaderMaterial({
      uniforms: { uTime, uScale, uAccent, uHot },
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    graph.add(new THREE.Points(nodeGeo, nodeMat));

    /* ---- edges ---- */
    const n = edges.length;
    const lPos = new Float32Array(n * 6);
    const lSeed = new Float32Array(n * 2);
    const lAlpha = new Float32Array(n * 2);
    const lT = new Float32Array(n * 2);
    const lFlow = new Float32Array(n * 2);
    const lPhase = new Float32Array(n * 2);

    for (let e = 0; e < n; e++) {
      const [a, b, len] = edges[e];
      for (let v = 0; v < 2; v++) {
        const src = v === 0 ? a : b;
        lPos[e * 6 + v * 3] = pos[src * 3];
        lPos[e * 6 + v * 3 + 1] = pos[src * 3 + 1];
        lPos[e * 6 + v * 3 + 2] = pos[src * 3 + 2];
        lSeed[e * 2 + v] = seeds[src];
        lT[e * 2 + v] = v;
      }

      /* Dimmer as edges get longer and as they get further from the
         middle, so the field has a centre of gravity instead of a
         uniform mesh that fights the headline for attention. */
      const mx = (pos[a * 3] + pos[b * 3]) * 0.5;
      const my = (pos[a * 3 + 1] + pos[b * 3 + 1]) * 0.5;
      const mz = (pos[a * 3 + 2] + pos[b * 3 + 2]) * 0.5;
      const out = Math.min(1, Math.hypot(mx, my, mz) / (RADIUS * 1.5));
      const alpha = (0.78 - out * 0.36) * (1 - (len / MAX_LINK) * 0.4);

      /* Roughly two edges in five carry traffic, at their own speed
         and direction. Every edge lighting up reads as noise. */
      const live = rng() < 0.4;
      const flow = live ? (0.15 + rng() * 0.3) * (rng() < 0.5 ? -1 : 1) : 0;
      const phase = rng();

      for (let v = 0; v < 2; v++) {
        lAlpha[e * 2 + v] = alpha;
        lFlow[e * 2 + v] = flow;
        lPhase[e * 2 + v] = phase;
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
    lineGeo.setAttribute('aSeed', new THREE.BufferAttribute(lSeed, 1));
    lineGeo.setAttribute('aAlpha', new THREE.BufferAttribute(lAlpha, 1));
    lineGeo.setAttribute('aT', new THREE.BufferAttribute(lT, 1));
    lineGeo.setAttribute('aFlow', new THREE.BufferAttribute(lFlow, 1));
    lineGeo.setAttribute('aPhase', new THREE.BufferAttribute(lPhase, 1));

    const lineMat = new THREE.ShaderMaterial({
      uniforms: { uTime, uAccent, uDeep, uHot },
      vertexShader: LINE_VERT,
      fragmentShader: LINE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    graph.add(new THREE.LineSegments(lineGeo, lineMat));

    /* ---- dust: a second, much deeper layer, so the mouse tilt has
            something to parallax the graph against ---- */
    const dPos = new Float32Array(DUST * 3);
    const dSize = new Float32Array(DUST);
    const dSeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dPos[i * 3] = (rng() - 0.5) * 320;
      dPos[i * 3 + 1] = (rng() - 0.5) * 130;
      dPos[i * 3 + 2] = (rng() - 0.5) * 150 - 30;
      dSize[i] = 0.05 + rng() * 0.09;
      dSeed[i] = rng();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
    const dustMat = new THREE.ShaderMaterial({
      uniforms: { uTime, uScale, uAccent },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ---- containment shell: one faint icosahedron, counter-rotating.
            It gives the constellation an edge to sit inside, which is
            what stops the far nodes reading as stray dirt. ---- */
    const shellGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(26, 1));
    const shellMat = new THREE.LineBasicMaterial({
      /* Hex, not the three floats above: the float constructor reads
         its arguments as linear working space, the hex form as sRGB,
         and the tokens in App.css are sRGB. */
      color: new THREE.Color(0xffd60a),
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const shell = new THREE.LineSegments(shellGeo, shellMat);
    shell.scale.set(SPREAD[0] * 0.92, SPREAD[1] * 1.5, SPREAD[2]);
    graph.add(shell);

    /* ---- sizing ---- */
    /* Camera distance is solved per resize rather than fixed. A hero is
       short and very wide on a laptop and tall and narrow on a phone,
       and one hard-coded z leaves the graph as a small blob adrift in
       the middle of the first. This solves for cover, not contain: the
       field overflows the frame on whichever axis has room to spare,
       so the viewport is always full of graph. The floor stops the
       solve from walking the camera inside the field on an extremely
       wide box, where the near nodes would bloom into the lens. */
    let baseZ = 44;
    const HALF_TAN = Math.tan((FOV * Math.PI) / 360);

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);

      const forWidth = FIELD_X / (camera.aspect * HALF_TAN);
      const forHeight = FIELD_Y / HALF_TAN;
      baseZ = Math.min(Math.max(Math.min(forWidth, forHeight), 33), 62);
      /* Point sizes are world-space radii. Converting through the
         drawing buffer height keeps a node the same apparent size on
         a phone, a laptop and a 4K panel. */
      uScale.value = (renderer.domElement.height * 0.5) / Math.tan((FOV * Math.PI) / 360);
    };
    resize();

    /* Frame-time governor. An exponential average rather than a raw
       reading, so one long GC or a busy scroll handler cannot demote
       the whole page; ~22ms is where a 60Hz display has started
       dropping frames rather than merely flirting with the limit. */
    let avgMs = 16.7;
    let settle = 0;

    const rebaseline = () => {
      avgMs = 16.7;
      settle = 0;
    };

    const applyTier = (next) => {
      tier = next;
      dust.visible = TIERS[tier].dust;
      renderer.setPixelRatio(Math.min(rawDpr, TIERS[tier].dpr));
      resize();
      rebaseline();
    };

    const govern = (ms) => {
      /* Ignore the opening frames. Shader compilation, the font swap
         and React's own mount all land there, and none of them say
         anything about how this scene actually runs. */
      if (settle++ < 45) return;
      avgMs += (ms - avgMs) * 0.05;
      if (avgMs > 22 && tier < TIERS.length - 1) applyTier(tier + 1);
    };

    const ro = new ResizeObserver(() => {
      resize();
      /* A new pixel count is a new cost profile, so the measurement
         taken against the old one no longer describes anything. */
      rebaseline();
    });
    ro.observe(host);

    /* ---- motion ---- */
    const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
    const onPointer = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    const draw = () => {
      const s = scrollRef.current;
      graph.rotation.y = uTime.value * 0.066 + pointer.x * 0.26;
      graph.rotation.x = -pointer.y * 0.17 + Math.sin(uTime.value * 0.12) * 0.045;
      shell.rotation.y = -uTime.value * 0.075;
      shell.rotation.z = uTime.value * 0.03;
      dust.rotation.y = uTime.value * 0.013;

      /* The hero's own scroll dollies the camera back and lifts the
         field, so the backdrop leaves at a different rate from the
         copy sitting on it. */
      camera.position.x = pointer.x * 2.4;
      camera.position.y = pointer.y * 1.6 - s * 4.5;
      camera.position.z = baseZ + s * 11;
      camera.lookAt(0, -s * 1.6, 0);

      renderer.render(scene, camera);
    };

    let last = 0;
    let running = false;

    const frame = () => {
      /* performance.now() rather than THREE.Clock: Clock is deprecated
         in r186 and warns on construction, and this is the only thing
         it was being used for. */
      const now = performance.now();
      const raw = now - last;
      const dt = Math.min(raw / 1000, 0.05);
      last = now;
      govern(raw);
      uTime.value += dt;
      const k = Math.min(1, dt * 3.2);
      pointer.x += (pointer.tx - pointer.x) * k;
      pointer.y += (pointer.ty - pointer.y) * k;
      draw();
    };

    const start = () => {
      if (running || reduce) return;
      running = true;
      last = performance.now();
      renderer.setAnimationLoop(frame);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      renderer.setAnimationLoop(null);
    };

    /* Reduced motion gets the composition, held still, a few seconds
       deep into the animation so the signals are mid-flight rather
       than all sitting at zero. */
    if (reduce) {
      uTime.value = 7.5;
      draw();
    }

    let onscreen = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        onscreen = entry.isIntersecting;
        if (onscreen && !document.hidden) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(host);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (onscreen) start();
    };

    const canvas = renderer.domElement;
    const onLost = (e) => {
      /* Let the browser try to restore. Until it does, the gradient
         under the canvas is what the visitor sees. */
      e.preventDefault();
      stop();
    };
    const onRestored = () => {
      resize();
      if (onscreen && !document.hidden) start();
      else draw();
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    /* Re-render once per scroll change even while paused, so a
       reduced-motion visitor still gets the camera parallax the
       layout implies. */
    const unsubScroll = reduce && progress ? progress.on('change', () => draw()) : null;

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      if (unsubScroll) unsubScroll();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);

      nodeGeo.dispose();
      lineGeo.dispose();
      dustGeo.dispose();
      shellGeo.dispose();
      nodeMat.dispose();
      lineMat.dispose();
      dustMat.dispose();
      shellMat.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [reduce, progress]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
