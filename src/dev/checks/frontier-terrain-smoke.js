import {YUNETHRE_TOWN,YUNETHRE_CAMP} from '../../content/regions/minora-frontier/yunethre-world.js';
import {PEAKS} from '../../content/regions/west-lotharn/west-lotharn-world.js';
const frame=()=>new Promise(r=>requestAnimationFrame(r));
const views={
  laketown:{p:YUNETHRE_TOWN,c:{yaw:.6,pitch:.52,distance:95}},
  camp:{p:YUNETHRE_CAMP,c:{yaw:-.5,pitch:.45,distance:105}},
  meneth:{p:{x:-1850,z:-206},c:{yaw:.7,pitch:.42,distance:180}},
  menethGround:{p:{x:-1850,z:-206},c:{yaw:.7,pitch:.22,distance:11}},
  vastos:{p:{x:-1520,z:-330},c:{yaw:-.4,pitch:.4,distance:180}},
  vastosGround:{p:{x:-1520,z:-330},c:{yaw:-.4,pitch:.22,distance:11}},
  lotharn:{p:{x:PEAKS[0].x-220,z:PEAKS[0].z+250},c:{yaw:.5,pitch:.3,distance:250}},
  lotharnGround:{p:{x:PEAKS[0].x-220,z:PEAKS[0].z+250},c:{yaw:.5,pitch:.2,distance:11}},
};
export async function view(a,name){
  const v=views[name],start=performance.now();await a.visit(v.p);a.look(v.c);
  window.dispatchEvent(new Event('focus'));a.resume();
  for(let i=0;i<45;i++)await frame();
  const loadMs=performance.now()-start,times=[];let last=performance.now();
  for(let i=0;i<150;i++){await frame();const now=performance.now();times.push(now-last);last=now;}
  times.sort((a,b)=>a-b);
  if(a.state().frameErrors.length)throw Error(JSON.stringify(a.state().frameErrors));
  return {name,loadMs,position:a.state().position,camera:v.c,render:a.renderStats(),medianMs:times[75],p95Ms:times[142]};
}
