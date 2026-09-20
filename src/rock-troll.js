/**
 * Rock trolls: what is known, and where they will be when there is anywhere to put them.
 *
 * A troll is three and a half times a person and the colour of the ground it stands on,
 * which is the whole of its defence and most of its reputation: at fifty paces on a scree
 * slope there is nothing there, and at ten paces there is. They are not a people. They have
 * no names, they hold no conversations, they keep no tolls and they are not spoken to — the
 * ogre at the Amod pass stones is a different creature altogether (src/amod-ogre.js) and
 * would be insulted by the comparison, at length.
 *
 * They belong to the high country: the Lotharn Mountains first of all, and the other ranges
 * as those regions are built. None of them exist in the game yet, so no troll is placed
 * anywhere. The model is finished and waiting (`createRockTroll` in src/characters.js).
 *
 * What the road knows about them, which is not much and is mostly wrong, is written down
 * here so that whoever builds the mountains has something to build against rather than a
 * blank page. Pure: no DOM, no three, no behaviour — this is a page of notes with an export
 * on it, deliberately.
 */
const freeze = Object.freeze;

export const ROCK_TROLL = freeze({
  id: 'rock-troll', name: 'Rock troll',
  /** Never given a name, in the game or by anybody in it. */
  named: false, talks: false,
  scale: 3.55,
  /** The ranges they are meant for. None are built; each is a place to put them when it is. */
  ranges: freeze(['Lotharn Mountains']),
  look: 'Three and a half times a person, grey-green and lichened, with a back that reads as a boulder until it moves. Shoulders wider than its trunk is tall, arms past its knees, short bowed legs, and a head set low and forward off no neck at all.',
});

/** What is said about them on the roads below, in roughly descending order of reliability. */
export const TROLL_LORE = freeze([
  'They do not come down. Nobody in a valley has been taken by one; everybody in a valley knows somebody who was.',
  'They are the colour of whatever they are standing on and they do not move while they are being looked at, which is why every account of one begins with the word suddenly.',
  'They carry a beam or a bar or a piece of somebody’s gate, and they did not make it and did not take it off anybody: they found it. Trolls find things.',
  'A road that has been trolled is not robbed. The carts are still there and the goods are still on them.',
  'Drovers going over a pass sing, the whole way, badly and continuously. Ask one why and they will tell you it keeps the weather off.',
]);

/** Notes for whoever builds the mountains, so the kind arrives with a shape already. */
export const TROLL_NOTES = freeze([
  'They are the only thing in Azhora that is straightforwardly bigger than the traveler and does not negotiate. Everything else that is dangerous — the ogre, the goblins, the war — can be talked to, paid, joined or walked away from.',
  'Keep them mute. The moment one has a line of dialogue it becomes a person, and the kind stops working.',
  'One to a valley, at most. Two trolls in sight of each other is a monster closet.',
  'The model is `createRockTroll` (src/characters.js), built at 3.55 and meant to be read against a mountain, not a road.',
]);
