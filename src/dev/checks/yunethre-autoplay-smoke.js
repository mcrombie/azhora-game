import {CHAPTER_LOCATIONS} from '../../content/chapters/yunethre/locations.js';
const assert=(value,message)=>{if(!value)throw Error(message);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let begun=false,prior='',lastPosition=null,distance=0;const stages=[];
const pressP=()=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP',key:'p',bubbles:true}));

// Run in bounded chunks so the native launcher can capture each visible
// chapter milestone. All quest changes come from the real autoplay's inputs.
export async function next(api){
  const driver=api.chapterAutoplay;assert(driver,'Chapter 2 autoplay is connected');
  if(!begun){
    assert(!api.chapter.state().returned,'Use a fresh isolated Chapter 2 profile for this check');
    assert(api.testWorld.state().room==='lookout','Fresh Chapter 2 starts at the lookout');
    assert(api.chapter.state().premise.source==='unattended','Fresh history comes from the unattended Chapter 1');
    assert(api.minimap.state().visible&&!document.getElementById('tower-main-quest').hidden,'Chapter 1 minimap and quest panel are visible');
    assert([16,17,25,13,14,38,61,62].every(id=>api.state().enabledRegions.includes(id)),'The five Lizeem regions remain accessible');
    assert(api.stable.owned,'Teresod begins Chapter 2 with his horse');
    pressP();assert(driver.state().active,'P starts Chapter 2 autoplay');
    const before=JSON.stringify(api.chapter.state());pressP();assert(!driver.state().active,'P stops Chapter 2 autoplay');
    assert(JSON.stringify(api.chapter.state())===before,'Stopping preserves chapter progress');pressP();assert(driver.state().active,'P resumes Chapter 2 autoplay');begun=true;
  }
  const deadline=performance.now()+300000;
  for(let i=0;i<30000;i++){
    if(performance.now()>deadline)throw Error('Autoplay milestone timed out: '+JSON.stringify(driver.state()));
    const s=driver.state(),view=api.state();assert(!view.frameErrors.length,'Frame error: '+view.frameErrors.join('; '));
    if(!s.active){assert(s.stage==='complete','Autoplay stopped early: '+JSON.stringify({driver:s,position:view.position,mode:view.mode,chapter:api.chapter.state()}));return {done:true,...verify(api)};}
    if(s.pending||view.mode==='loading'){await pause(20);continue;}
    if(i%40===0)window.dispatchEvent(new Event('focus'));
    api.step(.04,.04);
    const point=api.state().position;
    if(lastPosition){const d=Math.hypot(point[0]-lastPosition[0],point[2]-lastPosition[2]);if(d<3)distance+=d;}
    lastPosition=point;
    if(i%40===39)await frame();
    const conversation=api.chapter.conversation(),stamp=conversation?conversation.id+':'+conversation.actions.join(','):s.stage==='map'?'map:accession':s.stage==='walking'?'walking:'+s.goal:null;
    if(stamp&&stamp!==prior&&(s.seconds>1||s.stage==='walking')){
      prior=stamp;stages.push(stamp);await frame();return {done:false,stamp,driver:driver.state(),position:point,elapsed:api.chapter.state().elapsed,distance};
    }
  }
  throw Error('Autoplay exhausted its check step budget: '+JSON.stringify(driver.state()));
}

export function verify(api){
  const state=api.chapter.state(),driver=api.chapterAutoplay.state(),view=api.state();
  assert(state.returned&&state.battle.status==='averted'&&state.laketown==='league','The diplomatic main quest completed through its conversations');
  assert(view.mode==='map','The changed geopolitical map remains open');
  assert(distance>650,'The computer physically walked the Minora and Yunethre journey');
  assert(stages.some(s=>s.startsWith('taleth:'))&&stages.some(s=>s.startsWith('messenger:')),'Both the assignment and messenger were shown');
  assert(!view.frameErrors.length,'No frame errors');
  // The live map includes an owner lookup function; only its report data can
  // cross Electron's structured-clone boundary back to the native launcher.
  return {driver,chapter:state,distance:Math.round(distance),stages:[...stages],map:JSON.parse(JSON.stringify(view.map)),errors:view.frameErrors};
}

export async function run(api){let result;do{result=await next(api);}while(!result.done);return result;}

export async function horse(api){
  api.resume();api.step(.04,.04);
  assert(api.stable.owned,'The Chapter 1 horse is retained');
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyH',key:'h',bubbles:true}));
  const arrived=api.stable.state(),at=api.state().position;
  assert(Math.hypot(arrived.horse.x-at[0],arrived.horse.z-at[2])<=2.9,'Horse arrives within mounting reach immediately');
  assert(arrived.summoning&&!arrived.called,'Blue arrival effect replaces a running summons');
  for(let i=0;i<8;i++)api.step(.04,.04);
  await frame();return {horse:api.stable.state(),position:api.state().position};
}
// A short visual fixture for the arrival effect; the full check above owns
// verification of the physical quest journey to this same return road.
export async function horseReview(api){
  assert(api.chapter.interact()&&api.chapter.choose('accept'),'Accept the Chapter 2 assignment');
  await api.chapterTransition(null,CHAPTER_LOCATIONS.departure);
  assert(api.chapter.command({type:'depart'}).ok,'Begin the outdoor chapter fixture');
  api.look({yaw:Math.PI/2,pitch:.32,distance:8});api.step(.04,.04);
  return horse(api);
}
export async function saveHorse(api){
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyG',key:'g',bubbles:true}));api.step(.04,.04);
  assert(api.stable.mounted&&api.state().mount.kind==='horse','G mounts the owned horse');
  assert(api.save().ok,'Completed Chapter 2 and horse can be saved');
  return api.stable.snapshot();
}
export async function restored(api){
  assert(api.chapter.state().returned,'Chapter 2 progress survives reload');
  assert(api.stable.owned,'Owned horse survives reload');
  assert(api.state().enabledRegions.length===8,'All eight chapter regions remain enabled');
  assert(api.minimap.state().visible,'Shared minimap survives reload');
  assert(!api.state().frameErrors.length,'No restored frame errors');
  return {chapter:api.chapter.state(),horse:api.stable.snapshot(),minimap:api.minimap.state().visible};
}
