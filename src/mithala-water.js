import * as THREE from 'three';
import { forEachBuild } from './build-each.js';
import { REGION_IDS } from './region-world.js';
import { MITHALA_RIVERS, MITHALA_MAIN, MITHALA_WEST_ARM, MITHALA_CELDER_WATER, WEST_BRAIDS, courseDistance } from './west-regions.js';
import { WEST_PROFILES, westWaterSurface, braidThreadOffset } from './west-ground.js';

export const MITHALA_WATER_REGIONS = Object.freeze([28, 29, 30, 31, REGION_IDS['North Celder']]);

/** The existing ribbons and deep-channel walls, without neighboring vegetation. */
export function* createMithalaWaterSteps({ root, colliders }) {
  let buildWork = 0;
  const group = new THREE.Group(); group.name = 'Mithala water'; root.add(group);
  const metrics = { water: 0, blockers: 0 };
  // -------------------------------------------------------------------------
  // The water: eight channels, two of them braided
  // -------------------------------------------------------------------------
  /**
   * Slow, brown-green, heavy with silt. This is a river that has carried the Oremindi down onto a
   * plain and is putting it there: "a deep dark accumulation of mountain sediment that makes the
   * Mithala the most productive grain land on the continent."
   */
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float time; varying vec3 p; void main(){float w=sin(p.x*.26-time*.95+p.z*.72)*sin(p.x*.11+p.z*.83);vec3 c=vec3(.31,.38,.33)+vec3(.16,.17,.13)*pow(max(w,0.),8.);gl_FragColor=vec4(c,1.);}',
  });
  /** A ribbon over a line of samples, broken wherever the ground rises through it. */
  function* ribbon(samples, name, halfOf = sample => sample.half) {
    let run = [];
    const flush = () => {
      if (run.length < 2) { run = []; return; }
      const vertices = [], indices = [];
      run.forEach((sample, index) => {
        const half = halfOf(sample);
        vertices.push(sample.x - sample.nx * half, sample.y, sample.z - sample.nz * half,
          sample.x + sample.nx * half, sample.y, sample.z + sample.nz * half);
        if (index) { const v = index * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const sheet = new THREE.Mesh(geometry, waterMaterial);
      sheet.name = name; group.add(sheet); metrics.water++;
      run = [];
    };
    for (const sample of samples) { if (++buildWork % 32 === 0) yield;
      const y = westWaterSurface(sample.x, sample.z);
      if (y === null) { flush(); continue; }
      run.push({ ...sample, y });
    }
    flush();
  }
  for (const course of MITHALA_RIVERS) { if (++buildWork % 32 === 0) yield; (yield* ribbon(WEST_PROFILES.get(course.id), course.name)); }

  /**
   * **The braided reaches, which are what this plain is famous for.** A thread leaves the main line
   * and comes back to it, so two run either side of the channel over the reach and a bar of silt
   * stands between each thread and the middle. `WEST_BRAIDS` carries the two - the main channel's
   * over almost its whole length and the north braid's over its lower half - and the threads are the
   * same geometry Vastos, the Flats and Eer already use.
   */
  const MITHALA_BRAIDS = WEST_BRAIDS.filter(item => item.id === 'mithala-main' || item.id === 'mithala-north-braid');
  const braidThreads = braid => [1, -1].map(side => WEST_PROFILES.get(braid.course.id).map(sample => {
    const offset = braidThreadOffset(braid, sample.along);
    if (offset === null) return null;
    return { ...sample, x: sample.x + sample.nx * offset * side, z: sample.z + sample.nz * offset * side };
  }).filter(Boolean));
  for (const braid of MITHALA_BRAIDS)
    { if (++buildWork % 32 === 0) yield; yield* forEachBuild(braidThreads(braid), function* (thread, index) { return (yield* ribbon(thread, `${braid.course.name} thread ${index + 1}`, () => braid.half)); }); }

  /**
   * **The main channel is a wall below its first third**, which is the house rule for a medium river
   * (the Isa, the Carica) and the reason South Mithala and East Mithala are different places. Its
   * ford is the gravel of the upper reach, where the two arms have only just come together and it is
   * not yet carrying what it carries below; from there to the sea nobody crosses it on foot. No other
   * channel on the plain is walled: a small river on ground this flat is waded anywhere.
   */
  for (const sample of WEST_PROFILES.get(MITHALA_MAIN.id)) { if (++buildWork % 32 === 0) yield;
    if (sample.ford) continue;
    const step = Math.max(1, Math.round(sample.half / 3.2)), radius = sample.half / (step + .5) + 1.4;
    for (let k = -step; k <= step; k++) { if (++buildWork % 32 === 0) yield;
      const offset = sample.half * (k / (step + .5));
      colliders.push({ x: sample.x + sample.nx * offset, z: sample.z + sample.nz * offset, r: radius, kind: 'west-deep-water' });
      metrics.blockers++;
    }
  }

  return { group, metrics, update(time) { waterMaterial.uniforms.time.value = time; } };
}

// Only the two displayed, shallow Celder-border arms gain runtime swimming.
// Keep the other western channels' existing barrier and storyline behavior.
const ARMS = [MITHALA_WEST_ARM, MITHALA_CELDER_WATER];
export function celderBorderWaterSurface(x, z) {
  for (const course of ARMS) {
    const b = course.bounds, pad = course.maxHalf;
    if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
    if (courseDistance(course, x, z, pad) < pad) return westWaterSurface(x, z);
  }
  return null;
}
