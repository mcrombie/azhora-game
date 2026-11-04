// Isolated installed-Chrome verification of the static candidate. No normal profile or saves.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {isPublicFile}=require('./public-file.cjs');
const root=path.resolve(__dirname,'..'),arg=name=>process.argv.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const mode=arg('--mode')??'explore',label=arg('--label')??mode;
const source=path.join(root,process.argv.includes('--baseline')?'.tmp/rc-baseline':'public');
const artifacts=path.join(root,'tests/artifacts');fs.mkdirSync(artifacts,{recursive:true});
const profiles=path.join(root,'tests/.electron-profiles');fs.mkdirSync(profiles,{recursive:true});
const profile=fs.mkdtempSync(path.join(profiles,'rc-chrome-'));
const chrome=process.env.AZHORA_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let server,child,socket,serial=0;const pending=new Map(),events=[],errors=[];
async function main(){
  server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),relative=name==='/'?'index.html':name.slice(1);
    const file=path.resolve(source,relative);
    if(!/^(?:index\.html|exploration\.html|adventure\.html|lizeem\.html|farmland\.html|build-info\.json|(?:src|assets|vendor)\/)/.test(relative)||!isPublicFile(source,file)){res.writeHead(404).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream');res.end(data);});
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  child=spawn(chrome,['--headless=new','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','--window-size=1440,900','about:blank'],{windowsHide:true,stdio:'ignore'});
  child.on('error',e=>errors.push(e.message));
  const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;!fs.existsSync(portFile)&&i<200;i++)await sleep(100);
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=({data})=>{const v=JSON.parse(data);if(v.id){const p=pending.get(v.id);pending.delete(v.id);v.error?p?.reject(Error(JSON.stringify(v.error))):p?.resolve(v.result);}else{events.push(v);if(v.method==='Runtime.exceptionThrown')errors.push(v.params.exceptionDetails);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const wait=async expression=>{const end=Date.now()+240000;while(Date.now()<end){if(await run(expression))return;await sleep(200);}throw Error('Timed out: '+expression);};
  const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(artifacts,`rc-${label}-${name}.png`),Buffer.from(r.data,'base64'));};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__STARTUP_REVIEW__={messages:[],longTasks:[],firstDraw:null,frames:0,maxFrameGap:0};
    performance.setResourceTimingBufferSize(5000);
    new PerformanceObserver(list=>{for(const e of list.getEntries())__STARTUP_REVIEW__.longTasks.push({at:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});
    let previous=performance.now();function heartbeat(){let at=performance.now();__STARTUP_REVIEW__.frames++;__STARTUP_REVIEW__.maxFrameGap=Math.max(__STARTUP_REVIEW__.maxFrameGap,at-previous);previous=at;requestAnimationFrame(heartbeat);}requestAnimationFrame(heartbeat);
    const log=console.log;console.log=(...a)=>{if(String(a[0]).startsWith('EXPLORATION_'))__STARTUP_REVIEW__.messages.push({at:performance.now(),text:a.join(' ')});log(...a);};
    for(const type of [window.WebGLRenderingContext,window.WebGL2RenderingContext])for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const original=type?.prototype[name];if(original)type.prototype[name]=function(...args){__STARTUP_REVIEW__.firstDraw??=performance.now();return original.apply(this,args);};}
    document.addEventListener('DOMContentLoaded',()=>{let last='';new MutationObserver(()=>{const e=document.getElementById('loading-message');if(e&&e.textContent!==last){last=e.textContent;__STARTUP_REVIEW__.messages.push({at:performance.now(),text:last});}}).observe(document.body,{childList:true,subtree:true,characterData:true});});
  `});
  await send('Page.navigate',{url:origin+'/?test=1&menu=1'+(mode==='combat'?'&launcher=developer':'')});
  await wait(`!!document.getElementById('new-exploration')?.onclick`);await capture('menu');
  const browser=await send('Browser.getVersion'),checks=[];const check=(ok,text)=>{assert(ok,text);checks.push(text);};
  check(await run(`!localStorage.length`),'Fresh isolated browser has no saved progress');
  const started=await run(`performance.now()`),timings={menuReadyMs:started};
  if(mode==='failure'){
    await send('Network.setBlockedURLs',{urls:['*/src/app/exploration/exploration.js']});
    await run(`document.getElementById('new-exploration').click()`);await wait('!!window.__EXPLORATION_ERROR__');
    check(await run(`!document.getElementById('loading-screen').hidden&&!document.getElementById('loading-screen').classList.contains('loading-active')&&document.getElementById('loading-elapsed').hidden`),'Failed loading stops activity and elapsed feedback');
    await capture('failure');await send('Network.setBlockedURLs',{urls:[]});
    // The injected import/console errors are expected only in this recovery check.
    events.length=0;errors.length=0;
    await run(`[...document.querySelectorAll('#loading-screen button')].find(b=>b.textContent==='Return to main menu').click()`);
    await wait(`!!document.getElementById('new-exploration')?.onclick`);
    check(await run(`!document.getElementById('start-screen').hidden`),'Failure recovery returns to the public launcher');
  }else if(mode==='combat'){
    await run(`document.getElementById('new-combat-testing').click();document.querySelector('[data-combat-exercise="lesson"]').click()`);await wait('!!window.__EXPLORATION__?.practice?.state().encounter');
    try{const result=await run(`import('./src/dev/checks/combat-testing-smoke.js').then(m=>m.checkCombatExercises(window.__EXPLORATION__))`);checks.push(...result.checks);}
    catch(e){errors.push({kind:'combat-automation',message:e.message,state:await run(`(()=>{const e=__EXPLORATION__.practice.state().encounter;return {exercise:__EXPLORATION__.practice.state().exercise,outcome:e.outcome,hp:e.hero.hp,remaining:e.guards.filter(g=>g.hp>0).length};})()`)});}
  }else{
    if(mode==='story'){
      await run(`document.getElementById('new-world-war').click()`);await wait('!!window.__STILLROOM__');await capture('intro');
      timings.introMs=await run(`performance.now()-${started}`);console.log('INTRO_MS '+Math.round(timings.introMs));
      for(const stage of ['introduction','skip'])await run(`import('./src/dev/checks/stillroom-arrival-smoke.js').then(m=>m.${stage}())`);
      timings.portalAt=await run('performance.now()');
      await run(`import('./src/dev/checks/stillroom-arrival-smoke.js').then(m=>m.portal())`);
    }else await run(`document.getElementById('new-exploration').click()`);
    await sleep(1000);await capture('loading');
    if(mode==='explore'&&!process.argv.includes('--baseline')){
      await sleep(8000);await capture('progress');
      check(await run(`!document.getElementById('loading-screen').hidden&&document.getElementById('loading-screen').classList.contains('loading-active')&&parseInt(document.getElementById('loading-elapsed').textContent)>=2`),'Loading visibly reports elapsed time and remains active during construction');
    }
    await wait('!!window.__EXPLORATION__');
    const ready=await run(`({at:performance.now(),state:__EXPLORATION__.state(),startup:__EXPLORATION__.testWorld.startup,loading:__EXPLORATION__.testWorld.loading.state(),review:__STARTUP_REVIEW__,resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,start:r.startTime,end:r.responseEnd,ms:r.duration,bytes:r.transferSize})),paints:performance.getEntriesByType('paint').map(p=>({name:p.name,at:p.startTime}))})`);
    timings.readyMs=ready.at-started;if(mode==='story')timings.towerMs=ready.at-timings.portalAt;
    fs.writeFileSync(path.join(artifacts,`rc-${label}-startup.json`),JSON.stringify({browser,started,timings,ready,checks,errors},null,2));
    if(mode==='story'){
      const departure=await run('performance.now()');
      await run(`import('./src/dev/checks/stillroom-arrival-smoke.js').then(m=>m.openingWest())`);
      timings.campaignDepartureMs=await run(`performance.now()-${departure}`);
      check(await run(`__EXPLORATION__.war.state().campaign.engagements.some(b=>b.region==='caricas')`),'Story reaches the active Caricas campaign');
    }
    // Real browser keyboard input, not direct actor-position changes.
    await run(`document.getElementById('exploration-canvas').focus()`);const before=await run('__EXPLORATION__.snapshot().position');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});await sleep(1000);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
    const after=await run('__EXPLORATION__.snapshot().position');check(Math.hypot(after.x-before.x,after.z-before.z)>.2,'Browser movement input changes the player position');
    await capture('playing');
    const slot=mode==='story'?'war':'explore';await run(`__EXPLORATION__.pause();document.getElementById('save-return-start').click()`);
    await wait(`!!document.querySelector('[data-continue-mode="${slot}"]')?.onclick`);
    check(await run(`!document.querySelector('[data-continue-mode="${slot}"]').hidden&&!document.querySelector('[data-continue-mode="${slot}"]').disabled`),'Save and return opens the public menu with compatible Continue');
    await capture('continue');const resuming=await run('performance.now()');await run(`document.querySelector('[data-continue-mode="${slot}"]').click()`);await wait('!!window.__EXPLORATION__');
    timings.continueMs=await run(`performance.now()-${resuming}`);
    check(await run(`Math.hypot(__EXPLORATION__.snapshot().position.x-(${after.x}),__EXPLORATION__.snapshot().position.z-(${after.z}))<.2`),'Continue restores the saved position');
    check(await run('!__EXPLORATION__.state().frameErrors.length'),'No frame errors after Continue');
    fs.writeFileSync(path.join(artifacts,`rc-${label}-startup.json`),JSON.stringify({browser,started,timings,ready,checks,errors},null,2));
    console.log('READY_MS '+Math.round(ready.at-started));
  }
  const consoleErrors=events.filter(e=>e.method==='Runtime.consoleAPICalled'&&e.params.type==='error');errors.push(...consoleErrors);
  const resourceFailures=events.filter(e=>e.method==='Network.loadingFailed'||e.method==='Network.responseReceived'&&e.params.response.status>=400);
  errors.push(...resourceFailures);
  check(!events.some(e=>e.method==='Network.requestWillBeSent'&&!e.params.request.url.startsWith(origin+'/')&&!/^(data|blob):/.test(e.params.request.url)),'All game requests stay on the local static origin');
  await capture('final');const result={browser,checks,errors};fs.writeFileSync(path.join(artifacts,`rc-${label}-checks.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  await send('Browser.close');return errors.length?1:0;
}
main().then(code=>{process.exitCode=code;}).catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();child?.kill();server?.close();});
