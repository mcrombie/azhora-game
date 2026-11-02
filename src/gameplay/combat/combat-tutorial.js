// Instruction is independent of the optional, difficulty-ordered challenge.
// These goals use resolved combat contacts, never just button presses.
export const COMBAT_LESSONS=Object.freeze([
  {id:'staff',opponent:'bramble-goblin',name:'Aim and strike',passive:true,
    instruction:'Press T to lock onto the goblin. Use WASD to close the distance, then X or left-click to land two staff hits.',goals:[['focusedHits',2,'Staff hits while locked on']]},
  {id:'block',opponent:'bramble-goblin',name:'Guard with your staff',
    instruction:'Face the goblin and hold F through two jabs. Your staff reduces damage; it cannot stop all of it. Release F to attack or cast.',goals:[['staffBlocks',2,'Incoming blows blocked']]},
  {id:'dodge',opponent:'wolf',name:'Evade and counter',
    instruction:'Press T to follow the wolf. When it crouches, use direction + Space to dodge sideways. Close in and strike during its recovery.',goals:[['dodges',1,'Attacks dodged'],['dodgeCounters',1,'Counters after a dodge']]},
  {id:'fireball',opponent:'bramble-goblin',name:'Cast Fireball',passive:true,
    instruction:'Leave room between you and the goblin, face it (T helps), then press Q. Land a Fireball. Each cast costs 20 mana; recovery starts after four seconds.',goals:[['fireballHits',1,'Fireballs landed']]},
  {id:'militia',opponent:'militiaman',name:'Ready for the Lizeemi War',
    instruction:'Defeat a militiaman using what you learned. His shield stops frontal staff hits. Bait an attack, evade and counter, flank him, or use Fireball. This is the final training test.',goals:[['victories',1,'Militiaman defeated']]},
].map(lesson=>Object.freeze(lesson)));

export function combatLesson(id){return COMBAT_LESSONS.find(l=>l.id===id)??null;}
export function teachingOpponent(base,lesson){
  if(!lesson||lesson.id==='militia')return base;
  return {...base,attributes:{...base.attributes,power:5},attacks:Object.fromEntries(Object.entries(base.attacks).map(([id,a])=>[id,{...a,windup:Math.max(a.windup,.65),recovery:Math.max(a.recovery,1.6)}]))};
}
export function createCombatLesson(id,state){
  const lesson=combatLesson(id);if(!lesson)throw Error('Unknown combat lesson.');
  const counts={focusedHits:0,fireballHits:0};let lastStrike=null;
  state.tutorial={id,name:lesson.name,instruction:lesson.instruction,goals:[],complete:false,reformed:0};
  return ()=>{
    const strike=state.hero.lastStrike,key=strike&&`${strike.at}:${strike.kind}:${strike.target}`;
    if(key&&key!==lastStrike){lastStrike=key;if(strike.damage>0){
      if(strike.kind==='fireball')counts.fireballHits++;
      else if(['hit','counter'].includes(strike.kind)&&state.hero.focusId===strike.target)counts.focusedHits++;
    }}
    const values={...state.skill,...counts,victories:state.guards.every(g=>!g.hp)?1:0};
    state.tutorial.goals=lesson.goals.map(([key,required,label])=>({key,label,required,value:Math.min(required,values[key]??0)}));
    state.tutorial.complete=state.tutorial.goals.every(g=>g.value>=g.required);
    if(lesson.id!=='militia')for(const guard of state.guards){
      if(state.tutorial.complete){guard.hp=0;guard.phase='yielded';guard.yielded=true;}
      else if(!guard.hp){guard.hp=guard.maxHp;guard.phase='approach';guard.open=false;state.tutorial.reformed++;}
    }
  };
}
