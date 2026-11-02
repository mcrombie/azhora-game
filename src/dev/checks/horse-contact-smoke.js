import {prepareWarExterior} from './tower-smoke.js';
import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {LIZEEM_RESIDENTS} from '../../content/regions/minora-frontier/lizeem-residents.js';
import {canStand} from '../../gameplay/movement/locomotion.js';

const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const tick=(a,n=8)=>{for(let i=0;i<n;i++)a.step(.04);};
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const point=a=>{const [x,y,z]=a.state().position;return {x,y,z};};
const offset=(at,x,z)=>({x:at.x+x,z:at.z+z});
const separation=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const local=(p,h)=>{const x=p.x-h.x,z=p.z-h.z,c=Math.cos(h.yaw),s=Math.sin(h.yaw);return {x:c*x-s*z,z:s*x+c*z};};
const bodyGap=(p,h)=>{const v=local(p,h);return Math.hypot(v.x,v.z-Math.max(-.55,Math.min(.82,v.z)));};

// Keep this check in already prepared Minora. A clear patch avoids attributing
// a wall, a resident or a steep bank's blocking behavior to the parked horse.
function findSite(world){
  const people=[STABLE.bear,...LIZEEM_RESIDENTS.filter(p=>p.region==='isareos')];
  for(let radius=12;radius<=100;radius+=8)for(let i=0;i<24;i++){
    const at=offset(STABLE.horse,Math.sin(i*Math.PI/12)*radius,Math.cos(i*Math.PI/12)*radius);
    if(people.some(p=>separation(p,at)<9))continue;
    let min=Infinity,max=-Infinity,clear=true;
    for(let x=-4;x<=4&&clear;x++)for(let z=-4;z<=4&&clear;z++){
      const p=offset(at,x,z);
      if(!world.readyAt(p.x,p.z)||!world.canExploreAt(p.x,p.z)||world.regionAt(p.x,p.z).id!==16||!canStand(p.x,p.z,world,.8)){clear=false;break;}
      const y=world.heightAt(p.x,p.z);min=Math.min(min,y);max=Math.max(max,y);
      if(max-min>.6)clear=false;
    }
    if(clear)return at;
  }
  throw Error('No clear Minora patch found for horse contact check');
}
function walk(a,yaw,n=50,run=false){
  a.look({yaw,pitch:.22,distance:7});a.hold('KeyW',true);if(run)a.hold('ShiftLeft',true);
  try{tick(a,n);}finally{a.hold('KeyW',false);a.hold('ShiftLeft',false);}
}
function walkTo(a,target){
  for(let i=0;i<100;i++){
    const p=point(a),gap=separation(p,target);if(gap<.13)return true;
    a.look({yaw:Math.atan2(p.x-target.x,p.z-target.z),pitch:.22,distance:7});a.hold('KeyW',true);
    try{a.step(Math.min(.04,(gap-.05)/4.5));}finally{a.hold('KeyW',false);}
  }
  return false;
}
async function placeHorse(a,horse,player){
  a.selectMount('foot');await a.visit(player);a.stable.restore({version:1,owned:true,taught:true,horse});tick(a);
}

export async function checkHorseContact(a){
  const checks=[],approaches=[];
  const assert=(ok,message,detail)=>{if(!ok)throw Error(message+(detail?' / '+JSON.stringify(detail):''));checks.push(message);};
  await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.pause();
  a.stable.restore(null);tick(a);
  const y=a.testWorld.heightAt(STABLE.horse.x,STABLE.horse.z);
  assert(a.stable.state().horseVisible,'Unclaimed horse is visible in the guild stable');
  assert(a.stable.constrainTravel({...offset(STABLE.horse,-3,0),y},{...offset(STABLE.horse,3,0),y}),'Unclaimed stable horse also has a solid body');
  const site=findSite(a.testWorld);
  for(const yaw of [0,.9])for(const [name,dx,dz,run] of [['left',-1,0,false],['right',1,0,true],['head',0,1,false],['rear',0,-1,true]]){
    const c=Math.cos(yaw),s=Math.sin(yaw),vx=c*dx+s*dz,vz=-s*dx+c*dz,horse={...site,yaw};
    await placeHorse(a,horse,offset(site,vx*3.5,vz*3.5));const before=point(a);
    walk(a,Math.atan2(vx,vz),50,run);const after=point(a),gap=bodyGap(after,horse),side=(after.x-site.x)*vx+(after.z-site.z)*vz;
    assert(separation(before,after)>.8,'Approach reaches '+name+' of '+(yaw?'turned':'straight')+' horse');
    assert(gap>=.715&&gap<.8&&side>0,(run?'Running':'Walking')+' stops at '+name+' of '+(yaw?'turned':'straight')+' horse',{after,horse,gap,side});
    approaches.push({yaw,name,run,before,after,gap});
  }
  await placeHorse(a,{...site,yaw:0},offset(site,-2,0));
  assert(walkTo(a,offset(site,-2,2.4))&&walkTo(a,offset(site,2,2.4))&&walkTo(a,offset(site,1.4,0)),'Player can walk around the horse and approach its other side');
  key('KeyG');assert(a.stable.mounted&&a.state().mount.kind==='horse','G mounts from outside the solid body');
  const mountedAt=point(a);walk(a,0,6);
  assert(separation(mountedAt,point(a))>.8,'Mounted pair moves without colliding with its own parked body');
  key('KeyG');tick(a);
  assert(!a.stable.mounted&&a.state().mount.kind==='foot','G dismounts onto dry ground');
  assert(bodyGap(point(a),a.stable.snapshot().horse)>.72,'Dismount leaves the player outside the horse');
  const dismountedAt=point(a),parked=a.stable.snapshot().horse;
  walk(a,Math.atan2(parked.x-dismountedAt.x,parked.z-dismountedAt.z),5);
  assert(separation(dismountedAt,point(a))>.6,'Player can walk away after dismounting');
  await placeHorse(a,{...offset(site,-3.5,0),yaw:Math.PI/2},offset(site,3.5,0));key('KeyH');tick(a,80);
  const called=a.stable.state(),calledGap=separation(point(a),called.horse);
  assert(!called.called&&calledGap>=2.5&&calledGap<=2.7,'Whistled horse stops within mounting reach without overlapping the player',{called,calledGap});
  key('KeyG');assert(a.stable.mounted,'Called horse remains mountable');
  assert(a.save().ok,'Mounted position saves in the isolated test profile');await a.loadSaved();a.war.pause();tick(a);
  assert(a.state().mode==='playing'&&!a.stable.mounted&&a.state().mount.kind==='foot','Mounted save reloads safely on foot');
  const restoredHorse=a.stable.snapshot().horse,restoredAt=point(a);walk(a,restoredHorse.yaw-Math.PI/2,12);
  assert(separation(restoredAt,point(a))>1&&bodyGap(point(a),restoredHorse)>.72,'Player can walk out of an overlap restored from a mounted save');
  await placeHorse(a,{...site,yaw:0},offset(site,-3.5,0));
  a.testHero.setForm('ghost');
  try{walk(a,-Math.PI/2,25);assert(point(a).x>site.x+.8,'Ghost can still pass through a parked horse');}
  finally{a.testHero.setForm('living');}
  await placeHorse(a,{...site,yaw:.9},offset(site,-1.8,0));a.look({yaw:.3,pitch:.32,distance:6.5});
  assert(!a.state().frameErrors.length,'Horse contact, riding and reload produce no rendering errors');await frame();
  return {checks,site,approaches,calledGap,position:a.state().position,horse:a.stable.state()};
}
