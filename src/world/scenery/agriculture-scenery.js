import {createSceneryBuilder} from './scenery-builder.js';
import {groundPatch} from './ground-face.js';
import {groundRibbon} from './ground-ribbon.js';
import {agricultureField} from './agriculture-fields.js';
import {agricultureHouse,agricultureMarketStall} from './agriculture-buildings.js';
import {createAgricultureLivestock} from '../life/agriculture-livestock.js';
import {createAgricultureCrops} from './agriculture-crops.js';
import {agricultureBuiltLand} from './agriculture-land-use.js';
import {createSpeciesTreesSteps} from './species-trees.js';

const palette={timber:0x594533};
const rand=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function agricultureLaneDistance(lanes,x,z){
  let best=Infinity;
  for(const lane of lanes)for(let i=1;i<lane.length;i++){
    const [ax,az]=lane[i-1],[bx,bz]=lane[i],dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    best=Math.min(best,Math.hypot(x-ax-t*dx,z-az-t*dz));
  }
  return best;
}
function cart(b,h,x,z,colliders){
  const y=h(x,z);b.block(0x8d6c42,x,y+.75,z,2,.25,3);
  for(const side of [-1,1]){
    b.box(0x9d7c4e,x+side,y+1.35,z,.15,1,3);
    for(const dz of [-1,1])b.rock(0x4e4538,x+side*1.15,y+.6,z+dz,.18,.64,.64);
  }
  b.beam(0x80633f,[x-.6,y+.8,z-1.5],[x-.6,y+.5,z-4],.14);
  b.beam(0x80633f,[x+.6,y+.8,z-1.5],[x+.6,y+.5,z-4],.14);
  colliders.push({x,z,hx:1.33,hz:1.5,minY:y,maxY:y+1.85,kind:'cart'});
  for(const side of [-1,1])colliders.push({x:x+side*.6,z:z-2.75,hx:.1,hz:1.25,minY:y,maxY:y+.9,kind:'cart'});
}
export function* createAgricultureSteps({parent,heightAt,surface=null,colliders=[],layout,waterAt=()=>-Infinity,onFarmBuilt=null,reserved=()=>false}){
  const {farms,buildings:lots,lanes,town,wildland}=layout;
  const farmReserved=(x,z,r=0)=>reserved(x,z,r)||!!layout.reserved?.(x,z,r);
  const farmLaneDistance=(x,z)=>agricultureLaneDistance(lanes,x,z);
  const clearAt=(x,z,r=0)=>!farmReserved(x,z,r+.35)&&!agricultureBuiltLand(layout,x,z,r+.35)&&farmLaneDistance(x,z)>2.2+r+.35;
  const pastures=[];
  const fieldAt=(x,z)=>farms.some(f=>f.fields.some(p=>Math.abs(x-p.x)<=p.width/2&&Math.abs(z-p.z)<=p.depth/2));
  let vertices=0;const finish=b=>{vertices+=b.vertexCount;return b.finish(parent);};
  for(const [farmIndex,farm] of farms.entries()){
    const b=createSceneryBuilder(farm.name);
    // Opt-in economic presentation: crops can change without rebuilding homes,
    // hedges, livestock, collisions or the farm's authored productive capacity.
    const fields=onFarmBuilt?createSceneryBuilder(farm.name+' / fields'):b;
    const plants=createAgricultureCrops(farm.name+' / crops');
    for(const [index,f] of farm.fields.entries()){
      yield* agricultureField({fields,plants,surface,heightAt,field:f,index:index+farmIndex,clearAt});
      // Low grassy banks and hedges with open corners, never perimeter walls.
      for(let x=f.x-f.width/2+3;x<f.x+f.width/2-3;x+=3.5){
        const z=f.z-f.depth/2;if(!clearAt(x,z,2.3))continue;
        if(rand(x+index*11)<.16)continue;
        const size=.8+rand(x+f.z)*.35;
        b.rock(index%2?0x647848:0x73874e,x,heightAt(x,z)+.3,z,1.7*size,.65*size,.8);
        b.rock(0x899761,x+.55,heightAt(x,z)+.5,z-.1,.95*size,.46,.68);
      }
      if(f.crop==='pasture'){
        const positions=[];
        for(let i=0;i<6;i++){
          const x=f.x+(rand(i+index*19)-.5)*(f.width-6),z=f.z+(rand(i+150+index*19)-.5)*(f.depth-6);
          positions.push({x,z,seed:i+index*19+farmIndex*113});
        }
        pastures.push({id:layout.region+'-'+f.id,field:f,positions});
        for(let z=f.z-f.depth/2+3;z<f.z+f.depth/2-5;z+=4){
          const x=f.x+f.width/2,y=heightAt(x,z);if(!clearAt(x,z+2,2.2))continue;
          b.block(palette.timber,x,y,z,.16,1.1,.16);
          for(const rise of [.5,.94])b.beam(0x8c7954,[x,y+rise,z],[x,heightAt(x,z+4)+rise,z+4],.13);
          colliders.push({x,z:z+2,hx:.1,hz:2.1,minY:Math.min(y,heightAt(x,z+4)),maxY:Math.max(y,heightAt(x,z+4))+1.1,kind:'fence'});
        }
      }
    }
    const [x,z]=farm.home;
    yield* groundPatch(b,surface,0xa89973,heightAt,x,z,24,12,0,.065,7);
    // Leave the cart lane through the yard clear, including the cart shafts.
    cart(b,heightAt,x+3,z-8,colliders);
    for(let i=0;i<4;i++){
      const sx=x-4+i*.8,sy=heightAt(sx,z+2);
      b.cylinder(i%2?0x99815b:0xad9369,sx,sy,z+2,.43,1.04);
      for(const rise of [.17,.8])b.cylinder(0x645f50,sx,sy+rise,z+2,.45,.07);
      b.cylinder(0xb39c72,sx,sy+1.04,z+2,.4,.03);
    }
    const wy=heightAt(x-3,z-5);b.cylinder(0x807d6b,x-3,wy,z-5,1.1,.65);b.cylinder(0x394b48,x-3,wy+.65,z-5,.75,.03);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      b.box(i%2?0xa8a28a:0xbab098,x-3+Math.sin(angle)*.9,wy+.64,z-5+Math.cos(angle)*.9,.68,.2,.34,angle);
    }
    colliders.push({x:x-3,z:z-5,r:1.1,minY:wy,maxY:wy+.7,kind:'well'});
    finish(b);
    const cropMesh=finish(plants);
    if(onFarmBuilt)onFarmBuilt({farm,fields:finish(fields),plants:cropMesh});
    yield farm.id;
  }
  const buildings=createSceneryBuilder(town?`Farmsteads and ${town.name}`:'Farmsteads');
  for(const p of lots){
    agricultureHouse(buildings,heightAt,p,{region:layout.region});const y=heightAt(p.x,p.z);
    colliders.push({x:p.x,z:p.z,hx:p.w/2+.25,hz:p.d/2+.25,minY:y-.22,maxY:y+p.h+Math.min(p.w*.42,3.6),kind:'building'});
  }
  // Small town: an open market, grain weighing yard and low riverside store.
  if(town){
    const [x,z,w,d]=town.market;
    yield* groundPatch(buildings,surface,0x9e967f,heightAt,x,z,w,d,0,.07,12);
    yield* groundPatch(buildings,surface,0xb9ad8e,heightAt,x,z,w-.8,d-.8,0,.08,12);
    // A few broad paving courses give the market a worked surface. All follow
    // the rendered terrain and keep the same unobstructed market footprint.
    for(let row=1;row<Math.floor(d/3);row++)yield* groundPatch(buildings,surface,0xaa9f84,heightAt,x,z-d/2+row*3,w-.8,.1,0,.09,3);
  }
  for(const [index,[x,z]] of (town?.stalls??[]).entries()){
    const y=heightAt(x,z);agricultureMarketStall(buildings,heightAt,x,z,{region:layout.region,index});
    colliders.push({x,z,hx:2,hz:1.2,minY:y,maxY:y+2.8,kind:'market-stall'});
  }
  for(const [x,z] of town?.carts??[])cart(buildings,heightAt,x,z,colliders);finish(buildings);yield 'town';
  const paths=createSceneryBuilder('Cart lanes');
  for(const lane of lanes)yield* groundRibbon(paths,lane.map(([x,z])=>({x,z})),4.4,0xb3a581,heightAt,surface,.095);
  finish(paths);yield 'lanes';
  const scrub=createSceneryBuilder('Meadow and woodland');
  for(const [index,wild] of (layout.woodlands??(wildland?[wildland]:[])).entries())for(let i=0;i<(wild.count??125);i++){
    const seed=i+index*1709,angle=rand(seed)*Math.PI*2,r=Math.sqrt(rand(seed+450));
    const x=wild.x+Math.cos(angle)*wild.rx*r,z=wild.z+Math.sin(angle)*wild.rz*r,y=heightAt(x,z);
    if(y<1||y<waterAt(x,z)||fieldAt(x,z)||farmReserved(x,z,4))continue;
    if(layout.canPlant&&!layout.canPlant(x,z))continue;
    const clear=wild.clearance??0;
    if(clear&&(farmLaneDistance(x,z)<clear+2.2||
      farms.some(f=>Math.hypot(x-f.home[0],z-f.home[1])<22||f.fields.some(p=>Math.abs(x-p.x)<p.width/2+clear&&Math.abs(z-p.z)<p.depth/2+clear))||
      lots.some(p=>Math.abs(x-p.x)<p.w/2+clear&&Math.abs(z-p.z)<p.d/2+clear)))continue;
    if(i%(wild.treeEvery??6)!==0)scrub.rock(i%3?0x798653:0x878967,x,y+.3,z,1.2+rand(i+15),.7,1.4);
    if(i%64===0)yield 'woodland';
  }
  finish(scrub);yield 'wildland';
  const trees=layout.treeSteps?yield* layout.treeSteps({layout,heightAt,waterAt,reserved:farmReserved}):[];
  const treeView=yield* createSpeciesTreesSteps({parent,colliders,trees,heightAt,name:`${layout.region??'Agriculture'} / identified trees`});
  vertices+=treeView.vertices;
  const woodlandTrees=trees.filter(t=>t.habitat==='woodland').length;
  const livestock=createAgricultureLivestock({parent,heightAt,waterAt,colliders,pastures,clearAt});
  return {farms:farms.length,fields:farms.reduce((n,f)=>n+f.fields.length,0),buildings:lots.length,woodlandTrees,trees:trees.length,treeBatches:treeView.batches,treeHabitats:Object.fromEntries(['woodland','farmyard','field-edge','riparian'].map(h=>[h,trees.filter(t=>t.habitat===h).length])),vertices,livestock};
}
