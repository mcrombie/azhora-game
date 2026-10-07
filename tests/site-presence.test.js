import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {caricasPresence} from '../src/app/exploration/site-presence.js';
import {sourceModule} from './module-loader.js';
const THREE=await import('../vendor/three.module.js');
const {createSitePresence}=await sourceModule('../src/app/exploration/site-presence-view.js');
const {createCaricasSettlement}=await sourceModule('../src/content/regions/minora-frontier/caricas-settlement-scenery.js');

function conquered(){const w=createWorldWar();w.advance(10);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.status==='active');w.campaign.joinBattle(b.id,b.location);w.campaign.resolveEncounter(b.id,'west','success');return w;}

test('presence follows regional resolution, recovery and replay without changing the simulation',()=>{
  const w=conquered(),project=()=>caricasPresence(w.snapshot(),WORLD_WAR_SCENARIO);
  assert.equal(project().owner,'east');assert.equal(project().guards,0);assert.match(project().status,/battle underway/);
  w.advance(2);const before=w.snapshot(),p=project();assert.equal(p.owner,'west');assert.equal(p.guards,2);assert.equal(p.strength,50);assert.match(p.status,/recovering from battle/);
  assert.deepEqual(w.snapshot(),before);assert.deepEqual(caricasPresence(createWorldWar(w.checkpoint()).snapshot(),WORLD_WAR_SCENARIO),p);
  w.advance(2);assert.doesNotMatch(project().status,/recovering/);
});

test('a held region keeps its faction and a depleted or empty garrison never invents guards',()=>{
  const w=createWorldWar();w.advance(12);const s=w.snapshot(),p=caricasPresence(s,WORLD_WAR_SCENARIO);
  assert.equal(p.owner,'east');assert.equal(p.strength,1);assert.equal(p.guards,1);
  s.regions.caricas.garrison=0;assert.equal(caricasPresence(s,WORLD_WAR_SCENARIO).guards,0);
});

test('world presence recolors only banner cloth, uses clear guard posts, handles fog and restores authored colors',()=>{
  const scene=new THREE.Group(),colliders=[],world={bounds:{minX:-3000,maxX:-1000,minZ:0,maxZ:1000},heightAt:()=>13.25,waterAt:()=>0,readyAt:()=>true,nearColliders:()=>colliders};
  world.caricasSettlement=createCaricasSettlement({parent:scene,heightAt:world.heightAt,colliders});
  world.caricasStandards=world.caricasSettlement.standards;
  const mesh=world.caricasSettlement.root.children.find(c=>c.name==='Caricas buildings and grain court'),original=mesh.geometry.attributes.color.array.slice(),positions=mesh.geometry.attributes.position.array.slice(),material=mesh.material;
  const view=createSitePresence(scene,world),position={x:-2092,y:13.25,z:231},state=conquered().advance(2),p=caricasPresence(state,WORLD_WAR_SCENARIO);
  assert(view.update(p,()=>true,position));const visible=view.state();assert.equal(visible.banner.color,p.color);assert.equal(visible.banner.count,3);assert.equal(visible.guards.length,2);assert(visible.guards.every(g=>g.clear&&g.position[1]===g.ground));
  let changed=0;for(let i=0;i<original.length;i++)if(original[i]!==mesh.geometry.attributes.color.array[i])changed++;
  assert.equal(changed,108,'Only 36 two-sided cloth vertices change RGB');assert.equal(mesh.material,material);assert.deepEqual(mesh.geometry.attributes.position.array,positions);
  const children=scene.children.length;for(let i=0;i<20;i++)view.update(p,()=>true,position,.04);assert.equal(scene.children.length,children);
  assert(!view.update(p,()=>false,position));assert.equal(view.state().guards.length,0);
  assert(!view.update(p,()=>true,{...position,x:-2600}));assert.equal(view.state().guards.length,0);
  assert(view.update(p,()=>true,position));assert.equal(view.state().guards.length,2);
  const east={...p,owner:'east',color:'#bf7969',guards:1};view.update(east,()=>true,position);assert.equal(view.state().banner.color,east.color);assert.equal(view.state().guards.length,1);
  view.dispose();assert.equal(scene.children.length,1);assert.deepEqual(mesh.geometry.attributes.color.array,original);
});

test('unloaded or obstructed terrain creates no misplaced guards',()=>{
  const scene=new THREE.Group(),world={bounds:{minX:-3000,maxX:-1000,minZ:0,maxZ:1000},heightAt:()=>2,waterAt:()=>0,readyAt:()=>false,nearColliders:()=>[]};
  const view=createSitePresence(scene,world),p=caricasPresence(createWorldWar().snapshot(),WORLD_WAR_SCENARIO),at={x:-2092,y:2,z:231};
  assert(!view.update(p,()=>true,at));assert.equal(scene.children.length,0);
  world.readyAt=()=>true;world.waterAt=()=>3;view.update(p,()=>true,at);assert.equal(scene.children.length,0);
  view.dispose();
});
