// Export-time relief only. The public chart never samples 3D terrain at runtime.
import { acorGround, acorProfile } from '../src/content/regions/acor/acor-world.js';
import { TRANSFORM, landDistance } from '../src/world/terrain/region-world.js';
import { THALMAGAR_FORTRESS as site, THALMAGAR_CURTAIN, THALMAGAR_DARK_TOWER } from '../src/content/regions/thalmagar/thalmagar-fortress-site.js';

const n = value => Number(value.toFixed(3));
const atlas = p => TRANSFORM.worldToAtlas(p.x, p.z);
const xy = p => `${n(p.x)},${n(p.y)}`;
const path = points => points.map((p, i) => `${i ? 'L' : 'M'}${xy(atlas(p))}`).join('');

/** Connect marching-triangle segments into uninterrupted contour strokes. */
function chain(segments) {
  const key = p => `${p.x.toFixed(3)},${p.z.toFixed(3)}`, edges = new Map();
  segments.forEach((s, index) => s.forEach(p => {
    const k = key(p); if (!edges.has(k)) edges.set(k, []); edges.get(k).push(index);
  }));
  const used = new Set(), lines = [];
  function walk(index, start) {
    const points = [start];
    while (!used.has(index)) {
      used.add(index);
      const s = segments[index], end = key(s[0]) === key(points.at(-1)) ? s[1] : s[0];
      points.push(end);
      const next = edges.get(key(end)).find(id => !used.has(id));
      if (next === undefined) break;
      index = next;
    }
    lines.push(points);
  }
  segments.forEach((s, i) => {
    const end = s.find(p => edges.get(key(p)).length === 1);
    if (end && !used.has(i)) walk(i, end);
  });
  segments.forEach((s, i) => { if (!used.has(i)) walk(i, s[0]); });
  return lines;
}

export function buildThalmagarRelief() {
  const region = acorProfile(site.region), b = region.bounds, step = 16;
  const cols = Math.ceil((b.maxX - b.minX) / step), rows = Math.ceil((b.maxZ - b.minZ) / step);
  const samples = Array.from({ length: rows + 1 }, (_, j) => Array.from({ length: cols + 1 }, (_, i) => {
    const x = b.minX + i * step, z = b.minZ + j * step;
    return { x, z, height: acorGround(x, z) };
  }));
  const contours = [12, 20, 28, 36, 52].map(level => {
    const segments = [], intersections = new Map();
    const crossing = (a, b) => {
      // Refine against the real height function: shoreline and terrace slopes
      // curve more sharply than a straight interpolation across a 16m cell.
      if (a.x > b.x || (a.x === b.x && a.z > b.z)) [a, b] = [b, a];
      const key = `${a.x},${a.z}:${b.x},${b.z}`;
      if (intersections.has(key)) return intersections.get(key);
      let lo = 0, hi = 1, t = (level - a.height) / (b.height - a.height), p, height;
      for (let k = 0; k < 12; k++) {
        p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
        height = acorGround(p.x, p.z);
        if (Math.abs(height - level) < .03) break;
        if ((height < level) === (a.height < level)) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      // Do not draw an invented level across a discontinuous region seam.
      const result = Math.abs(height - level) < .5 ? p : null;
      intersections.set(key, result);
      return result;
    };
    const triangle = points => {
      const crossings = [];
      for (let k = 0; k < 3; k++) {
        const a = points[k], c = points[(k + 1) % 3];
        if ((a.height < level) === (c.height < level)) continue;
        const p = crossing(a, c);
        if (!p) return;
        crossings.push(p);
      }
      if (crossings.length === 2) {
        const [a, c] = crossings, x = (a.x + c.x) / 2, z = (a.z + c.z) / 2;
        if (region.owns(x, z) && landDistance(x, z) > 5) segments.push(crossings);
      }
    };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = samples[j][i], c = samples[j][i + 1], d = samples[j + 1][i + 1], e = samples[j + 1][i];
      triangle([a, c, d]); triangle([a, d, e]);
    }
    return { level, lines: chain(segments) };
  });
  const hachures = [];
  // Slope marks follow the actual ground's downhill direction, including the
  // rocky headland and the fortress terrace. Flat heath stays open parchment.
  for (let j = 1; j < rows; j += 2) for (let i = 1; i < cols; i += 2) {
    const p = samples[j][i];
    if (!region.owns(p.x, p.z) || landDistance(p.x, p.z) < 12) continue;
    const dx = (samples[j][i + 1].height - samples[j][i - 1].height) / (2 * step);
    const dz = (samples[j + 1][i].height - samples[j - 1][i].height) / (2 * step), grade = Math.hypot(dx, dz);
    if (grade < .13) continue;
    const length = Math.min(14, 5 + grade * 16);
    hachures.push([p, { x: p.x - dx / grade * length, z: p.z - dz / grade * length }]);
  }
  return { contours, hachures, sampleCount: (rows + 1) * (cols + 1) };
}

/** All details remain part of the base image, underneath the normal map fog. */
export function thalmagarChartSvg(capePath) {
  const relief = buildThalmagarRelief(), centre = atlas(site), towerRadius = THALMAGAR_DARK_TOWER.radius;
  const tower = Array.from({ length: 8 }, (_, i) => {
    const a = (i + .5) / 8 * Math.PI * 2;
    return { x: site.x + Math.sin(a) * towerRadius, z: site.z + Math.cos(a) * towerRadius };
  });
  return `<defs><clipPath id="thalmagar-land-clip"><path d="${capePath}"/></clipPath></defs>
<g id="thalmagar-relief" clip-path="url(#thalmagar-land-clip)" stroke-linejoin="round" stroke-linecap="round">
  <path d="${capePath}" fill="#aeb9a6" fill-opacity=".25"/>
  ${relief.contours.map(({ level, lines }) => `<path data-height="${level}" d="${lines.map(path).join('')}" fill="none" stroke="#686b50" stroke-width="${level === 36 ? '.9' : '.65'}" stroke-opacity=".6"/>`).join('\n  ')}
  <path data-relief="slope" d="${relief.hachures.map(path).join('')}" fill="none" stroke="#5d644d" stroke-width=".7" stroke-opacity=".7"/>
</g>
<g id="thalmagar-fortress-plan" clip-path="url(#thalmagar-land-clip)" stroke="#3c493e" stroke-linejoin="round">
  <title>Thalmagar's Fortress and its central Dark Wizard's Tower</title>
  <path data-feature="fortress-approach" d="${path([site.arrival, site.gate, site])}" fill="none" stroke="#8c8464" stroke-width="2.2"/>
  <path data-feature="curtain" d="${path(THALMAGAR_CURTAIN)}Z" fill="#818b77" fill-opacity=".45" stroke-width="1.4"/>
  <path d="${path(THALMAGAR_CURTAIN.map(p => ({ x: site.x + (p.x - site.x) * .87, z: site.z + (p.z - site.z) * .85 })))}Z" fill="none" stroke-width=".45"/>
  ${THALMAGAR_CURTAIN.map(p => `<circle cx="${n(atlas(p).x)}" cy="${n(atlas(p).y)}" r="1.6" fill="#c2c4a8" stroke-width=".7"/>`).join('\n  ')}
  <path data-feature="dark-tower" d="${path(tower)}Z" fill="#4c5a4b" stroke-width=".8"/>
  <g transform="translate(${n(centre.x)} ${n(centre.y)})" fill="#39483f" stroke="#e6dbb8" stroke-width=".65">
    <path d="M-5,4V-6L-3,-8V-12L0,-21L3,-12V-8L5,-6V4Z"/>
    <path d="M-6,-6H6M-4,-12H4M-5,-2H5" fill="none"/>
    <path d="M-1,-10V-7M1,-10V-7M0,-4V-1" fill="none" stroke="#ceb784"/>
  </g>
</g>`;
}
