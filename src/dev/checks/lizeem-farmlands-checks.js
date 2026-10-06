/**
 * **The Farmlands of the Lizeem: the playtest** (every named quest gets an F8 card; the user's rule,
 * docs/lizeem-farmlands-design.md appendix). It walks the Caricas arc in the running game through the
 * people's real conversations and the real farm, from Taleth's charge to *Call the Dew*, with only the
 * crop clock accelerated, and then proves a reload pays nothing twice.
 *
 * Two things are put in the satchel rather than made: seed, which Portunus and Consus sell, and the
 * tart, which the kitchen bakes (src/gameplay/skills/crafting/cooking.js has its own checks). The fixture also supplies
 * Fire Making after verifying that Pomona refuses to record the recipe without it; Lee Anne has a separate playtest.
 *
 * The F8 card and the `--lizeem-farmlands-checks` smoke flag are the host's (src/main.js, index.html,
 * main.cjs); this module is the driver they call, as src/dev/checks/sunflower-checks.js is. Hooks:
 *   farmlands, farming, inventory, skills, magic, npcById, world, placeHands() (the host's placeLizeemHands),
 *   prepare(), visit(id), choose(id), finish(), close(), frames(n), advancePlay(seconds),
 *   getState() -> { playSeconds, frameErrors }, snapshot(), restore(snapshot), marker(id) -> { visible, kind },
 *   and optionally saved(), capture(name), present().
 */
import { createFarming } from '../../gameplay/skills/farming/farming.js';
import { canStand } from '../../gameplay/movement/game-state.js';
import { LIZEEM_ROLES, LIZEEM_XP, NORTH_BEDS, CARICAS_BEDS, TALETH_ID, TART_ITEM, CALL_THE_DEW } from '../../content/quests/lizeem-farmlands/lizeem-farmlands.js';
import { LIZEEM_PEOPLE } from '../../content/quests/lizeem-farmlands/lizeem-people.js';

export const LIZEEM_FARMLANDS_PLAYTEST = Object.freeze({
  id: 'lizeem-farmlands', button: 'test-lizeem-farmlands', grade: 'skill',
  title: 'Taleth', description: 'The Farmlands of the Lizeem · Caricas and Call the Dew',
});

export async function runLizeemFarmlandsChecks(h) {
  const checks = [], started = performance.now();
  const assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const q = h.farmlands, arc = () => q.caricas, now = () => h.getState().playSeconds;
  const talk = async (id, choice) => { await h.close(); await h.visit(id); await h.finish(); if (choice) { await h.choose(choice); await h.finish(); } await h.close(); };
  const normal = h.saved?.();
  await h.prepare?.();
  q.restore(undefined); h.farming.restore(createFarming().snapshot()); h.placeHands();
  h.inventory.add('bridge-rye-seed', 8); h.inventory.add('field-beans-seed', 4);
  await h.frames(2);

  for (const person of LIZEEM_PEOPLE) {
    const npc = h.npcById.get(person.id);
    assert(npc, `${person.name} is stood up`);
    const at = npc.actor.group.position;
    assert(Math.hypot(at.x - person.x, at.z - person.z) < 1, `${person.name} stands at the declared stand`);
    assert(canStand(person.x, person.z, h.world, .45), `${person.name} has footing`);
  }
  assert(h.npcById.get(LIZEEM_ROLES.messor).hidden === true, 'Messor is not on the farms before Caricas is restored');

  // Taleth's charge: his own conversation offers it (src/content/quests/lizeem-farmlands/taleth.js); the model is asked directly here.
  q.offer(); q.accept();
  await h.frames(2);
  assert(h.marker(LIZEEM_ROLES.egeria).visible && h.marker(LIZEEM_ROLES.egeria).kind === 'skill', 'Egeria wears the green book');
  await talk(LIZEEM_ROLES.egeria, 'lizeem-egeria-lease');
  assert(arc().stage === 'sowing' && arc().leased, 'Egeria lends the North Farm through her conversation');

  /** One round on the real farm: sow, water, wait, reap; the quest hears each reaping through `onHarvest`. */
  async function round(plan) {
    for (const [bed, crop] of plan) { assert(h.farming.sow(bed, crop, now()).ok, `${crop} is sown in ${bed}`); h.farming.water(bed, now()); }
    h.advancePlay(250); await h.frames(2);
    return plan.map(([bed]) => { const reaped = h.farming.harvest(bed, now()); assert(reaped.ok, `${bed} is reaped`); return reaped; });
  }
  const [b1, b2, b3] = NORTH_BEDS;
  const rye = h.inventory.count('bridge-rye') + h.inventory.count('bridge-rye-fine');
  const first = await round([[b1, 'bridge-rye'], [b2, 'bridge-rye'], [b3, 'field-beans']]);
  assert(q.shares.holderTaken > 0 && first.some(reaped => reaped.taken > 0), 'The holder’s quarter is taken at the harvest');
  assert(h.inventory.count('bridge-rye') + h.inventory.count('bridge-rye-fine') - rye === first.slice(0, 2).reduce((sum, reaped) => sum + reaped.count, 0),
    'What the holder takes never reaches the satchel');
  await round([[b1, 'field-beans']]);
  assert(arc().stage === 'swap', 'Two beds of each, over two rounds on the three North beds');
  await round([[b1, 'bridge-rye']]);
  assert(arc().stage === 'claim', 'Rye where the beans grew is the swap');

  await talk(LIZEEM_ROLES.hagen, 'lizeem-hagen-hand');
  assert(arc().claim === 'handed' && arc().stage === 'fine', 'Hagen takes the tenth through his conversation');
  // Fine rye: fair, fresh ground and a watered bed, at the level the lumps have already paid for.
  for (const bed of CARICAS_BEDS.filter(id => !NORTH_BEDS.includes(id)).slice(0, 4)) {
    if (arc().stage !== 'fine') break;
    await round([[bed, 'bridge-rye']]);
  }
  assert(arc().stage === 'tart', 'Fine rye from Caricas closes the step');

  await talk(LIZEEM_ROLES.pomona, 'lizeem-pomona-tart');
  assert(!arc().taught.includes(TART_ITEM) && !h.cooking.knows(TART_ITEM),
    'Pomona does not record a recipe before the cooking prerequisite is met');
  // This focused quest fixture starts without Lee Anne's lesson. Supply that prerequisite,
  // then retry the actual conversation; the fire lesson has its own native playtest.
  h.skills.learn('firemaking', { announce: false });
  await talk(LIZEEM_ROLES.pomona, 'lizeem-pomona-tart');
  assert(arc().taught.includes(TART_ITEM) && h.cooking.knows(TART_ITEM),
    'Pomona teaches and records the tart after Fire Making and the rested ground');
  h.inventory.add(TART_ITEM, 1);
  await talk(LIZEEM_ROLES.consus, 'lizeem-consus-seal');
  assert(arc().stage === 'carry', 'Consus seals the tart at the grain court');

  const before = h.skills.xp('farming');
  await talk(TALETH_ID, 'lizeem-deliver-tart');
  assert(arc().stage === 'done', 'Taleth takes the sealed tart');
  assert(h.magic.known(CALL_THE_DEW), 'Taleth teaches Call the Dew');
  assert(h.skills.xp('farming') === before + LIZEEM_XP.done, 'The arc’s end pays its lump once');
  await h.frames(2);
  assert(!h.npcById.get(LIZEEM_ROLES.messor).hidden, 'Messor is back on the North Farm');
  await talk(LIZEEM_ROLES.messor, 'lizeem-messor-hire');
  assert(arc().hired.includes('messor'), 'Messor can be hired');
  await h.capture?.('lizeem-caricas-restored');

  const done = h.snapshot(), earned = h.skills.xp('farming');
  await h.restore(done); await h.frames(2);
  assert(h.farmlands.caricas.stage === 'done' && h.skills.xp('farming') === earned && !h.farmlands.deliver(),
    'Reloading the restored country pays nothing again');
  if (h.saved) assert(h.saved() === normal, 'The playtest never changes the normal adventure checkpoint');
  assert(!h.getState().frameErrors?.count, 'The arc completes without renderer errors');
  await h.present?.();
  return { lizeemFarmlandsChecks: checks.length, checks, elapsedMs: Math.round(performance.now() - started) };
}
