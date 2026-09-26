import { INVENTORY_ITEMS } from './inventory.js';

// Only time actually played advances these stages. Closing the game does not
// silently consume the chance to return and search a body.
export const CORPSE_TIMING = Object.freeze({ townCover: 12 * 60, townClear: 15 * 60,
  weathered: 20 * 60, remains: 40 * 60, decay: 60 * 60, fade: 45 });
export const CORPSE_REACH = 2.4;
const clone = value => JSON.parse(JSON.stringify(value));
const text = (value, max = 100) => typeof value === 'string' && value.length > 0 && value.length <= max;
const idOK = id => text(id, 240) && /^[a-zA-Z0-9_:.-]+$/.test(id);
const number = value => Number.isFinite(value) && Math.abs(value) < 1e9;
const nonnegative = value => number(value) && value >= 0;
const itemOK = item => item && Object.hasOwn(INVENTORY_ITEMS, item.id) && Number.isSafeInteger(item.quantity)
  && item.quantity > 0 && item.quantity <= 10000 && (INVENTORY_ITEMS[item.id].stackable || item.quantity === 1);
const plainValue = (value, depth = 0) => depth < 4 && (value === null || typeof value === 'boolean'
  || number(value) || (typeof value === 'string' && value.length <= 100)
  || (Array.isArray(value) && value.length <= 20 && value.every(v => plainValue(v, depth + 1)))
  || (value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length <= 30
    && Object.entries(value).every(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k) && plainValue(v, depth + 1))));

/** NPC identities survive encounters; anonymous fighters are scoped to their battle. */
export function corpseId({ npcId, encounterId, id, ally = false }) {
  return npcId ? `npc:${npcId}` : `${ally ? 'ally' : 'enemy'}:${encounterId}:${id}`;
}

/** Real equipment where known; creature materials never become cooked provisions. */
export function corpseLoot(person = {}) {
  if (person.dead === false || person.wounded) return [];
  if (person.kind === 'bear') return [{ id: 'honeycomb', quantity: 1 }];
  if (person.kind === 'wolf') return [{ id: 'wolf-hide', quantity: 1 }];
  if (['dog', 'cat', 'bosco', 'horse', 'batman'].includes(person.kind)) return [{ id: 'animal-hide', quantity: person.kind === 'horse' || person.kind === 'batman' ? 2 : 1 }];
  if (person.kind === 'spider') return [{ id: 'spider-silk', quantity: 2 }];
  if (person.kind === 'ogre' || person.kind === 'troll') return [{ id: 'forest-stick', quantity: 3 }, { id: 'copper-piece', quantity: 5 }];
  const loot = [{ id: 'copper-piece', quantity: person.kind === 'soldier' ? 4 : person.kind === 'goblin' ? 2 : 1 }];
  const role = person.model?.role ?? person.role ?? '';
  const equipped = person.weapon ?? person.weaponId ?? person.model?.wields ?? person.model?.look?.weapon ?? person.look?.weapon;
  // `armed` means drawn in the character renderer. A guard with a sheathed
  // blade or grounded spear still owns that equipment when struck at rest.
  const weapon = equipped ?? (/archer/.test(`${person.kind} ${role}`) ? 'hunting-bow'
    : /officer/.test(`${person.kind} ${role}`) ? 'simple-sword'
      : /soldier|guard|legionary/.test(`${person.kind} ${role}`) ? 'ash-spear'
        : person.kind === 'rebel' ? 'simple-sword' : person.kind === 'goblin' ? 'long-dagger' : null);
  if (weapon && INVENTORY_ITEMS[weapon]?.type === 'Weapon') loot.push({ id: weapon, quantity: 1 });
  if (/soldier|guard|legionary|officer/.test(`${person.kind} ${role}`)) loot.push({ id: 'salvaged-metal', quantity: 2 });
  return loot;
}

export function corpsePhase(body, clock) {
  if (body.removed) return 'cleared';
  if (body.status === 'unconscious') return 'unconscious';
  const age = Math.max(0, clock - body.born);
  if (body.settlement) return age >= CORPSE_TIMING.townCover ? 'covered' : 'fresh';
  return age >= CORPSE_TIMING.remains ? 'remains' : age >= CORPSE_TIMING.weathered ? 'weathered' : 'fresh';
}

function recordOK(body, clock) {
  return body && idOK(body.id) && text(body.sourceId) && (body.npcId === null || text(body.npcId))
    && text(body.name) && text(body.kind, 40) && ['dead', 'unconscious'].includes(body.status)
    && number(body.x) && number(body.z) && number(body.yaw) && nonnegative(body.born) && body.born <= clock
    && typeof body.settlement === 'boolean' && typeof body.removed === 'boolean'
    && Number.isInteger(body.variant) && body.variant >= 0 && body.variant < 10000 && plainValue(body.model)
    && Array.isArray(body.loot) && body.loot.length <= 32 && body.loot.every(itemOK)
    && new Set(body.loot.map(item => item.id)).size === body.loot.length
    && (!body.removed || !body.loot.length) && (body.status !== 'unconscious' || !body.loot.length);
}

export function validateCorpsesSnapshot(data) {
  if (data === undefined) return true;
  return !!data && data.version === 1 && nonnegative(data.clock) && Array.isArray(data.bodies)
    && data.bodies.length <= 8192 && data.bodies.every(body => recordOK(body, data.clock))
    && new Set(data.bodies.map(body => body.id)).size === data.bodies.length;
}

export function createCorpses({ onEvent = () => {} } = {}) {
  let clock = 0;
  const bodies = new Map();
  let transferring = false;
  function view(body) {
    if (!body) return null;
    const age = Math.max(0, clock - body.born), phase = corpsePhase(body, clock);
    const expires = body.settlement ? CORPSE_TIMING.townClear : CORPSE_TIMING.decay;
    return { ...clone(body), age, phase, lootable: body.status === 'dead' && !body.removed && body.loot.length > 0,
      opacity: body.removed ? 0 : body.status === 'unconscious' ? 1 : Math.min(1, Math.max(0, (expires - age) / CORPSE_TIMING.fade)) };
  }
  function add(spec) {
    if (!spec || bodies.has(spec.id)) return false;
    const body = { id: spec.id, sourceId: spec.sourceId ?? spec.id, npcId: spec.npcId ?? null,
      name: spec.name ?? 'Fallen traveler', kind: spec.kind ?? 'person', status: spec.dead === false ? 'unconscious' : 'dead',
      x: spec.x, z: spec.z, yaw: spec.yaw ?? 0, born: clock, settlement: !!spec.settlement, removed: false,
      variant: spec.variant ?? 0, model: clone(spec.model ?? {}),
      loot: spec.dead === false ? [] : clone(spec.loot ?? corpseLoot(spec)) };
    if (!recordOK(body, clock)) return false;
    bodies.set(body.id, body); onEvent({ type: 'body-added', body: view(body) }); return true;
  }
  function update(dt, position = null) {
    if (!Number.isFinite(dt) || dt <= 0) return false;
    clock += Math.min(dt, 86400);
    let changed = false;
    for (const body of bodies.values()) {
      if (body.removed || body.status === 'unconscious') continue;
      const age = clock - body.born;
      if (age < (body.settlement ? CORPSE_TIMING.townClear : CORPSE_TIMING.decay)) continue;
      body.removed = true; body.loot = []; changed = true;
      const nearby = !!position && Math.hypot(position.x - body.x, position.z - body.z) <= 30;
      onEvent({ type: 'body-cleared', id: body.id, name: body.name, x: body.x, z: body.z, nearby,
        reason: body.settlement ? 'guards' : 'decay',
        message: body.settlement ? `The settlement watch has collected ${body.name}’s remains.`
          : `Weather and scavengers have scattered what remained of ${body.name}.` });
    }
    return changed;
  }
  function loot(id, inventory, itemId = null) {
    const body = bodies.get(id);
    if (transferring || !body || body.removed || body.status !== 'dead') return { ok: false, reason: 'This body cannot be searched.' };
    const entries = body.loot.filter(item => (!itemId || item.id === itemId) && (INVENTORY_ITEMS[item.id].stackable || !inventory?.has?.(item.id)));
    if (!entries.length) return { ok: false, reason: body.loot.length ? 'You already carry that equipment. It remains here.' : 'Nothing remains to take.' };
    // The inventory commits the complete basket before its source is consumed.
    transferring = true;
    try {
      const previousCounts = Object.fromEntries(entries.map(item => [item.id, inventory?.count?.(item.id) ?? 0]));
      if (!inventory?.addMany?.(clone(entries))) return { ok: false, reason: 'There is no room for these items. They remain here.' };
      const taken = new Set(entries.map(item => item.id)); body.loot = body.loot.filter(item => !taken.has(item.id));
      onEvent({ type: 'body-looted', id, body: view(body), items: clone(entries), previousCounts });
      return { ok: true, items: clone(entries), remaining: clone(body.loot) };
    } finally { transferring = false; }
  }
  function revive(npcId) {
    const id = `npc:${npcId}`, body = bodies.get(id);
    if (!body || body.status !== 'unconscious') return false;
    bodies.delete(id); onEvent({ type: 'body-recovered', id, npcId }); return true;
  }
  function nearest(position, reach = CORPSE_REACH) {
    if (!position || !number(position.x) || !number(position.z)) return null;
    return [...bodies.values()].filter(body => !body.removed).map(body => ({ ...view(body), away: Math.hypot(body.x - position.x, body.z - position.z) }))
      .filter(body => body.away <= reach).sort((a, b) => Number(b.lootable) - Number(a.lootable) || a.away - b.away || a.id.localeCompare(b.id))[0] ?? null;
  }
  return { add, update, loot, revive, nearest, get: id => view(bodies.get(id)), has: id => bodies.has(id),
    list: ({ position = null, reach = Infinity } = {}) => [...bodies.values()]
      .filter(body => !body.removed && (!position || Math.hypot(body.x - position.x, body.z - position.z) <= reach)).map(view),
    snapshot: () => ({ version: 1, clock, bodies: [...bodies.values()].map(clone) }),
    restore(data) {
      if (data === undefined) data = { version: 1, clock: 0, bodies: [] };
      if (!validateCorpsesSnapshot(data)) return false;
      clock = data.clock; bodies.clear(); for (const body of data.bodies) bodies.set(body.id, clone(body)); return true;
    },
    get clock() { return clock; } };
}
