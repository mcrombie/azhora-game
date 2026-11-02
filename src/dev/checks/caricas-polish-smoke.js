import {prepareWarExterior} from './tower-smoke.js';
import {CARICAS_FURNISHINGS} from '../../content/regions/minora-frontier/caricas-town-detail.js';
import {MENORA_BRIDGES} from '../../content/regions/minora-frontier/menora-city.js';
import {checkHorseSwimming} from './horse-swim-smoke.js';

const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
let exteriorMs;
export async function prepare(a){
  const start=performance.now();await prepareWarExterior(a);exteriorMs=performance.now()-start;
  window.dispatchEvent(new Event('focus'));a.war.pause();
}
export async function view(a,position,camera){
  await a.visit(position);a.war.pause();a.look(camera);
  for(let i=0;i<30;i++)await frame();
  const intervals=[];let previous=performance.now();
  for(let i=0;i<150;i++){await frame();const now=performance.now();intervals.push(now-previous);previous=now;}
  const render=a.renderStats();
  if(a.state().frameErrors.length)throw Error(JSON.stringify(a.state().frameErrors));
  return {exteriorMs,position:a.state().position,camera,render,
    frameMedianMs:percentile(intervals,.5),frameP95Ms:percentile(intervals,.95)};
}
export const approach=a=>view(a,{x:-2092,z:209},{yaw:Math.PI,pitch:.23,distance:11});
export const square=a=>view(a,{x:-2092,z:287},{yaw:0,pitch:.3,distance:12});
export const granary=a=>view(a,{x:-2093,z:258},{yaw:Math.PI/2,pitch:.22,distance:8});
export const overview=a=>view(a,{x:-2092,z:268},{yaw:-.7,pitch:.65,distance:65});

export const river=a=>view(a,{x:-2165,z:315},{yaw:1.6,pitch:.43,distance:50});
export const nethereum=a=>view(a,{x:-2290,z:335},{yaw:.5,pitch:.52,distance:95});
export const nesdor=a=>view(a,{x:-1595,z:585},{yaw:-.6,pitch:.56,distance:100});
export const ovesos=a=>view(a,{x:-1895,z:699},{yaw:.7,pitch:.52,distance:100});
export const isareos=a=>view(a,{x:-2620,z:40},{yaw:-.6,pitch:.43,distance:100});
export async function navigation(a){
  const assert=(condition,message)=>{if(!condition)throw Error(message);};
  for(const p of CARICAS_FURNISHINGS){
    assert(!a.groundProbe(p.x,p.z).clear,p.id+' has a solid base');
    for(const dx of [-1,1])assert(a.groundProbe(p.x+dx*(p.r+1.5),p.z).clear,p.id+' can be passed on both sides');
  }
  for(const mounted of [false,true]){
    await a.visit({x:-2092,z:277});a.look({yaw:Math.PI,pitch:.3,distance:12});
    if(mounted){a.stable.restore({owned:true,taught:true,horse:{x:-2092,z:277,yaw:0},version:1});
      for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code:'KeyG',bubbles:true}));
      assert(a.stable.mounted,'Horse mounts in the square');}
    a.hold('KeyW',true);
    try{for(let i=0;i<400&&a.state().position[2]<300;i++)a.step(.04);}finally{a.hold('KeyW',false);}
    assert(a.state().position[2]>=300,(mounted?'Horse':'Player')+' crosses the square and south street');
  }
  return {checks:['New tree and well bases are solid and can be passed','Walking and riding through the market remain clear']};
}

export async function riverAccess(a){
  const assert=(yes,message)=>{if(!yes)throw Error(message);};
  const b=MENORA_BRIDGES.find(b=>b.id==='menora-lizeem-bridge');
  for(let x=b.start+2;x<b.end-2;x+=2){
    const p=a.groundProbe(x,b.z);
    assert(p.clear&&p.height>p.water,'White Bridge has clear dry support at '+x);
  }
  for(const mounted of [false,true]){
    await a.visit({x:b.start+2,z:b.z});a.selectMount('foot');
    if(mounted){a.stable.restore({owned:true,taught:true,horse:{x:b.start+2,z:b.z,yaw:0},version:1});a.stable.toggleMount();}
    a.look({yaw:-Math.PI/2,pitch:.3,distance:11});a.hold('KeyW',true);
    try{for(let i=0;i<900&&a.state().position[0]<b.end-2;i++)a.step(.04);}finally{a.hold('KeyW',false);}
    assert(a.state().position[0]>=b.end-2,(mounted?'Rider':'Walker')+' crosses the widened Lizeem on the White Bridge');
    assert(!a.state().mount.swimming,'Bridge crossing remains dry');
  }
  const swimming=await checkHorseSwimming(a);
  return {checks:['White Bridge has uninterrupted dry support','Walking and riding across the White Bridge',...swimming.checks]};
}
