import * as THREE from 'three';
import { canStand } from './game-state.js';
import { SEA_LEVEL } from './region-world.js';
import { westWaterSurface } from './west-ground.js';

/**
 * The animals of the four western regions.
 *
 * Built on the same plan as `road-life.js`: every kind's parts are merged once
 * into vertex-coloured geometry and then instanced, each herd or pair keeps a
 * range it will not leave, and the whole group is hidden past a hundred metres.
 * They are ambient: they cannot be attacked, collected, or asked anything.
 *
 * Every animal here is one the lore names, and the notes on each range say
 * which lore names it and where. Two are extensions from a neighbouring region
 * rather than a placement the lore makes, and they say so.
 */

const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const sphere = new THREE.IcosahedronGeometry(1, 1);
const rough = new THREE.IcosahedronGeometry(1, 0);
const box = new THREE.BoxGeometry(1, 1, 1);
const cone = new THREE.ConeGeometry(1, 1, 5);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, flatShading: true });

/** Merge a kind's fixed pieces once; every animal of that kind shares the result. */
function geometry(pieces) {
  const positions = [], normals = [], colors = [];
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion();
  for (const [source, tone, position, scale, rotation = [0, 0, 0]] of pieces) {
    q.setFromEuler(new THREE.Euler(...rotation));
    matrix.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...scale));
    normalMatrix.getNormalMatrix(matrix);
    const data = source.index ? source.toNonIndexed() : source, tint = new THREE.Color(tone);
    for (let i = 0; i < data.attributes.position.count; i++) {
      p.fromBufferAttribute(data.attributes.position, i).applyMatrix4(matrix); positions.push(p.x, p.y, p.z);
      n.fromBufferAttribute(data.attributes.normal, i).applyMatrix3(normalMatrix).normalize(); normals.push(n.x, n.y, n.z);
      colors.push(tint.r, tint.g, tint.b);
    }
    if (data !== source) data.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.computeBoundingSphere();
  return result;
}

const S = (tone, position, scale, rotation) => [sphere, tone, position, scale, rotation];
const R = (tone, position, scale, rotation) => [rough, tone, position, scale, rotation];
const B = (tone, position, scale, rotation) => [box, tone, position, scale, rotation];
const C = (tone, position, scale, rotation) => [cone, tone, position, scale, rotation];
const Y = (tone, position, scale, rotation) => [cylinder, tone, position, scale, rotation];
const both = build => [build(1), build(-1)];

/**
 * A heron-shaped bird in whatever colours it is handed. Head, neck and bill are
 * part of the body: a heron's neck is its posture rather than a joint, and the two
 * instanced batches it needs are its wings and its legs.
 */
function wader(t) {
  return {
    body: geometry([
      S(t.body, [0, .78, 0], [.15, .17, .34]),
      S(t.neck, [0, .96, .11], [.075, .26, .085]),
      S(t.head, [0, 1.26, .16], [.10, .10, .115]),
      C(t.bill, [0, 1.24, .38], [.038, .30, .034], [Math.PI / 2, 0, 0]),
      S(t.crest, [0, 1.33, .05], [.055, .05, .10]),
      S(t.tail, [0, .80, -.30], [.10, .07, .24]),
      ...both(side => S(0x141210, [side * .082, 1.28, .225], [.013, .015, .014])),
    ]),
    wing: geometry([S(t.wingIn, [.24, 0, 0], [.32, .04, .24]), S(t.wingOut, [.46, -.01, -.08], [.24, .03, .17])]),
    leg: geometry([Y(t.legUp, [0, -.28, 0], [.018, .56, .018]), B(t.foot, [0, -.56, .04], [.055, .024, .11])]),
  };
}

function models() {
  const dark = 0x241f1a;
  return {
    /**
     * The Vastos longhorn: "a large, cold-tolerant breed with a constitution
     * suited to open upland grazing and severe winters". Deep-bodied, heavy in
     * the shoulder, dark red-brown with a paler winter ridge along the spine,
     * and horns that go out before they go up, because they are what the name
     * is about. Nesdor's cattle are the same animal drawn smaller: the lore
     * introduces them by saying they are not this one.
     */
    longhorn: {
      body: geometry([
        S(0x6d452c, [0, 1.06, -.04], [.42, .46, .84]),
        // The shoulder and the neck: a longhorn is heaviest in front, and its head
        // comes off the top of that mass rather than out of the middle of it.
        S(0x7a4f32, [0, 1.15, .44], [.39, .42, .32]),
        S(0x7a4f32, [0, 1.26, .66], [.24, .25, .22], [.30, 0, 0]),
        // The winter ridge the lore gives the breed: pale hair along the spine, not a plank.
        S(0xbda98d, [0, 1.45, -.14], [.15, .05, .62]),
        S(0x5b3924, [0, .88, .02], [.34, .27, .70]),
        Y(0x53341f, [0, .96, -.84], [.042, .66, .042], [.95, 0, 0]),
        S(0x2e211a, [0, .64, -1.02], [.05, .12, .055]),
      ]),
      head: geometry([
        S(0x6d452c, [0, .02, .06], [.20, .21, .30]),
        S(0x5b3924, [0, -.09, .30], [.15, .14, .17]),
        S(0xd6c5a8, [0, .18, -.01], [.21, .12, .20]),
        ...both(side => S(0x5b3924, [side * .22, .12, -.02], [.14, .07, .09])),
        ...both(side => S(dark, [side * .155, .04, .21], [.026, .03, .028])),
        // The horns: out, then forward and up, in three lengths of taper.
        ...both(side => Y(0xcfc2a2, [side * .26, .23, .01], [.044, .34, .044], [0, 0, side * 1.32])),
        ...both(side => Y(0xcfc2a2, [side * .42, .27, .04], [.036, .22, .036], [0, 0, side * .95])),
        ...both(side => C(0xe3dac0, [side * .52, .41, .06], [.030, .20, .030], [0, 0, side * .38])),
      ]),
      leg: geometry([Y(0x5b3924, [0, -.23, 0], [.09, .46, .092]), B(0x2e211a, [0, -.46, .03], [.15, .10, .20])]),
    },

    /**
     * The Nethrani beast: "a compact, short-legged breed adapted to wet ground". Not the
     * Vastos longhorn and not to be read as one at any distance — the lore of Nethereum
     * introduces its cattle by what they are for, and what they are for is standing about
     * in a meadow that is under water every spring and the best pasture in the branch
     * country for the rest of it.
     *
     * So: the longhorn's barrel at three-quarters the height and the full width and length
     * (the brief's own description), on legs a third shorter and half again as thick, and a
     * short pair of horns that go forward rather than out. The longhorn's whole silhouette
     * is its horns and its height; this one's is its width and its want of both.
     *
     * **Dun, and two stops up from what "dark" sounds like.** Photographed on its own meadow
     * the first one was a charcoal lump: everything on it was within a few values of black,
     * so flat shading had nothing to separate and the animal read as a hole in the grass. It
     * is the boar's lesson exactly. Everything here is lighter now, and the pale underline —
     * which is what most wet-ground cattle carry anyway — is what gives the shading an edge.
     *
     * **The neck is part of the head, and that is the deer's lesson.** A longhorn's body is
     * deep enough to hide the gap that opens when the head swings down to graze; this one's
     * is three-quarters of that depth and it is not, so the first Nethrani cow grazed with
     * its head floating half a metre in front of its chest with nothing joining them. So the
     * head geometry starts at the **shoulder joint** and carries its own short thick neck up
     * and forward, and `GRAZER_RIG`'s `neck` and `high` are that joint rather than the base
     * of a skull: the swing turns the whole of it, which is what a neck does.
     */
    'nethrani-cattle': {
      body: geometry([
        S(0x8a7f6e, [0, .80, -.04], [.42, .35, .84]),
        S(0x978b78, [0, .87, .42], [.40, .33, .34]),
        S(0xb0a690, [0, .62, .02], [.35, .21, .70]),
        Y(0x6b6154, [0, .72, -.84], [.042, .50, .042], [.95, 0, 0]),
        S(0x4a4239, [0, .50, -.98], [.05, .11, .055]),
      ]),
      head: geometry([
        // The neck, out of the shoulder and up: two lumps, because a cow's neck is a wedge.
        S(0x978b78, [0, .05, .10], [.20, .18, .22]),
        S(0x8a7f6e, [0, .14, .27], [.175, .16, .19]),
        // The head on the end of it.
        S(0x8a7f6e, [0, .18, .45], [.185, .17, .25]),
        S(0x7a6f60, [0, .10, .66], [.14, .125, .155]),
        S(0xd3cab4, [0, .065, .77], [.10, .075, .075]),
        S(0xa2967f, [0, .32, .41], [.195, .10, .185]),
        ...both(side => S(0x7a6f60, [side * .21, .26, .36], [.13, .065, .085])),
        ...both(side => S(dark, [side * .145, .185, .585], [.026, .030, .027])),
        // Short thick horns, forward and up in two lengths: nothing like the sweep the Vastos
        // animal is named for, and the quickest way to tell the two apart at any distance.
        ...both(side => Y(0xd8cdb2, [side * .20, .33, .43], [.048, .15, .048], [-.25, 0, side * 1.1])),
        ...both(side => C(0xe8e0c8, [side * .275, .40, .52], [.042, .12, .042], [-.55, 0, side * .55])),
      ]),
      leg: geometry([Y(0x6b6154, [0, -.16, 0], [.105, .32, .107]), B(0x3c352d, [0, -.32, .03], [.16, .10, .20])]),
    },

    /**
     * The harrier over Nethereum's meadow. An extension, and flagged as one on its range:
     * the fauna overview names no raptor or scavenger for this country at all. What the
     * ground argues for is a bird that hunts by quartering rather than by soaring — a basin
     * of long wet grass is a harrier's whole living — and the shape of one from below is
     * unmistakable: long narrow wings held in a deep V, a white rump, and black tips.
     *
     * It is on the plateau hawk's rig, which carries a body and two wings and nothing else,
     * so it is in `SOAR` and therefore in `SOARERS`. Anything that falls past that set into
     * the four-legged tail of `render` asks an instanced mesh that was never made for it and
     * takes the render loop down; that is what the vulture did the first time.
     */
    harrier: {
      body: geometry([
        S(0x8e97a0, [0, 0, -.02], [.065, .062, .22]),
        S(0xe6e6df, [0, -.022, .04], [.055, .045, .15]),
        S(0xf2f1ea, [0, .012, -.17], [.055, .026, .07]),
        S(0x7d8792, [0, .012, -.31], [.055, .022, .16], [.05, 0, 0]),
        S(0x9aa3ac, [0, .03, .16], [.05, .05, .058]),
        C(0x3a3a38, [0, .012, .225], [.02, .06, .019], [Math.PI / 2 + .35, 0, 0]),
        ...both(side => S(0xe2c65a, [side * .032, .05, .19], [.012, .013, .011])),
      ]),
      wing: geometry([
        S(0x8e97a0, [.28, 0, .01], [.32, .018, .095]),
        S(0xa7b0b8, [.58, -.004, -.03], [.30, .014, .07]),
        S(0x1d1f22, [.86, -.008, -.07], [.16, .012, .045]),
      ]),
    },

    /**
     * Hill sheep for Meneth's ridge commons and Nesdor's margins: the lore of
     * both puts sheep on the open grazing and says nothing else about them, so
     * this is an upland sheep and not a breed.
     */
    'hill-sheep': {
      body: geometry([
        S(0xcfc6ab, [0, .60, 0], [.35, .35, .58]), S(0xbdb298, [-.16, .68, -.26], [.22, .23, .27]),
        S(0xbdb298, [.14, .67, .19], [.24, .24, .26]), S(0xd4ccb2, [0, .60, -.55], [.12, .12, .21]),
      ]),
      head: geometry([
        S(0x5a5145, [0, -.01, .05], [.17, .21, .24]), S(0x4c443a, [0, -.11, .22], [.12, .11, .16]),
        S(0xcfc6ab, [0, .14, -.01], [.20, .13, .19]),
        ...both(side => S(0x5a5145, [side * .22, .09, .01], [.16, .065, .085])),
        ...both(side => S(dark, [side * .145, .015, .175], [.02, .023, .023])),
      ]),
      leg: geometry([Y(0x6b6154, [0, -.18, 0], [.066, .36, .068]), B(0x4c443a, [0, -.35, .025], [.12, .11, .16])]),
    },

    /**
     * The *vel-caric*: "a small, semi-aquatic carnivore with a distinctive
     * dark-tipped tail and the narrow, mobile face of a creature that lives in
     * river margins". Long in the body and low to the ground, rust over cream,
     * with a full tail that ends in black.
     */
    'river-fox': {
      body: geometry([
        S(0x9a5c33, [0, .27, -.02], [.115, .125, .30]),
        S(0xc08a52, [0, .26, .21], [.098, .105, .11]),
        S(0xe0d3b6, [0, .195, .04], [.09, .07, .24]),
        S(0x8a5330, [0, .30, -.30], [.075, .075, .12]),
        S(0xa8663a, [0, .34, -.44], [.062, .065, .13], [.22, 0, 0]),
        S(0x1d1a17, [0, .40, -.57], [.05, .052, .075], [.22, 0, 0]),
      ]),
      head: geometry([
        S(0xa8663a, [0, .01, .03], [.082, .078, .10]),
        C(0xc08a52, [0, -.015, .135], [.05, .13, .045], [Math.PI / 2 + .12, 0, 0]),
        S(0x1d1a17, [0, -.03, .195], [.019, .017, .019]),
        ...both(side => C(0x8a5330, [side * .055, .085, -.01], [.042, .085, .028], [-.12, 0, side * .22])),
        ...both(side => S(0x0f0d0c, [side * .045, .022, .075], [.017, .018, .014])),
        ...both(side => S(0xe0d3b6, [side * .035, -.048, .10], [.028, .022, .03])),
      ]),
      leg: geometry([Y(0x8a5330, [0, -.075, 0], [.026, .155, .027]), B(0x1d1a17, [0, -.155, .012], [.05, .035, .07])]),
    },

    /** The Carica's otters, which the lore has sharing the corridor with the fox. */
    otter: {
      body: geometry([
        S(0x6b503a, [0, .21, 0], [.125, .115, .34]),
        S(0x8e7255, [0, .19, .25], [.10, .095, .11]),
        S(0xc4b195, [0, .17, .12], [.085, .065, .20]),
        S(0x5b4534, [0, .22, -.33], [.085, .075, .16], [.14, 0, 0]),
        C(0x4b382a, [0, .25, -.52], [.055, .22, .05], [-Math.PI / 2 + .2, 0, 0]),
      ]),
      head: geometry([S(0x7c5f45, [0, 0, .03], [.085, .075, .09]), S(0xc4b195, [0, -.035, .10], [.055, .045, .05]),
        ...both(side => S(0x0f0d0c, [side * .045, .03, .06], [.015, .016, .014])),
        ...both(side => S(0x5b4534, [side * .06, .06, -.005], [.028, .025, .018]))]),
      leg: geometry([Y(0x5b4534, [0, -.06, 0], [.028, .12, .028]), B(0x3a2d22, [0, -.12, .015], [.06, .03, .075])]),
    },

    /**
     * The upland hare. The fauna overview documents "upland hares" for the
     * Ganoss uplands in the north and nothing for Vastos or Meneth; this is that
     * animal carried south onto the nearest cold grassland, and is an extension
     * rather than a placement the lore makes.
     */
    'upland-hare': {
      body: geometry([
        S(0x9c8763, [0, .23, 0], [.16, .19, .30]), S(0xb6a079, [0, .21, .20], [.135, .155, .165]),
        S(0xe2dac0, [0, .23, -.28], [.072, .068, .082]),
        ...both(side => S(0x7f6c4f, [side * .145, .10, -.13], [.09, .08, .16])),
        ...both(side => S(0xc0ab86, [side * .09, .04, .21], [.05, .036, .11])),
      ]),
      head: geometry([S(0xa8936d, [0, 0, 0], [.13, .13, .155]), S(0xc6b48f, [0, -.038, .125], [.068, .058, .072]),
        ...both(side => S(0x131110, [side * .108, .02, .07], [.019, .026, .021])),
        S(0x6a5947, [0, -.018, .195], [.022, .017, .016])]),
      ear: geometry([S(0x86704f, [0, .12, 0], [.04, .17, .036]), S(0xbda88c, [0, .125, .024], [.019, .128, .012])]),
    },

    /**
     * The dry-plateau hawk, which the fauna overview places in East Pyros where
     * it "hunts the upland grasslands". Vastos's western margin is the Pyros
     * transition zone, so it is carried east onto the plain; an extension, and
     * noted as one. Drawn for the only way it is ever seen here: in the air.
     */
    'plateau-hawk': {
      body: geometry([
        S(0x7d6347, [0, 0, -.02], [.075, .075, .20]),
        S(0xd9cbab, [0, -.025, .05], [.062, .05, .13]),
        S(0x6a5340, [0, .01, -.22], [.06, .022, .13], [.06, 0, 0]),
        S(0x4c3d30, [0, .035, .16], [.055, .052, .06]),
        C(0xd8b464, [0, .015, .225], [.024, .07, .022], [Math.PI / 2 + .35, 0, 0]),
        ...both(side => S(0x141210, [side * .035, .048, .195], [.013, .013, .011])),
      ]),
      wing: geometry([
        S(0x715942, [.30, 0, .01], [.34, .022, .115]),
        S(0x8b7255, [.62, -.004, -.03], [.30, .017, .085]),
        S(0x4c3d30, [.88, -.006, -.07], [.13, .013, .05]),
      ]),
    },

    /**
     * A wading bird for the Lizeem's tributaries. The fauna overview calls the
     * Lizeem distributaries' assemblage "the richest avian assemblage documented
     * on the continent" and names herons and stilt-legged waders in it.
     *
     * One shape, two birds. The heron is the grey one the Carica and the Flats
     * already have; the **egret** is the same bird in white, which is what stands on
     * the Eer channels beside it and the only thing on that plain you can see from
     * the far side of it. Every number below is the heron's, to the digit — the
     * colours are the whole of the difference, and `tests/eer-world.test.js` holds
     * the two geometries to the same vertex count so a change to one is a change to
     * both on purpose rather than by accident.
     */
    'wading-bird': wader({ body: 0x8c9aa0, neck: 0xb9c2bd, head: 0xc9cfc6, bill: 0xd8c163, crest: 0x3a423f,
      tail: 0x5e6b6c, wingIn: 0x67757a, wingOut: 0x4e5b62, legUp: 0x7c7448, foot: 0x8a8154 }),
    // White, but not one white. Photographed on its own channel the first egret was a
    // blob: every piece of it was within four values of every other, so flat shading
    // had nothing to separate and the bird had no shoulder, no wing and no tail. The
    // body stays near-white and everything that folds over it steps down a little —
    // which is what a white bird actually looks like, because the parts of it that
    // face the sky are not the parts that face you.
    egret: wader({ body: 0xf4f3ec, neck: 0xf7f6f0, head: 0xf9f8f3, bill: 0x1a1a18, crest: 0xd7d6cb,
      tail: 0xc9c8bd, wingIn: 0xdedcd1, wingOut: 0xb9b8ad, legUp: 0x2a2a26, foot: 0xcaa24e }),

    /**
     * The black-winged stilt, for the braided shallows: the lore's "range of
     * stilt-legged species for which Standard Mittoli maintains separate names".
     * Black above, white below, a needle of a bill, and legs longer than the rest
     * of it put together, which is the entire reason it can work water a heron
     * cannot be bothered with.
     */
    stilt: {
      body: geometry([
        S(0xf2f0e9, [0, .40, 0], [.072, .080, .155]),
        S(0x1d1f22, [0, .448, -.05], [.062, .036, .135]),
        S(0xf4f2eb, [0, .455, .105], [.036, .10, .038]),
        S(0xf4f2eb, [0, .565, .125], [.046, .044, .05]),
        S(0x24262a, [0, .588, .098], [.038, .030, .045]),
        C(0x141210, [0, .560, .215], [.010, .13, .010], [Math.PI / 2, 0, 0]),
        ...both(side => S(0x0f0d0c, [side * .034, .575, .155], [.010, .011, .010])),
      ]),
      wing: geometry([S(0x1d1f22, [.14, 0, 0], [.20, .022, .11]), S(0x111316, [.28, -.006, -.05], [.12, .016, .07])]),
      // Thin, but not two centimetres thin: at that radius the one thing the bird is
      // named for was three pixels of pink against sand and did not read at all.
      leg: geometry([Y(0xd4576e, [0, -.17, 0], [.017, .34, .017]), B(0xc44a60, [0, -.34, .02], [.035, .014, .06])]),
    },

    /**
     * Red deer, and the animal Isareos is for. The lore names nothing wild in that
     * country at all — it names cattle and sheep and stops — so the species is a
     * choice and it is flagged as one on its range. What decided it is the atlas:
     * Isareos has twenty-five `grassland` hexes and six of `plains` and not one of
     * `forest`, so a browser that needs a wood to lie up in has nothing to lie up in.
     * A red deer grazes open grass and browses thorn, which is exactly the two
     * things this country has, and that is why it is here and a roe deer is not.
     *
     * Deep-chested, high at the shoulder, on legs that are the whole animal: a deer
     * at two hundred metres is a neck and a pair of forelegs and nothing else. The
     * antlers are the hind's and the stag's difference and both are drawn here,
     * because a band with nothing on its head in it is a herd of the same beast.
     *
     * **The neck is part of the head, and that is the whole trick.** Every other grazer
     * here carries a head on a stub of neck that belongs to the body, and the head
     * swings down off the end of it; on a longhorn the body is deep enough to hide the
     * gap that opens. On a deer it is not, and photographed grazing the first one had
     * its head floating half a metre in front of its chest with nothing joining them.
     * So the deer's head geometry starts at the **shoulder joint** and carries its own
     * neck up and forward, and the grazing swing turns the whole of it about that
     * joint — which is what a neck does.
     */
    'red-deer': {
      body: geometry([
        S(0x8a6a48, [0, .95, -.05], [.25, .29, .58]),
        S(0x96764f, [0, 1.00, .30], [.23, .26, .22]),
        S(0xc9b189, [0, .72, .02], [.20, .18, .48]),
        S(0xe3d6ba, [0, .88, -.58], [.105, .125, .085]),
        S(0x7a5c3e, [0, 1.16, -.05], [.075, .05, .42]),
        Y(0x6d5236, [0, .98, -.64], [.032, .24, .032], [.75, 0, 0]),
      ]),
      head: geometry([
        S(0x8a6a48, [0, .09, .07], [.105, .115, .12]),
        S(0x8a6a48, [0, .22, .15], [.092, .10, .105]),
        S(0x96764f, [0, .34, .24], [.088, .10, .115]),
        C(0x7a5c3e, [0, .30, .40], [.062, .17, .058], [Math.PI / 2 + .22, 0, 0]),
        S(0x1d1a17, [0, .26, .50], [.036, .030, .030]),
        ...both(side => C(0x8a6a48, [side * .085, .44, .21], [.042, .15, .028], [-.22, 0, side * .40])),
        ...both(side => S(0x120f0e, [side * .070, .36, .30], [.017, .018, .014])),
        // The antlers: up, back, and branching twice. A hind carries the same head
        // with nothing on it, which `zone.hornless` asks for.
        ...both(side => Y(0x9c8560, [side * .048, .50, .20], [.018, .17, .018], [-.28, 0, side * .26])),
        ...both(side => Y(0x9c8560, [side * .098, .66, .12], [.015, .15, .015], [-.50, 0, side * .34])),
        ...both(side => C(0xb39d76, [side * .134, .78, 0], [.013, .12, .013], [-.70, 0, side * .30])),
        ...both(side => C(0xb39d76, [side * .126, .70, .24], [.012, .10, .012], [.28, 0, side * .40])),
      ]),
      // The hind: the same neck and head with nothing on it, and bigger ears for it.
      hornless: geometry([
        S(0x8a6a48, [0, .09, .07], [.105, .115, .12]),
        S(0x8a6a48, [0, .22, .15], [.092, .10, .105]),
        S(0x96764f, [0, .34, .24], [.088, .10, .115]),
        C(0x7a5c3e, [0, .30, .40], [.062, .17, .058], [Math.PI / 2 + .22, 0, 0]),
        S(0x1d1a17, [0, .26, .50], [.036, .030, .030]),
        ...both(side => C(0x8a6a48, [side * .088, .44, .21], [.046, .17, .030], [-.22, 0, side * .40])),
        ...both(side => S(0x120f0e, [side * .070, .36, .30], [.017, .018, .014])),
      ]),
      leg: geometry([Y(0x7a5c3e, [0, -.30, 0], [.052, .60, .054]), B(0x241f1a, [0, -.60, .02], [.09, .07, .13])]),
    },

    /**
     * The turkey vulture over the Isareos hills. The game already names the species
     * — Drent's bird garden keeps one and the birding skill scores it
     * (`src/birding.js`, `src/drent-birds.js`) — but that is a different rig on a
     * different module, so this is the same bird built once more in this file's
     * house style, on the plateau hawk's soaring rig with a much wider wing.
     *
     * An extension, and flagged as one on its range: the fauna overview names no
     * raptor or scavenger for this country. What it does name for the open grass
     * further out is the **black soar-bird**, "technically a vulture-relative", and
     * the shape in the sky is the same shape — held out flat, barely moving, and
     * circling a long way up.
     */
    'turkey-vulture': {
      body: geometry([
        S(0x2f2925, [0, 0, -.03], [.095, .095, .26]),
        S(0x241f1c, [0, -.03, .06], [.082, .068, .17]),
        S(0x3a322c, [0, .01, -.30], [.085, .026, .18], [.05, 0, 0]),
        S(0x8a4a3a, [0, .05, .19], [.052, .058, .07]),
        C(0xd9cfb8, [0, .03, .27], [.026, .07, .024], [Math.PI / 2 + .30, 0, 0]),
        ...both(side => S(0x120f0e, [side * .034, .075, .215], [.012, .013, .011])),
      ]),
      wing: geometry([
        S(0x2a2420, [.40, 0, .02], [.46, .024, .145]),
        S(0x3a322c, [.88, -.004, -.04], [.42, .019, .105]),
        S(0x1c1815, [1.26, -.008, -.10], [.17, .015, .058]),
      ]),
    },

    /**
     * Grey dolphins off the Eer shore. The fauna overview documents them "in the
     * Lizeem estuary at Nylon during upriver fish migrations", and the estuary is
     * Eer's own south-west corner, so this is a placement and not an extension.
     *
     * A back, a fin and the top of a beak, and nothing else: everything under the
     * waterline is drawn as though it is under the waterline, which is to say it is
     * not drawn. They are out past the surf and there is no way to them — the whole
     * of the animal, for a traveler on the shore, is the thing coming up and going
     * down again some way out.
     */
    dolphin: {
      body: geometry([
        S(0x6f7c84, [0, 0, -.06], [.26, .28, .92]),
        S(0xc3cbce, [0, -.14, .02], [.20, .13, .68]),
        C(0x6f7c84, [0, .02, .70], [.135, .46, .125], [Math.PI / 2 - .12, 0, 0]),
        C(0x5b686f, [0, .32, -.12], [.065, .38, .15], [.34, 0, 0]),
        S(0x5b686f, [0, -.02, -.94], [.055, .065, .20]),
        ...both(side => S(0x5b686f, [side * .24, -.05, -1.04], [.19, .034, .095], [0, 0, side * .26])),
      ]),
    },

    /**
     * Eer's duck, for the slow water of the Lizeem's last channels — mallard, and
     * teal where a zone asks for it smaller. A duck sits *on* the water rather than
     * standing beside it, so it is built low and broad with the legs short enough to
     * read as tucked under rather than as a wader's stilts. The drake's head is the
     * only strong colour on any animal in the west and has to be: at fifty metres it
     * is the one thing that tells this bird from the herons standing round it.
     *
     * **Head, neck and bill are part of the body**, as they are for every bird in this
     * file. The first duck had a `head` geometry of its own, and the bird rig in
     * `render` never places one — it draws wings and legs and nothing else — so the
     * head was left on the identity matrix and rendered as a dark lump buried in the
     * middle of the drake. A separate head belongs to the animals that swing one down
     * to graze, and a duck does not.
     */
    duck: {
      body: geometry([
        S(0x6b5b45, [0, .22, -.02], [.13, .105, .25]),
        S(0xbfb49a, [0, .175, .01], [.115, .072, .215]),
        S(0x574a38, [0, .25, -.25], [.062, .055, .10], [.30, 0, 0]),
        S(0x8e7e64, [0, .26, .11], [.078, .078, .085]),
        S(0x2f5b46, [0, .31, .16], [.045, .055, .05]),
        S(0xd9d2c0, [0, .285, .175], [.048, .020, .05]),
        S(0x2f5b46, [0, .375, .21], [.060, .064, .068]),
        C(0xc9a74e, [0, .355, .295], [.030, .085, .022], [Math.PI / 2 + .12, 0, 0]),
        ...both(side => S(0x0f0d0c, [side * .040, .392, .232], [.012, .013, .011])),
      ]),
      leg: geometry([Y(0xc0913f, [0, -.05, 0], [.016, .10, .016]), B(0xd0a24c, [0, -.10, .022], [.055, .018, .075])]),
      wing: geometry([S(0x7a6a52, [.09, 0, -.02], [.11, .026, .13]), S(0x4d6f7a, [.15, .004, -.08], [.05, .020, .045])]),
    },

    /**
     * The wild boar of the tamarisk and the cushion scrub. Not the lore's "river
     * boar", which is a semi-aquatic animal of the Mittoli wetlands and a different
     * beast; this is the ordinary pig of a Mediterranean farmland, which is what
     * lives in scrub like Eer's and what the brief puts here.
     *
     * Built the way a boar reads: all its mass in the front, a head that carries
     * straight on out of the shoulder with no neck between them, a high hackled
     * ridge, and short legs under it.
     *
     * **Grizzled, not black.** The first pass took "dark bristled brown" literally
     * and came out a silhouette on Eer's pale grass: the hackled ridge that is the
     * whole shape of the animal did not show at all. Everything is a stop or two up
     * now, and the ridge is well clear of the shoulder it stands on, so what reads
     * at twenty metres is a boar and not a hole in the ground.
     */
    boar: {
      body: geometry([
        S(0x6b5943, [0, .50, .10], [.27, .30, .34]),
        S(0x5b4c3a, [0, .43, -.22], [.22, .23, .30]),
        S(0xa08b6c, [0, .71, -.02], [.075, .055, .36]),
        S(0x4a3e30, [0, .36, -.44], [.14, .13, .12]),
        Y(0x4a3e30, [0, .44, -.56], [.024, .12, .024], [1.15, 0, 0]),
      ]),
      head: geometry([
        S(0x6b5943, [0, .02, .10], [.155, .165, .19]),
        C(0x55462f, [0, -.04, .30], [.105, .26, .10], [Math.PI / 2 + .06, 0, 0]),
        S(0xc8bda6, [0, -.075, .40], [.055, .038, .05]),
        ...both(side => C(0x4a3e30, [side * .105, .155, .02], [.055, .13, .04], [-.18, 0, side * .30])),
        ...both(side => S(0x0f0d0c, [side * .088, .045, .175], [.017, .018, .015])),
        // The tusks: short, pale and turned up, and the only bright thing on it.
        ...both(side => C(0xe6dec6, [side * .062, -.075, .345], [.017, .085, .016], [-.55, 0, side * .30])),
      ]),
      leg: geometry([Y(0x4a3e30, [0, -.17, 0], [.055, .34, .056]), B(0x2b2319, [0, -.33, .02], [.10, .07, .13])]),
    },

    /**
     * Gulls on the Eer shore. The game already names the species — Drent's bird
     * garden keeps one (`src/drent-birds.js`) — but that is a different rig on a
     * different module, so this is the same bird built once more in this file's
     * house style: white, grey-backed, standing tall on dark legs.
     *
     * It is the only animal in the west that is placed on a country's shore rather
     * than on its ground, which is why it is here and not in Peblos's salt islands.
     */
    gull: {
      body: geometry([
        S(0xf1efe8, [0, .40, 0], [.115, .125, .24]),
        S(0x9aa3a8, [0, .455, -.07], [.10, .055, .21]),
        S(0xf3f1ea, [0, .40, .16], [.085, .085, .09]),
        S(0xe8e5dc, [0, .43, -.28], [.055, .045, .11], [.20, 0, 0]),
        C(0xd8b455, [0, .405, .26], [.022, .11, .020], [Math.PI / 2 + .10, 0, 0]),
        ...both(side => S(0x141210, [side * .062, .43, .195], [.013, .014, .012])),
      ]),
      wing: geometry([S(0x9aa3a8, [.20, 0, 0], [.26, .032, .16]), S(0x3d454a, [.40, -.008, -.06], [.16, .024, .10])]),
      leg: geometry([Y(0xc4a05a, [0, -.11, 0], [.016, .22, .016]), B(0xbe9a56, [0, -.22, .03], [.05, .02, .09])]),
    },
  };
}

/**
 * Every range in the western regions. `species` picks the model, `sites` are the
 * animals' home spots in world metres, and the box is the ground that range's
 * animals will not walk out of. `note` says which lore puts them here.
 */
export const WEST_LIFE_ZONES = Object.freeze([
  Object.freeze({
    id: 'vastos-longhorns-west', species: 'longhorn', region: 'Vastos', radius: .95, scale: 1,
    minX: -1700, maxX: -1500, minZ: -520, maxZ: -380,
    sites: Object.freeze([[-1640, -470], [-1622, -452], [-1596, -474], [-1570, -448], [-1552, -470], [-1600, -430]]),
    note: 'vastos.md: "The Vastos longhorn ... is the foundation of the economy". Grazing loose on the open range; no fold, no fence, nobody with them.',
  }),
  Object.freeze({
    id: 'vastos-longhorns-east', species: 'longhorn', region: 'Vastos', radius: .95, scale: 1,
    minX: -1520, maxX: -1360, minZ: -380, maxZ: -240,
    sites: Object.freeze([[-1470, -320], [-1448, -300], [-1424, -326], [-1496, -298], [-1444, -348]]),
    note: 'vastos.md: the second band, watering at the eastern pans.',
  }),
  Object.freeze({
    id: 'vastos-hares', species: 'upland-hare', region: 'Vastos', radius: .3, scale: 1,
    minX: -1660, maxX: -1500, minZ: -340, maxZ: -200,
    sites: Object.freeze([[-1600, -280], [-1568, -248], [-1624, -238]]),
    note: 'Extension: the fauna overview documents upland hares for the Ganoss uplands, not for Vastos.',
  }),
  Object.freeze({
    id: 'vastos-hawks', species: 'plateau-hawk', region: 'Vastos', radius: .3, scale: 1, air: 34,
    minX: -1740, maxX: -1420, minZ: -520, maxZ: -160,
    sites: Object.freeze([[-1660, -400], [-1520, -280]]),
    note: 'Extension: the fauna overview puts the dry-plateau hawk in East Pyros, hunting the upland grasslands.',
  }),
  Object.freeze({
    id: 'meneth-ridge-sheep', species: 'hill-sheep', region: 'Meneth', radius: .55, scale: 1,
    minX: -1960, maxX: -1800, minZ: -300, maxZ: -170,
    sites: Object.freeze([[-1900, -240], [-1884, -226], [-1866, -248], [-1846, -230], [-1908, -212], [-1870, -206]]),
    note: 'meneth.md: "sheep and cattle on the ridgeline grazing". The ridge commons, with nobody on them.',
  }),
  Object.freeze({
    id: 'meneth-valley-sheep', species: 'hill-sheep', region: 'Meneth', radius: .55, scale: 1,
    minX: -1860, maxX: -1700, minZ: -130, maxZ: -20,
    sites: Object.freeze([[-1800, -80], [-1782, -62], [-1760, -88], [-1816, -56], [-1744, -66]]),
    note: 'meneth.md: the second valley’s grazing, above its beck.',
  }),
  Object.freeze({
    id: 'meneth-hares', species: 'upland-hare', region: 'Meneth', radius: .3, scale: 1,
    minX: -1900, maxX: -1760, minZ: -190, maxZ: -80,
    sites: Object.freeze([[-1850, -140], [-1812, -118]]),
    note: 'Extension: the same Ganoss upland hare as on the Vastos plain, on the same kind of ground.',
  }),
  // The Carica corridor. These are the animals the lore of Caricas is about, and
  // their spots are on the fox ground itself: the immediate bank of the middle reach.
  Object.freeze({
    id: 'carica-foxes-upper', species: 'river-fox', region: 'Caricas', radius: .32, scale: 1,
    /**
     * **Forty metres wider to the west, because the fox was backing into its own wall.**
     * The vel-caric gives ground at exactly the pace you come on and never turns its back, so
     * it needs somewhere to give ground *to*: measured with a walker coming from the east, it
     * backed to `minX` at -1740, slid north along that edge for ten seconds and was reached to
     * 1.58 m — which `tests/west-life.test.js` calls being walked down, and rightly.
     *
     * It was marginal before and Nethereum's landing tipped it: registering that country moved
     * the Lizeem's surface along its own bank, which re-seeded the `lizeemSedge` draw in
     * Caricas's block and with it every scatter after it, so the trees this fox threads between
     * are a few metres from where they were. The cure is room rather than a re-tune of anything
     * it does: -1780 is 100% standable Caricas ground against 85% at -1740, and the range's
     * half-diagonal goes from 71 m to 85, well inside the 130 it is ticked from.
     */
    minX: -1780, maxX: -1650, minZ: 390, maxZ: 500,
    sites: Object.freeze([[-1670, 400], [-1684, 409], [-1708, 436], [-1713, 469]]),
    note: 'caricas.md: the vel-caric, "found reliably only in the Carica corridor". It hunts the water’s edge and it does not run from you.',
  }),
  Object.freeze({
    id: 'carica-foxes-lower', species: 'river-fox', region: 'Caricas', radius: .32, scale: 1,
    minX: -1800, maxX: -1700, minZ: 475, maxZ: 600,
    sites: Object.freeze([[-1721, 486], [-1744, 502], [-1764, 538], [-1780, 578]]),
    note: 'caricas.md: the lower half of the six protected miles. Both ranges are on the western bank, because that is the bank that is in Caricas: the river runs the border.',
  }),
  Object.freeze({
    id: 'carica-otters', species: 'otter', region: 'Caricas', radius: .35, scale: 1,
    minX: -1800, maxX: -1690, minZ: 420, maxZ: 600,
    sites: Object.freeze([[-1708, 452], [-1756, 526]]),
    note: 'caricas.md: the fox "uses the same territory as the Carica’s otter population without competing with it".',
  }),
  Object.freeze({
    id: 'lizeem-waders', species: 'wading-bird', region: 'Caricas', radius: .4, scale: 1,
    minX: -2260, maxX: -2120, minZ: 120, maxZ: 300,
    sites: Object.freeze([[-2190, 190], [-2166, 236], [-2214, 252]]),
    note: 'The fauna overview calls the Lizeem’s assemblage "the richest avian assemblage documented on the continent" and names herons and stilt-legged waders in it.',
  }),
  // The Flats. The lore introduces Nesdor's cattle by saying what they are not:
  // "a hardy grassland breed, not the cultural center that the Vastos longhorn is
  // in Vastos, but a practical animal suited to the semi-open terrain". So: the
  // same animal at three quarters the size, which is what that sentence describes.
  Object.freeze({
    id: 'nesdor-cattle-west', species: 'longhorn', region: 'Nesdor', radius: .8, scale: .76,
    minX: -1560, maxX: -1400, minZ: 560, maxZ: 700,
    sites: Object.freeze([[-1500, 620], [-1478, 642], [-1522, 648], [-1456, 604], [-1492, 672]]),
    note: 'nesdor.md: the Nesdor cattle on the open grassland of the flats.',
  }),
  Object.freeze({
    id: 'nesdor-cattle-east', species: 'longhorn', region: 'Nesdor', radius: .8, scale: .76,
    minX: -1420, maxX: -1250, minZ: 720, maxZ: 860,
    sites: Object.freeze([[-1350, 790], [-1326, 812], [-1374, 816], [-1304, 772]]),
    note: 'nesdor.md: the second band, out where the Flats become the Moros approach.',
  }),
  Object.freeze({
    id: 'nesdor-sheep', species: 'hill-sheep', region: 'Nesdor', radius: .55, scale: 1,
    minX: -1640, maxX: -1500, minZ: 400, maxZ: 520,
    sites: Object.freeze([[-1580, 460], [-1558, 482], [-1602, 486], [-1546, 440]]),
    note: 'nesdor.md: "Sheep on the margins between the valley agriculture and the open grassland."',
  }),
  Object.freeze({
    id: 'nesdor-waders', species: 'wading-bird', region: 'Nesdor', radius: .4, scale: 1,
    minX: -1730, maxX: -1600, minZ: 600, maxZ: 780,
    sites: Object.freeze([[-1662, 664], [-1684, 722], [-1642, 700]]),
    note: 'The braided water: shallow, slow and exactly what a stilt-legged wader wants.',
  }),
  // Eer. The one direct statement the fauna overview makes about this water is the
  // richest thing in it — the Lizeem distributaries carry "the richest avian
  // assemblage documented on the continent", and it names herons, spoonbills and a
  // range of stilt-legged species. Eer is where that sentence is true, so four of
  // the six ranges here are birds on water, and they are the point of the country.
  Object.freeze({
    id: 'eer-herons', species: 'wading-bird', region: 'Eer', radius: .4, scale: 1,
    minX: -1300, maxX: -1120, minZ: 990, maxZ: 1090,
    sites: Object.freeze([[-1250, 1018], [-1205, 1026], [-1160, 1034]]),
    note: 'The fauna overview: the Lizeem distributaries are "the richest avian assemblage documented on the continent", and herons are the first bird it names in it. The North Channel’s slow upper water.',
  }),
  Object.freeze({
    id: 'eer-egrets', species: 'egret', region: 'Eer', radius: .4, scale: .86,
    minX: -1130, maxX: -940, minZ: 1210, maxZ: 1330,
    sites: Object.freeze([[-1060, 1248], [-1020, 1272], [-988, 1292]]),
    note: 'The same assemblage on the South Channel, in white and a size smaller. On ground this flat a white bird is visible from the far side of the country, which is most of what an egret is for.',
  }),
  Object.freeze({
    id: 'eer-stilts', species: 'stilt', region: 'Eer', radius: .3, scale: 1,
    minX: -1010, maxX: -890, minZ: 1035, maxZ: 1110,
    // **On the bars, a metre off the water, and measured rather than guessed.** The
    // legs are the animal — longer than the rest of it put together — and a stilt in
    // the channel is a stilt with its legs under the water. Guessed at once and the
    // birds came out *beneath* the braid's own ribbon, drawn and invisible; these
    // four are swept out of the zone as the dry, standable ground nearest to water,
    // spread sixteen metres apart so the band is not a queue.
    sites: Object.freeze([[-1008, 1055], [-1008, 1073], [-994, 1045], [-992, 1081]]),
    note: 'The overview’s "range of stilt-legged species": the braided shallows at the foot of the North Channel, which is the only water in Eer shallow enough for them.',
  }),
  Object.freeze({
    id: 'eer-ducks', species: 'duck', region: 'Eer', radius: .3, scale: 1, float: true,
    minX: -1420, maxX: -1280, minZ: 960, maxZ: 1060,
    sites: Object.freeze([[-1380, 998], [-1352, 1004], [-1320, 1008], [-1400, 992]]),
    note: 'Mallard and teal on the slow water where the channels leave the loam. Extension: the overview names waterfowl for the Lizeem plains in general ("high flood years correlate with exceptional hunting seasons for waterfowl") without naming a species, so the species is chosen and the place is the lore’s.',
  }),
  Object.freeze({
    id: 'eer-boar', species: 'boar', region: 'Eer', radius: .7, scale: 1,
    minX: -1160, maxX: -1010, minZ: 1120, maxZ: 1240,
    sites: Object.freeze([[-1100, 1170], [-1075, 1186], [-1120, 1196]]),
    note: 'Wild boar in the cushion scrub and the tamarisk, which is what lives in it. Extension: the overview’s "river boar" is a semi-aquatic animal of the Mittoli wetlands and a different beast; this is the ordinary pig of a Mediterranean farmland, and it is here because the scrub is.',
  }),
  Object.freeze({
    id: 'eer-gulls', species: 'gull', region: 'Eer', radius: .3, scale: 1,
    minX: -1000, maxX: -900, minZ: 1100, maxZ: 1210,
    sites: Object.freeze([[-946, 1140], [-930, 1164], [-958, 1186]]),
    note: 'Gulls on the eastern shore. The game already names the species in Drent; the coast of Eer is "a series of low headlands and small sheltered bays" and every one of them has them.',
  }),
  Object.freeze({
    id: 'eer-dolphins', species: 'dolphin', region: 'Eer', radius: 0, scale: 1, sea: true,
    minX: -836, maxX: -788, minZ: 1120, maxZ: 1235,
    sites: Object.freeze([[-818, 1150], [-806, 1196]]),
    note: 'The overview documents grey dolphins "in the Lizeem estuary at Nylon during upriver fish migrations", and the estuary is Eer’s own corner of the map. Out past the surf: seen from the shore and not reachable from it.',
  }),
  // Isareos. The lore of this country names cattle and sheep and nothing wild at all,
  // so every range below says what it is doing here. The deer are what the atlas
  // leaves room for once it has refused the woodland: twenty-five grassland hexes and
  // no forest hex is open grass and thorn, which is a red deer's ground and not a roe
  // deer's. See docs/six-regions-brief.md, "Isareos — the grass hills, without the sea".
  Object.freeze({
    id: 'isareos-hinds', species: 'red-deer', region: 'Isareos', radius: .55, scale: 1, hornless: true,
    // **Two hundred metres by a hundred and sixty, and no wider.** A deer band wants room
    // — cornered against its own range edge it is caught in twenty seconds — and the
    // obvious answer, a range three hundred and sixty metres across, is worse than the
    // problem: a flock is ticked from its centre, so a hind that ran to a far corner took
    // the traveler past `LIFE_REACH` of that centre and the whole band froze where it
    // stood. Half a range's diagonal has to stay inside `LIFE_REACH`, and this one does,
    // with room. What keeps a deer clear instead is its own wariness: it moves off at
    // eighteen metres, which is further than anything else in the west.
    minX: -2600, maxX: -2400, minZ: -160, maxZ: 0,
    sites: Object.freeze([[-2520, -86], [-2494, -64], [-2546, -56], [-2470, -104], [-2500, -34]]),
    note: 'Extension: the lore names nothing wild in Isareos. Red deer graze open grass and browse thorn and need no wood to lie up in, which is the country the atlas actually draws here — twenty-five grassland hexes and not one of forest. A band of hinds on the shoulders between two valley heads.',
  }),
  Object.freeze({
    id: 'isareos-stags', species: 'red-deer', region: 'Isareos', radius: .55, scale: 1.08,
    minX: -2740, maxX: -2560, minZ: -20, maxZ: 120,
    sites: Object.freeze([[-2662, 44], [-2630, 66]]),
    note: 'The same extension, apart from the hinds and carrying antlers, which is where red deer stags are for most of the year.',
  }),
  Object.freeze({
    id: 'isareos-hares', species: 'upland-hare', region: 'Isareos', radius: .3, scale: 1,
    // A hundred and eighty by a hundred and fifty, which is a touch more than the Vastos
    // and Meneth hares have and well inside `LIFE_REACH` of its own middle.
    minX: -2490, maxX: -2310, minZ: -180, maxZ: -30,
    sites: Object.freeze([[-2406, -124], [-2374, -100], [-2436, -88]]),
    note: 'Extension: the same Ganoss upland hare as on the Vastos plain and the Meneth ridges, and at last not carried far — this is the same latitude and the same open grass.',
  }),
  Object.freeze({
    id: 'isareos-otters', species: 'otter', region: 'Isareos', radius: .35, scale: 1.25,
    // **Below the ford, not on it.** An otter's way out is the water, and `waterOf` looks
    // for deep-water colliders — which a river has only where it cannot be waded. The
    // first range sat on the upper third, where this one is shallow over gravel, so the
    // otters had nowhere to go and were simply a slow land animal that could be run down.
    minX: -2620, maxX: -2440, minZ: 110, maxZ: 190,
    sites: Object.freeze([[-2590, 140], [-2520, 160]]),
    note: 'The great river otter on the Isa: the fauna overview places it "from the Oremindi meltwater sources through the forest-margin watercourses of Alezhor", and with the Ibenwood two hexes west this is a forest-margin watercourse even where the country itself is not forest. The Carica’s otter at a larger size; an extension by place, and flagged.',
  }),
  // The country's own living, and the one part of its fauna the lore does name outright:
  // "The stock is: cattle and sheep on grass that never dries out, and the hides and
  // cheese that come off them." Loose on the valley grass with nobody near them, as
  // Vastos's longhorns and Meneth's sheep are — the grazing communities that own them are
  // people, and people are what this pass does not build.
  Object.freeze({
    id: 'isareos-cattle', species: 'longhorn', region: 'Isareos', radius: .8, scale: .78,
    minX: -2460, maxX: -2290, minZ: 20, maxZ: 175,
    sites: Object.freeze([[-2330, 72], [-2312, 96], [-2344, 110], [-2320, 140]]),
    note: 'isareos.md: "cattle and sheep on grass that never dries out". Not the Vastos longhorn — the lore names no breed here, so these are the ordinary grassland beast at the size Nesdor’s are drawn, on the valley floor beside the east beck.',
  }),
  Object.freeze({
    id: 'isareos-sheep', species: 'hill-sheep', region: 'Isareos', radius: .55, scale: 1,
    minX: -2380, maxX: -2200, minZ: -215, maxZ: -70,
    sites: Object.freeze([[-2300, -150], [-2278, -128], [-2322, -120], [-2260, -170], [-2296, -186]]),
    note: 'isareos.md: the other half of the stock, on the valley-head grass in the north-east. "Each valley head has its herds"; the herds are here and the communities are not.',
  }),
  Object.freeze({
    id: 'isareos-vultures', species: 'turkey-vulture', region: 'Isareos', radius: .3, scale: 1, air: 38,
    minX: -2700, maxX: -2320, minZ: -200, maxZ: 160,
    sites: Object.freeze([[-2560, -60], [-2450, 60]]),
    note: 'Extension: the fauna overview names no raptor or scavenger for Isareos. The species is the game’s own (src/drent-birds.js, src/birding.js) and the shape in the sky is the overview’s black soar-bird, "technically a vulture-relative", held flat and circling a long way up.',
  }),
  // Nethereum. With the Nethermere gone the fishery and the wildfowl go with it, and the one
  // animal the lore names outright is the one that never needed the water: "Nethrani cattle —
  // a compact, short-legged breed adapted to wet ground". Everything else here is what lives
  // on a wet meadow and the two rivers that bound it, and every range says which it is.
  Object.freeze({
    id: 'nethereum-cattle', species: 'nethrani-cattle', region: 'Nethereum', radius: .8, scale: 1,
    // **On the floor, which is the whole point of the beast.** Swept rather than guessed: every
    // one of the six stands where `nethereumWet` is .96 or better — the rank meadow, not the
    // sides — on ground measured standable, and none is within ninety metres of deep water.
    // A hundred and ten metres of half-diagonal, well inside the 130 a flock is ticked from.
    minX: -2648, maxX: -2462, minZ: 328, maxZ: 446,
    sites: Object.freeze([[-2620, 358], [-2576, 384], [-2532, 356], [-2490, 386], [-2556, 418], [-2604, 400]]),
    note: 'nethereum.md: "Nethrani cattle — a compact, short-legged breed adapted to wet ground — are moved onto this post-flood pasture as soon as the footing is reliable." The pasture is the hollow’s floor and the cattle are loose on it; the communities that own them are people, and people are what this pass does not build.',
  }),
  Object.freeze({
    id: 'nethereum-hares', species: 'upland-hare', region: 'Nethereum', radius: .3, scale: 1,
    // The rim, not the floor: `nethereumWet` is .07 or less at all three, and a hare on ground
    // that is under water every spring is a drowned hare.
    minX: -2346, maxX: -2252, minZ: 282, maxZ: 368,
    sites: Object.freeze([[-2300, 330], [-2276, 318], [-2322, 306]]),
    note: 'Extension: the same Ganoss upland hare as on the Vastos plain, the Meneth ridges and the Isareos shoulders, here on the dry north-eastern rim above the basin — which is the only ground in this country that is not under water in a wet spring.',
  }),
  Object.freeze({
    id: 'nethereum-otters', species: 'otter', region: 'Nethereum', radius: .35, scale: 1.25,
    // **Below the ford, where the Neth is deep**, which is the lesson the Isa's otters taught:
    // `waterOf` looks for deep-water colliders, and a river has those only where it cannot be
    // waded. All three of these stand within three and a half metres of one.
    minX: -2229, maxX: -2124, minZ: 466, maxZ: 525,
    sites: Object.freeze([[-2176, 494], [-2207, 488], [-2146, 503]]),
    note: 'The great river otter on the lower Neth, which the lore calls "quick and navigable in its lower reach" and which carried the fishery the flood adjustment took away. The same animal as the Isa’s, at the same size; an extension by place, as that one is, and on the only reach of this country’s water deep enough for it.',
  }),
  Object.freeze({
    id: 'nethereum-herons', species: 'wading-bird', region: 'Nethereum', radius: .4, scale: 1,
    // A stride from water and on the floor, swept for both: these stand where the outlet leaves
    // the hollow and the threads run out across it.
    minX: -2493, maxX: -2408, minZ: 353, maxZ: 428,
    sites: Object.freeze([[-2469, 389], [-2450, 377], [-2432, 404]]),
    note: 'Three, and not thirty. The brief is exact about why: "a wet line in a field feeds one heron, where a marsh would have fed a hundred" — and the atlas has refused this country both the lake and the marsh. They work the threads where the hill-streams give their channels up on the hollow’s floor.',
  }),
  Object.freeze({
    id: 'nethereum-harrier', species: 'harrier', region: 'Nethereum', radius: .3, scale: 1,
    // **Low, and following the ground it hunts.** Nine metres over whatever is under it, on a
    // thirty-four metre turn carried seventy metres east and west — which is quartering, and is
    // what a harrier does instead of soaring. Measured: the ground under the turn rises at most
    // 0.62 m from its middle, so nine metres is nine metres and not a collision.
    minX: -2610, maxX: -2390, minZ: 340, maxZ: 420,
    air: 9, circle: 34, period: 19, quarter: 70, bob: 1.6, follow: true,
    sites: Object.freeze([[-2500, 380]]),
    note: 'Extension: the fauna overview names no raptor for Nethereum at all. What the ground argues for is the bird that hunts it — a basin of long wet grass is a harrier’s whole living, and a harrier quarters rather than soars, which is why it has the plateau hawk’s rig and none of its flight.',
  }),
]);

/**
 * A hawk does not stand about. It holds a slow circle over the grass at a fixed
 * height, which is the whole of its behaviour and the only way it is ever seen
 * from the ground on a plain with nothing to perch on.
 */
const CIRCLE_RADIUS = 46, CIRCLE_PERIOD = 27;

/**
 * Where a standing bird's wings and legs hang off its body, per species, because a
 * duck is not a heron drawn small: its shoulder is at a fifth of the height and its
 * legs are tucked under it rather than under a metre of neck. `shoulder` and `hip`
 * are heights above the animal's own feet, `out` is how far the wing sits from the
 * mid-line and `apart` how far the legs do; `beat` is how wide the wingbeat is in
 * the air, which is what tells a gull from a heron at distance more than size does.
 *
 * **`sweep` and `tuck` are what a folded wing is.** The standing pose used to roll
 * the wing a few degrees and leave it there, and a wing in this file points along
 * its own +X, so every bird in the west has been standing about with its wings
 * straight out sideways like an aeroplane — visible the moment an egret was
 * photographed from four metres. Rolling cannot fix it: to fold a wing you have to
 * turn it back along the body, which is a rotation about the vertical, and shorten
 * it, because a folded wing is half the span of an open one. `sweep` is that turn
 * and `tuck` that shortening, and both are dropped the instant the bird is flying.
 *
 * The heron's row is otherwise the numbers the four western regions were built
 * with, to the digit. Membership of this table is also what says an animal is a
 * bird: it is what decides two legs rather than four.
 */
/**
 * The same table for the four-legged grazers: where the head sits on the end of the
 * neck standing (`high`) and down in the grass (`low`), how far forward that is
 * (`neck`), where the legs hang off the body (`shoulder`, `hip`, `fore`) and how far
 * they swing (`stride`).
 *
 * The longhorn's and the hill sheep's rows are the numbers the four western regions
 * were built with, to the digit; the red deer's is new and is the reason the branch
 * became a table. Membership of this table is what says an animal grazes with a head
 * on a neck, which is the one thing the fox, the otter and the boar do differently.
 */
/**
 * The birds that are only ever seen in the air. They carry a body and two wings and
 * nothing else — no head batch, no legs — so anything that falls past this set into
 * the four-legged tail of `render` asks an instanced mesh that was never made for a
 * matrix and takes the render loop down with it. That is what the vulture did the
 * first time it was added.
 */
/**
 * How each of them holds its wings, and how slowly it rocks on them. The hawk's and the
 * vulture's rows are the numbers the west was built with, to the digit; the harrier's is new
 * and is the reason the two ternaries in `render` became a table. A harrier's deep V is the
 * whole of how it is told from anything else in the sky, so it is the loudest of the three.
 */
const SOAR = Object.freeze({
  'plateau-hawk': { slow: .4, rock: .12, dihedral: .16 },
  'turkey-vulture': { slow: .26, rock: .16, dihedral: .26 },
  harrier: { slow: .55, rock: .20, dihedral: .38 },
});
const SOARERS = new Set(Object.keys(SOAR));

/**
 * How near a traveler has to be to a band's middle before the band is drawn and run.
 *
 * **It is also the hard limit on how big a range may be**, and that is the part that is
 * not obvious. A flock is ticked when the traveler is within `REACH` of its *centre*,
 * not of its animals, so an animal that runs to a far corner of a wide range takes the
 * traveler with it — and the moment the two of them are more than `REACH` from the
 * centre, the whole band stops being ticked and freezes where it stands.
 *
 * Measured, that is exactly what happened to Isareos's deer: given a range three
 * hundred and sixty metres across to keep them from being cornered, a hind ran to a
 * corner, the flock went quiet, and somebody at a walk strolled up to an animal that
 * had stopped existing. So **half a range's diagonal must be less than this**, and
 * `tests/west-life.test.js` holds every range in the west to it.
 */
export const LIFE_REACH = 130;

const GRAZER_RIG = Object.freeze({
  longhorn: { neck: .86, high: 1.38, low: .62, shoulder: .76, hip: .24, fore: .50, stride: .42 },
  'hill-sheep': { neck: .43, high: .84, low: .48, shoulder: .44, hip: .22, fore: .34, stride: .42 },
  // The deer's pivot is its shoulder joint rather than the base of a head: `neck` and
  // `high` are where that joint is, and the 1.15 rad swing the grazing pose applies
  // carries the whole neck down with the head. `low` drops the joint a little as well,
  // because a deer that puts its nose in the grass lowers its shoulders to do it.
  'red-deer': { neck: .30, high: 1.00, low: .68, shoulder: .62, hip: .20, fore: .42, stride: .52 },
  // The Nethrani beast: the longhorn's row with every height at about three-quarters and
  // every width and length left alone, which is what "compact and short-legged" is. The
  // stride is shorter than three-quarters because a short leg swings through less ground,
  // not less angle. `neck` and `high` are the **shoulder joint** and not the base of a head,
  // as the red deer's are, because this one's head geometry carries its own neck.
  'nethrani-cattle': { neck: .40, high: .92, low: .66, shoulder: .55, hip: .26, fore: .50, stride: .34 },
});

const BIRD_RIG = Object.freeze({
  'wading-bird': { shoulder: .84, hip: .58, out: .11, apart: .05, beat: 1.1, swing: .22, fold: .30, sweep: 1.22, tuck: .52 },
  egret: { shoulder: .84, hip: .58, out: .11, apart: .05, beat: 1.1, swing: .22, fold: .30, sweep: 1.22, tuck: .52 },
  stilt: { shoulder: .45, hip: .38, out: .07, apart: .035, beat: 1.25, swing: .30, fold: .26, sweep: 1.28, tuck: .56 },
  duck: { shoulder: .23, hip: .12, out: .075, apart: .045, beat: 1.35, swing: .18, fold: .34, sweep: 1.30, tuck: .60 },
  gull: { shoulder: .43, hip: .27, out: .08, apart: .042, beat: 1.2, swing: .20, fold: .28, sweep: 1.25, tuck: .55 },
});

/** Ambient creatures only: they cannot be attacked, collected or block a quest. */
export function createWestLife(scene, world) {
  const shapes = models(), flocks = [], creatures = [];
  const dummy = new THREE.Object3D(), rootMatrix = new THREE.Matrix4(), resultMatrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion(), unit = new THREE.Vector3(1, 1, 1);
  let updates = 0, disposed = false;

  const inRange = (x, z, zone) => Number.isFinite(x) && Number.isFinite(z)
    && x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ;
  const valid = (x, z, zone) => inRange(x, z, zone) && canStand(x, z, world, zone.radius);
  /**
   * What an animal's feet are on. For everything on legs that is the ground, and
   * for a bird that **floats** it is the water's own surface — a duck sits on a
   * river, it does not stand on the bed of one. Photographed before this, Eer's
   * mallard was a brown lump three-quarters submerged in its own channel, because
   * every animal here was put at `world.heightAt` and the channel bed is a metre
   * and a half below the water in it.
   *
   * A floating bird on dry ground still stands on the ground, so a duck that walks
   * out onto a bar behaves like everything else, and `westWaterSurface` answering
   * `null` is exactly that case. `zone.float` is Gala's raft of geese as well when
   * that country is built.
   */
  const footingY = (x, z, zone) => {
    const ground = world.heightAt(x, z);
    if (!zone?.float) return ground;
    const water = westWaterSurface(x, z);
    return water === null ? ground : Math.max(ground, water - .04);
  };
  function clearPoint(x, z, zone) {
    // Nothing in the air needs footing, and nothing in the sea has any to need.
    if (zone.air || zone.sea) return inRange(x, z, zone) ? { x, z } : null;
    if (valid(x, z, zone)) return { x, z };
    for (let radius = 1; radius <= 26; radius += 1) for (let i = 0; i < 16; i++) {
      const p = { x: x + Math.sin(i / 16 * TAU) * radius, z: z + Math.cos(i / 16 * TAU) * radius };
      if (valid(p.x, p.z, zone)) return p;
    }
    return null;
  }
  function instances(group, name, shape, count) {
    const batch = new THREE.InstancedMesh(shape, material, count);
    batch.name = name; batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.castShadow = true; batch.receiveShadow = true;
    // The group supplies distance culling; dynamic instances must not keep a
    // stale bounding sphere at the spot they were first placed.
    batch.frustumCulled = false; group.add(batch); return batch;
  }

  for (const zone of WEST_LIFE_ZONES) {
    const group = new THREE.Group(); group.name = zone.id; group.visible = false; scene.add(group);
    const animals = [];
    for (let i = 0; i < zone.sites.length; i++) {
      const home = clearPoint(zone.sites[i][0], zone.sites[i][1], zone);
      if (!home) continue;
      const scale = zone.scale ?? 1;
      animals.push({
        id: `${zone.id}-${i + 1}`, species: zone.species, region: zone.region, zone, index: i, scale,
        ...home, y: zone.sea ? SEA_LEVEL : footingY(home.x, home.z, zone) + (zone.air ?? 0), home: { ...home },
        yaw: (i * 1.83 + .5) % TAU, action: zone.air ? 'soar' : zone.sea ? 'swim' : 'graze', timer: 1.4 + i * .71,
        clock: i * .43, speed: 0, lift: 0, watching: 0, detour: 0, blocked: 0, flight: 0, hidden: false, landing: null, homing: false, cornered: 0, breakYaw: 0, slip: 0, slipFrom: 0, slipTo: null,
      });
    }
    creatures.push(...animals);
    const shape = shapes[zone.species];
    const meshes = { body: instances(group, `${zone.species} bodies`, shape.body, animals.length) };
    // A band of hinds is the same animal with nothing on its head, which is a second
    // head geometry and not a second species: one range of red deer carries antlers
    // and the other does not, and a herd in which every beast has the same head on it
    // is a herd of one beast repeated.
    const headShape = zone.hornless && shape.hornless ? shape.hornless : shape.head;
    if (headShape) meshes.head = instances(group, `${zone.species} heads`, headShape, animals.length);
    if (shape.leg) meshes.legs = instances(group, `${zone.species} legs`, shape.leg,
      animals.length * (BIRD_RIG[zone.species] ? 2 : 4));
    if (shape.ear) meshes.ears = instances(group, `${zone.species} ears`, shape.ear, animals.length * 2);
    if (shape.wing) meshes.wings = instances(group, `${zone.species} wings`, shape.wing, animals.length * 2);
    flocks.push({ zone, group, animals, meshes, ticks: 0,
      centre: { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 } });
  }

  /**
   * One step along the animal's heading, or a little to either side of it if that is blocked.
   * `footing` says what it may stand on; a bird in the air needs only to stay over its own range.
   */
  function move(animal, step, { offsets = [0, .55, -.55, 1.1, -1.1], footing = valid } = {}) {
    const fromX = animal.x, fromZ = animal.z;
    for (const offset of offsets) {
      const yaw = animal.yaw + offset, dx = Math.sin(yaw) * step, dz = Math.cos(yaw) * step;
      const slices = Math.max(1, Math.ceil(step / .12));
      let clear = true;
      for (let i = 1; i <= slices; i++) {
        const x = animal.x + dx * i / slices, z = animal.z + dz * i / slices;
        if (!footing(x, z, animal.zone) || (footing === valid && Math.abs(footingY(x, z, animal.zone) - animal.y) > .7)) { clear = false; break; }
      }
      if (clear) { animal.x += dx; animal.z += dz; animal.yaw = yaw; return Math.hypot(animal.x - fromX, animal.z - fromZ); }
    }
    animal.yaw += Math.PI * .71;
    return 0;
  }

  /**
   * Paces, in metres a second, set against the traveler's own: a walk is 4.2 and a run is 7.2
   * (src/main.js). The rule they are tuned to, and tests/west-life.test.js holds them to it:
   * nothing here can be walked down; the quick ones cannot be run down either - the hare on its
   * legs, the wader into the air, the otter into the water; sheep bunch and go, faster than a
   * walk, and somebody running can herd them; cattle are big and unhurried and do not bolt at
   * all. They turn to face you and give ground at about a walk, which is truer than fleeing and
   * keeps them from being chased to the horizon. The fox still never flees.
   */
  const FLEE_AT = { longhorn: 7.5, 'hill-sheep': 6.5, 'upland-hare': 9, otter: 8, 'wading-bird': 11, 'river-fox': 0,
    egret: 12, stilt: 11, duck: 10, gull: 9, boar: 8.5, 'red-deer': 18, 'nethrani-cattle': 7.5 };
  const WALK = { longhorn: .42, 'hill-sheep': .48, 'upland-hare': 1.9, otter: 1.1, 'wading-bird': .5, 'river-fox': .9,
    egret: .5, stilt: .8, duck: .45, gull: .7, boar: .6, 'red-deer': .7, 'nethrani-cattle': .38 };
  const RUN = { 'hill-sheep': 5.6, 'upland-hare': 9.6, otter: 8.2, 'wading-bird': 10,
    egret: 10, stilt: 10.4, duck: 9.8, gull: 11, boar: 8.4, 'red-deer': 10.5 };
  /**
   * Cattle, whatever breed. They do not bolt: they put their heads up, turn to face whoever
   * it is, and give ground at a shade over a walking pace. This used to be a test on the
   * word `longhorn`, which was true of exactly one animal until the Nethrani beast landed —
   * and a Nethrani cow that fled would have been the only cow in the world that did.
   */
  const CATTLE = new Set(['longhorn', 'nethrani-cattle']);
  /**
   * Everything that answers a traveler by getting off the ground. A bird cannot be
   * run down, which is the whole of why they are all here and the hare is not.
   */
  const FLIES = new Set(['wading-bird', 'egret', 'stilt', 'duck', 'gull']);
  /** Cattle giving ground: a shade over the traveler's walk, so a walker never closes and a runner does. */
  const GIVE = 4.5;
  /** The fox drifts back as fast as you come on, up to `cap`: only a flat run gains on it, and slowly. */
  const FOX = Object.freeze({ floor: 1, cap: 6.6, lead: 1.06, arm: 2.8, notice: 10 });
  /** Going home is a purposeful walk, not a graze: a band chased a hundred metres is back in a minute or two. */
  const RETURN = { longhorn: 1.3, 'hill-sheep': 1.5, 'upland-hare': 2.8, otter: 1.8, 'wading-bird': 1.4, 'river-fox': 1.5,
    egret: 1.4, stilt: 1.7, duck: 1.3, gull: 1.6, boar: 1.6, 'red-deer': 2.4, 'nethrani-cattle': 1.2 };
  const HOME = 16, SETTLED = 6;
  const BACK = [0, .35, -.35, .7, -.7], ALONG = [1.05, -1.05, 1.4, -1.4, 1.75, -1.75, 2.1, -2.1];

  /**
   * Face whoever it is and step straight back from them. If what is behind it will not let it -
   * and the fox lives on a river bank too steep to stand beside - it goes along that instead,
   * and at `quick`, because going sideways opens no distance until it has got round.
   */
  function backOff(animal, player, speed, dt, quick = speed) {
    animal.yaw += angleDelta(Math.atan2(player.x - animal.x, player.z - animal.z), animal.yaw) * Math.min(1, dt * 3.5);
    const facing = animal.yaw, straight = Math.atan2(animal.x - player.x, animal.z - player.z);
    animal.yaw = straight;
    let moved = move(animal, speed * dt, { offsets: BACK });
    if (!moved) { animal.yaw = straight; moved = move(animal, quick * dt, { offsets: ALONG }); }
    animal.speed = moved / dt; animal.yaw = facing;
  }

  /** The water an otter can reach: the deep-water colliders in and about its range, found once. */
  const waterByZone = new Map();
  function waterOf(zone) {
    if (!waterByZone.has(zone.id)) waterByZone.set(zone.id, (world.colliders ?? []).filter(c => /water/.test(c.kind ?? '')
      && c.x > zone.minX - 30 && c.x < zone.maxX + 30 && c.z > zone.minZ - 30 && c.z < zone.maxZ + 30));
    return waterByZone.get(zone.id);
  }
  function nearestWater(animal) {
    let best = null;
    for (const c of waterOf(animal.zone)) {
      const edge = Math.hypot(c.x - animal.x, c.z - animal.z) - (c.r ?? Math.max(c.hx ?? 0, c.hz ?? 0));
      if (!best || edge < best.edge) best = { x: c.x, z: c.z, edge };
    }
    return best;
  }

  /** A wader put up off the water: up and away at a pace nobody on foot can match, and down again only when it is left alone. */
  function fly(animal, dt, player, near) {
    animal.flight += dt;
    const settle = animal.flight > 2.2 && near > 26;
    if (!settle) animal.landing = null;
    else if (!animal.landing) animal.landing = (animal.homing && Math.hypot(player.x - animal.home.x, player.z - animal.home.z) > 30)
      ? { ...animal.home } : clearPoint(animal.x, animal.z, animal.zone) ?? { ...animal.home };
    let heading = Math.atan2(animal.x - player.x, animal.z - player.z);
    if (animal.landing) heading = Math.atan2(animal.landing.x - animal.x, animal.landing.z - animal.z);
    else if (!inRange(animal.x + Math.sin(heading) * 14, animal.z + Math.cos(heading) * 14, animal.zone))
      heading = Math.atan2(animal.home.x - animal.x, animal.home.z - animal.z);   // round again over its own water
    animal.yaw += angleDelta(heading, animal.yaw) * Math.min(1, dt * 4);
    const left = animal.landing ? Math.hypot(animal.landing.x - animal.x, animal.landing.z - animal.z) : Infinity;
    if (left < .8) {
      animal.x = animal.landing.x; animal.z = animal.landing.z; animal.lift = 0; animal.flight = 0; animal.landing = null; animal.homing = false;
      animal.action = 'graze'; animal.timer = 3; animal.speed = 0;
    } else {
      animal.speed = move(animal, Math.min(RUN[animal.species] * dt, left), { footing: inRange }) / dt;
      const height = animal.landing ? Math.min(5.5, left * .8) : 5.5;
      animal.lift += Math.max(-dt * 6, Math.min(dt * 5, height - animal.lift));
    }
    animal.y = footingY(animal.x, animal.z, animal.zone);
  }

  /** An otter gone into the water: under for a few seconds, and up again at whichever of its bank spots is furthest from the traveler. */
  const SLIP = Object.freeze({ seconds: .5, pace: 2.2, sink: .42 });
  function dive(animal, dt, player, flock) {
    if (animal.slip > 0) {
      // Going in: it turns to the water, slides the last of the bank and sinks, where you can see it do it.
      // Seen in the renderer before this, it simply was not there any more between one frame and the next.
      animal.slip = Math.max(0, animal.slip - dt);
      const to = animal.slipTo;
      if (to) {
        const yaw = Math.atan2(to.x - animal.x, to.z - animal.z);
        animal.yaw += angleDelta(yaw, animal.yaw) * Math.min(1, dt * 10);
        animal.speed = move(animal, SLIP.pace * dt, { offsets: [0], footing: inRange }) / dt;
      }
      // Its ground is whatever is under it, as for everything else here; what is seen goes down smoothly
      // from the bank it left, however far the bed falls away beneath it.
      animal.y = world.heightAt(animal.x, animal.z);
      animal.lift = animal.slipFrom - animal.y - SLIP.sink * (1 - animal.slip / SLIP.seconds);
      if (animal.slip > 0) return;
      animal.hidden = true;
    }
    animal.hidden = true; animal.lift = 0; animal.speed = 0;
    if (animal.timer > 0) return;
    let best = null;
    for (const mate of flock.animals) {
      const d = Math.hypot(mate.home.x - player.x, mate.home.z - player.z);
      if (!best || d > best.d) best = { ...mate.home, d };
    }
    if (!best || best.d < 14) { animal.timer = 2; return; }   // nowhere safe to come up yet
    animal.x = best.x; animal.z = best.z; animal.y = world.heightAt(best.x, best.z);
    animal.hidden = false; animal.lift = 0; animal.slip = 0; animal.action = 'graze'; animal.timer = 3;
  }

  /** Every way on is shut: of the ways that are open, the one that points least at whoever is coming. */
  function widestWayOut(animal, player) {
    const at = Math.atan2(player.x - animal.x, player.z - animal.z);
    let best = null;
    for (let k = 0; k < 24; k++) {
      const yaw = k / 24 * TAU; let open = true;
      for (let s = .25; s <= 2 && open; s += .25) open = valid(animal.x + Math.sin(yaw) * s, animal.z + Math.cos(yaw) * s, animal.zone);
      const wide = Math.abs(angleDelta(yaw, at));
      if (open && (!best || wide > best.wide)) best = { yaw, wide };
    }
    return best ? best.yaw : animal.yaw;
  }

  function tickGround(animal, dt, player, flock, motion) {
    animal.clock += dt; animal.timer -= dt; animal.speed = 0;
    const species = animal.species, near = Math.hypot(animal.x - player.x, animal.z - player.z);
    let wheeling = false;
    animal.cornered = Math.max(0, animal.cornered - dt);
    // In the air or under the water there is nowhere the traveler can follow.
    if (animal.action === 'fly') { fly(animal, dt, player, near); return; }
    if (animal.action === 'dive') { dive(animal, dt, player, flock); return; }
    animal.lift = 0;
    const away = Math.atan2(animal.x - player.x, animal.z - player.z);
    /**
     * The river fox is the one animal in Azhora that does not run from you.
     * "When approached, it does not flee unless directly threatened. It watches."
     * So: inside ten metres it stops whatever it was doing and turns to face the
     * traveler, and it keeps facing them. Just outside arm's length it gives way without ever
     * turning its back: it drifts off exactly as fast as you come on, so a walker
     * never gets nearer than that, and only somebody at a flat run gains on it.
     */
    if (species === 'river-fox') {
      if (near < FOX.notice) {
        animal.watching = Math.min(1, animal.watching + dt * 2);
        animal.action = near < FOX.arm ? 'withdraw' : 'watch';
        if (animal.action === 'withdraw') {
          const closing = Math.max(0, motion.vx * Math.sin(away) + motion.vz * Math.cos(away));
          backOff(animal, player, Math.min(FOX.cap, Math.max(FOX.floor, closing * FOX.lead)), dt, FOX.cap);
        } else animal.yaw += angleDelta(Math.atan2(player.x - animal.x, player.z - animal.z), animal.yaw) * Math.min(1, dt * 3.5);
        animal.y = footingY(animal.x, animal.z, animal.zone);
        return;
      }
      animal.watching = Math.max(0, animal.watching - dt);
    } else if (CATTLE.has(species) && near < FLEE_AT[species]) {
      // Cattle do not bolt. They put their heads up, turn to face you, and give ground.
      animal.action = 'yield'; animal.timer = 1.2;
      backOff(animal, player, GIVE, dt, GIVE * 1.3);
      animal.y = footingY(animal.x, animal.z, animal.zone);
      return;
    } else if (near < FLEE_AT[species]) {
      if (FLIES.has(species)) { animal.action = 'fly'; animal.flight = 0; animal.landing = null; fly(animal, dt, player, near); return; }
      animal.action = 'flee'; animal.timer = 1.9;
      let heading = away;
      if (species === 'hill-sheep') {
        // Sheep bunch: away from you, and toward the rest of the band.
        const bx = flock.cx - animal.x, bz = flock.cz - animal.z, b = Math.hypot(bx, bz);
        if (b > 2.5 && bx / b * Math.sin(away) + bz / b * Math.cos(away) > -.3)
          heading = Math.atan2(Math.sin(away) + bx / b * .55, Math.cos(away) + bz / b * .55);
      } else if (species === 'otter') {
        const water = nearestWater(animal);
        if (water && water.edge < 1.6) {
          animal.action = 'dive'; animal.timer = 5 + SLIP.seconds; animal.slip = SLIP.seconds;
          animal.slipFrom = animal.y; animal.slipTo = { x: water.x, z: water.z };
          return;
        }
        if (water && water.edge < 40) {
          const to = Math.atan2(water.x - animal.x, water.z - animal.z);
          if (Math.abs(angleDelta(to, away)) < 1.75) heading = to;   // the water, unless you are standing in the way of it
        }
      }
      // Something standing that takes fright wheels first and then goes: it does not run at you while it turns.
      if (animal.cornered > 0) heading = animal.breakYaw;   // it has chosen its way out and is taking it
      const off = angleDelta(heading, animal.yaw);
      animal.yaw += off * Math.min(1, dt * (Math.abs(off) > 1.2 ? 18 : 6));
      wheeling = Math.abs(off) > 1.57;
    }
    const fromHome = Math.hypot(animal.x - animal.home.x, animal.z - animal.home.z);
    // Nothing sets off for home with the traveler still close, and nothing walks home at them:
    // it stands where it got to and waits for them to go.
    const wary = (FLEE_AT[species] || FOX.notice) + 12;
    if (animal.action !== 'flee' && animal.action !== 'return' && fromHome > HOME && near > wary) {
      // A wader does not walk home round a river. It gets up and flies there.
      if (FLIES.has(species)) { animal.action = 'fly'; animal.flight = 2.3; animal.landing = null; animal.homing = true; fly(animal, dt, player, near); return; }
      animal.action = 'return'; animal.detour = 0; animal.blocked = 0;
    }
    if (animal.action === 'return') {
      if (fromHome < SETTLED || near < wary - 8) { animal.action = 'graze'; animal.timer = 2 + (animal.index % 3) * .8; }
      else {
        // Straight for home; and when something is in the way, along it for a moment before trying again.
        animal.detour = Math.max(0, animal.detour - dt);
        if (!animal.detour) animal.yaw += angleDelta(Math.atan2(animal.home.x - animal.x, animal.home.z - animal.z), animal.yaw) * Math.min(1, dt * 4);
        animal.speed = move(animal, RETURN[species] * dt) / dt;
        if (!animal.speed) {
          animal.blocked++; animal.detour = Math.min(6, 1.4 * animal.blocked);
          animal.yaw = Math.atan2(animal.home.x - animal.x, animal.home.z - animal.z) + (animal.blocked % 2 ? 1.7 : -1.7);
        }
      }
    } else if (animal.timer <= 0) {
      if (['walk', 'flee', 'withdraw', 'yield'].includes(animal.action)) {
        animal.action = 'graze'; animal.timer = 2.4 + (animal.index % 3) * .8;
      } else {
        animal.action = 'walk'; animal.timer = 1.3 + (animal.index % 2) * .8;
        animal.yaw += Math.sin(animal.clock + animal.index) * 1.7;
      }
    }
    // Something running for its life tries every way round what is in front of it - the ridge faces
    // of Meneth are close-grown hardwood - before it gives up and turns, which is toward you.
    if (animal.action === 'flee' && !wheeling) {
      const kept = animal.yaw;
      animal.speed = move(animal, RUN[species] * dt, { offsets: [...BACK, ...ALONG] }) / dt;
      if (!animal.speed) {
        // Cornered against the edge of its range or the water. It does not stand and turn on the spot
        // while you walk up to it: it breaks back past you by the widest way open, and means it.
        animal.breakYaw = widestWayOut(animal, player); animal.cornered = 1.2; animal.yaw = animal.breakYaw;
        animal.speed = move(animal, RUN[species] * dt, { offsets: [0, .3, -.3] }) / dt;
        if (!animal.speed) animal.yaw = kept;
      }
    }
    else if (animal.action === 'walk') animal.speed = move(animal, WALK[species] * dt) / dt;
    if (species === 'upland-hare' && animal.speed > .1) {
      const quick = animal.action !== 'walk';
      animal.lift = Math.max(0, Math.sin(animal.clock * (quick ? 16 : 10))) * (quick ? .3 : .13);
    }
    animal.y = footingY(animal.x, animal.z, animal.zone);
  }

  /**
   * A band nobody has been near is not frozen where it was left: when it is next looked at, each
   * of its animals has had that long to make its own way home, at the pace it goes home at.
   */
  function settle(flock, elapsed) {
    for (const animal of flock.animals) {
      if (flock.zone.air || flock.zone.sea) continue;
      const dx = animal.home.x - animal.x, dz = animal.home.z - animal.z, d = Math.hypot(dx, dz);
      const aloft = animal.action === 'fly' || animal.action === 'dive';
      if (!aloft && d <= HOME / 2) continue;
      const reach = RETURN[animal.species] * elapsed;
      if (aloft || reach >= d) { animal.x = animal.home.x; animal.z = animal.home.z; }
      else for (let s = 1; s <= reach; s += 1) {
        const x = animal.x + dx / d * s, z = animal.z + dz / d * s;
        if (!valid(x, z, flock.zone)) break;
        if (s + 1 > reach) { animal.x = x; animal.z = z; }
      }
      animal.y = footingY(animal.x, animal.z, flock.zone); animal.lift = 0; animal.flight = 0; animal.landing = null; animal.hidden = false;
      animal.speed = 0; animal.detour = 0; animal.blocked = 0; animal.cornered = 0; animal.homing = false; animal.slip = 0;
      animal.action = 'graze'; animal.timer = 1 + animal.index * .3;
    }
  }

  /**
   * A dolphin, which is the one animal in the game that is neither on the ground
   * nor over it. It works a line back and forth across its own piece of sea and
   * porpoises along it: up for a second, a back and a fin out of the water, and
   * down again. It does not care about the traveler, because there is no way from
   * the shore to where it is.
   *
   * Everything under the waterline is drawn by not being drawn: the body's own
   * height is set so that the sea plane cuts it, and the arc lifts it through.
   * `SEA_LEVEL` is the one number here, and it comes from `region-world.js` rather
   * than a literal so that a world whose sea moves takes its dolphins with it.
   */
  const SWIM = Object.freeze({ pace: 2.3, period: 7.2, rise: .46, sink: .5 });
  function tickSea(animal, dt) {
    animal.clock += dt;
    const zone = animal.zone;
    const step = SWIM.pace * dt;
    let x = animal.x + Math.sin(animal.yaw) * step, z = animal.z + Math.cos(animal.yaw) * step;
    if (!inRange(x, z, zone)) {
      // It has run out of its own water. Turn about and take the same line back.
      animal.yaw += Math.PI;
      x = animal.x + Math.sin(animal.yaw) * step; z = animal.z + Math.cos(animal.yaw) * step;
      if (!inRange(x, z, zone)) { x = animal.x; z = animal.z; }
    }
    animal.x = x; animal.z = z;
    animal.speed = SWIM.pace;
    animal.y = SEA_LEVEL - SWIM.sink;
    // One breath every few seconds: the arc is the top of a sine and nothing else.
    const phase = Math.sin(animal.clock / SWIM.period * TAU + animal.index * 2.4);
    animal.lift = Math.max(0, phase) * (SWIM.sink + SWIM.rise);
    animal.action = 'swim';
  }

  /**
   * A hawk holds its circle whatever the traveler does; it is far too high to care.
   *
   * **A harrier does not hold one circle over one spot, and that is what the five optional
   * fields are for.** It quarters: a tight turn carried slowly east and west across the
   * ground it is hunting, a few metres over the grass, keeping its height above whatever is
   * under it rather than above the point it started from. So `circle` and `period` are the
   * turn, `quarter` is how far the turn's own centre slides while the bird goes round it,
   * `follow` takes the height off the ground beneath rather than beneath home — a low flier
   * over a dish six hundred metres across would otherwise fly into the side of it — and
   * `bob` is how much the height wanders, which has to be small for a bird nine metres up.
   *
   * Every one of them is absent on the hawk and the vulture, whose flight is the same
   * arithmetic it has been since Vastos.
   */
  function tickAir(animal, dt) {
    animal.clock += dt;
    const zone = animal.zone;
    const radius = zone.circle ?? CIRCLE_RADIUS, period = zone.period ?? CIRCLE_PERIOD;
    const angle = animal.clock / period * TAU + animal.index * 2.1;
    const slide = zone.quarter ? Math.sin(animal.clock / (period * 3.4) * TAU + animal.index * 1.3) * zone.quarter : 0;
    animal.x = animal.home.x + slide + Math.sin(angle) * radius;
    animal.z = animal.home.z + Math.cos(angle) * radius;
    const under = zone.follow ? world.heightAt(animal.x, animal.z) : world.heightAt(animal.home.x, animal.home.z);
    animal.y = under + zone.air + Math.sin(animal.clock * .21) * (zone.bob ?? 3);
    animal.yaw = angle + Math.PI / 2;
    animal.speed = radius * TAU / period;
    animal.action = 'soar';
  }

  function place(mesh, index, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    resultMatrix.multiplyMatrices(rootMatrix, dummy.matrix); mesh.setMatrixAt(index, resultMatrix);
  }

  function render(flock) {
    const species = flock.zone.species;
    flock.animals.forEach((animal, i) => {
      rotation.setFromEuler(new THREE.Euler(0, animal.yaw, 0));
      unit.setScalar(animal.hidden ? 1e-4 : animal.scale);   // an otter under the water is not drawn
      rootMatrix.compose(new THREE.Vector3(animal.x, animal.y + animal.lift, animal.z), rotation, unit);
      const walking = animal.speed > .05, phase = animal.clock * (animal.action === 'flee' ? 13 : 7);
      const breath = Math.sin(animal.clock * 2.1) * .012;
      place(flock.meshes.body, i, 0, 0, 0, 0, 0, 0, 1, 1 + breath, 1);
      // Everything that soars: a body, two wings and no limb that touches the ground,
      // because neither of these birds is ever seen anywhere but in the air. The
      // vulture is on the hawk's rig with a wider wing and a slower tilt to it — that
      // is the whole of the difference, and it is the difference you see from below.
      if (SOARERS.has(species)) {
        // Wings held out and barely moving: a bird that is circling is not flapping. A hawk
        // holds them flat, a vulture in a shallow V, a harrier in a deep one and rocking.
        const soar = SOAR[species];
        const tilt = Math.sin(animal.clock * soar.slow) * soar.rock;
        const dihedral = soar.dihedral;
        for (let side = 0; side < 2; side++) place(flock.meshes.wings, i * 2 + side,
          side ? -.06 : .06, .01, -.01, 0, side ? Math.PI : 0, (side ? -1 : 1) * (dihedral + tilt));
        return;
      }
      const grazer = GRAZER_RIG[species];
      if (grazer) {
        // The head hangs off the end of the neck, so grazing swings it down and
        // forward together rather than sinking it back into the shoulder.
        const grazing = animal.action === 'graze';
        place(flock.meshes.head, i, 0, grazing ? grazer.low : grazer.high, grazing ? grazer.neck + .22 : grazer.neck,
          grazing ? 1.15 + Math.sin(animal.clock * .8) * .06 : .10 + Math.sin(animal.clock * .8) * .07,
          Math.sin(animal.clock * .63) * .10);
        for (let leg = 0; leg < 4; leg++) place(flock.meshes.legs, i * 4 + leg, leg % 2 ? grazer.hip : -grazer.hip,
          grazer.shoulder, leg < 2 ? grazer.fore : -grazer.fore,
          walking ? Math.sin(phase + (leg === 0 || leg === 3 ? 0 : Math.PI)) * grazer.stride : 0);
        return;
      }
      if (species === 'upland-hare') {
        place(flock.meshes.head, i, 0, .38, .25, walking ? -.14 : Math.sin(animal.clock * .95) * .07, Math.sin(animal.clock * .73) * .12);
        for (let side = 0; side < 2; side++) place(flock.meshes.ears, i * 2 + side, side ? .07 : -.07, .47, .20,
          walking ? -.4 : Math.sin(animal.clock * 1.5 + side) * .14, 0, (side ? 1 : -1) * .12);
        return;
      }
      if (species === 'dolphin') return;   // a back and a fin: one piece, and no limb on it
      const rig = BIRD_RIG[species];
      if (rig) {
        // Head, neck and bill are part of the body: a heron's neck is its posture,
        // not a joint, and the two instanced batches a bird needs are wings and legs.
        for (let side = 0; side < 2; side++) {
          // In the air the wings are out and beating and the legs trail; on the water's
          // edge they are swept back along the flank, shortened, and dropped a little.
          const flying = animal.action === 'fly', sign = side ? -1 : 1;
          place(flock.meshes.wings, i * 2 + side, sign * rig.out, rig.shoulder, -.02, 0,
            (side ? Math.PI : 0) + (flying ? 0 : sign * rig.sweep),
            sign * (flying ? rig.beat + Math.sin(animal.clock * 9) * .42 : rig.fold),
            flying ? 1 : rig.tuck, 1, 1);
          if (!flock.meshes.legs) continue;
          place(flock.meshes.legs, i * 2 + side, side ? rig.apart : -rig.apart, rig.hip, .02,
            flying ? 1.15 : walking ? Math.sin(phase + side * Math.PI) * rig.swing : 0);
        }
        return;
      }
      if (species === 'boar') {
        // No neck: the head carries straight on out of the shoulder, and a boar
        // that is not running keeps its nose in the ground.
        const grazing = animal.action === 'graze';
        place(flock.meshes.head, i, 0, grazing ? .38 : .52, grazing ? .46 : .40,
          grazing ? .52 + Math.sin(animal.clock * .9) * .07 : .12 + Math.sin(animal.clock * .9) * .06,
          Math.sin(animal.clock * .7) * .09);
        for (let leg = 0; leg < 4; leg++) place(flock.meshes.legs, i * 4 + leg, leg % 2 ? .17 : -.17, .36,
          leg < 2 ? .26 : -.26, walking ? Math.sin(phase + (leg === 0 || leg === 3 ? 0 : Math.PI)) * .46 : 0);
        return;
      }
      // The fox and the otter: a low head that lifts and holds when the fox watches.
      const watch = animal.watching ?? 0;
      place(flock.meshes.head, i, 0, .27 + watch * .06, species === 'river-fox' ? .29 : .32,
        walking ? -.1 : -.04 - watch * .12, Math.sin(animal.clock * (watch > .5 ? .35 : .8)) * (watch > .5 ? .05 : .14));
      for (let leg = 0; leg < 4; leg++) place(flock.meshes.legs, i * 4 + leg, leg % 2 ? .075 : -.075, .18,
        leg < 2 ? .17 : -.17, walking ? Math.sin(phase + (leg === 0 || leg === 3 ? 0 : Math.PI)) * .38 : 0);
    });
    for (const mesh of Object.values(flock.meshes)) mesh.instanceMatrix.needsUpdate = true;
  }

  for (const flock of flocks) render(flock);

  const REACH = LIFE_REACH;
  let clock = 0, lastPlayer = null;
  function update(dt, player, active = true) {
    if (disposed || !active || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(player?.x) || !Number.isFinite(player?.z)) return;
    const step = Math.min(dt, .25); updates++; clock += step;
    // How fast the traveler is coming on, which is what the fox paces itself against. A jump is not a stride.
    const strode = lastPlayer ? Math.hypot(player.x - lastPlayer.x, player.z - lastPlayer.z) : Infinity;
    const motion = strode < 6 ? { vx: (player.x - lastPlayer.x) / step, vz: (player.z - lastPlayer.z) / step } : { vx: 0, vz: 0 };
    lastPlayer = { x: player.x, z: player.z };
    for (const flock of flocks) {
      const aloft = flock.zone.air ? (flock.zone.circle ?? CIRCLE_RADIUS) + (flock.zone.quarter ?? 0) : 0;
      const near = Math.hypot(player.x - flock.centre.x, player.z - flock.centre.z) <= REACH + aloft;
      flock.group.visible = near;
      if (!near) continue;
      if (flock.seen !== undefined && clock - flock.seen > 1) settle(flock, clock - flock.seen);
      flock.seen = clock; flock.ticks++;
      flock.cx = flock.animals.reduce((sum, animal) => sum + animal.x, 0) / Math.max(1, flock.animals.length);
      flock.cz = flock.animals.reduce((sum, animal) => sum + animal.z, 0) / Math.max(1, flock.animals.length);
      for (const animal of flock.animals) {
        if (flock.zone.air) tickAir(animal, step);
        else if (flock.zone.sea) tickSea(animal, step);
        else tickGround(animal, step, player, flock, motion);
      }
      render(flock);
    }
  }

  /** Developer flight looks at the same paused world from somewhere else. */
  function setObserver(position) {
    if (disposed || !Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return false;
    for (const flock of flocks)
      flock.group.visible = Math.hypot(position.x - flock.centre.x, position.z - flock.centre.z) <= REACH;
    return true;
  }

  function snapshot() {
    return {
      updates,
      creatures: creatures.map(animal => ({ id: animal.id, species: animal.species, region: animal.region,
        x: animal.x, y: animal.y + animal.lift, groundY: animal.y, z: animal.z, yaw: animal.yaw,
        action: animal.action, speed: animal.speed, clock: animal.clock, watching: animal.watching,
        lift: animal.lift, hidden: !!animal.hidden })),
      groups: flocks.map(flock => ({ id: flock.zone.id, visible: flock.group.visible, ticks: flock.ticks, count: flock.animals.length })),
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const flock of flocks) {
      flock.group.removeFromParent();
      for (const mesh of Object.values(flock.meshes)) mesh.dispose();
    }
  }

  return { update, setObserver, snapshot, state: snapshot, dispose };
}
