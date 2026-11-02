import * as THREE from 'three';
import {farmCondition} from './conditions.js';

// Retain merged meshes. Only update their existing colour/position buffers when
// regional output changes, never regenerate scenery or touch the campaign.
export function createFarmConditionView(){
  const regions=new Map(),soil=new THREE.Color(0x877859);
  function add(id,{fields,plants}){
    if(!regions.has(id))regions.set(id,[]);
    regions.get(id).push({fields,plants,colors:fields?.geometry.attributes.color.array.slice(),
      positions:plants?.geometry.attributes.position.array.slice(),ground:plants?.geometry.attributes.cropGround?.array,output:1});
  }
  let snapshot={};
  function update(scenario,state){
    snapshot={};
    for(const [id,farms] of regions){
      const condition=farmCondition(scenario,state,id);snapshot[id]={...condition,farms:farms.length};
      for(const farm of farms){
        const output=condition.output;if(Math.abs(farm.output-output)<.00001)continue;
        farm.output=output;
        if(farm.fields){
          const attr=farm.fields.geometry.attributes.color,t=(1-output)*.9;
          for(let i=0;i<attr.count;i++)attr.setXYZ(i,farm.colors[i*3]*(1-t)+soil.r*t,farm.colors[i*3+1]*(1-t)+soil.g*t,farm.colors[i*3+2]*(1-t)+soil.b*t);
          attr.needsUpdate=true;
        }
        if(farm.plants){
          const attr=farm.plants.geometry.attributes.position,original=farm.positions;
          // Grounded cards keep both edges on sloping ground as crops shorten.
          if(farm.ground)for(let i=0;i<attr.count;i++)attr.setY(i,farm.ground[i]+(original[i*3+1]-farm.ground[i])*output);
          // Legacy double-sided sheets are twelve vertices. Shorten each head in
          // place, spreading the effect across every field rather than erasing
          // one particular holding and implying a local damage model.
          else for(let i=0;i<attr.count;i+=12){
            let ground=Infinity;for(let j=i;j<Math.min(i+12,attr.count);j++)ground=Math.min(ground,original[j*3+1]);
            for(let j=i;j<Math.min(i+12,attr.count);j++)attr.setY(j,ground+(original[j*3+1]-ground)*output);
          }
          attr.needsUpdate=true;farm.plants.visible=output>.02;
        }
      }
    }
  }
  return {add,update,state:()=>structuredClone(snapshot)};
}
