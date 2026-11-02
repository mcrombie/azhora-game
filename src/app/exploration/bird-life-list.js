import {TOWER_BIRDS} from '../../content/regions/minora-frontier/tower-bird-roster.js';

export const BIRD_LIFE_KEY='azhora-bird-life-list-v1';
const known=new Set(TOWER_BIRDS.map(b=>b.species));
export function createBirdLifeList(storage){
  let observed=[];
  try{const saved=JSON.parse(storage.getItem(BIRD_LIFE_KEY));if(saved?.version===1&&Array.isArray(saved.species))observed=[...new Set(saved.species.filter(id=>known.has(id)))];}catch{}
  return {
    species:()=>[...observed],
    observe(id){
      if(!known.has(id))return {ok:false,reason:'Unknown bird'};
      if(observed.includes(id))return {ok:true,added:false};
      const next=[...observed,id];
      try{storage.setItem(BIRD_LIFE_KEY,JSON.stringify({version:1,species:next}));observed=next;return {ok:true,added:true};}
      catch{return {ok:false,reason:'Your life list could not be saved. Please try observing again.'};}
    },
  };
}
