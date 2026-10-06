/**
 * The people of Ostel, and the two working on the road outside it.
 *
 * Ambient conversation only: nobody here moves a quest, and the one thing that
 * changes is what they say about the ogre once somebody has taken the road off
 * him. Amodians speak the way the lore says they think: maintenance first,
 * water as law, proportion as a virtue, hospitality practical and exact. The
 * dialect's water-measure words are in their mouths and not explained, because
 * people do not explain their own vocabulary — *water that cuts*, *water that
 * seeps*, *water that can be trusted overnight*, *water that looks like plenty
 * and goes into the gravel*.
 *
 * Ambron's clerk is treated with immaculate politeness and told nothing, which
 * is the only way this country has ever been administered.
 *
 * Pure: no DOM, no three; the host supplies the dialogue box.
 */
import { OSTEL_STANDS, OSTEL } from './amod-world.js';

const facing = id => {
  const stand = OSTEL_STANDS[id], dx = OSTEL.centre.x - stand.x, dz = OSTEL.centre.z - stand.z;
  return Math.hypot(dx, dz) > .5 ? Math.atan2(dx, dz) : Math.atan2(OSTEL.across.x, OSTEL.across.z);
};
const person = (id, name, role, modelRole, color) => Object.freeze({ id, name, role, modelRole, color, yaw: facing(id) });

export const AMOD_NPCS = Object.freeze([
  person('ostel-measure-keeper', 'Verel Ossan', 'Measure-keeper of the Tarvel', 'rise-custodian', 0x5d6f6a),
  person('ostel-springkeeper', 'Anwe', 'Who keeps the spring house', 'rise-custodian', 0x6d7f7a),
  person('ostel-court-clerk', 'Havel Dross', 'Clerk of the water court', 'relay-clerk', 0x6a6352),
  person('ostel-roadhouse', 'Anseth Vole', 'Keeper of the Struck Measure', 'shelter-keeper', 0x8a6a44),
  person('ostel-accountant', 'Brann Ottel', 'Toll accountant of the Pueth road', 'relay-clerk', 0x726a55),
  person('ostel-clerk', 'Clerk Nels Ferrell', 'Of the prefecture at Mavren', 'relay-clerk', 0x83322c),
  person('ostel-carter', 'Sella Vint', 'Carter to the lake country', 'commons-miller', 0x7d6a4c),
  person('ostel-muleteer-1', 'Dov Kessel', 'Mule driver on the pass road', 'forest-woodcutter', 0x63705a),
  person('ostel-muleteer-2', 'Pell Kessel', 'Mule driver on the pass road', 'forest-woodcutter', 0x5c6a56),
  person('ostel-stonecutter', 'Hedda Marn', 'Stonecutter', 'forest-woodcutter', 0x6f6a58),
  person('ostel-apprentice', 'Corm', 'Apprentice at the stone yard', 'bridge-keeper', 0x7a7260),
  person('ostel-smith', 'Goibniu', 'Smith: hooks, hinges and gate metal', 'forest-woodcutter', 0x55503f),
  person('ostel-vintner', 'Tela Anset', 'Of the press house', 'commons-miller', 0x8a5f4e),
  person('ostel-cellarer', 'Old Garrec', 'Cellarer', 'shelter-keeper', 0x6b6150),
  person('ostel-widow', 'Isen Caerel', 'Who keeps her husband’s wall', 'rise-custodian', 0x5f5a4c),
  person('ostel-goatherd', 'Wren Kalle', 'Goatherd on the upper ground', 'bridge-keeper', 0x6a7355),
  person('ostel-orchardman', 'Tobe Marren', 'Who grafts the walnuts', 'commons-miller', 0x70724f),
  person('amod-culvert-hand', 'Jorn', 'Clearing the culvert, again', 'forest-woodcutter', 0x5f6a52),
  person('amod-wall-wright', 'Kesta Orrel', 'Rebuilding the first terrace', 'forest-woodcutter', 0x6c6553),
]);
export const AMOD_NPC_IDS = Object.freeze(AMOD_NPCS.map(npc => npc.id));

export const AMOD_AMBIENT = Object.freeze({
  'ostel-measure-keeper': Object.freeze([
    'Verel Ossan. I am the measure-keeper of the Tarvel, which means that when the written right and the water disagree, the court asks me which of them has changed.',
    'The record from my grandmother’s time says the Dromel takes a third at the head. The Dromel has not been able to take a third since the bed moved. The record is not wrong. It is describing a stream that no longer exists.',
    'Above the Dromel gate it is water that cuts. Below it, in August, it is water that looks like plenty and goes into the gravel before it reaches Vessen. Those are two different things and the prefecture writes both of them down as flow.',
  ]),
  'ostel-springkeeper': Object.freeze([
    'The spring has not failed in living memory, and it will not fail while somebody sweeps the sill. That is the whole arrangement.',
    'It is water you can trust overnight. You could put a cup under it in the dark and come back at dawn and the cup would be where you left it and full.',
  ]),
  'ostel-court-clerk': Object.freeze([
    'Havel Dross, clerk of the court of the Tarvel. Fourth Thursday, after the mid-day, in that room, and anyone whose field, spring, mill, herd, road or wall is touched by the matter has standing.',
    'Anyone. That is not a courtesy, it is the reason the decision holds. A thing decided over a man’s head is a thing he does not do, and then you have a wall nobody repairs.',
    'We hear the Dromel gate about every third year. It is not a feud. It is a slot, and two households, and a width, and it will outlive all of us, and that is all right.',
  ]),
  'ostel-roadhouse': Object.freeze([
    'The Struck Measure. Bread, a bed, the hard white, and hot water for your feet before I ask you a single question about where you are going.',
    'Sit near the fire. Get dry. There. Now: where are you going?',
    'If you go out the back to the yard and the wood is low, bring an armful in. I will not ask you to. I will remember that you did.',
  ]),
  'ostel-accountant': Object.freeze([
    'Brann Ottel. I keep the road’s book: what comes down the pass, what goes on to the lake country, what it cost and what it ought to have cost.',
    'Amod does not make anything cleverer than anybody else. We make it arrive with fewer losses than expected. That is the trade, and it is a duller sentence than the Nyrossi would use, and it is truer.',
    'There is a line in the back of the book that reads *the stone-keeper’s due*, four times a year. I inherited it. My father inherited it. It is cheaper than the alternative and I have done the arithmetic twice.',
  ]),
  'ostel-clerk': Object.freeze([
    'Clerk Nels Ferrell, of the prefecture at Mavren. I am compiling the returns for the eastern pass. Everyone here has been extremely helpful.',
    'They give me tea. They carry my case up the stair. They answer every question, at length, and when I read the answers back in the evening I find I have learned the weather.',
    'I asked the court for a schedule of diversions on this stream. They gave me a schedule of diversions on this stream. It runs to nine pages and it is dated by saints’ days that do not appear in any calendar the prefecture holds.',
  ]),
  'ostel-carter': Object.freeze([
    'Sella Vint. Wine and worked stone down to the lake towns, fish and lowland grain back up when the hills have had a bad year.',
    'Elagos will take everything Amod can grow and ask for more, which is why our ledgers are ruled the Elagosi way and nobody here can tell you when that started.',
    'The war is down there and it is not up here, and I intend to keep driving straight through the middle of that sentence for as long as it lasts.',
  ]),
  'ostel-muleteer-1': Object.freeze([
    'Dov Kessel. Mules from Kelmod, which is where the good ones come from, whatever anyone at Sareth-am-Vel tells you.',
    'Twelve up to the pass inns, twelve down. The mules know the road better than I do. I am on the payroll to open gates and be shouted at.',
  ]),
  'ostel-muleteer-2': Object.freeze([
    'Pell. He is my brother and he has been telling you about mules. He tells everybody about mules.',
    'Three copper at the stones, six for a cart. Our grandfather paid it. You pay it, you go on, you get to Ostel before dark. Nobody has ever thought of a better arrangement, and people have thought quite hard.',
  ]),
  'ostel-stonecutter': Object.freeze([
    'Hedda Marn. Lintels, gate jambs, sills, channel stone. Anything that has to keep its edge with water running over it for eighty years.',
    'I saw the bridge you came over out of Pueth. Timber. Timber is a decision to do this again in thirty years and pretend you did not know.',
    'Come at the block along the bed, not across it. Everything I know that is worth saying is that sentence about something else.',
  ]),
  'ostel-apprentice': Object.freeze([
    'Corm. Third year. I am allowed to rough out and I am not allowed to finish, and I have stopped arguing about it.',
    'She says a good wall is one nobody notices and a great wall is one that outlives the argument about who paid for it. Then she makes me take the barrow out again.',
  ]),
  'ostel-smith': Object.freeze([
    'Goibniu. Pruning hooks, channel knives, hinge work, mill fittings, and the small metal that keeps a water gate honest.',
    'Not swords. You can buy a sword in Mavren from somebody who will be glad of the money. I would rather make the pin that holds the gate that waters the field that feeds the man.',
  ]),
  'ostel-vintner': Object.freeze([
    'Tela Anset. You will not like it. Everyone says they like it and then their face does something, and I have watched that face for twenty years.',
    'Drink it with the goat cheese and the walnuts and come back in a week. By the second week you will be complaining that the lake country waters theirs.',
    'It is a dry-slope wine. Thin soil, pale grass, too much sun and not enough water — the vine has to go down for it, and what comes back up is hard and clean and honest. Like a good deal else here.',
  ]),
  'ostel-cellarer': Object.freeze([
    'Old Garrec. The cellars run back into the shoulder, and the shoulder does the cooling. No ice ever came up this road and none ever will.',
    'The rule is a cup on a repaired wall and the first chestnuts at the spring. Not because anything listens. Because you look at the wall while you are doing it.',
  ]),
  'ostel-widow': Object.freeze([
    'Isen Caerel. This is my husband’s wall and I do not care to hear it called anything else.',
    'Frost gets under the east end every winter and lifts a course, and every spring I put it back. A wall remembers every winter. So do I, and so does the field under it.',
    'You could tell me to pay a man to do it. People from Mavren do. But then a man who does not know the wall has laid the stones, and in four years I would be taking his work out before I could put mine back.',
  ]),
  'ostel-goatherd': Object.freeze([
    'Wren Kalle. Up to the chestnut ground by day and down inside the walls by night, and no goat of mine has ever eaten a vine, whatever Tobe says.',
    'Autumn is the month. Dry air, the ridges clean to the eye, chestnut smoke in the valleys and every animal in the country walking downhill at once.',
  ]),
  'ostel-orchardman': Object.freeze([
    'Tobe Marren. I graft the walnuts. Thirty years before one of them is worth the ground it stands on, so a man who plants walnut is telling you something about what he thinks of his grandchildren.',
    'Wren’s goats have eaten a vine. I am not going to the court about it. I am going to mention it every time I see her for the rest of her life, which is a better system.',
  ]),
  'amod-culvert-hand': Object.freeze([
    'Jorn. I am clearing the culvert. It is cleared after every storm and before every storm anybody expects, and this is the fourth time since the thaw.',
    'If it blocks, the channel goes over the road, and then the road is a stream, and then in two winters there is no road and a very good argument about whose fault that was.',
    'There is a second hook by the stone if you have five minutes. No? Fair enough. Mind the wall past here, they are still rebuilding it.',
  ]),
  'amod-wall-wright': Object.freeze([
    'Kesta Orrel. The western end came down in the wet spring and I am putting it back, and I am putting it back properly, which is why it is taking until autumn.',
    'You can see four hands in this wall if you know where to look. That course is my grandfather. That one above it is somebody who was in a hurry in a year nobody wrote down.',
    'Stand anywhere you like, only not there — that is where the stones go. People admire the view from exactly there. Every time.',
  ]),
});

/**
 * What changes once the road is taken off Mallec. Only the people it is actually
 * anybody's business tell the traveler about it, and they tell it as a piece of
 * ordinary administration, which in Amod is the highest compliment available.
 */
const AFTER_THE_OGRE = Object.freeze({
  'ostel-accountant': Object.freeze([
    'You will want the line closed. I have closed it. *The stone-keeper’s due*, struck through, dated, with the reason in the margin.',
    'Here is this quarter’s charge, which we will not now be paying, and which is not mine to keep. Take it. It is the only honest way to close a line.',
    'I am told I should feel more about this than I do. What I feel is that the column adds up differently now, and I have checked it twice, and it does.',
  ]),
  'ostel-court-clerk': Object.freeze([
    'The court of the Tarvel has recorded its judgement as enforced. Eleven years after it was handed down, which is not the longest wait in the book.',
    'I have written your name in the margin. That is not usual. The court does not name people who were not party to the matter. I have done it anyway and I will hear about it on the fourth Thursday.',
    'He kept the paper, you know. She came back and told us. Eleven years and he still had it, under the stone, folded.',
  ]),
  'ostel-roadhouse': Object.freeze([
    'Sit down. No, sit down. Bread and the hard white and I am not taking anything for it, and you can argue about that after you have eaten.',
    'I have paid that toll every quarter since my mother handed me the book and she paid it before me. I have no idea what I am going to do with the money and I intend to find out slowly.',
  ]),
  'ostel-muleteer-2': Object.freeze([
    'We went past the stones this morning and nobody asked us for anything and Dov nearly walked into a wall.',
    'He was still sitting there. He said good morning. He has never said good morning in his life.',
  ]),
});

export const amodAmbientLines = (id, beaten = false) => [...((beaten && AFTER_THE_OGRE[id]) || AMOD_AMBIENT[id] || [])];

/** A plain conversation for one of Ostel's people. `beaten` is whether the road is open. */
export function amodConversation(npc, context) {
  const { openDialogue, closeDialogue, ogreBeaten = false } = context;
  const lines = amodAmbientLines(npc?.id, ogreBeaten);
  if (!lines.length) return false;
  openDialogue(npc, lines, null, 'Back to the road', { choices: [{ id: 'leave-ostel-talk', label: 'Good day to you.', action: closeDialogue }] });
  return true;
}
