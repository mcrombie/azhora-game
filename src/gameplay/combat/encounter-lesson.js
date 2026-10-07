import {ENCOUNTER_REACH} from './encounter-target.js';
import {encounterFeedback} from './encounter-feedback.js';

// Read-only coaching from the real encounter; completion still requires a won fight.
export function dodgeLesson(state,advanced=false){
  const learned=advanced?state.skill.counterTypes.thrust>0&&state.skill.counterTypes.sweep>0:state.skill.dodgeCounters>0;
  if(state.outcome)return {complete:learned&&state.outcome==='success',text:learned?(advanced?'Thrust and sweep counters recorded.':'Dodge and counter recorded.'):(advanced?'Counter both attacks: sidestep the thrust; retreat from the sweep.':'Dodge a committed strike, then hit that soldier while their guard is open.')};
  const live=state.guards.filter(g=>g.hp>0&&!g.escaped);
  const threat=live.find(g=>g.phase==='windup'||g.phase==='strike');
  if(threat)return {complete:false,kind:'threat',text:threat.attack==='sweep'?'Sweep: dodge away with direction + Space. Stay beyond the pink arc.':'Thrust: tap direction + Space to sidestep across the orange warning.'};
  const open=live.find(g=>g.open&&g.dodged);
  if(open){
    const distance=Math.hypot(open.x-state.hero.x,open.z-state.hero.z);
    if(distance>ENCOUNTER_REACH)return {complete:false,kind:'approach',text:'Guard open. Move back within staff reach to counter.'};
    if(state.hero.targetId!==open.id)return {complete:false,kind:'face',text:'Guard open. Move toward the soldier to face them; look for the gold ring.'};
    return {complete:false,kind:'counter',text:'Counter now: press X to strike the gold-ring soldier.'};
  }
  const text=advanced?(state.skill.counterTypes.thrust?'Now watch for the wide pink sweep. Dodge away when it begins.':'Watch the weapon: orange thrust or wide pink sweep.'):
    learned?'Good counter. Watch for the next thrust.':state.skill.blocks?'Their shield blocks repeated strikes. Wait for the orange thrust.':'Let the soldier approach. Watch for the orange thrust.';
  return {complete:false,kind:'watch',text};
}

// Use one instruction slot. Brief failure explanations take priority, then the
// current attack/counter opportunity, then the lesson or interception objective.
export function encounterInstruction(state,practice=false){
  const feedback=encounterFeedback(state),lesson=dodgeLesson(state,practice==='advanced');
  const recent=feedback&&state.time-feedback.at<.85;
  if(recent&&(feedback.type==='dodge'||feedback.type==='defense'&&feedback.kind==='hit'))return {kind:'feedback',text:feedback.text};
  if(['threat','approach','face','counter'].includes(lesson.kind))return lesson;
  if(feedback&&(recent||feedback.type==='defense'&&feedback.kind==='hit'))return {kind:'feedback',text:feedback.text};
  if(practice==='lesson'||practice==='advanced')return lesson;
  const live=state.guards.filter(g=>g.hp>0&&!g.escaped),runner=state.guards.find(g=>g.role==='runner');
  if(runner?.escaped)return {kind:'rally',text:'Runner escaped. Stop the escorts; each soldier still counts.'};
  if(runner?.hp>0){
    const rally=state.objective?.rally;
    const remaining=rally?` (${Math.ceil(Math.hypot(runner.x-rally.x,runner.z-rally.z))}m to go)`:'';
    return {kind:'rally',text:`Stop the runner before the blue rally point${remaining}.`};
  }
  if(live.length)return {kind:'rally',text:'Runner stopped. Intercept the remaining escorts.'};
  return {kind:'watch',text:'Interception complete.'};
}
