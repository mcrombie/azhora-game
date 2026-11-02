// Read-only projection. Carried chapters are presented, never advanced/replayed.
import {oremindiObjective,oremindiInventory} from './chapter.js';
import {yunethreJournal} from '../yunethre/journal.js';

const entry=(id,title,detail,status)=>({id,title,detail,status});
const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.ceil(seconds%60)).padStart(2,'0')}`;
function entries(s,active){
  const status=(done,id)=>done?'completed':active.id===id?'current':'pending';
  const retry=e=>e.status==='defeat'?'The previous attempt ended in defeat. You can regroup and retry.':e.status==='withdrawal'?'You withdrew from the previous attempt. You can return and retry.':null;
  const list=[
    entry('refuge','Reach the relocated Wizards\' Tower','The tower is a refuge within occupied South Oremindi, not control of the region.',status(s.arrived,'refuge')),
    entry('assignment','Hear Taleth\'s account','Learn what happened at Minora and why the Guild needs mountain allies.',status(s.briefed,'assignment')),
    entry('ranger-terms','Meet the North Ibenwood Rangers','The North, East, West and South ranger factions are separate vassals of Elfland. This assignment seeks the North rangers\' help.',status(s.rangersMet,'ranger-terms')),
    entry('ambush','Survive the three-raider ambush',s.ambush.status==='victory'?'Two raiders fell and the last escaped. The requested proof still required an explicit collection.':retry(s.ambush)??'Investigate the northern mountain site. After two raiders fall, the last retreats; the encounter ends when it has escaped.',status(s.ambush.status==='victory','ambush')),
    entry('proof','Take the requested orc head',s.proof==='unavailable'?'The rangers require physical proof. No item is awarded just for starting or winning an encounter.':s.proof==='available'?'A fallen raider can be searched. The head is not yet in your inventory.':s.proof==='carried'?'The orc head is in your quest inventory. Bring it to the ranger speaker.':'You collected the head and presented it to the rangers.',status(['carried','delivered'].includes(s.proof),'proof')),
    entry('alliance','Present the proof and secure an alliance',s.rangerAlliance?'The North Ibenwood Rangers agreed to aid the Wizards\' League. They remain a distinct elven faction.':'Return to the ranger speaker with the proof; the battle alone does not establish an alliance.',status(s.rangerAlliance,'alliance')),
    entry('rendezvous','Meet the war party',s.rendezvousAt===null?'The rangers will name the meeting time once they accept the proof.':s.elapsed<s.rendezvousAt?'The rendezvous is six active minutes after the agreement. Wait here advances the same chapter clock when you reach the meeting point.':'The war party is ready. There is no penalty for arriving later.',status(s.battle.attempt>0,'rendezvous')),
    entry('battle','Hold the high ground and defeat the chief',s.battle.status==='victory'?'The chief fell and the raiding formation was defeated. Winning this field does not automatically annex South Oremindi.':retry(s.battle)??'Fight beside outnumbered elven archers and sword-bearers. Defeat the veteran chief and break his larger force.',status(s.battle.status==='victory','battle')),
    entry('report','Report to Taleth',s.reported?'Taleth has received your report. Chapter 3 is complete; Chapter 4 has not started.':'Return to the relocated tower after the victory and report to Taleth.',status(s.reported,'report')),
  ];
  for(const name of ['ambush','battle'])for(const result of ['defeat','withdrawal'])if(s.events.some(e=>e.type===name+'-'+result))
    list.push(entry(name+'-'+result,(name==='ambush'?'Mountain ambush':'High-ground battle')+' / '+(result==='defeat'?'An attempt failed':'You withdrew'),
      'This earlier attempt did not complete the objective. A later successful attempt is recorded separately.',result==='defeat'?'failed':'skipped'));
  return list;
}
function deadline(s){
  if(!s.rangerAlliance||s.reported||s.battle.status==='victory')return null;
  if(s.battle.status==='active')return {status:'active',label:'Fight beside the rangers',text:'The chapter clock is held during the encounter. Victory requires the chief\'s defeat and a broken opposing formation.',seconds:null};
  const seconds=Math.max(0,Math.ceil(s.rendezvousAt-s.elapsed));
  return seconds?{status:'running',label:`War party ready in ${clock(seconds)}`,text:'Six active minutes from the agreement. Conversations, loading, the tower and pause hold time. At the rendezvous, Wait here advances this same clock.',seconds}
    :{status:'ready',label:'War party ready',text:'Meet the rangers at the rendezvous and begin when you are ready.',seconds:0};
}
function previousChapters(previous,chapterOne,source){
  if(!previous?.chapter)return ['one','two'].map((word,i)=>({id:'chapter-'+word,title:`Chapter ${i+1}`,provenance:'unrecorded',summary:'No prior chapter record was supplied.',entries:[]}));
  const chapters=yunethreJournal(previous.chapter,chapterOne,previous.history).chapters;
  // The old projection predates a playable Chapter 3. Keep its facts, correcting
  // only its now-obsolete instruction that the continuation is unavailable.
  const two=chapters[1];two.entries=two.entries.map(e=>e.id==='news'?{...e,detail:'The messenger warned that Prince Wilhelm seized Minora. The Wizards\' Tower moved to a refuge within occupied South Oremindi.'}:e);
  if(source==='unattended'){
    two.provenance='unattended';two.summary='The direct Chapter 3 start uses a completed neutral Chapter 2 premise. These are background events, not quests you played.';
    two.entries=[entry('neutral-conflict','Celder and the centaurs fought without your help',`The seeded neutral outcome favoured ${previous.chapter.battle.winner==='centaurs'?'the centaurs':'Celder'}. No hero military commitment is recorded.`,'information'),
      entry('neutral-town','Laketown remained independent','No protection agreement, annexation or military alliance was awarded to the absent hero.','information'),
      entry('news','Minora fell; the Guild found refuge','Prince Wilhelm holds the five original League regions. The relocated tower does not give the Wizards\' League ownership of South Oremindi.','information')];
  }
  return chapters;
}

/** Pass the saved Chapter 2 envelope and its cached Chapter 1 snapshot. There is
 * no historical replay or large checkpoint cloning in this projection. */
export function oremindiJournal(state,previous=null,chapterOne=null,{historySource='played'}={}){
  if(!state||state.chapter!=='oremindi')throw new TypeError('An Oremindi chapter snapshot is required.');
  const active=oremindiObjective(state),log=entries(state,active);
  const order=['refuge','assignment','ranger-terms','ambush','proof','alliance','rendezvous','battle','report'];
  const index=active.id==='complete'?order.length-1:Math.max(0,order.indexOf(active.id));
  active.steps=order.slice(Math.max(0,index-1),Math.min(order.length,index+3)).map(id=>log.find(e=>e.id===id));
  const summary=state.reported?'The mountain alliance has been reported to Taleth. The tower remains a refuge, and your allies retain their own lands.'
    :'Find the relocated Guild, earn the North Ibenwood Rangers\' alliance and face the South Oremindi chief together.';
  return {title:'Chapter 3 / The Mountain Alliance',activeChapter:'chapter-three',summary,complete:state.reported,
    active,deadline:deadline(state),inventory:oremindiInventory(state),
    chapters:[...previousChapters(previous,chapterOne,historySource),{id:'chapter-three',title:'Chapter 3 / The Mountain Alliance',summary,provenance:'played',entries:log}]};
}
