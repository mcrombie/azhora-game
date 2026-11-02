import {orsaBuildingCorners} from './orsa-town-buildings.js';
const P={tar:'#443a30',wood:'#775d42',pale:'#a78c62',stone:'#8c958a',dark:'#253334',roof:'#58534a',grass:'#697657'};
function carvedRidge(b,w,d,y,rise){
  for(const side of [-1,1]){
    const z=side*(d/2+.5);b.beam(P.pale,[-w/2-.5,y,z],[0,y+rise,z],.18);b.beam(P.pale,[0,y+rise,z],[w/2+.5,y,z],.18);
    b.beam(P.tar,[0,y+rise-.1,z],[0,y+rise+1.1,z+side*.7],.25);
    b.beam(P.pale,[0,y+rise+1.1,z+side*.7],[0,y+rise+1.35,z+side*.3],.2);
  }
}
export function orsaHouse(b,s,heightAt,colliders){
  const {x,z,w,d,h,kind,yaw=0,seed=.5}=s,ys=orsaBuildingCorners(s).map(p=>heightAt(p.x,p.z)),y=Math.max(...ys)+.08,low=Math.min(...ys)-.25;
  const raised=kind==='store',floor=raised?1.1:.35,wall=kind==='stave'?P.tar:raised?['#92734a','#805642','#a78b5b'][Math.floor(seed*3)%3]:P.wood;
  b.frame(x,y,z,yaw,()=>{
    b.block(P.stone,0,low-y,0,w+.35,y-low+.2,d+.35);
    if(raised){for(const u of [-w*.37,w*.37])for(const v of [-d*.36,d*.36]){b.block(P.stone,u,.15,v,.85,.5,.85);b.block(P.tar,u,.6,v,.55,.55,.55);}b.block(P.tar,0,.95,0,w+.25,.2,d+.25);}
    b.block(wall,0,floor,0,w,h-floor,d);
    for(const side of [-1,1]){
      if(kind==='stave'||raised)for(let u=-w/2+.24;u<w/2;u+=.65)b.block(P.tar,u,floor,side*(d/2+.03),.045,h-floor,.07);
      else for(let yy=.7;yy<h;yy+=.43){b.block('#66513d',0,yy,side*(d/2+.05),w+.4,.10,.16);b.block(P.tar,side*(w/2+.05),yy+.2,0,.16,.1,d+.4);}
      for(const u of [-w/2+.13,w/2-.13])b.block(P.tar,u,floor,side*(d/2+.1),.32,h-floor,.3);
      b.block(P.tar,0,h-.25,side*(d/2+.12),w+.2,.25,.24);
      for(let yy=floor+1;yy<h-1;yy+=3)for(const u of [-w*.28,w*.28]){
        b.block(P.dark,u,yy,side*(d/2+.13),.75,1,.17);b.block(P.pale,u,yy-.08,side*(d/2+.2),.95,.12,.26);
        b.block(P.tar,u,yy,side*(d/2+.23),.07,1,.09);
      }
      b.block(P.dark,0,floor,side*(d/2+.15),1.35,2.05,.18);
      for(const u of [-.86,.86])b.block(P.pale,u,floor,side*(d/2+.22),.19,2.32,.24);
      b.beam(P.pale,[-.86,floor+2.32,side*(d/2+.22)],[0,floor+2.65,side*(d/2+.22)],.19);b.beam(P.pale,[0,floor+2.65,side*(d/2+.22)],[.86,floor+2.32,side*(d/2+.22)],.19);
      for(let j=0;j<(raised?4:1);j++)b.block(P.stone,0,.05+j*.24,side*(d/2+1.2-j*.23),1.8,.25,1.5-j*.22);
      for(const v of [-d*.27,d*.27])for(let yy=floor+1;yy<h-1;yy+=3)b.block(P.dark,side*(w/2+.06),yy,v,.12,.95,.75);
    }
    const rise=w*(kind==='stave'?.8:.66),roof=kind==='log'&&seed<.45?P.grass:P.roof;
    b.roof(roof,0,h,0,w+1.1,d+1.1,rise,0,wall);carvedRidge(b,w,d,h,rise);
    for(let yy=.65;yy<rise;yy+=.75){const xx=(w/2+.55)*(1-yy/rise);for(const side of [-1,1])b.block(P.tar,side*xx,h+yy+.01,0,.08,.045,d+1.1);}
    if(kind==='stave'){
      // Covered outer gallery, raised nave and diminishing roof tiers.
      for(const side of [-1,1]){
        b.roof(P.roof,side*(w/2+1),2.5,0,4,d+3.4,2.9,0,P.tar);
        for(let v=-d/2;v<=d/2;v+=2.4)b.cylinder(P.pale,side*(w/2+2.4),.3,v,.16,2.8);
      }
      b.block(P.tar,0,h+rise-3,0,5.4,5,8.3);
      b.roof('#50483b',0,h+rise+2,0,7.1,10,4.2,0,P.tar);carvedRidge(b,6,9,h+rise+2,4.2);
      b.block(P.tar,0,h+rise+5,0,2.8,3.2,3.4);b.roof('#544637',0,h+rise+8.2,0,4.3,4.8,3.3,0,P.tar);
      b.cylinder(P.pale,0,h+rise+11.5,0,.12,1.6);
      for(const side of [-1,1])b.block(P.dark,0,h+rise+.1,side*4.2,2.5,1.4,.12);
    }else if(kind==='hall'){
      b.roof(P.tar,0,h+rise*.7,-2,4.8,5.3,2.9,0,P.wood);
      for(const side of [-1,1])for(const v of [-d*.34,d*.34])b.block(P.pale,side*(w/2+.12),1,v,.28,h-1,.35);
    }else if(raised){
      b.beam(P.tar,[0,h-.7,-d/2],[0,h-.7,-d/2-2.5],.23);b.beam(P.pale,[0,h-1.8,-d/2-2.1],[0,h-.6,-d/2-2.1],.08);
    }else b.block(P.stone,w*.24,h,-d*.22,.8,rise*.75,.85);
  });
  const pad=kind==='stave'?2.8:.6,co=Math.abs(Math.cos(yaw)),si=Math.abs(Math.sin(yaw));
  colliders.push({x,z,hx:(w*co+d*si)/2+pad,hz:(d*co+w*si)/2+pad,minY:low,maxY:y+h+w+15,kind:'building'});
}
export function orsaBoat(b,s){
  const len=s.length,w=len*.145;
  b.frame(s.x,.15,s.z,s.yaw,()=>{
    b.block('#9e805b',0,.14,0,w*1.45,.12,len*.64);
    const sections=[[-.52,0,1.3],[-.36,.8,.83],[0,1,.83],[.36,.8,.83],[.52,0,1.4]];
    for(const side of [-1,1])for(let i=1;i<sections.length;i++){
      const [v0,k0,h0]=sections[i-1],[v1,k1,h1]=sections[i];
      for(let j=0;j<4;j++){const t=j/4,tt=(j+1)/4;b.sheet(j%2?'#705037':'#886646',[side*w*k0*(.7+.3*t),h0*t,len*v0],[side*w*k1*(.7+.3*t),h1*t,len*v1],[side*w*k1*(.7+.3*tt),h1*tt,len*v1],[side*w*k0*(.7+.3*tt),h0*tt,len*v0]);}
      b.beam(P.tar,[side*w*k0,h0,len*v0],[side*w*k1,h1,len*v1],.12);
    }
    for(const v of [-.28,0,.28])b.block(P.pale,0,.55,len*v,w*1.6,.13,.4);
    for(const side of [-1,1])b.beam(P.tar,[0,.6,side*len*.48],[0,1.8,side*len*.54],.15);
    if(s.sail){b.cylinder(P.wood,0,.2,0,.14,len*.77);b.beam(P.wood,[-w*1.5,len*.65,0],[w*1.5,len*.65,0],.15);for(let i=0;i<6;i++){const lo=-w*1.5+i*w*.5,hi=lo+w*.5;b.sheet(i%2?'#a56c4a':'#d2c8a7',[lo,len*.64,0],[hi,len*.64,0],[hi*.85,len*.25,.65],[lo*.85,len*.25,.65]);}for(const side of [-1,1])b.beam('#aaa18b',[0,len*.74,0],[side*w,.8,len*.30],.035);}
    else for(const side of [-1,1])b.beam(P.pale,[side*w*.5,.75,0],[side*(w+1.8),.25,.8],.065);
  });
}
