// Chapter facts and authored consequences. Rendering and wall-clock time stay outside.
import {createAuthoredCampaign} from '../../../simulation/campaign.js';
export const BATTLE_START=15*60, BATTLE_END=BATTLE_START+120;
export const LEAGUE_REGIONS=['Isareos','Nethereum','Ovesos','Caricas','Nesdor'];
const sides=['centaurs','celder'];
const copy=value=>structuredClone(value);
export function chapterPremise(war=null,source='chapter-one'){
  if(!war)return {source:'direct',winner:'west'};
  const winner=war.winner;
  if(!['west','east'].includes(winner))throw Error('Finish the Lizeemi War before continuing.');
  // The checkpoint envelope keeps the large historical record out of frame ticks.
  return {source,winner};
}
export function initialYunethre({seed=2201026,premise=chapterPremise()}={}){
  return {version:1,chapter:'yunethre',seed:seed>>>0,premise:copy(premise),elapsed:0,
    briefed:false,departed:false,known:false,visits:{town:false,centaurs:false,celder:false},
    compact:{centaurs:false,celder:false},battle:{status:'pending',winner:null,joined:null},
    elfHostile:false,centaurProtection:false,celderAlliance:false,celderHostile:false,
    laketown:'autonomous',aftermathVisited:false,returned:false,events:[]};
}
export function validYunethre(s){
  if(!s||s.version!==1||s.chapter!=='yunethre'||!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff
    ||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>1e9)return false;
  if(!s.premise||!['direct','chapter-one','unattended'].includes(s.premise.source)||!['west','east'].includes(s.premise.winner))return false;
  if(!['briefed','departed','known','elfHostile','centaurProtection','celderAlliance','celderHostile','aftermathVisited','returned'].every(k=>typeof s[k]==='boolean'))return false;
  if(!s.visits||!['town',...sides].every(k=>typeof s.visits[k]==='boolean')||!s.compact||!sides.every(k=>typeof s.compact[k]==='boolean'))return false;
  const b=s.battle;
  if(!b||!['pending','active','averted','resolved'].includes(b.status)||![null,...sides].includes(b.winner)||![null,...sides].includes(b.joined))return false;
  if(!['autonomous','league','celder','declined'].includes(s.laketown)||!Array.isArray(s.events)||s.events.length>64
    ||!s.events.every(e=>e&&typeof e.type==='string'&&Number.isFinite(e.at)&&e.at>=0&&e.at<=s.elapsed))return false;
  if(s.departed&&!s.briefed||s.elapsed&&!s.departed||s.returned&&!s.aftermathVisited)return false;
  if(b.status==='pending'&&(s.elapsed>=BATTLE_START||b.winner||b.joined))return false;
  if(b.status==='active'&&(s.elapsed<BATTLE_START||b.winner||!b.joined&&s.elapsed>=BATTLE_END))return false;
  if(b.status==='resolved'&&(!sides.includes(b.winner)||s.elapsed<BATTLE_START))return false;
  if(b.status==='averted'&&(!s.compact.centaurs||!s.compact.celder||b.winner||b.joined||s.elapsed>=BATTLE_START))return false;
  if(s.celderAlliance&&(b.joined!=='celder'||b.winner!=='celder'||s.laketown!=='celder'))return false;
  if(s.centaurProtection&&b.winner==='celder')return false;
  if(s.laketown==='league'&&(s.elfHostile||!['resolved','averted'].includes(b.status)||b.winner!=='celder'&&!s.centaurProtection))return false;
  if(s.aftermathVisited&&!['resolved','averted'].includes(b.status))return false;
  return true;
}
function event(s,type){if(!s.events.some(e=>e.type===type))s.events.push({type,at:s.elapsed});}
function unattendedWinner(seed){let x=(seed^0x9e3779b9)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296<.5?'centaurs':'celder';}
export const yunethreRules={validate:validYunethre,reduce(s,c){
  const fail=reason=>({ok:false,reason}),ok=()=>({ok:true});
  const settled=()=>['resolved','averted'].includes(s.battle.status);
  switch(c.type){
    case 'brief':s.briefed=true;event(s,'assignment');return ok();
    case 'depart':if(!s.briefed)return fail('Speak with Taleth first.');s.departed=true;event(s,'departure');return ok();
    case 'advance':{
      if(!Number.isFinite(c.seconds)||c.seconds<0)return fail('Invalid elapsed time.');
      if(!s.departed||settled()||s.battle.joined)return ok();
      s.elapsed=Math.min(BATTLE_END,s.elapsed+c.seconds);
      if(s.elapsed>=BATTLE_START&&s.battle.status==='pending'){s.battle.status='active';s.events.push({type:'battle-started',at:BATTLE_START});}
      if(s.elapsed>=BATTLE_END){s.battle.status='resolved';s.battle.winner=unattendedWinner(s.seed);event(s,'battle-'+s.battle.winner);}
      return ok();
    }
    case 'visit':if(!s.departed||!['town',...sides].includes(c.place))return fail('That meeting is unavailable.');s.visits[c.place]=true;s.known=true;event(s,'visit-'+c.place);return ok();
    case 'compact':
      if(!sides.includes(c.side)||!s.visits[c.side]||s.battle.status!=='pending')return fail('The agreement must be reached with both parties before the battle.');
      s.compact[c.side]=true;event(s,'consent-'+c.side);
      if(s.compact.centaurs&&s.compact.celder){s.battle.status='averted';s.centaurProtection=true;event(s,'peace');}
      return ok();
    case 'protect':
      if(s.battle.status!=='resolved'||s.battle.winner!=='centaurs'||!s.visits.centaurs)return fail('Meet the surviving centaurs after the battle.');
      if(s.battle.joined==='celder')return fail('You fought against this community; protection is not a gift for defeating its allies.');
      s.centaurProtection=true;s.celderHostile=true;event(s,'protection');return ok();
    case 'join':
      if(s.battle.status!=='active'||s.battle.joined||!sides.includes(c.side))return fail('There is no battle to join.');
      s.battle.joined=c.side;s.celderHostile=c.side==='centaurs';event(s,'joined-'+c.side);return ok();
    case 'battle-result':
      if(s.battle.status!=='active'||!s.battle.joined||!['victory','defeat','withdrawal'].includes(c.result))return fail('No hero battle is awaiting a result.');
      s.battle.status='resolved';s.battle.winner=c.result==='victory'?s.battle.joined:sides.find(x=>x!==s.battle.joined);
      s.centaurProtection=c.result==='victory'&&s.battle.joined==='centaurs';event(s,'battle-'+s.battle.winner);return ok();
    case 'capture-laketown':
      if(s.battle.status!=='resolved'||s.battle.winner!=='celder'||s.battle.joined!=='celder')return fail('Celder has not won your campaign for Laketown.');
      s.laketown='celder';s.celderAlliance=true;s.aftermathVisited=true;event(s,'laketown-captured');return ok();
    case 'elf-hostility':
      if(typeof c.value!=='boolean')return fail('Invalid relationship.');s.elfHostile=c.value;
      if(s.elfHostile&&s.laketown==='league')s.laketown='declined';return ok();
    case 'laketown-decision':
      if(!settled()||!s.visits.town||!['join','decline'].includes(c.decision))return fail('Return to Laketown after peace or battle.');
      if(c.decision==='join'&&(s.elfHostile||s.battle.winner!=='celder'&&!s.centaurProtection||s.battle.joined==='celder'))return fail('Laketown cannot agree under these terms.');
      if(s.laketown==='celder')return fail('The town is already under Celder.');
      s.laketown=c.decision==='join'?'league':'declined';s.aftermathVisited=true;event(s,'laketown-'+s.laketown);return ok();
    case 'return':
      if(!s.aftermathVisited)return fail('Hear Laketown\'s decision first.');s.returned=true;event(s,'minora-falls');return ok();
    default:return fail('Unknown chapter command.');
  }
}};
export function createYunethre(saved=null,options={}){return createAuthoredCampaign(yunethreRules,saved??initialYunethre(options));}
export function chapterObjective(s){
  if(s.returned)return 'Chapter 2 complete. Next: reach the relocated tower in South Oremindi.';
  if(!s.briefed)return 'Speak with Taleth at the Sky Lookout about Yunethre.';
  if(!s.departed)return 'Leave the tower for Yunethre. The deadline starts on departure.';
  if(s.aftermathVisited)return 'Return toward Minora to report to Taleth.';
  if(['resolved','averted'].includes(s.battle.status))return 'Return to Laketown for its decision.';
  if(s.battle.status==='active')return 'The Celder-centaur battle is underway.';
  if(!s.visits.town)return 'Speak with Laketown\'s representative.';
  if(!s.visits.centaurs)return 'Meet the centaur speaker at the camp east of Laketown.';
  if(!s.visits.celder)return 'Carry the centaurs\' concerns to Canerd.';
  return 'Secure both parties\' consent before the battle, or remain neutral.';
}
export function yunethrePolitics(s){
  return {laketownOwner:s.laketown==='celder'?'celder':s.laketown==='league'?(s.returned?'wizards-league':'lizeemi-league'):'laketown',
    centaursAlive:s.battle.winner!=='celder',centaurProtection:s.centaurProtection,celderAlliance:s.celderAlliance,celderHostile:s.celderHostile,
    originalLeagueOwner:s.returned?'blood-prince':'lizeemi-league',southOremindiOwner:'oremindi-south-orcs',
    towerRefuge:s.returned?{faction:'wizards-league',region:'South Oremindi Mountains',regionalControl:false}:null};
}
