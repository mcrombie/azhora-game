import { canStand } from './game-state.js';

const detached = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const satchel = inventory => inventory.items().map(id => ({ id, quantity: inventory.count(id) }))
  .sort((a, b) => a.id.localeCompare(b.id));

/** Focused renderer regressions; prepare supplies an isolated normal-road fixture. */
export async function runRoadCheckSmoke(h) {
  const { world, player, journey, inventory, weapons, campcraft, combat, checkpoint,
    journeyAct, saveRoad, prepare, press, release, frames, getMode, setYaw,
    audioState, toggleAudio, startFishing, endFishing, setFishingSpot,
    handleCampEvents, readState, setMode, cameraState } = h;
  let checks = 0, autosaveChecks = 0, audioChecks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Road checkpoint smoke: ${message}`); };
  const waitFor = async (condition, message) => {
    const deadline = performance.now() + 25000;
    while (!condition()) { assert(performance.now() < deadline, message); await frames(1); }
  };
  const moveTo = async (x, z) => {
    assert(canStand(x, z, world), `fixture position is blocked at ${x}, ${z}`);
    player.group.position.set(x, world.heightAt(x, z), z); await frames(3);
  };
  const saved = () => {
    const result = checkpoint.read();
    assert(result.ok && result.data, 'no valid checkpoint was available');
    return result.data;
  };
  const accepted = id => {
    assert(journeyAct(id)?.ok, `road action ${id} was rejected`);
    assert(same(saved().journey, journey.snapshot()), `${id} did not autosave its exact intermediate progress`);
    autosaveChecks++;
  };

  try {
    await prepare(); await frames(3);
    assert(getMode() === 'playing' && readState().questStage === 10 && !readState().testingEnabled, 'fixture did not begin as normal road play');
    assert(inventory.has('simple-sword') && inventory.has('harbor-letter') && inventory.has('road-token'), 'fixture is missing the road equipment');
    assert(!inventory.has('fishing-rod'), 'rod-teaching fixture must start without a rod');
    if (!journey.state.started) assert(journey.start().ok, 'fresh journey could not begin');
    assert(journey.view().stage === 'meet-courier', 'fixture already advanced the new road');
    await moveTo(0, -178);

    accepted('meet-courier');
    accepted('collect-cart-parcel-1');
    assert(saved().journey.parcels.length === 1 && !saved().journey.courierComplete, 'a partial parcel pickup was not saved independently');
    assert(campcraft.teachFishing().ok, 'the fishing-teacher callback failed');
    handleCampEvents();
    assert(saved().inventory.some(item => item.id === 'fishing-rod' && item.quantity === 1), 'fishing-taught did not autosave the new rod');
    assert(same(saved().journey, journey.snapshot()), 'teaching fishing changed saved quest progress');
    autosaveChecks++;

    assert(weapons.equip('simple-sword'), 'fixture sword could not be equipped');
    const initialWear = weapons.status('simple-sword').durability;
    for (let i = 0; i < 5; i++) weapons.contact('simple-sword');
    const swordWear = weapons.status('simple-sword').durability;
    assert(swordWear === initialWear - 5 && swordWear > 0, 'sword wear fixture was not applied');
    assert(saveRoad(false), 'manual road save failed');
    assert(saved().weapons.sword.durability === swordWear, 'manual save repaired or lost sword wear');

    if (!audioState()?.enabled) toggleAudio();
    await frames(4);
    assert(audioState()?.initialized && audioState()?.enabled && !audioState()?.lastError, 'real WebAudio did not initialize');
    audioChecks++;
    const stepStart = audioState().footsteps, walkStart = player.group.position.x;
    setYaw(Math.PI / 2); press('KeyW');
    await waitFor(() => walkStart - player.group.position.x > 3 && audioState().footsteps > stepStart,
      'real keyboard movement did not produce surface footfalls');
    release('KeyW'); await frames(3);
    assert(audioState().region === world.regionAt(player.group.position.x, player.group.position.z).id
      && audioState().surface === 'earth', 'clearing footfalls used the wrong regional surface');
    audioChecks++;
    const stillSteps = audioState().footsteps;
    await frames(8);
    assert(audioState().footsteps === stillSteps, 'stationary play kept emitting footsteps');
    audioChecks++;
    if (setMode) {
      setMode('pause'); await frames(6);
      assert(getMode() === 'pause' && audioState().footsteps === stillSteps && !audioState().playing, 'pause did not stop movement audio');
      audioChecks++;
      setMode('playing'); await frames(2);
    }

    const river = world.fishingSpots.find(spot => spot.id === 'reedwater');
    assert(river, 'river fishing bank is missing');
    await moveTo(river.fishingSpot.x, river.fishingSpot.z);
    setFishingSpot('reedwater'); startFishing(); await frames(5);
    const fishingSteps = audioState().footsteps;
    assert(getMode() === 'fishing' && world.activeFishingSpot().id === 'reedwater', 'river cast did not choose the river float');
    assert(audioState().playing && audioState().region === world.regionAt(river.fishingSpot.x, river.fishingSpot.z).id && audioState().profile.river > 0, 'river ambience stopped while fishing');
    audioChecks++;
    await frames(8);
    assert(audioState().footsteps === fishingSteps && audioState().playing, 'fishing emitted footsteps or muted its ambience');
    audioChecks++;
    endFishing(true); await frames(2);
    assert(getMode() === 'playing', 'fishing cancellation did not return to play');

    accepted('collect-cart-parcel-2');
    accepted('collect-cart-parcel-3');
    accepted('return-courier');
    assert(inventory.count('cooked-fish') === 2, 'Corvan did not add his one-time provisions');
    const sticksNeeded = Math.max(0, 3 - inventory.count('forest-stick'));
    if (sticksNeeded) assert(inventory.add('forest-stick', sticksNeeded), 'could not prepare bridge repair supplies');
    accepted('meet-crossing-keeper');
    const damagedLane = world.colliders.filter(c => c.kind === 'bridge-damage');
    const damagedSpot = damagedLane[Math.floor(damagedLane.length / 2)];
    assert(damagedSpot && !canStand(damagedSpot.x, damagedSpot.z, world), 'the west bridge lane was open before repair');
    accepted('repair-bridge');
    assert(canStand(damagedSpot.x, damagedSpot.z, world), 'the repaired west bridge lane is still blocked');
    assert(journey.view().stage === 'return-crossing-keeper' && same(journey.state.completedRegions, [2]), 'the checkpoint fixture advanced beyond the partial crossing quest');
    await moveTo(damagedSpot.x, damagedSpot.z);
    combat.state.player.hp = 61;
    assert(saveRoad(false), 'saving on the repaired deck failed');
    const expected = detached(saved());
    assert(Math.abs(expected.position.x - damagedSpot.x) < .001 && Math.abs(expected.position.z - damagedSpot.z) < .001
      && expected.health === 61, 'the saved repaired-deck position or health is wrong');
    assert(expected.weapons.sword.durability === swordWear, 'quest completion changed sword condition');
    assert(expected.journey.bridgeRepaired && !expected.journey.bridgeComplete && !expected.journey.ridgeAccepted, 'the saved crossing state is not partial');
    if (cameraState) {
      const camera = cameraState();
      assert([...(camera.position || []), ...(camera.target || [])].length === 6
        && [...camera.position, ...camera.target].every(Number.isFinite), 'camera became non-finite during the focused road checks');
    }
    if (audioState()?.enabled) toggleAudio();
    return { ok: true, roadCheckAssertions: checks, roadAutosaveChecks: autosaveChecks,
      roadAudioChecks: audioChecks, expected };
  } finally {
    release('KeyW');
    if (getMode() === 'fishing') endFishing(true);
  }
}

/** Called in a fresh renderer against the same desktop save slot. */
export async function verifyRoadReload(h, expected) {
  const { world, player, journey, inventory, weapons, combat, checkpoint, continueRoad,
    frames, getMode, readState, cameraState } = h;
  let checks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Road reload smoke: ${message}`); };
  assert(expected && expected.version === 1, 'the expected checkpoint is missing');
  assert(getMode() === 'opening', 'reload must begin in a fresh opening screen');
  const damagedLane = world.colliders.filter(c => c.kind === 'bridge-damage');
  const damagedSpot = damagedLane[Math.floor(damagedLane.length / 2)];
  assert(damagedSpot && !canStand(damagedSpot.x, damagedSpot.z, world), 'fresh world unexpectedly began with the bridge already repaired');
  const stored = checkpoint.read();
  assert(stored.ok && same(stored.data, expected), 'the save slot changed or disappeared across renderer reload');
  assert(continueRoad(), 'Continue could not restore the saved road');
  await frames(6);
  assert(getMode() === 'playing' && !readState().testingEnabled && readState().questStage === 10, 'Continue did not restore normal road play');
  assert(same(journey.snapshot(), expected.journey), 'Continue changed intermediate quest progress');
  assert(journey.view().stage === 'return-crossing-keeper' && same(journey.state.completedRegions, [2]), 'Continue skipped the unfinished report to Hollis');
  assert(world.journeySiteState()['bridge-repair'] && canStand(damagedSpot.x, damagedSpot.z, world), 'Continue failed to restore the physical bridge repair');
  assert(Math.abs(player.group.position.x - expected.position.x) < .001
    && Math.abs(player.group.position.z - expected.position.z) < .001, 'Continue moved the player off the saved repaired bridge lane');
  assert(Number.isFinite(player.group.position.y) && canStand(player.group.position.x, player.group.position.z, world), 'Continue left the player outside walkable terrain');
  assert(same(satchel(inventory), [...expected.inventory].sort((a, b) => a.id.localeCompare(b.id))), 'Continue changed satchel quantities');
  assert(same(weapons.snapshot(), expected.weapons), 'Continue reset equipment selection or weapon wear');
  assert(combat.state.player.hp === 61, 'Continue did not preserve saved health');
  const camera = cameraState?.();
  assert(camera && camera.position?.length === 3 && camera.target?.length === 3
    && [...camera.position, ...camera.target].every(Number.isFinite), 'Continue produced an invalid camera');
  return { ok: true, roadReloadChecks: checks, bridgePositionRestored: true, swordWearRetained: true,
    partialCrossingRestored: true, rodRetained: inventory.has('fishing-rod') };
}
