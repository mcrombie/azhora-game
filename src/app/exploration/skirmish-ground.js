import {canStand,moveCharacter} from '../../gameplay/movement/locomotion.js';
import {findRetreatRoute} from '../../gameplay/combat/retreat-route.js';

export const SKIRMISH_RADIUS=45;
// The local fight stays on loaded, dry ground in the configured region. Shared walking collision
// checks handle walls and trees; short height probes also reject abrupt cliffs.
export function createSkirmishGround(world,centre,regionId=13,radius=SKIRMISH_RADIUS){
  const inside=(x,z)=>Math.hypot(x-centre.x,z-centre.z)<=radius&&world.readyAt(x,z)&&world.regionAt(x,z).id===regionId;
  const clear=(x,z,radius=.34)=>inside(x,z)&&canStand(x,z,world,radius,world.heightAt(x,z));
  function segment(a,b,radius=.18){
    const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.18));let last=world.heightAt(a.x,a.z);
    for(let i=1;i<=steps;i++){
      const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps,y=world.heightAt(x,z);
      if(!clear(x,z,radius)||Math.abs(y-last)>.3)return false;last=y;
    }
    return true;
  }
  function move(at,dx,dz){
    const point={x:at.x,z:at.z,y:world.heightAt(at.x,at.z)};
    moveCharacter(point,dx,dz,world,.34,{canTraverse:(x,z,nx,nz)=>inside(nx,nz)&&Math.abs(world.heightAt(nx,nz)-world.heightAt(x,z))<=.3});
    return {x:point.x,z:point.z};
  }
  function spawn(hero,heading=0,count=3){
    if(!clear(hero.x,hero.z))throw Error('Reach clear, dry ground on foot before joining.');
    const points=[];
    for(const radius of [8,10,12,6])for(let i=0;i<24&&points.length<count;i++){
      const angle=Math.PI+heading+i*Math.PI/12,point={x:hero.x+Math.sin(angle)*radius,z:hero.z+Math.cos(angle)*radius};
      if(clear(point.x,point.z,.65)&&segment(hero,point,.45)&&points.every(p=>Math.hypot(p.x-point.x,p.z-point.z)>=3))points.push(point);
    }
    if(points.length!==count)throw Error('There is not enough clear ground here. Leave and approach the battlefield from another side.');
    return points;
  }
  function interception(hero,heading=0,count=3){
    const guards=spawn(hero,heading,count);
    for(const offset of [0,.4,-.4,.8,-.8,1.2,-1.2]){
      const angle=heading+Math.PI*2/3+offset,rally={x:hero.x+Math.sin(angle)*9,z:hero.z+Math.cos(angle)*9};
      if(clear(rally.x,rally.z,1.4)&&segment(hero,rally,.45))return {guards,route:[{...hero},rally]};
    }
    throw Error('No clear reinforcement route here. Leave and approach the battlefield from another side.');
  }
  // Stage from the authored centre, never the player's boundary crossing or camera.
  // Search a small central area only; a blocked field must not migrate to its edge.
  function stage(heading=0,count=3,assault=false){
    for(const distance of [0,3,6,9,12,16,20,24])for(let i=0;i<(distance?16:1);i++){
      const angle=heading+i*Math.PI/8,hero={x:centre.x+Math.sin(angle)*distance,z:centre.z+Math.cos(angle)*distance};
      if(!clear(hero.x,hero.z,.65))continue;
      try{const setup=assault?{guards:spawn(hero,heading,count),route:null}:interception(hero,heading,count);return {hero,...setup};}catch{/* Try the next fixed central stand. */}
    }
    throw Error('The central battlefield has no clear staging area.');
  }
  function assaultStage(heading=0,count=4,allies=3){
    for(const distance of [0,3,6,9,12,16,20])for(let i=0;i<(distance?16:1);i++)for(const turn of [0,.5,-.5,1,-1]){
      const angle=heading+i*Math.PI/8,at={x:centre.x+Math.sin(angle)*distance,z:centre.z+Math.cos(angle)*distance},yaw=heading+turn;
      const point=(side,forward)=>({x:at.x+Math.cos(yaw)*side-Math.sin(yaw)*forward,z:at.z-Math.sin(yaw)*side-Math.cos(yaw)*forward});
      const hero=point(0,-3),rally=point(0,3),guards=Array.from({length:count},(_,n)=>point((n-(count-1)/2)*2.7,8));
      const friendly=Array.from({length:allies},(_,n)=>point((n-(allies-1)/2)*3,0));
      const points=[hero,rally,...guards,...friendly];
      if(points.every(p=>clear(p.x,p.z,.7)&&segment(at,p,.45))&&guards.every(g=>friendly.every(a=>segment(g,a,.4))))return {hero,guards,allies:friendly,rally,route:null};
    }
    throw Error('The central battlefield has no clear space for both formations. Try the solo assault.');
  }
  return {move,spawn,interception,stage,assaultStage,clear,retreatRoute:(at,hero)=>findRetreatRoute(at,hero,{centre,radius,clear,segment}),canHit:(a,b)=>Math.abs(world.heightAt(a.x,a.z)-world.heightAt(b.x,b.z))<=1.5&&segment(a,b)};
}
