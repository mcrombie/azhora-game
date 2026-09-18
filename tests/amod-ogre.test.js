import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import {
  createOgreToll, validateOgreSnapshot, OGRE_ENCOUNTER, OGRE_NPC, OGRE_TOLL, OGRE_BOUNTY,
  OGRE_CHALLENGE, OGRE_TOPIC_IDS, ogreTopicLines, ogreTopicLabel, ogreGreeting,
  OGRE_VICTORY, OGRE_RETURNED, OGRE_SITE,
} from '../src/amod-ogre.js';
import { AMOD_NPCS, AMOD_NPC_IDS, amodAmbientLines, amodConversation } from '../src/amod-people.js';
import { OGRE_STAND, TOLL_STONE } from '../src/amod-world.js';
import { regionNameAt } from '../src/region-world.js';

const DT = 1 / 60;
const world = () => ({ bounds: { minX: -960, maxX: -560, minZ: -700, maxZ: -320 }, colliders: [], heightAt: () => 17 });
const SWORD = { id: 'simple-sword', damage: [24, 26, 34], reachMultiplier: 1, usable: true };

/** A deterministic run of the fight with a described player. Returns how it went. */
function play(profile) {
  let seed = (profile.seed ?? 1) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const position = { x: OGRE_ENCOUNTER.checkpoint.x, y: 17, z: OGRE_ENCOUNTER.checkpoint.z };
  const events = [];
  const combat = createCombat({ world: world(), position, getWeapon: () => SWORD, onEvent: event => events.push(event) });
  assert.equal(combat.startEncounter(OGRE_ENCOUNTER), true);
  const ogre = () => combat.state.enemies[0], player = combat.state.player;
  let time = 0, swings = 0, dodgeAt = null, previous = 'idle', blows = 0, meals = profile.food ?? 0;
  for (let step = 0; step < 60 * 300; step++) {
    const enemy = ogre();
    const range = Math.hypot(enemy.x - position.x, enemy.z - position.z);
    const bearing = Math.atan2(enemy.x - position.x, enemy.z - position.z);
    if (enemy.action === 'windup' && previous !== 'windup') {
      dodgeAt = time + profile.reaction + (random() * 2 - 1) * (profile.jitter ?? 0);
      swings = 0;
    }
    previous = enemy.action;
    if (player.hp <= 55 && meals > 0 && player.action === 'idle' && enemy.action !== 'attack'
      && (enemy.action !== 'windup' || dodgeAt === null || dodgeAt - time > .6) && combat.heal(30) > 0) meals--;
    if (dodgeAt !== null && time >= dodgeAt) {
      const away = profile.sideways ? bearing + Math.PI / 2 : bearing + Math.PI;
      if (combat.dodge({ x: Math.sin(away), z: Math.cos(away) })) dodgeAt = null;
      else if (time > dodgeAt + .5) dodgeAt = null;
    }
    const clear = enemy.action === 'idle' || enemy.action === 'hurt' || profile.greedy
      || (enemy.action === 'windup' && (dodgeAt === null || dodgeAt - time > .35));
    if (player.action === 'idle' && clear && swings < (profile.swings ?? 3) && range < 2.55 && player.stamina > 30
      && combat.attack(bearing)) swings++;
    if (player.action === 'idle' && range > 2.3 && enemy.action !== 'attack') {
      const speed = 4.2 * combat.movementScale() * DT;
      position.x += Math.sin(bearing) * speed; position.z += Math.cos(bearing) * speed;
    }
    const before = player.hp;
    combat.update(DT);
    time += DT;
    if (player.hp < before) blows++;
    if (combat.state.phase !== 'active') break;
  }
  return { phase: combat.state.phase, seconds: time, blows, hp: player.hp, ogreHp: ogre().hp,
    landed: events.filter(event => event.type === 'hit' && event.damage > 0).length,
    tells: events.filter(event => event.type === 'windup').length };
}

test('the ogre is a different order of creature, and the numbers say so', () => {
  const enemy = OGRE_ENCOUNTER.enemies[0];
  assert.equal(enemy.kind, 'ogre');
  assert.ok(enemy.hp >= 500 && enemy.hp <= 700, `${enemy.hp} HP: a long fight`);
  // The profile itself, read back through a fight: two blows kill a full-health traveler.
  const position = { x: -679, y: 17, z: -473 };
  const combat = createCombat({ world: world(), position, getWeapon: () => SWORD, onEvent: () => {} });
  combat.startEncounter(OGRE_ENCOUNTER);
  const player = combat.state.player;
  let blows = 0, lowest = 100;
  for (let step = 0; step < 60 * 40 && player.hp > 0; step++) {
    const before = player.hp;
    combat.update(DT);
    if (player.hp < before) { blows++; lowest = player.hp; }
  }
  assert.equal(player.hp, 0, 'standing still in front of him is fatal');
  assert.equal(blows, 2, `two connected blows kill (${blows})`);
  assert.ok(lowest === 0 && blows === 2);
});

test('hitting him does not interrupt him, which no other enemy in the game can say', () => {
  const position = { x: -679, y: 17, z: -472 };
  const combat = createCombat({ world: world(), position, getWeapon: () => SWORD, onEvent: () => {} });
  combat.startEncounter(OGRE_ENCOUNTER);
  const ogre = () => combat.state.enemies[0];
  // Wait for a tell, then hit him in the middle of it and watch it carry on.
  for (let step = 0; step < 60 * 20 && ogre().action !== 'windup'; step++) combat.update(DT);
  assert.equal(ogre().action, 'windup');
  for (let step = 0; step < 24; step++) combat.update(DT);
  const progress = ogre().progress, hp = ogre().hp;
  combat.attack(Math.atan2(ogre().x - position.x, ogre().z - position.z));
  for (let step = 0; step < 20; step++) combat.update(DT);
  assert.ok(ogre().hp < hp, 'the swing landed');
  assert.equal(ogre().action, 'windup', 'and he is still winding up');
  assert.ok(ogre().progress > progress, 'the tell did not restart');
});

test('a player who reads the tell wins it, and the greedy and the panicky and the backpedallers do not', () => {
  const expert = play({ reaction: .95, jitter: 0, swings: 3, sideways: true, food: 0, seed: 11 });
  assert.equal(expert.phase, 'won', 'a scripted perfect player wins: the fight is not a scripted loss');
  assert.ok(expert.landed >= 18 && expert.landed <= 34, `it takes twenty-odd clean swings (${expert.landed})`);
  assert.ok(expert.seconds > 25, `and it is a long fight (${expert.seconds.toFixed(0)} s)`);
  // Backing straight up is not a defence: his reach and his lunge cover it.
  for (const seed of [3, 9, 21]) {
    const back = play({ reaction: .9, jitter: .06, swings: 3, sideways: false, food: 3, seed });
    assert.equal(back.phase, 'defeated', `backing away dies (seed ${seed})`);
  }
  // Nor is dodging the instant the arc appears: he is still turning then.
  for (const seed of [3, 9, 21]) {
    const panic = play({ reaction: .3, jitter: .1, swings: 3, sideways: true, food: 3, seed });
    assert.equal(panic.phase, 'defeated', `dodging on sight dies (seed ${seed})`);
  }
  // Greed: a swing that cannot be cancelled, thrown on top of the tell.
  const greedy = play({ reaction: .9, jitter: .06, swings: 6, sideways: true, food: 0, greedy: true, seed: 5 });
  assert.equal(greedy.phase, 'defeated', 'trading a swing for a blow kills you');
});

test('he is peaceable unless challenged, and the challenge is only ever reached through dialogue', () => {
  let purse = 12;
  const toll = createOgreToll({ spendToll: n => (purse >= n ? (purse -= n, true) : false) });
  assert.equal(toll.state.met, false);
  assert.equal(toll.meet(), true);
  assert.equal(toll.meet(), false, 'meeting him twice is still one meeting');
  // Nothing peaceable touches the encounter.
  assert.deepEqual(toll.pay(), { ok: true, paid: 1, reason: '' });
  assert.equal(purse, 12 - OGRE_TOLL);
  assert.equal(toll.decline().ok, true);
  assert.equal(toll.state.challenged, false, 'paying and walking on leave him peaceable');
  assert.equal(toll.state.beaten, false);
  // Only `challenge` names an encounter, and it names that one.
  const started = toll.challenge();
  assert.deepEqual(started, { ok: true, startEncounter: OGRE_ENCOUNTER.id, reason: '' });
  assert.equal(toll.state.challenged, true);
  // Declining for ever is a supported way to play: the toll can be paid or refused endlessly.
  const forever = createOgreToll({ spendToll: () => true });
  for (let visit = 0; visit < 40; visit++) { forever.meet(); visit % 2 ? forever.pay() : forever.decline(); }
  assert.equal(forever.state.challenged, false);
  assert.equal(forever.state.beaten, false);
  assert.equal(forever.state.paid, 20);
  // An empty purse cannot pay, and a failed payment changes nothing.
  const broke = createOgreToll({ spendToll: () => false });
  const refused = broke.pay();
  assert.equal(refused.ok, false);
  assert.equal(broke.state.paid, 0);
});

test('winning ends the toll once, and losing is the ordinary loss the game already handles', () => {
  const toll = createOgreToll({ spendToll: () => true });
  assert.equal(toll.report().ok, false, 'there is nothing to tell Ostel yet');
  toll.challenge();
  // Breaking off, or being put down, ends the challenge and leaves everything else alone.
  assert.equal(toll.endEncounter('lauvel-wolves').ok, false, 'that is a different fight');
  assert.equal(toll.endEncounter(OGRE_ENCOUNTER.id).ok, true);
  assert.equal(toll.state.challenged, false);
  assert.equal(toll.state.beaten, false, 'a defeat does not settle anything');
  toll.challenge();
  assert.equal(toll.winEncounter(OGRE_ENCOUNTER.id).ok, true);
  assert.equal(toll.state.beaten, true);
  assert.equal(toll.winEncounter(OGRE_ENCOUNTER.id).ok, false, 'he can only be beaten once');
  assert.equal(toll.challenge().ok, false, 'and cannot be challenged afterwards');
  assert.equal(toll.pay().ok, false, 'and takes nothing afterwards');
  const paid = toll.report();
  assert.equal(paid.ok, true);
  assert.equal(paid.bounty, OGRE_BOUNTY);
  assert.equal(toll.report().ok, false, 'the road house closes the line once');
  // The retreat line lets the traveler leave the fight by walking back toward Pueth.
  assert.equal(OGRE_ENCOUNTER.retreatAxis, 'x');
  assert.ok(OGRE_ENCOUNTER.retreatLine > OGRE_ENCOUNTER.center.x);
  assert.ok(OGRE_ENCOUNTER.checkpoint.x < OGRE_ENCOUNTER.retreatLine);
  assert.ok(OGRE_ENCOUNTER.checkpoint.x > OGRE_ENCOUNTER.center.x, 'the checkpoint is on the Pueth side of him');
});

test('the toll survives a save, and a nonsense one is refused whole', () => {
  const toll = createOgreToll({ spendToll: () => true });
  toll.meet(); toll.pay(); toll.pay(); toll.challenge(); toll.winEncounter(OGRE_ENCOUNTER.id); toll.report();
  const copy = createOgreToll();
  assert.equal(copy.restore(toll.snapshot()), true);
  assert.deepEqual(copy.snapshot(), toll.snapshot());
  assert.equal(validateOgreSnapshot(undefined), true, 'a save from before he existed has no toll');
  for (const bad of [null, 'ogre', { version: 2 }, { ...toll.snapshot(), paid: -1 }, { ...toll.snapshot(), paid: 1.5 },
    { ...toll.snapshot(), beaten: 'yes' }, { ...toll.snapshot(), extra: 1 },
    { ...toll.snapshot(), beaten: false }, { ...toll.snapshot(), met: false }])
    assert.equal(validateOgreSnapshot(bad), false, JSON.stringify(bad));
  const blank = createOgreToll();
  assert.equal(blank.restore({ version: 1, revision: 0, met: false, paid: 0, declined: false, challenged: false, beaten: false, reported: true }), false);
  assert.equal(blank.state.beaten, false, 'a refused restore leaves him unmet');
});

test('he talks: a toll, opinions, a tally, and one choice that says what it is', () => {
  assert.equal(OGRE_NPC.ogre, true, 'he is not drawn as a person with a bigger tunic');
  assert.deepEqual({ x: OGRE_SITE.stand.x, z: OGRE_SITE.stand.z }, { x: OGRE_STAND.x, z: OGRE_STAND.z });
  assert.equal(OGRE_SITE.stone.id, TOLL_STONE.id);
  assert.equal(regionNameAt(OGRE_STAND.x, OGRE_STAND.z), 'Amod');
  assert.ok(OGRE_TOPIC_IDS.length >= 5, 'he can be asked about several things');
  for (const id of OGRE_TOPIC_IDS) {
    assert.ok(ogreTopicLines(id).length >= 2, id);
    assert.ok(ogreTopicLabel(id).endsWith('?'), `${id} is a question`);
    assert.ok(ogreTopicLines(id).every(line => line.length > 40), id);
  }
  // The things the brief asks him to have an opinion about.
  const all = OGRE_TOPIC_IDS.flatMap(ogreTopicLines).join(' ');
  assert.match(all, /Amod|Ostel/, 'about Amodians');
  assert.match(all, /Pueth/, 'about Pueth');
  assert.match(all, /Twenty-six|tally|count/, 'about how many have tried');
  assert.match(all, /court|judgement/i, 'and the water court that could not enforce its own order');
  for (const kind of ['first', 'again', 'declined', 'beaten']) assert.ok(ogreGreeting(kind).length >= 1, kind);
  // The dangerous choice is marked as dangerous and asks a second time.
  assert.match(OGRE_CHALLENGE.label, /kill you/i, 'the challenge says what it is');
  assert.ok(OGRE_CHALLENGE.confirmLabel && OGRE_CHALLENGE.declineLabel && OGRE_CHALLENGE.warning.length >= 1);
  assert.ok(OGRE_VICTORY.length >= 3 && OGRE_RETURNED.length >= 1);
});

test('Ostel has a town full of people, and what they say changes when the road is opened', () => {
  assert.ok(AMOD_NPCS.length >= 15 && AMOD_NPCS.length <= 25, `${AMOD_NPCS.length} people`);
  assert.equal(new Set(AMOD_NPC_IDS).size, AMOD_NPCS.length, 'each of them once');
  for (const npc of AMOD_NPCS) {
    assert.ok(npc.name && npc.role && npc.modelRole, npc.id);
    assert.ok(amodAmbientLines(npc.id).length >= 2, `${npc.id} says more than one thing`);
    assert.ok(amodAmbientLines(npc.id).every(line => line.length > 50), npc.id);
  }
  // The brief's roster: the town has the trades the lore says it has.
  const roles = AMOD_NPCS.map(npc => npc.role).join(' | ').toLowerCase();
  for (const trade of ['measure-keeper', 'stonecutter', 'water court', 'toll accountant', 'mule', 'press', 'cellarer'])
    assert.match(roles, new RegExp(trade), trade);
  assert.ok(AMOD_NPCS.some(npc => npc.role.includes('prefecture')), 'and Ambron’s clerk, told nothing');
  // The dialect's water-measure words, in someone's mouth rather than in a glossary.
  const everything = AMOD_NPC_IDS.flatMap(id => amodAmbientLines(id)).join(' ');
  assert.match(everything, /water that cuts|goes into the gravel|trust overnight/);
  assert.match(everything, /wall remembers every winter/, 'and the saying');
  // Only the people it is anybody's business speak differently once the road is open.
  const changed = AMOD_NPC_IDS.filter(id => amodAmbientLines(id, true).join() !== amodAmbientLines(id, false).join());
  assert.ok(changed.length >= 3 && changed.length <= 8, `${changed.length} people have news`);
  assert.ok(changed.includes('ostel-accountant') && changed.includes('ostel-court-clerk'));
  // The host's hook opens a conversation for a townsperson and refuses anyone else.
  let opened = null;
  const context = { openDialogue: (npc, lines) => { opened = { npc, lines }; }, closeDialogue: () => {}, ogreBeaten: true };
  assert.equal(amodConversation(AMOD_NPCS.find(npc => npc.id === 'ostel-accountant'), context), true);
  assert.match(opened.lines.join(' '), /struck through|closed the line/i);
  assert.equal(amodConversation({ id: 'rimeholt-reeve' }, context), false);
});
