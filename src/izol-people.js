/**
 * The people of Izolveth, of Ardveth and of the Coalition's camp above the town.
 *
 * Ambient conversation only: nobody here moves a quest yet. The register is the
 * one `docs/content-pass.md` sets — the Izoli speak plainly, dryly, and about
 * money and oaths in the same breath, because on this island those are the same
 * subject. Nobody lectures and nobody makes a speech, except the Speaker, who is
 * refusing to make one.
 *
 * Three things are being said here at once, and every person says at most one of
 * them:
 *
 *  - **There is no capital.** The traveler arrives at the Coalition's seat and
 *    finds the biggest town on an island that has deliberately never had a head.
 *    The Assembly meets twice a year at a rock in a field.
 *  - **The oath is the machinery.** A confederation with no army raised three of
 *    them in two years out of town contingents and highland levies sworn at the
 *    Hearthstone, and hulls hired from Selemis before 978 and taken from her
 *    after. That is why the oath matters and why nothing else had to.
 *  - **The generals frighten them.** Three men with armies abroad are the first
 *    thing in the island's history that could enforce something. The fear is
 *    religious before it is political: a general who breaks an oath sworn at the
 *    Hearthstone steps outside the bond that holds, and the bond that holds is
 *    the whole of what Izol is.
 *
 * Soldiers are men by default; there is no army on this island and nobody wears
 * its armour. No render or DOM dependencies; the host supplies the dialogue box.
 */
import { IZOL_STANDS, IZOL_GENERALS, generalsStance } from './izol-world.js';

const freeze = Object.freeze;
const person = (id, name, role, modelRole, color, extra = {}) =>
  freeze({ id, name, role, modelRole, color, yaw: IZOL_STANDS[id].yaw, ...extra });
const soldier = (id, name, role, color = 0x4d6f9a, extra = {}) =>
  freeze({ id, name, role, modelRole: 'suvali-guard', color, yaw: IZOL_STANDS[id].yaw, armed: true, ...extra });

/** The general whose partisan a person is, where they have one. Used by the tests and by the report. */
export const PARTISANS = freeze({
  'izol-quartermaster': 'kellveth',
  'izol-doreth-agent': 'doreth',
  'izol-marech-serjeant': 'marech',
  'izol-highland-representative': 'marech',
  'izol-general-kellveth': 'kellveth',
});

export const IZOL_NPCS = freeze([
  // The confederation, on the oath ground.
  person('izol-speaker', 'Andreth Vos', 'Speaker of the Izolveth meeting', 'relay-clerk', 0x5b6a72),
  person('izol-clerk', 'Hanna Orwe', 'Clerk to the meeting', 'rise-custodian', 0x6a6b5c),
  person('izol-solne-representative', 'Rell Anvath', 'Representative of Solne', 'bridge-keeper', 0x4f6a63),
  person('izol-highland-representative', 'Tovan Serre', 'Of the highland tribes', 'forest-woodcutter', 0x6d5b44),
  person('izol-keeper', 'Keeper Ysel', 'Keeper of the Stone', 'rise-custodian', 0x59605f),
  // Out only when Solis has been lost and the general has come home (src/izol-host.js).
  soldier('izol-general-kellveth', 'General Orsen Kellveth', 'General of the Izoli Republic', 0x3f6fb0, { hidden: true }),
  // The harbour.
  person('izol-harbourmaster', 'Ovan Kell', 'Harbourmaster of Izolveth', 'harbormaster', 0x4b6e79),
  person('izol-quay-runner', 'Duro', 'Quay runner', 'reed-worker', 0x7d7350),
  person('izol-netmaker', 'Bessa Tarn', 'Net maker and rope layer', 'reed-worker', 0x5e6a58),
  person('izol-fishwife', 'Wenna Il', 'Of the fish market', 'shelter-keeper', 0x76624f),
  person('izol-sail-mistress', 'Sabeth Lune', 'Sail loft mistress', 'rise-custodian', 0x60625a),
  person('izol-master-gannet', 'Corrin Ames', 'Master of the Gannet', 'bridge-keeper', 0x4a5f68),
  person('izol-master-serrow', 'Dols Brack', 'Master of the Serrow', 'commons-miller', 0x6b6047),
  // The outsiders who live here.
  person('izol-svaleen-merchant', 'Marek Sund', 'Svaleen merchant', 'commons-miller', 0x7a6b52),
  person('izol-selemi-factor', 'Iselle Draun', 'Factor of the Selemi outpost', 'shelter-keeper', 0x3f6f6b),
  // The three generals' men, on the strand within thirty metres of each other.
  soldier('izol-quartermaster', 'Tulle Barr', 'Quartermaster of General Kellveth’s commissary', 0x3f6fb0, { armed: false }),
  soldier('izol-doreth-agent', 'Lieutenant Drevan Sill', 'Recruiting for General Doreth, on Selemis', 0x2f7f7a, { armed: false }),
  soldier('izol-marech-serjeant', 'Serjeant Ruvan Tale', 'Levy serjeant for General Marech, before Nylon', 0x6b5540),
  // The army above the town.
  person('izol-surgeon', 'Surgeon Neve Arral', 'Surgeon of the sail loft', 'shelter-keeper', 0x7b5f55),
  soldier('izol-captain-izoli', 'Captain Halan Reth', 'Captain of Izoli spearmen', 0x3f6fb0),
  soldier('izol-serjeant-suval', 'Serjeant Dovan Kesk', 'Of the Suvali companies', 0x6a7f3e),
  soldier('izol-rebel-officer', 'Aurel Mant', 'Of the Ambroni rebels', 0x7d3f58),
  soldier('izol-marosh-spearman', 'Pell Antor', 'Marosh spearman', 0xb0773a),
  // Down the coast.
  person('izol-ardveth-elder', 'Ora Veth', 'Of Ardveth', 'shelter-keeper', 0x5f6a5c),
  person('izol-boatwright', 'Old Fer', 'Boatwright at Kelvath Cove', 'forest-woodcutter', 0x6a5f4a),
]);
export const IZOL_NPC_IDS = freeze(IZOL_NPCS.map(npc => npc.id));
/** The one person whose presence Chapter 2's outcome decides. */
export const CONDITIONAL_NPC_IDS = freeze(['izol-general-kellveth']);

export const IZOL_AMBIENT = freeze({
  'izol-speaker': freeze([
    'Andreth Vos. I keep the order of business for this town’s meeting, which is the whole of what I am. You were expecting somebody grander.',
    'There is no capital of Izol. I know what they tell you on the mainland. No seat, no crown, no chancery, and no town that speaks for the rest. Twice a year the towns and the tribes meet at the Hearthstone, which is a flat rock in the middle of the island with no roof on it, and what is agreed there binds. That is the Republic. The rest is Izolveth being the largest harbour, and being the largest harbour is not the same as being the head of anything.',
    'The war came here because the ships come here. Nobody voted for it and nobody had to: the levy was sworn at the Hearthstone before any of this, in her name, and an oath sworn there is not a thing you take back at a town meeting.',
  ]),
  'izol-clerk': freeze([
    'Hanna Orwe. I keep the tally of which towns have sent a representative and which have not, and this year that tally is the most-read document on the island.',
    'Nine have sent. Four have not. Two of the four say they will send when they see which general the other two are sending for, which is not a reason. It is a wait.',
    'No, you may not see the roll. You may ask any representative what they think, and you will get three answers out of two of them.',
  ]),
  'izol-solne-representative': freeze([
    'Rell Anvath, out of Solne on the south coast. I fish out of my mother’s brother’s boat and I speak for the boat-lineages, which is thirty families and four hundred years of them.',
    'Solne is the furthest point on this island from the Svaleen and we have got along beautifully on that. Then three of our own put armies in the water, and now the whole sea knows exactly where we are.',
    'I will say this for the Empire: it never asked us for anything, because it never got near enough to ask. Our own men ask.',
  ]),
  'izol-highland-representative': freeze([
    'Tovan Serre. I came down off the shoulder of the near Presence and I will go back up it. While I am down here I speak for grazing and for the shrine ways.',
    'Marech is ours. Highland-born, shrine-kept, the best army of the three, and I am supposed to be proud. I have a nephew in his lines before Nylon. I am not proud. I am counting days.',
    'The towns count barrels. We count what was promised. The confederation has always needed both, and just now the counting of barrels has three armies standing behind it.',
  ]),
  'izol-keeper': freeze([
    'Ysel. I keep the ring swept and I keep people from leaning on the stone. That is not a priesthood. There is no priesthood. I am a woman with a broom and an opinion.',
    'The stone is not a picture of her and it is not her house. It is her. The cutting for the town found it and the town went round it. You will hear that said flatly here, by people who are not being poetic.',
    'Her domain is the bond that holds. Not love, not blood — what keeps rock from becoming sand and a promise from becoming words. That is why an oath at the Hearthstone binds. It is also why this island is holding its breath. Three men with armies have each sworn one, and on the day one of them steps outside it he steps outside her, and then we will all find out what we are without her.',
  ]),
  'izol-general-kellveth': freeze([
    'Orsen Kellveth. I had a city until the spring. Now I have a house in the town I was born in, and a great deal of time.',
    'I am not going to tell you the battle was lost by anybody but me. That is what the other two would do, and it is why I will beat them.',
    'There are three of us. Doreth cannot leave his island and Marech cannot leave his siege, and I am the only one of the three standing on Izol. Consider what that means. Then consider that every person you have spoken to today has already considered it, and is frightened.',
  ]),
  'izol-harbourmaster': freeze([
    'Ovan Kell. The harbour is mine to order and the sea is nobody’s, and my whole working life happens between those two facts.',
    'Five hulls at the quay, four flags on them, and none of the four agrees with the other three about anything except the tide. The boom goes across at dark. It went across at dark before any of this, and it will after.',
    'The mouth is twenty-six metres. A Svaleen master once told me that was mean. I told him the sea is meaner. He has come back eleven times since.',
  ]),
  'izol-quay-runner': freeze([
    'Duro. I run the tallies from the crane up to the shed and back, and I am paid in copper now instead of fish, because the soldiers eat the fish.',
    'There are three men down the strand who will put your name on a board. One for Solis, one for Selemis, one for the lines at Nylon. My brother went to the middle one and my mother has not spoken to him since, and he is only up the hill.',
    'You have not seen a general, have you. I have. He is not very tall.',
  ]),
  'izol-netmaker': freeze([
    'Bessa Tarn. Nets, warps, cable. That walk behind you is the longest roof on the island and there is not one fathom of my own work under it.',
    'Everything laid on it since spring is cable for the fleet, bought before it is laid and paid in paper drawn on a general. My father laid nets under that roof for forty years. I lay tow for a siege I will never see.',
    'They pay, mind. I want that said. Slowly, and in the right coin at the end, because they swore they would. That is the one thing you can still rely on from an Izoli, even one with an army.',
  ]),
  'izol-fishwife': freeze([
    'Wenna Il. Whatever came in this morning, and it is dearer than it was, and no, that is not me doing it.',
    'Four thousand mouths went up that hill in the spring and the sea did not get any bigger. Work it out.',
    'I sell to the camp because the camp pays. I would rather sell to the town. You may hold both of those in your head at once; everybody here does.',
  ]),
  'izol-sail-mistress': freeze([
    'Sabeth Lune. That was my loft. Upper floor, one long room, light on three sides — the best room on this island for cutting a sail, and it turns out the same things make a good hospital.',
    'I did not give it. I was told. The paper said requisition, the officer who brought it said he was sorry, and now I have the paper and he has the loft.',
    'There are men up there who came back from Nylon with the walls still in them. I carry the water up, because they are my stairs and I know which board is loose.',
  ]),
  'izol-master-gannet': freeze([
    'Corrin Ames, and that is the Gannet, and before you ask: yes, she will cross in that.',
    'In seventy-eight I was carrying grain. In seventy-nine I was carrying spearmen into a harbour I had traded in for twenty years, and I watched the boom go down at Selemis from the deck of my own boat. You do not get over a thing like that. You take another cargo.',
    'Doreth’s man wants her for the Selemis run. He can want. I swore one charter at the Stone and I am in no hurry to swear a second.',
  ]),
  'izol-master-serrow': freeze([
    'Dols Brack. Serrow, out of Solne. Chartered until the war ends, which is a length of time no man would agree to twice.',
    'I swore it at the Stone, in her name. So I will sail it out, and I will not be cheerful about it, and on this island those two things do not argue with each other.',
    'If you want to know what the Republic is, it is this: I cannot get out of a bad bargain because of a rock, and I would not care to live anywhere that let me.',
  ]),
  'izol-svaleen-merchant': freeze([
    'Marek Sund, of the Svaleen Confederation. This house has been my family’s for three generations, which makes me a foreigner here, but only just.',
    'We offered them membership twice. Twice they replied, with perfect courtesy, that they were already in a confederation and did not require another. At the time I thought that was quaint.',
    'Now they hold Selemis, and they have three armies, and the courtesy has not altered by a single word. That is what unsettles the Conclave at home. Not the fleet. The courtesy.',
  ]),
  'izol-selemi-factor': freeze([
    'Iselle Draun. Factor. This outpost has operated on the same terms for forty-one years: four staff, no warehousing, and questions I may put in writing.',
    'You will want to know how a Selemi factor stands here now. I stand behind that gate. My city is occupied by the republic my city is allied to. Both of those are true, and the terms of this outpost say nothing whatever about either, which is the only reason it is still open.',
    'General Doreth holds the crescent harbour and cannot step out of it. Every outpost in the network knows that. We are not obstructing anybody. We are being extremely polite.',
  ]),
  'izol-quartermaster': freeze([
    'Tulle Barr. Commissary. General Kellveth’s, before you ask, and yes, it matters which.',
    'Everything on that board goes east: Solis, the border, the road on to the Moros. If you have carried arms and you would rather be paid than not, the board is there and my hand is steady.',
    'Three boards on one strand, thirty paces apart. We are civil to each other. We are extremely careful to be civil to each other.',
  ]),
  'izol-doreth-agent': freeze([
    'Drevan Sill. Hulls and hands for Selemis. I want masters more than spearmen and I will take either.',
    'The general holds the finest harbour in the Iberos Sea and cannot put a foot outside it. The day he sails, it is Selemi again by nightfall. So he does not sail, and he asks for more men every month, and every month there are fewer men to send.',
    'No, I do not know what he intends. I know what he asks for. Those are different things and I am paid for the second.',
  ]),
  'izol-marech-serjeant': freeze([
    'Ruvan Tale. The levy for the lines before Nylon. Highland men mostly. I will not turn a town man away, but I will not pretend he is wanted.',
    'It is the strangest siege in this war. The city would open its gates tomorrow if the garrison would let it. We are besieging a town that is on our side, to get at the men holding it, and the men holding it worship a god that eats people.',
    'The general swore at the Hearthstone like the rest of them. People here say that as though it were a comfort. It is a comfort right up to the first man who finds out what it costs him.',
  ]),
  'izol-surgeon': freeze([
    'Neve Arral. Forty beds in a sail loft, and a woman downstairs who owns it and does not say so, which is the most Izoli arrangement I have ever been part of.',
    'They come back from Nylon by boat and from Selemis by boat, and there is no third place, because Solis has a hospital of its own and it is fuller than mine.',
    'I am from Marosh. I came for the pay. I have stopped mentioning the pay.',
  ]),
  'izol-captain-izoli': freeze([
    'Halan Reth. Izoli spearmen. Town levies mostly, and the first of them had never held a spear until the year before last.',
    'We drill on that flat because there is no other flat. When the wind gets up they can hear us in the town, and the town has opinions about hearing us.',
    'We are for the Moros when the order comes. Which general’s order, you were going to ask. So is everybody.',
  ]),
  'izol-serjeant-suval': freeze([
    'Kesk. Suvali. We came up from Solis by sea and we will go back the same way, and I have never been so tired of a boat.',
    'It is a strange place to be quartered. Nobody shouts at us. Nobody sells to us cheap either. They look at the tents on the hill the way you look at weather.',
    'Their own men frighten them more than we do. I have thought about that a good deal and I do not care for where it goes.',
  ]),
  'izol-rebel-officer': freeze([
    'Aurel Mant. Ambroni. Yes, I know. I was born nine miles from Ambron and I am camped on an island at war with it.',
    'Call it an empire in front of me and I will not argue; I will simply know what you are. There is a king in Ambron now and people like me put him there, and it is still not finished.',
    'The Izoli have been decent to us. They were decent to the Selemi too, right up until they were not. I keep that in mind, and I keep it to myself.',
  ]),
  'izol-marosh-spearman': freeze([
    'Pell Antor. Marosh. Three tents on the far side of the lines and a road home I could not draw you.',
    'There is no dust here. That is the thing I cannot get used to. Everything is wet and grey and growing, and I have started to find it restful, which worries me.',
    'We came because the king said. I do not know what the king wants out of it. I want to see the desert again, and I would like my pay.',
  ]),
  'izol-ardveth-elder': freeze([
    'Ora Veth. This is Ardveth. Six roofs, and we send a representative, and our representative sits at the same bench as Izolveth’s.',
    'You came over the shoulder. Everyone does. There is no road, there is a path, and there has never been a road, because a road would make us a suburb of somewhere.',
    'The soldiers have not come here. They came once, counted us, and went away again. It was the best day we have had in a year.',
  ]),
  'izol-boatwright': freeze([
    'Fer. That is a boat, or it will be. Frames up since the spring and not a plank on her.',
    'It is not the timber. It is the cable. There is no cordage on this island that has not already been bought for a siege, and you cannot rig a boat with a promise.',
    'They will pay for it. They pay for everything eventually, and eventually is a long word when you are eating.',
  ]),
});

/**
 * The lines that change with Chapter 2's outcome. A person with an entry here
 * says their last line differently depending on whether Solis was held or lost —
 * the only branch in this region's content, and the one the lead has to keep
 * wired when Chapter 3 is built.
 */
export const IZOL_ALTERNATES = freeze({
  'izol-speaker': freeze({
    solisHeld: 'Kellveth holds Solis, which is a long way away, and I would rather all three of them were a long way away.',
    kellvethHome: 'General Kellveth came home in the spring with what was left of his command and no city to put it in. He walks up here most days and sits at the back of the hall like a man who used to be in the room. I do not care for it. A general with nothing to do is a general with time to think.',
  }),
  'izol-keeper': freeze({
    solisHeld: 'All three of them are abroad, and there is not one of them within a day of this stone. I sweep better when that is true.',
    kellvethHome: 'The general comes and stands at the gap in the ring some evenings. He does not come in. I have never asked him why, and I am not going to.',
  }),
  'izol-quartermaster': freeze({
    solisHeld: 'The general is in Solis and the line to it is open, which is a sentence I would not have wagered on a year ago.',
    kellvethHome: 'The general is here, in the town. A commissary with no city to victual is a clerk with tidy handwriting, and I have been a clerk with tidy handwriting since the spring.',
  }),
  'izol-harbourmaster': freeze({
    solisHeld: 'Two sailings a week to Solis and the boom up for both of them. Long may it be that dull.',
    kellvethHome: 'Nothing has gone east to Solis since the spring. The berth is still called the Solis berth. Nobody has had the heart to call it anything else.',
  }),
});

/** Every line a person says, with the alternate that Chapter 2's outcome chooses. */
export function izolLines(id, control = {}) {
  const lines = IZOL_AMBIENT[id];
  if (!lines) return null;
  const alternate = IZOL_ALTERNATES[id];
  if (!alternate) return [...lines];
  const stance = generalsStance(control);
  return [...lines, stance.kellvethHome ? alternate.kellvethHome : alternate.solisHeld];
}

/** A plain conversation for one of West Izol's people. Returns false for anybody else. */
export function izolConversation(npc, context) {
  const { openDialogue, closeDialogue, control = {} } = context;
  const lines = izolLines(npc?.id, control);
  if (!lines) return false;
  const camp = ['izol-captain-izoli', 'izol-serjeant-suval', 'izol-rebel-officer', 'izol-marosh-spearman'].includes(npc.id);
  const quay = ['izol-harbourmaster', 'izol-quay-runner', 'izol-master-gannet', 'izol-master-serrow'].includes(npc.id);
  openDialogue(npc, lines, null, camp ? 'Back to the lines' : quay ? 'Back to the quay' : 'Back to the town',
    { choices: [{ id: 'leave-izol-talk', label: camp ? 'Serjeant.' : 'Fair weather to you.', action: closeDialogue }] });
  return true;
}

export { IZOL_GENERALS, generalsStance };
