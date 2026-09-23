/**
 * One line-art mark per skill, drawn the way the satchel draws its items: a
 * 36×36 box, no fill, `currentColor` at 1.3, round caps and joins (see the icon
 * table in src/inventory.js). Defined once here so the skills grid, the guide
 * panel and anything later that wants a skill's face all draw the same thing.
 * Pure: strings only, no DOM, no three.
 */

/** The inner markup of each skill's mark, keyed by skill id. */
export const SKILL_ICONS = Object.freeze({
  // A songbird on a rail, head up and tail down, the way you first see one.
  birding: '<circle cx="24" cy="11" r="3.6"/><path d="m27.4 9.8 4.6 1.8-4.6 1.8M25.6 10h.01"/>'
    + '<path d="M21.2 13.2C15 14.4 10 18.6 8 25c6.4 1.4 11.6-.6 14.8-4.4 2-2.4 3-4.8 3.2-7"/>'
    + '<path d="m8 25-4.4 3.4M16.6 17.6c1.8 1 3 2.6 3.4 4.6M6 30h24"/>',
  // A hook on its line, eye at the top and barb at the turn.
  fishing: '<circle cx="23" cy="5.4" r="2.2"/><path d="m25.2 4.6 7-1.6"/>'
    + '<path d="M23 7.6v10.6c0 5-4.2 9-9.2 9S4.6 23.2 4.6 18.2"/><path d="M4.6 18.2V13M2.6 15.4l2 2.4 2-2.4"/>',
  // A sprig: one stem, two leaves and a bud.
  botany: '<path d="M18 33V8"/><path d="M18 22c-6.2.4-9.8-2.6-10.2-7.8 5.2-.4 9.8 2.6 10.2 7.8Z"/>'
    + '<path d="M18 17.4c6.2.4 9.8-2.6 10.2-7.8-5.2-.4-9.8 2.6-10.2 7.8Z"/>'
    + '<path d="M18 8.4c-2.6-1.8-3-4.4-1.2-7 2.6 1.8 3 4.4 1.2 7Z"/>',
  // A stone with its faces cut, the way one looks when it has been split.
  geology: '<path d="M5 16 12.6 5.6h10.8L31 16 18 31Z"/><path d="m12.6 5.6 5.4 10.4 5.4-10.4M5 16h26M18 16v15"/>',
  // Cap, stem and the spots on top.
  mycology: '<path d="M5 17.6c0-7.2 5.8-12.6 13-12.6s13 5.4 13 12.6c0 1.6-1.4 2.6-3.4 2.6H8.4C6.4 20.2 5 19.2 5 17.6Z"/>'
    + '<path d="M13.8 20.2v6.6c0 2.6 1.8 4.6 4.2 4.6s4.2-2 4.2-4.6v-6.6"/>'
    + '<path d="M12 12.4h.01M19 9.4h.01M25 13.4h.01"/>',
  // A trowel, blade up: what you dig with, and what you leave the rest of it with.
  archaeology: '<path d="M18 3 9.6 16.8c-1.4 2.4-.2 5.4 2.6 6.2l5.8 1.6 5.8-1.6c2.8-.8 4-3.8 2.6-6.2Z"/>'
    + '<path d="M18 8.6v13M18 24.6V29"/><path d="M14.8 29h6.4v4h-6.4Z"/>',
  // A glass, with what is in it.
  wine: '<path d="M8.6 4.4h18.8c0 8.6-3.6 13.8-9.4 13.8S8.6 13 8.6 4.4Z"/>'
    + '<path d="M9.4 11h17.2M18 18.2V30M11 30h14"/>',
  // A pot, its two handles, and what is coming off it.
  cooking: '<path d="M5 14.6h26v8.6c0 4.2-3.2 7.4-7.4 7.4h-11.2C8.2 30.6 5 27.4 5 23.2Z"/>'
    + '<path d="M3 14.6h30M5 18.6H2.4M31 18.6h2.6"/>'
    + '<path d="M13 11c-1.8-2.2.6-3.6-1.2-5.8M20 10c-1.8-2.2.6-3.6-1.2-5.8M27 11c-1.8-2.2.6-3.6-1.2-5.8"/>',
  // An axe left standing in a stump, which is where Bowden keeps his.
  woodcutting: '<ellipse cx="18" cy="25" rx="10" ry="4"/><path d="M8 25v4c0 2.2 4.4 4 10 4s10-1.8 10-4v-4"/>'
    + '<ellipse cx="18" cy="25" rx="4" ry="1.6"/><path d="M14.6 21.4 26 6"/>'
    + '<path d="M23.4 3.6c3.4-.8 6.6.8 7.4 4l-5.6 2.6c-.6-2.2-2-3.2-4.2-3.2Z"/>',
  // A frame with the studs still showing: what goes on first.
  construction: '<path d="M3 17 18 5l15 12"/><path d="M7 15.2V31h22V15.2"/><path d="M13 31V20.4h10V31M13 25.6h10"/>',
  // A folded chart with a rose on it, which is what Chris hands over.
  cartography: '<path d="M3 8 12.5 4.6 23.5 8 33 4.6v23l-9.5 3.4L12.5 28 3 31.4Z"/>'
    + '<path d="M12.5 4.6V28M23.5 8v23"/>'
    + '<path d="m28 12.6 1.5 3.9 3.9 1.5-3.9 1.5-1.5 3.9-1.5-3.9-3.9-1.5 3.9-1.5Z"/>'
    + '<path d="M6 14.6c3-2 5.2-1 7.2 1.2"/>',
  // A head above the water, an arm going over, and the water itself.
  swimming: '<circle cx="13" cy="10" r="3.3"/>'
    + '<path d="M16.4 12.6c3.8-.4 6.8 1.2 9 4.8M9.6 11.6c-2.6 1.2-4.4 3.2-5.4 6"/>'
    + '<path d="M3 23.4c3.1-2.5 6.2-2.5 9.3 0s6.2 2.5 9.3 0 6.2-2.5 9.3 0"/>'
    + '<path d="M3 29.4c3.1-2.5 6.2-2.5 9.3 0s6.2 2.5 9.3 0 6.2-2.5 9.3 0"/>',
  // An open book: two leaves, the spine between them, and writing you cannot read yet.
  // An ear of barley on its stem: the one skill that ripens on a clock of its own.
  farming: '<path d="M18 33V13"/><path d="M18 13c-4.6 0-7-2.6-7-7 4.6 0 7 2.6 7 7Z"/>'
    + '<path d="M18 13c4.6 0 7-2.6 7-7-4.6 0-7 2.6-7 7Z"/><path d="M18 21c-4.6 0-7-2.6-7-7 4.6 0 7 2.6 7 7Z"/>'
    + '<path d="M18 21c4.6 0 7-2.6 7-7-4.6 0-7 2.6-7 7Z"/><path d="M5 33h26"/>',
  linguist: '<path d="M18 9.6C14.4 6.8 9.6 5.8 4 6.2v20c5.6-.4 10.4.6 14 3.4 3.6-2.8 8.4-3.8 14-3.4v-20c-5.6-.4-10.4.6-14 3.4Z"/>'
    + '<path d="M18 9.6v20"/>'
    + '<path d="M7.8 12.8c2.4-.2 4.6.2 6.6 1.2M7.8 17.8c2.4-.2 4.6.2 6.6 1.2M21.6 14c2-1 4.2-1.4 6.6-1.2M21.6 19c2-1 4.2-1.4 6.6-1.2"/>',
  // Arms: the seven fighting skills. Each is its own weapon in silhouette, drawn like the rest -
  // one line, no fill - so a tile under the Arms heading reads as a tile and not as a badge.
  blades: '<path d="M18 4 21 9v14h-6V9Z"/><path d="M12 23h12"/><path d="M18 23v7"/><path d="M15 30h6"/>',
  'heavy-arms': '<path d="M18 5c4 0 7 3 7 6.5S22 18 18 18s-7-3-7-6.5S14 5 18 5Z"/>'
    + '<path d="M13.4 8.6 8 6M22.6 8.6 28 6M13.4 14.4 8 17M22.6 14.4 28 17"/><path d="M18 18v13"/>',
  polearms: '<path d="M18 3v29"/><path d="M18 3l3.2 6.4L18 12l-3.2-2.6Z"/><path d="M14.6 13.6h6.8"/>',
  staves: '<path d="M9 31 27 5"/><path d="M10.6 8.2a2.6 2.6 0 1 0 0-.1"/><path d="M25.4 27.8a2.6 2.6 0 1 0 0-.1"/>',
  bows: '<path d="M11 5c8 4 8 22 0 26"/><path d="M11 5c-2.6 8-2.6 18 0 26"/><path d="M11 18h16"/><path d="M23 14.4 27 18l-4 3.6"/>',
  shield: '<path d="M18 4 29 8v9c0 7-4.6 11.6-11 15C11.6 28.6 7 24 7 17V8Z"/><path d="M18 4v29"/><path d="M7.6 15h20.8"/>',
  toughness: '<path d="M18 5c3.2 2.4 6.6 3.4 10 3.2V19c0 6.4-4 10.4-10 13C12 29.4 8 25.4 8 19V8.2c3.4.2 6.8-.8 10-3.2Z"/>',
  // Sorcery (src/sorcery.js). A flame for fire; a six-armed flake for frost; a warding arc for
  // wards. The two that nobody teaches wear their marks already, so the grid does not change
  // shape on the day somebody does.
  fire: '<path d="M18 4c1 5-2.6 7-2.6 11.4a4 4 0 0 0 7.4 2.2C25 21 26 23.6 26 25.4 26 30 22.4 33 18 33S10 30 10 25.4C10 18 18 15 18 4Z"/>',
  // A head in profile with a thread leaving it, for Mind; a bee over a skep, for Beast.
  mind: '<path d="M23.5 6.5c-5.4 0-9.6 4-9.6 9.1 0 2.6-1 4-2.4 5.4-.9.9-.6 2.1.7 2.4l2.3.5v4.3c0 1.6 1.3 2.9 2.9 2.9h6.1"/><path d="M27.5 12.5c2.6 1.4 4 4.4 3.2 7.2"/>',
  beast: '<path d="M9 28.5c0-6 4-10.5 9-10.5s9 4.5 9 10.5Z"/><path d="M11.8 24.2h12.4M13.4 20.6h9.2"/><ellipse cx="24.8" cy="10.4" rx="3.1" ry="2.2"/><path d="M24.8 8.2v4.4M22.2 7.6c-1.6-1.2-3.4-1.2-4.6 0M27.4 7.6c1.6-1.2 3.4-1.2 4.6 0"/>',
  frost: '<path d="M18 4v29"/><path d="M5.4 11.5 30.6 25.5"/><path d="M30.6 11.5 5.4 25.5"/><path d="M18 10.5 13.6 7M18 10.5 22.4 7M18 26.5 13.6 30M18 26.5 22.4 30"/>',
  wards: '<path d="M6 21c0-8.3 5.4-14 12-14s12 5.7 12 14"/><path d="M11.5 21c0-4.9 2.9-8.2 6.5-8.2s6.5 3.3 6.5 8.2"/><path d="M6 26.5h24"/>'
    + '<path d="M13.6 17.6 17 21l5.6-6.4"/>',
});

/** A skill's mark as a whole `<svg>`, ready to drop into a tile. */
export const skillIconSVG = id =>
  `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${SKILL_ICONS[id] ?? ''}</svg>`;
