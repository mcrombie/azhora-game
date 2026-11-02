import {nonthBuildingCorners} from './nonth-town-buildings.js';
const P={stone:'#c0b894',trim:'#ddd1ad',wood:'#514634',dark:'#283c3a',slate:'#4c6370',paleSlate:'#647b83'};
function window(b,x,y,z,w,h,stone=false){
  b.block(P.dark,x,y,z,w,h,.12);b.block(stone?P.trim:P.wood,x,y-.1,z+.06,w+.3,.16,.24);
  for(const side of [-1,1])b.block(stone?P.trim:P.wood,x+side*(w/2+.08),y,z+.04,.12,h,.19);
  b.block(P.trim,x,y,z+.10,.07,h,.08);b.block(P.trim,x,y+h*.6,z+.10,w,.06,.08);
}
export function nonthHouse(b,s,heightAt,colliders){
  if(s.kind==='keep'){nonthKeep(b,s,heightAt,colliders);return;}
  const {x,z,w,d,h,yaw=0,seed=.5,kind}=s,stone=kind==='stone',ys=nonthBuildingCorners(s).map(p=>heightAt(p.x,p.z)),y=Math.max(...ys)+.08,low=Math.min(...ys)-.22;
  const plaster=['#d2c297','#bfac84','#b8b89d','#c5a88b'][Math.floor(seed*4)%4],levels=Math.round(h/3),floor=h/levels;
  b.frame(x,y,z,yaw,()=>{
    b.block(P.stone,0,low-y,0,w+.5,y-low+.38,d+.5);
    for(let level=0;level<levels;level++){
      const jut=stone?0:level*.21,ww=w+2*jut,dd=d+2*jut,yy=.35+floor*level;
      b.block(stone?P.stone:plaster,0,yy,0,ww,floor,dd);
      b.block(stone?P.trim:P.wood,0,yy,0,ww+.17,.18,dd+.17);
      for(const side of [-1,1]){
        if(!stone){
          for(const xx of [-ww/2+.1,0,ww/2-.1])b.block(P.wood,xx,yy,side*(dd/2+.05),.18,floor,.14);
          for(const xx of [-ww*.36,ww*.36])b.beam(P.wood,[xx-.55,yy+.25,side*(dd/2+.09)],[xx+.55,yy+floor-.2,side*(dd/2+.09)],.12);
          for(const zz of [-dd*.36,0,dd*.36])b.block(P.wood,side*(ww/2+.06),yy,zz,.14,floor,.18);
          if(level)for(const xx of [-ww*.36,ww*.36])b.beam(P.wood,[xx,yy-.6,side*(dd/2-.35)],[xx,yy,side*(dd/2+.1)],.20);
        }
        for(const xx of [-ww*.27,ww*.27])window(b,xx,yy+.85,side*(dd/2+.13),.72,1.1,stone);
        for(const zz of [-dd*.26,dd*.26])b.frame(side*(ww/2+.12),0,zz,side*Math.PI/2,()=>window(b,0,yy+.85,.02,.7,1.05,stone));
      }
    }
    const rw=w+(stone?0:(levels-1)*.42)+.8,rd=d+(stone?0:(levels-1)*.42)+.9,rise=rw*.70,top=h+.35;
    b.roof(seed>.5?P.slate:P.paleSlate,0,top,0,rw,rd,rise,0,stone?P.stone:plaster);
    for(const side of [-1,1]){
      const zz=side*(rd/2+.03);b.beam(P.wood,[-rw/2,top,zz],[0,top+rise,zz],.17);b.beam(P.wood,[0,top+rise,zz],[rw/2,top,zz],.17);b.block(P.wood,0,top,zz,.16,rise,.16);
      b.block(P.dark,0,.4,side*(d/2+.15),1.1,2,.2);b.block(P.stone,0,.15,side*(d/2+.55),1.6,.25,.9);
    }
    // Slate dormer and tall, capped chimney; projecting shop shutters below.
    b.block(stone?P.stone:plaster,rw*.25,top+.25,-.8,1.45,1.6,2);b.roof(P.slate,rw*.25,top+1.85,-.8,1.9,2.3,1.4);window(b,rw*.25,top+.45,.24,.6,.9,stone);
    b.block(P.stone,-rw*.23,top,-d*.25,.65,rise+1,.8);b.block(P.trim,-rw*.23,top+rise+.9,-d*.25,.9,.24,1.05);
    b.block(P.wood,-w*.3,1.25,d/2+.65,w*.35,.13,1);
    if(seed>.45){b.beam(P.wood,[w/2,3,d/2],[w/2+1.1,3,d/2],.13);b.block(seed>.7?'#887247':'#647e72',w/2+.8,1.9,d/2,.75,.9,.10);}
  });
  // Where a river-bank foundation is exposed, steps meet the actual ground.
  for(const side of [-1,1]){
    const dx=Math.sin(yaw)*side,dz=Math.cos(yaw)*side,start=d/2+.35,near={x:x+dx*(start+.65),z:z+dz*(start+.65)};
    const drop=y+.35-heightAt(near.x,near.z);if(drop<.5)continue;
    const n=Math.min(16,Math.ceil(drop/.22));
    for(let j=0;j<n;j++){
      const dist=start+(n-j)*.34,xx=x+dx*dist,zz=z+dz*dist,base=heightAt(xx,zz)-.08,top=y+.35-(n-j-1)*drop/n;
      if(top>base)b.block(P.stone,xx,base,zz,1.55,top-base,.4,yaw);
    }
  }
  const co=Math.abs(Math.cos(yaw)),si=Math.abs(Math.sin(yaw));colliders.push({x,z,hx:(w*co+d*si)/2+.7,hz:(d*co+w*si)/2+.7,minY:low,maxY:y+h+w+3,kind:'building'});
}
function nonthKeep(b,s,heightAt,colliders){
  const {x,z,w,d,h}=s,ys=nonthBuildingCorners(s,2).map(p=>heightAt(p.x,p.z)),y=Math.max(...ys)+.06,lo=Math.min(...ys)-.3;
  b.frame(x,y,z,0,()=>{
    b.block('#a6a386',0,lo-y,0,w+2,y-lo+.7,d+2);b.block(P.stone,0,.5,0,w,h,d);
    for(const yy of [7,13,16.8])b.block(P.trim,0,yy,0,w+.35,.3,d+.35);
    for(const side of [-1,1])for(const xx of [-3.5,3.5])for(const yy of [4,10])window(b,xx,yy,side*(d/2+.07),.9,2.0,true);
    for(const side of [-1,1])b.frame(side*(w/2+.09),0,0,side*Math.PI/2,()=>{
      for(const zz of [-3.2,3.2])for(const yy of [4,10])window(b,zz,yy,0,.7,1.8,true);
      b.block(P.trim,0,13.8,0,3.6,.3,.5);
    });
    b.roof(P.slate,0,h+.5,0,w+1,d+1,9,0,P.stone);
    for(const xx of [-w/2+.7,w/2-.7])for(const zz of [-d/2+.7,d/2-.7]){
      b.cylinder(P.stone,xx,.2,zz,2.6,h+4);
      for(const yy of [5,11,h+3.4])b.cylinder(P.trim,xx,yy,zz,2.77,.28);
      b.cone(P.slate,xx,h+4.2,zz,3.2,6.7);b.cylinder('#b7a270',xx,h+10.6,zz,.09,1.2);
      b.block(P.dark,xx,12.5,zz+2.62,.35,1.7,.1);
    }
    b.block(P.dark,0,.65,d/2+.1,2,3.6,.17);b.roof(P.slate,0,4.4,d/2+1.1,4.3,2.7,2);
    for(const side of [-1,1])b.block(P.trim,side*1.25,.6,d/2+.16,.26,3.8,.35);
    for(let j=0;j<3;j++)b.block(P.trim,0,.1+j*.2,d/2+2.5-j*.55,3.6,.25,2.4-j*.45);
    b.cylinder('#b7a270',0,h+9.5,0,.1,3.1);b.sheet('#5c7787',[0,h+12.5,0],[2.2,h+12.1,0],[2.2,h+11.2,0],[0,h+11.5,0]);
  });
  colliders.push({x,z,hx:w/2+2.4,hz:d/2+2.4,minY:lo,maxY:y+h+13,kind:'building'});
}
