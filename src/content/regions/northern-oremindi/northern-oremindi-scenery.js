import { forEachBuild } from '../../../world/loading/build-each.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { northernFeatures, northernWaterAt } from './northern-oremindi-world.js';
import { northernWildlifeClear } from './northern-oremindi-wildlife.js';

const CHUNK = 110;
const geometry = {
  trunk: new THREE.CylinderGeometry(.7, 1, 1, 7),
  crown: new THREE.IcosahedronGeometry(1, 1),
  fir: new THREE.ConeGeometry(1, 1, 7),
  stone: new THREE.IcosahedronGeometry(1, 0),
  blade: new THREE.ConeGeometry(1, 1, 3),
};
const tones = {
  'silver-fir': ['#6e6553', '#385c50'],
  'stone-pine': ['#78624b', '#506956'],
  'silver-birch': ['#c3c4ae', '#82905b'],
  'common-juniper': ['#7a705b', '#5a705c'],
};

/** One stable, batched alpine landscape. No artificial cliff collision hulls:
 * the visible heightfield supplies all ridges, passes and climbing surfaces. */
export function createNorthernScenery(...args) { return finishBuild(createNorthernScenerySteps(...args)); }

export function* createNorthernScenerySteps({ parent, heightAt, renderedGroundHeight = heightAt, colliders, terrainRoot, profile }) {
  const regionName=profile.name, regionBounds=profile.bounds, regionLakes=profile.lakes;
  const owns=profile.owns, featuresAt=northernFeatures, waterAt=northernWaterAt;
  const isReserved=(x,z,r=0)=>northernWildlifeClear(x,z,r)||northernFeatures(x,z)?.pathDistance<5+r;
  let buildWork = 0;
  const root = new THREE.Group(); root.name = profile.name+' alpine country'; parent.add(root);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .98, flatShading: true });
  const batches = new Map(), pendingTrees = [], dummy = new THREE.Object3D(), color = new THREE.Color();
  const metrics = { trees: 0, rocks: 0, tufts: 0, flowers: 0, shrubs: 0, lakes: 0, batches: 0 };
  let seed = 970237 + profile.id * 193;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  function part(type, tint, x, y, z, sx, sy, sz, ry = 0, rz = 0) {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}:${type}`;
    if (!batches.has(key)) batches.set(key, { type, pieces: [] });
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, ry, rz); dummy.updateMatrix();
    const p = { matrix: dummy.matrix.clone(), tint, x, z, radius: Math.max(sx, sz) }; batches.get(key).pieces.push(p); return p;
  }
  function tree(x, z, species, height) {
    const y = renderedGroundHeight(x, z), [bark, leaf] = tones[species], pieces = [];
    const r = height * (species === 'silver-birch' ? .021 : .032), bole = height * .73;
    const trunk = part('trunk', bark, x, y + bole / 2, z, r, bole, r);
    const offset = treeGroundingOffset(trunk.matrix, renderedGroundHeight, { radius: 1, segments: 7, embed: .06 });
    trunk.matrix.elements[13] += offset; pieces.push(trunk);
    if (species === 'silver-fir') {
      for (let i = 0; i < 4; i++) pieces.push(part('fir', leaf, x, y + offset + height * (.36 + i * .16), z,
        height * (.23 - i * .044), height * .38, height * (.23 - i * .044), range(0, 6)));
    } else {
      const pine = species === 'stone-pine', low = species === 'common-juniper';
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 + x * .019, spread = height * (pine ? .20 : .13);
        pieces.push(part('crown', leaf, x + Math.cos(a) * spread, y + offset + height * (low ? .63 : .76) + i * height * .055,
          z + Math.sin(a) * spread, height * (pine ? .25 : .21), height * (pine ? .13 : .24), height * .21, a));
      }
      if (species === 'silver-birch') for (let i = 0; i < 3; i++) pieces.push(part('trunk', '#6e7466', x, y + offset + bole * (.2 + i * .23), z, r * .96, .09, r * .96));
    }
    // Consume the same random draws before omitting a whole tree, so reserving
    // a cottage does not move the surrounding woodland or shoreline erratics.
    const omitted = isReserved(x, z, height * .4);
    for (const piece of pieces) { piece.tree = true; piece.omitted = omitted; }
    if (omitted) return;
    const collider = { x, z, r, kind: 'tree' }; colliders.push(collider);
    pendingTrees.push({ descriptor: { id: worldTreeId('northern-alpine-'+profile.id, x, z), region: regionName,
      species, x, z, y, height, radius: r, base: { x, y: y + offset, z } }, pieces, collider });
  }

  const b = regionBounds;
  // Wind and altitude open the canopy gradually; groves occupy sheltered lower
  // slopes rather than forming a uniform band parallel to the map's hexes.
  for (let z0 = b.minZ + 4; z0 < b.maxZ; z0 += 11) { if (++buildWork % 32 === 0) yield; for (let x0 = b.minX + 4; x0 < b.maxX; x0 += 11) { if (++buildWork % 32 === 0) yield;
    const x = x0 + range(-4.2, 4.2), z = z0 + range(-4.2, 4.2);
    if (!owns(x, z) || waterAt(x, z) !== null) continue;
    const f = featuresAt(x, z);
    if (f.pathDistance < 5 || f.shoreDistance < 7 || f.grade > 1.15 || f.height < .9) continue;
    const cover = (['EF','ET'].includes(f.climate)?.08:profile.name==='Cudon'?.58:.65) * (.72+.28*Math.sin(x*.018+Math.sin(z*.023))*Math.cos(z*.025));
    const upper = Math.max(0, Math.min(1, (f.treeline + 30 - f.height) / 85));
    if (random() > cover * upper || f.snow > .3) continue;
    const edge = f.height > f.treeline - 45, v = random();
    const species = edge ? (v < .42 ? 'common-juniper' : 'stone-pine') : v < .47 ? 'silver-fir' : v < .74 ? 'silver-birch' : 'stone-pine';
    tree(x, z, species, species === 'common-juniper' ? range(2.1, 4.2) : range(9, 17) * (edge ? .64 : 1));
  } }

  for (let z0 = b.minZ + 2; z0 < b.maxZ; z0 += 8) { if (++buildWork % 32 === 0) yield; for (let x0 = b.minX + 2; x0 < b.maxX; x0 += 8) { if (++buildWork % 32 === 0) yield;
    const x = x0 + range(-3, 3), z = z0 + range(-3, 3);
    if (!owns(x, z) || waterAt(x, z) !== null) continue;
    const f = featuresAt(x, z), y = renderedGroundHeight(x, z);
    if (f.pathDistance < 3.5 || f.shoreDistance < 1.5 || f.height < .9) continue;
    const rockiness = Math.min(.72, .12 + f.rock * .42 + (f.shoreDistance < 14 ? .25 : 0));
    if (random() < rockiness && f.grade < 2.5) {
      const erratic = f.grade < .55 && random() < .035;
      const r = erratic ? range(1.7, 3.2) : range(.25, .95), h = erratic ? r * .8 : r * .48;
      // Buried, flattened scree chips stay walkable. Only substantial visible
      // boulders have small colliders, never invisible mountainside rectangles.
      const tint = f.snow > .6 ? '#b6bdb7' : random() < .5 ? '#858b85' : '#9b9d8e';
      const stone = part('stone', tint, x, y + h * .23, z, r, h, r * range(.65, 1.2), range(0, 6), range(-.2, .2));
      if (erratic && !isReserved(x, z, stone.radius)) colliders.push({ x, z, r: r * .68, minY: y - .4, maxY: y + h, kind: 'rock' });
      metrics.rocks++;
    }
    if (f.grade > .9 || f.snow > .7 || random() > .64) continue;
    const grass = f.height < f.treeline ? '#75895f' : '#999f7f';
    for (let j = 0; j < 3; j++) { if (++buildWork % 32 === 0) yield;
      const px = x + range(-.5, .5), pz = z + range(-.5, .5), h = range(.17, .55);
      part('blade', grass, px, renderedGroundHeight(px, pz) + h / 2 - .025, pz, .1, h, .065, range(0, 6), range(-.25, .25));
    }
    metrics.tufts++;
    if (f.height > f.treeline - 40 && f.height < f.treeline + 160 && random() < .22) {
      part('stone', random() < .5 ? '#9f8cbb' : '#ddcf8e', x + .22, y + .25, z, .12, .09, .12); metrics.flowers++;
    } else if (f.height < f.treeline && random() < .14) {
      part('crown', '#6e805f', x, y + .25, z, range(.4, .9), .4, .55, range(0, 6)); metrics.shrubs++;
    }
  } }
  for (const [key, batch] of batches) { if (++buildWork % 32 === 0) yield;
    batch.pieces = batch.pieces.filter(p => !p.omitted && (p.tree || !isReserved(p.x, p.z, p.radius)));
    if (!batch.pieces.length) continue;
    const mesh = new THREE.InstancedMesh(geometry[batch.type], material, batch.pieces.length);
    mesh.name = `${profile.name} ${key}`; mesh.castShadow = batch.type !== 'blade'; mesh.receiveShadow = true;
    yield* forEachBuild(batch.pieces, function* (p, index) { mesh.setMatrixAt(index, p.matrix); mesh.setColorAt(index, color.set(p.tint)); p.handle = { mesh, index }; });
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); root.add(mesh);
  }
  const trees = pendingTrees.map(t => registerWorldTree(colliders, t.descriptor, t.pieces.map(p => p.handle), t.collider));
  metrics.trees = trees.length; metrics.batches = batches.size;

  const waterRoot = new THREE.Group(); waterRoot.name = profile.name+' lakes and springs'; root.add(waterRoot);
  const waterMaterial = new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 } }]),
    vertexShader: `#include <fog_pars_vertex>
varying vec2 waterPoint;
void main(){waterPoint=position.xy;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `#include <fog_pars_fragment>
uniform float time;varying vec2 waterPoint;
void main(){float ripple=sin(waterPoint.x*.58+waterPoint.y*.83-time*.7)*sin(waterPoint.y*.49-waterPoint.x*.16+time*.4);
vec3 colour=vec3(.13,.34,.36)+vec3(.18,.22,.21)*pow(max(ripple,0.),12.);gl_FragColor=vec4(colour,1.);
#include <fog_fragment>
}`,
  });
  const waterMeshes = regionLakes.map(lake => {
    const shape = new THREE.Shape(lake.shore.map(p => new THREE.Vector2(p.x, -p.z)));
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), waterMaterial);
    mesh.name = lake.name; mesh.rotation.x = -Math.PI / 2; mesh.position.y = lake.surface;
    waterRoot.add(mesh); metrics.lakes++; return mesh;
  });
  const steam=[];
  for(const lake of regionLakes.filter(l=>l.thermal)){
    const mat=new THREE.MeshBasicMaterial({color:'#d9e7e0',transparent:true,opacity:.16,depthWrite:false});
    for(let i=0;i<7;i++){const puff=new THREE.Mesh(geometry.crown,mat);puff.position.set(lake.centre.x+Math.sin(i*2.4)*3,lake.surface+1+i*.8,lake.centre.z+Math.cos(i*2.4)*2);puff.scale.set(1.2+i*.18,.4+i*.12,1.2);waterRoot.add(puff);steam.push(puff);}
  }
  return { root, terrainRoot, waterRoot, waterMeshes, trees, metrics,
    renderedGroundHeight, update: time => { waterMaterial.uniforms.time.value = time;steam.forEach((p,i)=>{p.rotation.y=time*.12+i;p.position.y=regionLakes.find(l=>l.thermal).surface+1+(i*.8+time*.22)%6;}); } };
}
