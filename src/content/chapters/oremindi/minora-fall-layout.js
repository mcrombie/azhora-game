import {MENORA_GATES,MENORA_OUTLINE} from '../../regions/minora-frontier/menora-city.js';

const freeze=Object.freeze,point=(x,z)=>freeze({x,z});
const gate=MENORA_GATES.find(g=>g.id==='menora-west-gate');
export const MINORA_FALL_DURATION=58;
export const MINORA_FALL_LAYOUT=freeze({
 region:16,gate,
 // The cleared western field, Muster approach and Temple Way are real city
 // routes. A narrow column stays inside their gates and bridge parapets.
 march:freeze([point(-2470,45),point(-2470,148),point(gate.x,148),point(-2404,148),point(-2334,148)]),
 heads:freeze([point(-2452,139),point(-2458,139),point(-2464,157),point(-2453,157)]),
 perch:freeze({x:-2473,z:153,height:2.25}),
 birdStart:freeze({x:-2414,y:159,z:42}),
 gates:freeze(MENORA_GATES.map(g=>{
  const a=MENORA_OUTLINE[g.edge],b=MENORA_OUTLINE[(g.edge+1)%MENORA_OUTLINE.length];
  return freeze({...g,yaw:Math.atan2(b.x-a.x,b.z-a.z)-Math.PI/2});
 })),
 shots:freeze([
  freeze({id:'column',start:0,end:12,position:freeze({x:-2500,y:49,z:173}),target:freeze({x:-2469,y:23,z:117}),
   caption:'The Blood Prince returns',detail:'Black and crimson standards advance along Minora’s western approach.'}),
  freeze({id:'gate',start:12,end:28,position:freeze({x:-2467,y:31,z:170}),target:freeze({x:-2437,y:23,z:148}),
   caption:'The Muster Gate falls',detail:'The city’s defenders give ground as Wilhelm’s ranks force their way through.'}),
  freeze({id:'standards',start:28,end:42,position:freeze({x:-2474,y:58,z:185}),target:freeze({x:-2438,y:46,z:148}),
   caption:'The council’s banners are taken down',detail:'The Blood Prince’s standard flies over the occupied city. The League has fallen.'}),
  freeze({id:'messenger',start:42,end:58,position:freeze({x:-2480,y:25.5,z:160}),target:freeze({x:-2473,y:23.7,z:153}),
   caption:'A voice from the Wizard Guild',detail:'A messenger comes to the western road. Taleth and the Guild have escaped.'}),
 ]),
});

export function minoraMarchPoint(distance,lateral=0){
 const points=MINORA_FALL_LAYOUT.march;let left=Math.max(0,distance);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  if(left<=length||i===points.length-1){const t=Math.min(1,left/length);return {
   x:a.x+dx*t+dz/length*lateral,z:a.z+dz*t-dx/length*lateral,heading:Math.atan2(dx,dz)};}
  left-=length;
 }
}
