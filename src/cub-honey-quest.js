/** The unnamed cub's lesson. Progress and the stolen comb are never inferred from ordinary honey. */
import { TESSEN_BRIDGE } from './pueth-world.js';

export const CUB = Object.freeze({ id: 'kayla-cub', name: 'Bear cub', role: "Kayla's honey-loving cub", maxHp: 120, radius: .45, talk: 3.4 });
export const CUB_STAND = Object.freeze({ x: -104, z: TESSEN_BRIDGE.south.z + 10, yaw: 1.1 });
export const CUB_HONEY_QUEST_ID = 'cub-honey';
export const CUB_HONEY_ITEM = 'liz-stolen-honey';
export const CUB_HONEY_SOURCE = 'liz-wood-hive-3';
export const CUB_HONEY_XP = 45;
export const CUB_HONEY_STAGES = Object.freeze(['unmet', 'offered', 'learning', 'carrying', 'complete']);
const fresh = () => ({ version: 1, stage: 'unmet', source: null, undetected: false, reward: false, catches: 0 });

export function validateCubHoneyQuestSnapshot(value, { allowMissing = true } = {}) {
  if (value === undefined) return allowMissing;
  if (!value || value.version !== 1 || !CUB_HONEY_STAGES.includes(value.stage)
    || typeof value.undetected !== 'boolean' || typeof value.reward !== 'boolean'
    || !Number.isInteger(value.catches) || value.catches < 0 || value.catches > 1e6) return false;
  const taken = ['carrying', 'complete'].includes(value.stage);
  return value.source === (taken ? CUB_HONEY_SOURCE : null) && value.undetected === taken
    && value.reward === (value.stage === 'complete');
}

export function createCubHoneyQuest({ onEvent = () => {} } = {}) {
  let data = fresh();
  const state = () => ({ ...data });
  const emit = type => onEvent({ type, ...state() });
  function offer() {
    if (data.stage !== 'unmet') return false;
    data.stage = 'offered'; emit('cub-honey-offered'); return true;
  }
  function accept({ teach = () => true } = {}) {
    if (!['unmet', 'offered'].includes(data.stage) || !teach()) return false;
    data.stage = 'learning'; emit('cub-honey-accepted'); return true;
  }
  function collect({ source, unseen, grant = () => false } = {}) {
    if (data.stage !== 'learning' || source !== CUB_HONEY_SOURCE || unseen !== true || !grant()) return false;
    data.stage = 'carrying'; data.source = source; data.undetected = true; emit('cub-honey-taken'); return true;
  }
  function caught() {
    if (!['learning', 'carrying'].includes(data.stage)) return false;
    data.catches = Math.min(1e6, data.catches + 1); emit('cub-honey-caught'); return true;
  }
  function deliver({ take = () => false, reward = () => {} } = {}) {
    if (data.stage !== 'carrying' || data.source !== CUB_HONEY_SOURCE || !data.undetected || !take()) return false;
    data.stage = 'complete'; data.reward = true;
    reward(CUB_HONEY_XP); emit('cub-honey-complete'); return true;
  }
  function restore(value) {
    if (!validateCubHoneyQuestSnapshot(value)) return false;
    data = value === undefined ? fresh() : { ...value }; return true;
  }
  return { state, snapshot: state, restore, offer, accept, collect, caught, deliver,
    get completed() { return data.stage === 'complete'; } };
}
