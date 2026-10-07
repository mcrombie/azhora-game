import {canStand,moveCharacter} from '../../gameplay/movement/locomotion.js';

export const SKIRMISH_RADIUS=45;
// The local fight stays on loaded, dry ground in the configured region. Shared walking collision
// checks handle walls and trees; short height probes also reject abrupt cliffs.
export function createSkirmishGround(world,centre,regionId=13){
  const inside=(x,z)=>Math.hypot(x-centre.x,z-centre.z)<=SKIRMISH_RADIUS&&world.readyAt(x,z)&&world.regionAt(x,z).id===regionId;
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
  function spawn(hero,heading=0){
    if(!clear(hero.x,hero.z))throw Error('Reach clear, dry ground on foot before joining.');
    const points=[];
    for(const radius of [8,10,12,6])for(let i=0;i<24&&points.length<3;i++){
      const angle=Math.PI+heading+i*Math.PI/12,point={x:hero.x+Math.sin(angle)*radius,z:hero.z+Math.cos(angle)*radius};
      if(clear(point.x,point.z,.65)&&segment(hero,point,.45)&&points.every(p=>Math.hypot(p.x-point.x,p.z-point.z)>=3))points.push(point);
    }
    if(points.length!==3)throw Error('There is not enough clear ground here. Leave and approach the flag from another side.');
    return points;
  }
  function interception(hero,heading=0){
    const guards=spawn(hero,heading);
    for(const offset of [0,.4,-.4,.8,-.8,1.2,-1.2]){
      const angle=heading+Math.PI*2/3+offset,rally={x:hero.x+Math.sin(angle)*9,z:hero.z+Math.cos(angle)*9};
      if(clear(rally.x,rally.z,1.4)&&segment(hero,rally,.45))return {guards,route:[{...hero},rally]};
    }
    throw Error('No clear reinforcement route here. Leave and approach the flag from another side.');
  }
  return {move,spawn,interception,clear,canHit:(a,b)=>Math.abs(world.heightAt(a.x,a.z)-world.heightAt(b.x,b.z))<=1.5&&segment(a,b)};
}
