/**
 * The people of Ambron, and of the lake country round it.
 *
 * Ambient conversation only: nobody here moves a quest. Chapter 3 is not built,
 * and when it is, these are the people it will find already standing.
 *
 * The day matters. The traveler arrives **one day after the revolution**
 * (`docs/the-war-and-the-house-of-ambron.md`): Cedric is driven out and gone
 * east to Isareos, the republicans and Prince Willard have settled on a
 * constitutional monarchy, the proclamation went up yesterday morning, and word
 * came last night that **Valroy has landed in the east** with the army he took
 * abroad. Nothing in the city has stopped. The chain went up at dawn as it does
 * every dawn, the tally was taken, and the barges paid.
 *
 * That is the seam these lines are written on: not the revolution, which is a
 * day old and mostly a piece of paper, but the toll, which is four hundred years
 * old and is the reason there is anything here to have a revolution in. Ask a
 * bargeman what changed and he will tell you what he paid.
 *
 * Voice rules (docs/content-pass.md, and the house history):
 *  - **"King" or "emperor" is a declaration.** Royalists say *Empire* because it
 *    makes them legitimate; republicans say it with contempt, because calling a
 *    king an emperor is calling him a tyrant. Nobody uses the two by accident.
 *  - The Legion speaks in orders and requisitions and calls republicans rebels.
 *  - The Elagosi speak plainly, and with the flat confidence of people whose
 *    lakes were here before the empire and expect to outlast it.
 *  - Only Legion people wear Legion armour; soldiers are men by default.
 *
 * No render or DOM dependencies; the host supplies the dialogue box.
 */
import { AMBRON_STANDS } from './ambron.js';
import { NEMMEL, THE_STAIR } from './elagos-world.js';

const freeze = Object.freeze;

const person = (id, name, role, modelRole, color) =>
  freeze({ id, name, role, modelRole, color, yaw: AMBRON_STANDS[id]?.yaw ?? 0 });
const soldier = (id, name, role, modelRole) =>
  freeze({ id, name, role, modelRole, color: 0x8f3b30, yaw: AMBRON_STANDS[id]?.yaw ?? 0, armed: false });

/** Outside the walls: the lake country's own two. */
const outsider = (id, name, role, modelRole, color, at, yaw) =>
  freeze({ id, name, role, modelRole, color, yaw, x: at.x, z: at.z });

export const AMBRON_NPCS = freeze([
  // The toll, and the machine that takes it
  person('ambron-toll-clerk', 'Sabbis Orenn', 'Clerk of the Chain', 'relay-clerk', 0x5d6470),
  person('ambron-tally-boy', 'Dreo Vell', 'Tally boy', 'reed-worker', 0x7a7550),
  person('ambron-chainman', 'Orrec Damm', 'Chainman', 'commons-miller', 0x64604b),
  person('ambron-bargemaster', 'Kess Vollo', 'Bargemaster, waiting', 'bridge-keeper', 0x546a6d),
  person('ambron-bargewoman', 'Mella Drusk', 'Boat-owner of Brul', 'rise-custodian', 0x5f6a74),
  // The Empire's own
  soldier('ambron-legate', 'Legate-General Duvo Harn', 'Commander of the narrows', 'legion-officer'),
  soldier('ambron-adjutant', 'Optio Bral Osser', 'The Legate-General’s adjutant', 'legion-soldier'),
  person('ambron-scrivener', 'Luso Marren', 'Scrivener of the Record House', 'relay-clerk', 0x6a5f4e),
  soldier('ambron-gate-optio', 'Optio Halvo Renn', 'Officer of the Plain Gate', 'legion-officer'),
  soldier('ambron-gate-legionary', 'Legionary Tuss', 'Ambroni Legion soldier', 'legion-soldier'),
  soldier('ambron-lake-gate-guard', 'Legionary Bessin', 'Ambroni Legion soldier', 'legion-soldier'),
  soldier('ambron-causeway-legionary', 'Legionary Corvo', 'Ambroni Legion soldier', 'legion-soldier'),
  // One day of revolution
  person('ambron-committee', 'Neira Sarn', 'Of the King’s Council in Ambron', 'rise-custodian', 0x6b5a72),
  person('ambron-printer', 'Vetch Ollim', 'Printer of proclamations', 'relay-clerk', 0x6f6152),
  // The market, and the lake country come to town
  person('ambron-fishwife', 'Berra Ossul', 'Fish seller', 'rise-custodian', 0x60705e),
  person('ambron-grain-factor', 'Tovik Lamm', 'Grain factor', 'commons-miller', 0x77684c),
  person('ambron-farmer', 'Arren Tull', 'Barley farmer of the Ossen shore', 'forest-woodcutter', 0x6d6a4a),
  person('ambron-farmwife', 'Ossa Venn', 'His sister, with the cart', 'shelter-keeper', 0x7c6a58),
  person('ambron-brul-fisher', 'Dag Brennel', 'Deep-water fisher of Brul', 'bridge-keeper', 0x4f5f68),
  person('ambron-ice-warden', 'Orro Thann', 'Warden of the ice-roads', 'shelter-keeper', 0x5a6266),
  // The timber strand
  person('ambron-raftsman', 'Hanno Veld', 'Raftsman of the Thelas chain', 'forest-woodcutter', 0x6b6448),
  person('ambron-sawyer', 'Pell Dressan', 'Sawyer', 'forest-woodcutter', 0x655c46),
  person('ambron-ropewalker', 'Vess Annil', 'Ropemaker', 'reed-worker', 0x70664e),
  // The ones the toll does not reach
  person('ambron-beggar', 'Old Ketto', 'Water-steps beggar', 'doomsayer', 0x4c4a44),
  person('ambron-widow', 'Sennet Ollo', 'Of the strand rows', 'rise-custodian', 0x5b5650),
]);

export const ELAGOS_COUNTRY_NPCS = freeze([
  outsider('nemmel-netmaker', 'Thessa Ollan', 'Net-maker of Nemmel', 'rise-custodian', 0x5e6c6a, { x: NEMMEL.x + 6, z: NEMMEL.z + 4 }, -Math.PI / 2),
  outsider('stair-ganger', 'Bolm Harrick', 'Ganger of the Stair capstan', 'commons-miller', 0x6c6148, { x: THE_STAIR.capstan.x + 3, z: THE_STAIR.capstan.z + 2 }, -Math.PI / 2),
]);

export const ELAGOS_NPCS = freeze([...AMBRON_NPCS, ...ELAGOS_COUNTRY_NPCS]);
export const ELAGOS_NPC_IDS = freeze(ELAGOS_NPCS.map(npc => npc.id));
const ids = new Set(ELAGOS_NPC_IDS);
export const isElagosNpc = id => ids.has(id);

export const ELAGOS_AMBIENT = freeze({
  'ambron-toll-clerk': freeze([
    'Sabbis Orenn, Clerk of the Chain. Fourth book, nineteenth year. If you are going south with anything on the water, you come to me before you come to the chain.',
    'Grain a twentieth, fish a fifteenth, sawn timber a tenth, salt a twentieth going north and nothing going south because nothing goes south. It has been those numbers since before my grandfather kept this desk.',
    'Yesterday I wrote the entries under King Cedric. This morning I wrote them under the King-in-Council. The hand is the same hand and so is the number, and a bargeman cannot tell one page from the other without reading the top of it.',
    'People say the toll pays for the army. It does. Then the army makes the toll be paid, and what is left over pays for the prefects, and the prefects raise the taxes that pay for the army. You can start that sentence anywhere you like. It comes round.',
  ]),
  'ambron-tally-boy': freeze([
    'Dreo. I run the tally down to the chainman and back up to the clerk, and I have done it four hundred times since the ice went out.',
    'Forty-one boats waiting this morning. It was nine yesterday, because nobody moved anything the day of the proclamation. Everyone waited to see whether the chain went up, and it went up.',
    'If you want to know how the Lake Lands are doing, do not ask the Legate-General. Count the boats above the chain, and then count the ones below it.',
  ]),
  'ambron-chainman': freeze([
    'Orrec Damm. I wind it up at first light and down at dusk, and I have never once been asked whether I thought it should go up.',
    'Eighty links a turn, twenty-two turns, and a chain a man’s arm thick lying across the water gate. Nothing on this lake is strong enough to take it and nobody has ever been stupid enough to try.',
    'The chain is not to keep anybody out. Ambron does not need keeping out of. It is to make them stop, and a thing that makes people stop is worth more than a wall.',
  ]),
  'ambron-bargemaster': freeze([
    'Kess Vollo. Three boats, fifty tons of Ossen barley, and a place in the line since the day before yesterday.',
    'I have paid this toll every season of my working life and I will tell you the truth of it: I do not mind the number. I mind the waiting. Three days above the chain is three days of a crew eating, and the clerk does not weigh that.',
    'They pulled the prince down and put another one up and I am still forty-first in the line. That is what a revolution looks like from a barge.',
  ]),
  'ambron-bargewoman': freeze([
    'Mella Drusk. Brul boat, Brul crew, and dried fish that will be in Nylon harbour before the frost if this queue ever moves.',
    'The lake taught us to read weather the way you read a road sign. Ambron taxes the catch and has the sense not to tell us how to take it, which is the most anybody can say for an empire.',
    'Say king. In Brul we say king. The ones who say emperor want something from you.',
  ]),
  'ambron-legate': freeze([
    'Legate-General Duvo Harn. I hold the narrows. Whatever else is being argued in this city, the narrows are held.',
    'You will hear that I turned my coat at dawn yesterday. I did not turn anything. My orders are to keep the chain, the quays and the granaries, and a proclamation nailed to the Toll House door does not alter one of the three.',
    'Cedric is gone east. Wilhelm is shut up in Nylon and may the gods keep him there. Prince Valroy came ashore in the east four days ago with an army that has been fighting across the sea for six years, and he has not written to me. That is the only fact in this city worth your attention.',
    'If you are a sellsword, the pay is the pay and the Legion does not haggle. If you are a messenger, say so and say from whom.',
  ]),
  'ambron-adjutant': freeze([
    'Optio Bral Osser. The Legate-General is at the Seat and will not be drawn on the succession. Do not try.',
    'Three cohorts on the walls, one on the quays, one standing down. We have had one broken window and no fires. For a revolution that is an orderly one.',
    'The rebels in the south call us the Empire’s dogs. The council upstairs calls us the King’s garrison. The rota has not changed.',
  ]),
  'ambron-scrivener': freeze([
    'Luso Marren. The Record House. Tolls, tallies, water rights, portage disputes and four hundred years of the Thelas chain arguing about the same portage.',
    'The forms are in Elagosi and always have been. A prefect in the Moros will draft a ruling in Mittoli and then use six of our words in it, because Mittoli never needed a word for a thing it never did.',
    'When the empire goes small the records stay. That is the lesson of this building. Whoever comes next will want to know what was owed, and we will be able to tell them.',
  ]),
  'ambron-gate-optio': freeze([
    'Optio Halvo Renn. Name, trade, and what you are carrying. The Plain Gate is open and it is going to stay open.',
    'Board over the arch. Grain, fish, timber, salt, hides. If your load is not on the board, it is a tenth and an argument, and you will lose the argument.',
    'You came up the haul road, so you have seen the Stair. Everything the Lake Lands sells comes up that or goes down it, and it all walks past me.',
  ]),
  'ambron-gate-legionary': freeze([
    'Move along inside the arch. Do not stand in the passage.',
    'Forty-eight hours on this gate and I have turned back one drunk and let in eleven hundred sacks of barley.',
  ]),
  'ambron-lake-gate-guard': freeze([
    'Lake Gate. The shore road runs north to Nemmel and the shrine. There is nothing on it that will hurt you.',
    'They say a prince has landed in the east. They say it every autumn. This time the boats came in early from the Ossen shore, which is not nothing.',
  ]),
  'ambron-causeway-legionary': freeze([
    'Keep to the deck. The parapet is old and the water under it is deeper than it looks.',
    'Seven arches. They rebuilt the top of it twice in my father’s lifetime and never once touched the piers, because nobody alive knows how the piers were made.',
  ]),
  'ambron-committee': freeze([
    'Neira Sarn. I sit on the council that made Willard a king with a leash on him, and I have been awake for two days.',
    'Not emperor. King. An emperor is a man who answers to nobody, and we have just spent a great deal of blood establishing that there is no such thing in Ambron.',
    'Cedric took the toll and spent it on himself and the city let him, because the city has always let whoever holds the chain do as he likes. That is the part we have not fixed. A proclamation is a day’s work; the chain is four hundred years old.',
    'The first thing anyone asked me this morning was whether the toll would be lowered. It will not. We need the army more than we did on Tuesday.',
  ]),
  'ambron-printer': freeze([
    'Vetch Ollim. I set the proclamation on Tuesday night and I have printed it in Elagosi and in Mittoli and I am printing it again because they have altered one word.',
    'The word is "empire". It was in the second line and it is not any more.',
    'I printed Cedric’s accession too. Nobody has mentioned that today and I am not going to be the one who does.',
  ]),
  'ambron-fishwife': freeze([
    'Berra Ossul. Dried Brul, dried Ossen, salted Ela, and a thing in the third basket that you should not ask about and would like.',
    'The fish keeps. That is the whole of Elagos in three words. Anything that keeps can be sold a long way off, and a long way off is where the money is.',
    'They will tell you the empire runs on the toll. The empire runs on dried fish, and the toll runs on the fish going south.',
  ]),
  'ambron-grain-factor': freeze([
    'Tovik Lamm, factor. I buy the Ossen barley on the shore and I sell it on this square, and the difference between those two numbers is the toll and my dinner.',
    'Moros grain comes north through the same gate and pays the same tenth. When the Moros has a bad year I do well, and I have learned not to say so out loud.',
    'A day-old king has not moved the price a copper. Ask me again when the army moves.',
  ]),
  'ambron-farmer': freeze([
    'Arren Tull. Barley off the Ossen shore, and my sister with the cart. Two days on the road, one day in the queue at the gate.',
    'The lake margins grow two weeks longer than the Moros does. That is the whole reason there is a city here and not a village.',
    'We pay the tenth at the gate and the factor takes what he takes, and out of what is left I mend a roof every third year. It is not a complaint. It is the arithmetic.',
  ]),
  'ambron-farmwife': freeze([
    'Ossa Venn. Do not buy from my brother before you have talked to me; he undersells to get home early.',
    'They are printing something new on the Toll House door. I cannot read it and neither can Arren. Whatever it says, we will be back here at the same gate with the same cart in the spring.',
  ]),
  'ambron-brul-fisher': freeze([
    'Dag Brennel, off Brul. Twelve days down: the Link, the portage, the length of Ela and then the queue.',
    'We take a fish that lives deeper than anything you have eaten. Nobody on this continent can catch it but us, and every few reigns a clever man is sent up to teach us a better way and goes home again.',
    'Brul freezes hard and Brul freezes late, and a boat that is still out when it goes is a boat you do not get back. That is the only law we keep without being told.',
  ]),
  'ambron-ice-warden': freeze([
    'Orro Thann, warden of the ice-roads. In summer I am the least useful man in Ambron and I am paid all year, which tells you what the winter is like.',
    'When the snow shuts the west shore — and it shuts, four feet of it, in a night — the roads stop and the ice-roads open, and the goods do not stop for a day. The stones are cut and set in the autumn while the ground is still soft.',
    'A hand’s breadth of clear ice carries a man. Two carries a sledge. Anything less and I put the stakes across, and a man who moves my stakes is a man I do not go out after.',
  ]),
  'ambron-raftsman': freeze([
    'Hanno Veld. Thelas timber, three basins’ worth, tied into one raft by men who will not speak to each other on land.',
    'The Link is too quick to run and too shallow to load, so we break the raft, portage it, and tie it again on Ela. Four days. The upper basin says the middle basin should pay for the portage. The middle basin says the lower basin should. This has been going on since before the city.',
    'The dense-grained stuff goes to the boatyard on the strand and the rest goes south. It is good wood. It does not rot in the water and it takes a load, and there is no other wood on this continent that does both.',
  ]),
  'ambron-sawyer': freeze([
    'Pell Dressan. Sawpits. Six a day in summer, two in winter, and a bad back all year.',
    'This whole bank was fields when my mother was young. Then a good twenty years came and the city put houses on it, and then a bad ten came and half of them fell down, and now it is sheds. It will be houses again.',
  ]),
  'ambron-ropewalker': freeze([
    'Vess Annil. Rope. Two hundred strides of it under that roof, and every hawser above the chain came off my walk.',
    'The chain gets the songs. The chain does not tie a barge to anything.',
  ]),
  'ambron-beggar': freeze([
    'Ketto. I sat on these steps under Cedric and I am sitting on them under the council, and neither of them has looked down.',
    'They will tell you the toll pays for everything. It pays for the wall, the soldiers, the granary and the road. It does not come down here. There is no step in the accounts for the water steps.',
    'Boats come up and boats go down and every one of them has paid somebody. I have watched it for eleven years and I have never once seen a copper go the other way.',
  ]),
  'ambron-widow': freeze([
    'Sennet Ollo. My husband hauled on the capstan at the Stair until it took his hand, and then for two years until it took the rest of him.',
    'The rows here go up in the fat years and stand empty in the thin ones, and the rent is the same in both. The city gets bigger and smaller like a lung. We live in the part that does the breathing.',
    'I do not want the toll gone. Gone means no boats, and no boats means no work at all. I want somebody to notice that it is paid by people and not by barges.',
  ]),
  'nemmel-netmaker': freeze([
    'Thessa Ollan. Nets. Six houses, eleven boats, and the smoke shed that runs all year.',
    'Ambron is an hour that way and we go when we must. The lake was here first and we were here before the wall was, and in a bad century they will come out and count our fish, and in a good one they will leave us alone and count it anyway.',
    'Watch the water off the point in the evening. When it goes flat and grey and the far shore stands up taller than it is, there is weather coming in the morning and no boat goes out.',
  ]),
  'stair-ganger': freeze([
    'Bolm Harrick. I run the capstan. Eight men, two oxen, and a laden barge comes up the Stair in an hour and a half if nothing parts.',
    'Down is easy and down is how people die. Up is slow and up is where the wages are.',
    'The water falls twelve feet from the lip to the pool in four steps, and it has worn them square, so from below it looks like something built. It was not built. It is just where the shelf stops and the Moros starts.',
  ]),
});

/** A plain conversation for one of Elagos's people. */
export function elagosConversation(npc, context) {
  const { openDialogue, closeDialogue } = context;
  const lines = ELAGOS_AMBIENT[npc?.id];
  if (!lines) return false;
  const legion = npc.modelRole === 'legion-soldier' || npc.modelRole === 'legion-officer';
  const inCity = Boolean(AMBRON_STANDS[npc.id]);
  openDialogue(npc, [...lines], null, legion ? 'Step back' : inCity ? 'Back to the street' : 'Back to the road',
    { choices: [{ id: 'leave-ambron-talk', label: legion ? 'Optio.' : 'Good water to you.', action: closeDialogue }] });
  return true;
}
