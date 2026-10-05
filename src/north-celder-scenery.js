import { finishBuild } from './build-steps.js';
import { NORTH_CELDER } from './north-celder-world.js';
import { createCelderScenerySteps } from './south-celder-scenery.js';

/**
 * North Celder's scenery: the northern half of the one Celder plain, drawn by the same builder as the south
 * (`src/south-celder-scenery.js`, where the account of it is) from its own seeded stream. This half has the
 * water - the Mithala border streams down its eastern side - and so the terraces, the gravel and the only
 * willow and alder in either country.
 */
export function createNorthCelderScenery(...args) { return finishBuild(createNorthCelderScenerySteps(...args)); }
export function* createNorthCelderScenerySteps({ parent, heightAt, renderedGroundHeight = heightAt, candidateHeightAt = heightAt, colliders }) {
  return yield* createCelderScenerySteps(NORTH_CELDER, { parent, heightAt, renderedGroundHeight, candidateHeightAt, colliders });
}
