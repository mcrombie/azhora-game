/** A game-owned addition. The upstream World Builder atlas stays read-only. */
export const URUBOND_HEXES = Object.freeze([
  [64,[-1,0,1]], [65,[-2,-1,0,1]], [66,[-3,-2,-1,0,1]],
  [67,[-3,-2,-1,0]], [68,[-3,-2,-1]], [69,[-3,-2]],
].flatMap(([r,qs])=>qs.map(q=>Object.freeze({q,r,terrain:r===65||r===66?'mountain':'hills'}))));
export const isLegendaryRegion = name => name === 'Urubond';
