/** Live renderer regression: crossing the new forest and approaching its timber. */
export async function runAcorFlightChecks(h) {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const frames = async (n = 3) => {
    const before = h.frames(), started = performance.now();
    for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame);
    // Fast mode holds the game frame while an intervening region loads.
    // Require eventual resumption, not a tick on every browser callback.
    while (h.frames() <= before) {
      check(h.errors().count === 0, JSON.stringify(h.errors()));
      check(performance.now() - started < 120000, 'Live game frames did not resume after loading');
      await new Promise(requestAnimationFrame);
    }
    check(h.errors().count === 0, JSON.stringify(h.errors()));
  };
  const start = h.paths[6].points[0];
  await h.goTo(start);
  h.startFlight();
  // Climb above the canopy, then move the real mount while the normal HUD runs.
  for (let i = 0; i < 40; i++) h.fly({ lift: 1 });
  const visited = [];
  for (const index of [2, 3, 4, 5]) {
    const name = h.names[index];
    const trees = h.world.timberTrees.filter(t => t.species === 'acor' && h.world.regionAt(t.x, t.z).name === name);
    const tree = trees[0];
    check(tree, `No Acor tree in ${name}`);
    let arrived = false;
    for (let i = 0; i < 600; i++) {
      const p = h.flight().position, dx = tree.x - p.x, dz = tree.z - p.z, distance = Math.hypot(dx, dz);
      if (distance < .1) { arrived = true; break; }
      const scale = Math.min(1, distance / 24);
      h.fly({ dx: dx / distance * scale, dz: dz / distance * scale, turbo: true });
      await frames(1);
    }
    check(arrived, `Could not fly into ${name}`);
    await frames();
    check(!h.currentChop(), 'Ground chopping prompt appeared while flying');
    visited.push(name);
    console.log('Acor flight crossed', name);
  }
  // A real ground prompt is essential: disabling airborne prompts alone would hide the bug.
  const trees = h.world.timberTrees.filter(t => t.species === 'acor');
  let ground = null;
  for (const tree of trees) {
    for (let i = 0; i < 8; i++) {
      const r = (tree.radius ?? .5) + 1.2, a = i * Math.PI / 4;
      const p = { x: tree.x + Math.sin(a) * r, z: tree.z + Math.cos(a) * r };
      if (h.canStand(p) && h.world.treeRegistry.nearest(p, 2.7)?.id === tree.id) { ground = p; break; }
    }
    if (ground) break;
  }
  check(ground, 'No accessible Acor trunk');
  await h.goTo(ground);
  await frames(12);
  check(h.currentChop()?.species === 'acor', 'Ground interaction did not select an Acor tree');
  check(h.label().includes('Acor'), `Missing Acor prompt: ${h.label()}`);
  const result = { ok: true, visited, groundPrompt: h.label(), errors: h.errors() };
  console.log('Acor live flight checks', JSON.stringify(result));
  return result;
}
