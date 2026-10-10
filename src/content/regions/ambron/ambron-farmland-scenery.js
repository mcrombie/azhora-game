import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {AMBRON_FIELDS,AMBRON_CROPS,AMBRON_FARMSTEADS,farmPoint} from './ambron-farmland.js';
import {ambronCultivatedField} from './elagos-world.js';

const WOOD='#66513b',DARK='#403a2d',STONE='#9b947c';
function grain(b,x,y,z,tint,seed){
  for(let i=0;i<3;i++){
    const px=x+(i-1)*.36,pz=z+(i%2)*.3,h=.65+((seed+i)%4)*.13;
    b.sheet('#858849',[px-.035,y,pz],[px+.035,y,pz],[px+.15,y+h,pz],[px+.08,y+h,pz]);
    b.sheet(tint,[px+.01,y+h-.12,pz],[px+.22,y+h-.12,pz],[px+.2,y+h+.22,pz],[px+.06,y+h+.27,pz]);
    b.sheet(tint,[px+.1,y+h-.12,pz-.12],[px+.1,y+h-.12,pz+.12],[px+.1,y+h+.2,pz+.09],[px+.1,y+h+.27,pz-.04]);
  }
}
function orchardTree(b,x,y,z,index){
  b.cylinder(WOOD,x,y,z,.25,2.9,0,4);
  b.beam(WOOD,[x,y+1.4,z],[x+1.2,y+3.1,z+.2],.19);
  for(const [dx,dz,up] of [[0,0,0],[-1.1,.3,-.4],[.9,.4,-.1]])b.rock(index%3?'#668146':'#829152',x+dx,y+3.7+up,z+dz,2,1.65,1.8,index*.63);
  for(const side of [-1,1])b.rock(index%2?'#a45e39':'#c0a15c',x+side*1.25,y+3.35,z+1,.16,.18,.16);
}
function farmBuilding(b,x,z,w,d,h,barn,heightAt,colliders,id){
  const levels=[[-1,-1],[1,-1],[1,1],[-1,1],[0,0]].map(([dx,dz])=>heightAt(x+dx*w/2,z+dz*d/2));
  const y=Math.max(...levels),bottom=Math.min(...levels)-.5;
  b.block(STONE,x,bottom,z,w+.4,y-bottom+.3,d+.4);
  b.frame(x,y,z,0,()=>{
    b.block(barn?'#928064':'#b7aa87',0,0,0,w,h,d);
    for(const side of [-1,1]){
      b.block(WOOD,side*(w/2-.2),0,0,.3,h+.1,d+.15);
      b.block(WOOD,0,h*.6,side*(d/2+.05),w+.1,.2,.14);
    }
    b.roof(barn?'#847145':'#6c6450',0,h,0,w+1.3,d+1.5,Math.min(w,d)*.5,0,'#92836a');
    b.block(DARK,0,0,d/2+.03,barn?3.6:1.4,barn?3.4:2.3,.1);
    if(!barn){b.block('#33382d',w*.3,2.2,d/2+.08,1,1,.13);b.block(STONE,-w*.3,h,-.6,.7,2,.7);}
  });
  colliders.push({id,x,z,hx:w/2+.2,hz:d/2+.2,kind:'ambron-farm-building'});
}

/** Batches by field: many crops, few meshes, with no individual crop colliders. */
export function* createAmbronFarmlandSteps({parent,heightAt,colliders}){
  let vertices=0,orchardTrees=0,cropClumps=0;
  for(const [index,field] of AMBRON_FIELDS.entries()){
    const b=createSceneryBuilder(`Ambron farmland / ${field.id}`),palette=AMBRON_CROPS[field.crop];
    const spacing=field.crop==='orchard'?8:3.4;
    for(let u=-field.w/2+4;u<field.w/2-3;u+=spacing){
      for(let v=-field.d/2+4;v<field.d/2-3;v+=spacing){
        const p=farmPoint(field,u,v);if(ambronCultivatedField(p.x,p.z)?.id!==field.id)continue;
        const y=heightAt(p.x,p.z);
        if(field.crop==='orchard'){
          // The crown, as well as its trunk, stays clear of roads and water.
          if([[-2,0],[2,0],[0,-2],[0,2]].some(([dx,dz])=>ambronCultivatedField(p.x+dx,p.z+dz)?.id!==field.id))continue;
          orchardTree(b,p.x,y,p.z,orchardTrees++);
          colliders.push({...p,r:.3,kind:'ambron-orchard-tree'});
        }else if(field.crop==='vegetables'){
          for(const dx of [-.55,.55])b.rock(palette.leaf,p.x+dx,y+.3,p.z,.5,.32,.48,index+u);
          cropClumps++;
        }else if(field.crop!=='fallow'){grain(b,p.x,y,p.z,palette.leaf,Math.round(u+v+index));cropClumps++;}
      }
      yield;
    }
    // Low boundary posts suggest field edges without fencing travelers in.
    for(const side of [-1,1])for(let u=-field.w/2+4;u<field.w/2;u+=10){
      const p=farmPoint(field,u,side*(field.d/2-1));if(ambronCultivatedField(p.x,p.z)?.id!==field.id)continue;
      b.cylinder(WOOD,p.x,heightAt(p.x,p.z),p.z,.09,.8,0,4);
    }
    vertices+=b.vertexCount;yield* b.finishSteps(parent);
  }
  for(const f of AMBRON_FARMSTEADS){
    const b=createSceneryBuilder(`Ambron / ${f.id}`);
    farmBuilding(b,f.x+3,f.z-4,12,8,4.4,true,heightAt,colliders,`${f.id}-barn`);
    farmBuilding(b,f.x-9,f.z+5,6,6,3.5,false,heightAt,colliders,`${f.id}-cottage`);
    const x=f.x+7,z=f.z+8,y=heightAt(x,z);
    b.cylinder('#a99864',x,y,z,2.2,1.9);b.cone('#bbad6d',x,y+1.9,z,2.5,1.8);
    b.cylinder(WOOD,x,y+3.5,z,.12,.8);
    colliders.push({x,z,r:2.2,kind:'ambron-haystack'});
    for(const dx of [-1,1])b.rock(DARK,f.x+dx*1.4,heightAt(f.x,f.z+9)+.6,f.z+9,.14,.6,.6);
    b.block(WOOD,f.x,heightAt(f.x,f.z+9)+.6,f.z+9,2.8,.18,3.2);
    for(const side of [-1,1])b.block('#98825e',f.x+side*1.3,heightAt(f.x,f.z+9)+.75,f.z+9,.15,.6,3.2);
    vertices+=b.vertexCount;yield* b.finishSteps(parent);
  }
  return {fields:AMBRON_FIELDS.length,farmsteads:AMBRON_FARMSTEADS.length,orchardTrees,cropClumps,vertices};
}
