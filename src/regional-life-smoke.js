import { canStand } from './game-state.js';
import { REGIONAL_LIFE_NPCS, REGIONAL_LIFE_SITES } from './regional-life.js';

const $ = id => document.getElementById(id);
const copy = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const stock = inventory => inventory.items().map(id => ({ id, quantity: inventory.count(id) })).sort((a, b) => a.id.localeCompare(b.id));

function controls(h, assert) {
  const tap = async code => { h.press(code); h.release(code); await h.frames(3); };
  const leave = async () => { if (h.getMode() !== 'playing') await tap('Escape'); assert(h.getMode() === 'playing', 'panel did not return to play'); };
  const move = async point => {
    assert(point && canStand(point.x, point.z, h.world), `blocked setup at ${point?.x},${point?.z}`);
    h.warp(point.x, point.z); await h.frames(5);
  };
  const pages = async () => {
    for (let i = 0; i < 9 && !$('dialogue-choices').children.length; i++) {
      assert(h.getMode() === 'dialogue', 'conversation closed before choices'); await tap('KeyF');
    }
    assert($('dialogue-choices').children.length > 0, 'conversation never offered its choices');
  };
  const choose = async id => {
    await pages(); const button = document.querySelector(`[data-choice="${id}"]`);
    assert(button && !button.disabled && button.getClientRects().length > 0, `missing visible enabled choice ${id}`);
    button.click(); await h.frames(4);
  };
  const talk = async id => {
    const npc = REGIONAL_LIFE_NPCS.find(person => person.id === id) || { id, name: 'Iven' }, home = h.world.npcPositions[id];
    const standing = [[1.2, .6], [-1.2, .6], [0, 1.2], [0, -1.2], [0, 0]]
      .map(([x, z]) => ({ x: home.x + x, z: home.z + z })).find(point => canStand(point.x, point.z, h.world));
    await move(standing); await tap('KeyF');
    assert(h.getMode() === 'dialogue' && $('speaker').textContent === npc.name, `F did not speak to ${npc.name}`);
  };
  const inspect = async id => {
    const site = REGIONAL_LIFE_SITES.find(point => point.id === id); await move(site);
    assert($('interaction-label').textContent === site.prompt, `${id}: F prompt lost to another nearby interaction`);
    await tap('KeyF'); assert(h.getMode() === 'dialogue' && $('speaker').textContent === site.name, `${id}: F did not inspect the real prop`);
    assert(h.regionalLife.state.inspected.includes(id), `${id}: inspection was not recorded`);
  };
  const visuals = () => {
    const state = h.regionalLife.state, art = h.world.regionalPlaceState();
    for (const key of ['millLowered', 'netWestFreed', 'netEastFreed', 'testimonyRecorded'])
      assert(art[key] === state[key], `${key}: world prop disagrees with saved story state`);
  };
  return { tap, leave, move, pages, choose, talk, inspect, visuals };
}

/** Actual F prompts and visible dialogue choices, followed by a fresh-renderer checkpoint test. */
export async function runRegionalLifeSmoke(h) {
  let checks = 0, choices = 0, autosaves = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Regional life smoke: ${message}`); };
  const ui = controls(h, assert), choose = async id => { await ui.choose(id); choices++; };
  const saved = () => { const result = h.checkpoint.read(); assert(result.ok, `checkpoint rejected: ${result.reason || ''}`); return result.data; };
  let expected;
  try {
    // First finish all three stories without names. A second ordinary fixture
    // preserves a completed fish reward alongside unfinished mill/shelter work.
    for (const mode of ['anonymous', 'signed']) {
      await h.prepareRegional(); await h.frames(6);
      assert(h.getMode() === 'playing' && h.readState().questStage === 10 && !h.readState().testingEnabled, 'fixture is not ordinary post-tutorial play');
      const main = copy(h.journey.snapshot()), weapons = copy(h.weapons.snapshot()), initial = stock(h.inventory), fish = h.inventory.count('raw-fish');
      assert(main.started && !main.courierAccepted, 'fixture must leave the original army assignment unaccepted');
      const preserved = () => {
        assert(same(h.journey.snapshot(), main) && h.readState().questStage === 10, 'an optional story advanced the main army assignment');
        assert(same(h.weapons.snapshot(), weapons), 'helping a neighbor wore or changed equipment');
      };
      const autosaved = () => { const data = saved(); assert(same(data.regionalLife, h.regionalLife.snapshot()), 'local progress was not autosaved exactly'); preserved(); ui.visuals(); autosaves++; };
      await ui.inspect('mill-hoist'); await ui.pages();
      assert(document.querySelector('[data-choice="lower-mill-share"]')?.disabled, 'unaccepted hoist task bypassed Enna'); await ui.leave();
      await ui.talk('commons-miller'); await choose('accept-mill-share');
      assert(h.localMapModel(2).landmarks.some(p => p.id === 'mill-hoist' && p.known && p.trackable), 'Enna did not reveal the known hoist destination');
      await ui.inspect('mill-hoist'); await choose('lower-mill-share'); autosaved();
      if (mode === 'anonymous') { await ui.talk('commons-miller'); await choose('return-mill-share'); autosaved(); }
      assert(same(stock(h.inventory), initial), 'the village grain incorrectly became a satchel reward');

      await ui.talk('reed-worker'); await choose('accept-net-help');
      for (const id of ['net-float-west', 'net-float-east']) assert(h.localMapModel(3).landmarks.some(p => p.id === id && p.known), `${id}: accepted activity is absent from local trails`);
      await ui.inspect('net-float-east'); await choose('free-net-float-east'); autosaved();
      assert(h.regionalLife.state.netEastFreed && !h.regionalLife.state.netWestFreed, 'the far knot could not be freed first and saved independently');
      await ui.inspect('net-float-west'); await choose('free-net-float-west');
      await ui.talk('reed-worker'); await choose('return-net-help'); autosaved();
      assert(h.inventory.count('raw-fish') === fish + 2, 'Merren did not grant exactly two raw fish');
      await ui.talk('reed-worker'); await ui.pages();
      assert(!document.querySelector('[data-choice="return-net-help"]'), 'Merren offers a duplicate reward'); await ui.leave();
      assert(h.inventory.count('raw-fish') === fish + 2, 'repeat conversation duplicated fish');

      await ui.talk('shelter-keeper'); await choose('accept-witness-account');
      await ui.inspect('shelter-ledger'); await ui.pages();
      assert(document.querySelector('[data-choice="record-testimony-signed"]')?.textContent.includes('permission'), 'signature choice omits Oda\'s permission');
      await choose(`record-testimony-${mode}`); autosaved();
      assert(h.regionalLife.state.testimonyMode === mode, 'writing board ignored the selected form of account');
      if (mode === 'anonymous') {
        await ui.talk('relay-clerk'); await choose('relay-witness-account'); await choose('deliver-testimony'); autosaved();
        assert(h.regionalLife.view().completedCount === 3, 'the first pass did not finish all three optional stories');
        await ui.talk('relay-clerk'); await choose('relay-witness-receipt'); await ui.leave(); preserved();
      }
      // Reach every actual inspection prompt, including the notice/tally spaces
      // beside their NPCs, rather than synthesizing journal entries through act().
      for (const site of REGIONAL_LIFE_SITES) if (!h.regionalLife.state.inspected.includes(site.id)) {
        await ui.inspect(site.id); await ui.leave();
      }
      await ui.tap('KeyJ'); assert(h.getMode() === 'journal', 'J did not open the journal');
      for (const item of [...h.regionalLife.view().tasks, ...h.regionalLife.view().entries])
        assert($('regional-life-notes').textContent.includes(item.title), `${item.title}: regional journal content is missing`);
      const pausedPosition = h.player.group.position.toArray(), pausedArt = copy(h.world.regionalPlaceState()), pausedSave = copy(saved());
      h.press('KeyW'); h.press('Tab'); await ui.tap('KeyR'); await ui.tap('Space'); await h.frames(12); h.release('KeyW'); h.release('Tab');
      assert(same(h.player.group.position.toArray(), pausedPosition) && same(h.world.regionalPlaceState(), pausedArt), 'reading notes allowed movement or changed props');
      assert(same(saved(), pausedSave), 'reading notes or menu input rewrote the checkpoint'); await ui.leave();
      preserved(); assert(h.inventory.count('raw-fish') === fish + 2, 'other optional work altered the fish reward');
      assert(h.saveRoad(false), 'ordinary optional progress could not be saved'); autosaved(); expected = copy(saved());
    }
    assert(expected.regionalLife.millLowered && !expected.regionalLife.millCompleted && expected.regionalLife.netsCompleted
      && expected.regionalLife.testimonyMode === 'signed' && !expected.regionalLife.testimonyDelivered, 'final checkpoint must contain both completed reward and partial stories');
    return { ok: true, regionalLifeAssertions: checks, regionalDialogueChoices: choices, regionalAutosaves: autosaves,
      reverseKnotOrder: true, anonymousAccountFiled: true, signedAccountPending: true, mainJourneyUnchanged: true, expected };
  } finally { for (const key of ['KeyW', 'Tab', 'KeyR', 'Space', 'KeyF']) h.release(key); }
}

/** The host reloads the renderer, retaining only the isolated test checkpoint. */
export async function verifyRegionalLifeReload(h, expected) {
  let checks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Regional life reload: ${message}`); };
  const ui = controls(h, assert);
  assert(expected?.regionalLife?.testimonyMode === 'signed', 'partial signed-account checkpoint is missing');
  assert(h.getMode() === 'opening' && !h.regionalLife.state.millLowered, 'reload did not begin with a fresh world');
  const saved = h.checkpoint.read(); assert(saved.ok && same(saved.data, expected), 'checkpoint changed between renderers');
  assert(!$('continue-road').disabled && $('continue-road').getClientRects().length > 0, 'Continue is unavailable');
  $('continue-road').click(); await h.frames(6);
  assert(h.getMode() === 'playing' && h.readState().questStage === 10 && !h.readState().testingEnabled, 'Continue did not restore ordinary play');
  assert(same(h.regionalLife.snapshot(), expected.regionalLife), 'Continue changed partial regional progress'); ui.visuals();
  assert(same(h.journey.snapshot(), expected.journey), 'Continue advanced the main road story');
  assert(same(stock(h.inventory), [...expected.inventory].sort((a, b) => a.id.localeCompare(b.id))), 'Continue changed inventory quantities');
  assert(same(h.weapons.snapshot(), expected.weapons), 'Continue reset weapon condition');
  assert(Math.hypot(h.player.group.position.x - expected.position.x, h.player.group.position.z - expected.position.z) < .01, 'Continue moved the saved traveler');
  const fish = h.inventory.count('raw-fish');
  await ui.talk('reed-worker'); await ui.pages();
  assert(!document.querySelector('[data-choice="return-net-help"]'), 'reload enabled another two-fish reward'); await ui.leave();
  await ui.talk('commons-miller'); await ui.choose('return-mill-share');
  await ui.talk('relay-clerk'); await ui.choose('relay-witness-account'); await ui.choose('deliver-testimony'); ui.visuals();
  assert(h.regionalLife.view().completedCount === 3 && h.regionalLife.state.testimonyMode === 'signed', 'restored tasks did not complete in the chosen form');
  assert(h.inventory.count('raw-fish') === fish, 'finishing restored tasks duplicated the completed net reward');
  assert(same(h.journey.snapshot(), expected.journey), 'filing the witness account completed a main-story prerequisite');
  await ui.talk('relay-clerk'); await ui.choose('relay-witness-receipt');
  assert($('speech').textContent.includes('Oda') && $('speech').textContent.includes('permission'), 'Iven forgot the recorded signature permission'); await ui.leave();
  await ui.tap('KeyJ');
  assert($('regional-life-notes').textContent.includes('An account kept on record'), 'restored completion is absent from the journal'); await ui.leave();
  return { ok: true, regionalLifeReloadAssertions: checks, partialStoriesRestored: true, visualFlagsRestored: true,
    fishRewardNotDuplicated: true, signedAccountFiled: true, mainJourneyUnchangedAfterReload: true };
}
