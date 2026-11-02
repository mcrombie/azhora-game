import {initialOremindi,validOremindi} from './chapter.js';
import {newYunethreSave,validYunethreSave,yunethreRiding} from '../yunethre/checkpoint.js';
import {createYunethre,BATTLE_END} from '../yunethre/chapter.js';
import {CHAPTER_LOCATIONS} from '../yunethre/locations.js';
import {validateExploration} from '../../../app/exploration/checkpoint.js';
import {validTowerState} from '../../../app/exploration/tower-state.js';
import {validateRidingSnapshot} from '../../../gameplay/movement/riding.js';
import {regionAt} from '../../../world/terrain/region-world.js';
import {validSorcerySave} from '../../../app/exploration/teresod-fireball.js';

export const OREMINDI_SAVE_KEY='azhora-oremindi-v1';
export const OREMINDI_REGION_IDS=Object.freeze([16,17,25,13,14,38,61,62,37,33]);
const copy=value=>structuredClone(value);
const roadPosition=()=>({x:CHAPTER_LOCATIONS.departure.x,y:0,z:CHAPTER_LOCATIONS.departure.z});

/** An explicitly labelled direct-start premise, not a record of hero quests.
 * The neutral battle uses the real seeded Chapter 2 rule. No military side,
 * protection, military alliance or annexation is manufactured by this preset. */
export function unattendedChapterTwo(){
  const saved=newYunethreSave(),campaign=createYunethre(saved.chapter);
  for(const command of [{type:'brief'},{type:'depart'},{type:'advance',seconds:BATTLE_END},
    {type:'visit',place:'town'},{type:'laketown-decision',decision:'decline'},{type:'return'}]){
    const result=campaign.command(command);if(!result.ok)throw Error('The neutral Chapter 2 premise could not finish: '+result.reason);
  }
  return {...saved,chapter:campaign.snapshot(),tower:{...saved.tower,location:'world'},
    exploration:{...saved.exploration,position:roadPosition()}};
}

export function newOremindiSave(previous=null){
  const history=previous??unattendedChapterTwo();
  if(!validYunethreSave(history))throw Error('The Chapter 2 checkpoint is incompatible.');
  if(!history.chapter.returned)throw Error('Finish Chapter 2 and hear the messenger before continuing.');
  return {format:'azhora-oremindi',version:1,history:copy(history),historySource:previous?'played':'unattended',
    chapter:initialOremindi({seed:history.chapter.seed}),
    tower:{version:1,location:'world',briefed:true,running:false},riding:yunethreRiding(history),
    exploration:{...copy(history.exploration),character:'teresod',position:roadPosition()}};
}

export function validOremindiSave(s){
  try{
    if(!s||s.format!=='azhora-oremindi'||s.version!==1||!validOremindi(s.chapter)
      ||!['played','unattended'].includes(s.historySource)||!validYunethreSave(s.history)||!s.history.chapter.returned
      ||!validateExploration(s.exploration)||s.exploration.character!=='teresod'||!validTowerState(s.tower)||!validSorcerySave(s.sorcery)
      ||!s.tower.briefed||!['tower','lookout','world'].includes(s.tower.location)
      ||!validateRidingSnapshot(s.riding,{allowMissing:false,bounds:{minX:-60000,maxX:60000,minZ:-60000,maxZ:60000}}))return false;
    if(s.tower.location!=='world'&&!s.chapter.arrived)return false;
    return s.tower.location!=='world'||OREMINDI_REGION_IDS.includes(regionAt(s.exploration.position.x,s.exploration.position.z).id);
  }catch{return false;}
}
export function oremindiRiding(saved){return copy(saved?.riding??yunethreRiding(saved?.history));}
export function oremindiStore(storage){return {
  read(){try{const raw=storage.getItem(OREMINDI_SAVE_KEY);if(!raw)return {ok:true,data:null};const data=JSON.parse(raw);
    return validOremindiSave(data)?{ok:true,data}:{ok:false,reason:'The Chapter 3 checkpoint is incompatible and has been kept.'};
  }catch{return {ok:false,reason:'Chapter 3 could not be read. Its save has been kept.'};}},
  save(data){if(!validOremindiSave(data))return {ok:false,reason:'Chapter 3 could not be saved at this position.'};
    try{storage.setItem(OREMINDI_SAVE_KEY,JSON.stringify(data));return {ok:true};}
    catch{return {ok:false,reason:'Saving failed. The earlier Chapter 3 save is kept.'};}},
};}
