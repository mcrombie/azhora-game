import {createCameraObstruction} from '../../app/exploration/camera-obstruction.js';
import {prepareWarExterior} from './tower-smoke.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
function oldClip(world,focus,desired){
  for(let i=1;i<=24;i++){
    const t=i/24,x=focus.x+(desired.x-focus.x)*t,y=focus.y+(desired.y-focus.y)*t,z=focus.z+(desired.z-focus.z)*t;
    if(world.nearColliders(x,z,.12).some(c=>{
      if(c.kind==='river-water'||c.kind==='pond-water')return false;
      const bottom=c.minY??world.heightAt(c.x,c.z),top=c.maxY??bottom+2;
      return y>bottom-.1&&y<top+.12&&(c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+.12:Math.abs(x-c.x)<c.hx+.12&&Math.abs(z-c.z)<c.hz+.12);
    }))return Math.max(.12,(i-1)/24);
  }return 1;
}
function compare(api){
  const world=api.testWorld,p=api.state().position,paths=[];
  for(const offset of [-8,0,8])for(let i=0;i<32;i++){
    const focus={x:p[0]+offset,y:world.heightAt(p[0]+offset,p[2])+1.55,z:p[2]},t=i*Math.PI/16;
    paths.push([focus,{x:focus.x+Math.sin(t)*12,y:focus.y+4,z:focus.z+Math.cos(t)*12}]);
  }
  const clip=createCameraObstruction(world);let blocked=0;
  for(const [a,b] of paths){const old=oldClip(world,a,b),now=clip(a,b);assert(old===now,'Batched probes preserve wall collision');if(now<1)blocked++;}
  function measure(fn){const samples=[];for(let pass=0;pass<9;pass++){const start=performance.now();for(let n=0;n<3;n++)for(const [a,b]of paths)fn(a,b);samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);return samples[4];}
  return {paths:paths.length,blocked,oldMs:measure((a,b)=>oldClip(world,a,b)),batchedMs:measure(clip)};
}
export async function compareCamera(api){
  const chamber=compare(api);await prepareWarExterior(api);await api.visit({x:-2338,z:124});const city=compare(api);
  assert(chamber.blocked+city.blocked>0,'The camera comparison includes obstructed paths');
  return {checks:['All 192 chamber/city camera paths retain identical obstruction results'],chamber,city};
}
