const assert = require('node:assert/strict');
const { screen } = require('electron');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function checkFullscreen(win) {
  async function until(check, label) {
    const deadline = Date.now() + 25000;
    while (!await check()) {
      if (Date.now() > deadline) throw new Error(label);
      await delay(80);
    }
    await delay(160);
  }
  const equalRect = (a, b) => ['x', 'y', 'width', 'height'].every(k => Math.abs(a[k] - b[k]) <= 1);
  const coversDisplay = () => {
    const display = screen.getDisplayMatching(win.getBounds());
    return win.isFullScreen() && equalRect(win.getBounds(), display.bounds) && equalRect(win.getContentBounds(), display.bounds);
  };
  function tap(keyCode, modifiers = []) {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
  }
  await until(coversDisplay, 'Startup did not fill the display with game content');
  const startup = { bounds: win.getBounds(), contentBounds: win.getContentBounds(), display: screen.getDisplayMatching(win.getBounds()).bounds };
  await until(() => win.webContents.executeJavaScript('Boolean(window.__AZHORA__)'), 'Game did not initialize');
  const state = () => win.webContents.executeJavaScript('window.__AZHORA__.state()');
  const initialMode = (await state()).mode;

  tap('F11');
  await until(() => !win.isFullScreen(), 'F11 did not return to a window');
  assert(!equalRect(win.getContentBounds(), startup.display), 'Windowed content still covers the whole display');
  tap('Enter', ['alt']);
  await until(coversDisplay, 'Alt+Enter did not restore native fullscreen');
  assert.equal((await state()).mode, initialMode, 'Fullscreen shortcut also triggered a game action');

  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'F11', modifiers: ['isAutoRepeat'] });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'F11' });
  await delay(200);
  assert(coversDisplay(), 'Holding F11 repeatedly toggled fullscreen');

  await win.webContents.executeJavaScript("window.__AZHORA__.review('walk')");
  tap('Escape');
  await until(async () => (await state()).mode === 'pause', 'Escape did not open the pause menu');
  assert(coversDisplay(), 'Escape left fullscreen instead of pausing');
  tap('Escape');
  await until(async () => (await state()).mode === 'playing', 'Escape did not resume');
  tap('Enter', ['alt']);
  await until(() => !win.isFullScreen(), 'Alt+Enter did not exit fullscreen');
  tap('F11');
  await until(coversDisplay, 'F11 did not restore fullscreen');
  return { ok: true, startup, shortcuts: ['F11', 'Alt+Enter'], repeatIgnored: true, escapePauses: true, finalFullscreen: win.isFullScreen() };
};
