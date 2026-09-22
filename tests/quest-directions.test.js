import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createJourney } from '../src/journey.js';
import { journeyConversation } from '../src/journey-content.js';
import { createLusciaChapter, LUSCIA_SITES, lusciaConversation } from '../src/luscia-chapter.js';
import { createMorosChapter, MOROS_SITES, morosConversation, MOROS_GATE_ID, MOROS_LEGATE_ID } from '../src/moros-chapter.js';
import { createBorderChapter, BORDER_GATE_ID, borderConversation, borderEncounter } from '../src/border-chapter.js';
import { AFTERMATH_VARIANTS } from '../src/aftermath-chapter.js';
import { AFTERMATH_SITES } from '../src/aftermath-sites.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { SOLIS_STANDS } from '../src/west-suval.js';
import { OUTPOST_LAYOUT, campPoint } from '../src/outpost.js';
import { MERCENARY_COMPANY_SIZE } from '../src/mercenaries.js';
import { REGION_DESIGN } from '../src/campaign-world.js';

/**
 * A quest step that names a direction is the only instruction most players read. The
 * marker tests (`quest-destinations`, `story-stands`) prove the destination exists and
 * has footing; nothing proved that "west out of Nothom" was west. It was not: the
 * road out of the square runs south-west for its whole length to the camp gate, and the
 * horse line the Marshal sends you to is at the *north* end of his camp. Both sent a
 * traveler off the road.
 *
 * So: measure the bearing in the built world, and require the copy to use that word.
 */
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const inventory = { count: () => 99, has: () => true, add: () => true, remove: () => true, grant: () => true, refresh() {} };

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
/** World -Z is atlas north and +X is east (`HEX_WORLD_TRANSFORM`). */
function bearing(from, to) {
  const degrees = (Math.atan2(to.x - from.x, -(to.z - from.z)) * 180 / Math.PI + 360) % 360;
  return COMPASS[Math.round(degrees / 45) % 8];
}
/** "West Suval" is a place, not a direction. Every authored region name comes out before a sentence is read for a bearing. */
const PLACE_NAMES = REGION_DESIGN.map(region => region.id).filter(name => COMPASS.some(word => name.toLowerCase().startsWith(word.split('-')[0])));
const withoutPlaceNames = text => PLACE_NAMES.reduce((out, name) => out.split(name).join('there'), text);
const post = id => LEGION_POSTS.find(entry => entry.id === id);
const where = id => world.npcPositions[id] ?? world.landmarks.find(place => place.id === id) ?? post(id)
  ?? SOLIS_STANDS[id] ?? LUSCIA_SITES[id] ?? MOROS_SITES[id] ?? AFTERMATH_SITES[id] ?? null;

/**
 * Every line a chapter's own people say in a given stage, flattened. `tangents` also
 * opens each side conversation the screen offers, which is where a good deal of the
 * road's direction-giving lives.
 */
function speech(converse, npcId, context, { tangents = false } = {}) {
  const said = [], pending = [];
  const openDialogue = (npc, lines, _unused, _label, options = {}) => {
    said.push(...lines);
    for (const choice of options.choices ?? []) { if (choice.label) said.push(choice.label); if (tangents && choice.action) pending.push(choice.action); }
  };
  const npc = { id: npcId, modelRole: '' };
  converse(npc, { ...context, openDialogue, closeDialogue: () => {}, act: () => {} });
  // One level deep: a tangent's own screen may offer the same choices back again.
  for (const open of pending.splice(0)) open();
  return said.join(' · ');
}

function morosAt(stage) {
  const chapter = createMorosChapter({ inventory, hasHorse: () => false });
  chapter.start();
  const steps = { 'report-at-gate': [], 'report-to-legate': ['admit-to-camp'], 'claim-horse': ['admit-to-camp', 'join-muster'],
    complete: ['admit-to-camp', 'join-muster', 'claim-legion-horse'] };
  for (const id of steps[stage] ?? []) chapter.act(id);
  return chapter;
}
function lusciaAt(stage) {
  const chapter = createLusciaChapter({ inventory });
  if (stage === 'not-started') return chapter;
  chapter.start();
  const steps = { 'meet-relay-clerk': [], 'find-satchel': ['accept-lauvel-search'],
    'return-satchel': ['accept-lauvel-search', 'take-courier-satchel'],
    complete: ['accept-lauvel-search', 'take-courier-satchel', 'return-courier-satchel'] };
  for (const id of steps[stage] ?? []) chapter.act(id);
  return chapter;
}

test('every compass word the main quest gives is the one the world would give', () => {
  const legs = [
    {
      what: 'the road from Nothom square to the army camp on the Moros',
      from: where('relay-clerk'), to: where(MOROS_GATE_ID),
      texts: () => [
        ['the Moros chapter, before it opens', createMorosChapter({ inventory }).view().detail],
        ['the Moros chapter, reporting at the gate', morosAt('report-at-gate').view().detail],
        ['the Luscia chapter, once the rolls are filed', lusciaAt('complete').view().detail],
        ['Iven, handing over the horse token', speech(lusciaConversation, 'relay-clerk', { luscia: lusciaAt('complete') })],
        ['the sentry at the Moros gate', post('post-moros-gate-north').lines.join(' · ')],
      ],
    },
    {
      what: 'the road from Nothom square out to the field at the Lauvel',
      from: where('relay-clerk'), to: where('courier-satchel'),
      texts: () => {
        const journey = createJourney({ inventory, weapons: { spendSticks: () => true } });
        journey.start();
        for (let step = 0; step < 40 && journey.view().stage !== 'complete'; step++) {
          const next = journey.availableActions().find(option => option.enabled);
          if (!next) break;
          journey.act(next.id);
        }
        return [['the Luscia chapter, sending you to the field', lusciaAt('find-satchel').view().detail],
          ['Iven, asked how the messages find their way',
            speech(journeyConversation, 'relay-clerk', { journey, inventory }, { tangents: true })]];
      },
    },
    {
      what: 'the Marshal’s tent to the Gate of Sun Horses at Solis',
      from: where(MOROS_LEGATE_ID), to: where(BORDER_GATE_ID),
      texts: () => {
        const border = createBorderChapter(); border.start();
        const said = [['the Marshal, handing over the terms', speech(borderConversation, MOROS_LEGATE_ID, { border, musterCount: 4 })]];
        border.act('take-legate-terms');
        said.push(['the border chapter, carrying the terms', border.view().detail]);
        return said;
      },
    },
    {
      what: 'the outpost on the Moros to Ambron',
      from: where('outpost-command'), to: where('ambron'),
      texts: () => [['the Marshal’s dispatch, the morning after a lost field',
        [...AFTERMATH_VARIANTS['moros-fallback'].debrief, ...AFTERMATH_VARIANTS['moros-fallback'].after].join(' · ')],
      ['the Captain’s orders, the morning after Solis',
        [...AFTERMATH_VARIANTS['solis-sweep'].debrief, ...AFTERMATH_VARIANTS['solis-sweep'].after].join(' · ')]],
    },
  ];
  for (const leg of legs) {
    assert.ok(leg.from && leg.to, `${leg.what}: one end of it is nowhere`);
    const word = bearing(leg.from, leg.to);
    const metres = Math.hypot(leg.to.x - leg.from.x, leg.to.z - leg.from.z);
    for (const [who, raw] of leg.texts()) {
      // Region names carry compass words of their own ("West Suval", "East Lotharn"), and
      // they are not directions; take them out before reading the sentence for one.
      const text = withoutPlaceNames(raw).toLowerCase();
      // A paragraph may name several roads, so the rule is that the one it gives for *this*
      // leg is the true one — "west out of Nothom" fails because the word is south-west.
      assert.ok(text.includes(word),
        `${who} does not say ${word}, and ${leg.what} runs ${word} for ${metres.toFixed(0)} m: ${JSON.stringify(raw.slice(0, 200))}`);
    }
  }
});

test('the horse line stands where the Marshal says it stands', () => {
  const line = MOROS_SITES['legion-horse-line'], centre = campPoint(0, 0), tent = OUTPOST_LAYOUT.command;
  // campPoint(dx, dz) is dx east and dz south of the camp's centre: the horse line is north of both.
  assert.ok(line.z < centre.z, `the horse line is ${(centre.z - line.z).toFixed(0)} m north of the camp's centre`);
  assert.ok(line.z < tent.z, `the horse line is ${(tent.z - line.z).toFixed(0)} m north of the Marshal's tent`);
  assert.equal(bearing(tent, line), 'north-west');
  // Both branches of `claim-horse`: the traveler who rode in, and the one who walked with Iven's token.
  const rode = createMorosChapter({ inventory, hasHorse: () => true });
  rode.start(); rode.act('admit-to-camp'); rode.act('join-muster');
  const said = [morosAt('claim-horse').view().detail, rode.view().detail,
    speech(morosConversation, MOROS_LEGATE_ID, { moros: morosAt('report-to-legate'), musterCount: 4 })];
  for (const text of said) {
    assert.ok(!/\bsouth\b(?!-)/.test(text), `a line sends the traveler south to a horse line that is north: ${JSON.stringify(text.slice(0, 160))}`);
    assert.ok(/north-west|north/.test(text), `a line names the horse line without saying where it is: ${JSON.stringify(text.slice(0, 160))}`);
  }
});

test('the company the army counts is the company the game has', () => {
  const words = ['twelve', 'thirteen', 'ten hired swords'];
  const said = [
    ['the Marshal at the muster', speech(morosConversation, MOROS_LEGATE_ID, { moros: morosAt('report-to-legate'), musterCount: 4 })],
    ['the Moros chapter, once you are on the muster', morosAt('complete').view().detail],
    ['the Moros chapter, once you are on the muster (title)', morosAt('complete').view().title],
    ['the sentry at the Moros gate', post('post-moros-gate-north').lines.join(' · ')],
    ...(() => {
      const border = createBorderChapter(); border.start();
      const taking = [['the Marshal, handing over the terms', speech(borderConversation, MOROS_LEGATE_ID, { border, musterCount: 4 })]];
      border.act('take-legate-terms'); border.act('enter-solis'); border.act('side-empire'); border.act('march-out'); border.act('reach-line');
      border.endEncounter('border-battle-line');
      taking.push(['Captain Brulan on the line', speech(borderConversation, 'battle-tribune', { border, musterCount: 4 })]);
      return taking;
    })(),
  ];
  assert.equal(MERCENARY_COMPANY_SIZE, 11, 'ten hired swords and the traveler');
  for (const [who, text] of said) for (const wrong of words)
    assert.ok(!text.includes(wrong), `${who} counts the company in ${wrong}s, and there are ${MERCENARY_COMPANY_SIZE} of them: ${JSON.stringify(text.slice(0, 200))}`);
});

test('the waves the captains promise are the waves that come', () => {
  const enemies = borderEncounter('empire').enemies;
  // A wave is a group of entries with no gap of more than two seconds inside it.
  const entries = enemies.map(enemy => enemy.entry).sort((a, b) => a - b);
  let waves = 1;
  for (let i = 1; i < entries.length; i++) if (entries[i] - entries[i - 1] > 2) waves++;
  assert.equal(waves, 3, `the border encounter comes in ${waves} waves`);
  assert.equal(enemies.length, 8);
  const border = createBorderChapter(); border.start();
  border.act('take-legate-terms'); border.act('enter-solis'); border.act('side-empire'); border.act('march-out'); border.act('reach-line');
  border.endEncounter('border-battle-line');
  for (const npc of ['battle-tribune']) {
    const text = speech(borderConversation, npc, { border, musterCount: 4 });
    assert.ok(text.includes('three waves'), `${npc} promises something other than three waves: ${JSON.stringify(text.slice(0, 200))}`);
  }
});
