import { canStand } from './game-state.js';
import { TREE_KINDS, WOODCUTTING_SKILL, CHOP_REACH, SWING } from './woodcutting.js';
import { SKILLS } from './skills.js';
import { REGION_IDS } from './region-world.js';
import { EAST_IZOL_ARRIVAL } from './east-izol-world.js';
import { EAST_IZOL_WILDLIFE_ZONES } from './east-izol-wildlife.js';

const EAST_ID = REGION_IDS['East Izol'];
// Exact subsegments of the ordinary production-controller journeys. Travel is
// allowed between these independent witnesses, never inside a walking segment.
export const EAST_IZOL_NATIVE_ROUTES = Object.freeze([
  { label: 'Arrival interior', points: [{ x: 500, z: 1934 }, { x: 513, z: 1900 }] },
  { label: 'West/East Hearth Road seam', points: [{ x: 392, z: 1808 }, { x: 428, z: 1822 }] },
  { label: 'Coastal trail', points: [{ x: 748, z: 1745 }, { x: 734, z: 1762 }] },
].map(row => Object.freeze({ ...row, points: Object.freeze(row.points.map(Object.freeze)) })));
const HARBOR = Object.freeze({ x: 86, z: 1731 });
const homes = new Map(EAST_IZOL_WILDLIFE_ZONES.flatMap(zone => zone.sites
  .map(([x,z],i) => [`${zone.id}-${i+1}`, { x,z }])));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const digest = text => { let value=2166136261; for(let i=0;i<text.length;i++) value=Math.imul(value^text.charCodeAt(i),16777619); return (value>>>0).toString(16).padStart(8,'0'); };

/** Native-only East Izol acceptance. Same hooks as runRegionalGroundChecks.
 * Call first without expected, reload the isolated renderer, then call with
 * result.expected. No save restore is used to fabricate a harvested tree. */
export async function runEastIzolChecks(h, expected = null) {
  const checks=[], assert=(ok,message)=>{if(!ok)throw new Error(message);checks.push(message);};
  const loader=h.world.loading, mode=h.read().loadingMode;
  const position=()=>({x:h.player.group.position.x,y:h.player.group.position.y,z:h.player.group.position.z});
  const treeRows=()=>h.world.treeRegistry.trees.filter(t=>t.id.startsWith('east-izol-'))
    .map(({id,x,z,species})=>[id,x,z,species]).sort((a,b)=>a[0].localeCompare(b[0]));
  const fauna=()=>h.wildlife().creatures.filter(a=>homes.has(a.id))
    .map(({id,species,region})=>({id,species,region,authoredHome:homes.get(id)})).sort((a,b)=>a.id.localeCompare(b.id));
  const catalogs=()=>{const ids=h.world.treeRegistry.trees.map(t=>t.id).sort();return{
    trees:ids.length,unique:new Set(ids).size,ids:digest(ids.join('\n')),
    colliders:h.world.colliders.length,landmarks:h.world.landmarks.length,surfaces:h.world.walkSurfaces.length};};
  const assertReady=()=>{
    assert(!loader || loader.state().jobs.find(row=>row.id==='eastIzol')?.status==='ready','East Izol scenery job is ready before interaction');
    assert(treeRows().length===182 && digest(JSON.stringify(treeRows()))==='3f95b77e','East Izol has the exact reviewed typed tree catalog');
    assert(fauna().length===41 && new Set(fauna().map(a=>a.id)).size===homes.size,'All 41 ambient identities and authored homes are present');
    assert(h.read().frameErrors.count===0,'East Izol introduces no renderer frame errors');
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
  const walk = async (end, { label = 'East Izol route' } = {}) => {
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
  const harvestEastTree = async () => {
    const candidates = h.wood.catalog.filter(tree => tree.harvestable && tree.kind === 'holm-oak'
      && tree.id.startsWith('east-izol-') && h.world.regionAt(tree.x, tree.z).id === EAST_ID && h.wood.standing(tree.id))
      .sort((a, b) => gap(a, EAST_IZOL_ARRIVAL) - gap(b, EAST_IZOL_ARRIVAL) || a.id.localeCompare(b.id));
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
    assert(!!selected, 'A harvestable East Izol holm oak has a clear dry standing place');
    const { tree, stand } = selected, kind = TREE_KINDS[tree.kind];
    await travel(stand, 'F8 to the East Izol harvest witness');
    assert(gap(position(), tree) <= CHOP_REACH + (tree.radius ?? 0) && !h.read().inWater,
      'The traveler stands within ordinary reach of the East Izol tree');
    // Only the isolated smoke character receives the prerequisite lesson/tool.
    // The tree's stock, random harvest roll and experience remain production.
    h.skills.learn(WOODCUTTING_SKILL);
    const requiredXp = SKILLS[WOODCUTTING_SKILL].thresholds[kind.level - 1];
    h.skills.gain(WOODCUTTING_SKILL, Math.max(0, requiredXp - h.skills.xp(WOODCUTTING_SKILL)));
    if (!h.inventory.has('bronze-axe')) assert(h.inventory.add('bronze-axe', 1), 'The smoke woodcutter carries a bronze hatchet');
    const can = h.wood.canChop(tree.id, id => h.inventory.has(id));
    assert(can.ok, 'East Izol tree accepts the normal woodcutting level and carried axe');
    const logsBefore = h.inventory.count(kind.log), xpBefore = h.skills.xp(WOODCUTTING_SKILL), cutBefore = h.wood.logs;
    let result = null, swings = 0;
    for (; swings < 40; swings++) {
      result = h.wood.swing(tree.id, id => h.inventory.has(id));
      assert(result.ok, 'Production wood.swing accepts East Izol attempt ' + (swings + 1));
      if (result.log) { swings++; break; }
      const after = h.read().playSeconds + SWING, started = performance.now();
      while (h.read().playSeconds < after) {
        if (performance.now() - started > 15000) throw new Error('East Izol woodcutting game clock stalled');
        await h.frames(1);
      }
    }
    assert(result?.log === kind.log && !result.felled, 'Production wood.swing yields one East Izol log and leaves a standing tree');
    assert(h.inventory.add(result.log, 1) && h.inventory.count(result.log) === logsBefore + 1,
      'The actual East Izol harvest log enters the inventory exactly once');
    assert(h.wood.logs === cutBefore + 1 && h.skills.xp(WOODCUTTING_SKILL) === xpBefore + kind.xp,
      'East Izol harvest records the normal log and experience reward');
    const savedTree = h.wood.snapshot().trees.find(row => row.id === tree.id);
    assert(savedTree?.logsLeft >= 1 && savedTree.logsLeft < kind.logs[1] && savedTree.stump === 0,
      'The East Izol tree records its real remaining stock as a partial harvest');
    return { id: tree.id, kind: tree.kind, species: tree.species, region: h.world.regionAt(tree.x, tree.z).id,
      x: tree.x, z: tree.z, saved: savedTree, log: result.log, logCount: h.inventory.count(result.log), swings };
  };
  loader?.stop();
  if(expected){
    assert(h.resume(),'Continue accepts the isolated East Izol checkpoint');
    await h.ready();loader?.stop();await h.frames(3);
    const saved=h.snapshot();
    assert(gap(position(),expected.position)<.2 && (!loader || loader.isReady(8)),'Continue restores the supported West Izol departure');
    assert(Math.abs(position().y-h.world.heightAt(position().x,position().z))<.2,'Continue retains physical footing');
    assert(same(saved.inventory,expected.inventory),'Continue restores exact inventory without duplicate rewards');
    assert(same(saved.woodcutting,expected.woodcutting),'Continue retains the unloaded East Izol partial tree state');
    await travel(EAST_IZOL_ARRIVAL,'Post-Continue F8 to East Izol');assertReady();
    const tree=h.wood.tree(expected.tree.id);
    assert(tree?.species===expected.tree.species && tree.x===expected.tree.x && tree.z===expected.tree.z,'The exact saved East Izol tree identity resolves after loading');
    assert(same(h.wood.snapshot().trees.find(row=>row.id===tree.id),expected.tree.saved) && h.wood.standing(tree.id),'Remaining harvest stock and standing state survive Continue');
    assert(h.inventory.count(expected.tree.log)===expected.tree.logCount,'The single actual harvest reward survives Continue');
    assert(same(fauna(),expected.fauna),'Ambient identities and authored homes rebuild consistently after Continue');
    assert(h.read().frameErrors.count===0,'Continue and return introduce no renderer frame errors');
    return {ok:true,mode,checks,position:position(),evidence:h.evidence(),loading:loader?.state()??null};
  }
  h.play();loader?.stop();
  const began=performance.now();await travel(EAST_IZOL_ARRIVAL,'First F8 to East Izol');assertReady();
  const readinessMs=Math.round(performance.now()-began), originalTrees=treeRows(), originalFauna=fauna(), journeys=[];
  for(const route of EAST_IZOL_NATIVE_ROUTES){
    await travel(route.points[0],'F8 to '+route.label);
    const outward=await walk(route.points[1],{label:route.label+' outward'});
    const returning=await walk(route.points[0],{label:route.label+' return'});
    journeys.push({label:route.label,outward,returning});
  }
  // Establish both region catalogs before checking departure/return duplicates.
  await travel(HARBOR,'F8 to the preserved West Izol harbor');
  const loaded=catalogs();await travel(EAST_IZOL_ARRIVAL,'Return to East Izol');assertReady();
  assert(same(catalogs(),loaded) && loaded.trees===loaded.unique,'Return adds no duplicate trees, colliders, landmarks or supports');
  assert(same(treeRows(),originalTrees) && same(fauna(),originalFauna),'Departure and return retain East trees and ambient identity/home catalog');
  const tree=await harvestEastTree();
  await travel(HARBOR,'Leave the partial harvest for West Izol');
  await travel(EAST_IZOL_ARRIVAL,'Revisit the East Izol harvest country');
  assert(same(h.wood.snapshot().trees.find(row=>row.id===tree.id),tree.saved),'Departure and return retain actual remaining tree stock');
  await travel(HARBOR,'Save at the preserved harbor with East Izol departed');
  const saved=h.snapshot();assert(h.persist(saved).ok,'The isolated checkpoint stores the actual harvest and inventory');
  assert(h.read().frameErrors.count===0,'All East Izol review actions finish without renderer errors');
  return {ok:true,mode,checks,readinessMs,journeys,tree,catalogs:catalogs(),evidence:h.evidence(),loading:loader?.state()??null,
    expected:{position:saved.position,inventory:saved.inventory,woodcutting:saved.woodcutting,tree,fauna:originalFauna}};
}
