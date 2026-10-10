import * as preview from './lookout-preview-smoke.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.floor(sorted.length*.95)]};};

async function sample(a,name){
  for(let i=0;i<60;i++)await frame();
  const intervals=[];let previous=await frame();
  for(let i=0;i<120;i++){const now=await frame();intervals.push(now-previous);previous=now;}
  const cpu=[];let render;
  for(let i=0;i<30;i++){await frame();render=a.renderStats();cpu.push(render.cpuMs);}
  assert(!a.state().frameErrors.length,'No lookout frame errors');
  return {name,readyMs:a.state().readyMs,panorama:a.tower.state().panorama,exteriorLoaded:a.tower.state().exteriorLoaded,
    startup:a.testWorld.startup,render,cpuMs:summary(cpu),frameMs:summary(intervals),heap:performance.memory?.usedJSHeapSize};
}
export async function river(a){preview.river(a);return sample(a,'river');}
export async function ambron(a){preview.east(a);return sample(a,'ambron');}
export async function pyra(a){document.getElementById('tower-next').click();document.getElementById('tower-next').click();assert(a.tower.lookoutState().view==='pyros','Pyra tour viewpoint');return sample(a,'pyra');}
export async function north(a){document.getElementById('tower-next').click();document.getElementById('tower-next').click();document.getElementById('tower-next').click();assert(a.tower.lookoutState().view==='west-lotharn','North tour viewpoint');return sample(a,'north');}
