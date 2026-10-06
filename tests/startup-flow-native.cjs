const fs=require('node:fs');
const path=require('node:path');

// Runs in the real, isolated Electron renderer. Unlike older opening checks,
// starts with the player's campaign scope and actually clicks the load chooser.
module.exports=async function checkStartupFlow(win,dir,{fast=false,menuOnly=false}={}){
  const checks=[],mode=fast?'fast':'full',captures=[];
  const js=code=>win.webContents.executeJavaScript(code);
  const traceErrors=()=>js(`(()=>{if(window.__startupErrorTrace)return;window.__startupErrorTrace=true;const original=console.error;console.error=(...args)=>{original(...args);original('STARTUP_GEOMETRY_TRACE '+(globalThis.__AZHORA_STARTUP__?.stages?.at(-1)?.name??'boot')+' '+new Error().stack);};})()`).catch(()=>{});
  win.webContents.on('did-finish-load',traceErrors);await traceErrors();
  const assert=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);console.log('STARTUP_FLOW '+label);};
  const wait=async(expression,label)=>{
    const start=Date.now();let logAt=start;
    for(;;){
      const result=await js(`(()=>{const fatal=document.getElementById('fatal');if(fatal?.dataset.stack&&!fatal.classList.contains('hidden'))throw new Error(fatal.dataset.stack);return !!(${expression});})()`);
      if(result)return;
      if(Date.now()-start>600000)throw new Error(label);
      if(Date.now()-logAt>20000){console.log('STARTUP_FLOW waiting: '+label+' '+await js('globalThis.__AZHORA_STARTUP__?.stages?.at(-1)?.name??"boot"'));logAt=Date.now();}
      await new Promise(r=>setTimeout(r,200));
    }
  };
  const click=id=>js(`document.getElementById(${JSON.stringify(id)}).click()`);
  const snapshot=()=>js('window.__AZHORA__.state()');
  const ready=async state=>{
    await wait(`window.__AZHORA__&&window.__AZHORA__.state().mode===${JSON.stringify(state)}&&document.getElementById('loading').classList.contains('hidden')`,'Enter '+state);
    const status=await js(`({load:window.__AZHORA__.state().loadingMode,hidden:document.getElementById('loading-choice').hidden,launch:new URL(location.href).searchParams.get('launch'),errors:window.__AZHORA__.state().frameErrors.count})`);
    assert(status.load===mode&&status.hidden&&!status.launch&&!status.errors,`${state}: keep ${mode}, consume launch action, no chooser or frame errors`);
  };
  let navigations=0;const count=(_e,_url,inPlace,mainFrame)=>{if(mainFrame&&!inPlace)navigations++;};
  win.webContents.on('did-start-navigation',count);
  const reloadClick=async(id,state)=>{
    const before=navigations;
    const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
    await js(`setTimeout(()=>document.getElementById(${JSON.stringify(id)}).click(),0);true`);await loaded;
    assert(new URL(win.webContents.getURL()).searchParams.get('load')===mode,id+' carries selected loading mode through navigation');
    await ready(state);assert(navigations===before+1,id+' uses one renderer transition');
  };
  const capture=async name=>{await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const file=`startup-${mode}-${name}.png`;fs.writeFileSync(path.join(dir,file),(await win.webContents.capturePage()).toPNG());captures.push(file);};
  const exit=async()=>{
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});
    await wait("window.__AZHORA__.state().mode==='pause'",'Open pause');await click('exit-main-menu');await ready('opening');
  };
  try{
    await wait("!document.getElementById('loading-choice').hidden",'Initial loading choice');
    assert(await js("document.activeElement.id==='loading-full'&&!window.__AZHORA__"),'Fresh launch offers Full first before building');
    await click('loading-'+mode);await ready('opening');
    const title=await js('window.__AZHORA__.openingView(0)');
    assert(title.scope==='campaign'&&title.backdropTiles>0,'Campaign menu has distant terrain without enabling the full continent');
    const labels=await js("[...document.querySelectorAll('#opening-main-actions button')].map(b=>b.textContent.trim()).join('|')");
    assert(labels==='Tutorial|Chapter 1|Developer Start|Continue','Four opening choices are visible');
    for(const seconds of [0,60,120,180]){await js(`window.__AZHORA__.openingView(${seconds})`);await capture('title-'+seconds);}
    await click('begin-chapter-one');
    assert(await js("!document.getElementById('opening-characters').classList.contains('hidden')&&document.querySelectorAll('#opening-characters [data-character]').length===11"),'Chapter 1 opens the eleven mercenary choices');
    await click('chapter-one-back');
    if(menuOnly)return {ok:true,mode,menuOnly,checks,title,captures};
    await reloadClick('begin-skip-tutorial','playing');
    const start=await snapshot();
    assert(start.region===16&&start.freeStart?.joined===false&&!start.peninsulaTutorial.active,'Developer Start enters Minora with no tutorial or accepted main quest');
    assert(await js("window.__AZHORA__.openingView().scope==='developer'"),'Developer Start enables the full world');
    await capture('developer-start');await exit();
    const before=navigations;await click('continue-road');await ready('playing');
    assert(navigations===before,'Continue from the menu reuses the loaded world');
    await exit();await reloadClick('begin-chapter-one','opening');
    assert(await js("window.__AZHORA__.openingView().scope==='campaign'&&!document.getElementById('opening-characters').classList.contains('hidden')"),'New Chapter 1 returns to the smaller campaign build');
    await click('chapter-one-back');await reloadClick('continue-road','playing');
    const continued=await snapshot();
    assert(continued.freeStart?.joined===false&&Math.hypot(continued.position[0]-start.position[0],continued.position[2]-start.position[2])<1,'Continue from campaign menu restores the developer save and location');
    await exit();
    const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
    await js("setTimeout(()=>document.getElementById('begin').click(),0);true");await loaded;
    await wait("window.__AZHORA__&&window.__AZHORA__.state().peninsulaTutorial.active",'Tutorial begins');
    const tutorial=await snapshot();
    assert(tutorial.loadingMode===mode&&tutorial.freeStart===null&&tutorial.peninsulaTutorial.path==='tutorial','Tutorial still begins on the peninsula with the selected loading mode');
    return {ok:true,mode,checks,title,captures};
  }finally{win.webContents.removeListener('did-start-navigation',count);win.webContents.removeListener('did-finish-load',traceErrors);}
};
