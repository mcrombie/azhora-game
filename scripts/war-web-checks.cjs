// The browser save path must work without Electron's file-storage bridge.
const fs=require('node:fs'),path=require('node:path');
module.exports=async function warWebChecks({win,run,wait,menu,check,artifacts}){
  const capture=async name=>fs.writeFileSync(path.join(artifacts,`web-war-${name}.png`),(await win.webContents.capturePage()).toPNG());
  const invoke=(file,method)=>run(`import('./src/dev/checks/${file}.js').then(m=>m.${method}(window.__EXPLORATION__))`);
  const returnToMenu=async code=>{
    const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
    await run(code);await loaded;return menu();
  };
  if(await run(`!!window.__EXPLORATION__`))await returnToMenu(`window.__EXPLORATION__.pause();document.getElementById('return-start').click()`);
  const unrelated=await run(`JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key])=>!key.includes('lizeem-world'))))`);
  await run(`document.querySelector('[data-start-mode="war"]').click()`);await wait('window.__EXPLORATION__?.tower');
  check(await run(`window.__EXPLORATION__.tower.state().inside&&!window.__EXPLORATION__.testWorld.state().exteriorLoaded`),'Browser war opens directly in the tower without constructing the exterior');
  check(await run(`window.__EXPLORATION__.save().ok`),'Browser can save inside the tower');
  const original=await run(`JSON.stringify({...localStorage})`);
  await run(`window.__EXPLORATION__.pause();window.__storageWrite=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('Simulated quota');};document.getElementById('save-return-start').click();Storage.prototype.setItem=window.__storageWrite;delete window.__storageWrite;`);
  check(await run(`!!window.__EXPLORATION__&&window.__EXPLORATION__.state().mode==='pause'&&document.getElementById('save-note').textContent.includes('failed')`),'Failed browser save leaves the player safely in the pause menu');
  check(await run(`JSON.stringify({...localStorage})`)===original,'Failed save keeps every previous browser slot unchanged');
  const returned=await returnToMenu(`document.getElementById('save-return-start').click()`);
  check(returned.continues.find(b=>b.mode==='war')?.enabled,'Save and exit returns to a menu with War Continue enabled');
  await run(`document.querySelector('[data-continue-mode="war"]').click()`);await wait('window.__EXPLORATION__?.tower');
  check(await run(`window.__EXPLORATION__.tower.state().inside&&!window.__EXPLORATION__.testWorld.state().exteriorLoaded`),'Fresh browser Continue restores the tower without exterior loading');
  await capture('tower');
  for(const stage of ['departure','ride','battle']){
    const result=await invoke('first-session-smoke',stage);for(const label of result.checks)check(true,'Browser: '+label);
    await capture(stage);
  }
  await run(`window.__EXPLORATION__.war.pause();document.getElementById('world-war-report-dismiss').click();window.__EXPLORATION__.war.trackCouncil('mayor');window.__EXPLORATION__.pause();`);
  await returnToMenu(`document.getElementById('save-return-start').click()`);
  await run(`document.querySelector('[data-continue-mode="war"]').click()`);await wait('window.__EXPLORATION__?.war');
  await run(`window.__EXPLORATION__.war.pause()`);
  check(await run(`document.getElementById('world-war-report').hidden&&window.__EXPLORATION__.store.read().data.reportReadThrough>0`),'Dismissed dispatch stays dismissed across a fresh browser Continue');
  check(await run(`window.__EXPLORATION__.war.state().guidance.label.includes('Mayor')`),'Chosen council doorway remains the direct destination after Continue');
  await run(`window.__EXPLORATION__.step(.04);window.__EXPLORATION__.step(.04);window.__EXPLORATION__.step(.04);window.__EXPLORATION__.step(.04);`);
  check(await run(`document.querySelector('.minimap-caption').textContent.includes('Mayor')&&document.getElementById('exploration-minimap').dataset.target==='mayor'`),'Minimap agrees with the selected council doorway instead of pointing back to the horse');
  check(await run(`window.__EXPLORATION__.war.state().campaign.regions.caricas.owner==='west'&&window.__EXPLORATION__.war.state().campaign.day===6`),'Fresh browser Continue keeps the immediate territory result');
  check(await run(`document.getElementById('world-war-result').textContent.includes('Caricas')`),'Dismissed result remains available in the campaign map');
  await capture('continued');
  for(const [width,height]of [[1280,720],[1024,768],[1024,600]]){
    win.setContentSize(width,height);await run(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    await capture(`hud-${width}-${height}`);
    const layout=await run(`(()=>{const ids=['exploration-minimap','world-war-track','teresod-sorcery'],rects=ids.map(id=>({id,...document.getElementById(id).getBoundingClientRect().toJSON()}));return {rects,viewport:{width:innerWidth,height:innerHeight},clear:rects.every(r=>r.top>=0&&r.bottom<=innerHeight)&&rects.every((a,i)=>rects.every((b,j)=>i===j||a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom))};})()`);
    console.log('WAR_WEB_LAYOUT '+JSON.stringify(layout));check(layout.clear,`Navigation and sorcery panels do not overlap at ${width} by ${height}`);
  }
  win.setContentSize(1280,720);await run(`window.__EXPLORATION__.pause()`);await capture('pause-720');
  check(await run(`(()=>{const b=document.getElementById('save-return-start');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return r.width>0&&r.top>=0&&r.bottom<=innerHeight;})()`),'Save and exit remains reachable at 1280 by 720');
  await capture('save-720');
  check(await run(`JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key])=>!key.includes('lizeem-world'))))`)===unrelated,'War session leaves Explore, Hearthfall and other browser preferences unchanged');
  check(await run(`!window.__EXPLORATION__.state().frameErrors.length`),'Browser war session has no frame errors');
};
