/**
 * Who answers when the traveler presses F, when more than one could.
 *
 * It used to be whoever stood nearest, and any person at all silenced a place. That was fine
 * while everybody in the world stood still. The company does not: ten hired swords walk the
 * main road on their own clock and pause exactly where the traveler has business, so for a
 * minute and a half Mus stands nearer the traveler than the courier he has come to see, and a
 * man crossing the Caloss bridge takes the prompt off the repair the traveler is standing on.
 *
 * So, in order: the traveler's own business (somebody wearing a mark); then whoever belongs
 * there; then a hired sword, who is only passing. Within a rank, the nearest. And a place that
 * is the traveler's business now gives way to somebody who belongs there, as it always has, but
 * not to a man walking by. Pure: no three, no DOM.
 */
const rank = talker => (talker.marked ? 0 : talker.passing ? 2 : 1);

/**
 * @param talkers [{ npc, d, marked, passing }] everybody within talking distance
 * @returns the one who answers, or null
 */
export function talkTarget(talkers = []) {
  let best = null;
  for (const talker of talkers) {
    if (!talker || !Number.isFinite(talker.d)) continue;
    if (!best || rank(talker) < rank(best) || (rank(talker) === rank(best) && talker.d < best.d)) best = talker;
  }
  return best;
}

/** Whether a place the traveler has business at keeps the prompt from whoever would otherwise answer. */
export const placeKeepsPrompt = (talker, place) => !!place && (!talker || (!!talker.passing && !talker.marked));
