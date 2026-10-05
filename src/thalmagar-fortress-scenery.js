import { createThalmagarWorld } from './thalmagar-world.js';
import { THALMAGAR_FORTRESS as site } from './thalmagar-fortress-site.js';

/** Reuse the authored architecture, without the isolated study's sea, sky or terrain. */
export function* createThalmagarFortressSteps({parent,colliders}) {
  yield;
  const castle=createThalmagarWorld(parent,{fortressOnly:true});
  castle.root.position.set(site.x,site.floor-65,site.z+174);
  castle.root.rotation.y=site.yaw;
  const place=(x,z)=>({x:site.x+x,z:site.z+z+174});
  const push=(x,z,data)=>colliders.push({...place(x,z),minY:site.floor-1,...data,kind:'thalmagar-fortress'});
  const wall=(a,b,height=25)=>{
    const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2);
    for(let i=0;i<=n;i++)push(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,{r:2.15,maxY:site.floor+height});
  };
  const corners=Array.from({length:10},(_,i)=>{const a=(i+.5)/10*Math.PI*2;return[Math.sin(a)*67,-174+Math.cos(a)*58];});
  for(let i=0;i<10;i++){
    const a=corners[i],b=corners[(i+1)%10];
    if(i===9){wall(a,[-12,-118.84],24);wall([12,-118.84],b,24);}else wall(a,b,22+i%2*3);
    push(...a,{r:i===0||i===9?6.7:5.4,maxY:site.floor+(i===0||i===9?39:27+i%3*5)});
  }
  // Match the visible closed iron doors and gate piers. No invented invisible entrance barrier.
  push(0,-126,{hx:7.5,hz:.3,maxY:site.floor+24});
  for(const side of [-1,1])push(side*13,-113,{hx:4,hz:6.5,maxY:site.floor+33});
  push(0,-174,{r:42,maxY:site.floor+16});
  for(const side of [-1,1])push(side*31,-157+side*9,{hx:7.5,hz:18,maxY:site.floor+29});
  yield;
  return castle;
}
