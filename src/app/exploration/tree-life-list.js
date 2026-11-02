import {TREE_SPECIES_BY_ID,treeSpecies} from '../../world/life/tree-species.js';

// Independent discoveries, like the existing bird list. Older campaign saves
// need no migration and loading an earlier adventure does not erase field notes.
export const TREE_LIFE_KEY='azhora-tree-life-list-v1';
export function createTreeLifeList(storage){
  let observed=[];
  const canonical=id=>{
    const key=typeof id==='string'?treeSpecies(id)?.id:null;
    return key&&Object.hasOwn(TREE_SPECIES_BY_ID,key)?key:null;
  };
  try{
    const saved=JSON.parse(storage.getItem(TREE_LIFE_KEY));
    if(saved?.version===1&&Array.isArray(saved.species))observed=[...new Set(saved.species.map(canonical).filter(Boolean))];
  }catch{}
  return {
    species:()=>[...observed],
    observe(id){
      id=canonical(id);if(!id)return {ok:false,reason:'Unknown tree'};
      if(observed.includes(id))return {ok:true,added:false};
      const next=[...observed,id];
      try{storage.setItem(TREE_LIFE_KEY,JSON.stringify({version:1,species:next}));observed=next;return {ok:true,added:true};}
      catch{return {ok:false,reason:'Your life list could not be saved. Please try observing again.'};}
    },
  };
}
