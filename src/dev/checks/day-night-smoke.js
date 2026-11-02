import {prepareWarExterior} from './tower-smoke.js';
import {TOWER_EXIT,TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';

const assert=(value,message)=>{if(!value)throw Error(message);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const f=()=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code:'KeyF',bubbles:true,cancelable:true}));};
const tick=(a,count=80)=>{for(let i=0;i<count;i++)a.step(.04);};
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
const views={
  minora:{position:{x:-2365,z:147},camera:{yaw:Math.PI/2,pitch:.14,distance:16}},
  caricas:{position:{x:-2092,z:287},camera:{yaw:Math.PI/2,pitch:.18,distance:13}},
  river:{position:{x:-2192,z:205},camera:{yaw:1.4,pitch:.52,distance:90}},
};
let preparedMs=0;
let battleBaseline=null;

export async function prepare(a){
  assert(a.dayNight,'Day/night experiment API is available');
  window.dispatchEvent(new Event('focus'));
  const start=performance.now();await prepareWarExterior(a);preparedMs=performance.now()-start;
  a.war.pause();a.dayNight.setRunning(false);a.dayNight.setEnabled(false);
  return {preparedMs,checks:['Reached the exterior through Taleth and the real tower door','Campaign clock paused independently of the atmosphere preview']};
}

// The exact same camera and ground position are reused at every hour. Native
// screenshots, rather than brightness assertions, establish night readability.
export async function view(a,{place='minora',hour=12,enabled=true}={}){
  const cameraView=views[place];assert(cameraView,'Unknown atmosphere review place: '+place);
  window.dispatchEvent(new Event('focus'));await a.visit(cameraView.position);a.war.pause();a.look(cameraView.camera);
  a.dayNight.setRunning(false);a.dayNight.setHour(hour);a.dayNight.setEnabled(enabled);
  for(let i=0;i<12;i++)await frame();
  const intervals=[];let previous=performance.now();
  for(let i=0;i<45;i++){await frame();const now=performance.now();intervals.push(now-previous);previous=now;}
  assert(!a.state().frameErrors.length,'No game frame errors in '+place+' at hour '+hour);
  return {place,hour,enabled,preparedMs,position:a.state().position,camera:cameraView.camera,atmosphere:a.dayNight.state(),render:a.renderStats(),frameMedianMs:percentile(intervals,.5),frameP95Ms:percentile(intervals,.95)};
}

export async function sky(a,{hour=17.5,body='sun'}={}){
  window.dispatchEvent(new Event('focus'));await a.visit({x:-2092,z:300});a.war.pause();
  a.dayNight.setRunning(false);a.dayNight.setHour(hour);a.dayNight.setEnabled(true);
  const celestial=a.dayNight.state(),directions=body==='sun'?[celestial.sun]:body==='moons'?celestial.moons:celestial.moons.filter(p=>p.name.toLowerCase()===body);
  assert(directions.length,'Unknown celestial view: '+body);
  const aim=directions.reduce((sum,p)=>({x:sum.x+p.x,z:sum.z+p.z}),{x:0,z:0});
  a.look({yaw:Math.atan2(-aim.x,-aim.z),pitch:.08,distance:13});
  for(let i=0;i<20;i++)await frame();
  const eye=a.state().cameraPosition;
  const projected=directions.map(p=>({name:p.name??'Sun',...a.project({x:eye[0]+p.x*100,y:eye[1]+p.y*100,z:eye[2]+p.z*100})}));
  assert(projected.some(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1),'At least one requested celestial body is framed on screen');
  assert(!a.state().frameErrors.length,'No game errors in the celestial view');
  return {hour,body,position:a.state().position,camera:a.state().camera,projected,atmosphere:a.dayNight.state(),render:a.renderStats()};
}

function lighting(state){
  return {sunIntensity:state.sunIntensity,hemisphereIntensity:state.hemisphereIntensity,colors:state.lighting};
}
function pausedHour(a,label,open,close){
  open();const before=a.dayNight.state().hour;tick(a);
  assert(a.dayNight.state().hour===before,label+' holds the atmosphere clock');close();
}
async function door(a,point){
  await a.visit(point);f();
  for(let i=0;i<600&&a.state().mode==='loading';i++)await new Promise(resolve=>setTimeout(resolve,50));
  assert(a.state().mode==='playing','Door transition finishes');a.step(0);
}

export async function verify(a){
  window.dispatchEvent(new Event('focus'));a.resume();a.war.pause();
  await a.visit(views.minora.position);a.look(views.minora.camera);a.step(0);
  const saved=JSON.stringify(a.store.read()),campaign=JSON.stringify(a.war.state().campaign);
  const checkpoint=JSON.stringify(a.war.save(a.snapshot()).simulation),clock=JSON.stringify(a.war.state().clock);
  a.dayNight.setRunning(false);a.dayNight.setEnabled(false);
  const baselineLight=lighting(a.dayNight.state()),comparisons=[];
  a.openDeveloper();document.getElementById('day-night-open').click();
  assert(a.state().mode==='playing'&&a.dayNight.state().enabled&&!document.getElementById('day-night-preview').hidden,'F8 preview button returns to exploration with visible controls');
  document.querySelector('[data-sky-hour="0"]').click();
  assert(a.dayNight.state().hour===0&&!a.dayNight.state().running,'Night button selects and holds midnight');
  document.getElementById('day-night-run').click();assert(a.dayNight.state().running,'Run cycle button starts preview');
  document.getElementById('day-night-run').click();assert(!a.dayNight.state().running,'Hold sky button stops preview');
  const selector=document.getElementById('day-night-speed'),position=a.state().position;
  selector.focus();const down=new KeyboardEvent('keydown',{code:'ArrowDown',key:'ArrowDown',bubbles:true,cancelable:true});
  selector.dispatchEvent(down);
  try{tick(a,20);}finally{selector.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowDown',key:'ArrowDown',bubbles:true,cancelable:true}));}
  const afterArrow=a.state().position;
  assert(Math.hypot(position[0]-afterArrow[0],position[2]-afterArrow[2])<1e-6&&!down.defaultPrevented,'Preview selector arrows preserve native keyboard use without moving Teresod');
  document.getElementById('day-night-off').click();assert(!a.dayNight.state().enabled&&document.getElementById('day-night-preview').hidden,'Close preview restores ordinary exploration');
  for(let pass=0;pass<3;pass++){
    a.dayNight.setEnabled(false);const disabled=a.renderStats();
    a.dayNight.setHour(12);a.dayNight.setEnabled(true);const noon=a.renderStats(),day=a.dayNight.state();
    a.dayNight.setHour(0);const night=a.renderStats(),midnight=a.dayNight.state();
    for(const [name,sample] of [['noon',noon],['night',night]]){
      assert(sample.calls-disabled.calls<=9,name+' adds at most nine sky and lantern draw calls in the same fixed scene');
      assert(sample.triangles-disabled.triangles<=1700,name+' adds at most seventeen hundred sky and lantern triangles');
    }
    assert(day.visible&&midnight.visible,'Atmosphere is visible outdoors');
    assert(day.extraLights===0&&midnight.extraShadowPasses===0,'Preview adds no lighting or shadow passes');
    assert(midnight.lanterns.activeLights<=2&&midnight.lanterns.lights.every(light=>!light.shadows),'At most two nearby lantern lights, without shadows');
    assert(midnight.sunIntensity<day.sunIntensity&&midnight.hemisphereIntensity>0,'Night changes the light while retaining ambient visibility');
    a.dayNight.setEnabled(false);const restored=a.renderStats();
    assert(restored.calls===disabled.calls&&restored.triangles===disabled.triangles,'Disabling removes all preview drawing');
    assert(JSON.stringify(lighting(a.dayNight.state()))===JSON.stringify(baselineLight),'Disabling exactly restores the host lighting');
    comparisons.push({pass,disabled,noon,night,restored});
  }
  assert(JSON.stringify(a.war.state().campaign)===campaign&&JSON.stringify(a.war.state().clock)===clock,'Lighting toggles preserve campaign history and campaign clock');
  assert(JSON.stringify(a.war.save(a.snapshot()).simulation)===checkpoint,'Lighting toggles preserve the campaign replay checkpoint');
  a.dayNight.setEnabled(true);a.dayNight.setHour(12);a.dayNight.setSpeed(24);a.dayNight.setRunning(true);
  const hour=a.dayNight.state().hour;tick(a);assert(a.dayNight.state().hour>hour,'Accelerated preview advances during active outdoor play');
  pausedHour(a,'Pause menu',()=>a.pause(),()=>a.resume());
  pausedHour(a,'Campaign map',()=>a.openMap(),()=>a.resume());
  pausedHour(a,'Background window',()=>window.dispatchEvent(new Event('blur')),()=>window.dispatchEvent(new Event('focus')));
  a.dayNight.setHour(0);await door(a,TOWER_EXIT);
  assert(a.tower.state().location==='tower'&&!a.dayNight.state().visible,'Entering the guild chamber removes the exterior sky');
  const indoor=a.dayNight.state();
  assert(indoor.sunIntensity===.45&&indoor.hemisphereIntensity===baselineLight.hemisphereIntensity&&!indoor.lanterns.visible,'Chamber restores its ordinary light intensities and hides exterior lanterns');
  for(const color of ['sun','hemisphere','ground'])assert(indoor.lighting[color]===baselineLight.colors[color],'Chamber restores the ordinary '+color+' color');
  assert(indoor.lighting.background==='354751'&&indoor.lighting.fog===null,'Chamber retains its own background and fog settings');
  const indoors=a.dayNight.state().hour;tick(a);assert(a.dayNight.state().hour===indoors,'Walking inside the chamber holds the exterior clock');
  await a.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});f();assert(a.state().mode==='briefing','Actual Taleth conversation opens');
  const speaking=a.dayNight.state().hour;tick(a);assert(a.dayNight.state().hour===speaking,'Taleth conversation holds the clock');
  document.getElementById('tower-close').click();
  await door(a,{...TOWER_DOOR,z:TOWER_DOOR.z-1});
  assert(a.tower.state().location==='world'&&a.dayNight.state().visible,'Leaving the chamber restores the exterior night');
  a.dayNight.setRunning(false);a.dayNight.setSpeed(1);a.dayNight.setEnabled(false);
  assert(JSON.stringify(a.store.read())===saved,'Experiment never writes the saved campaign');
  assert(JSON.stringify(a.war.save(a.snapshot()).simulation)===checkpoint,'Clock preview and room visits preserve campaign commands');
  assert(!a.state().frameErrors.length,'No game frame errors during atmosphere checks');
  return {comparisons,errors:a.state().frameErrors,checks:[
    'Three fixed-scene disabled/noon/night comparisons with bounded draw and triangle cost',
    'Actual developer preview, preset, run, hold and close buttons work',
    'Disabling restores baseline geometry and lighting',
    'Campaign history, replay commands and saved checkpoint remain unchanged',
    'Active outdoor preview advances; pause, map, background and dialogue hold its clock',
    'Real tower entry restores indoor lighting; leaving restores the night preview',
  ]};
}

export async function battle(a){
  window.dispatchEvent(new Event('focus'));a.war.pause();
  battleBaseline={campaign:JSON.stringify(a.war.state().campaign),saved:JSON.stringify(a.store.read()),checkpoint:JSON.stringify(a.war.save(a.snapshot()).simulation)};
  a.dayNight.setEnabled(true);a.dayNight.setHour(0);a.dayNight.setRunning(false);
  await a.practice.start('allied');assert(a.practice.state().active&&a.state().mode==='skirmish','Actual allied practice starts at night');
  a.look({yaw:0,pitch:.44,distance:18});tick(a,60);
  assert(a.dayNight.state().visible&&document.getElementById('day-night-preview').hidden,'Night remains visible while preview controls yield to combat');
  a.dayNight.setRunning(true);a.dayNight.setSpeed(24);const start=a.dayNight.state().hour;tick(a,10);
  assert(a.dayNight.state().hour>start,'Atmosphere cycle advances during active combat');
  const press=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
  press('KeyH');assert(a.practice.state().encounter.presentation.helpOpen,'H opens the actual combat help');
  const held=a.dayNight.state().hour,fightTime=a.practice.state().encounter.time;tick(a,20);
  assert(a.dayNight.state().hour===held&&a.practice.state().encounter.time===fightTime,'Combat help freezes both lighting and the fight');
  press('KeyH');assert(!a.practice.state().encounter.presentation.helpOpen,'H closes combat help');tick(a,10);
  assert(a.dayNight.state().hour>held,'Closing combat help resumes the atmosphere cycle');
  a.dayNight.setRunning(false);a.dayNight.setHour(0);a.dayNight.setSpeed(1);
  // Synchronous test steps submit WebGL frames without giving Electron's
  // compositor a paint opportunity. Wait for actual frames before capturePage
  // so the screenshot cannot retain the daylight tower view from verify().
  for(let i=0;i<3;i++)await frame();
  assert(a.state().mode==='skirmish'&&a.dayNight.state().hour===0,'Screenshot staging remains in the held midnight battle');
  const soldiersInFrame=a.state().fieldActors.filter(actor=>{const p=a.project({x:actor.position[0],y:actor.position[1]+1,z:actor.position[2]});return actor.visible&&Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1;}).length;
  assert(soldiersInFrame>=3,'Night combat screenshot frames several actual soldiers');
  assert(!a.state().frameErrors.length,'Night battle has no game frame errors');
  return {encounter:a.practice.state().encounter,atmosphere:a.dayNight.state(),soldiersInFrame,render:a.renderStats(),checks:['Actual allied practice staged at midnight for screenshot readability review','Lighting runs during combat and pauses with actual H help','Preview controls stay out of the battle HUD']};
}

export function finishBattle(a){
  assert(battleBaseline,'Night combat fixture was started');a.practice.finish();a.dayNight.setRunning(false);a.dayNight.setEnabled(false);
  assert(!a.practice.state().active&&a.state().mode==='playing','Finishing practice restores exploration');
  assert(JSON.stringify(a.war.state().campaign)===battleBaseline.campaign,'Night combat practice preserves the campaign');
  assert(JSON.stringify(a.war.save(a.snapshot()).simulation)===battleBaseline.checkpoint,'Night combat practice preserves campaign commands');
  assert(JSON.stringify(a.store.read())===battleBaseline.saved,'Night combat practice never writes the save');
  assert(!a.state().frameErrors.length,'No game errors after night combat cleanup');battleBaseline=null;
  return {checks:['Night practice exits cleanly without campaign or saved-game changes'],errors:a.state().frameErrors};
}

export async function profile(a,{place='caricas'}={}){
  const fixed=views[place];assert(fixed,'Unknown profile place: '+place);
  window.dispatchEvent(new Event('focus'));await a.visit(fixed.position);a.war.pause();a.look(fixed.camera);
  a.dayNight.setRunning(false);a.dayNight.setHour(0);a.pause();
  const blocks=[];
  try{
    for(const enabled of [false,true,false,true]){
      a.dayNight.setEnabled(enabled);
      for(let i=0;i<30;i++)await frame();
      const intervals=[];let previous=performance.now();
      for(let i=0;i<45;i++){await frame();const now=performance.now();intervals.push(now-previous);previous=now;}
      blocks.push({enabled,hour:enabled?0:null,warmFrames:30,sampleFrames:45,frameMedianMs:percentile(intervals,.5),frameP95Ms:percentile(intervals,.95),render:a.renderStats(),position:a.state().position,camera:a.state().camera});
    }
    assert(!a.state().frameErrors.length,'Paired atmosphere profile has no game errors');
    return {place,method:'Paused fixed scene: actor animation and camera held; disabled/night/disabled/night with 30 warm and 45 measured animation frames per block. Host load and compositor scheduling still affect these measurements.',blocks,errors:a.state().frameErrors};
  }finally{a.dayNight.setEnabled(false);a.resume();}
}
