/** A small visual contact skirt behind the eastern chamber's original rock collar.
 * The old collar has only a front and back section; the steep cut between them can
 * show sky through its outer edge. This joins that edge to sampled cliff ground.
 * It never supplies collision, a floor, or a different passage opening. */
export function easternChamberTrim(cave, ground) {
  if (cave.id !== 'eastern-chamber') return null;
  const at = cave.portals[0], front = cave.at(at - 1.3), floor = cave.floor(at);
  const half = cave.half(at), height = cave.height(at);
  const arch = [[1, .42], [.9, .7], [.62, .9], [0, 1], [-.62, .9], [-.9, .7], [-1, .42]];
  const positions = [], indices = [];
  let valid = true;
  for (let edge = 0; edge < arch.length - 1; edge++) for (let step = 0; step < 4; step++) {
    add(arch[edge][0] + (arch[edge + 1][0] - arch[edge][0]) * step / 4,
      arch[edge][1] + (arch[edge + 1][1] - arch[edge][1]) * step / 4);
  }
  add(...arch.at(-1));
  // The lateral approach can also graze the right jamb's front plane, before
  // the rear skirt. Give that corner a small rock cheek with its foot embedded
  // in the actual ground. It lies over four metres from the passage centre.
  const cheek = positions.length / 3, shoulder = floor + .42 * (height + 3.4);
  const lip = [[0, 0], [.2, .7], [.45, .65], [.9, .25], [1.5, -.05]];
  for (const [i, [out, lift]] of lip.entries()) {
    const x = front.x + front.nx * (half + 2.2 + out), z = front.z + front.nz * (half + 2.2 + out);
    const groundY = ground(x, z) - .025;
    if (groundY < floor + 2 || groundY >= shoulder + lift) { valid = false; break; }
    positions.push(x, shoulder + lift, z, x, groundY, z);
    if (i) { const n = cheek + i * 2; indices.push(n - 2, n - 1, n, n, n - 1, n + 1); }
  }
  if (valid) {
    const rear = cave.at(at), x = rear.x + rear.nx * (half + 3.7), z = rear.z + rear.nz * (half + 3.7);
    const y = ground(x, z) - .025, back = positions.length / 3, outer = cheek + (lip.length - 1) * 2;
    positions.push(x, y, z, x, y, z);
    indices.push(cheek, outer, 1, outer, back, 1, outer, outer + 1, back);
  }
  function add(a, b) {
    const x = front.x + front.nx * a * (half + 2.2), z = front.z + front.nz * a * (half + 2.2);
    const y = floor + b * (height + 3.4);
    let contact = null;
    // The terrain edge lies behind the collar face, within the collar's existing
    // depth. Seek enough cover for the roof while keeping the side trim above a body.
    for (let along = at; along <= at + 1.01; along += .2) {
      const p = cave.at(along), tx = p.x + p.nx * a * (half + 2.6), tz = p.z + p.nz * a * (half + 2.6);
      const ty = ground(tx, tz) - .025;
      const clearance = Math.abs(a) * (half + 2.6) < half + .35 ? height + .15 : 2.4;
      if (ty >= floor + clearance) { contact = [tx, ty, tz]; break; }
    }
    // An unexpected lower cliff must not create a floating cap or a new low roof.
    if (!contact) { valid = false; return; }
    const n = positions.length / 3;
    positions.push(x, y, z, ...contact);
    if (n) indices.push(n - 2, n - 1, n, n, n - 1, n + 1);
  }
  return valid ? { positions, indices } : null;
}
