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
const catReviewOnly = smoke && process.argv.includes('--cat-review');
const lakotaReviewOnly = smoke && process.argv.includes('--lakota-review');
const wineryReviewOnly = smoke && process.argv.includes('--winery-review');
const atticReviewOnly = smoke && process.argv.includes('--attic-review');
const troupeReviewOnly = smoke && process.argv.includes('--troupe-review');
const perfReviewOnly = smoke && process.argv.includes('--perf-review');
/** Any review views, photographed in turn: --review-views=brandy,brandy-close */
const reviewViews = smoke ? (process.argv.find(arg => arg.startsWith('--review-views=')) ?? '').slice(15).split(',').filter(Boolean) : [];
/** `--review-clean` hides the HUD for the review pictures; `--review-jpeg` saves them as .jpg, a fraction of the size. */
const reviewClean = process.argv.includes('--review-clean'), reviewJpeg = process.argv.includes('--review-jpeg');
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
  const win = mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 640, show: false, title: 'Azhora · An Adventure Game', icon:path.join(__dirname,'assets','azhora.ico'), backgroundColor: '#9bc3cb', autoHideMenuBar: true,
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
          if(window.__AZHORA__) { ${autoplayChecksOnly ? `window.__AZHORA__.runAutoplayChecks(${autoplayOptions}).then(resolve,reject);` : regionalLifeChecksOnly ? 'window.__AZHORA__.runRegionalLifeChecks().then(resolve,reject);' : regionalLifeReviewOnly ? 'window.__AZHORA__.reviewRegional("mill-yard");resolve({reviewOnly:true});' : localMapChecksOnly ? 'window.__AZHORA__.runLocalMapChecks().then(resolve,reject);' : hideoutChecksOnly ? 'window.__AZHORA__.runHideoutChecks().then(resolve,reject);' : developerChecksOnly ? 'window.__AZHORA__.runDeveloperChecks().then(resolve,reject);' : forestChecksOnly ? 'window.__AZHORA__.runForestChecks().then(resolve,reject);' : roadChecksOnly ? 'window.__AZHORA__.runRoadChecks().then(resolve,reject);' : traverseOnly ? 'window.__AZHORA__.runTraversal().then(resolve,reject);' : localMapReviewOnly ? 'window.__AZHORA__.reviewLocalMap("local-trails");resolve({reviewOnly:true});' : hideoutReviewOnly ? 'window.__AZHORA__.reviewHideout("hideout-approach"); resolve({reviewOnly:true});' : reviewOnly||roadReviewOnly||forestReviewOnly||developerReviewOnly||catReviewOnly||openingReviewOnly||mapReviewOnly||lakotaReviewOnly||wineryReviewOnly || atticReviewOnly || troupeReviewOnly || perfReviewOnly || reviewViews.length ? 'window.__AZHORA__.review("walk"); resolve({reviewOnly:true,...window.__AZHORA__.state()});' : 'window.__AZHORA__.runSmoke().then(resolve,reject);'} }
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
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({wineryViews:3,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(reviewViews.length){
        const fatal=await win.webContents.executeJavaScript("(()=>{const f=document.getElementById('fatal');return f&&!f.classList.contains('hidden')?(f.dataset.stack||'fatal'):''})()");
        if(fatal){console.log('FATAL AT LOAD: '+fatal);app.exit(1);return;}
        if(reviewClean)await win.webContents.executeJavaScript(`(()=>{const s=document.createElement('style');s.textContent='body > *:not(#world){visibility:hidden !important}';document.head.appendChild(s);})()`);
        for(const view of [reviewViews[0],...reviewViews]){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<120;i++)await new Promise(requestAnimationFrame);})()`);
          const picture=await win.webContents.capturePage();
          fs.writeFileSync(path.join(artifactDir,`${view}.${reviewJpeg?'jpg':'png'}`),reviewJpeg?picture.toJPEG(82):picture.toPNG());
          console.log(view,JSON.stringify(await win.webContents.executeJavaScript('window.__AZHORA__.camera?.()')));
        }
        console.log(JSON.stringify({views:reviewViews,errors},null,2));app.exit(errors.length?1:0);return;
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
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({troupeViews:6,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(atticReviewOnly){
        for(const view of ['wine-attic','wine-attic','wine-attic-inside','wine-attic-juan','wine-attic-nika','ed','ed-ridge','ed-cask']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<120;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({atticViews:4,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(lakotaReviewOnly){
        // Lakota, drawn from the sketch, with his red-tail on the glove and then aloft.
        await win.webContents.executeJavaScript(`window.__AZHORA__.review('lakota');(async()=>{for(let i=0;i<150;i++)await new Promise(requestAnimationFrame);})()`);
        for(const view of ['lakota','lakota-aloft']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<90;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({lakotaViews:2,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(catReviewOnly){
        // The harbour cat held in each of its poses, close up, for a visual check of the model.
        await win.webContents.executeJavaScript(`window.__AZHORA__.review('cat-stand');(async()=>{for(let i=0;i<150;i++)await new Promise(requestAnimationFrame);})()`);
        for(const view of ['cat-stand','cat-sit','cat-nap','cat-groom','cat-crouch','cat-pounce','cat-eat','cat-rub','cat-low']){
          await win.webContents.executeJavaScript(`window.__AZHORA__.review(${JSON.stringify(view)});(async()=>{for(let i=0;i<75;i++)await new Promise(requestAnimationFrame);})()`);
          fs.writeFileSync(path.join(artifactDir,`${view}.png`),(await win.webContents.capturePage()).toPNG());
        }
        console.log(JSON.stringify({catViews:9,errors},null,2));app.exit(errors.length?1:0);return;
      }
      if(roadReviewOnly){
        for(const view of ['sunmeadow','reedwater','road-sign','threefold','north-relay','waymarker-before','waymarker-after','elod','elod-harbour','elod-quay','elod-city','elod-inner-gate']){
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
