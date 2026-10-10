import {archedRecess} from './ambron-architecture.js';

const STONE='#c9c7b2',PALE='#dedac4',BRONZE='#a48653',IRON='#46585a',WOOD='#67513e';
const LEAF='#54775b',ROSE='#b38493',GOLD='#d6b970',GLASS='#c9cfa9';

export function ambronLantern(b,x,y,z,scale=1){
  b.frame(x,y,z,0,()=>{
    b.block(GLASS,0,0,0,.34*scale,.56*scale,.34*scale);
    for(const side of [-1,1])for(const end of [-1,1])b.block(IRON,side*.19*scale,-.04,end*.19*scale,.045*scale,.65*scale,.045*scale);
    b.box(BRONZE,0,-.04,0,.5*scale,.12*scale,.5*scale);
    b.cone(IRON,0,.6*scale,0,.37*scale,.28*scale,Math.PI/4,4);
    b.cone(BRONZE,0,.88*scale,0,.1*scale,.2*scale);
  });
}

function flowerBox(b,x,y,z,w,variant=0){
  b.block(variant%2?STONE:WOOD,x,y,z,w,.3,.44);
  b.box('#495f41',x,y+.32,z,w-.15,.1,.34);
  for(let i=0;i<5;i++){
    const px=x-w*.4+w*.8*i/4;
    b.rock(LEAF,px,y+.48,z,.28,.2,.23,i);
    b.rock((i+variant)%3?ROSE:GOLD,px+.07,y+.61,z+.07,.12,.12,.12,i);
  }
}

/** An extra pass on anonymous tenements. Above-head details add depth without
 * narrowing the streets or changing any named character's authored home. */
export function decorateAmbronHome(b,e,index){
  if(!e.id.includes('-townhouse-')||e.kind==='shed')return false;
  const {w,d,h}=e,top=h+1.1;
  const [sx,sz]={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]}[e.door]??[0,1];
  b.frame(sx*w/2,0,sz*d/2,Math.atan2(sx,sz),()=>{
    // Recessed joinery gives the street door its own scale within a tall facade.
    for(const side of [-1,1])b.block(PALE,side*.91,1.08,.1,.18,2.65,.24);
    b.box(PALE,0,3.8,.12,2.1,.24,.3);
    for(const x of [-.43,0,.43])b.block('#897052',x,1.2,.14,.07,2.1,.06);
    b.box(BRONZE,.47,2.1,.21,.12,.16,.07);
    b.beam(IRON,[1.6,3.8,0],[1.6,3.8,.55],.08);
    ambronLantern(b,1.6,3.02,.53,.72);
  });
  if(h>10&&index%3===1){
    const width=Math.min(w-1,4.6),z=d/2+.55,y=6.95;
    b.box(PALE,0,y,z,width,.27,1.15);
    for(const side of [-1,1]){
      b.beam(STONE,[side*(width/2-.35),y-1,d/2],[side*(width/2-.35),y-.15,d/2+1.1],.25);
      b.block(IRON,side*width/2,y+.1,z,.08,.85,1.05);
    }
    for(let x=-width/2;x<=width/2;x+=.45)b.block(IRON,x,y+.1,d/2+1.1,.045,.82,.045);
    b.box(BRONZE,0,y+.95,d/2+1.1,width+.15,.08,.11);
    flowerBox(b,-width*.27,y+.95,d/2+1.04,width*.4,index);
  }else if(h>7){
    for(const side of [-1,1])b.frame(0,0,side*(d/2+.3),side<0?Math.PI:0,()=>flowerBox(b,0,6.55,0,Math.min(w*.65,3.3),index));
  }
  // A quieter second accent higher on the taller townhouses.
  if(h>20&&index%2===0)flowerBox(b,w*.22,14.6,d/2+.3,1.65,index+1);
  if(index%4===0){
    const yaw=w>=d?Math.PI/2:0,rise=Math.min(w,d)*.42;
    b.frame(0,top,0,yaw,()=>{
      const x=(w+1.1)*.24,y=rise*.52;
      b.block(STONE,x,y-.1,0,1.4,1.3,1.65);
      b.roof('#616f70',x,y+1.2,0,1.75,1.85,.6,Math.PI/2,PALE);
      archedRecess(b,x+.73,y+.2,0,.8,.85,Math.PI/2,PALE);
    });
  }
  if(Math.min(w,d)<10){
    b.box(PALE,w*.28,top+2.84,d*.2,1.1,.2,1.1);
    for(const dx of [-.23,.23])b.cylinder('#98735a',w*.28+dx,top+2.94,d*.2,.15,.45);
  }
  // Occasional bands of individually jointed masonry keep the plain walls from
  // feeling like identical extruded blocks, without a texture or new material.
  for(const side of [-1,1])for(let x=-w/2+.2;x<w/2;x+=1.2){
    b.block(index%2?'#aeb19e':'#b7b59e',x,1.25,side*(d/2+.015),1.04,.42,.035);
  }
  return true;
}
