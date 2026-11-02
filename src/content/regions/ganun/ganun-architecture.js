/** Brick civic Gothic and modest timber houses, interpreted for Ganun rather
 * than copied from a specific building. Stepped gables, dark glazed brick bands,
 * narrow windows and deep clay roofs distinguish this northern trading port. */
export const GANUN_PALETTE=Object.freeze({brick:'#9d5944',brickLight:'#b67453',stone:'#989a87',trim:'#d0bd8d',tile:'#88463a',tileLight:'#a76043',slate:'#435c5f',plaster:'#ceb992',oak:'#594633',dark:'#343f3b',metal:'#454c43',cloth:'#8f3f35',gold:'#c1a264'});
export function pointedWindow(b,x,y,z,w,h,p,yaw=0){
  b.frame(x,y,z,yaw,()=>{
    b.block(p.trim,0,0,0,w+.3,h*.73,.15);
    b.triangle(p.trim,[-w/2-.15,h*.73,.09],[w/2+.15,h*.73,.09],[0,h+.2,.09]);
    b.block(p.dark,0,.13,.11,w,h*.64,.12);
    b.triangle(p.dark,[-w/2,h*.77,.18],[w/2,h*.77,.18],[0,h,.18]);
    b.block(p.trim,0,.12,.20,.085,h*.7,.07);
  });
}
function steppedGable(b,p,w,d,h,rise){
  for(const side of [-1,1]){
    for(let i=-3;i<=3;i++){
      const width=w/7,top=rise*(1-Math.abs(i)/4)+.5;
      b.block(p.brick,i*width,h,side*(d/2+.10),width+.02,top,.45);
      b.block(p.trim,i*width,h+top,side*(d/2+.10),width+.15,.20,.66);
    }
    for(const u of [-w*.25,0,w*.25])pointedWindow(b,u,h+.55,side*(d/2+.38),.65,1.9,p,side<0?Math.PI:0);
  }
}
export function ganunHouse(b,s,heightAt,colliders=[]){
  const {x,z,w,d,h,kind='merchant',seed=.5,yaw=0}=s,p=GANUN_PALETTE,wood=kind==='timber'||kind==='crane';
  const co=Math.cos(yaw),si=Math.sin(yaw),ys=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>heightAt(x+u*co+v*si,z-u*si+v*co));
  const y=Math.max(...ys),bottom=Math.min(...ys)-.35,roof=wood?p.slate:seed>.7?p.tile:p.tileLight;
  b.frame(x,y,z,yaw,()=>{
    b.block(p.stone,0,bottom-y,0,w+.5,y-bottom+.55,d+.5);
    b.block(wood?p.plaster:seed>.65?p.brick:p.brickLight,0,.35,0,w,h-.35,d);
    for(let level=3;level<h;level+=3)b.block(wood?p.oak:p.trim,0,level,0,w+.16,.16,d+.16);
    // Projecting corner masonry or square oak posts; no solid overlay panels.
    for(const side of [-1,1]){
      for(const u of [-w/2+.18,w/2-.18])b.block(wood?p.oak:p.trim,u,.3,side*(d/2+.045),.24,h-.3,.2);
      for(let level=0;level<h-1.4;level+=3)for(const u of [-w*.27,w*.27]){
        if(!wood)pointedWindow(b,u,level+1,side*(d/2+.06),.7,1.5,p,side<0?Math.PI:0);
        else {b.block(p.dark,u,level+1,side*(d/2+.05),.8,1.1,.13);b.block(p.trim,u,level+.92,side*(d/2+.12),1.05,.12,.22);}
      }
      b.block(p.oak,0,.35,side*(d/2+.08),1.4,2.1,.2);b.block(p.stone,0,.16,side*(d/2+.4),1.9,.2,.8);
    }
    for(const side of [-1,1])for(const zz of [-d*.33,0,d*.33]){
      if(wood)b.block(p.oak,side*(w/2+.03),.35,zz,.2,h-.35,.2);
      for(let level=0;level<h-1.4;level+=3)pointedWindow(b,side*(w/2+.07),level+1,zz,.65,1.5,p,side*Math.PI/2);
    }
    const rise=w*.53+1.2;b.roof(roof,0,h,0,w+.75,d+.75,rise,0,wood?p.plaster:p.brick);
    if(!wood)steppedGable(b,p,w,d,h,rise);
    else for(const side of [-1,1]){const zz=side*(d/2+.43);b.beam(p.oak,[-w/2-.35,h,zz],[0,h+rise,zz],.21);b.beam(p.oak,[0,h+rise,zz],[w/2+.35,h,zz],.21);b.beam(p.oak,[0,h,zz],[0,h+rise,zz],.18);}
    b.block(p.brick,w*.27,h,-d*.22,.8,rise+1,.8);b.block(p.trim,w*.27,h+rise+.8,-d*.22,1.1,.23,1.1);
    if(kind==='granary'){
      for(const side of [-1,1])for(let yy=2;yy<h;yy+=2.4)b.block(p.oak,0,yy,side*(d/2+.4),1.6,1.7,.25);
      b.beam(p.oak,[0,h+1,d/2],[0,h+1,d/2+3.5],.3);b.beam(p.metal,[0,h+1,d/2+3.3],[0,2,d/2+3.3],.06);
    }
    if(kind==='town-hall'||kind==='bell-hall'){
      const tz=-d/2+3.8,tall=kind==='town-hall'?32:26;
      b.block(p.brick,0,0,tz,7.2,tall,7.2);
      for(const u of [-3.5,3.5])for(const v of [-3.5,3.5])b.block(p.trim,u,0,tz+v,.38,tall,.38);
      for(const yy of [8,16,tall-7,tall-1])b.block(p.trim,0,yy,tz,7.7,.35,7.7);
      for(const side of [-1,1])for(const u of [-1.5,1.5])pointedWindow(b,u,tall-6,tz+side*3.7,1.15,3.4,p,side<0?Math.PI:0);
      b.cone(p.slate,0,tall,tz,5.8,9,Math.PI/4,4);b.cylinder(p.gold,0,tall+8.8,tz,.1,2.5);
      b.sheet(p.cloth,[0,tall+10.8,tz],[2.2,tall+10.5,tz],[2.2,tall+9.6,tz],[0,tall+9.9,tz]);
      if(kind==='town-hall'){
        // Open arcade along the market-facing flank, with walkable arch bays.
        b.roof(p.tile,w/2+2.1,4,0,4.8,d+1,2.1);
        for(let v=-d/2;v<=d/2;v+=4.4)b.block(p.stone,w/2+3.8,0,v,.6,4.2,.65);
      }
    }
    if(kind==='crane'){
      b.block(p.oak,0,0,d/2+1,6,12,3.5);b.roof(p.slate,0,12,d/2+2,7.3,5,5,0,p.oak);
      b.beam(p.oak,[0,10,d/2+1],[0,10,d/2+10],.6);
      b.beam(p.oak,[0,4,d/2+1],[0,10,d/2+8],.4);
      b.beam(p.metal,[0,10,d/2+9],[0,2,d/2+9],.075);
      b.block(p.oak,0,1.3,d/2+9,1.4,1.4,1.4);
    }
  });
  const hx=(w*Math.abs(co)+d*Math.abs(si))/2+.35,hz=(d*Math.abs(co)+w*Math.abs(si))/2+.35;
  colliders.push({x,z,hx,hz,minY:bottom,maxY:y+(['town-hall','bell-hall'].includes(kind)?43:h+8),kind:'building'});
}
