import test from 'node:test';
import assert from 'node:assert/strict';
import { createStrategicPrototype, createStrategicPrototypeStore, validateStrategicPrototype, STRATEGIC_SAVE_KEY,
  STRATEGIC_CELLS, STRATEGIC_EDGES, STRATEGIC_BRIDGE_EDGE, STRATEGIC_HOLDINGS } from '../src/experiments/frontier-command/strategic-prototype.js';
import { REGION_CELLS } from '../src/world/terrain/region-world.js';
const imperial = 'imperial-field-force', centaur = 'centaur-band', bridge = 'menora-lizeem-bridge';
const unit = (model, id) => model.view().armies.find(a => a.id === id);
const holding = (model, id) => model.view().holdings.find(h => h.id === id);
function until(model, condition, limit = 60) { for (let i = 0; i < limit && !condition(); i++) model.advance(6); assert.ok(condition(), 'The commanded scenario must reach its expected state.'); }
function meeting() { const model = createStrategicPrototype(); assert.ok(model.order(imperial, { type: 'march', target: bridge }).ok); until(model, () => !!model.view().pendingBattle); return model; }

test('The prototype uses exactly the real three-region hex graph, authored holdings and river crossings', () => {
  const expected = ['Isareos', 'Caricas', 'Yunethre'].flatMap(name => REGION_CELLS[name].map(c => `${c.q},${c.r}`));
  assert.deepEqual(new Set(STRATEGIC_CELLS.map(c => c.id)), new Set(expected)); assert.equal(STRATEGIC_CELLS.length, 90);
  assert.ok(STRATEGIC_HOLDINGS.some(h => h.name === 'Minora')); assert.ok(STRATEGIC_HOLDINGS.some(h => h.name === "Bane's Camp"));
  for (const e of STRATEGIC_EDGES) { assert.ok(expected.includes(e.a) && expected.includes(e.b)); if (e.river && !e.bridge) assert.equal(e.blocked, true); }
  const model = createStrategicPrototype(), route = model.previewMarch(imperial, 'caricas-garrison-town');
  assert.equal(route.ok, true); assert.ok(route.legs.some(e => e.id === STRATEGIC_BRIDGE_EDGE));
  assert.ok(route.hours > 0 && route.supplyCost > 0); assert.equal(validateStrategicPrototype(model.snapshot()), true);
});

test('Neutral passage needs permission, and neither raiding nor marching rewrites the free town', () => {
  const model = createStrategicPrototype(); model.order(centaur, { type: 'hold' });
  assert.equal(model.previewMarch(centaur, 'yunethre-free-town').ok, false);
  assert.equal(model.setPassage(centaur, true).ok, true); assert.equal(model.previewMarch(centaur, 'yunethre-free-town').ok, true);
  assert.equal(model.order(centaur, { type: 'raid', target: 'yunethre-free-town' }).ok, false);
  model.order(centaur, { type: 'march', target: 'yunethre-free-town' }); until(model, () => unit(model, centaur).order.type === 'hold');
  const town = holding(model, 'yunethre-free-town'); assert.equal(town.controller, 'neutral'); assert.equal(town.sovereignClaim, null);
  assert.equal(model.order(centaur, { type: 'raid', target: 'menora' }).ok, false);
});

test('March orders and partial edge progress survive reload and follow identical deterministic turns', () => {
  const model = createStrategicPrototype(); model.order(imperial, { type: 'march', target: 'caricas-garrison-town' }); model.advance(6);
  const saved = model.snapshot(), restored = createStrategicPrototype(); assert.equal(restored.restore(saved), true);
  for (let i = 0; i < 3; i++) { model.advance(6); restored.advance(6); assert.deepEqual(restored.snapshot(), model.snapshot()); }
  assert.equal(holding(model, 'caricas-garrison-town').sovereignClaim, 'empire');
});

test('Raiding the bridge interrupts friendly supply; retreat to camp replenishes the centaur band', () => {
  const model = createStrategicPrototype(); model.order(imperial, { type: 'march', target: 'caricas-garrison-town' });
  until(model, () => unit(model, imperial).cellId === holding(model, 'caricas-garrison-town').cellId);
  assert.equal(model.supplyStatus(imperial).ok, true);
  until(model, () => model.view().bridgeOpen === false);
  assert.equal(holding(model, bridge).controller, 'yunethre'); assert.equal(holding(model, bridge).sovereignClaim, 'empire');
  assert.equal(model.supplyStatus(imperial).ok, false); assert.match(model.supplyStatus(imperial).reason, /Bridge/);
  assert.equal(model.order(imperial, { type: 'resupply' }).ok, false);
  assert.equal(model.resolveAdventureAction('repair-without-control', 'repair-bridge').ok, false);
  assert.equal(model.order(centaur, { type: 'retreat' }).ok, true); until(model, () => unit(model, centaur).order.type === 'hold');
  const before = unit(model, centaur).supplies; assert.equal(model.supplyStatus(centaur).ok, true);
  model.order(centaur, { type: 'resupply' }); model.advance(6); assert.ok(unit(model, centaur).supplies > before);
});

test('One pending adventure battle freezes time and reconciles one durable outcome across reloads', () => {
  const model = meeting(), pending = model.view().pendingBattle, before = model.snapshot();
  assert.equal(model.advance(24).ok, false); assert.deepEqual(model.snapshot(), before);
  assert.equal(model.order(imperial, { type: 'retreat' }).ok, false);
  assert.equal(validateStrategicPrototype(before), true);
  const restored = createStrategicPrototype(); assert.equal(restored.restore(before), true);
  assert.equal(restored.resolveAdventureBattle('not-the-battle', 'imperial-victory').ok, false);
  assert.equal(restored.resolveAdventureBattle(pending.id, 'imperial-victory').ok, true);
  const after = restored.snapshot(); assert.equal(after.resolvedBattles.length, 1); assert.equal(after.objective.status, 'complete');
  assert.equal(restored.resolveAdventureBattle(pending.id, 'centaur-victory').duplicate, true); assert.deepEqual(restored.snapshot(), after);
  const again = createStrategicPrototype(); assert.equal(again.restore(after), true);
  assert.equal(again.resolveAdventureBattle(pending.id, 'imperial-victory').duplicate, true); assert.deepEqual(again.snapshot(), after);
  assert.notEqual(unit(again, imperial).cellId, unit(again, centaur).cellId, 'Defeated army withdraws to an adjacent passable hex.');
});

test('A lost adventure battle preserves the ongoing objective and retreats the Imperial force', () => {
  const model = meeting(), id = model.view().pendingBattle.id; model.resolveAdventureBattle(id, 'centaur-victory');
  assert.equal(model.view().objective.status, 'active'); assert.equal(unit(model, imperial).order.type, 'retreat');
  assert.equal(holding(model, bridge).controller, 'yunethre'); assert.equal(holding(model, bridge).sovereignClaim, 'empire');
});

test('Bridge repair is a once-only adventure effect and leaves supply ledgers and claims separate', () => {
  const model = meeting(), id = model.view().pendingBattle.id; model.resolveAdventureBattle(id, 'imperial-victory');
  const changed = model.snapshot(); changed.bridgeOpen = false; assert.ok(model.restore(changed));
  assert.equal(model.resolveAdventureAction('repair-scene-1', 'repair-bridge').ok, true); const after = model.snapshot();
  assert.equal(model.resolveAdventureAction('repair-scene-1', 'repair-bridge').duplicate, true); assert.deepEqual(model.snapshot(), after);
  assert.equal(model.view().bridgeOpen, true); assert.ok(model.view().ledger.empire.food > 0);
});

test('Malformed snapshots cannot create map cells, move neutral control, fabricate outcomes or corrupt orders', () => {
  const model = createStrategicPrototype(), good = model.snapshot();
  for (const alter of [s => s.armies[0].cellId = 'not-a-hex', s => s.hour = Infinity,
    s => s.armies[0].order = { type: 'march', target: 'menora', route: ['-11,102'], edgeProgress: 0, workHours: 0 },
    s => s.holdings['yunethre-free-town'].controller = 'empire', s => s.holdings.menora.reserves.food = -1,
    s => s.pendingBattle = { id: 'bad' }, s => s.armies[1].supplies = NaN]) {
    const bad = structuredClone(good); alter(bad); assert.equal(model.restore(bad), false); assert.deepEqual(model.snapshot(), good);
  }
});

test('The strategy session store is isolated from road saves, rejects corrupt data and handles storage denial', () => {
  const values = new Map([['azhora-road-checkpoint', 'untouched']]); const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const store = createStrategicPrototypeStore(storage), model = createStrategicPrototype(); model.advance(6);
  assert.equal(store.save(model).ok, true); assert.ok(values.has(STRATEGIC_SAVE_KEY));
  const other = createStrategicPrototype(); assert.equal(store.load(other).ok, true); assert.deepEqual(other.snapshot(), model.snapshot());
  values.set(STRATEGIC_SAVE_KEY, '{broken'); assert.equal(store.load(other).ok, false); assert.equal(values.get('azhora-road-checkpoint'), 'untouched');
  assert.equal(createStrategicPrototypeStore({ setItem() { throw Error('denied'); } }).save(model).ok, false);
});
