// Adventure time counts active seconds; it is not a campaign calendar date.
const seconds=value=>Number.isFinite(value)?Math.max(0,value):0;

export function elapsedTimeLabel(value=0){
  const whole=Math.floor(seconds(value)+1e-8);
  return `${String(Math.floor(whole/60)).padStart(2,'0')}:${String(whole%60).padStart(2,'0')}`;
}

export const adventureTimeLabel=(value=0)=>`Adventure ${elapsedTimeLabel(value)}`;

export function durationLabel(value=0){
  const whole=Math.ceil(seconds(value));
  return `${Math.floor(whole/60)}m ${String(whole%60).padStart(2,'0')}s`;
}

export function openingCountdown(forecast){
  if(!forecast?.ok)return '';
  const remaining=durationLabel(forecast.remainingSeconds);
  if(forecast.kind==='campaign-orders')return `Next orders in ${remaining}`;
  if(forecast.regionName)return forecast.kind==='army-arrival'?`${forecast.regionName} · Army arrives in ${remaining}`:`${forecast.regionName} · Battle ends in ${remaining}`;
  return forecast.kind==='army-arrival'?`Battle begins in ${remaining}`:`Intervention window · ${remaining} remaining`;
}

export const waitActionLabel=kind=>kind==='battle-aftermath'?'Wait for the battle’s outcome':kind==='campaign-orders'?'Wait for the next orders':'Wait until the army arrives';
