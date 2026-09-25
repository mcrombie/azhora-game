const { app, BrowserWindow, ipcMain } = require('electron');
const { createCheckpointStore } = require('./scripts/checkpoint-store.cjs');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const smoke = process.argv.includes('--smoke-test');
const cagneyAutoplayChecksOnly = smoke && process.argv.includes('--cagney-autoplay-checks');
const portCalosChecksOnly = smoke && process.argv.includes('--port-calos-checks');
const wineryChecksOnly = smoke && process.argv.includes('--winery-checks');
const testingToolsChecksOnly = smoke && process.argv.includes('--testing-tools-checks');
const drentChecksOnly = smoke && process.argv.includes('--drent-checks');
const magicChecksOnly = smoke && process.argv.includes('--magic-checks');
const benFightChecksOnly = smoke && process.argv.includes('--ben-fight-checks');
const livingChecksOnly = smoke && process.argv.includes('--living-checks');
const republicChecksOnly = smoke && process.argv.includes('--republic-checks');
const benAutoplayChecksOnly = smoke && process.argv.includes('--ben-autoplay-checks');
const magicAutoplayKind = smoke && (process.argv.includes('--liz-autoplay-checks')?'liz':process.argv.includes('--troy-autoplay-checks')?'troy':null);
const lawChecksOnly = smoke && process.argv.includes('--law-checks');
const companionCombatChecksOnly = smoke && process.argv.includes('--companion-combat-checks');
const presentationChecksOnly = smoke && process.argv.includes('--presentation-checks');
const journalChecksOnly = smoke && process.argv.includes('--journal-checks');
const cartographyChecksOnly = smoke && process.argv.includes('--cartography-checks');
const chartReloadOnly = smoke && process.argv.includes('--cartography-reload-check');
const mainArcChecksOnly = smoke && process.argv.includes('--main-arc-checks');
const reviewOnly = smoke && process.argv.includes('--review-only');
const traverseOnly = smoke && process.argv.includes('--traverse-road');
const roadChecksOnly = smoke && process.argv.includes('--road-checks');
const roadReviewOnly = smoke && process.argv.includes('--road-review');
const catReviewOnly = smoke && process.argv.includes('--cat-review');
const lakotaReviewOnly = smoke && process.argv.includes('--lakota-review');
const wineryReviewOnly = smoke && process.argv.includes('--winery-review');
const atticReviewOnly = smoke && process.argv.includes('--attic-review');
const troupeReviewOnly = smoke && process.argv.includes('--troupe-review');
const perfReviewOnly = smoke && process.argv.includes('--perf-review');
const drawReviewOnly = smoke && process.argv.includes('--draw-review');
/**
 * Any review views, photographed in turn: --review-views=brandy,brandy-close
 *
 * **Semicolons separate too, and a view that carries commas needs them.** `stand-at:x,z,facing`
 * takes its arguments in commas, so splitting the list on commas tore it into four views named
 * `-806.1`, `-521.0`, `-1.57` and `5`, each of which matched nothing and was photographed as
 * wherever the traveler happened to be. A list with a semicolon in it is split on semicolons
 * alone, so every call that has ever been written goes on working.
 */
const reviewArg = smoke ? (process.argv.find(arg => arg.startsWith('--review-views=')) ?? '').slice(15) : '';
const reviewViews = reviewArg.split(reviewArg.includes(';') ? ';' : ',').map(view => view.trim()).filter(Boolean)
  // A comma-split list also has to put `stand-at:x,z,facing` back together: only a view with a
  // colon in it takes arguments, and every one of its arguments is a number, so a numeric piece
  // belongs to the view in front of it.
  .reduce((views, piece) => {
    const last = views[views.length - 1];
    if (last && last.includes(':') && /^-?\d+(\.\d+)?$/.test(piece)) views[views.length - 1] = `${last},${piece}`;
    else views.push(piece);
    return views;
  }, []);
/**
 * A view's own name is its file name, and `stand-at:-806,-521,-1.57` is not one Windows will
 * take: the colon makes it an alternate data stream and the write fails with no picture and no
 * complaint. Everything but letters, digits and a dash becomes a dash.
 */
const shotName = view => String(view).replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'view';
/** `--review-clean` hides the HUD for the review pictures; `--review-jpeg` saves them as .jpg, a fraction of the size. */
const reviewClean = process.argv.includes('--review-clean'), reviewJpeg = process.argv.includes('--review-jpeg');
// Screenshot-only viewport override; normal launches and other smoke checks retain their defaults.
const reviewSizeArg = smoke && reviewViews.length ? process.argv.find(arg => arg.startsWith('--review-size=')) : null;
let reviewSize = null;
if (reviewSizeArg) {
  const match = /^--review-size=(\d+)x(\d+)$/.exec(reviewSizeArg);
  const width = Number(match?.[1]), height = Number(match?.[2]);
  if (!match || width < 900 || width > 3840 || height < 640 || height > 2160)
    throw new Error('Review size must be WIDTHxHEIGHT between 900x640 and 3840x2160.');
  reviewSize = { width, height };
}
// `--opening-review` lets the computer play the opening and keeps a picture of every moment worth a look.
const openingReviewOnly = smoke && process.argv.includes('--opening-review');
// `--map-review` pictures the chart as a new player first opens it, and again later in the story.
const mapReviewOnly = smoke && process.argv.includes('--map-review');
const forestReviewOnly = smoke && process.argv.includes('--forest-review');
const forestChecksOnly = smoke && process.argv.includes('--forest-checks');
const developerReviewOnly = smoke && process.argv.includes('--developer-review');
const developerChecksOnly = smoke && process.argv.includes('--developer-checks');
const autoplayChecksOnly = smoke && process.argv.includes('--autoplay-checks');
// `--autoplay-from=<story start>` plays one leg of the arc instead of the whole road.
const autoplayFrom = (process.argv.find(argument => argument.startsWith('--autoplay-from=')) || '').split('=')[1] || '';
const autoplaySide = (process.argv.find(argument => argument.startsWith('--autoplay-side=')) || '').split('=')[1] || '';
const autoplayOptions = JSON.stringify({ ...(autoplayFrom ? { from: autoplayFrom } : {}), ...(autoplaySide ? { side: autoplaySide } : {}) });
const hideoutChecksOnly = smoke && process.argv.includes('--hideout-checks');
const fishingLessonChecksOnly = smoke && process.argv.includes('--fishing-lesson-checks');
const fireMakingChecksOnly = smoke && process.argv.includes('--fire-making-checks');
const visualArtsChecksOnly = smoke && process.argv.includes('--visual-arts-checks');
const roadAmbushChecksOnly = smoke && process.argv.includes('--road-ambush-checks');
const roadSkillsChecksOnly = smoke && (process.argv.includes('--road-skills-checks') || process.argv.includes('--glun-wood-checks'));
const hideoutHostilityChecksOnly = smoke && process.argv.includes('--hideout-hostility-checks');
const hideoutReviewOnly = smoke && process.argv.includes('--hideout-review');
const localMapChecksOnly = smoke && process.argv.includes('--local-map-checks');
const localMapReviewOnly = smoke && process.argv.includes('--local-map-review');
const regionalLifeChecksOnly = smoke && process.argv.includes('--regional-life-checks');
const regionalLifeReviewOnly = smoke && process.argv.includes('--regional-life-review');
const unbatchedWorld = roadReviewOnly && process.argv.includes('--unbatched-world');
const playthroughOnly = smoke && process.argv.includes('--playthrough-only');
const windowTest = process.argv.includes('--window-test');
if (smoke || windowTest) {
  const profileRoot = path.resolve(__dirname, 'tests', '.electron-profiles');
  const profile = path.resolve(process.env.AZHORA_TEST_PROFILE || path.join(profileRoot, `direct-${process.pid}`));
  if (!profile.startsWith(profileRoot + path.sep)) throw new Error('Test profile must stay inside the isolated test directory.');
  fs.mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
  app.setPath('sessionData', profile);
}
let server;
let mainWindow;
const errors = [];
/**
 * What the frame's one catch caught, asked of the page (src/frame-errors.js). A review run
 * must never write a picture of a broken frame: the fatal panel is only checked at load, and
 * a throw arriving while the camera is placed used to be photographed and filed.
 */
const frameErrorsOf = async win => {
  const seen = await win.webContents.executeJavaScript('window.__AZHORA__?.state?.().frameErrors ?? null').catch(() => null);
  if (!seen || !seen.count) return '';
  return `${seen.count} frame error(s): ${seen.first?.message ?? '?'}${seen.first?.at ? ' at ' + seen.first.at : ''}`;
};
const launchStatePath = path.join(__dirname, 'logs', 'window-state.json');
function recordWindowState(event) {
  if (smoke || windowTest || !mainWindow || mainWindow.isDestroyed()) return;
  fs.mkdirSync(path.dirname(launchStatePath), { recursive: true });
  fs.writeFileSync(launchStatePath, JSON.stringify({ event, pid:process.pid, visible:mainWindow.isVisible(), minimized:mainWindow.isMinimized(), focused:mainWindow.isFocused(), fullscreen:mainWindow.isFullScreen(), title:mainWindow.getTitle(), bounds:mainWindow.getBounds(), time:new Date().toISOString() }, null, 2));
}
function revealGame() {
  if (!mainWindow || mainWindow.isDestroyed() || smoke) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  recordWindowState('shown');
}
const ownsInstance = smoke || windowTest || app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
app.on('second-instance', revealGame);
app.on('activate', revealGame);
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
if (ownsInstance) app.whenReady().then(async () => {
  const roadStore=createCheckpointStore({directory:path.join(__dirname,'saves'),memoryOnly:smoke||windowTest});
  ipcMain.on('azhora:road-checkpoint',(event,operation,key,value)=>{
    event.returnValue=event.sender===mainWindow?.webContents?roadStore.handle(operation,key,value):{ok:false,reason:'This window cannot access the road checkpoint.'};
  });
  server = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    const target = path.resolve(__dirname, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(__dirname + path.sep)) { res.writeHead(403).end(); return; }
    const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
    fs.readFile(target, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }); res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const win = mainWindow = new BrowserWindow({ width: reviewSize?.width ?? 1440, height: reviewSize?.height ?? 960, minWidth: 900, minHeight: 640, show: false, title: 'Azhora · An Adventure Game', icon:path.join(__dirname,'assets','azhora.ico'), backgroundColor: '#9bc3cb', autoHideMenuBar: true,
    fullscreen: !smoke, fullscreenable: true,
    webPreferences: { preload:path.join(__dirname,'preload.cjs'),nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false, offscreen: smoke } });
  win.once('ready-to-show', revealGame);
  // Movement uses Ctrl + W/R; native Electron menu shortcuts must not close
  // or reload the adventure while the player dodges.
  win.removeMenu();
  // Native fullscreen covers the display, including the Windows taskbar area.
  // Handle these before the renderer so Alt+Enter cannot also advance dialogue.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key !== 'F11' && !(input.key === 'Enter' && input.alt)) return;
    event.preventDefault();
    if (input.type === 'keyDown' && !input.isAutoRepeat) win.setFullScreen(!win.isFullScreen());
  });
  win.on('enter-full-screen', () => recordWindowState('enter-full-screen'));
  win.on('leave-full-screen', () => recordWindowState('leave-full-screen'));
  win.on('closed', () => { mainWindow = null; });
  if (smoke) win.webContents.setFrameRate(60);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('console-message', (_, level, message) => { if (level >= 3) errors.push(message); if (cagneyAutoplayChecksOnly && message.startsWith('CAGNEY_AUTOPLAY_PROGRESS')) console.log(message); });
  win.webContents.on('render-process-gone', (_, details) => { console.error(details); app.exit(1); });
  await win.loadURL(`http://127.0.0.1:${server.address().port}/${smoke || windowTest ? '?test=1'+(unbatchedWorld?'&spatial=0':'') : ''}`);
  if (!smoke) revealGame();
  if (windowTest) {
    const result = await require('./tests/fullscreen-check.cjs')(win);
    const artifactDir = path.join(__dirname, 'tests/artifacts'); fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, 'fullscreen.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2)); app.exit(0); return;
  }
  if (smoke) {
    const artifactDir = path.join(__dirname, 'tests/artifacts'); fs.mkdirSync(artifactDir, { recursive: true });
    const viewStats={};
    try {
      const result = await win.webContents.executeJavaScript(`new Promise((resolve, reject) => {
        const start = Date.now(); const poll = () => {
          if(window.__AZHORA__) { ${testingToolsChecksOnly ? 'window.__AZHORA__.runTestingToolsChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : cagneyAutoplayChecksOnly ? 'window.__AZHORA__.runCagneyAutoplayChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : portCalosChecksOnly ? 'window.__AZHORA__.runPortCalosChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : wineryChecksOnly ? 'window.__AZHORA__.runWineryChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : republicChecksOnly ? 'window.__AZHORA__.runRepublicChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : livingChecksOnly ? 'window.__AZHORA__.runLivingChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : magicAutoplayKind ? `window.__AZHORA__.runMagicAutoplayChecks(${JSON.stringify(magicAutoplayKind)}).then(resolve,error=>reject(new Error(error.stack||error.message)));` : benAutoplayChecksOnly ? 'window.__AZHORA__.runBenAutoplayChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : benFightChecksOnly ? 'window.__AZHORA__.runBenFightChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : companionCombatChecksOnly ? 'window.__AZHORA__.runCompanionCombatChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : magicChecksOnly ? 'window.__AZHORA__.runMagicChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : lawChecksOnly ? 'window.__AZHORA__.runLawChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : presentationChecksOnly ? 'window.__AZHORA__.runPresentationChecks().then(resolve,reject);' : drentChecksOnly ? 'window.__AZHORA__.runDrentChecks().then(resolve,reject);' : journalChecksOnly ? 'window.__AZHORA__.runJournalChecks().then(resolve,reject);' : chartReloadOnly ? 'window.__AZHORA__.runChartReloadCheck().then(resolve,reject);' : cartographyChecksOnly ? 'window.__AZHORA__.runCartographyChecks().then(resolve,reject);' : mainArcChecksOnly ? 'window.__AZHORA__.runMainArcChecks().then(resolve,reject);' : autoplayChecksOnly ? `window.__AZHORA__.runAutoplayChecks(${autoplayOptions}).then(resolve,reject);` : regionalLifeChecksOnly ? 'window.__AZHORA__.runRegionalLifeChecks().then(resolve,reject);' : regionalLifeReviewOnly ? 'window.__AZHORA__.reviewRegional("mill-yard");resolve({reviewOnly:true});' : localMapChecksOnly ? 'window.__AZHORA__.runLocalMapChecks().then(resolve,reject);' : fishingLessonChecksOnly ? 'window.__AZHORA__.runFishingLessonsChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : fireMakingChecksOnly ? 'window.__AZHORA__.runFireMakingChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : visualArtsChecksOnly ? 'window.__AZHORA__.runVisualArtsChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : roadAmbushChecksOnly ? 'window.__AZHORA__.runRoadAmbushChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : roadSkillsChecksOnly ? `window.__AZHORA__.runRoadSkillsChecks(${process.argv.includes('--glun-wood-checks')}).then(resolve,error=>reject(new Error(error.stack||error.message)));` : hideoutHostilityChecksOnly ? 'window.__AZHORA__.runHideoutHostilityChecks().then(resolve,error=>reject(new Error(error.stack||error.message)));' : hideoutChecksOnly ? 'window.__AZHORA__.runHideoutChecks().then(resolve,reject);' : developerChecksOnly ? 'window.__AZHORA__.runDeveloperChecks().then(resolve,reject);' : forestChecksOnly ? 'window.__AZHORA__.runForestChecks().then(resolve,reject);' : roadChecksOnly ? 'window.__AZHORA__.runRoadChecks().then(resolve,reject);' : traverseOnly ? 'window.__AZHORA__.runTraversal().then(resolve,reject);' : localMapReviewOnly ? 'window.__AZHORA__.reviewLocalMap("local-trails");resolve({reviewOnly:true});' : hideoutReviewOnly ? 'window.__AZHORA__.reviewHideout("hideout-approach"); resolve({reviewOnly:true});' : reviewOnly||roadReviewOnly||forestReviewOnly||developerReviewOnly||catReviewOnly||openingReviewOnly||mapReviewOnly||lakotaReviewOnly||wineryReviewOnly || atticReviewOnly || troupeReviewOnly || perfReviewOnly || drawReviewOnly || reviewViews.length ? 'window.__AZHORA__.review("walk"); resolve({reviewOnly:true,...window.__AZHORA__.state()});' : 'window.__AZHORA__.runSmoke().then(resolve,reject);'} }
          else if(Date.now()-start>25000) reject(new Error('Game did not initialize'));
          else setTimeout(poll,100);
        }; poll();
      })`);
      if(benAutoplayChecksOnly||magicAutoplayKind||cagneyAutoplayChecksOnly){
        const pilotId=cagneyAutoplayChecksOnly?'cagney':magicAutoplayKind||'ben',questId={ben:'ben-spider',liz:'liz-cat',troy:'cobble-murder',cagney:'cagney-escort'}[pilotId];
        const before=await win.webContents.executeJavaScript('window.__AZHORA__.state().position');
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'W'});
        await win.webContents.executeJavaScript('(async()=>{for(let i=0;i<18;i++)await new Promise(requestAnimationFrame);})()');
        win.webContents.sendInputEvent({type:'keyUp',keyCode:'W'});
        const after=await win.webContents.executeJavaScript('window.__AZHORA__.state()');
        if(after.autoplay||Math.hypot(after.position[0]-before[0],after.position[2]-before[2])<.1)throw new Error('Native WASD did not take control from quest autoplay');
        await win.webContents.executeJavaScript('(async()=>{for(let i=0;i<14;i++)await new Promise(requestAnimationFrame);})()');
        const stopped=await win.webContents.executeJavaScript('window.__AZHORA__.state()');
        if(stopped.autoplay||Math.hypot(stopped.position[0]-after.position[0],stopped.position[2]-after.position[2])>.1)throw new Error('quest autoplay kept moving after manual takeover');
        result.checks.push('Native WASD takes control and the pilot stays stopped after key release');
        result.nativeTakeover={mode:stopped.mode,autoplay:stopped.autoplay,position:stopped.position};
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'P'});
        win.webContents.sendInputEvent({type:'keyUp',keyCode:'P'});
        const resumed=await win.webContents.executeJavaScript('(async()=>{const begin=performance.now(),origin=window.__AZHORA__.state().position;while(performance.now()-begin<8000){await new Promise(requestAnimationFrame);const s=window.__AZHORA__.state();if(!s.autoplay||s.mode==="dialogue"||Math.hypot(s.position[0]-origin[0],s.position[2]-origin[2])>.2)return {state:s,pilot:window.__AZHORA__.autoplay()};}return {state:window.__AZHORA__.state(),pilot:window.__AZHORA__.autoplay()};})()');
        if(!resumed.pilot.active||resumed.pilot.id!==pilotId||resumed.state.trackedQuestId!==questId)throw new Error('Native P did not resume the focused side quest');
        if(resumed.state.mode!=='dialogue'&&Math.hypot(resumed.state.position[0]-stopped.position[0],resumed.state.position[2]-stopped.position[2])<.1)throw new Error('The resumed quest pilot did not continue walking or conversation');
        result.checks.push('Native P resumes the focused side quest instead of the main road');
        result.nativeResume={pilot:resumed.pilot,trackedQuestId:resumed.state.trackedQuestId,position:resumed.state.position};
        win.webContents.sendInputEvent({type:'keyDown',keyCode:'W'});
        await win.webContents.executeJavaScript('(async()=>{for(let i=0;i<10;i++)await new Promise(requestAnimationFrame);})()');
        win.webContents.sendInputEvent({type:'keyUp',keyCode:'W'});
        const retaken=await win.webContents.executeJavaScript('window.__AZHORA__.state()');
        await win.webContents.executeJavaScript('(async()=>{for(let i=0;i<14;i++)await new Promise(requestAnimationFrame);})()');
        const settled=await win.webContents.executeJavaScript('window.__AZHORA__.state()');
        if(settled.autoplay||Math.hypot(settled.position[0]-retaken.position[0],settled.position[2]-retaken.position[2])>.1)throw new Error('Native WASD did not stop the resumed quest pilot');
        result.checks.push('Native WASD also stops quest autoplay after resuming with P');
        result.awaitingNativeTakeover=false;
        fs.writeFileSync(path.join(artifactDir,`${pilotId}-autoplay-checks.json`),JSON.stringify({...result,errors},null,2));
        fs.writeFileSync(path.join(artifactDir,`${pilotId}-autoplay.png`),(await win.webContents.capturePage()).toPNG());
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(portCalosChecksOnly){fs.writeFileSync(path.join(artifactDir,'port-calos-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length||!result.ok||errors.length){app.exit(result.ok&&!errors.length?0:1);return;}}
      if(wineryChecksOnly){fs.writeFileSync(path.join(artifactDir,'winery-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length||!result.ok||errors.length){app.exit(result.ok&&!errors.length?0:1);return;}}
      if(testingToolsChecksOnly){fs.writeFileSync(path.join(artifactDir,'testing-tools-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length||errors.length){app.exit(errors.length?1:0);return;}}
      if(republicChecksOnly){fs.writeFileSync(path.join(artifactDir,'republic-story-checks.json'),JSON.stringify({...result,errors},null,2));fs.writeFileSync(path.join(artifactDir,'republic-story.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;}
      if(livingChecksOnly){fs.writeFileSync(path.join(artifactDir,'living-story-checks.json'),JSON.stringify({...result,errors},null,2));fs.writeFileSync(path.join(artifactDir,'living-story.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;}
      if(benFightChecksOnly){
        fs.writeFileSync(path.join(artifactDir,'ben-fight-checks.json'),JSON.stringify({...result,errors},null,2));
        fs.writeFileSync(path.join(artifactDir,'ben-fight.png'),(await win.webContents.capturePage()).toPNG());
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(companionCombatChecksOnly){
        fs.writeFileSync(path.join(artifactDir,'companion-combat-checks.json'),JSON.stringify({...result,errors},null,2));
        const image=await win.webContents.capturePage();fs.writeFileSync(path.join(artifactDir,'companion-combat.png'),image.toPNG());
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(magicChecksOnly){fs.writeFileSync(path.join(artifactDir,'magic-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length){app.exit(errors.length?1:0);return;}}
      if(lawChecksOnly){fs.writeFileSync(path.join(artifactDir,'law-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length){app.exit(errors.length?1:0);return;}}
      if(presentationChecksOnly){fs.writeFileSync(path.join(artifactDir,'presentation-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length){app.exit(errors.length?1:0);return;}}
      if(drentChecksOnly){fs.writeFileSync(path.join(artifactDir,'drent-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length){app.exit(errors.length?1:0);return;}}
      if(journalChecksOnly){
        win.setSize(900,700);
        result.compact=await win.webContents.executeJavaScript(`(async()=>{await new Promise(resolve=>setTimeout(resolve,150));return window.__AZHORA__.checkJournalLayout();})()`);
        fs.writeFileSync(path.join(artifactDir,'journal-compact.png'),(await win.webContents.capturePage()).toPNG());
        win.setSize(1440,960);
        fs.writeFileSync(path.join(artifactDir,'journal-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length){app.exit(errors.length?1:0);return;}}
      if(chartReloadOnly||cartographyChecksOnly){fs.writeFileSync(path.join(artifactDir,chartReloadOnly?'cartography-reload.json':'cartography-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length){app.exit(errors.length?1:0);return;}}
      if(mainArcChecksOnly){fs.writeFileSync(path.join(artifactDir,'main-arc-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(!reviewViews.length){app.exit(errors.length?1:0);return;}}
      if(playthroughOnly){
        fs.writeFileSync(path.join(artifactDir,'story-smoke.json'),JSON.stringify({...result,errors},null,2));
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(autoplayChecksOnly){fs.writeFileSync(path.join(artifactDir,'autoplay-smoke.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;}
      if(developerChecksOnly){fs.writeFileSync(path.join(artifactDir,'developer-smoke.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;}
      if(regionalLifeChecksOnly){
        await win.loadURL(win.webContents.getURL());
        await win.webContents.executeJavaScript('new Promise((resolve,reject)=>{const start=Date.now();const poll=()=>window.__AZHORA__?resolve():Date.now()-start>25000?reject(new Error("Regional life reload did not initialize")):setTimeout(poll,100);poll();})');
        const reloaded=await win.webContents.executeJavaScript(`window.__AZHORA__.verifyRegionalLifeReload(${JSON.stringify(result.expected)})`);
        const {expected,...report}=result;
        fs.writeFileSync(path.join(artifactDir,'regional-life-smoke.json'),JSON.stringify({...report,...reloaded,errors},null,2));
        console.log(JSON.stringify({...report,...reloaded,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(regionalLifeReviewOnly){
        for(const view of ['mill-yard','mill-complete','mill-dialogue','mill-map','workshop','workshop-complete','workshop-dialogue','shelter','shelter-record','shelter-dialogue']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewRegional(${JSON.stringify(view)});(async()=>{for(let i=0;i<30;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[view]=await win.webContents.executeJavaScript('window.__AZHORA__.regionalLife()');
        }
        win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,300));
        for(const view of ['mill-dialogue','workshop-dialogue','shelter-choice','road-notes']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewRegional(${JSON.stringify(view)});(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}-compact.png`),(await win.webContents.capturePage()).toPNG());
          const layout=await win.webContents.executeJavaScript(`(()=>{const panel=document.getElementById(${JSON.stringify(view==='road-notes'?'journal':'dialogue')}),r=panel.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,scrollable:panel.scrollHeight>panel.clientHeight};})()`);
          if(layout.top<0||layout.bottom>640||layout.left<0||layout.right>900)throw new Error('Regional dialogue exceeds compact window: '+view);
          viewStats[view+'-compact']=layout;
        }
        fs.writeFileSync(path.join(artifactDir,'regional-life-render.json'),JSON.stringify({views:viewStats,errors},null,2));
        console.log(JSON.stringify({views:Object.keys(viewStats),errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(localMapChecksOnly){
        fs.writeFileSync(path.join(artifactDir,'local-map-smoke.json'),JSON.stringify({...result,errors},null,2));
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(localMapReviewOnly){
        for(const view of ['local-nearby','local-trails','local-unknown','local-forest-pin','local-reedwater','local-world','local-zoom']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewLocalMap(${JSON.stringify(view)});(async()=>{for(let i=0;i<30;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[view]=await win.webContents.executeJavaScript('window.__AZHORA__.localMapState()');
        }
        win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,300));
        for(const view of ['local-trails','local-forest-pin','local-zoom']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewLocalMap(${JSON.stringify(view)});(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}-compact.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[`${view}-compact`]=await win.webContents.executeJavaScript('window.__AZHORA__.localMapState()');
        }
        fs.writeFileSync(path.join(artifactDir,'local-map-render.json'),JSON.stringify({views:viewStats,errors},null,2));
        console.log(JSON.stringify({views:Object.keys(viewStats),errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(hideoutReviewOnly){
        for(const view of ['hideout-approach','hideout-overview','hideout-supplies','hideout-dialogue','hideout-cleared','forest-thrush']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewHideout(${JSON.stringify(view)});(async()=>{for(let i=0;i<60;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[view]=await win.webContents.executeJavaScript('window.__AZHORA__.forestHideout()');
        }
        win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,350));
        for(const view of ['hideout-dialogue','hideout-tamsin']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewHideout(${JSON.stringify(view)});document.getElementById('dialogue-next').click();(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);})()`);
          const layout=await win.webContents.executeJavaScript(`(()=>{const panel=document.getElementById('dialogue'),r=panel.getBoundingClientRect(),buttons=[...document.querySelectorAll('#dialogue-choices button')];return {top:r.top,bottom:r.bottom,width:r.width,choices:buttons.length,scrollable:panel.scrollHeight>panel.clientHeight};})()`);
          if(layout.top<0||layout.bottom>640||layout.width>900||layout.choices<2)throw new Error('Hideout dialogue does not fit the compact window');
          viewStats[`${view}-compact`]=layout;
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}-compact.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(artifactDir,'hideout-render.json'),JSON.stringify({views:viewStats,errors},null,2));
        console.log(JSON.stringify({views:Object.keys(viewStats),errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(fishingLessonChecksOnly){fs.writeFileSync(path.join(artifactDir,'fishing-lesson-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length||!result.ok?1:0);return;}
      if(fireMakingChecksOnly){fs.writeFileSync(path.join(artifactDir,'fire-making-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length||!result.ok?1:0);return;}
      if(visualArtsChecksOnly){fs.writeFileSync(path.join(artifactDir,'visual-arts-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length||!result.ok?1:0);return;}
      if(roadAmbushChecksOnly){fs.writeFileSync(path.join(artifactDir,'road-ambush-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length||!result.ok?1:0);return;}
      if(roadSkillsChecksOnly){fs.writeFileSync(path.join(artifactDir,process.argv.includes('--glun-wood-checks')?'glun-wood-checks.json':'road-skills-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length||!result.ok?1:0);return;}
      if(hideoutHostilityChecksOnly){fs.writeFileSync(path.join(artifactDir,'hideout-hostility-checks.json'),JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;}
      if(hideoutChecksOnly){
        await win.loadURL(win.webContents.getURL());
        await win.webContents.executeJavaScript('new Promise((resolve,reject)=>{const started=Date.now();const poll=()=>window.__AZHORA__?resolve():Date.now()-started>25000?reject(new Error("Hideout reload did not initialize")):setTimeout(poll,100);poll();})');
        const reloaded=await win.webContents.executeJavaScript(`window.__AZHORA__.verifyHideoutReload(${JSON.stringify(result.expected)})`);
        const {expected,...report}=result;
        fs.writeFileSync(path.join(artifactDir,'hideout-smoke.json'),JSON.stringify({...report,...reloaded,errors},null,2));
        fs.writeFileSync(path.join(artifactDir,'hideout-reloaded.png'),(await win.webContents.capturePage()).toPNG());
        console.log(JSON.stringify({...report,...reloaded,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(developerReviewOnly){
        for(const view of ['ghost-atlas','ghost-local-atlas','cape-overview','cape-gate','cape-aerial','ghost-survey']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewDeveloper(${JSON.stringify(view)});`);
          await win.webContents.executeJavaScript('(async()=>{for(let i=0;i<60;i++)await new Promise(requestAnimationFrame);})()');
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[view]=await win.webContents.executeJavaScript('window.__AZHORA__.developer()');
        }
        win.setSize(900,640);await win.webContents.executeJavaScript('window.__AZHORA__.reviewDeveloper("ghost-local-atlas")');await new Promise(resolve=>setTimeout(resolve,700));
        fs.writeFileSync(path.join(artifactDir,'ghost-atlas-compact.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(artifactDir,'developer-render.json'),JSON.stringify({views:viewStats,errors},null,2));
        console.log(JSON.stringify({views:Object.keys(viewStats),errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(forestReviewOnly){
        for(const view of ['charcoal-hearth','bee-fold','fallen-oak','moss-shrine','fern-hollow','coast-lookout','forest-deer','forest-dialogue','forest-notes']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<60;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`forest-${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[view]=await win.webContents.executeJavaScript('(()=>{const s=window.__AZHORA__.state();return {drawCalls:s.drawCalls,triangles:s.triangles};})()');
        }
        win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,500));
        await win.webContents.executeJavaScript('window.__AZHORA__.review("forest-dialogue")');await new Promise(resolve=>setTimeout(resolve,500));
        fs.writeFileSync(path.join(artifactDir,'forest-dialogue-compact.png'),(await win.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(artifactDir,'forest-render.json'),JSON.stringify({views:viewStats,errors},null,2));
        console.log(JSON.stringify({views:viewStats,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(forestChecksOnly){
        await win.loadURL(win.webContents.getURL());
        await win.webContents.executeJavaScript('new Promise((resolve,reject)=>{const started=Date.now();const poll=()=>window.__AZHORA__?resolve():Date.now()-started>25000?reject(new Error("Forest reload did not initialize")):setTimeout(poll,100);poll();})');
        const reloaded=await win.webContents.executeJavaScript(`window.__AZHORA__.verifyForestReload(${JSON.stringify(result.expected)})`);
        const {expected,...report}=result;
        fs.writeFileSync(path.join(artifactDir,'forest-smoke.json'),JSON.stringify({...report,...reloaded,errors},null,2));
        fs.writeFileSync(path.join(artifactDir,'forest-reloaded.png'),(await win.webContents.capturePage()).toPNG());
        console.log(JSON.stringify({...report,...reloaded,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(mapReviewOnly){
        const shoot=async name=>{await new Promise(resolve=>setTimeout(resolve,900));fs.writeFileSync(path.join(artifactDir,`${name}.png`),(await win.webContents.capturePage()).toPNG());
          return {name,...await win.webContents.executeJavaScript('window.__AZHORA__.mapState()')};};
        const views=[];
        await win.loadURL(win.webContents.getURL());
        await win.webContents.executeJavaScript('new Promise((resolve,reject)=>{const start=Date.now();const poll=()=>window.__AZHORA__?resolve():Date.now()-start>25000?reject(new Error("no game")):setTimeout(poll,100);poll();})');
        await new Promise(resolve=>setTimeout(resolve,1500));
        await win.webContents.executeJavaScript(`window.__AZHORA__.review('map')`);views.push(await shoot('map-first-open'));
        // A few minutes' walking charted, then the chart opened again, then the whole continent.
        await win.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape'}));window.__AZHORA__.chartRoad(60)`);
        await new Promise(resolve=>setTimeout(resolve,500));
        await win.webContents.executeJavaScript(`window.__AZHORA__.review('map')`);views.push(await shoot('map-charted'));
        await win.webContents.executeJavaScript(`document.getElementById('atlas-fit').click()`);views.push(await shoot('map-whole'));
        fs.writeFileSync(path.join(artifactDir,'map-review.json'),JSON.stringify({views,errors},null,2));
        console.log(JSON.stringify({views,errors},null,2));app.exit(0);return;
      }
      if(openingReviewOnly){
        const dir=path.join(artifactDir,'opening');fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
        await win.loadURL(win.webContents.getURL());
        await win.webContents.executeJavaScript('new Promise((resolve,reject)=>{const start=Date.now();const poll=()=>window.__AZHORA__?resolve():Date.now()-start>25000?reject(new Error("no game")):setTimeout(poll,100);poll();})');
        await new Promise(resolve=>setTimeout(resolve,1500));
        await win.webContents.executeJavaScript('window.__AZHORA__.beginAutoplay()');
        const shots=[],started=Date.now(),limit=Number((process.argv.find(a=>a.startsWith('--review-minutes='))||'=9').split('=')[1])*60000;
        let last=null,lastShot=0,lastToast=0,still=0,lastPos=null,n=0;
        while(Date.now()-started<limit){
          await new Promise(resolve=>setTimeout(resolve,400));
          const peek=await win.webContents.executeJavaScript('window.__AZHORA__.reviewPeek()');
          const log=await win.webContents.executeJavaScript('window.__AZHORA__.reviewLog().toasts.length');
          const moved=lastPos?Math.hypot(peek.x-lastPos.x,peek.z-lastPos.z):1;lastPos={x:peek.x,z:peek.z};still=moved<.05&&peek.mode==='playing'?still+.4:0;
          const reasons=[];
          if(!last||peek.intent!==last.intent)reasons.push('intent');if(last&&peek.phase!==last.phase)reasons.push('fight '+peek.phase);
          if(last&&peek.region!==last.region)reasons.push('region');if(last&&peek.questStage!==last.questStage)reasons.push('stage');
          if(log>lastToast){reasons.push('message');lastToast=log;}if(peek.dialogue&&peek.dialogue!==last?.dialogue)reasons.push('talk');
          if(still>=6&&still<6.4)reasons.push('standing still');
          if(Date.now()-lastShot>(peek.phase==='active'?2500:9000))reasons.push('time');
          if(reasons.length){const file=`${String(++n).padStart(3,'0')}.png`;
            fs.writeFileSync(path.join(dir,file),(await win.webContents.capturePage()).resize({width:960}).toPNG());
            shots.push({file,why:reasons.join(', '),...peek});lastShot=Date.now();}
          last=peek;
          if(!peek.active&&peek.mode==='playing'&&Date.now()-started>20000)break;
          if(peek.region&&peek.region!=='Drent'&&peek.questStage===10)break;
        }
        const log=await win.webContents.executeJavaScript('window.__AZHORA__.reviewLog()');
        fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify({shots,log,errors},null,2));
        console.log(JSON.stringify({shots:shots.length,toasts:log.toasts.length,talks:log.lines.length,errors},null,2));app.exit(0);return;
      }
      if(wineryReviewOnly){
        for(const view of ['winery','winery','winery-cabin','winery-spring','winery-vines','rena-track']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<120;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({wineryViews:3,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(reviewViews.length){
        const fatal=await win.webContents.executeJavaScript("(()=>{const f=document.getElementById('fatal');return f&&!f.classList.contains('hidden')?(f.dataset.stack||'fatal'):''})()");
        if(fatal){console.log('FATAL AT LOAD: '+fatal);app.exit(1);return;}
        if(reviewClean)await win.webContents.executeJavaScript(`(()=>{const s=document.createElement('style');s.textContent='body > *:not(#world){visibility:hidden !important}';document.head.appendChild(s);})()`);
        for(const view of [reviewViews[0],...reviewViews]){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<120;i++)await new Promise(requestAnimationFrame);})()`);
          const threw=await frameErrorsOf(win);
          if(threw){console.error(`FRAME THREW while composing ${view}: ${threw}`);app.exit(1);return;}
          const picture=await win.webContents.capturePage();
          // **Through `shotName`, like every other shot in this file.** This was the one writer
          // that used the view's own text, and `--review-views` is the only flag that reaches it -
          // so `stand-at:x,z,facing` wrote to the alternate data stream of a file called
          // `stand-at`, which on Windows succeeds, writes no picture and says nothing at all.
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.${reviewJpeg?'jpg':'png'}`),reviewJpeg?picture.toJPEG(82):picture.toPNG());
          console.log(view,JSON.stringify(await win.webContents.executeJavaScript('window.__AZHORA__.camera?.()')));
        }
        console.log(JSON.stringify({views:reviewViews,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(drawReviewOnly){
        // What is drawn where, and who is in it: draw calls, figures and shadow casters at four places, looking four ways;
        // then a wader put up off the Lizeem and an otter sent into the Carica, photographed with what each was doing.
        const run=code=>win.webContents.executeJavaScript(code);
        const settle=(view,n)=>run(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<${n};i++)await new Promise(requestAnimationFrame);})()`);
        const frames=n=>run(`(async()=>{for(let i=0;i<${n};i++)await new Promise(requestAnimationFrame);})()`);
        const spots=[['Tidehaven landing',23,29],['the Lauvel field',-677.8,297.1],['Lumber Town square',-728.57,384.36],['the Moros camp',-980.65,598.9]];
        const results=[],shots=[];
        for(const [name,x,z] of spots)for(const facing of [0,1.5708,3.1416,4.7124]){
          await settle(`stand-at:${x},${z},${facing}`,60);
          const sample=await run('window.__AZHORA__.draws()');
          results.push({name,facing,...sample});
          console.log(`${name.padEnd(20)} facing ${facing.toFixed(2)} · ${sample.calls} draws · ${Math.round(sample.triangles/1000)}k tris · figures drawn ${sample.figuresDrawn}/${sample.figures} (30 m ${sample.figuresWithin30}, 60 m ${sample.figuresWithin60}, 100 m ${sample.figuresWithin100}, 120 m ${sample.figuresWithin120}), stand-ins ${sample.standIns}, casting ${sample.shadowFigures} · figure meshes ${sample.figureMeshes}, casting ${sample.figureCasterMeshes} · visible meshes ${sample.visibleMeshes}, casters ${sample.visibleCasters} · F answers ${sample.talking} · ${sample.region}`);
        }
        // The traveler steps inside the animal's fright distance with the camera behind him, looking at it: east of the
        // wader (its river is to the west), west of the otter (the Carica is to its east).
        for(const [id,label,dx,facing,waits] of [['lizeem-waders-1','west-wader-flight',9,1.5708,[30,20,20]],['carica-otters-1','west-otter-dive',-7,4.7124,[15,20,30]]]){
          const animal=await run(`window.__AZHORA__.westAnimal(${JSON.stringify(id)})`);
          if(!animal){console.log(`${label}: ${id} is not in the world`);continue;}
          await settle(`stand-at:${animal.x+dx},${animal.z},${facing},.1,9`,1);
          for(const [i,wait] of waits.entries()){
            await frames(wait);
            const now=await run(`window.__AZHORA__.westAnimal(${JSON.stringify(id)})`),file=`${label}-${i+1}.png`;
            fs.writeFileSync(path.join(artifactDir,file),(await win.webContents.capturePage()).toPNG());
            const shot={file,id,action:now.action,lift:+now.lift.toFixed(2),hidden:now.hidden,speed:+now.speed.toFixed(1),moved:+Math.hypot(now.x-animal.x,now.z-animal.z).toFixed(1)};
            shots.push(shot);console.log(JSON.stringify(shot));
          }
        }
        {const threw=await frameErrorsOf(win);if(threw){console.error(`FRAME THREW during the draw review: ${threw}`);app.exit(1);return;}}
        fs.writeFileSync(path.join(artifactDir,'draws.json'),JSON.stringify({results,shots,errors},null,2));
        console.log(JSON.stringify({drawSamples:results.length,shots:shots.length,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(perfReviewOnly){
        // Where the time goes: at each place, frame times, the game loop's own time, render time, what is drawn, and a CPU profile.
        const dbg=win.webContents.debugger;dbg.attach('1.3');await dbg.sendCommand('Profiler.enable');await dbg.sendCommand('Profiler.setSamplingInterval',{interval:250});
        await win.webContents.executeJavaScript(`window.__AZHORA__.timeRender();window.__loopTimes=[];if(!window.__rafTimed){const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(cb.name!=='render'){cb(t);return;}const s=performance.now();cb(t);window.__loopTimes.push(performance.now()-s);});window.__rafTimed=true;}`);
        const results=[];
        for(const view of ['walk','lakota','troupe-camp','wine-attic','winery','troupe-stop-ostel']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<150;i++)await new Promise(requestAnimationFrame);})()`);
          await dbg.sendCommand('Profiler.start');
          const sample=await win.webContents.executeJavaScript(`(async()=>{window.__loopTimes=[];window.__renderTimes=[];const deltas=[];let last=performance.now();for(let i=0;i<300;i++){await new Promise(requestAnimationFrame);const now=performance.now();deltas.push(now-last);last=now;}
            const stat=a=>{const s=[...a].sort((x,y)=>x-y);return{mean:+(a.reduce((x,y)=>x+y,0)/Math.max(1,a.length)).toFixed(2),p95:+(s[Math.floor(s.length*.95)]??0).toFixed(2)};};
            return{frame:stat(deltas),loop:stat(window.__loopTimes),render:stat(window.__renderTimes),...window.__AZHORA__.perf()};})()`);
          const {profile}=await dbg.sendCommand('Profiler.stop');
          const self=new Map(),byFile=new Map(),interval=profile.samples.length?(profile.endTime-profile.startTime)/profile.samples.length/1000:0;
          for(const node of profile.nodes){if(!node.hitCount)continue;const f=node.callFrame,file=(f.url||'(native)').split('/').pop(),key=`${f.functionName||'(anonymous)'} ${file}:${f.lineNumber+1}`;
            self.set(key,(self.get(key)||0)+node.hitCount*interval);byFile.set(file,(byFile.get(file)||0)+node.hitCount*interval);}
          const top=(m,n)=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>[k,+v.toFixed(1)]);
          results.push({view,...sample,profileMs:+((profile.endTime-profile.startTime)/1000).toFixed(0),topFunctions:top(self,18),byFile:top(byFile,12)});
          console.log(`${view.padEnd(20)} frame ${sample.frame.mean} ms (p95 ${sample.frame.p95}) · loop ${sample.loop.mean} ms · render ${sample.render.mean} ms · ${sample.calls} draws · ${Math.round(sample.triangles/1000)}k tris · ${sample.visibleNpcs}/${sample.npcs} npcs`);
        }
        dbg.detach();
        fs.writeFileSync(path.join(artifactDir,'perf.json'),JSON.stringify({results,errors},null,2));
        console.log(JSON.stringify({perfViews:results.length,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(troupeReviewOnly){
        for(const view of ['troupe-camp','troupe-camp','troupe-scene','troupe-stop-lumber-town','troupe-stop-moros','troupe-stop-nemmel','troupe-stop-ostel']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<120;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({troupeViews:6,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(atticReviewOnly){
        for(const view of ['wine-attic','wine-attic','wine-attic-inside','wine-attic-juan','wine-attic-nika','ed','ed-ridge','ed-cask']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<120;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({atticViews:4,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(lakotaReviewOnly){
        // Lakota, drawn from the sketch, with his red-tail on the glove and then aloft.
        await win.webContents.executeJavaScript(`window.__AZHORA__.review('lakota');(async()=>{for(let i=0;i<150;i++)await new Promise(requestAnimationFrame);})()`);
        for(const view of ['lakota','lakota-aloft']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<90;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({lakotaViews:2,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(catReviewOnly){
        // The harbour cat held in each of its poses, close up, for a visual check of the model.
        await win.webContents.executeJavaScript(`window.__AZHORA__.review('cat-stand');(async()=>{for(let i=0;i<150;i++)await new Promise(requestAnimationFrame);})()`);
        for(const view of ['cat-stand','cat-sit','cat-nap','cat-groom','cat-crouch','cat-pounce','cat-eat','cat-rub','cat-low']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<75;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({catViews:9,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(roadReviewOnly){
        for(const view of ['sunmeadow','reedwater','road-sign','threefold','north-relay','waymarker-before','waymarker-after','elod','elod-harbour','elod-quay','elod-city','elod-inner-gate']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<75;i++)await new Promise(requestAnimationFrame);})()`);
          viewStats[view]=await win.webContents.executeJavaScript('(()=>{const s=window.__AZHORA__.state();return {region:s.region,drawCalls:s.drawCalls,triangles:s.triangles};})()');
          if(!unbatchedWorld)fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(artifactDir,unbatchedWorld?'road-render-baseline.json':'road-render.json'),JSON.stringify({views:viewStats,errors},null,2));
        console.log(JSON.stringify({views:viewStats,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(roadChecksOnly){
        const recoveryResult=await win.webContents.executeJavaScript('window.__AZHORA__.runRecoveryCheck()');
        await win.loadURL(win.webContents.getURL());
        win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,1500));
        fs.writeFileSync(path.join(artifactDir,'compact-continue.png'),(await win.webContents.capturePage()).toPNG());
        const openingLayout=await win.webContents.executeJavaScript(`(()=>{const ids=['opening','begin','continue-road','opening-testing'];return Object.fromEntries(ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{top:r.top,bottom:r.bottom,left:r.left,right:r.right,visible:r.width>0&&r.height>0}];}));})()`);
        if(Object.values(openingLayout).some(r=>!r.visible||r.top<0||r.bottom>640||r.left<0||r.right>900))throw new Error('Opening controls exceed the compact window: '+JSON.stringify(openingLayout));
        await win.webContents.executeJavaScript(`document.getElementById('continue-road').focus();document.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',key:'Enter',bubbles:true,cancelable:true}));if(window.__AZHORA__.state().mode!=='opening')throw new Error('Enter on Continue incorrectly started a new journey');`);
        const reloadResult=await win.webContents.executeJavaScript(`window.__AZHORA__.verifyReload(${JSON.stringify(result.expected)})`);
        const {expected,...report}=result;
        fs.writeFileSync(path.join(artifactDir,'road-checkpoints.json'),JSON.stringify({...report,...reloadResult,...recoveryResult,openingLayout,errors},null,2));
        fs.writeFileSync(path.join(artifactDir,'continued-bridge.png'),(await win.webContents.capturePage()).toPNG());
        console.log(JSON.stringify({...report,...reloadResult,...recoveryResult,openingLayout,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(traverseOnly){
        fs.writeFileSync(path.join(artifactDir,'road-traversal.json'),JSON.stringify({...result,errors},null,2));
        fs.writeFileSync(path.join(artifactDir,'road-return.png'),(await win.webContents.capturePage()).toPNG());
        console.log(JSON.stringify({...result,errors},null,2));app.exit(errors.length?1:0);return;
      }
      const screenshot = await win.webContents.capturePage(); fs.writeFileSync(path.join(artifactDir,'story-start.png'), screenshot.toPNG());
      await win.webContents.executeJavaScript(`window.__AZHORA__.review('map')`);
      await new Promise(resolve=>setTimeout(resolve,600));
      fs.writeFileSync(path.join(artifactDir,'world-builder-atlas.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript(`document.getElementById('atlas-izol').click()`);
      await new Promise(resolve=>setTimeout(resolve,300));
      fs.writeFileSync(path.join(artifactDir,'east-izol-atlas.png'),(await win.webContents.capturePage()).toPNG());
      win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,400));
      fs.writeFileSync(path.join(artifactDir,'compact-atlas.png'),(await win.webContents.capturePage()).toPNG());
      win.setSize(1440,960);
      await win.webContents.executeJavaScript(`window.__AZHORA__.review('border')`);
      await new Promise(resolve=>setTimeout(resolve,1500));
      fs.writeFileSync(path.join(artifactDir,'northern-border.png'),(await win.webContents.capturePage()).toPNG());
      for(const view of ['sunmeadow','reedwater','road-sign','river-fishing','threefold','north-relay','sheep','river-bird','rock-hare','road-dialogue','portrait-meadow-courier','portrait-crossing-keeper','portrait-ridge-keeper','portrait-relay-clerk','traveler','stick','weapons','repair','goblin','lysa','acorns','squirrel','pawpaw-patch','pawpaw','doomsayer','doomsayer-dialogue','pond','fishing','cooking','cooked-fish','testing']){
        await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)})`);
        await new Promise(resolve=>setTimeout(resolve,1400));
        fs.writeFileSync(path.join(artifactDir,`${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
        viewStats[view]=await win.webContents.executeJavaScript('(()=>{const s=window.__AZHORA__.state();return {region:s.region,drawCalls:s.drawCalls,triangles:s.triangles,averageFrameMs:s.averageFrameMs};})()');
        if(['road-dialogue','threefold','lysa','weapons','pawpaw','cooked-fish','fishing','cooking','testing'].includes(view)){
          win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,400));
          if(view==='pawpaw'||view==='cooked-fish'){await win.webContents.executeJavaScript(`document.getElementById('inventory-detail').scrollIntoView({block:'start',behavior:'instant'})`);await new Promise(resolve=>setTimeout(resolve,100));}
          fs.writeFileSync(path.join(artifactDir,`compact-${shotName(view)}.png`),(await win.webContents.capturePage()).toPNG());
          win.setSize(1440,960);
        }
      }
      await win.webContents.executeJavaScript(`window.__AZHORA__.review('inventory')`);
      await new Promise(resolve=>setTimeout(resolve,900));
      fs.writeFileSync(path.join(artifactDir,'satchel-message.png'),(await win.webContents.capturePage()).toPNG());
      win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,450));
      fs.writeFileSync(path.join(artifactDir,'compact-satchel.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript(`document.getElementById('inventory-letter-body').scrollIntoView({block:'center'});document.getElementById('inventory-letter-body').focus();`);
      await new Promise(resolve=>setTimeout(resolve,250));
      fs.writeFileSync(path.join(artifactDir,'compact-letter.png'),(await win.webContents.capturePage()).toPNG());
      win.setSize(1440,960);
      await win.webContents.executeJavaScript(`window.__AZHORA__.review('practice')`);
      await new Promise(resolve=>setTimeout(resolve,1800));
      fs.writeFileSync(path.join(artifactDir,'practice.png'),(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript(`window.__AZHORA__.review('battle')`);
      await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
        const deadline=Date.now()+25000;const poll=()=>{
          if(window.__AZHORA__.state().enemies.some(e=>e.action==='windup'&&e.progress>.52)){window.__AZHORA__.freezeReview();resolve();}
          else if(Date.now()>deadline)reject(new Error('No visible goblin windup'));else setTimeout(poll,50);
        };poll();
      })`);
      await new Promise(resolve=>setTimeout(resolve,450));
      fs.writeFileSync(path.join(artifactDir,'goblin-encounter.png'),(await win.webContents.capturePage()).toPNG());
      win.setSize(960,700);await new Promise(resolve=>setTimeout(resolve,500));
      fs.writeFileSync(path.join(artifactDir,'compact-encounter.png'),(await win.webContents.capturePage()).toPNG());
      win.setSize(1440,960);
      await win.webContents.executeJavaScript(`window.__AZHORA__.review('walk')`);
      await new Promise(resolve=>setTimeout(resolve,1500));
      await win.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))`);
      const gaitFrames=[];
      for(let i=0;i<8;i++){
        await new Promise(resolve=>setTimeout(resolve,130));
        gaitFrames.push((await win.webContents.capturePage()).crop({x:530,y:310,width:380,height:480}).toDataURL());
      }
      await win.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}))`);
      const gait=await win.webContents.executeJavaScript(`(async()=>{
        const frames=${JSON.stringify(gaitFrames)},c=document.createElement('canvas');c.width=1520;c.height=1016;const ctx=c.getContext('2d');ctx.fillStyle='#17382f';ctx.fillRect(0,0,c.width,c.height);
        for(let i=0;i<frames.length;i++){const im=new Image();im.src=frames[i];await im.decode();const x=i%4*380,y=Math.floor(i/4)*508;ctx.drawImage(im,x,y);ctx.fillStyle='#fff3d0';ctx.font='16px sans-serif';ctx.fillText('Walking · frame '+(i+1),x+10,y+500);}
        return c.toDataURL('image/png').split(',')[1];
      })()`);
      fs.writeFileSync(path.join(artifactDir,'walking-sequence.png'),Buffer.from(gait,'base64'));
      fs.writeFileSync(path.join(artifactDir, reviewOnly ? 'review.json' : 'smoke.json'), JSON.stringify({ ...result, errors }, null, 2));
      fs.writeFileSync(path.join(artifactDir,'view-stats.json'),JSON.stringify(viewStats,null,2));
      console.log(JSON.stringify({ ...result, errors }, null, 2)); app.exit(errors.length ? 1 : 0);
    } catch(error) {
      const state = await win.webContents.executeJavaScript('window.__AZHORA__?.state()').catch(()=>null);
      const screenshot = await win.webContents.capturePage(); fs.writeFileSync(path.join(artifactDir,'failure.png'), screenshot.toPNG());
      console.error(error, state); fs.writeFileSync(path.join(artifactDir, 'failure.json'), JSON.stringify({ error:String(error), state, errors }, null, 2)); app.exit(1);
    }
  }
}).catch(error => {
  console.error(error);
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
  fs.appendFileSync(path.join(__dirname, 'logs', 'startup.log'), new Date().toISOString()+' '+String(error.stack || error)+'\n');
  app.exit(1);
});
app.on('window-all-closed', () => { server?.close(); app.quit(); });
