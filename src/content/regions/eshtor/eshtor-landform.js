/** Eshtor's wind-scoured tableland. World +Z is south; the low ribs run east-west.
 * Keep habitat and snow tied to the same relief that the player can traverse. */
export function eshtorLandform(x, z, anchor) {
  const u = x - anchor.x, v = z - anchor.z;
  const folded = v + 14 * Math.sin(u * .004);
  const ribDistance = folded - Math.round(folded / 92) * 92;
  const rib = Math.exp(-((ribDistance / 12) ** 2));
  const grovePatch = .5 + .5 * Math.cos(u * .018 + Math.sin(v * .008));
  const shelter = Math.exp(-(((ribDistance - 25) / 13) ** 2)) * grovePatch;
  const snow = Math.exp(-(((ribDistance + 19) / 10) ** 2)) * (.55 + .45 * grovePatch);
  const table = 139 + 4 * Math.sin(u * .006) + 3 * Math.cos(v * .009);
  return { height: table + 14 * rib - 4 * shelter - 2 * snow, rib, shelter, snow };
}
