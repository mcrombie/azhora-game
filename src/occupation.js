/**
 * Who stands where once places change hands. The campaign keeps the political
 * map (`campaign.mapControl()`: region -> 'empire' | 'coalition' | ...); this
 * module turns it into who is out on the ground. A person or a prop that belongs
 * to a garrison carries a stake:
 *
 *   { holds: 'empire' | 'coalition', region: 'Moros Plain' }
 *
 * and is out only while that faction holds that region. Anything without a
 * stake (townsfolk, the traveler's own company, quest people placed by a
 * chapter) is never touched. Pure: no DOM, no three.
 */
export const HOLDERS = Object.freeze(['empire', 'coalition']);

/**
 * A place falls when its fight is won, not when the paperwork is done: the
 * chapter after the border battle hands over the army's outpost, or Solis, as
 * soon as the traveler's corner of it is cleared, a little before the campaign
 * records the chapter as complete.
 */
const FALLS = Object.freeze({
  'moros-outpost': Object.freeze({ region: 'Moros Plain', to: 'coalition' }),
  // While the Gate of Sun Horses is being fought for, its watch is the men the traveler is fighting:
  // neither garrison stands about the town until it has fallen.
  'solis-sweep': Object.freeze({ region: 'West Suval', to: 'empire', contested: true }),
});

/** The control map the ground should show: the campaign's, plus any place that has just fallen or is being fought for. */
export function occupationControl(mapControl = {}, aftermath = null) {
  const fall = FALLS[aftermath?.variant] ?? null;
  if (fall && aftermath.cleared) return { ...mapControl, [fall.region]: fall.to };
  if (fall?.contested && aftermath.fighting) return { ...mapControl, [fall.region]: 'contested' };
  return { ...mapControl };
}

export const hasStake = entry => !!entry && HOLDERS.includes(entry.holds) && typeof entry.region === 'string' && entry.region.length > 0;

/** Whether a staked person or prop is out under this control map. The unstaked are always out. */
export function isOut(entry, control = {}) {
  return hasStake(entry) ? control[entry.region] === entry.holds : true;
}

/** The army's posts inside its outpost on the Moros Plain leave with the army. */
export function legionPostStake(id) {
  return typeof id === 'string' && id.startsWith('post-camp-') ? OUTPOST_STAKE : null;
}
const OUTPOST_STAKE = Object.freeze({ holds: 'empire', region: 'Moros Plain' });

/** The stake that governs an NPC record: its own, or the one its id implies. */
export const stakeOf = npc => (hasStake(npc) ? npc : legionPostStake(npc?.id));
