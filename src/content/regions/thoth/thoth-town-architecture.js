import {northernTownHouse} from '../northern-towns/northern-towns-architecture.js';
import {thothBuildingCorners} from './thoth-town-buildings.js';
const P={stone:'#9eaa9e',pale:'#d1cbb7',brick:'#995c43',wood:'#69503b',dark:'#283d39',roof:'#526158'};
function pointedWindow(b,x,y,z,w,h){
  b.block(P.dark,x,y,z,w,h,.13);b.triangle(P.dark,[x-w/2,y+h,z+.07],[x+w/2,y+h,z+.07],[x,y+h+w*.8,z+.07]);
  for(const side of [-1,1]){b.block(P.pale,x+side*(w/2+.12),y,z+.05,.16,h,.23);b.beam(P.pale,[x+side*(w/2+.12),y+h,z+.05],[x,y+h+w*.8+.15,z+.05],.16);}
  b.block(P.pale,x,y-.13,z+.05,w+.5,.18,.28);b.block(P.pale,x,y,z+.10,.09,h+w*.8,.08);
}
export function thothHouse(b,s,heightAt,colliders){
  if(!['assembly-hall','guildhouse'].includes(s.kind)){northernTownHouse(b,s,{},heightAt,colliders);return;}
  if(s.kind==='guildhouse'){
    northernTownHouse(b,{...s,kind:'brick'},{},heightAt,colliders);
    const y=Math.max(...thothBuildingCorners(s).map(p=>heightAt(p.x,p.z)))+.08;
    b.frame(s.x,y,s.z,0,()=>{
      // Deep public porch, wall niches and a hanging trade sign.
      for(const side of [-1,1])for(const xx of [-4.8,0,4.8])b.cylinder(P.pale,xx,.4,side*(s.d/2+2.5),.28,3.3);
      for(const side of [-1,1])b.roof(P.roof,0,3.65,side*(s.d/2+1.4),s.w+1,4.5,1.1,0,P.wood);
      b.beam(P.wood,[-s.w/2,5,s.d/2],[-s.w/2-2.5,5,s.d/2],.2);
      b.block('#496e71',-s.w/2-2,3.1,s.d/2,1.3,1.6,.15);b.cylinder('#c1ae73',-s.w/2-2,3.4,s.d/2+.1,.27,.75);
    });
    return;
  }
  const {x,z,w,d,h}=s,ys=thothBuildingCorners(s).map(p=>heightAt(p.x,p.z)),y=Math.max(...ys)+.08,low=Math.min(...ys)-.25;
  b.frame(x,y,z,0,()=>{
    b.block('#838f85',0,low-y,0,w+.8,y-low+.35,d+.8);b.block(P.stone,0,.35,0,w,h-.35,d);
    for(let yy=1;yy<h;yy+=1.05)for(const side of [-1,1])for(let xx=-w/2+1;xx<w/2;xx+=2)b.block((Math.floor(xx+yy)%3)?'#aeb3a3':'#929f93',xx,yy,side*(d/2+.03),1.3,.4,.08);
    for(const side of [-1,1]){
      for(const v of [-d*.32,0,d*.32]){
        b.block(P.stone,side*(w/2+.5),.25,v,1.3,h*.83,1.5);b.block(P.pale,side*(w/2+.5),h*.83,v,1.6,.25,1.8);
      }
      for(const v of [-d*.16,d*.16])b.frame(side*w/2,0,v,side*Math.PI/2,()=>pointedWindow(b,0,4.2,.13,1.6,3));
      for(const xx of [-5,5])pointedWindow(b,xx,3.5,side*(d/2+.14),1.7,3.5);
    }
    b.roof(P.roof,0,h,0,w+1.4,d+1.5,10.8,0,P.stone);
    for(const side of [-1,1])for(let j=0;j<7;j++){
      const xx=(j-3)*2.5,rise=10.8*(1-Math.abs(xx)/(w/2+.7));
      b.block(P.pale,xx,h,side*(d/2+.45),2.52,Math.max(.3,rise),.35);
      b.block(P.stone,xx,h+.15,side*(d/2+.65),1.6,Math.max(.1,rise-.55),.15);
    }
    // A substantial square stone tower with brick upper work and a steep cap.
    const tx=0,tz=d/2-2.5,tw=7.5;
    b.block(P.stone,tx,.35,tz,tw,22,tw);b.block(P.brick,tx,22.35,tz,tw,5,tw);
    for(const yy of [3.3,12,22.2,27.2])b.block(P.pale,tx,yy,tz,tw+.4,.3,tw+.4);
    for(const side of [-1,1]){
      for(const xx of [-1.65,1.65])pointedWindow(b,xx,23.2,tz+side*(tw/2+.1),1.05,1.6);
      b.frame(side*tw/2,0,tz,side*Math.PI/2,()=>pointedWindow(b,0,23.2,.13,1.2,1.6));
    }
    b.roof(P.roof,0,27.6,tz,8.7,8.7,8,0,P.brick);b.cylinder('#b5a376',0,35.6,tz,.10,2);
    b.sheet('#527776',[0,37,tz],[2.2,36.7,tz],[2.2,36,tz],[0,36.3,tz]);
    b.block(P.dark,0,.35,d/2+1.28,2.1,3,.18);
    for(const side of [-1,1])b.block(P.pale,side*1.25,.35,d/2+1.4,.25,3.4,.4);
    b.roof(P.roof,0,3.9,d/2+2.2,4.1,3.2,2,0,P.wood);
    for(let j=0;j<3;j++)b.block(P.stone,0,.10+j*.2,d/2+3-j*.5,3.8,.24,2-j*.4);
  });
  colliders.push({x,z,hx:w/2+1.2,hz:d/2+1.5,minY:low,maxY:y+38,kind:'building'});
}
