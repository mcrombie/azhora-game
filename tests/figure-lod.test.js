import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { FIGURE_LOD, alwaysInFull, figureDetail, standInLook, figureDrawCalls } from '../src/figure-lod.js';

/**
 * Measured in the renderer (npm run review:draws): figures are the largest cost where people
 * gather, and more than half of those drawn are over sixty metres off - 18 of 33 at the
 * Tidehaven landing, 18 of 31 on the field at the Lauvel, 14 of 26 in Lumber Town square - at
 * seventeen to twenty-four draw calls each, for somebody thirty pixels tall or less.
 */
const luminance = colour => .299 * ((colour >> 16) & 255) + .587 * ((colour >> 8) & 255) + .114 * (colour & 255);

test('somebody becomes a stand-in past 62 m and themselves again inside 56 m, and never flickers between', () => {
  assert.ok(FIGURE_LOD.out - FIGURE_LOD.in >= 5, 'the band is wider than anybody’s amble');
  let detail;
  for (let d = 40; d <= 62; d += .5) { detail = figureDetail(detail, d); assert.equal(detail, 'full', `a stand-in already at ${d} m`); }
  assert.equal(detail = figureDetail(detail, 62.5), 'stand-in');
  for (let d = 62; d >= 56; d -= .5) { detail = figureDetail(detail, d); assert.equal(detail, 'stand-in', `themselves again already at ${d} m`); }
  assert.equal(figureDetail(detail, 55.5), 'full');
  // Somebody pacing about on the line stays whatever they were, whichever that was.
  for (const was of ['full', 'stand-in']) {
    let now = was;
    for (let i = 0; i < 200; i++) { now = figureDetail(now, 59 + Math.sin(i * .7) * 2.4); assert.equal(now, was, `flickered to ${now} while pacing at ${(59 + Math.sin(i * .7) * 2.4).toFixed(1)} m`); }
  }
  assert.equal(figureDetail(undefined, Number.NaN), 'full', 'a distance nobody could measure is not a reason to stop drawing somebody');
  assert.equal(figureDetail('stand-in', Number.NaN), 'full');
});

test('the people the player is looking at are never stand-ins, however far off', () => {
  for (const flag of ['talking', 'escorting', 'fighting', 'fleeing', 'marked', 'ridden']) {
    assert.equal(alwaysInFull({ [flag]: true }), true, flag);
    assert.equal(figureDetail(undefined, 150, { [flag]: true }), 'full', `${flag} at 150 m`);
    assert.equal(figureDetail('stand-in', 150, { [flag]: true }), 'full', `${flag}, and already a stand-in`);
  }
  assert.equal(alwaysInFull({}), false);
  // Only people have one: a dog, a cat, a horse and an ogre stay as they are.
  for (const kind of ['dog', 'cat', 'horse', 'ogre']) assert.equal(figureDetail(undefined, 150, { kind }), 'full', kind);
  assert.equal(figureDetail(undefined, 150, { kind: 'person' }), 'stand-in');
});

test('a red tabard is still a red tabard at a distance', () => {
  const eren = standInLook({ tunic: 0x8f3b30, skin: 0xd7ad7e });
  const [legs, body, head] = eren.pieces;
  assert.deepEqual(eren.pieces.map(piece => piece.part), ['legs', 'body', 'head'], 'somebody’s silhouette, bottom to top');
  assert.equal(body.colour, 0x8f3b30, 'the body is the tunic, exactly');
  assert.equal(head.colour, 0xd7ad7e, 'the head is the skin');
  assert.ok(luminance(legs.colour) < luminance(body.colour), 'the legs are the tunic darkened');
  assert.equal(eren.castShadow, false, 'and nobody that far off casts a shadow');
  assert.ok(body.size[0] > head.size[0] && body.size[0] > legs.size[0], 'shoulders wider than head or legs');
  assert.ok(head.y + head.size[1] / 2 > 1.7 && head.y + head.size[1] / 2 < 1.8, 'about as tall as somebody');
  // Hair shows in the head; height and girth scale it as they scale the figure.
  assert.notEqual(standInLook({ skin: 0xd7ad7e, hair: 0x2a1c12 }).pieces[2].colour, 0xd7ad7e);
  const big = standInLook({ height: 1.1, girth: 1.12 });
  assert.ok(Math.abs(big.pieces[2].y / standInLook().pieces[2].y - 1.1) < 1e-9);
  assert.ok(Math.abs(big.pieces[1].size[0] / standInLook().pieces[1].size[0] - 1.12) < 1e-9);
  assert.deepEqual(standInLook({ height: Number.NaN, girth: -1 }).pieces[1].size, standInLook().pieces[1].size, 'nonsense sizes are ordinary sizes');
});

test('what it saves, on the field at the Lauvel as it was measured', () => {
  // Thirty-one drawn: eight within thirty metres (and so drawn twice), five more within sixty, eighteen beyond; seventeen meshes each.
  const lauvel = [...Array(8).fill({ distance: 20, meshes: 17 }), ...Array(5).fill({ distance: 45, meshes: 17 }), ...Array(18).fill({ distance: 110, meshes: 17 })];
  const now = figureDrawCalls(lauvel);
  assert.deepEqual(now, { drawn: 31, standIns: 18, full: 663, withStandIn: 375, saved: 288 });
  // Bringing the view range in as well: worth seventeen calls a head without the stand-in, and one with it.
  const near = figureDrawCalls(lauvel, { viewRange: 100 });
  assert.equal(now.full - near.full, 18 * 17, 'without the stand-in, a shorter view range is the whole figure saved');
  assert.equal(now.withStandIn - near.withStandIn, 18, 'with it, one call each: the stand-in has already taken the rest');
  // Somebody the player is being sent to stays in full, and is counted so.
  const sent = figureDrawCalls([{ distance: 110, meshes: 17, marked: true }, { distance: 110, meshes: 17 }]);
  assert.deepEqual([sent.standIns, sent.withStandIn], [1, 18]);
});

test('the stand-in is one mesh, in their colours, casting nothing, and two people dressed alike share it', async () => {
  const { createStandIn } = await sourceModule('../src/figure-stand-in.js');
  const eren = createStandIn({ tunic: 0x8f3b30, skin: 0xd7ad7e });
  let meshes = 0; eren.traverse(object => { if (object.isMesh) meshes++; });
  assert.equal(meshes, 1, 'one draw call');
  assert.equal(eren.castShadow, false);
  assert.equal(eren.geometry.attributes.position.count, 108, 'three boxes: thirty-six triangles');
  const colours = eren.geometry.attributes.color, seen = new Set();
  for (let i = 0; i < colours.count; i++) seen.add(`${colours.getX(i).toFixed(3)},${colours.getY(i).toFixed(3)},${colours.getZ(i).toFixed(3)}`);
  assert.equal(seen.size, 3, 'legs, body and head, each its own colour');
  eren.geometry.computeBoundingBox();
  const { min, max } = eren.geometry.boundingBox;
  assert.ok(min.y >= 0 && max.y > 1.7 && max.y < 1.8, `stands on the ground and is ${max.y.toFixed(2)} m tall`);
  const twin = createStandIn({ tunic: 0x8f3b30, skin: 0xd7ad7e }), other = createStandIn({ tunic: 0x2f5a63, skin: 0xd7ad7e });
  assert.equal(twin.geometry, eren.geometry, 'dressed alike, one geometry');
  assert.equal(twin.material, other.material, 'and everybody shares the one material');
  assert.notEqual(other.geometry, eren.geometry);
});
