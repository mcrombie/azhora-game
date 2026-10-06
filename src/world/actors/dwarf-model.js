import * as THREE from 'three';
import { createCharacter } from '../../content/characters/characters.js';

/** Adult proportions live on the rig so scene code may safely scale the root. */
export const DWARF_PROPORTIONS = Object.freeze({ height: .72, girth: 1.42, depth: 1.22 });
const ROLES = Object.freeze(['guard', 'artisan', 'resident']);
const PALETTES = Object.freeze({
  west: Object.freeze([0x696354, 0x8e6a47, 0x77794d]),
  east: Object.freeze([0x4d6971, 0x657866, 0x8b745d]),
});
const HAIR = Object.freeze([0x503728, 0x8b5a35, 0xaaa49a]);
const SKIN = Object.freeze([0xc19673, 0xb98561, 0xd3ac86]);
const material = (color, metallic = false) => new THREE.MeshStandardMaterial({ color, roughness: metallic ? .7 : 1,
  metalness: metallic ? .38 : 0, flatShading: true });
const BOX = new THREE.BoxGeometry(1, 1, 1);
function piece(parent, name, mat, position, scale) {
  const mesh = new THREE.Mesh(BOX, mat); mesh.name = name;
  mesh.position.set(...position); mesh.scale.set(...scale);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

/** Generic inhabitants, not new named characters. All use the existing walking,
 * conversation and combat rig, with bare heads and distinct working clothes. */
export function createDwarf({ variant = 0, role = 'resident', city = 'west' } = {}) {
  const index = Math.abs(Number.isFinite(variant) ? Math.trunc(variant) : 0) % 3;
  const occupation = ROLES.includes(role) ? role : 'resident';
  const kingdom = typeof city === 'string' && /east/i.test(city) ? 'east' : 'west';
  const tunic = PALETTES[kingdom][ROLES.indexOf(occupation)];
  const hairStyle = index === 1 && occupation === 'resident' ? 'long-loose' : index === 2 ? 'bald' : 'short-cropped';
  const facialHair = occupation === 'guard' ? ['forked', 'bushy', 'braided'][index]
    : occupation === 'artisan' ? ['trimmed', 'forked', 'bushy'][index] : ['bushy', 'braided', 'trimmed'][index];
  const actor = createCharacter({ role: 'mercenary', tunic, skin: SKIN[index], hat: false, armed: occupation === 'guard',
    look: { build: 'broad', hairStyle, hair: HAIR[index], facialHair, headgear: 'bare',
      garment: occupation === 'guard' ? 'gambeson' : occupation === 'artisan' ? 'bare-forearms' : 'jerkin',
      weapon: occupation === 'guard' ? 'axe' : null } });
  const body = actor.group.getObjectByName('Weight and hips'), head = actor.group.getObjectByName('Head');
  body.scale.set(DWARF_PROPORTIONS.girth, DWARF_PROPORTIONS.height, DWARF_PROPORTIONS.depth);
  // Preserve an adult-sized head and a broad jaw above the low, heavy shoulders.
  head.scale.set(.88, 1.28, 1);
  const chest = actor.group.getObjectByName('Chest'), chestY = chest.position.y;
  const at = (x, y, z) => [x, y - chestY, z];
  const leather = material(0x594330), trim = material(kingdom === 'west' ? 0xab9569 : 0x8ca8a0);
  if (occupation === 'guard') {
    const iron = material(0x767b7d, true);
    for (const side of [-1, 1]) piece(chest, 'Dwarf guard shoulder plate', iron, at(side * .215, 1.275, 0), [.22, .12, .33]);
    piece(chest, 'Dwarf gate insignia', trim, at(0, 1.15, .184), [.11, .16, .025]);
  } else if (occupation === 'artisan') {
    piece(chest, 'Dwarf work apron', leather, at(0, 1.0, .20), [.39, .55, .055]);
    piece(chest, 'Dwarf apron pocket', trim, at(.085, 1.04, .234), [.115, .13, .02]);
    const tool = new THREE.Group(); tool.name = 'Dwarf belt mallet'; tool.position.set(-.23, .91 - chestY, .1); chest.add(tool);
    piece(tool, 'Mallet handle', material(0x9b794d), [0, -.10, 0], [.034, .29, .035]);
    piece(tool, 'Mallet head', material(0x6d6050), [0, .035, 0], [.17, .08, .085]);
  } else {
    for (const side of [-1, 1]) piece(chest, 'Dwarf woven waistcoat', material(tunic), at(side * .122, 1.125, .188), [.205, .31, .04]);
    piece(chest, 'Dwarf cloth sash', trim, at(0, .93, .183), [.46, .085, .035]);
  }
  actor.group.name = `Baldro dwarf ${occupation}`;
  actor.group.userData = { ...actor.group.userData, creature: 'dwarf', dwarf: true, occupation, city: kingdom,
    hairStyle, facialHair, hat: false, variant: index };
  // A make() NPC is exempt from the human stand-in. These measurements also
  // give any future dwarf stand-in the same proportions and colours.
  actor.lodAppearance = { tunic, skin: SKIN[index], hair: HAIR[index], height: DWARF_PROPORTIONS.height,
    girth: DWARF_PROPORTIONS.girth };
  return actor;
}
