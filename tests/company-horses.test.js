import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import {
  COATS, coatFor, RIDE_FILE, PICKET, STAGGER, staggerFor,
  companyHorses, ridePace, picketSpots,
} from '../src/company-horses.js';
import { COMPANION_REACH, companionPace } from '../src/long-road.js';
import { createRiding, RIDE, DEVELOPER_HORSE_SPEED } from '../src/riding.js';
import { createCompanions, COMPANION_IDS } from '../src/companions.js';
import { createMercenaryCompany } from '../src/mercenaries.js';
import { createFallen } from '../src/bystanders.js';
import { BODY } from '../src/bodies.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const { createHorse } = await sourceModule('../src/characters.js');

test('when you ride, everyone walking with you rides — and nobody rides before you own a horse', () => {
  const walking = ['merc-gotwood', 'merc-jerry', 'merc-christin'];
  // Before Bede Harrow's yard the whole company walks, whatever else is true.
  assert.deepEqual(companyHorses({ owned: false, mounted: false, walking }), { mounted: false, ids: [] });
  assert.deepEqual(companyHorses({ owned: false, mounted: true, walking }), { mounted: false, ids: [] },
    'and a mounted flag without a horse is nonsense, not a company on horseback');
  // With a horse, they have horses; in the saddle exactly when he is, and never otherwise.
  assert.deepEqual(companyHorses({ owned: true, mounted: false, walking }).ids, walking);
  assert.equal(companyHorses({ owned: true, mounted: false, walking }).mounted, false);
  assert.equal(companyHorses({ owned: true, mounted: true, walking }).mounted, true);
  // As many as will come, and one horse each: no cap of its own above the company's.
  const everybody = [...COMPANION_IDS];
  assert.ok(everybody.length >= 10);
  assert.equal(companyHorses({ owned: true, mounted: true, walking: everybody }).ids.length, everybody.length);
  // Nonsense in the list is not a horse out of it.
  assert.deepEqual(companyHorses({ owned: true, walking: ['a', 'a', '', null, 7] }).ids, ['a']);
  assert.deepEqual(companyHorses().ids, []);
});

test('the dead and the sent-on have no horse, because they are not walking with you', () => {
  // The rule reads `companions.walking` and nothing else, so this needs no line of its own.
  const companions = createCompanions({ fallen: createFallen() });
  const of = () => companyHorses({ owned: true, mounted: true, walking: companions.companions.map(one => one.id) });
  companions.restore({ ...companions.snapshot(), walking: ['merc-gotwood', 'merc-jerry', 'merc-christin'] });
  assert.equal(of().ids.length, 3);
  companions.sendOn('merc-jerry');
  assert.deepEqual(of().ids, ['merc-gotwood', 'merc-christin'], 'a man sent on takes no horse with him');
  companions.died('merc-gotwood', { where: 'the Tessen road', what: 'raiders' });
  assert.deepEqual(of().ids, ['merc-christin'], 'and the dead do not ride');
});

test('mounted, the file rides at a horse’s spacing and keeps up with a canter', () => {
  // A file of horses is a file with a horse's room in it, and a horse is longer than a man.
  assert.ok(RIDE_FILE.stride > COMPANION_REACH.stride, 'a horse’s length, not a man’s');
  assert.ok(RIDE_FILE.shoulder > COMPANION_REACH.shoulder);
  // Ten riders strung out behind him still reach less far than the forty at which a man is set
  // down beside you, so the tail of the file is never teleporting.
  assert.ok(RIDE_FILE.shoulder + 9 * RIDE_FILE.stride < 70);
  // At his own gait they hold station; behind it they come harder, or a gap once opened never shuts.
  const riding = createRiding();
  assert.equal(ridePace(0, RIDE.canter), RIDE.canter);
  assert.equal(ridePace(RIDE_FILE.stride, RIDE.canter), RIDE.canter);
  assert.ok(ridePace(RIDE_FILE.stride + 6, RIDE.canter) > RIDE.canter, 'a rider six metres adrift closes');
  assert.ok(ridePace(200, RIDE.canter) <= RIDE.canter * 1.35, 'and never faster than half again');
  // And the testing panel's horse is not an escape from them: their base is his top gait.
  riding.grant({ x: 0, z: 0 }); riding.setDeveloperMount(true);
  assert.equal(riding.speed(true), RIDE.canter * DEVELOPER_HORSE_SPEED);
  assert.ok(ridePace(20, riding.speed(true)) > RIDE.canter * DEVELOPER_HORSE_SPEED);
  // On foot nothing changed: the old rule is still the old rule.
  assert.equal(companionPace(0), COMPANION_REACH.walk);
});

test('the picket is a line beside his horse, with gaps a person walks through', () => {
  const horse = { x: 12, z: -30, yaw: 0.8 };
  const ids = COMPANION_IDS.slice(0, 10);
  const spots = picketSpots(horse, ids, () => true);
  assert.equal(spots.length, 10);
  assert.ok(spots.every(Boolean), 'open ground picketed them all');
  for (const [index, spot] of spots.entries()) {
    assert.equal(spot.id, ids[index]);
    assert.equal(spot.yaw, horse.yaw, 'they stand the way his does');
    // Off the middle: never on the line his horse is standing on.
    assert.ok(Math.hypot(spot.x - horse.x, spot.z - horse.z) >= PICKET.side - 0.01, `${spot.id} is off his horse`);
  }
  // A gap a person walks through, between every pair of them and his.
  const bodies = [{ x: horse.x, z: horse.z }, ...spots];
  const through = 2 * BODY.horse + 2 * BODY.traveler;
  for (let a = 0; a < bodies.length; a++) for (let b = a + 1; b < bodies.length; b++) {
    const apart = Math.hypot(bodies[a].x - bodies[b].x, bodies[a].z - bodies[b].z);
    assert.ok(apart >= PICKET.spacing - 0.01, `${a} and ${b} are ${apart.toFixed(2)} m apart`);
  }
  assert.ok(PICKET.spacing >= through, `${PICKET.spacing} m between centres leaves ${(PICKET.spacing - 2 * BODY.horse).toFixed(2)} m of ground`);
  // Nothing to picket, or nowhere to picket it.
  assert.deepEqual(picketSpots(null, ids), []);
  assert.deepEqual(picketSpots(horse, []), []);
  assert.deepEqual(picketSpots(horse, ['merc-mus'], () => false), [null], 'a horse with no footing is left out, not shoved in');
});

test('ten picketed horses never pen anybody in', () => {
  // The same question tests/nobody-sealed-in.test.js asks of the world's people, asked of the
  // one arrangement this build adds: from any standable point near the picket, does the open
  // ground reach twenty-five metres away? A line cannot enclose, and this is what proves it.
  const horse = { x: 0, z: 0, yaw: 1.1 };
  const spots = picketSpots(horse, COMPANION_IDS.slice(0, 10), () => true);
  const solid = [{ x: horse.x, z: horse.z }, ...spots];
  const stands = (x, z) => solid.every(body => Math.hypot(body.x - x, body.z - z) > BODY.horse + BODY.traveler);
  // **The grid is aligned to its own start.** It was `round(span / step) * step` from the origin,
  // which with span 29 and step 0.4 is 0.2 m away from the point that had just been tested - so
  // the fill answered for a cell that was not the start. On this flat ground every cell is open
  // and it could not matter; on the real world it reported two starts at Bede Harrow's yard
  // sealed that were nothing of the kind, and cost a round of chasing.
  const step = 0.4, escape = 25, half = Math.ceil((escape + 4) / step), columns = half * 2 + 1;
  // Start from every open spot within four metres of every horse — inside the line, outside it,
  // and in each gap — and flood out. If any of them closes, somebody can be shut in.
  const starts = [];
  for (const body of solid) for (let turn = 0; turn < 24; turn++) for (const reach of [0.9, 1.6, 2.4, 3.4]) {
    const angle = turn / 24 * Math.PI * 2, x = body.x + Math.cos(angle) * reach, z = body.z + Math.sin(angle) * reach;
    if (stands(x, z)) starts.push({ x, z });
  }
  assert.ok(starts.length > 100, 'there is open ground around the picket to start from');
  for (const start of starts) {
    const originX = start.x - half * step, originZ = start.z - half * step;
    const seen = new Uint8Array(columns * columns);
    const index = half * columns + half;
    const queue = [index]; seen[index] = 1;
    let out = false;
    while (queue.length && !out) {
      const at = queue.pop(), column = at % columns, row = Math.floor(at / columns);
      const x = originX + column * step, z = originZ + row * step;
      if (Math.hypot(x - start.x, z - start.z) >= escape) { out = true; break; }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = column + dc, nr = row + dr;
        if (nc < 0 || nr < 0 || nc >= columns || nr >= columns) continue;
        const next = nr * columns + nc;
        if (seen[next]) continue;
        seen[next] = 1;
        if (stands(originX + nc * step, originZ + nr * step)) queue.push(next);
      }
    }
    assert.ok(out, `sealed in at (${start.x.toFixed(1)}, ${start.z.toFixed(1)})`);
  }
});

test('a coat apiece, fixed by the man, and nothing named', () => {
  for (const id of COMPANION_IDS) {
    assert.ok(COATS.includes(coatFor(id)), `${id} has a coat`);
    assert.equal(coatFor(id), coatFor(id), 'and the same one every load');
  }
  // Natural colours only, and every one of them is a coat the model can actually paint.
  const characters = source('characters.js');
  for (const coat of COATS) assert.match(characters, new RegExp(`\\n  ${coat}: Object\\.freeze\\(`), `characters.js paints ${coat}`);
  assert.ok(!COATS.includes('developer'), 'the testing panel’s purple is not a company coat');
  // More than one man, more than one colour: a company is not ten identical horses.
  assert.ok(new Set(COMPANION_IDS.map(coatFor)).size >= 4);
  // Nothing names them. The only horse in the game with a name is the traveler's own.
  assert.doesNotMatch(source('company-horses.js'), /name:/);
});

test('a fight, a ferry and a reload all take the company down, because they take him down', () => {
  const main = source('main.js');
  // The one rule, in one place: up exactly when he is up.
  assert.match(main, /return riding\.mounted\?since>=turn:since<turn;/, 'companyUp is the whole rule');
  assert.match(main, /npc\.mounted=seat;npc\.lift=seat\?RIDE\.seat\.up:0;/, 'and it drives the seat and the lift');
  // No mounted combat: the host already unseats the traveler when steel comes out, and there is
  // no second line for the company because there does not need to be one.
  assert.match(main, /if\(riding\.mounted&&combat\.state\.phase==='active'\)stepDown\(true\);/);
  assert.equal(main.match(/stepDown\(true\)/g).length >= 4, true, 'every forced dismount still stands');
  // A save is written with the rider on the ground, so a reload comes back with the whole
  // company on the ground and the horses picketed. The pair is never out of step.
  const riding = createRiding();
  riding.grant({ x: 5, z: 5 }); riding.mount({ x: 5, z: 5 });
  assert.equal(riding.mounted, true);
  const saved = riding.snapshot();
  assert.equal('mounted' in saved, false, 'the saddle is not a thing the save holds');
  const loaded = createRiding();
  loaded.restore(saved);
  assert.equal(companyHorses({ owned: loaded.owned, mounted: loaded.mounted, walking: ['merc-gotwood'] }).mounted, false);
  assert.deepEqual(companyHorses({ owned: loaded.owned, mounted: loaded.mounted, walking: ['merc-gotwood'] }).ids, ['merc-gotwood'],
    'they still have their horses; they are simply standing beside them');
  // And whatever his horse will not do, theirs will not: there is one footing test, RIDE.radius.
  assert.match(main, /picketSpots\(riding\.horse,rule\.ids,\(x,z\)=>canStand\(x,z,world,RIDE\.radius\)\)/);
});

test('a company mounts as a company, and the host draws and collides with it', () => {
  const main = source('main.js');
  // A short stagger down the file, not a snap, and the same one on the way down.
  assert.ok(STAGGER > 0 && STAGGER < .4);
  assert.equal(staggerFor(0), 0);
  assert.ok(staggerFor(9) < 2, 'the tenth man is up inside two seconds');
  assert.equal(staggerFor(-3), 0);
  // A rider is a rider's footprint; a picketed horse is solid; a ridden one is not, twice over.
  assert.match(main, /r:npc\.mounted\?RIDE\.radius:/, 'a mounted companion collides as a rider');
  assert.match(main, /if\(horse\.group\.visible&&!horse\.ridden\)/, 'a picketed horse is solid');
  // Their horses are plain actors like the traveler's own, so the distant stand-in never reaches
  // them — the same exemption `walkingWith` gives the men in the file.
  assert.doesNotMatch(main, /companyHorseActors[\s\S]{0,400}figureDetail/);
  assert.match(main, /escorting:!!npc\.escorting\|\|!!npc\.walkingWith/, 'and the men are still exempt');
  // Bede Harrow, once, in his own voice, and nothing else is said about any of it.
  assert.match(source('ostler.js'), /OSTLER_COMPANY_LINE/);
  assert.equal((source('ostler.js').match(/OSTLER_COMPANY_LINE/g) ?? []).length, 2, 'declared once, used once');
});

test('what ten horses cost in meshes', () => {
  const count = actor => { let meshes = 0; actor.group.traverse(node => { if (node.isMesh) meshes++; }); return meshes; };
  const one = count(createHorse({ coat: coatFor('merc-gotwood'), saddled: true }));
  assert.ok(one > 0);
  // The number the company costs, pinned so it cannot drift quietly. A horse is made only when
  // the man it belongs to needs one, so a game that never reaches Bede Harrow's yard pays none
  // of this.
  assert.equal(one, 14, `a saddled horse is ${one} meshes`);
  assert.equal(one * 10, 140, 'ten of them, at the full company');
  // Against the two the game already builds unconditionally, every game, from the first frame.
  assert.equal(count(createHorse({ variant: 0, saddled: true })) + count(createHorse({ coat: 'developer', saddled: true })), 28);
  // For scale: a person is about this many, and the game stands dozens of them in a town.
  assert.ok(one < 20, 'a horse is cheaper than a figure');
});

test('a companion set walking by a restore is placed, and not lost between the two lists', () => {
  // **`createMercenaryCompany` reads the walking list once, at construction.** It is a snapshot,
  // not a live view of the companions module, and this is the fact that makes the fault possible.
  const plan = { road: [{ x: 0, z: 0 }, { x: -100, z: 0 }, { x: -100, z: 100 }, { x: -400, z: 100 }],
    stops: [], muster: { x: -400, z: 90 }, landing: { x: 3, z: 3 } };
  assert.deepEqual(createMercenaryCompany({ ...plan, companions: [] }).companionIds, []);
  const three = ['merc-gotwood', 'merc-jerry', 'merc-christin'];
  assert.deepEqual(createMercenaryCompany({ ...plan, companions: three.map(id => ({ id, with: true })) }).companionIds, three);
  // A man the companions module says is walking with you, in a company built before he was, is
  // placed nowhere at all: his placement is his own road clock, not 'with-traveler'.
  const stale = createMercenaryCompany({ ...plan, companions: [] });
  assert.equal(stale.placements(4000).some(one => one.phase === 'with-traveler'), false,
    'the men are walking with you in the save and nowhere in the world');
  // So every path that changes who walks with you has to remake the company. `joined`, `sent-on`
  // and `died` go through the event hook that does; **`companions.restore` does not** — a loaded
  // save, a story start, a review view. Asking every frame is what stops a call site forgetting.
  const main = source('main.js');
  // The signature is the **plan**, not the companions list. Watching the companions list alone
  // missed Chris entirely: the landing mate is filtered out of that list and carried separately.
  assert.match(main, /if\(companySignature\(\)!==companyBuiltWith\)rebuildCompany\(\);/,
    'placeMercenaries asks, so nobody has to remember');
  assert.match(main, /companyBuiltWith=companySignature\(\);/, 'and rebuilding records what it built with');
  assert.match(main, /const companySignature=\(\)=>JSON\.stringify\(\[companionPlan\(\)\?\?null,companyDead\(\)\]\);/,
    'and the signature is the plan and the dead, because the company is built off both');
  assert.doesNotMatch(main, /companyBuiltWith=companions\.companions/, 'never the companions list: it has no Chris in it');
  // The review views are the first callers to have needed it, and they say so. They ask for the
  // two who go through the companions list, and get Chris the way a real game gets him: off the
  // clock, as the long road's own man.
  assert.match(main, /companionOffTheClock=true;/);
  assert.match(main, /companions\.restore\(\{\.\.\.companions\.snapshot\(\),walking:\['merc-jerry','merc-christin'\]\}\);/);
});

test('the two review views compose the same whether they are run once or twice', () => {
  // main.cjs photographs `[reviewViews[0], ...reviewViews]`, so the first view is composed twice
  // and the picture kept is the second. Everything in the branch must therefore be idempotent.
  const main = source('main.js');
  const branch = main.slice(main.indexOf("if(view==='company-mounted'||view==='company-picket')"));
  const body = branch.slice(0, branch.indexOf('return;'));
  // `toggleMount()` is a toggle: called twice it steps him back down, which is exactly what the
  // first render showed. It is asked for only when he is not already up.
  assert.match(body, /if\(view==='company-mounted'\)\{[\s\S]{0,400}if\(!riding\.mounted\)toggleMount\(\);/);
  assert.match(body, /if\(riding\.mounted\)stepDown\(true\);/, 'and the picket view puts him down only if he is up');
  assert.match(body, /if\(!riding\.owned\)riding\.grant\(hitch,hitch\.yaw\);else riding\.place\(hitch,hitch\.yaw\);/, 'a horse is granted once');
  // It runs before the unconditional practice branch, which arms him for every other view.
  assert.ok(main.indexOf("view==='company-mounted'") < main.indexOf("if(view==='battle'){questStage=4;"),
    'the shot is composed before anything arms the traveler or starts a practice fight');
  // And the shot is measured, not guessed: the camera pulls in against whatever is in the way.
  // The mounted file's bearings are authored and only chosen between (`bestOf`); the picket
  // shot was right as swept and keeps the sweep. Both are still measured, neither is guessed.
  assert.match(body, /bestOf\(reviewTarget,20,\[facing\+1\.35/);
  assert.match(body, /clearestBearing\(reviewTarget,21,\{prefer:facing\+Math\.PI\/2\}\)/);
  // The facing is fitted for the file and left alone for the picket, whose line is laid off the
  // horse's own yaw and would move with him.
  assert.match(body, /const facing=view==='company-mounted'\?fits\.yaw:hitch\.yaw;/);
  assert.match(main, /function cameraPullIn\(focus,want,bearing\)\{/, 'one arithmetic for the camera and for the chooser');
  assert.match(main, /const actualDistance=cameraPullIn\(cameraFocus,viewDistance,yaw\);/, 'and the camera itself uses it');
  // The view reports every link in the chain, so one render says which is broken.
  for (const fact of ['owned:riding.owned', 'mounted:riding.mounted', 'mountBlock:riding.mountBlock',
    'walking:companions.companions.map(one=>one.id)', 'placed:[...(company.companionIds??[])]',
    'file:[...fileOrder]', 'stoodBackBy:', 'drawn:!!npc?.actor.group.visible', 'up:!!npc?.mounted'])
    assert.ok(main.includes(fact), `the camera report carries ${fact}`);
});

test('a rider who has arrived is still a rider', () => {
  const main = source('main.js');
  // Found by looking at the picture, not by a test: four riders standing on the ground beside
  // four horses. The npc mover sets a man's height only while he is MOVING, so a companion who
  // reached his place in the file sank to the ground and left his horse standing next to him.
  // His height is a fact about him, not about whether his legs are going.
  assert.match(main, /else if\(!npc\.swimming\)pos\.y=world\.heightAt\(pos\.x,pos\.z\)\+\(npc\.lift\?\?0\);/,
    'a companion standing still keeps his seat');
  assert.match(main, /npc\.actor\.group\.position\.set\(p\.x,world\.heightAt\(p\.x,p\.z\)\+\(npc\.lift\?\?0\),p\.z\)/,
    'and settling the company onto its spots keeps it too');
  // The traveler had the same fault from the other end: the review put him on the ground and
  // then mounted him only if he was not already mounted, so the second composition of the view
  // photographed him standing beside his own horse. The seat is set outright.
  assert.match(main, /player\.group\.position\.set\(sx,world\.heightAt\(sx,sz\)\+RIDE\.seat\.up,sz\);/);
  // Two horses cannot stand a body's width apart.
  assert.equal(RIDE_FILE.room, 2.6);
  assert.ok(RIDE_FILE.room > RIDE.radius * 2 * 2, 'a horse s length, not a rider s width');
  assert.match(main, /room:reach\.room\?\?BODY\.person\*2/, 'and the file asks the reach how much room it needs');
});
