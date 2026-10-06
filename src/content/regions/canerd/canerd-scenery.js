import * as THREE from 'three';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { CANERD, CANERD_PATHS } from './canerd-world.js';

const OLD='#777466', STONE='#969184', LIGHT='#b4ad99', MORTAR='#66665c';
const ASHLAR='#afa998', PALE='#c2bba7', SLATE='#46575b', SLATE_LIGHT='#627274';
const WOOD='#695443', DARK_WOOD='#483e32', DARK='#303936', IRON='#4c504a';
const OCHRE='#ad966b', LINEN='#c9bf9f', CLAY='#927154', TAU=Math.PI*2;
const local=(x,z,y=CANERD.summitHeight)=>({x:CANERD.x+x,z:CANERD.z+z,y});
const curtainPoints=[[7,34],[25,25],[34,7],[34,-15],[22,-32],[-22,-32],[-34,-15],[-34,7],[-25,25],[-7,34]];

export const createCanerdScenery=(...args)=>finishBuild(createCanerdScenerySteps(...args));

/** Successive chief-lord building campaigns on the open Celder plain.
 * The oldest courses are broad and dark; later ashlar and narrow upper towers
 * climb out of them. The fair is empty: architecture adds no invented people.
 * Roofs have no ground blockers. The gate and hall really are open, while the
 * southern wall has an independently supported, climbable lookout walk. */
export function* createCanerdScenerySteps({parent,heightAt,renderedGroundHeight=heightAt,colliders}) {
  const root=new THREE.Group();root.name='Canerd - castle on the plain';parent.add(root);
  const metrics={buildings:0,towers:0,gates:0,wallSegments:0,stoneCourses:0,windows:0,
    stalls:0,paddocks:0,walkSurfaces:0,batches:0,vertices:0,colliders:0,highestTowerHeight:84};
  const mapFeatures=[],walkSurfaces=[],walkRoutes=[];
  const ground=renderedGroundHeight,summit=ground(CANERD.x,CANERD.z);
  const point=(x,z,y=summit)=>local(x,z,y);
  const push=c=>{colliders.push(c);metrics.colliders++;return c;};
  const finish=function*(b){metrics.vertices+=b.vertexCount;const mesh=yield* b.finishSteps(root);if(mesh)metrics.batches++;return mesh;};
  const feature=(id,name,x,z,width,depth,kind='building')=>mapFeatures.push({id,name,...point(x,z),width,depth,kind});
  function blocker(x,z,hx,hz,minY=summit-.3,maxY=summit+12,kind='wall') {
    return push({...point(x,z),hx,hz,minY,maxY,kind:`canerd-${kind}`});
  }
  function lineBlockers(a,b,width,minY,maxY,kind='wall') {
    const distance=Math.hypot(b.x-a.x,b.z-a.z),count=Math.max(1,Math.ceil(distance/.9));
    for(let i=0;i<=count;i++)push({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count,
      r:width/2+.18,minY,maxY,kind:`canerd-${kind}`});
  }
  function masonry(b,width,height,depth,{old=false,faces=true}={}) {
    b.block(MORTAR,0,-.35,0,width,height+.35,depth);
    const rows=Math.ceil(height/(old?1.6:1.05));metrics.stoneCourses+=rows;
    for(let row=0;row<rows;row++) {
      const course=height/rows,units=Math.ceil(width/(old?3.4:2.15)),unit=width/units;
      const offsets=row%2?[0,...Array.from({length:units},(_,i)=>(i+.5)*unit),width]:Array.from({length:units+1},(_,i)=>i*unit);
      for(let j=1;j<offsets.length;j++) {
        const x0=-width/2+offsets[j-1]+.04,x1=-width/2+offsets[j]-.04;
        const y0=row*course+.055,y1=(row+1)*course-.055;
        const tint=(old?[OLD,STONE,OLD,'#838071']:[ASHLAR,STONE,LIGHT,ASHLAR])[(row*7+j*3)%4];
        for(const side of faces?[-1,1]:[1]) {
          const z=side*(depth/2+.025);
          if(side>0)b.quad(tint,[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]);
          else b.quad(tint,[x1,y0,z],[x0,y0,z],[x0,y1,z],[x1,y1,z]);
        }
      }
    }
  }
  function merlons(b,width,y,z,depth=1.05,tint=LIGHT) {
    const count=Math.max(2,Math.round(width/2.1));
    b.box(tint,0,y+.23,z,width,.46,depth+.15);
    for(let i=0;i<count;i++)b.block(tint,-width/2+(i+.5)*width/count,y+.4,z,width/count*.56,1.32,depth);
  }
  function window(b,x,y,z,width=1,height=2,tint=LIGHT) {
    b.box(DARK,x,y+height/2,z,width,height,.13);
    b.triangle(DARK,[x-width/2,y+height,z+.071],[x+width/2,y+height,z+.071],[x,y+height+.5,z+.071]);
    for(const side of [-1,1])b.block(tint,x+side*(width/2+.15),y-.1,z+.025,.22,height+.25,.25);
    b.beam(tint,[x-width/2-.1,y+height,z+.06],[x,y+height+.65,z+.06],.23);
    b.beam(tint,[x,y+height+.65,z+.06],[x+width/2+.1,y+height,z+.06],.23);
    b.box(tint,x,y-.12,z+.13,width+.64,.25,.52);
    if(width>1.5)b.block(tint,x,y,z+.07,.16,height+.2,.21);
    metrics.windows++;
  }
  function polygon(b,x,z,r,y,h,tint,sides=12) {
    for(let i=0;i<sides;i++) {
      const a=i*TAU/sides,c=(i+1)*TAU/sides;
      const p=[x+Math.sin(a)*r,y,z+Math.cos(a)*r],q=[x+Math.sin(c)*r,y,z+Math.cos(c)*r];
      b.quad(tint,p,q,[q[0],y+h,q[2]],[p[0],y+h,p[2]]);
      b.triangle(tint,[x,y+h,z],[p[0],y+h,p[2]],[q[0],y+h,q[2]]);
    }
  }
  function polygonRoof(b,x,z,r,y,h,sides=12) {
    for(let i=0;i<sides;i++) {
      const a=i*TAU/sides,c=(i+1)*TAU/sides;
      const p=[x+Math.sin(a)*r,y,z+Math.cos(a)*r],q=[x+Math.sin(c)*r,y,z+Math.cos(c)*r],tip=[x,y+h,z];
      b.triangle(i%3?SLATE:SLATE_LIGHT,p,q,tip);
      b.triangle(SLATE,tip,q,p);
      b.beam(SLATE_LIGHT,p,tip,.12);
    }
  }
  function tower(b,x,z,r,height,{highest=false}={}) {
    const y=summit-.4,sides=12;
    if(highest) {
      // Three deliberately different rebuilding periods share the same axis.
      polygon(b,x,z,r+1,y,1.3,OLD);
      polygon(b,x,z,r,y,24,OLD);
      polygon(b,x,z,r+.35,y+23.5,1.05,LIGHT);
      polygon(b,x,z,r*.86,y+24,32,STONE);
      polygon(b,x,z,r*.9,y+55,1.1,PALE);
      polygon(b,x,z,r*.71,y+56,18,ASHLAR);
      polygon(b,x,z,r*.77,y+73.3,1.2,PALE);
      polygonRoof(b,x,z,r*.8,y+74.5,9.9);
    } else {
      polygon(b,x,z,r+.55,y,1.1,OLD);
      polygon(b,x,z,r,y,height*.57,OLD);
      polygon(b,x,z,r+.2,y+height*.56,.62,LIGHT);
      polygon(b,x,z,r*.94,y+height*.57,height*.43,STONE);
      polygon(b,x,z,r+ .25,y+height-.35,.55,LIGHT);
    }
    const rows=highest?26:Math.floor(height/1.25);
    for(let row=0;row<rows;row++) {
      const h=highest?row*2.75+1:row*1.25+.4;
      const radius=highest?(h<24?r:h<56?r*.86:r*.71):h<height*.57?r:r*.94;
      for(let i=0;i<sides;i++) {
        const angle=(i+.5)*TAU/sides,half=radius*Math.cos(Math.PI/sides),width=2*radius*Math.sin(Math.PI/sides);
        b.frame(x+Math.sin(angle)*half,y+h,z+Math.cos(angle)*half,angle,()=>{
          b.box(row%3?STONE:LIGHT,0,0,.024,width-.035,.075,.075);
          b.box(row<8?OLD:ASHLAR,(row%2?-.23:.23)*width,.53,.032,.055,1.0,.072);
        });
      }
    }
    for(const h of highest?[8,18,31,43,60,68]:[height*.43,height*.74])for(let i=0;i<sides;i+=highest?2:3) {
      const radius=highest?(h<24?r:h<56?r*.86:r*.71):h<height*.57?r:r*.94;
      const angle=(i+.5)*TAU/sides,at=radius*Math.cos(Math.PI/sides);
      b.frame(x+Math.sin(angle)*at,y+h,z+Math.cos(angle)*at,angle,()=>window(b,0,0,.05,highest?1.05:.65,highest?2.7:1.7));
    }
    if(!highest)for(let i=0;i<sides;i++) {
      const a=(i+.5)*TAU/sides;
      b.block(LIGHT,x+Math.sin(a)*r*.94,y+height,z+Math.cos(a)*r*.94,1.35,1.65,1.12,a);
    }
    push({x,z,r:r+.3,minY:y,maxY:y+height,kind:highest?'canerd-highest-tower':'canerd-tower'});
    metrics.towers++;
  }
  function arch(b,width,spring,rise,depth,tint=PALE) {
    const half=width/2,n=16;
    for(let i=0;i<n;i++) {
      const a=i*Math.PI/n,c=(i+1)*Math.PI/n;
      const inner=t=>[Math.cos(t)*half,spring+Math.sin(t)*rise];
      const outer=t=>[Math.cos(t)*(half+.65),spring+Math.sin(t)*(rise+.68)];
      const p=inner(a),q=inner(c),r=outer(c),s=outer(a);
      for(const face of [-1,1])b.sheet(i%3?tint:LIGHT,[p[0],p[1],face*depth/2],[q[0],q[1],face*depth/2],[r[0],r[1],face*depth/2],[s[0],s[1],face*depth/2]);
      b.sheet(STONE,[p[0],p[1],-depth/2],[p[0],p[1],depth/2],[q[0],q[1],depth/2],[q[0],q[1],-depth/2]);
    }
    for(const side of [-1,1])b.block(tint,side*(half+.33),0,0,.65,spring,depth);
  }

  const paving=createSceneryBuilder('Canerd - rising processional road and stone court');
  for(const path of CANERD_PATHS)for(let i=1;i<path.points.length;i++) {
    if(i%12===0)yield;
    const a=path.points[i-1],b=path.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
    if(length<.01)continue;
    yield* paving.patchSteps('#9b927b',ground,(a.x+b.x)/2,(a.z+b.z)/2,path.width??9,length+.08,Math.atan2(b.x-a.x,b.z-a.z),.045,2);
  }
  yield* paving.patchSteps('#a29b88',ground,CANERD.x,CANERD.z+11,39,34,0,.055,15);
  // Individually worn flags line the court without changing walking height.
  for(let x=-12;x<=12;x+=3)for(let z=1;z<=27;z+=3) {
    const p=point(x,z);paving.box((x+z)%2?'#a8a18d':'#99937f',p.x,ground(p.x,p.z)+.057,p.z,2.93,.035,2.9);
  }
  yield* finish(paving);

  for(let i=1;i<curtainPoints.length;i++) {
    yield;
    const pa=curtainPoints[i-1],pb=curtainPoints[i],a=point(...pa),c=point(...pb);
    const length=Math.hypot(c.x-a.x,c.z-a.z),yaw=Math.atan2(-(c.z-a.z),c.x-a.x);
    const low=i===1||i===9,height=low?9.5:12.5;
    const b=createSceneryBuilder(`Canerd - ${low?'lower south':'old curtain'} wall ${i}`);
    b.frame((a.x+c.x)/2,summit,(a.z+c.z)/2,yaw,()=>{
      masonry(b,length,height,2.4,{old:true});
      b.box(LIGHT,0,5.7,0,length+.18,.38,2.68);
      b.box(ASHLAR,0,height-.38,0,length+.15,.52,3.1);
      merlons(b,length,height,1.05,.95);
      for(let x=-length/2+3;x<length/2-2;x+=6) {
        b.block(OLD,x,-.45,1.45,1.7,7.2,1.5);
        b.box(LIGHT,x,6.85,1.42,1.85,.38,1.65);
      }
    });
    lineBlockers(a,c,2.4,summit-.5,summit+height-.12);
    metrics.wallSegments++;yield* finish(b);
  }

  const gate=createSceneryBuilder('Canerd - open vaulted south gate');
  gate.frame(CANERD.x,summit,CANERD.z+34,0,()=>{
    arch(gate,12,4.3,2.5,3.6);
    gate.block(ASHLAR,0,6.8,0,14.4,2.68,3.6);
    gate.box(LIGHT,0,9.4,0,15,.32,4.1);
    merlons(gate,14.2,9.5,1.7,.75);
    for(const side of [-1,1]) {
      // The two gate leaves are folded against the passage sides.
      gate.block(DARK_WOOD,side*5.9,0,-1.75,.26,4.2,3.2);
      for(const h of [.6,2.2,3.6])gate.box(IRON,side*5.72,h,-1.75,.12,.16,3.1);
      gate.block(OLD,side*7.05,-.4,0,1.55,7.2,4.6);
      gate.box(PALE,side*7.05,6.85,0,1.8,.38,4.9);
    }
    // A lifted portcullis is visible well above a rider's head.
    for(let x=-5.5;x<=5.5;x+=.65)gate.block(IRON,x,6.75,.6,.105,2.3,.11);
  });
  for(const side of [-1,1])blocker(side*7.05,34,.85,2.3,summit-.4,summit+7.2,'gate-jamb');
  blocker(0,34,6.1,1.8,summit+6.78,summit+9.5,'gate-vault');
  metrics.gates++;feature('canerd-south-gate','Canerd south gate',0,34,15,5,'gate');yield* finish(gate);

  const towers=createSceneryBuilder('Canerd - towers of successive building periods');
  for(const [x,z,r,h] of [[-28,18,4.7,19],[28,18,4.7,21],[25,-23,5.3,26]]) {
    const p=point(x,z);tower(towers,p.x,p.z,r,h);yield;
  }
  const high=point(-19,-20);tower(towers,high.x,high.z,8,84,{highest:true});
  feature('canerd-highest-tower','Canerd highest tower',-19,-20,18,18,'tower');yield* finish(towers);

  const hall=createSceneryBuilder('Canerd - chief-lord hall and rebuilt high keep');
  hall.frame(CANERD.x-5,summit,CANERD.z-13,0,()=>{
    // Ground floor: an actual room, open through the broad southern portal.
    for(const side of [-1,1])hall.frame(side*12.4,0,0,Math.PI/2,()=>masonry(hall,22,14,1.2,{old:true}));
    hall.frame(0,0,-10.4,0,()=>masonry(hall,26,14,1.2,{old:true}));
    for(const side of [-1,1])hall.frame(side*7.95,0,10.4,0,()=>masonry(hall,10.1,14,1.2));
    hall.block(ASHLAR,0,4.8,10.4,6,9.2,1.2);
    hall.frame(0,0,11.1,0,()=>arch(hall,5.7,2.75,1.75,1.45));
    hall.box(LIGHT,0,14.0,0,27,.5,23);
    hall.roof(SLATE,0,14.25,0,28,24,8.5,0,ASHLAR);
    for(const z of [-10,-5,0,5,10]) {
      hall.beam(DARK_WOOD,[-12,13.7,z],[0,21.8,z],.33);
      hall.beam(DARK_WOOD,[0,21.8,z],[12,13.7,z],.33);
      hall.beam(WOOD,[-12,12.6,z],[12,12.6,z],.36);
    }
    for(const side of [-1,1])for(const z of [-7,0,7]) {
      hall.frame(side*13.08,0,z,side*Math.PI/2,()=>window(hall,0,6,.07,1.65,3.5));
      hall.block(OLD,side*13.1,-.25,z,1.3,7.8,1.5);
      hall.box(LIGHT,side*13.1,7.5,z,1.45,.35,1.7);
    }
    for(const x of [-8.5,8.5])window(hall,x,6.1,11.08,2.2,3.5);
    window(hall,0,15.2,12.06,2.3,3.8);
    // Large fitted flagstones, side benches, and a raised chair behind the court.
    hall.box('#a19b86',0,.045,0,24.5,.07,20.4);
    for(const side of [-1,1])for(const z of [-4,1,6]) {
      if(side<0&&z<0)continue; // The older round tower occupies this hall corner.
      hall.block(WOOD,side*8.4,.0,z,2,.52,3.4);
      hall.box(DARK_WOOD,side*9.3,1.0,z,.18,1.1,3.4);
    }
    hall.block(OLD,0,0,-7.3,7,.18,3.8);
    hall.block(WOOD,0,.18,-7.7,2.3,.58,2.0);
    hall.block(DARK_WOOD,0,.5,-8.4,2.6,3,.34);
    for(const side of [-1,1])hall.block(WOOD,side*1.05,.65,-7.7,.25,.68,1.85);
    hall.box(PALE,0,2.45,-8.17,1.7,.17,.14);
    // The later narrow keep rises from the hall's rear, with its own roofline.
    hall.frame(0,21,-4.5,0,()=>masonry(hall,18,18,12));
    hall.box(PALE,0,39.05,-4.5,19,.55,13);
    for(const side of [-1,1])hall.frame(0,39.3,-4.5+side*6.1,0,()=>merlons(hall,18,0,0,.85));
    for(const x of [-5.6,0,5.6])for(const y of [24,31])window(hall,x,y,1.58,1.25,3.0);
    hall.roof(SLATE,-.2,40,-4.6,12,9,7.8);
  });
  blocker(-17.4,-13,.7,11,summit-.4,summit+14,'hall-wall');
  blocker(7.4,-13,.7,11,summit-.4,summit+14,'hall-wall');
  blocker(-5,-23.4,13,.7,summit-.4,summit+14,'hall-wall');
  for(const side of [-1,1])blocker(-5+side*7.95,-2.6,5.05,.7,summit-.4,summit+14,'hall-wall');
  blocker(-5,-2.6,3,.7,summit+4.8,summit+14,'hall-lintel');
  for(const side of [-1,1])for(const z of [-4,1,6])if(side>0||z>=0)blocker(-5+side*8.4,-13+z,1,1.7,summit,summit+1.6,'hall-bench');
  blocker(-5,-20.7,1.3,1,summit+.18,summit+3.5,'court-chair');
  metrics.buildings++;feature('canerd-chief-lord-hall','Canerd court hall',-5,-13,26,22);yield* finish(hall);

  const service=createSceneryBuilder('Canerd - summit stables and service court');
  service.frame(CANERD.x+22,summit,CANERD.z-9,0,()=>{
    service.frame(0,0,-11.5,0,()=>masonry(service,14,5.2,1,{old:true}));
    for(const side of [-1,1])service.frame(side*6.6,0,0,Math.PI/2,()=>masonry(service,24,5.2,.8,{old:true}));
    service.roof(CLAY,0,5.35,0,15.7,25.6,4.2);
    for(const x of [-6,0,6])service.block(DARK_WOOD,x,0,11.5,.42,5.4,.42);
    for(const z of [-6,1,8]) {
      service.beam(WOOD,[-6,4.8,z],[6,4.8,z],.24);
      service.box(WOOD,-4.7,1.1,z,3.2,.18,.16);
      service.block(DARK_WOOD,-3.1,0,z,.16,1.4,.16);
    }
    for(const x of [-4,4])service.block(OCHRE,x,.08,-8.8,3.3,.75,2.5);
    service.block(OLD,4.6,.0,6.8,2.2,.75,3.3);
    service.box(DARK,4.6,.74,6.8,1.8,.035,2.9);
    for(const x of [-4,0,4])service.beam(WOOD,[x,5.3,-12.7],[x,9.6,0],.13);
  });
  blocker(22,-20.5,7,.5,summit-.3,summit+5.3,'stable-wall');
  for(const side of [-1,1])blocker(22+side*6.6,-9,.4,12,summit-.3,summit+5.3,'stable-wall');
  for(const x of [16,22,28])blocker(x,2.5,.24,.24,summit,summit+5.4,'stable-post');
  blocker(26.6,-2.2,1.1,1.65,summit,summit+.8,'trough');
  metrics.buildings++;feature('canerd-summit-stables','Canerd summit stables',22,-9,14,24);yield* finish(service);

  const walks=createSceneryBuilder('Canerd - climbable stair and southern battlement');
  const route=[[-19,5,0],[-19,25,9.5],[-19,27,9.5],[-7,33,9.5],[7,33,9.5]];
  const raised=route.map(([x,z,y])=>point(x,z,summit+y));
  for(let i=1;i<raised.length;i++) {
    const a=raised[i-1],b=raised[i],width=i===1?4:4.5,ramp=a.y!==b.y,id=`canerd-battlement-${i}`;
    walkSurfaces.push({id,kind:ramp?'ramp':'deck',a,b,width});
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
    const corners=(p,y)=>[p.x,y,p.z];
    const at=(p,side)=>({x:p.x+nx*width*.5*side,z:p.z+nz*width*.5*side});
    if(ramp) {
      const count=57;
      for(let j=0;j<count;j++) {
        const t=j/count,u=(j+1)/count,stepLength=length/count+.025;
        walks.box(j%4?STONE:LIGHT,a.x+dx*(t+u)/2,a.y+(b.y-a.y)*u-.08,a.z+dz*(t+u)/2,width,.16,stepLength,Math.atan2(dx,dz));
      }
    } else {
      const l=at(a,-1),r=at(a,1),u=at(b,1),v=at(b,-1);
      walks.sheet(ASHLAR,corners(l,a.y-.02),corners(r,a.y-.02),corners(u,b.y-.02),corners(v,b.y-.02));
    }
    // Railings match the elevated support, never a ground-height fence across the court.
    // Connected landings overlap at corners; their inner rail is omitted there.
    for(const side of [-1,1]) {
      if(i>1)continue;
      const p=at(a,side),q=at(b,side);
      walks.beam(WOOD,[p.x,a.y+1.05,p.z],[q.x,b.y+1.05,q.z],.16);
      const count=Math.ceil(length/2);
      for(let j=0;j<=count;j++) {
        const t=j/count,y=a.y+(b.y-a.y)*t;
        walks.block(WOOD,p.x+(q.x-p.x)*t,y,p.z+(q.z-p.z)*t,.15,1.15,.15);
        push({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t,r:.11,minY:y,maxY:y+1.15,kind:'canerd-stair-rail'});
      }
    }
  }
  // An inside parapet protects the gate overlook; its ends stay open to the stair.
  walks.block(OLD,CANERD.x,summit+9.5,CANERD.z+30.5,12,1.15,.45);
  blocker(0,30.5,6,.225,summit+9.5,summit+10.65,'lookout-parapet');
  // Approach below the first tread. A diagonal directly between the court and
  // the bottom tread crosses the side of the ramp on the return journey.
  walkRoutes.push({id:'canerd-battlement-route',points:[point(-19,1),...raised]});
  metrics.walkSurfaces=walkSurfaces.length;feature('canerd-battlement-lookout','Canerd battlement lookout',0,33,14,4,'lookout');yield* finish(walks);

  const fair=createSceneryBuilder('Canerd - horse fair booths and empty paddock');
  const fairground=point(112,102),fairY=ground(fairground.x,fairground.z);
  yield* fair.patchSteps('#a5997a',ground,fairground.x,fairground.z,32,11,0,.045,10);
  fair.frame(fairground.x,fairY,fairground.z,0,()=>{
    fair.roof(CLAY,0,3.6,0,8.8,29.5,2.2,Math.PI/2);
    // The roof ridge follows the long row of vacant sale booths.
    for(let i=0;i<7;i++) {
      const x=-14+i*4.65;
      for(const z of [-3.5,3.5])fair.block(DARK_WOOD,x,-.3,z,.28,4,.28);
      if(i<6) {
        fair.block(WOOD,x+2.25,.05,-3.35,4.3,1.4,.22);
        fair.box(OCHRE,x+2.25,1.45,-2.45,4.3,.2,1.8);
        fair.sheet(i%2?LINEN:'#8d9c8a',[x+.3,3.5,3.55],[x+4.2,3.5,3.55],[x+4.2,2.9,5.3],[x+.3,2.9,5.3]);
        metrics.stalls++;
      }
    }
  });
  for(let i=0;i<7;i++)for(const z of [-3.5,3.5]) {
    const p=point(98+i*4.65,102+z);push({...p,r:.18,minY:ground(p.x,p.z)-.3,maxY:fairY+4,kind:'canerd-fair-post'});
  }
  feature('canerd-horse-fair','Canerd horse fair',112,102,30,9,'market');
  const pen=[point(130,78),point(144,78),point(144,100),point(130,100),point(130,94)];
  // A six-metre west opening faces the approach and the booths.
  for(let i=1;i<pen.length;i++) {
    const a=pen[i-1],b=pen[i],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/3);
    for(let j=0;j<=n;j++) {
      const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n,y=ground(x,z);
      fair.block(WOOD,x,y-.12,z,.18,1.65,.18);
      push({x,z,r:.15,minY:y-.12,maxY:y+1.53,kind:'canerd-paddock-post'});
      if(j) {
        const px=a.x+(b.x-a.x)*(j-1)/n,pz=a.z+(b.z-a.z)*(j-1)/n,py=ground(px,pz);
        for(const h of [.55,1.22])fair.beam(WOOD,[px,py+h,pz],[x,y+h,z],.11);
        lineBlockers({x:px,z:pz},{x,z},.1,Math.min(y,py),Math.max(y,py)+1.4,'paddock-rail');
      }
    }
  }
  const lastA=point(130,78),lastB=point(130,88);
  for(let j=0;j<=5;j++) {
    const p=point(130,78+10*j/5),y=ground(p.x,p.z);fair.block(WOOD,p.x,y-.12,p.z,.18,1.65,.18);
  }
  for(const h of [.55,1.22])fair.beam(WOOD,[lastA.x,ground(lastA.x,lastA.z)+h,lastA.z],[lastB.x,ground(lastB.x,lastB.z)+h,lastB.z],.11);
  lineBlockers(lastA,lastB,.1,Math.min(ground(lastA.x,lastA.z),ground(lastB.x,lastB.z)),Math.max(ground(lastA.x,lastA.z),ground(lastB.x,lastB.z))+1.5,'paddock-rail');
  metrics.paddocks++;feature('canerd-fair-paddock','Canerd fair paddock',137,89,14,22,'paddock');yield* finish(fair);

  root.userData.canerd={summitHeight:summit,highestTowerHeight:metrics.highestTowerHeight};
  return {root,metrics,mapFeatures,walkSurfaces,walkRoutes};
}
