// Authored Chapter 3 facts. Terrain, actors and clocks belong to their hosts;
// all changes pass through campaign.js's transactional authored driver.
import {createAuthoredCampaign} from '../../../simulation/campaign.js';
import {yunethrePolitics} from '../yunethre/chapter.js';

export const RENDEZVOUS_DELAY=6*60;
export const ORC_HEAD_ITEM='oremindi-orc-head';
const MAX_TIME=1e9,MAX_ATTEMPTS=100000;
const statuses=['pending','active','victory','defeat','withdrawal'];
const results=['victory','defeat','withdrawal'];
const eventTypes=['refuge-arrival','assignment','ranger-terms','ambush-started','ambush-victory','ambush-defeat','ambush-withdrawal',
  'proof-collected','ranger-alliance','rendezvous-visited','rendezvous-ready','rendezvous-waited',
  'battle-started','battle-victory','battle-defeat','battle-withdrawal','taleth-report'];
const fail=reason=>({ok:false,reason});
const ok=(fields={})=>({ok:true,...fields});
const has=(s,type)=>s.events.some(e=>e.type===type);
function event(s,type,at=s.elapsed){if(!has(s,type))s.events.push({type,at});}

export function initialOremindi({seed=2203026}={}){
  return {version:1,chapter:'oremindi',seed,elapsed:0,arrived:false,briefed:false,rangersMet:false,
    ambush:{status:'pending',attempt:0,fallen:0,retreated:false,result:null},proof:'unavailable',
    rangerAlliance:false,rendezvousAt:null,rendezvousVisited:false,
    battle:{status:'pending',attempt:0,chiefDefeated:false,result:null},reported:false,events:[]};
}

function validEncounter(e){
  return !!e&&statuses.includes(e.status)&&Number.isInteger(e.attempt)&&e.attempt>=0&&e.attempt<=MAX_ATTEMPTS
    &&(e.status==='pending'?e.attempt===0&&e.result===null:e.attempt>0
      &&(['active'].includes(e.status)?e.result===null:e.result===e.status));
}
export function validOremindi(s){
  if(!s||s.version!==1||s.chapter!=='oremindi'||!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff
    ||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>MAX_TIME)return false;
  if(!['arrived','briefed','rangersMet','rangerAlliance','rendezvousVisited','reported'].every(k=>typeof s[k]==='boolean'))return false;
  if(!Array.isArray(s.events)||s.events.length>eventTypes.length
    ||!s.events.every(e=>e&&eventTypes.includes(e.type)&&Number.isFinite(e.at)&&e.at>=0&&e.at<=s.elapsed)
    ||new Set(s.events.map(e=>e.type)).size!==s.events.length)return false;
  const a=s.ambush,b=s.battle;
  if(!validEncounter(a)||!validEncounter(b)||!Number.isInteger(a.fallen)||a.fallen<0||a.fallen>2
    ||typeof a.retreated!=='boolean'||typeof b.chiefDefeated!=='boolean')return false;
  if(s.briefed&&!s.arrived||s.rangersMet&&!s.briefed||s.elapsed&&!s.briefed)return false;
  if(a.attempt&&!s.rangersMet||a.status==='pending'&&(a.fallen!==0||a.retreated))return false;
  if(a.retreated&&a.fallen!==2||a.status==='victory'&&(a.fallen!==2||!a.retreated))return false;
  if(!['unavailable','available','carried','delivered'].includes(s.proof))return false;
  if((s.proof!=='unavailable')!==(a.status==='victory'))return false;
  if(s.rangerAlliance!==(s.proof==='delivered'))return false;
  if(s.rangerAlliance){
    const agreed=s.events.find(e=>e.type==='ranger-alliance');
    if(!agreed||!Number.isFinite(s.rendezvousAt)||s.rendezvousAt!==agreed.at+RENDEZVOUS_DELAY||s.rendezvousAt>MAX_TIME)return false;
  }else if(s.rendezvousAt!==null||s.rendezvousVisited)return false;
  if(b.attempt&&(!s.rangerAlliance||!s.rendezvousVisited||s.elapsed<s.rendezvousAt))return false;
  if(b.status==='pending'&&b.chiefDefeated||b.status==='victory'&&!b.chiefDefeated)return false;
  if(s.reported&&b.status!=='victory')return false;
  // Milestones are inseparable from their persistent record; invalid restores
  // cannot manufacture an alliance by toggling a checkbox or inventory value.
  const milestones=[['refuge-arrival',s.arrived],['assignment',s.briefed],['ranger-terms',s.rangersMet],
    ['ambush-started',a.attempt>0],['ambush-victory',a.status==='victory'],
    ['proof-collected',['carried','delivered'].includes(s.proof)],['ranger-alliance',s.rangerAlliance],
    ['rendezvous-visited',s.rendezvousVisited],['rendezvous-ready',s.rendezvousAt!==null&&s.elapsed>=s.rendezvousAt],
    ['battle-started',b.attempt>0],['battle-victory',b.status==='victory'],['taleth-report',s.reported]];
  if(milestones.some(([type,value])=>has(s,type)!==value))return false;
  if(has(s,'rendezvous-waited')&&(!s.rendezvousVisited||s.elapsed<s.rendezvousAt))return false;
  for(const [name,e]of [['ambush',a],['battle',b]]){
    if(['defeat','withdrawal'].includes(e.status)&&!has(s,name+'-'+e.status))return false;
    if((has(s,name+'-defeat')||has(s,name+'-withdrawal'))&&!e.attempt)return false;
  }
  return true;
}

function advance(s,seconds){
  if(!Number.isFinite(seconds)||seconds<0)return fail('Invalid elapsed time.');
  if(!s.briefed||s.reported||s.ambush.status==='active'||s.battle.status==='active')return ok({changed:false});
  const before=s.elapsed;s.elapsed=Math.min(MAX_TIME,s.elapsed+seconds);
  if(s.rendezvousAt!==null&&s.elapsed>=s.rendezvousAt)event(s,'rendezvous-ready',s.rendezvousAt);
  return ok({changed:s.elapsed!==before});
}
function start(s,name){
  const e=s[name];
  if(e.status==='active')return ok({attempt:e.attempt,changed:false});
  if(e.status==='victory')return fail('This encounter has already been completed.');
  if(e.attempt>=MAX_ATTEMPTS)return fail('This encounter has reached its attempt limit.');
  e.status='active';e.attempt++;e.result=null;
  if(name==='ambush'){e.fallen=0;e.retreated=false;}else e.chiefDefeated=false;
  event(s,name+'-started');return ok({attempt:e.attempt,changed:true});
}
function result(s,name,c){
  const e=s[name];
  if(!Number.isInteger(c.attempt)||c.attempt!==e.attempt||!e.attempt)return fail('That result belongs to a different encounter attempt.');
  if(!results.includes(c.result))return fail('Invalid encounter result.');
  if(name==='ambush'){
    if(!Number.isInteger(c.fallen)||c.fallen<e.fallen||c.fallen>2||typeof c.retreated!=='boolean'
      ||e.retreated&&!c.retreated||c.retreated&&c.fallen!==2)return fail('Invalid ambush progress.');
    if(c.result==='victory'&&(c.fallen!==2||!c.retreated))return fail('Two raiders must fall and the last must escape before the ambush is complete.');
  }else if(typeof c.chiefDefeated!=='boolean'||c.result==='victory'&&!c.chiefDefeated)return fail('The chief must be defeated before the field can be won.');
  if(e.status!=='active'){
    const same=e.result===c.result&&(name==='ambush'?e.fallen===c.fallen&&e.retreated===c.retreated:e.chiefDefeated===c.chiefDefeated);
    return same?ok({changed:false}):fail('This encounter already has a different result.');
  }
  e.status=e.result=c.result;
  if(name==='ambush'){e.fallen=c.fallen;e.retreated=c.retreated;if(c.result==='victory')s.proof='available';}
  else e.chiefDefeated=c.chiefDefeated;
  event(s,name+'-'+c.result);return ok({changed:true});
}

export const oremindiRules={validate:validOremindi,reduce(s,c){
  if(!c||typeof c!=='object')return fail('Unknown chapter command.');
  switch(c.type){
    case 'advance':return advance(s,c.seconds);
    case 'arrive-refuge':s.arrived=true;event(s,'refuge-arrival');return ok();
    case 'brief':
      if(!s.arrived)return fail('Reach the relocated Wizards\' Tower before speaking with Taleth.');
      s.briefed=true;event(s,'assignment');return ok();
    case 'meet-rangers':
      if(!s.briefed)return fail('Hear Taleth\'s account and assignment first.');
      s.rangersMet=true;event(s,'ranger-terms');return ok();
    case 'start-ambush':
      if(!s.rangersMet)return fail('Meet the North Ibenwood Rangers before investigating the mountain site.');
      return start(s,'ambush');
    case 'ambush-progress':{
      const a=s.ambush;
      if(a.status!=='active'||!Number.isInteger(c.attempt)||c.attempt!==a.attempt)return fail('There is no matching active ambush.');
      if(!Number.isInteger(c.fallen)||c.fallen<a.fallen||c.fallen>2||typeof c.retreated!=='boolean'
        ||a.retreated&&!c.retreated||c.retreated&&c.fallen!==2)return fail('Invalid ambush progress.');
      a.fallen=c.fallen;a.retreated=c.retreated;return ok();
    }
    case 'ambush-result':return result(s,'ambush',c);
    case 'collect-proof':
      if(s.proof==='unavailable')return fail('The ambush must end before you can take the requested proof.');
      if(s.proof==='available'){s.proof='carried';event(s,'proof-collected');}
      return ok();
    case 'present-proof':
      if(s.proof==='delivered')return ok({changed:false});
      if(s.proof!=='carried')return fail('Collect an orc head at the ambush site and bring it to the rangers.');
      if(s.elapsed>MAX_TIME-RENDEZVOUS_DELAY)return fail('The chapter clock cannot schedule another rendezvous.');
      s.proof='delivered';s.rangerAlliance=true;s.rendezvousAt=s.elapsed+RENDEZVOUS_DELAY;event(s,'ranger-alliance');return ok();
    case 'visit-rendezvous':
      if(!s.rangerAlliance)return fail('Secure the North Ibenwood alliance before meeting the war party.');
      s.rendezvousVisited=true;event(s,'rendezvous-visited');return ok();
    case 'wait-rendezvous':{
      if(!s.rangerAlliance||!s.rendezvousVisited)return fail('Reach the agreed rendezvous before waiting.');
      if(s.battle.status!=='pending')return fail('The war party has already assembled.');
      const remaining=Math.max(0,s.rendezvousAt-s.elapsed);
      const answer=advance(s,remaining);if(answer.ok&&remaining>0)event(s,'rendezvous-waited');return {...answer,advanced:remaining};
    }
    case 'start-battle':
      if(!s.rangerAlliance||!s.rendezvousVisited||s.elapsed<s.rendezvousAt)return fail('Meet the rangers at the rendezvous once the six active minutes have passed.');
      return start(s,'battle');
    case 'battle-result':return result(s,'battle',c);
    case 'report':
      if(s.battle.status!=='victory')return fail('Defeat the chief with the rangers before reporting success to Taleth.');
      s.reported=true;event(s,'taleth-report');return ok();
    default:return fail('Unknown chapter command.');
  }
}};
export function createOremindi(saved=null,options={}){return createAuthoredCampaign(oremindiRules,saved??initialOremindi(options));}
export function oremindiInventory(s){return s.proof==='carried'?[{id:ORC_HEAD_ITEM,name:'Orc raider head',quantity:1,quest:true}]:[];}

export function oremindiPolitics(s,previousChapter){
  return {...(previousChapter?yunethrePolitics(previousChapter):{}),
    southOremindiOwner:'oremindi-south-orcs',towerRefuge:{faction:'wizards-league',region:'South Oremindi Mountains',regionalControl:false},
    rangerAlliance:s.rangerAlliance,rangerFaction:'ibenwood-north-rangers',rangerOverlord:'elfland',
    chiefDefeated:s.battle.status==='victory',regionalConquest:false};
}

export function oremindiObjective(s){
  const target=(id,name)=>({id,name});
  if(s.reported)return {id:'complete',title:'Chapter 3 complete',purpose:'Taleth has received your report of the mountain alliance.',action:'Explore or review your journal. Chapter 4 has not begun.',destination:null};
  if(!s.arrived)return {id:'refuge',title:'Reach the relocated tower',purpose:'The Guild has escaped Minora to a refuge inside occupied South Oremindi.',action:'Travel to the lakeside refuge and enter the Wizards\' Tower.',destination:target('refuge','Relocated Wizards\' Tower')};
  if(!s.briefed)return {id:'assignment',title:'Hear Taleth\'s account',purpose:'Understand Minora\'s fall and the Guild\'s next move.',action:'Speak with Taleth in the relocated tower and accept the ranger assignment.',destination:target('taleth','Taleth / Relocated tower')};
  if(!s.rangersMet)return {id:'ranger-terms',title:'Meet the North Ibenwood Rangers',purpose:'Seek allies who know the occupied mountains.',action:'Find the ranger speaker in the southern foothills and ask what proof they require.',destination:target('rangers','North Ibenwood Rangers')};
  if(s.ambush.status!=='victory')return {id:'ambush',title:s.ambush.status==='active'?'Survive the mountain ambush':s.ambush.attempt?'Return to the investigation site':'Investigate the mountain raiders',purpose:'The rangers need proof of the raiders threatening their northern approach.',action:s.ambush.status==='active'?'Fight the three raiders. After two fall, the last must retreat.':'Climb to the northern investigation site. If the previous attempt failed or you withdrew, you can retry it here.',destination:target('ambush','Mountain investigation site')};
  if(s.proof==='available')return {id:'proof',title:'Collect the requested proof',purpose:'Defeating the raiders did not put their proof in your inventory.',action:'Approach a fallen raider and explicitly take an orc head.',destination:target('proof','Fallen raiders / Investigation site')};
  if(!s.rangerAlliance)return {id:'alliance',title:'Bring the proof to the rangers',purpose:'Earn the North Ibenwood Rangers\' help against the mountain chief.',action:'Return to the ranger speaker and present the head from your inventory.',destination:target('rangers','North Ibenwood Rangers')};
  if(s.battle.status==='victory')return {id:'report',title:'Report the victory to Taleth',purpose:'The chief has fallen and your elven allies held the field.',action:'Return to the relocated tower and tell Taleth what happened.',destination:target('taleth','Taleth / Relocated tower')};
  if(s.battle.status==='active')return {id:'battle',title:'Hold the high ground with the elves',purpose:'Your allies are outnumbered by the chief\'s force.',action:'Protect the elven formation, defeat the veteran chief, and break the raiders\' force.',destination:target('battle','Rangers\' high-ground position')};
  if(s.battle.attempt)return {id:'battle',title:'Regroup with the rangers',purpose:'The previous fight did not secure the field. The alliance remains.',action:'Return to the rendezvous and retry the battle when you are ready.',destination:target('rendezvous','Ranger rendezvous')};
  return {id:'rendezvous',title:s.elapsed<s.rendezvousAt?'Meet the assembling war party':'The rangers are ready',purpose:'The North Ibenwood Rangers will fight beside you as an allied faction of Elfland.',action:s.elapsed<s.rendezvousAt?'Reach the rendezvous. Explore while the six active minutes pass, or choose Wait here at the meeting point.':'Speak to the war party at the rendezvous and begin the battle when ready.',destination:target('rendezvous','Ranger rendezvous')};
}
