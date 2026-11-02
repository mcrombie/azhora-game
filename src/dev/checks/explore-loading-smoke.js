// Real menu -> loading choice -> exterior-world startup, including a continued
// save. Keep this separate from the older movement smoke's explicit Fast launch.
const checks=[];
const assert=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);console.log('EXPLORATION_LOADING_CHECK '+label);};
const frames=async(n=2)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
const wait=async(test,label)=>{const end=performance.now()+15000;while(!test()){if(performance.now()>end)throw Error(label);await frames();}};
let choiceAt=0;
const result=extra=>({checks:checks.splice(0),...extra});

export async function menu(){
  await wait(()=>document.getElementById('new-exploration')?.onclick,'Main menu did not become interactive');
  assert(!document.getElementById('start-screen').hidden,'Real launcher is visible before Explore starts');
  const cards=[...document.querySelectorAll('.launch-options > article')],names=cards.map(card=>card.querySelector('h2').textContent);
  assert(JSON.stringify(names)===JSON.stringify(['Explore','Combat Testing','Lizeem War Scenario']),'Launcher contains only the three requested choices, in order');
  const boxes=cards.map(card=>card.getBoundingClientRect());
  assert(boxes.every(box=>Math.abs(box.left-boxes[0].left)<1&&Math.abs(box.width-boxes[0].width)<1)&&boxes.slice(1).every((box,i)=>box.top>=boxes[i].bottom),'Launcher choices form one column');
  assert(!document.querySelector('#start-screen [data-start-mode="hearthfall"]'),'Hearthfall is absent from the launcher');
  assert(!window.__EXPLORATION__,'World construction waits for a launch choice');
  return result({names});
}

export async function choose(continuing=false){
  const button=document.querySelector(`[data-${continuing?'continue':'start'}-mode="explore"]`);
  await wait(()=>button&&!button.disabled&&button.onclick,'Explore launch button is unavailable');
  button.click();
  await wait(()=>!document.getElementById('loading-choice').hidden,'Explore loading choice did not open');
  assert(document.activeElement===document.getElementById('loading-full'),'Full is the focused default loading choice');
  assert(!document.getElementById('loading-full').disabled&&!document.getElementById('loading-fast').disabled,'Both Full and Fast are available');
  assert(/Full mode starts automatically in 10 seconds/.test(document.getElementById('loading-countdown').textContent),'Each launch offers a fresh ten-second Full countdown');
  assert(!window.__EXPLORATION__,'Choice is shown before world startup');
  choiceAt=performance.now();
  return result({continuing,countdown:document.getElementById('loading-countdown').textContent});
}

export function selectFast(){document.getElementById('loading-fast').click();}

export async function fast(h){
  assert(h.state().launch==='explore'&&h.state().mode==='playing','Fast Explore opens into playable exploration');
  assert(h.testWorld.loadingMode==='fast','Fast choice reaches the world loader');
  assert(!h.tower&&!h.war&&typeof h.testWorld.state==='undefined','Explore initializes without depending on the tower state API');
  const initial=h.testWorld.loading.state();
  assert(initial.pending>0&&initial.completed<initial.total,'Fast leaves distant regional scenery deferred');
  assert(h.testWorld.readyAt(...[h.snapshot().position.x,h.snapshot().position.z]),'Fast prepares the starting region');
  const start=h.state().position;
  h.hold('KeyS',true);for(let i=0;i<30;i++)h.step(.04);h.hold('KeyS',false);
  assert(Math.hypot(h.state().position[0]-start[0],h.state().position[2]-start[2])>.5,'Explore can walk after startup');
  h.openMap();await frames(4);
  assert(h.state().mode==='map'&&!document.getElementById('map-screen').hidden&&document.getElementById('atlas-loading').hidden,'Explore map loads and opens');
  h.resume();assert(h.save().ok,'Explore saves after Fast startup');
  const saved=h.snapshot();
  assert(JSON.stringify(h.store.read().data.position)===JSON.stringify(saved.position),'Saved Explore position is retained in its own slot');
  assert(!h.state().frameErrors.length,'Fast play has no frame errors');
  await frames();
  return result({saved,readyMs:h.state().readyMs,loading:initial});
}

export async function full(h,saved){
  assert(h.state().launch==='explore'&&h.state().mode==='playing','Continued Full Explore opens into playable exploration');
  assert(h.testWorld.loadingMode==='full','An untouched choice defaults to Full even after choosing Fast last time');
  assert(performance.now()-choiceAt>=9500,'Full starts after the real countdown without an injected click');
  const loaded=h.testWorld.loading.state();
  assert(loaded.total>0&&loaded.pending===0&&loaded.completed===loaded.total&&loaded.jobs.every(job=>job.status==='ready'),'Full prepares every registered regional job before play');
  const actual=h.snapshot().position;
  assert(Math.hypot(actual.x-saved.position.x,actual.y-saved.position.y,actual.z-saved.position.z)<.05,'Continue restores the saved position through the exterior-only placement path');
  assert(JSON.stringify(h.state().cells)===JSON.stringify(saved.cells),'Continue preserves discovered map cells');
  assert(!h.state().frameErrors.length,'Full startup has no frame errors');
  const begun=performance.now();
  assert(await h.travelToRegion(106),'A distant prepared region supports developer travel');
  const travelled=h.testWorld.loading.state();
  assert(h.state().region===106&&h.state().mode==='playing','Full arrives on foot in West Ithzel');
  assert(travelled.completed===loaded.completed&&travelled.jobs.every(job=>job.status==='ready'),'Distant travel needs no additional regional scenery construction');
  assert(!h.state().frameErrors.length,'Distant Full exploration has no frame errors');
  await frames();
  return result({readyMs:h.state().readyMs,loading:loaded,travelMs:Math.round(performance.now()-begun),position:h.snapshot().position});
}
