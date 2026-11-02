import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

// Keep the desk and its clutter east of the southern window's viewing lane.
export const SNERO_DESK_SHIFT=4.2;
// Snero's spatial experiments and belongings remain inexpensive local scenery.
// His four live windows are supplied separately.
export function createSenroStudy({parent,palette:p,solid,finish,ownedMaterials}){
  const root=new THREE.Group();root.name='Snero: the folded study and impossible luggage';parent.add(root);
  const b=createSceneryBuilder('Snero: folded depth, travel charts and brass hooks'),meshes=[];
  const paper='#d7c9ad',leather='#70503c',dark='#34454e',ink='#53666d',copper='#a88255';
  const finishOwned=(builder,group=root)=>{const mesh=finish(builder,group);meshes.push(mesh);return mesh;};
  const ring=(builder,color,x,y,z,r,thick=.035)=>{
    for(let i=0;i<16;i++){const a=i*Math.PI/8,c=(i+1)*Math.PI/8;builder.beam(color,[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(c)*r,y+Math.sin(c)*r,z],thick);}
  };
  function scroll(x,y,z,yaw=0,scale=1){b.frame(x,y,z,yaw,()=>{
    b.block(paper,0,0,0,.8*scale,.025,.68*scale);
    for(const side of [-1,1])b.block(p.trim,0,.025,side*.34*scale,.85*scale,.08,.075);
    for(let i=0;i<5;i++)b.block(ink,-.03,.028,-.21*scale+i*.1*scale,(.47-i*.045)*scale,.009,.014);
  });}
  function tinyBooks(builder,x,y,z,scale,count=5){
    for(let j=0;j<count;j++){
      const color=['#566c72','#8c7856','#a08757','#62775f','#936a55'][j%5],xx=x+(j-(count-1)/2)*.25*scale,h=(.55+(j%3)*.08)*scale;
      builder.block(color,xx,y,z,.20*scale,h,.36*scale);
      for(const yy of [.12*scale,h-.13*scale])builder.block(p.gold,xx,y+yy,z+.185*scale,.14*scale,.024*scale,.015);
    }
  }
  function arch(width,height,z,bottom,shade){
    for(const side of [-1,1]){
      b.block(shade,side*width/2,bottom,z,.28,height-.75,.30);
      b.block(p.gold,side*width/2,bottom+.35,z+.18,.045,height-1.1,.045);
      b.block(p.shade,side*width/2,bottom,z,.48,.25,.53);
    }
    const spring=bottom+height-.75;
    b.beam(shade,[-width/2,spring,z],[-width*.27,bottom+height-.12,z],.3);
    b.beam(shade,[-width*.27,bottom+height-.12,z],[width*.27,bottom+height-.12,z],.3);
    b.beam(shade,[width*.27,bottom+height-.12,z],[width/2,spring,z],.3);
    b.block(p.gold,0,bottom+height-.3,z+.18,.12,.34,.06);
  }
  // Forced perspective makes the north alcove seem to contain a whole further
  // library. Unlike the old painted country backdrop, every visible object is
  // interior architecture. A brass study rail makes it an experiment to view.
  b.block('#52616a',0,0,-12.22,6.8,7.2,.12);
  const frames=[];
  for(let i=0;i<7;i++){
    const s=Math.pow(.77,i),width=6.3*s,height=6.6*s,z=-6.65-i*.78,bottom=(6.6-height)*.42;
    const shade=new THREE.Color(p.trim).lerp(new THREE.Color('#819098'),i*.065).getHex();arch(width,height,z,bottom,shade);
    frames.push({s,width,height,z,bottom});
    if(i<6){
      const ns=Math.pow(.77,i+1),nw=6.3*ns,nh=6.6*ns,nz=z-.78,nb=(6.6-nh)*.42;
      b.sheet(i%2?'#a4a9a2':'#9aa49e',[-width/2,bottom+.025,z],[width/2,bottom+.025,z],[nw/2,nb+.025,nz],[-nw/2,nb+.025,nz]);
      for(const side of [-1,1])b.sheet('#77878b',[side*width/2,bottom,z],[side*nw/2,nb,nz],[side*nw/2,nb+nh,nz],[side*width/2,bottom+height,z]);
      b.sheet('#5e6f79',[-width/2,bottom+height,z],[-nw/2,nb+nh,nz],[nw/2,nb+nh,nz],[width/2,bottom+height,z]);
      for(const r of [-.27,0,.27])b.beam('#d5c8a7',[width*r,bottom+.045,z],[nw*r,nb+.045,nz],.025*s);
      if(i%2===0)for(const side of [-1,1]){
        const xx=side*width*.37,zz=z-.34;
        b.block(p.wood,xx,bottom+.20,zz,width*.17,height*.44,.26*s);
        for(let row=0;row<3;row++){
          const yy=bottom+.25+row*.70*s;b.block(copper,xx,yy,zz+.08,width*.18,.06*s,.34*s);
          tinyBooks(b,xx,yy+.06*s,zz+.02,s*.65,4);
        }
      }
    }
  }
  const end=frames.at(-1);
  b.block(p.wood,0,end.bottom,-11.95,1.02,1.30,.08);b.block(p.cloth,0,end.bottom+.14,-11.89,.80,1.0,.035);
  b.block(p.gold,.28,end.bottom+.65,-11.86,.06,.08,.035);
  for(const x of [-3.15,0,3.15]){b.cylinder(p.gold,x,0,-6.25,.075,1.2);b.rock(p.gold,x,1.24,-6.25,.11,.11,.11);}
  b.beam(p.gold,[-3.15,1.10,-6.25],[3.15,1.10,-6.25],.055);
  solid(0,0,-6.25,6.5,1.35,.18,'senro-study-rail');
  solid(0,0,-9.3,6.7,7.2,5.4,'senro-folded-study');
  // An ascending ribbon of little steps turns onto the east wall of the fold.
  // It is deliberately behind the study rail, never a misleading walking path.
  for(let i=0;i<12;i++){
    const t=i/11,x=3.8-.55*t,y=.28+i*.34,z=-8.2+i*.07;
    b.block(i%2?p.trim:'#acae9f',x,y,z,.9,.14,.55);
    b.beam(copper,[x+.37,y+.14,z-.2],[x+.37,y+.88,z-.2],.035);
    if(i<11)b.beam(copper,[x+.37,y+.88,z-.2],[x+.32,y+1.22,z-.13],.045);
  }
  solid(3.7,0,-7.85,1.2,5,.95,'senro-folded-stairs');

  // The travel desk is usefully cluttered: charts, route notes, compass,
  // tied tickets, a folded coat and boots waiting for the next departure.
  b.frame(SNERO_DESK_SHIFT,0,0,0,()=>{
    scroll(-8.7,1.45,7.2,.18,1.35);scroll(-7.4,1.49,7.55,-.26,.85);
    b.cylinder(copper,-9.45,1.45,7.72,.23,.08);ring(b,p.gold,-9.45,1.56,7.72,.16,.025);
    b.beam('#7dabb3',[-9.58,1.55,7.72],[-9.32,1.55,7.72],.035);
    for(let i=0;i<5;i++){
      b.block(['#c6aa70','#a5b9ad','#a4b5be'][i%3],-7.15+i*.045,1.46+i*.014,6.86,.46,.018,.3,-.2);
      b.block(ink,-7.15+i*.045,1.48+i*.014,6.86,.24,.009,.013,-.2);
    }
    b.beam(leather,[-7.27,1.55,6.80],[-6.99,1.55,6.95],.032);
    b.block(leather,-8.0,1.45,8.05,.62,.22,.48);b.block(p.gold,-8.0,1.61,7.79,.12,.10,.035);
    for(const side of [-1,1]){
      b.block('#57483c',-6.25+side*.16,.02,8.9,.25,.38,.26);b.block('#57483c',-6.25+side*.16,.02,8.72,.25,.16,.53);
      b.block(copper,-6.25+side*.16,.22,8.75,.18,.045,.04);
    }
  });
  solid(-6.25+SNERO_DESK_SHIFT,0,8.75,.75,.45,.85,'senro-travel-boots');
  // Wall pegs, coat, a walking stick and several sets of mislaid keys.
  b.block(p.wood,1.3,3.3,12.10,5.8,.30,.22);
  for(const x of [-.9,.2,1.3,2.4,3.5]){
    b.beam(p.gold,[x,3.45,11.98],[x,3.45,11.65],.07);b.beam(p.gold,[x,3.45,11.65],[x,3.63,11.65],.07);
  }
  b.block('#74604c',.2,1.5,11.73,.85,1.75,.14);b.beam('#74604c',[-.22,3.12,11.73],[-.65,2.36,11.73],.22);b.beam('#74604c',[.62,3.12,11.73],[.98,2.36,11.73],.22);
  b.block(p.trim,.2,2.96,11.61,.13,.31,.04);b.block(leather,.2,2.12,11.60,.82,.065,.055);
  b.beam(p.wood,[2.4,.3,11.7],[2.4,3.45,11.7],.10);ring(b,p.gold,2.4,3.42,11.7,.16,.04);
  for(let i=0;i<4;i++){
    const x=-.96+i*.10;ring(b,p.gold,x,3.30-i*.07,11.65,.065,.022);b.beam(p.gold,[x,3.23-i*.07,11.65],[x,3.02-i*.07,11.65],.025);
    b.block(p.gold,x+.035,3.03-i*.07,11.65,.1,.03,.025);
  }
  // A freestanding folding chart is about spatial construction, not a made-up
  // replacement for the actual Azhora landscape in the windows.
  b.frame(8,0,-10.6,0,()=>{
    for(const x of [-.9,.9])b.block(p.wood,x,0,0,.13,3.9,.16);
    b.block(p.wood,0,1.4,0,2.15,2.6,.16);b.block('#c3bd9c',0,1.53,.10,1.9,2.32,.025);
    for(let i=0;i<4;i++){
      const s=1-i*.17;b.beam(ink,[-.7*s,1.85+i*.18,.13],[.7*s,1.85+i*.18,.13],.025);
      b.beam(ink,[-.7*s,1.85+i*.18,.13],[-.7*s,3.53-i*.18,.13],.025);b.beam(ink,[.7*s,1.85+i*.18,.13],[.7*s,3.53-i*.18,.13],.025);
    }
    b.beam(p.wood,[-.9,.2,0],[-.9,2.7,-.7],.10);b.beam(p.wood,[.9,.2,0],[.9,2.7,-.7],.10);
  });solid(8,0,-10.6,2.4,4,1.2,'senro-chart-stand');

  const luggage=[];
  function trunk({name,position,rotation,width=2.1,height=1.0,depth=1.1,color=leather}){
    const group=new THREE.Group();group.name=`Snero luggage: ${name}`;group.position.set(...position);group.rotation.set(...rotation);root.add(group);
    const q=createSceneryBuilder(group.name);
    q.box(color,0,0,0,width,height,depth);q.box('#9b7756',0,height*.15,0,width+.045,.07,depth+.05);
    for(const side of [-1,1]){
      q.box('#3e3530',side*width*.32,0,0,.13,height+.05,depth+.08);
      q.box(copper,side*width*.32,.06,-depth/2-.055,.23,.24,.06);q.box('#3e3530',side*width*.32,.06,-depth/2-.09,.10,.12,.02);
    }
    for(const xx of [-1,1])for(const yy of [-1,1])for(const zz of [-1,1])q.box(p.gold,xx*(width/2-.075),yy*(height/2-.06),zz*(depth/2-.05),.16,.13,.12);
    q.box(p.gold,0,0,-depth/2-.05,.26,.23,.07);q.box(dark,0,-.015,-depth/2-.092,.035,.075,.01);
    for(const x of [-.22,.22])q.box(p.gold,x,height/2+.03,0,.10,.08,.13);
    q.beam(leather,[-.22,height/2+.08,0],[-.18,height/2+.25,0],.08);q.beam(leather,[-.18,height/2+.25,0],[.18,height/2+.25,0],.08);q.beam(leather,[.18,height/2+.25,0],[.22,height/2+.08,0],.08);
    for(const [x,y,c] of [[-.52,.22,'#b7c4ae'],[.48,-.22,paper]]){
      q.box(c,x,y,-depth/2-.059,.34,.22,.018);for(let i=0;i<3;i++)q.box(ink,x,y+.05-i*.05,-depth/2-.071,.21-i*.025,.013,.009);
    }
    finishOwned(q,group);luggage.push({name,position:[...position],rotation:[...rotation]});
  }
  // Each visible hook holds a handle. The cases stay at impossible angles
  // without dangling a rope from the ceiling to explain away the magic.
  b.block(p.wood,13.42,4.25,6.2,.25,1.15,.58);
  b.beam(p.gold,[13.30,4.8,6.2],[12.70,4.8,6.2],.10);
  b.beam(p.gold,[12.70,4.8,6.2],[12.70,4.96,6.2],.10);
  trunk({name:'sideways portmanteau',position:[12,4.8,6.2],rotation:[0,0,-Math.PI/2],color:'#78533d'});
  solid(12,3.5,6.2,1.5,2.6,1.3,'senro-suspended-luggage');
  b.block(p.wood,9,5.05,12.39,1.2,.55,.28);b.beam(p.gold,[9,5.35,12.26],[9,5.35,10.8],.09);
  b.beam(p.gold,[9,5.35,10.8],[9,5.48,10.8],.09);
  trunk({name:'upside-down case',position:[9,6.2,10.8],rotation:[0,0,Math.PI],width:2.0,color:'#596b70'});
  solid(9,5.5,10.8,2.2,1.4,1.3,'senro-suspended-luggage');
  const satchelHandle=new THREE.Vector3(0,.8,0).applyEuler(new THREE.Euler(-.25,.25,.55)).add(new THREE.Vector3(6.8,5,9.8));
  b.block(p.wood,satchelHandle.x,satchelHandle.y-.33,12.39,.55,.55,.28);
  b.beam(p.gold,[satchelHandle.x,satchelHandle.y-.08,12.26],[satchelHandle.x,satchelHandle.y-.08,satchelHandle.z],.085);
  b.beam(p.gold,[satchelHandle.x,satchelHandle.y-.08,satchelHandle.z],[satchelHandle.x,satchelHandle.y+.06,satchelHandle.z],.085);
  trunk({name:'tilted travel satchel',position:[6.8,5.0,9.8],rotation:[-.25,.25,.55],width:1.3,height:1.1,depth:.55,color:'#a07b4e'});
  solid(6.8,4,9.8,1.8,2,.9,'senro-suspended-luggage');
  finishOwned(b);
  return {
    studyState:()=>({foldedFrames:frames.length,luggage:luggage.map(q=>({...q,position:[...q.position],rotation:[...q.rotation]})),staticBatches:meshes.length}),
    dispose(){root.removeFromParent();for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();ownedMaterials.delete(mesh.material);}},
  };
}
