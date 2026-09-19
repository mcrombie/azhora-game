import { canStand } from './game-state.js';
import { FOREST_STORY_NPC, FOREST_STORY_SITES } from './forest-story.js';

const detached = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const stock = inventory => inventory.items().map(id => ({ id, quantity: inventory.count(id) })).sort((a, b) => a.id.localeCompare(b.id));
const $ = id => document.getElementById(id);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function controls(h, assert) {
  const { world, player, press, release, frames, getMode, warp } = h;
  const tap = async code => { press(code); release(code); await frames(2); };
  const moveTo = async point => {
    assert(canStand(point.x, point.z, world), `setup position is blocked at ${point.x}, ${point.z}`);
    if (warp) warp(point.x, point.z);
    else player.group.position.set(point.x, world.heightAt(point.x, point.z), point.z);
    await frames(4);
  };
  const choose = async id => {
    for (let page = 0; page < 8 && !document.querySelector(`[data-choice="${id}"]`); page++) {
      assert(getMode() === 'dialogue', `${id}: conversation closed before the choices appeared`);
      await tap('KeyF');
    }
    const button = document.querySelector(`[data-choice="${id}"]`);
    assert(button && !button.disabled, `missing or disabled conversation choice ${id}`);
    button.click(); await frames(3);
  };
  const leave = async () => {
    if (getMode() === 'dialogue' || getMode() === 'journal' || getMode() === 'inventory') await tap('Escape');
    assert(getMode() === 'playing', 'leaving the interface did not return to play');
  };
  const talk = async (id, name) => {
    const home = world.npcPositions[id]; assert(home, `missing NPC home ${id}`);
    let standing = null;
    for (const offset of [[1.2, .6], [-1.2, .6], [0, 1.2], [0, -1.2], [0, 0]]) {
      const point = { x: home.x + offset[0], z: home.z + offset[1] };
      if (canStand(point.x, point.z, world)) { standing = point; break; }
    }
    assert(standing, `no safe speaking approach to ${name}`); await moveTo(standing); await tap('KeyF');
    assert(getMode() === 'dialogue' && $('speaker').textContent === name, `F did not speak to ${name}`);
  };
  return { tap, moveTo, choose, leave, talk };
}

/** Browser-only checks use real keyboard dispatch and the visible conversation buttons. */
export async function runForestSmoke(h) {
  const { world, player, inventory, weapons, campcraft, forestStory, woodlandLife, forestEcology,
    checkpoint, saveRoad, frames, getMode, readState, setYaw, prepareVillage, press, release } = h;
  let checks = 0, walkedMeters = 0, dialogueChoices = 0, autosaves = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Forest smoke: ${message}`); };
  const { tap, moveTo, choose: rawChoose, leave, talk } = controls(h, assert);
  const choose = async id => { await rawChoose(id); dialogueChoices++; };
  const saved = () => {
    const result = checkpoint.read(); assert(result.ok && result.data, `checkpoint missing: ${result.reason || ''}`); return result.data;
  };
  const assertStorySaved = () => {
    const data = saved(); assert(same(data.forestStory, forestStory.snapshot()), 'optional woodland progress was not autosaved exactly');
    assert(data.questStage === 1 && !data.journey.started, 'optional woods activities advanced the main story'); autosaves++;
  };
  const inspect = async id => {
    const site = FOREST_STORY_SITES.find(s => s.id === id); assert(site, `unknown forest inspection ${id}`);
    await moveTo(site);
    assert($('interaction-label').textContent === site.prompt, `${id}: actual F prompt does not identify the forest place`);
    await tap('KeyF');
    assert(getMode() === 'dialogue' && $('speaker').textContent === site.name, `${id}: F did not open its woodland description`);
    assert(forestStory.snapshot().inspected.includes(id), `${id}: reading did not record the journal note`);
    assertStorySaved();
  };
  const gather = async (kind, count) => {
    const array = kind === 'acorn' ? 'acorns' : kind === 'forest-stick' ? 'sticks' : 'fruits';
    const interactionSites = [...FOREST_STORY_SITES, ...Object.values(world.npcPositions), ...(world.firePits || []),
      ...(world.repairBenches || []), ...(world.fishingSpots || []).map(s => s.fishingSpot)];
    const picked = [];
    for (let n = 0; n < count; n++) {
      const candidate = woodlandLife.state()[array].find(p => !p.collected && canStand(p.x, p.z, world)
        && interactionSites.every(s => distance(p, s) > 3.6));
      assert(candidate, `no reachable, unclaimed ${kind} pickup remains`);
      await moveTo(candidate); const before = inventory.count(kind); await tap('KeyF');
      assert(getMode() === 'playing', `${candidate.id}: a higher-priority interaction took over the gathering prompt`);
      assert(inventory.count(kind) === before + 1, `${candidate.id}: real F gathering did not add exactly one ${kind}`);
      assert(woodlandLife.state()[array].find(p => p.id === candidate.id)?.collected, `${candidate.id}: collected site stayed visible`);
      assert(saved().woodland[array].includes(candidate.id), `${candidate.id}: gathered location was not autosaved`);
      picked.push(candidate.id); autosaves++;
    }
    return picked;
  };
  const walkSegment = async end => {
    const deadline = performance.now() + 30000; let previous = { x: player.group.position.x, z: player.group.position.z };
    press('KeyW');
    while (distance(player.group.position, end) > .65) {
      const p = player.group.position; setYaw(Math.atan2(p.x - end.x, p.z - end.z));
      assert(performance.now() < deadline, `walking trail stalled before ${end.x}, ${end.z}`);
      assert(getMode() === 'playing' && readState().questStage === 1, 'walking a side trail interrupted the opening story');
      await frames(3);
      const current = { x: p.x, z: p.z }; walkedMeters += distance(current, previous); previous = current;
      assert(canStand(p.x, p.z, world), 'a forest trail put the player inside a collider');
    }
    release('KeyW'); await frames(2);
  };

  try {
    await prepareVillage(); await frames(5);
    assert(getMode() === 'playing' && readState().questStage === 1 && !readState().testingEnabled, 'fixture did not begin as ordinary early village play');
    assert(!inventory.has('harbor-letter') && !inventory.has('road-token') && inventory.has('simple-sword'), 'fixture should precede Lakota’s letter');
    assert(forestStory.state.stage === 'not-started', 'woodland errand was already started');
    assert(inventory.count('forest-stick') === 0 && inventory.count('cooked-fish') === 0, 'fixture already has woodland supplies');

    // Walk one authored trail with normal input, then explore before accepting a quest.
    const hearth = world.forestPlaces.find(p => p.id === 'charcoal-hearth');
    assert(hearth?.trail?.length >= 3, 'charcoal hearth has no connected side trail');
    await moveTo(hearth.trail[0]);
    for (const point of hearth.trail.slice(1)) await walkSegment(point);
    assert(distance(player.group.position, hearth) < 1, 'real movement did not reach the hearth');
    await inspect('charcoal-hearth'); await choose('recover-work-bundle');
    assert(forestStory.state.bundleRecovered && !forestStory.state.workAccepted && forestStory.state.stage === 'find-owner',
      'finding tools before the owner did not create the owner-finding branch');
    assert(world.forestPlaceState().bundleTaken, 'the secured work bundle remains drawn at the hearth');
    assertStorySaved();
    for (const point of [...hearth.trail].reverse().slice(1)) await walkSegment(point);
    assert(walkedMeters > 45, 'the connected trail was not walked both ways');

    await talk(FOREST_STORY_NPC.id, 'Tamsin');
    assert($('speech').textContent.includes('bundle') || $('speech').textContent.includes('cord'), 'Tamsin did not recognize the found-first tools');
    await choose('accept-woodcutter-errand'); assertStorySaved();
    await talk(FOREST_STORY_NPC.id, 'Tamsin');
    const provisionsBefore = inventory.count('cooked-fish'); await choose('return-work-bundle');
    assert(inventory.count('cooked-fish') === provisionsBefore + 2, 'Tamsin did not give exactly two cooked fish');
    assert(forestStory.state.bundleReturned && forestStory.view().task?.complete, 'woodcutter errand did not finish'); assertStorySaved();
    await talk(FOREST_STORY_NPC.id, 'Tamsin'); await tap('KeyF');
    assert(!document.querySelector('[data-choice="return-work-bundle"]'), 'completed tools can be returned a second time');
    assert($('speech').textContent.length > 30, 'Tamsin has no remembered dialogue'); await leave();
    assert(inventory.count('cooked-fish') === provisionsBefore + 2, 'revisiting Tamsin duplicated the reward');

    await inspect('moss-shrine'); await tap('KeyF');
    const missingPeg = document.querySelector('[data-choice="restore-memorial"]');
    assert(missingPeg?.disabled && missingPeg.title.includes('stick'), 'shrine does not explain why its repair needs a stick');
    await leave();
    const stickIds = await gather('forest-stick', 4), fruitIds = await gather('pawpaw', 1);
    await inspect('moss-shrine'); const sticksBefore = inventory.count('forest-stick'); await choose('restore-memorial');
    assert(inventory.count('forest-stick') === sticksBefore - 1, 'shrine repair did not consume exactly one stick');
    assert(forestStory.state.memorialRestored && world.forestPlaceState().memorialRepaired, 'repaired shrine’s visible wayboard did not update');
    assertStorySaved();
    for (const site of FOREST_STORY_SITES.filter(s => !['charcoal-hearth', 'moss-shrine'].includes(s.id))) {
      await inspect(site.id); await choose(`leave-${site.id}`);
    }
    assert(forestStory.view().discoveredCount === 6, 'all six authored forest places did not produce journal notes');
    await tap('KeyJ');
    assert(getMode() === 'journal', 'J did not open the journal');
    assert($('forest-notes').children.length === 6, 'journal did not render six woodland entries');
    for (const entry of forestStory.view().entries) {
      assert($('forest-notes').textContent.includes(entry.title) && $('forest-notes').textContent.includes(entry.detail),
        `${entry.id}: woodland note title or description is missing from the journal`);
    }
    assert(!$('forest-notes').textContent.includes('undefined'), 'journal exposed an undefined field'); await leave();

    await talk('acorn-cook', 'Lysa'); await choose('accept-acorns');
    assert(readState().sideQuest === 'active' && saved().woodland.acornStatus === 'active', 'accepting Lysa’s quest did not save the in-progress favor');
    const acornIds = await gather('acorn', 2);
    assert(saved().woodland.acornStatus === 'active' && inventory.count('acorn') === 2, 'partial acorn progress was not retained');
    acornIds.push(...await gather('acorn', 3));
    await talk('acorn-cook', 'Lysa'); await choose('give-acorns');
    assert(readState().sideQuest === 'complete' && inventory.has('tinderbox') && inventory.count('acorn') === 0, 'Lysa’s favor did not trade five acorns for the tinderbox');
    await leave();
    assert(saved().woodland.acornStatus === 'complete', 'completed acorn friendship was not saved');
    const pit = world.firePits.find(p => p.id === 'pond-fire'); assert(pit, 'Willowmere fire ring missing');
    await moveTo(pit); const firewood = inventory.count('forest-stick'); await tap('KeyF'); await choose('light-fire');
    assert(campcraft.fireStatus(pit.id).lit && inventory.count('forest-stick') === firewood - 2, 'fire did not consume two branches and burn');
    await leave();
    assert(saved().woodland.camp.fires[pit.id] > 110, 'lighting the fire did not autosave its remaining fuel');

    // The optional detour must not replace or skip the original letter tutorial.
    await talk('bird-watcher', 'Lakota');
    for (let page = 0; page < 8 && getMode() === 'dialogue'; page++) await tap('KeyF');
    assert(getMode() === 'playing' && readState().questStage === 2, 'Lakota did not resume the original tutorial after the woodland detour');
    assert(inventory.has('harbor-letter') && !inventory.has('road-token'), 'early save granted the wrong story equipment');
    assert(weapons.equip('simple-sword'), 'sword could not be readied for the saved tutorial');
    weapons.setWear(true);
    const wear = weapons.status('simple-sword').durability; weapons.contact('simple-sword');
    assert(weapons.status('simple-sword').durability === wear - 1, 'weapon wear fixture failed');
    assert(saveRoad(false), 'stage-two adventure save was rejected');
    const expected = detached(saved());
    assert(expected.questStage === 2 && !expected.journey.started && expected.woodland.practiceHits === 0,
      'early save skipped the pending sword lesson');
    assert(expected.forestStory.inspected.length === 6 && expected.forestStory.bundleReturned && expected.forestStory.memorialRestored,
      'final saved woodland story is incomplete');
    assert(same(expected.woodland.acorns.slice().sort(), acornIds.slice().sort()), 'saved acorn site IDs do not match actual harvesting');
    assert(same(expected.woodland.sticks.slice().sort(), stickIds.slice().sort()), 'saved branch site IDs do not match actual harvesting');
    assert(same(expected.woodland.fruits.slice().sort(), fruitIds.slice().sort()), 'saved fruit site IDs do not match actual harvesting');
    assert(expected.woodland.camp.fires[pit.id] > 0, 'fire expired before the saved-game test');
    const ecology = forestEcology.state();
    assert(ecology.animals.length === 4 && ecology.plants.length >= 400, 'forest ecology did not initialize during actual gameplay');
    return { ok: true, forestAssertions: checks, dialogueChoices, forestAutosaves: autosaves,
      trailMeters: Math.round(walkedMeters * 10) / 10, notes: forestStory.view().discoveredCount,
      gathered: { acorns: acornIds, sticks: stickIds, fruits: fruitIds }, expected };
  } finally {
    release('KeyW'); release('ShiftLeft'); release('KeyF');
  }
}

/** Invoked in a genuinely new renderer sharing only the isolated test save slot. */
export async function verifyForestReload(h, expected) {
  const { world, player, inventory, weapons, campcraft, forestStory, woodlandLife, checkpoint,
    frames, getMode, readState } = h;
  let checks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Forest reload: ${message}`); };
  const { tap, moveTo, choose, leave, talk } = controls(h, assert);
  assert(expected?.questStage === 2 && expected.woodland && expected.forestStory, 'expected early adventure checkpoint missing');
  assert(getMode() === 'opening', 'reload did not start at the fresh opening screen');
  assert(!forestStory.state.bundleRecovered && !world.forestPlaceState().memorialRepaired, 'fresh world already has the completed fixture');
  const stored = checkpoint.read(); assert(stored.ok && same(stored.data, expected), 'checkpoint changed across the renderer reload');
  const button = $('continue-road');
  assert(button && !button.disabled && button.getClientRects().length > 0, 'opening screen does not expose Continue for an early save');
  button.click(); await frames(5);
  assert(getMode() === 'playing' && readState().questStage === 2 && !readState().testingEnabled, 'Continue did not restore the unfinished original tutorial');
  assert(same(forestStory.snapshot(), expected.forestStory), 'Continue changed woodland story progress');
  assert(world.forestPlaceState().bundleTaken && world.forestPlaceState().memorialRepaired, 'Continue did not restore physical story props');
  assert(distance(player.group.position, expected.position) < .01 && canStand(player.group.position.x, player.group.position.z, world),
    'Continue moved or blocked the saved character');
  assert(same(stock(inventory), [...expected.inventory].sort((a, b) => a.id.localeCompare(b.id))), 'Continue changed item quantities');
  assert(same(weapons.snapshot(), expected.weapons), 'Continue reset sword condition or selected weapon');
  assert(inventory.has('harbor-letter') && !inventory.has('road-token') && !readState().journey.started,
    'Continue jumped ahead to the onward army assignment');
  assert(readState().sideQuest === 'complete' && readState().lysaFriendship === 'fond' && inventory.has('tinderbox'), 'Lysa forgot her favor or tinderbox reward');
  const gathered = woodlandLife.state();
  for (const kind of ['acorns', 'sticks', 'fruits']) {
    const actual = gathered[kind].filter(p => p.collected).map(p => p.id).sort();
    assert(same(actual, [...expected.woodland[kind]].sort()), `${kind} respawned or changed on Continue`);
  }
  for (const [id, fuel] of Object.entries(expected.woodland.camp.fires)) {
    const actual = campcraft.fireStatus(id).fuel;
    assert(actual <= fuel + .001 && actual >= Math.max(0, fuel - 3), `${id}: fuel reset instead of restoring saved remaining time`);
  }
  assert(campcraft.fireStatus('pond-fire').lit, 'saved fire did not resume burning');
  await tap('KeyJ');
  assert($('forest-notes').children.length === 6 && $('forest-notes').textContent.includes('Old Charcoal Hearth'), 'woodland journal vanished on Continue');
  await leave();
  const beforeFish = inventory.count('cooked-fish'); await talk(FOREST_STORY_NPC.id, 'Tamsin'); await tap('KeyF');
  assert(!document.querySelector('[data-choice="return-work-bundle"]'), 'reload enabled another tools reward'); await leave();
  assert(inventory.count('cooked-fish') === beforeFish, 'reload or repeat greeting duplicated Tamsin’s provisions');
  await talk('acorn-cook', 'Lysa');
  assert(!document.querySelector('[data-choice="give-acorns"]') && $('speech').textContent.includes("haven't forgotten"), 'Lysa offers the completed errand again');
  await choose('leave-lysa');
  const shrine = FOREST_STORY_SITES.find(s => s.id === 'moss-shrine'), beforeSticks = inventory.count('forest-stick');
  await moveTo(shrine); await tap('KeyF'); await tap('KeyF');
  assert(!document.querySelector('[data-choice="restore-memorial"]'), 'reload enabled another charge for repairing the same shrine');
  await choose('leave-moss-shrine'); assert(inventory.count('forest-stick') === beforeSticks, 'revisiting the restored shrine consumed another stick');
  return { ok: true, forestReloadAssertions: checks, earlyTutorialRestored: true, harvestedSitesRetained: true,
    woodlandNotesRetained: 6, oneTimeRewardsRetained: true, fireFuelRetained: true };
}
