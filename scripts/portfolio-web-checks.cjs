// Real Chromium against public/, with an isolated browser profile and no desktop bridge.
module.exports=async function({win,run,wait,menu,check,artifacts,origin,errors,setFailure}){
  const fs=require('node:fs'),path=require('node:path');
  const capture=async name=>fs.writeFileSync(path.join(artifacts,name+'.png'),(await win.webContents.capturePage()).toPNG());
  const reload=async search=>{await win.loadURL(origin+'/?test=1&menu=1'+search);return menu();};
  const stage=async method=>run(`import('./src/dev/checks/stillroom-arrival-smoke.js').then(m=>m.${method}())`);
  const metrics={};
  // Broken data must not advertise Continue; do not clear any real browser profile.
  await run(`localStorage.setItem('azhora-exploration-v1','not valid json')`);
  await reload('');
  check(await run(`document.querySelector('[data-continue-mode="explore"]').hidden`),'Corrupt Explore save does not advertise Continue');
  let start=Date.now();
  await run(`document.getElementById('new-exploration').click()`);
  await wait('window.__EXPLORATION__');metrics.exploreReadyMs=Date.now()-start;
  check(await run(`document.getElementById('loading-choice').hidden&&window.__EXPLORATION__.testWorld.loadingMode==='fast'`),'Public Explore bypasses the Full/Fast choice and countdown');
  const fast=await run(`import('./src/dev/checks/explore-loading-smoke.js').then(m=>m.fast(window.__EXPLORATION__))`);
  check(fast.checks.length>0,'Public Explore starts, moves, opens its map and saves');
  checksFrom(fast.checks);
  await capture('portfolio-explore');
  const streamed=await run(`(async()=>{const h=window.__EXPLORATION__,before=h.testWorld.loading.state();if(!await h.travelToRegion(13))throw Error('Caricas travel failed');h.step(0);return {before:before.completed,after:h.testWorld.loading.state().completed,region:h.state().region,ready:h.testWorld.readyAt(h.snapshot().position.x,h.snapshot().position.z),errors:h.state().frameErrors};})()`);
  console.log('PORTFOLIO_NEARBY '+JSON.stringify(streamed));
  check(streamed.region===13&&streamed.ready&&streamed.after>=streamed.before&&!streamed.errors.length,'Nearby Caricas is prepared and traversable with progressive loading');
  const deferred=await run(`(async()=>{const h=window.__EXPLORATION__,before=h.testWorld.loading.state();const id=[38,61,62].find(id=>before.jobs.some(j=>j.regions.includes(id)&&j.status!=='ready'));if(!id)throw Error('No deferred neighboring-region fixture');if(!await h.travelToRegion(id))throw Error('Deferred travel failed');const after=h.testWorld.loading.state();if(!after.jobs.filter(j=>j.regions.includes(id)).every(j=>j.status==='ready'))throw Error('Deferred region not ready');if(!await h.travelToRegion(13))throw Error('Return to Caricas failed');return {id,before:before.completed,after:after.completed,errors:h.state().frameErrors};})()`);
  check(deferred.after>deferred.before&&!deferred.errors.length,'A deferred neighboring region constructs on demand and travel back reuses prepared scenery');
  const saved=await run(`(()=>{const h=window.__EXPLORATION__;h.save();return h.store.read().data;})()`);
  await reload('');
  check(await run(`!document.querySelector('[data-continue-mode="explore"]').hidden&&!document.querySelector('[data-continue-mode="explore"]').disabled`),'Compatible Explore save reveals Continue');
  await run(`document.querySelector('[data-continue-mode="explore"]').click()`);await wait('window.__EXPLORATION__');
  const restored=await run(`window.__EXPLORATION__.snapshot()`);
  check(Math.hypot(saved.position.x-restored.position.x,saved.position.z-restored.position.z)<.1,'Public Explore Continue restores the saved position');
  // A failed dynamic import exercises the user-visible recovery path, not a fake error panel.
  await reload('');const errorStart=errors.length;setFailure('/src/app/exploration/exploration.js');
  await run(`document.getElementById('new-exploration').click()`);
  await run(`new Promise((resolve,reject)=>{const end=Date.now()+15000;const poll=()=>{if(window.__EXPLORATION_ERROR__)return resolve(true);if(Date.now()>end)return reject(Error('Missing load failure'));setTimeout(poll,50);};poll();})`);
  check(await run(`document.getElementById('loading-screen').textContent.includes('Return to main menu')`),'Failed world module offers Return to main menu');
  setFailure(null);errors.splice(errorStart); // Expected injected network/import failure only.
  const returned=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
  await run(`[...document.querySelectorAll('#loading-screen button')].find(b=>b.textContent==='Return to main menu').click()`);await returned;await menu();
  check(await run(`!document.getElementById('start-screen').hidden`),'Loading failure returns to a usable launcher');
  // Start the real current Story, without the legacy tower fixture.
  await reload('');start=Date.now();await stage('begin');metrics.storyIntroReadyMs=Date.now()-start;
  await stage('introduction');await capture('portfolio-story-intro');
  check(await run(`!!window.__STILLROOM__&&!window.__EXPLORATION__`),'Story introduction starts before exterior-world construction');
  await stage('skip');await stage('portal');start=Date.now();await wait('window.__EXPLORATION__');metrics.storyTowerReadyMs=Date.now()-start;
  check(await run(`window.__EXPLORATION__.tower.state().location==='tower'&&!window.__EXPLORATION__.tower.state().briefed&&!window.__STILLROOM__`),'Story reaches Taleth with allegiance still available and disposes the intro');
  await stage('openingWest');
  check(await run(`window.__EXPLORATION__.state().enabledRegions.length===5`),'Story limits exterior construction to the five campaign regions');
  await capture('portfolio-story-campaign');
  await reload('');
  check(await run(`!document.querySelector('[data-continue-mode="war"]').hidden&&!document.querySelector('[data-continue-mode="war"]').disabled`),'Story checkpoint reveals Continue');
  await run(`document.querySelector('[data-continue-mode="war"]').click()`);await wait('window.__EXPLORATION__');
  check(await run(`window.__EXPLORATION__.war.state().campaign.engagements.some(b=>b.region==='caricas')&&!window.__STILLROOM__`),'Story Continue restores campaign without replaying the introduction');
  const developer=await reload('&launcher=developer');
  check(developer.starts.filter(b=>b.visible).length===5,'Developer browser retains three chapters, Explore and Combat Testing');
  await run(`document.getElementById('new-exploration').click()`);
  check(await run(`!document.getElementById('loading-choice').hidden&&!document.getElementById('loading-full').disabled&&!document.getElementById('loading-fast').disabled`),'Developer Explore retains Full and Fast controls');
  await capture('portfolio-developer-loading');
  // Test-only localStorage entries are removed so the older isolated harness can test fresh saves.
  await run(`localStorage.clear()`);
  await reload('&launcher=developer');
  await checkDeveloperChapters({run,wait,check,reload});
  await run(`localStorage.clear()`);await reload('&launcher=developer');
  fs.writeFileSync(path.join(artifacts,'portfolio-web-metrics.json'),JSON.stringify({metrics,streamed,deferred},null,2));
  function checksFrom(labels){for(const label of labels)check(true,label);}
};

async function checkDeveloperChapters({run,wait,check,reload}){
  for(const mode of ['yunethre','oremindi']){
    await run(`document.querySelector('[data-start-mode="${mode}"]').click()`);await wait('window.__EXPLORATION__');
    const checkpoint=await run(`(()=>{const h=window.__EXPLORATION__;if(!h.save().ok)throw Error('Chapter save failed');return {launch:h.state().launch,data:h.store.read().data,errors:h.state().frameErrors};})()`);
    check(checkpoint.launch===mode&&!!checkpoint.data&&!checkpoint.errors.length,`Developer ${mode} starts and saves without frame errors`);
    await reload('&launcher=developer');
    await wait(`document.querySelector('[data-continue-mode="${mode}"]')?.onclick`);
    check(await run(`!document.querySelector('[data-continue-mode="${mode}"]').disabled`),`Developer ${mode} offers compatible Continue`);
    await run(`document.querySelector('[data-continue-mode="${mode}"]').click()`);await wait('window.__EXPLORATION__');
    const restoredChapter=await run(`(()=>{const h=window.__EXPLORATION__;return {launch:h.state().launch,data:h.store.read().data,errors:h.state().frameErrors};})()`);
    check(restoredChapter.launch===mode&&JSON.stringify(restoredChapter.data)===JSON.stringify(checkpoint.data)&&!restoredChapter.errors.length,`Developer ${mode} Continue preserves the complete checkpoint and prior chapter history`);
    await reload('&launcher=developer');
  }
}
module.exports.checkDeveloperChapters=checkDeveloperChapters;
