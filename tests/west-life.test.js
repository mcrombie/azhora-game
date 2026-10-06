import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, canSwim } from '../src/gameplay/movement/game-state.js';

/**
 * The west's animals with somebody among them.
 *
 * The four regions were first proved with nobody there. Measured with a traveler walking at
 * them, every kind but the hare fled slower than a man walks: a sheep was walked down in
 * seventeen seconds, a wader could be stood on, and the fox's drift could not keep arm's length
 * from anybody. A chased band then took ten minutes to re-form, and only if watched.
 *
 * So these hold the paces to the traveler's own - a walk is 4.2 m/s and a run is 7.2
 * (src/main.js) - by principle rather than by number: nothing wild can be walked down; the quick
 * ones cannot be run down either; sheep can be herded by somebody running; cattle give ground
 * and face you instead of bolting; the fox never flees; and a band is home again in a few
 * minutes whether or not anybody stayed to watch.
 *
 * **One of those principles was a question with an assumption in it, and the assumption came out on
 * 2026-10-01.** "Nothing can be walked down" was written as "nobody walking got within arm's length",
 * which is true of every animal that answers a traveler by opening distance - and that was every animal
 * in the west until the canyon tortoise. A tortoise cannot open distance and does not try: it stops and
 * shuts. So the first law below now asks of an animal that shuts the question the law was always about -
 * whether walking it down *got anybody anything* - and asks it of whatever shuts in the chase itself,
 * rather than of anything flagged on a range. Nothing is exempted and no animal is skipped.
 */
const { createWorld } = await sourceModule('../src/world.js');
const { WEST_LIFE_ZONES, createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const world = createWorld(new THREE.Scene());
const WALK = 4.2, RUN = 7.2, HZ = 60;
// Everything a traveler could walk up to. A hawk holds its circle thirty metres up and Eer's
// dolphins are out past the surf, and neither has any footing to be asked about: the six laws
// below are about what happens when somebody on foot comes at an animal, and nobody on foot
// can come at either of those. `tests/eer-world.test.js` holds the dolphins to their own law.
const ground = WEST_LIFE_ZONES.filter(zone => !zone.air && !zone.sea);
const bySpecies = species => ground.filter(zone => zone.species === species);
/**
 * Every cow in the world, whatever breed. The cattle laws below used to read `longhorn`,
 * which was true of every cow there was until Nethereum's short-legged beast landed — and a
 * law that says "cattle do not bolt" has to be about cattle and not about one name for them.
 */
const CATTLE = new Set(['longhorn', 'nethrani-cattle']);
const cattle = ground.filter(zone => CATTLE.has(zone.species));
const turn = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/**
 * Put a traveler forty metres from the first animal of a band and have them make straight for
 * it for `seconds`, the way somebody curious would. "Within reach" means on the ground, in
 * sight, and that close: a bird overhead or an otter under the water is not within reach.
 */
function chase(zone, pace, seconds, { bearing = Math.PI / 2, arm = 3 } = {}) {
  let held = 0;
  // Other populations never steer this band; isolate it so long chase tests do
  // not render and copy every unrelated creature in the world on every frame.
  const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
  const band = () => life.state().creatures;
  const first = band()[0], homes = new Map(band().map(animal => [animal.id, { x: animal.x, z: animal.z }]));
  const player = { x: first.x + Math.sin(bearing) * 40, z: first.z + Math.cos(bearing) * 40 };
  const seen = new Set(), report = { life, band, homes, player, zone, target: first.id, closest: Infinity, reachedAt: null, held: 0, within: 0, gap: Infinity, actions: seen, offFooting: 0, facing: [], shutFor: 0, shutMoved: 0, openWithin: 0 };
  const watch = t => {
    for (const animal of band()) {
      seen.add(animal.action);
      // A bird that has taken off is over the water within a wingbeat; footing is for what is standing.
      // Nor for an otter on its way into the river: the water is where it is going.
      const grounded = !animal.hidden && animal.lift < 1, standing = !animal.hidden && animal.action !== 'fly' && animal.action !== 'dive';
      // A floating bird's footing is the water as well as the ground (the Stillwater's duck).
      if (standing && !((canStand(animal.x, animal.z, world, zone.radius) || (zone.float && canSwim(animal.x, animal.z, world, zone.radius)))
        && animal.x >= zone.minX && animal.x <= zone.maxX && animal.z >= zone.minZ && animal.z <= zone.maxZ)) report.offFooting++;
      if (animal.id !== first.id) continue;
      const d = Math.hypot(animal.x - player.x, animal.z - player.z);
      if (grounded) { report.closest = Math.min(report.closest, d); if (d < 1.5 && report.reachedAt === null) report.reachedAt = t; }
      // Held: how long at a stretch it stayed within `arm`. An animal cornered at the edge of its
      // range breaks back past you, which is a moment; being walked down is staying there.
      held = grounded && d < arm ? held + 1 : 0; report.held = Math.max(report.held, held / HZ);
      if (grounded && d < arm) report.within += 1 / HZ;
      report.gap = grounded ? d : Infinity;
      // An animal that **shuts** instead of running (the canyon tortoise): how long it was shut, the
      // fastest it moved while it was, and how long it was open with somebody inside arm's length —
      // which is what "approaching it achieves nothing" means when it is measured rather than asserted.
      if (animal.action === 'shut') { report.shutFor += 1 / HZ; report.shutMoved = Math.max(report.shutMoved, animal.speed); }
      else if (d < arm) report.openWithin += 1 / HZ;
      if (animal.action === 'yield' || animal.action === 'withdraw') report.facing.push(turn(animal.yaw, Math.atan2(player.x - animal.x, player.z - animal.z)));
    }
  };
  for (let i = 0; i < seconds * HZ; i++) {
    const animal = band().find(item => item.id === first.id), dx = animal.x - player.x, dz = animal.z - player.z, d = Math.hypot(dx, dz);
    if (d > .4) { const step = Math.min(d - .3, pace / HZ); player.x += dx / d * step; player.z += dz / d * step; }
    life.update(1 / HZ, player, true); watch(i / HZ);
  }
  report.watch = watch;
  return report;
}
const fromHome = report => report.band().map(animal => { const home = report.homes.get(animal.id); return Math.hypot(animal.x - home.x, animal.z - home.z); });
/** How far the one animal that was chased ended up from where it started, which is what a chase achieved. */
const chasedMoved = report => {
  const animal = report.band().find(item => item.id === report.target), home = report.homes.get(report.target);
  return Math.hypot(animal.x - home.x, animal.z - home.z);
};

test('live wildlife positions and care effects update while saved observations remain detached', () => {
  const life = createWestLife(new THREE.Scene(), world);
  const state = life.state(), cow = state.creatures.find(animal => CATTLE.has(animal.species));
  const saved = life.snapshot().creatures.find(animal => animal.id === cow.id);
  assert.ok(cow);
  assert.equal(life.calm(cow.id, 8), true);
  assert.equal(cow.calmFor, 8, 'an already acquired interaction view sees the care effect');
  assert.equal(saved.calmFor, 0, 'an earlier snapshot does not change');
  life.update(.1, { x: cow.x + 6, z: cow.z }, true);
  assert.ok(cow.calmFor < 8 && cow.calmFor > 0);
  assert.ok(state.updates > 0);
  assert.equal(life.state().creatures, state.creatures, 'interaction polling does not copy the western animals');
  const x = cow.x;
  assert.throws(() => { cow.x = x + 1000; }, TypeError, 'reading wildlife does not hand out mutable simulation objects');
  assert.equal(life.snapshot().creatures.find(animal => animal.id === cow.id).x, x);
  life.dispose();
});

/**
 * **No range may be wider than the reach it is run from.** A flock is ticked when the
 * traveler is within `LIFE_REACH` of its *centre*, not of its animals, so an animal that
 * flees to a far corner of a wide range takes the traveler out past that reach — and the
 * whole band stops being ticked and freezes where it stands, which somebody can then walk
 * up to and stand on.
 *
 * This is not hypothetical and it is not old. Isareos's red deer were given a range three
 * hundred and sixty metres across so that a runner could not corner them, and the cure was
 * worse: traced through a chase, a hind ran to a corner, the flock went quiet, and a walker
 * closed the last hundred and forty metres onto an animal that had stopped moving. Every
 * range in the west is held to the rule here so that the next country's are too.
 */
test('no band is given a range it can run out of the reach of', () => {
  for (const zone of WEST_LIFE_ZONES) {
    // The rule is about **fleeing**, so it is about the ones that flee. A hawk holds a
    // circle round its own home whatever anybody does and the dolphins work a line up and
    // down theirs; neither ever heads for a corner, and the hawk's range has been wider
    // than this since Vastos was built.
    if (zone.air || zone.sea) continue;
    const half = Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2;
    assert.ok(half < LIFE_REACH, `${zone.id}: half its diagonal is ${half.toFixed(0)} m, past the ${LIFE_REACH} m it is run from`);
    // And its animals start inside it, which is what makes the centre the middle of them.
    for (const [x, z] of zone.sites)
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id}: a site lies outside its own range`);
  }
});

/**
 * **The law assumed that every animal flees, and one does not.**
 *
 * "Nothing in the west can be walked down" was written as one question — did somebody walking get
 * within arm's length — because every animal in the west answered a traveler by opening distance. The
 * canyon tortoise cannot, and the lore both names it and describes it ("a large, slow-moving grazer of
 * desert seeps"), so for three jobs running it was the one animal the Dinelv Highlands wanted and could
 * not have: a tortoise that fled would have been the lie, and a tortoise exempted from the law by a flag
 * would have been the law giving up.
 *
 * So the question was wrong rather than the animal. What the law is *about* is that walking at an animal
 * must not get the traveler anything, and distance is only how most animals arrange that. An animal that
 * **shuts** arranges it the other way: it stops where it is, draws in, and becomes a stone. So the law
 * now has two halves, chosen by **what the animal was observed to do in the chase itself** — not by a
 * field on its range, which is what an exemption would have been. An animal that shuts is held to the
 * harder half: it was shut before the traveler arrived, it did not move a centimetre while they stood
 * over it, it never once opened while they were inside arm's length, and it is exactly where it started.
 * An animal that does anything else is held to the old half, to the centimetre, as it always was.
 */
test('wildlife reacts to approach: fleeing animals keep distance, tortoises shut and territorial predators display', () => {
  const shutters = new Set();
  for (const zone of ground) {
    const arm = zone.species === 'river-fox' ? 2 : CATTLE.has(zone.species) ? 5 : 3;
    const walked = chase(zone, WALK, 30, { arm });
    if (zone.territorial) {
      // A giant apex reptile warns and holds its territory instead of behaving
      // like prey. Its deliberate stalking and visible display have their own
      // geometry and encounter checks in babon-wildlife.test.js.
      assert.ok(walked.actions.has('watch') || walked.actions.has('stalk') || walked.actions.has('display'), `${zone.id}: no territorial response`);
      assert.ok(walked.actions.has('display'), `${zone.id}: approaching never produced its warning display`);
      assert.ok(!walked.actions.has('flee') && !walked.actions.has('shut'), `${zone.id}: a territorial predator behaved like frightened prey`);
      assert.ok(walked.band().every(animal => !animal.hidden), `${zone.id}: its response must remain visible`);
    } else if (walked.actions.has('shut')) {
      shutters.add(zone.species);
      // It can be approached — that is the half of the law a tortoise would have failed —
      assert.ok(walked.reachedAt !== null, `${zone.id}: it shuts and still could not be walked up to (closest ${walked.closest.toFixed(2)} m)`);
      assert.ok(!walked.actions.has('flee'), `${zone.id}: it fled, which is not what a tortoise does`);
      // — and approaching it achieved nothing: shut for all but the walk up to it, never moving while
      // shut, never open with somebody within arm's length, and still standing where it was. The bound is
      // the walk itself rather than a number: it was shut from before the traveler got to it (it shuts at
      // seven metres and a walker covers the last of that in a second and a half) to the end of the chase.
      assert.ok(walked.shutFor > 30 - walked.reachedAt - .5,
        `${zone.id}: it was shut for ${walked.shutFor.toFixed(1)} s of thirty and was reached at ${walked.reachedAt.toFixed(1)} s`);
      assert.ok(walked.shutMoved < .02, `${zone.id}: it moved at ${walked.shutMoved.toFixed(3)} m/s while shut`);
      assert.equal(walked.openWithin, 0, `${zone.id}: it was open for ${walked.openWithin.toFixed(1)} s with somebody at arm's length`);
      // Twenty centimetres is the amble it takes before the traveler is near enough to shut it; after
      // that it is where it was, and the chase is thirty seconds of a traveler achieving nothing.
      assert.ok(chasedMoved(walked) < .5, `${zone.id}: a chase moved it ${chasedMoved(walked).toFixed(2)} m`);
      assert.ok(walked.band().every(animal => !animal.hidden), `${zone.id}: it went somewhere, and a tortoise has nowhere to go`);
    } else if (zone.species !== 'hill-sheep')
      assert.ok(walked.closest >= arm, `${zone.id}: somebody walking got within ${walked.closest.toFixed(2)} m of ${walked.target}`);
    else {
      // Sheep are the one kind that can be cornered on foot: they neither fly nor dive, their
      // range has an edge, and the Flats have water on them. Measured, one ran up a wedge between
      // the braids and the end of its range, a metre wide at the tip, and came out again past the
      // walker standing in its six-metre mouth. That is two seconds inside arm's length and it is
      // what a cornered sheep does. Being walked down is staying there - before this, a walker
      // reached one in seventeen seconds and was on it for the rest of the chase - so: under a
      // fifth of the chase, and never three seconds together.
      assert.ok(walked.within < 6, `${zone.id}: somebody walking was within ${arm} m of ${walked.target} for ${walked.within.toFixed(1)} s of thirty`);
      assert.ok(walked.held < 3, `${zone.id}: somebody walking stayed within ${arm} m of ${walked.target} for ${walked.held.toFixed(1)} s together`);
    }
    assert.equal(walked.offFooting, 0, `${zone.id}: an animal on the ground stood somewhere it cannot stand`);
    walked.life.dispose();
  }
  // **And exactly one kind of animal in the west answers a traveler this way.** The second half of the
  // law is the harder one to pass, so it must not be available to anything that could have fled instead.
  assert.deepEqual([...shutters], ['canyon-tortoise'], 'the shut is not the tortoise’s alone');
});

/**
 * **The canyon tortoise, both halves of it, on its own.** The law above proves the principle over every
 * range in the west; this proves the animal, at a run as well as at a walk, and proves the thing a flag
 * on the range could never have proved: that it opens again when it is left alone.
 */
test('the canyon tortoise withdraws instead of fleeing: it can be walked up to, and walking up to it achieves nothing', () => {
  const zone = bySpecies('canyon-tortoise')[0];
  assert.ok(zone, 'there is no canyon tortoise in the west');
  for (const [pace, name] of [[WALK, 'a walk'], [RUN, 'a run']]) {
    const come = chase(zone, pace, 20);
    assert.ok(come.actions.has('shut'), `${name} did not shut it`);
    assert.ok(!come.actions.has('flee') && !come.actions.has('fly') && !come.actions.has('dive'),
      `at ${name} it did one of the things it has not got: ${[...come.actions].join(', ')}`);
    assert.ok(come.reachedAt !== null && come.reachedAt < 12, `at ${name} it took ${come.reachedAt?.toFixed(1)} s to reach`);
    // It was already shut when they arrived: the shutting is not a reaction to being touched.
    assert.ok(come.shutFor > 20 - come.reachedAt - .5,
      `at ${name} it was shut for ${come.shutFor.toFixed(1)} s of twenty and was reached at ${come.reachedAt.toFixed(1)} s`);
    assert.equal(come.openWithin, 0, `at ${name} it was open with somebody at arm's length`);
    assert.ok(come.shutMoved < .02, `at ${name} it moved at ${come.shutMoved.toFixed(3)} m/s while shut`);
    assert.ok(chasedMoved(come) < .5, `at ${name} the chase moved it ${chasedMoved(come).toFixed(2)} m`);
    assert.equal(come.offFooting, 0, 'a shut tortoise stood somewhere it cannot stand');
    // And it opens again once they have gone, which is the half an exemption could not have expressed.
    const away = { x: come.player.x + 400, z: come.player.z };
    for (let i = 0; i < 20 * HZ; i++) come.life.update(1 / HZ, away, true);
    come.life.update(1 / HZ, { x: come.player.x + 60, z: come.player.z }, true);
    assert.ok(come.band().every(animal => animal.action !== 'shut'),
      `twenty seconds after ${name} it is still shut`);
    come.life.dispose();
  }
});

/**
 * **The ghubr's own rule, which is a sentence of lore rather than an animation.** `ganesh_desert.md`:
 * "the dustback does not stand still in conditions where the surface air is actively dangerous", and "a
 * dustback seen resting in shade is a reliable signal of temperature conditions that the caravan's load
 * animals will find stressful". The game has no hour of the day, so the Ganesh is always that month: this
 * bird never stands still out on the open floor, and where it is seen standing is its own patch of scrub.
 */
test('the ghubr does not stand still on the open desert floor, and where it rests is its shade', () => {
  const zone = bySpecies('ghubr')[0];
  assert.ok(zone?.shade > 0, 'the ghubr has no shade to rest in');
  const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
  const centre = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
  const homes = new Map(life.state().creatures.map(animal => [animal.id, { x: animal.x, z: animal.z }]));
  // Far enough off that nothing minds (it goes at ten metres), near enough that the band is run.
  const watcher = { x: centre.x + 70, z: centre.z + 70 };
  let rested = 0, worked = 0, out = 0, standingOut = 0;
  for (let i = 0; i < 150 * HZ; i++) {
    life.update(1 / HZ, watcher, true);
    for (const animal of life.state().creatures) {
      const home = homes.get(animal.id), d = Math.hypot(animal.x - home.x, animal.z - home.z);
      out = Math.max(out, d);
      if (d <= zone.shade) { if (animal.action === 'graze') rested++; }
      else if (animal.action === 'graze') standingOut++;
      else worked++;
    }
  }
  assert.ok(out > zone.shade, `no ghubr ever left its shade (furthest ${out.toFixed(1)} m of ${zone.shade})`);
  assert.equal(standingOut, 0, `a ghubr stood still on the open floor for ${(standingOut / HZ).toFixed(1)} bird-seconds`);
  assert.ok(worked / HZ > 20, `the birds were only out on the floor for ${(worked / HZ).toFixed(1)} bird-seconds of a hundred and fifty`);
  assert.ok(rested / HZ > 5, `and they never rested in the shade (${(rested / HZ).toFixed(1)} bird-seconds)`);
  // It is still a bird: walked at, it goes up, which is how it answers the first law.
  const walked = chase(zone, WALK, 20);
  assert.ok(walked.actions.has('fly'), 'a ghubr that is walked at does not take to the air');
  assert.ok(walked.closest >= 3, `a walker got within ${walked.closest.toFixed(2)} m of it`);
  walked.life.dispose();
  life.dispose();
});

test('the quick ones cannot be run down either: the hare on its legs, the wader into the air, the otter into the water', () => {
  for (const species of ['upland-hare', 'wading-bird', 'otter']) for (const zone of bySpecies(species)) {
    const run = chase(zone, RUN, 30);
    assert.equal(run.reachedAt, null, `${zone.id}: somebody running reached ${run.target} after ${run.reachedAt?.toFixed(1)} s`);
    assert.equal(run.offFooting, 0, `${zone.id}: an animal on the ground stood somewhere it cannot stand`);
    if (species === 'wading-bird') assert.ok(run.actions.has('fly'), `${zone.id}: a wader that is run at takes to the air`);
    run.life.dispose();
  }
  // The otter's way out is the water, and the corridor's otters are on its bank.
  const otters = chase(bySpecies('otter')[0], RUN, 30);
  assert.ok(otters.actions.has('dive'), 'the otter went into the water');
  otters.life.dispose();
});

test('an otter that is come upon goes into the water where you can see it go, and comes up somewhere else', () => {
  // Photographed in the renderer before this, the otter was simply not there any more between
  // one frame and the next: its bank spot is within a stride of the water, so it dived the
  // moment it took fright. It cannot be caught either way; now there is half a second to watch.
  const zone = bySpecies('otter')[0], life = createWestLife(new THREE.Scene(), world);
  const otter = () => life.snapshot().creatures.find(animal => animal.id === `${zone.id}-1`);
  const home = otter(), player = { x: home.x - 30, z: home.z }, seen = [];
  for (let i = 0; i < 14 * HZ; i++) {
    const at = otter(), dx = at.x - player.x, dz = at.z - player.z, d = Math.hypot(dx, dz);
    if (!at.hidden && d > 3) { const step = Math.min(d - 3, WALK / HZ); player.x += dx / d * step; player.z += dz / d * step; }
    life.update(1 / HZ, player, true);
    seen.push(otter());
  }
  const slip = seen.filter(now => now.action === 'dive' && !now.hidden);
  assert.ok(slip.length / HZ >= .3 && slip.length / HZ <= .8, `it was seen going in for ${(slip.length / HZ).toFixed(2)} s`);
  for (let i = 1; i < slip.length; i++) assert.ok(slip[i].y <= slip[i - 1].y + 1e-6, 'it only ever goes down');
  assert.ok(slip[0].y - slip.at(-1).y > .3, `it sank ${(slip[0].y - slip.at(-1).y).toFixed(2)} m before it was gone`);
  for (const now of slip) assert.ok(Math.abs(now.groundY - world.heightAt(now.x, now.z)) < .05, 'its ground is still whatever is under it');
  const under = seen.filter(now => now.hidden);
  assert.ok(under.length / HZ > 3, 'and then it is under for a while');
  const up = seen.at(-1);
  assert.ok(!up.hidden && up.lift === 0 && up.action !== 'dive', `fourteen seconds on it is ${up.action}, ${up.hidden ? 'still under' : 'up'}`);
  assert.ok(Math.hypot(up.x - player.x, up.z - player.z) >= 14, 'and it came up well away from whoever sent it in');
  assert.ok(canStand(up.x, up.z, world, zone.radius), 'on a bank it can stand on');
  life.dispose();
});

test('sheep can be herded by somebody running, and cattle give ground instead of bolting', () => {
  for (const zone of bySpecies('hill-sheep')) {
    const run = chase(zone, RUN, 25);
    assert.ok(run.reachedAt !== null, `${zone.id}: somebody running never got among the sheep (closest ${run.closest.toFixed(1)} m)`);
    run.life.dispose();
  }
  for (const zone of cattle) {
    const walked = chase(zone, WALK, 30);
    assert.ok(walked.actions.has('yield') && !walked.actions.has('flee'), `${zone.id}: cattle ${[...walked.actions].join(', ')}`);
    const settled = walked.facing.slice(HZ);   // a second to get its head round
    assert.ok(settled.length > HZ && settled.every(off => off < .8), `${zone.id}: cattle giving ground turn to face you (worst ${Math.max(...settled).toFixed(2)} rad off)`);
    walked.life.dispose();
    const run = chase(zone, RUN, 25);
    assert.ok(run.reachedAt !== null, `${zone.id}: somebody running can still get up to cattle`);
    assert.ok(!run.actions.has('flee'), `${zone.id}: cattle do not bolt even from somebody running`);
    run.life.dispose();
  }
});

test('the river fox never flees, keeps arm’s length from a walker, and only a run closes on it', () => {
  for (const zone of bySpecies('river-fox')) {
    const walked = chase(zone, WALK, 30);
    assert.ok(!walked.actions.has('flee'), `${zone.id}: a river fox fled`);
    assert.ok(walked.actions.has('watch') && walked.actions.has('withdraw'), `${zone.id}: it watched, and at arm’s length it gave way`);
    assert.ok(walked.closest >= 2, `${zone.id}: a walker got within ${walked.closest.toFixed(2)} m of the fox`);
    const settled = walked.facing.slice(HZ);
    assert.ok(settled.every(off => off < .8), `${zone.id}: it never turns its back (worst ${Math.max(0, ...settled).toFixed(2)} rad off)`);
    walked.life.dispose();
    const run = chase(zone, RUN, 30);
    assert.ok(!run.actions.has('flee'), `${zone.id}: a river fox fled from somebody running`);
    assert.ok(run.closest < 2, `${zone.id}: a flat run does gain on it (closest ${run.closest.toFixed(2)} m)`);
    run.life.dispose();
  }
});

test('a chased band is home again in a few minutes, watched or not', () => {
  for (const zone of ground) {
    // Watched: run at them, then stand a hundred metres off, where the band still moves and nothing is afraid.
    const watched = chase(zone, RUN, 20), centre = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
    const scattered = Math.max(...fromHome(watched));
    // Somewhere the band still moves (inside its tick range) and nobody is near enough to mind: an
    // animal with the traveler twenty metres off is right to stay where it is until they go.
    const clear = spot => Math.min(...watched.band().map(animal => Math.hypot(animal.x - spot.x, animal.z - spot.z)));
    const park = [[100, 0], [-100, 0], [0, 100], [0, -100], [70, 70], [-70, -70], [70, -70], [-70, 70]]
      .map(([dx, dz]) => ({ x: centre.x + dx, z: centre.z + dz })).sort((a, b) => clear(b) - clear(a))[0];
    assert.ok(clear(park) > 40, `${zone.id}: nowhere within reach of the band is clear of all of it`);
    watched.player.x = park.x; watched.player.z = park.z;
    for (let i = 0; i < 180 * 30; i++) { watched.life.update(1 / 30, watched.player, true); watched.watch(0); }
    // "Home" is its own ground: an animal ambles out to sixteen metres before it turns back, plus a stride.
    assert.ok(Math.max(...fromHome(watched)) <= 20, `${zone.id}: three minutes on, watched, one is still ${Math.max(...fromHome(watched)).toFixed(0)} m from home (it was ${scattered.toFixed(0)} m)`);
    assert.equal(watched.offFooting, 0, `${zone.id}: an animal going home stood somewhere it cannot stand`);
    watched.life.dispose();

    // Unwatched: run at them, then go a kilometre off for four minutes and come back.
    const left = chase(zone, RUN, 20), far = { x: centre.x + 1000, z: centre.z };
    const fromHomes = spot => Math.min(...[...left.homes.values()].map(home => Math.hypot(home.x - spot.x, home.z - spot.z)));
    const back = [[100, 0], [-100, 0], [0, 100], [0, -100]].map(([dx, dz]) => ({ x: centre.x + dx, z: centre.z + dz }))
      .sort((a, b) => fromHomes(b) - fromHomes(a))[0];
    for (let i = 0; i < 240 * 30; i++) left.life.update(1 / 30, far, true);
    left.life.update(1 / 30, back, true);
    assert.ok(Math.max(...fromHome(left)) <= 20, `${zone.id}: left alone for four minutes and still ${Math.max(...fromHome(left)).toFixed(0)} m from home`);
    assert.ok(left.band().every(animal => !animal.hidden && animal.action !== 'fly'), `${zone.id}: somebody is still in the air or under the water`);
    left.life.dispose();
  }
});

test('a band left for a moment has moved a moment’s worth, not been put back', () => {
  const zone = bySpecies('longhorn')[0], away = chase(zone, RUN, 20);
  const before = fromHome(away), centre = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
  assert.ok(Math.max(...before) > 30, 'the chase scattered them');
  for (let i = 0; i < 10 * 30; i++) away.life.update(1 / 30, { x: centre.x + 1000, z: centre.z }, true);
  away.life.update(1 / 30, { x: centre.x + 100, z: centre.z }, true);
  const after = fromHome(away);
  before.forEach((was, i) => {
    assert.ok(after[i] <= was + .5, 'nobody went further from home while unwatched');
    assert.ok(was - after[i] <= 1.3 * 10.1 + 1.5, `ten seconds away moved one of them ${(was - after[i]).toFixed(1)} m`);
  });
  away.life.dispose();
});
