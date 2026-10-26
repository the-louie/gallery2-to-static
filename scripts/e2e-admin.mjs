// Run from the repo: node --no-warnings=ExperimentalWarning scripts/e2e-admin.mjs  (needs admin/node_modules, backend/node_modules, Chrome + global puppeteer; SHOTS=<dir> keeps the screenshots)
// e2e-admin.mjs: Sprint 18 T-09 end-to-end — real backend (fake-Access mode) + the admin UI dev server
// + headless Chrome: login, TOTP enrolment, create an album, upload photos, unhide, see it published.
import * as fs from 'node:fs'; import * as os from 'node:os'; import * as path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(path.join(execSync('npm root -g').toString().trim(), 'puppeteer', 'lib', 'esm', 'puppeteer', 'puppeteer.js'))).default;
const { openDb } = await import(`${R}/backend/db/db.ts`);
const { importG2 } = await import(`${R}/backend/importG2.ts`);
const { fakeSql, TREE_CONFIG, writeImages } = await import(`${R}/backend/fakeGallery.ts`);
const { inviteUser } = await import(`${R}/backend/auth/users.ts`);
const { totp } = await import(`${R}/backend/auth/totp.ts`);
const { createRequire } = await import('node:module');
const sharp = createRequire(`${R}/backend/package.json`)('sharp');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-admin-'));
const dbFile = path.join(tmp, 'gallery.sqlite');
const db = openDb(dbFile);
await importG2({ sql: fakeSql, config: TREE_CONFIG, db });
await writeImages(path.join(tmp, 'g2/albums'));
inviteUser(db, 'e2e@example.com', 'admin');
db.close();
fs.writeFileSync(path.join(tmp, 'config.json'), JSON.stringify({ ...TREE_CONFIG, albumsRoot: 'g2/albums', thumbnailsRoot: 'g2/thumbs', resizedRoot: 'g2/resized', publishedAlbumsRoot: 'g2/published' }));
const photos = [];
for (const [n, c] of [['first.jpg', { r: 200, g: 30, b: 30 }], ['second.jpg', { r: 30, g: 200, b: 30 }]]) {
  const p = path.join(tmp, n); fs.writeFileSync(p, await sharp({ create: { width: 640, height: 480, channels: 3, background: c } }).jpeg().toBuffer()); photos.push(p);
}
const env = { ...process.env, GALLERY_DB: dbFile, PORT: '3199', HOST: '127.0.0.1', DEV_FAKE_ACCESS_EMAIL: 'e2e@example.com', PROJECT_ROOT: tmp, CONFIG_JSON: path.join(tmp, 'config.json'), AUDIT_LOG_FILE: path.join(tmp, 'audit.jsonl'), REGEN_TICK_MS: '3000', REGEN_SETTLE_MS: '2000', REGEN_DEBOUNCE_MS: '1000' };
const server = spawn(process.execPath, ['--no-warnings=ExperimentalWarning', 'server.ts'], { cwd: `${R}/backend`, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const serverLog = []; server.stdout.on('data', (d) => serverLog.push(String(d))); server.stderr.on('data', (d) => serverLog.push(String(d)));
const vite = spawn('npx', ['vite', '--port', '5174', '--strictPort', '--host', '127.0.0.1'], { cwd: `${R}/admin`, env: { ...process.env, ADMIN_API: 'http://127.0.0.1:3199' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
vite.stderr.on('data', (d) => process.stderr.write('[vite] ' + d));
const wait = async (url, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 300)); } throw new Error('not up: ' + url); };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--disable-dev-shm-usage'] });
const out = { push: (l) => { process.stderr.write(`[e2e] ${l}\n`); } };
try {
  await wait('http://127.0.0.1:3199/healthz'); await wait('http://127.0.0.1:5174/');
  const page = await browser.newPage(); await page.setViewport({ width: 1200, height: 900 });
  page.on('pageerror', (e) => out.push('pageerror ' + e.message));
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="totp-secret"]', { timeout: 20000 });
  const secret = await page.$eval('[data-testid="totp-secret"]', (e) => e.textContent.trim());
  out.push(`totp setup shown, secret ${secret.length} chars`);
  await page.type('#totp-code', totp(secret));
  await page.click('#totp-code ~ button, form button[type="submit"]').catch(async () => { await page.keyboard.press('Enter'); });
  await page.waitForSelector('[aria-label="Sub-albums"]', { timeout: 20000 });
  out.push('logged in: album tree visible');
  await page.screenshot({ path: '' + (process.env.SHOTS ?? os.tmpdir()) + '/admin-tree.png' });
  // create an album under the root
  const btn = await page.$$('button'); let clicked = false;
  for (const b of btn) { if ((await b.evaluate((e) => e.textContent.trim())) === 'New album') { await b.click(); clicked = true; break; } }
  if (!clicked) throw new Error('no New album button');
  await page.waitForSelector('form[aria-label="New album"]', { timeout: 10000 });
  const titleId = await page.$eval('form[aria-label="New album"] label', (l) => l.htmlFor);
  await page.type('#' + titleId, 'Testlan 2026');
  await page.click('form[aria-label="New album"] button[type="submit"]');
  // the page lists the new album; open it
  await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Sub-albums"] a')].some((a) => a.textContent.includes('Testlan 2026')), { timeout: 15000 });
  const link = (await page.$$('[aria-label="Sub-albums"] a')).at(-1);
  const links = await page.$$eval('[aria-label="Sub-albums"] a', (as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
  const mine = links.find(([t]) => t.includes('Testlan 2026'));
  out.push(`album created and listed: ${JSON.stringify(mine)}`);
  await page.goto('http://127.0.0.1:5174/' + mine[1].replace(/^\.?\//, ''), { waitUntil: 'networkidle0' });
  const albumId = Number(page.url().split('/').pop());
  out.push(`opened album ${albumId}: ${page.url()}`);
  void link;
  await page.waitForSelector('input[type="file"]', { timeout: 10000 });
  const input = await page.$('input[type="file"]');
  await input.uploadFile(...photos);
  await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Photos"] li').length >= 2, { timeout: 30000 });
  out.push('2 photos uploaded and listed');
  // unhide
  await page.click('button[aria-label="Publish album"]');
  await page.waitForFunction(() => /Publishing/.test(document.body.innerText), { timeout: 10000 }).catch(() => out.push('(no Publishing… seen, fast run)'));
  await page.waitForFunction(() => /\bPublished\b/.test(document.body.innerText) && !/Publishing/.test(document.body.innerText), { timeout: 40000 });
  out.push('regeneration finished (Published)');
  await page.screenshot({ path: '' + (process.env.SHOTS ?? os.tmpdir()) + '/admin-album.png' });
  // the public files
  const file = path.join(tmp, 'data', `${albumId}.json`);
  const album = JSON.parse(fs.readFileSync(file, 'utf8'));
  out.push(`data/${albumId}.json: ${album.children.length} children, title "${album.metadata.albumTitle}", hidden items none: ${album.children.every((c) => c.type === 'GalleryPhotoItem')}`);
  for (const c of album.children) { fs.accessSync(path.join(tmp, 'g2/thumbs', c.thumbnailUrlPath)); fs.accessSync(path.join(tmp, 'g2/published', c.urlPath)); }
  out.push('thumbnails and published links exist');
  const root = JSON.parse(fs.readFileSync(path.join(tmp, 'data', '7.json'), 'utf8'));
  out.push(`root lists the album: ${root.children.some((c) => c.id === albumId)}; path index: ${Object.entries(JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'index.json'), 'utf8')).pathIndex).find(([, v]) => v === albumId)?.[0]}`);
  const d2 = openDb(dbFile);
  out.push('audit actions: ' + d2.all('SELECT action FROM audit_log ORDER BY id').map((r) => r.action).join(', '));
  out.push('url locked: ' + d2.get('SELECT url_locked_at FROM items WHERE id = ?', albumId).url_locked_at);
  d2.close();
} catch (e) {
  out.push('FAILED: ' + (e.stack || e.message));
  out.push('server log tail: ' + serverLog.slice(-5).join(''));
} finally {
  await browser.close(); for (const c of [server, vite]) { try { process.kill(-c.pid, 'SIGTERM'); } catch {} }
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.stderr.write('[e2e] done\n');
process.exit(0);
