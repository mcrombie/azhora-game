import {CARICAS_BUILDINGS,CARICAS_ROADS} from './caricas-settlement.js';
import {groundFace} from '../../../world/scenery/ground-face.js';

// One continuous street opens into the grain court. Shared cross-sections close
// bends; there is no stack of overlapping road rectangles under the square.
const main=CARICAS_ROADS[0];
const routes=[
  [...main.points.slice(1,-1).map(p=>({...p,width:5})),
    {x:-2092,z:248,width:7},{x:-2092,z:255,width:23},
    {x:-2092,z:276,width:23},{x:-2092,z:283,width:7},{x:-2092,z:302,width:5}],
  CARICAS_ROADS[1].points.map(p=>({...p,width:3.2})),
  [{x:-2080.5,z:263,width:2.8},...CARICAS_ROADS[2].points.slice(1).map(p=>({...p,width:2.8}))],
  ...CARICAS_BUILDINGS.map(b=>{
    const side=b.x<-2092?1:-1,edge=b.x+side*(b.w/2+.1);
    return [{x:edge,z:b.z,width:2.2},{x:-2092,z:b.z,width:2.2}];
  }).filter((_,i)=>i!==7),
  [{x:-2092,z:302,width:3},{x:-2092,z:309.5,width:3}],
];
const point=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
export function caricasPavingAt(x,z){
  if(x<-2155||x>-1905||z<131||z>358)return false;
  return routes.some(line=>line.slice(1).some((b,i)=>{
    const a=line[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<(a.width+(b.width-a.width)*t)/2+.15;
  }));
}

function section(line,i){
  const p=line[i],a=line[Math.max(0,i-1)],b=line[Math.min(line.length-1,i+1)];
  const normal=(u,v)=>{const d=Math.hypot(v.x-u.x,v.z-u.z);return {x:-(v.z-u.z)/d,z:(v.x-u.x)/d};};
  const n=i===0?normal(p,b):i===line.length-1?normal(a,p):normal(a,p),m=i===line.length-1?n:normal(p,b);
  const dot=1+n.x*m.x+n.z*m.z,k=p.width/2/Math.max(.5,dot);
  return {left:{x:p.x+(n.x+m.x)*k,z:p.z+(n.z+m.z)*k},right:{x:p.x-(n.x+m.x)*k,z:p.z-(n.z+m.z)*k}};
}
export function* caricasPaving(builder,heightAt,surface){
  for(const [route,line] of routes.entries()){
    const sections=line.map((_,i)=>section(line,i));
    for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2);
      for(let j=0;j<n;j++){
        yield;
        const s=sections[i-1],e=sections[i],left=point(s.left,e.left,j/n),right=point(s.right,e.right,j/n);
        const nextLeft=point(s.left,e.left,(j+1)/n),nextRight=point(s.right,e.right,(j+1)/n);
        const cols=Math.max(2,Math.round((a.width+b.width)/4));
        for(let col=0;col<cols;col++){
          const pts=[point(left,right,col/cols),point(nextLeft,nextRight,col/cols),
            point(nextLeft,nextRight,(col+1)/cols),point(left,right,(col+1)/cols)];
          const z=(a.z+b.z)/2,stone=route===0&&z>214||route>2||route===1&&i===1||route===2&&i===1;
          const tint=stone?['#bdb79b','#c4bea2','#bab498'][(j+col+i)%3]:['#b5a780','#b8aa83','#b2a47e'][(j+i)%3];
          yield* groundFace(builder,tint,pts,heightAt,surface,.065+(route>2?.006:0));
        }
      }
    }
  }
}
