// Alezhor's common vocabulary: warm Pyrosi stone, glazed border tiles, heavy
// northern timber and steep roofs. Only civic roofs get lifted tips and tiers.
export const ALEZHOR_PALETTE = Object.freeze({
  stone:'#d4c9a6', shade:'#b1a383', light:'#e5ddbf', wood:'#594531', timber:'#886647',
  dark:'#283a39', tile:'#367173', trim:'#b49250', plaster:'#ddd1ad', roof:'#426466',
});
const C=ALEZHOR_PALETTE;
export function alezhorArch(b,x,y,z,w,h,depth=0.14,tint=C.light) {
  const spring=h*.58,r=w/2;
  for(const side of [-1,1])b.block(tint,x+side*(r+.16),y,z,.32,spring,depth);
  for(let i=0;i<9;i++){
    const a=i*Math.PI/9,c=(i+1)*Math.PI/9;
    b.sheet(tint,[x+Math.cos(a)*r,y+spring+Math.sin(a)*(h-spring),z],
      [x+Math.cos(c)*r,y+spring+Math.sin(c)*(h-spring),z],
      [x+Math.cos(c)*(r+.32),y+spring+Math.sin(c)*(h-spring+.32),z],
      [x+Math.cos(a)*(r+.32),y+spring+Math.sin(a)*(h-spring+.32),z]);
  }
}
export function alezhorRoof(b,x,y,z,w,d,rise,{tint=C.roof,ceremonial=false,yaw=0}={}) {
  b.frame(x,y,z,yaw,()=>{
    // A steep central ridge drains into lower, flared eaves, all timber framed.
    const at=(side,u,v)=>[side*u,Math.max(0,(1-u/(w/2)))*rise,v];
    for(const side of [-1,1]){
      const middle=w*.32;
      b.sheet(tint,at(side,0,-d/2),at(side,middle,-d/2),at(side,middle,d/2),at(side,0,d/2));
      b.sheet(tint,at(side,middle,-d/2),[side*w/2,ceremonial?.30:0,-d/2],[side*w/2,ceremonial?.30:0,d/2],at(side,middle,d/2));
      b.beam(C.wood,[side*w/2,.03,-d/2],[side*w/2,.03,d/2],.18);
      for(let v=-d/2;v<=d/2;v+=1.5)b.beam('#627b73',at(side,.12,v),[side*w/2,.08,v],.045);
    }
    for(const v of [-d/2,d/2]){
      b.triangle(C.timber,[-w/2,0,v],[w/2,0,v],[0,rise,v]);
      b.triangle(C.timber,[0,rise,v],[w/2,0,v],[-w/2,0,v]);
      b.beam(C.light,[-w/2,0,v],[0,rise,v],.16);b.beam(C.light,[w/2,0,v],[0,rise,v],.16);
      b.beam(C.wood,[0,.05,v],[0,rise,v],.18);
      if(ceremonial){
        const s=Math.sign(v),front=v+s*.06;
        b.beam(C.trim,[0,rise,v],[0,rise+1.1,v+s*.8],.13);b.beam(C.trim,[0,rise+1.1,v+s*.8],[0,rise+1.8,v+s*.62],.11);
        // Carved sunburst within the timber gable; glazed diamonds sit below it.
        for(const u of [-.28,-.14,.14,.28])b.beam(C.trim,[u*w,.35,front],[0,rise*.78,front],.1);
        for(let u=-w*.34;u<=w*.34;u+=.7)b.box(C.tile,u,.45,front,.24,.24,.06,0,0,Math.PI/4);
      }
    }
    b.beam(ceremonial?C.trim:C.wood,[0,rise+.07,-d/2],[0,rise+.07,d/2],.20);
  });
}
export function alezhorHouse(b,s,heightAt,colliders) {
  const {x,z,w,d,h,kind,variant=0,yaw=0}=s;
  const corners=[[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]].map(([u,v])=>heightAt(x+u,z+v));
  const y=Math.max(...corners)+.08;
  const foot=Math.min(y-.5,...corners.map(h=>h-.25)),upper=kind==='log-house'||variant%3===0;
  b.frame(x,0,z,yaw,()=>{
    b.block(C.shade,0,foot,0,w+.45,y-foot+.25,d+.45);
    b.block(upper?C.timber:[C.plaster,'#c7baa1','#e0d7be'][variant%3],0,y,0,w,h,d);
    b.block(C.stone,0,y,0,w+.12,Math.min(2.4,h),d+.12);
    for(const yy of [y+2.35,y+h-.32])b.box(C.wood,0,yy,0,w+.2,.17,d+.2);
    if(upper)for(let yy=y+2.65;yy<y+h-.4;yy+=.42){
      b.box('#6f523b',0,yy,0,w+.12,.055,d+.12);
      for(const u of [-w/2,w/2])b.block(C.wood,u,yy,-d/2,.32,.21,.48);
    }
    else for(const u of [-w/2+.2,0,w/2-.2])b.block(C.wood,u,y+2.4,d/2+.08,.16,Math.max(.1,h-2.4),.18);
    const tiles=Math.floor(w/.65);
    for(let i=0;i<tiles;i++)b.block(i%3?C.tile:C.trim,-w/2+.4+i*.65,y+1.95,d/2+.09,.42,.27,.06);
    const door=kind==='warehouse'?2.4:1.45;
    b.block(C.wood,0,y+.05,d/2+.13,door,2.05,.16);alezhorArch(b,0,y+.05,d/2+.24,door,2.3);
    b.block(C.shade,0,heightAt(x,z+d/2+1),d/2+.55,door+1,.22,1.1);
    for(const side of [-1,1])for(let floor=0;floor<(h>6?2:1);floor++){
      const yy=y+2.8+floor*2.3,front=side*d/2;
      for(const u of [-w*.29,w*.29]){
        b.block(C.dark,u,yy,front+side*.09,1.0,1.15,.13);
        b.block(C.light,u,yy-.12,front+side*.14,1.25,.14,.24);
        b.block(C.trim,u,yy,front+side*.17,.07,1.1,.08);
        for(const v of [-.63,.63])b.block(C.tile,u+v,yy,front+side*.10,.22,1.14,.09);
      }
    }
    const roofTint=kind==='log-house'?'#646b58':variant%4===0?'#8a5944':C.roof;
    alezhorRoof(b,0,y+h+.06,0,w+1.1,d+1.5,kind==='warehouse'?3.3:w*.42,{tint:roofTint});
    if(kind!=='warehouse'&&kind!=='workshop')b.block(C.shade,w*.27,y+h,-d*.16,.8,3.4,.8);
    if(variant%4===1){
      b.block(C.wood,0,y+h-2.1,d/2+.65,w*.7,.18,1.2);
      for(let u=-w*.3;u<=w*.3;u+=.65)b.block(C.wood,u,y+h-2,d/2+1.2,.09,.8,.09);
      b.beam(C.trim,[-w*.34,y+h-1.2,d/2+1.2],[w*.34,y+h-1.2,d/2+1.2],.10);
    }
  });
  const c=Math.abs(Math.cos(yaw)),ss=Math.abs(Math.sin(yaw));
  colliders.push({id:s.id,kind:'building',x,z,hx:c*w/2+ss*d/2+.13,hz:ss*w/2+c*d/2+.13,minY:foot,maxY:y+h+w*.5+1});
  return y;
}
