import {encounterSteering,encounterBodyGap} from './encounter-space.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=a=>a.hp>0&&!a.escaped;
const radius=a=>a.bodyRadius??.45;

// One small, connected search when a local approach is obstructed. No actor is
// moved by the planner, and failed searches have the same finite work limit.
export function encounterDetour(start,target,{canOccupy,canTraverse,maxNodes=160,step=1.5,reach=12}={}){
  if(!canOccupy||!canTraverse)return null;
  const r=radius(start);
  if(canOccupy(target,r)&&canTraverse(start,target,r))return [{x:target.x,z:target.z}];
  const queue=[{x:start.x,z:start.z,i:0,j:0,g:0,parent:null}],seen=new Map([['0,0',0]]);
  const directions=[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]];
  for(let expanded=0;queue.length&&expanded<maxNodes;expanded++){
    queue.sort((a,b)=>a.g+distance(a,target)-b.g-distance(b,target));
    const at=queue.shift();
    if(canOccupy(target,r)&&canTraverse(at,target,r)){
      const path=[{x:target.x,z:target.z}];
      for(let p=at;p.parent;p=p.parent)path.unshift({x:p.x,z:p.z});
      return path;
    }
    for(const [di,dj]of directions){
      const i=at.i+di,j=at.j+dj;if(Math.hypot(i,j)*step>reach)continue;
      const key=i+','+j,g=at.g+Math.hypot(di,dj)*step;if(g>=(seen.get(key)??Infinity))continue;
      const p={x:start.x+i*step,z:start.z+j*step,i,j,g,parent:at};
      if(!canOccupy(p,r)||!canTraverse(at,p,r))continue;
      seen.set(key,g);queue.push(p);
    }
  }
  return null;
}

// Shared reservations keep a shielded second rank out of the striking rank.
// Militia leave a looser interval; trained troops retain a tighter interval.
// These are positions only: weapon range, movement speed and attack timing are
// still supplied by the combat unit and encounter model.
export function createEngagementPositions({canOccupy=()=>true,canTraverse=()=>true}={}){
  const reservations=new Map();
  const point=(target,slot)=>({x:target.x+Math.sin(slot.angle)*slot.range,z:target.z+Math.cos(slot.angle)*slot.range});
  return function reserve(actor,target,team,bodies,time,{hero=null}={}){
    for(const [id,slot]of reservations)if(!bodies.some(b=>b.id===id&&alive(b)))reservations.delete(id);
    const spacing=actor.unitType==='militiaman'?1.65:1.4;
    const peers=team.filter(p=>p!==actor&&alive(p));
    const occupied=p=>peers.some(other=>{
      const slot=reservations.get(other.id);
      const at=slot?.targetId===target.id&&!slot.blocked?point(target,slot):other;
      return distance(p,at)<Math.max(spacing,encounterBodyGap(actor,other)+.15);
    });
    const old=reservations.get(actor.id);
    if(old?.targetId===target.id&&time<old.until&&distance(target,old.anchor)<.75){
      if(old.blocked)return {x:actor.x,z:actor.z,rank:1,blocked:true};
      const p=point(target,old);
      if(canOccupy(p,radius(actor)))return {...p,rank:old.rank};
    }
    const base=hero?Math.atan2(hero.x-target.x,hero.z-target.z):Math.atan2(actor.x-target.x,actor.z-target.z);
    const offsets=hero?[-1.15,1.15,-2.25,2.25,Math.PI]:[0,.55,-.55,1.1,-1.1,1.65,-1.65,2.2,-2.2,2.75,-2.75,Math.PI];
    const candidates=[],indirect=[];
    for(let rank=0;rank<3;rank++)for(const offset of offsets){
      const slot={targetId:target.id,anchor:{x:target.x,z:target.z},angle:base+offset,range:(actor.engage??1.85)+rank*2.2,rank,until:time+(rank?.8:1.1)};
      const p=point(target,slot);if(occupied(p)||hero&&distance(p,hero)<=2.2)continue;
      const stable=old?.targetId===target.id&&distance(p,point(target,old))<.5;
      candidates.push({slot,p,score:rank*12+distance(actor,p)-(stable?1.5:0)});
    }
    candidates.sort((a,b)=>a.score-b.score);
    let best=null;
    for(const c of candidates){
      if(!canOccupy(c.p,radius(actor))||!canTraverse(target,c.p,radius(actor)))continue;
      if(canTraverse(actor,c.p,radius(actor))){best=c;break;}
      if(indirect.length<2)indirect.push(c);
    }
    // Search at most two promising obstructed approaches, only when no direct
    // slot is available. The cached reservation avoids doing this every tick.
    best??=indirect.find(c=>encounterDetour(actor,c.p,{canOccupy,canTraverse,maxNodes:96}));
    if(best){reservations.set(actor.id,best.slot);return {...best.p,rank:best.slot.rank};}
    reservations.set(actor.id,{targetId:target.id,anchor:{x:target.x,z:target.z},blocked:true,until:time+.8});
    // The target is reachable only by a dogleg, or every useful slot is full.
    // Hold clear of its centre while navigation works toward a reachable side.
    return {x:actor.x,z:actor.z,rank:1,blocked:true};
  };
}

// Cache short detours between ticks; replan only after measurable lack of
// progress or a changed destination. Body steering remains local and never
// pushes, teleports, or accelerates a combatant.
export function createEncounterNavigation(options={}){
  const paths=new WeakMap();
  return function direction(actor,target,bodies,time,dt){
    if(!options.canTraverse||!options.canOccupy)return encounterSteering(actor,target,bodies,options);
    let nav=paths.get(actor);
    if(!nav){nav={nextCheck:0,stalled:0,at:{x:actor.x,z:actor.z},target:{...target},path:[]};paths.set(actor,nav);}
    nav.stalled=distance(actor,nav.at)<dt*.25?nav.stalled+dt:0;nav.at={x:actor.x,z:actor.z};
    if(distance(target,nav.target)>1.5){nav.path=[];nav.nextCheck=0;nav.target={...target};}
    if(time>=nav.nextCheck){
      nav.nextCheck=time+.8;
      if(nav.stalled>.4||!options.canTraverse(actor,target,radius(actor))){
        nav.path=encounterDetour(actor,target,options)??[];nav.stalled=0;
      }else nav.path=[];
    }
    while(nav.path.length&&distance(actor,nav.path[0])<.3)nav.path.shift();
    return encounterSteering(actor,nav.path[0]??target,bodies,options);
  };
}
