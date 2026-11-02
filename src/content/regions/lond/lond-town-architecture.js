/** Lond's town buildings: German-inspired timber frames and brick guild fronts.
 * Kept separate from Stonefist's established limestone royal architecture. */
const P={oak:'#4e3e2e',beam:'#655039',cream:'#d5cbb0',stone:'#a5a491',trim:'#c7bea3',brick:'#98644c',brickLight:'#b47b57',dark:'#303e3b',tile:'#9b5941',slate:'#57666b',metal:'#737d68',blue:'#3e5b69'};

export function londTownCorners(s,pad=0){
  const co=Math.cos(s.yaw??0),si=Math.sin(s.yaw??0);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>({x:s.x+u*(s.w/2+pad)*co+v*(s.d/2+pad)*si,z:s.z-u*(s.w/2+pad)*si+v*(s.d/2+pad)*co}));
}
function window(b,x,y,z,w=1,h=1.2,{arched=false,shutters=false,seed=.5}={}){
  b.block(P.dark,x,y,z,w,h,.10);
  for(const side of [-1,1])b.block(arched?P.trim:P.oak,x+side*(w/2+.07),y-.08,z+.05,.13,h+.08,.17);
  b.block(P.trim,x,y-.1,z+.06,w+.4,.16,.28);
  b.block(P.trim,x,y,z+.08,.06,h,.1);b.block(P.trim,x,y+h*.55,z+.08,w,.06,.1);
  if(arched){
    b.sheet(P.dark,[x-w/2,y+h,z],[x,y+h+w*.65,z],[x+w/2,y+h,z],[x-w/2,y+h,z]);
    for(const side of [-1,1])b.beam(P.trim,[x+side*(w/2+.07),y+h,z+.05],[x,y+h+w*.65+.06,z+.05],.14);
  }else b.block(P.oak,x,y+h,z+.05,w+.25,.13,.17);
  if(shutters)for(const side of [-1,1]){
    const xx=x+side*(w*.77+.15);b.block(seed>.5?'#7c8760':'#956346',xx,y,z+.04,w*.43,h,.10);
    for(const yy of [.25,h-.25])b.block(P.oak,xx,y+yy,z+.11,w*.43,.06,.05);
  }
}
function framedGable(b,w,z,top,rise,tint,brick=false){
  if(brick){
    // A stepped screen follows the roof pitch, rather than a second roof.
    const n=4;
    for(let i=-n;i<=n;i++){
      const step=w/(2*n+1),h=rise*(1-Math.abs(i)/(n+1))+.4;
      b.block(P.brick,i*step,top,z,step,h,.35);b.block(P.trim,i*step,top+h,z,step+.15,.16,.5);
    }
    for(const yy of [1.2,2.6])if(yy<rise-1)window(b,0,top+yy,z+.21,.55,.7,{arched:true});
    return;
  }
  for(const side of [-1,1])b.beam(P.oak,[side*w/2,top,z],[0,top+rise,z],.2);
  b.block(P.oak,0,top,z,.2,rise,.18);
  for(let yy=1.6;yy<rise-.4;yy+=1.6){
    const half=w/2*(1-yy/rise);b.block(P.oak,0,top+yy,z,half*2,.16,.18);
    for(const side of [-1,1])b.beam(P.beam,[0,top+yy,z],[side*half,top+yy-1.45,z],.12);
  }
  if(rise>4)window(b,0,top+.55,z+.1,.7,1.1);
}

export function londTownHouse(b,s,heightAt,{colliders=[]}={}){
  const {x,z,w,d,yaw=0,seed=.5,kind='timber'}=s,brick=kind==='merchant'||kind==='guildhall',guild=kind==='guildhall';
  const y=s.base??heightAt(x,z),low=Math.min(...londTownCorners(s).map(p=>heightAt(p.x,p.z)))-.3;
  const stories=guild?3:Math.max(2,Math.round(s.height/3)),h=guild?10.2:Math.max(5.8,s.height),floor=h/stories;
  const plaster=['#d5cbb0','#c4b288','#bfbd9e','#c5a083'][Math.min(3,Math.floor(seed*4))],roof=brick||seed<.76?P.tile:P.slate;
  b.frame(x,y,z,yaw,()=>{
    b.block(P.stone,0,low-y,0,w+.5,y-low+.2,d+.5);
    for(let level=0;level<stories;level++){
      const jut=brick?0:level*.16,ww=w+2*jut,dd=d+2*jut,yy=level*floor;
      b.block(brick?P.brick:plaster,0,yy,0,ww,floor,dd);
      b.block(brick?P.trim:P.oak,0,yy,0,ww+.15,.2,dd+.15);
      // Every facade has windows and framing; the long sides face alleys too.
      for(const side of [-1,1]){
        b.frame(0,0,side*dd/2,side<0?Math.PI:0,()=>facade(ww,yy,level));
        b.frame(side*ww/2,0,0,side*Math.PI/2,()=>facade(dd,yy,level));
      }
      function facade(width,yy,level){
        if(!brick){
          for(const xx of [-width/2+.1,0,width/2-.1])b.block(P.oak,xx,yy,.04,.18,floor,.15);
          for(const side of [-1,1]){
            const outer=side*(width/2-.2),inner=side*(width*.30);
            b.beam(P.oak,[outer,yy+.2,.08],[inner,yy+floor-.2,.08],.16);
            if(seed>.4)b.beam(P.beam,[inner,yy+.2,.08],[outer,yy+floor-.2,.08],.12);
            if(level)b.beam(P.oak,[side*width*.35,yy-.48,-.28],[side*width*.35,yy,.14],.17);
          }
        }
        for(const xx of [-width*.23,width*.23])window(b,xx,yy+.85,.12,.86,Math.min(1.25,floor-1.3),{arched:brick,shutters:!brick,seed});
      }
    }
    const projection=brick?0:(stories-1)*.32,rw=w+projection+1,rd=d+projection+1.15,rise=rw*.78;
    b.roof(roof,0,h,0,rw,rd,rise,0,brick?P.brick:plaster);
    // Tile-course seams supply texture without a separate mesh per tile.
    for(const side of [-1,1])for(let t=.18;t<.99;t+=.18){
      const xx=side*rw/2*(1-t),yy=h+rise*t+.035;b.beam(seed<.5?'#ac7153':'#80634f',[xx,yy,-rd/2],[xx,yy,rd/2],.04);
    }
    for(const side of [-1,1])b.frame(0,0,side*(rd/2+.04),side<0?Math.PI:0,()=>framedGable(b,rw,0,h,rise,plaster,brick));
    if(!brick&&seed>.3){
      b.block(plaster,rw*.27,h+.45,0,1.25,1.35,1.7);b.roof(roof,rw*.27,h+1.8,0,1.65,2,1.15);
      window(b,rw*.27,h+.6,.87,.55,.85);
    }
    b.block(P.brick,-w*.24,h,-d*.23,.7,rise+1,.8);b.block(P.trim,-w*.24,h+rise+.85,-d*.23,.92,.22,1);
    b.block(P.oak,0,.12,d/2+.08,guild?1.9:1.25,guild?2.9:2.15,.18);
    for(const side of [-1,1])b.block(P.trim,side*(guild?1.07:.75),0,d/2+.13,.14,guild?3:2.3,.2);
    b.block(P.trim,0,0,d/2+.42,guild?2.6:1.85,.16,.8);
    if(kind==='timber'){
      b.block(P.oak,-w*.27,1.02,d/2+.48,2,.13,.8);b.roof(seed>.5?'#7c865f':'#b19163',-w*.27,2.4,d/2+.5,2.6,1.7,.45);
      b.beam(P.oak,[w/2,2.9,d/2],[w/2+.8,2.9,d/2],.11);
      b.block(P.blue,w/2+.55,2,d/2,.6,.7,.1);
      b.block('#c0a566',w/2+.55,2.18,d/2+.06,.28,.3,.05);
    }
    if(kind==='merchant'){
      // Gable loading hatch and timber hoist over the street-facing door.
      b.block(P.oak,0,h+.4,rd/2+.3,1.1,1.7,.12);b.beam(P.oak,[0,h+2.5,rd/2],[0,h+2.5,rd/2+1.65],.18);
      b.cylinder('#ad9870',0,h+.25,rd/2+1.6,.04,2.25);b.block(P.blue,-w*.35,2.4,d/2+.1,.7,1.6,.08);
    }
    if(guild){
      // A small civic bell turret, still far below the royal fortress skyline.
      const ty=h+rise-.65;b.block(P.stone,0,ty-1.8,0,2.5,3,2.5);
      for(const xx of [-.9,.9])for(const zz of [-.9,.9])b.block(P.oak,xx,ty+1.2,zz,.22,2.6,.22);
      b.cylinder('#b09658',0,ty+1.65,0,.6,.8);b.cone(P.metal,0,ty+3.8,0,2,4.2,Math.PI/4,4);b.cylinder(P.trim,0,ty+7.7,0,.08,1.3);
      for(const side of [-1,1])b.sheet(P.blue,[side*2-.45,6.4,d/2+.2],[side*2+.45,6.4,d/2+.2],[side*2+.45,4.2,d/2+.2],[side*2-.45,4.2,d/2+.2]);
      b.block(P.trim,0,h-1.3,d/2+.15,2.5,.75,.22);b.block(P.blue,0,h-1.18,d/2+.29,.85,.46,.04);
    }
  });
  const c=Math.abs(Math.cos(yaw)),sine=Math.abs(Math.sin(yaw)),hx=(w*c+d*sine)/2+.6,hz=(d*c+w*sine)/2+.6;
  colliders.push({x,z,hx,hz,minY:low,maxY:y+h+w*1.4+10,minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz,kind:'building'});
}
