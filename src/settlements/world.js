import * as THREE from 'three';
import { toWorld } from '../world-scale.js';
import { canStand } from '../game-state.js';
import { createCharacter } from '../characters.js';
import { PILOT_SITES } from './canon.js';

export const HOUSE_OFFSETS = Object.freeze([{ x: -9, z: -7 }, { x: 9, z: -7 }, { x: -9, z: 9 }, { x: 9, z: 9 }]);
export function residentPoint(site, index) { const h = HOUSE_OFFSETS[Math.floor(index / 3)]; return { x: site.x + h.x + (index % 3 - 1) * 2.1, z: site.z + h.z + 4.5 }; }
/** Reject occupied or wet land; never delete authored trees, colliders, buildings, or paths. */
export function validSettlementSite(world, p, occupied = []) {
  if (world.regionAt(p.x, p.z)?.name !== 'Feradom' || occupied.some(s => Math.hypot(p.x - s.x, p.z - s.z) < 65)) return false;
  if ((world.landmarks ?? []).some(s => Math.hypot(p.x - s.x, p.z - s.z) < 32)) return false;
  if ((world.paths ?? []).some(path => {
    const points = path.points ?? path;
    return points.some((b, i) => {
      const a = points[Math.max(0, i - 1)], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) < 23;
    });
  })) return false;
  const h = world.heightAt(p.x, p.z);
  if (!Number.isFinite(h)) return false;
  for (let x = -14; x <= 14; x += 2) for (let z = -12; z <= 16; z += 2) {
    const px = p.x + x, pz = p.z + z, y = world.heightAt(px, pz);
    if (!canStand(px, pz, world, 1.1, y) || Math.abs(y - h) > 1.1 || world.regionAt(px, pz)?.name !== 'Feradom') return false;
  }
  return true;
}
export function* surveySettlementSites(world) {
  const sites = [];
  for (const spec of PILOT_SITES) {
    const origin = toWorld(spec.anchor.x, spec.anchor.z); let found;
    for (let radius = 0; radius <= 260 && !found; radius += 12) {
      const n = radius ? Math.ceil(2 * Math.PI * radius / 12) : 1;
      for (let i = 0; i < n && !found; i++) {
        const p = { x: origin.x + Math.cos(i / n * Math.PI * 2) * radius, z: origin.z + Math.sin(i / n * Math.PI * 2) * radius };
        if (validSettlementSite(world, p, sites)) found = { ...spec, ...p, y: world.heightAt(p.x, p.z) };
        yield;
      }
    }
    if (!found) throw new Error(`No vacant traversable site found for ${spec.name}; this pilot must be re-surveyed.`);
    sites.push(found);
  }
  return sites;
}
export function locateSettlementSites(world) { const survey = surveySettlementSites(world); let step; do { step = survey.next(); } while (!step.done); return step.value; }
export async function surveySettlements(world, { budgetMs = 4, schedule = requestAnimationFrame } = {}) {
  const survey = surveySettlementSites(world);
  return new Promise((resolve, reject) => {
    function slice() {
      try {
        const deadline = performance.now() + budgetMs;
        do { const step = survey.next(); if (step.done) return resolve(step.value); } while (performance.now() < deadline);
        schedule(slice);
      } catch (e) { reject(e); }
    }
    schedule(slice);
  });
}
export function createSettlementScenery({ scene, world, sites }) {
  const group = new THREE.Group(); group.name = 'feradom-living-settlements'; scene.add(group);
  const actors = new Map(), addedColliders = [], landmarks = [];
  const timber = new THREE.MeshLambertMaterial({ color: 0x927248 }), roof = new THREE.MeshLambertMaterial({ color: 0x5d4c38 }), stone = new THREE.MeshLambertMaterial({ color: 0x8a8376 });
  for (const s of sites) {
    const village = new THREE.Group(); village.name = s.id; group.add(village);
    for (const [i, offset] of HOUSE_OFFSETS.entries()) {
      const x = s.x + offset.x, z = s.z + offset.z, y = world.heightAt(x, z);
      const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 3.5, 4), timber); walls.position.set(x, y + 1.75, z); walls.castShadow = true; village.add(walls);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0, 4, 2.8, 4), roof); top.rotation.y = Math.PI / 4; top.scale.z = .85; top.position.set(x, y + 4.2, z); top.castShadow = true; village.add(top);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.25), roof); door.position.set(x, y + 1.13, z + 2.01); village.add(door);
      const collider = { id: `${s.id}-house-${i + 1}`, kind: 'settlement-house', x, z, hx: 2.5, hz: 2, minY: y, maxY: y + 6 }; world.colliders.push(collider); addedColliders.push(collider);
    }
    const hearth = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, .3, 9), stone); hearth.position.set(s.x, world.heightAt(s.x, s.z) + .15, s.z); village.add(hearth);
    const marker = { id: s.id, name: s.name, description: s.description, x: s.x, z: s.z, region: 21, kind: 'settlement' }; world.landmarks.push(marker); landmarks.push(marker);
  }
  world.reindexColliders();
  function update(communities, player, time) {
    let made = 0;
    for (const s of communities) {
      const site = sites.find(p => p.id === s.id); if (!site) continue;
      const near = Math.hypot(site.x - player.x, site.z - player.z) < 100;
      for (const [i, resident] of s.residents.entries()) {
        let npc = actors.get(resident.id);
        if (!npc && near && resident.present && made < 2) {
          const actor = createCharacter({ look: { blankSlate: true } }); scene.add(actor.group);
          npc = { id: resident.id, actor, region: 21, name: resident.name, role: resident.occupation, speech: 'feradom' }; actors.set(resident.id, npc); made++;
        }
        if (!npc) continue;
        npc.name = resident.name; npc.role = resident.occupation; npc.actor.group.visible = near && resident.present;
        const p = residentPoint(site, i); npc.actor.group.position.set(p.x, world.heightAt(p.x, p.z), p.z); npc.actor.group.rotation.y = Math.PI;
        if (npc.actor.group.visible) npc.actor.animate(time, 0, false);
      }
    }
  }
  function nearby(player) { return [...actors.values()].filter(n => n.actor.group.visible && Math.hypot(player.x - n.actor.group.position.x, player.z - n.actor.group.position.z) < 3.3).sort((a, b) => a.actor.group.position.distanceToSquared(player) - b.actor.group.position.distanceToSquared(player))[0] ?? null; }
  return { sites, actors, update, nearby, dispose() {
    for (const n of actors.values()) scene.remove(n.actor.group); scene.remove(group);
    for (const c of addedColliders) { const i = world.colliders.indexOf(c); if (i >= 0) world.colliders.splice(i, 1); }
    for (const p of landmarks) { const i = world.landmarks.indexOf(p); if (i >= 0) world.landmarks.splice(i, 1); }
    world.reindexColliders();
    group.traverse(o => o.geometry?.dispose()); for (const m of [timber, roof, stone]) m.dispose();
  } };
}
