/**
 * STALE: this smoke still describes the goblin camp as it was in Drent, and
 * `npm run test:hideout` fails on it. Nothing here is a consequence of the world
 * scale; it went stale when the camp moved (commit "Move the goblin camp out of
 * Drent to north Luscia as a Lumber Town side quest with the garrison"). Its
 * coordinates are all derived from `forest-hideout.js` and
 * `forest-hideout-world.js`, so they follow the camp's cluster correctly; it is
 * the *flow* that no longer exists.
 *
 * What a rewrite has to change:
 *  - The errand belongs to Lumber Town's garrison, not to Tamsin. `talkTamsin`
 *    becomes `talkCaptain` on `QUEST.recipientId` ('garrison-captain', Captain
 *    Decimus Varo), and the traveler must first hear of the camp from
 *    `QUEST.informantId` ('garrison-casso') through `ask-hideout-work`.
 *  - The choice ids `talk-hideout-return` and `hideout-village-thanks` are gone;
 *    the garrison uses `march-on-hideout`, `stand-down-hideout` and
 *    `return-hideout-supplies` (see `garrisonConversation`).
 *  - The reward is thirty copper (`QUEST.reward`), not three pawpaws, and the
 *    prompt reads "Lift the town's stolen stores", not "Recover the village
 *    supplies".
 *  - The fight needs quest stage 10, not 5: `prepareHideout(1)`/`prepareHideout(5)`
 *    and every `questStage === 5` assertion move to the post-tutorial stage, and
 *    the early-visit check should expect the "Finish your business in Tidehaven"
 *    reason rather than the old three-goblin one.
 *  - The camp stands in north Luscia, so the walk to it starts on the Luscia
 *    road, not on the Greenway.
 */
import { canStand } from './game-state.js';
import { FOREST_HIDEOUT_QUEST as QUEST } from './forest-hideout.js';
import { FOREST_HIDEOUT as CAMP } from './forest-hideout-world.js';
import { hideoutToWorld } from './region-world.js';

// The camp trail is authored in Tidehaven's local metres; walk it in world metres.
const TRAIL = CAMP.trail.map(p => hideoutToWorld(p.x, p.z));
const CAMP_CENTER = hideoutToWorld(CAMP.center.x, CAMP.center.z);

const detached = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const stock = inventory => inventory.items().map(id => ({ id, quantity: inventory.count(id) })).sort((a, b) => a.id.localeCompare(b.id));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const $ = id => document.getElementById(id);

function controls(h, assert) {
  const { world, player, frames, press, release, getMode, warp } = h;
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
    if (['dialogue', 'journal', 'inventory'].includes(getMode())) await tap('Escape');
    assert(getMode() === 'playing', 'closing the interface did not return control to the player');
  };
  const inspect = async () => {
    await tap('KeyF');
    assert(getMode() === 'dialogue' && $('speaker').textContent === QUEST.name, 'F did not inspect the goblin camp');
  };
  const talkTamsin = async () => {
    const home = world.npcPositions[QUEST.recipientId]; assert(home, 'Tamsin has no world position');
    const point = [[1.2, .6], [-1.2, .6], [0, 1.2], [0, -1.2], [0, 0]]
      .map(([x, z]) => ({ x: home.x + x, z: home.z + z })).find(p => canStand(p.x, p.z, world));
    assert(point, 'Tamsin has no clear speaking approach'); await moveTo(point); await tap('KeyF');
    assert(getMode() === 'dialogue' && $('speaker').textContent === 'Tamsin', 'F did not speak to Tamsin');
  };
  const enemyApproach = enemy => {
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const point = { x: enemy.x + Math.sin(angle) * 1.35, z: enemy.z + Math.cos(angle) * 1.35 };
      if (canStand(point.x, point.z, world)) return point;
    }
    assert(false, 'the scout has no reachable melee approach');
  };
  return { tap, until, moveTo, choose, leave, inspect, talkTamsin, enemyApproach };
}

/** Exercise the optional encounter through actual keyboard input and conversation buttons. */
export async function runHideoutSmoke(h) {
  const { world, player, inventory, weapons, journey, combat, forestHideout, hideoutWatch,
    checkpoint, saveRoad, prepareHideout, frames, getMode, readState, setYaw, press, release, warp } = h;
  let checks = 0, walkedMeters = 0, battleSwings = 0, battleDodges = 0, autosaves = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Hideout smoke: ${message}`); };
  const { tap, until, moveTo, choose, leave, inspect, talkTamsin, enemyApproach } = controls(h, assert);
  const saved = () => {
    const result = checkpoint.read(); assert(result.ok && result.data, `checkpoint missing: ${result.reason || ''}`); return result.data;
  };
  const assertSaved = () => {
    const data = saved(); assert(same(data.forestHideout, forestHideout.snapshot()), 'hideout progress was not autosaved exactly');
    assert(data.questStage === 5 && !data.journey.started, 'optional hideout advanced the main story'); autosaves++;
  };
  const assertActive = () => {
    assert(getMode() === 'playing' && combat.state.phase === 'active' && combat.state.encounterId === QUEST.id,
      'the optional challenge did not start its own encounter');
    assert(forestHideout.state.active && combat.state.enemies.length === 2, 'optional fight does not own two active scouts');
    assert(hideoutWatch.state().visible === 0, 'passive scouts duplicated the actual combatants');
    assert(readState().questStage === 5, 'starting the optional camp changed the tutorial stage');
  };
  const walkSegment = async end => {
    const deadline = performance.now() + 30000;
    let previous = { x: player.group.position.x, z: player.group.position.z };
    press('KeyW');
    while (distance(player.group.position, end) > .65) {
      const p = player.group.position; setYaw(Math.atan2(p.x - end.x, p.z - end.z));
      assert(performance.now() < deadline, `walking the camp trail stalled before ${end.x}, ${end.z}`);
      assert(getMode() === 'playing' && readState().questStage === 5 && combat.state.phase !== 'active',
        'the trail started combat or changed the main tutorial without consent');
      await frames(3);
      const current = { x: p.x, z: p.z }; walkedMeters += distance(current, previous); previous = current;
      assert(canStand(p.x, p.z, world), 'walking the camp trail placed the player inside a collider');
    }
    release('KeyW'); await frames(2);
  };

  try {
    await prepareHideout(1); await frames(5);
    assert(getMode() === 'playing' && readState().questStage === 1 && !readState().testingEnabled,
      'early fixture is not normal stage-one play');
    await moveTo(QUEST.approach); await inspect(); await tap('KeyF');
    const locked = document.querySelector('[data-choice="challenge-hideout"]');
    assert(locked?.disabled && locked.title.includes('three-goblin'), 'early camp does not explain the unavailable fight');
    await choose('leave-hideout');
    assert(forestHideout.state.inspected && !forestHideout.state.accepted && combat.state.phase !== 'active',
      'an early visit started the optional battle');

    await prepareHideout(5); await frames(5);
    assert(readState().questStage === 5 && !readState().testingEnabled && !forestHideout.state.inspected,
      'stage-five fixture did not reset optional progress');
    assert(weapons.profile().id === 'simple-sword' && weapons.profile().usable, 'fixture sword is not ready');
    const mainBefore = detached(journey.snapshot()), stockBefore = stock(inventory);
    const swordBefore = weapons.status('simple-sword').durability;
    await moveTo(TRAIL[0]);
    for (const point of TRAIL.slice(1)) await walkSegment(point);
    assert(walkedMeters > 55 && distance(player.group.position, CAMP_CENTER) < 1, 'normal walking did not reach the camp');
    assert(hideoutWatch.state().visible === 2, 'the unchallenged camp has no visible scouts');
    await inspect(); await choose('leave-hideout');
    assert(!forestHideout.state.active && !forestHideout.state.accepted && combat.state.phase !== 'active',
      'leaving the inspection still started a battle');
    assert(same(stock(inventory), stockBefore), 'observing the camp changed the satchel'); assertSaved();

    await moveTo(QUEST.approach); await inspect(); await choose('challenge-hideout'); assertActive(); assertSaved();
    assert(!saveRoad(false), 'the active optional battle allowed a checkpoint write');
    // Follow the marked trail back to the Greenway without changing encounter state.
    const retreatDeadline = performance.now() + 30000;
    for (const end of [...TRAIL.slice(0, 3)].reverse()) {
      press('KeyW');
      while (combat.state.phase === 'active' && distance(player.group.position, end) > .65) {
        const p = player.group.position; setYaw(Math.atan2(p.x - end.x, p.z - end.z));
        assert(performance.now() < retreatDeadline, 'walking back along the marked trail did not retreat');
        assert(getMode() === 'playing', 'retreating along the trail unexpectedly defeated the player');
        await frames(3);
      }
      release('KeyW');
      if (combat.state.phase !== 'active') break;
    }
    await frames(4);
    assert(getMode() === 'playing' && !forestHideout.state.active && forestHideout.state.accepted && !forestHideout.state.cleared,
      'retreat lost the errand or left combat active');
    assert(combat.state.player.hp === combat.state.player.maxHp && hideoutWatch.state().visible === 2,
      'retreat did not restore health and the passive camp'); assertSaved();

    await moveTo(QUEST.approach); await inspect(); await choose('challenge-hideout'); assertActive();
    await until(() => combat.state.enemies.some(enemy => enemy.active && enemy.hp > 0), 'the camp scouts never entered');
    // A deliberately low-health fixture checks the real enemy hit and real Retry button.
    combat.state.player.hp = 1;
    const attackingScout = combat.state.enemies.find(enemy => enemy.active && enemy.hp > 0);
    await moveTo(enemyApproach(attackingScout));
    await until(() => getMode() === 'defeated', 'a scout could not defeat the low-health test character');
    assert(!forestHideout.state.active && !forestHideout.state.cleared && combat.state.encounterId === QUEST.id,
      'defeat did not retain the scoped optional encounter');
    assert($('defeat').textContent.includes('Bramble Scout Camp'), 'defeat screen promises the wrong retry location');
    assert(weapons.status('simple-sword').durability === swordBefore, 'retreat or receiving damage wore the unused sword');
    const retry = $('retry'); assert(retry && retry.getClientRects().length > 0, 'defeat screen has no visible Retry button');
    retry.click(); await frames(3); assertActive();
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
    assert($('interaction-label').textContent.includes('Recover the village supplies'), 'F prompt does not identify the stolen sacks');
    const recoveredStock = stock(inventory); await tap('KeyF');
    assert(forestHideout.state.recovered && !forestHideout.state.returned && world.forestHideoutState().recovered,
      'lifting the supplies did not record progress or hide the stolen sacks');
    assert(same(stock(inventory), recoveredStock), 'quest supplies unexpectedly altered ordinary inventory items'); assertSaved();
    await tap('KeyF');
    assert(same(stock(inventory), recoveredStock), 'the recovered sacks could be gathered twice'); await leave();

    await talkTamsin(); await choose('talk-hideout-return');
    const pawpawsBefore = inventory.count('pawpaw'); await choose('return-hideout-supplies');
    assert(forestHideout.state.returned && inventory.count('pawpaw') === pawpawsBefore + 3,
      'returning the supplies did not award exactly three pawpaws'); assertSaved();
    assert(same(journey.snapshot(), mainBefore) && readState().questStage === 5, 'the optional victory or return changed the campaign');
    await talkTamsin(); await choose('hideout-village-thanks');
    assert($('speech').textContent.includes('rope'), 'Tamsin did not remember returning the village supplies'); await leave();
    assert(inventory.count('pawpaw') === pawpawsBefore + 3, 'repeat thanks duplicated the reward');
    await tap('KeyJ');
    assert(getMode() === 'journal' && $('journal-hideout-title').textContent === forestHideout.view().title
      && $('journal-hideout-detail').textContent === forestHideout.view().detail, 'journal omitted the completed optional encounter'); await leave();
    assert(saveRoad(false), 'completed optional errand could not be saved');
    const expected = detached(saved());
    assert(expected.forestHideout.returned && expected.questStage === 5 && !expected.journey.started,
      'final checkpoint lost the optional completion or changed the tutorial');
    return { ok: true, hideoutAssertions: checks, hideoutAutosaves: autosaves,
      trailMeters: Math.round(walkedMeters * 10) / 10, trailWaypoints: CAMP.trail.length, trailSegments: CAMP.trail.length - 1,
      battleSwings, battleDodges, retreatVerified: true, defeatRetryVerified: true,
      suppliesRecovered: true, rewardPawpaws: 3, mainTutorialUnchanged: true, expected };
  } finally {
    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyR', 'ShiftLeft', 'ControlLeft']) release(key);
  }
}

/** A new renderer restores only the isolated test save, then revisits the camp and its owner. */
export async function verifyHideoutReload(h, expected) {
  const { world, player, inventory, weapons, forestHideout, hideoutWatch, combat, checkpoint, frames, getMode, readState } = h;
  let checks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Hideout reload: ${message}`); };
  const { tap, moveTo, choose, leave, inspect, talkTamsin } = controls(h, assert);
  assert(expected?.questStage === 5 && expected.forestHideout?.returned, 'expected completed hideout checkpoint missing');
  assert(getMode() === 'opening' && !forestHideout.state.cleared && !world.forestHideoutState().recovered,
    'reload did not start as a fresh opening and unmodified camp');
  const stored = checkpoint.read(); assert(stored.ok && same(stored.data, expected), 'checkpoint changed across the renderer reload');
  const button = $('continue-road');
  assert(button && !button.disabled && button.getClientRects().length > 0, 'opening does not expose Continue for the hideout save');
  button.click(); await frames(5);
  assert(getMode() === 'playing' && readState().questStage === 5 && !readState().testingEnabled, 'Continue changed the original tutorial stage');
  assert(same(forestHideout.snapshot(), expected.forestHideout) && !forestHideout.state.active, 'Continue lost hideout progress or resumed active combat');
  assert(world.forestHideoutState().cleared && world.forestHideoutState().recovered, 'Continue did not restore the cleared camp and missing supplies');
  assert(distance(player.group.position, expected.position) < .01 && canStand(player.group.position.x, player.group.position.z, world),
    'Continue moved or blocked the saved character');
  assert(same(stock(inventory), [...expected.inventory].sort((a, b) => a.id.localeCompare(b.id))), 'Continue changed item quantities');
  assert(same(weapons.snapshot(), expected.weapons), 'Continue reset the sword condition or selected weapon');
  assert(inventory.has('harbor-letter') && !inventory.has('road-token') && !readState().journey.started,
    'Continue skipped the pending letter and guard tutorial');
  const pawpaws = inventory.count('pawpaw');
  await moveTo(QUEST.approach); assert(hideoutWatch.state().visible === 0, 'cleared passive scouts returned after loading');
  await inspect(); await tap('KeyF');
  assert(!document.querySelector('[data-choice="challenge-hideout"]'), 'completed camp offers another fight');
  await choose('leave-hideout');
  assert(combat.state.phase !== 'active', 'revisiting the cleared camp restarted combat');
  await talkTamsin(); await choose('hideout-village-thanks');
  assert($('speech').textContent.includes('rope'), 'Tamsin forgot the returned supplies after loading'); await leave();
  assert(inventory.count('pawpaw') === pawpaws && !document.querySelector('[data-choice="return-hideout-supplies"]'),
    'loading or repeat conversation duplicated the three-pawpaw reward');
  await tap('KeyJ');
  assert($('journal-hideout-title').textContent === forestHideout.view().title
    && $('journal-hideout-detail').textContent === forestHideout.view().detail, 'the completed journal entry vanished after loading'); await leave();
  return { ok: true, hideoutReloadAssertions: checks, oneTimeRewardRetained: true,
    clearedCampRetained: true, mainTutorialUnchanged: true };
}
