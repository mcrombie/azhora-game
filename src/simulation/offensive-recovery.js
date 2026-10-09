// A defeated command needs time to prepare a new attack on the same field.
// This does not block existing marches, reinforcements, defense, or other fronts.
export function offensiveRecoveryUntil(state,region,faction){
  const last=state.events.findLast(e=>e.type==='battle'&&e.region===region);
  return last&&(last.captured?last.defender:last.attacker)===faction?last.reattackOn??0:0;
}
