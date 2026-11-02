import {treeSpecies} from '../../world/life/tree-species.js';
import {localSight} from './local-sight.js';

export const TREE_OBSERVE_REACH=3.4;

/** Query the registry's nearby cells, then check the visible trunk at eye level.
 * Looking from another floor, through a wall, or into unloaded scenery cannot
 * identify a tree. Aim just outside its bark so the trunk is not its own blocker. */
export function findObservableTree(registry,world,position,reach=TREE_OBSERVE_REACH){
  if(Array.isArray(registry))return registry.map(r=>findObservableTree(r,world,position,reach)).filter(Boolean)
    .sort((a,b)=>(Math.hypot(a.x-position.x,a.z-position.z)-(a.radius??0))-(Math.hypot(b.x-position.x,b.z-position.z)-(b.radius??0)))[0]??null;
  if(!registry?.nearestVisible||![position?.x,position?.y,position?.z].every(Number.isFinite))return null;
  const tree=registry.nearestVisible(position,reach,tree=>{
    if(!treeSpecies(tree.species)?.id||!world.readyAt(tree.x,tree.z)||!world.canExploreAt(tree.x,tree.z))return false;
    const base=tree.base?.y??tree.y??world.heightAt(tree.x,tree.z);
    if(Math.abs(position.y-base)>2.5)return false;
    const dx=tree.x-position.x,dz=tree.z-position.z,distance=Math.hypot(dx,dz),radius=Math.max(.05,tree.radius??.4)+.12;
    const along=Math.max(0,distance-radius)/Math.max(.001,distance);
    // Some trees have wider movement clearance than their visible bark. Ignore
    // only this registered trunk; intervening trees and walls still block sight.
    const sight={heightAt:(x,z)=>world.heightAt(x,z),readyAt:(x,z)=>world.readyAt(x,z),
      nearColliders:(x,z,r)=>world.nearColliders(x,z,r).filter(c=>c.id!==tree.id)};
    return localSight(sight,{x:position.x,y:position.y+1.5,z:position.z},
      {x:position.x+dx*along,y:base+1.5,z:position.z+dz*along});
  });
  if(!tree)return null;
  const species=treeSpecies(tree.species);
  return {...tree,species:species.id,instanceSpecies:tree.species,name:species.name,
    localName:tree.localName??(tree.name!==species.name?tree.name:null),category:'trees'};
}
