import {prepareWarExterior} from './tower-smoke.js';
import {TOWER_EXIT} from '../../app/exploration/tower-state.js';
import {GUILD_HORSES} from '../../content/regions/minora-frontier/guild-stable-layout.js';
import {RIDE} from '../../gameplay/movement/riding.js';

const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const click=id=>document.getElementById(id).click();
const key=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
let clock=0;
function step(api,dt=.05){clock+=dt;api.stable.update(dt,clock,dt);}
async function capture(api){api.step(0);await frames();window.dispatchEvent(new Event('blur'));return {stable:api.stable.state(),render:api.renderStats()};}

export async function greeting(api){
  await prepareWarExterior(api);window.dispatchEvent(new Event('focus'));await api.visit(TOWER_EXIT);
  for(let i=0;i<300&&document.getElementById('stable-lesson').hidden;i++)step(api);
  assert(api.stable.state().offerOpen,'Bear approaches and offers the horse automatically');
  assert(api.stable.state().guildHorses.filter(h=>h.visible).length===3,'Three Guild horses are present');
  api.look({yaw:-.3,pitch:.28,distance:7});return capture(api);
}
export async function departure(api){
  window.dispatchEvent(new Event('focus'));click('stable-next');
  const given=api.stable.snapshot(),start=api.stable.state().bear;let walking=0,turning=0;
  for(let i=0;i<150;i++){
    const before=api.stable.state();step(api);const after=api.stable.state(),dx=after.bear.x-before.bear.x,dz=after.bear.z-before.bear.z,d=Math.hypot(dx,dz);
    if(d>.001){assert((dx*Math.sin(after.bearHeading)+dz*Math.cos(after.bearHeading))/d>.98,'Bear walks forward after the handoff');walking++;}
    else if(Math.abs(after.bearHeading-before.bearHeading)>.001)turning++;
  }
  assert(walking>10&&turning>0,'Bear turns then walks normally');
  assert(Math.hypot(api.stable.state().bear.x-start.x,api.stable.state().bear.z-start.z)>3,'Bear returns toward his stable');
  assert(JSON.stringify(api.stable.snapshot())===JSON.stringify(given),'Tending never moves or replaces the gifted horse');
  assert(!api.stable.mounted&&given.owned,'Player keeps the choice to ride');
  key('KeyG');assert(api.stable.mounted,'The offered horse still mounts with G');key('KeyG');assert(!api.stable.mounted,'Dismount still works');
  await api.visit({x:-2425,z:68});api.look({yaw:0,pitch:.24,distance:8});
  return {...await capture(api),walking,turning};
}
export async function rounds(api){
  window.dispatchEvent(new Event('focus'));const visits=new Map();let previous=null;
  for(let i=0;i<2600;i++){
    step(api);const s=api.stable.state(),work=s.bearWork;
    if(work&&previous!==work.horse)visits.set(work.horse,(visits.get(work.horse)??0)+1);
    previous=work?.horse??null;
  }
  for(const h of GUILD_HORSES)assert(visits.get(h.id)>=2,'Repeated care reaches '+h.id+': '+JSON.stringify({visits:[...visits],state:api.stable.state()}));
  // Frame a real brush stop rather than a pose injected by the review.
  for(let i=0;i<1600&&api.stable.state().bearWork?.task!=='brushing';i++)step(api);
  assert(api.stable.state().bearWork?.task==='brushing','Brushing is visible between walks');
  const work=api.stable.state();api.pause();for(let i=0;i<50;i++)step(api);
  assert(JSON.stringify(api.stable.state().bear)===JSON.stringify(work.bear)&&api.stable.state().bearStation===work.bearStation,'Pause holds the care route');api.resume();
  api.look({yaw:0,pitch:.28,distance:7});return {...await capture(api),visits:[...visits]};
}
export async function contact(api){
  window.dispatchEvent(new Event('focus'));
  for(const h of api.stable.state().guildHorses){
    const from={x:h.x+1.4,y:h.y,z:h.z},to={x:h.x-.2,y:h.y,z:h.z};
    const edge=api.stable.constrainTravel(from,to);assert(edge&&edge.x>h.x+.65,'On-foot contact stops at '+h.id);
  }
  const owned=api.stable.snapshot();assert(api.save().ok,'Stable visit can save');await api.loadSaved();window.dispatchEvent(new Event('focus'));
  assert(JSON.stringify(api.stable.snapshot())===JSON.stringify(owned),'Save/load preserves the player horse');
  assert(api.stable.state().guildHorses.length===3,'Reload does not duplicate Guild horses');
  // A mounted player also meets the yard's horse bodies.
  assert(api.selectMount('horse').ok,'Mounted collision fixture');
  const h=api.stable.state().guildHorses[1],from={x:h.x+2,y:h.y,z:h.z},to={x:h.x,y:h.y,z:h.z};
  const edge=api.stable.constrainTravel(from,to);assert(edge&&edge.x>h.x+RIDE.radius,'Riding cannot pass through a Guild horse');api.selectMount('foot');
  assert(!api.state().frameErrors.length,'No game frame errors');return capture(api);
}
