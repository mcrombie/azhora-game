import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

// The destination is explained by Taleth and the nearby interaction prompt.
// The landmark itself is joinery and a Guild emblem, without a painted UI sign.
export function buildArrivalDoor(b,root){
  const z=40.5,spring=4.35,r=2.12,brass='#9a8050',edge='#b49a66',wood='#51453a',recess='#39352f';
  const box=(c,x,y,d,w,h,t)=>b.block(c,x,y,d,w,h,t);
  const arc=(builder,c,x,y,d,radius,start,end,n,width)=>{
    for(let i=0;i<n;i++){const a=start+(end-start)*i/n,v=start+(end-start)*(i+1)/n;
      builder.beam(c,[x+Math.cos(a)*radius,y+Math.sin(a)*radius,d],[x+Math.cos(v)*radius,y+Math.sin(v)*radius,d],width);}
  };
  // A solid arched silhouette. The curved top is timber too, not an opening
  // filled by a picture. Deliberate depth separates boards, moulding and iron.
  for(const side of [-1,1])box(wood,side*1.075,.1,z+.16,2.10,spring-.1,.28);
  for(let i=0;i<28;i++){
    const a=i*Math.PI/28,v=(i+1)*Math.PI/28;
    const c=[0,spring,z+.02],p=[Math.cos(a)*r,spring+Math.sin(a)*r,z+.02],q=[Math.cos(v)*r,spring+Math.sin(v)*r,z+.02];
    b.triangle(i%3?'#51453a':'#574a3d',c,q,p);
    b.quad(wood,p,q,[q[0],q[1],z+.30],[p[0],p[1],z+.30]);
  }
  for(const side of [-1,1]){
    // Joinery: rails, stiles, and recessed panels with sloping bevels.
    for(const x of [side*.13,side*1.99])box('#685543',x,.13,z-.025,.16,4.2,.15);
    for(const y of [.22,2.12,4.12])box('#685543',side*1.06,y,z-.04,1.92,.16,.16);
    for(const [y,h] of [[.52,1.38],[2.5,1.38]]){
      const x=side*1.06,w=1.58;
      box(recess,x,y,z+.003,w,h,.05);
      const outer=[[x-w/2,y,z-.10],[x+w/2,y,z-.10],[x+w/2,y+h,z-.10],[x-w/2,y+h,z-.10]];
      const inner=[[x-w/2+.10,y+.10,z-.02],[x+w/2-.10,y+.10,z-.02],[x+w/2-.10,y+h-.10,z-.02],[x-w/2+.10,y+h-.10,z-.02]];
      for(let j=0;j<4;j++)b.quad('#796047',outer[(j+1)%4],outer[j],inner[j],inner[(j+1)%4]);
      for(const dx of [-.39,0,.39])box('#484037',x+dx,y+.12,z-.029,.012,h-.24,.008);
      // Narrow brass corner inlays, not a contrasting rectangular title card.
      for(const dx of [-.64,.64])for(const yy of [y+.18,y+h-.18])
        b.rock(brass,x+dx,yy,z-.045,.045,.045,.012);
    }
    // Three strap hinges end in branching, leaf-shaped metalwork.
    for(const y of [.45,2.28,4.27]){
      const end=side*.72;
      b.beam(brass,[side*2.08,y,z-.16],[end,y,z-.16],.085,.055);
      for(const dy of [-.16,.16])b.beam(brass,[side*1.06,y,z-.16],[end, y+dy,z-.16],.045);
      b.rock(edge,end,y,z-.16,.10,.065,.045);
      for(const x of [side*1.32,side*1.82])b.rock(edge,x,y,z-.2,.033,.033,.027);
      b.cylinder(brass,side*2.08,y-.13,z-.1,.075,.26);
    }
    // Ring handles attached to shield-shaped escutcheons.
    b.rock(brass,side*.32,2.65,z-.13,.15,.23,.045);
    b.rock(edge,side*.32,2.66,z-.24,.07,.07,.07);
    arc(b,edge,side*.32,2.46,z-.29,.16,0,Math.PI*2,16,.037);
  }
  arc(b,'#796047',0,spring,z-.04,1.97,0,Math.PI,28,.105);
  arc(b,brass,0,spring,z-.10,1.84,0,Math.PI,28,.035);
  // A small, three-dimensional hourglass set into a circular timber medallion.
  arc(b,'#796047',0,5.3,z-.09,.59,0,Math.PI*2,24,.13);
  arc(b,brass,0,5.3,z-.15,.50,0,Math.PI*2,24,.032);
  for(const dy of [-.27,.27])b.beam(edge,[-.24,5.3+dy,z-.17],[.24,5.3+dy,z-.17],.065);
  for(const s of [-1,1])b.beam(brass,[s*.19,5.07,z-.17],[-s*.19,5.53,z-.17],.043);
  // Grounded limestone surround, individual arch stones and a keystone.
  for(const side of [-1,1]){
    box('#c3b69a',side*2.49,0,z+.10,.58,spring,.72);
    box('#d4c8ae',side*2.49,0,z+.07,.88,.30,1.02);
    box('#d4c8ae',side*2.49,4.12,z+.06,.78,.23,.92);
    box('#ddd1b6',side*2.20,.29,z-.19,.12,3.84,.17);
    for(const y of [1.16,2.29,3.42])box('#aa9e85',side*2.5,y,z-.265,.55,.023,.013);
  }
  const inner=2.23,outer=2.8;
  for(let i=0;i<18;i++){
    const a=i*Math.PI/18+.008,v=(i+1)*Math.PI/18-.008;
    const point=(radius,angle,d)=>[Math.cos(angle)*radius,spring+Math.sin(angle)*radius,d];
    const ia=point(inner,a,z-.26),iv=point(inner,v,z-.26),oa=point(outer,a,z-.26),ov=point(outer,v,z-.26);
    const back=p=>[p[0],p[1],z+.44];
    const tint=['#c5b89b','#cebea0','#baad92'][i%3];
    b.quad(tint,oa,ia,iv,ov);b.quad(tint,back(ov),back(iv),back(ia),back(oa));
    b.quad(tint,ia,back(ia),back(iv),iv);b.quad(tint,ov,back(ov),back(oa),oa);
    b.quad(tint,oa,back(oa),back(ia),ia);b.quad(tint,iv,back(iv),back(ov),ov);
  }
  b.rock('#dfd0ad',0,7.02,z-.20,.22,.36,.22);
  box('#b8ae99',0,.025,z-.15,4.38,.07,1.02);
  // Steady blue light escapes through hairline joints. One tiny emissive batch
  // and one local, shadowless light: no animated portal texture or bloom pass.
  const g=createSceneryBuilder('Blue light in the door joints'),blue='#719dc6';
  g.block(blue,0,.13,z-.006,.018,6.30,.018);
  for(const side of [-1,1])g.block(blue,side*2.135,.12,z-.004,.022,spring-.12,.022);
  g.block(blue,0,.115,z-.015,4.26,.024,.022);
  arc(g,blue,0,spring,z-.006,2.13,0,Math.PI,36,.024);
  const glow=g.finish(root,{castShadow:false});
  glow.material=new THREE.MeshBasicMaterial({color:0x759fce,transparent:true,opacity:.7,toneMapped:false});
  const light=new THREE.PointLight(0x79a9ef,1.8,4.5,1.5);light.name='Faint blue door light';light.position.set(0,1.1,z-.7);root.add(light);
  return {dispose(){glow.removeFromParent();light.removeFromParent();glow.geometry.dispose();glow.material.dispose();}};
}
