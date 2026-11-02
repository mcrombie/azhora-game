/** A small English-inspired vocabulary: jettied oak frames, lime plaster,
 * flint-grey foundations and steep slate or thatch roofs. All parts are batched. */
export const ENDEVOR_PALETTE=Object.freeze({oak:'#54432f',plaster:'#d2c5a4',stone:'#858b85',trim:'#b6b7a5',slate:'#4c5962',thatch:'#9e8957',dark:'#333d39',red:'#915442'});
export function endevorHouse(b,s,heightAt,colliders=[]){
  const {x,z,w,d,height:h,yaw=0,seed=.5,kind='house'}=s,p=ENDEVOR_PALETTE;
  const co=Math.cos(yaw),si=Math.sin(yaw),corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],ys=corners.map(([u,v])=>heightAt(x+u*co+v*si,z-u*si+v*co));
  const y=Math.max(...ys),bottom=Math.min(...ys)-.3,grand=kind==='hall'||kind==='bell-hall';
  b.frame(x,y,z,yaw,()=>{
    b.block(p.stone,0,bottom-y,0,w+.4,y-bottom+.4,d+.4);
    b.block(grand?p.stone:seed>.7?'#b3aa92':p.plaster,0,0,0,w,h,d);
    const upper=h>5&&!grand,jet=upper?.5:0,ww=w+jet;
    if(upper)b.block(p.plaster,0,3,0,ww,h-3,d+.6);
    for(const side of [-1,1]){
      const zz=side*(d/2+(upper?.31:.025));
      for(let u=-ww/2+.15;u<ww/2+.1;u+=ww/4)b.block(grand?p.trim:p.oak,u,upper?3:0,zz,.19,h-(upper?3:0),.16);
      for(let level=0;level<h;level+=3){
        b.block(grand?p.trim:p.oak,0,level,zz,ww,.2,.17);
        for(const xx of [-w*.27,w*.27]){
          b.block(p.dark,xx,level+.9,zz+side*.08,.84,1.25,.14);
          b.block(p.trim,xx,level+.83,zz+side*.11,1.04,.12,.22);
          b.block(p.oak,xx,level+.9,zz+side*.17,.06,1.26,.09);
        }
        if(!grand&&level>0)for(const sideX of [-1,1])b.beam(p.oak,[sideX*w*.44,level+.2,zz],[sideX*w*.20,Math.min(h,level+2.6),zz],.13);
      }
      b.block(p.oak,0,0,side*(d/2+.07),1.3,2.2,.15);
      b.block(p.stone,0,-.06,side*(d/2+.5),1.9,.18,.9);
    }
    for(const side of [-1,1]){
      for(let level=0;level<=h;level+=3)b.block(grand?p.trim:p.oak,side*(ww/2+.015),level,0,.18,.2,d);
      for(const z0 of [-d*.33,0,d*.33]){
        b.block(grand?p.trim:p.oak,side*(ww/2+.025),0,z0,.2,h,.2);
        for(let level=0;level<h-1.5;level+=3){
          b.block(p.dark,side*(ww/2+.13),level+1,z0+d*.10,.12,grand?1.6:1.1,.8);
          b.block(p.trim,side*(ww/2+.17),level+.9,z0+d*.10,.22,.12,1.1);
        }
      }
    }
    const rise=grand?6.5:3.1+w*.12,roof=grand||seed>.33?p.slate:p.thatch;
    b.roof(roof,0,h,0,ww+1,d+1.2,rise,0,grand?p.stone:p.plaster);
    for(const side of [-1,1]){
      const zz=side*(d/2+.65);
      b.beam(p.oak,[-ww/2-.5,h,zz],[0,h+rise,zz],.2);b.beam(p.oak,[0,h+rise,zz],[ww/2+.5,h,zz],.2);
      b.beam(p.oak,[0,h,zz],[0,h+rise,zz],.18);
      if(grand)b.block(p.dark,0,h+.7,side*(d/2+.02),1.2,2,.15);
    }
    b.block(p.red,w*.28,h-.6,-d*.17,.9,rise+1.1,.9);b.block(p.trim,w*.28,h+rise+.4,-d*.17,1.2,.25,1.2);
    if(kind==='hall'){
      b.roof(p.slate,0,3.1,d/2+2,6,4,2,0,p.plaster);
      for(const u of [-2.5,2.5])b.block(p.oak,u,0,d/2+3,.35,3.2,.35);
    }
    if(kind==='bell-hall'){
      const tz=-d/2+3.5;b.block(p.stone,0,0,tz,7,23,7);
      for(const s of [-1,1]){
        b.block(p.trim,s*3.55,0,tz,.5,23,7.6);
        for(const xx of [-1.4,1.4])b.block(p.dark,xx,18,tz+s*3.56,1.3,3,.13);
      }
      for(const h0 of [8,15,22])b.block(p.trim,0,h0,tz,7.8,.5,7.8);
      b.roof(p.slate,0,23,tz,8,8,6,0,p.stone);
      b.cylinder(p.oak,0,29,tz,.09,2);b.beam(p.oak,[-1,30,tz],[1,30,tz],.13);b.triangle(p.trim,[1,30,tz],[.3,30.45,tz],[.3,29.55,tz]);
    }
  });
  const hx=(w*Math.abs(co)+d*Math.abs(si))/2+.4,hz=(d*Math.abs(co)+w*Math.abs(si))/2+.4;
  colliders.push({x,z,hx,hz,minY:bottom,maxY:y+(kind==='bell-hall'?30:h+4),kind:'building'});
  return y;
}
