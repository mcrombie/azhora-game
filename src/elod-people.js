/**
 * The people of Elod, and of East Suval outside it.
 *
 * Ambient conversation only: nobody here moves a quest. Pure — no three, no
 * DOM; the host supplies the dialogue box.
 *
 * Tone. The Elodi are precise, not shrill. They are not fanatics and they are
 * not mystics; they are people who believe one specific thing about authority
 * and have arranged a whole city around it, and who have been on the wrong end
 * of that belief in every other city on this coast. Nobody in Elod raises their
 * voice at a stranger. Several of them are wrong about things and say so
 * confidently.
 *
 * Two rules of speech, both worth keeping when adding lines:
 *  - An Elodi says **Ambron**, not *Empire*. Calling a thing an empire repeats
 *    its claim, and the Elodi do not repeat other people's claims. (Everyone
 *    else in the game follows docs/the-war-and-the-house-of-ambron.md: royalists
 *    say Empire for legitimacy, republicans say it with contempt.)
 *  - Nobody explains the theology in the shape of a lore entry. The theologian
 *    explains it because explaining it is his job and he is delighted to be
 *    asked; everyone else refers to it the way people refer to the law.
 *
 * The seam this city is written on is **neutrality**. In 976 Ambron and its
 * coalition declared war on Solis, and Lamdris and East Suval stayed out of it
 * rather than be destroyed with it (docs/the-war-and-the-house-of-ambron.md).
 * Three years on, some people here call that piety, some call it cowardice, and
 * some are watching Wilhelm — who worships Nanvir, the man-eating god, who
 * burned Solis and razed a holy city in Isareos — and doing sums about how much
 * good a shut gate will be.
 */
import { ELOD_STANDS, EAST_SUVAL_STANDS } from './east-suval.js';

const ELODI = 0x4a4a55, ELODI_GUARD = 0x2b2b2f, FOREIGN = 0x7a6a50;
/** Elod's people are ambient: drawn only when the traveler is near, like the town-life folk. */
export const ELOD_VIEW_RANGE = 85;

const person = (id, name, role, modelRole, color, extra = {}) => Object.freeze({
  id, name, role, modelRole, color, viewRange: ELOD_VIEW_RANGE,
  yaw: (ELOD_STANDS[id] ?? EAST_SUVAL_STANDS[id]).yaw, ...extra,
});
const official = (id, name, role, extra = {}) => person(id, name, role, 'elodi-guard', ELODI_GUARD, extra);

// ---------------------------------------------------------------------------
// The city
// ---------------------------------------------------------------------------
export const ELOD_NPCS = Object.freeze([
  // --- The harbour quarter: the only ground a stranger is free on.
  person('elod-harbourmaster', 'Sered Ammon', 'Harbourmaster of Elod', 'bridge-keeper', 0x55636a),
  person('elod-quay-clerk', 'Nadab Telem', 'Clerk of the weights', 'relay-clerk', 0x6b6656),
  person('elod-netmender', 'Kessa Orun', 'Net-mender on the quay', 'rise-custodian', 0x5f6d6b),
  person('elod-factor', 'Ostan Veyle', 'Factor of Enebreum, resident', 'commons-miller', FOREIGN),
  person('elod-delegate', 'Hesper Nain', 'Elod’s delegate to the Conclave', 'relay-clerk', 0x6a6a7c),
  person('elod-hostel-keeper', 'Iseth Rimon', 'Keeper of the strangers’ hostel', 'shelter-keeper', 0x7c6a58),
  person('elod-refugee', 'Wenna Sarn', 'Of Solis, since the burning', 'rise-custodian', 0x8a7f6a),
  person('elod-exile', 'Old Prian', 'Of Solis, oil factor, formerly', 'commons-miller', 0x8a6a3e),
  person('elod-salter', 'Mahel Corr', 'Salter and dry-fish merchant', 'reed-worker', 0x6a7264),
  official('elod-gatekeeper', 'Zimra Nath', 'Keeper of the Sea Gate'),

  // --- The inner districts: everyone a stranger may speak to stands outside the gate.
  official('elod-warden', 'Warden Baleth Orun', 'Warden of the Threshold', { look: Object.freeze({ officer: true }) }),
  official('elod-warden-guard', 'Gate guard', 'Of the Threshold watch', { look: Object.freeze({ kit: 'bow' }) }),
  person('elod-priest', 'Hanun Sered', 'Priest of the Threshold', 'rise-custodian', 0x3f4450),
  person('elod-theologian', 'Zohar Immer', 'Of the reading house', 'shelter-keeper', 0x4a4a55),
  person('elod-reader', 'Kesseth Vane', 'Reader of the eastern hours', 'rise-custodian', ELODI),

  // --- The ordinary city.
  person('elod-scribe-master', 'Master Arun Kessel', 'Master of the writing school', 'relay-clerk', 0x5d5f52),
  person('elod-scribe', 'Sela Imri', 'Scribe, in her fourth year', 'rise-custodian', 0x6e7a6a),
  person('elod-grain-keeper', 'Immer Vash', 'Keeper of the grain store', 'commons-miller', 0x7a6b4e),
  person('elod-cistern-keeper', 'Barod Nath', 'Keeper of the cisterns', 'bridge-keeper', 0x5a6a66),
  person('elod-young-man', 'Joram Vash', 'The grain keeper’s son', 'forest-woodcutter', 0x6b5d45),
  person('elod-dyer', 'Tirzah Vane', 'Dyer, at the whelk yard', 'rise-custodian', 0x6f5570),
]);

// ---------------------------------------------------------------------------
// The rest of East Suval
// ---------------------------------------------------------------------------
export const EAST_SUVAL_NPCS = Object.freeze([
  official('suval-frontier-serjeant', 'Serjeant Iseth Kel', 'Of the frontier guard, behind the gate'),
  official('suval-beacon-watch', 'Neth Aran', 'Beacon watch on the frontier ridge', { look: Object.freeze({ kit: 'bow' }) }),
  person('suval-lightkeeper', 'Hosan Reel', 'Keeper of the North Light', 'shelter-keeper', 0x5c6a72),
  person('suval-fisher', 'Yael Corr', 'Of Sorrow Beach', 'reed-worker', 0x6a7264),
  person('suval-terrace-farmer', 'Ammi Tal', 'Of Sevenwalls', 'commons-miller', 0x8a7a52),
]);

export const EAST_SUVAL_PEOPLE = Object.freeze([...ELOD_NPCS, ...EAST_SUVAL_NPCS]);
export const EAST_SUVAL_NPC_IDS = Object.freeze(EAST_SUVAL_PEOPLE.map(npc => npc.id));
const isOurs = new Set(EAST_SUVAL_NPC_IDS);

// ---------------------------------------------------------------------------
// What they say
// ---------------------------------------------------------------------------
export const EAST_SUVAL_AMBIENT = Object.freeze({
  'elod-harbourmaster': Object.freeze([
    'Sered Ammon, harbourmaster. You are on the quay, so you are welcome. That sentence has two halves and I mean both of them.',
    'Every ship that comes in is asked four things: where from, what in her, how many aboard, and what they intend to carry up the steps. It is the fourth one people find rude.',
    'I have been shouted at in six languages for the rule about the bells. Nobody has ever left because of it. They pay the duty, they keep their gods indoors, and they come back next season.',
    'You want to know whether Ambron’s ships come here. They came in 977 with a proposal about the harbour and were given water and a civil answer and a course out. That is the whole of our part in this war, and I would like it to stay the whole of it.',
  ]),
  'elod-quay-clerk': Object.freeze([
    'Nadab Telem. I keep the weights. The Confederation’s weights, mind — the same stone as Solis and Enebreum use, checked against the master set every spring.',
    'We observe the measures and we keep our lighthouse and we do not attend the Conclave. That has been the arrangement for about a hundred years and nobody has ever asked me to explain it, which I take as a compliment to the arrangement.',
    'A man from Zoth once argued that our weights ran three grains light. He was right. I said so, we adjusted them, and he told the whole coast that the Elodi are impossible. I am still not sure which part offended him.',
  ]),
  'elod-netmender': Object.freeze([
    'Kessa Orun. Mending, as you see. The sea on this side of the peninsula eats nets the way the west coast eats afternoons.',
    'They will tell you in Solis that the eastern shore is the poor half. It is. It is also the half that looks the right way.',
    'My cousin keeps the gate at the frontier road. Aveth. He writes twice a year, and both letters say the same thing: nothing has happened, the order stands, send oil.',
  ]),
  'elod-factor': Object.freeze([
    'Ostan Veyle, for the house of Marren in Enebreum. Twenty-one years on this quay. My children were born in that house behind you.',
    'I keep the Grey Warden in my own hall, with a lamp, and the city has never once troubled me about it. What I may not do is carry him out of the door. No procession, no bell, nothing poured in the street.',
    'You think that is a small thing. It is a small thing three hundred and sixty days a year. On the Warden’s night it is not a small thing, and I stand in my own court with the door shut and I do it quietly, and my neighbours pretend they cannot hear.',
    'Would I go home? Enebreum taxes a resident foreigner at twice the rate, and there are four guilds I could never join. Every city on this sea has a rule about somebody. At least this one writes its rule down.',
  ]),
  'elod-delegate': Object.freeze([
    'Hesper Nain. I am Elod’s delegate to the Svaleen Conclave, which means I go twice a year, sit through the lighthouse allocations, say “agreed”, and come home.',
    'I do not stay for the rest of it. The rest of it is Solis and Enebreum arguing about wool tariffs from before my grandmother was born, and the Conclave has no binding authority on any of it anyway.',
    'This spring they asked whether Elod would contribute to the Coalition’s fleet. I said Elod maintains its lighthouse. They asked again. I said Elod maintains its lighthouse. Delegates from three cities laughed, and one of them wrote it down.',
  ]),
  'elod-hostel-keeper': Object.freeze([
    'Iseth Rimon. Eleven beds, a chest with a key for each, bread at dawn, and the yard is yours. Nobody comes into the yard.',
    'The rule is on the door frame in three languages. Keep your household as you keep it, indoors. Above the Sea Gate, nothing at all. I have never had to say it twice to anyone who could read.',
    'Sailors, factors, a physician from Nylon who wanted to see the Threshold and could not, and since the spring three families off the Solis road who had nowhere else. They are still here. So are the beds they are in.',
  ]),
  'elod-refugee': Object.freeze([
    'Wenna Sarn. From Solis — the lower terraces, by the oil market, which is not there any more.',
    'They took us in at the quay. Water, bread, a bed, a name written in a book, and no questions worth the word. I will not pretend that was nothing. It was more than the Confederation managed.',
    'And we do not go up past the gate. Not to the school, not to the square, not to the thing on the rock. I have lived under it for two years and I still could not tell you what it looks like inside.',
    'My daughter asked the keeper why. She said: because you would have to give up everything you came here carrying, and nobody should be asked that for a view.',
  ]),
  'elod-exile': Object.freeze([
    'Prian. I sold oil in Solis for forty years. I had a house with a yellow door and a contract with the Bronze Mare and a boy who kept my ledgers.',
    'The Blood Prince came through the wall on a Thursday. He was supposed to be relieving the siege — he was on the same side as half the men he killed. He burned the quarter my house was in and then he went north and burned a holy city as well, in Isareos, with the prince he came to save in it.',
    'And these people sit on their rock and say it is not their war. It was not Solis’s war either, and I have the ash in my clothes still.',
    'No — that is unfair and I know it. They fed me. They feed me now. But you cannot burn a city with neutrality and you cannot put one out with it either.',
  ]),
  'elod-salter': Object.freeze([
    'Mahel Corr. Salt, and dried fish in three grades, and the third grade goes to Nyross and I would not eat it.',
    'The eastern boats come in short and late and sometimes not at all. Western fish is fatter. Eastern fish keeps. Every merchant on this coast knows that and half of them pretend not to.',
    'War has been good for the trade and I dislike having said that out loud. Armies eat salt fish. I sell to whoever sends a ship and I ask no questions on the quay, because the harbourmaster asks them all first.',
  ]),
  'elod-gatekeeper': Object.freeze([
    'Zimra Nath, on the Sea Gate. You may go up. Most people may go up.',
    'What may not go up is anything you would swear by, pray to, or ask for a thing. No image carried, no bell, nothing poured on the stones. Below this arch you keep your own household. Above it there is one authority and it is not negotiable.',
    'I say the same words forty times a day and I have never had to say them twice to the same person. That is not because we frighten anybody. It is because it is written down and people can tell when a rule is meant.',
  ]),

  'elod-warden': Object.freeze([
    'Warden Baleth Orun. Stop there, please. This gate is not open to you.',
    'It is not about you. I do not know you. It is not open to the delegate from Zoth, who asked me four times, or to the physician from Nylon, who was courteous about it, or to any of the three hundred people who have asked me in eleven years.',
    'Beyond this wall is ground where nothing is offered to any other power. Not grudgingly — at all. You are carrying something you would swear by. Everyone is. That is not an accusation, it is arithmetic.',
    'Ask me what it would take and I will tell you, and then you will see why nobody does it.',
  ]),
  'elod-warden-guard': Object.freeze([
    'The warden speaks for the gate. I stand at it.',
    'You can see the east wall from the quay, if you want to see it. Most people find that is enough.',
  ]),
  'elod-priest': Object.freeze([
    'Hanun Sered. Yes, I am one of the priests. No, I will not be difficult with you; being difficult with strangers is a habit the young ones grow out of.',
    'You will hear us called intolerant, and the word is doing two jobs at once. We do not deny that your powers exist. Many of them plainly do. We deny that they hold their offices lawfully. That is a different claim and it is the only one we make.',
    'And yes, this city has done harm with that claim. There are households in the old records that were corrected — that is the word the records use — for keeping Thareth beside Balog. I have read those pages. We do not tear them out.',
    'Our own women go to Mithalenna when a birth goes wrong. I know they do. I have said from the step that it is submission to an unauthorised power, and I will say it again on the day, and I have never yet been able to say it to a woman’s face in her own doorway. Make of that what you will; I have not finished making anything of it.',
  ]),
  'elod-theologian': Object.freeze([
    'Zohar Immer, of the reading house. You have the look of somebody who has been told the Elodi worship a man. Sit down; this takes a minute and it is worth the minute.',
    'Balog is said in three senses, and almost every quarrel we have with anybody starts with somebody using one sense and being answered in another.',
    'First: Balog the eternal authority. Not a god among gods. The single sovereign under which everything that has power at all holds that power — knowingly, unknowingly, or in rebellion.',
    'Second: Balog the office. The enthroned office of the Old Kingdom, across the eastern sea, which is that authority exercised in the world. An office, mind. It outlives whoever sits in it.',
    'Third: Balog the bearer. A man. A particular man, who holds the office now, who eats and sleeps and will die, and who is not the first sense and never was.',
    'Outsiders hear all three and conclude we have made a simple thing complicated. We conclude that they are careless with the most important subject there is. Both of us are being a little unfair and only one of us has written it down at length.',
  ]),
  'elod-reader': Object.freeze([
    'Kesseth Vane. I read the eastern hours: before first light, at first light, and at the turn of the afternoon. Mostly I read to four people and a gull.',
    'You have seen the black geese come down this coast in the autumn. Everybody has. Everybody on this sea says they come from somewhere north and leaves it there.',
    'We hold that certain birds go between here and the part of the world that waits — east over the water, and east again beyond the Ice Spear. Whether that is a country or a condition our clergy have declined, for four hundred years, to say. I think they are enjoying themselves.',
    'What is out there? Three arms of land joined at the middle, and at the join, the Old Kingdom. We are the only people on this continent who will tell you that, and we are told in return that we are making it up. Fine. The birds go somewhere.',
  ]),

  'elod-scribe-master': Object.freeze([
    'Arun Kessel. Forty boys, nine girls, four years, and at the end of it a hand that a court in Nylon will accept without arguing.',
    'Why is an Elodi scribe worth more? Because we will not take a contract we intend to break and we will not write a false measure, and every counting-house from here to the Lizeem has worked that out. It is our vice made into a trade.',
    'Half of them leave. They go to Nyross and Selemis and Minora and they do well and they live carefully, because an Elodi abroad is a reliable clerk in a good year and a problem in a bad one. Shrines of ours have been broken in Solis, in Nylon, in Aevis, in Minora. I teach them the hand. Their mothers teach them the rest.',
  ]),
  'elod-scribe': Object.freeze([
    'Sela Imri, fourth year. Two more and then a berth, if the master signs for me.',
    'I want Nylon. They argue about everything there, out loud, with rules for it, and nobody is expected to agree at the end. Imagine it.',
    'My mother says I will last a season and come home. My mother has never been further than the North Light.',
  ]),
  'elod-grain-keeper': Object.freeze([
    'Immer Vash. The store is mine to keep and its contents are counted out loud, twice a year, in front of anybody who cares to stand and listen.',
    'Everybody in this city talks about neutrality as though it were a belief. It is a quantity. It is eleven months of bread if nothing comes in, nine if we take in more people off the Solis road, and about five if somebody sits down in front of us with an army.',
    'I have said that number to the elders three times. They thank me for the report each time. Nobody asks me the next question, which is what we do in the sixth month.',
  ]),
  'elod-cistern-keeper': Object.freeze([
    'Barod Nath. Cisterns. There is no river on this rock and no spring worth the name, so everything you have drunk since you came up the steps fell on a roof.',
    'Every kerb in this city is cut to carry water to a lid. That is not piety, it is arithmetic, but I will tell you that the two get confused here more than anywhere I have been.',
    'The harbour cistern is open to foreigners and nobody has to ask. That was argued about for a year, forty years ago. The argument that won was that thirst is not a god.',
  ]),
  'elod-young-man': Object.freeze([
    'Joram. Yes, the grain keeper’s son, and no, I have not heard the number, I have heard it four hundred times.',
    'My father counts bread. I count what is coming. Solis burned in 977 and its people are sleeping in our hostel. A man who worships a god that eats people took a holy city apart this spring and killed the prince he came to rescue. And we shut a gate.',
    'They call it piety upstairs. I have stood in the reading house and listened to it called piety. It is not piety, it is a hope that we are too small and too far and too poor to be worth the march.',
    'And if I am wrong I will be glad to be wrong. I would rather be a coward who was wrong than a corpse who was right — that is my father’s line, and I hate it, and I use it.',
  ]),
  'elod-dyer': Object.freeze([
    'Tirzah Vane. Whelk purple. Mind the wind; you will smell the yard before you see it and taste it for a day after.',
    'One thousand shells to the thimble. Solis used to buy every drop and put it on magistrates. Now Solis buys nothing and I sell to Zoth, who put it on cushions.',
    'You are going to ask about the war. Ask me something else.',
    '…My third was breech. Two days. The priest will tell you there is one authority and he is not wrong, and at the end of the second day a woman came in with water and said a name over a bowl and my daughter is nine. I do not say that where Hanun can hear it. He knows. He has known for nine years. We are all very careful with one another about it.',
  ]),

  // --- Outside the city.
  'suval-frontier-serjeant': Object.freeze([
    'Serjeant Iseth Kel. You have come at that gate from the wrong side, which means somebody let you, which means it is not my business.',
    'The order is one page and I read it every morning: the frontier is closed; no crossing in either direction; no letter answered here; no shot fired unless they come over the ditch. Three years, and that last line has never been near being needed.',
    'It is the only border an army could march up to. The sea guards the east of us, the hills the south. So everything Elod has to spend on being left alone is spent on this ditch.',
    'My men are sick of it. Sick of it is what I am for. A bored guard on a shut gate is what the whole arrangement costs, and it is cheaper than the other thing by an amount I cannot count.',
  ]),
  'suval-beacon-watch': Object.freeze([
    'Neth Aran, on the beacon. Lit twice since it was built: once for a grass fire and once by a fool.',
    'If it goes up, the light on the north point answers it, and the city knows before a rider could be saddled. That is the whole of Elod’s army: a pile of dry wood and somebody who is not asleep.',
  ]),
  'suval-lightkeeper': Object.freeze([
    'Hosan Reel, and this is the North Light. Whitewashed to the sill, swept at noon, wick trimmed at dusk, oil counted on the first of the month.',
    'The Confederation allots the coast between the cities and this stretch is ours. We do not go to their Conclave, we do not vote on their allocations, and we have never let this light go out. They find that irritating. I find it correct.',
    'Do not tell me it is a debt to Solis. It is a debt to whoever is out there in the dark, which is a different creditor entirely and one I can look at.',
  ]),
  'suval-fisher': Object.freeze([
    'Yael Corr. Sorrow Beach, seven roofs, and before you ask: yes, it is called that, and yes, that is the stone the names are cut on.',
    'No quay. Nowhere to put one. You run her up the shingle on your own back and you go out again when the sea lets you, which on this coast is fewer days than you would think.',
    'The city is an hour and a half up the coast and the city is a different country. They have a hundred rules. We have the weather.',
  ]),
  'suval-terrace-farmer': Object.freeze([
    'Ammi Tal. Sevenwalls. Four terraces, one cistern, an olive press older than any wall you can see, and no stream in this valley since before my grandfather.',
    'Everything here is walls. You build them to hold the soil, and the soil is four fingers deep, and if a wall goes the soil is in the next valley by spring. A year’s work is one wall rebuilt and everybody pretending nothing happened.',
    'Elod? I go down twice a year with oil. They are very polite and they count everything and they are frightened, though they would not use that word. Up here we are frightened about the rain, which is at least a thing that arrives.',
  ]),
});

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------
/**
 * What the warden says when the traveler asks what it would cost to be let in.
 * The terms are `ELOD_ADMISSION` in east-suval.js; this is the warden saying
 * them. There is no way to meet them yet and the warden says that too, in the
 * only way a warden would: by pointing out who would have to stand up.
 */
const ADMISSION_LINES = Object.freeze([
  'Three things, and the first two are the easy ones.',
  'Nothing carried through that you would swear by, pray to, or ask a thing of. Not a charm, not a token, not a coin with a face on it that you have ever once touched for luck.',
  'An Elodi householder who will stand in front of Hanun and answer for you. By name. Yours and theirs.',
  'And you stand where I put you and nowhere else, and you do not go up onto the platform, because nobody goes up onto the platform.',
  'The second one is the wall. It is not a formality — whoever speaks for you carries it afterwards if you turn out badly. In eleven years I have seen it done twice, both times for physicians, both times by the same family, and the second time it cost them.',
]);

export function elodConversation(npc, context) {
  if (!isOurs.has(npc?.id)) return false;
  const { openDialogue, closeDialogue } = context;
  const lines = EAST_SUVAL_AMBIENT[npc.id];
  if (!lines) return false;
  const back = { id: 'leave-elod-talk', label: 'Leave it there.', action: closeDialogue };
  if (npc.id === 'elod-warden') {
    openDialogue(npc, [...lines], null, 'Back to the square', {
      choices: [
        { id: 'elod-ask-admission', label: 'What would it take?',
          action: () => openDialogue(npc, [...ADMISSION_LINES], null, 'Back to the square', { choices: [back] }) },
        back,
      ],
    });
    return true;
  }
  const exit = npc.id.startsWith('suval-') ? 'Back to the road'
    : ELOD_STANDS[npc.id]?.x > -20 ? 'Back to the quay' : 'Back to the street';
  openDialogue(npc, [...lines], null, exit, { choices: [back] });
  return true;
}
