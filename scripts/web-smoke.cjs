// Exercise the actual Render artifact without an Electron preload/save bridge.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {isPublicFile}=require('./public-file.cjs');
const root=path.resolve(__dirname,'..'),published=path.join(root,'public'),artifacts=path.join(root,'tests','artifacts');
if(!process.env.AZHORA_TEST_PROFILE)throw Error('Run through npm run test:web:desktop for an isolated profile.');
app.setPath('userData',process.env.AZHORA_TEST_PROFILE);app.setPath('sessionData',process.env.AZHORA_TEST_PROFILE);
for(const flag of ['disable-renderer-backgrounding','disable-background-timer-throttling','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(flag);
let server;
app.on('window-all-closed',()=>app.quit());app.on('will-quit',()=>server?.close());
app.whenReady().then(async()=>{
  const checks=[],errors=[],requests=[];
  const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
  for(const excluded of ['reference-private','.git','saves','docs','scripts','tests'])check(!fs.existsSync(path.join(published,excluded)),`Static build excludes ${excluded}`);
  server=http.createServer((req,res)=>{
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
    const file=path.resolve(published,'.'+(pathname==='/'?'/index.html':pathname));
    if(!isPublicFile(published,file)){res.writeHead(404).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
      res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const win=new BrowserWindow({width:1440,height:960,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  win.once('ready-to-show',()=>win.showInactive());
  win.webContents.on('console-message',(_event,level,message)=>{if(level>=3)errors.push(message);});
  win.webContents.on('render-process-gone',(_event,details)=>{console.error(details);app.exit(1);});
  win.webContents.session.webRequest.onBeforeRequest((details,callback)=>{requests.push(details.url);callback({});});
  const run=code=>win.webContents.executeJavaScript(code);
  const wait=condition=>run(`new Promise((resolve,reject)=>{const end=Date.now()+180000;const poll=()=>{if(window.__EXPLORATION_ERROR__)return reject(Error(window.__EXPLORATION_ERROR__));if(${condition})return resolve(true);if(Date.now()>end)return reject(Error('Timed out: '+${JSON.stringify(condition)}));setTimeout(poll,100);};poll();})`);
  const menu=async()=>{await wait(`document.querySelector('[data-continue-mode="hearthfall"]')?.onclick`);return run(`({visible:!document.getElementById('start-screen').hidden,starts:[...document.querySelectorAll('[data-start-mode]')].map(b=>({mode:b.dataset.startMode,ready:!!b.onclick,visible:b.getBoundingClientRect().width>0})),continues:[...document.querySelectorAll('[data-continue-mode]')].map(b=>({mode:b.dataset.continueMode,enabled:!b.disabled})),bridge:!!window.azhoraExplorationStorage,legacy:!!window.__AZHORA__})`);};
  fs.mkdirSync(artifacts,{recursive:true});
  await win.loadURL(origin+'/?test=1&menu=1');
  const initial=await menu();
  check(initial.visible&&initial.starts.length===3&&initial.starts.every(b=>b.ready&&b.visible),'Public root opens three working mode buttons');
  check(initial.continues.every(b=>!b.enabled)&&!initial.bridge&&!initial.legacy,'Fresh browser has no saves or legacy/Electron host');
  fs.writeFileSync(path.join(artifacts,'web-main-menu.png'),(await win.webContents.capturePage()).toPNG());
  await win.loadURL(origin+'/exploration.html?test=1&menu=1#menu');await menu();
  check(new URL(win.webContents.getURL()).pathname==='/index.html'&&new URL(win.webContents.getURL()).searchParams.get('menu')==='1'&&new URL(win.webContents.getURL()).hash==='#menu','Old exploration URL reaches the canonical menu with query and fragment intact');
  await run(`document.getElementById('new-hearthfall').click()`);await wait('window.__EXPLORATION__');
  const saved=await run(`(()=>{const h=window.__EXPLORATION__,s=h.state();if(s.launch!=='hearthfall'||s.region!==21||s.enabledRegions.join()!=='21'||h.war)throw Error('Wrong sandbox mode');if(!h.save().ok)throw Error('Browser save failed');return h.store.read().data;})()`);
  check(saved.format==='azhora-hearthfall-v1','Built browser game starts Feradom and saves to its own localStorage slot');
  check(await run(`document.getElementById('location-name').textContent==='Feradom'`),'Arrival heading shows Feradom before the player moves');
  const jobs=await run(`window.__EXPLORATION__.testWorld.loading.state().jobs`);
  check(jobs.length>0&&jobs.every(j=>j.regions.every(id=>id===21)),'Public sandbox registers Feradom construction only');
  fs.writeFileSync(path.join(artifacts,'web-feradom.png'),(await win.webContents.capturePage()).toPNG());
  const returned=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
  await run(`window.__EXPLORATION__.pause();document.getElementById('return-start').click()`);await returned;
  const after=await menu();
  check(after.visible&&after.continues.every(b=>b.enabled===(b.mode==='hearthfall')),'Exit returns to menu with only the correct Continue enabled');
  await run(`document.querySelector('[data-continue-mode="hearthfall"]').click()`);await wait('window.__EXPLORATION__');
  const restored=await run(`window.__EXPLORATION__.store.read().data`);
  check(JSON.stringify(restored)===JSON.stringify(saved),'Continue restores browser save in a fresh renderer');
  check(requests.every(url=>url.startsWith(origin+'/')||/^(data|blob):/.test(url)),'No remote services requested');
  check(!errors.length,'No browser console errors');
  fs.writeFileSync(path.join(artifacts,'web-entry-checks.json'),JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
