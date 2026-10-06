import { companyFor, isPlayableId } from '../../characters/player-characters.js';
import { BORDER_ARENA } from './border-chapter.js';
import { ARMY_BATTLE_ID } from '../../../gameplay/combat/army-battle.js';
import { AFTERMATH_VARIANTS } from './aftermath-chapter.js';

export const CHAPTER_ONE_REPORTS=Object.freeze({empire:'ambron-legate',coalition:'izol-quartermaster'});
// The older skirmish's narrow frontage ends at the stockade ditch. Forty
// fighters need the open field west of it, not ranks on opposite sides of a wall.
export const CHAPTER_ONE_ARENA=Object.freeze({
  center:Object.freeze({x:BORDER_ARENA.center.x-28,z:BORDER_ARENA.center.z}),
  checkpoint:Object.freeze({x:BORDER_ARENA.checkpoint.x-28,z:BORDER_ARENA.checkpoint.z}),
});
export function freshChapterOne(player='cromb',seed=0){
  if(!isPlayableId(player))throw new Error('Choose a mercenary first.');
  return {version:1,player,seed:seed>>>0,winner:null,reported:false,complete:false};
}
export function validChapterOne(s){
  return s==null||s.version===1&&isPlayableId(s.player)&&Number.isSafeInteger(s.seed)&&s.seed>=0&&s.seed<=0xffffffff
    &&[null,'empire','coalition'].includes(s.winner)&&typeof s.reported==='boolean'&&typeof s.complete==='boolean'
    &&(!s.reported||!!s.winner)&&(!s.complete||s.reported)
    &&Object.keys(s).every(k=>['version','player','seed','winner','reported','complete'].includes(k));
}
export const chapterOneConquest=side=>side==='empire'?'solis-sweep':side==='coalition'?'moros-outpost':null;
export const chapterOneConquestReported=(state,aftermath)=>!!state?.reported&&!!chapterOneConquest(state.winner)&&aftermath?.variant===chapterOneConquest(state.winner)&&aftermath.complete===true;
// Older saves skipped the assault. Resume their unfinished campaign without granting a capture.
export function restoreChapterOne(state,aftermath){return state?{...state,complete:state.complete&&chapterOneConquestReported(state,aftermath)}:null;}
export function chapterOneObjective(state,border,aftermath=null){
  if(!state)return null;
  if(state.complete&&chapterOneConquestReported(state,aftermath))return {title:'Chapter 1 complete',detail:'Your report is accepted. Chapter 2 is now open; its next assignment is still being developed.',destinationIds:[]};
  if(!state.winner&&border.stage==='fighting')return {title:'Battle for the border',detail:'Your army is fighting. Join the battle to help decide it, or stand back and watch the two forces fight independently.',destinationIds:[]};
  if(!state.winner)return {...border,title:border.title,detail:border.detail};
  if(state.winner!==border.side)return {title:'Regroup after the battle',detail:'Your army lost the field. Return to your commander to attempt the battle again.',destinationIds:[border.side==='coalition'?'solis-captain':'post-camp-legate']};
  if(!state.reported)return {title:'Report the victory',detail:'Return to the commander who sent you to the field. The chapter is not over yet.',destinationIds:[border.side==='coalition'?'solis-captain':'post-camp-legate']};
  if(!chapterOneConquestReported(state,aftermath)){
    if(aftermath?.variant===chapterOneConquest(state.winner)&&aftermath.title)return {...aftermath};
    const spec=AFTERMATH_VARIANTS[chapterOneConquest(state.winner)];
    return {title:spec.rally[0],detail:spec.rally[1],destinationIds:[spec.commanderId]};
  }
  return {title:border.side==='coalition'?'Report in West Izol':'Report to Ambron',detail:border.side==='coalition'
    ?'Take passage to Izolveth, the main town of West Izol, and report to the Coalition quartermaster.'
    :'Travel to Ambron and deliver the battle report to the Lord Marshal’s representative.',destinationIds:[CHAPTER_ONE_REPORTS[border.side]]};
}
/** The selected mercenary is absent from the ten NPC recruits, on either side. */
export function chapterOneEncounter(player,side='empire',seed=0){
  const center={...CHAPTER_ONE_ARENA.center};
  const recruits=companyFor(player).map(p=>({id:p.id,npcId:p.id,name:p.name,model:{role:'traveler',look:p.look},armed:p.weapon!==null}));
  const empire=[...recruits,...Array.from({length:10},(_,i)=>({id:`chapter-legion-${i+1}`,name:'Ambroni legionary',model:{role:'legion-soldier',armed:true}}))];
  const coalition=Array.from({length:20},(_,i)=>({id:`chapter-coalition-${i+1}`,name:'Coalition soldier',model:{role:'suvali-guard',armed:true}}));
  const position=(i,sign)=>({x:center.x+(i%10-4.5)*3.3,z:center.z+sign*(5+Math.floor(i/10)*6)});
  const place=(people,sign,allied)=>people.map((p,i)=>({...p,...position(i,sign),kind:allied?'legionary':'soldier',hp:120,level:1,entry:0}));
  return {id:ARMY_BATTLE_ID,independent:true,physicalCompany:true,seed,level:0,center,
    checkpoint:{x:center.x+20,z:center.z+16},retreatAxis:'z',retreatLine:center.z+42,
    allies:place(side==='empire'?empire:coalition,1,true),enemies:place(side==='empire'?coalition:empire,-1,false)};
}
