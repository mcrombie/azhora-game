import {validateExploration} from '../../app/exploration/checkpoint.js';
import {regionAt} from '../../world/terrain/region-world.js';

export const HEARTHFALL_KEY='azhora-hearthfall-v1';
// The replacement PR will add a versioned settlement schema here. Reject unknown
// payloads now rather than silently discarding someone's future simulation save.
export function validateHearthfall(data){
  return !!data&&data.version===1&&data.format===HEARTHFALL_KEY
    &&validateExploration(data.exploration)
    &&regionAt(data.exploration.position.x,data.exploration.position.z).id===21
    &&data.sandbox?.version===1&&Number.isInteger(data.sandbox.seed)
    &&data.sandbox.seed>=0&&data.sandbox.seed<=0xffffffff
    &&data.sandbox.settlements===null;
}
export function hearthfallStore(storage){
  return {
    read(){try{const raw=storage.getItem(HEARTHFALL_KEY);if(!raw)return {ok:true,data:null};const data=JSON.parse(raw);
      return validateHearthfall(data)?{ok:true,data}:{ok:false,reason:'The Hearthfall save is incompatible and has been left untouched.'};
    }catch{return {ok:false,reason:'The Hearthfall save could not be read and has been left untouched.'};}},
    save(data){if(!validateHearthfall(data))return {ok:false,reason:'The Hearthfall state could not be saved.'};
      try{storage.setItem(HEARTHFALL_KEY,JSON.stringify(data));return {ok:true};}
      catch{return {ok:false,reason:'Saving failed. The previous Hearthfall save has been kept.'};}}
  };
}
