import {ENCOUNTER_BALANCE} from './encounter-balance.js';
// Read-only explanations of recorded events. These never change combat timing.
const dodgeMessages={
  cooldown:'Dodge recovering. Wait for the countdown.',release:'Release Space, then press it again to dodge.',
  'body-blocked':'Dodge blocked by a body or raised stone. Choose a clear direction.',
  'terrain-blocked':'Dodge blocked by scenery or the edge of the fighting area.',
};
export function encounterFeedback(state){
  const h=state.hero,events=[];
  if(h.lastStrike)events.push({...h.lastStrike,type:'strike'});
  if(h.lastDodge&&h.lastDodge.kind!=='started')events.push({...h.lastDodge,type:'dodge'});
  if(h.lastDefense)events.push({...h.lastDefense,type:'defense'});
  const priority={strike:0,dodge:1,defense:2};
  const event=events.sort((a,b)=>b.at-a.at||priority[b.type]-priority[a.type])[0];
  if(!event||state.time-event.at>2)return null;
  let text;const damage=event.damage??ENCOUNTER_BALANCE.enemyDamage;
  if(event.type==='dodge')text=dodgeMessages[event.kind];
  else if(event.type==='defense'){
    text=event.kind==='blocked'?`Staff block: -${damage} health. The staff softens frontal blows.`:event.reason==='unblockable'?`Hit: -${damage}. The ground stomp cannot be blocked; move clear.`:event.kind==='dodged'?'Dodged! Face the soldier and counter with X.':event.kind==='missed'?'Enemy strike missed. Counter now!':
      event.reason==='sweep-caught'?`Hit: -${damage}. The sweep caught you after the dodge. Retreat farther.`:
      event.reason==='dodge-ended'?`Hit: -${damage}. Your dodge ended inside the strike. Clear the attack.`:
      dodgeMessages[event.reason]?`Hit: -${damage}. `+dodgeMessages[event.reason]:`You were hit: -${damage} health. Move clear, then recover your timing.`;
  }else text=event.defense==='weapon'?`Weapon parry reduced the blow: -${damage} health. Flank or counter for full damage.`:event.kind==='fireball'?`Fireball hit soldier ${event.target+1}: -${event.damage??26} health`:event.kind==='counter'?`Countered soldier ${event.target+1}: -${event.damage??25} health`:event.kind==='hit'?`Hit soldier ${event.target+1}: -${event.damage??25} health`:
    event.kind==='guarded'?'Shield blocked your strike. Dodge, then counter.':event.kind==='blocked'?'Strike blocked by a soldier or scenery.':
    event.kind==='target-gone'?'Miss: your target left the fight.':event.kind==='no-target'?'Miss: no target when the swing began.':
    event.kind==='off-angle'?'Miss: face the gold-ring target before striking.':'Miss: no enemy in reach. Move closer.';
  if(event.kind==='incorporeal')text=state.guards.find(g=>g.id===event.target)?.phase==='submerged'?'The stalker is submerged. Watch the ripples and strike as it emerges.':'Your attack passed through the mist. Wait for the wraith to take shape.';
  if(event.reason==='guard-broken')text=`Guard broken: -${damage} health. Move clear; your staff guard needs a moment to recover.`;
  const opponent=state.guards.find(g=>g.id===event.target);
  if(event.targetName)text=text.replace(/soldier -?\d+/g,event.targetName);
  else if(opponent?.archetype)text=text.replace(/soldier \d+/g,opponent.name);
  if(state.guards.some(g=>g.archetype))text=text.replace('the soldier','your opponent');
  if(state.objective?.type==='duel')text=text.replace(/soldier \d+/g,state.guards[0].name).replace('the soldier','the champion');
  return {...event,text};
}
