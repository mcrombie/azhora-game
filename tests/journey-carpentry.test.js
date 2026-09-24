import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourney, BRIDGE_CARPENTRY } from '../src/journey.js';
import { journeyConversation, JOURNEY_NPCS } from '../src/journey-content.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createSkills, SKILLS } from '../src/skills.js';

function fixture({ sticks = 3, previousXP = 0 } = {}) {
  const inventory = createInventoryState();
  inventory.grant('harbor-letter'); inventory.grant('road-token');
  if (sticks) inventory.add('forest-stick', sticks);
  const skills = createSkills({ begins: ['construction'] }), weapons = createWeapons({ inventory });
  if (previousXP) skills.gain('construction', previousXP);
  const journey = createJourney({ inventory, weapons, skills });
  journey.start();
  return { inventory, weapons, skills, journey };
}

test('Chip introduces Carpentry, but only accepting his bridge lesson marks it as studied', () => {
  const f = fixture(); let dialogue;
  journeyConversation(JOURNEY_NPCS.find(npc => npc.id === 'crossing-keeper'), {
    ...f, openDialogue: (npc, lines, event, label, options) => { dialogue = { lines, options }; },
    closeDialogue() {}, act: id => f.journey.act(id),
  });
  assert.match(dialogue.lines.join(' '), /carpentry/i);
  assert.match(dialogue.lines.join(' '), /Skills afterward/);
  assert.equal(f.skills.taught('construction'), false, 'reading the offer does not accept it');
  dialogue.options.choices.find(choice => choice.id === 'meet-crossing-keeper').action();
  assert.equal(f.skills.taught('construction'), true);
  assert.equal(f.skills.view().find(skill => skill.id === 'construction').xp, 0);
  assert.equal(f.journey.act('meet-crossing-keeper').ok, false);
});

test('repair awards enough Carpentry for level two exactly once, separately from the wood reward', () => {
  const f = fixture();
  assert.equal(f.journey.act('meet-crossing-keeper').skillLearned, 'construction');
  const repair = f.journey.act('repair-bridge');
  assert.equal(repair.ok, true);
  assert.deepEqual(repair.skillReward, { id: 'construction', xp: BRIDGE_CARPENTRY.xp, level: 2, levelled: true });
  assert.equal(f.inventory.count('forest-stick'), 0);
  assert.equal(f.journey.act('repair-bridge').ok, false);
  assert.equal(f.journey.act('return-crossing-keeper').ok, true);
  assert.equal(f.inventory.count('forest-stick'), 4);
  assert.equal(f.skills.view().find(skill => skill.id === 'construction').xp, 90);
});

test('restoring an accepted or repaired bridge does not replay the lesson or experience', () => {
  const f = fixture(); f.journey.act('meet-crossing-keeper');
  const accepted = f.journey.snapshot(), skillBefore = f.skills.snapshot();
  const resumed = createJourney({ inventory: f.inventory, weapons: f.weapons, skills: f.skills });
  assert.equal(resumed.restore(accepted), true);
  assert.deepEqual(f.skills.snapshot(), skillBefore);
  resumed.act('repair-bridge');
  const repaired = resumed.snapshot(), after = f.skills.snapshot();
  const loadedAgain = createJourney({ inventory: f.inventory, weapons: f.weapons, skills: f.skills });
  assert.equal(loadedAgain.restore(repaired), true);
  assert.deepEqual(f.skills.snapshot(), after);
  assert.equal(loadedAgain.act('repair-bridge').ok, false);
  loadedAgain.act('return-crossing-keeper');
  assert.deepEqual(f.skills.snapshot(), after);
});

test('failed repair grants no XP and existing Carpentry progress remains intact', () => {
  const f = fixture({ sticks: 2, previousXP: 100 }); f.journey.act('meet-crossing-keeper');
  const before = f.skills.snapshot();
  assert.equal(f.journey.act('repair-bridge').ok, false);
  assert.deepEqual(f.skills.snapshot(), before);
  f.inventory.add('forest-stick', 1);
  const rejecting = createJourney({ inventory: f.inventory, weapons: { spendSticks: () => false }, skills: f.skills });
  rejecting.restore(f.journey.snapshot());
  assert.equal(rejecting.act('repair-bridge').ok, false);
  assert.deepEqual(f.skills.snapshot(), before);
  f.journey.act('repair-bridge');
  assert.equal(f.skills.view().find(skill => skill.id === 'construction').xp, 190);
  assert.equal(SKILLS.construction.name, 'Carpentry', 'the existing save key and building progression are retained');
  assert.match(SKILLS.cartography.teacher, /Glun/);
});

test('the army report can be delivered without accepting or repairing the optional bridge', () => {
  const f = fixture({ sticks: 0 });
  assert.equal(f.journey.view().stage, 'deliver-report');
  assert.equal(f.journey.act('deliver-report').ok, true);
  assert.equal(f.journey.view().complete, true);
  assert.equal(f.journey.state.bridgeAccepted, false);
  assert.equal(f.journey.state.bridgeRepaired, false);
  assert.equal(f.skills.taught('construction'), false);
  assert.equal(f.journey.state.bridge, 'offered', 'Chip still offers the side quest after the report');
});
