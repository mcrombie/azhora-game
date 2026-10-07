// Isolated real-renderer startup benchmark. Never reads or writes the player's save.
// node scripts/launch.cjs --smoke-test --startup-profile [--profile-root=...] [--profile-label=...]
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const option=name=>(process.argv.find(arg=>arg.startsWith(`--${name}=`))??'').slice(name.length+3);
const contentRoot=path.resolve(root,option('profile-root')||'.');
// Older comparison checkouts predate the explicit legacy entry page.
const entryPage=fs.existsSync(path.join(contentRoot,'adventure.html'))?'/adventure.html':'/index.html';
const label=(option('profile-label')||'startup').replace(/[^a-z0-9_-]/gi,'');
if(process.env.AZHORA_TEST_PROFILE)app.setPath('userData',process.env.AZHORA_TEST_PROFILE);
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
const {createTerrainCacheBridge}=require('./terrain-cache.cjs');
const errors=[];
app.whenReady().then(async()=>{
  const roadStore=require('./checkpoint-store.cjs').createCheckpointStore({memoryOnly:true});
  ipcMain.on('azhora:road-checkpoint',(event,operation,key,value)=>{event.returnValue=roadStore.handle(operation,key,value);});
  const cache=createTerrainCacheBridge({root:contentRoot,directory:path.join(app.getPath('userData'),'terrain-cache'),memoryOnly:false});
  ipcMain.handle('azhora:terrain-cache',(_,operation,value)=>operation==='read'?cache.read():operation==='write'?cache.write(value):null);
  const server=http.createServer((req,res)=>{
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
    const target=path.resolve(contentRoot,'.'+(pathname==='/'?entryPage:pathname));
    if(!require('./public-file.cjs').isPublicFile(contentRoot,target)){res.writeHead(403).end();return;}
    fs.readFile(target,(error,data)=>{
      if(error){res.writeHead(404).end();return;}
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
      res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const win=new BrowserWindow({width:1440,height:960,show:false,webPreferences:{preload:path.join(root,'preload.cjs'),offscreen:true,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  win.webContents.on('console-message',(_,level,message)=>{if(level>=3)errors.push(message);if(message.startsWith('STARTUP '))console.log(message);});
  win.webContents.on('render-process-gone',(_,details)=>{console.error(details);app.exit(1);});
  const timeout=setTimeout(()=>{console.error('Startup exceeded 15 minutes');app.exit(1);},900000);
  const start=performance.now();
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?test=1${process.argv.includes('--fast-load')?'&load=fast':''}`);
  const result=await win.webContents.executeJavaScript(`(async()=>{
    const start=performance.now();
    while(!window.__AZHORA__){const fatal=document.getElementById('fatal');if(fatal&&!fatal.classList.contains('hidden'))throw new Error(fatal.dataset.stack||fatal.textContent);if(performance.now()-start>900000)throw new Error('Startup timed out');await new Promise(r=>setTimeout(r,100));}
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    return {timings:globalThis.__AZHORA_STARTUP__??null,state:window.__AZHORA__.state()};
  })()`);
  result.wallMs=performance.now()-start;result.errors=errors;
  const observeSeconds=Math.max(0,Math.min(120,Number(option('profile-observe'))||0));
  if(observeSeconds)result.observation=await win.webContents.executeJavaScript(`(async()=>{
    const start=performance.now(),gaps=[];let last=start;
    while(performance.now()-start<${observeSeconds*1000}){await new Promise(requestAnimationFrame);const now=performance.now();gaps.push(now-last);last=now;}
    gaps.sort((a,b)=>a-b);
    return {elapsedMs:performance.now()-start,frames:gaps.length,p95Ms:gaps[Math.floor(gaps.length*.95)],maxMs:gaps.at(-1),stallsOver50ms:gaps.filter(ms=>ms>50).length,
      heapBytes:performance.memory?.usedJSHeapSize,loading:window.__AZHORA__.loading.state(),state:window.__AZHORA__.state()};
  })()`);
  result.processes=app.getAppMetrics().map(p=>({type:p.type,memory:p.memory}));
  // Let the chart's async image.decode finish before navigating away; reloading
  // a pending image creates an AbortError unrelated to game startup.
  await win.webContents.executeJavaScript(`(async()=>{const begin=performance.now();while(!document.getElementById('atlas-loading')?.hidden){if(performance.now()-begin>20000)throw new Error('Atlas did not finish loading');await new Promise(r=>setTimeout(r,50));}})()`);
  if(process.argv.includes('--profile-warm')){
    const warmStart=performance.now();await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.reload();});
    result.warm=await win.webContents.executeJavaScript(`(async()=>{while(!window.__AZHORA__)await new Promise(r=>setTimeout(r,100));await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return {timings:globalThis.__AZHORA_STARTUP__,state:window.__AZHORA__.state()};})()`);
    result.warm.wallMs=performance.now()-warmStart;
  }
  const dir=path.join(root,'tests/artifacts');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,`${label}.json`),JSON.stringify(result,null,2));
  console.log(JSON.stringify({label,wallMs:result.wallMs,cache:result.timings?.cache,namedFigures:result.timings?.namedFigures,wildlife:result.timings?.wildlife,warm:result.warm?{wallMs:result.warm.wallMs,cache:result.warm.timings?.cache}:null,errors},null,2));
  clearTimeout(timeout);server.close();app.exit(errors.length?1:0);
}).catch(error=>{console.error(error.stack);app.exit(1);});
