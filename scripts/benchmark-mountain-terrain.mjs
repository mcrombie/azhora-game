import { createHash } from 'node:crypto';
import { BALDRO_CELLS, baldroInset, baldroSurfaceHeight, baldroPathDistance, baldroWaterAt, baldroTint } from '../src/content/regions/baldro/baldro-world.js';
import { SOUTH_OREMINDI_CELLS, southOremindiInset, southOremindiGround, southOremindiPathDistance, southOremindiWaterAt, southOremindiTint } from '../src/content/regions/south-oremindi/south-oremindi-world.js';
const regions = [
  ['Baldro', BALDRO_CELLS, baldroInset, baldroSurfaceHeight, baldroPathDistance, baldroWaterAt, baldroTint],
  ['South Oremindi', SOUTH_OREMINDI_CELLS, southOremindiInset, southOremindiGround, southOremindiPathDistance, southOremindiWaterAt, southOremindiTint],
];
const output = [];
for (const [name, cells, insetAt, heightAt, pathAt, waterAt, tintAt] of regions) {
  const points = cells.flatMap(c => Array.from({length: 81}, (_, i) => ({x: c.x + (i % 9 - 4) * 11.75, z: c.z + (Math.floor(i / 9) - 4) * 11.75})));
  const samples = [], times = [];
  for (let run = 0; run < 4; run++) {
    const start = performance.now();
    for (const p of points) {
      const values = [insetAt(p.x,p.z), heightAt(p.x,p.z), pathAt(p.x,p.z), waterAt(p.x,p.z), tintAt(p.x,p.z)];
      if (run === 3) samples.push(values);
    }
    times.push(performance.now() - start);
  }
  output.push({name, samples: points.length, times, checksum: createHash('sha256').update(JSON.stringify(samples)).digest('hex')});
}
console.log(JSON.stringify(output,null,2));
