/** Renderer integration checks for the imported northern regions. Travel uses the public
 * F8 controls; cave walking and climbing use the ordinary held movement/Space inputs. */
export async function runNorthernRegionsChecks(h) {
  const checks = [], visits = [], started = performance.now();
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const fail = message => { const state = h.state(); throw new Error(`Northern regions: ${message}; ${JSON.stringify({
    mode: state.mode, region: state.region, position: h.position(), cave: h.cave.snapshot(),
    climbing: h.climbing.view(), frameErrors: state.frameErrors })}`); };
  const check = (ok, message) => { if (!ok) fail(message); checks.push(message); };
  const tap = code => { h.press(code); h.release(code); };
  const capture = async name => { h.clearTransient(); await h.frames(12); console.log(`NORTHERN_CAPTURE ${name}`); await h.frames(12); };
  const control = id => {
    const node = document.getElementById(id), details = node?.closest('details');
    if (details && !details.open) details.querySelector('summary').click();
    check(node && !node.disabled && node.getClientRects().length, `${id} is available in the public testing menu`);
    return node;
  };
  async function travel(name, id) {
    await h.open(); await h.frames(2);
    check(h.state().mode === 'testing', 'F8 opens testing tools');
    const country = control('test-country');
    check([...country.options].some(o => o.value === name), `${name} is listed under Go anywhere`);
    country.value = name; country.dispatchEvent(new Event('change', { bubbles: true }));
    control('test-place').value = '0'; control('test-goto').click(); await h.frames(8);
    const position = h.position();
    check(h.state().mode === 'playing' && h.state().testingEnabled && h.state().region === id,
      `Public travel lands in ${name} with its own region ID ${id}`);
    check(Number.isFinite(position.y) && Math.abs(position.y - h.world.heightAt(position.x, position.z)) < .05,
      `${name}'s default arrival stands on the actual ground`);
    visits.push({ name, id, position });
  }
  async function walkTo(point, label, seconds = 30) {
    const deadline = performance.now() + seconds * 1000;
    h.press('KeyW');
    try {
      while (gap(h.position(), point) > .35) {
        const position = h.position();
        if (performance.now() > deadline) fail(`Walking stalled: ${label}`);
        if (h.state().mode !== 'playing') fail(`Walking interrupted: ${label}`);
        h.face(Math.atan2(point.x - position.x, point.z - position.z));
        await h.frames(1);
      }
    } finally { h.release('KeyW'); }
    await h.frames(2);
  }
  await h.prepare(); await h.frames(3);
  const savedBefore = h.saved();
  check(!!savedBefore, 'A normal adventure checkpoint exists before regional testing');
  try {
    await travel('East Lotharn Mountains', 20);
    const lotharn = h.world.eastLotharnMetrics;
    check(lotharn?.trees > 100 && lotharn.buildings > 0 && lotharn.water > 0,
      'East Lotharn builds its mountain woodland, inhabited valleys, and water');
    const lotharnAnimals = h.wildlife().filter(a => a.region === 'East Lotharn Mountains');
    check(lotharnAnimals.length >= 10 && lotharnAnimals.some(a => ['red-deer', 'boar', 'hill-sheep'].includes(a.species)),
      'East Lotharn registers persistent land animals as well as birds');
    await capture('east-lotharn-arrival');

    await travel('West Lotharn Mountains', 27);
    const westLotharn = h.world.westLotharnMetrics;
    check(westLotharn?.trees > 100 && westLotharn.water > 0 && h.world.westLotharnCaves.length === 9,
      'West Lotharn builds mountain woodland, water, and all nine caves');
    const westAnimals = h.wildlife().filter(a => a.region === 'West Lotharn Mountains');
    check(westAnimals.length >= 15 && westAnimals.some(a => a.species === 'red-deer') && westAnimals.some(a => a.species === 'upland-hare'),
      'West Lotharn registers persistent valley and summit wildlife');
    const westTrees = h.world.colliders.filter(c => c.kind === 'west-lotharn-tree');
    check(westTrees.length > 100 && westTrees.every(c => c.species && h.world.treeRegistry.get(c.id)?.harvestable),
      'The West Lotharn forest is species-aware and connected to woodcutting');
    await capture('west-lotharn-arrival');
    const westCave = h.world.westLotharnCaves.find(c => c.id === 'col-passage');
    check(!!westCave, 'The passage between the col and long valley is available');
    const westMouth = westCave.at(Math.max(0, westCave.openings[0] - .15));
    h.warp({ ...westMouth, y: h.world.heightAt(westMouth.x, westMouth.z) });
    for (let s = westCave.openings[0] + 1; s <= westCave.openings[0] + 7; s += 1)
      await walkTo(westCave.at(s), 'entering the West Lotharn col passage');
    check(h.cave.cave?.id === westCave.id, 'Ordinary movement enters a West Lotharn cave through the shared controller');
    await capture('west-lotharn-cave-inside');
    const westSafe = h.cave.safeEntrance;
    check(h.save() && await h.reload(), 'A West Lotharn cave checkpoint saves and reloads');
    await h.frames(3);
    check(!h.cave.active && gap(h.position(), westSafe) < .1,
      'Reloading the western cave returns to its safe entrance');

    await travel('Feradom', 21);
    const feradom = h.world.feradomMetrics;
    check(feradom?.trees > 100 && feradom.castles >= 4 && feradom.road > 0,
      'Feradom builds its wooded barrier hills, pass castles, and road');
    const feradomAnimals = h.wildlife().filter(a => a.region === 'Feradom');
    check(feradomAnimals.length >= 10 && feradomAnimals.some(a => ['red-deer', 'boar', 'upland-hare'].includes(a.species)),
      'Feradom registers persistent land animals as well as birds');
    await capture('feradom-arrival');
    check(h.world.regions.find(r => r.id === 19)?.name === 'Iscare Archipeligo',
      'Importing the new regions preserves Iscare as region 19');

    const cave = h.world.lotharnCaves.find(c => c.id === 'olveth-passage');
    check(h.world.lotharnCaves.length >= 8 && cave, 'The eight authored Lotharn caves are present');
    const walkAlong = async (from, to, label) => {
      for (let s = from + 2; s < to; s += 2) await walkTo(cave.at(s), label);
      await walkTo(cave.at(to), label);
    };
    const insideAlong = Math.min(cave.openings[1] - 3, cave.openings[0] + 8);
    const roofAlong = (cave.portals[0] + cave.portals[1]) / 2, roof = cave.at(roofAlong);
    h.warp({ ...roof, y: h.world.heightAt(roof.x, roof.z) }); await h.frames(8);
    check(!h.cave.active && Math.abs(h.position().y - h.world.heightAt(roof.x, roof.z)) < .1,
      'Standing over a cave stays on its roof instead of dropping into the passage');
    const enter = async () => {
      const p = cave.at(Math.max(0, cave.openings[0] - .1));
      h.warp({ ...p, y: h.world.heightAt(p.x, p.z) });
      await walkAlong(cave.openings[0], insideAlong, 'entering the Upper Olveth passage');
      check(h.cave.cave?.id === cave.id, 'Ordinary W movement crosses the cave mouth into its passage');
      check(Math.abs(h.position().y - h.cave.floorAt(h.position().x, h.position().z)) < .1,
        'Inside the cave, the player stands on its floor instead of the outdoor heightfield');
    };
    await enter(); await h.frames(35);
    check(h.camera().y < h.world.heightAt(h.camera().x, h.camera().z),
      'The passage camera remains below the mountain surface');
    await capture('lotharn-cave-inside');
    const safe = h.cave.safeEntrance, snapshot = h.snapshot();
    check(gap(snapshot.position, safe) < .01, 'A cave checkpoint records the explicit safe entrance');
    check(h.save(), 'The cave visit saves into the isolated testing checkpoint');
    check(await h.reload(), 'The cave checkpoint reloads through the normal game recovery flow');
    await h.frames(3);
    check(!h.cave.active && gap(h.position(), safe) < .1,
      'Loading the cave checkpoint returns to its entrance with underground support cleared');
    await enter();
    await walkAlong(h.cave.along, Math.min(cave.length, cave.openings[1] + .8), 'leaving the far cave mouth');
    check(!h.cave.active && Math.abs(h.position().y - h.world.heightAt(h.position().x, h.position().z)) < .2,
      'The through-passage exits onto the far valley floor');
    await enter(); await travel('Feradom', 21);
    check(!h.cave.active && h.cave.camera(h.position()) === null,
      'Testing travel clears cave floor, lighting ownership, and passage camera');

    // A fixed fixture from the real heightfield, not a synthetic replacement surface.
    const foothold = { x: -1029.9515997469423, z: -765.5029544579392, yaw: 1.8224636106432532 };
    check(foothold && Number.isFinite(foothold.x + foothold.z + foothold.yaw), 'An authored Lotharn foothold is available for the climbing check');
    h.warp(foothold); await h.frames(2);
    check(h.world.regionAt(foothold.x, foothold.z).id === 20, 'The climbing fixture belongs to East Lotharn');
    check(h.climbing.probe(h.position(), foothold.yaw).available, 'The modern controller can reach a real Lotharn rock face');
    tap('Space');
    check(h.climbing.view().phase === 'climbing', 'Space grips the imported mountain through ordinary game input');
    const before = h.position(), stamina = h.combat.state.player.stamina;
    let highest = before.y, lowestStamina = stamina;
    h.press('KeyW');
    for (let i = 0; i < 20; i++) {
      await h.frames(1);
      highest = Math.max(highest, h.position().y);
      lowestStamina = Math.min(lowestStamina, h.combat.state.player.stamina);
      if (!h.climbing.active) break;
    }
    h.release('KeyW');
    // A short face may crest within these frames and start regenerating on the ledge.
    // Observe the climb itself rather than requiring stamina to remain depleted afterward.
    check(highest > before.y + .05 && lowestStamina < stamina,
      'Holding W climbs Lotharn terrain and consumes the current stamina pool');
    await capture('lotharn-climbing');
    await travel('East Lotharn Mountains', 20);
    check(!h.climbing.active && !h.cave.active, 'Public travel cancels an active mountain grip cleanly');
    check(h.saved() === savedBefore, 'Regional travel, caves, and climbing preserve the normal saved adventure');
    const errors = h.state().frameErrors;
    check((typeof errors === 'number' ? errors : errors?.count ?? 0) === 0, 'The native region checks produce no renderer frame errors');
    return { ok: true, checks, visits, wildlife: { eastLotharn: lotharnAnimals.length, westLotharn: westAnimals.length, feradom: feradomAnimals.length },
      scenery: { eastLotharn: lotharn, westLotharn, feradom }, elapsedMs: Math.round(performance.now() - started) };
  } finally { for (const code of ['KeyW', 'Space', 'KeyX']) h.release(code); }
}
