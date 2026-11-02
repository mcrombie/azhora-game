const fs=require('node:fs'),path=require('node:path');
module.exports=async function checkFoodWarWindow(win,dir,errors){
  const capture=async name=>{await new Promise(resolve=>setTimeout(resolve,200));fs.writeFileSync(path.join(dir,`food-war-${name}.png`),(await win.webContents.capturePage()).toPNG());};
  await capture('opening');
  const report=await win.webContents.executeJavaScript(`import('./src/dev/checks/food-war-smoke.js').then(m=>m.checkFoodWar(window.__LIZEEM__))`);
  await capture('battle');
  await win.webContents.executeJavaScript(`const s=window.__LIZEEM__.state().campaign,a=s.armies.find(a=>a.status==='engaged');document.querySelector('[data-army="'+a.id+'"]').dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',bubbles:true}));document.getElementById('army-inspector').scrollIntoView({block:'nearest'});`);
  await capture('army');
  await win.webContents.executeJavaScript(`window.__LIZEEM__.reset(2);while(!window.__LIZEEM__.state().campaign.events.some(e=>e.type==='army-hold')&&window.__LIZEEM__.state().campaign.day<120)window.__LIZEEM__.advance();const hold=window.__LIZEEM__.state().campaign.events.find(e=>e.type==='army-hold');const armyChoice=document.getElementById('selected-army');armyChoice.value=String(hold.armyId);armyChoice.dispatchEvent(new Event('change'));document.getElementById('army-inspector').scrollIntoView({block:'start'});`);
  await capture('planning');
  await win.webContents.executeJavaScript(`window.__LIZEEM__.reset(1731);document.getElementById('disrupt-nethereum').click();window.__LIZEEM__.advance(20);document.getElementById('restore-nethereum').click();window.__LIZEEM__.advance(8);const select=document.getElementById('selected-region');select.value='isareos';select.dispatchEvent(new Event('change'));document.getElementById('army-inspector').open=false;document.querySelector('aside').scrollTop=0;`);
  await capture('recovery');
  win.setContentSize(390,844);await new Promise(resolve=>setTimeout(resolve,200));
  const mobile=await win.webContents.executeJavaScript(`({overflow:document.documentElement.scrollWidth>innerWidth+1,mapHeight:document.getElementById('scenario-map').getBoundingClientRect().height})`);
  if(mobile.overflow||mobile.mapHeight<160)throw Error('Food-war mobile layout overflow');
  await capture('mobile');report.checks.push('Food war fits a 390px display without horizontal overflow');
  for(const legacy of [true,false]){
    const loaded=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Planning version did not navigate')),10000);win.webContents.once('did-finish-load',()=>{clearTimeout(timeout);resolve();});});
    await win.webContents.executeJavaScript(`setTimeout(()=>document.getElementById('planning-version').click(),50);true;`);await loaded;
    await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const end=Date.now()+10000;const poll=()=>window.__LIZEEM__?resolve():window.__LIZEEM_ERROR__?reject(Error(window.__LIZEEM_ERROR__)):Date.now()>end?reject(Error('Planning version failed to initialize')):setTimeout(poll,50);poll();})`);
    const checked=await win.webContents.executeJavaScript(legacy?`(()=>{const h=window.__LIZEEM__;h.importRun({format:'azhora-lizeem-experiment',version:1,scenario:'lizeem-food-war-v1',seed:1731,day:35,commands:[]});const s=h.state().campaign;return s.day===35&&s.winner==='east'&&!s.armies.some(a=>a.supplyPlan);})()`:`window.__LIZEEM__.state().campaign.scenario==='lizeem-food-war-v2'&&window.__LIZEEM__.state().campaign.day===0`);
    if(!checked)throw Error('Planning version compatibility failed');
    report.checks.push(legacy?'Previous food-war exports replay with their original outcome':'Current planning can be reopened as a fresh run');
  }
  const result={...report,mobile,errors};fs.writeFileSync(path.join(dir,'food-war-checks.json'),JSON.stringify(result,null,2));return result;
};
