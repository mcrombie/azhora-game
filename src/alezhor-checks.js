import * as THREE from 'three';
import { canStand } from './game-state.js';
import { TREE_KINDS, WOODCUTTING_SKILL, CHOP_REACH, SWING } from './woodcutting.js';
import { SKILLS } from './skills.js';
import { REGION_IDS } from './region-world.js';
import { ALEZHOR_ARRIVAL, westStream } from './alezhor-world.js';
import { ALEZHOR_WILDLIFE_ZONES } from './alezhor-wildlife.js';

const ALEZHOR_ID = REGION_IDS['Alezhor'];
// Exact subsegments of the ordinary production-controller journeys. Travel is
// allowed between these independent witnesses, never inside a walking segment.
export const ALEZHOR_NATIVE_ROUTES = Object.freeze([
  Object.freeze({label:'Arrival grassland to the coast trail',points:Object.freeze([
    ALEZHOR_ARRIVAL,Object.freeze({x:-4090,z:893})])}),
]);
export const ALEZHOR_NATIVE_TREE_DIGEST = '9727ac61';
export const ALEZHOR_NATIVE_LAYOUT_SHA = 'f54da8b1c0bdb753093ea4a6b0793c2334233f52e79c987e02c0c9f282bfa55a';
export const ALEZHOR_NATIVE_CANONICAL_LAYOUT_SHA = 'ddc039b3d3a214171163859fe8da2f28f3d947a2f7ebc37ec469ada624288bc8';
const HARBOR = Object.freeze({ x: 86, z: 1731 });
const homes = new Map(ALEZHOR_WILDLIFE_ZONES.flatMap(zone => zone.sites
  .map(([x,z],i) => [`${zone.id}-${i+1}`, { x,z }])));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const digest = text => { let value=2166136261; for(let i=0;i<text.length;i++) value=Math.imul(value^text.charCodeAt(i),16777619); return (value>>>0).toString(16).padStart(8,'0'); };

/** Euler (0,yaw,PI/2) has these four algebraic-zero linear coefficients.
 * Node/Electron differ by 3.3e-17 in three of them. Preserve every position,
 * nonzero coefficient and source matrix; this is comparison-only rounding. */
export function canonicalAlezhorDriftwood(values) {
  const result=values.slice();
  for(let i=0;i<result.length;i+=16){
    const scale=Math.max(1,...[0,1,2,4,5,6,8,9,10].map(k=>Math.abs(result[i+k])));
    const epsilon=8*Number.EPSILON*scale;
    for(const k of [0,2,5,9])if(Math.abs(result[i+k])<=epsilon)result[i+k]=0;
  }
  return result;
}

/** Same ordered UTF-8-name / full Float32 non-Y matrix / color bytes as the
 * composed Node golden. Per-batch facts make any native difference inspectable. */
export async function measureAlezhorNativeLayout(root) {
  const chunks=[],rows=[],encoder=new TextEncoder();let bytes=0,instances=0;
  const add=array=>{const value=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);chunks.push(value);const offset=bytes;bytes+=value.length;return {offset,bytes:value.length};};
  root.traverse(mesh=>{
    if(!mesh.isInstancedMesh)return;
    const name=add(encoder.encode(mesh.name)),matrices=mesh.instanceMatrix.array.slice();
    const rawMatrix=mesh.name==='Alezhor driftwood'?Array.from(matrices):undefined;
    for(let i=13;i<matrices.length;i+=16)matrices[i]=0;
    const matrix=add(matrices),color=mesh.instanceColor?add(mesh.instanceColor.array.slice()):null;
    instances+=mesh.count;rows.push({name:mesh.name,count:mesh.count,capacity:matrices.length/16,nameBytes:name.bytes,matrix,color,rawMatrix});
  });
  const data=new Uint8Array(bytes);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}
  const canonical=data.slice();
  for(const row of rows)if(row.rawMatrix){
    const values=new Float32Array(row.rawMatrix);for(let i=13;i<values.length;i+=16)values[i]=0;
    const stable=canonicalAlezhorDriftwood(values);canonical.set(new Uint8Array(stable.buffer),row.matrix.offset);
  }
  const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value)),b=>b.toString(16).padStart(2,'0')).join('');
  const batches=await Promise.all(rows.map(async row=>({name:row.name,count:row.count,capacity:row.capacity,nameBytes:row.nameBytes,
    matrixBytes:row.matrix.bytes,colorBytes:row.color?.bytes??0,
    matrixSha:await hash(data.subarray(row.matrix.offset,row.matrix.offset+row.matrix.bytes)),
    colorSha:row.color?await hash(data.subarray(row.color.offset,row.color.offset+row.color.bytes)):null,
    ...(row.rawMatrix?{rawMatrix:row.rawMatrix}:{})})));
  return {batches:rows.length,instances,bytes,hash:await hash(data),canonicalHash:await hash(canonical),records:batches};
}

/** Native-only Alezhor acceptance. Same hooks as runRegionalGroundChecks.
 * Call first without expected, reload the isolated renderer, then call with
 * result.expected. No save restore is used to fabricate a harvested tree. */
export async function runAlezhorChecks(h, expected = null) {
  const checks=[], assert=(ok,message)=>{if(!ok)throw new Error(message);checks.push(message);};
  const loader=h.world.loading, mode=h.read().loadingMode;
  const position=()=>({x:h.player.group.position.x,y:h.player.group.position.y,z:h.player.group.position.z});
  const treeRows=()=>h.world.treeRegistry.trees.filter(t=>t.id.startsWith('alezhor-'))
    .map(({id,x,z,species})=>[id,x,z,species]).sort((a,b)=>a[0].localeCompare(b[0]));
  const fauna=()=>h.wildlife().creatures.filter(a=>homes.has(a.id))
    .map(({id,species,region})=>({id,species,region,authoredHome:homes.get(id)})).sort((a,b)=>a.id.localeCompare(b.id));
  const catalogs=()=>{const ids=h.world.treeRegistry.trees.map(t=>t.id).sort();return{
    trees:ids.length,unique:new Set(ids).size,ids:digest(ids.join('\n')),
    colliders:h.world.colliders.length,landmarks:h.world.landmarks.length,surfaces:h.world.walkSurfaces.length};};
  const assertReady=()=>{
    assert(!loader || loader.state().jobs.find(row=>row.id==='alezhor')?.status==='ready','Alezhor scenery job is ready before interaction');
    assert(!!h.world.ibenwoodAlezhorGround && (!loader || loader.state().jobs.find(row=>row.id==='ibenwoodAlezhorGround')?.status==='ready'), 'Shared river ground is ready before Alezhor interaction');
    assert(treeRows().length===392 && digest(JSON.stringify(treeRows()))===ALEZHOR_NATIVE_TREE_DIGEST,'Alezhor has the exact reviewed typed tree catalog');
    assert(fauna().length===37 && new Set(fauna().map(a=>a.id)).size===homes.size,'All 37 ambient identities and authored homes are present');
    assert(h.read().frameErrors.count===0,'Alezhor introduces no renderer frame errors');
  };
  const travel = async (point, label) => {
    const before = position(), id = h.world.regionAt(point.x, point.z).id, pending = loader && !loader.isReady(id);
    h.press('F8'); h.release('F8');
    assert(h.read().mode === 'testing', label + ' opens the real F8 travel panel');
    const input = document.getElementById('test-point'), button = document.getElementById('test-point-go');
    assert(!!input && !!button && !button.disabled, label + ' offers coordinate travel');
    input.value = point.x + ', ' + point.z; button.click();
    if (pending) assert(gap(position(), before) < .001 && h.read().waitingForRegion, label + ' holds the traveler while construction is pending');
    await h.ready(); loader?.stop(); await h.frames(2);
    assert(!loader || loader.isReady(id), label + ' finishes required regional jobs before arrival');
    assert(gap(position(), point) < .2 && !h.read().waitingForRegion && h.read().mode === 'playing', label + ' arrives through the real travel handler');
    assert(Math.abs(position().y - h.world.heightAt(point.x, point.z)) < .2, label + ' stands on its physical support');
  };
  const walk = async (end, { label = 'Alezhor route' } = {}) => {
    const start = position(), initialHp = h.read().hp, began = performance.now();
    const waits = []; let walked = 0, prior = start, waitMs = 0;
    assert(!h.read().inWater && canStand(start.x,start.z,h.world,.34,start.y), label+' starts on clear dry support');
    const waitForGround = async () => {
      const held = position(), waitingAt = performance.now(); let maxDisplacement = 0;
      // The real region boundary guard calls stopInput. Explicitly releasing
      // here and pressing again after readiness mirrors a traveler resuming W.
      h.release('KeyW');
      while(h.read().waitingForRegion){
        await h.frames(1);
        const at = position();
        maxDisplacement = Math.max(maxDisplacement,Math.hypot(at.x-held.x,at.y-held.y,at.z-held.z));
        if(maxDisplacement>.001) throw new Error(label+' moved during a loading guard: '+JSON.stringify({held,at,maxDisplacement}));
        if(performance.now()-waitingAt>180000) throw new Error(label+' region readiness stalled: '+JSON.stringify({held,loading:loader?.state()}));
      }
      await h.ready();
      const milliseconds = Math.round(performance.now()-waitingAt);
      waitMs += performance.now()-waitingAt;
      waits.push({position:held,milliseconds,maxDisplacement});
      const state = h.read();
      assert(state.mode==='playing' && !state.terrainFall.active && !state.inWater && state.hp===initialHp,
        label+' finishes the readiness wait with unchanged safe support and health');
      h.face(Math.atan2(position().x-end.x,position().z-end.z));h.press('KeyW');
      prior = position();
    };
    h.face(Math.atan2(start.x-end.x,start.z-end.z));h.press('KeyW');
    try {
      while(gap(position(),end)>.35){
        if(h.read().waitingForRegion){await waitForGround();continue;}
        const p=position();h.face(Math.atan2(p.x-end.x,p.z-end.z));
        if(performance.now()-began-waitMs>45000) throw new Error(label+' movement stalled: '+JSON.stringify({p,end,waits,fall:h.read().terrainFall}));
        await h.frames(1);
        const at=position(),state=h.read();walked+=gap(at,prior);prior=at;
        // Handle the loading guard before interpreting its temporary pause as
        // a failed walk. No displacement or arbitrary restart is introduced.
        if(state.waitingForRegion) continue;
        if(state.mode!=='playing' || state.inWater || state.terrainFall.active || state.hp<initialHp || h.wind()<=0)
          throw new Error(label+' lost ordinary safe support: '+JSON.stringify({at,mode:state.mode,hp:state.hp,water:state.inWater,fall:state.terrainFall}));
      }
      if(h.read().waitingForRegion) await waitForGround();
    } finally {h.release('KeyW');}
    await h.frames(2);
    assert(gap(position(),end)<.5 && walked>=gap(start,end)-.6,label+' real W input reaches its endpoint');
    assert(!h.read().terrainFall.active && !h.read().inWater && h.read().hp===initialHp,label+' returns dry with no fall or damage');
    return {start,end:position(),walked,waits,loadingWaitMs:Math.round(waitMs),
      movementMs:Math.round(performance.now()-began-waitMs),milliseconds:Math.round(performance.now()-began)};
  };
  // Independent mesh evidence once per arrival, never a per-frame world raycast.
  const surfaces = () => {
    h.scene.updateMatrixWorld(true);
    const meshes=h.scene.getObjectByName('The ground of Azhora').children.filter(m=>m.isMesh);
    for(const mesh of meshes)if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
    return [[-3949.229411,937.624166],[-4588.929036,956.557475],[-3600,86]].map(([x,z])=>{
      ray.ray.origin.set(x,2000,z);
      const hit=ray.intersectObjects(meshes.filter(mesh=>{const b=mesh.geometry.boundingBox;return x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z;}),false)[0];
      const sample=h.world.renderedGroundHeight(x,z), fine=h.world.ibenwoodAlezhorGround.fineGroundHeight(x,z);
      assert(Number.isFinite(fine) && !!hit && Math.abs(sample-hit.point.y)<.002,'Alezhor shared-ground witness '+x+','+z+' matches an actual retained triangle');
      return {x,z,actual:hit.point.y,sample,fine,mesh:hit.object.name};
    });
  };
  const layout = async () => {
    const measured=await measureAlezhorNativeLayout(h.world.alezhor.root);
    window.__alezhorNativeLayout=measured;
    if(measured.batches!==92 || measured.instances!==16210 || measured.canonicalHash!==ALEZHOR_NATIVE_CANONICAL_LAYOUT_SHA)
      throw new Error('Alezhor native layout differs: '+JSON.stringify({expected:{batches:92,instances:16210,rawHash:ALEZHOR_NATIVE_LAYOUT_SHA,canonicalHash:ALEZHOR_NATIVE_CANONICAL_LAYOUT_SHA},actual:measured}));
    assert(true,'The native Alezhor scene retains the approved 392-tree non-Y/color baseline');
    return measured;
  };
  const bankJourney = async along => {
    const sample=westStream().samples.reduce((best,p)=>Math.abs(p.along-along)<Math.abs(best.along-along)?p:best);
    // Same authored west-bank witnesses used by the composed controller test.
    const start={x:sample.x+sample.nx*(sample.half+3),z:sample.z+sample.nz*(sample.half+3)};
    const wet={x:sample.x+sample.nx*sample.half*.75,z:sample.z+sample.nz*sample.half*.75};
    await travel(start,'F8 to west stream bank '+along);
    assert(!h.read().inWater && !h.read().terrainFall.active,'Stream journey starts settled on its authored dry bank');
    const hp=h.read().hp, initialWind=h.wind(), began=performance.now();
    const trace={along,start,wet,initialWind,falls:[],landings:[],waterTransitions:[],walked:0,swum:0,windSpent:0,leastWind:initialWind};
    let prior=position(),previous=h.read(),previousWind=h.wind();
    const inspect=()=>{
      const at=position(),state=h.read(),wind=h.wind(),distance=gap(at,prior),milliseconds=Math.round(performance.now()-began);
      if(state.inWater || previous.inWater)trace.swum+=distance;else trace.walked+=distance;
      trace.windSpent+=Math.max(0,previousWind-wind);trace.leastWind=Math.min(trace.leastWind,wind);
      if(state.terrainFall.active&&!previous.terrainFall.active)trace.falls.push({at,milliseconds,peak:state.terrainFall.peak});
      if((previous.terrainFall.active&&!state.terrainFall.active)||(state.terrainFall.landed&&!previous.terrainFall.landed))
        trace.landings.push({at,milliseconds,water:state.inWater,damage:state.terrainFall.damage});
      if(state.inWater!==previous.inWater)trace.waterTransitions.push({at,milliseconds,entered:state.inWater,wind});
      if(state.waitingForRegion || state.mode!=='playing' || state.hp!==hp || wind<=0)
        throw new Error('Stream journey lost normal healthy movement: '+JSON.stringify({trace,state:{mode:state.mode,waiting:state.waitingForRegion,hp:state.hp,wind}}));
      prior=at;previous=state;previousWind=wind;
    };
    const leg=async(end,label)=>{
      const atStart=position(),legStarted=performance.now();h.face(Math.atan2(atStart.x-end.x,atStart.z-end.z));h.press('KeyW');
      try{
        while(gap(position(),end)>.3 || h.read().terrainFall.active){
          const at=position();h.face(Math.atan2(at.x-end.x,at.z-end.z));
          if(performance.now()-legStarted>20000)throw new Error(label+' stalled: '+JSON.stringify({at,end,trace}));
          await h.frames(1);inspect();
        }
      }finally{h.release('KeyW');}
      assert(gap(position(),end)<.4,label+' reaches its endpoint with real W input');
      return {start:atStart,end:position(),milliseconds:Math.round(performance.now()-legStarted)};
    };
    trace.enter=await leg(wet,'Stream '+along+' entry');
    assert(h.read().inWater,'Stream '+along+' reaches actual swimming water');
    trace.leave=await leg(start,'Stream '+along+' exit');
    await h.frames(2);inspect();
    trace.final={at:position(),hp:h.read().hp,wind:h.wind(),inWater:h.read().inWater,fall:h.read().terrainFall};
    assert(trace.falls.length===trace.landings.length && trace.landings.every(row=>row.water&&row.damage===0),'Stream '+along+' permits only harmless recorded water landings');
    assert(trace.waterTransitions.some(row=>row.entered)&&trace.waterTransitions.some(row=>!row.entered)&&trace.swum>.1&&trace.windSpent>0&&trace.leastWind>0,'Stream '+along+' enters/exits swimming and spends normal stamina');
    assert(trace.final.hp===hp&&!trace.final.inWater&&!trace.final.fall.active&&Math.abs(position().y-h.world.heightAt(position().x,position().z))<.2,'Stream '+along+' returns safely to dry physical support without damage');
    return trace;
  };
  const harvestAlezhorTree = async () => {
    const candidates = h.wood.catalog.filter(tree => tree.harvestable && (TREE_KINDS[tree.kind]?.logs[0] ?? 0) >= 2
      && tree.id.startsWith('alezhor-') && h.world.regionAt(tree.x, tree.z).id === ALEZHOR_ID && h.wood.standing(tree.id))
      .sort((a, b) => gap(a, ALEZHOR_ARRIVAL) - gap(b, ALEZHOR_ARRIVAL) || a.id.localeCompare(b.id));
    let selected = null;
    for (const tree of candidates) {
      const reach = (tree.radius ?? .4) + 1.15;
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8, x = tree.x + Math.cos(angle) * reach, z = tree.z + Math.sin(angle) * reach;
        const y = h.world.heightAt(x, z);
        if (!canStand(x, z, h.world, .34, y)) continue;
        if ([[.4, 0], [-.4, 0], [0, .4], [0, -.4]].some(([dx, dz]) => Math.abs(h.world.heightAt(x + dx, z + dz) - y) > .2)) continue;
        selected = { tree, stand: { x, z } }; break;
      }
      if (selected) break;
    }
    assert(!!selected, 'A typed, multiple-log Alezhor tree has a clear dry standing place');
    const { tree, stand } = selected, kind = TREE_KINDS[tree.kind];
    await travel(stand, 'F8 to the Alezhor harvest witness');
    assert(gap(position(), tree) <= CHOP_REACH + (tree.radius ?? 0) && !h.read().inWater,
      'The traveler stands within ordinary reach of the Alezhor tree');
    // Only the isolated smoke character receives the prerequisite lesson/tool.
    // The tree's stock, random harvest roll and experience remain production.
    h.skills.learn(WOODCUTTING_SKILL);
    const requiredXp = SKILLS[WOODCUTTING_SKILL].thresholds[kind.level - 1];
    h.skills.gain(WOODCUTTING_SKILL, Math.max(0, requiredXp - h.skills.xp(WOODCUTTING_SKILL)));
    if (!h.inventory.has('bronze-axe')) assert(h.inventory.add('bronze-axe', 1), 'The smoke woodcutter carries a bronze hatchet');
    const can = h.wood.canChop(tree.id, id => h.inventory.has(id));
    assert(can.ok, 'Alezhor tree accepts the normal woodcutting level and carried axe');
    const logsBefore = h.inventory.count(kind.log), xpBefore = h.skills.xp(WOODCUTTING_SKILL), cutBefore = h.wood.logs;
    let result = null, swings = 0;
    for (; swings < 40; swings++) {
      result = h.wood.swing(tree.id, id => h.inventory.has(id));
      assert(result.ok, 'Production wood.swing accepts Alezhor attempt ' + (swings + 1));
      if (result.log) { swings++; break; }
      const after = h.read().playSeconds + SWING, started = performance.now();
      while (h.read().playSeconds < after) {
        if (performance.now() - started > 15000) throw new Error('Alezhor woodcutting game clock stalled');
        await h.frames(1);
      }
    }
    assert(result?.log === kind.log && !result.felled, 'Production wood.swing yields one Alezhor log and leaves a standing tree');
    assert(h.inventory.add(result.log, 1) && h.inventory.count(result.log) === logsBefore + 1,
      'The actual Alezhor harvest log enters the inventory exactly once');
    assert(h.wood.logs === cutBefore + 1 && h.skills.xp(WOODCUTTING_SKILL) === xpBefore + kind.xp,
      'Alezhor harvest records the normal log and experience reward');
    const savedTree = h.wood.snapshot().trees.find(row => row.id === tree.id);
    assert(savedTree?.logsLeft >= 1 && savedTree.logsLeft < kind.logs[1] && savedTree.stump === 0,
      'The Alezhor tree records its real remaining stock as a partial harvest');
    return { id: tree.id, kind: tree.kind, species: tree.species, region: h.world.regionAt(tree.x, tree.z).id,
      x: tree.x, z: tree.z, saved: savedTree, log: result.log, logCount: h.inventory.count(result.log), swings };
  };
  loader?.stop();
  if(expected){
    assert(h.resume(),'Continue accepts the isolated Alezhor checkpoint');
    await h.ready();loader?.stop();await h.frames(3);
    const saved=h.snapshot();
    assert(gap(position(),expected.position)<.2 && (!loader || loader.isReady(8)),'Continue restores the supported West Izol departure');
    assert(Math.abs(position().y-h.world.heightAt(position().x,position().z))<.2,'Continue retains physical footing');
    assert(same(saved.inventory,expected.inventory),'Continue restores exact inventory without duplicate rewards');
    assert(same(saved.woodcutting,expected.woodcutting),'Continue retains the unloaded Alezhor partial tree state');
    await travel(ALEZHOR_ARRIVAL,'Post-Continue F8 to Alezhor');assertReady();
    const retainedLayout=await layout(),support=surfaces();
    const tree=h.wood.tree(expected.tree.id);
    assert(tree?.species===expected.tree.species && tree.x===expected.tree.x && tree.z===expected.tree.z,'The exact saved Alezhor tree identity resolves after loading');
    assert(same(h.wood.snapshot().trees.find(row=>row.id===tree.id),expected.tree.saved) && h.wood.standing(tree.id),'Remaining harvest stock and standing state survive Continue');
    assert(h.inventory.count(expected.tree.log)===expected.tree.logCount,'The single actual harvest reward survives Continue');
    assert(same(fauna(),expected.fauna),'Ambient identities and authored homes rebuild consistently after Continue');
    assert(h.read().frameErrors.count===0,'Continue and return introduce no renderer frame errors');
    return {ok:true,mode,checks,retainedLayout,support,position:position(),evidence:h.evidence(),loading:loader?.state()??null};
  }
  h.play();loader?.stop();
  const oldTrees=new Map(h.world.treeRegistry.trees.filter(t=>!t.id.startsWith('alezhor-')).map(t=>[t.id,[t.x,t.y,t.z,t.species]]));
  const began=performance.now();await travel(ALEZHOR_ARRIVAL,'First F8 to Alezhor');assertReady();
  const readinessMs=Math.round(performance.now()-began), originalTrees=treeRows(), originalFauna=fauna(), journeys=[];
  const retainedLayout=await layout(),support=surfaces(),banks=[];
  const arrivedTrees=new Map(h.world.treeRegistry.trees.map(t=>[t.id,[t.x,t.y,t.z,t.species]]));
  const changedOldTrees=[...oldTrees].filter(([id,before])=>!same(arrivedTrees.get(id),before)).map(([id])=>id);
  assert(changedOldTrees.length===0,'Alezhor arrival preserves every already-loaded old tree identity/pose: '+JSON.stringify(changedOldTrees.slice(0,8)));
  for(const route of ALEZHOR_NATIVE_ROUTES){
    await travel(route.points[0],'F8 to '+route.label);
    const outward=await walk(route.points[1],{label:route.label+' outward'});
    const returning=await walk(route.points[0],{label:route.label+' return'});
    journeys.push({label:route.label,outward,returning});
  }
  for(const along of [20,70])banks.push(await bankJourney(along));
  // Establish both region catalogs before checking departure/return duplicates.
  await travel(HARBOR,'F8 to the preserved West Izol harbor');
  const loaded=catalogs();await travel(ALEZHOR_ARRIVAL,'Return to Alezhor');assertReady();
  assert(same(catalogs(),loaded) && loaded.trees===loaded.unique,'Return adds no duplicate trees, colliders, landmarks or supports');
  assert(same(treeRows(),originalTrees) && same(fauna(),originalFauna),'Departure and return retain Alezhor trees and ambient identity/home catalog');
  const tree=await harvestAlezhorTree();
  await travel(HARBOR,'Leave the partial harvest for West Izol');
  await travel(ALEZHOR_ARRIVAL,'Revisit the Alezhor harvest country');
  assert(same(h.wood.snapshot().trees.find(row=>row.id===tree.id),tree.saved),'Departure and return retain actual remaining tree stock');
  await travel(HARBOR,'Save at the preserved harbor with Alezhor departed');
  const saved=h.snapshot();assert(h.persist(saved).ok,'The isolated checkpoint stores the actual harvest and inventory');
  assert(h.read().frameErrors.count===0,'All Alezhor review actions finish without renderer errors');
  return {ok:true,mode,checks,readinessMs,journeys,banks,retainedLayout,support,oldTreesPreserved:oldTrees.size,tree,catalogs:catalogs(),evidence:h.evidence(),loading:loader?.state()??null,
    expected:{position:saved.position,inventory:saved.inventory,woodcutting:saved.woodcutting,tree,fauna:originalFauna}};
}
