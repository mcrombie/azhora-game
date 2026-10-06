import {canStand,moveCharacter} from '../../gameplay/movement/game-state.js';
import {canWalkSlope} from '../../gameplay/movement/climbing.js';
import {WEST_OREMINDI_PATHS,SEVRON_ENTRANCES,WEST_OREMINDI_ARRIVAL} from '../../content/regions/west-oremindi/west-oremindi-world.js';
/** Runs against populated native terrain and the same portal/room controller used by F. */
export async function runSevronChecks({world,host,player,travel,frames=async()=>{},open=()=>{},state=()=>({}),saved=()=>null}){
 const checks=[],metrics={},check=(ok,message)=>{if(!ok)throw new Error(`West Oremindi: ${message}\n${JSON.stringify({checks,metrics})}`);checks.push(message);};
 const prior=saved();open();await frames(2);
 const target=SEVRON_ENTRANCES[0];travel({...target,z:target.z+3,y:world.heightAt(target.x,target.z+3)});await frames(2);
 check(world.regionAt(target.x,target.z).id===56,'The hidden mountain approach belongs to West Oremindi');
 check(world.westOremindi?.metrics?.trees>30,'The real region contains grounded woodland scenery');
 const path=WEST_OREMINDI_PATHS[0],points=path.points.slice(1),p={...points[0],y:world.heightAt(points[0].x,points[0].z)};let walked=0;
 for(const goal of points.slice(1)){
  const length=Math.hypot(goal.x-p.x,goal.z-p.z),n=Math.ceil(length/.18),dx=(goal.x-p.x)/n,dz=(goal.z-p.z)/n;
  for(let i=0;i<n;i++){if(!canWalkSlope(p.x,p.z,p.x+dx,p.z+dz,world)){metrics.blocked={p:{...p},goal,reason:'slope'};break;}const ox=p.x,oz=p.z;moveCharacter(p,dx,dz,world);p.y=world.heightAt(p.x,p.z);walked+=Math.hypot(p.x-ox,p.z-oz);}
  if(Math.hypot(goal.x-p.x,goal.z-p.z)>2){metrics.blocked??={p:{...p},goal,reason:'collision'};break;}
 }
 metrics.walked=walked;check(!metrics.blocked,'The complete southern expedition route passes real terrain slope and scenery collision');
 check(host.enter(),'A peaceful explorer enters the concealed galleries');await frames(2);
 check(host.active&&player.group.position.y===8,'Portal owns the dry eight-metre gallery floor below the mountain');
 const go=(x,z)=>{const to=host.walk.toWorld({x,z});host.move(player.group.position,to.x-player.group.position.x,to.z-player.group.position.z);check(Math.hypot(to.x-player.group.position.x,to.z-player.group.position.z)<.5,`The player walks to gallery ${x},${z}`);};
 go(0,28);go(30,28);go(30,-32);go(0,-32);go(0,-58);host.frame(.01);
 check(host.snapshot().cityDiscovered,'Entering the upper occupied court discovers Sevron');
 check(host.people.length===4&&host.people.every(p=>p.actor.group.visible),'Four anonymous elven residents inhabit the upper galleries');
 const before=host.snapshot();go(0,-32);go(30,-32);go(30,10);go(38,10);
 check(host.nearby()?.kind==='secret'&&host.interact(),'The mismatched masonry is reachable through ordinary gallery movement');
 host.frame(0);check(host.snapshot().secretOpen,'The inspection store opens persistently');
 go(45,10);go(56,10);check(host.nearby()?.kind==='treasure'&&host.interact()&&host.snapshot().treasureTaken,'The player can physically reach and recover the ancient coins');
 check(host.model.takeTreasure()===null,'Recovered coins cannot be rewarded again');
 check(host.restore(before),'Valid discovery data restores');check(!host.active,'Restore releases the underground floor safely');
 check(canStand(player.group.position.x,player.group.position.z,world),'Restoring from a room returns to clear mountain ground');
 metrics.regionTrees=world.westOremindi.metrics.trees;const current=state();metrics.state=Object.fromEntries(['region','phase','position','drawCalls','triangles','frameErrors','loadingMode'].map(k=>[k,current[k]]));
 if(prior!==null)check(JSON.stringify(saved())===JSON.stringify(prior),'The isolated expedition does not alter the normal saved adventure');
 return {ok:true,checks,metrics};
}
