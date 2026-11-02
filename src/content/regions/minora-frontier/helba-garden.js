import {gardenBotany} from './helba-botany.js';

// Four planted islands, a clear east entrance, and a quiet central work area.
// Ferns, fungi, flowers and carnivores occupy distinct beds rather than a grid
// of identical pots. Everything except the existing demonstration is static.
export function buildHelbaGarden(k,options){
  const {b,p,table,stool,lamp,label,moving,animate,action}=k;
  const bot=gardenBotany(b),{leaf,fern,broadleaf,flower,mushroom,pitcher,vine,soil}=bot;
  const beds=[{x:-8,z:7,rx:3.7,rz:3.6,type:'fungi'},
    {x:8,z:7.3,rx:3.8,rz:3.3,type:'flowers'},
    {x:-8.6,z:-7.8,rx:3.4,rz:3.5,type:'ferns'},
    {x:8.2,z:-7.2,rx:3.5,rz:4,type:'pitchers'}];
  beds.forEach(({x,z,rx,rz,type},index)=>{
    soil(x,.29,z,rx,rz,index);
    // Several smaller collision volumes follow the rounded bed, leaving its
    // corners and the approach to the central table naturally walkable.
    options.solid(x,0,z,rx*1.5,.7,rz*1.5);
    for(const side of [-1,1]){
      options.solid(x+side*rx*.72,0,z,rx*.35,.7,rz);
      options.solid(x,0,z+side*rz*.72,rx,.7,rz*.35);
    }
    for(let i=0;i<17;i++){
      const a=i*2.4+index,r=Math.sqrt((i+.4)/17)*.77;
      const xx=x+Math.sin(a)*rx*r,zz=z+Math.cos(a)*rz*r,s=.55+(i%4)*.15;
      if(type==='flowers'){
        if(i%4===0)broadleaf(xx,.31,zz,s,a);
        else flower(xx,.31,zz,s,['#d9c9a4','#c38e78','#a897b6'][Math.floor(i/5)%3],a);
      }else if(type==='fungi'){
        if(i%4===0)fern(xx,.31,zz,s,a);
        else for(let j=0;j<3;j++)mushroom(xx+j*.27,.31,zz+Math.sin(j)*.25,s*(.65+j*.21),i%3?'#b78461':'#97a990');
      }else if(type==='pitchers'){
        if(i%3===0)pitcher(xx,.31,zz,s,a);else if(i%3===1)fern(xx,.31,zz,s,a);else broadleaf(xx,.31,zz,s,a);
      }else{
        if(i%3)fern(xx,.31,zz,s*1.45,a);else broadleaf(xx,.31,zz,s*1.6,a);
      }
    }
    // Low ferns spill over the stone edging; the middle paths stay open.
    for(let j=0;j<5;j++)fern(x+Math.sin(j*2.4)*rx*.8,.36,z+Math.cos(j*2.4)*rz*.8,.65,j);
  });

  // Taller silhouettes behind the low beds: tree ferns, broad shade leaves
  // and an old colony of giant caps. Smaller specimens remain at the front.
  for(const [x,z,h] of [[-9.8,-9.6,1.5],[-7.1,-10.1,1.2],[10.1,-8.8,1.3]]){
    b.cylinder('#716142',x,.3,z,.18,h);
    for(let j=0;j<5;j++)b.cylinder('#8d815a',x,.5+j*h/5,z,.195,.045);
    fern(x,h+.3,z,2.1,x);
    broadleaf(x,h*.7,z,1.4,z);
  }
  for(const [x,z,s] of [[-10.1,9.2,2.8],[-8.6,9.7,2.1],[-10.8,7.6,1.7]])mushroom(x,.3,z,s,'#b18764');
  for(const [x,z] of [[10.2,8.8],[6.5,9.1],[9.6,-10.1],[-9.7,-5.6]]){
    broadleaf(x,.3,z,1.45,x);flower(x,.3,z,1.35,z>0?'#c89d8e':'#d8caa4',x);
  }

  // A weathered log with bracket fungi gives the front mushroom bed a larger
  // silhouette. Its ends, bark ribs and moss all share the static mesh.
  b.beam('#65513b',[-10,.63,6.9],[-6.7,.9,8.6],.57,.62);
  for(let j=0;j<7;j++){
    const x=-9.8+j*.42,z=7+j*.22;
    b.beam('#887250',[x,.91,z-.15],[x+.37,1,z+.07],.05);
    mushroom(x,.75,z+.36,.6+(j%3)*.13,j%2?'#b99268':'#ccba91');
    b.rock('#72844d',x,1.06,z,.29,.09,.27);
  }

  // Root-grown bower frames the restoration bed, without closing its front.
  for(const side of [-1,1]){
    const points=[[side*3.6,.15,-9.4],[side*(side<0?3.8:3.5),1.6,-9.7],[side*3.4,3.2,-10],
      [side*2.5,side<0?4.65:4.45,-10.2],[side*.9,5.15,-10.15],[0,5.3,-10.1]];
    for(let i=1;i<points.length;i++)b.beam(i%2?'#695b40':'#7f6c4a',points[i-1],points[i],.40-i*.045,.34-i*.035);
    for(let i=0;i<5;i++){
      const a=i*1.3,xx=side*3.6+Math.sin(a)*1.1,zz=-9.4+Math.cos(a)*.9;
      b.beam('#766343',[side*3.6,.32,-9.4],[xx,.12,zz],.16);
    }
    for(let j=0;j<6;j++){
      const xx=side*(.7+j*.48),yy=5.25-j*.15;
      for(let n=0;n<4;n++)leaf(xx,yy,-10.05,1.05,.40,side*(j+n*1.7),-.12,'#64824e');
      if(j%2===0)vine(Array.from({length:7},(_,i)=>[xx+Math.sin(i*.7+j)*.18,yy-i*.25,-9.9+i*.055]),j,.7);
      if(j%3===0)flower(xx,yy-.16,-10.1,.38,'#decdaa',j);
    }
    fern(side*3.8,.05,-9.2,.9,side);
    options.solid(side*3.6,0,-9.6,.85,4.2,1.2);
  }

  // Wandering climbing vines follow the masonry and timber supports instead
  // of hanging like straight ropes. Keep all large foliage at the margins.
  for(const side of [-1,1])for(const z of [-8,6]){
    b.block('#7d7552',side*12.35,.15,z,.16,6.8,.16);
    for(let j=0;j<5;j++)b.beam('#7d7552',[side*12.35,1+j*1.18,z-1.8],[side*12.35,1+j*1.18,z+1.8],.065);
    for(let j=0;j<3;j++){
      const points=Array.from({length:18},(_,i)=>[side*(12.2-Math.sin(i*.6+j)*.10),.3+i*.36,z+Math.sin(i*.55+j)*1.4]);
      vine(points,j+side,1.55);
    }
  }
  for(const [x,y,z] of [[-8,6.6,4],[8.7,6.5,-3.7],[7,7.1,9]]){
    b.cylinder('#927451',x,y,z,.48,.32);b.cylinder('#b3a27b',x,y+.27,z,.51,.08);
    for(let j=0;j<3;j++){
      const a=j*Math.PI*2/3;
      b.beam('#8c8b66',[x+Math.sin(a)*.4,y+.32,z+Math.cos(a)*.4],[x,9.55,z],.022);
      const points=Array.from({length:9},(_,i)=>[x+Math.sin(a+i*.3)*(.4+i*.025),y+.3-i*.24,z+Math.cos(a+i*.3)*(.4+i*.025)]);
      vine(points,a,.85);
    }
    fern(x,y+.32,z,.65,x);
  }

  // Low specimen ledges and the gardener's tools make this a working room.
  table(-11.6,0,1.8,3.8,.95);stool(-10,1.9);
  for(let j=0;j<4;j++){
    b.cylinder('#9f7957',-11.6,1.12,-1.2+j*.8,.27,.32);
    broadleaf(-11.6,1.45,-1.2+j*.8,.45,j);
  }
  b.block('#d3c5a0',-11.3,1.14,1.2,.53,.035,.72,.15);
  for(let j=0;j<4;j++)b.block('#7a8164',-11.3,1.18,.96+j*.14,.32,.006,.018,.15);
  table(8.5,-11.3,4.5,1.3,.9);
  for(let j=0;j<4;j++){
    b.block('#9b8059',7+j*.58,1.08,-11.3,.45,.20,.63);
    b.block('#695c43',7+j*.58,1.29,-11.3,.36,.015,.53);
    flower(7+j*.58,1.3,-11.3,.27,'#d7bd8d',j);
  }
  b.cylinder('#7d9b8b',10,1.07,-11.3,.26,.4);
  b.beam('#7d9b8b',[10.2,1.2,-11.3],[10.65,1.55,-11.3],.09);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,c=(i+1)*Math.PI/4;
    b.beam('#b2b98c',[9.78+Math.cos(a)*.2,1.35+Math.sin(a)*.26,-11.3],[9.78+Math.cos(c)*.2,1.35+Math.sin(c)*.26,-11.3],.04);
  }
  lamp(-4.8,3.8,2.6);lamp(4.7,-4.3,2.6);
  label('THE LIVING RESTORATION BED',0,3.15,-10.15,{width:4.5,height:.55});

  table(0,-8,4.2,2.7,1.05);
  b.block('#675c42',0,1.22,-8,4,.24,2.5);
  for(const x of [-1.98,1.98])b.block('#a69b78',x,1.36,-8,.09,.14,2.5);
  for(const z of [-9.2,-6.8])b.block('#a69b78',0,1.36,z,4,.14,.09);
  for(let j=0;j<17;j++){
    const x=-1.7+j*.19,z=-8+Math.sin(j*.9)*.32;
    b.beam('#d2cda2',[x,1.48,z],[x+.20,1.48,-8+Math.sin((j+1)*.9)*.32],.035);
    if(j%2===0)b.beam('#b8c79c',[x,1.48,z],[x+.12,1.48,z+(j%4?-.55:.55)],.022);
  }
  for(let i=0;i<5;i++)mushroom(-1.45+i*.34,1.47,-8.8,.32+i%2*.15,'#9ead88');
  fern(-1.25,1.47,-7.25,.45,1);flower(1.5,1.47,-8.7,.4,'#d8c397');
  const sprout=moving('Restored garden shoot',.8,1.48,-8,q=>gardenBotany(q).broadleaf(0,0,0,.8));
  const pulse=moving('Mycelial signal',-1.4,1.51,-8,q=>q.rock('#c7dfae',0,0,0,.13,.045,.13));
  let start=-100;action('mycelium',t=>{start=t;});
  animate(t=>{
    const age=t-start,u=Math.min(1,Math.max(0,age/3));pulse.visible=age>=0&&age<4;
    pulse.position.set(-1.4+u*2.2,1.51,-8+Math.sin(u*12)*.23);
    sprout.scale.y=age>=0&&age<12?.4+u*.6:.4;
  });
}
