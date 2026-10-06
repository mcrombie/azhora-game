import test from 'node:test';
import assert from 'node:assert/strict';
import { createBatmanHunt } from '../src/content/quests/batman/batman.js';
import { createBatmanQuest } from '../src/content/quests/batman/batman-quest.js';
import { questLive } from '../src/gameplay/quests/quest-slate.js';
import { buildJournalEntries } from '../src/ui/journal/journal-entries.js';
import { ADDISON, createLightKeeper, addisonConversation } from '../src/content/quests/lighthouse/lighthouse.js';
import { WINEMAKER } from '../src/content/regions/winery/winery.js';
import { createWine, winemakerConversation } from '../src/content/quests/wine/wine.js';
import { JUAN, createWineAttic, juanConversation } from '../src/content/quests/wine/wine-attic.js';
import { JOHN, createSaltSultan, johnConversation } from '../src/content/quests/salt/salt-sultan.js';

function choices(conversation, person, context) {
  let screen;
  assert.equal(conversation(person, { openDialogue: (npc, lines, event, action, options) => { screen = options; },
    closeDialogue() {}, act() {}, ...context }), true);
  return screen.choices.map(choice => choice.id);
}

test('an old active blue-trade save cannot reoffer retired evidence through ordinary NPC conversations', () => {
  const hunt = createBatmanHunt(); hunt.find('vial'); hunt.sight(); hunt.accept();
  assert.equal(hunt.stage, 'hunting');
  const cases = [
    [addisonConversation, ADDISON, { light: createLightKeeper(), hunt }, 'light-seen', 'light-climb'],
    [winemakerConversation, WINEMAKER, { hunt: { stage: 'hunting', has: () => false }, katy: { looking: true } }, 'kat-barrel', 'kat-more'],
    [juanConversation, JUAN, { attic: createWineAttic(), wine: createWine(), hunt }, 'attic-packing', 'attic-shop'],
    [johnConversation, JOHN, { salt: createSaltSultan(), hunt }, 'john-refused', 'john-sultan'],
  ];
  for (const [conversation, person, context, retired, active] of cases) {
    const ids = choices(conversation, person, context);
    assert.equal(ids.includes(retired), false, `${person.name} keeps the old clue retired`);
    assert.equal(ids.includes(active), true, `${person.name} retains their ordinary topics`);
  }
});

test('the new vigilante story is live and its peaceful or bounty ending is archived only after completion', () => {
  assert.equal(questLive('batman-suval'), true);
  assert.equal(questLive('batman-investigation'), false);
  const quest = createBatmanQuest(); quest.accept();
  assert.deepEqual(buildJournalEntries({ batman: quest.state() }), []);
  quest.speak(); quest.beginFlight();
  assert.deepEqual(buildJournalEntries({ batman: quest.state() }), []);
  quest.finishFlight();
  const peaceful = buildJournalEntries({ batman: quest.state() });
  assert.equal(peaceful.length, 1); assert.equal(peaceful[0].status, 'complete');
  assert.equal(peaceful[0].id, 'batman-suval'); assert.match(peaceful[0].detail, /Flying.*three regions/);
  const hunter = createBatmanQuest(); hunter.acceptBounty(); hunter.attack(); hunter.killed();
  hunter.takeHead({ grant: () => true });
  assert.deepEqual(buildJournalEntries({ batman: hunter.state() }), [], 'a kill alone does not pay the bounty');
  hunter.claimBounty({ take: () => true });
  const bounty = buildJournalEntries({ batman: hunter.state() });
  assert.equal(bounty.length, 1); assert.match(bounty[0].detail, /Officer Verradross/);
  assert.deepEqual(buildJournalEntries({ tracker: { choices: [{ id: 'old-blue-trade', slateId: 'batman-investigation', title: 'The blue trade', stage: 'hunting' }] }, live: () => true }), []);
});
