import {commanderReport} from './commander-report.js';
// Scenario-local recovery state. Rewinds contain one bounded campaign checkpoint,
// never another afterlife record or any legacy adventure save.
export function validAfterlife(data,validateCheckpoint){
  if(data===undefined)return true;
  if(!data||data.version!==1||!['living','ghost','undead'].includes(data.form)||typeof data.inLimbo!=='boolean')return false;
  const d=data.death;
  if(!d)return data.form==='living'&&!data.inLimbo;
  return ['living','undead'].includes(d.previousForm)&&['east','west'].includes(d.side)
    &&(d.approach===undefined||d.approach==='duel'&&d.stage==='intercept')
    &&['intercept','rally'].includes(d.stage)&&['string','number'].includes(typeof d.battleId)
    &&typeof d.report==='string'&&d.report.length<8000
    &&d.fallen&&['x','y','z'].every(k=>Number.isFinite(d.fallen[k])&&Math.abs(d.fallen[k])<100000)
    &&d.before&&!Object.hasOwn(d.before,'afterlife')&&validateCheckpoint(d.before);
}

export function deathReport(state,battleId,scenario){
  const b=state.engagements.find(b=>b.id===battleId),result=state.events.find(e=>e.id===b?.resultId);
  if(!b||!result)throw Error('The battle has not resolved.');
  const name=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  const region=scenario.regions.find(r=>r.id===b.region)?.name??b.region;
  const hero=state.events.findLast(e=>e.type==='hero-result'&&e.battleId===b.id);
  const rally=state.events.findLast(e=>e.type==='rally-result'&&e.battleId===b.id);
  const winner=result.captured?result.attacker:result.defender;
  const opening=b.duel
    ?b.duel.outcome==='success'?'You won the champion duel, making two rally guards fall back. No enemy soldiers died in that duel.':b.duel.armyCommander?'Your challenge strengthened the opposing army?s morale. Their captain remained in command. No enemy soldiers died in the duel.':'Your challenge ended without a morale advantage. No enemy soldiers died in the duel.'
    :b.rally?.direct?'You joined your allies in the battle.':`Your interception removed ${b.heroResult?.objective?.blocked??hero?.objective?.blocked??0} enemy strength.`;
  return `You fell at ${region}. ${opening} ${commanderReport(b)}${rally?` Your rally assault removed ${b.rally?.removed??rally.removed} enemy strength.`:''} ${b.rally?.allied?`${b.rally.allied.lost} of your allied soldiers fell; ${b.rally.allied.routed} enemies retreated rather than died. `:''}Those efforts were not erased by your death. While you crossed here, the armies finished their battle: ${name(winner)} ${result.captured?'captured':'held'} ${region} on day ${state.day}. Your defeat and your army's fate are different things. Retry turns back this last fight; returning to the world keeps what happened. Take your time. No days pass while we speak.`;
}
