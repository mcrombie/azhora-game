/**
 * The Bramble Scout Camp, played through the real game: keyboard, conversation
 * buttons, combat and the save slot.
 *
 * The camp stands in the birch woods of southern Pueth, east of the Legion's
 * road post at the Tessen bridge. Legionary Casso tells a hired sword about it,
 * Captain Varo marches on it with his two men when asked, the traveler walks the
 * blue-rag trail with the garrison at their shoulder and challenges the two
 * scouts beside them, falls back down the trail, stands the men down, loses on
 * purpose and retries alone, wins, lifts Tidehaven's stolen stores and brings
 * them back to the Captain for thirty copper. The fight needs quest stage 10.
 */
import { canStand } from './game-state.js';
import { FOREST_HIDEOUT_QUEST as QUEST, HIDEOUT_GARRISON } from './forest-hideout.js';
import { FOREST_HIDEOUT as CAMP } from './forest-hideout-world.js';
import { hideoutToWorld, HIDEOUT_APPROACH_TRAIL, RIMEHOLT } from './pueth-world.js';

// The camp's own trail is authored in its local metres; walk it in world metres, after the side trail from the road.
const TRAIL = CAMP.trail.map(p => hideoutToWorld(p.x, p.z));
const CAMP_CENTER = hideoutToWorld(CAMP.center.x, CAMP.center.z);
const [CAPTAIN, CASSO] = HIDEOUT_GARRISON;

const detached = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const stock = inventory => inventory.items().map(id => ({ id, quantity: inventory.count(id) })).sort((a, b) => a.id.localeCompare(b.id));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const $ = id => document.getElementById(id);

function controls(h, assert) {
  const { world, frames, press, release, getMode, warp } = h;
  const tap = async code => { press(code); release(code); await frames(2); };
  const until = async (condition, message, timeout = 30000) => {
    const deadline = performance.now() + timeout;
    while (!condition()) {
      assert(performance.now() < deadline, message);
      await frames(2);
    }
  };
  const moveTo = async point => {
    assert(canStand(point.x, point.z, world), `setup position blocked at ${point.x}, ${point.z}`);
    warp(point.x, point.z); await frames(4);
  };
  const choose = async id => {
    for (let page = 0; page < 8 && !document.querySelector(`[data-choice="${id}"]`); page++) {
      assert(getMode() === 'dialogue', `${id}: conversation closed before its choices appeared`);
      await tap('KeyF');
    }
    const button = document.querySelector(`[data-choice="${id}"]`);
    assert(button && !button.disabled, `missing or disabled conversation choice ${id}`);
    button.click(); await frames(3);
  };
  const leave = async () => {
    for (let i = 0; i < 3 && ['dialogue', 'journal', 'inventory'].includes(getMode()); i++) await tap('Escape');
    assert(getMode() === 'playing', 'closing the interface did not return control to the player');
  };
  const inspect = async () => {
    await tap('KeyF');
    assert(getMode() === 'dialogue' && $('speaker').textContent === QUEST.name, 'F did not inspect the goblin camp');
  };
  /** Stand beside one of the garrison at their post and press F. Everyone walks home first: a far warp sends them there. */
  const talkTo = async soldier => {
    if (!h.forestHideout.state.escort) { warp(RIMEHOLT.square.x, RIMEHOLT.square.z); await frames(4); }
    const home = world.npcPositions[soldier.id]; assert(home, `${soldier.name} has no world position`);
    const point = [[1.2, .6], [-1.2, .6], [0, 1.2], [0, -1.2], [1.2, -.6], [-1.2, -.6]]
      .map(([x, z]) => ({ x: home.x + x, z: home.z + z })).find(p => canStand(p.x, p.z, world));
    assert(point, `${soldier.name} has no clear speaking approach`); await moveTo(point); await tap('KeyF');
    assert(getMode() === 'dialogue' && $('speaker').textContent === soldier.name, `F did not speak to ${soldier.name}`);
  };
  const enemyApproach = enemy => {
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const point = { x: enemy.x + Math.sin(angle) * 1.35, z: enemy.z + Math.cos(angle) * 1.35 };
      if (canStand(point.x, point.z, world)) return point;
    }
    assert(false, 'the scout has no reachable melee approach');
  };
  return { tap, until, moveTo, choose, leave, inspect, talkTo, enemyApproach };
}

/** Exercise the optional encounter through actual keyboard input and conversation buttons. */
export async function runHideoutSmoke(h) {
  const { world, player, inventory, weapons, journey, combat, forestHideout, hideoutWatch,
    checkpoint, saveRoad, prepareHideout, frames, getMode, readState, setYaw, press, release, warp } = h;
  let checks = 0, walkedMeters = 0, battleSwings = 0, battleDodges = 0, autosaves = 0, escortedAllies = 0, stoodDownInConversation = false;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Hideout smoke: ${message}`); };
  const { tap, until, moveTo, choose, leave, inspect, talkTo, enemyApproach } = controls(h, assert);
  const saved = () => {
    const result = checkpoint.read(); assert(result.ok && result.data, `checkpoint missing: ${result.reason || ''}`); return result.data;
  };
  let mainBefore = null;
  const assertSaved = () => {
    const data = saved(); assert(same(data.forestHideout, forestHideout.snapshot()), 'hideout progress was not autosaved exactly');
    assert(data.questStage === 10 && same(data.journey, mainBefore), 'the optional camp advanced the main story'); autosaves++;
  };
  const assertActive = allies => {
    assert(getMode() === 'playing' && combat.state.phase === 'active' && combat.state.encounterId === QUEST.id,
      'the optional challenge did not start its own encounter');
    assert(forestHideout.state.active && combat.state.enemies.length === 2, 'optional fight does not own two active scouts');
    assert(combat.state.allies.length === allies, `the fight started with ${combat.state.allies.length} allies, not ${allies}`);
    assert(hideoutWatch.state().visible === 0, 'passive scouts duplicated the actual combatants');
    assert(readState().questStage === 10, 'starting the optional camp changed the quest stage');
  };
  const walkTo = async (end, { fighting = false } = {}) => {
    const deadline = performance.now() + 40000;
    let previous = { x: player.group.position.x, z: player.group.position.z };
    press('KeyW');
    while (distance(player.group.position, end) > .65 && (!fighting || combat.state.phase === 'active')) {
      const p = player.group.position; setYaw(Math.atan2(p.x - end.x, p.z - end.z));
      assert(performance.now() < deadline, `walking the trail stalled before ${end.x.toFixed(1)}, ${end.z.toFixed(1)}`);
      if (!fighting) assert(getMode() === 'playing' && readState().questStage === 10 && combat.state.phase !== 'active',
        'the trail started combat or changed the main quest without consent');
      else assert(getMode() === 'playing', 'falling back down the trail unexpectedly defeated the player');
      await frames(3);
      const current = { x: p.x, z: p.z }; walkedMeters += distance(current, previous); previous = current;
      assert(canStand(p.x, p.z, world), 'walking the trail placed the player inside a collider');
    }
    release('KeyW'); await frames(2);
  };

  try {
    // Before the tutorial's road is done the camp can be looked at, never fought.
    await prepareHideout(1); await frames(5);
    assert(getMode() === 'playing' && readState().questStage === 1 && !readState().testingEnabled,
      'early fixture is not normal stage-one play');
    await moveTo(QUEST.approach); await inspect(); await tap('KeyF');
    const locked = document.querySelector('[data-choice="challenge-hideout"]');
    assert(locked?.disabled && locked.title.includes('Finish your business in Tidehaven'), 'early camp does not explain the unavailable fight');
    await choose('leave-hideout');
    assert(forestHideout.state.inspected && !forestHideout.state.accepted && combat.state.phase !== 'active',
      'an early visit started the optional battle');

    await prepareHideout(10); await frames(5);
    assert(readState().questStage === 10 && !readState().testingEnabled && !forestHideout.state.inspected,
      'stage-ten fixture did not reset optional progress');
    assert(weapons.profile().id === 'simple-sword' && weapons.profile().usable, 'fixture sword is not ready');
    mainBefore = detached(journey.snapshot());
    const stockBefore = stock(inventory), swordBefore = weapons.status('simple-sword').durability;

    // The Captain sends a hired sword to Casso; Casso tells of the camp; the Captain marches.
    await talkTo(CAPTAIN); await tap('KeyF');
    assert(/Speak to Casso/.test($('speech').textContent) || /Casso/.test(document.getElementById('dialogue').textContent), 'the Captain did not point to Casso');
    assert(!document.querySelector('[data-choice="march-on-hideout"]'), 'the Captain offered to march on a camp nobody has told you of');
    await leave();
    await talkTo(CASSO); await choose('ask-hideout-work');
    assert(/blue cloth/.test($('speech').textContent) || /blue cloth/.test(document.getElementById('dialogue').textContent), 'Casso did not describe the marked trail');
    for (let page = 0; page < 6 && !forestHideout.state.inspected; page++) await tap('KeyF');
    assert(forestHideout.state.inspected && !forestHideout.state.accepted, 'Casso’s account did not mark the camp'); await leave();
    assert(same(stock(inventory), stockBefore), 'hearing of the camp changed the satchel'); assertSaved();
    await talkTo(CAPTAIN); await choose('march-on-hideout');
    assert(forestHideout.state.escort && getMode() === 'playing', 'the garrison did not fall in behind the traveler');

    // Walk the blue-rag trail from the road to the camp, the garrison at the traveler's shoulder.
    await moveTo(HIDEOUT_APPROACH_TRAIL[0]);
    for (const point of [...HIDEOUT_APPROACH_TRAIL.slice(1), ...TRAIL.slice(1)]) await walkTo(point);
    assert(walkedMeters > 180 && distance(player.group.position, CAMP_CENTER) < 1, 'normal walking did not reach the camp');
    await until(() => HIDEOUT_GARRISON.every(soldier => distance(world.npcPositions[soldier.id], player.group.position) < 6), 'the garrison did not keep up on the march', 5000);
    assert(hideoutWatch.state().visible === 2, 'the unchallenged camp has no visible scouts');
    await inspect(); await choose('challenge-hideout');
    assertActive(HIDEOUT_GARRISON.length); escortedAllies = combat.state.allies.length;

    // Fall back south down the trail: the fight ends, the errand stays.
    for (const end of [...TRAIL].reverse().slice(1)) {
      await walkTo(end, { fighting: true });
      if (combat.state.phase !== 'active') break;
    }
    await frames(4);
    assert(getMode() === 'playing' && !forestHideout.state.active && forestHideout.state.accepted && !forestHideout.state.cleared,
      'falling back lost the errand or left combat active');
    assert(combat.state.player.hp === combat.state.player.maxHp && hideoutWatch.state().visible === 2,
      'falling back did not restore health and the passive camp'); assertSaved();

    // Stand the men down: once they have caught up, the Captain is the nearest of them, at the traveler's shoulder.
    for (let attempt = 0; attempt < 12 && !stoodDownInConversation; attempt++) {
      await frames(30); await tap('KeyF');
      if (getMode() === 'dialogue' && $('speaker').textContent === CAPTAIN.name) { await choose('stand-down-hideout'); stoodDownInConversation = true; }
      else if (getMode() === 'dialogue') await leave();
    }
    if (!stoodDownInConversation) h.hideoutAct('stand-down-hideout');
    assert(!forestHideout.state.escort && getMode() === 'playing', 'the garrison did not stand down');

    await moveTo(QUEST.approach); await inspect(); await choose('challenge-hideout'); assertActive(0);
    await until(() => combat.state.enemies.some(enemy => enemy.active && enemy.hp > 0), 'the camp scouts never entered');
    // A deliberately low-health fixture checks the real enemy hit and the real Retry button.
    combat.state.player.hp = 1;
    const attackingScout = combat.state.enemies.find(enemy => enemy.active && enemy.hp > 0);
    await moveTo(enemyApproach(attackingScout));
    await until(() => getMode() === 'defeated', 'a scout could not defeat the low-health test character');
    assert(!forestHideout.state.active && !forestHideout.state.cleared && combat.state.encounterId === QUEST.id,
      'defeat did not retain the scoped optional encounter');
    assert($('defeat').textContent.includes('Bramble Scout Camp'), 'defeat screen promises the wrong retry location');
    assert(weapons.status('simple-sword').durability === swordBefore, 'falling back or receiving damage wore the unused sword');
    const retry = $('retry'); assert(retry && retry.getClientRects().length > 0, 'defeat screen has no visible Retry button');
    retry.click(); await frames(3); assertActive(0);
    assert(combat.state.player.hp === combat.state.player.maxHp && distance(player.group.position, QUEST.approach) < .1,
      'Retry did not restore health at the optional camp approach');

    const deadline = performance.now() + 90000;
    while (combat.state.phase === 'active') {
      assert(performance.now() < deadline, 'the optional camp fight did not resolve');
      const enemy = combat.state.enemies.find(item => item.hp > 0 && item.active !== false);
      if (!enemy) { await frames(2); continue; }
      if (combat.state.player.action === 'idle') {
        const approach = enemyApproach(enemy); warp(approach.x, approach.z);
        player.group.rotation.y = Math.atan2(enemy.x - player.group.position.x, enemy.z - player.group.position.z);
        if (enemy.action === 'windup' && enemy.progress > .55 && combat.state.player.stamina >= 25) {
          press('KeyD'); await tap('ControlLeft'); release('KeyD'); battleDodges++;
        } else { await tap('KeyR'); battleSwings++; }
      }
      await frames(2); assert(getMode() !== 'defeated', 'the player lost the final optional camp fight');
    }
    await until(() => combat.state.player.action === 'idle', 'the final sword swing never recovered');
    assert(combat.state.phase === 'won' && combat.state.enemies.length === 2 && combat.state.enemies.every(enemy => enemy.hp <= 0),
      'victory left an undefeated scout in the camp');
    assert(battleSwings >= 6 && battleSwings <= 14 && weapons.status('simple-sword').durability < swordBefore,
      'victory did not use ordinary sword swings and weapon wear');
    assert(forestHideout.state.cleared && !forestHideout.state.recovered && !forestHideout.state.active,
      'victory skipped or failed the supply-recovery step');
    assert(world.forestHideoutState().cleared && !world.forestHideoutState().recovered && hideoutWatch.state().visible === 0,
      'clearing the camp did not update its physical state'); assertSaved();

    await moveTo(QUEST.supplies);
    assert($('interaction-label').textContent.includes('Lift the stolen stores'), 'F prompt does not identify the stolen sacks');
    const recoveredStock = stock(inventory); await tap('KeyF');
    assert(forestHideout.state.recovered && !forestHideout.state.returned && world.forestHideoutState().recovered,
      'lifting the stores did not record progress or hide the stolen sacks');
    assert(same(stock(inventory), recoveredStock), 'quest stores unexpectedly altered ordinary inventory items'); assertSaved();
    await tap('KeyF');
    assert(same(stock(inventory), recoveredStock), 'the recovered sacks could be gathered twice'); await leave();

    // Back to the Tessen post: thirty copper, once.
    const copperBefore = inventory.count('copper-piece');
    await talkTo(CAPTAIN); await choose('return-hideout-supplies');
    assert(forestHideout.state.returned && inventory.count('copper-piece') === copperBefore + QUEST.reward.quantity,
      'returning the stores did not pay exactly thirty copper'); assertSaved();
    assert(same(journey.snapshot(), mainBefore) && readState().questStage === 10, 'the optional victory or return changed the main quest');
    await talkTo(CAPTAIN); await tap('KeyF');
    assert(/report to the Legate/.test(document.getElementById('dialogue').textContent), 'the Captain did not remember the returned stores');
    assert(!document.querySelector('[data-choice="return-hideout-supplies"]'), 'the Captain offered to pay twice'); await leave();
    assert(inventory.count('copper-piece') === copperBefore + QUEST.reward.quantity, 'talking again duplicated the reward');
    await tap('KeyJ');
    assert(getMode() === 'journal' && $('journal-hideout-title').textContent === forestHideout.view().title
      && $('journal-hideout-detail').textContent === forestHideout.view().detail, 'journal omitted the completed optional encounter'); await leave();
    assert(saveRoad(false), 'completed optional errand could not be saved');
    const expected = detached(saved());
    assert(expected.forestHideout.returned && expected.questStage === 10 && same(expected.journey, mainBefore),
      'final checkpoint lost the optional completion or changed the main quest');
    return { ok: true, hideoutAssertions: checks, hideoutAutosaves: autosaves,
      trailMeters: Math.round(walkedMeters * 10) / 10, trailWaypoints: HIDEOUT_APPROACH_TRAIL.length + CAMP.trail.length - 1,
      escortedAllies, standDownByConversation: stoodDownInConversation, battleSwings, battleDodges, retreatVerified: true, defeatRetryVerified: true,
      suppliesRecovered: true, rewardCopper: QUEST.reward.quantity, mainQuestUnchanged: true, expected };
  } finally {
    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyR', 'ShiftLeft', 'ControlLeft']) release(key);
  }
}

/** A new renderer restores only the isolated test save, then revisits the camp and the Captain. */
export async function verifyHideoutReload(h, expected) {
  const { world, player, inventory, weapons, forestHideout, hideoutWatch, combat, checkpoint, frames, getMode, readState } = h;
  let checks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Hideout reload: ${message}`); };
  const { tap, moveTo, choose, leave, inspect, talkTo } = controls(h, assert);
  assert(expected?.questStage === 10 && expected.forestHideout?.returned, 'expected completed hideout checkpoint missing');
  assert(getMode() === 'opening' && !forestHideout.state.cleared && !world.forestHideoutState().recovered,
    'reload did not start as a fresh opening and unmodified camp');
  const stored = checkpoint.read(); assert(stored.ok && same(stored.data, expected), 'checkpoint changed across the renderer reload');
  const button = $('continue-road');
  assert(button && !button.disabled && button.getClientRects().length > 0, 'opening does not expose Continue for the hideout save');
  button.click(); await frames(5);
  assert(getMode() === 'playing' && readState().questStage === 10 && !readState().testingEnabled, 'Continue changed the quest stage');
  assert(same(forestHideout.snapshot(), expected.forestHideout) && !forestHideout.state.active && !forestHideout.state.escort, 'Continue lost hideout progress or resumed combat or the march');
  assert(world.forestHideoutState().cleared && world.forestHideoutState().recovered, 'Continue did not restore the cleared camp and missing stores');
  assert(distance(player.group.position, expected.position) < .01 && canStand(player.group.position.x, player.group.position.z, world),
    'Continue moved or blocked the saved character');
  assert(same(stock(inventory), [...expected.inventory].sort((a, b) => a.id.localeCompare(b.id))), 'Continue changed item quantities');
  assert(same(weapons.snapshot(), expected.weapons), 'Continue reset the sword condition or selected weapon');
  const copper = inventory.count('copper-piece');
  await moveTo(QUEST.approach); assert(hideoutWatch.state().visible === 0, 'cleared passive scouts returned after loading');
  await inspect(); await tap('KeyF');
  assert(!document.querySelector('[data-choice="challenge-hideout"]'), 'completed camp offers another fight');
  await choose('leave-hideout');
  assert(combat.state.phase !== 'active', 'revisiting the cleared camp restarted combat');
  await talkTo(HIDEOUT_GARRISON[0]); await tap('KeyF');
  assert(/report to the Legate/.test(document.getElementById('dialogue').textContent), 'the Captain forgot the returned stores after loading'); await leave();
  assert(inventory.count('copper-piece') === copper && !document.querySelector('[data-choice="return-hideout-supplies"]'),
    'loading or a repeat conversation duplicated the thirty-copper reward');
  await tap('KeyJ');
  assert($('journal-hideout-title').textContent === forestHideout.view().title
    && $('journal-hideout-detail').textContent === forestHideout.view().detail, 'the completed journal entry vanished after loading'); await leave();
  return { ok: true, hideoutReloadAssertions: checks, oneTimeRewardRetained: true,
    clearedCampRetained: true, mainQuestUnchanged: true };
}
