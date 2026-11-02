import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {groundRibbon} from '../../../world/scenery/ground-ribbon.js';
import {LIZEEM_BRIDGES,LIZEEM_BRIDGE_APPROACHES,lizeemBridgeHeight} from './lizeem-crossings.js';

// One merged mesh per crossing. Open masonry arches retain the water channel
// and barge clearance; deck and parapets share the movement height profile.
export function* createLizeemCrossingSteps({parent,heightAt,colliders=[],surface,bridge=null}){
  const built=[];
  for(const b of bridge?[bridge]:LIZEEM_BRIDGES){
    const mesh=createSceneryBuilder(b.name),half=b.width/2;
    for(let u=-b.length/2;u<b.length/2;u+=2){
      const v=Math.min(u+2,b.length/2),y=lizeemBridgeHeight(b,u),yy=lizeemBridgeHeight(b,v);
      const a=[b.x+u,y,b.z-half],c=[b.x+v,yy,b.z-half],d=[b.x+v,yy,b.z+half],e=[b.x+u,y,b.z+half];
      mesh.sheet(Math.round(u/2)%2?'#c7bda5':'#c1b59a',a,c,d,e);
      mesh.sheet('#a69d88',[a[0],y-.75,a[2]],[e[0],y-.75,e[2]],[d[0],yy-.75,d[2]],[c[0],yy-.75,c[2]]);
      for(const side of [-1,1]){
        const z=b.z+side*half;
        mesh.sheet('#afa58f',[b.x+u,y,z],[b.x+v,yy,z],[b.x+v,yy-.75,z],[b.x+u,y-.75,z]);
        mesh.beam('#9d9989',[b.x+u,y+.62,z],[b.x+v,yy+.62,z],.48,1.15);
        mesh.beam('#d4cbb3',[b.x+u,y+1.24,z],[b.x+v,yy+1.24,z],.64,.18);
        colliders.push({x:b.x+(u+v)/2,z,hx:(v-u)/2+.02,hz:.33,minY:Math.min(y,yy)-.3,maxY:Math.max(y,yy)+1.4,kind:'bridge-rail'});
        if(Math.round(u)%8===0)mesh.block('#d0c5aa',b.x+u,y,z,.85,1.48,.85);
      }
      yield;
    }
    const span=(b.length-2*b.ramp)/3,first=-1.5*span;
    // Four pier footings support three open arches, never a wall in the river.
    for(let i=0;i<=3;i++){
      const u=first+i*span,x=b.x+u,bed=heightAt(x,b.z)-.8,top=b.y-4.8;
      mesh.block('#8e9288',x,bed,b.z,2.7,Math.max(.5,top-bed),b.width+.8);
      for(const side of [-1,1])mesh.rock('#969a8e',x,bed+(top-bed)*.45,b.z+side*(half+.4),2.1,Math.max(1,(top-bed)*.5),2);
    }
    for(let i=0;i<3;i++)for(let j=0;j<20;j++){
      const at=k=>{const t=k/20;return [b.x+first+(i+t)*span,b.y-4.8+4*Math.sin(Math.PI*t)];};
      const [x,y]=at(j),[xx,yy]=at(j+1);
      for(const side of [-1,1]){
        const z=b.z+side*half;
        mesh.sheet('#a4a18e',[x,y,z],[xx,yy,z],[xx,b.y-.72,z],[x,b.y-.72,z]);
        mesh.beam(j%2?'#c9c2ac':'#bcb59e',[x,y+.14,z+side*.035],[xx,yy+.14,z+side*.035],.18,.45);
      }
      mesh.sheet('#8c9087',[x,y,b.z-half],[xx,yy,b.z-half],[xx,yy,b.z+half],[x,y,b.z+half]);
    }
    // Approach ramps stand on the banks, with stone side walls tapering into earth.
    for(const side of [-1,1])for(let u=b.length/2-b.ramp;u<b.length/2;u+=2){
      const a=side*u,c=side*Math.min(u+2,b.length/2),x=b.x+a,xx=b.x+c;
      for(const edge of [-1,1]){const z=b.z+edge*half;mesh.sheet('#a4a18e',[x,heightAt(x,z)-.3,z],[xx,heightAt(xx,z)-.3,z],[xx,lizeemBridgeHeight(b,c)-.72,z],[x,lizeemBridgeHeight(b,a)-.72,z]);}
    }
    const index=LIZEEM_BRIDGES.indexOf(b);
    for(const road of LIZEEM_BRIDGE_APPROACHES.slice(index*2,index*2+2))yield* groundRibbon(mesh,road,road.width,'#b7aa8a',heightAt,surface,.1);
    const result=yield* mesh.finishSteps(parent);result.name=b.name;built.push(result);
  }
  return {meshes:built,bridges:built.length};
}
