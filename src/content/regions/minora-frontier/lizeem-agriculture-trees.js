import {hexOwnerAt} from '../../../world/terrain/region-world.js';
import {agricultureBuiltLand} from '../../../world/scenery/agriculture-land-use.js';
import {LIZEEM,ISAREOS_RIVER,ISAREOS_BECKS,NETH,NETHEREUM_OUTLET,NETHEREUM_STREAMS,CARICA,OVETH_UPPER,ELA_SOUTH_REACH,NESDOR_BECK,LIZEEM_REACH,WEST_RIVERS,westPoolAt,courseDistance} from '../western-regions/west-regions.js';
import {WEST_PROFILES,courseBetween,westWaterSurface,braidDistance} from '../western-regions/west-ground.js';
import {NETHEREUM_FARMS,NETHEREUM_BUILDINGS,NETHEREUM_LANES,NETHEREUM_FARM_VIEW} from '../nethereum/nethereum-agriculture.js';
import {OVESOS_FARMS,OVESOS_AGRICULTURE_BUILDINGS,OVESOS_AGRICULTURE_LANES,OVESOS_FARM_VIEW} from '../oves/ovesos-agriculture.js';
import {NESDOR_FARMS,NESDOR_AGRICULTURE_BUILDINGS,NESDOR_AGRICULTURE_LANES,NESDOR_FARM_VIEW} from '../nesdor/nesdor-agriculture.js';
import {ISAREOS_FARMS,ISAREOS_RURAL_BUILDINGS,ISAREOS_AGRICULTURE_LANES,ISAREOS_FARM_VIEW} from './isareos-agriculture.js';
import {CARICAS_FARMS,CARICAS_AGRICULTURE_BUILDINGS,CARICAS_AGRICULTURE_LANES,CARICAS_FARM_VIEW,CARICAS_MARKET} from './caricas-agriculture.js';
import {lizeemAgricultureReserved} from './lizeem-agriculture-reservations.js';
import {MINORA_HARBOR} from './minora-harbor.js';
import {LIZEEM_BATTLEFIELDS} from '../../scenarios/lizeem-battlefields.js';
import {LIZEEM_COLUMN_ASSEMBLY,LIZEEM_ISA_WAY,LIZEEM_WESTERN_WAY,LIZEEM_EASTERN_WAY} from '../../scenarios/lizeem-column-corridors.js';

// Authored planting at the compressed world scale. These records affect the
// visible landscape only; field acreage, production and housing are untouched.
// All candidates keep independent seeds, so rejecting one never shifts others.
const rand=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const names={isareos:'Isareos',nethereum:'Nethereum',caricas:'Caricas',ovesos:'Ovesos',nesdor:'Nesdor'};
const courses={
  isareos:[LIZEEM,ISAREOS_RIVER,...ISAREOS_BECKS],
  nethereum:[LIZEEM,ISAREOS_RIVER,NETH,NETHEREUM_OUTLET,...NETHEREUM_STREAMS],
  caricas:[LIZEEM,CARICA],ovesos:[LIZEEM,NETH,OVETH_UPPER],
  nesdor:[LIZEEM,CARICA,ELA_SOUTH_REACH,NESDOR_BECK,LIZEEM_REACH],
};
export const LIZEEM_TREE_LAND_USES={
  isareos:{farms:ISAREOS_FARMS,buildings:ISAREOS_RURAL_BUILDINGS,lanes:ISAREOS_AGRICULTURE_LANES,box:ISAREOS_FARM_VIEW},
  nethereum:{farms:NETHEREUM_FARMS,buildings:NETHEREUM_BUILDINGS,lanes:NETHEREUM_LANES,box:NETHEREUM_FARM_VIEW,town:{market:[-2218,387,51,19]}},
  caricas:{farms:CARICAS_FARMS,buildings:CARICAS_AGRICULTURE_BUILDINGS,lanes:CARICAS_AGRICULTURE_LANES,box:CARICAS_FARM_VIEW,town:CARICAS_MARKET},
  ovesos:{farms:OVESOS_FARMS,buildings:OVESOS_AGRICULTURE_BUILDINGS,lanes:OVESOS_AGRICULTURE_LANES,box:OVESOS_FARM_VIEW,town:{market:[-1910,602,43,22]}},
  nesdor:{farms:NESDOR_FARMS,buildings:NESDOR_AGRICULTURE_BUILDINGS,lanes:NESDOR_AGRICULTURE_LANES,box:NESDOR_FARM_VIEW,town:{market:[-1578,850,40,21]}},
};
const landUses=Object.values(LIZEEM_TREE_LAND_USES),fields=landUses.flatMap(l=>l.farms.flatMap(f=>f.fields));
const laneSegments=landUses.flatMap(l=>l.lanes.flatMap(lane=>lane.slice(1).map((b,i)=>[lane[i],b])));
const armySegments=[LIZEEM_ISA_WAY,LIZEEM_WESTERN_WAY,LIZEEM_EASTERN_WAY].flatMap(path=>path.slice(1).map((b,i)=>[[path[i].x,path[i].z],[b.x,b.z]]));
const segmentDistance=(x,z,[[ax,az],[bx,bz]])=>{
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-ax-t*dx,z-az-t*dz);
};
const rectangleGap=(x,z,p)=>Math.hypot(Math.max(0,Math.abs(x-p.x)-p.width/2),Math.max(0,Math.abs(z-p.z)-p.depth/2));
export const LIZEEM_TREE_BATTLE_CLEARANCE=84;

/** Full circular crown footprint, shared by every new rural tree. Checking all
 * five layouts also protects a neighbour's quay road or field at a border. */
export function lizeemTreeSiteClear(tree,{layout,heightAt,waterAt=()=>-Infinity,reserved=()=>false}={}){
  const {x,z,crownRadius:r,region}=tree,own=LIZEEM_TREE_LAND_USES[region];
  if(!own||![x,z,r].every(Number.isFinite)||r<=0||hexOwnerAt(x,z)!==names[region])return false;
  const b=own.box;if(x-r<b.x||x+r>b.x+b.width||z-r<b.z||z+r>b.z+b.depth)return false;
  if(lizeemAgricultureReserved(x,z,r+1)||reserved(x,z,r+1)||layout?.reserved?.(x,z,r+1))return false;
  const h=MINORA_HARBOR,hr=h.ramp;
  if(rectangleGap(x,z,{x:h.x,z:h.z,width:h.width,depth:h.length})<r+4||
    rectangleGap(x,z,{x:hr.x,z:(hr.start+hr.end)/2,width:hr.width,depth:hr.end-hr.start})<r+3)return false;
  if(fields.some(f=>rectangleGap(x,z,f)<r+1.25)||landUses.some(l=>agricultureBuiltLand(l,x,z,r+1)))return false;
  if(laneSegments.some(s=>segmentDistance(x,z,s)<r+3.6))return false;
  if(Object.values(LIZEEM_BATTLEFIELDS).some(p=>Math.hypot(x-p.x,z-p.z)<LIZEEM_TREE_BATTLE_CLEARANCE+r))return false;
  if(Object.values(LIZEEM_COLUMN_ASSEMBLY).some(p=>Math.hypot(x-p.x,z-p.z)<18+r)||armySegments.some(s=>segmentDistance(x,z,s)<r+7))return false;
  // Exact local river width keeps the canopy off open water and boat sweeps.
  // Test every nearby course, including tributaries beside a wider main river.
  // Braided side channels have their own water beyond the main course bank.
  // Reserve their widest half-width plus a bend/sample margin as well.
  if(westPoolAt(x,z,r+1.5)||braidDistance(x,z)<r+6)return false;
  for(const course of WEST_RIVERS){
    const d=courseDistance(course,x,z,course.maxHalf+r+2);
    if(d<course.maxHalf+r+2&&d<courseBetween(course,x,z).half+r+1.5)return false;
  }
  if(layout?.canPlant&&!layout.canPlant(x,z))return false;
  if(!heightAt)return true;
  const y=heightAt(x,z);if(!Number.isFinite(y)||y<1||y<=waterAt(x,z)+.1||westWaterSurface(x,z)!==null)return false;
  // Root footprint follows the rendered surface; avoid a tree balanced across
  // a bank cliff even when its centre happens to be dry.
  const heights=[y];
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4,px=x+Math.cos(a)*Math.min(r,1),pz=z+Math.sin(a)*Math.min(r,1),py=heightAt(px,pz);
    if(!Number.isFinite(py)||py<=waterAt(px,pz)+.1)return false;
    heights.push(py);
  }
  return Math.max(...heights)-Math.min(...heights)<1.8;
}

const riparian=['black-willow','black-alder','black-willow','sycamore','white-poplar','black-alder','black-poplar'];
const woodland=['white-oak','common-hazel','white-oak','black-walnut','hawthorn'];
function dimensions(species,seed,scale=1){
  const s=scale*(.82+rand(seed+71)*.32),tall=species.endsWith('poplar'),small=['apple','hawthorn','common-hazel'].includes(species);
  return {height:(tall?11:small?5.8:8.4)*s,crownRadius:(tall?2.5:small?2.1:3.35)*s,trunkRadius:(small?.19:.3)*s,rotation:rand(seed+91)*Math.PI*2};
}

/** Yielding placement keeps review/world construction responsive. Returned
 * descriptors are the sole input to drawing and species/location metadata. */
export function* lizeemAgricultureTreeSteps({layout,heightAt,waterAt,reserved}){
  const region=layout.region,trees=[],buckets=new Map();let work=0;
  const options={layout,heightAt,waterAt,reserved};
  const add=(x,z,species,habitat,seed,extra={},scale=1)=>{
    const tree={id:`lizeem-${region}-${habitat}-${x.toFixed(3)}-${z.toFixed(3)}`,region,habitat,x,z,species,harvestable:false,...dimensions(species,seed,scale),...extra};
    if(!lizeemTreeSiteClear(tree,options))return;
    const bx=Math.floor(x/12),bz=Math.floor(z/12),spacing=habitat==='woodland'?2.65:5.8;
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if((buckets.get(`${bx+dx},${bz+dz}`)??[]).some(t=>Math.hypot(x-t.x,z-t.z)<spacing))return;
    tree.y=heightAt(x,z);trees.push(tree);
    const key=`${bx},${bz}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(tree);
  };
  // Keep the authored woodland ellipses and original candidate coordinates.
  for(const [index,wild] of (layout.woodlands??(layout.wildland?[layout.wildland]:[])).entries())for(let i=0;i<(wild.count??125);i++){
    if(++work%64===0)yield 'woodland trees';
    if(i%(wild.treeEvery??6))continue;
    const seed=i+index*1709,angle=rand(seed)*Math.PI*2,r=Math.sqrt(rand(seed+450));
    const x=wild.x+Math.cos(angle)*wild.rx*r,z=wild.z+Math.sin(angle)*wild.rz*r;
    const species=woodland[Math.floor(rand(seed+813)*woodland.length)];
    add(x,z,species,'woodland',seed,{locationName:`${names[region]} woodland`},wild.treeScale??1);
  }
  // Farm-side fruit/shade trees and small, deliberately incomplete edge groups.
  for(const [fi,farm] of layout.farms.entries()){
    for(let i=0;i<3;i++)add(farm.home[0]+18+i*7,farm.home[1]-6-i*4,i===1?'black-walnut':'apple','farmyard',fi*103+i,{farmId:farm.id,locationName:farm.name},.85);
    for(const [pi,field] of farm.fields.entries()){
      const seed=10000+fi*997+pi*73,side=Math.floor(rand(seed)*4),along=rand(seed+1)*.6-.3;
      // At most two trees beside any field, leaving most of its perimeter open.
      for(let i=0;i<(rand(seed+2)<.32?2:1);i++){
        const species=['white-oak','black-walnut','hawthorn','apple'][Math.floor(rand(seed+i+3)*4)],d=dimensions(species,seed+i);
        const offset=d.crownRadius+2.5,spread=along+(i?.19:0);
        const x=field.x+(side<2?(side?1:-1)*(field.width/2+offset):spread*field.width);
        const z=field.z+(side>=2?(side===3?1:-1)*(field.depth/2+offset):spread*field.depth);
        add(x,z,species,'field-edge',seed+i,{farmId:farm.id,fieldId:field.id,locationName:`${farm.name} field edge`});
      }
      if(++work%64===0)yield 'field-edge trees';
    }
  }
  // Walk each actual river, stagger both banks, and leave irregular sunny gaps.
  for(const [ci,course] of courses[region].entries()){
    const samples=WEST_PROFILES.get(course.id);
    for(let i=0;i<samples.length;i+=2){
      const p=samples[i];
      for(const side of [-1,1]){
        const seed=30000+ci*2111+i*13+(side+1)*97;
        if(rand(seed)<.28)continue;
        const species=riparian[Math.floor(rand(seed+1)*riparian.length)],d=dimensions(species,seed);
        const offset=p.half+d.crownRadius+2+rand(seed+2)*8,along=(rand(seed+3)-.5)*7;
        const x=p.x+p.nx*offset*side-p.nz*along,z=p.z+p.nz*offset*side+p.nx*along;
        add(x,z,species,'riparian',seed,{riverId:course.id,locationName:`${course.name} bank`});
      }
      if(++work%64===0)yield 'riverbank trees';
    }
  }
  return trees;
}

export function planLizeemAgricultureTrees(options){const steps=lizeemAgricultureTreeSteps(options);let next;do{next=steps.next();}while(!next.done);return next.value;}
