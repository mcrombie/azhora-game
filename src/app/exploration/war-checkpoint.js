import {validateExploration} from './checkpoint.js';
import {createWorldWar,worldWarScenario} from './world-war.js';
export const WORLD_WAR_KEY='azhora-lizeem-world-v3';
export function validateWorldWarSave(data){
  if(!data||data.version!==1||data.format!==WORLD_WAR_KEY||!validateExploration(data.exploration)||!data.simulation||
    !Number.isInteger(data.simulation.seed)||data.simulation.seed<0||data.simulation.seed>0xffffffff||
    !Array.isArray(data.simulation.commands)||data.simulation.commands.length>10000)return false;
  try{worldWarScenario(data.simulation.scenario);createWorldWar(data);return true;}catch{return false;}
}
export function worldWarStore(storage){
  return {
    read(){try{const raw=storage.getItem(WORLD_WAR_KEY);if(!raw)return {ok:true,data:null};const data=JSON.parse(raw);return validateWorldWarSave(data)?{ok:true,data}:{ok:false,reason:'The world-test save is incompatible and has been kept unchanged.'};}catch{return {ok:false,reason:'The world-test save could not be read. It has been kept unchanged.'};}},
    save(data){if(!validateWorldWarSave(data))return {ok:false,reason:'This world-test state could not be saved.'};try{storage.setItem(WORLD_WAR_KEY,JSON.stringify(data));return {ok:true};}catch{return {ok:false,reason:'Saving failed; the previous world-test save is kept.'};}},
  };
}
