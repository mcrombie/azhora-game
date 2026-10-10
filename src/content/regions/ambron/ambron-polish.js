import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {planAmbronPolishSteps} from './ambron-polish-layout.js';
import {ambronLantern} from './ambron-living-detail.js';
import {AMBRON_STALLS,ambronPoint} from './ambron.js';
import {stoneDrum} from './ambron-architecture.js';

const PALE='#d9d5bf',STONE='#b3b8a5',BLUE='#547c80',BRONZE='#ad8c55',IRON='#46585a',WOOD='#66503d';
const LEAVES=['#466854','#557856','#607e55','#4b735e'];

function plantedTub(b,p){
  const {x,y,z,variant}=p;
  stoneDrum(b,x,y-.12,z,1.2,.72,STONE,8);
  stoneDrum(b,x,y+.54,z,1.28,.19,PALE,8);
  stoneDrum(b,x,y+.7,z,1.06,.05,'#716448',8);
  b.cylinder(WOOD,x,y+.72,z,.16,2.4);
  if(variant===0){
    b.cone('#3c6250',x,y+1.4,z,1.0,5.2);
    b.cone('#4c7155',x,y+2.7,z,.78,4.3);
  }else{
    b.beam(WOOD,[x,y+2.2,z],[x+.8,y+3.6,z-.4],.12);
    b.rock(LEAVES[variant],x,y+3.8,z,1.65,1.5,1.6,variant);
    b.rock(LEAVES[(variant+1)%4],x+.7,y+4.7,z-.4,1.15,1.0,1.1,variant+1);
    if(variant===2)for(let k=0;k<3;k++){
      const angle=k*2.1;
      b.rock('#bc9da1',x+Math.cos(angle)*1.3,y+4.15,z+Math.sin(angle)*1.3,.48,.35,.48);
    }
  }
  for(let k=0;k<6;k++){
    const a=k*Math.PI/3,px=x+Math.sin(a)*.77,pz=z+Math.cos(a)*.77;
    b.rock('#5f7b53',px,y+.87,pz,.35,.25,.35);
    b.rock(k%2?'#d5ba78':'#b584a1',px,y+1.08,pz,.12,.14,.12);
  }
}

function fountain(b,p){
  const {x,y,z}=p;
  stoneDrum(b,x,y-.1,z,2.65,.25,PALE,16);
  stoneDrum(b,x,y+.15,z,2.35,.7,STONE,16);
  stoneDrum(b,x,y+.84,z,2.43,.2,PALE,16);
  stoneDrum(b,x,y+1.05,z,2.15,.035,'#64989a',16);
  stoneDrum(b,x,y+1,z,.48,1.55,PALE,8);
  stoneDrum(b,x,y+2.3,z,.9,.4,BRONZE,12,1.3);
  stoneDrum(b,x,y+2.71,z,1.22,.025,'#73aaaa',12);
  b.cylinder(PALE,x,y+2.7,z,.22,1.3);b.rock(BRONZE,x,y+4,z,.4,.35,.4);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,dx=Math.sin(a),dz=Math.cos(a);
    b.beam('#95c3bf',[x+dx*1.05,y+2.66,z+dz*1.05],[x+dx*1.55,y+1.1,z+dz*1.55],.035);
  }
}

export function* createAmbronPolishSteps({parent,heightAt,colliders}){
  const plan=yield* planAmbronPolishSteps({heightAt,colliders});
  const b=createSceneryBuilder('Ambron / planted streets and civic furniture');
  const metrics={trees:plan.trees.length,lamps:plan.lamps.length,benches:plan.benches.length,fountains:plan.fountains.length,kerbs:plan.kerbs.length,vertices:0};
  const solid=(p,kind,r,height)=>colliders.push({x:p.x,z:p.z,r,minY:p.y-.2,maxY:p.y+height,kind:`ambron-${kind}`});
  for(const [i,p] of plan.trees.entries()){
    if(i%8===0)yield;plantedTub(b,p);solid(p,'ornamental-planter',1.3,2);
  }
  for(const [i,p] of plan.lamps.entries()){
    if(i%12===0)yield;
    b.cylinder(STONE,p.x,p.y,p.z,.22,.35);
    b.cylinder(IRON,p.x,p.y+.3,p.z,.075,3.5);
    ambronLantern(b,p.x,p.y+3.75,p.z,1);
    if(p.variant===0)b.frame(p.x,p.y,p.z,p.yaw,()=>{
      b.beam(BRONZE,[0,3.2,0],[.95,3.2,0],.065);
      b.sheet(BLUE,[.2,3.2,0],[.9,3.2,0],[.9,1.65,0],[.2,1.8,0]);
      b.block(BRONZE,.55,2.2,.025,.13,.65,.035);
    });
    solid(p,'street-lamp',.23,4.9);
  }
  for(const p of plan.benches){
    b.frame(p.x,p.y,p.z,p.yaw,()=>{
      for(const side of [-1,1])b.block(STONE,side*.85,0,0,.3,.55,.65);
      for(const z of [-.23,0,.23])b.box(WOOD,0,.61,z,2.15,.14,.19);
      for(const side of [-1,1])b.block(BRONZE,side*.92,.5,-.3,.08,.65,.08);
      b.box(WOOD,0,1.02,-.3,2.15,.26,.08);
    });solid(p,'bench',1.1,1.25);
  }
  for(const p of plan.fountains){
    // Inlaid paving follows the ground, with a water-wheel pattern around each basin.
    const at=(angle,r)=>{
      const x=p.x+Math.sin(angle)*r,z=p.z+Math.cos(angle)*r;
      return [x,heightAt(x,z)+.14,z];
    };
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,c=(i+1)*Math.PI/8;
      b.quad(i%2?PALE:BLUE,at(a,2.7),at(a,3.85),at(c,3.85),at(c,2.7));
      b.quad(BRONZE,at(a,3.85),at(a,3.97),at(c,3.97),at(c,3.85));
    }
    fountain(b,p);solid(p,'fountain',2.65,4.4);
  }
  for(const [i,k] of plan.kerbs.entries()){
    if(i%35===0)yield;
    b.beam(i%4?PALE:STONE,[k.a.x,k.a.y+.045,k.a.z],[k.b.x,k.b.y+.045,k.b.z],.22,.12);
  }
  // Striped fabric, hanging scales and stocked baskets enrich existing stalls;
  // all solid additions remain inside their already blocked footprints.
  for(const [index,stall] of AMBRON_STALLS.entries()){
    const p=ambronPoint(stall.a,stall.b),y=heightAt(p.x,p.z);
    b.frame(p.x,y,p.z,0,()=>{
      for(let i=0;i<6;i++){
        const x=-1.6+i*.54;
        b.sheet(i%2?'#cfbd94':index%2?BLUE:'#975b4b',[x,2.29,-1.22],[x+.5,2.29,-1.22],[x+.5,2.75,0],[x,2.75,0]);
        b.sheet(i%2?'#cfbd94':index%2?BLUE:'#975b4b',[x,2.75,0],[x+.5,2.75,0],[x+.5,2.29,1.22],[x,2.29,1.22]);
      }
      for(const side of [-1,1]){
        stoneDrum(b,side*.85,.04,0,.3,.6,'#9f8257',8,.38);
        for(let k=0;k<3;k++)b.rock('#b7ab62',side*.85+Math.cos(k*2.1)*.17,.67,Math.sin(k*2.1)*.17,.14,.12,.14);
      }
      b.beam(BRONZE,[.55,2.65,0],[.55,2.02,0],.04);
      b.beam(BRONZE,[.25,2.02,0],[.85,2.02,0],.04);
    });
  }
  metrics.vertices=b.vertexCount;yield* b.finishSteps(parent);
  return metrics;
}
