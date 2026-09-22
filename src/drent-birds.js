/**
 * The birds of Azhora that the traveler can learn to see: a pair of cardinals on Tidehaven's
 * western fences, a wren on the barrels east of the square, woodpeckers down the Greenway,
 * gulls at the landing, and a hummingbird that comes only to the feeder in Perrin's garden -
 * and, since the user's ruling of 21 September 2026, nine kinds that are not in Drent at all.
 * Goldfinches, doves, bluebirds and a mockingbird are across the Caloss in Luscia's farm
 * country; crows and vultures are out on the Moros Plain; titmice and a kingfisher want the
 * lake country; the chickadees are up in Amod's terraces. The village used to hold eleven
 * habitats in sixty metres of street, so a traveler could fill the whole list without leaving
 * the parish; it holds five now, and the list is a journey. Each kind has its own model (body, head and wings, instanced per kind)
 * and its own habits: songbirds hop and peck and fly up to a fence post, crows
 * walk, the hummingbird darts in, hovers at the feeder and darts away. All of them
 * keep their distance from the traveler. Birds are scenery: they never block.
 */
import * as THREE from 'three';
import { canStand } from './game-state.js';
import { villageToWorld } from './region-world.js';
import { BIRD_SPECIES } from './birding.js';

const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const smoothstep = t => t * t * (3 - 2 * t);

// ---------------------------------------------------------------------------
// Shapes: every part is drawn once at the bird's display size (a little larger
// than life so they read at a distance), facing +z, feet on y = 0.
// ---------------------------------------------------------------------------
function mergedGeometry(pieces) {
  const vertices = [], normals = [], colors = [], m = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [source, color, position, scale, rotation = [0, 0, 0]] of pieces) {
    q.setFromEuler(e.set(...rotation)); m.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...scale));
    nm.getNormalMatrix(m); const tint = new THREE.Color(color), geometry = source.index ? source.toNonIndexed() : source;
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      p.fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(m); vertices.push(p.x, p.y, p.z);
      n.fromBufferAttribute(geometry.attributes.normal, i).applyMatrix3(nm).normalize(); normals.push(n.x, n.y, n.z);
      colors.push(tint.r, tint.g, tint.b);
    }
    if (geometry !== source) geometry.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.computeBoundingSphere(); return result;
}

const HALF_PI = Math.PI / 2;

/**
 * Where each kind's parts join, in its own model metres: the neck the head turns
 * on, the shoulder the right wing hangs from (the left mirrors it), how far the
 * folded wing droops, and the wing's span for flight.
 */
export const BIRD_FORMS = Object.freeze({
  'cardinal-male': Object.freeze({ neck: [0, .165, .07], shoulder: [.05, .145, .04], droop: .38, flap: 30, gait: 'hop', scale: 1 }),
  'cardinal-female': Object.freeze({ neck: [0, .165, .07], shoulder: [.05, .145, .04], droop: .38, flap: 30, gait: 'hop', scale: 1 }),
  wren: Object.freeze({ neck: [0, .14, .05], shoulder: [.042, .125, .03], droop: .3, flap: 34, gait: 'hop', scale: 1 }),
  titmouse: Object.freeze({ neck: [0, .137, .055], shoulder: [.043, .12, .03], droop: .32, flap: 32, gait: 'hop', scale: 1 }),
  crow: Object.freeze({ neck: [0, .325, .15], shoulder: [.085, .265, .06], droop: .3, flap: 13, gait: 'walk', scale: .95 }),
  hummingbird: Object.freeze({ neck: [0, .012, .04], shoulder: [.017, .012, .012], droop: .5, flap: 58, gait: 'hover', scale: 1 }),
  // The rest are built to the common plan, so their joints are the common plan's,
  // scaled to the size each one is actually drawn at.
  ...Object.fromEntries(Object.entries({
    robin: [1.05, 'hop', 28], chickadee: [.72, 'hop', 40], mockingbird: [1.1, 'hop', 26],
    'mourning-dove': [1.12, 'walk', 22], 'blue-jay': [1.25, 'hop', 22], goldfinch: [.78, 'hop', 38],
    catbird: [1, 'hop', 28], 'downy-woodpecker': [.8, 'hop', 34], 'red-bellied-woodpecker': [1.05, 'hop', 26],
    'pileated-woodpecker': [1.55, 'hop', 17], nuthatch: [.78, 'hop', 36], 'wood-thrush': [1.05, 'hop', 27],
    bluebird: [.9, 'hop', 32], 'red-winged-blackbird': [1, 'hop', 27], kingfisher: [1.1, 'hop', 25],
  }).map(([id, [size, gait, flap]]) => [id, Object.freeze({
    neck: [0, .165 * size, .07 * size], shoulder: [.05 * size, .145 * size, .04 * size], droop: .36, flap, gait, scale: 1,
  })])),
  // The four that are not built to it at all.
  'barred-owl': Object.freeze({ neck: [0, .3, .015], shoulder: [.088, .235, .015], droop: .26, flap: 12, gait: 'hop', scale: 1 }),
  heron: Object.freeze({ neck: [0, .8, .01], shoulder: [.082, .55, 0], droop: .24, flap: 9, gait: 'walk', scale: 1 }),
  'mallard-drake': Object.freeze({ neck: [0, .185, .055], shoulder: [.068, .14, -.01], droop: .3, flap: 18, gait: 'walk', scale: 1 }),
  'mallard-duck': Object.freeze({ neck: [0, .185, .055], shoulder: [.068, .14, -.01], droop: .3, flap: 18, gait: 'walk', scale: 1 }),
  gull: Object.freeze({ neck: [0, .235, .045], shoulder: [.07, .19, -.005], droop: .3, flap: 15, gait: 'walk', scale: 1 }),
  'turkey-vulture': Object.freeze({ neck: [0, .4, .055], shoulder: [.115, .3, 0], droop: .24, flap: 8, gait: 'walk', scale: 1 }),
});

function birdShapes() {
  const round = new THREE.IcosahedronGeometry(1, 1), cone = new THREE.ConeGeometry(1, 1, 7), cyl = new THREE.CylinderGeometry(1, 1, 1, 6), cube = new THREE.BoxGeometry(1, 1, 1);
  const S = (c, p, s, r) => [round, c, p, s, r], C = (c, p, s, r) => [cone, c, p, s, r], Y = (c, p, s, r) => [cyl, c, p, s, r], B = (c, p, s, r) => [cube, c, p, s, r];
  const both = fn => [fn(1), fn(-1)];
  const legs = (c, x, top, z, thick = .006) => both(side => [Y(c, [side * x, top / 2, z], [thick, top, thick]), B(c, [side * x, .004, z + .016], [thick * 2.2, .008, .04])]).flat();

  // A cardinal: long red body and tail, a pointed crest, black mask, thick coral-orange bill. The hen is buff-brown with red at the edges.
  function cardinal(t) {
    return {
      body: mergedGeometry([
        S(t.body, [0, .115, -.005], [.062, .066, .1], [-.3, 0, 0]), S(t.breast, [0, .11, .045], [.055, .06, .058]),
        S(t.belly, [0, .08, 0], [.05, .045, .07]), S(t.back, [0, .132, -.065], [.05, .04, .065], [-.3, 0, 0]),
        S(t.tail, [0, .072, -.165], [.03, .011, .088], [-.45, 0, 0]), S(t.tail, [0, .08, -.125], [.026, .016, .045], [-.45, 0, 0]),
        ...legs(0xa77b6b, .02, .05, .012),
      ]),
      head: mergedGeometry([
        S(t.body, [0, .02, .01], [.045, .045, .048]), C(t.crest, [0, .076, -.014], [.024, .075, .03], [-.55, 0, 0]),
        S(t.mask, [0, .012, .036], [.035, .031, .022]), C(t.bill, [0, .01, .072], [.02, .044, .017], [HALF_PI, 0, 0]),
        S(0x0d0b0b, [.03, .026, .03], [.006, .006, .006]), S(0x0d0b0b, [-.03, .026, .03], [.006, .006, .006]),
      ]),
      wing: mergedGeometry([S(t.wing, [.07, 0, 0], [.075, .01, .046]), S(t.primaries, [.132, 0, -.004], [.046, .008, .03])]),
    };
  }
  // A wren: small, round and rusty, with a white brow, a long thin bill turned down, and a tail cocked straight up.
  const wren = {
    body: mergedGeometry([
      S(0x94552b, [0, .1, -.005], [.052, .055, .075], [-.15, 0, 0]), S(0xd6a266, [0, .086, .026], [.045, .043, .052]),
      S(0x7f4724, [0, .117, -.05], [.041, .036, .042]), S(0x7d4a26, [0, .165, -.093], [.022, .009, .058], [1.1, 0, 0]),
      S(0x4f3019, [0, .19, -.104], [.023, .01, .009], [1.1, 0, 0]), S(0x4f3019, [0, .168, -.094], [.023, .01, .009], [1.1, 0, 0]),
      ...legs(0xc79a7e, .018, .06, .012, .005),
    ]),
    head: mergedGeometry([
      S(0x94552b, [0, .012, .008], [.037, .036, .04]), S(0xe7c89c, [0, -.008, .026], [.028, .022, .022]),
      ...both(side => S(0xf3eee2, [side * .027, .026, .01], [.012, .008, .032], [0, side * .22, 0])),
      ...both(side => S(0x3b2616, [side * .031, .012, .016], [.008, .008, .024])),
      ...both(side => S(0x0b0907, [side * .034, .017, .022], [.006, .006, .006])),
      C(0x3c3128, [0, .002, .062], [.008, .046, .008], [HALF_PI + .22, 0, 0]),
    ]),
    wing: mergedGeometry([S(0x86502a, [.05, 0, 0], [.05, .008, .03]), S(0x5f3a20, [.088, 0, 0], [.03, .006, .022]), S(0x4a2d18, [.03, .004, .012], [.028, .004, .006])]),
  };
  // A tufted titmouse: soft grey above, white below, peach flanks, a grey crest, a black spot over a stubby bill, big dark eyes.
  const titmouse = {
    body: mergedGeometry([
      S(0x8a929b, [0, .095, -.005], [.05, .055, .078], [-.2, 0, 0]), S(0xebe9e3, [0, .081, .03], [.044, .045, .05]),
      ...both(side => S(0xe0986a, [side * .03, .075, .004], [.021, .03, .046])),
      S(0x7b828b, [0, .079, -.128], [.026, .012, .066], [-.25, 0, 0]),
      ...legs(0x5d6670, .018, .045, .012, .005),
    ]),
    head: mergedGeometry([
      S(0x8a929b, [0, .018, .008], [.04, .04, .043]), C(0x858d96, [0, .067, -.014], [.022, .058, .026], [-.55, 0, 0]),
      S(0xdcdcd8, [0, .002, .03], [.03, .024, .02]), S(0x141416, [0, .024, .043], [.016, .013, .01]),
      ...both(side => S(0x0a0a0c, [side * .03, .02, .028], [.009, .01, .009])),
      C(0x2c2c2e, [0, .012, .056], [.009, .02, .009], [HALF_PI, 0, 0]),
    ]),
    wing: mergedGeometry([S(0x7f8790, [.05, 0, 0], [.052, .008, .032]), S(0x656c74, [.09, 0, -.004], [.03, .006, .022])]),
  };
  // A crow: big and black all over, a glossy back, a heavy bill, long legs for walking, a fan of a tail.
  const crow = {
    body: mergedGeometry([
      S(0x1a1a1f, [0, .2, -.01], [.1, .105, .19], [-.32, 0, 0]), S(0x202027, [0, .215, .085], [.09, .095, .09]),
      S(0x2c3140, [0, .255, -.03], [.075, .05, .13], [-.32, 0, 0]), S(0x16161a, [0, .125, -.255], [.058, .015, .13], [-.5, 0, 0]),
      ...legs(0x121214, .035, .11, .02, .013),
    ]),
    head: mergedGeometry([
      S(0x1b1b20, [0, .01, .02], [.074, .072, .084]), S(0x23232a, [0, .025, .078], [.038, .032, .034]),
      C(0x111113, [0, -.002, .13], [.032, .09, .024], [HALF_PI + .05, 0, 0]),
      ...both(side => S(0x3a2a1a, [side * .05, .022, .052], [.01, .01, .01])),
    ]),
    wing: mergedGeometry([S(0x1d1e25, [.12, 0, 0], [.13, .014, .08]), S(0x131419, [.245, 0, -.01], [.085, .01, .05])]),
  };
  // A ruby-throated hummingbird: green back, pale belly, a ruby gorget, a needle of a bill, narrow blurring wings. Drawn about its own centre.
  const hummingbird = {
    body: mergedGeometry([
      S(0x3f8a4c, [0, 0, 0], [.022, .022, .045]), S(0xe4e6dc, [0, -.009, .006], [.019, .016, .034]),
      ...both(side => S(0x93a486, [side * .012, -.006, 0], [.01, .012, .03])),
      S(0x2a3a2c, [0, -.002, -.06], [.016, .004, .028]),
    ]),
    head: mergedGeometry([
      S(0x3a8446, [0, .008, .012], [.018, .018, .02]), S(0xb0142f, [0, -.008, .02], [.015, .012, .014]),
      ...both(side => S(0x0a0a0a, [side * .015, .012, .02], [.004, .004, .004])),
      C(0x161616, [0, .005, .06], [.0035, .062, .0035], [HALF_PI, 0, 0]),
    ]),
    wing: mergedGeometry([S(0x6f7c74, [.046, 0, 0], [.046, .003, .013])]),
  };

  /**
   * The rest of this country's perching birds are built to one plan and given
   * their own size, proportions, colours and whatever they wear on the head: a
   * cap, a bib, a mask, a crest, an eye-ring, a necklace. It is the same bird
   * underneath, which is true of the real ones as well.
   */
  function perching(t, p = {}) {
    const s = p.size ?? 1, tail = (p.tail ?? 1) * s, tip = p.tailUp ?? -.45;
    const billLen = (p.billLen ?? .044) * s, billThick = (p.billThick ?? .02) * s;
    const body = [
      S(t.body, [0, .115 * s, -.005 * s], [.062 * s, .066 * s, .1 * s * (p.slim ?? 1)], [-.3, 0, 0]),
      S(t.breast, [0, .11 * s, .045 * s], [.055 * s, .06 * s, .058 * s]),
      S(t.belly ?? t.breast, [0, .08 * s, 0], [.05 * s, .045 * s, .07 * s]),
      S(t.back, [0, .132 * s, -.065 * s], [.05 * s, .04 * s, .065 * s], [-.3, 0, 0]),
      S(t.tail, [0, .072 * s, -.165 * tail], [.03 * s, .011 * s, .088 * tail], [tip, 0, 0]),
      S(t.tail, [0, .08 * s, -.125 * tail], [.026 * s, .016 * s, .045 * tail], [tip, 0, 0]),
      ...legs(t.leg ?? 0xa77b6b, .02 * s, (p.legs ?? .05) * s, .012 * s, .006 * s),
    ];
    // Bars across the back, as the ladder-backed woodpeckers wear them.
    if (p.bars) for (let i = 0; i < 4; i++) body.push(S(p.bars, [0, (.148 - i * .012) * s, (-.02 - i * .028) * s], [.046 * s, .006 * s, .008 * s], [-.3, 0, 0]));
    // Round black spots down a white breast: the thrush, and nothing else here.
    if (p.spots) for (let i = 0; i < 12; i++) body.push(S(p.spots, [((i % 4) - 1.5) * .022 * s, (.132 - Math.floor(i / 4) * .026) * s, .064 * s], [.011 * s, .011 * s, .007 * s]));
    if (p.shoulder) body.push(...both(side => S(p.shoulder, [side * .05 * s, .132 * s, .016 * s], [.02 * s, .013 * s, .032 * s])));
    if (p.shoulderEdge) body.push(...both(side => S(p.shoulderEdge, [side * .05 * s, .124 * s, .034 * s], [.018 * s, .01 * s, .012 * s])));

    const head = [S(t.head ?? t.body, [0, .02 * s, .01 * s], [.045 * s, .045 * s, .048 * s])];
    if (p.cap) head.push(S(p.cap, [0, .042 * s, .002 * s], [.042 * s, .026 * s, .046 * s]));
    if (p.nape) head.push(S(p.nape, [0, .03 * s, -.03 * s], [.032 * s, .026 * s, .026 * s]));
    if (p.cheek) head.push(...both(side => S(p.cheek, [side * .032 * s, .012 * s, .016 * s], [.016 * s, .018 * s, .03 * s])));
    if (p.brow) head.push(...both(side => S(p.brow, [side * .027 * s, .034 * s, .012 * s], [.012 * s, .008 * s, .034 * s], [0, side * .22, 0])));
    if (p.mask) head.push(...both(side => S(p.mask, [side * .028 * s, .02 * s, .026 * s], [.016 * s, .014 * s, .024 * s])));
    if (p.bib) head.push(S(p.bib, [0, -.016 * s, .034 * s], [.026 * s, .022 * s, .022 * s]));
    if (p.necklace) head.push(S(p.necklace, [0, -.026 * s, .022 * s], [.042 * s, .012 * s, .034 * s]));
    if (p.crest) head.push(C(p.crestColor ?? t.body, [0, (.055 + p.crest * .5) * s, -.014 * s], [.024 * s, p.crest * s, .03 * s], [p.crestBack ?? -.55, 0, 0]));
    if (p.eyering) head.push(...both(side => S(p.eyering, [side * .03 * s, .026 * s, .03 * s], [.011 * s, .011 * s, .009 * s])));
    head.push(...both(side => S(0x0d0b0b, [side * .03 * s, .026 * s, .031 * s], [.007 * s, .007 * s, .007 * s])));
    head.push(C(t.bill, [0, .01 * s, .05 * s + billLen], [billThick, billLen * 2, billThick * .85], [HALF_PI + (p.billTilt ?? 0), 0, 0]));

    const wing = [S(t.wing, [.07 * s, 0, 0], [.075 * s, .01 * s, .046 * s]), S(t.primaries ?? t.wing, [.132 * s, 0, -.004 * s], [.046 * s, .008 * s, .03 * s])];
    if (p.wingBar) wing.push(S(p.wingBar, [.1 * s, .006 * s, -.012 * s], [.03 * s, .004 * s, .012 * s]));
    if (p.wingPatch) wing.push(S(p.wingPatch, [.055 * s, .006 * s, -.018 * s], [.026 * s, .005 * s, .016 * s]));
    return { body: mergedGeometry(body), head: mergedGeometry(head), wing: mergedGeometry(wing) };
  }

  // A barred owl: a round head with no ear tufts, a pale disc round black eyes,
  // an upright streaked body, and feathered legs that hardly show.
  function owl(t) {
    return {
      body: mergedGeometry([
        S(t.body, [0, .175, -.01], [.105, .135, .105], [-.08, 0, 0]), S(t.breast, [0, .155, .06], [.09, .11, .06]),
        ...Array.from({ length: 6 }, (_, i) => S(t.streak, [((i % 3) - 1) * .042, .2 - Math.floor(i / 3) * .05, .085], [.01, .03, .008])),
        S(t.back, [0, .26, -.055], [.085, .06, .07], [-.2, 0, 0]),
        S(t.tail, [0, .06, -.115], [.042, .014, .085], [-.2, 0, 0]),
        ...legs(t.leg, .028, .045, .01, .011),
      ]),
      head: mergedGeometry([
        S(t.body, [0, .035, 0], [.086, .082, .078]),
        ...both(side => S(t.disc, [side * .036, .03, .054], [.038, .044, .022])),
        ...both(side => S(0x0c0a0a, [side * .034, .036, .068], [.019, .019, .012])),
        C(t.bill, [0, .002, .07], [.013, .036, .013], [HALF_PI + .35, 0, 0]),
      ]),
      wing: mergedGeometry([S(t.wing, [.105, 0, 0], [.115, .014, .08]), S(t.primaries, [.21, 0, -.008], [.075, .01, .055])]),
    };
  }

  // A heron: long legs, a long neck carried in an S, a dagger of a bill, and a
  // plume off the back of the head. Drawn standing in the shallows.
  function heron(t) {
    return {
      body: mergedGeometry([
        S(t.body, [0, .52, -.02], [.09, .105, .2], [-.12, 0, 0]), S(t.breast, [0, .49, .07], [.075, .09, .08]),
        S(t.back, [0, .59, -.08], [.075, .05, .16], [-.12, 0, 0]),
        S(t.tail, [0, .5, -.22], [.05, .016, .1], [-.18, 0, 0]),
        S(t.neck, [0, .64, .03], [.028, .06, .032]), S(t.neck, [0, .73, .01], [.026, .06, .028]),
        ...legs(t.leg, .03, .46, .01, .009),
      ]),
      head: mergedGeometry([
        S(t.head, [0, .01, .01], [.03, .03, .05]),
        S(t.crown, [0, .03, -.005], [.026, .016, .04]),
        S(t.plume, [0, .028, -.05], [.008, .007, .05], [.25, 0, 0]),
        ...both(side => S(0x1a1a16, [side * .02, .016, .028], [.006, .006, .006])),
        C(t.bill, [0, .004, .12], [.014, .14, .012], [HALF_PI, 0, 0]),
      ]),
      wing: mergedGeometry([S(t.wing, [.13, 0, 0], [.14, .016, .105]), S(t.primaries, [.27, 0, -.01], [.1, .012, .07])]),
    };
  }

  // A duck: a boat of a body low to the ground, a flat bill, short legs set back.
  function duck(t) {
    return {
      body: mergedGeometry([
        S(t.body, [0, .115, -.01], [.085, .075, .175], [-.06, 0, 0]), S(t.breast, [0, .115, .075], [.075, .07, .07]),
        S(t.back, [0, .16, -.03], [.07, .04, .13], [-.06, 0, 0]),
        S(t.tail, [0, .15, -.19], [.04, .018, .07], [.25, 0, 0]),
        ...(t.curl ? [S(t.curl, [0, .175, -.2], [.012, .016, .022], [.6, 0, 0])] : []),
        ...legs(t.leg, .03, .045, -.02, .009),
      ]),
      head: mergedGeometry([
        S(t.head, [0, .03, .01], [.048, .05, .055]), S(t.head, [0, 0, 0], [.036, .04, .04]),
        ...(t.collar ? [S(t.collar, [0, -.022, .004], [.038, .012, .042])] : []),
        ...both(side => S(0x0c0a0a, [side * .034, .042, .03], [.007, .007, .007])),
        S(t.bill, [0, .018, .078], [.024, .012, .05]), S(t.bill, [0, .016, .105], [.02, .009, .018]),
      ]),
      wing: mergedGeometry([S(t.wing, [.09, 0, -.01], [.1, .012, .07]), S(t.primaries, [.185, 0, -.02], [.07, .009, .045]),
        ...(t.speculum ? [S(t.speculum, [.075, .008, -.03], [.03, .005, .018])] : [])]),
    };
  }

  // A gull: white, grey-winged, standing tall on dark legs, hooded in summer,
  // with a heavy red bill it is not shy about using.
  function gull(t) {
    return {
      body: mergedGeometry([
        S(t.body, [0, .175, -.01], [.075, .08, .15], [-.14, 0, 0]), S(t.breast, [0, .17, .06], [.065, .07, .065]),
        S(t.back, [0, .215, -.045], [.062, .04, .11], [-.14, 0, 0]),
        S(t.tail, [0, .155, -.165], [.042, .014, .075], [-.2, 0, 0]),
        ...legs(t.leg, .026, .095, .005, .009),
      ]),
      head: mergedGeometry([
        S(t.hood, [0, .025, .012], [.044, .044, .05]),
        ...both(side => S(t.eyeArc, [side * .03, .036, .028], [.012, .008, .016])),
        ...both(side => S(0x0b0a0a, [side * .03, .03, .032], [.007, .007, .007])),
        S(t.bill, [0, .006, .066], [.014, .013, .04]), S(t.billTip, [0, .002, .096], [.012, .011, .014]),
      ]),
      wing: mergedGeometry([S(t.wing, [.11, 0, -.005], [.125, .013, .07]), S(t.primaries, [.235, 0, -.02], [.09, .01, .04])]),
    };
  }

  // A turkey vulture: a heavy black body, a small bare red head on a bare neck,
  // and a wing far too big for the field it is standing in.
  function vulture(t) {
    return {
      body: mergedGeometry([
        S(t.body, [0, .25, -.02], [.125, .13, .225], [-.2, 0, 0]), S(t.breast, [0, .235, .085], [.105, .11, .095]),
        S(t.back, [0, .32, -.06], [.1, .06, .16], [-.2, 0, 0]),
        S(t.tail, [0, .18, -.29], [.07, .018, .145], [-.3, 0, 0]),
        S(t.neck, [0, .35, .06], [.035, .05, .038]),
        ...legs(t.leg, .04, .105, .015, .014),
      ]),
      head: mergedGeometry([
        S(t.head, [0, .012, .015], [.036, .038, .042]), S(t.head, [0, -.02, .006], [.028, .03, .03]),
        ...both(side => S(0x0e0c0c, [side * .026, .022, .03], [.007, .007, .007])),
        C(t.bill, [0, .004, .058], [.016, .05, .016], [HALF_PI + .1, 0, 0]),
        S(t.billTip, [0, .002, .078], [.012, .012, .014]),
      ]),
      wing: mergedGeometry([S(t.wing, [.17, 0, 0], [.185, .018, .125]), S(t.primaries, [.36, 0, -.015], [.14, .012, .075]),
        ...Array.from({ length: 5 }, (_, i) => S(t.primaries, [.44 + i * .012, 0, -.055 + i * .028], [.05, .01, .014]))]),
    };
  }

  const shapes = {
    'cardinal-male': cardinal({ body: 0xc8201e, breast: 0xd62a22, belly: 0xb81d1d, back: 0xa51b1a, tail: 0x8e1716, crest: 0xcc2320, mask: 0x120d0d, bill: 0xf0743c, wing: 0x9e1a19, primaries: 0x7f1514 }),
    'cardinal-female': cardinal({ body: 0xb0906f, breast: 0xc4a07c, belly: 0xc9ad8b, back: 0x9c8264, tail: 0xa2453a, crest: 0xa8553f, mask: 0x4a3d36, bill: 0xe77a45, wing: 0x9a5c46, primaries: 0xa6483a }),
    wren, titmouse, crow, hummingbird,
    // The rest of this country's common birds.
    robin: perching({ body: 0x625c52, back: 0x57524a, breast: 0xbf5420, belly: 0xdcd6c9, tail: 0x494640,
      wing: 0x5d574f, primaries: 0x474440, bill: 0xe3b23a, leg: 0x5c4a3a }, { size: 1.12, legs: .062, eyering: 0xf0ece2 }),
    chickadee: perching({ body: 0x8e9196, back: 0x82868c, breast: 0xf1eee6, belly: 0xe6d9c4, tail: 0x74787e,
      wing: 0x878b91, primaries: 0x6d7177, bill: 0x1d1c1c, leg: 0x4c4f53 }, { size: .72, legs: .042, cap: 0x18171a, cheek: 0xf5f2ea, bib: 0x1a1a1c }),
    mockingbird: perching({ body: 0x9a9992, back: 0x8b8a83, breast: 0xdedbd2, belly: 0xe7e4db, tail: 0x5f5e59,
      wing: 0x7e7d77, primaries: 0x53524e, bill: 0x2a2826, leg: 0x5f5c56 }, { size: 1.1, tail: 1.5, legs: .07, wingPatch: 0xf2f0e9 }),
    'mourning-dove': perching({ body: 0xb09a80, back: 0xa08a71, breast: 0xc9b298, belly: 0xd6c4ab, tail: 0x8f7c66,
      wing: 0xa4907a, primaries: 0x7d6c58, bill: 0x2b2724, leg: 0xbd6f63 }, { size: 1.12, tail: 1.7, slim: 1.06, legs: .05, cap: 0xa8907a }),
    'blue-jay': perching({ body: 0x3f74b8, back: 0x35659f, breast: 0xdfe3e8, belly: 0xeceff2, tail: 0x2f5d94,
      wing: 0x3c6fae, primaries: 0x27507f, bill: 0x1c1c1e, leg: 0x3b3a38 }, { size: 1.25, legs: .06, crest: .07, crestColor: 0x3a6cab, necklace: 0x16181c, wingBar: 0xf3f5f7 }),
    goldfinch: perching({ body: 0xdcc32a, back: 0xd3ba25, breast: 0xefe04a, belly: 0xf2e86a, tail: 0x1d1c1a,
      wing: 0x1f1e1c, primaries: 0x131312, bill: 0xe8934a, leg: 0xc79a6a }, { size: .78, legs: .042, cap: 0x141414, wingBar: 0xf2efe6 }),
    catbird: perching({ body: 0x5a5a5e, back: 0x525257, breast: 0x66666a, belly: 0x616165, tail: 0x2e2e31,
      wing: 0x545458, primaries: 0x3d3d41, bill: 0x1b1b1d, leg: 0x36363a }, { size: 1, tail: 1.35, legs: .055, cap: 0x1a1a1c }),
    'downy-woodpecker': perching({ body: 0x1e1d1c, back: 0x232220, breast: 0xf3f0e8, belly: 0xeceae1, tail: 0x1a1918,
      wing: 0x232220, primaries: 0x161514, bill: 0x3a3936, leg: 0x4a4844 }, { size: .8, legs: .04, tail: .8, tailUp: -.2, bars: 0xf2efe7, nape: 0xc4362c, brow: 0xf4f1e9, billLen: .03 }),
    'red-bellied-woodpecker': perching({ body: 0x2a2926, back: 0x2c2b28, breast: 0xd9d3c4, belly: 0xd2c9b4, tail: 0x24231f,
      wing: 0x2c2b28, primaries: 0x1b1a18, bill: 0x2e2d2a, leg: 0x504d47 }, { size: 1.05, legs: .045, tail: .85, tailUp: -.2, bars: 0xf0ede3, cap: 0xc23c2c, nape: 0xc23c2c, billLen: .05 }),
    'pileated-woodpecker': perching({ body: 0x191817, back: 0x1d1c1a, breast: 0x201f1d, belly: 0x1a1918, tail: 0x141312,
      wing: 0x1e1d1b, primaries: 0x121110, bill: 0x33322e, leg: 0x3f3d39 }, { size: 1.55, legs: .06, tail: .9, tailUp: -.2, crest: .085, crestColor: 0xc02a20, cheek: 0xf1eee5, brow: 0xf1eee5, billLen: .06 }),
    nuthatch: perching({ body: 0x8c99a6, back: 0x7f8c99, breast: 0xf2efe7, belly: 0xe9e4d8, tail: 0x5d6772,
      wing: 0x86939f, primaries: 0x67727d, bill: 0x26262a, leg: 0x5a5751 }, { size: .78, legs: .04, tail: .55, cap: 0x16161a, billLen: .05 }),
    'wood-thrush': perching({ body: 0x9e6b3e, back: 0x8d5e35, breast: 0xf0ece1, belly: 0xeae5d8, tail: 0x7c5330,
      wing: 0x94643a, primaries: 0x74502e, bill: 0x3a3733, leg: 0xc0a884 }, { size: .92, legs: .058, spots: 0x2a2724, nape: 0xa9703f, eyering: 0xf1eee6 }),
    bluebird: perching({ body: 0x3f63b0, back: 0x3859a0, breast: 0xb4612f, belly: 0xe6e2d6, tail: 0x33518f,
      wing: 0x3d60aa, primaries: 0x2c4c85, bill: 0x1f1f21, leg: 0x3a3936 }, { size: .9, legs: .05 }),
    'red-winged-blackbird': perching({ body: 0x141416, back: 0x18181a, breast: 0x161618, belly: 0x141416, tail: 0x0f0f11,
      wing: 0x171719, primaries: 0x101012, bill: 0x232326, leg: 0x2a2a2d }, { size: 1, legs: .055, shoulder: 0xb8261f, shoulderEdge: 0xe0b83a }),
    kingfisher: perching({ body: 0x5b7f97, back: 0x4e7189, breast: 0xf0efe9, belly: 0xe9e7de, tail: 0x466578,
      wing: 0x557a92, primaries: 0x3f5f73, bill: 0x1e1e20, leg: 0x4e4b46 }, { size: 1.1, legs: .035, tail: .7, crest: .055, crestColor: 0x4e7189, crestBack: -.15, necklace: 0x5b7f97, billLen: .075, billThick: .017 }),
    'barred-owl': owl({ body: 0x8d7c63, breast: 0xe8e0cf, streak: 0x6b5a45, back: 0x7d6d56, tail: 0x6f6049,
      disc: 0xdfd6c2, bill: 0xd8c37a, leg: 0xb6a88e, wing: 0x84745c, primaries: 0x5f5241 }),
    heron: heron({ body: 0x8d99a4, breast: 0xc3cbd2, back: 0x7f8b97, tail: 0x6f7b87, neck: 0xb6bcc0, head: 0xd9dde0,
      crown: 0xe8ebec, plume: 0x1b1d20, bill: 0xd8c25a, leg: 0x4a4b46, wing: 0x7b8793, primaries: 0x515b66 }),
    'mallard-drake': duck({ body: 0x8e8677, breast: 0x7a4a33, back: 0x9b9384, tail: 0xf0ede4, head: 0x1e6b4a,
      collar: 0xf2efe6, bill: 0xd9c04a, leg: 0xd97b3c, wing: 0x8a8273, primaries: 0x6d6659, speculum: 0x3a4fa0, curl: 0x1a1a1a }),
    'mallard-duck': duck({ body: 0x9a8461, breast: 0xb49a72, back: 0x8a755a, tail: 0xa89570, head: 0x9c8763,
      bill: 0xb08a4a, leg: 0xd97b3c, wing: 0x93805f, primaries: 0x76664c, speculum: 0x3a4fa0 }),
    gull: gull({ body: 0xf2f1ec, breast: 0xf5f4ef, back: 0x9aa3a8, tail: 0xf0efe9, hood: 0x2a2a2e, eyeArc: 0xf2f1ec,
      bill: 0xa8322c, billTip: 0xc0392f, leg: 0x2f2f33, wing: 0x97a0a6, primaries: 0x2b2b2e }),
    'turkey-vulture': vulture({ body: 0x2a2521, breast: 0x241f1c, back: 0x322b26, tail: 0x1e1a17, neck: 0x8a4a3a,
      head: 0xb4564a, bill: 0xe4dcc8, billTip: 0xd8cfb8, leg: 0xb8a894, wing: 0x2e2823, primaries: 0x1b1714 }),
  };
  round.dispose(); cone.dispose(); cyl.dispose(); cube.dispose();
  return shapes;
}

export const createBirdShapes = birdShapes;

// The right wing's span runs along its +x. Folded, the span lies back along the body
// and the flat of the wing faces out; in flight it rises and falls about the body's
// long axis. The left wing is the same basis mirrored across x.
const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function wingBasis(target, side, flying, flap, droop) {
  if (!flying) {
    const s = Math.sin(droop), c = Math.cos(droop);
    X.set(0, -s, -c); Y.set(side, 0, 0); Z.set(0, -c, s);
  } else {
    const cs = Math.cos(flap), sn = Math.sin(flap);
    X.set(side * cs, sn, 0); Y.set(-side * sn, cs, 0); Z.set(0, 0, 1);
  }
  return target.makeBasis(X, Y, Z);
}

/**
 * The world matrices of a bird's body, head and two wings for its current action.
 * `bird` needs x, y, z, yaw, action, clock, species (and lift); `form` is its
 * BIRD_FORMS entry. Writes into `out` (from `birdPartMatrices.buffers()`).
 */
export function birdPartMatrices(bird, form, { index = 0, shown = true } = {}, out = birdPartMatrices.buffers()) {
  const { root, tmp, part, q, v, euler } = out.scratch;
  q.setFromAxisAngle(UP, bird.yaw); v.set(bird.x, bird.y + (bird.lift || 0), bird.z);
  root.compose(v, q, shown ? out.scratch.one.setScalar(form.scale ?? 1) : out.scratch.zero);
  const hover = form.gait === 'hover', flying = hover || bird.action === 'flight';
  const singing = bird.action === 'sing', pecking = bird.action === 'peck' ? Math.max(0, Math.sin(bird.clock * (bird.species === 'crow' ? 3.2 : 5.5))) : 0;
  // The body tips forward to peck and in flight, bobs as a wren does, and stands up to hover.
  const bob = bird.species === 'wren' && !flying ? Math.sin(bird.clock * 9) * .06 * (bird.action === 'look' ? 1 : .3) : 0;
  const pitch = hover ? (bird.action === 'sip' ? -.75 : -.95) : flying ? .12 : pecking * .35 + bob + (singing ? -.25 : 0);
  out.body.copy(root).multiply(tmp.makeRotationX(pitch));
  const look = bird.action === 'look' ? Math.sin(bird.clock * 2.1 + index) * .7 : bird.action === 'back' ? Math.sin(bird.clock * 3) * .4 : 0;
  const walkBob = bird.action === 'walk' ? Math.sin(bird.clock * 11) * .018 : 0;
  euler.set(pecking + (singing ? -.55 : 0) - (hover ? pitch * .6 : 0), look, 0);
  part.makeRotationFromEuler(euler).setPosition(form.neck[0], form.neck[1], form.neck[2] + walkBob);
  out.head.copy(out.body).multiply(part);
  const flap = hover ? Math.sin(bird.clock * form.flap) * .95 : .15 + Math.sin(bird.clock * form.flap) * .9;
  [1, -1].forEach((side, k) => {
    wingBasis(part, side, flying, flap, form.droop).setPosition(side * form.shoulder[0], form.shoulder[1], form.shoulder[2]);
    out.wings[k].copy(out.body).multiply(part);
  });
  return out;
}
birdPartMatrices.buffers = () => ({
  body: new THREE.Matrix4(), head: new THREE.Matrix4(), wings: [new THREE.Matrix4(), new THREE.Matrix4()],
  scratch: { root: new THREE.Matrix4(), tmp: new THREE.Matrix4(), part: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(),
    euler: new THREE.Euler(), one: new THREE.Vector3(1, 1, 1), zero: new THREE.Vector3(1e-4, 1e-4, 1e-4) },
});

// ---------------------------------------------------------------------------
// Where they live, in Tidehaven's local metres (the village's own frame). Perches
// are the tops of real things in the village: fence posts and a barrel.
// ---------------------------------------------------------------------------
function fencePosts(x, z, length, rotation, top = 1.32) {
  const posts = [];
  for (let f = -length / 2; f <= length / 2 + .1; f += 1.35) posts.push({ x: x + f * Math.cos(rotation), z: z - f * Math.sin(rotation), base: { x, z }, top });
  return posts;
}

/** Perches in the world's own metres: branch height about a wood or a bank. */
function branches(x, z, count, radius, top = 2.6) {
  const perches = [];
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996;
    perches.push({ x: x + Math.sin(a) * radius, z: z + Math.cos(a) * radius, base: { x, z }, top: top + (i % 3) * .5 });
  }
  return perches;
}

/**
 * Where each kind lives. The first four are authored in Tidehaven's local metres,
 * as the village is; everything past them is out in the country and is authored
 * in world metres, which is what `world: true` means.
 */
export const BIRD_HABITATS = Object.freeze([
  { id: 'west-fences', species: 'cardinal', birds: ['cardinal-male', 'cardinal-female'], center: { x: -23.5, z: 2.5 }, radius: 5.5,
    perches: [...fencePosts(-23, 5, 6, -.12), ...fencePosts(-26.5, 1, 7, .12 + Math.PI / 2)] },
  { id: 'east-barrels', species: 'wren', birds: ['wren'], center: { x: 20, z: 1 }, radius: 4.2,
    perches: [{ x: 19, z: 2, base: { x: 19, z: 2 }, top: .843 }, ...fencePosts(23, -9, 6, -.08)] },
  // Tidehaven, in the village's own metres.
  { id: 'green-robins', species: 'robin', birds: ['robin', 'robin'], center: { x: -6, z: 18 }, radius: 6, perches: [] },
  { id: 'wood-edge-jays', species: 'blue-jay', birds: ['blue-jay', 'blue-jay'], center: { x: 13, z: -34 }, radius: 6,
    perches: fencePosts(13, -32, 5, -.08) },
  { id: 'bramble-catbird', species: 'catbird', birds: ['catbird'], center: { x: 25, z: -7 }, radius: 4, perches: [] },

  // The Greenway wood, the pond, the river, the fields and the shore: world metres.
  { id: 'greenway-downy', species: 'downy-woodpecker', birds: ['downy-woodpecker', 'downy-woodpecker'], world: true,
    center: { x: -78, z: 33 }, radius: 7, perches: branches(-78, 33, 5, 5, 2.4) },
  { id: 'greenway-redbelly', species: 'red-bellied-woodpecker', birds: ['red-bellied-woodpecker'], world: true,
    center: { x: -104, z: 24 }, radius: 7, perches: branches(-104, 24, 4, 5.5, 3.1) },
  { id: 'greenway-nuthatch', species: 'nuthatch', birds: ['nuthatch', 'nuthatch'], world: true,
    center: { x: -92, z: 40 }, radius: 6, perches: branches(-92, 40, 5, 4.5, 2.2) },
  { id: 'greenway-thrush', species: 'wood-thrush', birds: ['wood-thrush', 'wood-thrush'], world: true,
    center: { x: -120, z: 22 }, radius: 8, perches: branches(-120, 22, 4, 6, 2) },
  { id: 'greenway-pileated', species: 'pileated-woodpecker', birds: ['pileated-woodpecker'], world: true,
    center: { x: -138, z: 36 }, radius: 8, perches: branches(-138, 36, 4, 5, 3.6) },
  { id: 'greenway-owl', species: 'barred-owl', birds: ['barred-owl'], world: true,
    center: { x: -146, z: 40 }, radius: 7, perches: branches(-146, 40, 3, 4.5, 3.4) },
  { id: 'willowmere-reeds', species: 'red-winged-blackbird', birds: ['red-winged-blackbird', 'red-winged-blackbird'], world: true,
    center: { x: -92, z: 16 }, radius: 6, perches: branches(-92, 16, 4, 4.5, 1.5) },
  { id: 'willowmere-shallows', species: 'heron', birds: ['heron'], world: true,
    center: { x: -99, z: 18 }, radius: 7, perches: [] },
  { id: 'willowmere-ducks', species: 'mallard', birds: ['mallard-drake', 'mallard-duck', 'mallard-duck'], world: true,
    center: { x: -95, z: 5 }, radius: 6, perches: [] },

  // **Out of Drent.** Nine kinds used to be findable inside the first country, most of them
  // inside the village itself: eleven habitats in sixty metres of street meant a traveler on
  // his first morning could not walk anywhere without a bird in front of him, and the whole
  // list could be filled without leaving the parish. These nine now live where they belong,
  // and the country they are in is checked by `tests/drent-birds.test.js` rather than assumed.
  //
  // Luscia, the farm country across the Caloss: open field birds and the birds of a town.
  { id: 'reedcutter-thistles', species: 'goldfinch', birds: ['goldfinch', 'goldfinch'], world: true,
    center: { x: -660, z: 200 }, radius: 5, perches: [] },
  // On the edge of Lumber Town rather than in its square: the square has people standing in it,
  // and a bird's foraging ground may not be somebody's feet (tests/rena.test.js).
  { id: 'lumber-town-mockingbird', species: 'mockingbird', birds: ['mockingbird'], world: true,
    center: { x: -697, z: 344 }, radius: 4.5, perches: [] },
  { id: 'hamlet-doves', species: 'mourning-dove', birds: ['mourning-dove', 'mourning-dove'], world: true,
    center: { x: -619, z: 359 }, radius: 5, perches: [] },
  { id: 'rise-bluebirds', species: 'bluebird', birds: ['bluebird', 'bluebird'], world: true,
    center: { x: -675, z: 230 }, radius: 6, perches: [] },
  // The Moros Plain: the open country, where a bird is a speck a long way off.
  { id: 'moros-crows', species: 'crow', birds: ['crow', 'crow', 'crow'], world: true,
    center: { x: -880, z: 560 }, radius: 8, perches: [] },
  { id: 'moros-vultures', species: 'turkey-vulture', birds: ['turkey-vulture', 'turkey-vulture'], world: true,
    center: { x: -760, z: 500 }, radius: 9, perches: [] },
  // Elagos, the lake country: the woods above Nemmel, and the water at the Narrows.
  { id: 'nemmel-titmice', species: 'titmouse', birds: ['titmouse', 'titmouse'], world: true,
    center: { x: -1258, z: 120 }, radius: 6, perches: [] },
  { id: 'narrows-kingfisher', species: 'kingfisher', birds: ['kingfisher'], world: true,
    center: { x: -1256, z: 182 }, radius: 7, perches: [] },
  // Amod, the terrace country above Ostel.
  { id: 'ostel-chickadees', species: 'chickadee', birds: ['chickadee', 'chickadee'], world: true,
    center: { x: -813, z: -506 }, radius: 4, perches: [] },
  { id: 'landing-gulls', species: 'gull', birds: ['gull', 'gull', 'gull'], world: true,
    center: { x: -8, z: 49 }, radius: 8, perches: [] },
].map(h => Object.freeze({ ...h, birds: Object.freeze(h.birds), perches: Object.freeze(h.perches.map(p => Object.freeze(p))) })));

// Two of the kinds are drawn twice, because the cock and the hen do not look
// remotely alike. Everything else is its own species.
const VARIANT_SPECIES = Object.freeze({ 'cardinal-male': 'cardinal', 'cardinal-female': 'cardinal',
  'mallard-drake': 'mallard', 'mallard-duck': 'mallard' });
const variantSpecies = variant => VARIANT_SPECIES[variant] ?? variant;

/** Standable ground about a habitat, and its perches, in world metres. Deterministic. */
export function habitatSpots(habitat, world, avoid = []) {
  const place = habitat.world ? (x, z) => ({ x, z }) : villageToWorld;
  const center = place(habitat.center.x, habitat.center.z), ground = [];
  for (let ring = 0; ring < 3; ring++) for (let n = 0; n < 8; n++) {
    const a = n * TAU / 8 + ring * .7, r = habitat.radius * (.25 + ring * .3), local = { x: habitat.center.x + Math.cos(a) * r, z: habitat.center.z + Math.sin(a) * r };
    const p = place(local.x, local.z), y = world.heightAt(p.x, p.z);
    if (!canStand(p.x, p.z, world, .2) || y < .6 || avoid.some(q => flat(p, q) < 1.6)) continue;
    ground.push({ x: p.x, y, z: p.z, perch: false });
  }
  const perches = habitat.perches.map(post => {
    const p = place(post.x, post.z), base = place(post.base.x, post.base.z);
    return { x: p.x, y: world.heightAt(base.x, base.z) + post.top, z: p.z, perch: true };
  });
  return { center: { ...center, y: world.heightAt(center.x, center.z) }, ground, perches };
}

/**
 * Build Drent's birds. `garden` is `world.birdGarden` (the hummingbird's feeder);
 * `avoid` lists people's stands the birds should not forage on top of.
 */
export function createDrentBirds(scene, world, { garden = null, avoid = [], random = null } = {}) {
  let seed = 0x2b1d5e37, disposed = false;
  const rand = random ?? (() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
  const between = (a, b) => a + rand() * (b - a);
  const root = new THREE.Group(); root.name = 'Birds of Drent'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, flatShading: true, side: THREE.DoubleSide });
  const shapes = birdShapes();

  const birds = [];
  for (const habitat of BIRD_HABITATS) {
    const spots = habitatSpots(habitat, world, avoid);
    habitat.birds.forEach((variant, i) => {
      const start = spots.ground[(i * 3) % Math.max(1, spots.ground.length)] ?? spots.center;
      birds.push({ id: `${habitat.id}-${i + 1}`, species: variantSpecies(variant), variant, habitat: habitat.id, spots,
        x: start.x, y: start.y, z: start.z, perched: false, yaw: i * 2.1 + .4, action: 'peck', timer: .6 + i * .5, clock: i * 1.3,
        restless: 8 + i * 5, motion: null, lift: 0, pitch: 0, headYaw: 0, headPitch: 0, flying: false, visible: true, noticed: 0 });
    });
  }
  const hummingbird = garden ? { id: 'garden-hummingbird', species: 'hummingbird', variant: 'hummingbird', habitat: 'ansel-garden',
    x: garden.hover.x, y: garden.hover.y, z: garden.hover.z, yaw: garden.hover.yaw, action: 'away', timer: 5, clock: 0, motion: null,
    lift: 0, pitch: -.75, headYaw: 0, headPitch: 0, flying: true, visible: false, noticed: 0, visit: 0 } : null;
  if (hummingbird) birds.push(hummingbird);

  const flocks = new Map();
  for (const variant of new Set(birds.map(b => b.variant))) {
    const members = birds.filter(b => b.variant === variant), group = new THREE.Group(); group.name = `Drent ${variant}`; root.add(group);
    const instanced = (part, count) => {
      const mesh = new THREE.InstancedMesh(shapes[variant][part], material, count); mesh.name = `${variant} ${part}`;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = variant === 'crow'; group.add(mesh); return mesh;
    };
    flocks.set(variant, { group, members, form: BIRD_FORMS[variant], meshes: { body: instanced('body', members.length), head: instanced('head', members.length), wing: instanced('wing', members.length * 2) } });
  }

  // --- Behaviour ------------------------------------------------------------
  const spookDistance = bird => BIRD_SPECIES[bird.species].spook;
  function fly(bird, to, { arc = null, duration = null } = {}) {
    const d = Math.hypot(to.x - bird.x, to.z - bird.z), big = bird.species === 'crow';
    bird.motion = { kind: 'flight', from: { x: bird.x, y: bird.y, z: bird.z }, to: { ...to }, time: 0,
      duration: duration ?? clamp(.5 + d * (big ? .09 : .065), .55, 3.2), arc: arc ?? clamp(.6 + d * .12, .6, big ? 5 : 2.8) };
    bird.yaw = Math.atan2(to.x - bird.x, to.z - bird.z); bird.action = 'flight'; bird.flying = true;
  }
  function hop(bird) {
    const { center } = bird.spots, home = Math.hypot(bird.x - center.x, bird.z - center.z) > (BIRD_HABITATS.find(h => h.id === bird.habitat).radius * .8);
    const forward = home ? Math.atan2(center.x - bird.x, center.z - bird.z) : bird.yaw + between(-1.6, 1.6);
    const walk = bird.species === 'crow';
    for (const turn of [0, .8, -.8, 1.6, -1.6]) {
      const yaw = forward + turn, reach = walk ? between(.5, 1.1) : between(.28, .55);
      const x = bird.x + Math.sin(yaw) * reach, z = bird.z + Math.cos(yaw) * reach;
      if (!canStand(x, z, world, .12)) continue;
      bird.motion = { kind: walk ? 'walk' : 'hop', from: { x: bird.x, y: bird.y, z: bird.z }, to: { x, y: world.heightAt(x, z), z }, time: 0,
        duration: walk ? reach / .75 : .26, arc: walk ? 0 : .09 };
      bird.yaw = yaw; bird.action = walk ? 'walk' : 'hop'; return;
    }
    bird.action = 'look'; bird.timer = .6;
  }
  function spot(bird, player, { perch = null } = {}) {
    const { ground, perches } = bird.spots, pool = perch === true ? perches : perch === false ? ground : [...ground, ...perches];
    const options = pool.filter(p => flat(p, bird) > .8 && (!player || flat(p, player) > spookDistance(bird) + 1.5));
    return options.length ? options[Math.floor(rand() * options.length)] : null;
  }
  // Away from the traveler: a safe place at home if there is one, else open ground out of reach (home is
  // flown back to later), else simply the farthest place at home.
  function escape(bird, player) {
    const need = spookDistance(bird) + 1.5, pool = [...bird.spots.ground, ...bird.spots.perches].filter(p => flat(p, bird) > .8);
    const safe = pool.filter(p => flat(p, player) > need);
    if (safe.length) return safe[Math.floor(rand() * safe.length)];
    const away = Math.atan2(bird.x - player.x, bird.z - player.z);
    for (const extra of [0, 4]) for (const turn of [0, .5, -.5, 1, -1, 1.6, -1.6]) {
      const x = player.x + Math.sin(away + turn) * (need + extra), z = player.z + Math.cos(away + turn) * (need + extra);
      if (canStand(x, z, world, .15) && world.heightAt(x, z) > .6) return { x, y: world.heightAt(x, z), z, perch: false };
    }
    const far = pool.reduce((best, p) => !best || flat(p, player) > flat(best, player) ? p : best, null);
    return far && flat(far, player) > flat(bird, player) + 1 ? far : null;
  }
  function spooked(bird, player) {
    const to = escape(bird, player);
    if (to) fly(bird, to);
    else { bird.action = 'look'; bird.timer = .4; }
  }

  function tickSongbird(bird, dt, player) {
    bird.clock += dt; bird.timer -= dt; bird.restless -= dt; bird.noticed = Math.max(0, bird.noticed - dt);
    const near = player ? flat(bird, player) : Infinity;
    if ((!bird.motion || bird.motion.kind !== 'flight') && near < spookDistance(bird)) spooked(bird, player);
    if (bird.motion) {
      const m = bird.motion; m.time += dt;
      const t = clamp(m.time / m.duration, 0, 1), e = m.kind === 'walk' ? t : smoothstep(t);
      bird.x = m.from.x + (m.to.x - m.from.x) * e; bird.z = m.from.z + (m.to.z - m.from.z) * e;
      bird.y = m.from.y + (m.to.y - m.from.y) * e; bird.lift = Math.sin(t * Math.PI) * m.arc;
      if (t === 1) {
        const flew = m.kind === 'flight'; bird.motion = null; bird.lift = 0; bird.flying = false;
        if (flew) { bird.perched = !!m.to.perch; bird.action = 'look'; bird.timer = between(.6, 1.2); bird.restless = bird.perched ? between(4, 9) : between(9, 18); }
        else { bird.action = rand() < .6 ? 'peck' : 'look'; bird.timer = between(.7, 1.8); }
      }
      return;
    }
    if (bird.timer > 0) return;
    if (bird.perched) {
      if (bird.restless <= 0) { const to = spot(bird, player, { perch: false }); if (to) { fly(bird, to); return; } }
      bird.action = rand() < .35 ? 'sing' : 'look'; bird.timer = between(1, 2.4);
      return;
    }
    const strayed = flat(bird, bird.spots.center) > BIRD_HABITATS.find(h => h.id === bird.habitat).radius + 2;
    if ((strayed || bird.restless <= 0) && bird.spots.perches.length) { const to = spot(bird, player, { perch: strayed ? null : true }); if (to) { fly(bird, to); return; } bird.restless = 4; }
    if (bird.action === 'peck') { bird.action = 'look'; bird.timer = between(.4, 1); }
    else if (rand() < .55) hop(bird);
    else { bird.action = 'peck'; bird.timer = between(.8, 2); }
  }

  function tickHummingbird(bird, dt, player, feederHung) {
    bird.clock += dt; bird.timer -= dt; bird.noticed = Math.max(0, bird.noticed - dt);
    const feeder = garden.hover, near = player ? flat(bird, player) : Infinity, watching = player && flat(player, feeder) < 40;
    if (bird.motion) {
      const m = bird.motion; m.time += dt;
      const t = clamp(m.time / m.duration, 0, 1), e = smoothstep(t);
      bird.x = m.from.x + (m.to.x - m.from.x) * e; bird.z = m.from.z + (m.to.z - m.from.z) * e;
      bird.y = m.from.y + (m.to.y - m.from.y) * e + Math.sin(t * Math.PI) * m.arc;
      if (t === 1) { bird.motion = null; if (bird.action === 'leave') { bird.action = 'away'; bird.visible = false; bird.timer = between(12, 24); } else { bird.action = 'sip'; bird.timer = between(2.4, 3.8); } }
      return;
    }
    if (bird.action === 'away') {
      if (!feederHung || !watching) { bird.timer = Math.max(bird.timer, 4); return; }
      if (bird.timer > 0) return;
      // In from a flower bed off to one side, low and quick.
      const a = between(0, TAU), from = { x: feeder.x + Math.sin(a) * 11, y: feeder.y + 2.2, z: feeder.z + Math.cos(a) * 11 };
      bird.x = from.x; bird.y = from.y; bird.z = from.z; bird.visible = true; bird.visit = between(8, 12);
      bird.motion = { from, to: { x: feeder.x, y: feeder.y, z: feeder.z }, time: 0, duration: 1.1, arc: .6 };
      bird.yaw = Math.atan2(feeder.x - from.x, feeder.z - from.z); bird.action = 'arrive';
      return;
    }
    bird.visit -= dt;
    const leave = () => {
      const a = bird.yaw + Math.PI + between(-1, 1), to = { x: bird.x + Math.sin(a) * 14, y: bird.y + 2.5, z: bird.z + Math.cos(a) * 14 };
      bird.motion = { from: { x: bird.x, y: bird.y, z: bird.z }, to, time: 0, duration: .9, arc: .3 }; bird.yaw = a; bird.action = 'leave';
    };
    if (!feederHung || near < spookDistance(bird) || bird.visit <= 0) { leave(); return; }
    if (bird.timer > 0) {
      // Sipping at the port, or backing off to hang in the air beside it.
      const off = bird.action === 'back' ? .38 : 0, side = bird.action === 'back' ? Math.sin(bird.clock * 1.7) * .12 : 0;
      bird.x = feeder.x - Math.sin(feeder.yaw) * off + Math.cos(feeder.yaw) * side; bird.z = feeder.z - Math.cos(feeder.yaw) * off - Math.sin(feeder.yaw) * side;
      bird.y = feeder.y + (bird.action === 'back' ? .1 : 0) + Math.sin(bird.clock * 7) * .012;
      bird.yaw = feeder.yaw + (bird.action === 'back' ? Math.sin(bird.clock * 2.3) * .5 : 0);
      return;
    }
    bird.action = bird.action === 'sip' ? 'back' : 'sip'; bird.timer = bird.action === 'sip' ? between(2.2, 3.6) : between(1, 1.8);
  }

  // --- Posing ---------------------------------------------------------------
  const v = new THREE.Vector3(), out = birdPartMatrices.buffers();
  function pose(flock) {
    const { form, meshes, members } = flock;
    members.forEach((bird, i) => {
      birdPartMatrices(bird, form, { index: i, shown: bird.visible && flock.group.visible }, out);
      meshes.body.setMatrixAt(i, out.body); meshes.head.setMatrixAt(i, out.head);
      meshes.wing.setMatrixAt(i * 2, out.wings[0]); meshes.wing.setMatrixAt(i * 2 + 1, out.wings[1]);
    });
    for (const mesh of Object.values(meshes)) mesh.instanceMatrix.needsUpdate = true;
  }

  // Birds are small and the farthest one can be observed from is 30 m, so past
  // about twice that a flock is three draw calls of nothing. With twenty-five
  // kinds in Drent that distance is the whole of the cost control.
  const DRAW_RANGE = 62, sightLine = [];
  function update(dt, player, { feederHung = false } = {}) {
    if (disposed || !Number.isFinite(dt) || dt <= 0 || !player) return;
    const step = Math.min(dt, .1);
    for (const flock of flocks.values()) {
      flock.group.visible = flock.members.some(bird => flat(bird, player) < DRAW_RANGE);
      if (!flock.group.visible) continue;
      for (const bird of flock.members) {
        if (bird === hummingbird) tickHummingbird(bird, step, player, feederHung);
        else tickSongbird(bird, step, player);
      }
      pose(flock);
    }
  }

  /** Whether a straight look from `eye` to the bird passes through a building or a wall. */
  function blocked(eye, bird) {
    const dx = bird.x - eye.x, dz = bird.z - eye.z, length = Math.hypot(dx, dz) || 1;
    const between = world.nearColliders
      ? world.nearColliders((eye.x + bird.x) / 2, (eye.z + bird.z) / 2, length / 2 + 4, sightLine)
      : world.colliders;
    for (const c of between) {
      const size = c.r ?? Math.max(c.hx, c.hz);
      if (!(size > 1.4)) continue;
      const t = clamp(((c.x - eye.x) * dx + (c.z - eye.z) * dz) / (length * length), 0, 1), px = eye.x + dx * t, pz = eye.z + dz * t;
      if (t <= 0 || t >= 1) continue;
      const inside = c.r !== undefined ? Math.hypot(px - c.x, pz - c.z) < c.r * .8 : Math.abs(px - c.x) < c.hx * .85 && Math.abs(pz - c.z) < c.hz * .85;
      if (inside) return true;
    }
    return false;
  }

  /**
   * The bird the traveler could observe now: visible, settled (not in flight), within
   * `range` of `position`, on screen for `camera`, and not behind a building. The one
   * nearest the middle of the view wins.
   */
  function observable(position, camera, range) {
    if (!position) return null;
    let best = null, bestScore = Infinity;
    for (const bird of birds) {
      if (!bird.visible || ['flight', 'arrive', 'leave', 'away'].includes(bird.action)) continue;
      const distance = flat(bird, position);
      if (distance > range) continue;
      if (camera) {
        v.set(bird.x, bird.y + (bird.lift || 0) + .1, bird.z).project(camera);
        if (v.z > 1 || Math.abs(v.x) > .92 || Math.abs(v.y) > .92) continue;
        const score = Math.hypot(v.x, v.y) + distance / range * .35;
        if (score >= bestScore || blocked(camera.position, bird)) continue;
        best = bird; bestScore = score;
      } else if (distance < bestScore) { best = bird; bestScore = distance; }
    }
    return best ? { id: best.id, species: best.species, variant: best.variant, x: best.x, y: best.y, z: best.z, distance: flat(best, position) } : null;
  }

  /** The observed bird notices the traveler and holds still a moment. */
  function observe(id) {
    const bird = birds.find(b => b.id === id);
    if (!bird || bird.motion) return false;
    bird.noticed = 1.5; if (bird !== hummingbird) { bird.action = 'look'; bird.timer = Math.max(bird.timer, 1.2); }
    return true;
  }

  function state() {
    let draws = 0;
    root.traverse(object => { if (object.isInstancedMesh && object.parent.visible) draws++; });
    return { birds: birds.map(b => ({ id: b.id, species: b.species, variant: b.variant, habitat: b.habitat, x: b.x, y: b.y + (b.lift || 0), z: b.z, yaw: b.yaw, action: b.action, perched: !!b.perched, visible: b.visible })),
      flocks: [...flocks].map(([variant, flock]) => ({ variant, visible: flock.group.visible, count: flock.members.length })), draws };
  }

  function dispose() {
    if (disposed) return; disposed = true; root.removeFromParent();
    root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    for (const set of Object.values(shapes)) for (const g of Object.values(set)) g.dispose();
    material.dispose();
  }

  for (const flock of flocks.values()) pose(flock);
  return { update, observable, observe, state, dispose, get root() { return root; } };
}
