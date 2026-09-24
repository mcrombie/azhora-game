import { INVENTORY_ITEMS } from './inventory.js';
import { createCorpses, corpseId, corpseLoot } from './corpses.js';
import { createCorpseView } from './corpse-view.js';

export const CORPSE_VIEW_REACH = 150;

const label = body => body.status === 'unconscious' ? `${body.name} · unconscious` : `${body.name} · ${body.phase === 'fresh' ? 'body' : body.phase}`;
const appearance = (person, ally = false) => ({
  role: person.role ?? (person.kind === 'officer' ? 'legion-officer' : person.kind === 'soldier' ? person.look === 'legion' ? 'legion-soldier' : 'suvali-guard'
    : person.kind === 'rebel' ? 'forest-woodcutter' : ally ? person.kind === 'officer' ? 'legion-officer' : 'legion-soldier' : 'traveler'),
  ...(person.model ?? {}), armed: person.armed !== false,
});

export function createCorpseHost({ scene, world, inventory, getPosition = () => null,
  openDialogue = () => {}, closeDialogue = () => {}, toast = () => {}, onChange = () => {}, onLoot = () => {},
  isSettlement = () => false, getNpc = () => null, ownsCompanionWeapon = () => false,
  view: providedView = undefined } = {}) {
  const view = providedView ?? (scene && world ? createCorpseView(scene, world) : null);
  const model = createCorpses({ onEvent(event) {
    if (event.type === 'body-cleared' && event.nearby) toast(event.message, 'THE FALLEN');
    if (event.type === 'body-looted') onLoot(event);
    onChange(event);
  } });
  const withinView = body => { const p = getPosition(); return !p || Math.hypot(body.x - p.x, body.z - p.z) <= CORPSE_VIEW_REACH; };
  const visibleBodies = () => model.list({ position: getPosition(), reach: CORPSE_VIEW_REACH });
  function captureCombat(person, { encounterId, ally = false, index = 0 } = {}, actor = null) {
    if (!person || person.hp > 0 || person.kind === 'dummy' || person.kind === 'sparring' || !encounterId) return false;
    const npc = getNpc(person.npcId ?? person.id);
    const id = corpseId({ id: person.id, npcId: npc?.id, encounterId, ally });
    const spec = { ...person, id, sourceId: person.id, npcId: npc?.id ?? null,
      name: person.name ?? (person.kind === 'wolf' ? 'Wolf' : person.kind === 'goblin' ? 'Goblin raider' : person.kind === 'rebel' ? 'Rebel ambusher' : 'Fallen fighter'),
      model: appearance(person, ally), variant: index, dead: !person.wounded && npc?.corpseDead !== false, settlement: !!isSettlement(person),
      loot: corpseLoot(person).filter(item => !(ownsCompanionWeapon(person.npcId ?? person.id) && INVENTORY_ITEMS[item.id].type === 'Weapon')) };
    if (!model.has(id)) model.add(spec);
    const body = model.get(id); if (!body) return false;
    if (actor) {
      if (!body.removed && withinView(body)) view?.adopt(body, actor);
      else { actor.group.removeFromParent(); view?.release?.(body.id); }
    }
    return true;
  }
  function combatEvent(event, state) {
    const ally = ['ally-down', 'ally-wounded'].includes(event.type);
    if (!ally && event.type !== 'enemy-defeated') return false;
    const people = ally ? state.allies : state.enemies;
    const index = people.findIndex(person => person.id === event.id);
    return index >= 0 && captureCombat(people[index], { encounterId: state.encounterId, ally, index });
  }
  function captureNpc(payload) {
    const sourceId = payload.npcId ?? payload.id, npc = getNpc(sourceId) ?? payload;
    const position = payload.position ?? payload;
    const id = corpseId({ npcId: sourceId });
    if (model.get(id)?.status === 'unconscious' && payload.dead !== false) model.revive(sourceId);
    const kind = payload.kind && !['dead', 'downed', 'alive'].includes(payload.kind) ? payload.kind
      : npc.kind ?? (npc.ogre ? 'ogre' : npc.dog ? 'dog' : npc.cat ? 'cat' : 'person');
    const person = { ...npc, ...payload, kind, model: payload.model ?? npc.model ?? { role: npc.modelRole ?? npc.id, tunic: npc.color ?? npc.tunic, skin: npc.skin, look: npc.look }, armed: !!npc.armed };
    // Undefined optional properties are omitted by serialization before validation.
    const bodyModel = JSON.parse(JSON.stringify(appearance(person)));
    return model.add({ id, sourceId, npcId: sourceId, name: npc.name ?? payload.name ?? sourceId,
      kind, x: position.x, z: position.z,
      yaw: payload.yaw ?? npc.yaw ?? 0, dead: payload.dead !== false, model: bodyModel,
      settlement: !!isSettlement(position), loot: corpseLoot(person).filter(item => !(ownsCompanionWeapon(sourceId) && INVENTORY_ITEMS[item.id].type === 'Weapon')) });
  }
  function interact(id = null) {
    const body = id ? model.get(id) : model.nearest(getPosition());
    if (!body || body.removed) return false;
    const at = getPosition(); if (!at || Math.hypot(at.x - body.x, at.z - body.z) > 3) return false;
    const lines = body.status === 'unconscious' ? ['Still breathing. They are unconscious and will recover. Leave their belongings alone.']
      : [body.phase === 'covered' ? 'The settlement watch has covered the body and will collect it soon.'
        : body.phase === 'remains' ? 'Weather and scavengers have left scattered, weathered remains.'
          : body.phase === 'weathered' ? 'The body is weathered after its time in the open.' : 'The body lies where it fell.',
      body.loot.length ? `You find: ${body.loot.map(item => `${INVENTORY_ITEMS[item.id].name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ')}.` : 'The body has already been searched. Nothing remains to take.',
      body.settlement ? 'The watch collects bodies after fifteen minutes spent on the road.' : 'In the wild, remains weather and decay over an hour spent on the road.'];
    const choices = [];
    if (body.lootable) choices.push({ id: 'loot-body', label: 'Take what I can carry', action() {
      const result = model.loot(body.id, inventory); closeDialogue();
      toast(result.ok ? `Taken: ${result.items.map(item => `${INVENTORY_ITEMS[item.id].name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ')}.${result.remaining.length ? ' Equipment you already carry remains on the body.' : ''}` : result.reason, 'SEARCHING THE FALLEN');
    } });
    choices.push({ id: 'leave-body', label: 'Leave them in peace', action: closeDialogue });
    openDialogue({ id: body.id, name: label(body), role: 'The fallen' }, lines, choices); return true;
  }
  return { model, view, captureCombat, combatEvent, captureNpc, interact,
    reviveNpc(id) { const changed = model.revive(typeof id === 'string' ? id : id.npcId ?? id.id); if (changed) view?.update(visibleBodies()); return changed; },
    update(dt, time = 0, { playing = true } = {}) { if (playing) model.update(dt, getPosition()); view?.update(visibleBodies(), time); },
    nearest: () => model.nearest(getPosition()),
    points: () => model.list().map(body => ({ id: body.id, x: body.x, z: body.z, name: label(body), kind: 'corpse', lootable: body.lootable })),
    // A cleared dead NPC remains dead. Legacy authored lying models must not
    // reappear when the body renderer finishes cleanup.
    ownsNpc: id => model.has(`npc:${id}`),
    snapshot: model.snapshot,
    restore(data) { if (!model.restore(data)) return false; view?.clear(); view?.update(visibleBodies()); return true; },
  };
}
