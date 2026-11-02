// Elvish coastal craft: ash-coloured stone, slender timber ribs, pointed
// openings and swept shingle roofs. No hovering buildings or modern materials.
export const IBEN_PALETTE=Object.freeze({stone:'#d4d8c3',shade:'#a6b4a1',light:'#ecedd7',wood:'#6a6550',
  timber:'#938c70',roof:'#42786e',dark:'#293f3d',trim:'#b8c89c',glass:'#568e8a'});
const C=IBEN_PALETTE;
export function pointedArch(b,x,y,z,w,h,tint=C.light){
  const r=w/2,shoulder=h*.56;
  for(const side of [-1,1]){
    b.block(tint,x+side*r,y,z,.18,shoulder,.22);
    const points=[[x+side*r,y+shoulder,z],[x+side*r*.8,y+h*.79,z],[x+side*r*.4,y+h*.94,z],[x,y+h,z]];
    for(let i=1;i<points.length;i++)b.beam(tint,points[i-1],points[i],.19);
  }
}
function leafRoof(b,w,d,rise,tint=C.roof){
  const shape=[[-.5,.12],[-.36,.2],[-.19,.56],[0,1],[.19,.56],[.36,.2],[.5,.12]];
  for(let i=1;i<shape.length;i++){
    const [a,ay]=shape[i-1],[c,cy]=shape[i];
    b.sheet(tint,[a*w,ay*rise,-d/2],[c*w,cy*rise,-d/2],[c*w,cy*rise,d/2],[a*w,ay*rise,d/2]);
  }
  for(const z of [-d/2,d/2]){
    for(let i=1;i<shape.length;i++){
      const [a,ay]=shape[i-1],[c,cy]=shape[i];
      b.sheet(C.timber,[a*w,.1,z],[c*w,.1,z],[c*w,cy*rise,z],[a*w,ay*rise,z]);
      b.beam(C.light,[a*w,ay*rise,z],[c*w,cy*rise,z],.12);
    }
    const front=z+Math.sign(z)*.03;
    const leaf=[[-w*.075,.24,front],[w*.075,.24,front],[w*.095,rise*.35,front],[0,rise*.63,front],[-w*.095,rise*.35,front]];
    for(let i=1;i<leaf.length-1;i++){
      b.triangle(C.glass,leaf[0],leaf[i],leaf[i+1]);b.triangle(C.glass,leaf[0],leaf[i+1],leaf[i]);
    }
    pointedArch(b,0,.15,front,w*.25,rise*.7,C.trim);
    b.beam(C.light,[0,.18,front+Math.sign(z)*.025],[0,rise*.65,front+Math.sign(z)*.025],.07);
    for(const side of [-1,1])b.beam(C.trim,[0,rise*.25,front],[side*w*.09,rise*.4,front],.06);
    b.beam(C.trim,[0,rise,z],[0,rise+.75,z+Math.sign(z)*.6],.1);
  }
  for(let z=-d/2+.8;z<d/2;z+=1.6)for(let i=1;i<shape.length;i++){
    const [a,ay]=shape[i-1],[c,cy]=shape[i];b.beam('#679182',[a*w,ay*rise+.02,z],[c*w,cy*rise+.02,z],.035);
  }
  b.beam(C.trim,[0,rise+.07,-d/2],[0,rise+.07,d/2],.14);
}
export function ibenBuilding(b,h,heightAt,colliders){
  const {x,z,w,d,kind,yaw,variant}=h,c=Math.cos(yaw),s=Math.sin(yaw);
  const terrain=[[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]].map(([u,v])=>heightAt(x+c*u+s*v,z-s*u+c*v));
  const y=Math.max(...terrain)+.06,foot=Math.min(...terrain)-.25,top=h.h;
  b.frame(x,y,z,yaw,()=>{
    if(kind==='tower'){
      const r=w/2;
      b.cylinder(C.shade,0,foot-y,0,r+1,y-foot+.3);
      b.cylinder(C.stone,0,0,0,r,top);
      for(const yy of [1,top*.5,top-2])b.cylinder(C.light,0,yy,0,r+.16,.25);
      for(let a=0;a<7;a++){
        const turn=a*Math.PI*2/7;
        b.frame(0,0,0,turn,()=>{
          b.block(C.dark,0,top*.54,r*.91,.6,2.5,.13);
          pointedArch(b,0,top*.54,r*.91+.1,.7,2.7);
          b.beam(C.shade,[-r*.55,.3,r*.7],[-r*.34,top-2,r*.7],.25);
          b.block(C.wood,0,top+.15,r*.85,.16,3.1,.16);
          b.beam(C.light,[0,top+1.4,r*.85],[0,top+3,r*.32],.16);
        });
      }
      b.cylinder(C.light,0,top,0,r+1,.3);
      b.cone(C.roof,0,top+3,0,r+1.25,3.2);
      b.cone(C.roof,0,top+5,0,r*.5,3.7);
      b.cylinder(C.trim,0,top+8.3,0,.09,1.2);
      return;
    }
    b.block(C.shade,0,foot-y,0,w+.45,y-foot+.22,d+.45);
    const rustic=['barn','boathouse','workshop'].includes(kind);
    b.block(rustic?C.timber:variant%3===0?'#c3d2be':C.stone,0,0,0,w,top,d);
    b.block(C.shade,0,0,0,w+.13,.65,d+.13);
    for(const u of [-w/2+.18,w/2-.18]){
      b.block(C.wood,u,.65,d/2+.06,.16,top-.65,.18);
      b.beam(C.trim,[u,top-1.2,d/2+.15],[u*.7,top-.1,d/2+.15],.13);
    }
    if(rustic)for(let yy=.9;yy<top;yy+=.48)b.box('#827d62',0,yy,0,w+.1,.045,d+.1);
    const door=kind==='hall'?2.5:kind==='barn'?2.2:1.5;
    b.block(C.wood,0,.08,d/2+.1,door,2.3,.17);
    pointedArch(b,0,.08,d/2+.22,door,2.55);
    b.block(C.trim,door*.29,1.2,d/2+.21,.12,.12,.06);
    for(const u of [-w*.3,w*.3])for(const side of [-1,1]){
      const yy=top>6?3.4:1.6,front=side*(d/2+.08);
      b.block(C.dark,u,yy,front,1,1.65,.1);
      pointedArch(b,u,yy,front+side*.1,1.15,1.85);
      b.block(C.glass,u,yy+.15,front+side*.06,.72,1.2,.05);
      b.beam(C.trim,[u,yy,front+side*.16],[u,yy+1.5,front+side*.16],.06);
    }
    b.frame(0,top,0,0,()=>leafRoof(b,w+1.7,d+2.1,kind==='hall'?6:w*.48,variant%4===0?'#667f66':C.roof));
    if(kind==='hall'){
      b.cylinder(C.light,0,top+4.5,-2,2.4,2.8);
      b.cone(C.roof,0,top+7.3,-2,3.3,3.4);
      b.cone(C.roof,0,top+9.7,-2,1.2,3.5);
      // The entrance's paired branching piers are carved timber, braced to stone.
      for(const side of [-1,1]){
        b.block(C.light,side*3.1,0,d/2+1.6,.7,.45,.7);
        b.beam(C.wood,[side*3.1,.45,d/2+1.6],[side*3.1,4.2,d/2+1.6],.25);
        b.beam(C.trim,[side*3.1,2.7,d/2+1.6],[side*.6,5.4,d/2+1.6],.17);
      }
      b.frame(0,4.9,d/2+1,0,()=>leafRoof(b,8,4,2.1));
    }
  });
  if(kind==='tower')colliders.push({id:h.id,kind:'building',x,z,r:w/2+.25,minY:foot,maxY:y+top+10});
  else {
    // A chain of boxes along the rotated footprint, not its much wider AABB.
    const count=Math.ceil(w/1.5);
    for(let i=0;i<count;i++)for(let j=0;j<Math.ceil(d/1.5);j++){
      const nx=count,nz=Math.ceil(d/1.5),u=-w/2+w*(i+.5)/nx,v=-d/2+d*(j+.5)/nz;
      colliders.push({id:h.id,kind:'building',x:x+c*u+s*v,z:z-s*u+c*v,r:Math.hypot(w/nx,d/nz)/2,minY:foot,maxY:y+top+7});
    }
  }
  return {y,foot};
}
