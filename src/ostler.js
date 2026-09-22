/**
 * The ostler of Nothom. Iven pays for the Lauvel with a token for an army
 * horse; this is the man who turns the token into the horse, in the stable yard
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
  detail: 'Iven paid you with a token for an army horse. Take it to Bede Harrow, the ostler, at the stable yard on the edge of Nothom. The roads beyond Luscia are long, and they are meant to be ridden.',
  kicker: 'LUSCIA · THE ARMY’S HORSE',
});

/**
 * Hand the horse over. `hitch` is where it stands in the yard. Atomic: the token
 * is only taken if the horse can be given.
 */
export function redeemHorse({ inventory, riding, hitch }) {
  if (riding.owned) return { ok: false, reason: 'You already have your horse.' };
  if (!inventory?.has?.(OSTLER_TOKEN)) return { ok: false, reason: 'Bede hands out army horses against a clerk’s token, and you have none.' };
  const granted = riding.grant(hitch, hitch?.yaw ?? 0);
  if (!granted.ok) return granted;
  inventory.remove(OSTLER_TOKEN, 1);
  riding.teach();
  return { ok: true, reason: '' };
}

/**
 * What he says about the company's mounts. One line, and it is the rule in his own voice:
 * the army's remounts go out with the army's rider, and he did not think it worth asking
 * about (src/company-horses.js).
 */
export const OSTLER_COMPANY_LINE = 'Your friends are up on army horses out of my back row, and no, I did not ask you. '
  + 'Ten men walking behind one man riding is not a company, it is a joke, and the army does not pay me to be funny.';

export function ostlerConversation(npc, context) {
  const { inventory, riding, hitch, playerPosition, openDialogue, closeDialogue, act, company = 0 } = context;
  if (npc.id !== OSTLER_NPC.id) return false;
  const leave = { id: 'leave-ostler', label: 'Another time.', action: closeDialogue };
  if (!riding.owned) {
    if (!inventory?.has?.(OSTLER_TOKEN)) {
      openDialogue(npc, [
        'Army horses, every one, and every one spoken for. I feed them, I do not own them.',
        'Bring me a relay clerk’s token and one of them is yours the same hour. Iven, on the square, is the man who writes them.',
      ], null, 'Back to the road');
      return true;
    }
    openDialogue(npc, ['Iven’s mark. Then the bay is yours, and the army is one horse poorer, which it will not notice.', ...RIDING_LESSON], null, 'Step back',
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
