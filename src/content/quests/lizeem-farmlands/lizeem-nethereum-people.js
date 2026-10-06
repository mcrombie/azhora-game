/**
 * **The people of Nethereum for the Farmlands of the Lizeem** (docs/lizeem-farmlands-design.md 6.4, the
 * design of 5 October 2026; built 6 October 2026 under the user's "keep building everything").
 *
 * Seven, Welsh and Irish by name as the design gives them, at Haethom, the levee, the weir and the house
 * below the line. Each stands where src/content/regions/nethereum/nethereum-farm.js puts them (`NETHEREUM_NPC_STANDS`), which
 * tests/nethereum-farm.test.js holds to walkable ground clear of the buildings and the water. Their looks
 * are written in the figure kit's own words (src/content/characters/characters.js `createCharacter`): women as the kit's
 * slight figure in a long dress, men on the hired company's body. Nobody wears a hat; Airmid's rush hat is
 * in her hands, which is to say in her lines. What the kit cannot draw - a sedge cape, a red nose, fish
 * scales on a sleeve, a goad, bare feet - is left to the role and the words.
 *
 * Talk: two or three lines each in the game's dry voice, the first a self-introduction, and a topic hub
 * (`nethereumConversation`) for the arc's roles (src/content/quests/lizeem-farmlands/lizeem-nethereum.js): Mererid's teaching and the
 * levee work, Seithenyn's shame and the mending, later the minding; Gwyddno's weir, his smoke-house and,
 * once he trusts Rollo, the child from the weir; Boann's cattle and the wolves; Fintan's Recall, spoken
 * only when its time comes; Airmid's baskets; Liban's ground below the line. Trading is the market's
 * (`context.openTrade`, src/gameplay/inventory/merchants.js); recipes are the kitchen's (`context.cooking.learn`).
 *
 * The buyers of Nethereum (the contract for Builds 2 and 3, 6 October 2026) are declared and registered
 * here, at the top of the module, as each country's are. The design names no order board in Nethereum
 * (7.7: the Measure House, the grain court, the arbiter's table and the clerk's house), so none is posted.
 *
 * Pure: no DOM, no three; the host supplies the dialogue box.
 */
import { NETHEREUM_NPC_STANDS } from '../../regions/nethereum/nethereum-farm.js';
import { registerBuyers } from '../../../gameplay/inventory/merchants.js';
import { goodOf } from '../../../gameplay/inventory/prices.js';
import { NETHEREUM_RECIPE_IDS, NETHEREUM_WOLVES, NETHEREUM_STAGES, DEEP_LEVEL, carriedDishes } from './lizeem-nethereum.js';

const freeze = Object.freeze;
/** `person(id, name, role, modelRole, color)` as src/content/regions/amod/amod-people.js has it, with the stand and look. */
const person = (id, name, role, modelRole, color, { look, ...extra }) => {
  const at = NETHEREUM_NPC_STANDS[id];
  return freeze({ id, name, role, modelRole, color, hat: false, look: freeze({ ...look }), x: at.x, z: at.z, yaw: at.yaw, ...extra });
};

// ---------------------------------------------------------------------------
// Nethereum (design 6.4)
// ---------------------------------------------------------------------------
export const NETHEREUM_PEOPLE = freeze([
  // Forties, wet-weather brown hair bound back, a sedge cape over a grey dress, bare legs. On the levee, above the meadow.
  person('mererid', 'Mererid', 'Levee-warden of Haethom', 'villager', 0x7d7f78,
    { look: { slight: true, dress: true, hair: 0x4b3424, hairStyle: 'long-tied' }, essential: true }),
  // Sixties, red-nosed, grey stubble, a patched cloak, slow. Beside the hatch he left open.
  person('seithenyn', 'Seithenyn', 'The old hatch-keeper', 'mercenary', 0x5e5646,
    { look: { build: 'heavy', headgear: 'bare', hairStyle: 'receding', hair: 0x8e8a83, facialHair: 'stubble', garment: 'short-cloak' },
      skin: 0xd99c82, essential: true }),
  // Fifties, lean, grey braided beard, high boots. On the bank at the head of his weir.
  person('gwyddno', 'Gwyddno', 'Weir-master on the Neth', 'mercenary', 0x4c5a5a,
    { look: { build: 'tall-lean', headgear: 'bare', hairStyle: 'long-tied', hair: 0x8d8a84, facialHair: 'braided', garment: 'jerkin' }, essential: true }),
  // Thirties, broad, fair hair cropped, a leather jerkin. By her byre on the north rim.
  person('boann', 'Boann', 'Cattle-woman of the post-flood pasture', 'villager', 0x6e4f33,
    { look: { slight: true, dress: true, hair: 0xd6bf8c, hairStyle: 'short-cropped' }, essential: true }),
  // Eighties, tiny, white hair to the shoulders, beardless, a black cloak. On the levee's head, where the Recall is spoken.
  person('fintan', 'Fintan', 'Memory-keeper of the Flood Recall', 'mercenary', 0x1f1e22,
    { look: { build: 'slight', headgear: 'bare', hairStyle: 'lank', hair: 0xeeebe4, facialHair: 'clean', garment: 'short-cloak' }, essential: true }),
  // Twenties, dark hair in two braids. The rush hat stays in her hands.
  person('airmid', 'Airmid', 'Herb-woman and rush-weaver', 'villager', 0x7a8150,
    { look: { slight: true, dress: true, hair: 0x1e1612, hairStyle: 'braid' } }),
  // Fifties, grey hair wet at the ends, a green wool dress, barefoot. On her hummock below the line.
  person('liban', 'Liban', 'The one who lives below the line', 'villager', 0x4c6b48,
    { look: { slight: true, dress: true, hair: 0x8f8c86, hairStyle: 'long-loose' } }),
]);
export const NETHEREUM_PEOPLE_IDS = freeze(NETHEREUM_PEOPLE.map(npc => npc.id));
const ids = new Set(NETHEREUM_PEOPLE_IDS);
export const isNethereumNpc = id => ids.has(id);

/** Who trades at all (`context.openTrade`, the market's): the rest only talk. */
export const NETHEREUM_TRADERS = freeze(['gwyddno', 'boann', 'airmid']);

/**
 * The buyers of Nethereum (design 7.4; the contract for Builds 2 and 3, 6 October 2026), in the form
 * every country uses. Wares the satchel does not yet know stay off the stall until it does.
 */
export const NETHEREUM_BUYERS = freeze([
  { id: 'gwyddno', name: 'Gwyddno', role: 'Weir-master on the Neth', place: 'Nethereum', at: 'the weir below the ford',
    wants: [{ item: 'flood-oats', appetite: 12 }], sells: [{ id: 'smoked-fish', price: 4 }, { id: 'salt', price: 2 }],
    lines: {
      open: '“Oats I buy, for my own table and the smoke-house men. Smoked fish and salt I sell.”',
      full: '“I have oats enough until tomorrow.”',
      none: '“No oats. Then it is fish or salt you want, or nothing.”',
      paid: total => `He weighs the oats in his hand rather than on anything, and pays ${total} copper.`,
    } },
  { id: 'boann', name: 'Boann', role: 'Cattle-woman of the post-flood pasture', place: 'Nethereum', at: 'the byre on the north rim',
    wants: [{ item: 'meadow-hay', appetite: 24 }, { item: 'barley', appetite: 12 }],
    sells: [{ id: 'butter', price: 3 }, { id: 'ewe-cheese', price: 4 }, { id: 'manure', price: 1 }],
    lines: {
      open: '“Hay by the truss, and barley for the winter. Butter, cheese and manure, if you want any of the three.”',
      full: '“The byre is full. Tomorrow.”',
      none: '“Hay or barley. You have neither.”',
      paid: total => `She pulls a handful from the truss, smells it, and pays ${total} copper.`,
    } },
  { id: 'airmid', name: 'Airmid', role: 'Herb-woman and rush-weaver', place: 'Nethereum', at: 'Haethom',
    sells: [{ id: 'harvest-basket', price: 20 }],
    lines: {
      open: '“Baskets. One kind. It carries one more of anything than whatever you carry now.”',
      full: '', none: '“I do not buy. I make.”',
      paid: total => `${total} copper. She does not count it in front of you.`,
    } },
]);
registerBuyers(NETHEREUM_BUYERS);

/** What each of them says when nothing in the arc is the subject. */
export const NETHEREUM_AMBIENT = freeze({
  mererid: freeze([
    'Mererid. My people keep the longest stretch of this levee, so I speak first at the Flood Council, and longest, which nobody thanks me for.',
    'The flood is not the enemy. It is the rent. You pay it every spring, and the basin lets you live on the edge of it.',
    'I buy nothing. If you want something from me, take a turn on the levee. It needs it more than I need copper.',
  ]),
  seithenyn: freeze([
    'Seithenyn. I kept the meadow hatch, once. Ask anybody in Haethom. They will tell you the rest before I can.',
    'It is the same hatch. Oak does not forgive either, but it does not hold anything against you. It just rots.',
    'I am slow now. I was slow then as well, but then I was slow on purpose.',
  ]),
  gwyddno: freeze([
    'Gwyddno. My family has kept the weir on the Neth for forty generations. The fish have never once thanked us.',
    'Oats I buy. Smoked fish and salt I sell. The smoke-house is mine, and the smoke is the river’s.',
    'Everything the Neth carries comes past this weir sooner or later. Most of it is fish.',
  ]),
  boann: freeze([
    'Boann. The short-legged cattle on the new grass are mine. The grass is everybody’s, until somebody argues.',
    'Short legs, wide feet, and no opinion about wet ground. That is the whole of the Nethrani cow. The rest is grass.',
    'The Galan butchers have bought our cattle for two generations. They walk there on legs this short. Think about that.',
  ]),
  fintan: freeze([
    'Fintan. I carry the Recall: every name the water has taken here, thirty generations of them, and none of them written down.',
    'I do not say the names on an ordinary day. A name said on an ordinary day is gossip, and the water does not gossip.',
    'The oldest names have no family and no place left. Only the name and the year. The water keeps no better record than that, so neither do I.',
  ]),
  airmid: freeze([
    'Airmid. Rush and sedge from the wet threads, baskets, and the herbs that come up on the meadow after the water.',
    'This is a rush hat. I made it. I do not wear it. It is for showing people what rush can do.',
    'A basket that carries more is the cheapest way to own more land. The land is somebody else’s problem.',
  ]),
  liban: freeze([
    'Liban. I live below the line, on purpose. The deep basin is where the good ground is.',
    'Up on the ridge they say I will drown. They have said it for thirty years. The water has been into my house four times and out again every time.',
    'One year in five the water takes what you planted down here. The other four, you eat better than the ridge does.',
  ]),
});
export const nethereumAmbientLines = id => [...(NETHEREUM_AMBIENT[id] ?? [])];

// ---------------------------------------------------------------------------
// What the arc gives them to say
// ---------------------------------------------------------------------------
/** Mererid, when Rollo first finds her on the levee: the meadow, and the broken hatch. */
export const MERERID_MEADOW = freeze([
  'A man from Minora, on foot. The Sacred Way does not usually bring us anybody useful. We will see.',
  'That is the meadow, below the levee. Every spring we let the thread out over it through the hatch, the water lays down its silt, and we draw it off. Oats on the silt, and hay twice where our neighbours cut once.',
  'The hatch is broken. Seithenyn kept it, until a flood year he would rather you did not ask him about. Nobody has kept it well since, and this spring nobody has kept it at all.',
  'Two planks, some ironwork, and Seithenyn’s hands, which still know the thing. I cannot spare a man for it. You may be able to spare yourself.',
]);
/** Mererid on timing the water (design 5.2): the lore's three names for the phases of spring. */
export const WATER_LESSON = freeze([
  'Open the hatch and the water goes in black. Blackwater. It is carrying everything off the rim and none of it has settled. Draw it off then and the silt goes off with it: thin ground.',
  'Wait, and the black settles. The water clears over the beds and the silt shines under it like a wet slate. Siltshine. That is the moment. Draw it off at the shine.',
  'Wait past it and the frogs start. Frogcall. The water has sat too long and the ground goes sour under it, and nothing sown there will do until it has been drowned again properly.',
  'Three states. Most of the Flood Council’s arguments are about which one we are in.',
]);
/** Seithenyn on the flood year he left the hatch open. */
export const SEITHENYN_SHAME = freeze([
  'The Long Water was before my time. Mine was a small flood. Small enough that I thought I could leave the hatch open one night and shut it at first light.',
  'It came up in the dark. It took the oats off the meadow, and it took a boy of six off the meadow path, who knew the water better than I did. His name is in the Recall now. I hear it every spring.',
  'So I do not keep the hatch. And nobody else keeps it well, because I taught nobody, because I was keeping it.',
]);
/** Gwyddno on the child from the weir, once he trusts Rollo (design 3 and 6.4). */
export const GWYDDNO_FOUNDLING = freeze([
  'My grandfather kept the weir in the Long Water. Six weeks the water stood above the line. When it went down there was a basket in the trap, and a boy in the basket, alive and very angry about it.',
  'Nobody came for him. The Recall had his mother’s name by then, we supposed, but the Recall does not say whose child was whose. My grandfather carried him to Minora and gave him to the sorcerers, who were the only people he knew of with room for a boy and no questions.',
  'They say he is still up there in the tower. Old now. If you ever meet him, tell him the weir has kept its stakes.',
]);
/** The Flood Recall as Fintan speaks it on the levee's head (design 5.2). One of the names is Taleth's mother's. */
export const FLOOD_RECALL = freeze([
  'Then stand on the head, where the water can hear. I say them once, and nobody answers.',
  'Of the years nobody remembers: Dylan. Tegid. Elffin. Morfran. Branwen. Creirwy. Llyr.',
  'Of the Long Water, that stood six weeks above the line: Gwion. Rhonwen. Ceridwen, of the weir path, whose child the water gave back. Mabon. Dwyn.',
  'Of the year the hatch was left open: Ifor, who was six.',
  'Of this year: nobody yet. The water has not come up.',
  'That is the Recall. Eat now. The water has been fed, so we may be.',
]);
const HUB_LABEL = 'Back to the conversation';
const at = (arc, stage) => NETHEREUM_STAGES.indexOf(arc?.stage?.() ?? 'arrive') >= NETHEREUM_STAGES.indexOf(stage);

/**
 * **The conversation** for everybody in this module. The arc's steps sit with the people who hold them.
 *
 * `context`: { nethereum (the arc), openDialogue, closeDialogue, inventory?, cooking?, openTrade?, notify?,
 *   startEncounter?(config), onChange?(), visits? }. `startEncounter` is the host's combat: Boann's wolves
 * are started through it with `NETHEREUM_WOLVES`, and the host tells the arc `wolvesDriven(id)` when they are.
 */
export function nethereumConversation(npc, context) {
  if (!isNethereumNpc(npc?.id)) return false;
  const { nethereum = null, openDialogue, closeDialogue, openTrade = null, visits = 0 } = context;
  const back = () => nethereumConversation(npc, { ...context, visits: visits + 1 });
  const ambient = NETHEREUM_AMBIENT[npc.id];
  const say = (lines, extra = {}) => openDialogue(npc, lines, null, HUB_LABEL, { noWayfinding: true, onComplete: back, ...extra });
  const leave = { id: `${npc.id}-leave`, label: 'Good day to you.', action: closeDialogue };
  const about = { id: `${npc.id}-about`, label: `Ask about ${npc.name}.`, action: () => say([ambient[(visits + 1) % ambient.length]]) };
  const trade = openTrade && NETHEREUM_TRADERS.includes(npc.id)
    ? [{ id: `${npc.id}-trade`, label: 'Trade', action: () => { closeDialogue(); openTrade(npc); } }] : [];
  const choices = [...questChoices(npc, context, say), ...trade, about, leave];
  openDialogue(npc, [openingLine(npc, nethereum, context, visits)], null, 'Back to the road', { noWayfinding: true, choices });
  return true;
}

/** The first thing said: the arc's business when there is some, and the introduction otherwise. */
function openingLine(npc, arc, context, visits) {
  const lines = NETHEREUM_AMBIENT[npc.id], stage = arc?.accepted?.() ? arc.stage() : null;
  if (npc.id === 'mererid' && stage === 'arrive') return 'You will be the one from the tower. Word walks faster than you do, round here.';
  if (npc.id === 'mererid' && stage === 'drown' && arc.view().lastDraw === 'thin') return 'You drew it off black. The silt went back into the thread with the water. Drown it again.';
  if (npc.id === 'mererid' && stage === 'drown' && arc.view().lastDraw === 'sour') return 'You let the frogs have it. That ground wants drowning again before it carries anything.';
  if (npc.id === 'seithenyn' && stage === 'hatch') return 'Mererid sent you. She sends everybody, sooner or later. Nobody has come before with planks.';
  if (npc.id === 'seithenyn' && arc?.view?.().minder) return 'I am watching it. When the silt shines, I will draw it off. That is the arrangement, and I keep it now.';
  if (npc.id === 'boann' && stage === 'wolves') return 'You came. Good. There are wolves at the cattle on the new grass, three of them, and they are not frightened of me.';
  if (npc.id === 'boann' && stage && NETHEREUM_STAGES.indexOf(stage) > NETHEREUM_STAGES.indexOf('wolves')) return 'The cattle are back on the grass and the wolves are back in the hollow. I do not say thank you often, so I am saying it once properly. Thank you.';
  if (npc.id === 'fintan' && stage === 'recall') return carriedDishes(context.inventory).both
    ? 'You have brought something the meadow made and something the river gave. Then you may stand at the Recall.'
    : 'You will want to stand at the Recall. Nobody stands at it with empty hands. Oatcakes, and smoked fish from the weir: something the meadow made and something the river gave.';
  if (npc.id === 'gwyddno' && arc?.trusts?.('gwyddno') && visits === 0) return 'The sorcerer’s man. Sit, if you like. The fish will come whether we watch or not.';
  return lines[visits % lines.length];
}

function questChoices(npc, context, say) {
  const { nethereum: arc = null, openDialogue, closeDialogue, inventory = null, cooking = null, notify = null, startEncounter = null, onChange = null } = context;
  if (!arc?.accepted?.()) return [];
  const stage = arc.stage(), out = [], changed = () => onChange?.();
  // A recipe counts as taught only when the kitchen takes it (as in Build 1, 6 October 2026).
  const learn = (id, name) => {
    const learned = cooking?.learn ? cooking.learn(id) : { ok: true };
    if (learned?.ok === false) { notify?.(learned.reason || `You cannot make ${name} yet.`, `${npc.name.toUpperCase()} TRIED TO TEACH YOU A RECIPE`); return false; }
    arc.noteTaught(id); changed();
    notify?.(`You can make ${name} now.`, `${npc.name.toUpperCase()} TAUGHT YOU A RECIPE`);
    return true;
  };
  const taught = id => arc.view().taught.includes(id);

  if (npc.id === 'mererid') {
    if (stage === 'arrive') out.push({ id: 'nethereum-mererid-meadow', label: 'Ask about the meadow.', action: () => { arc.meet(); changed(); say([...MERERID_MEADOW]); } });
    if (at(arc, 'hatch')) {
      out.push({ id: 'nethereum-mererid-water', label: 'Ask about the water.', action: () => { arc.learnWater(); changed(); say([...WATER_LESSON]); } });
      out.push({ id: 'nethereum-mererid-levee', label: 'Take a turn at levee work.', action: () => {
        const result = arc.leveeWork();
        if (!result.ok) { say([result.reason]); return; }
        changed();
        say(['A turn on the levee, then. Turf to the crest where the cattle have been at it, and the toe cleared on the meadow side.',
          `There. The store does not take its tenth from a man who has kept the levee today. That is not a kindness. It is arithmetic.`]);
      } });
    }
    if (at(arc, 'sow') && !taught(NETHEREUM_RECIPE_IDS.oatcakes)) out.push({ id: 'nethereum-mererid-oatcakes', label: 'Ask how oatcakes are made.', action: () => {
      // Heard and not kept when the kitchen refuses (no Fire Making): the choice stays for another day.
      learn(NETHEREUM_RECIPE_IDS.oatcakes, 'oatcakes');
      say(['Two of flood oats, ground rough, wet with whatever you have, and laid on a hot stone until they stop arguing. Oatcakes.',
        'With smoked fish they are a meal. Without it they are what you eat while you wait for one.']);
    } });
  }
  if (npc.id === 'seithenyn') {
    out.push({ id: 'nethereum-seithenyn-flood', label: 'Ask about the flood year.', action: () => say([...SEITHENYN_SHAME]) });
    if (stage === 'hatch') out.push({ id: 'nethereum-seithenyn-mend', label: 'Ask him to help mend the hatch.', action: () => {
      const result = arc.mendHatch();
      if (!result.ok) {
        say([result.reason || 'Two planks for the paddle, and ironwork for the straps. Salvaged metal will do: the river does not care where the iron has been. Come back with them.']);
        return;
      }
      changed();
      say(['Hold that. No, the other way. The paddle seats in the grooves, and the straps go on the outside, where the water pushes them home instead of off.',
        'There. It opens and it shuts. I have not said that about anything in nineteen years.',
        'Do not open it because I mended it. Ask Mererid first what you are opening it for.']);
    } });
    if (stage === 'done' && !arc.view().minder) out.push({ id: 'nethereum-seithenyn-mind', label: 'Ask him to mind the meadow while you are away.', action: () => {
      const dish = firstDish(inventory);
      if (!dish) { say(['For a dish, I will. Not coin. Coin I would only drink.']); return; }
      const result = arc.mind(dish);
      if (!result.ok) { say([result.reason]); return; }
      changed();
      say(['Then I sit by the hatch while you are gone, and when the silt shines I draw it off. Once, for one dish. I have had nineteen years’ practice at sitting by it.']);
    } });
  }
  if (npc.id === 'gwyddno') {
    out.push({ id: 'nethereum-gwyddno-weir', label: 'Ask about the weir.', action: () => say([
      'Stakes and wattle in a V across the Neth, the point downstream, and the trap in the point. The fish swim into it on their own. They are not clever fish.',
      'Haul the catch from the head on the bank, once a day. Three, on an ordinary day. More if you know what you are doing with a line.',
      'Before noon the catch is fresh from the trap. After noon it has sat in it half the day, and you can taste which.']) });
    if (!taught(NETHEREUM_RECIPE_IDS.smokedFish)) out.push({ id: 'nethereum-gwyddno-smoking', label: 'Ask how the fish are smoked.', action: () => {
      learn(NETHEREUM_RECIPE_IDS.smokedFish, 'smoked fish');
      say(['Gut it, salt it, and hang it in the smoke-house over oak and alder for as long as it takes to walk to Haethom and back. Smoked fish.',
        'The smoke-house is mine, and the smoke is the river’s. Use it.']);
    } });
    if (arc.trusts('gwyddno')) out.push({ id: 'nethereum-gwyddno-foundling', label: 'Ask about the weir in the Long Water.', action: () => say([...GWYDDNO_FOUNDLING]) });
  }
  if (npc.id === 'boann') {
    out.push({ id: 'nethereum-boann-cattle', label: 'Ask about the cattle.', action: () => say([
      'They go on to the new grass when the footing holds, and come off it when the grass is done. Two months. They are fat by the end, and the Galan butchers pay for it.',
      'Hay keeps them the rest of the year. That is why the meadow matters to me, and why I buy every truss you cut.']) });
    if (stage === 'wolves') out.push({ id: 'nethereum-boann-wolves', label: 'Go after the wolves.', action: () => {
      const result = arc.meetWolves();
      if (!result.ok) { say([result.reason]); return; }
      closeDialogue();
      if (startEncounter) startEncounter(NETHEREUM_WOLVES);
      else notify?.('They come in off the hollow from the west, low along the wet threads. Fire will move them. Boann has tried shouting.', 'NETHEREUM · WOLVES');
    } });
  }
  if (npc.id === 'fintan') {
    out.push({ id: 'nethereum-fintan-recall', label: 'Ask about the Recall.', action: () => say([
      'As the water rises each spring we speak the names, the year’s new ones last. Thirty generations deep. It takes the morning.',
      'I will not say a name off the levee, and I will not say one on an ordinary day. Come when it is time, and stand where you are told.']) });
    if (stage === 'recall' && carriedDishes(inventory).both) out.push({ id: 'nethereum-fintan-stand', label: 'Stand at the Flood Recall.', action: () => {
      openDialogue(npc, [...FLOOD_RECALL], null, HUB_LABEL, { noWayfinding: true, choices: [
        { id: 'nethereum-fintan-carry', label: 'Ask whether you may carry one of the names to Minora.', action: () => {
          const result = arc.recall('carry');
          if (!result.ok) { say([result.reason]); return; }
          changed();
          say(['Which one. No, I know which one. You have the look of a man who has been told about a basket.',
            'A name spoken at the Recall belongs to the water, and to whoever has a need of it. If the old man in the tower has a need of it, carry it. Say it to him, and to nobody on the road.']);
        } },
        { id: 'nethereum-fintan-leave', label: 'Leave the names on the levee.', action: () => {
          const result = arc.recall('leave');
          if (!result.ok) { say([result.reason]); return; }
          changed();
          say(['Good. Most people should. The water keeps them well enough.']);
        } },
      ] });
    } });
  }
  if (npc.id === 'airmid') out.push({ id: 'nethereum-airmid-baskets', label: 'Ask about the baskets.', action: () => say([
    'Rush from the wet threads, split and soaked and plaited. A basket of mine carries one more of anything than the one you have. That is the whole of the trade.',
    'Haethom lived by rush once. Now it lives by hay and hides, and I live by the people who still want a good basket.']) });
  if (npc.id === 'liban') out.push({ id: 'nethereum-liban-deep', label: 'Ask about the ground below the line.', action: () => say(libanLines(arc)) });
  return out;
}

/** Liban on the deep plots: not yet, not you yet, and then yours. */
function libanLines(arc) {
  const opening = 'Four beds by my hummock, below the line. The best ground in the hollow, because the water brings it a new coat every spring.';
  if (arc.stage() !== 'done') return [opening, 'Bring the meadow back first. A man who cannot time the water on the meadow has no business timing it down here.'];
  if (!arc.deepOpen()) return [opening, `You have the meadow. You do not have the hands for this yet. Come back when your farming is ${DEEP_LEVEL}, and I will show you which bed floods first.`];
  return [opening, 'They are yours. One year in five the water takes the crop, and you say nothing about it to anybody on the ridge. The other four, you eat.'];
}

/** The first dish the satchel holds, for Seithenyn's wage: any cooked food the price table calls a dish. */
export function firstDish(inventory) {
  if (!inventory?.items || !inventory?.count) return null;
  return inventory.items().find(id => goodOf(id)?.kind === 'dish' && inventory.count(id) > 0) ?? null;
}
