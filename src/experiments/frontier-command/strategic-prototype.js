/** Explicit-turn frontier experiment. This state never reads or writes campaign,
 * adventure inventory, named casualties, sovereign borders or personal map fog. */
import { STRATEGIC_SCENARIO_ID, STRATEGIC_CELLS, STRATEGIC_EDGES, STRATEGIC_NEIGHBORS, STRATEGIC_HOLDINGS, STRATEGIC_ARMIES,
  STRATEGIC_REGIONS, STRATEGIC_FACTIONS, STRATEGIC_BOUNDS, STRATEGIC_RIVERS, strategicEdgeId } from './strategic-prototype-world.js';
export * from './strategic-prototype-world.js';
export const STRATEGIC_PROTOTYPE_VERSION = 1;
export const STRATEGIC_SAVE_KEY = 'azhora-strategic-prototype-v1';
const clone = value => JSON.parse(JSON.stringify(value));
const cells = new Map(STRATEGIC_CELLS.map(c => [c.id, c])), edges = new Map(STRATEGIC_EDGES.map(e => [e.id, e]));
const bridgeId = 'menora-lizeem-bridge', campId = 'yunethre-centaur-camp', neutralId = 'yunethre-free-town';
const orderTypes = ['hold', 'march', 'raid', 'retreat', 'resupply'];
const range = (n, low, high) => Number.isFinite(n) && n >= low && n <= high;
const emptyOrder = () => ({ type: 'hold', target: null, route: [], edgeProgress: 0, workHours: 0 });
const fresh = () => ({ version: 1, scenarioId: STRATEGIC_SCENARIO_ID, hour: 0, bridgeOpen: true, nextBattle: 1,
  holdings: Object.fromEntries(STRATEGIC_HOLDINGS.map(h => [h.id, { controller: h.controller, localSupport: h.localSupport, reserves: clone(h.reserves) }])),
  armies: STRATEGIC_ARMIES.map(a => ({ ...clone(a), lastCellId: a.cellId, passage: false, order: emptyOrder() })),
  pendingBattle: null, resolvedBattles: [], adventureEffects: [], objective: { id: 'secure-frontier-crossing', status: 'active', battleWon: false }, log: [] });
const hostile = (a, b) => a !== b && a !== 'neutral' && b !== 'neutral';

export function validateStrategicPrototype(s) {
  if (!s || s.version !== 1 || s.scenarioId !== STRATEGIC_SCENARIO_ID || !Number.isInteger(s.hour) || !range(s.hour, 0, 1000000)
    || typeof s.bridgeOpen !== 'boolean' || !Number.isInteger(s.nextBattle) || !range(s.nextBattle, 1, 1000000)) return false;
  if (!s.holdings || Object.keys(s.holdings).length !== STRATEGIC_HOLDINGS.length || !STRATEGIC_HOLDINGS.every(h => {
    const held = s.holdings[h.id]; return held && ['empire', 'yunethre', 'neutral'].includes(held.controller)
      && (!h.reservedStory || held.controller === h.controller) && (!h.neutral || held.controller === 'neutral')
      && range(held.localSupport, 0, 100) && range(held.reserves?.food, 0, 10000) && range(held.reserves?.coins, 0, 10000);
  })) return false;
  if (!Array.isArray(s.armies) || s.armies.length !== STRATEGIC_ARMIES.length || !STRATEGIC_ARMIES.every(template => {
    const a = s.armies.find(a => a.id === template.id), o = a?.order;
    return a && a.faction === template.faction && a.homeId === template.homeId && a.name === template.name && a.unit === template.unit
      && cells.has(a.cellId) && cells.has(a.lastCellId) && typeof a.passage === 'boolean'
      && ['strength', 'morale', 'supplies'].every(k => range(a[k], 0, 100))
      && o && orderTypes.includes(o.type) && range(o.edgeProgress, 0, 20) && range(o.workHours, 0, 6)
      && (o.target === null || cells.has(o.target) || STRATEGIC_HOLDINGS.some(h => h.id === o.target))
      && Array.isArray(o.route) && o.route.length <= STRATEGIC_CELLS.length && o.route.every(c => cells.has(c))
      && o.route.every((c, i) => !!edges.get(strategicEdgeId(i ? o.route[i - 1] : a.cellId, c)))
      && (o.route.length || o.edgeProgress === 0);
  })) return false;
  if (!s.objective || s.objective.id !== 'secure-frontier-crossing' || !['active', 'complete'].includes(s.objective.status) || typeof s.objective.battleWon !== 'boolean'
    || s.objective.status === 'complete' && !s.objective.battleWon) return false;
  if (!Array.isArray(s.resolvedBattles) || s.resolvedBattles.length > 500 || new Set(s.resolvedBattles.map(b => b.id)).size !== s.resolvedBattles.length
    || s.resolvedBattles.some(b => !/^frontier-battle-[1-9]\d*$/.test(b.id) || !['imperial-victory', 'centaur-victory', 'retreat'].includes(b.outcome) || !range(b.hour, 0, s.hour))) return false;
  if (!Array.isArray(s.adventureEffects) || s.adventureEffects.length > 500 || new Set(s.adventureEffects).size !== s.adventureEffects.length || s.adventureEffects.some(id => typeof id !== 'string' || id.length > 100)) return false;
  if (!Array.isArray(s.log) || s.log.length > 50 || s.log.some(row => !range(row.hour, 0, s.hour) || typeof row.text !== 'string' || row.text.length > 300)) return false;
  const b = s.pendingBattle;
  if (b !== null && (!b || !/^frontier-battle-[1-9]\d*$/.test(b.id) || s.resolvedBattles.some(r => r.id === b.id) || !cells.has(b.cellId)
    || !range(b.startedAt, 0, s.hour) || !STRATEGIC_ARMIES.some(a => a.id === b.attacker) || !STRATEGIC_ARMIES.some(a => a.id === b.defender)
    || b.attacker === b.defender || !['imperial-victory', 'centaur-victory'].includes(b.previewOutcome)
    || !Number.isFinite(b.at?.x) || !Number.isFinite(b.at?.z)
    || Math.hypot(b.at.x - cells.get(b.cellId).x, b.at.z - cells.get(b.cellId).z) > 100
    || !s.armies.every(a => a.cellId === b.cellId))) return false;
  const battleNumbers = [...s.resolvedBattles.map(one => Number(one.id.split('-').at(-1))), ...(b ? [Number(b.id.split('-').at(-1))] : [])];
  if (battleNumbers.some(n => n >= s.nextBattle)) return false;
  return true;
}

export function createStrategicPrototype({ onEvent = () => {} } = {}) {
  let state = fresh();
  const army = id => state.armies.find(a => a.id === id);
  const holding = id => STRATEGIC_HOLDINGS.find(h => h.id === id);
  const targetCell = target => cells.has(target) ? target : holding(target)?.cellId ?? null;
  const note = text => { state.log.push({ hour: state.hour, text }); state.log = state.log.slice(-50); };
  const emit = (type, more = {}) => onEvent({ type, hour: state.hour, ...more });
  const cellHoldings = id => STRATEGIC_HOLDINGS.filter(h => h.cellId === id);
  function permission(a, id) {
    const local = cellHoldings(id);
    if (local.some(h => h.id === neutralId) && !a.passage) return 'The Lakeside Free Town requires peaceful passage permission.';
    if (local.some(h => h.id === 'menora') && a.faction !== 'empire') return 'Minora\u2019s royal story and garrison remain reserved in this prototype.';
    return null;
  }
  function edgeHours(a, edge) {
    const fastGrass = a.faction === 'yunethre' && !edge.river;
    return Math.max(2, edge.hours * (fastGrass ? .75 : 1) * (a.supplies <= 0 ? 1.5 : 1));
  }
  function routeFor(a, to, { supply = false, avoidEnemy = false } = {}) {
    if (!a || !cells.has(to)) return { ok: false, reason: 'Choose a hex within the three-region prototype.' };
    const blocked = permission(a, to); if (blocked) return { ok: false, reason: blocked, permissions: [blocked] };
    const distance = new Map([[a.cellId, 0]]), previous = new Map(), open = new Set([a.cellId]);
    while (open.size) {
      const current = [...open].sort((l, r) => distance.get(l) - distance.get(r) || l.localeCompare(r))[0]; open.delete(current);
      if (current === to) break;
      for (const next of STRATEGIC_NEIGHBORS[current]) {
        const edge = edges.get(strategicEdgeId(current, next));
        if (edge.blocked || edge.bridge && !state.bridgeOpen || permission(a, next)) continue;
        if ((supply || avoidEnemy) && state.armies.some(other => other.id !== a.id && hostile(a.faction, other.faction) && other.cellId === next)) continue;
        if (supply && (cells.get(next).sovereignClaim !== a.faction || cellHoldings(next).some(h => state.holdings[h.id].controller !== a.faction))) continue;
        const effort = distance.get(current) + edgeHours(a, edge);
        if (effort < (distance.get(next) ?? Infinity)) { distance.set(next, effort); previous.set(next, current); open.add(next); }
      }
    }
    if (!distance.has(to)) return { ok: false, reason: 'No permitted land route. Check rivers, the White Bridge and peaceful passage.' };
    const route = []; for (let at = to; at !== a.cellId; at = previous.get(at)) route.unshift(at);
    return { ok: true, route, hours: distance.get(to) };
  }
  function previewMarch(id, target) {
    const a = army(id), to = targetCell(target); const result = routeFor(a, to);
    if (!result.ok) return result;
    const legs = result.route.map((next, i) => { const edge = edges.get(strategicEdgeId(i ? result.route[i - 1] : a.cellId, next)); return { ...edge, to: next, hours: edgeHours(a, edge) }; });
    const supplyCost = Math.ceil(result.hours * 1.2), warnings = [];
    if (supplyCost > a.supplies) warnings.push('Carried supplies will run out before arrival. Resupply or shorten the march.');
    if (result.route.some(id => state.armies.some(other => other.id !== a.id && other.cellId === id))) warnings.push('An opposing army lies on this route; marching pauses for its battle.');
    return { ...result, target: to, legs, supplyCost, suppliesAfter: Math.max(0, a.supplies - supplyCost), permissions: [], warnings };
  }
  function supplyStatus(id) {
    const a = army(id); if (!a) return { ok: false, reason: 'Unknown army.' };
    const sources = cellHoldings(a.cellId).filter(h => state.holdings[h.id].controller === a.faction && ['city', 'town', 'farm', 'camp'].includes(h.kind));
    if (!sources.length) return { ok: false, reason: a.faction === 'yunethre' ? 'Return to Bane\u2019s Camp for pasture, food and remount gear.' : 'Resupply at Minora or a friendly Caricas town or farm.' };
    const home = holding(a.homeId), homeState = state.holdings[home.id];
    if (homeState.controller !== a.faction) return { ok: false, reason: 'The home supply base is no longer friendly.' };
    if (a.faction === 'yunethre' && !sources.some(h => h.id === campId)) return { ok: false, reason: 'The centaur band replenishes at its own camp.' };
    if (a.faction === 'empire' && a.cellId !== home.cellId) {
      if (!state.bridgeOpen || state.holdings[bridgeId].controller !== a.faction) return { ok: false, reason: 'The White Bridge supply link is interrupted.' };
      const route = routeFor(a, home.cellId, { supply: true }); if (!route.ok) return { ok: false, reason: 'Enemy control cuts the route back to Minora.' };
    }
    const source = sources.find(h => state.holdings[h.id].reserves.food > 0);
    return source ? { ok: true, source: source.id, name: source.name, food: state.holdings[source.id].reserves.food } : { ok: false, reason: 'The local food reserve is empty.' };
  }
  function order(id, command) {
    const a = army(id); if (!a || !command || !orderTypes.includes(command.type)) return { ok: false, reason: 'Unknown army or order.' };
    if (state.pendingBattle) return { ok: false, reason: 'Resolve the pending battle before changing orders.' };
    if (a.strength <= 0) return { ok: false, reason: 'This force must recover at its base.' };
    const type = command.type;
    if (type === 'hold') { a.order = emptyOrder(); note(`${a.name} holds position.`); return { ok: true }; }
    if (type === 'resupply') { const supply = supplyStatus(id); if (!supply.ok) return supply; a.order = { ...emptyOrder(), type, target: supply.source }; note(`${a.name} resupplies at ${supply.name}.`); return { ok: true }; }
    const target = type === 'retreat' ? a.homeId : command.target;
    const h = holding(target);
    if (type === 'raid' && (!h || h.reservedStory || h.neutral || state.holdings[h.id].controller === a.faction)) return { ok: false, reason: 'Raid an opposing unreserved holding; the neutral town and Minora are protected.' };
    const preview = previewMarch(id, target); if (!preview.ok) return preview;
    a.order = { ...emptyOrder(), type, target, route: [...preview.route] };
    note(`${a.name}: ${type} toward ${h?.name ?? cells.get(preview.target).region}.`);
    emit('strategic-order', { armyId: id, order: clone(a.order) }); return { ok: true, ...preview };
  }
  function setPassage(id, granted) {
    const a = army(id); if (!a || typeof granted !== 'boolean' || state.pendingBattle) return { ok: false };
    a.passage = granted; note(`${a.name}: peaceful free-town passage ${granted ? 'granted for this test' : 'withdrawn'}.`); return { ok: true };
  }
  const power = a => a.strength * (.35 + .65 * a.morale / 100) * (.6 + .4 * a.supplies / 100);
  function checkBattle(mover) {
    const opponent = state.armies.find(a => a.id !== mover.id && hostile(a.faction, mover.faction) && a.cellId === mover.cellId);
    if (!opponent || state.pendingBattle || cellHoldings(mover.cellId).some(h => h.reservedStory)) return false;
    const imperial = army('imperial-field-force'), centaur = army('centaur-band'), cell = cells.get(mover.cellId);
    const at = cellHoldings(cell.id).find(h => h.kind === 'bridge')?.at ?? { x: cell.x, z: cell.z };
    state.pendingBattle = { id: `frontier-battle-${state.nextBattle++}`, cellId: cell.id, at: { ...at }, attacker: mover.id, defender: opponent.id, startedAt: state.hour,
      previewOutcome: power(imperial) >= power(centaur) ? 'imperial-victory' : 'centaur-victory' };
    note('The two forces meet. Strategic time pauses for one adventure battle.'); emit('strategic-battle-pending', { battle: clone(state.pendingBattle) }); return true;
  }
  function updateObjective() {
    if (state.objective.status === 'complete') return;
    if (state.objective.battleWon && state.bridgeOpen && state.holdings[bridgeId].controller === 'empire' && state.holdings['caricas-garrison-town'].controller === 'empire') {
      state.objective.status = 'complete'; note('Frontier objective complete: the crossing and Caricas supply line are secured.'); emit('strategic-objective-complete');
    }
  }
  function raid(a, hours = 1) {
    const h = holding(a.order.target); if (!h || h.neutral || h.reservedStory) { a.order = emptyOrder(); return; }
    a.order.workHours += hours;
    if (a.order.workHours < 6) return;
    const held = state.holdings[h.id], taken = Math.min(25, held.reserves.food);
    held.reserves.food -= taken; a.supplies = Math.min(100, a.supplies + taken); held.localSupport = Math.max(0, held.localSupport - 15);
    held.controller = a.faction;
    if (h.id === bridgeId) { state.bridgeOpen = false; note('Raiding damaged the White Bridge. The Imperial supply link is cut.'); }
    note(`${a.name} takes control of ${h.name}; its sovereign claim is unchanged.`); a.order = emptyOrder(); emit('strategic-holding-control', { holdingId: h.id, controller: held.controller });
  }
  function marchHour(a) {
    let budget = 1;
    while (budget > .000001 && a.order.route.length) {
      const next = a.order.route[0], edge = edges.get(strategicEdgeId(a.cellId, next));
      if (!edge || edge.blocked || edge.bridge && !state.bridgeOpen || permission(a, next)) { note(`${a.name} stops: its route is no longer available.`); a.order = emptyOrder(); return; }
      const remaining = edgeHours(a, edge) - a.order.edgeProgress, step = Math.min(budget, remaining);
      a.order.edgeProgress += step; budget -= step;
      if (remaining <= step + .000001) {
        a.lastCellId = a.cellId; a.cellId = next; a.order.route.shift(); a.order.edgeProgress = 0;
        if (checkBattle(a)) return;
      }
    }
    if (!a.order.route.length) {
      if (a.order.type === 'raid') { if (budget > 0) raid(a, budget); }
      else { note(`${a.name} arrives and holds.`); a.order = emptyOrder(); }
    }
  }
  function advance(hours = 6) {
    if (![6, 24].includes(hours)) return { ok: false, reason: 'Advance by six hours or one day.' };
    if (state.pendingBattle) return { ok: false, reason: 'A pending adventure battle pauses strategic time.', advanced: 0 };
    let advanced = 0;
    for (; advanced < hours;) {
      state.hour++; advanced++;
      for (const a of state.armies) {
        a.supplies = Math.max(0, a.supplies - (['march', 'raid', 'retreat'].includes(a.order.type) ? 1.2 : .6));
        if (a.supplies === 0) a.morale = Math.max(0, a.morale - 2);
        if (a.order.type === 'resupply') {
          const supply = supplyStatus(a.id);
          if (!supply.ok) { note(`${a.name} cannot resupply: ${supply.reason}`); a.order = emptyOrder(); }
          else { const amount = Math.min(10, 100 - a.supplies, state.holdings[supply.source].reserves.food); state.holdings[supply.source].reserves.food -= amount; a.supplies += amount; a.morale = Math.min(100, a.morale + 2); if (a.supplies >= 100) a.order = emptyOrder(); }
        } else if (a.order.type === 'hold') a.morale = Math.min(100, a.morale + (a.supplies > 20 ? .25 : 0));
        else marchHour(a);
        if (state.pendingBattle) break;
      }
      if (state.hour % 24 === 0) for (const h of STRATEGIC_HOLDINGS) if (['farm', 'camp'].includes(h.kind)) state.holdings[h.id].reserves.food = Math.min(300, state.holdings[h.id].reserves.food + 12);
      updateObjective(); if (state.pendingBattle) break;
    }
    emit('strategic-time', { advanced }); return { ok: true, advanced, pendingBattle: clone(state.pendingBattle) };
  }
  function withdraw(a, battlefield) {
    const home = holding(a.homeId), candidates = STRATEGIC_NEIGHBORS[battlefield].filter(id => {
      const edge = edges.get(strategicEdgeId(battlefield, id)); return !edge.blocked && (!edge.bridge || state.bridgeOpen) && !permission(a, id)
        && !state.armies.some(other => other.id !== a.id && other.cellId === id);
    });
    const last = candidates.includes(a.lastCellId) ? a.lastCellId : candidates.sort((l, r) => {
      const c = cells.get(l), d = cells.get(r); return Math.hypot(c.x - home.at.x, c.z - home.at.z) - Math.hypot(d.x - home.at.x, d.z - home.at.z);
    })[0];
    if (last) { a.cellId = last; a.lastCellId = battlefield; }
    a.order = emptyOrder(); const route = routeFor(a, home.cellId, { avoidEnemy: true });
    if (route.ok) a.order = { ...emptyOrder(), type: 'retreat', target: a.homeId, route: route.route };
  }
  function resolveAdventureBattle(id, outcome) {
    if (!['imperial-victory', 'centaur-victory', 'retreat'].includes(outcome)) return { ok: false, reason: 'Unknown battle outcome.' };
    if (state.resolvedBattles.some(b => b.id === id)) return { ok: false, duplicate: true, reason: 'This battle has already been reconciled.' };
    const battle = state.pendingBattle; if (!battle || battle.id !== id) return { ok: false, reason: 'No matching pending battle.' };
    const winner = army(outcome === 'imperial-victory' ? 'imperial-field-force' : 'centaur-band'), loser = state.armies.find(a => a.id !== winner.id);
    state.pendingBattle = null;
    winner.strength = Math.max(1, winner.strength - 8); winner.morale = Math.min(100, winner.morale + 5); winner.order = emptyOrder();
    loser.strength = Math.max(10, loser.strength - (outcome === 'retreat' ? 12 : 30)); loser.morale = Math.max(5, loser.morale - 20); withdraw(loser, battle.cellId);
    for (const h of cellHoldings(battle.cellId)) if (!h.reservedStory && !h.neutral) state.holdings[h.id].controller = winner.faction;
    if (outcome === 'imperial-victory') state.objective.battleWon = true;
    state.resolvedBattles.push({ id, outcome, hour: state.hour }); note(`Adventure result: ${outcome.replaceAll('-', ' ')}. Applied once to ${id}.`);
    updateObjective(); emit('strategic-battle-resolved', { id, outcome }); return { ok: true };
  }
  function resolveAdventureAction(id, action) {
    if (typeof id !== 'string' || !id || id.length > 100 || action !== 'repair-bridge') return { ok: false };
    if (state.adventureEffects.includes(id)) return { ok: false, duplicate: true };
    if (state.pendingBattle || state.holdings[bridgeId].controller !== 'empire') return { ok: false, reason: 'Secure the bridge before repairing its supply connection.' };
    state.bridgeOpen = true; state.adventureEffects.push(id); note('The repaired White Bridge reconnects the Imperial supply route.'); updateObjective(); emit('strategic-bridge-repaired', { id }); return { ok: true };
  }
  function view() {
    return { ...clone(state), title: 'The Minora frontier', prototype: true, balanceNote: 'Test balance values; no canonical army sizes or political outcomes.',
      regions: STRATEGIC_REGIONS, factions: STRATEGIC_FACTIONS, cells: STRATEGIC_CELLS.map(c => ({ ...c, neighbors: STRATEGIC_NEIGHBORS[c.id] })), edges: STRATEGIC_EDGES,
      rivers: STRATEGIC_RIVERS, bounds: STRATEGIC_BOUNDS,
      holdings: STRATEGIC_HOLDINGS.map(h => ({ ...clone(h), ...clone(state.holdings[h.id]) })),
      armies: state.armies.map(a => { const from = cells.get(a.cellId), next = cells.get(a.order.route[0]), edge = next && edges.get(strategicEdgeId(a.cellId, next.id));
        const t = edge ? Math.min(1, a.order.edgeProgress / edgeHours(a, edge)) : 0;
        return { ...clone(a), at: { x: from.x + ((next?.x ?? from.x) - from.x) * t, z: from.z + ((next?.z ?? from.z) - from.z) * t }, supply: supplyStatus(a.id) }; }),
      objective: { ...clone(state.objective), title: 'Secure the frontier crossing', detail: 'Meet the raiding band, win a battle personally or on the chart, and keep the White Bridge supply connection and Caricas town under Imperial control.' },
      ledger: Object.fromEntries(['empire', 'yunethre', 'neutral'].map(faction => [faction, STRATEGIC_HOLDINGS.reduce((sum, h) => { const held = state.holdings[h.id]; if (held.controller === faction) { sum.food += held.reserves.food; sum.coins += held.reserves.coins; } return sum; }, { food: 0, coins: 0 })])),
    };
  }
  function restore(value) { if (!validateStrategicPrototype(value)) return false; state = clone(value); return true; }
  function reset() { state = fresh(); order('centaur-band', { type: 'raid', target: bridgeId }); return view(); }
  reset();
  return { view, snapshot: () => clone(state), restore, reset, previewMarch, order, advance, supplyStatus, setPassage, resolveAdventureBattle, resolveAdventureAction };
}

/** Separate optional session store; never attach this to a road checkpoint. */
export function createStrategicPrototypeStore(storage, key = STRATEGIC_SAVE_KEY) {
  return {
    save(model) { const value = model.snapshot(); if (!validateStrategicPrototype(value)) return { ok: false }; try { storage.setItem(key, JSON.stringify(value)); return { ok: true }; } catch { return { ok: false }; } },
    load(model) { try { const raw = storage.getItem(key); return raw ? { ok: model.restore(JSON.parse(raw)) } : { ok: false, missing: true }; } catch { return { ok: false }; } },
    clear() { try { storage.removeItem(key); return true; } catch { return false; } },
  };
}
