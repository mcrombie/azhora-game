/**
 * The ostler of Nothom. Iven reserves four army horses in reporting order;
 * this is the man who turns an allocated token into its horse, in the stable yard
 * at the edge of town, and who teaches the traveler to ride it. He will also
 * send a boy to bring the horse back to the yard if it has been left somewhere
 * foolish. Pure: no DOM, no three. The host places him (`LUMBER_TOWN_STABLE`).
 */
import { RIDING_LESSON } from './riding.js';

export const OSTLER_TOKEN = 'horse-token';
export const OSTLER_NPC = Object.freeze({ id: 'lumber-ostler', name: 'Bede Harrow', role: 'Ostler of the Nothom yard', modelRole: 'commons-miller', color: 0x6b5a3c });

/** Whether the journal should send the traveler to the yard: a token in the satchel and no horse yet. */
export const horseWaiting = ({ inventory, riding }) => !riding.owned && !!inventory?.has?.(OSTLER_TOKEN);

export const OSTLER_OBJECTIVE = Object.freeze({
  title: 'What the army owes',
  detail: 'Iven reserved one of the four army remounts in your name. Take his token to Bede Harrow, the ostler, at the stable yard on the edge of Nothom.',
  kicker: 'LUSCIA · THE ARMY’S HORSE',
});

/**
 * Hand the horse over. `hitch` is where it stands in the yard. Atomic: the token
 * is only taken if the horse can be given.
 */
export function redeemHorse({ inventory, riding, hitch, story = null, owner = 'player' }) {
  if (riding.owned) return { ok: false, reason: 'You already have your horse.' };
  if (!inventory?.has?.(OSTLER_TOKEN)) return { ok: false, reason: 'Bede hands out army horses against a clerk’s token, and you have none.' };
  if (story) {
    const reservation = story.snapshot().horses.find(h => h.owner === owner);
    if (!reservation) return { ok: false, reason: 'The four army remounts have already been allocated. A spare token cannot create another horse.' };
    if (reservation.claimed) return { ok: false, reason: 'Your reserved horse has already left this yard. Find that horse; Bede cannot issue it twice.' };
  }
  const granted = riding.grant(hitch, hitch?.yaw ?? 0);
  if (!granted.ok) return granted;
  if (story) story.claimHorse(owner);
  inventory.remove(OSTLER_TOKEN, 1);
  riding.teach();
  return { ok: true, reason: '' };
}

/**
 * The shared stock is finite, including mounts belonging to traveling companions.
 */
export const OSTLER_COMPANY_LINE = 'Four army remounts, and four only. Iven reserves them for the first four people who report. '
  + 'A friend with a reservation can collect a horse here. Everyone else walks, and joining your company does not change the count.';

export function ostlerConversation(npc, context) {
  const { inventory, riding, hitch, playerPosition, openDialogue, closeDialogue, act, company = 0, story = null } = context;
  if (npc.id !== OSTLER_NPC.id) return false;
  const leave = { id: 'leave-ostler', label: 'Another time.', action: closeDialogue };
  if (!riding.owned) {
    if (story && !story.horseFor('player')) {
      openDialogue(npc, [OSTLER_COMPANY_LINE, story.availableHorses() > 0
        ? 'There are still reservations available. Report to Iven on the square first; he keeps the order of arrival.'
        : 'All four are spoken for. I cannot make a fifth appear, but the road remains open on foot.'], null, 'Back to the road');
      return true;
    }
    if (story?.snapshot().horses.some(h => h.owner === 'player' && h.claimed)) {
      openDialogue(npc, ['Your reserved horse has already left this yard. Find him where he was left; a second token does not buy a second issue.'], null, 'Back to the road');
      return true;
    }
    if (!inventory?.has?.(OSTLER_TOKEN)) {
      openDialogue(npc, [
        'Army horses, every one, and every one spoken for. I feed them, I do not own them.',
        'Bring me a relay clerk’s token and one of them is yours the same hour. Iven, on the square, is the man who writes them.',
      ], null, 'Back to the road');
      return true;
    }
    openDialogue(npc, ['Iven’s mark. One of the four is reserved in your name. Take the reins and mind him; this is your horse, not an endless line of replacements.', ...RIDING_LESSON], null, 'Step back',
      { choices: [{ id: 'redeem-horse', label: 'Hand over the token and take the reins', action: () => { closeDialogue(); act('redeem-horse'); } }, leave] });
    return true;
  }
  const far = riding.distanceTo(playerPosition) > 40 && riding.distanceTo(hitch) > 12;
  openDialogue(npc, [far ? 'Walked in, did you? Then he is standing in a field somewhere wondering about you.' : 'He looks well on it. Keep his feet picked out and he will carry you to Ambron and back.',
    ...(company > 0 ? [OSTLER_COMPANY_LINE] : [])], null, 'Back to the road', { choices: [
    { id: 'ostler-lesson', label: 'Tell me again how he goes.', action: () => openDialogue(npc, [...RIDING_LESSON], null, 'Back to the road') },
    ...(far ? [{ id: 'fetch-horse', label: 'Can you have him brought in?', action: () => { closeDialogue(); act('fetch-horse'); } }] : []),
    { ...leave, label: 'Good day to you.' },
  ] });
  return true;
}
