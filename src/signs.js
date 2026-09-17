import * as THREE from 'three';
import { forestPlaceDefinitions } from './forest-places.js';

/**
 * One sign language for the whole road.
 *
 * Every sign is weathered timber in the village's own carpentry: square posts in
 * the dark post wood, boards in the lighter board wood with a dark edge, and
 * cream lettering from one atlas at one letter height. Shape carries meaning:
 *
 *  - `direction`  a pointed board (a finger) on a post: the point shows the way;
 *  - `place`      a square board between two posts: the name of where you are;
 *  - `notice`     a small plaque with pinned papers: orders, notices, a closed border;
 *  - `border`     a limewashed standing stone with a painted panel on each face;
 *                 the face a traveler walks up to names the land beyond the stone;
 *  - `milestone`  a round-headed stone post counting the distance to a place.
 *
 * All faces carry text on both sides, so nothing on a sign reads backwards or
 * turns its lettering away from the road. Nothing is glossy or emissive, and
 * every part uses a shared material so the static batcher merges it.
 */

/** Every label a sign may carry. The lettering atlas is built from this list once. */
export const SIGN_LABELS = Object.freeze([
  // Tidehaven and the Greenway
  'Tidehaven', 'Tidehaven Landing', 'The Greenway', 'Fernway Rest', 'The Caloss Gate', 'Village road',
  ...forestPlaceDefinitions.map(site => site.name),
  // Drent
  'The Avrel Clearing', 'Clearing mill & farms', 'Caloss Crossing', 'The Caloss Bridge', 'Avrel',
  'Charcoal Burners', 'The Forester’s Hut', 'The Wayside Shrine', 'The Timber Landing', 'Drent',
  // Luscia
  'Luscia', 'Reedcutters’ Camp', 'Sava’s Shrine', 'The Waymarkers', 'The Lauvel Relay', 'Quiet fishing bank', 'Return to bridge',
  'The Lauvel', 'The Burned Hamlet', 'Lumber Town', 'The Stable Yard', 'Notices',
  // The Moros Plain
  'Moros Plain', 'The Moros Gate', 'The Legion Camp', 'The Moros Outpost', 'The Border Stockade', 'Orders',
  'The Shepherd’s Fold', 'The Legion Picket', 'Truce',
  // East Suval
  'East Suval', 'Elod', 'The Elodi Frontier', 'Elod’s Border Post', 'Closed by Elod',
  // Milestones on the Moros
  'I', 'II', 'III',
]);

const CELL_WIDTH = 512, CELL_HEIGHT = 64, COLUMNS = 2, FONT_PX = 42;
/** Metres of board for one atlas pixel: every sign letters at the same height. */
export const LETTER_STRIP = 0.34;
const METRES_PER_PIXEL = LETTER_STRIP / CELL_HEIGHT;
/** A stable estimate of a label's drawn width, identical in Node and the renderer. */
export const labelPixels = label => Math.max(40, Math.min(CELL_WIDTH - 20, Math.round([...label].reduce((sum, ch) =>
  sum + (ch === ' ' ? 11 : /[A-Z]/.test(ch) ? 27 : /[ilIj’'.,&]/.test(ch) ? 12 : /[mwMW]/.test(ch) ? 31 : 21), 0))));
/** The board length a label needs, in metres. */
export const labelMetres = label => labelPixels(label) * METRES_PER_PIXEL;

const nextPow2 = n => 2 ** Math.ceil(Math.log2(Math.max(1, n)));
const ATLAS_HEIGHT = nextPow2(Math.ceil(SIGN_LABELS.length / COLUMNS) * CELL_HEIGHT);
const ATLAS_WIDTH = CELL_WIDTH * COLUMNS;

/** The standard colours: the village's own post, board and edge woods, lime and paint. */
export const SIGN_COLOURS = Object.freeze({
  post: '#71523a', board: '#ab7950', edge: '#59432e', lime: '#cfc9b4', stone: '#85998a',
  letter: '#f4e7c4', ink: '#3b2b1e', paper: '#e7dcbc',
  paint: Object.freeze({ empire: '#7c3a2f', luscia: '#5d6f55', moros: '#8a7440', elod: '#2c2c2e', drent: '#4f6b45', plain: '#59432e' }),
});

/**
 * Builds signs from the world's toolkit. `kit` provides `material`, `mesh`,
 * `box`, `groundFor(parent)`, `pushFor(parent)` and `worldSpot(parent, x, z)`.
 */
export function createSigns(kit) {
  const { material, mesh, box, groundFor, pushFor, worldSpot } = kit;
  const post = material(SIGN_COLOURS.post), board = material(SIGN_COLOURS.board), edge = material(SIGN_COLOURS.edge);
  const lime = material(SIGN_COLOURS.lime), paper = material(SIGN_COLOURS.paper), ink = material(SIGN_COLOURS.ink);
  const cells = new Map(SIGN_LABELS.map((label, index) => [label, index]));
  const lettering = (() => {
    let texture;
    if (typeof document === 'undefined') {
      texture = new THREE.DataTexture(new Uint8Array([244, 231, 196, 255]), 1, 1); texture.needsUpdate = true;
    } else {
      const canvas = document.createElement('canvas'); canvas.width = ATLAS_WIDTH; canvas.height = ATLAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 ${FONT_PX}px Georgia, serif`;
      ctx.lineJoin = 'round';
      SIGN_LABELS.forEach((label, index) => {
        const cx = (index % COLUMNS) * CELL_WIDTH + 10 + labelPixels(label) / 2, cy = Math.floor(index / COLUMNS) * CELL_HEIGHT + CELL_HEIGHT / 2 + 2;
        ctx.lineWidth = 7; ctx.strokeStyle = SIGN_COLOURS.ink; ctx.strokeText(label, cx, cy, labelPixels(label));
        ctx.fillStyle = SIGN_COLOURS.letter; ctx.fillText(label, cx, cy, labelPixels(label));
      });
      texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    }
    return new THREE.MeshStandardMaterial({ color: '#ffffff', map: texture, roughness: 1, metalness: 0, alphaTest: .42 });
  })();
  const records = [];

  /** A lettered strip, both faces, centred on the parent's origin in its local x/y plane. */
  function letters(label, parent, y, depth, x = 0) {
    const index = cells.get(label);
    if (index === undefined) throw new Error(`Sign label "${label}" is not in SIGN_LABELS.`);
    const px = labelPixels(label) + 20, width = px * METRES_PER_PIXEL;
    const u0 = ((index % COLUMNS) * CELL_WIDTH) / ATLAS_WIDTH, u1 = u0 + px / ATLAS_WIDTH;
    const top = Math.floor(index / COLUMNS) * CELL_HEIGHT;
    const v1 = 1 - top / ATLAS_HEIGHT, v0 = 1 - (top + CELL_HEIGHT) / ATLAS_HEIGHT;
    for (const side of [1, -1]) {
      const geometry = new THREE.PlaneGeometry(width, LETTER_STRIP);
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
      const face = mesh(geometry, lettering, x, y, side * (depth / 2 + .004), 1, 1, 1, parent);
      face.rotation.y = side === 1 ? 0 : Math.PI; face.castShadow = false; face.name = `Lettering: ${label}`;
    }
    return width;
  }
  function squarePost(parent, x, y, z, height, size = .16) {
    box(post, x, y + height / 2, z, size, height, size, parent);
    box(edge, x, y + height + .04, z, size + .06, .08, size + .06, parent);
  }
  const frame = (parent, x, y, length, height, depth) => {
    box(edge, x, y + height / 2 + .03, 0, length + .08, .06, depth + .02, parent);
    box(edge, x, y - height / 2 - .03, 0, length + .08, .06, depth + .02, parent);
  };

  /**
   * A fingerpost. `toward` is a point (in the parent's frame) the upper finger
   * points at; `back`, if given, is where the lower finger points with `backLabel`.
   */
  function direction({ x, z, label, toward, back = null, backLabel = null, parent, record = true }) {
    const y = groundFor(parent)(x, z);
    const group = new THREE.Group(); group.name = `Road sign: ${label}`; group.position.set(x, y, z); parent.add(group);
    squarePost(group, 0, 0, 0, 2.55);
    const finger = (text, target, height, lean) => {
      const dx = target.x - x, dz = target.z - z, length = Math.hypot(dx, dz) || 1;
      const arm = new THREE.Group(); arm.position.y = height; arm.rotation.set(0, Math.atan2(-dz / length, dx / length), lean); group.add(arm);
      const run = labelMetres(text) + .5, point = .26, h = .44, depth = .07;
      const shape = new THREE.Shape();
      shape.moveTo(-.12, -h / 2); shape.lineTo(run - point, -h / 2); shape.lineTo(run, 0); shape.lineTo(run - point, h / 2); shape.lineTo(-.12, h / 2); shape.lineTo(-.12, -h / 2);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); geometry.translate(0, 0, -depth / 2);
      mesh(geometry, board, 0, 0, 0, 1, 1, 1, arm);
      box(edge, (run - point) / 2 - .06, -h / 2 - .02, 0, run - point + .1, .045, depth + .02, arm);
      letters(text, arm, .01, depth, .12 + labelMetres(text) / 2 + .02);
    };
    finger(label, toward, 2.12, .02);
    if (back && backLabel) finger(backLabel, back, 1.62, -.02);
    pushFor(parent)({ x, z, r: .2, kind: 'signpost' });
    if (record) {
      const spot = worldSpot(parent, x, z);
      records.push({ x: spot.x, z: spot.z, label, returnLabel: backLabel, kind: 'direction' });
    }
    return group;
  }

  /** A square name board between two posts, turned to `facing` (the board's normal, radians about Y). */
  function place({ x, z, label, facing = 0, parent, record = true, collide = true }) {
    const y = groundFor(parent)(x, z);
    const group = new THREE.Group(); group.name = `Place board: ${label}`; group.position.set(x, y, z); group.rotation.y = facing; parent.add(group);
    const length = labelMetres(label) + .7, height = .66, depth = .08;
    for (const side of [-1, 1]) squarePost(group, side * (length / 2 + .08), 0, 0, 2.35, .17);
    box(board, 0, 1.78, 0, length, height, depth, group);
    frame(group, 0, 1.78, length, height, depth);
    letters(label, group, 1.78, depth);
    if (collide) {
      const push = pushFor(parent), c = Math.cos(facing), s = Math.sin(facing);
      for (const side of [-1, 1]) push({ x: x + side * (length / 2 + .08) * c, z: z - side * (length / 2 + .08) * s, r: .2, kind: 'signpost' });
    }
    if (record) { const spot = worldSpot(parent, x, z); records.push({ x: spot.x, z: spot.z, label, returnLabel: null, kind: 'place' }); }
    return group;
  }

  /**
   * A small plaque with pinned papers. On its own post by default, or `mounted`
   * at a height on a wall or gate (no post, no collider).
   */
  function notice({ x, z, label, facing = 0, parent, mounted = null, record = true }) {
    const y = mounted === null ? groundFor(parent)(x, z) : mounted;
    const group = new THREE.Group(); group.name = `Notice: ${label}`; group.position.set(x, y, z); group.rotation.y = facing; parent.add(group);
    const width = Math.max(.95, labelMetres(label) + .3), top = mounted === null ? 1.55 : 0, depth = .07;
    if (mounted === null) for (const side of [-1, 1]) squarePost(group, side * (width / 2 - .05), 0, -.06, 1.95, .13);
    box(board, 0, top, 0, width, .95, depth, group);
    frame(group, 0, top, width, .95, depth);
    letters(label, group, top + .26, depth);
    for (const side of [1, -1]) for (const [px, py, w, h] of [[-.2, -.12, .34, .3], [.19, -.16, .3, .36]]) {
      box(paper, px * side, top + py, side * (depth / 2 + .012), w, h, .012, group);
      for (let line = 0; line < 3; line++) box(ink, px * side, top + py + h / 2 - .08 - line * .075, side * (depth / 2 + .02), w * .7, .018, .006, group);
    }
    if (mounted === null) pushFor(parent)({ x, z, r: .3, kind: 'notice-board' });
    if (record) { const spot = worldSpot(parent, x, z); records.push({ x: spot.x, z: spot.z, label, returnLabel: null, kind: 'notice' }); }
    return group;
  }

  /**
   * A border stone: limewashed, with a painted panel on each broad face.
   * `faces` is [front, back]: `{ label, paint }`. The front looks along `facing`
   * and is read by a traveler coming from that side, so it names the land behind
   * the stone: the land that traveler is about to enter.
   */
  function border({ x, z, faces, facing = 0, parent, record = true }) {
    const y = groundFor(parent)(x, z);
    const group = new THREE.Group(); group.name = `Border stone: ${faces.map(f => f.label).join(' | ')}`; group.position.set(x, y, z); group.rotation.y = facing; parent.add(group);
    const width = Math.max(1.2, ...faces.map(f => labelMetres(f.label) + .35)), height = 1.35, depth = .62;
    box(lime, 0, height / 2, 0, width, height, depth, group);
    const cap = mesh(new THREE.CylinderGeometry(0, Math.hypot(width, depth) / 2, .32, 4, 1), lime, 0, height + .16, 0, 1, 1, depth / width, group);
    cap.rotation.y = Math.PI / 4;
    box(material('#8f8d80'), 0, .06, 0, width + .22, .12, depth + .22, group);
    faces.forEach((face, i) => {
      const side = i ? -1 : 1, panel = new THREE.Group(); panel.position.set(0, .88, 0); panel.rotation.y = i ? Math.PI : 0; group.add(panel);
      box(material(face.paint), 0, 0, depth / 2 + .01, width - .16, .52, .02, panel);
      const strip = new THREE.Group(); strip.position.z = depth / 2 + .024; panel.add(strip);
      letters(face.label, strip, 0, 0);
      void side;
    });
    const c = Math.cos(facing), s = Math.sin(facing);
    const push = pushFor(parent);
    for (const along of [-width / 4, width / 4]) push({ x: x + along * c, z: z - along * s, r: .42, kind: 'border-stone' });
    if (record) { const spot = worldSpot(parent, x, z); records.push({ x: spot.x, z: spot.z, label: faces[0].label, returnLabel: faces[1]?.label ?? null, kind: 'border' }); }
    return group;
  }

  /** A milestone: a round-headed stone post with its count cut and picked out on a panel, both faces. */
  function milestone({ x, z, label, facing = 0, parent, record = true }) {
    const y = groundFor(parent)(x, z);
    const group = new THREE.Group(); group.name = `Milestone: ${label}`; group.position.set(x, y, z); group.rotation.y = facing; parent.add(group);
    const stone = material('#a9a797');
    box(stone, 0, .5, 0, .62, 1.0, .42, group);
    const head = mesh(new THREE.CylinderGeometry(.31, .31, .42, 8, 1, false, 0, Math.PI), stone, 0, 1.0, 0, 1, 1, 1, group);
    head.rotation.set(0, Math.PI / 2, Math.PI / 2);
    for (const side of [0, 1]) {
      const panel = new THREE.Group(); panel.position.set(0, .66, 0); panel.rotation.y = side * Math.PI; group.add(panel);
      box(material(SIGN_COLOURS.paint.plain), 0, 0, .215, .5, .4, .02, panel);
      const strip = new THREE.Group(); strip.position.z = .23; panel.add(strip);
      letters(label, strip, 0, 0);
    }
    pushFor(parent)({ x, z, r: .36, kind: 'milestone' });
    if (record) { const spot = worldSpot(parent, x, z); records.push({ x: spot.x, z: spot.z, label, returnLabel: null, kind: 'milestone' }); }
    return group;
  }

  return { direction, place, notice, border, milestone, records, lettering };
}
