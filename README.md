# BOSS, Business Owner Strategic System

Marketing site for BOSS: a single page React app built with Vite, selling custom
operational software. Dark theme, one yellow accent, self hosted variable fonts,
motion that honours `prefers-reduced-motion`.

---

## Status of each part

Read this before you start, so you know which paths actually run today.

| Part | Where | Runs today |
|---|---|---|
| The site itself | `index.html` + `src/` | Yes. This is the app. |
| Contact form submission | `src/Landing.jsx` | Yes, once you point it at an endpoint. See [The contact form](#the-contact-form). |
| Blade / Laravel route | `routes/`, `resources/views/` | **No.** Scaffold only. See [The Laravel path](#the-laravel-path-unfinished). |

**PHP is not required to run this site.** The site is static once built, and it
is served by Vite in development. You only need PHP if you want to receive the
contact form submissions on your own server, or if you want to finish the
Laravel scaffold. Both are covered below.

---

## Requirements

- **Node.js 20.19+ or 22.12+** (developed on 24.x) and npm. Vite 8 will not run
  on older versions.
- Nothing else for the site itself.
- PHP 8.2+ only for the optional backend. See
  [Setting up PHP from scratch](#setting-up-php-from-scratch).

Check what you have:

```bash
node -v
npm -v
```

If `node` is not found, install it from <https://nodejs.org> (LTS), or:

```powershell
# Windows
winget install OpenJS.NodeJS.LTS
```

```bash
# macOS
brew install node

# Debian / Ubuntu
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Close and reopen your terminal afterwards so the new `PATH` is picked up.

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints, normally <http://localhost:5173>. Edits to anything in
`src/` hot reload.

That is the whole setup for working on the site.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally, to check the real build |
| `npm run lint` | ESLint over the project |

---

## Configuration

Copy the example file and fill in what you need:

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `VITE_CONTACT_ENDPOINT` | empty | Where the contact form POSTs. Empty means no backend. |
| `VITE_CONTACT_MAILBOX` | `hello@bosssystems.co` | Address used for the fallback mail draft. |

Vite only exposes variables prefixed with `VITE_` to the browser, and it inlines
them **at build time**. Change a value and you must restart `npm run dev`, or
re-run `npm run build`. Never put a secret in a `VITE_` variable: it ends up in
the JavaScript bundle that every visitor downloads.

---

## The contact form

### Contract

On submit the form sends:

```http
POST <VITE_CONTACT_ENDPOINT>
Content-Type: application/json
Accept: application/json

{ "email": "renata@hartwellfreight.com", "note": "Month end takes nine days.", "source": "landing" }
```

- Any **2xx** response means success, and the visitor sees the thank you panel.
- Any **non 2xx**, a network failure, or a request taking longer than **10
  seconds** is treated as a failure.
- The response body is ignored. You do not need to return JSON.
- There is a hidden `company_website` honeypot field in the markup. Real people
  leave it empty. If you build your own endpoint, reject anything that fills it.

### What happens when it fails

The form never reports a success it did not get. On failure, or when
`VITE_CONTACT_ENDPOINT` is unset, it shows a panel with a prefilled `mailto:`
draft so the lead is not silently dropped. That is why the default configuration
is safe to ship: nothing is lost, it just arrives by email.

### Option A, no backend

Leave `VITE_CONTACT_ENDPOINT` empty and set `VITE_CONTACT_MAILBOX` to a real
address. Every submission becomes a mail draft. No server needed.

### Option B, a hosted form service

Point the variable at a service that accepts JSON, for example:

```ini
VITE_CONTACT_ENDPOINT=https://formspree.io/f/xxxxxxx
```

### Option C, your own PHP endpoint

Covered in full below, starting with installing PHP.

---

## Setting up PHP from scratch

Skip this section unless you want Option C or the Laravel path.

### Windows

The quickest route:

```powershell
winget install PHP.PHP.8.4
```

If `winget` is unavailable, or you want control over where it lands:

1. Download the **Thread Safe** zip for your architecture from
   <https://windows.php.net/download/>.
2. Extract it somewhere without spaces in the path, for example `C:\PHP`.
3. Add that folder to `PATH`:
   - Start menu, search *Edit the system environment variables*
   - **Environment Variables**, select **Path** under *User variables*, **Edit**,
     **New**, paste `C:\PHP`, then **OK** on every dialog.
4. Create the config file. In the PHP folder, copy `php.ini-development` to
   `php.ini`.
5. **Close and reopen your terminal.** `PATH` changes do not reach an open one.

### macOS

```bash
brew install php
```

### Debian / Ubuntu

```bash
sudo apt update
sudo apt install -y php-cli php-curl php-mbstring php-xml php-zip php-sqlite3
```

### Fedora / RHEL

```bash
sudo dnf install -y php-cli php-curl php-mbstring php-xml php-zip php-pdo
```

### Verify

```bash
php -v
```

You should see `PHP 8.x`. If the command is not found, `PATH` is wrong or the
terminal was not restarted.

### Enabling extensions

PHP ships most extensions disabled. Check what is on:

```bash
php -m
```

To turn one on, find your config file:

```bash
php -r "echo php_ini_loaded_file();"
```

If that prints nothing, you skipped step 4 of the Windows install: copy
`php.ini-development` to `php.ini` in the PHP folder.

Open that `php.ini`, find the line for the extension, and remove the leading
semicolon:

```ini
;extension=zip          →    extension=zip
;extension=pdo_sqlite   →    extension=pdo_sqlite
;extension=sqlite3      →    extension=sqlite3
```

Save, then run `php -m` again to confirm. On Windows the matching
`php_<name>.dll` must exist in the `ext` folder, which it does in the official
builds.

**Which ones you need:**

- For the contact endpoint in Option C: nothing beyond a default install.
- For Laravel: `ctype`, `curl`, `dom`, `fileinfo`, `filter`, `hash`, `mbstring`,
  `openssl`, `pcre`, `pdo`, `session`, `tokenizer`, `xml`. Most are on by
  default. Also enable **`zip`** (Composer needs it), and **`pdo_sqlite`** plus
  **`sqlite3`** if you use Laravel's default SQLite database, which is otherwise
  the first thing that fails when you run migrations.

---

## Installing Composer

Only needed for the Laravel path.

### Windows

Download and run the installer from <https://getcomposer.org/Composer-Setup.exe>.
It finds your PHP automatically and fixes `PATH` for you.

### macOS / Linux

```bash
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php -r "unlink('composer-setup.php');"
sudo mv composer.phar /usr/local/bin/composer
```

Verify with `composer --version`.

---

## Running a PHP contact endpoint

This gives you Option C with no framework at all.

**1.** Create `api/contact.php` in the project root:

```php
<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];

// Honeypot. Real people never fill this in.
if (!empty($body['company_website'])) {
    exit(json_encode(['ok' => true]));
}

$email = trim($body['email'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    exit(json_encode(['error' => 'Invalid email']));
}

$note = trim($body['note'] ?? '');

// Swap this for mail(), a database insert, or your CRM's API.
$line = sprintf("%s\t%s\t%s\n", date('c'), $email, str_replace("\n", ' ', $note));
file_put_contents(__DIR__ . '/leads.tsv', $line, FILE_APPEND | LOCK_EX);

http_response_code(200);
echo json_encode(['ok' => true]);
```

**2.** Serve it on its own port:

```bash
php -S localhost:8000
```

**3.** Proxy it from Vite, so the browser sees one origin and you avoid CORS.
Add the `server` block to `vite.config.js`:

```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

**4.** Point the form at it in `.env`:

```ini
VITE_CONTACT_ENDPOINT=/api/contact.php
```

**5.** Restart `npm run dev`. Submissions now land in `api/leads.tsv`.

Add `api/leads.tsv` to `.gitignore` so real addresses never reach the
repository. In production, put the endpoint behind the same domain as the site
and rate limit it.

---

## The Laravel path, unfinished

`routes/web.php` and `resources/views/landing.blade.php` are a scaffold for
serving this page from Laravel. **They cannot run as they stand**, because the
repository has no Laravel application: no `composer.json`, no `artisan`, no
`vendor/`, no `app/`, no `bootstrap/`, and no `public/index.php`. The
`@vite` and `@viteReactRefresh` directives in the Blade file also need
`laravel-vite-plugin`, which is not installed and not referenced in
`vite.config.js`.

`resources/js/Landing.jsx` and `resources/css/app.css` deliberately re-export
from `src/`, so there is one source of truth and the two paths cannot drift.

To finish it:

```bash
# 1. a Laravel app in a sibling folder, then move this repo's files into it
composer create-project laravel/laravel boss-app

# 2. the plugin the Blade directives need
npm install --save-dev laravel-vite-plugin
```

```js
// 3. vite.config.js
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    laravel({ input: ['resources/css/app.css', 'resources/js/app.jsx'], refresh: true }),
    react(),
  ],
})
```

```bash
# 4. two terminals
php artisan serve
npm run dev
```

Note that step 3 replaces the plain `index.html` entry, so the standalone Vite
build stops working. Commit to one path or the other rather than half of each.

If you are not going to do this, delete `routes/` and `resources/` and keep the
plain Vite app.

---

## Project structure

```
index.html              entry for the Vite app
src/
  main.jsx              mounts Landing, imports fonts and styles
  Landing.jsx           the entire page, one component per section
  App.css               design tokens and all component styles
public/                 static files served as is
.env.example            configuration template
routes/, resources/     Laravel scaffold, see the section above
```

`src/App.css` opens with the rules the design holds itself to: one theme, one
accent colour, one corner radius scale. Read that header before changing colours
or spacing.

### Unused files

`src/App.jsx` is a second, unused `createRoot` entry, and `src/index.css` is
imported nowhere. Only `src/main.jsx` is wired up, by `index.html`. Both are safe
to delete.

---

## Deploying

```bash
npm run build
```

`dist/` is a static site. Upload it to any static host: Netlify, Vercel,
Cloudflare Pages, S3, or plain nginx. There is no server side rendering and no
Node process in production.

Remember that `VITE_` variables are baked in at build time, so set them in your
host's build environment, not at runtime.

Before going live, replace the placeholder imagery. Every photo is currently a
`picsum.photos` seed, so it renders a random stock image while the `alt` text
describes what the slot is meant to show. Search `src/Landing.jsx` for
`picsum.photos` and `seed:` to find all of them.

---

## Troubleshooting

**`npm run dev` fails with a Vite or crypto error.** Your Node is too old. Vite 8
needs 20.19+ or 22.12+. Check with `node -v`.

**Changing `.env` does nothing.** Vite inlines these at build time. Restart the
dev server, and make sure the name starts with `VITE_`.

**The form always shows "That did not go through from here".** Either
`VITE_CONTACT_ENDPOINT` is unset, which is the default and intended, or the
endpoint returned a non 2xx, or it took more than 10 seconds. Open the browser
network tab and look at the request.

**`php` is not recognised.** `PATH` does not include the PHP folder, or the
terminal predates the change. Reopen the terminal.

**`php -r "echo php_ini_loaded_file();"` prints nothing.** There is no `php.ini`.
Copy `php.ini-development` to `php.ini` in the PHP folder.

**Composer fails on a zip archive.** Enable the `zip` extension in `php.ini`.

**Console errors mentioning `content-scripts.js`, `PING_SAN`, feature flags, or
"Could not establish connection. Receiving end does not exist."** These come
from browser extensions, not from this site. Check again in a private window
with extensions disabled.
