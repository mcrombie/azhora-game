import { canStand } from './game-state.js';
import { BODY } from './bodies.js';
import { KAYLA } from './kayla.js';

const copy = value => JSON.parse(JSON.stringify(value));
const accepted = result => result === true || result?.ok === true;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Native integration: use the real dialogue button, assault callback, combat
 * event pipeline and checkpoint serializer. prepare/step isolate the ordinary
 * render loop while retaining the actual game objects and authored world. */
export async function runKaylaChecks(h) {
  const checks = [];
  const check = (value, label) => { if (!value) throw new Error(`Kayla: ${label}`); checks.push(label); };
  const player = h.player.group?.position ?? h.player.position ?? h.player;
  const bodies = h.corpses.model ?? h.corpses;
  const render = () => h.frames(2);
  const step = async seconds => { await h.step(seconds); };
  function approach() {
    const at = h.host.model.position;
    const offsets = [[0, 2.1], [2.1, 0], [-2.1, 0], [0, -2.1], [1.5, 1.5], [-1.5, 1.5]];
    const point = offsets.map(([x, z]) => ({ x: at.x + x, z: at.z + z }))
      .find(p => canStand(p.x, p.z, h.world, BODY.traveler));
    if (!point) throw new Error('Kayla: no clear approach to her authored road position');
    player.x = point.x; player.z = point.z; player.y = h.world.heightAt(point.x, point.z);
  }
  async function choose(id) {
    for (let page = 0; page < 12 && !document.querySelector(`[data-choice="${id}"]`); page++) h.nextSpeech();
    const button = document.querySelector(`[data-choice="${id}"]`);
    check(button && !button.disabled, `The visible ${id} choice is available`);
    button.click(); await render();
  }
  async function load(saved) {
    h.closeDialogue(); h.combat.revive();
    await h.restore(copy(saved)); await render();
  }

  await h.prepare(); approach(); await render();
  const originalActor = h.npc.actor;
  await step(.5);
  check(h.combat.state.phase === 'peaceful' && !h.host.state().provoked && h.crime.health(KAYLA.id).hp === 450,
    'Standing beside Kayla is peaceful and she has her own full health');
  check(h.npc.actor === originalActor && h.npc.actor.group.visible && distance(h.npc.actor.group.position, h.host.model.position) < .01,
    'One visible bear occupies her roaming position');

  h.inventory.add('honeycomb', 1);
  const honeyBefore = h.inventory.count('honeycomb'), giftsBefore = h.host.model.state().gifts;
  h.conversation(h.npc); await render();
  check(h.host.model.state().met && document.getElementById('speaker')?.textContent === KAYLA.name,
    'The ordinary conversation opens with Kayla');
  await choose('kayla-give-honey'); h.closeDialogue();
  check(h.inventory.count('honeycomb') === honeyBefore - 1 && h.host.model.state().gifts === giftsBefore + 1
    && h.host.model.state().honey > 0 && h.combat.state.phase === 'peaceful',
  'Her honey gift consumes exactly one comb and leaves the meeting peaceful');

  const saved = copy(h.snapshot());
  check(accepted(h.validate(saved)), 'The complete game checkpoint accepts Kayla and her gift');
  const corrupt = copy(saved); corrupt.kayla.next = -1;
  check(!accepted(h.validate(corrupt)), 'An invalid Kayla route cursor rejects the checkpoint');
  const storedKayla = copy(saved.kayla);
  await load(saved);
  check(h.host.model.state().gifts === storedKayla.gifts && distance(h.host.model.position, storedKayla.position) < .001
    && h.crime.health(KAYLA.id).hp === 450, 'Loading restores her gift, position and health');

  approach();
  const hit = h.crime.assault({ npcId: KAYLA.id, damage: 12, source: 'player' });
  await step(.1);
  const enemy = h.combat.state.enemies.find(one => one.id === KAYLA.id);
  check(hit.ok && h.host.state().fighting && h.combat.state.phase === 'active' && enemy?.kind === 'bear'
    && enemy.hp === 438 && enemy.maxHp === 450 && h.combat.state.enemies.filter(one => one.npcId === KAYLA.id).length === 1,
  'Striking the resident starts one real bear fight and preserves the injury');
  check(h.npc.actor === originalActor && h.npc.actor.group.visible && h.npc.actor.group.parent?.type === 'Scene', 'Combat draws the same named bear actor in the scene');
  // This strength check is explicitly solo; named companions have their own combat tests.
  h.combat.state.allies = [];
  h.combat.state.player.hp = Math.min(100, h.combat.state.player.maxHp);
  let defeatSeconds = 0;
  while (h.combat.state.player.hp > 0 && defeatSeconds < 12) { await step(.1); defeatSeconds += .1; }
  check(h.combat.state.phase === 'defeated' && h.combat.state.player.hp === 0 && defeatSeconds < 10,
    'An unguarded traveler quickly loses to Kayla');

  await load(saved); approach();
  check(h.crime.health(KAYLA.id).status === 'alive' && h.crime.health(KAYLA.id).hp === 450
    && h.combat.state.phase === 'peaceful' && !h.host.state().fighting,
  'Restoring the peaceful checkpoint clears the fight and restores the living resident');
  h.crime.assault({ npcId: KAYLA.id, damage: 12, source: 'player' }); await step(.1);
  h.combat.spellHit(KAYLA.id, 10000, { source: 'world', sourceId: 'kayla-smoke' });
  await step(.1); await render();
  const corpse = bodies.get(`npc:${KAYLA.id}`);
  check(h.crime.health(KAYLA.id).status === 'dead' && corpse?.kind === 'bear'
    && corpse.loot.some(item => item.id === 'honeycomb') && !h.npc.actor.group.visible,
  'Her death creates one persistent bear body with honeycomb and hides the living model');
  const deathSave = copy(h.snapshot());
  check(accepted(h.validate(deathSave)), 'Kayla and her corpse serialize together');
  await load(deathSave);
  check(h.crime.health(KAYLA.id).status === 'dead' && bodies.get(`npc:${KAYLA.id}`)?.kind === 'bear'
    && !h.npc.actor.group.visible, 'Reload keeps Kayla dead and reconstructs her bear corpse');
  await load(saved); approach(); await render();
  return { ok: true, checks, defeatSeconds: Math.round(defeatSeconds * 10) / 10,
    kayla: h.host.state(), corpseReload: true };
}
