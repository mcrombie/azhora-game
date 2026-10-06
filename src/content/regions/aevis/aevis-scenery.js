import * as THREE from 'three';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { SEA_LEVEL } from '../../../world/terrain/region-world.js';
import { AEVIS, AEVIS_OUTLINE, AEVIS_WALL_EDGES, AEVIS_GATES, AEVIS_BUILDINGS, AEVIS_PATHS, AEVIS_QUAYS, AEVIS_BOATS, AEVIS_DRILL_RACKS } from './aevis-city.js';

const STONE='#8c8971', LIGHT='#b2a78a', DARKSTONE='#6f7161', MORTAR='#656653';
const BRONZE='#ba8248', GOLD='#d6a762', DARKBRONZE='#875e37', PATINA='#527765', DEEPGREEN='#385f52';
const TIMBER='#64503a', DARK='#393b2c', LINEN='#d1c29c', RED='#853f31';
const TAU=Math.PI*2;

export function createAevisScenery(...args){return finishBuild(createAevisScenerySteps(...args));}

/** Bronze-clad stone on the Avite coast. The landward circuit has two open
 * gates; its eastern edges have no curtain or harbor boom. Static geometry is
 * merged by structure and yielded in small batches for Fast mode. */
export function* createAevisScenerySteps({parent,heightAt,colliders}){
  const root=new THREE.Group();root.name='Aevis - bronze citadel and open harbor';parent.add(root);
  const metrics={buildings:0,gates:0,towers:0,wallSegments:0,quays:0,ships:0,batches:0,vertices:0,colliders:0};
  const walkSurfaces=[];
  const push=c=>{colliders.push(c);metrics.colliders++;return c;};
  const finish=function*(b){metrics.vertices+=b.vertexCount;const m=yield* b.finishSteps(root);if(m)metrics.batches++;return m;};
  let work=0;
  function rivets(b,x,y,z,width,height,tint=GOLD){
    for(const s of [-1,1])for(let yy=-height/2+.4;yy<=height/2-.3;yy+=1.1)b.rock(tint,x+s*(width/2-.28),y+yy,z,.085,.085,.035);
  }
  function panel(b,x,y,z,w,h,old=false){
    b.box(old?PATINA:BRONZE,x,y,z,w,h,.18);
    for(const s of [-1,1])b.box(old?DEEPGREEN:GOLD,x+s*w/2,y,z+.13,.14,h+.14,.12);
    for(const s of [-1,1])b.box(old?DEEPGREEN:GOLD,x,y+s*h/2,z+.13,w+.14,.14,.12);
    rivets(b,x,y,z+.22,w,h,old?LIGHT:GOLD);
  }
  function bull(b,x,y,z,scale=1,old=true){
    // Bull-headed guardians face the sea at gates and the megaron. A strong
    // horn silhouette survives distance better than a tiny relief inscription.
    b.frame(x,y,z,0,()=>{
      const c=old?PATINA:BRONZE,s=scale;
      b.block(DARKSTONE,0,0,0,1.9*s,1.6*s,1.7*s);
      b.block(LIGHT,0,1.5*s,0,2.1*s,.3*s,1.9*s);
      b.rock(c,0,2.6*s,0,.75*s,.94*s,.56*s);
      b.rock(c,0,3.9*s,.03*s,.77*s,.7*s,.68*s);
      b.rock(c,0,3.6*s,.62*s,.52*s,.33*s,.33*s);
      for(const side of [-1,1]){
        b.beam(old?LIGHT:GOLD,[side*.53*s,4.25*s,.02*s],[side*1.13*s,4.5*s,.03*s],.24*s);
        b.beam(old?LIGHT:GOLD,[side*1.13*s,4.5*s,.03*s],[side*.95*s,5.05*s,.03*s],.19*s);
        b.rock(DARK,side*.38*s,4*s,.6*s,.10*s,.08*s,.05*s);
        b.rock(c,side*.7*s,2.35*s,.1*s,.22*s,.68*s,.24*s);
      }
    });
  }
  function taperedColumn(b,x,y,z,height,r=.75){
    b.block(DARKSTONE,x,y,z,r*2.7,.55,r*2.7);
    b.cylinder(RED,x,y+.55,z,r*.83,height-.9,Math.PI/7);
    b.cylinder(BRONZE,x,y+height-.55,z,r*1.2,.5,Math.PI/7);
    b.box(GOLD,x,y+height+.06,z,r*2.7,.33,r*2.7);
  }
  function cyclopean(b,width,height,depth){
    b.block(MORTAR,0,-.5,0,width,height+.5,depth);
    // Oversized courses and offset joints are the opposite of Nylon's smooth
    // uniform masonry. Variations are deterministic, so streaming never changes it.
    const rows=Math.ceil(height/2.6),cols=Math.max(1,Math.ceil(width/3.2));
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const w=width/cols,h=height/rows,shade=[STONE,LIGHT,DARKSTONE,STONE][(row*3+col)%4];
      b.box(shade,-width/2+w*(col+.5),h*(row+.5),0,w-.13,h-.12,depth+.09);
      // Leave some dressed faces flat between the weathered facets. This keeps
      // the longer coastal circuit within the same geometry budget.
      if((row+col)%4!==0)for(const side of [-1,1])b.rock(shade,-width/2+w*(col+.5)+((row+col)%2?-.2:.2),h*(row+.5),side*(depth/2+.06),w*.46,h*.48,.14);
    }
  }
  const streets=createSceneryBuilder('Aevis - ochre streets and drill courts');
  for(const path of AEVIS_PATHS)for(let i=1;i<path.points.length;i++){
    if(++work%3===0)yield;
    const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    yield* streets.patchSteps('#aaa181',heightAt,(a.x+b.x)/2,(a.z+b.z)/2,path.width,len,Math.atan2(dx,dz),.06,Math.max(2,Math.ceil(len/5)));
  }
  const court=AEVIS.drillCourt;
  yield* streets.patchSteps('#ad9b72',heightAt,court.x,court.z,court.width,court.depth,0,.065,5);
  yield* finish(streets);

  for(const edge of AEVIS_WALL_EDGES){
    yield;
    const a=AEVIS_OUTLINE[edge],c=AEVIS_OUTLINE[(edge+1)%AEVIS_OUTLINE.length];
    const dx=c.x-a.x,dz=c.z-a.z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),n=Math.ceil(len/3),step=len/n;
    const gates=AEVIS_GATES.filter(g=>g.edge===edge),b=createSceneryBuilder(`Aevis - Cyclopean curtain ${edge}`);
    for(let i=0;i<n;i++){
      if(++work%6===0)yield;
      const t=(i+.5)/n,x=a.x+dx*t,z=a.z+dz*t,y=Math.max(SEA_LEVEL,heightAt(x,z));
      if(gates.some(g=>Math.hypot(x-g.x,z-g.z)<g.width/2+1.8))continue;
      const nx=-dz/len,nz=dx/len;
      const foot=Math.min(heightAt(x,z),...[-1,1].flatMap(side=>[-1,1].map(end=>
        heightAt(x+nx*side*AEVIS.wallThickness/2+dx/len*end*step/2,z+nz*side*AEVIS.wallThickness/2+dz/len*end*step/2))))-.55;
      b.frame(x,y,z,yaw,()=>{
        b.block(DARKSTONE,0,foot-y,0,AEVIS.wallThickness+.12,y-foot+.1,step+.13);
        cyclopean(b,AEVIS.wallThickness,AEVIS.wallHeight,step+.1);
        b.box(PATINA,0,AEVIS.wallHeight-.8,0,AEVIS.wallThickness+.35,.5,step+.14);
        for(const side of [-1,1])b.block(STONE,side*(AEVIS.wallThickness/2-.3),AEVIS.wallHeight,0,.9,1.7,step*.57);
        if(i%4===0)for(const side of [-1,1])b.block(DARKSTONE,side*(AEVIS.wallThickness/2+.35),-.3,0,1.5,AEVIS.wallHeight*.57,1.7);
      });
      push({x,z,r:AEVIS.wallThickness/2+.12,minY:foot,maxY:y+AEVIS.wallHeight+1.7,kind:'aevis-wall',id:`aevis-wall-${edge}-${i}`});metrics.wallSegments++;
    }
    yield* finish(b);
  }
  function* watch(x,z,r=4.8,name='Aevis watch'){
    const y=Math.max(SEA_LEVEL,heightAt(x,z)),b=createSceneryBuilder(name),h=AEVIS.towerHeight;
    const foot=Math.min(heightAt(x,z),...[-r,r].flatMap(dx=>[-r,r].map(dz=>heightAt(x+dx,z+dz))))-.55;
    b.frame(x,y,z,0,()=>{
      b.block(DARKSTONE,0,foot-y,0,r*2+.12,y-foot+.1,r*2+.12);
      cyclopean(b,r*2,h,r*2);
      b.box(BRONZE,0,h-4,0,r*2+.3,.7,r*2+.3);
      for(const side of [-1,1])for(const edge of [-1,1])b.block(PATINA,side*r*.78,h,edge*r*.78,1.5,2.3,1.5);
      b.roof(PATINA,0,h+1.4,0,r*2.1,r*2.1,3.7,0,BRONZE);
      for(const side of [-1,1]){
        b.box(DARK,0,h-6,side*(r+.08),.85,3,.1);
        b.box(GOLD,0,h-4.25,side*(r+.15),1.35,.22,.15);
      }
    });
    push({x,z,hx:r+.15,hz:r+.15,width:r*2+.3,depth:r*2+.3,minY:foot,maxY:y+h+5.1,kind:'city-tower',id:name});
    yield* finish(b);metrics.towers++;
  }
  const corners=new Set(AEVIS_WALL_EDGES.flatMap(i=>[i,(i+1)%AEVIS_OUTLINE.length]));
  for(const index of corners){const p=AEVIS_OUTLINE[index];yield* watch(p.x,p.z,4.4,`Aevis - landward tower ${index}`);}
  for(const gate of AEVIS_GATES){
    const a=AEVIS_OUTLINE[gate.edge],c=AEVIS_OUTLINE[(gate.edge+1)%AEVIS_OUTLINE.length],len=Math.hypot(c.x-a.x,c.z-a.z),ux=(c.x-a.x)/len,uz=(c.z-a.z)/len;
    const y=heightAt(gate.x,gate.z),yaw=Math.atan2(ux,uz),b=createSceneryBuilder(`Aevis - ${gate.name}`);
    for(const side of [-1,1])yield* watch(gate.x+ux*side*(gate.width/2+5.3),gate.z+uz*side*(gate.width/2+5.3),4.5,`${gate.id}-${side<0?'left':'right'} watch`);
    b.frame(gate.x,y,gate.z,yaw,()=>{
      // Great cast-bronze leaves are folded along the inside passage, leaving
      // the whole central road open. Relief shields and bulls are visible.
      b.block(STONE,0,11.8,0,6.5,AEVIS.wallHeight-11.8,gate.width+3);
      b.box(GOLD,0,12,0,7,.55,gate.width+3.6);
      for(const side of [-1,1]){
        b.block(BRONZE,-2.2,0,side*(gate.width/2-.35),4.5,11.8,.48);
        for(const x of [-3.45,-1.1])for(const yy of [2.3,5.6,8.9]){
          b.rock(GOLD,x,yy,side*(gate.width/2-.67),.45,.6,.08);
          b.box(DARKBRONZE,x,yy-1,side*(gate.width/2-.67),1.45,.15,.09);
        }
        b.frame(0,0,0,side*Math.PI/2,()=>{
          b.triangle(PATINA,[-gate.width/2,AEVIS.wallHeight-1,3.65],[gate.width/2,AEVIS.wallHeight-1,3.65],[0,AEVIS.wallHeight+3.5,3.65]);
          bull(b,0,12.4,3.8,.85,false);
        });
      }
    });
    push({x:gate.x,z:gate.z,r:gate.width/2+.4,minY:y+11.7,maxY:y+AEVIS.wallHeight+4,kind:'gate-arch',id:gate.id});
    yield* finish(b);metrics.gates++;
  }

  function buildingBody(b,home){
    const w=home.width,d=home.depth,h=home.height,old=(home.palette??0)%2===1,tint=old?PATINA:BRONZE;
    b.block(DARKSTONE,0,0,0,w,2.2,d);
    b.block(STONE,0,2.2,0,w,h-2.2,d);
    b.box(LIGHT,0,2.2,0,w+.35,.4,d+.35);
    for(const side of [-1,1])b.frame(0,0,0,side===1?0:Math.PI,()=>{
      for(let k=-1;k<=1;k++)panel(b,k*w*.27,h*.58,d/2+.12,w*.22,h*.48,old);
      b.box(DARK,0,2.9,d/2+.12,2.7,4.7,.1);
      b.box(tint,0,2.75,d/2+.23,2.4,4.4,.12);
      for(const xx of [-1,1])b.box(GOLD,xx*1.35,2.9,d/2+.32,.22,4.9,.17);
      b.box(GOLD,0,5.36,d/2+.32,3.15,.32,.18);
      if(home.kind==='barracks')for(const xx of [-1,1])b.box(DARK,xx*w*.31,h-2.3,d/2+.18,1.2,1.5,.12);
    });
    b.roof(tint,0,h,0,w+.8,d+.8,Math.min(4.5,w*.22),0,DARKBRONZE);
    b.box(GOLD,0,h+Math.min(4.5,w*.22)+.1,0,.33,.25,d+1.2);
    for(const side of [-1,1])for(let j=0;j<4;j++)b.box(old?DEEPGREEN:GOLD,side*w*.37,h*.55,-d*.4+j*d*.27,.22,h*.62,.28);
  }
  function megaron(b,home){
    const w=home.width,d=home.depth,h=home.height;
    b.block(DARKSTONE,0,-.2,0,w,2.3,d);
    b.block(LIGHT,0,2.1,0,w+.35,.5,d+.35);
    b.block(BRONZE,0,2.6,-d*.09,w*.91,h-5,d*.76);
    for(const side of [-1,1])for(let row=0;row<3;row++)b.frame(0,0,0,side===1?0:Math.PI,()=>{
      for(let col=-2;col<=2;col++)panel(b,col*w*.17,5+row*(h-8)/3,d*.295,w*.145,(h-9)/3-.35,false);
    });
    const front=d/2-1.7,porticoH=h*.66;
    for(const k of [-3,-1,1,3])taperedColumn(b,k*w*.115,2.6,front,porticoH,.85);
    b.box(BRONZE,0,porticoH+3,front-1.4,w+.1,1.1,5.3);
    b.box(GOLD,0,porticoH+3.65,front+1.15,w+.6,.25,.4);
    // The triangular relieving gable and large bronze panels declare the
    // palace's martial megaron form rather than another tall civic tower.
    b.triangle(BRONZE,[-w/2,porticoH+3.6,front+1.2],[w/2,porticoH+3.6,front+1.2],[0,h+5.8,front+1.2]);
    for(const side of [-1,1])bull(b,side*w*.235,porticoH+4,front+1.4,.65,false);
    b.roof(PATINA,0,h-1.7,-d*.09,w+1,d*.84,7,0,DARKBRONZE);
    b.box(GOLD,0,h+5.3,-d*.09,.45,.4,d*.84+1);
    b.box(DARK,0,8,d*.29+.13,7,11,.12);panel(b,0,7.8,d*.29+.3,6.6,10.7,false);
    for(const side of [-1,1])bull(b,side*(w/2-2),0,d/2-1.8,1.1,true);
  }
  function archive(b,home){
    const w=home.width,d=home.depth,h=home.height;
    b.block(DARKSTONE,0,0,0,w,1.5,d);b.block(STONE,0,1.5,d*.08,w*.94,h-1.5,d*.77);
    for(let k=-3;k<=3;k++)taperedColumn(b,k*w*.13,1.5,-d/2+1.2,h*.65,.55);
    b.box(PATINA,0,h*.65+1.8,-d/2+2,w,1.2,4);
    b.roof(PATINA,0,h,0,w+1,d+1,4,0,DARKBRONZE);
    for(let k=-3;k<=3;k++){
      panel(b,k*w*.128,h*.46,-d*.305,w*.105,h*.54,true);
      b.box(DARK, k*w*.128,h*.8,-d*.305,w*.08,1.2,.16);
    }
    // The veth's public recitation dais is part of the closed facade today;
    // archival rooms and performances are future gameplay.
    b.block(LIGHT,0,0,-d/2+.4,w*.7,.7,1.3);
  }
  for(const home of AEVIS_BUILDINGS){
    yield;
    const b=createSceneryBuilder(`Aevis - ${home.name}`),y=heightAt(home.x,home.z),w=home.width,d=home.depth;
    const foot=Math.min(y,...[-w/2,w/2].flatMap(x=>[-d/2,d/2].map(z=>heightAt(home.x+x,home.z+z))))-.35;
    b.frame(home.x,y,home.z,0,()=>{
      b.block(DARKSTONE,0,foot-y,0,w+.1,y-foot+.1,d+.1);
      if(home.kind==='palace')megaron(b,home);
      else if(home.kind==='archive')archive(b,home);
      else buildingBody(b,home);
      if(home.kind==='forge'){
        b.block(DARKSTONE,w*.25,home.height-1,-d*.25,2.4,5,2.4);
        b.box(PATINA,w*.25,home.height+4,-d*.25,2.9,.4,2.9);
      }
    });
    const mesh=yield* finish(b);mesh.geometry.computeBoundingBox();
    push({x:home.x,z:home.z,hx:w/2+.12,hz:d/2+.12,width:w+.24,depth:d+.24,minY:foot,maxY:mesh.geometry.boundingBox.max.y,kind:'house',id:home.id});metrics.buildings++;
  }

  const apparatus=createSceneryBuilder('Aevis - bronze drill and smithing apparatus');
  // Keep equipment to the edges of the open drill court and roads.
  for(const rack of AEVIS_DRILL_RACKS){
    const {x,z}=rack,y=heightAt(x,z);
    apparatus.block(TIMBER,x,y,z,.35,3,.35);apparatus.beam(TIMBER,[x-2,y+2.4,z],[x+2,y+2.4,z],.22);
    for(let i=-2;i<=2;i++){
      apparatus.beam(TIMBER,[x+i*.65,y+.2,z],[x+i*.65,y+3.4,z],.055);
      apparatus.rock(BRONZE,x+i*.65,y+3.55,z,.10,.22,.045);
    }
    push({x,z,hx:2.2,hz:.35,width:4.4,depth:.7,minY:y,maxY:y+3.8,kind:'rack',id:rack.id});
  }
  yield* finish(apparatus);

  const quays=createSceneryBuilder('Aevis - open harbor piers and bronze freight');
  for(const quay of AEVIS_QUAYS){
    yield;
    const y=quay.elevation,w=quay.width,d=quay.depth;
    quays.box(TIMBER,quay.x,y-.18,quay.z,w,.36,d);
    for(let x=quay.x-w/2+.65;x<quay.x+w/2;x+=1.3)quays.box('#9b8966',x,y+.02,quay.z,1.16,.055,d-.16);
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const x=quay.x+sx*(w/2-.45),z=quay.z+sz*(d/2-.4),bottom=Math.min(heightAt(x,z),SEA_LEVEL)-1.5;
      quays.block(TIMBER,x,bottom,z,.7,y-bottom+.9,.7);
      quays.box(BRONZE,x,y+.75,z,1,.25,1);
      push({x,z,r:.43,minY:bottom,maxY:y+.95,kind:'bollard',id:`${quay.id}-${sx}-${sz}`});
    }
    walkSurfaces.push({id:`${quay.id}-deck`,kind:'deck',a:{x:quay.x-w/2,y,z:quay.z},b:{x:quay.x+w/2,y,z:quay.z},width:d});
    push({x:quay.x,z:quay.z,hx:w/2,hz:d/2,width:w,depth:d,minY:y-.36,maxY:y-.01,kind:'pier',id:quay.id});metrics.quays++;
  }
  yield* finish(quays);
  for(const boat of AEVIS_BOATS){
    yield;
    const b=createSceneryBuilder(`Aevis - ${boat.name??boat.id}`),len=boat.length,w=boat.width;
    b.frame(boat.x,SEA_LEVEL,boat.z,boat.yaw??0,()=>{
      const sections=[[-.5,.03,1.4],[-.36,.48,.8],[.31,.48,.8],[.5,.05,1.8]];
      for(let i=1;i<sections.length;i++){
        const [za,wa,ya]=sections[i-1],[zb,wb,yb]=sections[i];
        for(const s of [-1,1])b.quad('#654c35',[s*wa*w,ya,za*len],[s*wb*w,yb,zb*len],[s*wb*w*.7,-.6,zb*len],[s*wa*w*.7,-.6,za*len]);
        b.quad('#a48a5c',[-wa*w,ya,za*len],[-wb*w,yb,zb*len],[wb*w,yb,zb*len],[wa*w,ya,za*len]);
      }
      for(const s of [-1,1]){
        b.beam(BRONZE,[s*w*.48,.93,-len*.36],[s*w*.48,.93,len*.31],.16);
        for(let i=0;i<7;i++){
          const z=-len*.29+i*len*.085;
          b.rock(i%2?PATINA:BRONZE,s*w*.5,.7,z,.035,.43,.39);
          b.beam(TIMBER,[s*w*.25,1,z],[s*(w*.5+2.5),.18,z-1.2],.065);
        }
      }
      b.block(TIMBER,0,.6,0,.26,len*.65,.26);
      b.beam(TIMBER,[-w*.7,len*.48,0],[w*.7,len*.48,0],.18);
      b.sheet(LINEN,[-w*.68,len*.48,0],[w*.68,len*.48,0],[w*.58,len*.21,.65],[-w*.58,len*.21,.65]);
      b.box(RED,0,len*.345,.38,w*.21,len*.25,.03);
      b.beam(BRONZE,[0,.6,len*.43],[0,.35,len*.58],.38);
      b.rock(GOLD,0,1.75,len*.49,.28,.32,.19);
      for(const x of [-w*.3,w*.3])b.beam('#8c7c59',[x,.8,-len*.3],[0,len*.64,0],.025);
    });
    yield* finish(b);metrics.ships++;
    push({x:boat.x,z:boat.z,r:w*.5,minY:SEA_LEVEL-.65,maxY:SEA_LEVEL+2,kind:'ship',id:boat.id});
  }
  return {root,metrics,walkSurfaces,mapFeatures:AEVIS_BUILDINGS.map(b=>({id:b.id,name:b.name,x:b.x,z:b.z,width:b.width,depth:b.depth,kind:b.kind}))};
}
