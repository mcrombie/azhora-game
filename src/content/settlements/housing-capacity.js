// A visible home represents several households at the compressed world scale.
// Distribute an authored accommodation budget by relative residential space,
// never by current population. There is no literal people-per-square-metre rule.
export function withHousingCapacity(buildings,capacity){
  if(!Number.isSafeInteger(capacity)||capacity<0)throw Error('Invalid regional housing budget.');
  const areas=buildings.map(b=>{
    if(b.kind!=='house')return 0;
    const storeys=b.storeys??1;
    if(!Number.isFinite(b.w)||b.w<=0||!Number.isFinite(b.d)||b.d<=0||!Number.isSafeInteger(storeys)||storeys<1)throw Error('Invalid residential footprint: '+b.id);
    const area=b.w*b.d*storeys;
    if(!Number.isFinite(area))throw Error('Invalid residential footprint: '+b.id);
    return area;
  });
  const weighted=buildings.map(b=>({...b,housingCapacity:0})),total=areas.reduce((n,area)=>n+area,0);
  if(!total){if(capacity)throw Error('Housing budget needs residential space.');return weighted;}
  // Apportion the authored regional budget by relative residential floor area.
  // Largest remainders preserve the exact total without favouring the last home.
  const shares=areas.map((area,i)=>({i,raw:area/total*capacity}));
  let remaining=capacity;
  for(const s of shares){weighted[s.i].housingCapacity=Math.floor(s.raw);remaining-=Math.floor(s.raw);}
  shares.sort((a,b)=>(b.raw%1)-(a.raw%1)||a.i-b.i);
  for(const s of shares.slice(0,remaining))weighted[s.i].housingCapacity++;
  return weighted;
}

export const housingCapacity=buildings=>buildings.reduce((total,b)=>total+b.housingCapacity,0);
