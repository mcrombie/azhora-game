import {prepareWarExterior} from './tower-smoke.js';
const assert=(v,m)=>{if(!v)throw Error(m);};

function sample(api){
  api.war?.pause();for(let i=0;i<15;i++)api.step(1/60);
  const observer=new MutationObserver(()=>{}),costs=[];
  observer.observe(document.body,{subtree:true,attributes:true,childList:true,characterData:true});
  for(let i=0;i<90;i++){const at=performance.now();api.step(1/60);costs.push(performance.now()-at);}
  const records=observer.takeRecords();observer.disconnect();const groups={};
  for(const r of records){const key=(r.target.id||r.target.parentElement?.id||r.target.nodeName)+' / '+(r.attributeName??r.type);groups[key]=(groups[key]??0)+1;}
  costs.sort((a,b)=>a-b);
  return {frames:90,cpuMedianMs:costs[45],cpuP95Ms:costs[85],domMutations:records.length,topMutations:Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,12),render:api.renderStats()};
}

export async function profile(api){
  const tower=sample(api);await prepareWarExterior(api);await api.visit({x:-2365,z:147});api.look({yaw:.4,pitch:.2,distance:10});
  const outdoors=sample(api);api.war.trackCouncil('council');const guided=sample(api);
  assert(!api.state().frameErrors.length,'No frame errors during session profile');
  return {tower,outdoors,guided,checks:['Fixed 90-frame samples in chamber, Minora, and with a navigation marker','Renderer and HUD mutation costs recorded']};
}

export function profileCombat(api){
  const combat=sample(api);
  assert(!api.state().frameErrors.length,'No frame errors during combat profile');
  return {combat,checks:['Fixed 90-frame combat HUD sample; background-window pause may hold simulation']};
}
