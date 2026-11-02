import {planWarTravel} from './war-travel.js';
import {YUNETHRE_RAID_ROUTE} from '../../content/regions/minora-frontier/yunethre-world.js';
import {MENORA_GATES} from '../../content/regions/minora-frontier/menora-city.js';
import {CHAPTER_LOCATIONS as places} from '../../content/chapters/yunethre/locations.js';
import {CANERD} from '../../content/regions/canerd/canerd-world.js';
import {TOWER_EXIT} from '../../app/exploration/tower-state.js';
import {ISAREOS_HAMLET,ISAREOS_HAMLET_PATHS} from '../../content/regions/minora-frontier/isareos-hamlet.js';
import {colliderOverlapsHeight} from '../../world/collision/walk-surfaces.js';

const p=(x,z)=>({x,z}),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const gate=MENORA_GATES.find(g=>g.id==='menora-west-gate');
// Real streets and the existing grass passage. The small search on each leg
// routes around local props; these anchors keep it out of courtyards and tents.
const junction=p(-2800.0019279391277,-326.41016151377545);
const westTrack=p(-2896.0019279391277,-304.41016151377545);
const townEast=p(-2971.0019279391277,-317.41016151377545);
const townApproach=p(places.town.x,places.town.z+2),campApproach=p(places.centaurs.x,places.centaurs.z+2);
const passage=[...YUNETHRE_RAID_ROUTE].reverse();
const passageEnd=passage.findIndex(n=>n.x===-2796&&n.z===-252);
const NETWORK=[
  [TOWER_EXIT,p(-2414,70),p(-2404,70),p(-2404,148),gate,p(-2470,148),p(-2470,105),
    ...ISAREOS_HAMLET_PATHS[0].points,ISAREOS_HAMLET.arrival,p(-2660,5),
    ...passage.slice(0,passageEnd+1),junction,westTrack,townEast,townApproach],
  [junction,p(-2740.0019279391277,-322.41016151377545),p(-2710.0019279391277,-322.41016151377545),campApproach],
];

function projection(q,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.z-a.z)*dz)/(dx*dx+dz*dz||1)));return p(a.x+t*dx,a.z+t*dz);}
export function yunethreTravelAnchors(from,to){
  if(distance(to,places.celder)<20){
    const approach=p(CANERD.gate.x,CANERD.gate.z+3),court=p(CANERD.courtyard.x,CANERD.courtyard.z+5);
    return [...(from.z>CANERD.gate.z-2?[approach,court]:[]),to];
  }
  if(distance(from,to)<40)return [to];
  const nodes=[],adj=[],byKey=new Map(),segments=[];
  function node(q){const key=q.x.toFixed(3)+','+q.z.toFixed(3);if(byKey.has(key))return byKey.get(key);const id=nodes.length;nodes.push(p(q.x,q.z));adj.push([]);byKey.set(key,id);return id;}
  function connect(a,b){if(a===b)return;const cost=distance(nodes[a],nodes[b]);adj[a].push({id:b,cost});adj[b].push({id:a,cost});}
  for(const line of NETWORK)for(let i=1;i<line.length;i++){const a=node(line[i-1]),b=node(line[i]);connect(a,b);segments.push([a,b]);}
  function attach(q){
    let nearest=null;for(const [a,b] of segments){const at=projection(q,nodes[a],nodes[b]),d=distance(q,at);if(!nearest||d<nearest.d)nearest={a,b,at,d};}
    const id=node(nearest.at);connect(id,nearest.a);connect(id,nearest.b);return {...nearest,id};
  }
  const a=attach(from),b=attach(to);
  // A far-off exploratory resume should use local navigation, not detour to
  // an unrelated street just because it exists in this chapter's itinerary.
  if(a.d>250||b.d>80)return [to];
  if(a.a===b.a&&a.b===b.b)connect(a.id,b.id);
  const costs=new Map([[a.id,0]]),previous=new Map(),pending=new Set([a.id]);
  while(pending.size){
    const id=[...pending].sort((x,y)=>costs.get(x)-costs.get(y))[0];pending.delete(id);if(id===b.id)break;
    for(const edge of adj[id]){const cost=costs.get(id)+edge.cost;if(cost<(costs.get(edge.id)??Infinity)){costs.set(edge.id,cost);previous.set(edge.id,id);pending.add(edge.id);}}
  }
  const result=[nodes[b.id]];for(let at=b.id;previous.has(at);){at=previous.get(at);result.unshift(nodes[at]);}
  if(distance(result.at(-1),to)>.1)result.push(p(to.x,to.z));
  return result.filter((n,i)=>distance(i?result[i-1]:from,n)>.2);
}

// Returns the async `plan` callback expected by createYunethreAutoplay.
// Loading does not advance the assignment clock. The host controls that hold
// through setPlanning, and prepares only regions touched by this actual route.
export function createYunethreTravel({world,room,prepare=point=>world.prepare(point.x,point.z,point.y),setPlanning=()=>{}}){
  let epoch=0;
  return async function plan(from,to,{cancelled=()=>false}={}){
    const request=++epoch,isInside=!!room(),anchors=isInside?[to]:yunethreTravelAnchors(from,to);
    const abort=()=>request!==epoch||cancelled();
    if(abort())return null;setPlanning(true);
    try{
      const prepared=new Set(),rough=[from,...anchors];
      if(isInside){if(!world.readyAt(to.x,to.z))await prepare({...to,y:world.heightAt(from.x,from.z)});}
      else for(let i=1;i<rough.length;i++){
        const a=rough[i-1],b=rough[i],count=Math.max(1,Math.ceil(distance(a,b)/25));
        for(let k=0;k<=count;k++){
          if(abort())return null;
          const at=p(a.x+(b.x-a.x)*k/count,a.z+(b.z-a.z)*k/count),id=world.regionAt(at.x,at.z)?.id;
          if(prepared.has(id)||world.readyAt(at.x,at.z))continue;prepared.add(id);await prepare(at);
        }
      }
      if(abort())return null;
      const bounds=isInside?(world.state?.().bounds??world.bounds):world.bounds;
      const navigation={...world,bounds,
        // maxY:1000 in the shared search is useful outdoors, but would select
        // another storey of the Guild tower. Stay on the current walking floor.
        supportAt:(x,z,options)=>world.supportAt?.(x,z,{...options,maxY:world.heightAt(x,z),stepUp:.45}),
      };
      function clear(q){
        if(!world.canExploreAt(q.x,q.z)||!world.readyAt(q.x,q.z))return false;
        const y=world.heightAt(q.x,q.z),r=.84;if(y<world.waterAt(q.x,q.z)-.2)return false;
        return !world.nearColliders(q.x,q.z,r).some(c=>!['river-water','pond-water'].includes(c.kind)&&colliderOverlapsHeight(c,y)&&
          (c.r!==undefined?Math.hypot(q.x-c.x,q.z-c.z)<c.r+r:Math.abs(q.x-c.x)<c.hx+r&&Math.abs(q.z-c.z)<c.hz+r));
      }
      function safeAnchor(q,last){
        if(isInside||last||distance(q,gate)<.1||distance(q,CANERD.gate)<4||clear(q))return q;
        // Only intermediate open-country hints may move. Door/gate centres
        // and the destination that triggers a conversation remain exact.
        const y=world.heightAt(q.x,q.z);
        for(const radius of [1.5,3,4.5,6,8])for(let i=0;i<16;i++){
          const candidate=p(q.x+Math.cos(i*Math.PI/8)*radius,q.z+Math.sin(i*Math.PI/8)*radius);
          if(Math.abs(world.heightAt(candidate.x,candidate.z)-y)<2&&clear(candidate))return candidate;
        }
        return q;
      }
      const result=[];let at=from;
      for(let i=0;i<anchors.length;i++){
        const target=safeAnchor(anchors[i],i===anchors.length-1);
        if(abort())return null;
        const points=await planWarTravel(navigation,at,target,{radius:.48,spacing:isInside?1:2,cancelled:abort,maxNodes:45000,
          obstacles:(world.residentPeople?.()??[]).map(person=>({...person,r:.65}))});
        if(!points){if(abort())return null;throw Error(`No walkable route from ${Math.round(at.x)},${Math.round(at.z)} to ${Math.round(target.x)},${Math.round(target.z)}.`);}
        result.push(...points);at=target;
      }
      return result;
    }finally{if(request===epoch)setPlanning(false);}
  };
}
