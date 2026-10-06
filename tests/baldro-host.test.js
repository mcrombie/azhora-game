import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const { createBaldroHost } = await sourceModule('../src/content/regions/baldro/baldro-host.js');
const { BALDRO_KINGDOMS } = await sourceModule('../src/content/regions/baldro/baldro-world.js');

function fixture() {
  const scene = new THREE.Scene(), player = { group: new THREE.Group() }, rewards = [], dialogues = [], toasts = [], focused = [];
  let saves = 0, transitions = 0, allowed = true;
  const world = { heightAt: () => 100 };
  const host = createBaldroHost({ scene, world, player, reward: value => rewards.push(value),
    openDialogue: (...args) => dialogues.push(args), closeDialogue: () => {}, toast: (...args) => toasts.push(args),
    save: () => saves++, focus: id => focused.push(id), transition: () => transitions++, available: () => allowed });
  const at = p => player.group.position.set(p.x, p.y ?? 100, p.z);
  const gate = kingdom => at({ x: kingdom.gate.x, z: kingdom.gate.z + 2.5 });
  const choice = suffix => {
    const choices = dialogues.at(-1)?.[4]?.choices ?? [];
    const selected = choices.find(item => item.id.endsWith(`-${suffix}`));
    assert.ok(selected, `current dialogue offers ${suffix}`); selected.action();
  };
  function earn(kingdom) {
    gate(kingdom); assert.equal(host.interact(), true); choice('accept');
    for (const site of kingdom.taskSites) { at({ ...site, y: 100 }); assert.equal(host.nearby()?.kind, 'site'); assert.equal(host.interact(), true); }
    gate(kingdom); assert.equal(host.interact(), true); choice('report');
  }
  return { host, scene, player, rewards, dialogues, toasts, focused, at, gate, choice, earn,
    get saves() { return saves; }, get transitions() { return transitions; }, set allowed(value) { allowed = value; } };
}

test('startup and gate service retain city targets and resident identities without building hidden interiors', () => {
  const f = fixture(), [west, east] = f.host.holds;
  const count = hold => { let objects = 0; hold.group.traverse(() => objects++); return objects; };
  const initial = f.host.holds.map(count), actors = f.host.people.filter(person => !person.guard).map(person => person.actor);
  assert.deepEqual(initial, [5, 5], 'only the hold group and four logical resident groups exist');
  assert.ok(f.host.holds.every(hold => !hold.built && !hold.group.visible));
  assert.equal(f.scene.getObjectByName('West Hold fitted repair rivet'), undefined);
  assert.equal(west.walk.canStand(f.host.introTargets.smith.x, f.host.introTargets.smith.z), true);
  assert.equal(west.walk.canStand(f.host.introTargets.forge.x, f.host.introTargets.forge.z), true);
  f.earn(east.kingdom); f.host.frame(0);
  assert.deepEqual(f.host.holds.map(count), initial, 'completing the outdoor service leaves both interiors unloaded');
  assert.equal(f.host.enter(west.kingdom.id), false);
  f.allowed = false; assert.equal(f.host.enter(east.kingdom.id), false);
  assert.deepEqual(f.host.holds.map(count), initial, 'denied entry does not allocate a city');
  f.allowed = true;
  const walk = east.walk, position = actors[4].group.position;
  assert.equal(f.host.enter(east.kingdom.id), true); f.host.frame(0);
  assert.equal(east.built, true); assert.equal(west.built, false); assert.equal(count(west), initial[0]);
  assert.ok(count(east) > 100, 'the entered city includes masonry, lights and detailed residents');
  assert.equal(east.walk, walk); assert.equal(actors[4].group.position, position);
  assert.deepEqual(f.host.people.filter(person => !person.guard).map(person => person.actor), actors);
  assert.equal(east.group.children.filter(child => child.isPointLight).length, 6);
  const constructed = count(east);
  f.host.leave(); f.host.enter(east.kingdom.id); f.host.frame(0);
  assert.equal(count(east), constructed, 'repeated entry reuses the city and all resident rigs');
});

test('a fresh partly forged checkpoint stays unloaded until entry and then reconstructs its saved workpiece', () => {
  const previous = fixture(), west = BALDRO_KINGDOMS[0]; previous.earn(west); previous.host.enter(west.id);
  previous.at(previous.host.introTargets.smith); previous.host.interact(); previous.choice('lesson');
  previous.at(previous.host.introTargets.forge); previous.host.interact(); previous.host.interact();
  const saved = JSON.parse(JSON.stringify(previous.host.snapshot())), next = fixture();
  assert.equal(next.host.restore(saved), true); next.host.frame(0);
  assert.ok(next.host.holds.every(hold => !hold.built));
  assert.equal(next.scene.getObjectByName('West Hold fitted repair rivet'), undefined);
  assert.deepEqual(next.host.snapshot(), saved); assert.deepEqual(next.rewards, []);
  assert.equal(next.host.introductionView().target.kind, 'gate');
  next.host.enter(west.id); next.host.frame(0);
  const workpiece = next.scene.getObjectByName('West Hold fitted repair rivet');
  assert.equal(workpiece.visible, true); assert.equal(workpiece.userData.forgeStep, 2);
  assert.equal(workpiece.userData.forgeAction, 'quench');
  assert.equal(next.host.holds[1].built, false);
  next.at(next.host.introTargets.forge); next.host.interact();
  next.at(next.host.introTargets.smith); next.host.interact(); next.choice('lesson-finish');
  assert.equal(next.host.introductionView().complete, true);
  assert.deepEqual(next.rewards, [{ skill: 'smithing', xp: 45 }, { skill: 'dwarvenSmithing', xp: 30 }]);
});

test('the actual Baldro gate interactions keep unearned portals locked and require accepting all repairs then reporting', () => {
  const f = fixture(), west = BALDRO_KINGDOMS[0];
  assert.equal(f.host.enter(west.id), false);
  f.gate(west); assert.equal(f.host.nearby().kind, 'gate'); f.host.interact();
  assert.ok(f.dialogues.at(-1)[4].choices.some(choice => choice.id.endsWith('-accept')));
  assert.equal(f.host.active, false);
  f.choice('accept');
  for (const site of west.taskSites.slice(0, 2)) { f.at({ ...site, y: 100 }); f.host.interact(); }
  assert.equal(f.host.enter(west.id), false);
  f.gate(west); f.host.interact();
  assert.equal(f.dialogues.at(-1)[4].choices.some(choice => choice.id.endsWith('-report')), false);
  f.at({ ...west.taskSites[2], y: 100 }); f.host.interact();
  assert.equal(f.host.enter(west.id), false, 'the guard must record the completed work');
  f.gate(west); f.host.interact(); f.choice('report');
  assert.deepEqual(f.rewards, [{ skill: 'construction', xp: 30 }]);
  f.gate(west); f.host.interact();
  assert.equal(f.host.current, west.id);
  assert.deepEqual(f.player.group.position.toArray(), [f.host.holds[0].walk.spawn.x, f.host.holds[0].walk.spawn.y, f.host.holds[0].walk.spawn.z]);
});

test('earning entry to West Hold does not authorize East Hold and repeated interaction never repeats Construction XP', () => {
  const f = fixture(), [west, east] = BALDRO_KINGDOMS;
  f.earn(west);
  assert.equal(f.host.model.canEnter(west.id), true);
  assert.equal(f.host.model.canEnter(east.id), false);
  assert.equal(f.host.enter(east.id), false);
  f.at({ ...west.taskSites[0], y: 100 }); const saved = f.saves; f.host.interact();
  assert.equal(f.saves, saved, 'an already restored cairn makes no extra checkpoint');
  assert.equal(f.rewards.length, 1);
  f.earn(east);
  assert.equal(f.rewards.length, 2);
  assert.equal(f.host.enter(east.id), true);
  f.at(f.host.holds[1].walk.exit); assert.equal(f.host.nearby().kind, 'exit'); f.host.interact();
  assert.equal(f.host.current, null);
  assert.equal(f.player.group.position.y, 100);
  assert.ok(f.host.holds.every(hold => !hold.group.visible));
});

test('host checkpoints preserve independent permissions and partial repairs but always restore the traveler outside', () => {
  const f = fixture(), [west, east] = BALDRO_KINGDOMS;
  f.earn(west);
  f.gate(east); f.host.interact(); f.choice('accept');
  f.at({ ...east.taskSites[0], y: 100 }); f.host.interact();
  const snapshot = JSON.parse(JSON.stringify(f.host.snapshot()));
  assert.equal(f.host.enter(west.id), true);
  assert.ok(f.host.floorAt(f.player.group.position.x, f.player.group.position.z) < 0);
  assert.equal(f.host.restore(snapshot), true);
  assert.equal(f.host.active, false);
  assert.equal(f.host.floorAt(f.player.group.position.x, f.player.group.position.z), null);
  assert.equal(f.player.group.position.y, 100);
  assert.deepEqual(f.host.snapshot(), snapshot);
  assert.equal(f.rewards.length, 1);
  assert.equal(f.host.model.report(west.id).reward, null);
  assert.equal(f.host.model.canEnter(east.id), false);
  assert.deepEqual(f.host.model.view(east.id).repaired, [east.taskSites[0].id]);
});

test('restoring a Baldro checkpoint in a fresh host keeps permission without granting old rewards', () => {
  const previous = fixture(); previous.earn(BALDRO_KINGDOMS[0]);
  const next = fixture(); assert.equal(next.host.restore(previous.host.snapshot()), true);
  assert.equal(next.host.active, false);
  assert.equal(next.host.enter(BALDRO_KINGDOMS[0].id), true);
  assert.deepEqual(next.rewards, []);
  assert.equal(next.host.model.report('west').reward, null);
});

test('invalid host checkpoints leave the current interior position and earned permissions untouched', () => {
  const f = fixture(); f.earn(BALDRO_KINGDOMS[0]); f.host.enter(BALDRO_KINGDOMS[0].id);
  const saved = f.host.snapshot(), position = f.player.group.position.clone(), transitions = f.transitions;
  for (const value of [null, [], { version: 2, cities: {} }, { version: 1, cities: [] }]) {
    assert.equal(f.host.restore(value), false);
    assert.equal(f.host.current, BALDRO_KINGDOMS[0].id);
    assert.ok(f.player.group.position.equals(position));
    assert.deepEqual(f.host.snapshot(), saved);
    assert.equal(f.transitions, transitions);
  }
});

test('restoring gate records preserves an exterior checkpoint position already placed by the composition root', () => {
  const f = fixture(); f.earn(BALDRO_KINGDOMS[0]); f.host.enter(BALDRO_KINGDOMS[0].id);
  const saved = f.host.snapshot(), outside = new THREE.Vector3(90, 100, 400);
  f.player.group.position.copy(outside);
  assert.equal(f.host.restore(saved), true);
  assert.equal(f.host.active, false);
  assert.ok(f.player.group.position.equals(outside), 'reloading another destination must not return to the previous city gate');
  assert.deepEqual(f.host.snapshot(), saved);
});

test('unavailable travel and surface teleports cannot create or retain indoor walking support', () => {
  const f = fixture(), west = BALDRO_KINGDOMS[0]; f.earn(west);
  f.allowed = false; f.gate(west); const before = f.player.group.position.clone();
  assert.equal(f.host.enter(west.id), false); f.host.interact();
  assert.equal(f.host.active, false); assert.ok(f.player.group.position.equals(before));
  f.allowed = true; assert.equal(f.host.enter(west.id), true);
  f.at({ x: west.gate.x, y: 100, z: west.gate.z }); f.host.frame(.016);
  assert.equal(f.host.active, false, 'a teleport to the mountain must release explicit interior ownership');
  assert.equal(f.host.floorAt(west.gate.x, west.gate.z), null);
  assert.equal(f.player.group.position.y, 100, 'releasing a foreign carrier never relocates the traveler');
});

test('only the current city residents are visible and every interior character stands on its mirrored floor', () => {
  const f = fixture(); f.earn(BALDRO_KINGDOMS[1]); f.host.enter(BALDRO_KINGDOMS[1].id); f.host.frame(.016);
  for (const person of f.host.people) {
    assert.equal(person.actor.group.visible, !person.guard && person.hold.kingdom.id === BALDRO_KINGDOMS[1].id);
    if (person.guard) continue;
    const position = person.actor.group.position, walk = person.hold.walk;
    assert.equal(walk.canStand(position.x, position.z), true, `${person.id} has an unobstructed stand`);
    assert.equal(walk.floorAt(position.x, position.z), position.y);
    assert.equal(person.actor.group.userData.creature, 'dwarf');
  }
});

test('Baldro exports broad live collision bodies only for the guards or residents currently shown', () => {
  const f = fixture(), west = BALDRO_KINGDOMS[0]; f.gate(west); f.host.frame(0);
  const outside = f.host.bodies();
  assert.equal(outside.length, 2);
  assert.ok(outside.every(body => body.id.startsWith(`${west.id}-guard`) && body.r === .48 && body.minY === 100 && body.maxY === 101.5));
  const guard = f.host.people.find(person => person.id === outside[0].id), originalX = guard.actor.group.position.x;
  guard.actor.group.position.x += .3;
  assert.equal(outside[0].x, originalX + .3, 'later movers see the live position');
  guard.actor.group.position.x = originalX;
  f.earn(west); f.host.enter(west.id); f.host.frame(0);
  const inside = f.host.bodies();
  assert.equal(inside.length, 4);
  assert.ok(inside.every(body => body.id.startsWith(west.id) && !body.id.includes('-guard') && body.maxY < 0));
  assert.deepEqual(new Set(inside.map(body => body.id)), new Set(f.host.people.filter(person => person.actor.group.visible).map(person => person.id)));
  f.host.leave(); f.at({ x: -20000, z: -20000 }); f.host.frame(0);
  assert.deepEqual(f.host.bodies(), []);
});

test('stationary gatekeepers and residents keep both legs planted instead of holding the airborne lunge', () => {
  const f = fixture(), kingdom = BALDRO_KINGDOMS[0];
  const check = () => {
    for (let i = 0; i < 45; i++) f.host.frame(1 / 60);
    for (const person of f.host.people.filter(person => person.actor.group.visible)) {
      const actor = person.actor.group;
      for (const side of ['Left', 'Right']) {
        assert.ok(Math.abs(actor.getObjectByName(`${side} Hip`).rotation.x) < .16, `${person.id} ${side} thigh rests vertically`);
        assert.ok(Math.abs(actor.getObjectByName(`${side} Knee`).rotation.x) < .2, `${person.id} ${side} knee has an idle bend`);
      }
      actor.updateWorldMatrix(true, true);
      const left = actor.getObjectByName('Left Ankle').getWorldPosition(new THREE.Vector3());
      const right = actor.getObjectByName('Right Ankle').getWorldPosition(new THREE.Vector3());
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.getWorldQuaternion(new THREE.Quaternion()));
      assert.ok(Math.abs(left.y - right.y) < .04 && Math.abs(left.clone().sub(right).dot(forward)) < .05, `${person.id} has an even grounded stance`);
    }
  };
  f.gate(kingdom); check();
  f.earn(kingdom); f.host.enter(kingdom.id); check();
});

test('indoor movement cannot tunnel through a dwarf and can slide past a resident while keeping conversation reach', () => {
  for (const kingdom of BALDRO_KINGDOMS) {
    const f = fixture(); f.earn(kingdom); f.host.enter(kingdom.id); f.host.frame(0);
    const resident = f.host.people.find(person => person.stopId === 'hearth' && person.hold.kingdom.id === kingdom.id);
    const at = resident.actor.group.position, walk = resident.hold.walk, position = f.player.group.position;
    f.at({ x: at.x, y: at.y, z: at.z + 2.5 });
    f.host.move(position, 0, -5);
    assert.ok(position.z > at.z + .81, 'a long move stops on the near side of the resident');
    assert.equal(f.host.nearby()?.person?.id, resident.id, 'the broad body still leaves room to speak');
    const sign = kingdom.id === 'east-baldro' ? -1 : 1;
    for (let frame = 0; frame < 20; frame++) {
      f.host.move(position, sign * .08, -.08);
      assert.ok(Math.hypot(position.x - at.x, position.z - at.z) >= .82 - 1e-7, 'a diagonal slide keeps both bodies separate');
      assert.equal(walk.canStand(position.x, position.z), true);
    }
    assert.ok(position.z < at.z && Math.abs(position.x - at.x) > .82, 'walking around the shoulder reaches the far side');
    assert.equal(position.y, walk.floorAt(position.x, position.z));
  }
});

test('the actual introduction conversations and forge interactions teach a single method after earned western admission', () => {
  const f = fixture(), west = BALDRO_KINGDOMS[0], q = () => f.host.introductionView();
  assert.equal(q().stage, 'unoffered'); assert.equal(q().targetId, 'west-baldro-guard-0');
  f.at(q().target); assert.equal(f.host.nearby()?.kind, 'guard'); f.host.interact(); f.choice('intro-accept');
  assert.deepEqual(f.focused, ['dwarf-introduction']);
  assert.equal(q().stage, 'service');
  for (const [i, site] of west.taskSites.entries()) {
    assert.equal(q().targetId, site.id); f.at(q().target); assert.equal(f.host.nearby()?.kind, 'site'); f.host.interact();
    assert.equal(q().repaired, i + 1);
  }
  assert.equal(q().stage, 'report');
  f.at(q().target); f.host.interact(); f.choice('report');
  assert.equal(q().stage, 'enter'); assert.equal(q().target.kind, 'gate');
  f.at(q().target); f.host.interact();
  assert.equal(q().stage, 'smith'); assert.equal(f.host.current, west.id);
  f.at(q().target); assert.equal(f.host.nearby()?.person?.id, 'west-baldro-smith'); f.host.interact(); f.choice('lesson');
  assert.equal(q().stage, 'forge'); assert.equal(q().targetId, 'west-forge-rivet');
  const workpiece = f.scene.getObjectByName('West Hold fitted repair rivet');
  assert.equal(workpiece.visible, true);
  for (const [i, action] of ['heat', 'fit-peen', 'quench'].entries()) {
    f.at(f.host.introTargets.forge); assert.equal(f.host.nearby()?.kind, 'forge'); assert.equal(q().forgeAction, action);
    f.host.interact(); assert.equal(q().forgeStep, i + 1); assert.equal(workpiece.userData.forgeStep, i + 1);
  }
  assert.equal(q().stage, 'reward'); assert.equal(q().targetId, 'west-baldro-smith');
  f.host.interact(); assert.equal(q().forgeStep, 3, 'using the finished workpiece does not add another operation');
  f.at(q().target); f.host.interact();
  const finish = f.dialogues.at(-1)[4].choices.find(choice => choice.id === 'west-baldro-lesson-finish');
  assert.ok(finish); finish.action(); finish.action();
  assert.equal(q().complete, true); assert.equal(q().target, null);
  assert.deepEqual(f.rewards, [{ skill: 'construction', xp: 30 }, { skill: 'smithing', xp: 45 }, { skill: 'dwarvenSmithing', xp: 30 }]);
  assert.deepEqual(f.focused, ['dwarf-introduction']);
  assert.equal(f.host.model.canEnter('east'), false);
});

test('an admitted old visitor starts at the artisan and reloads a partly worked joint through the safe outside gate', () => {
  const f = fixture(), west = BALDRO_KINGDOMS[0]; f.earn(west);
  const old = f.host.snapshot(); delete old.introduction; f.host.restore(old); f.host.enter(west.id);
  f.at(f.host.introTargets.smith); f.host.interact(); f.choice('lesson');
  assert.deepEqual(f.focused, ['dwarf-introduction']);
  f.at(f.host.introTargets.forge); f.host.interact();
  assert.equal(f.host.introductionView().forgeStep, 1);
  const saved = JSON.parse(JSON.stringify(f.host.snapshot()));
  assert.equal(f.host.restore(saved), true); assert.equal(f.host.current, null);
  assert.equal(f.host.introductionView().target.kind, 'gate');
  assert.equal(f.host.introductionView().stage, 'forge');
  f.at(f.host.introductionView().target); f.host.interact();
  assert.equal(f.host.current, west.id); assert.equal(f.host.introductionView().target.kind, 'forge');
  f.at(f.host.introTargets.forge); f.host.interact();
  assert.equal(f.host.introductionView().forgeStep, 2);
  assert.deepEqual(f.rewards, [{ skill: 'construction', xp: 30 }], 'resuming work grants neither a repeat service reward nor a premature lesson');
});

test('introduction targets avoid indoor furniture and bodies and guide a visitor out of East Hold without teaching there', () => {
  const f = fixture(), [west, east] = BALDRO_KINGDOMS;
  f.earn(west); f.earn(east); f.host.model.acceptIntroduction(); f.host.enter(west.id);
  const { indoorRoute, smith, forge } = f.host.introTargets, walk = f.host.holds[0].walk;
  const position = f.player.group.position;
  for (const point of [...indoorRoute, smith, forge]) {
    assert.equal(walk.canStand(point.x, point.z), true);
    f.host.move(position, point.x - position.x, point.z - position.z);
    assert.ok(Math.hypot(point.x - position.x, point.z - position.z) < .02, 'the directed route reaches each stand without furniture or resident collisions');
  }
  f.host.enter(east.id); assert.equal(f.host.introductionView().target.kind, 'exit');
  const smithEast = f.host.people.find(person => person.id === 'east-baldro-smith');
  f.at({ ...smithEast.home, z: smithEast.home.z - 1.6 }); f.host.interact();
  assert.equal(f.dialogues.at(-1)[4].choices, undefined, 'the eastern artisan does not grant the western lesson');
  assert.equal(f.host.introductionView().stage, 'smith');
  const eastRecord = f.host.snapshot().cities.east;
  f.host.resetIntroductionForTesting();
  assert.equal(f.host.current, east.id); assert.equal(f.host.model.canEnter('west'), false);
  assert.deepEqual(f.host.snapshot().cities.east, eastRecord); assert.equal(f.host.introductionView().stage, 'unoffered');
});
