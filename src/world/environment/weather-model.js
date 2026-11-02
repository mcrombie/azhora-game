/** Deterministic local atmosphere, sampled from saved active exploration time.
 * No campaign state, real-world clock, random generator or rendering dependency. */
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const BLOCK_SECONDS=7200,SPELLS=32;
const KINDS=['clear','partly-cloudy','cloudy','overcast','rain'];
const LABELS=['Clear','Partly cloudy','Cloudy','Overcast','Rain'];
const BASES=[
  {cloudCover:.045,rain:0,wind:.10,overcast:0},
  {cloudCover:.31,rain:0,wind:.20,overcast:.04},
  {cloudCover:.63,rain:0,wind:.30,overcast:.28},
  {cloudCover:.92,rain:0,wind:.42,overcast:.85},
  {cloudCover:.99,rain:.72,wind:.56,overcast:1},
];
export const WEATHER_KINDS=Object.freeze([...KINDS]);
const schedules=new Map();
function random(block,index,salt=0) {
  let value=(Math.imul(block|0,0x45d9f3b)^Math.imul(index+19,0x27d4eb2d)^Math.imul(salt+7,0x165667b1))>>>0;
  value=Math.imul(value^(value>>>16),0x7feb352d);value=Math.imul(value^(value>>>15),0x846ca68b);
  return((value^(value>>>16))>>>0)/4294967296;
}
function climateName(value){return value==='wet'?'wet':value==='desert'||value==='arid'||value==='dry'?'desert':'temperate';}

/** Uses the existing atlas names and climate/palette hints without importing
 * the large terrain graph. True deserts and the named dry belt get no rain in
 * this first pass; humid woods and wetlands receive more wet weather. */
export function weatherClimate(region) {
  if(typeof region==='string')region={name:region};
  const name=String(region?.name??region?.label??''),code=String(region?.climate?.code??region?.climate??'');
  if(/desert|navarth|ovesos|telemonia|ganesh plain/i.test(name)||/^BW|^BSh/i.test(code)||
    [25,26,39,41,42,43,44,45,46,55,58].includes(region?.id))return'desert';
  if(/drent|luscia|ibenwood|acor|endevor|yunethre|wetland|rainforest/i.test(name)||/^Af|^Am/i.test(code)||
    [1,2,32,33,34,35,36,38,71,72,73,74,75,76,77,78,79].includes(region?.id)||region?.palette?.hazeDensity>=.006)return'wet';
  return'temperate';
}

function values(kind,block,index,climate) {
  const base=BASES[kind],jitter=random(block,index,2)-.5;
  const wind=clamp(base.wind+jitter*.07),angle=.65+(random(block,index,3)-.5)*.75;
  return {kind:KINDS[kind],label:LABELS[kind],cloudCover:clamp(base.cloudCover+jitter*.035),
    rain:base.rain?clamp(base.rain+jitter*.25+(climate==='wet'?.08:0)):0,
    wind,windX:Math.cos(angle)*wind,windZ:Math.sin(angle)*wind,overcast:base.overcast};
}
function schedule(block,climate) {
  const key=block+':'+climate;if(schedules.has(key))return schedules.get(key);
  const list=[],max=climate==='desert'?2:4;
  let kind=1,start=block*BLOCK_SECONDS;
  for(let i=0;i<SPELLS;i++) {
    if(i) {
      // The opening has a readable fair/cloudy/wet/clearing spell within its
      // first fifteen active minutes. Later blocks vary their adjacent walks.
      const opening=[1,2,3,4,3,2,1];
      if(block===0&&i<opening.length&&climate!=='desert')kind=opening[i];
      else {
        const wetter=climate==='wet'?.66:climate==='desert'?.24:.52;
        kind=kind===0?1:kind===max?max-1:kind+(random(block,i,climate==='wet'?6:5)<wetter?1:-1);
      }
      // End each block at clear; the next begins one adjacent step away.
      if(kind>SPELLS-1-i)kind=SPELLS-1-i;
    }
    const offset=(random(block,Math.floor(i/2),1)-.5)*120;
    const duration=225+(i%2?-offset:offset),transitionSeconds=25+random(block,i,4)*20;
    list.push({...values(kind,block,i,climate),start,end:start+duration,transitionSeconds});start+=duration;
  }
  if(schedules.size>=12)schedules.delete(schedules.keys().next().value);
  schedules.set(key,list);return list;
}

export function weatherSample(seconds,{climate='temperate',override=null}={}) {
  const time=Number.isFinite(seconds)?Math.max(0,seconds):0;
  climate=climateName(climate);
  const forced=typeof override==='string'?override:override?.kind,forcedIndex=KINDS.indexOf(forced);
  if(forcedIndex>=0) {
    const base=BASES[forcedIndex],angle=.65;
    return {...base,kind:forced,label:LABELS[forcedIndex],windX:Math.cos(angle)*base.wind,windZ:Math.sin(angle)*base.wind,
      climate,transition:1,from:forced,to:forced,spellStart:time,spellEnd:time,transitionSeconds:0,override:true};
  }
  const block=Math.floor(time/BLOCK_SECONDS),list=schedule(block,climate);
  const index=Math.max(0,list.findIndex(spell=>time<spell.end));
  const target=list[index],from=index?list[index-1]:block? schedule(block-1,climate).at(-1):target;
  const transition=clamp((time-target.start)/target.transitionSeconds),t=smooth(transition),named=t<.5?from:target;
  const result={kind:named.kind,label:named.label,climate,transition,from:from.kind,to:target.kind,
    spellStart:target.start,spellEnd:target.end,transitionSeconds:target.transitionSeconds,override:false};
  for(const key of ['cloudCover','rain','wind','windX','windZ','overcast'])result[key]=mix(from[key],target[key],t);
  return result;
}
