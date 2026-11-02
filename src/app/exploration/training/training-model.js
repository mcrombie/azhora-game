import {createLizeemEncounter} from '../../../gameplay/combat/lizeem-encounter.js';
import {dodgeLesson} from '../../../gameplay/combat/encounter-lesson.js';
import {createTeresodSorcery} from '../teresod-fireball.js';

// A registry keeps future combat lessons in this same safe, repeatable room.
// The campaign and its save are deliberately absent from this model.
export const TRAINING_LESSONS=Object.freeze([
  Object.freeze({id:'staff',title:'Staff basics',description:'Approach, face your target, and land two staff strikes.',passive:true,hero:{x:0,z:4},target:{x:0,z:0},next:'fireball'}),
  Object.freeze({id:'fireball',title:'Cast a fireball',description:'Face the apparition and hit it with your fireball.',passive:true,hero:{x:0,z:6},target:{x:0,z:-4},next:'counter'}),
  Object.freeze({id:'counter',title:'Dodge and counter',description:'Dodge a thrust, then strike while the guard is open.',passive:false,hero:{x:0,z:4},target:{x:0,z:0},next:'practice'}),
  Object.freeze({id:'practice',title:'Free sparring',description:'Use your staff, fireball, and dodge against a training apparition.',passive:false,hero:{x:0,z:4},target:{x:0,z:-1},next:null}),
]);
export const trainingLesson=id=>TRAINING_LESSONS.find(lesson=>lesson.id===id)??null;

export function createTrainingModel({move=(body,dx,dz)=>({x:body.x+dx,z:body.z+dz})}={}){
  let lesson=null,encounter=null,phase='idle',stats={staffHits:0,fireballHits:0,dodgeCounters:0},lastStrike=-1;
  const sorcery=createTeresodSorcery();
  function start(id){
    const selected=trainingLesson(id);if(!selected)return false;
    lesson=selected;phase='running';stats={staffHits:0,fireballHits:0,dodgeCounters:0};lastStrike=-1;sorcery.restore();
    encounter=createLizeemEncounter({heroStart:lesson.hero,guardStarts:[lesson.target],passive:lesson.passive,timeLimit:Infinity,attackPattern:lesson.id==='counter'?['thrust']:['thrust','sweep'],move});
    // Establish a passive target's open stance before the player can strike.
    encounter.tick(1/60);return true;
  }
  function cast(origin,direction){
    if(phase!=='running'||!['fireball','practice'].includes(lesson?.id))return {ok:false,reason:'Use your staff for this lesson.'};
    return sorcery.cast(origin,direction);
  }
  function tick(dt,input={}){
    if(phase!=='running')return snapshot();
    const state=encounter.tick(dt,input),strike=state.hero.lastStrike;
    if(strike&&strike.at!==lastStrike){lastStrike=strike.at;if(['hit','counter'].includes(strike.kind))stats.staffHits++;}
    stats.dodgeCounters=state.skill.dodgeCounters;
    sorcery.tick(dt,{targets:state.guards.map(guard=>({...guard,y:1})),hit(id,damage){if(encounter.fireballHit(id,damage))stats.fireballHits++;}});
    const latest=encounter.snapshot();
    const complete=lesson.id==='staff'?stats.staffHits>=2:lesson.id==='fireball'?stats.fireballHits>=1:lesson.id==='counter'?stats.dodgeCounters>=1:latest.outcome==='success';
    if(complete){phase='complete';sorcery.clear();}
    else if(latest.outcome){phase='retry';sorcery.clear();}
    return snapshot();
  }
  function coach(){
    if(!lesson)return 'Here, no time passes in the world outside. Choose a lesson, or explore the mist. The pavilion leads back to my tower.';
    if(phase==='complete')return lesson.id==='staff'?'Good. Two clean strikes. Your staff only reaches a nearby target you are facing. Next, we will practice fireball.':lesson.id==='fireball'?'Well cast. Fireball costs 20 mana. Mana starts returning four seconds after your last cast. Try the dodge lesson next, or repeat this one.':lesson.id==='counter'?'That is the opening you want: evade the committed blow, then counter. You can repeat any lesson, or put the techniques together in free sparring.':'Well fought. Nothing here changes the war or harms a real person. Practice again whenever you wish.';
    if(phase==='retry')return 'You are safe. I can reset this apparition as often as you need. Choose Retry lesson to begin again with full health and mana.';
    const s=encounter.snapshot();
    if(lesson.id==='staff'){
      const distance=Math.hypot(s.hero.x-s.guards[0].x,s.hero.z-s.guards[0].z);
      return distance>2.7?'Move close to the blue apparition with WASD. Within staff reach, face it and press X or click to strike. It will not attack you.':`Press X or click to strike. T locks your facing onto the target. Land ${2-stats.staffHits} more ${stats.staffHits?'strike':'strikes'}.`;
    }
    if(lesson.id==='fireball')return 'Face the apparition and press Q to cast. T locks onto it. Your fireball travels through the air, costs 20 mana, and has a limited range. This apparition will not attack.';
    return dodgeLesson(s,lesson.id==='practice').text;
  }
  function snapshot(){
    const state=encounter?.snapshot()??{hero:{x:0,z:6,hp:100,heading:Math.PI},guards:[],time:0,skill:{}};
    return {...state,lesson:lesson?.id??null,phase,stats:{...stats},sorcery:sorcery.state(),coach:coach(),next:lesson?.next??null};
  }
  return {start,tick,cast,snapshot};
}
