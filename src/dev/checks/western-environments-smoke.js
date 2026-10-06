import { canStand, moveCharacter } from '../../gameplay/movement/game-state.js';

/** Exercise the streamed environment with the same support and movement as play. */
export function runWesternEnvironmentChecks(world, life, { name, field, arrival, landmarks, trails = [] }) {
  const checks = [], check = (ok, label) => {
    if (!ok) throw new Error(`${name}: ${label}`);
    checks.push(label);
  };
  check(Object.keys(world[field]?.metrics??{}).length>0, 'Regional scenery has finished streaming');
  for (const p of [arrival, ...landmarks]) {
    check(world.regionAt(p.x, p.z).name === name, `${p.id ?? 'arrival'} belongs to the correct region`);
    check(canStand(p.x, p.z, world, .4), `${p.id ?? 'arrival'} has clear, supported footing`);
    check(world.heightAt(p.x, p.z) >= world.waterAt(p.x, p.z), `${p.id ?? 'arrival'} is above water`);
  }
  let metresWalked = 0, maxGrade = 0;
  for (const path of trails) for (const points of [path.points, [...path.points].reverse()]) {
    const pos = { ...points[0], y: world.heightAt(points[0].x, points[0].z) };
    for (const target of points.slice(1)) {
      const steps = Math.ceil(Math.hypot(target.x - pos.x, target.z - pos.z) / .3);
      const dx = (target.x - pos.x) / steps, dz = (target.z - pos.z) / steps;
      for (let j = 0; j < steps; j++) {
        const old = { ...pos };
        moveCharacter(pos, dx, dz, world, .4);
        pos.y = world.heightAt(pos.x, pos.z);
        const length = Math.hypot(pos.x - old.x, pos.z - old.z);
        metresWalked += length;
        if (length > .001) maxGrade = Math.max(maxGrade, Math.abs(pos.y - old.y) / length);
      }
      check(Math.hypot(pos.x - target.x, pos.z - target.z) < .15, `${path.id} reaches ${target.x}, ${target.z}`);
    }
  }
  const animals = life.snapshot().creatures.filter(a => a.region === name);
  check(animals.length >= 8, 'Wildlife has actual resident animals');
  check(animals.every(a => Number.isFinite(a.x) && Number.isFinite(a.z)), 'Wildlife positions remain finite');
  return { ok: true, name, checks, metresWalked: Math.round(metresWalked), maxGrade,
    animals: animals.length, species: [...new Set(animals.map(a => a.species))], metrics: world[field].metrics };
}
