import {elapsedTimeLabel} from './opening-time-label.js';

// These are previews only: the campaign owns the actual settlement and clock.
// Missing metadata belongs to older immediate-resolution sessions.
export function battleResultTime(pending,clock,outcome='success'){
  if(!clock?.sharedOpening)return null;
  const from=clock.elapsedSeconds,final=pending.kind!=='roadside'&&pending.duel?.status!=='accepted'&&(!!pending.rally||!!pending.fieldBattleAvailable||!pending.reinforcements);
  const scheduled=clock.localBattleTiming==='scheduled'&&final&&['success','defeat'].includes(outcome)&&Number.isFinite(pending.endsOn);
  const to=scheduled?Math.max(from,pending.endsOn*(clock.secondsPerDay??60)):from,advances=to>from;
  const range=`${elapsedTimeLabel(from)} → ${elapsedTimeLabel(to)}`;
  return {from,to,advances,
    fact:advances?['Campaign time',`${range} on Continue`]:['Time',`${elapsedTimeLabel(from)} · No time skipped on Continue`],
    review:advances?`Campaign time: ${range}. Continue advances to the battle's scheduled end. Reading this report does not spend time.`:`Campaign time: ${elapsedTimeLabel(from)}. Time is held while you read; Continue adds no time.`,
    next:advances?'Continue records your result and advances the campaign to the scheduled battle end. Other armies, supplies and battles progress during that interval; their developments appear in the war log.':'Continue records this result at the current adventure time. Other armies do not advance.'};
}

export function openingBattleTime(pending,battle,clock=null){
  if(!pending||!battle)return '';
  const final=!!pending.rally||!pending.reinforcements;
  const id=pending.region??battle.region??'caricas',place={caricas:'Caricas',ovesos:'Ovesos',nethereum:'Nethereum',nesdor:'Nesdor',isareos:'Isareos'}[id]??id;
  if(clock?.localBattleTiming==='scheduled'){
    if(pending.kind==='roadside'||pending.duel?.status==='accepted'||!final&&!pending.fieldBattleAvailable)return 'Adventure time is held while you fight. This phase adds no time; completing the main battle advances the campaign to its scheduled end. Reading or declining this invitation costs no time.';
    const deadline=elapsedTimeLabel(battle.endsAt??(pending.endsOn??battle.endsOn)*(clock.secondsPerDay??60));
    return `Adventure time is held while you fight. Completing the main battle at ${place} advances the campaign to ${deadline}, its scheduled end. Other armies, supplies and battles progress during that interval. A champion duel alone, withdrawing, or staying out adds no time. Reading this invitation costs no time.`;
  }
  if(pending.fieldBattleAvailable||pending.rally?.direct)return `Adventure time is held while you fight. Completing the battle settles ${place} at the current adventure time. Other armies do not advance.`;
  return final
    ?`Adventure time is held while you fight. Recording the final assault settles ${place} now, at the current adventure time. Other armies do not advance.`
    :'Adventure time is held while you fight. Recording this phase keeps the current adventure time; regrouping for the final assault adds no hidden wait.';
}
