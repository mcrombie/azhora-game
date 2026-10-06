import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { groundWithRiver, groundBeforeEastIzol, legacyEastIzolGroundHeight } from '../src/world/terrain/world-terrain.js';
import { EAST_IZOL_LINE } from '../src/content/regions/east-izol/east-izol-world.js';
import { regionAt } from '../src/world/terrain/region-world.js';
import { izolSeamWeight } from '../src/content/regions/izol/izol-ground.js';

const defects = [
  { x:454.99807206087246,z:1792.8050723743067,nx:-.5,nz:.8660254037844383,old:1.5639517425 },
  { x:554.9980720608727,z:2075.7067042772233,nx:.5,nz:.8660254037844383,old:1.16213 },
];

test('East Izol applies only the remaining relief correction over repaired West Izol edges', () => {
  for(const p of defects){
    const a={x:p.x-p.nx*.001,z:p.z-p.nz*.001},b={x:p.x+p.nx*.001,z:p.z+p.nz*.001};
    for(const q of[a,b]){assert.equal(regionAt(q.x,q.z).name,'East Izol');assert.equal(izolSeamWeight(q.x,q.z),1);}
    assert.ok(Math.abs(legacyEastIzolGroundHeight(a.x,a.z)-legacyEastIzolGroundHeight(b.x,b.z))>1,'the pre-review discontinuity is reproduced');
    assert.ok(Math.abs(groundWithRiver(a.x,a.z)-groundWithRiver(b.x,b.z))<.002,'the corrected ground is continuous across two millimetres');
  }
});

test('the complete pre-review East Izol candidate field remains byte-identical around all ten shared edges', () => {
  const rows=[];
  for(const edge of EAST_IZOL_LINE)for(const t of[.1,.3,.5,.7,.9])for(const offset of[-45,-29,-18,-6,-.001,.001,6,18,29,45]){
    const x=edge.a.x+(edge.b.x-edge.a.x)*t+edge.nx*offset,z=edge.a.z+(edge.b.z-edge.a.z)*t+edge.nz*offset;
    rows.push([x,z,legacyEastIzolGroundHeight(x,z)]);
    if(regionAt(x,z)?.name!=='East Izol')assert.equal(groundWithRiver(x,z),groundBeforeEastIzol(x,z),'the existing West island is untouched');
  }
  assert.equal(rows.length,500);
  assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),'20130ff34eda0c69283e5a5d85773669c0be212da5aa963bf520db14ce65ebe2');
});

test('all shared-edge junctions stay within five centimetres instead of exempting the corner neighborhoods', t => {
  // The delivered dense screen omits two metres around every seam endpoint.
  // Inspect that omitted area independently. The piecewise seam still has a
  // measured 3 cm junction at one vertex, below an ordinary step; this test
  // does not describe it as mathematically continuous.
  const corners = [...new Map(EAST_IZOL_LINE.flatMap(e => [e.a, e.b])
    .map(p => [`${p.x.toFixed(5)},${p.z.toFixed(5)}`, p])).values()];
  let samples = 0, worst = { gap: 0 };
  for (const c of corners) for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++)
    for (const [dx, dz] of [[.0005, 0], [0, .0005]]) {
      const x = c.x + i * .2, z = c.z + j * .2;
      if (regionAt(x, z)?.name !== 'East Izol') continue;
      const gap = Math.abs(groundWithRiver(x-dx,z-dz)-groundWithRiver(x+dx,z+dz));
      samples++;
      if (gap > worst.gap) worst = { x, z, gap };
    }
  assert.equal(corners.length, 11);
  assert.ok(samples > 4900);
  t.diagnostic(JSON.stringify({ samples, worst }));
  assert.ok(worst.gap < .05, JSON.stringify(worst));
});
