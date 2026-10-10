/** Small, static architectural parts. Cities supply their own palette and placement;
 * this module knows nothing about countries, quests or residents. */
import {createSceneryBuilder} from './scenery-builder.js';

export function cityLantern(b,p,x,y,z,scale=1){
  b.frame(x,y,z,0,()=>{
    const s=scale;
    b.block(p.metal,0,0,0,.42*s,.12*s,.42*s);
    b.block('#ddc78e',0,.12*s,0,.27*s,.55*s,.27*s);
    for(const dx of [-1,1])for(const dz of [-1,1])b.block(p.metal,dx*.17*s,.1*s,dz*.17*s,.055*s,.61*s,.055*s);
    b.cone(p.metal,0,.71*s,0,.34*s,.27*s,Math.PI/4,4);
    b.beam(p.metal,[-.12*s,1.04*s,0],[.12*s,1.04*s,0],.045*s);
  });
}

export function flowerBox(b,p,x,y,z,width=2){
  b.block(p.pot,x,y,z,width,.36,.48);
  b.box(p.trim,x,y+.06,z,width+.08,.1,.54);
  for(let i=0;i<5;i++){
    const xx=x+(i-2)*width/5;
    b.rock(p.leaf,xx,y+.42,z,.29,.24,.32);
    if(i%2===0)b.rock(p.flower,xx+.04,y+.57,z-.03,.12,.11,.13);
  }
}

export function cityMedallion(b,p,x,y,z,r=1,kind='sun'){
  // Twelve-sided bronze wreath, with a different civic device in each city.
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,c=(i+1)*Math.PI/6;
    b.beam(p.metal,[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(c)*r,y+Math.sin(c)*r,z],.09);
  }
  if(kind==='book'){
    for(const side of [-1,1])b.sheet(p.trim,[x,y-.32*r,z+.05],[x+side*.7*r,y-.15*r,z+.05],[x+side*.7*r,y+.45*r,z+.05],[x,y+.3*r,z+.05]);
    b.beam(p.metal,[x,y-.4*r,z+.08],[x,y+.4*r,z+.08],.08);
  }else if(kind==='oar'){
    for(const s of [-1,1]){b.beam(p.trim,[x-s*.5*r,y-.6*r,z],[x+s*.55*r,y+.6*r,z],.1);b.rock(p.metal,x+s*.5*r,y+.55*r,z,.16,.3,.05);}
  }else if(kind==='reed'){
    for(let i=-1;i<=1;i++){b.beam(p.metal,[x+i*.2*r,y-.6*r,z],[x+i*.28*r,y+.5*r,z],.075);b.rock(p.trim,x+i*.28*r,y+.5*r,z,.08,.23,.045);}
  }else{
    b.rock(p.metal,x,y,z,.28*r,.28*r,.09);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;b.beam(p.trim,[x+Math.cos(a)*r*.43,y+Math.sin(a)*r*.43,z],[x+Math.cos(a)*r*.73,y+Math.sin(a)*r*.73,z],.07);}
  }
}

export function stripedAwning(b,p,x,y,z,width=3,depth=1.4){
  const n=Math.max(4,Math.round(width/.55));
  for(let i=0;i<n;i++){
    const x0=x-width/2+width*i/n,x1=x-width/2+width*(i+1)/n,c=i%2?p.cloth:p.trim;
    b.sheet(c,[x0,y,z],[x1,y,z],[x1,y-.32,z+depth],[x0,y-.32,z+depth]);
    b.sheet(c,[x0,y-.32,z+depth],[x1,y-.32,z+depth],[x1,y-.57,z+depth],[x0,y-.57,z+depth]);
  }
  for(const s of [-1,1])b.beam(p.metal,[x+s*width/2,y-.9,z],[x+s*width/2,y-.36,z+depth],.075);
}

/** A flowered balcony entirely above a pedestrian's head. */
export function littleBalcony(b,p,x,y,z,width=2.6){
  b.box(p.trim,x,y,z+.45,width,.19,1.05);
  for(const dx of [-width*.36,width*.36])b.beam(p.stone,[x+dx,y-1,z],[x+dx,y-.12,z+.85],.18);
  for(let i=0;i<=6;i++)b.block(p.metal,x-width/2+width*i/6,y+.08,z+.92,.065,.85,.07);
  b.box(p.metal,x,y+.95,z+.92,width+.06,.1,.1);
  for(const side of [-1,1])b.box(p.metal,x+side*width/2,y+.95,z+.45,.1,.1,.98);
  flowerBox(b,p,x,y+.27,z+.97,width*.65);
}

export function planterTree(b,p,x,y,z,index=0){
  b.cylinder(p.stone,x,y-.1,z,1.05,.65,Math.PI/7);
  b.cylinder(p.trim,x,y+.55,z,1.12,.18,Math.PI/7);
  b.cylinder('#635745',x,y+.73,z,.95,.06);
  const tall=p.tree==='cypress',palm=p.tree==='palm';
  b.cylinder(p.wood,x,y+.6,z,palm?.23:.16,palm?5.6:tall?3.8:3.1);
  if(palm){
    for(let h=1;h<5.8;h+=.45)b.cylinder(p.pot,x,y+h,z,.25,.08);
    b.rock(p.leaf,x,y+6.15,z,.45,.65,.45);
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9+index*.3,dx=Math.cos(a),dz=Math.sin(a),nx=-dz,nz=dx;
      const start=[x,y+6.2,z],mid=[x+dx*1.35,y+6.55,z+dz*1.35],end=[x+dx*2.8,y+5.55,z+dz*2.8];
      const left=[mid[0]+nx*.36,mid[1],mid[2]+nz*.36],right=[mid[0]-nx*.36,mid[1],mid[2]-nz*.36];
      b.sheet(i%2?p.leaf:p.leafLight,start,left,end,right);
      b.beam(p.leafLight,start,mid,.045);b.beam(p.leafLight,mid,end,.035);
    }
    for(const dx of [-.3,.3])b.rock('#94733e',x+dx,y+5.7,z+.24,.22,.48,.22);
  }else if(tall){b.cone(p.leaf,x,y+2,z,1.13,4.8);b.cone(p.leafLight,x,y+4.2,z,.75,3.2);}
  else{
    b.rock(p.leaf,x-.6,y+3.4,z,.95,1.3,1.2);
    b.rock(p.leafLight,x+.5,y+4.1,z-.22,1.1,1.4,1.15);
    b.rock(p.leaf,x,y+4,z+.55,1.2,1.15,1);
    if(p.tree==='blossom')for(let i=0;i<5;i++){const a=i*Math.PI*.4;b.rock(p.flower,x+Math.cos(a)*.85,y+4.6+(i%2)*.4,z+Math.sin(a)*.8,.42,.28,.4);}
    if(p.tree==='citrus')for(let i=0;i<6;i++){const a=i*Math.PI/3;b.rock('#d8a342',x+Math.cos(a)*1.05,y+3.7+(i%2)*.5,z+Math.sin(a),.12,.14,.12);}
  }
  for(let i=0;i<4;i++){const a=i*Math.PI/2+index;b.rock(p.leafLight,x+Math.cos(a)*.65,y+.9,z+Math.sin(a)*.65,.27,.16,.28);}
}

const segmentDistance=(x,z,a,c)=>{
  const dx=c.x-a.x,dz=c.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
};

/** Fit furnishings beside authored streets. Ground-level geometry is checked
 * against every existing solid, water, gate and street before it is emitted.
 * Returned placements make these clearances inspectable in tests and previews. */
export function* createCityStreetDetail({root,colliders,heightAt,paths,palette:p,id,inside=()=>true,dry=()=>true,protectedPoints=[],spacing=14}){
  const b=createSceneryBuilder(`${id} - planted streets and lanterns`),placements=[];
  const segments=paths.flatMap(s=>s.points.slice(1).map((c,i)=>({a:s.points[i],c,half:s.width/2})));
  const clear=(x,z,r)=>{
    const y=heightAt(x,z);
    if(!Number.isFinite(y)||!inside(x,z,r)||!dry(x,z,r))return false;
    if(protectedPoints.some(q=>Math.hypot(x-q.x,z-q.z)<r+(q.radius??4)))return false;
    if(segments.some(s=>segmentDistance(x,z,s.a,s.c)<s.half+r+.65))return false;
    if(colliders.some(c=>!(c.minY>y+2.8||c.maxY<y-.3)&&(c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+r+.65:Math.hypot(Math.max(0,Math.abs(x-c.x)-(c.hx??c.width/2??0)),Math.max(0,Math.abs(z-c.z)-(c.hz??c.depth/2??0)))<r+.65)))return false;
    return [-1,1].every(s=>Math.abs(heightAt(x+s*r,z)-y)<.4&&Math.abs(heightAt(x,z+s*r)-y)<.4);
  };
  for(const [k,s] of segments.entries()){
    yield;
    const dx=s.c.x-s.a.x,dz=s.c.z-s.a.z,len=Math.hypot(dx,dz);if(len<5)continue;
    for(let at=5;at<len-2;at+=spacing)for(const side of [-1,1]){
      const type=(Math.round(at/spacing)+k+(side>0?1:0))%3===0?'lamp':'tree',r=type==='tree'?1.2:.35;
      for(const extra of [0,1.6,3.2]){
        const off=side*(s.half+r+1+extra),x=s.a.x+dx/len*at-dz/len*off,z=s.a.z+dz/len*at+dx/len*off;
        if(!clear(x,z,r)||placements.some(q=>Math.hypot(q.x-x,q.z-z)<6))continue;
        const y=heightAt(x,z),index=placements.length;
        if(type==='tree')planterTree(b,p,x,y,z,index);
        else{
          b.cylinder(p.stone,x,y,z,.34,.6);b.cylinder(p.metal,x,y+.5,z,.1,3.8);
          b.beam(p.metal,[x,y+4.2,z],[x+.6,y+4.2,z],.1);cityLantern(b,p,x+.55,y+3.3,z,.85);
        }
        colliders.push({id:`${id}-street-${index}`,kind:'city-furnishing',x,z,r,minY:y-.1,maxY:y+(type==='tree'?.85:4.4)});
        placements.push({x,z,y,r,type});break;
      }
    }
  }
  const mesh=yield* b.finishSteps(root);
  if(mesh)mesh.userData.cityDetail=placements;
  return {placements,vertices:b.vertexCount,batches:mesh?1:0};
}
