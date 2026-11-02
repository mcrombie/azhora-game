import {validYunethre,initialYunethre,chapterPremise} from './chapter.js';
import {validateExploration} from '../../../app/exploration/checkpoint.js';
import {validTowerState,LOOKOUT_TALETH} from '../../../app/exploration/tower-state.js';
import {regionAt} from '../../../world/terrain/region-world.js';
import {createWorldWar} from '../../../app/exploration/world-war.js';
import {createAdventureWar} from '../../../experiments/day-night/opening-war.js';
import {validateWorldWarSave,WORLD_WAR_KEY} from '../../../app/exploration/war-checkpoint.js';
import {MODES} from '../../../app/exploration/modes.js';
import {validateRidingSnapshot} from '../../../gameplay/movement/riding.js';
import {MINORA_STABLE} from '../../regions/minora-frontier/minora-stable.js';
import {laketownShoreAccess} from '../../regions/minora-frontier/laketown-access.js';
export const YUNETHRE_SAVE_KEY='azhora-yunethre-v1';
const lookoutExploration=()=>({version:1,character:'teresod',position:{x:LOOKOUT_TALETH.x-1,y:LOOKOUT_TALETH.y,z:LOOKOUT_TALETH.z-1},heading:0,camera:{yaw:0,pitch:.27,distance:8},elapsed:0,cells:[]});
export function yunethreRiding(saved){
  const riding=saved?.riding??saved?.history?.riding;
  return riding?.owned&&validateRidingSnapshot(riding)?structuredClone(riding):{version:1,owned:true,taught:true,horse:{...MINORA_STABLE.horse}};
}
// Use the current playable Chapter 1 rules and seed, without hero commands.
// Keep the result as historical data so future balance changes cannot rewrite it.
export function unattendedChapterOne(){
  const war=createAdventureWar();war.advance(1000);
  if(!war.snapshot().winner)throw Error('The default unattended Lizeemi War did not reach a settlement.');
  return {format:WORLD_WAR_KEY,version:1,...war.checkpoint(),
    tower:{version:1,location:'lookout',briefed:true,running:false,concluded:false},exploration:lookoutExploration()};
}
export function completedWarWinner(war){
  if(!validateWorldWarSave(war))throw Error('The Chapter 1 checkpoint is incompatible.');
  const winner=(war.fullCampaign?createAdventureWar(war):createWorldWar(war)).snapshot().winner;
  if(!['west','east'].includes(winner))throw Error('Finish the Lizeemi War before continuing.');
  return winner;
}
export function newYunethreSave(war=null){
  const history=war??unattendedChapterOne(),premise=chapterPremise({winner:completedWarWinner(history)},war?'chapter-one':'unattended');
  return {format:'azhora-yunethre',version:1,history:structuredClone(history),chapter:initialYunethre({premise}),
    // Chapter 1 tower access and Chapter 2's assignment are separate facts.
    tower:{version:1,location:'lookout',briefed:true,running:false},riding:yunethreRiding(history),
    exploration:{...lookoutExploration(),cells:structuredClone(history.exploration.cells)}};
}
export function validYunethreSave(s){
  try{
  return !!s&&s.format==='azhora-yunethre'&&s.version===1&&validYunethre(s.chapter)
    &&(s.chapter.premise.source==='direct'?s.history===null:completedWarWinner(s.history)===s.chapter.premise.winner)
    &&validateExploration(s.exploration)&&validTowerState(s.tower)
    &&validateRidingSnapshot(s.riding,{bounds:{minX:-60000,maxX:60000,minZ:-60000,maxZ:60000}})
    &&['tower','lookout','world'].includes(s.tower.location)
    &&(!s.chapter.briefed||s.tower.briefed)
    &&(s.tower.location!=='world'||s.chapter.departed&&(MODES.yunethre.regions.includes(regionAt(s.exploration.position.x,s.exploration.position.z).id)||laketownShoreAccess(s.exploration.position.x,s.exploration.position.z)));
  }catch{return false;}
}
export function yunethreStore(storage){return {
  read(){try{const raw=storage.getItem(YUNETHRE_SAVE_KEY);if(!raw)return {ok:true,data:null};const data=JSON.parse(raw);return validYunethreSave(data)?{ok:true,data}:{ok:false,reason:'The Chapter 2 checkpoint is incompatible and has been kept.'};}catch{return {ok:false,reason:'Chapter 2 could not be read. Its save has been kept.'};}},
  save(data){if(!validYunethreSave(data))return {ok:false,reason:'Chapter 2 could not be saved at this position.'};try{storage.setItem(YUNETHRE_SAVE_KEY,JSON.stringify(data));return {ok:true};}catch{return {ok:false,reason:'Saving failed. The earlier Chapter 2 save is kept.'};}},
};}
