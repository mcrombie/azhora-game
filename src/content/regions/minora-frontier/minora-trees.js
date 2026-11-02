import {createSpeciesTrees} from '../../../world/scenery/species-trees.js';

// Keep the authored planting plan and save IDs. Actual botanical habits replace
// the former interchangeable crowns; each tree still has removable instance slots.
export function createMinoraTrees({root,trees,ground,colliders}){
  const planted=trees.map((t,i)=>{
    const cypress=t.kind==='cypress',fruit=t.kind==='fruit',s=t.size;
    return {id:`menora-polish-tree-${i}`,x:t.x,z:t.z,y:ground(t.x,t.z),
      species:({cypress:'mediterranean-cypress',fruit:'apple',blossom:'dogwood',round:'holm-oak'})[t.kind],
      height:cypress?.75+5.4*s:fruit?3.2:5.1*s,crownRadius:cypress?.95*s:fruit?1.3:1.95*s,
      trunkRadius:cypress?.14:fruit?.13:.2*s,collisionRadius:.35,rotation:i,region:'Minora'};
  });
  const result=createSpeciesTrees({parent:root,colliders,trees:planted,heightAt:ground,chunkSize:512,name:'Minora planted species'});
  return {trees:result.trees.length,batches:result.batches,vertices:result.vertices};
}
