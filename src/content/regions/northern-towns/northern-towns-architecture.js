/** Distinct northern silhouettes, using the game's simple solid geometry. */
import {buildingCorners} from './northern-towns-buildings.js';
const P={stone:'#929b91',pale:'#c9c8af',wood:'#645441',lightWood:'#897259',tar:'#484c46',dark:'#303f3c',brick:'#a06449',red:'#975440',cream:'#d3c5a2',roof:'#58625c'};
function gable(b,w,d,y,rise,tint){for(const side of [-1,1])for(let i=-2;i<=2;i++){const h=rise*(1-Math.abs(i)/3)+.3;b.block(tint,i*w/5,y,side*(d/2+.12),w/5+.02,h,.38);b.block(P.pale,i*w/5,y+h,side*(d/2+.12),w/5+.1,.18,.52);}}
export function northernTownHouse(b,s,t,heightAt,colliders){
  const {x,z,w,d,h,kind,yaw=0,seed=.6}=s,heights=buildingCorners(s).map(p=>heightAt(p.x,p.z)),y=Math.max(...heights)+.08,low=Math.min(...heights)-.2;
  const log=kind==='log'||kind==='belfry',brick=['brick','guildhall','warehouse'].includes(kind),stone=kind==='stone-hall',roof=log||stone?P.roof:P.red,rise=stone?w*.75:w*.62;
  b.frame(x,y,z,yaw,()=>{
    b.block(P.stone,0,low-y,0,w+.5,y-low+.45,d+.5);
    b.block(log?(seed>.5?P.lightWood:P.wood):brick?P.brick:stone?P.stone:P.cream,0,.35,0,w,h-.35,d);
    if(log){
      // Horizontal log courses with projecting, notched corners.
      for(let yy=.7;yy<h;yy+=.45)for(const side of [-1,1]){
        b.block(P.wood,0,yy,side*(d/2+.04),w+.35,.1,.17);
        b.block(P.wood,side*(w/2+.04),yy+.20,0,.17,.1,d+.35);
      }
    }else if(stone){
      for(let yy=.8;yy<h;yy+=1.2)for(let xx=-w/2+1;xx<w/2;xx+=1.8)for(const side of [-1,1])b.block((Math.floor(xx+yy)%2)?P.pale:'#7c8981',xx,yy,side*(d/2+.02),1.1,.5,.07);
      for(const xx of [-w/2,w/2])for(const zz of [-d*.35,d*.35])b.block(P.stone,xx,.3,zz,1,h*.85,1.5);
    }else if(!brick){
      for(const side of [-1,1]){
        for(const u of [-w/2+.12,0,w/2-.12])b.block(P.wood,u,.35,side*(d/2+.03),.23,h-.35,.18);
        for(const v of [-d/2+.2,0,d/2-.2])b.block(P.wood,side*(w/2+.04),.35,v,.18,h-.35,.23);
        for(let yy=1;yy<h;yy+=3)b.beam(P.wood,[-w*.45,yy,side*(d/2+.1)],[-w*.08,Math.min(yy+2,h),side*(d/2+.1)],.16);
      }
    }
    for(let yy=3;yy<h;yy+=3)if(!log)b.block(brick?P.pale:P.wood,0,yy,0,w+.13,.16,d+.13);
    for(const side of [-1,1]){
      for(const u of [-w*.28,w*.28])for(let yy=1.3;yy<h-1;yy+=3){
        b.block(P.dark,u,yy,side*(d/2+.12),.85,1.3,.17);b.block(P.pale,u,yy-.1,side*(d/2+.18),1.05,.12,.25);
        if(log)b.block(P.lightWood,u+.6,yy,side*(d/2+.1),.45,1.3,.15);
      }
      b.block(P.tar,0,.45,side*(d/2+.14),1.3,2.1,.18);
      b.block(P.stone,0,.12,side*(d/2+.5),1.9,.26,.9);
      for(const v of [-d*.31,d*.31])for(let yy=1.3;yy<h-1;yy+=3)b.block(P.dark,side*(w/2+.1),yy,v,.16,1.2,.8);
    }
    if(kind==='belfry'){
      b.block(P.tar,0,h-4,0,w+.7,.4,d+.7);
      for(const side of [-1,1])for(const u of [-1.4,1.4])b.block(P.dark,u,h-3.5,side*(d/2+.07),1,2.3,.14);
      b.roof(P.roof,0,h,0,w+1.2,d+1.2,6,0,P.wood);b.cylinder('#b6a16b',0,h+6,0,.09,1.8);
    }else{
      b.roof(roof,0,h,0,w+1,d+1,rise,0,log?P.wood:brick?P.brick:stone?P.stone:P.cream);
      if(brick)gable(b,w,d,h,rise,P.brick);
      else for(const side of [-1,1]){const zz=side*(d/2+.53);b.beam(P.tar,[-w/2-.5,h,zz],[0,h+rise,zz],.22);b.beam(P.tar,[0,h+rise,zz],[w/2+.5,h,zz],.22);}
      if(log||stone){for(let yy=1;yy<rise;yy+=.85){const xx=(w/2+.5)*(1-yy/rise);for(const side of [-1,1])b.block(P.tar,side*xx,h+yy+.03,0,.08,.06,d+1);}}
      b.block(stone?P.stone:P.brick,w*.25,h,-d*.23,.7,rise+.7,.8);
    }
    if(kind==='guildhall'){
      // Broad brick belfry and a steep saddle roof, rather than Ganun's spire.
      const zt=-d/2+3;b.block(P.brick,0,h,zt,7.3,13,7.3);
      for(const yy of [h+3,h+9,h+12.7])b.block(P.pale,0,yy,zt,7.7,.3,7.7);
      for(const side of [-1,1])for(const xx of [-1.6,1.6])b.block(P.dark,xx,h+9.5,zt+side*3.7,1.1,2.5,.2);
      b.roof(P.red,0,h+13,zt,8.2,8.2,6,0,P.brick);
      for(const side of [-1,1])for(let i=-2;i<=2;i++){const hh=6*(1-Math.abs(i)/3);b.block(P.brick,i*1.4,h+13,zt+side*3.9,1.45,hh,.4);}
      b.cylinder('#b5a66b',0,h+19,zt,.08,2);b.sheet('#a34939',[0,h+20.5,zt],[2,h+20.2,zt],[2,h+19.5,zt],[0,h+19.7,zt]);
    }
  });
  const co=Math.abs(Math.cos(yaw)),si=Math.abs(Math.sin(yaw));colliders.push({x,z,hx:(w*co+d*si)/2+.4,hz:(d*co+w*si)/2+.4,minY:low,maxY:y+(kind==='guildhall'?h+22:h+rise+3),kind:'building'});
}
