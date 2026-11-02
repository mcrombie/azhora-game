import {validateRidingSnapshot} from '../../gameplay/movement/riding.js';
import {validSorcerySave} from './teresod-fireball.js';
import {validCouncilSave} from './council-state.js';
import {validTowerState} from './tower-state.js';
import {validateExploration} from './checkpoint.js';
import {createWorldWar,worldWarScenario,isUnifiedWorldWar} from './world-war.js';
import {createOpeningWar,createAdventureWar} from '../../experiments/day-night/opening-war.js';
import {validAfterlife} from './afterlife-state.js';
import {validWarNavigation} from './war-navigation-state.js';
import {validCorrisSave} from './corris-state.js';
import {FOOD_WORLD_ID,FOOD_WORLD_KEY,FOOD_DEMO_SCENARIO} from '../food-world/scenario.js';
import {isCampaignSide,activeCampaignCommitment} from './campaign-allegiance.js';
export const WORLD_WAR_KEY='azhora-lizeem-world-v3';
export function validateWorldWarSave(data,key=WORLD_WAR_KEY){
  if(![WORLD_WAR_KEY,FOOD_WORLD_KEY].includes(key)||!data||data.version!==1||data.format!==key||!validateExploration(data.exploration)||!data.simulation||
    data.simulation.scenario===FOOD_DEMO_SCENARIO.id||(data.campaignSide!==undefined&&!isCampaignSide(data.campaignSide))||
    (data.simulation.scenario===FOOD_WORLD_ID)!==(key===FOOD_WORLD_KEY)||
    (data.tower!==undefined&&!validTowerState(data.tower))||!validCouncilSave(data.council)||!validSorcerySave(data.sorcery)||!validWarNavigation(data.navigation)||(data.navigationMode!==undefined&&!['taleth','manual'].includes(data.navigationMode))||!validCorrisSave(data.corris)||
    (data.reportReadThrough!==undefined&&(!Number.isSafeInteger(data.reportReadThrough)||data.reportReadThrough<0))||
    !validateRidingSnapshot(data.riding,{bounds:{minX:-60000,maxX:60000,minZ:-60000,maxZ:60000}})||
    !Number.isInteger(data.simulation.seed)||data.simulation.seed<0||data.simulation.seed>0xffffffff||
    !Array.isArray(data.simulation.commands)||data.simulation.commands.length>10000||
    !validAfterlife(data.afterlife,attempt=>validateWorldWarSave(attempt,key)))return false;
  try{
    worldWarScenario(data.simulation.scenario);
    if(data.fullCampaign!==undefined&&data.fullCampaign!==true)return false;
    if(data.simulation.scenario==='lizeem-opening-v2'&&data.sharedOpening!==2)return false;
    if(isUnifiedWorldWar(data.simulation.scenario)&&(data.sharedOpening!==2||data.fullCampaign!==true))return false;
    const war=data.fullCampaign?createAdventureWar(data):data.sharedOpening!==undefined?createOpeningWar(data):createWorldWar(data);
    const state=war.snapshot(),commitment=activeCampaignCommitment(state);
    if(data.campaignSide&&commitment&&data.campaignSide!==commitment)return false;
    const death=data.afterlife?.death;
    if(death&&(death.before.simulation.scenario!==data.simulation.scenario||death.before.sharedOpening!==data.sharedOpening||death.before.fullCampaign!==data.fullCampaign))return false;
    if(data.campaignSide&&death&&(death.side!==data.campaignSide||death.before.campaignSide!==undefined&&death.before.campaignSide!==data.campaignSide))return false;
    return !(data.tower?.location==='lookout'||data.tower?.concluded)||!!state.winner;
  }catch{return false;}
}
export function worldWarStore(storage,key=WORLD_WAR_KEY){
  return {
    read(){try{const raw=storage.getItem(key);if(!raw)return {ok:true,data:null};const data=JSON.parse(raw);return validateWorldWarSave(data,key)?{ok:true,data}:{ok:false,reason:'The world-test save is incompatible and has been kept unchanged.'};}catch{return {ok:false,reason:'The world-test save could not be read. It has been kept unchanged.'};}},
    save(data){if(!validateWorldWarSave(data,key))return {ok:false,reason:'This world-test state could not be saved.'};try{storage.setItem(key,JSON.stringify(data));return {ok:true};}catch{return {ok:false,reason:'Saving failed; the previous world-test save is kept.'};}},
  };
}
