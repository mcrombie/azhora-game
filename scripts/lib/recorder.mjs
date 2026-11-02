/**
 * What the offline recorders share (6 October 2026; docs/flyover-video.md): the tools, a read-only static server, the
 * game loaded headless on the discrete GPU under the virtual clock (./virtual-clock.mjs), the encoder fed JPEG
 * frames through a pipe, and the contact sheet. scripts/record-flyover.mjs films the dragon on a path from the canvas
 * alone; scripts/record-quest.mjs films a quest with the HUD, from screenshots. Neither ever opens a window.
 *
 * Playwright is looked up locally, then in PLAYWRIGHT_DIR, then in the sibling project that has it. MP4 output
 * needs full ffmpeg; the existing local full build is preferred to Playwright's VP8-only bundled encoder.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { installVirtualClock } from './virtual-clock.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const { isPublicFile } = require('../public-file.cjs');
const PLAYWRIGHT_FALLBACKS = [process.env.PLAYWRIGHT_DIR, 'C:/Users/Michael/Programs/cromonsters/node_modules/playwright'].filter(Boolean);
export const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-high-performance-gpu'];
const FULL_FFMPEG = 'C:/Users/Michael/Programs/crombot/crombot_two_minute_demo/crombot_one_photos_videos/scripts/tools/ffmpeg.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
const stamp = () => new Date().toISOString().slice(11, 19);
export const log = (...parts) => console.log(stamp(), ...parts);
export const percentile = (values, q) => { const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0; };
export const msSummary = values => values.length ? { mean: Math.round(values.reduce((a, b) => a + b, 0) / values.length), p50: percentile(values, .5),
  p95: percentile(values, .95), max: Math.max(...values) } : null;

// ---------------------------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------------------------
export async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  for (const dir of PLAYWRIGHT_FALLBACKS) {
    try { return createRequire(path.join(dir, 'package.json'))(dir); } catch {}
  }
  throw new Error('Playwright not found: install it locally or set PLAYWRIGHT_DIR to its package folder');
}

export function findFfmpeg(explicit = process.env.FFMPEG) {
  if (explicit) return explicit;
  if (fs.existsSync(FULL_FFMPEG)) return FULL_FFMPEG;
  const base = path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright');
  const found = fs.existsSync(base) ? fs.readdirSync(base).filter(d => /^ffmpeg-\d+$/.test(d)).sort().reverse()
    .map(d => path.join(base, d, process.platform === 'win32' ? 'ffmpeg-win64.exe' : 'ffmpeg-linux')).filter(f => fs.existsSync(f)) : [];
  return found[0] ?? 'ffmpeg';
}

export function findFfprobe(explicit = process.env.FFPROBE) {
  if (explicit) return explicit;
  const sibling = path.join(path.dirname(findFfmpeg()), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
  return fs.existsSync(sibling) ? sibling : 'ffprobe';
}

/** Resolve installed recording dependencies without downloading or installing anything. */
export async function getBrowserDeps() {
  const { chromium } = await loadPlaywright();
  return { chromium, executablePath: findChromium(chromium), ffmpeg: findFfmpeg(), ffprobe: findFfprobe(), args: [...GPU_ARGS] };
}

/** Playwright's own Chromium when it is installed, otherwise the newest one Playwright has downloaded (CHROME_PATH overrides). */
export function findChromium(chromium, explicit = process.env.CHROME_PATH) {
  if (explicit) return explicit;
  try { const own = chromium.executablePath(); if (fs.existsSync(own)) return own; } catch {}
  const base = path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright');
  const found = fs.existsSync(base) ? fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)))
    .map(d => path.join(base, d, 'chrome-win64', 'chrome.exe')).filter(f => fs.existsSync(f)) : [];
  if (!found.length) throw new Error('No Chromium found: run npx playwright install chromium or set CHROME_PATH');
  return found[0];
}

/** A read-only static server for the project, refusing anything the game's own host refuses. */
export async function startServer(port = 0, root = ROOT) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    if (pathname === '/favicon.ico' && !fs.existsSync(path.join(root, 'favicon.ico'))) { res.writeHead(204).end(); return; }
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!isPublicFile(root, target)) { res.writeHead(403).end(); return; }
    let stat;
    try { stat = fs.statSync(target); } catch { res.writeHead(404).end(); return; }
    if (!stat.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': stat.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = fs.createReadStream(target);
    stream.on('error', error => res.destroy(error));
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}

// ---------------------------------------------------------------------------------------------
// The game
// ---------------------------------------------------------------------------------------------
/** Launch headless Chromium on the discrete GPU, install the virtual clock and load the whole world. */
export async function openGame({ width = 1920, height = 1080, port = 0, timeoutMs = 15 * 60_000,
  pathname = '/index.html?test=1&mode=war&load=full' } = {}) {
  const { chromium } = await loadPlaywright();
  const server = await startServer(port);
  const url = `http://127.0.0.1:${server.address().port}${pathname}`;
  const executablePath = findChromium(chromium);
  const browser = await chromium.launch({ executablePath, headless: true, args: GPU_ARGS });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.addInitScript(installVirtualClock, {});
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(String(error?.stack ?? error).slice(0, 400)));
  page.on('console', message => {
    if (message.type() === 'error' || /Shader Error|WebGLProgram/.test(message.text())) consoleErrors.push(`${message.text().slice(0, 300)} ${message.location()?.url ?? ''}`.trim());
  });
  const close = async () => { await browser.close().catch(() => {}); await new Promise(resolve => server.close(resolve)); };
  try {
    const started = Date.now();
    log('loading', url, `${width}x${height}`, 'in', executablePath);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    let lastNote = 0;
    for (;;) {
      const s = await page.evaluate(() => {
        return { ready: !!window.__EXPLORATION__ && !!document.getElementById('loading-screen')?.hidden,
          fatal: window.__EXPLORATION_ERROR__ ?? '', label: document.getElementById('loading-message')?.textContent ?? '' };
      });
      if (s.fatal) throw new Error('The game failed to load: ' + s.fatal.slice(0, 600));
      if (s.ready) break;
      if (Date.now() - started > timeoutMs) throw new Error(`The world did not load in ${timeoutMs / 1000} s`);
      if (Date.now() - lastNote > 20_000) { lastNote = Date.now(); log(`  loading ${Math.round((Date.now() - started) / 1000)} s: ${s.label}`); }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const loadMs = Date.now() - started;
    const renderer = await page.evaluate(() => {
      const gl = document.getElementById('exploration-canvas')?.getContext('webgl2') ?? document.createElement('canvas').getContext('webgl2');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
    log('loaded in', Math.round(loadMs / 1000), 's on', renderer);
    if (!/NVIDIA/i.test(renderer)) log('WARNING: the renderer is not the NVIDIA GPU; recording on', renderer);
    return { page, context, browser, server, loadMs, renderer, consoleErrors, close };
  } catch (error) { await close(); throw error; }
}

/** Run `count` real animation frames: for settling before the clock is frozen. */
export const realFrames = (page, count = 1) => page.evaluate(async n => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); }, count);

/**
 * A screenshot of the whole page, DOM and all, as JPEG: what the quest recorder films. CDP's own capture, which is
 * leaner than page.screenshot() (no caret style injected, no font wait). It draws a fresh compositor frame, so it
 * shows the frame the last __tick drew (record-quest.mjs --verify measures that).
 */
export async function screenCapture(page, { quality = 95 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  return async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: Math.round(quality), optimizeForSpeed: true })).data, 'base64');
}

// ---------------------------------------------------------------------------------------------
// The video
// ---------------------------------------------------------------------------------------------
function spawnEncoder(ffmpeg, out, fps, bitrate, { crf = 20, preset = 'medium' } = {}) {
  const mp4 = /\.mp4$/i.test(out);
  const codec = mp4
    ? ['-c:v', 'libx264', '-crf', String(crf), '-preset', preset, '-threads', '4', '-movflags', '+faststart']
    : ['-c:v', 'libvpx', '-b:v', bitrate, '-crf', '6', '-qmin', '0', '-qmax', '30', '-deadline', 'good', '-cpu-used', '2',
      '-threads', '4', '-auto-alt-ref', '1', '-lag-in-frames', '16'];
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg',
    '-framerate', String(fps), '-i', 'pipe:0', '-an', ...codec,
    '-vf', 'scale=in_range=full:out_range=tv', '-color_range', 'tv', '-pix_fmt', 'yuv420p', out];
  const child = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  let tail = '';
  child.stderr.on('data', chunk => { tail = (tail + chunk).slice(-4000); });
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.stdin.on('error', error => reject(new Error(`ffmpeg input failed: ${error.message}; ${tail.slice(-800)}`)));
    child.once('close', code => code === 0 ? resolve(tail) : reject(new Error(`ffmpeg exited ${code}: ${tail.slice(-800)}`)));
  });
  return { child, done };
}

/**
 * JPEG frames in, H.264 MP4 (or legacy VP8 WebM) out. Await each write: only one frame can be pending, with no
 * unbounded encoder queue. Audio is muxed by the recording driver after synchronized offline rendering.
 * `keepFrames` additionally keeps each JPEG in <name>-frames/. abort() removes only this incomplete output file.
 */
export function createVideo({ out, fps = 30, bitrate = '14M', ffmpeg = findFfmpeg(), keepFrames = false,
  crf = 20, preset = 'medium' }) {
  if (typeof out !== 'string' || !/\.(mp4|webm)$/i.test(out)) throw new Error('Recording output must be an MP4 or WebM file');
  if (!Number.isFinite(fps) || fps <= 0 || fps > 240) throw new Error('Recording frame rate must be between 0 and 240');
  if (!Number.isFinite(crf) || crf < 0 || crf > 51) throw new Error('H.264 CRF must be between 0 and 51');
  const base = out.replace(/\.[^./\\]+$/, '');
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const framesDir = keepFrames ? base + '-frames' : null;
  if (framesDir) fs.mkdirSync(framesDir, { recursive: true });
  const encoder = spawnEncoder(ffmpeg, out, fps, bitrate, { crf, preset });
  let failed = null, frames = 0, jpegBytes = 0, writing = false, ended = false;
  encoder.done.then(() => { if (!ended) failed = new Error('ffmpeg stopped before recording finished'); }, error => { failed = error; });
  return {
    base, out, fps,
    async write(jpeg) {
      if (failed) throw failed;
      if (ended) throw new Error('Cannot write after recording has ended');
      if (writing) throw new Error('Await the previous video.write before writing another frame');
      if (!Buffer.isBuffer(jpeg) || !jpeg.length || jpeg.length > 64 * 1024 * 1024) throw new Error('Expected a JPEG buffer under 64 MB');
      writing = true;
      try {
        if (framesDir) fs.writeFileSync(path.join(framesDir, `f${String(frames).padStart(7, '0')}.jpg`), jpeg);
        await new Promise((resolve, reject) => encoder.child.stdin.write(jpeg, error => error ? reject(error) : resolve()));
        if (failed) throw failed;
        frames++; jpegBytes += jpeg.length;
      } finally { writing = false; }
    },
    /** Close the pipe and wait for ffmpeg; returns the file's numbers. */
    async finish() {
      if (failed) throw failed;
      if (writing) throw new Error('Await the last video.write before finishing');
      if (ended) throw new Error('Recording has already ended');
      ended = true;
      encoder.child.stdin.end();
      await encoder.done;
      const bytes = fs.statSync(out).size, seconds = frames / fps;
      return { frames, seconds, bytes, mbps: +(bytes * 8 / seconds / 1e6).toFixed(2), jpegKB: Math.round(jpegBytes / Math.max(1, frames) / 1024) };
    },
    async abort() {
      ended = true;
      encoder.child.stdin.destroy(); encoder.child.kill();
      await encoder.done.catch(() => {});
      fs.rmSync(out, { force: true });
    },
    get frames() { return frames; },
  };
}

/** One picture of a whole recording: the kept frames ({jpeg, label}) in a grid, each with its label. */
export async function writeContactSheet(game, frames, file, { columns = 4, width = 480 } = {}) {
  if (!frames.length) return null;
  const page = await game.context.newPage();
  try {
    const cells = frames.map(f => `<figure><img src="data:image/jpeg;base64,${f.jpeg.toString('base64')}"><figcaption>${String(f.label).replace(/[<&]/g, '')}</figcaption></figure>`).join('');
    await page.setViewportSize({ width: columns * (width + 8) + 8, height: 600 });
    await page.setContent(`<!doctype html><style>body{margin:0;padding:4px;background:#111;color:#eee;font:13px system-ui;display:grid;grid-template-columns:repeat(${columns},${width}px);gap:8px}
      figure{margin:0}img{width:${width}px;display:block}figcaption{padding:2px 0}</style>${cells}`);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } finally { await page.close(); }
}
