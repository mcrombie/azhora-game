import { finishBuild } from './build-steps.js';
import { NORTH_IBENAL, createIbenalScenerySteps } from './south-ibenal-scenery.js';

/**
 * North Ibenal's scenery: the cold northern half of the one Ibenale corridor, drawn by the same builder as the south
 * (`src/south-ibenal-scenery.js`, where the account of it is) from its own seeded stream. This half is the Csc one:
 * its grass is short and grey-green, its shore and its knuckles go to heath and crowberry, its woods are birch and
 * hazel, the North Ibenwood's fir, birch and red cedar stand at its tree line, and its one hill runs up under the South
 * Oremindi's wooded foot.
 */
export function createNorthIbenalScenery(...args) { return finishBuild(createNorthIbenalScenerySteps(...args)); }
export function* createNorthIbenalScenerySteps({ parent, heightAt, renderedGroundHeight = heightAt, colliders }) {
  return yield* createIbenalScenerySteps(NORTH_IBENAL, { parent, heightAt, renderedGroundHeight, colliders });
}
