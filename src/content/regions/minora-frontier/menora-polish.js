import {createMinoraTrees} from './minora-trees.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { MENORA, MENORA_OUTLINE, MENORA_GATES, MENORA_BUILDINGS, MENORA_PATHS, MENORA_GARDENS, MENORA_NPC_ANCHORS,
  LIZEEM_MARKET_STANDS, inMenora, menoraSegmentDistance, menoraRiverClearance, menoraBridgeAt } from './menora-city.js';

/**
 * Minora's polish (7 October 2026): what the survey of the white city found missing, added as detail on the layout
 * without moving any of it (./menora-city.js). A corbelled wall walk, buttresses, arrow slits and a corner bartizan on
 * the curtain; banners and torches at the gates; chimneys, shutters, dormers, doorsteps and lanterns on the houses; a
 * frieze on the Library, a hoist at the storehouse, a spear rack at the barracks and an orchard by the cloister;
 * ornamental trees, hedges, small paved courts, a well, carts and wood stacks on the lawns; kerbs, lamps and banner
 * poles along the ways, and a raised course of paving where the Sacred and Temple Ways leave the walls. It is builder geometry in four merged batches: no new species, no per-frame work. Everything
 * that stands free keeps `menoraPolishClear`, which tests/menora-polish.test.js holds against the layout.
 */
const WHITE='#e2e2d2', IVORY='#eee9d4', SHADE='#b9c4bd', DARK='#385052', GOLD='#c6ad6b', WOOD='#726052', RED='#713e45';
const SLATE='#768387', IRON='#3a3f3f', GLASS='#e8c777', GLASSPANE='#a9c3b7', PAVING='#c4c2ac', COURT='#b8b8a2', CLAY='#9c6b4a', STRAW='#c5ac75', TIMBER='#8f7a62', WATER='#548985';
const LEAVES=['#4f7748','#5b8550','#466a40','#537759'], CYPRESS='#3e6142', FLOWERS=['#ddc479','#b691bc'];
const SHUTTERS=['#5f765b','#726052','#5b6f63','#6d5c4e'];
const freeze=Object.freeze, pt=(x,z)=>freeze({x,z}), TAU=Math.PI*2;

/** Where the city's people stand besides MENORA_NPC_ANCHORS and the factors' stands: Seshat, Nepri, Rudiger, Imhotep,
 * Satet and Hapi (src/content/quests/lizeem-farmlands/), Taleth, the Developer Start and the dividing table and its guests. */
export const MENORA_POLISH_KEEP_CLEAR=freeze([[-2328,59.5],[-2337,192.5],[-2421,79.5],[-2254,127],[-2343,129],[-2337,209.6],
  [-2409.5,58],[-2414,63],[-2420.5,59.5],[-2422,57.6],[-2419,57.6]].map(([x,z])=>pt(x,z)));
const ANCHORS=[MENORA.arrival,MENORA.templeCourt,MENORA_NPC_ANCHORS.cedric,MENORA_NPC_ANCHORS.wilhelm,...MENORA_NPC_ANCHORS.army,
  ...MENORA_NPC_ANCHORS.guards,...LIZEEM_MARKET_STANDS,...MENORA_POLISH_KEEP_CLEAR];
/** The squares menora-scenery.js paves: the temple plaza (story ground, kept open), the market courts and the Guild forecourt. */
const PAVED=[{x:-2338,z:137,width:34,depth:28},{x:-2370,z:152,width:24,depth:13},{x:-2365,z:140,width:13,depth:6},{x:-2414,z:60,width:25,depth:13}];
const PLAZA=PAVED[0];
const SEGMENTS=MENORA_PATHS.flatMap(p=>p.points.slice(1).map((b,i)=>freeze({path:p,a:p.points[i],b})));
const inBox=(x,z,b,m=0)=>Math.abs(x-b.x)<b.width/2+m&&Math.abs(z-b.z)<b.depth/2+m;
const hits=(x,z,r,list)=>list.some(c=>c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+r:Math.abs(x-c.x)<c.hx+r&&Math.abs(z-c.z)<c.hz+r);
/** How far a point stands outside the nearest lane's paving (negative inside it). */
export const menoraLaneGap=(x,z,skip)=>Math.min(...SEGMENTS.filter(s=>s!==skip).map(s=>menoraSegmentDistance(x,z,s.a,s.b)-s.path.width/2));
const wallGap=(x,z)=>Math.min(...MENORA_OUTLINE.map((a,i)=>menoraSegmentDistance(x,z,a,MENORA_OUTLINE[(i+1)%MENORA_OUTLINE.length])));

/** The placement rules for anything standing free, `r` its footprint: a metre off every lane beyond its paving, six from
 * a gate, four from anybody's place and from water, three from a bridge deck or its ends, 0.6 from a building. */
export function menoraPolishClear(x,z,r=0,{obstacles=[],wall=true,story=true,garden=true}={}) {
  if(menoraLaneGap(x,z)<=1+r||MENORA_GATES.some(g=>Math.hypot(x-g.x,z-g.z)<=6+r))return false;
  if(ANCHORS.some(a=>Math.hypot(x-a.x,z-a.z)<=4+r)||LIZEEM_MARKET_STANDS.some(s=>inBox(x,z,s.stall,1+r)))return false;
  if(MENORA_BUILDINGS.some(b=>inBox(x,z,b,.6+r))||(story&&inBox(x,z,PLAZA,r))||(garden&&MENORA_GARDENS.some(g=>inBox(x,z,g,r))))return false;
  if((wall&&wallGap(x,z)<=2.2+r)||menoraBridgeAt(x,z,3+r)||menoraRiverClearance(x,z)<=4+r)return false;
  return !hits(x,z,r+.3,obstacles);
}
/** The nearest clear spot within `reach` metres, searched ring by ring. */
function settle(x,z,r,opts,reach=3,level=()=>true) {
  for(let ring=0;ring<=reach*2;ring++){const n=ring?ring*6:1;
    for(let i=0;i<n;i++){const a=i/n*TAU,px=x+Math.cos(a)*ring*.5,pz=z+Math.sin(a)*ring*.5;if(menoraPolishClear(px,pz,r,opts)&&level(px,pz))return pt(px,pz);}}
  return null;
}
/** The rise of the ground across a footprint of radius `r`, and its lowest point. */
const spread=(heightAt,x,z,r)=>{const h=[heightAt(x,z)];for(let i=0;i<8;i++)h.push(heightAt(x+Math.cos(i*TAU/8)*r,z+Math.sin(i*TAU/8)*r));return Math.max(...h)-Math.min(...h);};
const lowest=(heightAt,x,z,r)=>Math.min(heightAt(x,z),...[0,1,2,3].map(i=>heightAt(x+Math.cos(i*TAU/4)*r,z+Math.sin(i*TAU/4)*r)));
const EDGES=MENORA_OUTLINE.map((a,e)=>{
  const c=MENORA_OUTLINE[(e+1)%MENORA_OUTLINE.length],dx=c.x-a.x,dz=c.z-a.z,len=Math.hypot(dx,dz),dir=pt(dx/len,dz/len);
  const o=inMenora((a.x+c.x)/2+dz/len*5,(a.z+c.z)/2-dx/len*5)?-1:1,gate=MENORA_GATES.find(g=>g.edge===e);
  return freeze({e,a,c,len,yaw:Math.atan2(dx,dz),dir,o,out:pt(dz/len*o,-dx/len*o),steps:Math.ceil(len/3),
    gate:gate?freeze({...gate,along:(gate.x-a.x)*dir.x+(gate.z-a.z)*dir.z}):null});
});
const turreted=p=>menoraRiverClearance(p.x,p.z)>7; // as menora-scenery.js decides a corner turret
const laneThrough=g=>Math.max(...SEGMENTS.filter(s=>menoraSegmentDistance(g.x,g.z,s.a,s.b)<1).map(s=>s.path.width));
/** Points every `step` metres along a polyline from `start`, with the direction of travel there. */
function* along(points,step,start) {
  let s0=0;
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.z-a.z);
    for(let s=Math.ceil((s0-start)/step)*step+start;s<s0+len;s+=step){const t=(s-s0)/len;yield {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/len,dz:(b.z-a.z)/len,s};}
    s0+=len;}
}

// The ornamental trees: a cypress walk down the Sacred Way, round trees on the lawns, blossom at the gardens' ends and four
// fruit trees in the cloister's orchard court. [x, z, kind, size]
const TREES=[
  ...[22,46,58,82,94,106,118,152,164,176,196].flatMap(z=>[[-2316.4,z,'cypress',1],[-2299.6,z+6,'cypress',1]]),
  [-2296,19,'round',1],[-2290,27,'round',.9],[-2431.5,22,'cypress',1.1],[-2431.5,36,'round',1],[-2398,20,'round',1],
  [-2374,19,'round',1.1],[-2373,42,'round',.9],[-2349,38,'round',1],[-2378,58,'round',1],
  [-2295,84,'round',1.1],[-2290,95,'round',1],[-2296,108,'round',1],[-2282,98,'round',.9],[-2294,124,'round',1.1],
  [-2262,104,'round',1.1],[-2251,110,'round',1],[-2259,120,'round',.9],[-2247,124,'round',1],
  [-2295,150,'round',1],[-2296,162,'round',1.1],[-2294,173,'round',.9],[-2318,158,'round',1],[-2325,165,'round',1.1],[-2318,175,'round',.9],
  [-2410.3,158,'round',1],[-2410.3,170,'round',.9],[-2398,160,'round',.9],[-2398,112,'round',1],[-2398,126,'round',1],
  [-2362,92,'round',1],[-2361,106,'round',1.1],[-2427,180,'round',.9],[-2411,186.5,'round',.8],[-2383,195,'round',1.1],[-2381,205,'round',.9],
  [-2297,190,'round',1],[-2272,192,'round',1],[-2266,200,'round',.9],
  [-2363.6,78,'blossom',.9],[-2336.4,78,'blossom',.9],[-2292,31.6,'blossom',.9],[-2427.8,139,'blossom',.9],[-2364.8,154,'blossom',.8],[-2345.2,154,'blossom',.8],
  ...[112,118.5,125,131.5].map(z=>[-2433.3,z,'fruit',1]),
];
// Small courts of the second paving: before house groups, the barracks' drill yard and the cloister's orchard. [x, z, width, depth]
const COURTS=[[-2419.5,182.6,20,9.6],[-2387,36.2,8,7.2],[-2397,108,6,6.4],[-2352.5,177.4,40,4.4],[-2281,124.2,11,7],[-2420,110.4,19,6.6],[-2433.3,121.5,4.8,25]];
// The free props: the well in the south-west court, carts, covered wood stacks. [kind, x, z, yaw, r]
const PROPS=[['well',-2417,182.8,0,1.15],['cart',-2256,114,.45,1.3],['cart',-2367,191.3,Math.PI/2,1.3],['cart',-2324,171,-.3,1.3],
  ['woodstack',-2264,128,Math.PI/2,1.4],['woodstack',-2298,199,0,1.4],['woodstack',-2378,15.5,Math.PI/2,1.4]];

/** The polish as data: where every free-standing piece goes. The builders below draw it; the test checks it. Given the
 * ground, trees, props and courts also keep off the beck's steep banks. */
export const planMenoraPolish=options=>finishBuild(planMenoraPolishSteps(options));
export function* planMenoraPolishSteps({obstacles=[],heightAt=null}={}) {
  let work=0;const tick=()=>++work%8===0;
  const level=(r,rise)=>(x,z)=>!heightAt||spread(heightAt,x,z,r)<=rise;
  const taken=[...obstacles],plan={buttresses:[],bartizans:[],banners:[],lanterns:[],props:[],trees:[],hedges:[],courts:[],kerbs:[],causeways:[]};
  const take=(list,item,r)=>{taken.push({x:item.x,z:item.z,r});list.push(freeze(item));};
  const opts=extra=>({obstacles:taken,...extra});
  // Tapered buttresses about every 24 m along the inner face, wherever the ground beside the wall is free.
  for(const E of EDGES){const n=Math.max(1,Math.floor(E.len/24));
    for(let k=0;k<n;k++){const s=(k+.5)*E.len/n;
      if(s<8||s>E.len-8||(E.gate&&Math.abs(s-E.gate.along)<17))continue;
      const x=E.a.x+E.dir.x*s-E.out.x*2.6,z=E.a.z+E.dir.z*s-E.out.z*2.6;
      if(menoraPolishClear(x,z,1.05,{wall:false,story:false}))take(plan.buttresses,{x,z,r:1.05,edge:E.e,along:s},1.05);
    }}
  // A corbelled bartizan wherever an outline corner has no turret (the river corners).
  MENORA_OUTLINE.forEach((p,i)=>{if(turreted(p))return;const A=EDGES[(i+EDGES.length-1)%EDGES.length],B=EDGES[i];
    const bx=A.out.x+B.out.x,bz=A.out.z+B.out.z,l=Math.hypot(bx,bz);plan.bartizans.push(freeze({corner:i,x:p.x+bx/l*1.9,z:p.z+bz/l*1.9}));});
  // Banner poles: both sides of each gate inside, clear of a bridge that runs through it, and the plaza's corners.
  for(const g of MENORA_GATES){if(tick())yield;const E=EDGES[g.edge],half=laneThrough(g)/2+1.6;
    for(const side of [-1,1]){let d=9;const at=d=>pt(g.x-E.out.x*d+E.dir.x*side*half,g.z-E.out.z*d+E.dir.z*side*half);
      while(d<30&&menoraBridgeAt(at(d).x,at(d).z,3.5))d+=1.5;
      const p=settle(at(d).x,at(d).z,.3,opts({}),5);if(p)take(plan.banners,{...p,yaw:E.yaw,at:g.id},.3);}}
  for(const [x,z] of [[-2354,123.8],[-2322,123.8],[-2354,142.3],[-2322,142.3]]){const p=settle(x,z,.3,opts({story:false}),2);if(p)take(plan.banners,{...p,yaw:0,at:'plaza'},.3);}
  // Lamps every 18 m down the Sacred Way and the Temple Way inside the walls, sides alternating, and round the plaza.
  for(const id of ['menora-sacred-way','menora-temple-way']){const path=MENORA_PATHS.find(p=>p.id===id);let k=0;
    for(const q of along(path.points,18,9)){if(tick())yield;if(!inMenora(q.x,q.z)||inBox(q.x,q.z,PLAZA,6))continue;const side=k++%2?1:-1,off=path.width/2+1.35;
      for(const t of [0,1.5,-1.5,3,-3,4.5,-4.5]){const x=q.x+q.dx*t+q.dz*side*off,z=q.z+q.dz*t-q.dx*side*off;
        if(menoraPolishClear(x,z,.25,opts({}))){take(plan.lanterns,{x,z,at:id},.3);break;}}}}
  for(const [x,z] of [[-2350,123.8],[-2326,123.8],[-2354.2,132],[-2321.8,132]]){const p=settle(x,z,.25,opts({story:false}),3);if(p)take(plan.lanterns,{...p,at:'plaza'},.3);}
  // A lamp pair, a milestone and flower tubs before the Northern Gate and where the Pilgrims' Bridge lands below the Isa Gate.
  for(const [base,sz] of [[MENORA_GATES[0],-1],[pt(-2308,286),1]]){const north=sz<0;
    for(const sx of [-1,1]){
      const lamp=settle(base.x+sx*6.1,base.z+sz*(north?12:5),.25,opts({}),2);if(lamp)take(plan.lanterns,{...lamp,at:north?'northern-gate':'isa-gate'},.3);
      const tub=settle(base.x+sx*6.7,base.z+sz*(north?8.5:4.2),.5,opts({}),2);if(tub)take(plan.props,{...tub,kind:'tub',yaw:0,r:.5,collider:false},.5);
    }
    const mile=settle(base.x+6.4,base.z+sz*(north?17:10),.35,opts({}),2);if(mile)take(plan.props,{...mile,kind:'milestone',yaw:-Math.PI/2,r:.35,collider:false},.35);
  }
  for(const [kind,x,z,yaw,r] of PROPS){if(tick())yield;const p=settle(x,z,r,opts({}),2,level(r,.3));if(p)take(plan.props,{...p,kind,yaw,r,collider:true},r);}
  for(const [i,[x,z,kind,size]] of TREES.entries()){if(tick())yield;const p=settle(x,z,.35,opts({}),kind==='fruit'?.5:2,level(.6,.45));
    if(p)take(plan.trees,{...p,kind,size,tint:LEAVES[i%LEAVES.length]},kind==='cypress'?.9:1.3*size);}
  // Low hedges along the long sides of the temple gardens, outside each bed where a lane leaves room, else just inside it.
  for(const g of MENORA_GARDENS){const wide=g.width>=g.depth,len=wide?g.width:g.depth,n=Math.round(len/1.35);
    for(const side of [-1,1]){if(tick())yield;
      const row=off=>Array.from({length:n},(_,i)=>{const u=-len/2+(i+.5)*len/n,v=side*((wide?g.depth:g.width)/2+off);
        return wide?{x:g.x+u,z:g.z+v,yaw:Math.PI/2}:{x:g.x+v,z:g.z+u,yaw:0};}).filter(p=>menoraPolishClear(p.x,p.z,0,{story:false,garden:false}));
      const best=[row(.5),row(-.4)].sort((a,b)=>b.length-a.length)[0];plan.hedges.push(...best.map(freeze));}}
  for(const [x,z,width,depth] of COURTS){
    const edge=[];for(let i=0;i<=8;i++)for(const [u,v] of [[i/8-.5,-.5],[i/8-.5,.5],[-.5,i/8-.5],[.5,i/8-.5]])edge.push(pt(x+u*width,z+v*depth));
    if(edge.every(p=>menoraLaneGap(p.x,p.z)>.2&&!MENORA_BUILDINGS.some(b=>inBox(p.x,p.z,b))&&menoraRiverClearance(p.x,p.z)>3&&!PAVED.some(q=>inBox(p.x,p.z,q))&&!MENORA_GARDENS.some(q=>inBox(p.x,p.z,q)))
      &&(!heightAt||Math.max(...edge.map(p=>heightAt(p.x,p.z)))-Math.min(...edge.map(p=>heightAt(p.x,p.z)))<.6))
      plan.courts.push(freeze({x,z,width,depth}));}
  // Kerbs along both edges of every lane inside the walls, and of the Sacred and Temple Ways outside them, broken at
  // crossings, squares, bridges, gates and water.
  for(const seg of SEGMENTS){const {a,b,path}=seg,len=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/len,dz=(b.z-a.z)/len,off=path.width/2+.14;
    const outside=['menora-sacred-way','menora-temple-way'].includes(path.id);
    for(const side of [-1,1]){if(tick())yield;let run=[];
      const flush=()=>{if(run.length>1)plan.kerbs.push(freeze({a:run[0],b:run.at(-1),lane:path.id}));run=[];};
      for(let s=0;s<=len+1e-6;s+=.5){const x=a.x+dx*s+dz*side*off,z=a.z+dz*s-dx*side*off;
        const ok=(inMenora(x,z)||outside)&&menoraLaneGap(x,z,seg)>.08&&!menoraBridgeAt(x,z,3)&&menoraRiverClearance(x,z)>4
          &&!(inMenora(x,z)&&MENORA_GATES.some(g=>Math.hypot(x-g.x,z-g.z)<6.5))&&wallGap(x,z)>2.8&&!PAVED.some(q=>inBox(x,z,q,.3))
          &&!plan.courts.some(q=>inBox(x,z,q,.2))&&!MENORA_BUILDINGS.some(q=>inBox(x,z,q,.3));
        if(ok)run.push(pt(x,z));else flush();}
      flush();}}
  for(const seg of SEGMENTS.filter(s=>['menora-sacred-way','menora-temple-way'].includes(s.path.id))){const {a,b,path}=seg,len=Math.hypot(b.x-a.x,b.z-a.z);let run=[];
    const flush=()=>{if(run.length>2)plan.causeways.push(freeze({a:run[0],b:run.at(-1),width:path.width,lane:path.id}));run=[];};
    for(let s=0;s<=len+1e-6;s+=.5){const x=a.x+(b.x-a.x)*s/len,z=a.z+(b.z-a.z)*s/len;
      if(!inMenora(x,z)&&!menoraBridgeAt(x,z,3)&&wallGap(x,z)>2.8)run.push(pt(x,z));else flush();}
    flush();}
  return plan;
}

// A one-sided face turned toward `n`, in the builder's current frame.
function face(b,tint,p,n) {
  const u=[0,1,2].map(k=>p[1][k]-p[0][k]),v=[0,1,2].map(k=>p[2][k]-p[0][k]);
  const c=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(c[0]*n[0]+c[1]*n[1]+c[2]*n[2]<0)p=[...p].reverse();
  if(p.length===3)b.triangle(tint,...p);else b.quad(tint,...p);
}
/** A window drawn flat on a wall in the city's own manner (menora-scenery.js): stone surround, dark reveal, pale glass and
 * an ivory mullion, facing the frame's +z. */
function flatWindow(b,x,y,z,yaw,w=1.2,h=2.1) {
  const pane=(tint,pw,ph,lift)=>face(b,tint,[[-pw/2,-ph/2,lift],[pw/2,-ph/2,lift],[pw/2,ph/2,lift],[-pw/2,ph/2,lift]],[0,0,1]);
  b.frame(x,y,z,yaw,()=>{pane(SHADE,w+.36,h+.36,0);pane(DARK,w,h,.015);pane(GLASSPANE,w*.64,h*.82,.03);pane(IVORY,.09,h,.045);});
}
function lamp(b,x,y,z,s=1) { // a lantern's glass, cap and floor, standing on (x, y, z)
  b.box(IRON,x,y+.03*s,z,.3*s,.06*s,.3*s);b.box(GLASS,x,y+.24*s,z,.26*s,.36*s,.26*s);b.cone(IRON,x,y+.42*s,z,.24*s,.26*s,0,4);
}

export function* createMenoraPolishSteps({root,heightAt,ground,push,metrics,colliders=[]}) {
  let work=0;const tick=()=>++work%8===0;
  const polish={buttresses:0,corbels:0,slits:0,bartizans:0,banners:0,torches:0,houses:0,dormers:0,shutters:0,chimneys:0,windows:0,
    lanterns:0,poles:0,props:0,trees:0,hedges:0,courts:0,kerbs:0,colliders:0,batches:0,vertices:0};
  metrics.polish=polish;
  const finish=function* (b){metrics.vertices+=b.vertexCount;polish.vertices+=b.vertexCount;if((yield* b.finishSteps(root))){metrics.batches++;polish.batches++;}};
  const solid=c=>{push({...c,id:`menora-polish-${c.id}`});polish.colliders++;};
  // The city's own walls are kept by the rules themselves; everything else already standing is avoided.
  const near=colliders.filter(c=>c.kind!=='city-wall'&&c.x>-2540&&c.x<-2120&&c.z>-45&&c.z<320);
  const plan=yield* planMenoraPolishSteps({obstacles:near,heightAt:ground});

  // The curtain: a corbelled walk along the inner face at 15.3 m with its parapet lip, the buttresses below it, slits
  // in the outer face, gate banners and torches, and a bartizan on the corner the river keeps turret-free.
  const walls=createSceneryBuilder('Minora polish — wall walk');
  for(const E of EDGES) { if(tick())yield;
    const step=E.len/E.steps,at=s=>pt(E.a.x+E.dir.x*s,E.a.z+E.dir.z*s),o=E.o;
    const heights=Array.from({length:E.steps},(_,i)=>{const p=at((i+.5)*step);return heightAt(p.x,p.z);});
    const trims=[[0,turreted(E.a)?3:0],[E.len-(turreted(E.c)?3:0),E.len],...(E.gate?[[E.gate.along-10,E.gate.along+10]]:[])];
    const runs=[];
    for(let i=0;i<E.steps;i++){let s0=i*step,s1=s0+step;
      for(const [t0,t1] of trims){if(t0<=s0&&t1>=s1){s0=s1;break;}if(t0<=s0&&t1>s0)s0=t1;if(t1>=s1&&t0<s1)s1=t0;}
      if(s1-s0<.3)continue;const last=runs.at(-1);
      if(last&&Math.abs(last.y-heights[i])<.02&&Math.abs(last.s1-s0)<.01)last.s1=s1;else runs.push({s0,s1,y:heights[i]});}
    walls.frame(E.a.x,0,E.a.z,E.yaw,()=>{
      const ix=v=>-o*v;
      for(const {s0,s1,y} of runs){const mid=(s0+s1)/2,len=s1-s0;
        walls.box(IVORY,ix(2.9),y+15.47,mid,2.2,.34,len);walls.block(WHITE,ix(3.86),y+15.64,mid,.28,.72,len);
        walls.box(SHADE,ix(2.9),y+15.27,mid,2.08,.08,len);
        for(let s=Math.ceil((s0-step/2)/step)*step+step/2;s<s1-.4;s+=step){if(s<s0+.4)continue;
          const P=(u,yy,v)=>[ix(1.8+u),y+yy,s+v];
          face(walls,WHITE,[P(0,15.25,-.35),P(1.6,15.25,-.35),P(0,13.9,-.35)],[0,0,-1]);
          face(walls,WHITE,[P(0,15.25,.35),P(1.6,15.25,.35),P(0,13.9,.35)],[0,0,1]);
          face(walls,WHITE,[P(0,13.9,-.35),P(0,13.9,.35),P(1.6,15.25,.35),P(1.6,15.25,-.35)],[-o*1.4,-1.6,0]);polish.corbels++;}}
      // Arrow slits about every 9 m at 14 m, outside the gate towers and corner turrets.
      const n=Math.round(E.len/9);
      for(let k=0;k<n;k++){const s=(k+.5)*E.len/n;
        if(s<(turreted(E.a)?6.5:3)||s>E.len-(turreted(E.c)?6.5:3)||(E.gate&&Math.abs(s-E.gate.along)<16))continue;
        const y=heights[Math.min(E.steps-1,Math.floor(s/step))],X=o*1.815,X2=o*1.83;
        face(walls,IVORY,[[X,y+13,s-.34],[X,y+13,s+.34],[X,y+15.2,s+.34],[X,y+15.2,s-.34]],[o,0,0]);
        face(walls,DARK,[[X2,y+13.25,s-.1],[X2,y+13.25,s+.1],[X2,y+14.95,s+.1],[X2,y+14.95,s-.1]],[o,0,0]);
        face(walls,DARK,[[X2,y+14.02,s-.3],[X2,y+14.02,s+.3],[X2,y+14.18,s+.3],[X2,y+14.18,s-.3]],[o,0,0]);polish.slits++;}
    });
  }
  for(const p of plan.buttresses) { if(tick())yield;
    const E=EDGES[p.edge],w=pt(E.a.x+E.dir.x*p.along,E.a.z+E.dir.z*p.along),y=Math.max(heightAt(p.x,p.z),heightAt(w.x-E.out.x*1.9,w.z-E.out.z*1.9)),o=E.o;
    const foot=Math.min(lowest(heightAt,p.x,p.z,1),heightAt(w.x-E.out.x*1.9,w.z-E.out.z*1.9))-y;
    walls.frame(w.x,y,w.z,E.yaw,()=>{
      const P=(u,yy,v)=>[-o*(1.8+u),yy,v];
      walls.block(SHADE,-o*2.75,foot-.45,0,1.9,.95-foot,2.1);
      face(walls,WHITE,[P(1.6,.5,-.85),P(1.6,.5,.85),P(.35,13.2,.85),P(.35,13.2,-.85)],[-o*12.7,1.25,0]);
      for(const v of [-.85,.85])face(walls,WHITE,[P(0,.5,v),P(1.6,.5,v),P(.35,13.2,v),P(0,13.2,v)],[0,0,v]),face(walls,WHITE,[P(0,13.2,v),P(.35,13.2,v),P(0,13.85,v)],[0,0,v]);
      face(walls,IVORY,[P(.35,13.2,-.85),P(.35,13.2,.85),P(0,13.85,.85),P(0,13.85,-.85)],[-o*.65,.35,0]);
    });
    solid({x:p.x,z:p.z,r:p.r,minY:y-.5,maxY:y+14,kind:'city-wall',id:`buttress-${p.edge}-${Math.round(p.along)}`});polish.buttresses++;
  }
  for(const p of plan.bartizans) { if(tick())yield;
    const A=EDGES[(p.corner+EDGES.length-1)%EDGES.length],B=EDGES[p.corner],c=MENORA_OUTLINE[p.corner];
    const top=Math.max(heightAt(c.x-A.dir.x*1.5,c.z-A.dir.z*1.5),heightAt(c.x+B.dir.x*1.5,c.z+B.dir.z*1.5))+18,r=2.05,face0=Math.atan2(p.x-c.x,p.z-c.z);
    walls.cylinder(WHITE,p.x,top-1.4,p.z,r,4);walls.cylinder(SHADE,p.x,top-1.75,p.z,r+.18,.4);walls.cylinder(IVORY,p.x,top+2.5,p.z,r+.25,.35);
    for(let i=0;i<6;i++){const t=face0+i*TAU/6;walls.block(WHITE,p.x+Math.sin(t)*r,top+2.8,p.z+Math.cos(t)*r,.7,1.1,.7,t);}
    walls.cone(SLATE,p.x,top+2.85,p.z,r*.82,3.4);walls.cone(GOLD,p.x,top+6.2,p.z,.18,.9,0,4);
    for(let i=0;i<6;i++){const t0=i*TAU/6,t1=(i+1)*TAU/6,ring=t=>[p.x+Math.sin(t)*r,top-1.55,p.z+Math.cos(t)*r];
      face(walls,SHADE,[ring(t0),ring(t1),[p.x,top-4.4,p.z]],[Math.sin(t0+TAU/12),-.6,Math.cos(t0+TAU/12)]);}
    for(const t of [face0-.6,face0+.6])walls.frame(p.x,top,p.z,t,()=>{face(walls,DARK,[[-.12,.1,r+.03],[.12,.1,r+.03],[.12,1.7,r+.03],[-.12,1.7,r+.03]],[0,0,1]);});
    polish.bartizans++;
  }
  for(const g of MENORA_GATES) { if(tick())yield;
    const E=EDGES[g.edge],o=E.o,y=heightAt(g.x,g.z);
    // Two hanging banners on each face of the gatehouse above the passage, red with a gold lozenge.
    walls.frame(g.x,y,g.z,E.yaw,()=>{for(const f of [-1,1])for(const v of [-4.2,4.2]){const X=f*o*2.69,X2=f*o*2.72,X3=f*o*2.75;
      face(walls,RED,[[X,20.4,v-.75],[X,20.4,v+.75],[X,15.9,v+.75],[X,15.9,v-.75]],[f*o,0,0]);
      face(walls,RED,[[X,15.9,v-.75],[X,15.9,v+.75],[X,15.2,v]],[f*o,0,0]);
      face(walls,GOLD,[[X2,18.2,v-.42],[X2,17.78,v],[X2,18.2,v+.42],[X2,18.62,v]],[f*o,0,0]);
      walls.box(IRON,X3,20.5,v,.08,.08,1.85);polish.banners++;}});
    // Torches on the drums of the flanking towers, each side of the passage, inside and out.
    for(const side of [-1,1]){const tc=pt(g.x+E.dir.x*side*11,g.z+E.dir.z*side*11),ty=heightAt(tc.x,tc.z);
      for(const f of [-1,1]){let dx=f*E.out.x-side*E.dir.x*.8,dz=f*E.out.z-side*E.dir.z*.8;const l=Math.hypot(dx,dz);dx/=l;dz/=l;
        const px=tc.x+dx*5.22,pz=tc.z+dz*5.22,qx=px+dx*.45,qz=pz+dz*.45;
        walls.beam(IRON,[px,ty+3.3,pz],[qx,ty+3.3,qz],.07);walls.cylinder(WOOD,qx,ty+3.05,qz,.07,.55,0,4);
        walls.cone(GLASS,qx,ty+3.58,qz,.16,.42);walls.cone(GOLD,qx,ty+3.62,qz,.08,.55,0,4);polish.torches++;}}
  }
  (yield* finish(walls));

  // The houses: a second stack with pots, shutters, a ridge cap, dormers on the larger, a doorstep, a door lantern and
  // window boxes; plain windows on the backs and sides of every hall; and each named building's own furniture.
  const homes=createSceneryBuilder('Minora polish — houses');
  for(const [index,home] of MENORA_BUILDINGS.entries()) { if(tick())yield;
    const w=home.width,d=home.depth,h=home.height,y=heightAt(home.x,home.z),house=home.kind==='house';
    if(home.kind==='sorcerers-tower') {
      // A two-step stone plinth before the Guild's door, with a narrow brazier each side of it (no collider: the
      // forecourt's people stand close by).
      homes.frame(home.x,y,home.z,0,()=>{homes.block(SHADE,0,-.25,d/2+1.45,9.6,.4,2.9);homes.block(IVORY,0,-.2,d/2+.85,8.4,.5,1.7);
        for(const sx of [-1,1]){const x=sx*3.95,z=d/2+.9;homes.cylinder(SHADE,x,.3,z,.26,.95,0,4);homes.cylinder(IRON,x,1.25,z,.38,.32);
          homes.cone(GLASS,x,1.5,z,.3,.55);homes.cone(GOLD,x,1.52,z,.16,.75,0,4);polish.props++;}});
      continue;
    }
    if(home.kind==='temple')continue;
    const rise=Math.min(5,w*.3),floors=h>9?[3.2,7.3]:[3.2],front=[];
    for(const yy of floors)for(let x=-w/2+2;x<w/2-1;x+=3.4)if(Math.abs(x)>1.8||yy>5)front.push([x,yy]);
    const shutter=SHUTTERS[index%SHUTTERS.length],row0=[[-1.12,1.12],...front.filter(([,yy])=>yy<5).map(([x])=>[x-.8,x+.8])];
    homes.frame(home.x,y,home.z,0,()=>{
      homes.block(SHADE,0,-.15,d/2+.45,2.6,.33,.9);
      homes.box(DARK,0,h+rise+.03,0,.3,.18,d+1.25);
      for(const sx of [-.28,.28])homes.cylinder(CLAY,-w*.29+sx,h+2.92,-d*.2,.14,.5,0,4);
      if(house){
        homes.block(SHADE,0,h+rise-1.4,d*.28,1.1,2.9,1.25);homes.box(IVORY,0,h+rise+1.55,d*.28,1.45,.2,1.6);
        for(const sx of [-.28,.28])homes.cylinder(CLAY,sx,h+rise+1.65,d*.28,.14,.5,0,4);polish.chimneys++;
        for(const [k,[x,yy]] of front.entries()){
          for(const sx of [-1,1]){const px=x+sx*1.03;if(Math.abs(px)+.24>w/2-.55||(yy<5&&Math.abs(px)-.24<1.2))continue;
            homes.box(shutter,px,yy,d/2+.09,.48,2,.1);polish.shutters++;if(yy<5)row0.push([px-.24,px+.24]);}
          if((k+index)%(h>9?2:3)===0&&(yy>5||h<=9)){const by=yy-1.36;homes.box(WOOD,x,by,d/2+.3,1.3,.26,.36);
            homes.rock(LEAVES[3],x,by+.2,d/2+.32,.6,.2,.18);homes.rock(FLOWERS[(k+index)%2],x+.22,by+.3,d/2+.36,.32,.16,.14);}
        }
        const halfW=(w+1.1)/2,xo=halfW*.5,yr=h+rise*(1-xo/halfW),body=Math.min(1.75,rise*.38);
        const dormers=w>=12&&w*d>=180?[[1,-d*.15],[-1,d*.18]]:w>=12&&w*d>=140?[[1,0]]:[];
        for(const [s,zc] of dormers){homes.block('#d4d7c6',s*(xo-.75),yr-.35,zc,1.5,body+.35,1.6);
          homes.roof(home.roof,s*(xo-.6),yr+body,zc,1.9,1.8,rise*.17,Math.PI/2,WHITE);
          face(homes,SHADE,[[s*(xo+.02),yr+.1,zc-.5],[s*(xo+.02),yr+.1,zc+.5],[s*(xo+.02),yr+body-.15,zc+.5],[s*(xo+.02),yr+body-.15,zc-.5]],[s,0,0]);
          face(homes,DARK,[[s*(xo+.04),yr+.25,zc-.32],[s*(xo+.04),yr+.25,zc+.32],[s*(xo+.04),yr+body-.3,zc+.32],[s*(xo+.04),yr+body-.3,zc-.32]],[s,0,0]);polish.dormers++;}
      }
      // A wall lantern beside the door, where the ground floor leaves room for it.
      if(home.kind!=='guild'){const lx=[1.6,-1.6,1.45,-1.45].find(x=>row0.every(([a,c])=>x+.2<a||x-.2>c));
        if(lx!==undefined){homes.beam(IRON,[lx,3.1,d/2],[lx,3.1,d/2+.5],.06);lamp(homes,lx,2.55,d/2+.5);polish.lanterns++;}}
      // Plain windows on the backs and sides, a row to each floor.
      if(home.kind!=='guild')for(const yy of floors){
        for(let x=-w/2+2.2;x<w/2-1.5;x+=3.6){flatWindow(homes,x,yy,-d/2-.02,Math.PI);polish.windows++;}
        for(let z=-d/2+2.2;z<d/2-1.5;z+=3.6)for(const s of [-1,1]){flatWindow(homes,s*(w/2+.02),yy,z,s*Math.PI/2);polish.windows++;}}
      if(home.kind==='guild'){
        // The Library: a frieze below the eaves on three faces with its square metopes, pilasters between the window
        // bays and along both sides, windows between them, and lamps on the two pilasters by the door.
        homes.box(IVORY,0,h-1.35,d/2+.07,w+.14,1.1,.14);for(const s of [-1,1])homes.box(IVORY,s*(w/2+.07),h-1.35,0,.14,1.1,d+.14);
        homes.box(SHADE,0,h-.72,d/2+.16,w+.5,.16,.32);for(const s of [-1,1])homes.box(SHADE,s*(w/2+.16),h-.72,0,.32,.16,d+.5);
        for(let x=-w/2+.9;x<w/2-.5;x+=1.25)face(homes,SHADE,[[x-.24,h-1.6,d/2+.15],[x+.24,h-1.6,d/2+.15],[x+.24,h-1.1,d/2+.15],[x-.24,h-1.1,d/2+.15]],[0,0,1]);
        for(let z=-d/2+.9;z<d/2-.5;z+=1.25)for(const s of [-1,1])face(homes,SHADE,[[s*(w/2+.15),h-1.6,z-.24],[s*(w/2+.15),h-1.6,z+.24],[s*(w/2+.15),h-1.1,z+.24],[s*(w/2+.15),h-1.1,z-.24]],[s,0,0]);
        const xs=front.filter(([,yy])=>yy>5).map(([x])=>x),pil=(x,z,yaw)=>homes.frame(x,0,z,yaw,()=>{
          homes.block(IVORY,0,.4,.13,.62,h-2.3,.26);homes.box(SHADE,0,.55,.16,.85,.3,.32);homes.box(IVORY,0,h-2,.17,.85,.22,.34);});
        for(let i=1;i<xs.length;i++)pil((xs[i-1]+xs[i])/2,d/2,0);
        const zs=[];for(let z=-d/2+2.6;z<d/2-1.5;z+=4.4)zs.push(z);
        for(const s of [-1,1]){for(const z of zs)pil(s*w/2,z,s*Math.PI/2);
          for(let i=1;i<zs.length;i++)for(const yy of floors){flatWindow(homes,s*(w/2+.02),yy,(zs[i-1]+zs[i])/2,s*Math.PI/2);polish.windows++;}}
        const near=xs.map((x,i)=>i?(xs[i-1]+x)/2:null).filter(x=>x!==null).sort((a,b)=>Math.abs(a)-Math.abs(b)).slice(0,2);
        for(const x of near){homes.beam(IRON,[x,3.1,d/2+.26],[x,3.1,d/2+.66],.06);lamp(homes,x,2.55,d/2+.66);polish.lanterns++;}
      }
      if(home.id==='menora-storehouse'){
        // A loading door in the gable over the main door, the hoist beam above it with its rope and hook.
        homes.box(DARK,0,9.4,d/2+.6,2,2.3,.08);homes.box(WOOD,0,9.35,d/2+.66,1.7,2.1,.06);homes.box(TIMBER,0,8.15,d/2+.75,2.4,.16,.3);
        homes.beam(WOOD,[0,h+rise-1.4,d/2+.2],[0,h+rise-1.4,d/2+2.3],.26);homes.beam(STRAW,[0,h+rise-1.53,d/2+2.1],[0,10.2,d/2+2.1],.04);
        homes.box(IRON,0,10.1,d/2+2.1,.12,.22,.12);homes.cylinder(IRON,0,h+rise-1.62,d/2+2.1,.14,.12);
      }
      if(home.id==='menora-west-barracks'){
        // A spear rack against the front beside the door.
        const z=d/2+1.05;for(const x of [1.55,3.45])homes.block(WOOD,x,0,z,.12,1.65,.12);
        for(const yy of [.4,1.45])homes.box(WOOD,2.5,yy,z,2.05,.09,.1);
        for(let i=0;i<6;i++){const x=1.75+i*.3;homes.beam(WOOD,[x,.02,z+.24],[x,2.5,z-.08],.05);homes.cone(IRON,x,2.48,z-.08,.06,.26,0,4);}
        polish.props++;
      }
    });
    if(home.id==='menora-storehouse'){
      // Crates and barrels stacked off the storehouse's west end, clear of Hapi's way round it.
      const x=home.x-w/2-1.7,z=home.z-.5;
      for(const [dz,dy] of [[-2.3,0],[-1.2,0],[-1.75,1]])homes.box(TIMBER,x,y+dy+.5,z+dz,1,1,1),homes.box(WOOD,x,y+dy+.5,z+dz,1.04,.12,1.04);
      for(const dz of [.4,1.4]){homes.cylinder(WOOD,x,y,z+dz,.42,1.05);for(const yy of [.2,.8])homes.cylinder(IRON,x,y+yy,z+dz,.44,.07);}
      homes.rock(STRAW,x,y+.35,z+2.2,.45,.35,.4);
      solid({x,z:z-.05,hx:.62,hz:2.75,minY:y-.5,maxY:y+2.1,kind:'prop',id:'storehouse-crates'});polish.props++;
    }
    if(home.id==='menora-west-barracks')solid({x:home.x+2.5,z:home.z+d/2+1.05,hx:1.1,hz:.32,minY:y-.5,maxY:y+2.6,kind:'prop',id:'barracks-spear-rack'});
    polish.houses++;
  }
  // The drill yard's practice post and its red-banded marker stone.
  { const y=heightAt(-2413,110.6);homes.cylinder(WOOD,-2413,y,110.6,.13,1.8,0,4);homes.beam(WOOD,[-2413.45,y+1.35,110.6],[-2412.55,y+1.35,110.6],.09);
    homes.rock(STRAW,-2413,y+1.05,110.6,.26,.42,.26);const my=heightAt(-2428.6,110.4);homes.block(SHADE,-2428.6,my-.1,110.4,.45,1,.45);
    homes.box(RED,-2428.6,my+.62,110.4,.48,.16,.48);homes.cone(SHADE,-2428.6,my+.9,110.4,.33,.25,Math.PI/4,4);polish.props+=2; }
  (yield* finish(homes));

  // Registered ornamental trees, hedges and the small paved courts.
  const green=createSceneryBuilder('Minora polish — trees and hedges');
  for(const c of plan.courts) { if(tick())yield;
    (yield* green.patchSteps(COURT,ground,c.x,c.z,c.width,c.depth,0,.05,Math.max(2,Math.min(6,Math.ceil(Math.max(c.width,c.depth)/6)))));polish.courts++;
  }
  const planted=createMinoraTrees({root,trees:plan.trees,ground,push,colliders});
  polish.trees+=planted.trees;polish.colliders+=planted.trees;
  for(const m of [metrics,polish]){m.batches+=planted.batches;m.vertices+=planted.vertices;}
  for(const [i,h] of plan.hedges.entries()) { if(i%8===7)yield;
    const y=ground(h.x,h.z);green.rock(LEAVES[(i>>2)%2?3:2],h.x,y+.4,h.z,.85,.48,.55,h.yaw+(i%3)*.08);polish.hedges++;
  }
  (yield* finish(green));

  // Street furniture: kerbs, lamp posts, banner poles, the gates' milestones and tubs, the well, carts and wood stacks.
  const street=createSceneryBuilder('Minora polish — street furniture');
  for(const k of plan.kerbs) { if(tick())yield;
    // Long straight pieces on level ground, shorter ones where the ground falls away outside the walls.
    const len=Math.hypot(k.b.x-k.a.x,k.b.z-k.a.z),n=Math.max(1,Math.ceil(len/24));let pieces=[];
    for(let i=0;i<n;i++)pieces.push([i/n,(i+1)/n]);
    pieces=pieces.flatMap(([t0,t1])=>{const p=t=>[k.a.x+(k.b.x-k.a.x)*t,k.a.z+(k.b.z-k.a.z)*t],h=t=>ground(...p(t));
      let flat=true;for(let q=1;q<8;q++){const t=t0+(t1-t0)*q/8;if(Math.abs(h(t)-(h(t0)+(h(t1)-h(t0))*q/8))>.06)flat=false;}
      if(flat)return [[t0,t1]];const m=Math.max(1,Math.ceil((t1-t0)*len/2));return Array.from({length:m},(_,j)=>[t0+(t1-t0)*j/m,t0+(t1-t0)*(j+1)/m]);});
    for(const [t0,t1] of pieces){const x0=k.a.x+(k.b.x-k.a.x)*t0,z0=k.a.z+(k.b.z-k.a.z)*t0,x1=k.a.x+(k.b.x-k.a.x)*t1,z1=k.a.z+(k.b.z-k.a.z)*t1;
      street.beam(SHADE,[x0,ground(x0,z0)+.07,z0],[x1,ground(x1,z1)+.07,z1],.26,.26);polish.kerbs++;}
  }
  // Outside the walls the terrain shows through the thin paving: a raised course between the kerbs, easing down at its ends.
  for(const r of plan.causeways) { if(tick())yield;
    const len=Math.hypot(r.b.x-r.a.x,r.b.z-r.a.z),dx=(r.b.x-r.a.x)/len,dz=(r.b.z-r.a.z)/len,n=Math.max(1,Math.ceil(len/2)),half=r.width/2;
    const at=(t,u)=>{const s=t*len,x=r.a.x+dx*s+dz*u,z=r.a.z+dz*s-dx*u,lift=.05+.13*Math.min(1,s/2.5,(len-s)/2.5);return [x,ground(x,z)+lift,z];};
    for(let i=0;i<n;i++)for(const [u0,u1] of [[-half,0],[0,half]])face(street,PAVING,[at(i/n,u0),at(i/n,u1),at((i+1)/n,u1),at((i+1)/n,u0)],[0,1,0]);
  }
  for(const l of plan.lanterns) { if(tick())yield;
    const y=ground(l.x,l.z);street.cylinder(IRON,l.x,y-.1,l.z,.17,.45,0,4);street.cylinder(IRON,l.x,y,l.z,.065,3.05,0,4);lamp(street,l.x,y+3.02,l.z,1.2);polish.lanterns++;
  }
  for(const p of plan.banners) { if(tick())yield;
    // A tall pole with a gold finial and a long swallow-tailed pennant, red with a gold band, streaming along the wall.
    const y=ground(p.x,p.z),top=y+6.6;street.cylinder(WOOD,p.x,y-.1,p.z,.09,6.8,0,4);street.cone(GOLD,p.x,top+.05,p.z,.12,.45,0,4);
    street.frame(p.x,0,p.z,p.yaw,()=>{const root=[0,top-1.3,.06],notch=[0,top-.75,1.7],tip=[0,top-1.3,2.2];
      street.sheet(RED,[0,top-.2,.06],[0,top-.2,2.2],notch,root);street.triangle(RED,root,notch,tip);street.triangle(RED,root,tip,notch);
      for(const s of [-1,1])face(street,GOLD,[[s*.012,top-.52,.1],[s*.012,top-.52,1.25],[s*.012,top-.68,1.25],[s*.012,top-.68,.1]],[s,0,0]);});
    polish.poles++;
  }
  for(const p of plan.props) { if(tick())yield;
    const y=Math.min(ground(p.x,p.z),lowest(ground,p.x,p.z,p.r*.8)+.08);
    street.frame(p.x,y,p.z,p.yaw,()=>{
      if(p.kind==='tub'){street.cylinder(SHADE,0,0,0,.45,.55);street.rock(LEAVES[0],0,.62,0,.45,.3,.45);
        street.rock(FLOWERS[0],-.15,.78,.1,.2,.16,.2);street.rock(FLOWERS[1],.18,.76,-.08,.2,.16,.2);}
      else if(p.kind==='milestone'){street.block(SHADE,0,-.1,0,.55,.95,.36);street.rock(SHADE,0,.85,0,.28,.16,.18);
        face(street,DARK,[[-.16,.45,.19],[.16,.45,.19],[.16,.6,.19],[-.16,.6,.19]],[0,0,1]);}
      else if(p.kind==='well'){street.cylinder(SHADE,0,-.1,0,1.05,.95);street.cylinder(WATER,0,.8,0,.82,.06);street.cylinder(IVORY,0,.82,0,1.12,.12);
        for(const s of [-1,1])street.block(WOOD,s*.9,.8,0,.14,1.5,.14);street.box(WOOD,0,2.15,0,2,.12,.12);street.roof(SLATE,0,2.25,0,1.4,2.4,.55,Math.PI/2,WOOD);
        street.beam(STRAW,[0,2.1,0],[0,1.45,0],.03);street.cylinder(WOOD,0,1.15,0,.16,.3,0,4);}
      else if(p.kind==='cart'){street.box(WOOD,0,.75,0,1.3,.12,2.1);for(const s of [-1,1])street.box(TIMBER,s*.62,.95,0,.08,.36,2.1),street.box(TIMBER,0,.95,s*1.02,1.2,.36,.08);
        for(const s of [-1,1]){street.box(WOOD,s*.75,.5,-.15,.1,.9,.9);street.box(WOOD,s*.75,.5,-.15,.1,.9,.9,0,Math.PI/4);}
        street.box(IRON,0,.5,-.15,1.5,.1,.1);for(const s of [-1,1])street.beam(WOOD,[s*.45,.75,1.05],[s*.4,.12,2.3],.08);
        street.rock(STRAW,-.25,1.15,-.3,.5,.4,.55,p.yaw);street.rock('#d8c27a',.28,1.1,.45,.45,.36,.5);}
      else if(p.kind==='woodstack'){for(const [x,z,hh] of [[-1.3,-.6,2.1],[1.3,-.6,2.1],[-1.3,.6,1.7],[1.3,.6,1.7]])street.block(WOOD,x,0,z,.14,hh,.14);
        street.sheet(SLATE,[-1.55,2.15,-.85],[1.55,2.15,-.85],[1.55,1.72,.9],[-1.55,1.72,.9]);street.block(TIMBER,0,0,-.1,2.4,1.25,.95);
        for(let r=0;r<2;r++)for(let c=0;c<5;c++)face(street,'#a88f70',[[-1.05+c*.47,.15+r*.55,.38],[-.67+c*.47,.15+r*.55,.38],[-.67+c*.47,.6+r*.55,.38],[-1.05+c*.47,.6+r*.55,.38]],[0,0,1]);}
    });
    if(p.collider)solid({x:p.x,z:p.z,r:p.r,minY:y-.5,maxY:y+(p.kind==='well'?2.8:2.2),kind:'prop',id:`${p.kind}-${Math.round(p.x)}-${Math.round(p.z)}`});
    polish.props++;
  }
  (yield* finish(street));
}
