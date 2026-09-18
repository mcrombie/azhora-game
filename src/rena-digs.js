/**
 * Lakota's pegs at the ruins of Rena (the finds themselves: src/archaeology.js).
 * Each place worth reading has a survey peg with a red ribbon and a patch of
 * scraped earth; once the traveler has written it up the ribbon is green. The
 * threshold slab with its three-toed track is drawn as well: it is too good to
 * leave to the imagination.
 */
import * as THREE from 'three';
import { RENA_FINDS, RENA_FIND_IDS } from './archaeology.js';

export const DIG_REACH = 2.2;

export function createRenaDigs(scene, world) {
  const group = new THREE.Group(); group.name = 'Rena digs'; scene.add(group);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .9, flatShading: true });
  const peg = mat(0x9b8360), earth = mat(0x6b5139), shale = mat(0x8a4b3c), groove = mat(0x3f231b);
  const ribbonOpen = mat(0xc0392b), ribbonDone = mat(0x4f8a3a);
  const sites = RENA_FIND_IDS.map(id => {
    const find = RENA_FINDS[id], y = world.heightAt(find.x, find.z);
    const scrape = new THREE.Mesh(new THREE.CylinderGeometry(.75, .85, .04, 10), earth); scrape.position.set(find.x, y + .02, find.z); group.add(scrape);
    const stake = new THREE.Mesh(new THREE.BoxGeometry(.05, .6, .05), peg); stake.position.set(find.x + .7, y + .3, find.z - .4); group.add(stake);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(.03, .16, .1), ribbonOpen); ribbon.position.set(find.x + .7, y + .55, find.z - .34); group.add(ribbon);
    if (id === 'track') {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, .12, .9), shale); slab.position.set(find.x, y + .06, find.z); group.add(slab);
      for (const toe of [-.4, 0, .4]) {
        const print = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, .22), groove);
        print.position.set(find.x + Math.sin(toe) * .12, y + .125, find.z + Math.cos(toe) * .12); print.rotation.y = toe; group.add(print);
      }
    }
    return { id, x: find.x, z: find.z, ribbon };
  });

  return {
    group,
    /** The pegged place the traveler is standing at, for the F prompt. */
    nearest(position, reach = DIG_REACH) {
      let best = null, gap = reach;
      for (const site of sites) { const d = Math.hypot(site.x - position.x, site.z - position.z); if (d <= gap) { gap = d; best = site; } }
      return best ? { id: best.id, x: best.x, z: best.z, name: RENA_FINDS[best.id].name } : null;
    },
    /** Green ribbons on the places already written up. */
    mark(found) { for (const site of sites) site.ribbon.material = found(site.id) ? ribbonDone : ribbonOpen; },
    sites: sites.map(({ id, x, z }) => ({ id, x, z })),
  };
}
