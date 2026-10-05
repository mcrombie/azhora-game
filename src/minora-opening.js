import { MENORA } from './menora-city.js';

export const MINORA_START = Object.freeze({ x: -2308, z: 135, yaw: Math.PI / 2 });
export const MAIN_QUEST_RECRUITERS = Object.freeze(['harbormaster', 'instructor', 'relay-clerk']);
export const FREE_ROAM_GUIDANCE = Object.freeze({ title: 'Your own road', detail: 'Explore Azhora at your own pace. Jojo or Glun in Drent, or Iven in Nothom, can introduce you to the main quest whenever you choose.' });
export const freshMinoraStart = () => ({ version: 1, origin: 'minora', joined: false });
export const validMinoraStart = s => s == null || (s.version === 1 && s.origin === 'minora' && typeof s.joined === 'boolean');
export const mainQuestDormant = s => s?.origin === 'minora' && s.joined === false;

/** A slow, continuous city panorama. Wall time keeps the orbit steady at any frame rate. */
export function minoraOpeningView(seconds = 0) {
  const angle = .72 + seconds * Math.PI * 2 / 240;
  return { position: { x: MENORA.x + Math.sin(angle) * 330, y: 210 + Math.sin(angle * 2) * 12, z: MENORA.z + Math.cos(angle) * 330 },
    target: { x: MENORA.x, y: MENORA.elevation + 48, z: MENORA.z }, far: 2400, fog: .00125 };
}
