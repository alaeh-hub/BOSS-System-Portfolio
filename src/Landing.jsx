import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  ChartLineUp,
  Check,
  EnvelopeSimple,
  FacebookLogo,
  IconContext,
  LinkedinLogo,
  Lightning,
  Plus,
  PlugsConnected,
  ShieldCheck,
  SpinnerGap,
  SquaresFour,
  WarningCircle,
  XLogo,
} from '@phosphor-icons/react';

/* ============================================================
   Motion vocabulary

   MOTION_INTENSITY: 5. Every animation here answers one of:
   hierarchy, storytelling, feedback, or state transition.
   Nothing loops forever except the logo marquee, which is the
   one place continuous movement carries meaning (breadth of
   client list, no individual item needs attention).
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1];

const rise = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.55, ease: EASE } },
};

const stagger = (amount = 0.08) => ({
  hidden: {},
  show: { transition: { staggerChildren: amount } },
});

const VIEWPORT = { once: true, amount: 0.2 };

/** Scroll-reveal wrapper. Communicates reading sequence on a long page. */
function Reveal({ children, className = '', amount = 0.08, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={stagger(amount)}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={VIEWPORT}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

function Item({ children, className = '', as = 'div', ...rest }) {
  const Tag = motion[as] || motion.div;
  const reduce = useReducedMotion();
  return (
    <Tag className={className} variants={reduce ? undefined : rise} {...rest}>
      {children}
    </Tag>
  );
}

/* ============================================================
   Content
   ============================================================ */

const NAV = [
  ['Services', '#services'],
  ['Process', '#process'],
  ['Work', '#work'],
  ['Pricing', '#pricing'],
];

/* One CTA label per intent, used in the nav, the hero, every plan
   and the closing band. */
const CTA = 'Book a call';

/* Where the contact form posts. Point VITE_CONTACT_ENDPOINT at your own
   API route, a Worker, or a hosted form handler. Until it is set, and
   any time the request fails, the form hands the visitor a prefilled
   mail draft instead of swallowing the lead. */
const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT ?? '';
const CONTACT_MAILBOX = import.meta.env.VITE_CONTACT_MAILBOX ?? 'hello@bosssystems.co';

const SECTION_IDS = NAV.map(([, href]) => href.slice(1));
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CLIENTS = [
  ['HF', 'Hartwell Freight'],
  ['MC', 'Meridian Clinics'],
  ['CR', 'Calder Retail Group'],
  ['OW', 'Oakfield Works'],
  ['SF', 'Serrano Foods'],
  ['PS', 'Pike Street Supply'],
  ['VC', 'Vantage Cold Chain'],
  ['DP', 'Dunmore Plastics'],
];

/* sample data: replace with real figures before launch */
const BAND = [
  [184, '', 'Systems shipped'],
  [11.4, 'k', 'Hours automated monthly'],
  [6, ' wks', 'Median time to first release'],
  [31, '', 'Teams on retainer'],
];

const SERVICES = [
  {
    icon: Lightning,
    title: 'Workflow automation',
    copy: 'We map the handoffs that eat your week, then rebuild them as flows that run themselves.',
    tags: ['Approvals', 'Routing', 'Alerts'],
    span: true,
    photo: 'boss-dispatch-desk',
  },
  {
    icon: SquaresFour,
    title: 'Custom business systems',
    copy: 'Inventory, dispatch, billing and field ops, built around how your team already works.',
    tags: ['ERP', 'Field ops'],
  },
  {
    icon: ChartLineUp,
    title: 'Operations dashboards',
    copy: 'One screen for what is moving, what is stuck, and what it is costing you right now.',
    tags: ['Reporting'],
  },
  {
    icon: PlugsConnected,
    title: 'Integrations and migrations',
    copy: 'We connect the tools you already pay for and move your history across cleanly.',
    tags: ['APIs', 'Data moves'],
    wash: true,
  },
  {
    icon: ShieldCheck,
    title: 'Access and audit control',
    copy: 'Role based permissions, audit trails and encrypted storage, shipped with the build.',
    tags: ['SSO', 'Audit logs'],
  },
];

const PROCESS = [
  {
    when: 'Week 1',
    t: 'Discovery',
    d: 'We follow the work end to end for a week, then hand you a written map of every bottleneck and what fixing it is worth.',
  },
  {
    when: 'Week 2 to 3',
    t: 'Blueprint',
    d: 'Clickable prototypes and a scoped plan. You sign off on the screens and the number before production code starts.',
  },
  {
    when: 'Week 4 to 12',
    t: 'Build',
    d: 'Two week sprints, each ending in a working demo. You see progress continuously instead of waiting months for a reveal.',
  },
  {
    when: 'Ongoing',
    t: 'Handover',
    d: 'We train your staff, migrate the data, and stay on through the first quarter while real usage comes in.',
  },
];

/* sample data: project outcomes are illustrative */
const WORK = [
  {
    client: 'Hartwell Freight',
    title: 'Dispatch control tower',
    copy: 'Four spreadsheets and a whiteboard replaced by one live board for the daily route list.',
    a: ['64%', 'Less dispatch time'],
    b: ['220', 'Routes per day'],
    seed: 'boss-freight-yard',
  },
  {
    client: 'Meridian Clinics',
    title: 'Patient intake platform',
    copy: 'Paper intake moved to digital in six weeks, with scheduling and insurance checks built in.',
    a: ['9 min', 'Saved per visit'],
    b: ['31', 'Clinics live'],
    seed: 'boss-clinic-reception',
  },
  {
    client: 'Calder Retail Group',
    title: 'Multi branch inventory',
    copy: 'Stock levels, transfers and reorder points unified across eleven stores in real time.',
    a: ['38%', 'Fewer stockouts'],
    b: ['11', 'Branches'],
    seed: 'boss-retail-stockroom',
  },
  {
    client: 'Oakfield Works',
    title: 'Production floor tracker',
    copy: 'Machine level output and downtime reasons captured at the source and costed automatically.',
    a: ['22%', 'More throughput'],
    b: ['3 sec', 'Data latency'],
    seed: 'boss-factory-line',
  },
  {
    client: 'Serrano Foods',
    title: 'Commissary ordering',
    copy: 'Branch orders, production planning and delivery routing folded into one daily cycle.',
    a: ['41%', 'Less waste'],
    b: ['6 hrs', 'Saved nightly'],
    seed: 'boss-commissary-kitchen',
  },
];

const SAYS = [
  {
    q: 'They spent the first week on our warehouse floor before writing anything. What they built matches how we actually work.',
    n: 'Renata Villanueva',
    r: 'Operations Director, Hartwell Freight',
    seed: 'boss-portrait-renata',
    lead: true,
  },
  {
    q: 'Month end close went from nine days to two. Nobody stays late for it now.',
    n: 'Marco Benavidez',
    r: 'Finance Lead, Calder Retail Group',
    seed: 'boss-portrait-marco',
  },
  {
    q: 'Clear scope, honest timelines, and they still answered questions four months after launch.',
    n: 'Imelda Cruz-Santiago',
    r: 'Clinic Operations, Meridian Clinics',
    seed: 'boss-portrait-imelda',
  },
];

/* sample pricing: confirmed in writing after discovery */
const PLANS = [
  {
    name: 'Launch',
    m: 1800,
    y: 1500,
    d: 'One focused system for a single team, built and shipped in six weeks.',
    f: ['Discovery workshop', 'Up to 3 core modules', 'Standard integrations', 'Support within 48 hours', '3 months of care'],
  },
  {
    name: 'Scale',
    m: 4200,
    y: 3500,
    d: 'A multi department platform with live dashboards and dedicated sprints.',
    f: [
      'Everything in Launch',
      'Unlimited modules',
      'Operations dashboards',
      'Custom integrations and migration',
      'Support within 4 hours',
      '12 months of care',
    ],
    hot: true,
  },
  {
    name: 'Enterprise',
    m: null,
    y: null,
    d: 'Company wide rollouts with compliance, service levels and an embedded team.',
    f: ['Everything in Scale', 'SSO and audit logging', 'Dedicated engineering pod', 'Custom service levels', 'Quarterly roadmap reviews'],
  },
];

const FAQS = [
  [
    'How long does a typical build take?',
    'Most first releases go live between six and twelve weeks. Discovery takes a week, the blueprint two to three, and the build runs in two week sprints after that. You see working software at the end of every sprint, so the timeline stays honest.',
  ],
  [
    'Do we own the code you write?',
    'Yes, completely. The repository, the infrastructure and the documentation move to your accounts at launch. There is no licence to renew and nothing stops working if you decide to take it in house.',
  ],
  [
    'Can you work with the software we already have?',
    'Usually yes. We integrate with accounting packages, CRMs, payment gateways and most ERPs through their APIs. Where no API exists we build a sync layer, so your existing tools keep working while the new system takes over the parts it should.',
  ],
  [
    'What happens after launch?',
    'Every engagement includes a care period covering monitoring, bug fixes, small changes and staff support. Teams that want continued development move onto a monthly retainer. Teams that are happy as they are simply keep the system.',
  ],
  [
    'How is pricing actually calculated?',
    'The plans above are starting points based on scope and sprint count. After discovery you get a fixed written quote, so you approve a number and a deliverable rather than an open ended hourly estimate.',
  ],
];

/* ============================================================
   Marks

   Wordmarks set in the display typeface, which Section 4.8 of the
   brief permits. No hand-drawn icon paths anywhere: every icon on
   this page comes from Phosphor.
   ============================================================ */

function BossMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#ffd60a" />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#080808"
        fontFamily="Bricolage Grotesque Variable, Bricolage Grotesque, sans-serif"
        fontSize="23"
        fontWeight="800"
        letterSpacing="-1"
      >
        B
      </text>
    </svg>
  );
}

/** Generated monogram for an invented client brand. */
function ClientMark({ initials, name }) {
  return (
    <span className="logo-mark">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
        <text
          x="16"
          y="17"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontFamily="Bricolage Grotesque Variable, Bricolage Grotesque, sans-serif"
          fontSize="12"
          fontWeight="700"
          letterSpacing="-0.4"
        >
          {initials}
        </text>
      </svg>
      <b>{name}</b>
    </span>
  );
}

const Brand = () => (
  <a href="#top" className="brand" aria-label="BOSS home">
    <BossMark />
    <span className="brand__text">BOSS</span>
  </a>
);

/** Duotone photo. Real imagery, tinted into the brand by CSS.
    The 2x candidate is what keeps a 4K panel, where the hero frame is
    roughly 1240 CSS px wide, from upscaling a 1040px source. The 1x
    stays the default so a phone never pays for pixels it cannot show. */
function Photo({ seed, w, h, alt, className = '', priority = false }) {
  const at = (n) => `https://picsum.photos/seed/${seed}/${w * n}/${h * n}`;
  return (
    <div className={`media ${className}`}>
      <img
        src={at(1)}
        srcSet={`${at(1)} 1x, ${at(2)} 2x`}
        width={w}
        height={h}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </div>
  );
}

/* ============================================================
   Sections
   ============================================================ */

/* Scroll spy for the nav. A band across the middle of the viewport
   decides which section the reader is in, so the nav answers "where am
   I" on a page this long. IntersectionObserver, never a scroll listener. */
function useActiveSection(ids) {
  const [active, setActive] = useState('');

  useEffect(() => {
    const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!nodes.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const first = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        setActive(first.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  return active;
}

function Header() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const active = useActiveSection(SECTION_IDS);
  const close = useCallback(() => setOpen(false), []);

  /* useScroll instead of a scroll event listener: no per-frame
     React state writes, no manual listener cleanup. */
  useMotionValueEvent(scrollY, 'change', (v) => setStuck(v > 24));

  /* The drawer is the only thing here that locks page scrolling, so it
     needs every exit a visitor expects: Escape, the backdrop, and
     widening past the breakpoint that hides the button to close it.
     Without the last one the overlay stranded the page with scroll off. */
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    const wide = window.matchMedia('(min-width: 769px)');
    const onWide = (e) => {
      if (e.matches) close();
    };
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [open, close]);

  return (
    <>
      <header className={`hdr ${stuck ? 'is-stuck' : ''}`}>
        <div className="hdr__in">
          <Brand />
          <nav className="nav">
            {NAV.map(([label, href]) => {
              const here = active === href.slice(1);
              return (
                <a
                  key={href}
                  href={href}
                  className={here ? 'is-here' : ''}
                  aria-current={here ? 'true' : undefined}
                >
                  {label}
                </a>
              );
            })}
          </nav>
          <div className="hdr__cta">
            <a href="#contact" className="btn btn--primary btn--sm">
              {CTA}
            </a>
            <button
              className={`burger ${open ? 'is-open' : ''}`}
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="scrim"
              aria-label="Close menu"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
            />
            <motion.div
              className="drawer"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              {NAV.map(([label, href]) => (
                <a key={href} href={href} onClick={close}>
                  {label}
                </a>
              ))}
              <a href="#contact" className="btn btn--primary btn--block" onClick={close}>
                {CTA}
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* Asymmetric split hero. Exactly 4 text elements: eyebrow,
   headline, subtext, CTA row. Trust signals live below, not here. */
function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="hero">
      <div className="wrap hero__in">
        <motion.div
          className="hero__copy"
          variants={stagger(0.07)}
          initial={reduce ? false : 'hidden'}
          animate="show"
        >
          <Item as="span" className="eyebrow">
            Business Owner Strategic System
          </Item>
          <Item as="h1" className="h1">
            Built for the floor, <span className="accent-grad">not the demo</span>
          </Item>
          <Item as="p" className="lead">
            We design and build the operational software your team actually runs on. Shipped in weeks,
            owned by you.
          </Item>
          <Item className="hero__cta">
            <a href="#contact" className="btn btn--primary btn--lg">
              {CTA}
              <ArrowRight />
            </a>
            <a href="#work" className="btn btn--ghost btn--lg">
              See our work
            </a>
          </Item>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
        >
          <Photo
            seed="boss-warehouse-operations-floor"
            w={1040}
            h={858}
            priority
            className="hero__media"
            alt="Operations staff working on a warehouse floor"
          />
        </motion.div>
      </div>
    </section>
  );
}

function Logos() {
  const reduce = useReducedMotion();
  const row = [...CLIENTS, ...CLIENTS];
  return (
    <section className="logos">
      <div className="wrap">
        <p className="logos__label">Operations teams running on BOSS</p>
      </div>
      <div className="marquee">
        <motion.div
          className="marquee__track"
          animate={reduce ? undefined : { x: ['0%', '-50%'] }}
          transition={{ duration: 46, repeat: Infinity, ease: 'linear' }}
        >
          {row.map(([initials, name], i) => (
            <ClientMark key={`${name}-${i}`} initials={initials} name={name} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Counter({ to, suffix, decimals }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const controls = animate(0, to, { duration: 1.3, ease: 'easeOut', onUpdate: setVal });
    return () => controls.stop();
  }, [inView, to, reduce]);

  return (
    <span className="band__n" ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function Band() {
  return (
    <section className="section--tight">
      <Reveal className="band">
        {BAND.map(([n, suffix, label]) => (
          <Item className="band__cell" key={label}>
            <Counter to={n} suffix={suffix} decimals={Number.isInteger(n) ? 0 : 1} />
            <span className="band__l">{label}</span>
          </Item>
        ))}
      </Reveal>
    </section>
  );
}

/* Bento: 5 items, exactly 5 cells, no empty slots.
   Row 1 = span2 + 1, row 2 = 1 + 1 + 1.
   Two cells carry real visual weight (a photo and a brand wash). */
function Services() {
  return (
    <section className="section" id="services">
      <Reveal className="wrap">
        <div className="head">
          <Item as="span" className="eyebrow">
            What we do
          </Item>
          <Item as="h2" className="h2">
            Built around how your floor already runs
          </Item>
          <Item as="p" className="lead">
            We take an operation apart, find where the hours go, and build the software that gives them
            back.
          </Item>
        </div>

        <div className="bento">
          {SERVICES.map((s) => {
            const Ico = s.icon;
            return (
              <Item
                className={`bento__cell ${s.span ? 'bento__cell--span2' : ''} ${s.wash ? 'bento__cell--wash' : ''}`}
                key={s.title}
              >
                {s.photo && (
                  <div className="bento__photo">
                    <img
                      src={`https://picsum.photos/seed/${s.photo}/900/600`}
                      width={900}
                      height={600}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                )}
                <span className="bento__ico">
                  <Ico size={21} />
                </span>
                <h3 className="h3">{s.title}</h3>
                <p>{s.copy}</p>
                <div className="bento__tags">
                  {s.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </Item>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* Timeline. The rail fills with scroll position, which tells the
   reader how far through the engagement they are reading. */
function Process() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 72%', 'end 62%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });

  return (
    <section className="section section--panel" id="process">
      <Reveal className="wrap">
        <div className="head">
          <Item as="h2" className="h2">
            Four stages, no surprises
          </Item>
          <Item as="p" className="lead">
            You know the scope, the number and the date before the build starts, and you see working
            software every two weeks until it is done.
          </Item>
        </div>

        <div className="flow" ref={ref}>
          <div className="flow__rail">
            <motion.div className="flow__fill" style={reduce ? { scaleY: 1 } : { scaleY: fill }} />
          </div>
          {PROCESS.map((s) => (
            <Item className="step" key={s.t}>
              <span className="step__dot" />
              <span className="step__when">{s.when}</span>
              <h3 className="h3">{s.t}</h3>
              <p>{s.d}</p>
            </Item>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* Horizontal rail. Three and a bit cards sit on screen at desktop
   width, so "card 2 of 5" would be a claim the layout cannot support,
   and dimming the cards a reader can plainly see made them look
   disabled. Position is shown as scroll progress instead, in the same
   language as the page progress bar at the top, and the arrows page by
   exactly one card. Progress comes from a motion value bound to the
   rail, so nothing here listens to scroll or re-renders per frame. */
function Work() {
  const railRef = useRef(null);
  const reduce = useReducedMotion();
  const [ends, setEnds] = useState({ start: true, end: false });

  const { scrollXProgress } = useScroll({ container: railRef });
  /* never a zero width bar: it starts as a stub and fills */
  const fill = useTransform(scrollXProgress, [0, 1], [0.14, 1]);

  const readEnds = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = { start: el.scrollLeft <= 1, end: max <= 1 || el.scrollLeft >= max - 1 };
    setEnds((p) => (p.start === next.start && p.end === next.end ? p : next));
  }, []);

  useMotionValueEvent(scrollXProgress, 'change', readEnds);

  useEffect(() => {
    readEnds();
    window.addEventListener('resize', readEnds);
    return () => window.removeEventListener('resize', readEnds);
  }, [readEnds]);

  const nudge = (dir) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('.work');
    const step = (card?.getBoundingClientRect().width ?? 380) + 16;
    el.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section className="section" id="work">
      <Reveal className="wrap">
        <div className="head">
          <Item as="h2" className="h2">
            Systems already earning their keep
          </Item>
        </div>
        <Item className="rail__head">
          <div className="rail__meter" aria-hidden="true">
            <motion.span style={{ scaleX: reduce ? 1 : fill }} />
          </div>
          <div className="rail__nav">
            <button
              className="rail__btn"
              onClick={() => nudge(-1)}
              disabled={ends.start}
              aria-label="Previous project"
            >
              <CaretLeft />
            </button>
            <button
              className="rail__btn"
              onClick={() => nudge(1)}
              disabled={ends.end}
              aria-label="Next project"
            >
              <CaretRight />
            </button>
          </div>
        </Item>
      </Reveal>

      <div className="rail" ref={railRef}>
        <span className="rail__pad" aria-hidden="true" />
        {WORK.map((w) => (
          <article className="work" key={w.title}>
            <Photo
              seed={w.seed}
              w={800}
              h={500}
              className="work__media"
              alt={`${w.title} for ${w.client}`}
            />
            <div className="work__body">
              <span className="work__client">{w.client}</span>
              <h3 className="h3">{w.title}</h3>
              <p>{w.copy}</p>
              <div className="work__stat">
                <div>
                  <b>{w.a[0]}</b>
                  <span>{w.a[1]}</span>
                </div>
                <div>
                  <b>{w.b[0]}</b>
                  <span>{w.b[1]}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
        <span className="rail__pad" aria-hidden="true" />
      </div>
    </section>
  );
}

/* Editorial split: one featured quote, two supporting. A different
   layout family from the bento and the pricing grid. */
function Says() {
  const [lead, ...rest] = SAYS;
  return (
    <section className="section" id="clients">
      <Reveal className="wrap">
        <div className="head">
          <Item as="h2" className="h2">
            What the people who use it daily say
          </Item>
        </div>

        <div className="says">
          <Item className="say say--lead">
            <blockquote>{lead.q}</blockquote>
            <div className="say__who">
              <Photo seed={lead.seed} w={120} h={120} alt="" />
              <span>
                <b>{lead.n}</b>
                <span>{lead.r}</span>
              </span>
            </div>
          </Item>

          <div className="says__stack">
            {rest.map((t) => (
              <Item className="say" key={t.n}>
                <blockquote>{t.q}</blockquote>
                <div className="say__who">
                  <Photo seed={t.seed} w={120} h={120} alt="" />
                  <span>
                    <b>{t.n}</b>
                    <span>{t.r}</span>
                  </span>
                </div>
              </Item>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section className="section" id="pricing">
      <Reveal className="wrap">
        <div className="head">
          <Item as="span" className="eyebrow">
            Engagements
          </Item>
          <Item as="h2" className="h2">
            Fixed scope. Fixed number.
          </Item>
          <Item as="p" className="lead">
            Monthly rates covering design, build and care. Every quote is confirmed in writing after
            discovery, so you never approve an open ended estimate.
          </Item>
          <Item>
            <div className="switch">
              {[
                ['Monthly', false],
                ['Annual', true],
              ].map(([label, val]) => (
                <button key={label} className={yearly === val ? 'on' : ''} onClick={() => setYearly(val)}>
                  {yearly === val && (
                    <motion.span
                      className="switch__pill"
                      layoutId="switch-pill"
                      style={{ left: 0, right: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {label}
                    {val && <em className="switch__save">save 17%</em>}
                  </span>
                </button>
              ))}
            </div>
          </Item>
        </div>

        <div className="plans">
          {PLANS.map((p) => {
            const price = yearly ? p.y : p.m;
            return (
              <Item className={`plan ${p.hot ? 'plan--hot' : ''}`} key={p.name}>
                {p.hot && <span className="plan__badge">Most chosen</span>}
                <h3 className="h3">{p.name}</h3>
                <div className="plan__price">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${p.name}-${yearly}`}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                    >
                      {price ? `$${price.toLocaleString()}` : 'Scoped'}
                    </motion.span>
                  </AnimatePresence>
                  {price ? <small>{yearly ? 'per month, billed yearly' : 'per month'}</small> : null}
                </div>
                <p>{p.d}</p>
                <ul>
                  {p.f.map((f) => (
                    <li key={f}>
                      <Check size={15} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact" className={`btn btn--block ${p.hot ? 'btn--primary' : 'btn--ghost'}`}>
                  {CTA}
                </a>
              </Item>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section section--panel" id="faq">
      <Reveal className="wrap">
        <div className="head">
          <Item as="h2" className="h2">
            Questions we get before the first call
          </Item>
        </div>

        <div className="faq">
          {FAQS.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <Item className={`faq__item ${isOpen ? 'is-open' : ''}`} key={q}>
                <button
                  className="faq__q"
                  id={`faq-q-${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                >
                  {q}
                  <Plus size={18} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      style={{ overflow: 'hidden' }}
                      id={`faq-a-${i}`}
                      role="region"
                      aria-labelledby={`faq-q-${i}`}
                    >
                      <p className="faq__a">{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Item>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* The form actually posts now. Before this it validated the address and
   then showed a thank-you for a message nobody ever received. States:
   idle, sending, done, fallback. "fallback" covers both a missing
   endpoint and a failed request, and hands over a prefilled draft so a
   lead is never lost to a silent error. */
function Contact() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('idle');
  const trap = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const draft = `mailto:${CONTACT_MAILBOX}?subject=${encodeURIComponent(
    'Where our hours disappear',
  )}&body=${encodeURIComponent(
    `${note.trim() || 'A quick note on what is slowing us down:'}\n\nReply to: ${email.trim()}\n`,
  )}`;

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;

    const value = email.trim();
    if (!value) {
      setErr('Enter your work email so we can reply.');
      return;
    }
    if (!MAIL_RE.test(value)) {
      setErr('That email address does not look right.');
      return;
    }
    /* Hidden field. Humans never fill it, bots usually do. */
    if (trap.current?.value) {
      setStatus('done');
      return;
    }
    setErr('');

    if (!CONTACT_ENDPOINT) {
      setStatus('fallback');
      return;
    }

    setStatus('sending');
    const abort = new AbortController();
    abortRef.current = abort;
    const timer = setTimeout(() => abort.abort(), 10000);

    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: value, note: note.trim(), source: 'landing' }),
        signal: abort.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('done');
    } catch {
      setStatus('fallback');
    } finally {
      clearTimeout(timer);
      abortRef.current = null;
    }
  };

  const sending = status === 'sending';

  return (
    <section className="close" id="contact">
      <div className="wrap close__in">
        <Reveal className="close__copy">
          <Item as="h2" className="h2">
            Tell us where the hours disappear
          </Item>
          <Item as="p" className="lead">
            Thirty minutes, no deck. We walk your process, name the two or three things worth automating
            first, and tell you honestly if we are not the right fit.
          </Item>
        </Reveal>

        <Reveal>
          <Item>
            {status === 'done' && (
              <div className="form__panel">
                <p className="form__done">
                  <Check size={20} />
                  Thanks. We reply within one business day.
                </p>
                <p className="form__note">
                  Nothing else to do. The engineer who would run your project picks this up.
                </p>
              </div>
            )}

            {status === 'fallback' && (
              <div className="form__panel">
                <p className="form__warn">
                  <WarningCircle size={20} />
                  That did not go through from here.
                </p>
                <p className="form__note">
                  Send it straight to us instead. The draft below is already filled in.
                </p>
                <a href={draft} className="btn btn--primary btn--block">
                  Email {CONTACT_MAILBOX}
                </a>
              </div>
            )}

            {(status === 'idle' || sending) && (
              <form className="form" onSubmit={submit} noValidate aria-busy={sending}>
                <div className="field">
                  <label htmlFor="work-email">Work email</label>
                  <input
                    id="work-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    disabled={sending}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (err) setErr('');
                    }}
                    placeholder="you@company.com"
                    aria-invalid={err ? 'true' : 'false'}
                    aria-describedby={err ? 'work-email-error' : 'work-email-help'}
                  />
                  {err ? (
                    <span className="form__err" id="work-email-error" role="alert">
                      {err}
                    </span>
                  ) : (
                    <span className="form__help" id="work-email-help">
                      One reply from the person who would run your project.
                    </span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="work-note">What is slowing you down</label>
                  <textarea
                    id="work-note"
                    name="note"
                    rows={3}
                    value={note}
                    disabled={sending}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Month end takes nine days and three people."
                    aria-describedby="work-note-help"
                  />
                  <span className="form__help" id="work-note-help">
                    Optional. A sentence is plenty.
                  </span>
                </div>

                {/* honeypot: off-screen, never announced, never tabbable */}
                <input
                  ref={trap}
                  type="text"
                  name="company_website"
                  className="trap"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <button type="submit" className="btn btn--primary btn--lg" disabled={sending}>
                  {sending ? (
                    <>
                      Sending
                      <SpinnerGap className="spin" />
                    </>
                  ) : (
                    <>
                      {CTA}
                      <ArrowRight />
                    </>
                  )}
                </button>
              </form>
            )}
          </Item>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    ['Services', ['Workflow automation', 'Business systems', 'Dashboards', 'Integrations']],
    ['Company', ['About', 'Process', 'Work', 'Careers']],
    ['Resources', ['Case studies', 'Support', 'Status', 'Privacy']],
  ];
  const social = [
    [LinkedinLogo, 'BOSS on LinkedIn'],
    [FacebookLogo, 'BOSS on Facebook'],
    [XLogo, 'BOSS on X'],
    [EnvelopeSimple, 'Email BOSS'],
  ];

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__top">
          <div className="foot__about">
            <Brand />
            <p className="foot__expand">Business Owner Strategic System</p>
            <p>
              Operational software for companies that have outgrown spreadsheets. Designed around your
              process, shipped in weeks, owned by you.
            </p>
            <div className="foot__social">
              {social.map(([Ico, label]) => (
                <a key={label} href="#top" aria-label={label}>
                  <Ico size={17} />
                </a>
              ))}
            </div>
          </div>

          {cols.map(([h, items]) => (
            <div className="foot__col" key={h}>
              <h4>{h}</h4>
              {items.map((x) => (
                <a key={x} href="#top">
                  {x}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="foot__bar">
          <span>&copy; {new Date().getFullYear()} BOSS Systems</span>
          <nav>
            <a href="#top">Privacy</a>
            <a href="#top">Terms</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 130, damping: 30, restDelta: 0.001 });

  return (
    /* One icon family, one weight, set once. */
    <IconContext.Provider value={{ weight: 'bold', size: 18 }}>
      <div id="top">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <motion.div className="progress" style={{ scaleX: bar }} />
        {/* Fixed and pointer-events-none, so it never repaints with scroll. */}
        <div className="grain" aria-hidden="true" />
        <Header />
        <main id="main">
          <Hero />
          <Logos />
          <Band />
          <Services />
          <Process />
          <Work />
          <Says />
          <Pricing />
          <Faq />
          <Contact />
        </main>
        <Footer />
      </div>
    </IconContext.Provider>
  );
}
