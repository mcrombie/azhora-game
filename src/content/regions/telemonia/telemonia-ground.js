import * as THREE from 'three';
import { groundTint } from '../../../world/terrain/world-terrain.js';
import { hexOwnerAt,REGION_CELLS,REGION_IDS,METRES_PER_HEX } from '../../../world/terrain/region-world.js';
import { TELEMONIA, TELEMONIA_BOX, TELEMONIA_PATCH_REACH, borderDepth } from './telemonia-world.js';

/** The existing Telemonia terrain, built independently of walls and settlements.
 * Neighbouring countries also draw on its nine-metre collar. Keep one lattice,
 * one colour stream and one set of meshes regardless of which country loads first. */
export function* createTelemoniaGroundSteps(kit) {
  const group=kit.group??new THREE.Group();
  if(!kit.group){group.name='Telemonia fine ground';kit.root.add(group);}
  const plan=yield* createTelemoniaGroundPlanSteps(kit);
  for(const tile of plan.tiles)yield* tile.buildSteps(group);
  return {...plan.surface,group};
}

// Plan one immutable lattice, then construct its mesh tiles independently. Each
// tile keeps its original colour-stream offset, so load order changes no pixels.
export function* createTelemoniaGroundPlanSteps(kit) {
  let buildWork = 0;
  const { material, groundHeight } = kit;
  const tiles=[];
  const metrics = { batches: 0, groundVertices: 0 };
  const gy = (x, z) => groundHeight(x, z);
  const ours = (x, z) => hexOwnerAt(x, z) === TELEMONIA;
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const STEP = 1.5, TILE = 64, B = TELEMONIA_BOX;
  const cols = Math.floor((B.maxX - B.minX) / STEP) + 1, rows = Math.floor((B.maxZ - B.minZ) / STEP) + 1;
  const heights = new Float32Array(cols * rows).fill(NaN), owned = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if ((++buildWork & 63) === 0) yield;
    owned[j * cols + i] = ours(B.minX + i * STEP, B.minZ + j * STEP) ? 1 : 0;
  }
  // A cell is drawn when any of the sixteen samples round it is Telemonia's, or when it is within
  // `TELEMONIA_PATCH_REACH` of the border outside: every cell of the world's grid with a corner sunk
  // under this country is covered, and out there this ground is the neighbours' own, so where the two
  // grids meet at the same height this one wins the tie and nothing shows.
  const drawn = new Uint8Array((cols - 1) * (rows - 1));
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    if ((++buildWork & 63) === 0) yield;
    let any = borderDepth(B.minX + (i + .5) * STEP, B.minZ + (j + .5) * STEP) > -TELEMONIA_PATCH_REACH;
    for (let b = -1; b <= 2 && !any; b++) for (let a = -1; a <= 2 && !any; a++) {
      const ii = i + a, jj = j + b;
      if (ii >= 0 && jj >= 0 && ii < cols && jj < rows && owned[jj * cols + ii]) any = true;
    }
    if (any) drawn[j * (cols - 1) + i] = 1;
  }
  const heightOf = (i, j) => {
    i = Math.max(0, Math.min(cols - 1, i)); j = Math.max(0, Math.min(rows - 1, j));
    const k = j * cols + i;
    if (Number.isNaN(heights[k])) heights[k] = gy(B.minX + i * STEP, B.minZ + j * STEP);
    return heights[k];
  };
  // Read the same two triangles emitted below, not the analytic surface between
  // their samples. The trunk's complete rotated footprint must meet this mesh.
  const treeGroundAt = (x, z) => {
    const fx = (x - B.minX) / STEP, fz = (z - B.minZ) / STEP;
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    if (i < 0 || j < 0 || i >= cols - 1 || j >= rows - 1 || !drawn[j * (cols - 1) + i])
      return (kit.renderedGroundHeight ?? gy)(x, z);
    const a = heightOf(i, j), b = heightOf(i, j + 1), c = heightOf(i + 1, j), d = heightOf(i + 1, j + 1);
    return u + v <= 1 ? a + (c - a) * u + (b - a) * v
      : d + (b - d) * (1 - u) + (c - d) * (1 - v);
  };
  /** The ground's slope at a lattice sample, from its four neighbours. */
  const slopeOf = (i, j) => Math.hypot(heightOf(i + 1, j) - heightOf(i - 1, j), heightOf(i, j + 1) - heightOf(i, j - 1)) / (2 * STEP);
  /** The slope at a world point, off the lattice: what the scatter decides by. */
  const slopeAt = (x, z) => slopeOf(Math.round((x - B.minX) / STEP), Math.round((z - B.minZ) / STEP));
  {
    const rock = [new THREE.Color('#8b8376'), new THREE.Color('#847c70'), new THREE.Color('#94897a'), new THREE.Color('#7e776c')];
    const scree = new THREE.Color('#9b917c'), shade = new THREE.Color(), pale = new THREE.Color('#bfb59d');
    const groundMaterial = material('#ffffff', { vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    let streamSeed = 60211;
    const paint = (x, z, y, grade,noise) => {
      groundTint(shade, x, z, THREE);
      // Scree where it is steep, and bare rock in courses where it is too steep for anybody: the
      // courses are the cliff bands' own beds, a couple of metres deep, so a face reads as layered stone.
      shade.lerp(scree, Math.min(1, Math.max(0, (grade - .55) / .4)) * .7);
      shade.lerp(rock[((Math.floor(y / 2.2) % 4) + 4) % 4], Math.min(1, Math.max(0, (grade - .85) / .5)));
      // The crests: "bare along the crests" - pale stone on the highest ground of the rim.
      shade.lerp(pale, smooth(54, 66, y) * .35);
      shade.multiplyScalar(noise);
    };
    for (let tj = 0; tj < rows - 1; tj += TILE) for (let ti = 0; ti < cols - 1; ti += TILE) {
      yield;
      const ci = Math.min(TILE, cols - 1 - ti), cj = Math.min(TILE, rows - 1 - tj), indices = [];
      for (let j = 0; j < cj; j++) for (let i = 0; i < ci; i++) {
        if (!drawn[(tj + j) * (cols - 1) + ti + i]) continue;
        const a = j * (ci + 1) + i;
        indices.push(a, a + ci + 1, a + 1, a + 1, a + ci + 1, a + ci + 2);
      }
      if (!indices.length) continue;
      const usedVertices=new Uint8Array((ci+1)*(cj+1)),seed=streamSeed;
      for (let j = 0; j <= cj; j++) for (let i = 0; i <= ci; i++) {
        if ((++buildWork & 63) === 0) yield;
        const gi = ti + i, gj = tj + j,k = j * (ci + 1) + i;
        const used = [[0, 0], [-1, 0], [0, -1], [-1, -1]].some(([a, b]) => {
          const ii = gi + a, jj = gj + b;
          return ii >= 0 && jj >= 0 && ii < cols - 1 && jj < rows - 1 && drawn[jj * (cols - 1) + ii];
        });
        if(used){usedVertices[k]=1;streamSeed=(Math.imul(streamSeed,1664525)+1013904223)>>>0;}
      }
      const bounds={minX:B.minX+ti*STEP,maxX:B.minX+(ti+ci)*STEP,minZ:B.minZ+tj*STEP,maxZ:B.minZ+(tj+cj)*STEP};
      // Hex bounding boxes are conservative: include every country that could
      // stand on a triangle, including tiny slivers along a hex corner.
      const radius=METRES_PER_HEX/Math.sqrt(3)+STEP*2;
      const regions=Object.entries(REGION_IDS).filter(([,id])=>[22,25,26,55,57,59].includes(id)).filter(([name])=>REGION_CELLS[name].some(c=>c.x+radius>=bounds.minX&&c.x-radius<=bounds.maxX&&c.z+radius>=bounds.minZ&&c.z-radius<=bounds.maxZ)).map(([,id])=>id);
      tiles.push({id:`${ti}-${tj}`,regions,bounds,*buildSteps(root){
        const positions = new Float32Array((ci + 1) * (cj + 1) * 3), colours = new Float32Array((ci + 1) * (cj + 1) * 3);
        let jitter=seed,work=0;
        for(let j=0;j<=cj;j++)for(let i=0;i<=ci;i++){
          if((++work&63)===0)yield;
          const gi=ti+i,gj=tj+j,x=B.minX+gi*STEP,z=B.minZ+gj*STEP,k=j*(ci+1)+i;
          if(!usedVertices[k]){positions.set([x,0,z],k*3);continue;}
          const y = heightOf(gi, gj);
          positions.set([x, y, z], k * 3);
          jitter=(Math.imul(jitter,1664525)+1013904223)>>>0;
          paint(x, z, y, slopeOf(gi, gj),.955+jitter/4294967296*.09);
          colours.set([shade.r, shade.g, shade.b], k * 3);
          metrics.groundVertices++;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
        geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
        const ground = new THREE.Mesh(geometry, groundMaterial);
        ground.name = 'Telemonia ground'; ground.receiveShadow = true;root.add(ground);
        ground.userData.telemoniaTile=`${ti}-${tj}`;
        metrics.batches++;
        return {ground};
      }});
    }
  }

  // Unlike the legacy scatter sampler above, use the emitted Float32 horizontal
  // coordinates as well as heights. Null means no retained triangle at this point.
  const fineGroundHeight = (x, z) => {
    let i = Math.floor((x - B.minX) / STEP), j = Math.floor((z - B.minZ) / STEP);
    // Float32 vertices can sit a fraction of a millimetre across the ideal cell
    // boundary. Select the emitted cell, including points beside a retained edge.
    if (x < Math.fround(B.minX + i * STEP)) i--;
    else if (x >= Math.fround(B.minX + (i + 1) * STEP)) i++;
    if (z < Math.fround(B.minZ + j * STEP)) j--;
    else if (z >= Math.fround(B.minZ + (j + 1) * STEP)) j++;
    if (i < 0 || j < 0 || i >= cols - 1 || j >= rows - 1 || !drawn[j * (cols - 1) + i]) return null;
    const x0 = Math.fround(B.minX + i * STEP), x1 = Math.fround(B.minX + (i + 1) * STEP);
    const z0 = Math.fround(B.minZ + j * STEP), z1 = Math.fround(B.minZ + (j + 1) * STEP);
    const u = (x - x0) / (x1 - x0), v = (z - z0) / (z1 - z0);
    const a = heightOf(i, j), b = heightOf(i, j + 1), c = heightOf(i + 1, j), d = heightOf(i + 1, j + 1);
    return u + v <= 1 ? a + (c - a) * u + (b - a) * v
      : d + (b - d) * (1 - u) + (c - d) * (1 - v);
  };
  return {tiles,surface:{metrics, STEP, B, cols, rows, owned, heightOf, slopeOf, slopeAt, treeGroundAt, fineGroundHeight}};
}
