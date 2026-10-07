import {interceptedStrength} from '../../simulation/reinforcements.js';
// Shared wording for the frozen encounter and its persistent campaign report.
export function interceptionReason(reason){
  return {
    'runner-arrived':'The surviving runners reached the blue enemy rally point.',
    'driven-back':'Your health reached zero. You were driven back from the reinforcement route.',
    'time-expired':'The 90-second interception window expired before you stopped the vanguard.',
    'vanguard-broken':'You stopped all three vanguard soldiers before anyone reached the enemy rally point.',
    'withdrew':'You withdrew from the interception. Soldiers already stopped still count.',
  }[reason]??'';
}
export function interceptionFeedback(state,{strength,endsOn,regionName='Caricas'}){
  const success=state.outcome==='success',down=state.guards.filter(g=>!g.hp).length,blocked=interceptedStrength(strength,down);
  return {
    title:success?'Reinforcements stopped':down?'Partial interception':'Interception failed',
    detail:`${interceptionReason(state.objective?.reason)} ${down} of 3 soldiers stopped. ${blocked} of ${strength} reinforcement strength removed; ${strength-blocked} remains available to the enemy. The larger battle is still underway until day ${endsOn}; control of ${regionName} has not changed.`,
  };
}
