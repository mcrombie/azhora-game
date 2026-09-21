import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';

const { createSigns, SIGN_LABELS, SIGN_COLOURS, labelPixels, labelMetres, signText, setSignReader } = await sourceModule('../src/signs.js');

/** The world's own toolkit, reduced to what signs use. */
function kit() {
  const materials = {}, colliders = [];
  const material = (color, extra = {}) => (materials[`${color}:${JSON.stringify(extra)}`] ||= new THREE.MeshStandardMaterial({ color, roughness: .93, ...extra }));
  const mesh = (geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent) => { const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const box = (mat, x, y, z, sx, sy, sz, parent) => mesh(cube, mat, x, y, z, sx, sy, sz, parent);
  return { material, mesh, box, colliders, groundFor: () => () => 2, pushFor: () => c => { colliders.push(c); return c; }, worldSpot: (parent, x, z) => ({ x, z }) };
}

test('one sign language: four shapes for four meanings, in the village’s woods, lettered on both faces, nothing glossy or emissive', () => {
  const tools = kit(), root = new THREE.Group(), signs = createSigns(tools);
  const made = {
    direction: signs.direction({ x: 0, z: 0, label: 'Lumber Town', toward: { x: 10, z: 0 }, back: { x: -10, z: 0 }, backLabel: 'Tidehaven', parent: root }),
    place: signs.place({ x: 10, z: 0, label: 'The Moros Gate', facing: 1, parent: root }),
    notice: signs.notice({ x: 20, z: 0, label: 'Closed by Elod', parent: root }),
    border: signs.border({ x: 30, z: 0, faces: [{ label: 'East Suval', paint: SIGN_COLOURS.paint.elod }, { label: 'Luscia', paint: SIGN_COLOURS.paint.luscia }], parent: root }),
    milestone: signs.milestone({ x: 40, z: 0, label: 'II', parent: root }),
  };
  for (const [kind, group] of Object.entries(made)) {
    let letters = 0;
    group.traverse(object => {
      if (!object.isMesh) return;
      const m = object.material;
      assert.ok(m.isMeshStandardMaterial, `${kind} uses the standard material`);
      assert.equal(m.metalness, 0, `${kind} is not metallic`);
      assert.ok(m.roughness >= .9, `${kind} is not glossy`);
      assert.ok(m.emissive.getHex() === 0 || m.emissiveIntensity === 0, `${kind} does not glow`);
      assert.equal(m.transparent, false, `${kind} batches with the static scenery`);
      if (object.name.startsWith('Lettering:')) letters++;
      for (const value of object.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    });
    assert.ok(letters >= 2, `${kind} is lettered on both faces`);
  }
  assert.equal(made.direction.children.filter(child => child.isGroup).length, 2, 'a fingerpost has a finger each way');
  assert.equal(signs.records.length, 5);
  assert.equal(tools.colliders.filter(c => c.kind === 'signpost').length, 3, 'posts are solid');
  // The finger points where it says: its local x runs toward the place.
  const finger = made.direction.children.find(child => child.isGroup), ahead = new THREE.Vector3(1, 0, 0).applyEuler(finger.rotation);
  assert.ok(ahead.x > .99, 'the upper finger points at its place');
  assert.throws(() => signs.place({ x: 0, z: 0, label: 'A place nobody lettered', parent: root }), /SIGN_LABELS/);
});

test('lettering is one height everywhere, and the board grows with the words rather than squeezing them', () => {
  assert.equal(new Set(SIGN_LABELS).size, SIGN_LABELS.length, 'each label has one cell');
  for (const label of SIGN_LABELS) {
    assert.ok(labelPixels(label) >= 40 && labelPixels(label) <= 492, label);
    assert.ok(labelMetres(label) > .2 && labelMetres(label) < 2.7, label);
  }
  assert.ok(labelMetres('The Charcoal Burners') > labelMetres('Elod'));
});

test('every sign in the world carries a known label, stands on solid posts, and signs the roads it serves', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const kinds = new Set(world.roadSigns.map(sign => sign.kind));
  for (const kind of ['direction', 'place', 'notice', 'border', 'milestone']) assert.ok(kinds.has(kind), `the world has a ${kind} sign`);
  for (const sign of world.roadSigns) {
    assert.ok(SIGN_LABELS.includes(sign.label), sign.label);
    if (sign.returnLabel) assert.ok(SIGN_LABELS.includes(sign.returnLabel), sign.returnLabel);
    if (sign.kind === 'place') assert.ok(world.colliders.some(c => c.kind === 'signpost' && Math.hypot(c.x - sign.x, c.z - sign.z) < labelMetres(sign.label) / 2 + .6), `${sign.label} stands on solid posts`);
    else assert.equal(canStand(sign.x, sign.z, world), false, `${sign.label} has collision`);
  }
  const borders = world.roadSigns.filter(sign => sign.kind === 'border');
  for (const pair of [['Tidehaven', 'Avrel'], ['Luscia', 'Moros Plain'], ['East Suval', 'Luscia']])
    assert.ok(borders.some(sign => sign.label === pair[0] && sign.returnLabel === pair[1]), `a border stone reads ${pair.join(' | ')}`);
  for (const label of ['The Avrel Clearing', 'The Caloss Bridge', 'The Army Camp', 'The Elodi Frontier', 'Elod'])
    assert.ok(world.roadSigns.some(sign => sign.kind === 'direction' && sign.label === label && sign.returnLabel), `${label} is signed both ways`);
  assert.equal(world.roadSigns.filter(sign => sign.label === 'Lumber Town' && sign.kind === 'place').length, 2, 'Lumber Town is named at both gates');
});

test('with nobody to ask, every sign letters in the traveler\u2019s own language', () => {
  // Normal mode is the whole game we ship and it is all in English (src/game-mode.js). The host
  // hands the world a reader only in hard mode, so this is what a normal-mode board says - and
  // it has to be the label itself, for every word the atlas carries and not just the first few.
  setSignReader(null);
  const changed = SIGN_LABELS.filter(label => signText(label) !== label);
  assert.deepEqual(changed, [], 'nothing is lettered in a tongue with no reader set');
  // And with a reader that can read nothing, the foreign boards come back - which is what proves
  // the line above is the gate doing its work and not the atlas being all English anyway.
  setSignReader(() => false);
  assert.ok(SIGN_LABELS.some(label => signText(label) !== label), 'a reader who has no tongues sees lettering he cannot read');
  setSignReader(null);
});
