import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createLaketownResident} from './laketown-characters.js';
import {LAKETOWN_FISHING as SITE} from './laketown-waterfront-layout.js';

export const LAKETOWN_FISHING_PHASES = Object.freeze([
  Object.freeze({id: 'departing', seconds: 22}), Object.freeze({id: 'fishing', seconds: 24}),
  Object.freeze({id: 'returning', seconds: 22}), Object.freeze({id: 'unloading', seconds: 14}),
]);
export const LAKETOWN_FISHING_PERIOD = LAKETOWN_FISHING_PHASES.reduce((sum, phase) => sum + phase.seconds, 0);
const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));
const smooth = value => {const t = clamp(value); return t * t * (3 - 2 * t);};
const turn = (from, to, t) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * t;
const lengths = SITE.route.slice(1).map((p, i) => Math.hypot(p.x - SITE.route[i].x, p.z - SITE.route[i].z));
const routeLength = lengths.reduce((sum, length) => sum + length, 0);
function routeAt(fraction) {
  let distance = clamp(fraction) * routeLength;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const a = SITE.route[i], b = SITE.route[i + 1], t = clamp(distance / lengths[i]);
      return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t};
    }
    distance -= lengths[i];
  }
  return {...SITE.berth};
}
function headingAt(fraction) {
  const before = routeAt(fraction - .045), after = routeAt(fraction + .045);
  return Math.atan2(after.x - before.x, after.z - before.z);
}

/** Pure, periodic presentation. Positions stay on the surveyed water segments;
 * only heading is rounded at a bend, so a spline cannot cut across the shore. */
export function laketownFishingPose(elapsed = 0) {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  let phaseTime = time % LAKETOWN_FISHING_PERIOD, phase;
  for (const candidate of LAKETOWN_FISHING_PHASES) {
    phase = candidate;
    if (phaseTime < candidate.seconds) break;
    phaseTime -= candidate.seconds;
  }
  const progress = phaseTime / phase.seconds, moving = phase.id === 'departing' || phase.id === 'returning';
  const returning = phase.id === 'returning';
  const fraction = moving ? (returning ? 1 - smooth(progress) : smooth(progress)) : phase.id === 'fishing' ? 1 : 0;
  let yaw = headingAt(fraction);
  if (phase.id === 'fishing') yaw = turn(yaw, yaw + Math.PI, smooth((progress - .82) / .18));
  if (returning) {
    yaw += Math.PI;
    // Swing in open water, then back the last few metres into the berth.
    yaw = turn(yaw, SITE.berth.yaw, smooth((progress - .64) / .2));
  }
  if (phase.id === 'unloading') yaw = SITE.berth.yaw;
  const rowing = moving && progress > .025 && progress < .98;
  return {...routeAt(fraction), y: SITE.surface, yaw, phase: phase.id, phaseTime, progress,
    cycles: Math.floor(time / LAKETOWN_FISHING_PERIOD), moving, rowing, backing: returning && progress > .84,
    caught: phase.id === 'fishing' && progress > .5 || returning || phase.id === 'unloading' && progress < .68};
}

const WOOD = '#69503c', EDGE = '#b39b72', PLANK = '#978167', IRON = '#414b46', ROPE = '#aa9c74';

/** One local working boat. No harvest, population or campaign state is inferred
 * from this scene. Clock ownership stays with the caller's pause-aware dt. */
export function createLaketownFishing(parent, world) {
  const root = new THREE.Group(); root.name = 'Laketown fishing / working skiff'; parent.add(root);
  const vessel = new THREE.Group(); vessel.name = 'Forest Tarn fishing skiff'; root.add(vessel);
  const ownedGeometry = new Set(), ownedMaterials = new Set();
  let sceneryMaterial = null;
  function batch(name, target, build) {
    const b = createSceneryBuilder(name); build(b);
    const mesh = b.finish(target, {castShadow: false});
    if (!sceneryMaterial) {sceneryMaterial = mesh.material.clone(); ownedMaterials.add(sceneryMaterial);}
    mesh.material = sceneryMaterial; ownedGeometry.add(mesh.geometry); return mesh;
  }
  batch('Fishing skiff / clinker hull, ribs and rowing thwart', vessel, b => {
    const stations = [[-2.2, .08], [-1.6, .56], [-.65, .76], [.65, .76], [1.6, .5], [2.2, .035]];
    for (let i = 1; i < stations.length; i++) {
      const [az, aw] = stations[i - 1], [bz, bw] = stations[i];
      for (const side of [-1, 1]) {
        for (let strake = 0; strake < 3; strake++) {
          const lo = strake / 3, hi = (strake + 1) / 3;
          b.sheet(strake % 2 ? '#806047' : WOOD,
            [side * aw * (.48 + .52 * lo), -.28 + lo * .7, az], [side * bw * (.48 + .52 * lo), -.28 + lo * .7, bz],
            [side * bw * (.48 + .52 * hi), -.28 + hi * .7, bz], [side * aw * (.48 + .52 * hi), -.28 + hi * .7, az]);
        }
        b.beam(EDGE, [side * aw, .44, az], [side * bw, .44, bz], .065);
      }
      b.quad(PLANK, [-aw * .65, .035, az], [-bw * .65, .035, bz], [bw * .65, .035, bz], [aw * .65, .035, az]);
    }
    b.beam(WOOD, [0, -.3, -2.12], [0, -.3, 2.12], .1);
    for (const z of [-1.45, -.55, .5, 1.4]) {
      const width = Math.abs(z) > 1 ? .48 : .69;
      b.beam(EDGE, [-width, .29, z], [-width * .62, .06, z], .055);
      b.beam(EDGE, [width * .62, .06, z], [width, .29, z], .055);
    }
    b.box(EDGE, 0, .4, -.35, 1.42, .11, .34);
    b.box(PLANK, 0, .25, 1.3, .8, .09, .4);
    for (const side of [-1, 1]) b.box(IRON, side * .72, .48, -.45, .09, .13, .13);
    // Woven fish basket, spare line and a carved stern cleat.
    b.cylinder('#796542', -.25, .045, .8, .26, .35);
    for (let i = 0; i < 5; i++) b.cylinder(ROPE, -.25, .1 + i * .065, .8, .27, .02);
    b.box(WOOD, 0, .49, -1.9, .27, .08, .07);
  });
  const oars = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.name = side < 0 ? 'Port working sweep' : 'Starboard working sweep';
    pivot.position.set(side * .69, .5, -.45); vessel.add(pivot);
    batch(pivot.name, pivot, b => {
      b.beam(EDGE, [-.53, 0, 0], [1.53, 0, 0], .045);
      b.box(PLANK, 1.34, 0, 0, .53, .038, .16);
      b.box(WOOD, -.43, 0, 0, .26, .07, .07);
    });
    return {pivot, side};
  });
  const net = new THREE.Group(); net.name = 'Fisherman / hauled dip net'; vessel.add(net);
  batch('Hazel net frame and knotted mesh', net, b => {
    b.beam(EDGE, [0, 0, 0], [0, .72, 0], .055);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, c = (i + 1) * Math.PI / 4;
      const p = [Math.cos(a) * .38, -.08, Math.sin(a) * .38], q = [Math.cos(c) * .38, -.08, Math.sin(c) * .38];
      b.beam(WOOD, p, q, .028); b.beam(ROPE, p, [0, -.53, 0], .013);
      b.beam(ROPE, [p[0] * .55, -.3, p[2] * .55], [q[0] * .55, -.3, q[2] * .55], .013);
    }
  });
  const catchGroup = new THREE.Group(); catchGroup.name = 'Forest Tarn / small fresh catch'; vessel.add(catchGroup);
  batch('Silver fish in the basket', catchGroup, b => {
    for (let i = 0; i < 3; i++) {
      const x = -.35 + i * .1, z = .75 + (i % 2) * .1;
      b.rock(i % 2 ? '#a8b7ad' : '#839d96', x, .4, z, .065, .035, .19, i * .5);
      b.box('#718980', x, .4, z - .15, .13, .025, .08, i * .5);
    }
  });
  const handBasket = new THREE.Group(); handBasket.name = 'Fisherman / unloading basket'; vessel.add(handBasket);
  batch('Small wicker unloading creel', handBasket, b => {
    b.cylinder('#8c7853', 0, 0, 0, .2, .28);
    for (let i = 0; i < 4; i++) b.cylinder(ROPE, 0, .035 + i * .075, 0, .21, .02);
    b.beam(ROPE, [-.16, .27, 0], [-.1, .43, 0], .025);
    b.beam(ROPE, [-.1, .43, 0], [.1, .43, 0], .025);
    b.beam(ROPE, [.1, .43, 0], [.16, .27, 0], .025);
  });
  const fisherman = createLaketownResident({species: 'human', variant: 9, occupation: 'fisherman', gender: 'male'});
  fisherman.group.name = 'Laketown / working fisherman'; vessel.add(fisherman.group);
  const wakeGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.55, .015, -1.8), new THREE.Vector3(-1.1, .015, -4.3),
    new THREE.Vector3(.55, .015, -1.8), new THREE.Vector3(1.1, .015, -4.3),
  ]);
  const wakeMaterial = new THREE.LineBasicMaterial({color: '#a3c3b5', transparent: true, opacity: .25, depthWrite: false});
  ownedGeometry.add(wakeGeometry); ownedMaterials.add(wakeMaterial);
  const wake = new THREE.LineSegments(wakeGeometry, wakeMaterial); wake.name = 'Small skiff wake'; root.add(wake);
  let clock = 0, current = laketownFishingPose(), disposed = false, updates = 0, lastPainted = -1;
  const rig = fisherman.rig;
  let actorDraws = 0;
  fisherman.group.traverse(object => {
    if (!object.isMesh) return;
    for (let at = object; at && at !== fisherman.group; at = at.parent) if (!at.visible) return;
    actorDraws++;
  });

  function paint() {
    const p = current, stroke = Math.sin(clock * 2.2) * (p.backing ? -1 : 1);
    root.position.set(p.x, p.y, p.z); root.rotation.y = p.yaw;
    vessel.position.y = .025 + Math.sin(clock * 1.2) * .025;
    vessel.rotation.z = Math.sin(clock * .8) * .014; vessel.rotation.x = Math.sin(clock * .97) * .009;
    wake.visible = p.rowing && !p.backing; catchGroup.visible = p.caught;
    for (const {pivot, side} of oars) {
      pivot.rotation.set(0, side < 0 ? Math.PI : 0, 0);
      pivot.rotation.y += p.rowing ? side * stroke * .34 : side * Math.PI / 2;
      pivot.rotation.z = p.rowing ? side * (-.19 + Math.max(0, Math.cos(clock * 2.2)) * .3) : 0;
    }
    const fishing = p.phase === 'fishing', unloading = p.phase === 'unloading';
    const stand = fishing ? smooth(p.phaseTime / 1.8) : unloading
      ? Math.min(smooth(p.phaseTime / 1.8), smooth((LAKETOWN_FISHING_PHASES[3].seconds - p.phaseTime) / 1.8))
      : p.phase === 'returning' ? 1 - smooth(p.phaseTime / 1.8) : 0;
    const haul = .5 - .5 * Math.cos(p.phaseTime * Math.PI / 3.7);
    fisherman.animate(clock, 0, {});
    fisherman.group.position.set(0, -.34 + stand * .39, -.35);
    fisherman.group.rotation.y = fishing ? turn(Math.PI, Math.PI / 2, stand) : unloading ? turn(Math.PI, -Math.PI / 2, stand)
      : p.phase === 'returning' ? turn(Math.PI / 2, Math.PI, 1 - stand) : Math.PI;
    if (rig) {
      if (rig.body) {rig.body.rotation.x = p.rowing ? stroke * .065 : stand * .07; rig.body.position.y = 0;}
      for (let i = 0; i < 2; i++) {
        const side = i ? 1 : -1;
        if (rig.hips?.[i]) rig.hips[i].rotation.x = -(1 - stand) * Math.PI / 2;
        if (rig.knees?.[i]) rig.knees[i].rotation.x = (1 - stand) * Math.PI / 2;
        if (rig.ankles?.[i]) rig.ankles[i].rotation.x = 0;
        if (rig.shoulders?.[i]) {
          rig.shoulders[i].rotation.x = fishing ? -.7 - haul * .45 : unloading ? -.9 - Math.sin(p.phaseTime * .8) * .2 : -.72 + stroke * .23;
          rig.shoulders[i].rotation.z = side * (p.rowing ? .3 : .12);
        }
        if (rig.elbows?.[i]) rig.elbows[i].rotation.x = fishing ? -.75 : unloading ? -.85 : -.55 - stroke * .2;
      }
    }
    net.visible = fishing; net.position.set(1.03, -.2 + haul * 1.12, -.35); net.rotation.z = -.18 + haul * .2;
    handBasket.visible = unloading && p.progress > .14 && p.progress < .75;
    handBasket.position.set(-.45 - Math.sin(p.phaseTime * .8) * .12, .62 + Math.sin(p.phaseTime * .8) * .1, -.35);
    handBasket.rotation.z = -.15 - Math.max(0, Math.sin(p.phaseTime * .8)) * .3;
    lastPainted = clock; updates++;
  }
  root.visible = false; paint();
  return {
    update(_time, dt, point) {
      if (disposed) return;
      if (Number.isFinite(dt) && dt > 0) {clock += dt; current = laketownFishingPose(clock);}
      root.visible = !!point && world.loading?.isReady?.(38) !== false
        && Math.hypot(point.x - current.x, point.z - current.z) < 165;
      if (root.visible && lastPainted !== clock) paint();
    },
    state: () => ({...current, clock, visible: !disposed && root.visible, fishermanVisible: !disposed && root.visible && fisherman.group.visible,
      netVisible: !disposed && root.visible && net.visible, updates, disposed, routeLength,
      drawCalls: 1 + oars.length + Number(net.visible) + Number(catchGroup.visible) + Number(handBasket.visible) + Number(wake.visible)
        + actorDraws}),
    dispose() {
      if (disposed) return; disposed = true;
      fisherman.dispose(); root.removeFromParent();
      for (const geometry of ownedGeometry) geometry.dispose();
      for (const material of ownedMaterials) material.dispose();
    },
  };
}
