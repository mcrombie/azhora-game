import { PLAYABLE, DEFAULT_PLAYER, isPlayableId, shortName } from './player-characters.js';
import { SKILLS, skillLevel } from './skills.js';

/**
 * The line of eleven at the opening: who you are, chosen before you step ashore. Cromb stands
 * first and selected, so clicking straight through plays exactly the game that was there
 * before anybody could choose.
 *
 * The tiles are built from PLAYABLE and nothing else, so the character profiles will show up
 * here the moment they are written. A tile's portrait is painted in the character's own three
 * colours — the cloth, the skin and the hair his model is actually built from — rather than a
 * picture that would have to be kept in step with the model by hand.
 */

/**
 * What a character already knows when he lands, for the line under his name. Every id the table
 * names is registered in src/skills.js, so the skill's own name is always the one shown; an id
 * this build does not know falls back to itself rather than disappearing from the tile.
 *
 * `hidden` is the skills this game does not show at all (src/game-mode.js). A skill that is not
 * on the sheet is not handed out either, so it is not claimed here.
 */
export function describeStartingSkills(entry, hidden = null) {
  const parts = Object.entries(entry?.skills ?? {})
    .filter(([id]) => !hidden?.has(id))
    .map(([id, xp]) => (SKILLS[id] ? `${SKILLS[id].name} ${skillLevel(id, xp).level}` : id));
  return parts.length ? parts.join(' · ') : 'Nothing but the sword';
}

const hex = value => `#${(Number(value) >>> 0).toString(16).padStart(6, '0')}`;
/** Cromb is the traveler, who has no roster look; these are the colours his model is built from. */
const TRAVELER_COLOURS = Object.freeze({ tunic: 0x806042, skin: 0xd7ad7e, hair: 0x806044 });

/** The three colours a portrait is painted in, taken from the model the character is built as. */
export function tileColours(look) {
  const source = look ?? TRAVELER_COLOURS;
  return { tunic: hex(source.tunic), skin: hex(source.skin), hair: hex(source.hair) };
}

/**
 * @param root      the element the eleven tiles go in
 * @param detail    an element to write the chosen one's name, line and skills into
 * @param lookFor   (id) => the roster look his model is built from, or null for Cromb
 * @param onChange  called with the chosen id whenever the choice moves
 * @param hidden    skill ids this game does not show, so nobody claims one (src/game-mode.js)
 */
export function createCharacterSelect({ root, detail = null, lookFor = () => null, onChange = () => {}, selected = DEFAULT_PLAYER, hidden = null } = {}) {
  if (!root) throw new TypeError('The character line needs somewhere to stand.');
  const doc = root.ownerDocument;
  let chosen = isPlayableId(selected) ? selected : DEFAULT_PLAYER;
  const tiles = new Map();

  root.textContent = '';
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', 'Who you are');
  for (const entry of PLAYABLE) {
    const tile = doc.createElement('button');
    tile.type = 'button';
    tile.className = 'character-tile';
    tile.dataset.character = entry.id;
    tile.setAttribute('role', 'radio');
    const colours = tileColours(lookFor(entry.id));
    for (const [name, value] of Object.entries(colours)) tile.style.setProperty(`--${name}`, value);
    const portrait = doc.createElement('i');
    portrait.className = 'character-portrait';
    portrait.setAttribute('aria-hidden', 'true');
    const name = doc.createElement('b');
    name.textContent = shortName(entry);
    tile.append(portrait, name);
    tile.title = `${entry.name} · ${entry.title}`;
    tile.setAttribute('aria-label', `${entry.name}. ${entry.title}. ${entry.blurb} Starts with: ${describeStartingSkills(entry)}.`);
    tile.addEventListener('click', () => select(entry.id));
    tile.addEventListener('focus', () => select(entry.id));
    root.append(tile);
    tiles.set(entry.id, tile);
  }

  // Arrows walk the line, Home and End jump to the ends of it, the way a radio group does.
  // Space and Enter need no handling: the tiles are buttons and already answer to both.
  const STEP = Object.freeze({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 });
  root.addEventListener('keydown', event => {
    let next = null;
    if (Object.hasOwn(STEP, event.key)) {
      const at = PLAYABLE.findIndex(entry => entry.id === chosen);
      next = PLAYABLE[(at + STEP[event.key] + PLAYABLE.length) % PLAYABLE.length].id;
    } else if (event.key === 'Home') next = PLAYABLE[0].id;
    else if (event.key === 'End') next = PLAYABLE[PLAYABLE.length - 1].id;
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    select(next);
    tiles.get(next)?.focus();
  });

  function paint() {
    for (const [id, tile] of tiles) {
      const is = id === chosen;
      tile.classList.toggle('chosen', is);
      tile.setAttribute('aria-checked', is ? 'true' : 'false');
      // One stop on the way to Step ashore: the line is a single control, as a radio group is.
      tile.tabIndex = is ? 0 : -1;
    }
    if (!detail) return;
    const entry = PLAYABLE.find(item => item.id === chosen);
    detail.textContent = '';
    const name = doc.createElement('b');
    name.textContent = entry.name;
    const line = doc.createElement('span');
    line.textContent = entry.blurb;
    const skills = doc.createElement('small');
    skills.textContent = describeStartingSkills(entry, hidden);
    detail.append(name, line, skills);
  }

  function select(id, { announce = true } = {}) {
    if (!isPlayableId(id)) return chosen;
    const changed = id !== chosen;
    chosen = id;
    paint();
    if (changed && announce) onChange(chosen);
    return chosen;
  }

  paint();
  return {
    element: root,
    get selected() { return chosen; },
    select,
    /** The chosen entry itself, for whoever wants the blurb without looking it up again. */
    entry: () => PLAYABLE.find(item => item.id === chosen),
    tile: id => tiles.get(id) ?? null,
  };
}
