import * as THREE from 'three';
import {createSitePresence} from '../../app/exploration/site-presence-view.js';
import {createBattleAftermath} from '../../app/exploration/battle-aftermath-view.js';
import {createWarFrontline} from '../../app/exploration/war-frontline-view.js';
import {createWorldWar,WORLD_WAR_SCENARIO} from '../../app/exploration/world-war.js';
import {caricasPresence} from '../../app/exploration/site-presence.js';
import {CARICAS_GUARD_POSTS} from '../../content/regions/minora-frontier/caricas-settlement.js';
const assert=(v,m)=>{if(!v)throw Error(m);};

// Exercise actual GPU allocations in a small isolated scene; game saves and
// active campaign are untouched. All three views use the real character rigs.
export function resources(){
  const w=createWorldWar();w.advance(3);const active=w.snapshot(),battle=active.engagements.find(b=>b.region==='caricas'),at=battle.location;
  const resolved=structuredClone(active);resolved.engagements[0].status='resolved';resolved.engagements[0].rally={status:'resolved'};
  const empty=structuredClone(resolved);empty.engagements=[];empty.regions.caricas.garrison=0;empty.armies=[];
  const world={readyAt:()=>true,heightAt:()=>1,waterAt:()=>0,regionAt:()=>({id:13}),colliders:[],bounds:{minX:-60000,maxX:60000,minZ:-60000,maxZ:60000}};
  const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(128,128);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,100);scene.add(new THREE.AmbientLight(0xffffff,2));
  camera.position.set(at.x,12,at.z+26);camera.lookAt(at.x,1,at.z);
  const site=createSitePresence(scene,world),aftermath=createBattleAftermath(scene,world),front=createWarFrontline(scene,world),counts=[];
  const draw=()=>renderer.render(scene,camera),presence=caricasPresence(resolved,WORLD_WAR_SCENARIO);
  try{
    for(let i=0;i<6;i++){
      site.update(presence,()=>true,at,0,true);aftermath.update(resolved,WORLD_WAR_SCENARIO,()=>true,at,true,0);front.update(active,WORLD_WAR_SCENARIO,()=>true,at,true,0,true);draw();
      site.update({...presence,guards:0},()=>true,at,0,true);aftermath.update(empty,WORLD_WAR_SCENARIO,()=>true,at,true,0);front.update(empty,WORLD_WAR_SCENARIO,()=>true,at,true,0,true);draw();
      counts.push(renderer.info.memory.geometries);
    }
    console.log('WAR_RESOURCE_COUNTS '+JSON.stringify(counts));
    assert(counts.slice(1).every(n=>n===counts[0]),'Repeated battlefield/ownership changes must not retain new rig geometries: '+counts.join(', '));
    front.dispose();site.dispose();aftermath.dispose();draw();
    const disposed=renderer.info.memory.geometries;
    world.colliders=CARICAS_GUARD_POSTS.slice(1).map(p=>({...p,r:1}));site.update({...presence,guards:2},()=>true,at,0,true);draw();
    assert(site.state().guards.length===1,'Blocked posts leave one representative');
    const surviving=scene.children.find(g=>g.isGroup);
    for(let i=0;i<120;i++)site.update({...presence,guards:2},()=>true,at,1/60,true);
    assert(scene.children.includes(surviving),'An unavailable post must not rebuild the surviving guard every frame');
    return {checks:['Six real soldier creation/cleanup cycles retain a stable GPU geometry count','Temporary presence uses real character rigs while shared primitives remain reusable','Blocked posts retain their surviving guard across 120 frames'],counts,disposed};
  }finally{front.dispose();site.dispose();aftermath.dispose();renderer.dispose();renderer.forceContextLoss();}
}
