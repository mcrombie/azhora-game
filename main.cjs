const { app, BrowserWindow, ipcMain } = require('electron');
const { createCheckpointStore } = require('./scripts/checkpoint-store.cjs');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const smoke = process.argv.includes('--smoke-test');
const reviewOnly = smoke && process.argv.includes('--review-only');
const traverseOnly = smoke && process.argv.includes('--traverse-road');
const roadChecksOnly = smoke && process.argv.includes('--road-checks');
const roadReviewOnly = smoke && process.argv.includes('--road-review');
const forestReviewOnly = smoke && process.argv.includes('--forest-review');
const forestChecksOnly = smoke && process.argv.includes('--forest-checks');
const developerReviewOnly = smoke && process.argv.includes('--developer-review');
const developerChecksOnly = smoke && process.argv.includes('--developer-checks');
const autoplayChecksOnly = smoke && process.argv.includes('--autoplay-checks');
const hideoutChecksOnly = smoke && process.argv.includes('--hideout-checks');
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
  const win = mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 640, show: false, title: 'Azhora · A shore called Eastreena', icon:path.join(__dirname,'assets','azhora.ico'), backgroundColor: '#9bc3cb', autoHideMenuBar: true,
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
  win.webContents.on('console-message', (_, level, message) => { if (level >= 3) errors.push(message); });
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
          if(window.__AZHORA__) { ${autoplayChecksOnly ? 'window.__AZHORA__.runAutoplayChecks().then(resolve,reject);' : regionalLifeChecksOnly ? 'window.__AZHORA__.runRegionalLifeChecks().then(resolve,reject);' : regionalLifeReviewOnly ? 'window.__AZHORA__.reviewRegional("mill-yard");resolve({reviewOnly:true});' : localMapChecksOnly ? 'window.__AZHORA__.runLocalMapChecks().then(resolve,reject);' : hideoutChecksOnly ? 'window.__AZHORA__.runHideoutChecks().then(resolve,reject);' : developerChecksOnly ? 'window.__AZHORA__.runDeveloperChecks().then(resolve,reject);' : forestChecksOnly ? 'window.__AZHORA__.runForestChecks().then(resolve,reject);' : roadChecksOnly ? 'window.__AZHORA__.runRoadChecks().then(resolve,reject);' : traverseOnly ? 'window.__AZHORA__.runTraversal().then(resolve,reject);' : localMapReviewOnly ? 'window.__AZHORA__.reviewLocalMap("local-trails");resolve({reviewOnly:true});' : hideoutReviewOnly ? 'window.__AZHORA__.reviewHideout("hideout-approach"); resolve({reviewOnly:true});' : reviewOnly||roadReviewOnly||forestReviewOnly||developerReviewOnly ? 'window.__AZHORA__.review("walk"); resolve({reviewOnly:true,...window.__AZHORA__.state()});' : 'window.__AZHORA__.runSmoke().then(resolve,reject);'} }
          else if(Date.now()-start>25000) reject(new Error('Game did not initialize'));
          else setTimeout(poll,100);
        }; poll();
      })`);
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
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[view]=await win.webContents.executeJavaScript('window.__AZHORA__.regionalLife()');
        }
        win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,300));
        for(const view of ['mill-dialogue','workshop-dialogue','shelter-choice','road-notes']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewRegional(${JSON.stringify(view)});(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${view}-compact.png`),(await win.webContents.capturePage()).toPNG());
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
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[view]=await win.webContents.executeJavaScript('window.__AZHORA__.localMapState()');
        }
        win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,300));
        for(const view of ['local-trails','local-forest-pin','local-zoom']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewLocalMap(${JSON.stringify(view)});(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${view}-compact.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[`${view}-compact`]=await win.webContents.executeJavaScript('window.__AZHORA__.localMapState()');
        }
        fs.writeFileSync(path.join(artifactDir,'local-map-render.json'),JSON.stringify({views:viewStats,errors},null,2));
        console.log(JSON.stringify({views:Object.keys(viewStats),errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(hideoutReviewOnly){
        for(const view of ['hideout-approach','hideout-overview','hideout-supplies','hideout-dialogue','hideout-cleared','forest-thrush']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewHideout(${JSON.stringify(view)});(async()=>{for(let i=0;i<60;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
          viewStats[view]=await win.webContents.executeJavaScript('window.__AZHORA__.forestHideout()');
        }
        win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,350));
        for(const view of ['hideout-dialogue','hideout-tamsin']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.reviewHideout(${JSON.stringify(view)});document.getElementById('dialogue-next').click();(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);})()`);
          const layout=await win.webContents.executeJavaScript(`(()=>{const panel=document.getElementById('dialogue'),r=panel.getBoundingClientRect(),buttons=[...document.querySelectorAll('#dialogue-choices button')];return {top:r.top,bottom:r.bottom,width:r.width,choices:buttons.length,scrollable:panel.scrollHeight>panel.clientHeight};})()`);
          if(layout.top<0||layout.bottom>640||layout.width>900||layout.choices<2)throw new Error('Hideout dialogue does not fit the compact window');
          viewStats[`${view}-compact`]=layout;
          fs.writeFileSync(path.join(artifactDir,`${view}-compact.png`),(await win.webContents.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(artifactDir,'hideout-render.json'),JSON.stringify({views:viewStats,errors},null,2));
        console.log(JSON.stringify({views:Object.keys(viewStats),errors},null,2));app.exit(errors.length?1:0);return;
      }
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
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
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
          fs.writeFileSync(path.join(artifactDir,`forest-${view}.png`),(await win.webContents.capturePage()).toPNG());
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
      if(roadReviewOnly){
        for(const view of ['sunmeadow','reedwater','road-sign','threefold','north-relay','waymarker-before','waymarker-after']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<75;i++)await new Promise(requestAnimationFrame);})()`);
          viewStats[view]=await win.webContents.executeJavaScript('(()=>{const s=window.__AZHORA__.state();return {region:s.region,drawCalls:s.drawCalls,triangles:s.triangles};})()');
          if(!unbatchedWorld)fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
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
        if(Object.values(openingLayout).some(r=>!r.visible||r.top<0||r.bottom>640||r.left<0||r.right>900))throw new Error('Opening controls exceed the compact window');
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
      const screenshot = await win.webContents.capturePage(); fs.writeFileSync(path.join(artifactDir,'eastreena.png'), screenshot.toPNG());
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
        fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
        viewStats[view]=await win.webContents.executeJavaScript('(()=>{const s=window.__AZHORA__.state();return {region:s.region,drawCalls:s.drawCalls,triangles:s.triangles,averageFrameMs:s.averageFrameMs};})()');
        if(['road-dialogue','threefold','lysa','weapons','pawpaw','cooked-fish','fishing','cooking','testing'].includes(view)){
          win.setSize(900,640);await new Promise(resolve=>setTimeout(resolve,400));
          if(view==='pawpaw'||view==='cooked-fish'){await win.webContents.executeJavaScript(`document.getElementById('inventory-detail').scrollIntoView({block:'start',behavior:'instant'})`);await new Promise(resolve=>setTimeout(resolve,100));}
          fs.writeFileSync(path.join(artifactDir,`compact-${view}.png`),(await win.webContents.capturePage()).toPNG());
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
