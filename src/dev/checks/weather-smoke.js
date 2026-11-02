import {CANERD} from '../../content/regions/canerd/canerd-world.js';

const assert=(value,message)=>{if(!value)throw Error('Weather: '+message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const sessions=new WeakMap(),outside={x:CANERD.x,z:CANERD.z+70},camera={yaw:.06,pitch:.10,distance:22};
const position=a=>a.snapshot().position;
const current=a=>a.weather.state();
const phases=a=>{const s=current(a);return {time:s.time,animation:s.view.animationTime,rain:s.view.rainTime,sample:s.sample};};
async function advance(a,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++){a.step(.05,.05);if(i%20===19)await frames();}}
function budget(s){
  assert(s.view.extraLights===0&&s.view.extraShadowPasses===0,'Weather adds no lights or shadow passes');
  assert(s.view.drawCalls<=2&&s.view.rainCount<=s.view.rainCapacity&&s.view.rainCapacity<=512,'The rendered weather stays within its two-draw, 512-drop budget');
}
function preview(a,kind){
  const before=a.snapshot().elapsed;
  assert(a.weather.setPreview(kind),'The developer preview accepts '+kind);
  assert(a.snapshot().elapsed===before,'Preview selection does not change elapsed adventure time');
  a.step(0,0);
}
async function capture(a,extra={}){
  const weather=current(a);budget(weather);
  assert(!a.state().frameErrors.length,'Weather renders without frame errors');
  assert(JSON.stringify(a.store.read())===sessions.get(a).saved,'Weather review does not write an exploration save');
  window.dispatchEvent(new Event('blur'));await frames();
  return {...extra,weather,position:position(a),camera:a.state().camera,render:a.renderStats()};
}
async function view(a,kind){
  window.dispatchEvent(new Event('focus'));a.resume();await a.visit(outside);a.look(camera);preview(a,kind);await advance(a,.4);
  assert(current(a).sample.kind===kind,'The requested conditions reach the active host');
  assert(!current(a).view.sheltered,'The fixed comparison point is open to the sky');
}
async function walk(a,goal){
  let stalled=0;
  try{
    for(let i=0;i<500;i++){
      const before={...position(a)},dx=goal.x-before.x,dz=goal.z-before.z;
      if(Math.hypot(dx,dz)<.18)return;
      a.look({yaw:Math.atan2(-dx,-dz),pitch:.14,distance:5});a.hold('KeyW',true);a.step(.04,.04);
      const after=position(a);stalled=Math.hypot(after.x-before.x,after.z-before.z)<.001?stalled+1:0;
      assert(stalled<12,'The ordinary hall entrance route stays walkable');
      if(i%25===24){a.hold('KeyW',false);await frames();}
    }
    throw Error('Weather: walking reaches the hall shelter within its bounded route');
  }finally{a.hold('KeyW',false);}
}

export async function clear(a){
  assert(a.weather&&a.soundtrack,'Explore exposes weather and its existing soundscape');
  sessions.set(a,{saved:JSON.stringify(a.store.read()),audio:{...a.soundtrack.state().settings}});
  if(a.dayNight){a.dayNight.setRunning(false);a.dayNight.setHour(12);a.dayNight.setEnabled(true);}
  await view(a,'clear');
  const elapsed=a.snapshot().elapsed;a.openDeveloper();
  const selector=document.getElementById('weather-preview');assert(selector&&selector.options.length===6,'F8 exposes the five conditions and Natural weather');
  selector.value='overcast';selector.dispatchEvent(new Event('change'));a.step(0,0);
  assert(current(a).sample.kind==='overcast'&&current(a).view.cloudCover>.8,'The actual developer selector redraws weather while its menu holds time');
  selector.value='clear';selector.dispatchEvent(new Event('change'));a.step(0,0);
  assert(a.snapshot().elapsed===elapsed,'Using the developer selector does not advance time');a.resume();a.step(0,0);
  const weather=current(a);assert(weather.sample.rain===0&&!weather.view.rainVisible,'Clear weather has no drawn rain');
  assert(weather.view.visible&&(weather.view.sky||a.dayNight?.state().visible),'Ordinary exploration has a rendered exterior sky');
  sessions.get(a).clear=weather;
  return capture(a,{checks:['Clear exterior sky','Actual F8 weather selector','Preview preserves saved time','Bounded drawing'],daylight:a.dayNight?'Held noon':'Ordinary daytime'});
}

export async function partlyCloudy(a){
  await view(a,'partly-cloudy');const partly=current(a);sessions.get(a).partly=partly;
  assert(partly.sample.cloudCover>sessions.get(a).clear.sample.cloudCover&&partly.sample.rain===0,'Partly cloudy introduces clouds without rainfall');
  assert(partly.view.cloudVisible,'Clouds are actually drawn');
  preview(a,'cloudy');const cloudy=current(a);
  assert(cloudy.sample.kind==='cloudy'&&cloudy.sample.cloudCover>partly.sample.cloudCover,'The intermediate cloudy condition is available too');
  preview(a,'partly-cloudy');await advance(a,.2);
  return capture(a,{checks:['Visible partly cloudy sky','Intermediate cloudy condition','Same comparison camera'],cloudy:cloudy.sample});
}

export async function overcast(a){
  await view(a,'overcast');const weather=current(a),clear=sessions.get(a).clear;
  assert(weather.view.cloudVisible&&weather.sample.cloudCover>sessions.get(a).partly.sample.cloudCover,'Overcast closes more of the rendered sky');
  assert(weather.sample.rain===0&&!weather.view.rainVisible,'Overcast remains distinct from rain');
  assert(weather.lighting.sun<clear.lighting.sun&&weather.lighting.hemisphere>0,'Cloud cover softens sunlight while retaining ambient visibility');
  return capture(a,{checks:['Overcast sky','Dry cloudy conditions','Responsive readable lighting']});
}

export async function rain(a){
  await view(a,'rain');await a.soundtrack.unlock();a.soundtrack.setSettings({muted:false,nature:1});await advance(a,2);
  const wet=current(a),audio=a.soundtrack.state().weather;
  assert(wet.sample.rain>0&&wet.view.rainVisible&&wet.view.rainCount>0,'Rain is rendered over the exposed ground');
  assert(audio?.enabled&&audio.rain>0&&audio.rainGain>0,'The existing Nature mix receives rain audio');
  a.pause();a.step(0,0);const paused=phases(a),elapsed=a.snapshot().elapsed;await advance(a,1);
  assert(JSON.stringify(phases(a))===JSON.stringify(paused)&&a.snapshot().elapsed===elapsed,'Pause holds weather, precipitation animation, and adventure time');
  assert(a.soundtrack.state().weather.rainGain===0,'Pause silences weather audio');
  a.resume();window.dispatchEvent(new Event('blur'));a.step(0,0);const unfocused=phases(a);await advance(a,1);
  assert(JSON.stringify(phases(a))===JSON.stringify(unfocused),'An inactive window does not move clouds or rain');
  window.dispatchEvent(new Event('focus'));await advance(a,.5);
  assert(current(a).view.rainTime>unfocused.rain,'Precipitation resumes on focus');
  return capture(a,{checks:['Visible local precipitation','Rain sound through Nature mix','Pause and background freeze','Focus recovery'],audio});
}

export async function shelter(a){
  window.dispatchEvent(new Event('focus'));a.resume();
  await a.visit({x:CANERD.x-5,z:CANERD.z+6});a.step(0,0);
  await walk(a,{x:CANERD.x-5,z:CANERD.z-12});await advance(a,1.3);
  const weather=current(a),audio=a.soundtrack.state().weather;
  assert(weather.sample.rain>0&&weather.view.sheltered&&!weather.view.rainVisible,'The actual castle roof shelters the traveler without changing outdoor weather');
  assert(audio.sheltered,'Rain audio receives the same roof shelter state');
  a.look({yaw:Math.PI,pitch:.12,distance:5});a.step(0,0);
  return capture(a,{checks:['Ordinary walking enters hall','Real roof stops local rain','Shelter reaches audio'],audio});
}

export async function recovery(a){
  window.dispatchEvent(new Event('focus'));a.resume();await walk(a,{x:CANERD.x-5,z:CANERD.z+6});await advance(a,1.3);
  assert(!current(a).view.sheltered&&current(a).view.rainVisible,'Leaving the roof restores rain without a scene reload');
  await a.visit(outside);a.look(camera);await advance(a,.3);
  const resumedRain=current(a);preview(a,null);await advance(a,.3);
  assert(current(a).preview===null,'Natural weather resumes after the developer override');
  assert(!current(a).view.sheltered&&current(a).view.visible,'Exterior sky remains active after leaving shelter');
  a.soundtrack.setSettings(sessions.get(a).audio);
  return capture(a,{checks:['Ordinary walking leaves shelter','Rain recovers outdoors','Natural weather and sound preferences restored'],resumedRain});
}
