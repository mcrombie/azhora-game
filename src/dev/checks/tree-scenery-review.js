import {prepareWarExterior} from './tower-smoke.js';
import {treeSpecies} from '../../world/life/tree-species.js';
import {WEST_PROFILES} from '../../content/regions/western-regions/west-ground.js';

const sessions=new WeakMap();
const assert=(value,message)=>{if(!value)throw Error(message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const press=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));

export async function prepareTreeSceneryReview(a){
  window.dispatchEvent(new Event('focus'));
  if(a.tower?.state().inside)await prepareWarExterior(a);
  a.war?.pause();a.step(0);
  const world=a.testWorld,registry=world.treeRegistry;
  assert(registry,'The active landscape exposes its real tree registry');
  const trees=registry.trees.filter(t=>treeSpecies(t.species)&&registry.standing(t.id)&&world.readyAt(t.x,t.z));
  const rural=trees.filter(t=>t.habitat),available=[...new Set(rural.map(t=>treeSpecies(t.species).id))];
  const preferred=['white-oak','silver-birch','sycamore','black-willow','black-poplar'];
  const species=[...new Set([...preferred.filter(s=>available.includes(s)),...available])].slice(0,5);
  assert(species.length===5,'Five botanical species are physically planted in the landscape');
  const shots=['riparian','main-lizeem',...species,'journal'];sessions.set(a,{trees,rural,world,registry});
  return {shots,trees:trees.length,ruralTrees:rural.length,species:available,
    habitats:Object.fromEntries([...new Set(rural.map(t=>t.habitat))].map(h=>[h,rural.filter(t=>t.habitat===h).length]))};
}

function riverNear(world,tree){
  for(let radius=6;radius<=54;radius+=4)for(let i=0;i<24;i++){
    const angle=i*Math.PI/12,x=tree.x+Math.sin(angle)*radius,z=tree.z+Math.cos(angle)*radius;
    if(world.readyAt(x,z)&&world.waterAt(x,z)>world.heightAt(x,z)+.15)return {x,z};
  }
  return null;
}

function approach(a,world,tree,angle,radius){
  const x=tree.x+Math.sin(angle)*radius,z=tree.z+Math.cos(angle)*radius,ground=a.groundProbe(x,z);
  return ground.ready&&ground.clear&&ground.water<ground.height-.1&&world.canExploreAt(x,z)
    ?{x,y:ground.height,z}:null;
}

export async function reviewTreeScenery(a,name){
  if(!sessions.has(a))await prepareTreeSceneryReview(a);
  window.dispatchEvent(new Event('focus'));
  if(name==='journal'){
    press('KeyJ');await frames();
    const state=a.birding.state();assert(state.open&&state.category==='trees'&&state.treeSpecies.length>=5,'The Nature journal retains all five observed species');
    window.dispatchEvent(new Event('blur'));await frames();
    return {name,observed:state.treeSpecies,render:a.renderStats()};
  }
  const {rural,world,registry}=sessions.get(a),mainRiver=name==='main-lizeem',isRiver=mainRiver||name==='riparian';
  const point=a.snapshot().position;
  const candidates=rural.filter(t=>mainRiver?t.habitat==='riparian'&&t.riverId==='lizeem'&&['nethereum','caricas'].includes(t.region):isRiver?t.habitat==='riparian':treeSpecies(t.species).id===name)
    .sort((x,y)=>Math.hypot(x.x-point.x,x.z-point.z)-Math.hypot(y.x-point.x,y.z-point.z)).slice(0,70);
  // Prefer open specimens where their own branch silhouette can be inspected.
  const crowds=new Map(candidates.map(t=>[t,rural.reduce((n,other)=>n+(other!==t&&Math.hypot(t.x-other.x,t.z-other.z)<Math.max(9,(t.crownRadius??3)*2)?1:0),0)]));
  candidates.sort((a,b)=>crowds.get(a)-crowds.get(b)||Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z));
  let chosen=null;
  for(const tree of candidates.slice(0,70)){
    const water=mainRiver?WEST_PROFILES.get('lizeem').reduce((best,p)=>Math.hypot(p.x-tree.x,p.z-tree.z)<Math.hypot(best.x-tree.x,best.z-tree.z)?p:best)
      :isRiver?riverNear(world,tree):null;
    if(isRiver&&(!water||world.waterAt(water.x,water.z)<=world.heightAt(water.x,water.z)+.15))continue;
    const preferred=water?Math.atan2(tree.x-water.x,tree.z-water.z):.7;
    for(let i=0;i<12;i++){
      const angle=preferred+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/6;
      const near=approach(a,world,tree,angle,(tree.radius??.4)+1.8);
      if(!near||world.treeTarget(near)?.id!==tree.id)continue;
      await a.visit(near);a.step(0);
      if(a.birding.state().target?.id!==tree.id)continue;
      chosen={tree,near,angle,water};break;
    }
    if(chosen)break;
  }
  assert(chosen,'A visible '+name+' specimen has a dry ordinary observation approach');
  const {tree,near,angle,water}=chosen,entry=treeSpecies(tree.species);
  press('KeyF');await frames();
  assert(a.birding.state().open&&a.birding.state().treeSpecies.includes(entry.id),'F identifies this drawn specimen');
  press('Escape');a.step(0);
  // Use the ordinary third-person camera. River views step back on the same
  // bank so the channel and gaps between the planted crowns remain in frame.
  const wide=isRiver?approach(a,world,tree,angle,(tree.crownRadius??3)+4):null;
  if(wide)await a.visit(wide);
  a.look({yaw:angle,pitch:isRiver?.45:.30,distance:Math.max(isRiver?28:18,(tree.height??10)*1.7)});
  for(let i=0;i<4;i++)a.step(.025);
  const started=performance.now();for(let i=0;i<80;i++)world.treeTarget(near);
  const targetMilliseconds=(performance.now()-started)/80;
  assert(registry.standing(tree.id),'The review leaves its specimen standing');
  assert(!a.state().frameErrors.length,'The specimen and its observation card render without errors');
  window.dispatchEvent(new Event('blur'));await frames();
  return {name,tree:{id:tree.id,species:entry.id,name:entry.name,height:tree.height,crownRadius:tree.crownRadius,
    region:tree.region,habitat:tree.habitat,riverId:tree.riverId,x:tree.x,y:tree.base?.y??tree.y,z:tree.z},
    observationPoint:near,position:a.snapshot().position,water:water?{x:water.x,z:water.z,half:water.half}:null,camera:a.state().cameraPosition,
    observed:a.birding.state().treeSpecies,targetMilliseconds,render:a.renderStats()};
}
