/**
 * Lakota, apart from his birds.
 *
 * He used to be two people at once: the man at the head of the pier who handed
 * over the letter, and the birder in the garden who taught you to look. He is
 * neither now. Jojo meets the boat, Perrin keeps the garden, and Lakota is the
 * seventh hired sword to come up the road (`src/mercenaries.js`, arrival 1980) -
 * a man with a quarterstaff, a red-tailed hawk on his glove and no intention of
 * hurrying to a war.
 *
 * That split needs a second piece of state. `birding.met` is "somebody has taught
 * you to look at birds", and that is Perrin's from the first minute. This is the
 * other thing: whether the traveler has got far enough with Lakota that he stops
 * being a hired sword who is plainly not one and starts offering what is his -
 * the hawk, the list of a hundred and six, the digging, the wine, the chocolate,
 * and what is on his mind.
 *
 * Deliberately small. Whatever else Lakota turns out to want remembering goes
 * here rather than into birding's snapshot, which belongs to the garden now.
 * Pure: no DOM, no three.
 */
export const LAKOTA_VERSION = 1;

export function validateLakotaSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== LAKOTA_VERSION) return false;
  return typeof data.met === 'boolean';
}

export function createLakota({ onEvent = () => {} } = {}) {
  let met = false;

  /** The traveler has worked out what he is. Once. */
  function know() {
    if (met) return { ok: true, first: false };
    met = true;
    onEvent({ type: 'lakota-known' });
    return { ok: true, first: true };
  }

  const snapshot = () => ({ version: LAKOTA_VERSION, met });

  function restore(data) {
    met = false;
    if (!validateLakotaSnapshot(data, { allowMissing: false })) return false;
    met = data.met;
    return true;
  }

  return { know, snapshot, restore, get met() { return met; } };
}
