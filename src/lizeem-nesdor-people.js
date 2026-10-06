/**
 * **The people of Nesdor for the Farmlands of the Lizeem** (docs/lizeem-farmlands-design.md 6.5; the user,
 * 5 October 2026: "go ahead and add people characters as needed with mythological names... Give them
 * roles in the society", and on 6 October 2026, "keep building everything"). Norse names, as the design
 * gives Nesdor: Baugi the farmer whose nine thralls died, Bolverk who did their work, Idunn of the
 * apples hidden as a nut, Aegir the gods' brewer, Forseti of settlement, Egil who kept Thor's goats, and
 * Beyla and Byggvir, Freyr's bee-servant and barley-servant.
 *
 * Each stands where src/nesdor-farm.js puts them (`NESDOR_NPC_STANDS`, measured on the built ground by
 * tests/nesdor-farm.test.js), with the design's look in the figure kit's words (src/characters.js
 * `createCharacter`). Nobody wears a hat: Bolverk's hood is the kit's cowl pushed back. What the kit
 * cannot draw (Bolverk's scythe, Idunn's nutshell beads, Egil's dog, Beyla's veil and smoker, the malt
 * dust on Byggvir) is left to the role and the lines.
 *
 * Talk: two or three lines each, the first a self-introduction, and a topic hub (`nesdorConversation`)
 * for the Nesdor arc (src/lizeem-nesdor.js): Baugi's lesson, the strips and the foragers; Bolverk's match;
 * Idunn's nuts and the nut cake; Aegir's bar, his news and the white bread; Forseti's board, contracts and
 * paper; Egil's riders; Beyla's honey; Byggvir's malt and his argument with Egil about grain and cattle.
 * Trading is the market's (`context.openTrade`); the buyers and the Way board are registered here, at the
 * top level, so whoever imports this module (the game, the save's validator, a test) has them.
 *
 * Pure: no DOM, no three; the host supplies the dialogue box.
 */
import { NESDOR_NPC_STANDS } from './nesdor-farm.js';
import { FORAGE_CONTRACT_FEE, NESDOR_DISHES, NESDOR_ROLES, PAPER, REBEL_PAPER } from './lizeem-nesdor.js';
import { registerBoards, registerBuyers } from './merchants.js';
import { earn, pay, purse } from './economy.js';

const freeze = Object.freeze;
/** `person(id, name, role, modelRole, color)` as src/amod-people.js has it, at the contract's stand. */
const person = (id, name, role, modelRole, color, { look, ...extra }) => {
  const stand = NESDOR_NPC_STANDS[id];
  return freeze({ id, name, role, modelRole, color, hat: false, look: freeze({ ...look }), x: stand.x, z: stand.z, yaw: stand.yaw, ...extra });
};
const GREY = 0x9a968e, WHITE = 0xe4e1d8;

export const NESDOR_PEOPLE = freeze([
  // Sixties, huge, bald, grey bushy beard, a sleeveless tunic.
  person(NESDOR_ROLES.baugi, 'Baugi', 'Farmer of Ninehands, on the Flats', 'mercenary', 0x6b5a3e,
    { look: { build: 'towering', headgear: 'bare', hairStyle: 'bald', hair: GREY, facialHair: 'bushy', garment: 'sleeveless' }, essential: true }),
  // Forties, one eye, long grey hair, a dark hood pushed back. The scythe is the role's, not the kit's.
  person(NESDOR_ROLES.bolverk, 'Bolverk', 'Champion reaper of the Flats', 'mercenary', 0x34393f,
    { look: { build: 'rangy', headgear: 'hood', hairStyle: 'long-loose', hair: GREY, facialHair: 'clean', garment: 'jerkin', marks: ['eye-patch'] }, essential: true }),
  // Thirties, fair hair in a crown braid, a brown dress.
  person(NESDOR_ROLES.idunn, 'Idunn', 'Hazel-wife of the valley head', 'villager', 0x6b5232,
    { look: { slight: true, dress: true, hair: 0xd8bf86, hairStyle: 'braid' }, essential: true }),
  // Fifties, red-faced, white hair, a braided white beard, a blue tunic.
  person(NESDOR_ROLES.aegir, 'Aegir', 'Innkeeper of the Counted Water', 'mercenary', 0x3d5a80,
    { look: { build: 'heavy', headgear: 'bare', hairStyle: 'short-cropped', hair: WHITE, facialHair: 'braided', garment: 'jerkin' }, skin: 0xdc9c84, essential: true }),
  // Forties, neat fair hair, clean-shaven, a black tunic: the clerk's desk coat.
  person(NESDOR_ROLES.forseti, 'Forseti', 'Arbiter and document-handler on the Nesdor Way', 'relay-clerk', 0x1f1f24,
    { look: { hairStyle: 'short-cropped', hair: 0xc9a86a }, essential: true }),
  // Thirties, sunburnt, brown hair tied back, a long staff.
  person('egil', 'Egil', 'Drover of the Flats', 'mercenary', 0x5d5a3a,
    { look: { build: 'wiry', headgear: 'bare', hairStyle: 'long-tied', hair: 0x5c4124, facialHair: 'clean', garment: 'jerkin', weapon: 'staff' }, skin: 0xc98a68 }),
  // Forties, round, brown hair. Her veil of netting would be a hat, so it is left to her lines.
  person('beyla', 'Beyla', 'Bee-wife of Ninehands', 'villager', 0xb08a3e,
    { look: { slight: true, dress: true, hair: 0x5c4124, hairStyle: 'long-tied' } }),
  // Fifties, thin, grey stubble.
  person('byggvir', 'Byggvir', 'Maltster of Ninehands', 'mercenary', 0xb8a888,
    { look: { build: 'tall-lean', headgear: 'bare', hairStyle: 'receding', hair: GREY, facialHair: 'stubble', garment: 'jerkin' } }),
]);
export const NESDOR_PEOPLE_IDS = freeze(NESDOR_PEOPLE.map(npc => npc.id));
const ids = new Set(NESDOR_PEOPLE_IDS);
export const isNesdorNpc = id => ids.has(id);
/** Who trades at all (`context.openTrade`); Forseti keeps the board, and the rest only talk. */
export const NESDOR_TRADERS = freeze(['aegir', 'egil', 'byggvir', 'beyla', 'idunn']);

// ---------------------------------------------------------------------------
// The market (design 7.4 and 7.7; the contract for Builds 2 and 3)
// ---------------------------------------------------------------------------
export const NESDOR_BUYERS = freeze([
  { id: 'aegir', name: 'Aegir', role: 'Innkeeper of the Counted Water', place: 'Nesdor', at: 'the Counted Water',
    wants: [{ item: 'dish', appetite: 8 }, { item: 'barley', appetite: 12 }],
    sells: [{ id: 'ale', price: 3 }, { id: 'smoked-sausage', price: 4 }, { id: 'mutton-pie', price: 5 }],
    lines: {
      open: '“Bread and cakes for the Way, and barley for the brewing. Ale and provisions for whoever is going on. The Way pays, and so do I.”',
      full: '“The kitchen has enough until tomorrow. Have a drink instead.”',
      none: '“Nothing I can feed a traveller or brew. Have a drink anyway.”',
      paid: total => `He counts it out on the bar, ${total} copper, without looking down.`,
    } },
  { id: 'forseti', name: 'Forseti', role: 'Arbiter on the Nesdor Way', place: 'Nesdor', at: 'the end of the Way', board: 'nesdor-way',
    lines: {
      open: '“I buy nothing and sell paper. The board has the Way’s orders.”', full: '', none: '“I deal in agreements, not in goods.”',
      paid: total => `${total} copper, written down before it is paid.`,
    } },
  { id: 'egil', name: 'Egil', role: 'Drover of the Flats', place: 'Nesdor', at: 'the open Flats',
    wants: [{ item: 'meadow-hay', appetite: 24 }, { item: 'barley', appetite: 12 }], sells: [{ id: 'hides', price: 2 }],
    lines: {
      open: '“Hay and barley for the herd. Hides, if you have a use for them.”',
      full: '“The herd has eaten for today. So have I.”',
      none: '“Nothing a cow would eat. Then we are only talking.”',
      paid: total => `He pays ${total} copper out of a purse that smells of cattle.`,
    } },
  { id: 'byggvir', name: 'Byggvir', role: 'Maltster of Ninehands', place: 'Nesdor', at: 'the malt-house',
    wants: [{ item: 'barley', appetite: 24 }],
    lines: {
      open: '“Barley. I malt it, Aegir brews it, and the Way drinks it.”',
      full: '“The floor is full. Tomorrow.”',
      none: '“No barley. Then you are here to argue about cattle, and Egil is out on the Flats.”',
      paid: total => `He pays ${total} copper with a hand white to the wrist with malt dust.`,
    } },
  { id: 'beyla', name: 'Beyla', role: 'Bee-wife of Ninehands', place: 'Nesdor', at: 'the hives', sells: [{ id: 'honeycomb', price: 2 }],
    lines: {
      open: '“Honeycomb, two copper. The bees made it, I took it, and you may have it.”', full: '', none: '“I buy nothing. The bees do the buying.”',
      paid: total => `${total} copper. She wraps the comb in a dock leaf.`,
    } },
  { id: 'idunn', name: 'Idunn', role: 'Hazel-wife of the valley head', place: 'Nesdor', at: 'the hazel wood',
    sells: [{ id: 'hazelnuts', price: 2 }, { id: 'charcoal', price: 2 }],
    lines: {
      open: '“Nuts from the box and charcoal from the clamp. When the coppice bears for you, pick your own.”', full: '', none: '“I sell. I do not buy.”',
      paid: total => `She unlocks the ash box, counts out the nuts, locks it again, and takes ${total} copper.`,
    } },
]);
registerBuyers(NESDOR_BUYERS);

/** The Way board (src/nesdor-farm.js `NESDOR_ORDER_BOARD`), at Forseti's door. Postings for goods not yet in the satchel are skipped. */
export const NESDOR_BOARDS = freeze([
  { id: 'nesdor-way', name: 'The Way board', buyer: 'forseti', place: 'Nesdor', postings: [
    { item: 'floodwheat', min: 8, max: 16, requester: 'A carter bound for the Moros' },
    { item: 'floodwheat-fine', min: 3, max: 6, requester: 'A grain house in Minora' },
    { item: 'barley', min: 10, max: 20, requester: 'Byggvir’s malting floor' },
    { item: 'bridge-rye', min: 8, max: 16, requester: 'The Counted Water’s stables' },
    { item: 'hazelnuts', min: 4, max: 8, requester: 'A salt-fish trader up from the Ros' },
    { item: 'white-bread', min: 3, max: 6, requester: 'The Counted Water’s kitchen' },
    { item: 'nut-cake', min: 2, max: 4, requester: 'A wedding party on the Way' },
    { item: 'meadow-hay', min: 8, max: 16, requester: 'A drover going east' },
  ] },
]);
registerBoards(NESDOR_BOARDS);

// ---------------------------------------------------------------------------
// What they say
// ---------------------------------------------------------------------------
/** What each of them says when nothing in the arc is the subject. */
export const NESDOR_AMBIENT = freeze({
  baugi: freeze([
    'Baugi. Forty years on the braids, and I read this ground by the colour of the dock leaves. Nine men used to reap it with me.',
    'The nine went in the spring. Some to the rebellion, some to the foragers, and one home to his mother in Caricas, which I hold against him least.',
    'Nobody on the Flats owes anybody a share. No council, no dues, and nobody to send for when the riders come. We call that freedom on a good day.',
  ]),
  bolverk: freeze([
    'Bolverk. I came the day the nine left, and I do the work of all of them. Ask anybody. Ask me again.',
    'One eye is plenty for a scythe. The other I gave for something better, and I am not telling you what.',
    'Baugi feeds me and I reap. It is a fair bargain, he knows it, and it annoys him.',
  ]),
  idunn: freeze([
    'Idunn. I keep the coppice at the valley head, and the nuts in a locked ash box, because the valley eats them faster than the hazel grows them.',
    'Hazel is cut to the stool and grows again in straight poles. It is the most patient thing on the river. I am trying to learn from it.',
    'I sell nuts and charcoal. When the coppice bears for you, pick your own, and I will be glad of the rest.',
  ]),
  aegir: freeze([
    'Aegir. The Counted Water is mine: beds, stabling, and the best ale on the river, brewed from Byggvir’s malt.',
    'Everything on the Way comes past this bar, the branch country going east and the Moros coming west. I hear the news first and charge for it second.',
    'I buy bread and cakes for the Way. Travellers eat what they are given, and remember who gave it them.',
  ]),
  forseti: freeze([
    'Forseti. I write deals on the Way, inside Compact law or outside it, whichever the parties prefer. Both cost the same.',
    'The Way board is mine. The orders on it are real, and so are the people who posted them, which is the harder part.',
    'Courts in the branch country once put a bowl of barley on the witness table. I put paper. It keeps longer.',
  ]),
  egil: freeze([
    'Egil. I move the Nesdor cattle across the Flats with the seasons. The cattle decide the seasons, mostly.',
    'On the open ground you see riders a day before they arrive. I see them, then I tell Baugi, then he does nothing, because there is nothing to do.',
    'I buy hay and barley for fodder and sell hides. A good cow is worth three harvests. Byggvir will tell you otherwise. He is wrong.',
  ]),
  beyla: freeze([
    'Beyla. The hives by the long house are mine. I pay the farmer for flowering rights, as the custom is, and the bees pay me.',
    'Beans in flower and fruit in bloom: a bee will fly a mile for either. Baugi grows grain, which no bee has ever thanked him for.',
    'Honeycomb, two copper. It goes in Idunn’s nut cake and in very little else worth eating.',
  ]),
  byggvir: freeze([
    'Byggvir. I malt barley for Aegir’s ale, at the kiln end of the malt-house. Beyla is my wife, and the bees are hers.',
    'Grain feeds a house all winter. A cow feeds a drover’s pride. Egil and I have been settling that for eleven years.',
    'Bring me barley. The Way drinks whatever I can malt, and so, some evenings, do I.',
  ]),
});
export const nesdorAmbientLines = id => [...(NESDOR_AMBIENT[id] ?? [])];

/** Baugi lends the strips (the arc's `meet`). */
export const BAUGI_LEASE = freeze([
  'Ninehands. Three strips, a long house and a barn, and nobody to work any of it. You look old enough to know what a sickle is for.',
  'The strips are yours to work, for nothing. There are no dues on the Flats and nobody to collect them. What you grow is yours, and so is whatever comes for it.',
  'Before you sow, learn the ground. Ask me how, or ask that staff of yours.',
]);
/** Baugi reads the strips by what grows wild on them, as the strips are dressed (src/nesdor-farm-scenery.js). */
export const STRIP_LESSON = freeze([
  'Look at what grows wild between the beds. Rushes, and a red stem on the dock: the water is still there. Nothing of yours will thrive on that strip, whatever it is called.',
  'Broad green dock, and the silt crust cracking: the water came in spring and went again. That is the bench, and it is floodwheat’s. Floodwheat likes wet feet in memory, not in fact.',
  'Yellow dock and stones: the water never came. That is the rise, and rye likes it there. If the field flatters rye, plant wheat.',
  'Barley takes the middle. The bench or the rise, it does not mind which, and it does not thank you for either. Sow a strip whole, one crop the length of it, and a strip of each.',
]);
/**
 * Bolverk's match (src/flats-ground.js: a strip reaped in his five seconds or less; settled at integration,
 * 6 October 2026). No man walking a scythe does it, and he knows it: the Work of Nine does.
 */
export const MATCH_TERMS = freeze([
  'One ripe strip. You walk it end to end with a scythe while I reap mine. I take five breaths over a strip. Take no more than that and I will call it a match. You will not.',
  'Win or lose, the strip is reaped. Baugi only cares about that part.',
]);
/** The foragers, as Baugi tells it. */
export const FORAGER_TERMS = freeze([
  'A quarter of what you reaped. Cedric’s men say it is the League’s, and the rebellion’s say it is the river’s. Both mean it is theirs.',
  'Give it to one lot and the other goes on to the next farm. Get Forseti to write it, and they take a tenth between them and go home. Or send the both of them off. I am too old for that last one, and you are not much younger.',
]);

const HUB_LABEL = 'Back to the conversation';
const ANSWERED = freeze({
  cedric: ['They wrote it in the League’s column and went north. The rebellion’s men watched them go and will remember your face. So will I, for different reasons.'],
  rebels: [`Paper, for grain. A note a measure, ${PAPER.face} copper each when the river is free. Forseti will give you something for them now, and less than they say.`],
  bargain: ['A tenth, split down the middle, written and witnessed. Cedric’s men took theirs north and the rebellion’s paid in paper. Nobody is happy, which Forseti says is how you know it was fair.'],
  words: ['They looked at the staff, and at the fire in the end of it, and found they had business on the north road and the Flats. They will be back next year. Everybody is.'],
});

/**
 * **The conversation** for the people of Nesdor. The arc's steps sit with the people who hold them.
 *
 * `context`: { nesdor, openDialogue, closeDialogue, inventory?, cooking?, merchants?, openTrade?, openOrders?,
 *   startFight?(encounter) -> began, notify?, onChange?, visits? }. `onChange` hears copper changing hands
 *   (Forseti's fee and his change for paper), which the arc does not see.
 */
export function nesdorConversation(npc, context) {
  if (!isNesdorNpc(npc?.id)) return false;
  const { nesdor = null, openDialogue, closeDialogue, openTrade = null, visits = 0 } = context;
  const back = () => nesdorConversation(npc, { ...context, visits: visits + 1 });
  const say = (lines, extra = {}) => openDialogue(npc, lines, null, HUB_LABEL, { noWayfinding: true, onComplete: back, ...extra });
  const ambient = NESDOR_AMBIENT[npc.id];
  const leave = { id: `${npc.id}-leave`, label: 'Good day to you.', action: closeDialogue };
  const about = { id: `${npc.id}-about`, label: `Ask about ${npc.name}.`, action: () => say([ambient[(visits + 1) % ambient.length]]) };
  const trade = openTrade && NESDOR_TRADERS.includes(npc.id)
    ? [{ id: `${npc.id}-trade`, label: 'Trade', action: () => { closeDialogue(); openTrade(npc); } }] : [];
  const choices = [...topicChoices(npc, context, say), ...trade, about, leave];
  openDialogue(npc, [openingLine(npc, nesdor, visits)], null, 'Back to the road', { noWayfinding: true, choices });
  return true;
}

const arcState = nesdor => (nesdor?.state ?? { stage: 'arrive', wet: false, racing: false, reaped: null, foragers: null, contract: false, taught: [], long: null });
const charged = nesdor => !!nesdor && nesdor.charged?.() !== false;
const atLeast = (stage, than) => ['arrive', 'strips', 'reap', 'foragers', 'fine', 'carry', 'done'].indexOf(stage) >= ['arrive', 'strips', 'reap', 'foragers', 'fine', 'carry', 'done'].indexOf(than);

/** The first thing said: the arc's business when there is any, the introduction otherwise. */
function openingLine(npc, nesdor, visits) {
  const s = arcState(nesdor), at = charged(nesdor) ? s.stage : null, mood = nesdor?.regard?.(npc.id) ?? 0;
  const lines = NESDOR_AMBIENT[npc.id];
  switch (npc.id) {
    case 'baugi':
      if (at === 'arrive') return 'You came over the ford on foot with a staff, which makes you a pilgrim or a man from Minora. Pilgrims go the other way.';
      if (at === 'strips' && s.wet) return 'You sowed the wet strip. Everybody does once, because floodwheat sounds as if it wants a flood. It wants a flood that has left.';
      if (at === 'strips') return 'A strip is sown as a strip: one crop the length of it, on the ground that suits it. Otherwise the reaping is a muddle and the lesson is wasted.';
      if (at === 'reap') return 'The strips are standing. Bolverk has been looking at them the way he looks at everything, as if it owed him a match.';
      if (at === 'foragers') return 'There are men at the end of the bench strip. Two of Cedric’s from the north road and two of the rebellion’s off the Flats, and they have not yet decided whether to fight each other or me.';
      if (mood < 0) return 'You fed the north road. I would have done the same at your age, and been ashamed of it at mine.';
      if (at === 'done') return 'Ninehands is worked. Nine men could not have done it better, and one of them would have complained the whole time.';
      if (mood > 0) return 'They went. They will come back next year with more of them. Until then the grain is ours.';
      break;
    case 'bolverk':
      if (at === 'reap' && s.racing) return 'Ripe strip, scythe, and walk it. I am already ahead of you.';
      if (at === 'reap') return 'You have the look of a man who thinks he can reap. One strip, you and me. I have not lost yet.';
      if (at === 'done') return 'Taleth’s working. Nine men’s work in one act. I have been doing it the long way, it seems.';
      if (s.reaped?.match === 'won') return 'Five breaths, and you took none. I am going to sit down for a while and not talk about it.';
      if (s.reaped?.match === 'lost') return 'Nine men’s work, as I said. Come back when you have grown another eight pairs of hands.';
      if (mood > 0) return 'I watched you see the foragers off from the bench strip. I would have helped, but you seemed to be enjoying it.';
      break;
    case 'idunn':
      if (at && atLeast(at, 'strips') && !s.taught.includes(NESDOR_DISHES.cake)) return 'Baugi says you are working the strips. He does not say that about people.';
      break;
    case 'aegir':
      if (at === 'foragers') return 'There are foragers at Ninehands, I hear. I heard before they got there. Everybody on the Way did, except Baugi.';
      break;
    case 'forseti':
      if (at === 'foragers' && !s.contract) return 'You have foragers. Everybody on the Flats has foragers this year. Some of them have contracts.';
      if (mood > 0) return 'A tenth, divided and witnessed, and both lots signed. That is the best day’s work I have done this month, and you paid for it.';
      break;
    case 'egil':
      if (at === 'foragers') return 'I told Baugi they were coming. Two days ago. He thanked me.';
      if (mood > 0) return 'The rebellion ate this week, and some of it was yours. My brother rides with them. He will not thank you, so I will.';
      if (mood < 0) return 'Cedric’s men went north with Baugi’s grain on a cart I sold them the ox for. We are both to blame, then.';
      break;
    default: break;
  }
  return lines[visits % lines.length];
}

function topicChoices(npc, context, say) {
  const { nesdor, closeDialogue, inventory = null, cooking = null, openOrders = null, startFight = null, notify = null, onChange = null } = context;
  if (!nesdor) return [];
  const s = arcState(nesdor), on = charged(nesdor), at = s.stage, out = [];
  // A recipe counts as taught only when the kitchen takes it (6 October 2026): without Fire Making or
  // Cooking the lesson is heard and not kept, and the choice stays offered for another day.
  const learn = (id, name) => {
    const learned = cooking?.learn ? cooking.learn(id) : { ok: true };
    if (learned?.ok === false) { notify?.(learned.reason || `You cannot make ${name} yet.`, `${npc.name.toUpperCase()} TRIED TO TEACH YOU A RECIPE`); return false; }
    nesdor.noteTaught(id);
    notify?.(`You can make ${name} now.`, `${npc.name.toUpperCase()} TAUGHT YOU A RECIPE`);
    return true;
  };
  const worked = on && atLeast(at, 'strips');

  if (npc.id === 'baugi') {
    if (on && at === 'arrive') out.push({ id: 'nesdor-baugi-strips', label: 'Ask for land to work.', action: () => { nesdor.meet(); say([...BAUGI_LEASE]); } });
    if (worked) out.push({ id: 'nesdor-baugi-read', label: 'Ask how to read the strips.', action: () => { nesdor.readStrips('plants'); say([...STRIP_LESSON]); } });
    if (on && at === 'foragers') {
      out.push({ id: 'nesdor-baugi-foragers', label: 'Ask what the foragers want.', action: () => say([...FORAGER_TERMS]) });
      const answer = (choice, options, lines) => {
        const result = nesdor.answerForagers(choice, options);
        if (!result.ok) { say([result.reason]); return; }
        if (result.fight) { closeDialogue(); notify?.('Three foragers stand their ground between the strips. Drive them off.', 'NINEHANDS'); return; }
        say(lines(result));
      };
      out.push({ id: 'nesdor-give-cedric', label: 'Give Cedric’s men a quarter.', action: () => answer('give', { party: 'cedric' }, () => ANSWERED.cedric) });
      out.push({ id: 'nesdor-give-rebels', label: 'Give the rebellion’s men a quarter.', action: () => answer('give', { party: 'rebels' }, () => ANSWERED.rebels) });
      out.push({ id: 'nesdor-bargain', label: s.contract ? 'Show them Forseti’s paper.' : 'Bargain them down to a tenth.', action: () => (s.contract
        ? answer('bargain', {}, () => ANSWERED.bargain)
        : say(['With what. They will not take your word and they will not take mine. Forseti writes paper at the end of the Way that both lots respect, because neither can read it.'])) });
      out.push({ id: 'nesdor-drive', label: 'Drive them off.', action: () => answer('drive', { startFight }, () => ANSWERED.words) });
    }
    if (on && at === 'done' && s.long === 'offered') out.push({ id: 'nesdor-baugi-long', label: 'Ask about the long strip.', action: () => {
      const opened = nesdor.offerLong();
      say([opened?.ok ? 'Six beds on the bench to the west, the best ground I have. It is yours to work. Work it.'
        : 'Six beds on the bench to the west, the best ground I have. I lend it to a farmer of standing. Come back at Farming 24.']);
    } });
  }

  if (npc.id === 'bolverk') {
    out.push({ id: 'nesdor-bolverk-terms', label: 'Ask about the match.', action: () => say([...MATCH_TERMS]) });
    if (on && atLeast(at, 'reap') && !s.racing) out.push({ id: 'nesdor-bolverk-match', label: 'Take his match.', action: () => {
      nesdor.takeMatch();
      say(['Done. When a strip is ripe, walk it with the scythe, end to end. I will be on the next one, and I will be finished first.']);
    } });
  }

  if (npc.id === 'idunn') {
    out.push({ id: 'nesdor-idunn-coppice', label: 'Ask about the coppice.', action: () => say([
      'Six stools, cut in turn. A stool picked bears again after a rest, and not before, whatever you say to it.',
      'Hazel wants a farmer of some years. When you are one, pick them yourself. Until then, buy from me.']) });
    if (worked && !s.taught.includes(NESDOR_DISHES.cake)) out.push({ id: 'nesdor-idunn-cake', label: 'Ask how the nut cake is made.', action: () => {
      if (!learn(NESDOR_DISHES.cake, 'a nut cake')) { say(['You cannot keep a fire yet. Come back when you can, and I will tell you again.']); return; }
      say(['Two of hazelnuts, one of floodwheat, a comb of Beyla’s honey, and a slow oven. The nuts go in last, or they go bitter.',
        'I keep the recipe in the ash box with the nuts. You may have it. Baugi vouches for you, which he has done for nobody else this year.']);
    } });
  }

  if (npc.id === 'aegir') {
    out.push({ id: 'nesdor-aegir-news', label: 'Ask for news.', action: () => say(on && ['arrive', 'strips', 'reap'].includes(at)
      ? ['Riders on the north road this week, under no colours. Rebellion men on the Flats, under too many. Somebody is going to want Baugi’s grain before the year is out.']
      : ['Salt-fish up from the Ros at a price nobody likes. The army’s rope line is still across the end of the Way, unmanned, which is the worst kind of line. Nobody knows whose it is.',
        'Cedric holds Minora, his brother holds the gate, and the Flats hold their breath. Same as last week. I charge the same for it.']) });
    if (worked && !s.taught.includes(NESDOR_DISHES.bread)) out.push({ id: 'nesdor-aegir-bread', label: 'Ask how the Way’s bread is baked.', action: () => {
      if (!learn(NESDOR_DISHES.bread, 'white bread')) { say(['You cannot keep a fire yet. A loaf wants a fire. Come back with one.']); return; }
      say(['Two of floodwheat, ground fine, and an oven hot enough to be rude to. White bread. The Way eats it because it can afford to.',
        'Fine wheat makes a loaf you could sell in Minora. Plain wheat makes one you eat on the road and do not mention.']);
    } });
  }

  if (npc.id === 'forseti') {
    out.push({ id: 'nesdor-forseti-law', label: 'Ask about Compact law.', action: () => say([
      'The Branch Compact does not reach the Flats. That is the whole of my trade. A deal written here answers to the parties and to me, and I have a long memory.',
      'Merchants from the branch country come here to be free of their councils. Merchants from the Moros come to be free of theirs. They meet at my desk and are free of each other.']) });
    if (openOrders) out.push({ id: 'nesdor-forseti-board', label: 'Read the Way board.', action: () => { closeDialogue(); openOrders(npc); } });
    if (on && at === 'foragers' && !s.contract) out.push({ id: 'nesdor-forseti-contract', label: `Ask for a forage contract (${FORAGE_CONTRACT_FEE} copper).`, action: () => {
      if (inventory?.count && purse(inventory) < FORAGE_CONTRACT_FEE) { say([`${FORAGE_CONTRACT_FEE} copper. The paper is cheap. The custom is not.`]); return; }
      if (inventory?.remove && !pay(inventory, FORAGE_CONTRACT_FEE)) { say(['Your purse is lighter than it looks.']); return; }
      nesdor.writeContract(); onChange?.();
      say(['A tenth, divided between the parties, and neither comes back this season. Signed by both, witnessed by me.',
        'They will sign. Both sides sign anything with my seal on it, because both sides want my seal on their own deals next week.']);
    } });
    const notes = inventory?.count?.(REBEL_PAPER) ?? 0;
    if (notes > 0) out.push({ id: 'nesdor-forseti-paper', label: `Change your rebellion paper (${notes} ${notes === 1 ? 'note' : 'notes'}).`, action: () => {
      if (!inventory.remove?.(REBEL_PAPER, notes)) { say(['You have less paper than you think. Most people do.']); return; }
      earn(inventory, notes * PAPER.changed); onChange?.();
      say([`${notes * PAPER.changed} copper. Each note says ${PAPER.face}, and will go on saying it until the rebellion wins or loses. I am paid to wait. You are not.`]);
    } });
  }

  if (npc.id === 'egil') {
    out.push({ id: 'nesdor-egil-riders', label: 'Ask about riders.', action: () => say(on && at === 'foragers'
      ? ['I saw them two days back. Cedric’s from the north road, the rebellion’s along the beck. I told Baugi. He said thank you, which is what he says instead of doing anything.']
      : on && ['arrive', 'strips', 'reap'].includes(at)
        ? ['Dust on the north road, and men along the beck who are not drovers. They will be at Ninehands once there is grain to look at. Grain is what they ride for.']
        : ['Nothing on the horizon this week but weather. That is when I watch hardest.']) });
    out.push({ id: 'nesdor-egil-byggvir', label: 'Ask about Byggvir.', action: () => say([
      'Byggvir says grain is worth more than cattle, because grain keeps. I say a cow walks to market by herself. We have been settling it since before the war, and we will be settling it after.']) });
  }

  if (npc.id === 'beyla') out.push({ id: 'nesdor-beyla-honey', label: 'Ask about the honey.', action: () => say([
    'Flowering rights. I pay the farmer whose beans and fruit my bees work: a little coin for a lot of honey. Baugi grows grain, so I pay him in conversation.',
    'A comb a cake. Idunn will tell you so, and she will tell you to buy it from me, because I asked her to.']) });

  if (npc.id === 'byggvir') {
    out.push({ id: 'nesdor-byggvir-malt', label: 'Ask about malt.', action: () => say([
      'Steep the barley, let it start, stop it in the kiln. Aegir brews it, the Way drinks it, and nobody gives the maltster any credit, which is why I give it to myself.']) });
    out.push({ id: 'nesdor-byggvir-egil', label: 'Ask about Egil.', action: () => say([
      'Egil thinks a cow is worth three harvests. A cow eats two of them. I have done the arithmetic and he has done the shouting.']) });
  }
  return out;
}
