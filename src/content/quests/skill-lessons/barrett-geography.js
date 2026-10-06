import {isLegendaryRegion} from '../../regions/urubond/urubond-atlas.js';
import { BARRETT } from '../homes/willowmere-family.js';

export const BARRETT_GEOGRAPHY_COOLDOWN = 120;
const empty = () => ({ version: 1, lastAt: null, lastRegion: null, told: [] });
const nameValid = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 150;
const clockValid = value => Number.isFinite(value) && value >= 0 && value <= 1e8;
export function validateBarrettGeography(data, { allowMissing = true, playSeconds = Infinity } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return false;
  if (!Array.isArray(data.told) || data.told.length > 512 || data.told.some(name => !nameValid(name)) || new Set(data.told).size !== data.told.length) return false;
  if (data.lastAt === null) return data.lastRegion === null && data.told.length === 0;
  return clockValid(data.lastAt) && data.lastAt <= playSeconds && nameValid(data.lastRegion) && data.told.includes(data.lastRegion);
}

/** One label at a time from the complete authored atlas, including unbuilt lands.
 * Cartography still owns chart knowledge and XP. The saved active-play clock
 * owns the cooldown, so menus, closed sessions and reloading cannot shorten it. */
export function createBarrettGeography({ cartography, regions = () => [], random = Math.random,
  onChange = () => {}, onEvent = () => {} } = {}) {
  let state = empty();
  const atlas = () => {
    const source = typeof regions === 'function' ? regions() : regions;
    return [...new Map((source ?? []).filter(entry => nameValid(entry?.name ?? entry?.id)&&!isLegendaryRegion(entry.name??entry.id))
      .map(entry => [entry.name ?? entry.id, { ...entry, name: entry.name ?? entry.id }])).values()];
  };
  const remaining = clock => state.lastAt === null ? 0 : Math.max(0, state.lastAt + BARRETT_GEOGRAPHY_COOLDOWN - (clockValid(clock) ? clock : state.lastAt));
  function ask(clock) {
    if (!clockValid(clock)) return { ok: false, kind: 'clock', lines: ['Let us sit by the pond for a moment.'] };
    if (remaining(clock) > 0) return { ok: false, kind: 'quiet', remaining: remaining(clock),
      lines: ['I am thinking about somewhere else now. We can be quiet together for a little while.'] };
    if (!cartography?.met) return { ok: false, kind: 'no-chart', lines: ['Bring your chart next time. I can show you a place on it.'] };
    const all = atlas();
    if (!all.length) return { ok: false, kind: 'not-ready', lines: ['One moment. I am remembering where it is.'] };
    const unknown = all.filter(region => !cartography.named(region.name));
    const fresh = unknown.length > 0, pool = fresh ? unknown : all.filter(region => region.name !== state.lastRegion);
    const candidates = pool.length ? pool : all;
    const roll = Number(random()), index = Math.min(candidates.length - 1, Math.floor(Math.max(0, Number.isFinite(roll) ? roll : 0) * candidates.length));
    const chosen = candidates[index], result = cartography.hear(chosen.name);
    if (!result?.ok || !cartography.named(chosen.name)) return { ok: false, kind: 'not-ready', lines: ['Keep your chart ready. I want to show you properly.'] };
    state.lastAt = clock; state.lastRegion = chosen.name;
    if (!state.told.includes(chosen.name)) state.told.push(chosen.name);
    const drent = all.find(region => region.name === 'Drent');
    const dx = chosen.centerX - drent?.centerX, dy = chosen.centerY - drent?.centerY;
    let bearing = '';
    if (chosen.name === 'Drent') bearing = 'That is where we are sitting now.';
    else if (Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > .01) {
      const directions = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
      const direction = directions[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
      bearing = `It lies to the ${direction} of Drent.`;
    }
    onChange(snapshot()); onEvent({ type: 'barrett-region', region: chosen.name, first: !!result.first, xp: result.xp ?? 0 });
    return { ok: true, kind: fresh ? 'new-region' : 'remembered-region', region: chosen.name, first: !!result.first, xp: result.xp ?? 0,
      lines: [`${chosen.name}. ${fresh ? 'I will put its name on your chart.' : 'You have that name on your chart already. I like remembering the places.'}${bearing ? ` ${bearing}` : ''}`] };
  }
  function snapshot() { return { ...state, told: [...state.told] }; }
  function restore(data) {
    if (!validateBarrettGeography(data)) return false;
    state = data === undefined ? empty() : { version: 1, lastAt: data.lastAt, lastRegion: data.lastRegion, told: [...data.told] };
    return true;
  }
  return { ask, remaining, snapshot, restore };
}

/** This child chooses what he wants to share. No destination-selection or
 * generic wayfinding menu is attached to his conversation. */
export function barrettConversation(npc, context = {}) {
  if (npc?.id !== BARRETT.id) return false;
  const { geography, playSeconds = 0, openDialogue, closeDialogue, extraChoices = () => [] } = context;
  const back = () => barrettConversation(npc, context);
  const choices = [{ id: 'barrett-geography', label: 'Tell me about geography', action: () => {
    const result = geography.ask(typeof playSeconds === 'function' ? playSeconds() : playSeconds);
    openDialogue(npc, result.lines, null, result.kind === 'quiet' ? 'Sit quietly' : `Thank you, ${npc.name}`,
      { noWayfinding: true, onComplete: back });
  } }, ...extraChoices().filter(Boolean), { id: 'barrett-leave', label: 'Enjoy the pond', action: closeDialogue }];
  openDialogue(npc, ['I like maps. All those places, and every one has its own name.'], null, 'Enjoy the pond',
    { noWayfinding: true, choices });
  return true;
}
