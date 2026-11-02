import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSpeciesTrees} from '../../../world/scenery/species-trees.js';
import {CARICAS_AGRICULTURE_BUILDINGS,CARICAS_ORCHARD} from './caricas-agriculture.js';

// Purposeful silhouettes and hand-built details, in bounded static batches. These
// landmarks carry no numerical housing or production budget.
export const CARICAS_TOWNSCAPE_SOLIDS=[
  {id:'market-well',x:-2109,z:290,r:1.3},
  {id:'market-lime-west',x:-2117,z:284,r:.45},
  {id:'market-lime-east',x:-2080,z:273,r:.45},
  ...CARICAS_ORCHARD.map(([x,z],i)=>({id:'orchard-'+i,x,z,r:.28})),
];
export function buildCaricasTownscape({parent,heightAt,colliders=[]}){
  const b=createSceneryBuilder('Caricas: civic landmarks, orchard and market shade');
  const trees=[];
  const stone='#b2a28a',trim='#e4d8b7',wood='#68503b',dark='#34463e',metal='#4c5654';
  for(const p of CARICAS_TOWNSCAPE_SOLIDS){
    const y=heightAt(p.x,p.z),well=p.id==='market-well',orchard=p.id.startsWith('orchard');
    b.frame(p.x,y,p.z,0,()=>{
      if(well){
        b.cylinder(stone,0,0,0,1.3,.7);b.cylinder(dark,0,.71,0,.9,.025);
        for(let i=0;i<10;i++){const a=i*Math.PI/5;b.box(trim,Math.sin(a)*1.12,.74,Math.cos(a)*1.12,.72,.22,.4,a);}
        for(const x of [-1.48,1.48])b.block(wood,x,0,0,.18,2.8,.18);
        b.beam(wood,[-1.6,2.7,0],[1.6,2.7,0],.2);
        b.beam('#b9a478',[0,2.7,0],[0,.9,0],.035);
      }
    });
    if(well)colliders.push({...p,minY:y,maxY:y+2.8,kind:'well'});
    else trees.push({id:p.id,x:p.x,z:p.z,y,species:orchard?'apple':'small-leaved-lime',height:orchard?5.2:7.6,crownRadius:orchard?2.5:3.3,trunkRadius:p.r,
      collisionRadius:p.r,collisionMinY:y,collisionMaxY:y+4.4,region:'Caricas',habitat:orchard?'orchard':'market shade',locationName:orchard?'Caricas Town orchard':'Caricas market',harvestable:false});
  }
  for(const p of CARICAS_AGRICULTURE_BUILDINGS){
    const y=heightAt(p.x,p.z),front=p.d/2+.15;
    b.frame(p.x,y,p.z,0,()=>{
      if(p.kind==='hall'){
        const top=p.h+3.2;
        b.block(stone,0,top,0,2.8,.3,2.8);
        for(const x of [-1,1])for(const z of [-1,1])b.block(trim,x,top+.3,z,.18,2.2,.18);
        b.cylinder('#bda05b',0,top+.95,0,.55,.7);b.cone('#687974',0,top+2.45,0,2.1,1.55,Math.PI/4,4);
      }
      if(p.kind==='barracks'){
        b.beam(wood,[-p.w*.34,p.h+.4,0],[-p.w*.34,p.h+6,0],.12);
        b.sheet('#8d5141',[-p.w*.34,p.h+5.8,0],[-p.w*.34+1.6,p.h+5.8,0],[-p.w*.34+1.6,p.h+4.5,0],[-p.w*.34,p.h+4.5,0]);
        for(const x of [-3.4,3.4])b.rock(metal,x,1.7,front,.42,.58,.08);
      }
      if(p.kind==='inn'){
        for(let i=0;i<6;i++)b.sheet(i%2?'#af7752':trim,[-2.4+i*.8,3.3,front],[-1.6+i*.8,3.3,front],[-1.6+i*.8,2.9,front+1.2],[-2.4+i*.8,2.9,front+1.2]);
      }
      if(p.kind==='workshop'){
        b.block(stone,-3,p.h-.5,-1,1.8,4.5,1.8);b.block(trim,-3,p.h+3.9,-1,2.15,.3,2.15);
        // Anvil and hanging tools are against the facade, outside the doorway.
        b.cylinder(wood,3,0,front,.4,.75);b.block(metal,3,.75,front,1.1,.28,.55);
        b.cone(metal,3.55,.78,front,.23,.42,Math.PI/2,4);
      }
      if(p.kind==='stable'){
        for(const x of [-4,-1.8,1.8,4])b.block(wood,x,0,front+.55,.14,1.2,.14);
        for(const side of [-1,1])b.beam(wood,[side*1.8,1.1,front+.55],[side*4,1.1,front+.55],.14);
      }
      if(['inn','hall','workshop','granary'].includes(p.kind)){
        b.block(metal,-p.w*.35,2.9,front+.3,.06,.8,.06);
        b.block('#e0c88f',-p.w*.35,2.5,front+.3,.28,.4,.28);
        b.cone(metal,-p.w*.35,2.9,front+.3,.3,.25,Math.PI/4,4);
      }
    });
    if(p.kind==='stable')for(const side of [-1,1])colliders.push({x:p.x+side*2.9,z:p.z+front+.55,hx:1.17,hz:.12,minY:y,maxY:y+1.2,kind:'hitching-rail'});
    if(p.kind==='workshop')colliders.push({x:p.x+3,z:p.z+front,hx:.8,hz:.4,minY:y,maxY:y+1.1,kind:'anvil'});
  }
  b.finish(parent);
  const treeView=createSpeciesTrees({parent,colliders,trees,heightAt,chunkSize:1e6,name:'Caricas / market limes and apple orchard'});
  return b.vertexCount+treeView.vertices;
}
