import {prepareWarExterior} from './tower-smoke.js';
import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {canStand,canSwim} from '../../gameplay/movement/locomotion.js';
import {RIDE} from '../../gameplay/movement/riding.js';
import {ISAREOS_RIVER} from '../../content/regions/western-regions/west-regions.js';

const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const key=(code,type='keydown',repeat=false)=>document.dispatchEvent(new KeyboardEvent(type,{code,repeat,bubbles:true,cancelable:true}));
const press=code=>{key(code);key(code,'keyup');};
const tick=(a,n=1,dt=.02)=>{for(let i=0;i<n;i++)a.step(dt);};
const point=a=>{const [x,y,z]=a.state().position;return {x,y,z};};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
let review;
function assert(ok,message,detail){if(!ok)throw Error(message+(detail?' / '+JSON.stringify(detail):''));review.checks.push(message);}

function findSite(world){
  for(let radius=14;radius<=150;radius+=8)for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12){
    const at={x:STABLE.horse.x+Math.sin(angle)*radius,z:STABLE.horse.z+Math.cos(angle)*radius};
    let min=Infinity,max=-Infinity,clear=true;
    for(let dx=-2;dx<=2&&clear;dx+=2)for(let dz=-13;dz<=3&&clear;dz+=2){
      const x=at.x+dx,z=at.z+dz;
      if(!world.readyAt(x,z)||!world.canExploreAt(x,z)||world.regionAt(x,z).id!==16||!canStand(x,z,world,RIDE.radius)){clear=false;break;}
      const y=world.heightAt(x,z);min=Math.min(min,y);max=Math.max(max,y);if(max-min>.65)clear=false;
    }
    if(clear&&distance(at,STABLE.bear)>8)return at;
  }
  throw Error('No clear Minora riding lane found for horse jump check');
}
async function mount(a,developer=false,at=review.site){
  a.resume();a.selectMount('foot');await a.visit(at);
  if(developer)assert(a.selectMount('horse').ok,'Developer horse mounts on dry ground');
  else{
    a.stable.restore({version:1,owned:true,taught:true,horse:{...at,yaw:Math.PI}});
    press('KeyG');assert(a.stable.mounted&&a.state().mount.kind==='horse','G mounts the ordinary owned horse');
  }
  a.look({yaw:.95,pitch:.24,distance:6});tick(a,8);
}
async function freezeView(a){
  // Pause the real simulation at the measured pose, hiding only its menu for
  // review photography. The next phase resumes through the ordinary API.
  a.pause();document.getElementById('exploration-pause').hidden=true;
  await frame();
}
function horse(a){return a.testHero.group.parent.children.find(o=>o.visible&&o.name?.startsWith('horse-'));}
function checkPose(a){
  const h=horse(a);assert(!!h,'The mounted horse remains visible during the jump');
  assert(Math.abs(a.testHero.group.position.y-h.position.y-RIDE.seat.up)<.08,'Rider remains seated on the airborne horse');
  assert([...h.position.toArray(),...a.testHero.group.position.toArray()].every(Number.isFinite),'Horse and rider positions remain finite');
}

export async function prepare(a){
  review={checks:[],jumps:[]};await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.pause();
  review.site=findSite(a.testWorld);await mount(a);
  assert(/Space.*jump/i.test(document.getElementById('exploration-help').textContent),'Mounted help explains Space to jump');
  return {checks:[...review.checks],site:review.site};
}
async function apex(a,developer){
  await mount(a,developer);const start=point(a);key('Space');
  assert(a.state().mount.jumping&&!a.state().mount.grounded,'Space starts a '+(developer?'developer':'normal')+' horse jump');
  tick(a,10);const velocity=a.state().mount.verticalSpeed;
  press('Space');assert(a.state().mount.verticalSpeed===velocity,'Another Space press cannot restart an airborne jump');
  press('KeyG');assert(a.state().mount.kind==='horse'&&(developer||a.stable.mounted),'G cannot dismount while the horse is airborne');
  key('Space');tick(a,9);
  const at=point(a),height=at.y-start.y;
  assert(height>1.25&&height<1.7,'Horse reaches a plausible jump apex',{developer,start,at,height});checkPose(a);
  review.active={developer,start,apex:at,height};await freezeView(a);
  return {checks:[...review.checks],jump:review.active,mount:a.state().mount};
}
export const normalApex=a=>apex(a,false);
export const developerApex=a=>apex(a,true);

async function landing(a){
  const jump=review.active;a.resume();key('Space');let frames=0;
  while(!a.state().mount.grounded&&frames++<120){key('Space','keydown',true);tick(a);}
  assert(a.state().mount.grounded&&!a.state().mount.jumping,'Horse finishes the jump and regains ground support');
  const landed=point(a),floor=a.testWorld.supportAt?.(landed.x,landed.z,{maxY:landed.y,stepUp:.45})?.height??a.testWorld.heightAt(landed.x,landed.z);
  assert(Math.abs(landed.y-floor)<.04,'Landing returns the horse to the actual walking surface');
  for(let i=0;i<35;i++){key('Space','keydown',true);tick(a);}
  assert(a.state().mount.grounded&&Math.abs(point(a).y-landed.y)<.01,'Holding Space does not repeatedly launch jumps');key('Space','keyup');
  review.jumps.push({...jump,landed});
  if(jump.developer)assert(Math.abs(review.jumps[0].height-jump.height)<.025,'Developer speed bonus does not increase jump height');
  else{
    a.look({yaw:0,pitch:.26,distance:7});const from=point(a);a.hold('KeyW',true);a.hold('ShiftLeft',true);press('Space');
    for(let i=0;i<50;i++)tick(a);
    a.hold('KeyW',false);a.hold('ShiftLeft',false);
    assert(distance(from,point(a))>8&&a.state().mount.grounded,'A cantering jump carries the ordinary horse forward and lands safely',{from,to:point(a)});
  }
  checkPose(a);await freezeView(a);
  return {checks:[...review.checks],jumps:[...review.jumps],mount:a.state().mount};
}
export const normalLanding=landing;
export const developerLanding=landing;

function riverSite(world){
  const valid=(x,z)=>world.readyAt(x,z)&&world.canExploreAt(x,z)&&world.regionAt(x,z).id===16;
  const clear=(x,z)=>valid(x,z)&&(canStand(x,z,world,RIDE.radius)||canSwim(x,z,world,RIDE.radius,world.waterAt(x,z)-RIDE.floatOffset));
  const dry=(x,z)=>valid(x,z)&&canStand(x,z,world,RIDE.radius)&&world.heightAt(x,z)>=world.waterAt(x,z)+.05;
  // The food-world terrain uses the reviewed Isa channel east of the older
  // swim fixture. Follow its authored course instead of assuming one bank box.
  const candidates=[];
  for(let z=225;z<=280;z+=5)for(let x=-2465;x<=-2340;x+=5)candidates.push({x,z});
  for(const p of ISAREOS_RIVER.samples)for(const dx of [-16,-8,0,8,16])candidates.push({x:p.x+dx,z:p.z});
  for(const {x,z} of candidates){
    if(!valid(x,z)||world.waterAt(x,z)-world.heightAt(x,z)<1.2||!clear(x,z))continue;
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4)for(let length=4;length<=100;length+=2){
      const bank={x:x+Math.sin(angle)*length,z:z+Math.cos(angle)*length};
      if(![[0,0],[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dz])=>dry(bank.x+dx,bank.z+dz)))continue;
      let open=true;for(let n=0;n<=length*2;n++)if(!clear(x+(bank.x-x)*n/(length*2),z+(bank.z-z)*n/(length*2))){open=false;break;}
      if(open)return {bank,water:{x,z}};
    }
  }
  throw Error('No loaded riverbank found for horse jump/swimming check');
}
function rideTo(a,target){
  a.hold('KeyW',true);
  try{
    for(let i=0;i<600;i++){
      const at=point(a),gap=distance(at,target);if(gap<.1)return;
      a.look({yaw:Math.atan2(at.x-target.x,at.z-target.z),pitch:.28,distance:6});
      a.step(Math.min(.04,Math.max(.002,(gap-.04)/(a.state().mount.swimming?RIDE.swim:RIDE.walk))));
    }
    throw Error('Horse did not reach river point: '+JSON.stringify({target,at:point(a),mount:a.state().mount}));
  }finally{a.hold('KeyW',false);}
}
export async function water(a){
  a.resume();const site=riverSite(a.testWorld);await mount(a,false,site.bank);rideTo(a,site.water);tick(a,20);
  assert(a.state().mount.swimming,'Ordinary horse enters real river water');const y=point(a).y;
  press('Space');tick(a,15);assert(a.state().mount.swimming&&!a.state().mount.jumping&&Math.abs(point(a).y-y)<.04,'Space cannot jump a swimming horse out of the river');
  rideTo(a,site.bank);tick(a,10);assert(!a.state().mount.swimming&&a.state().mount.grounded,'Horse returns to ordinary ground support on shore');
  press('Space');assert(a.state().mount.jumping,'Jump becomes available again on dry shore');tick(a,60);
  press('KeyG');assert(!a.stable.mounted&&a.state().mount.kind==='foot','Horse can dismount normally after landing');
  assert(a.save().ok,'Mounted jumping leaves the isolated campaign save valid');
  assert(!a.state().frameErrors.length,'Mounted jumps and swimming produce no rendering errors');
  await freezeView(a);return {checks:[...review.checks],jumps:review.jumps,river:site};
}
