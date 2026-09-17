/**
 * The Ambroni Legion's posts along the road: the soldiers a hired sword sees
 * all the way from Tidehaven's landing to the muster on the Moros Plain. They
 * stand where the road is watched, and each has a word for a mercenary. With
 * the picket sergeant at the Lauvel they make twelve Empire soldiers.
 */
import { toWorld } from './world-scale.js';

// Stands are written in the authored 56 m frame and converted here; each post
// belongs to the gate, clearing or camp it watches, and moves with it.
const post = (id, name, rank, x, z, yaw, lines) => Object.freeze({
  id: `post-${id}`, name, rank, role: rank === 'officer' ? 'Legate of the Moros muster' : 'Ambroni Legion soldier',
  modelRole: rank === 'officer' ? 'legion-officer' : 'legion-soldier', ...toWorld(x, z), yaw, lines: Object.freeze(lines),
});

export const LEGION_POSTS = Object.freeze([
  post('landing', 'Legionary Ottar', 'legionary', -3, 34, Math.PI / 2, [
    'Hired sword? The quartermaster signs you in at the Avrel clearing, west along the road past the woods. Keep to it.',
    'The bell means goblins. It has rung twice this week, and the second time we lost a cart.',
  ]),
  post('caloss-gate-north', 'Legionary Bram', 'legionary', -174, 24.4, Math.PI / 2, [
    'This is the Caloss Gate. Past it the forest thins and the fields begin. Tidehaven ends here as far as the Legion is concerned.',
    'The bridge is most of a day on foot. A local keeps it. He is not one of ours, but the bridge stands, so nobody complains.',
  ]),
  post('caloss-gate-south', 'Legionary Dusk', 'legionary', -172.2, 32.2, Math.PI / 2, [
    'Move along, mercenary. The gate is not a place to stand and think.',
    'If you see the raiders in the fields, that is your induction. The quartermaster will tell you the same with more words.',
  ]),
  post('avrel', 'Legionary Renn', 'legionary', -226, 14, -Math.PI / 2, [
    'The quartermaster is at his post. Speak to him before you touch a cart or a parcel; he counts everything twice.',
    'Two raiders were seen among the field walls this morning. Corvan will want them dealt with before the carts move.',
  ]),
  post('caloss-bank', 'Legionary Hesk', 'legionary', -330, 90, Math.PI / 2, [
    'Drent ends at this bank. Luscia is the far side, and Luscia did not ask for us.',
    'The bridge takes wagons; it will take you. Do not leave the road on the other side after dark. Wolves, and worse.',
  ]),
  post('moros-gate-north', 'Legionary Vell', 'legionary', -429.9, 257.2, Math.PI / 2, [
    'The Moros Plain. The camp is west along the road; you will see the standard before you see the palisade.',
    'Say your name at the camp gate and who signed you. Twelve hired swords are expected. Nobody has counted twelve yet.',
  ]),
  post('moros-gate-south', 'Legionary Tarn', 'legionary', -424.1, 261.6, Math.PI / 2, [
    'Open country from here. Nothing to hide behind, for you or for them.',
    'The stockade to the south-east is ours today. Ask me tomorrow.',
  ]),
  post('camp-gate-north', 'Legionary Coss', 'legionary', -525.9, 327.3, Math.PI / 2, [
    'Halt. Name and contract.',
    'Mercenaries muster on the near side of the camp, by the horse line. The Legate sees hired men at dusk.',
  ]),
  post('camp-gate-south', 'Legionary Abe', 'legionary', -521.9, 333, Math.PI / 2, [
    'No fires outside the palisade and no wandering after the horn. That is the whole rule book.',
    'You are earlier than most. The ones who arrive last get the wet ground.',
  ]),
  post('camp-stores', 'Quartermaster Halde', 'legionary', -558, 341, Math.PI / 2, [
    'Stores are counted. Whatever you carry in, you carry out, and I write both down.',
    'There is a bench by the smithy tent for iron that wants mending. Do not bring me a broken blade and call it a complaint.',
  ]),
  post('camp-legate', 'Legate Marcus Verro', 'officer', -543.2, 361.1, Math.PI, [
    'Twelve hired swords, the Empire promised me. You are one. The others will come, or they will not be paid.',
    'The Coalition holds Solis in West Suval, and they are gathering. When the muster is full we go to the border. Until then, rest, stay sober, and stay inside the palisade.',
  ]),
]);

export const LEGION_POST_IDS = Object.freeze(new Set(LEGION_POSTS.map(entry => entry.id)));

export function legionPostLines(id) {
  const entry = LEGION_POSTS.find(item => item.id === id);
  return entry ? [...entry.lines] : [];
}
