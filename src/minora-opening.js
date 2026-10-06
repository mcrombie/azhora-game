import { MENORA } from './menora-city.js';

/**
 * Where a free start stands (the user, 5 October 2026: Rollo starts "right outside of that
 * Sorcerer's Tower in Menora"). On the forecourt south of the Guild tower, facing its door: yaw 0
 * faces north, and +x is east and +z south. Taleth stands a few steps ahead and to the right
 * (src/taleth.js). `pitch` is the follow camera's tilt at the start, low enough that the tower
 * rises over him instead of the paving filling the screen. Moving this also moves the parked
 * player behind the menu and the fallback for restoring a free-start save.
 */
export const MINORA_START = Object.freeze({ x: -2414, z: 63, yaw: 0, pitch: 0.15 });
export const MAIN_QUEST_RECRUITERS = Object.freeze(['harbormaster', 'instructor', 'relay-clerk']);
/** The first objective of a free start: the Master Sorcerer on the forecourt (docs/lizeem-farmlands-design.md, section 2). */
export const FREE_ROAM_GUIDANCE = Object.freeze({ title: 'Speak with the Master Sorcerer',
  detail: 'Taleth, Master Sorcerer of the Guild, is waiting on the forecourt of the tower in front of you. Jojo or Glun in Drent, or Iven in Nothom, can still introduce you to the main quest whenever you choose.',
  destinationIds: Object.freeze(['taleth']) });
export const freshMinoraStart = () => ({ version: 1, origin: 'minora', joined: false });
export const validMinoraStart = s => s == null || (s.version === 1 && s.origin === 'minora' && typeof s.joined === 'boolean');
export const mainQuestDormant = s => s?.origin === 'minora' && s.joined === false;

/** A slow, continuous city panorama. Wall time keeps the orbit steady at any frame rate. */
export function minoraOpeningView(seconds = 0) {
  const angle = .72 + seconds * Math.PI * 2 / 240;
  return { position: { x: MENORA.x + Math.sin(angle) * 330, y: 210 + Math.sin(angle * 2) * 12, z: MENORA.z + Math.cos(angle) * 330 },
    target: { x: MENORA.x, y: MENORA.elevation + 48, z: MENORA.z }, far: 2400, fog: .00125 };
}
