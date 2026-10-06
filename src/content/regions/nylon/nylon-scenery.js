import * as THREE from 'three';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { NYLON, NYLON_OUTLINE, NYLON_GATES, NYLON_BUILDINGS, NYLON_PATHS, NYLON_QUAYS, NYLON_HARBOR_WALLS, NYLON_HARBOR, NYLON_HARBOR_DECKS, NYLON_HARBOR_BOATS, nylonRiverClearance, nylonHarborDeckHeight } from './nylon-city.js';
import { EER_CHANNELS } from '../western-regions/west-regions.js';

// Nylon's scholarly river-port masonry is deliberately unlike the Empire's
// fortress style: warm polished limestone, blue-green glazed roofs, slender
// arcades, bronze screens and several inhabited storeys behind every facade.
const STONE='#d4c8a5', IVORY='#eee3c4', WHITE='#f6edcf', SHADE='#aea98f';
const TEAL='#326e72', BLUE='#365a6d', VERDIGRIS='#628d82', BRONZE='#b99855';
const DARK='#30494d', GLASS='#83b2b0', WOOD='#655342', PAVING='#bdb59b';
const TAU=Math.PI*2;

export function createNylonScenery(...args) { return finishBuild(createNylonScenerySteps(...args)); }

/** Stream the city in modest merged batches, with the same ground and physical
 * footprints used by its geography. Gates are genuinely open at street level;
 * arches and their bronze grilles are overhead, never invisible gate barriers. */
export function* createNylonScenerySteps({parent,heightAt,groundHeight=heightAt,colliders}) {
  const root=new THREE.Group();root.name='Nylon — the high-walled city of inquiry';parent.add(root);
  const metrics={buildings:0,towers:0,gates:0,wallSegments:0,culvertBays:0,harborWings:0,quays:0,piers:0,boats:0,batches:0,vertices:0,colliders:0};
  const push=c=>{colliders.push(c);metrics.colliders++;return c;};
  const finish=function* (b){metrics.vertices+=b.vertexCount;const mesh=yield* b.finishSteps(root);if(mesh)metrics.batches++;return mesh;};
  const body=(x,z,w,d,y,h,id,kind='house')=>push({x,z,hx:w/2,hz:d/2,width:w,depth:d,angle:0,minY:y-.4,maxY:y+h,id,kind});
  const hWall=NYLON.wallHeight;
  let work=0;

  function emblem(b,x,y,z,r=1.5) {
    // An open eye of inquiry: an abstract civic device, not an Imperial crest.
    for(let i=0;i<12;i++) {const a=i*TAU/12,c=(i+1)*TAU/12;
      b.beam(BRONZE,[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(c)*r,y+Math.sin(c)*r,z],.13);
    }
    b.beam(BRONZE,[x-r*.8,y-r*.8,z+.04],[x+r*.8,y+r*.8,z+.04],.13);
    b.rock(WHITE,x,y,z+.08,r*.2,r*.2,.12);
  }
  function window(b,x,y,z,w=1.3,h=2.4,tint=GLASS,ornate=false) {
    b.box(IVORY,x,y,z,w+.4,h+.45,.18);b.box(DARK,x,y,z+.12,w,h,.12);
    b.box(tint,x,y,z+.2,w*.79,h*.87,.07);
    b.box(ornate?BRONZE:IVORY,x,y,z+.27,.1,h,.05);
    b.box(IVORY,x,y-h*.08,z+.27,w,.1,.055);
    b.box(WHITE,x,y-h/2-.15,z+.12,w+.65,.16,.5);
    if(ornate)b.triangle(BRONZE,[x-w/2-.2,y+h/2+.2,z+.2],[x+w/2+.2,y+h/2+.2,z+.2],[x,y+h/2+.75,z+.2]);
  }
  function roundArch(b,x,y,z,width,height,thickness=.45,depth=.6,tint=IVORY) {
    const r=width/2,stem=height-r;
    for(const side of [-1,1]) b.block(tint,x+side*(r+thickness/2),y,z,thickness,stem,depth);
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/8,c=(i+1)*Math.PI/8;
      b.beam(tint,[x+Math.cos(a)*r,y+stem+Math.sin(a)*r,z],[x+Math.cos(c)*r,y+stem+Math.sin(c)*r,z],thickness,depth);
    }
    b.box(WHITE,x,y+height,z,thickness*1.4,thickness*1.5,depth+.1);
  }
  function column(b,x,y,z,h,r=.4) {
    b.block(SHADE,x,y,z,r*2.6,.45,r*2.6);
    b.cylinder(IVORY,x,y+.4,z,r,h-.85);
    b.block(WHITE,x,y+h-.5,z,r*2.7,.5,r*2.7);
    b.cylinder(BRONZE,x,y+h*.77,z,r*1.06,.12);
  }
  function balustrade(b,x,y,z,width,depth=.18) {
    b.box(IVORY,x,y+.95,z,width,.18,depth+.2);
    b.box(SHADE,x,y+.1,z,width,.16,depth+.08);
    const n=Math.max(2,Math.floor(width/.8));
    for(let i=0;i<=n;i++)b.block(IVORY,x-width/2+width*i/n,y+.16,z,.14,.75,depth);
  }
  function balcony(b,x,y,z,w=4) {
    b.box(IVORY,x,y,z,w,.28,1.7);balustrade(b,x,y+.1,z+.75,w);
    for(const s of [-1,1])b.beam(SHADE,[x+s*(w/2-.35),y-.15,z+.7],[x+s*(w/2-.35),y-1.2,z-.7],.24);
  }
  function banner(b,x,y,z,h=5) {
    b.block(WOOD,x,y,z,.12,h+1,.12);
    b.sheet(TEAL,[x,y+h,z],[x+1.65,y+h-.18,z],[x+1.65,y+.7,z],[x,y+1.1,z]);
    emblem(b,x+.84,y+h*.65,z+.025,.45);
  }
  function roofLantern(b,x,y,z,r,h) {
    b.cylinder(IVORY,x,y,z,r,h*.65,Math.PI/7);
    for(let i=0;i<7;i++)b.frame(x,y,z,i*TAU/7,()=>window(b,0,h*.34,r*.91,Math.min(1.5,r*.6),h*.36,GLASS,true));
    b.cone(TEAL,x,y+h*.65,z,r*1.18,h*.43);
    b.cone(BRONZE,x,y+h*1.08,z,.4,2.2);
  }

  const streets=createSceneryBuilder('Nylon — pale avenues, waterside lanes and courts');
  for(const path of NYLON_PATHS)for(let i=1;i<path.points.length;i++) {
    if(++work%4===0)yield;
    const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    yield* streets.patchSteps(PAVING,heightAt,(a.x+b.x)/2,(a.z+b.z)/2,path.width,len,Math.atan2(dx,dz),.065,Math.max(2,Math.ceil(len/5)));
    // A narrow cream strip at the street edge carries Nylon's paving language
    // through the districts without painting new roads over the water.
    const nx=dz/len,nz=-dx/len;
    for(const s of [-1,1])yield* streets.patchSteps('#d3cbb2',heightAt,(a.x+b.x)/2+nx*s*(path.width/2-.25),(a.z+b.z)/2+nz*s*(path.width/2-.25),.32,len,Math.atan2(dx,dz),.075,Math.max(2,Math.ceil(len/5)));
  }
  yield* finish(streets);

  // The monumental perimeter is built in short terrain-following bays. Solid
  // buttresses and slit stores make the absurd height read as intentional civil
  // engineering, while the alternating stone courses remain visible far away.
  for(let edge=0;edge<NYLON_OUTLINE.length;edge++) {
    const a=NYLON_OUTLINE[edge],c=NYLON_OUTLINE[(edge+1)%NYLON_OUTLINE.length];
    const dx=c.x-a.x,dz=c.z-a.z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
    const gates=NYLON_GATES.filter(g=>g.edge===edge),count=Math.ceil(len/3.2),step=len/count;
    const b=createSceneryBuilder(`Nylon — monumental curtain ${edge+1}`);
    for(let i=0;i<count;i++) {
      if(++work%8===0)yield;
      const t=(i+.5)/count,x=a.x+dx*t,z=a.z+dz*t;
      if(gates.some(g=>Math.hypot(x-g.x,z-g.z)<g.width/2+1.7))continue;
      const culvert=nylonRiverClearance(x,z)<5.2,y=culvert?NYLON.elevation:heightAt(x,z),floor=culvert?8.5:0;
      b.frame(x,y,z,yaw,()=>{
        b.block(SHADE,0,culvert?floor:-1,0,8.2,culvert?1.5:10,step+.15);
        b.block(STONE,0,Math.max(1,floor),0,7.2,hWall-Math.max(1,floor),step+.17);
        b.box(IVORY,0,9,0,8,.55,step+.22);
        b.box(IVORY,0,hWall-.8,0,8.5,1.5,step+.24);
        for(const h of [hWall*.38,hWall*.67])b.box('#e0d4b4',0,h,0,7.33,.48,step+.19);
        for(const side of [-1,1]) {
          b.block(STONE,side*3.6,hWall,0,.9,2.3,step*.49);
          if(i%3===0) {
            b.block(IVORY,side*4.05,floor,0,1.6,hWall-1-floor,1.2);
            if(!culvert)b.block(SHADE,side*4.3,0,0,2.3,7,2.2);
            b.frame(0,0,0,side*Math.PI/2,()=>{
              b.box(DARK,0,hWall*.5,4.05,.32,3.2,.1);
              b.box(BRONZE,0,hWall-4.2,4.87,.7,1.7,.1);
            });
          }
        }
      });
      push({x,z,r:4.15,minY:culvert?y+floor:y-1,maxY:y+hWall+2.3,kind:'nylon-wall',id:`nylon-wall-${edge}-${i}`});metrics.wallSegments++;if(culvert)metrics.culvertBays++;
    }
    yield* finish(b);
  }
  function* tower(x,z,r=7.5,height=hWall+12,name='Nylon — high curtain watch',options={}) {
    const b=createSceneryBuilder(name),culvert=options.baseY===undefined&&nylonRiverClearance(x,z)<r+1.9,y=options.baseY??(culvert?NYLON.elevation:heightAt(x,z)),floor=culvert?8.5:0;
    const foundation=options.baseY===undefined?y-1:Math.min(groundHeight(x,z)-1,y-1);
    if(foundation<y-1)b.cylinder(SHADE,x,foundation,z,r+1.3,y-1-foundation,Math.PI/7);
    b.cylinder(SHADE,x,y+(culvert?floor:-1),z,r+1.3,culvert?2:11,Math.PI/7);
    b.cylinder(STONE,x,y+Math.max(2,floor),z,r,height-Math.max(2,floor),Math.PI/7);
    if(culvert)for(let i=0;i<7;i++){
      const a=i*TAU/7,px=x+Math.sin(a)*r*.7,pz=z+Math.cos(a)*r*.7;
      if(nylonRiverClearance(px,pz)<2.2)continue;
      const py=heightAt(px,pz);b.cylinder(IVORY,px,py-.2,pz,1.05,y+floor-py+.5);
      push({x:px,z:pz,r:1.05,minY:py-.2,maxY:y+floor+.4,kind:'nylon-wall',id:`${name}-culvert-pier-${i}`});
    }
    for(const q of [10,height*.48,height-8,height-1])b.cylinder(IVORY,x,y+q,z,r+.4,q===height-1?1.3:.6,Math.PI/7);
    for(let i=0;i<7;i++) {
      const angle=i*TAU/7;
      b.frame(x,y,z,angle,()=>{
        b.block(IVORY,-r*.35,Math.max(2,floor),r*.9,.55,height-1-Math.max(2,floor),.65);
        window(b,0,height-5.2,r*.92,1.2,3.8,GLASS,true);
        for(const yy of [height*.34,height*.6])b.box(DARK,0,yy,r*.96,.55,2.8,.08);
        b.block(STONE,0,height+.25,r*.92,1.6,2.3,1.35);
      });
    }
    b.cone(TEAL,x,y+height,z,r*.71,7);b.cone(BRONZE,x,y+height+7,z,.45,2.6);
    push({x,z,r:r+1.3,minY:culvert?y+floor:foundation,maxY:y+height+9.6,kind:'city-tower',id:name});
    yield* finish(b);metrics.towers++;
  }
  for(let i=0;i<NYLON_OUTLINE.length;i++){yield;const p=NYLON_OUTLINE[i];yield* tower(p.x,p.z,7.5,hWall+12,`Nylon — corner bastion ${i+1}`);}
  // The existing Eer drainage clips the northeast corner twice. Its original
  // course stays visible beneath paired masonry arches and the supported watch.
  const drains=createSceneryBuilder('Nylon — open northeast drainage culverts');
  const drainage=EER_CHANNELS.find(c=>c.id==='eer-channel-south');
  const crossing=(axis,value)=>{
    for(let i=1;i<drainage.points.length;i++){
      const a=drainage.points[i-1],b=drainage.points[i],t=(value-a[axis])/(b[axis]-a[axis]);
      if(t>=0&&t<=1)return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
    }
    throw new Error(`Nylon's ${axis}=${value} culvert no longer meets its drainage channel`);
  };
  for(const aperture of [{axis:'z',value:1066,yaw:0,width:12},{axis:'x',value:-1262,yaw:Math.PI/2,width:13.6}])for(const side of [-1,1]){
    // The stream cuts the eight-metre wall obliquely. Each face therefore needs
    // its own centre, rather than parallel arches whose feet land in the stream.
    const centre=crossing(aperture.axis,aperture.value+side*4.2),yaw=aperture.yaw+(side<0?Math.PI:0);
    drains.frame(centre.x,NYLON.elevation,centre.z,yaw,()=>roundArch(drains,0,0,0,aperture.width,9,.7,1.2));
    for(const foot of [-1,1]){
      const along=foot*(aperture.width/2+.35),x=centre.x+along*Math.cos(yaw),z=centre.z-along*Math.sin(yaw);
      const base=Math.min(heightAt(x,z),...[-.45,.45].flatMap(u=>[-.75,.75].map(v=>heightAt(x+u*Math.cos(yaw)+v*Math.sin(yaw),z-u*Math.sin(yaw)+v*Math.cos(yaw)))))-.2;
      if(base<NYLON.elevation)drains.block(IVORY,x,base,z,.9,NYLON.elevation-base,1.5,yaw);
      push({x,z,r:.64,minY:base,maxY:NYLON.elevation+9-aperture.width/2+.35,kind:'nylon-wall',id:`nylon-culvert-foot-${aperture.axis}-${side}-${foot}`});
    }
  }
  yield* finish(drains);
  for(const gate of NYLON_GATES) {
    yield;
    const a=NYLON_OUTLINE[gate.edge],c=NYLON_OUTLINE[(gate.edge+1)%NYLON_OUTLINE.length],len=Math.hypot(c.x-a.x,c.z-a.z),ux=(c.x-a.x)/len,uz=(c.z-a.z)/len;
    const y=heightAt(gate.x,gate.z),b=createSceneryBuilder(`Nylon — ${gate.name}`),yaw=Math.atan2(ux,uz);
    for(const side of [-1,1])yield* tower(gate.x+ux*side*(gate.width/2+7.8),gate.z+uz*side*(gate.width/2+7.8),6.4,hWall+17,`${gate.name} — ${side<0?'left':'right'} watch`);
    b.frame(gate.x,y,gate.z,yaw,()=>{
      // The local z axis runs along the wall; the passage runs across it.
      b.block(STONE,0,16,0,9,hWall-16,gate.width+3.5);
      b.box(IVORY,0,16,0,10,.65,gate.width+4);
      b.box(IVORY,0,hWall-.6,0,10,1.25,gate.width+4);
      for(const side of [-1,1])b.frame(0,0,0,side*Math.PI/2,()=>{
        roundArch(b,0,0,4.8,gate.width-1.4,16.5,.9,1.2,IVORY);
        emblem(b,0,25,4.65,3.3);
        for(const q of [-1,1])window(b,q*(gate.width*.29),hWall-9,4.68,2,5,GLASS,true);
      });
      // The lifted grille is conspicuous but ends 12m above the road.
      for(let z=-gate.width/2+.7;z<gate.width/2;z+=1.5)b.box(BRONZE,0,14.2,z,.25,4.2,.2);
      for(const s of [-1,1])banner(b,s*4.2,hWall,gate.width*.29,7);
    });
    // Overhead geometry has height bounds, so ordinary players pass below it.
    push({x:gate.x,z:gate.z,r:gate.width/2+1,minY:y+12.1,maxY:y+hWall+1,kind:'gate-arch',id:gate.id});
    yield* finish(b);metrics.gates++;
  }

  // A second complete circuit reaches the actual estuary. The city gate is its
  // land entrance; two massive sea towers frame the ship entrance. The river's
  // existing channel stays west of these works, unobstructed to the sea.
  for(const wing of NYLON_HARBOR_WALLS) {
    const b=createSceneryBuilder(`Nylon — ${wing.id}`);
    for(let edge=1;edge<wing.points.length;edge++){
      const a=wing.points[edge-1],c=wing.points[edge],dx=c.x-a.x,dz=c.z-a.z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),n=Math.ceil(len/2.5);
      for(let i=0;i<n;i++){
        if(++work%8===0)yield;
        const t=(i+.5)/n,x=a.x+dx*t,z=a.z+dz*t,bed=groundHeight(x,z),y=Math.max(NYLON_HARBOR.deckHeight,bed);
        b.frame(x,y,z,yaw,()=>{
          if(bed<y)b.block(SHADE,0,bed-y-.6,0,wing.thickness+2.4,y-bed+.6,len/n+.15);
          b.block(STONE,0,-.5,0,wing.thickness,wing.height+.5,len/n+.12);
          b.box(IVORY,0,wing.height,0,wing.thickness+1,.75,len/n+.15);
          b.box(IVORY,0,6,0,wing.thickness+.22,.35,len/n+.15);
          for(const side of [-1,1])b.block(IVORY,side*wing.thickness/2,wing.height+.35,0,.55,1.4,1.2);
          if(i%3===0)for(const side of [-1,1]){
            b.block(SHADE,side*wing.thickness/2,0,0,.7,wing.height-1,1.3);
            b.frame(0,0,0,side*Math.PI/2,()=>b.box(DARK,0,wing.height-5,wing.thickness/2+.06,.45,2.6,.12));
          }
        });
        push({x,z,r:wing.thickness/2,minY:Math.min(bed,y)-.6,maxY:y+wing.height+1.8,kind:'nylon-wall',id:`${wing.id}-${edge}-${i}`});
      }
    }
    yield* finish(b);metrics.harborWings++;
    const end=wing.points.at(-1);yield* tower(end.x,end.z,6.5,35,`${wing.id} sea gate watch`,{baseY:NYLON_HARBOR.deckHeight});
    // A secondary watch at each turn makes the long enclosure legible from sea.
    for(const index of wing.id.endsWith('west')?[6]:[3]){const p=wing.points[index];yield* tower(p.x,p.z,4.1,29,`${wing.id} sea bastion`,{baseY:Math.max(NYLON_HARBOR.deckHeight,groundHeight(p.x,p.z))});}
  }
  // Deck geometry and movement read the very same made surfaces. The terrain
  // and water underneath are retained, with seabed-founded piles visible below.
  for(const deck of NYLON_HARBOR_DECKS){
    yield;
    const b=createSceneryBuilder(`Nylon — ${deck.name}`),dx=deck.b.x-deck.a.x,dz=deck.b.z-deck.a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,nx=-uz,nz=ux;
    const at=(end,s,offset=0)=>[end.x+nx*s*deck.width/2,end.y+offset,end.z+nz*s*deck.width/2];
    const corners=[at(deck.a,-1),at(deck.a,1),at(deck.b,1),at(deck.b,-1)],bottom=corners.map(p=>[p[0],p[1]-.6,p[2]]);
    b.quad(deck.kind==='ramp'?'#c6bea5':deck.id.includes('pier')?'#967b53':IVORY,...corners);
    for(let i=0;i<4;i++)b.quad(SHADE,corners[(i+1)%4],corners[i],bottom[i],bottom[(i+1)%4]);
    b.quad(SHADE,bottom[3],bottom[2],bottom[1],bottom[0]);
    const segments=Math.max(1,Math.ceil(len/7));
    for(let k=0;k<=segments;k++){
      const t=k/segments,x=deck.a.x+dx*t,z=deck.a.z+dz*t,y=deck.a.y+(deck.b.y-deck.a.y)*t;
      for(const side of [-1,1]){
        const px=x+nx*side*(deck.width/2-.5),pz=z+nz*side*(deck.width/2-.5),bed=groundHeight(px,pz)-.7;
        if(bed<y-.6){b.cylinder(SHADE,px,bed,pz,.48,y-.6-bed);push({x:px,z:pz,r:.48,minY:bed,maxY:y-.61,kind:'pier-pile',id:`${deck.id}-pile-${k}-${side}`});}
        if(deck.id.includes('pier')&&k>0){
          b.cylinder(WOOD,px,y,pz,.16,.9);b.cylinder(BRONZE,px,y+.8,pz,.23,.18);
          push({x:px,z:pz,r:.21,minY:y,maxY:y+1,kind:'bollard',id:`${deck.id}-bollard-${k}-${side}`});
        }
      }
    }
    if(deck.id.includes('pier')){
      for(let q=.5;q<len;q+=1.25){if(++work%16===0)yield;const t=q/len;b.box('#776342',deck.a.x+dx*t,deck.a.y-.035,deck.a.z+dz*t,deck.width,.06,.05,Math.atan2(dx,dz));}
      metrics.piers++;
    }else if(deck.kind==='deck')metrics.quays++;
    yield* finish(b);
  }
  const quays=createSceneryBuilder('Nylon — provision cranes, moorings and cargo');
  for(const [x,z] of [[-1320,1187.3],[-1280,1187.3]]){
    const y=NYLON_HARBOR.deckHeight;
    quays.block(SHADE,x,y,z,2.1,.9,2.1);quays.block(WOOD,x,y+.9,z,.7,9,.7);
    quays.beam(WOOD,[x,y+9,z],[x,y+10,z+8],.5);quays.beam(BRONZE,[x,y+4,z],[x,y+9.8,z+7],.14);
    quays.beam(WOOD,[x,y+10,z+7.5],[x,y+2,z+7.5],.055);
    quays.box(BRONZE,x,y+2,z+7.5,.45,.4,.45);
    push({x,z,hx:1.05,hz:1.05,minY:y,maxY:y+10,kind:'crane',id:`nylon-provision-crane-${x}`});
  }
  for(let i=0;i<9;i++){
    const x=-1328+i*6.4,z=1187.3,y=NYLON_HARBOR.deckHeight;
    if(Math.abs(x+1320)<3||Math.abs(x+1280)<3)continue;
    quays.block(WOOD,x,y,z,2.2,1.65,1.8);
    for(const s of [-1,1]){quays.box(BRONZE,x+s*.72,y+.82,z, .09,1.7,1.85);quays.box(BRONZE,x,y+.82,z+s*.59,2.24,1.7,.09);}
    quays.beam('#9e8765',[x-1,y+.1,z+.93],[x+1,y+1.5,z+.93],.14);
    push({x,z,hx:1.1,hz:.9,minY:y,maxY:y+1.65,kind:'crate',id:`nylon-stored-provisions-${i}`});
  }
  // Mooring points sit beside, not across, the clear middle of the quay.
  for(let x=-1333;x<-1265;x+=8){
    const y=NYLON_HARBOR.deckHeight,z=1195;
    if(NYLON_HARBOR_DECKS.some(d=>d.id.includes('pier')&&Math.abs(d.a.x-x)<4.5))continue;
    quays.cylinder(BRONZE,x,y,z,.27,.8);quays.box(BRONZE,x,y+.85,z,.9,.22,.3);
    push({x,z,r:.3,minY:y,maxY:y+1,kind:'bollard',id:`nylon-estuary-mooring-${x}`});
  }
  yield* finish(quays);

  for(const boat of NYLON_HARBOR_BOATS){
    yield;
    const b=createSceneryBuilder(`Nylon — ${boat.name}`),w=boat.width,d=boat.length,water=NYLON_HARBOR.waterHeight;
    b.frame(boat.x,water,boat.z,0,()=>{
      const rim=[[-w/2,1.4,-d*.34],[0,1.9,-d/2],[w/2,1.4,-d*.34],[w/2,1.4,d*.34],[0,1.75,d/2],[-w/2,1.4,d*.34]];
      const keel=rim.map(p=>[p[0]*.5,-.85,p[2]*.82]);
      for(let i=0;i<rim.length;i++){
        const j=(i+1)%rim.length;b.quad(boat.hull,rim[i],rim[j],keel[j],keel[i]);
        b.triangle('#9a8156',[0,1.1,0],rim[j],rim[i]);b.beam(IVORY,rim[i],rim[j],.19);
      }
      b.box(WOOD,0,1.35,d*.23,w*.7,.5,d*.19);
      if(boat.mast){
        b.cylinder(WOOD,0,1.15,-d*.08,.18,boat.mast);
        b.beam(WOOD,[-w*1.05,boat.mast*.76,-d*.08],[w*1.05,boat.mast*.76,-d*.08],.18);
        b.sheet(boat.sail,[-w,boat.mast*.76,-d*.08],[w,boat.mast*.76,-d*.08],[w*.87,boat.mast*.3,-d*.08+.9],[-w*.87,boat.mast*.3,-d*.08+.9]);
        for(const side of [-1,1])b.beam('#b9ad8d',[0,boat.mast,-d*.08],[side*w*.46,1.55,d*.28],.04);
        banner(b,0,boat.mast+.5,-d*.08,2.5);
      }else{
        for(let z=-d*.22;z<=d*.22;z+=d*.22)b.box(WOOD,0,1.7,z,w*.82,.16,.5);
      }
    });
    push({x:boat.x,z:boat.z,hx:w/2,hz:d/2,minY:water-.9,maxY:water+2,kind:'boat',id:boat.id});
    yield* finish(b);metrics.boats++;
  }

  function townHouse(b,home) {
    const w=home.width,d=home.depth,h=home.height,roof=home.roof??[TEAL,BLUE,VERDIGRIS,'#506e79'][(home.palette??0)%4];
    const tone=home.tone??(home.kind==='warehouse'?'#c3b695':[STONE,'#d9ccb0','#c8c3ac','#d8cdb8'][(home.palette??0)%4]);
    const inset=Math.min(1.5,w*.065),upper=h*.75;
    b.block(SHADE,0,0,0,w,h*.16,d);
    b.block(tone,0,1.1,0,w,upper-1.1,d);
    b.box(IVORY,0,5.2,0,w+.55,.45,d+.55);
    b.block(IVORY,0,upper,0,w-inset*2,h-upper,d-inset*2);
    b.box(WHITE,0,upper,0,w+.75,.45,d+.7);
    b.roof(roof,0,h,0,w-inset*2+1.1,d-inset*2+1.1,Math.min(6,w*.28),0,IVORY);
    for(const side of [-1,1])for(const end of [-1,1])b.block(IVORY,side*(w/2-.35),1.3,end*(d/2-.35),.7,upper-1.4,.7);
    const n=Math.max(2,Math.floor((w-2)/3.3)),levels=Math.max(2,Math.floor((h-7)/4.6));
    for(const side of [-1,1])b.frame(0,0,0,side===1?0:Math.PI,()=>{
      for(let level=0;level<levels;level++)for(let k=0;k<n;k++) {
        const x=(k-(n-1)/2)*(w-3)/n,yy=8+level*4.5,zz=yy>upper?d/2-inset+.05:d/2+.05;
        window(b,x,yy,zz,Math.min(1.6,(w-3)/n*.56),2.25,level%2?GLASS:'#718f91',level===levels-1);
      }
      for(const s of [-1,1]){
        b.box(DARK,s*w*.28,2.9,d/2+.08,Math.min(w*.22,3.8),4.4,.16);
        roundArch(b,s*w*.28,.55,d/2+.3,Math.min(w*.22,3.8),4.6,.25,.45);
      }
      b.box(WOOD,0,2.2,d/2+.18,1.65,4.3,.17);
      b.box(BRONZE,.5,2.15,d/2+.29,.09,.28,.07);
      if(home.kind!=='warehouse'){
        balcony(b,0,10,d/2+.8,Math.min(w-2,4.8));
        if(h>25)balcony(b,0,19,d/2+.8,Math.min(w-2,4.8));
        b.sheet(home.index%2?VERDIGRIS:BLUE,[-w*.42,4.7,d/2+.2],[w*.42,4.7,d/2+.2],[w*.42,4,d/2+1.6],[-w*.42,4,d/2+1.6]);
      }
    });
    for(const side of [-1,1])b.frame(0,0,0,side*Math.PI/2,()=>{
      for(let level=0;level<levels;level++)for(const q of [-1,1]){const yy=8+level*4.5;window(b,q*d*.22,yy,w/2-(yy>upper?inset:0)+.09,1.3,2.2);}
    });
    if(home.kind==='academy'||home.kind==='salon')roofLantern(b,0,h+Math.min(6,w*.28),0,Math.min(3.5,w*.2),7);
    else {b.block(SHADE,w*.23,h-2,-d*.17,1.3,5.5,1.4);b.box(IVORY,w*.23,h+3.5,-d*.17,1.65,.3,1.75);}
  }

  function library(b,home) {
    const w=home.width,d=home.depth,h=home.height;
    const wingW=w*.25,midW=w*.42,wingH=h*.69,midH=h*.83,porticoDepth=Math.min(6,d*.13);
    // Broad archive wings, a taller central reading hall and a roof lantern.
    // The entire composition remains inside its declared collision footprint.
    b.block(IVORY,0,0,0,w,1.6,d);
    for(const side of [-1,1]){
      b.block(STONE,side*(w/2-wingW/2),1.6,-porticoDepth/2,wingW,wingH,d-porticoDepth);
      b.box(WHITE,side*(w/2-wingW/2),wingH+1.6,-porticoDepth/2,wingW+.7,.7,d-porticoDepth+.7);
      b.roof(TEAL,side*(w/2-wingW/2),wingH+2,-porticoDepth/2,wingW+.2,d-porticoDepth+.3,5,0,IVORY);
      for(let level=0;level<5;level++)for(let k=0;k<3;k++)window(b,side*(w/2-wingW/2)+(k-1)*wingW*.25,6+level*(wingH-7)/5,d/2-porticoDepth+.15,wingW*.17,Math.min(4.5,wingH*.105),GLASS,true);
      for(let k=0;k<5;k++)b.frame(side*(w/2+.08),0,(k-2)*(d-porticoDepth)/5-porticoDepth/2,side*Math.PI/2,()=>{
        b.block(WHITE,0,1.4,0,1.05,wingH+1,1.15);
        for(let level=0;level<4;level++)window(b,2.2,8+level*(wingH-6)/4,.15,2.3,4.6,GLASS,true);
      });
      roofLantern(b,side*(w/2-wingW/2),wingH+7,-d*.2,3.4,8.5);
    }
    b.block(WHITE,0,1.6,-porticoDepth/2,midW,midH,d-porticoDepth);
    b.box(IVORY,0,midH+1.6,-porticoDepth/2,midW+1.4,.9,d-porticoDepth+1.2);
    const front=d/2-porticoDepth+.2;
    // The immense three-part reading window is visible from the whole court.
    for(const side of [-1,0,1]){
      const wx=side*midW*.29,ww=midW*.22;
      window(b,wx,midH*.52,front,ww,midH*.48,'#72aaa8',false);
      roundArch(b,wx,midH*.28,front+.45,ww+.3,midH*.48+ww*.35,.5,.6,IVORY);
      for(let k=1;k<5;k++)b.box(BRONZE,wx,midH*.28+k*midH*.085,front+.52,ww,.16,.12);
    }
    // The shadowed portico stays within the footprint. Building entrances
    // remain closed until the game's interior system is implemented.
    const columns=8,span=w-4,columnZ=d/2-1.5,entablature=12.6;
    for(let i=0;i<=columns;i++)column(b,-span/2+span*i/columns,1.6,columnZ,entablature-1.6,.67);
    for(let i=0;i<columns;i++)roundArch(b,-span/2+span*(i+.5)/columns,5,columnZ,span/columns-1.55,7.6,.52,.9);
    b.box(IVORY,0,entablature,columnZ-1.8,w,1.4,porticoDepth-1);
    b.box(BRONZE,0,entablature+.9,columnZ+.51,w-.8,.2,.12);
    balustrade(b,0,entablature+1.1,columnZ+.5,w-1.8,.35);
    b.triangle(WHITE,[-midW*.59,entablature+.8,columnZ+.4],[midW*.59,entablature+.8,columnZ+.4],[0,entablature+8.1,columnZ+.4]);
    emblem(b,0,entablature+3.7,columnZ+.58,2.4);
    b.box(WOOD,0,5.8,front+.05,6.2,8.4,.3);
    for(const s of [-1,1])b.box(BRONZE,s*1.5,5.8,front+.25,.2,8.1,.08);
    // A glazed clerestory and faceted dome crown the great reading room.
    b.roof(TEAL,0,midH+2,-porticoDepth/2,midW+1,d-porticoDepth+1,7,0,IVORY);
    const r=Math.min(midW*.36,d*.26),domeY=midH+6;
    b.cylinder(IVORY,0,domeY,-d*.05,r,5);
    for(let i=0;i<7;i++)b.frame(0,domeY,-d*.05,i*TAU/7,()=>window(b,0,2.7,r*.91,2,3,GLASS,true));
    // Three bevelled tiers avoid the generic cone silhouette of a watchtower.
    b.cylinder(VERDIGRIS,0,domeY+5,-d*.05,r+1,1.1);
    b.cone(TEAL,0,domeY+6,-d*.05,r+1,10);
    b.cylinder(BRONZE,0,domeY+12,-d*.05,r*.4,.55);
    roofLantern(b,0,domeY+16,-d*.05,1.55,5.5);
    for(const s of [-1,1])banner(b,s*(w/2-1.5),wingH+7,d/2-porticoDepth-1,5);
  }

  function palace(b,home) {
    const w=home.width,d=home.depth,h=home.height,r=Math.min(w,d)*.36;
    const tiers=[[0,h*.17,r*1.1],[h*.17,h*.25,r*.9],[h*.42,h*.23,r*.72],[h*.65,h*.19,r*.53],[h*.84,h*.1,r*.34]];
    b.block(SHADE,0,0,0,w,2,d);
    b.block(IVORY,0,2,0,w*.91,h*.13,d*.91);
    for(let level=0;level<tiers.length;level++) {
      const [base,tall,radius]=tiers[level];
      b.cylinder(level%2?WHITE:IVORY,0,base+2,0,radius,tall,Math.PI/7);
      b.cylinder(SHADE,0,base+tall+1.5,0,radius+.8,.7,Math.PI/7);
      b.cylinder(BRONZE,0,base+tall+2.2,0,radius+.2,.28,Math.PI/7);
      for(let k=0;k<7;k++)b.frame(0,0,0,k*TAU/7,()=>{
        b.block(WHITE,-radius*.33,base+2,radius*.91,.7,tall,.9);
        for(let j=1;j<=Math.max(2,Math.floor(tall/6));j++)window(b,0,base+2+j*tall/(Math.floor(tall/6)+1),radius*.91,Math.max(1.2,radius*.22),3.7,GLASS,level>2);
        if(level<4)balustrade(b,0,base+tall+2.5,radius*.91,radius*.74,.3);
      });
    }
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const x=sx*w*.32,z=sz*d*.32,hh=h*.42;
      b.cylinder(STONE,x,2,z,3.4,hh,Math.PI/7);
      for(const q of [hh*.3,hh*.65,hh])b.cylinder(IVORY,x,q,z,3.8,.7);
      b.cone(TEAL,x,hh+2,z,4.1,7);b.cone(BRONZE,x,hh+9,z,.4,2.5);
      b.frame(x,0,z,sz===1?0:Math.PI,()=>{for(let yy=8;yy<hh-2.5;yy+=6)window(b,0,yy,3.15,1.2,3.4);});
    }
    const front=d*.455+.1;
    b.box(DARK,0,7,front,6,11,.18);b.box(TEAL,0,6.8,front+.12,5.5,10.6,.16);
    roundArch(b,0,1.5,front+.35,6.5,13,.8,1.2);
    emblem(b,0,18,front+.22,2.6);
    for(const s of [-1,1])banner(b,s*5.8,4,front+.4,8);
    b.cone(TEAL,0,h*.94+2,0,r*.47,h*.055);
    b.cone(BRONZE,0,h*.995+2,0,1,h*.035);
    // A gold orrery gives the tower a scholarly, civic crown instead of a keep.
    const cy=h*1.045+2,rr=2.3;
    for(let i=0;i<16;i++){
      const a=i*TAU/16,c=(i+1)*TAU/16;
      b.beam(BRONZE,[Math.cos(a)*rr,cy+Math.sin(a)*rr,0],[Math.cos(c)*rr,cy+Math.sin(c)*rr,0],.15);
      b.beam(BRONZE,[Math.cos(a)*rr,cy,Math.sin(a)*rr],[Math.cos(c)*rr,cy,Math.sin(c)*rr],.15);
    }
    b.rock(WHITE,0,cy,0,.6,.6,.6);
  }

  for(const [index,home] of NYLON_BUILDINGS.entries()) {
    yield;
    const b=createSceneryBuilder(`Nylon — ${home.name}`),w=home.width,d=home.depth,y=heightAt(home.x,home.z);
    const foot=Math.min(y,...[-w/2,w/2].flatMap(dx=>[-d/2,d/2].map(dz=>heightAt(home.x+dx,home.z+dz))))-.45;
    b.frame(home.x,y,home.z,0,()=>{
      b.block(SHADE,0,foot-y,0,w+.12,y-foot+.2,d+.12);
      if(home.kind==='library')library(b,home);
      else if(home.kind==='palace')palace(b,home);
      else townHouse(b,{...home,index});
    });
    const mesh=yield* finish(b);mesh.geometry.computeBoundingBox();
    body(home.x,home.z,w+.2,d+.2,foot,mesh.geometry.boundingBox.max.y-foot,home.id);
    metrics.buildings++;
  }

  const mapFeatures=NYLON_BUILDINGS.map(b=>({id:b.id,name:b.name,x:b.x,z:b.z,width:b.width,depth:b.depth,kind:b.kind}));
  return {root,metrics,mapFeatures};
}
