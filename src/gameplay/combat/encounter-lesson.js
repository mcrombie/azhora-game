// A projection of actual combat events, never a different set of combat rules.
export function dodgeLesson(state,advanced=false){
  const learned=advanced?state.skill.counterTypes.thrust>0&&state.skill.counterTypes.sweep>0:state.skill.dodgeCounters>0;
  if(state.outcome)return {complete:learned&&state.outcome==='success',text:learned?(advanced?'Thrust and sweep counters recorded.':'Dodge and counter recorded.'):(advanced?'Counter both attacks: sidestep the thrust; retreat from the sweep.':'Dodge a committed strike, then hit that soldier while their guard is open.')};
  if(state.guards.some(g=>g.open&&g.dodged))return {complete:false,text:'Counter now: move within staff reach and press X. Their guard is open.'};
  const threat=state.guards.find(g=>g.phase==='windup'||g.phase==='strike');
  if(threat)return {complete:false,text:threat.attack==='sweep'?'Sweep: dodge away from the soldier and stay outside the wide pink arc until the blade passes. Then close in and counter.':'Thrust: hold A or D and tap Space to sidestep the narrow orange arc. Release Space after each dodge.'};
  if(advanced)return {complete:false,text:'Read the weapon: thrust = sidestep; sweep = retreat. Counter each type after it misses.'};
  return {complete:false,text:learned?'Good counter. Repeat to defeat the soldier.':state.skill.blocks?'Their guard stopped your strike. Wait for the orange warning, dodge, then counter.':'Let the soldier approach. Watch the orange warning, then dodge sideways with A or D + Space.'};
}
