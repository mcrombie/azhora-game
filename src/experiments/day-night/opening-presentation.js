import {elapsedTimeLabel,adventureTimeLabel} from './opening-time-label.js';

// Elapsed campaigns use the ordinary strategic ledger's ticks as minutes.
// Historical lore is never sent through this presentation adapter.
export function openingTimelineText(text,clock){
  if(!clock?.sharedOpening||typeof text!=='string')return text;
  const presented=text.replace(/\bon day[- ](\d+)\b/gi,(_,day)=>`at ${elapsedTimeLabel(Number(day)*60)}`)
    .replace(/\bday[- ](\d+)\b/gi,(_,day)=>elapsedTimeLabel(Number(day)*60))
    .replace(/\b(\d+) days? away\b/g,(_,n)=>`${n} minutes away`)
    .replace(/\b(\d+) days?\b/g,(_,n)=>`${n} ${n==='1'?'minute':'minutes'}`)
    .replace(/\bdaily estimates\b/gi,'strategic estimates')
    .replace(/\bper day\b/g,'per strategic minute');
  return clock.fullCampaign?presented.replace('Wait advances up to seven days and pauses at the next known front.','Rest on quiet ground to preview a wait to the next event.'):presented;
}
export function openingReport(report,clock){
  if(!report||!clock?.sharedOpening)return report;
  const convert=value=>{
    if(typeof value==='string')return openingTimelineText(value,clock);
    if(Array.isArray(value))return value.map(convert);
    if(!value||typeof value!=='object')return value;
    const result=Object.fromEntries(Object.entries(value).map(([key,v])=>[key,convert(v)]));
    // A completed event can occur between strategic ticks. Its receipt must
    // use the recorded timestamp, not the integer order tick or today's clock.
    if(Number.isFinite(value.elapsedSeconds)&&Array.isArray(result.facts))result.facts=result.facts.map(fact=>fact[0]==='Resolved'?['Resolved',adventureTimeLabel(value.elapsedSeconds)]:fact);
    return result;
  };
  return convert(report);
}

export function openingDeathReport(state,battle,clock){
  const result=state.events.find(e=>e.id===battle?.resultId),side=result&&(result.captured?result.attacker:result.defender);
  const id=battle?.region??state.hero?.region,place={caricas:'Caricas',ovesos:'Ovesos',nethereum:'Nethereum',nesdor:'Nesdor',isareos:'Isareos'}[id]??id??'the battlefield';
  const outcome=result?`${side==='west'?'West Lizeem':'East Lizeem'} holds ${place} after this assault.`:`The battle at ${place} remains underway. Your recorded contribution is kept.`;
  if(clock.localBattleTiming==='scheduled'&&result){
    const finished=result.elapsedSeconds??battle.resolvedAt??battle.endsOn*(clock.secondsPerDay??60);
    return `You fell during the battle at ${place}. ${outcome} Campaign time advanced to the scheduled battle end, Adventure ${elapsedTimeLabel(finished)}. Other armies, supplies and battles progressed during that interval; their developments are in the war log. Time is held while you read this report. Retry restores your position and campaign time before this fight. Returning to the world keeps what happened.`;
  }
  return `You fell at ${place} at Adventure ${elapsedTimeLabel(clock.elapsedSeconds)}. ${outcome} Adventure time is held here; no other armies advanced while you fought. Retry restores your position before this fight. Returning to the world keeps what happened.`;
}
