import { FARMER, FARM_ROWS, CROPS, WATERED_GROWTH } from './farming.js';
import { JEAN_SHEEP } from './animal-husbandry.js';
import { GLUN_WOOD_LESSON } from './glun-woodcutting.js';
import { ACTING_XP } from './acting.js';
import { SANDWICH_ITEM } from './roadside-lessons.js';
import { createBorderChapter } from './border-chapter.js';

/** Native-renderer checks in an isolated testing profile. Teaching, planting,
 * cooking, eating and expressions use actual dialogue/inventory/key controls.
 * Only the farm's long growth wait uses a clock seam, never a crop-state edit.
 *
 * Hooks: prepare(), visit(id), choose(id), finish(), close(), frames(n), tap(code),
 * warp(x,z), advancePlay(seconds), snapshot(), restore(save), getState(),
 * marker(id)->{visible,kind}, livestock()->live creature records, npcById,
 * player, combat, inventory, skills, farming, cooking, birding, husbandry,
 * acting, glunWood, wood, border. Optional refreshPopulation(), notify(result).
 * visit supports NPCs, commons-row-1/2, commons-fire and village-fire; non-NPC
 * visits must open the ordinary F interaction, not call a model action.
 * finish advances all speech pages and its final action, stopping at choices.
 * prepare resets to Chapter 1, before Jojo's letter, with untaught road skills.
 */
export async function runRoadSkillsChecks(h) {
  if (h.onlyGlun) return runGlunWoodChecks(h);
  const checks = [], failures = [], skipped = [];
  const assert = (value, message) => {
    if (!value) throw new Error(message);
    checks.push(message);
  };
  const started = performance.now(), limit = 57000;
  const left = () => limit - (performance.now() - started);
  const tap = code => h.tap ? h.tap(code) : h.keys.tap(code);
  const close = async () => { await h.close(); await h.frames(1); };
  const visit = async id => { await close(); await h.visit(id); await h.finish(); };
  const choose = async id => { await h.choose(id); await h.finish(); };
  const state = () => h.getState();
  const clock = () => state().playSeconds ?? h.snapshot().playSeconds;
  const health = () => h.combat.state.player.hp;
  const count = id => h.inventory.count(id);
  const taught = id => h.skills.taught(id);
  const healthy = () => {
    const errors = state().frameErrors;
    assert(!errors?.count, `No renderer error (${errors?.first?.message ?? 'none'})`);
  };
  const run = async (name, action) => {
    try { await action(); healthy(); h.notify?.({ name, ok: true }); }
    catch (error) {
      failures.push({ name, message: error?.message ?? String(error) });
      h.notify?.({ name, ok: false, message: failures.at(-1).message });
      await h.close();
    }
  };
  const until = async (condition, message, maximum = 10000, tick = null) => {
    const deadline = performance.now() + Math.min(maximum, Math.max(0, left() - 1200));
    while (!condition()) {
      if (performance.now() >= deadline) throw new Error(message);
      await tick?.(); await h.frames(2);
    }
  };
  const greenTeacher = id => {
    const marker = h.marker(id);
    assert(marker?.visible && marker.kind === 'skill', `${id} has a visible skill-teacher marker`);
  };
  const eat = async (id, healing) => {
    await close(); h.combat.state.player.hp = 40;
    tap('KeyI'); await h.frames(1);
    const item = document.querySelector(`[data-item-id="${id}"]`);
    assert(item && !item.disabled, `${id} is selectable in the actual satchel`);
    item.click();
    const button = document.querySelector(`#inventory-detail [data-consume="${id}"]`);
    assert(button && !button.disabled, `${id} has an enabled Eat control`);
    const before = count(id); button.click();
    assert(health() === 40 + healing && count(id) === before - 1,
      `Eating ${id} restores ${healing} health and consumes exactly one`);
    tap('KeyI'); await h.frames(1);
  };

  await h.prepare(); await h.frames(2);
  // The separate Fire Making check exercises Jojo's full walk and the first
  // lighting. This broad suite begins with that prerequisite already learned.
  h.fireMaking.restore(undefined, { legacyCooking: true });
  await run('Jojo: welcome, marker and cooking', async () => {
    assert(!taught('cooking') && !count(SANDWICH_ITEM), 'Fresh traveler starts without Cooking or Jojo food');
    await visit('harbormaster');
    assert(state().questStage === 2 && count(SANDWICH_ITEM) === 1,
      'Jojo hands over the letter and exactly one sandwich');
    await visit('harbormaster'); greenTeacher('harbormaster');
    assert(count(SANDWICH_ITEM) === 1, 'Revisiting Jojo cannot duplicate the welcome sandwich');
    await choose('jojo-cooking');
    assert(taught('cooking') && h.cooking.knows('cooked-fish'), 'Jojo teaches Cooking and the fish recipe through dialogue');
    assert(h.inventory.has('tinderbox') && count('raw-fish') === 1 && count('forest-stick') >= 2,
      'Jojo supplies tinderbox, fuel and one raw fish');
    const supplies = [count('raw-fish'), count('forest-stick')];
    await choose('jojo-cooking');
    assert(count('raw-fish') === supplies[0] && count('forest-stick') === supplies[1],
      'Repeating the Cooking lesson does not duplicate supplies');
  });
  await run('Food: actual inventory and checkpoint restoration', async () => {
    await eat(SANDWICH_ITEM, 35);
    const saved = h.snapshot(); await h.restore(saved); await h.frames(2);
    assert(count(SANDWICH_ITEM) === 0 && health() === 75, 'Consumed sandwich and restored health survive checkpoint reload');
    await visit('harbormaster');
    assert(count(SANDWICH_ITEM) === 0, 'Reloading does not reset Jojo welcome food');
    await visit('village-fire'); await choose('light-fire');
    const before = h.skills.xp('cooking'); await choose('cook-fish');
    assert(count('cooked-fish') === 1 && count('raw-fish') === 0 && h.skills.xp('cooking') === before + 10,
      'The real fire menu cooks Jojo fish and awards Cooking XP');
  });
  await run('Stanley: separate Farming and Cooking lessons', async () => {
    await visit(FARMER.id); greenTeacher(FARMER.id);
    assert(!taught('farming'), 'Stanley Farming lesson has not been granted by Jojo');
    const cookingXP = h.skills.xp('cooking');
    await choose('stanley-farming');
    assert(taught('farming') && h.farming.met && count('carrot-seed') === 4 && count('barley-seed') === 4,
      'Stanley introduces Farming and supplies both beginner seed packets');
    await visit(FARMER.id); await choose('stanley-cooking');
    assert(h.cooking.knows('farm-pot') && h.cooking.knows('roasted-beet'), 'Stanley teaches both farm recipes');
    assert(h.cooking.knows('cooked-fish') && h.skills.xp('cooking') === cookingXP,
      'A second Cooking teacher preserves Jojo recipe and earned XP');
  });
  await run('Farm: sow, water, grow, harvest and replant', async () => {
    const [carrots, barley] = FARM_ROWS;
    const before = h.skills.xp('farming');
    await visit(carrots.id); await choose('farm-sow-carrot');
    assert(count('carrot-seed') === 3 && h.farming.rowState(carrots.id, clock()).stage === 'sown',
      'Sowing through the row menu consumes one carrot seed');
    await visit(carrots.id); await choose('farm-water');
    assert(h.farming.rowState(carrots.id, clock()).watered && h.skills.xp('farming') === before + 4,
      'Watering the live row grants its single tending reward');
    await visit(carrots.id);
    assert(!document.querySelector('#dialogue-choices [data-choice="farm-water"]'), 'A watered crop cannot repeatedly award tending XP');
    await visit(barley.id); await choose('farm-sow-barley');
    await visit(barley.id); await choose('farm-water');
    const planted = h.snapshot(); await h.restore(planted); await h.frames(2);
    assert(h.farming.rowState(carrots.id, clock()).watered && h.farming.rowState(barley.id, clock()).watered,
      'Both planted and watered rows survive checkpoint restoration');
    await close(); await h.advancePlay(CROPS.barley.seconds * WATERED_GROWTH + 1); await h.frames(2);
    assert(h.farming.rowState(carrots.id, clock()).stage === 'ripe' && h.farming.rowState(barley.id, clock()).stage === 'ripe',
      'Active play time ripens both watered crops without editing their state');
    const carrotBefore = count('carrot'), barleyBefore = count('barley');
    await visit(carrots.id); await choose('farm-harvest');
    await visit(barley.id); await choose('farm-harvest');
    assert(count('carrot') === carrotBefore + 3 && count('barley') === barleyBefore + 3,
      'Watered harvests grant three vegetables/grain through the live menus');
    assert(h.skills.xp('farming') === before + 8 + CROPS.carrot.xp + CROPS.barley.xp,
      'Harvesting grants crop XP exactly once');
    assert(count('carrot-seed') === 4 && count('barley-seed') === 4, 'Harvests return seed for the next crop');
    await visit(carrots.id); await choose('farm-sow-carrot');
    assert(h.farming.rowState(carrots.id, clock()).stage === 'sown' && count('carrot-seed') === 3,
      'A harvested bed can immediately be replanted');
  });
  await run('Farm: raw produce and cooked meals nourish the traveler', async () => {
    await eat('carrot', 15);
    await visit('commons-fire'); await choose('light-fire');
    const xp = h.skills.xp('cooking'), carrots = count('carrot'), grain = count('barley');
    await choose('make-farm-pot');
    assert(count('carrot') === carrots - 1 && count('barley') === grain - 1 && count('farm-pot') === 1,
      'The farm fire consumes actual harvested ingredients for supper');
    assert(h.skills.xp('cooking') === xp + 25, 'The farm recipe awards Cooking XP');
    await eat('farm-pot', 45);
  });
  await run('Jean: independent Birding and Husbandry, with live animal care', async () => {
    await visit('garden-keeper'); greenTeacher('garden-keeper');
    await choose('learn-birding');
    assert(taught('birding') && h.birding.met && !taught('husbandry'), 'Birding introduction does not grant Husbandry');
    await visit('garden-keeper'); greenTeacher('garden-keeper');
    await choose('learn-husbandry');
    assert(taught('husbandry') && h.husbandry.taught && taught('birding'), 'Jean also teaches Husbandry without replacing Birding');
    await close();
    const sheep = h.livestock().filter(a => a.species === 'sheep' && a.alive !== false && !a.dead)
      .sort((a, b) => Math.hypot(a.x - JEAN_SHEEP.x, a.z - JEAN_SHEEP.z) - Math.hypot(b.x - JEAN_SHEEP.x, b.z - JEAN_SHEEP.z))[0];
    assert(sheep && Math.hypot(sheep.x - JEAN_SHEEP.x, sheep.z - JEAN_SHEEP.z) < 15, 'Jean has living practice sheep beside the road');
    // The two sheep wander independently. Stand very close on the outside of
    // this sheep, away from its nearest neighbour, and re-read its live position
    // before each key press. A different animal legitimately grants its own XP.
    const approachSheep = async id => {
      const animals = h.livestock(), animal = animals.find(a => a.id === id);
      assert(animal && animal.alive !== false && !animal.dead, `${id} remains a living care target`);
      const other = animals.filter(a => a.id !== id && a.alive !== false && !a.dead)
        .sort((a, b) => Math.hypot(a.x - animal.x, a.z - animal.z) - Math.hypot(b.x - animal.x, b.z - animal.z))[0];
      const dx = other ? animal.x - other.x : 1, dz = other ? animal.z - other.z : 0;
      const distance = Math.hypot(dx, dz) || 1;
      await h.warp(animal.x + dx / distance * .35, animal.z + dz / distance * .35); await h.frames(2);
      const target = h.husbandry.nearby(h.player.group.position, h.livestock());
      assert(target?.id === id, `Ordinary proximity selection targets ${id} before care`);
    };
    await approachSheep(sheep.id);
    const xp = h.skills.xp('husbandry'); tap('KeyF'); await h.frames(2);
    assert(h.skills.xp('husbandry') === xp + 10, 'Ordinary F interaction tends nearby livestock and awards Husbandry XP');
    const cared = h.husbandry.snapshot().cared;
    assert(Number.isFinite(cared[sheep.id]), 'The actual F interaction records care for the selected sheep identity');
    await approachSheep(sheep.id);
    tap('KeyF'); await h.frames(2);
    assert(h.skills.xp('husbandry') === xp + 10
      && JSON.stringify(h.husbandry.snapshot().cared) === JSON.stringify(cared),
    'Immediate repeated care of the same sheep grants no XP and changes no care timestamps');
  });
  await run('Amanda: Acting lesson and an expression in the actual frame loop', async () => {
    await visit('troupe-amanda'); greenTeacher('troupe-amanda');
    const xp = h.skills.xp('acting');
    await choose('amanda-learn-acting');
    assert(taught('acting'), 'Amanda teaches Acting through her conversation');
    const locked = document.querySelector('#dialogue-choices [data-choice="acting-emote-surprised"]');
    assert(locked?.disabled, 'Future expressions are visibly disabled until the required Acting level');
    await h.choose('acting-emote-happy'); await h.frames(2);
    assert(h.acting.pose()?.id === 'happy', 'The expression picker starts a live Happy pose');
    assert(h.skills.xp('acting') === xp, 'Starting a pose does not grant completion XP early');
    await until(() => !h.acting.pose(), 'Happy expression never finished in the real frame loop', 7000);
    assert(h.skills.xp('acting') === xp + ACTING_XP, 'Finishing the rendered expression grants Acting XP');
    const saved = h.snapshot(); await h.restore(saved); await h.frames(2);
    assert(taught('acting') && h.skills.xp('acting') === xp + ACTING_XP && !h.acting.pose(),
      'Acting progress persists while a transient pose does not resume on loading');
  });
  await run('Solis: signing keeps the hall populated', async () => {
    await close(); h.border.restore(createBorderChapter().snapshot()); h.border.start();
    h.border.act('take-legate-terms'); h.border.act('enter-solis');
    await visit('coalition-envoy');
    await h.choose('side-coalition'); await h.finish(); await h.frames(3);
    await h.refreshPopulation?.();
    for (const id of ['coalition-envoy', 'envoy-guard-north', 'envoy-guard-south']) {
      const npc = h.npcById.get(id);
      assert(npc?.actor.group.visible && !npc.hidden, `${id} remains visibly present after Republican signing`);
    }
    assert(h.border.view().stage === 'report' && h.border.view().objectiveId === 'solis-captain',
      'Signing advances the objective to Voss without removing the hall residents');
  });
  if (left() >= 55000) await run('Glun: lead, demonstrate, player chop and axe reward', async () => {
    const result = await runGlunWoodChecks(h, { budgetMs: left() });
    checks.push(...result.checks);
    if (!result.ok) throw new Error(result.failures[0].message);
  });
  else skipped.push({ name: 'Glun full guided walk', reason: 'Deferred to its dedicated test to keep this renderer smoke run under one minute' });
  await h.close();
  return { ok: failures.length === 0, checks, failures, skipped, durationMs: Math.round(performance.now() - started), frameErrors: state().frameErrors };
}

/** Run separately when the short combined suite leaves too little time for the
 * actual walk from Glun's post to the Koopwood. The hook finishes main training
 * as fixture setup; the optional Woodcutting lesson still uses real controls. */
export async function runGlunWoodChecks(h, { budgetMs = 57000 } = {}) {
  const checks = [], failures = [], started = performance.now();
  const assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const until = async (condition, message, maximum, tick = null) => {
    const deadline = Math.min(started + budgetMs - 1000, performance.now() + maximum);
    while (!condition()) {
      if (performance.now() >= deadline) throw new Error(message);
      await tick?.(); await h.frames(2);
    }
  };
  const visit = async id => { await h.close(); await h.visit(id); await h.finish(); };
  const choose = async id => { await h.choose(id); await h.finish(); };
  try {
    await h.prepareGlun?.(); await visit('instructor'); await choose('glun-wood-begin');
    assert(h.glunWood.stage === 'leading', 'Glun starts the optional guided Woodcutting lesson');
    const glun = h.npcById.get('instructor'), before = { x: glun.actor.group.position.x, z: glun.actor.group.position.z };
    await until(() => h.glunWood.stage === 'practice', 'Glun failed to reach and demonstrate the pine', 43000, async () => {
      const p = glun.actor.group.position; await h.warp(p.x + 2.2, p.z + 1.4);
    });
    assert(Math.hypot(glun.actor.group.position.x - before.x, glun.actor.group.position.z - before.z) > 10,
      'Glun actually walks from his post to the demonstration tree');
    assert(h.skills.taught('woodcutting') && h.glunWood.borrowing && h.wood.standing(GLUN_WOOD_LESSON.treeId),
      'The demonstration teaches Woodcutting and leaves the pine for player practice');
    await h.warp(GLUN_WOOD_LESSON.practiceStand.x, GLUN_WOOD_LESSON.practiceStand.z); await h.frames(3);
    const logs = h.inventory.count('pine-logs');
    if (h.tap) h.tap('KeyF'); else h.keys.tap('KeyF');
    await until(() => h.glunWood.stage === 'report', 'Actual chopping did not complete the practice cut', 14000);
    assert(h.inventory.count('pine-logs') === logs + 1, 'The player receives a log from the real chopping loop');
    await visit('instructor'); await choose('glun-wood-finish');
    assert(h.glunWood.stage === 'complete' && h.inventory.count(GLUN_WOOD_LESSON.axe) === 1,
      'Reporting the practice cut grants exactly one permanent bronze hatchet');
    assert(!h.getState().frameErrors?.count, 'Glun guide and chopping produce no renderer errors');
  } catch (error) { failures.push({ name: 'Glun full guided walk', message: error?.message ?? String(error), state:h.getState().glun, mode:h.getState().mode }); }
  await h.close();
  return { ok: failures.length === 0, checks, failures, skipped: [], durationMs: Math.round(performance.now() - started), frameErrors: h.getState().frameErrors };
}

/** Real Jojo escort, Lee Anne conversation, F-at-fire interaction and cooking. */
export async function runFireMakingChecks(h, { budgetMs = 57000 } = {}) {
  const checks = [], failures = [], started = performance.now();
  const assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const visit = async id => { await h.close(); await h.visit(id); await h.finish(); };
  const choose = async id => { await h.choose(id); await h.finish(); };
  try {
    await h.prepare();
    const camp = h.campcraft.checkpoint();
    for (const id of Object.keys(camp.fires)) camp.fires[id] = 0;
    h.campcraft.restore(camp);
    await visit('harbormaster'); await visit('harbormaster');
    assert(!h.fireMaking.ready && !h.cooking.met, 'Fresh traveler has neither taught Fire Making nor Cooking');
    await choose('jojo-cooking');
    assert(h.fireMaking.referral === 'leading' && !h.cooking.met, 'Jojo defers Cooking and offers to physically lead the player to Lee Anne');
    const jojo = h.npcById.get('harbormaster'), start = jojo.actor.group.position.clone();
    const deadline = started + budgetMs - 16000;
    while (h.fireMaking.referral !== 'arrived') {
      if (performance.now() > deadline) throw new Error('Jojo did not reach Lee Anne in the live frame loop');
      const p = jojo.actor.group.position;
      await h.warp(p.x + 2.2, p.z + 1.4); await h.frames(2);
    }
    await h.finish();
    assert(jojo.actor.group.position.distanceTo(start) > 15, 'Jojo walks from the landing to the fire ring without teleporting');
    await visit('lee-anne');
    const mark = h.marker('lee-anne');
    assert(mark?.visible && mark.kind === 'skill', 'Lee Anne has the green skill-teacher marker');
    await choose('lee-anne-firemaking');
    assert(h.fireMaking.stage === 'practice' && !h.skills.taught('firemaking'), 'The lesson supplies tinder and fuel but requires actual player practice');
    assert(!h.campcraft.fireStatus('village-fire').lit, 'The village ring starts unlit');
    await visit('village-fire'); await choose('light-fire'); await h.frames(2);
    assert(h.fireMaking.ready && h.skills.taught('firemaking') && !h.cooking.met, 'Lighting through the actual fire menu teaches Fire Making only');
    assert(h.campcraft.fireStatus('village-fire').lit, 'The real village fire is burning');
    await visit('harbormaster'); await choose('jojo-cooking');
    assert(h.skills.taught('cooking') && h.cooking.knows('cooked-fish'), 'Jojo teaches Cooking after the prerequisite is complete');
    await visit('village-fire'); await choose('cook-fish');
    assert(h.inventory.count('cooked-fish') > 0, 'The new cook makes an actual meal at the lit fire');
    const saved = h.snapshot(); await h.restore(saved); await h.frames(2);
    assert(h.fireMaking.ready && h.skills.taught('firemaking') && h.cooking.knows('cooked-fish'), 'Both lessons survive a validated checkpoint reload');
    assert(!h.getState().frameErrors?.count, 'The guided Fire Making lesson produces no renderer errors');
  } catch (error) { failures.push({ name: 'Fire Making and Jojo escort', message: error?.message ?? String(error), lesson: h.fireMaking.snapshot(), mode: h.getState().mode }); }
  await h.close();
  return { ok: failures.length === 0, checks, failures, skipped: [], durationMs: Math.round(performance.now() - started), frameErrors: h.getState().frameErrors };
}
