import { INVENTORY_ITEMS } from './inventory.js';
import { createJourney } from './journey.js';
import { validateWeaponSnapshot } from './weapons.js';
import { journeySites } from './regions.js';
import { validateWoodlandProgress, copyWoodlandProgress } from './woodland-progress.js';
import { createForestStory, validateForestStorySnapshot } from './forest-story.js';
import { createForestHideoutQuest, validateForestHideoutSnapshot } from './forest-hideout.js';
import { createRegionalLife, validateRegionalLifeSnapshot } from './regional-life.js';
import { createCampaign } from './campaign.js';

export const ROAD_CHECKPOINT_KEY = 'azhora-road-checkpoint-v1';
export const ROAD_CHECKPOINT_VERSION = 1;
const WORLD_BOUNDS = Object.freeze({ minX: -94, maxX: 94, minZ: -680, maxZ: 48 });
const failed = reason => ({ ok: false, data: null, reason });

/**
 * Stable adventure checkpoints. Legacy onward-only saves remain supported.
 * Storage is injected so the rules can run without touching a browser or disk.
 */
export function createRoadCheckpoint({ storage, key = ROAD_CHECKPOINT_KEY } = {}) {
  function validate(data) {
    if (!data || typeof data !== 'object' || data.version !== ROAD_CHECKPOINT_VERSION
      || !Number.isInteger(data.questStage) || data.questStage < 1 || data.questStage > 10 || data.questStage === 4
      || (data.questStage < 10 && !data.woodland))
      return failed('This is not a supported road checkpoint.');
    if (!Array.isArray(data.inventory) || data.inventory.length > Object.keys(INVENTORY_ITEMS).length)
      return failed('The saved satchel is invalid.');
    const stock = new Map();
    for (const item of data.inventory) {
      if (!item || !Object.hasOwn(INVENTORY_ITEMS, item.id) || stock.has(item.id)
        || !Number.isSafeInteger(item.quantity) || item.quantity <= 0
        || (!INVENTORY_ITEMS[item.id].stackable && item.quantity !== 1)) return failed('The saved satchel contains an invalid item or quantity.');
      stock.set(item.id, item.quantity);
    }
    const required = ['simple-sword', ...(data.questStage >= 2 ? ['harbor-letter'] : []), ...(data.questStage >= 6 ? ['road-token'] : [])];
    if (!required.every(id => stock.has(id)))
      return failed('The road checkpoint is missing your sword, message, or travel token.');
    const inventory = { has: id => stock.has(id) };
    const journey = createJourney();
    if (!journey.restore(data.journey) || journey.state.started !== (data.questStage === 10))
      return failed('The saved road quests are invalid.');
    if (!validateWeaponSnapshot(data.weapons, inventory)) return failed('The saved weapon condition does not match your satchel.');
    if (!Array.isArray(data.journeyGathered) || new Set(data.journeyGathered).size !== data.journeyGathered.length
      || data.journeyGathered.some(id => !Object.hasOwn(journeySites, id) || !['sticks', 'fruit'].includes(journeySites[id].type)))
      return failed('The saved gathering sites are invalid.');
    if (typeof data.meadowCleared !== 'boolean' || typeof data.heardDoom !== 'boolean'
      || (Object.hasOwn(data, 'lysaComplete') && typeof data.lysaComplete !== 'boolean')) return failed('The saved road history is invalid.');
    const p = data.position;
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)
      || p.x <= WORLD_BOUNDS.minX || p.x >= WORLD_BOUNDS.maxX
      || p.z <= WORLD_BOUNDS.minZ || p.z >= WORLD_BOUNDS.maxZ) return failed('The saved position lies outside the playable road.');
    if (Object.hasOwn(data, 'health') && (!Number.isFinite(data.health) || data.health < 0 || data.health > 100))
      return failed('The saved health is invalid.');
    if (Object.hasOwn(data, 'woodland') && !validateWoodlandProgress(data.woodland, stock))
      return failed('The saved woodland progress is invalid.');
    if (!validateForestStorySnapshot(data.forestStory)) return failed('The saved woodland stories are invalid.');
    if (!validateForestHideoutSnapshot(data.forestHideout)) return failed('The saved woodland encounter is invalid.');
    if (!validateRegionalLifeSnapshot(data.regionalLife)) return failed('The saved lives along the road are invalid.');
    if (data.forestHideout?.accepted && data.questStage < 5) return failed('The woodland encounter precedes your combat lessons.');
    if (data.woodland && data.questStage >= 3 && (data.woodland.practiceHits < 2 || data.woodland.practiceDodges < 1))
      return failed('The saved combat lessons are incomplete.');
    if (data.questStage < 10 && (data.meadowCleared || data.journeyGathered.length))
      return failed('The saved onward journey has not begun.');
    // The civil-war campaign is optional in a save (older saves predate it) but
    // may not have moved past Drent before the road's final report was filed.
    const campaign = createCampaign();
    if (Object.hasOwn(data, 'campaign')) {
      if (!campaign.restore(data.campaign)) return failed('The saved campaign is invalid.');
      if (campaign.view().chapterId !== 'drent-road' && !journey.state.complete) return failed('The saved campaign outran the road out of Drent.');
    }

    // Store only the known schema. Fresh objects keep callers from modifying a
    // validated value through a previously retained array or nested reference.
    const result = {
      version: ROAD_CHECKPOINT_VERSION, questStage: data.questStage, journey: journey.snapshot(),
      inventory: [...stock].map(([id, quantity]) => ({ id, quantity })),
      weapons: { version: 1, equippedId: data.weapons.equippedId,
        sword: { ...data.weapons.sword }, stick: { ...data.weapons.stick } },
      journeyGathered: [...data.journeyGathered], meadowCleared: data.meadowCleared,
      position: { x: p.x, z: p.z }, heardDoom: data.heardDoom,
    };
    if (Object.hasOwn(data, 'lysaComplete')) result.lysaComplete = data.lysaComplete;
    if (Object.hasOwn(data, 'health')) result.health = data.health;
    if (Object.hasOwn(data, 'woodland')) result.woodland = copyWoodlandProgress(data.woodland);
    if (Object.hasOwn(data, 'forestStory')) { const story = createForestStory(); story.restore(data.forestStory); result.forestStory = story.snapshot(); }
    if (Object.hasOwn(data, 'forestHideout')) { const hideout = createForestHideoutQuest(); hideout.restore(data.forestHideout); result.forestHideout = hideout.snapshot(); }
    if (Object.hasOwn(data, 'regionalLife')) { const life = createRegionalLife(); life.restore(data.regionalLife); result.regionalLife = life.snapshot(); }
    if (Object.hasOwn(data, 'campaign')) result.campaign = campaign.snapshot();
    return { ok: true, data: result, reason: '' };
  }

  function read() {
    try {
      if (typeof storage?.getItem !== 'function') return failed('Checkpoint storage is unavailable.');
      const raw = storage.getItem(key);
      if (raw === null || raw === undefined) return { ok: true, data: null, reason: '' };
      if (typeof raw !== 'string' || raw.length > 65536) return failed('The saved checkpoint could not be read.');
      return validate(JSON.parse(raw));
    } catch {
      return failed('The saved checkpoint could not be read. Your current game is unchanged.');
    }
  }

  function save(data) {
    try {
      const checked = validate(data);
      if (!checked.ok) return checked;
      if (typeof storage?.setItem !== 'function') return failed('Checkpoint storage is unavailable.');
      storage.setItem(key, JSON.stringify(checked.data));
      return checked;
    } catch {
      return failed('The checkpoint could not be saved. You can keep playing and try again.');
    }
  }

  function clear() {
    try {
      if (typeof storage?.removeItem !== 'function') return failed('Checkpoint storage is unavailable.');
      storage.removeItem(key);
      return { ok: true, data: null, reason: '' };
    } catch {
      return failed('The checkpoint could not be cleared.');
    }
  }

  return { read, save, clear };
}
