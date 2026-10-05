import * as THREE from 'three';
import { REGION_IDS } from './region-world.js';
import { MOUNTAIN_PATCH, BANDS, peakLiftAt, onBald } from './west-lotharn-world.js';
import { nearestPlain } from './east-lotharn-caves.js';
import { refineWestLotharnRiverGroundSteps, westLotharnRiverBankDistance } from './west-lotharn-river-ground.js';

// Retained summit triangles cross these atlas owners. Their coarse aprons and
// all four beck corridors must exist before any dependent scenery is placed.
export const WEST_LOTHARN_GROUND_REGIONS = Object.freeze([11, 12, 16, 20, 27, 28, 38, REGION_IDS['South Celder']]);

/** The existing summit and cave-mouth geometry, independent of forest/caves.
 * The old candidate/footing samplers remain separate to preserve seeded trees;
 * neighbours consume the actual retained Float32 triangles below. */
export function* createWestLotharnGroundSteps(kit) {
  let buildWork = 0;
  const { root, material, groundHeight } = kit;
  const group = kit.group ?? new THREE.Group();
  if (!kit.group) { group.name = 'West Lotharn fine ground'; root.add(group); }
  const metrics = { batches: 0 };
  const gy = (x,z) => groundHeight(x,z);
  let surfaceHeight = kit.renderedGroundHeight ?? gy;
  let candidateSurfaceHeight;
  // -------------------------------------------------------------------------
  // The summits' ground
  // -------------------------------------------------------------------------
  /**
   * The massifs, drawn by a ground of their own three metres apart (the world's is sunk under it,
   * `westLotharnTerrainSink`), and coloured by what the ground is: bare rock in courses where it is
   * too steep for anybody, each course a little warmer or cooler than the next the way bedded stone
   * weathers; scree and thin grass on the climbs; grass on the ledges, darker low down where the
   * forest is and paler above the tree line; and the balds' pale bleached grass on the tops.
   */
  {
    const { step, minX, minZ, maxX, maxZ } = MOUNTAIN_PATCH, TILE = 56;
    const cols = Math.floor((maxX - minX) / step) + 1, rows = Math.floor((maxZ - minZ) / step) + 1;
    const lift = new Float32Array(cols * rows), heights = new Float32Array(cols * rows).fill(NaN);
    for (let j = 0; j < rows; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < cols; i++) { if ((++buildWork & 31) === 0) yield; lift[j * cols + i] = peakLiftAt(minX + i * step, minZ + j * step); } }
    const drawn = new Uint8Array((cols - 1) * (rows - 1));
    for (let j = 0; j < rows - 1; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < cols - 1; i++) { if ((++buildWork & 31) === 0) yield;
      let any = false;
      for (let b = -1; b <= 2 && !any; b++) { if ((++buildWork & 31) === 0) yield; for (let a = -1; a <= 2 && !any; a++) { if ((++buildWork & 31) === 0) yield;
        const ii = i + a, jj = j + b;
        if (ii >= 0 && jj >= 0 && ii < cols && jj < rows && lift[jj * cols + ii] > 0) any = true;
      } }
      if (any) drawn[j * (cols - 1) + i] = 1;
    } }
    const heightOf = (i, j) => {
      const k = j * cols + i;
      if (Number.isNaN(heights[k])) heights[k] = gy(minX + i * step, minZ + j * step);
      return heights[k];
    };
    const outsideSurface = surfaceHeight;
    surfaceHeight = (x, z) => {
      const gx = (x - minX) / step, gz = (z - minZ) / step;
      const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j;
      if (i < 0 || j < 0 || i >= cols - 1 || j >= rows - 1 || !drawn[j * (cols - 1) + i]) return outsideSurface(x, z);
      const a = heightOf(i, j), b = heightOf(i, j + 1), c = heightOf(i + 1, j), d = heightOf(i + 1, j + 1);
      return u + v <= 1 ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
    };
    if(kit.legacyGroundHeight){
      const oldHeights=new Float32Array(cols*rows).fill(NaN);
      const oldHeight=(i,j)=>{const k=j*cols+i;if(Number.isNaN(oldHeights[k]))oldHeights[k]=kit.legacyGroundHeight(minX+i*step,minZ+j*step);return oldHeights[k];};
      candidateSurfaceHeight=(x,z)=>{
        const gx=(x-minX)/step,gz=(z-minZ)/step,i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j;
        if(i<0||j<0||i>=cols-1||j>=rows-1||!drawn[j*(cols-1)+i])return(kit.legacyRenderedGroundHeight??outsideSurface)(x,z);
        const a=oldHeight(i,j),b=oldHeight(i,j+1),c=oldHeight(i+1,j),d=oldHeight(i+1,j+1);
        return u+v<=1?a+(c-a)*u+(b-a)*v:d+(b-d)*(1-u)+(c-d)*(1-v);
      };
    }
    const rock = [new THREE.Color('#8d8374'), new THREE.Color('#7c7a72'), new THREE.Color('#948878'), new THREE.Color('#827d74')];
    const scree = new THREE.Color('#8f8a6c'), lowGrass = new THREE.Color('#5c7642'), highGrass = new THREE.Color('#7e8a55');
    const baldGrass = new THREE.Color('#a6a771'), shade = new THREE.Color();
    const faceMaterial = material('#ffffff', { vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    let jitter = 30809;
    const wobble = () => { jitter = (Math.imul(jitter, 1664525) + 1013904223) >>> 0; return .95 + jitter / 4294967296 * .1; };
    /** The colour of the summits' ground at a point, from its height, its steepness and the lift there. */
    const paint = (x, z, y, grade, u) => {
      const course = Math.floor(u / BANDS.period);
      shade.copy(lowGrass).lerp(highGrass, Math.min(1, Math.max(0, (y - 100) / 260)));
      if (u > 0 && onBald(x, z, 4)) shade.lerp(baldGrass, .85);
      shade.lerp(scree, Math.min(1, Math.max(0, (grade - .55) / .4)));
      shade.lerp(rock[((course % 4) + 4) % 4], Math.min(1, Math.max(0, (grade - .95) / .45)));
      shade.multiplyScalar(wobble());
    };
    const caves = kit.caves ?? [];
    const MOUTH = 5.5;
    const mouthPoints = caves.flatMap(cave => (cave.kind === 'chamber' ? [cave.portals[0]] : cave.portals).map(at => ({ cave, at, p: cave.at(at) })));
    const underMouth = (i, j) => {
      const x = minX + (i + .5) * step, z = minZ + (j + .5) * step;
      return mouthPoints.some(({ p }) => Math.abs(x - p.x) < MOUTH - 1.5 && Math.abs(z - p.z) < MOUTH - 1.5);
    };
    for (let tj = 0; tj < rows - 1; tj += TILE) { if ((++buildWork & 31) === 0) yield; for (let ti = 0; ti < cols - 1; ti += TILE) { if ((++buildWork & 31) === 0) yield;
      const ci = Math.min(TILE, cols - 1 - ti), cj = Math.min(TILE, rows - 1 - tj), indices = [];
      for (let j = 0; j < cj; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < ci; i++) { if ((++buildWork & 31) === 0) yield;
        if (!drawn[(tj + j) * (cols - 1) + ti + i] || (mouthPoints.length && underMouth(ti + i, tj + j))) continue;
        const a = j * (ci + 1) + i;
        indices.push(a, a + ci + 1, a + 1, a + 1, a + ci + 1, a + ci + 2);
      } }
      if (!indices.length) continue;
      const positions = new Float32Array((ci + 1) * (cj + 1) * 3), colours = new Float32Array((ci + 1) * (cj + 1) * 3);
      for (let j = 0; j <= cj; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i <= ci; i++) { if ((++buildWork & 31) === 0) yield;
        const gi = ti + i, gj = tj + j, x = minX + gi * step, z = minZ + gj * step, k = j * (ci + 1) + i;
        const used = [[0, 0], [-1, 0], [0, -1], [-1, -1]].some(([a, b]) => {
          const ii = gi + a, jj = gj + b;
          return ii >= 0 && jj >= 0 && ii < cols - 1 && jj < rows - 1 && drawn[jj * (cols - 1) + ii];
        });
        if (!used) { positions.set([x, 0, z], k * 3); continue; }
        const y = heightOf(gi, gj);
        positions.set([x, y, z], k * 3);
        const east = heightOf(Math.min(cols - 1, gi + 1), gj), west = heightOf(Math.max(0, gi - 1), gj);
        const north = heightOf(gi, Math.max(0, gj - 1)), south = heightOf(gi, Math.min(rows - 1, gj + 1));
        paint(x, z, y, Math.hypot(east - west, south - north) / (2 * step), lift[gj * cols + gi]);
        colours.set([shade.r, shade.g, shade.b], k * 3);
      } }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const ground = new THREE.Mesh(geometry, faceMaterial);
      ground.name = 'West Lotharn summits ground'; ground.receiveShadow = true; group.add(ground);
      metrics.batches++;
    } }

    // The ground round each mouth, thirty centimetres apart, with the passage's own section taken
    // out of it: the opening in the cliff is the cave's shape.
    const FINE = .3;
    for (const { cave, at, p } of mouthPoints) { if ((++buildWork & 31) === 0) yield;
      const n = Math.round(MOUTH * 2 / FINE) + 1, x0 = p.x - MOUTH, z0 = p.z - MOUTH;
      const positions = new Float32Array(n * n * 3), colours = new Float32Array(n * n * 3), here = new Float32Array(n * n), indices = [];
      for (let j = 0; j < n; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < n; i++) { if ((++buildWork & 31) === 0) yield; here[j * n + i] = gy(x0 + i * FINE, z0 + j * FINE); } }
      for (let j = 0; j < n; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < n; i++) { if ((++buildWork & 31) === 0) yield;
        const x = x0 + i * FINE, z = z0 + j * FINE, y = here[j * n + i], k = j * n + i;
        const east = here[j * n + Math.min(n - 1, i + 1)], west = here[j * n + Math.max(0, i - 1)];
        const north = here[Math.max(0, j - 1) * n + i], south = here[Math.min(n - 1, j + 1) * n + i];
        positions.set([x, y, z], k * 3);
        paint(x, z, y, Math.hypot(east - west, south - north) / (2 * FINE), peakLiftAt(x, z));
        colours.set([shade.r, shade.g, shade.b], k * 3);
      } }
      const within = new Uint8Array(n * n);
      for (let k = 0; k < n * n; k++) { if ((++buildWork & 31) === 0) yield;
        const x = positions[k * 3], y = positions[k * 3 + 1], z = positions[k * 3 + 2], near = nearestPlain(cave.path, x, z);
        const inward = at === cave.portals[0] ? near.along - at : at - near.along;
        if (near.distance > cave.half(near.along) + .1 || inward < -1.2 || inward > 4.5) continue;
        const floor = cave.floor(near.along);
        if (y > floor - .3 && y < floor + cave.height(near.along) + .1) within[k] = 1;
      }
      const inside = (a, b, c) => within[a] || within[b] || within[c];
      for (let j = 0; j < n - 1; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < n - 1; i++) { if ((++buildWork & 31) === 0) yield;
        const a = j * n + i, b = a + n, c = a + 1, d = a + n + 1;
        if (!inside(a, b, c)) indices.push(a, b, c);
        if (!inside(c, b, d)) indices.push(c, b, d);
      } }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const ground = new THREE.Mesh(geometry, faceMaterial);
      ground.name = `Ground at the mouth of ${cave.name}`; ground.receiveShadow = true; group.add(ground);
      metrics.batches++;
    }
  }

  // Retain the original slope filter: changing it would move saved trees and
  // consume a different sequence of random values for all later scenery.
  candidateSurfaceHeight ??= surfaceHeight;
  const riverGround = kit.terrainRoot ? yield* refineWestLotharnRiverGroundSteps({
    THREE, terrainRoot: kit.terrainRoot, mountainRoot: group, heightAt: gy, coarseHeightAt: surfaceHeight,
  }) : null;
  if (riverGround) { surfaceHeight = riverGround.heightAt; metrics.riverGround = riverGround.metrics; }


  const fineGroundHeight = yield* retainedGroundSamplerSteps(group);
  const coarse = kit.renderedGroundHeight ?? gy;
  const renderedGroundHeight = (x,z) => {
    // This sampler replaces removed coarse faces beside the becks; taking a
    // max with the old coarse plane would cover the newly exposed water again.
    if (riverGround && westLotharnRiverBankDistance(x,z,12) <= 12) return riverGround.heightAt(x,z);
    return Math.max(coarse(x,z),fineGroundHeight(x,z) ?? -Infinity);
  };
  return { group, metrics, candidateSurfaceHeight, heightAt:surfaceHeight, riverGround, fineGroundHeight, renderedGroundHeight };
}

/** Cached local triangle lookup; null outside retained fine faces, including
 * the openings cut for caves. No raycast or scene traversal occurs at runtime. */
function* retainedGroundSamplerSteps(group) {
  const buckets=new Map(),size=12;let work=0;
  for(const mesh of group.children){
    if(!mesh.isMesh||!(mesh.name==='West Lotharn summits ground'||mesh.name.startsWith('Ground at the mouth of ')||mesh.userData.westLotharnRiverGround))continue;
    const p=mesh.geometry.attributes.position.array,index=mesh.geometry.index.array;
    for(let k=0;k<index.length;k+=3){
      if((++work&255)===0)yield;
      const a=index[k]*3,b=index[k+1]*3,c=index[k+2]*3,triangle={p,a,b,c};
      for(let x=Math.floor(Math.min(p[a],p[b],p[c])/size);x<=Math.floor(Math.max(p[a],p[b],p[c])/size);x++)
        for(let z=Math.floor(Math.min(p[a+2],p[b+2],p[c+2])/size);z<=Math.floor(Math.max(p[a+2],p[b+2],p[c+2])/size);z++){
          const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(triangle);
        }
    }
  }
  return(x,z)=>{
    let result=-Infinity;
    for(const {p,a,b,c} of buckets.get(Math.floor(x/size)+','+Math.floor(z/size))??[]){
      const dx=x-p[a],dz=z-p[a+2],bx=p[b]-p[a],bz=p[b+2]-p[a+2],cx=p[c]-p[a],cz=p[c+2]-p[a+2],det=bx*cz-bz*cx;
      if(Math.abs(det)<1e-12)continue;
      const u=(dx*cz-dz*cx)/det,v=(bx*dz-bz*dx)/det;
      if(u>=-1e-7&&v>=-1e-7&&u+v<=1.0000001)result=Math.max(result,p[a+1]+(p[b+1]-p[a+1])*u+(p[c+1]-p[a+1])*v);
    }
    return result===-Infinity?null:result;
  };
}
