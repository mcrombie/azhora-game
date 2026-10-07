import { CANON_VERSION, FERADOM_CANON, PILOT_SITES, RESOURCE_ITEMS, CUSTOMS, canonFor } from './canon.js';

export const SETTLEMENT_VERSION = 1;
export const DAY_SECONDS = 1440; // Azhora: one active second is one calendar minute.
export const dayAt = seconds => Math.floor((seconds + 360) / DAY_SECONDS);
export const midnightAt = day => day * DAY_SECONDS - 360;
const copy = value => structuredClone(value);
const clamp = (n, low = 0, high = 100) => Math.max(low, Math.min(high, n));
const integer = (n, lo, hi) => Number.isSafeInteger(n) && n >= lo && n <= hi;
const idOK = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
export function hash(text) { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }
const noise = (seed, ...parts) => hash([seed, ...parts].join(':')) / 4294967296;
const calendar = day => new Date(Date.UTC(980, 3, 1) + day * 86400000).toISOString().slice(0, 10);
export function makeResidents(site, seed) {
  const names = FERADOM_CANON.names;
  return Array.from({ length: 12 }, (_, i) => {
    const n = hash(`${seed}:${site.id}:${i}`), house = Math.floor(i / 3);
    return { id: `${site.id}-resident-${i + 1}`, name: `${names.heads[n % names.heads.length]}${names.tails[(n >>> 8) % names.tails.length]} ${names.heads[house]}${names.houses[house]}`,
      household: `${site.id}-house-${house + 1}`, occupation: i === 0 ? 'keeper of the tally' : i === 1 ? 'healer' : i === 2 ? 'water keeper' : site.kind === 'fishing' ? 'fisher' : site.kind === 'forestry' ? 'woodworker' : 'farmer',
      motive: ['keep the household fed', 'care for neighbors', 'protect the next season', 'be heard at the council'][i % 4],
      voice: ['practical and exact', 'observant and gentle', 'wary but fair', 'warm and plainspoken'][i % 4],
      language: FERADOM_CANON.language, health: 100, present: true, awaySince: null, memories: [],
      relationships: { [`${site.id}-resident-${(i + 1) % 12 + 1}`]: 55 }, trustPlayer: 0 };
  });
}
function freshSettlement(site, seed) {
  return { ...copy(site), canon: CANON_VERSION, residents: makeResidents(site, seed),
    stocks: { barley: site.kind === 'farming' ? 120 : 72, 'cooked-fish': site.kind === 'fishing' ? 48 : 12, 'pine-logs': 40, 'oak-plank': 8, herbs: 18, 'copper-piece': 24 },
    water: 60, waterCapacity: 84, infrastructure: 85, morale: 72, shortageDays: 0, recoveryDays: 0,
    customs: [], counters: { help: 0, care: 0, ration: 0 }, evidence: { help: [], care: [], ration: [] },
    requests: [], pendingEvents: [], lastNarrator: null };
}
const remember = (resident, event) => { resident.memories = [...resident.memories, event].slice(-16); };
function addCustom(s, key, counter, threshold) {
  if (s.counters[counter] < threshold || s.customs.some(c => c.id === key)) return;
  s.customs.push({ id: key, ...CUSTOMS[key], causes: s.evidence[counter].slice(-threshold) });
}
function validateResident(r, ids) {
  return idOK(r?.id) && typeof r.name === 'string' && r.name.length <= 90 && typeof r.household === 'string'
    && typeof r.occupation === 'string' && typeof r.motive === 'string' && typeof r.voice === 'string'
    && r.language === 'feradom' && integer(r.health, 0, 100) && typeof r.present === 'boolean'
    && (r.awaySince === null || integer(r.awaySince, -4000, 40000)) && integer(r.trustPlayer, 0, 100)
    && Array.isArray(r.memories) && r.memories.length <= 16 && r.memories.every(m => typeof m === 'string' && m.length < 200)
    && r.relationships && Object.entries(r.relationships).every(([id, n]) => ids.has(id) && integer(n, 0, 100));
}
export function validateSettlementSnapshot(v, { allowMissing = true } = {}) {
  if (v === undefined) return allowMissing;
  try {
    if (!v || v.version !== 1 || v.canon !== CANON_VERSION || !idOK(v.worldId) || !integer(v.seed, 0, 4294967295)
      || !Number.isFinite(v.time) || v.time < -5256000 || v.time > 52560000 || !integer(v.day, -4000, 40000)
      || v.day !== dayAt(v.time) || !integer(v.sequence, 0, 10000000) || !Array.isArray(v.settlements)
      || v.settlements.length < 1 || v.settlements.length > 3 || !Array.isArray(v.outbox) || v.outbox.length > 132) return false;
    if (v.parents !== undefined && (!Array.isArray(v.parents) || v.parents.length > 1024 || v.parents.some(p => !idOK(p.worldId) || p.worldId === v.worldId || !integer(p.throughDay, -4001, v.day)))) return false;
    const settlementIds = new Set(v.settlements.map(s => s.id));
    if (settlementIds.size !== v.settlements.length) return false;
    for (const s of v.settlements) {
      const site = PILOT_SITES.find(p => p.id === s.id);
      if (!site || s.kind !== site.kind || s.region !== site.region || s.canon !== CANON_VERSION
        || !Array.isArray(s.residents) || s.residents.length !== 12) return false;
      const ids = new Set(s.residents.map(r => r.id));
      if (ids.size !== 12 || s.residents.some((r, i) => r.id !== `${s.id}-resident-${i + 1}` || !validateResident(r, ids))) return false;
      if (!s.stocks || Object.keys(s.stocks).length !== RESOURCE_ITEMS.length || RESOURCE_ITEMS.some(id => !integer(s.stocks[id], 0, 100000)) || !validLedger(s.dayOpening)) return false;
      if (!integer(s.water, 0, 84) || s.waterCapacity !== 84 || !integer(s.infrastructure, 0, 100) || !integer(s.morale, 0, 100)
        || !integer(s.shortageDays, 0, 100000) || !integer(s.recoveryDays, 0, 100000)) return false;
      for (const k of ['help', 'care', 'ration']) if (!integer(s.counters[k], 0, 100000) || !Array.isArray(s.evidence[k])
        || s.evidence[k].length > 8 || s.evidence[k].some(id => typeof id !== 'string' || id.length > 200)) return false;
      if (!Array.isArray(s.customs) || s.customs.length > 3 || new Set(s.customs.map(c => c.id)).size !== s.customs.length
        || s.customs.some(c => !CUSTOMS[c.id] || c.name !== CUSTOMS[c.id].name || c.rule !== CUSTOMS[c.id].rule || !Array.isArray(c.causes) || !c.causes.length || c.causes.length > 8 || c.causes.some(id => typeof id !== 'string' || id.length > 200))) return false;
      if (!Array.isArray(s.requests) || s.requests.length > 16 || new Set(s.requests.map(r => r.id)).size !== s.requests.length
        || s.requests.some(r => !idOK(r.id) || !['supply', 'repair', 'message'].includes(r.type) || !['open', 'carried', 'complete'].includes(r.status)
          || !ids.has(r.residentId) || !integer(r.day, -4000, 40000) || r.day > v.day
          || r.quantity !== (r.type === 'repair' ? 2 : r.type === 'supply' ? 6 : 1) || r.reward !== (r.type === 'message' ? 1 : 2) || r.item !== (r.type === 'repair' ? 'oak-plank' : 'barley')
          || (r.type === 'message' && !settlementIds.has(r.destination)))) return false;
      if (!Array.isArray(s.pendingEvents) || s.pendingEvents.length > 48 || s.pendingEvents.some(e => !validEvent(e, ids))) return false;
      if (s.lastNarrator !== null && !ids.has(s.lastNarrator)) return false;
    }
    return new Set(v.outbox.map(e => e.id)).size === v.outbox.length && v.outbox.every(e => validateChronicleEntry(e) && e.worldId === v.worldId && settlementIds.has(e.settlementId));
  } catch { return false; }
}
const validEvent = (e, ids) => e && typeof e.id === 'string' && e.id.length <= 200 && typeof e.type === 'string'
  && typeof e.text === 'string' && e.text.length <= 700 && ids.has(e.actorId) && integer(e.impact, 0, 100);
const validLedger = l => l && RESOURCE_ITEMS.every(id => integer(l.stocks?.[id], 0, 100000))
  && integer(l.water, 0, 84) && integer(l.morale, 0, 100) && integer(l.infrastructure, 0, 100) && integer(l.population, 0, 12);
export function validateChronicleEntry(e) {
  try { return e?.version === 1 && e.canon === CANON_VERSION && idOK(e.worldId) && PILOT_SITES.some(s => s.id === e.settlementId)
    && typeof e.id === 'string' && e.id.length < 200 && e.id.startsWith(`${e.worldId}_${e.settlementId}_`)
    && integer(e.day, -4000, 40000) && ['opening', 'daily'].includes(e.kind) && e.date === calendar(e.day)
    && e.narrator && typeof e.narrator.name === 'string' && e.narrator.name.length <= 90
    && Array.isArray(e.residents) && e.residents.length === 12
    && e.residents.every(r => validateResident(r, new Set(e.residents.map(x => x.id))))
    && e.residents.some(r => r.id === e.narrator.id) && Array.isArray(e.events) && e.events.length > 0 && e.events.length <= 64
    && e.events.every(x => validEvent(x, new Set(e.residents.map(r => r.id))))
    && ['before', 'after'].every(k => validLedger(e[k]))
    && Array.isArray(e.customs) && e.customs.length <= 3 && e.customs.every(c => CUSTOMS[c.id])
    && typeof e.factsHash === 'string' && e.factsHash === String(hash(JSON.stringify({ events: e.events, before: e.before, after: e.after, narrator: e.narrator, customs: e.customs })));
  } catch { return false; }
}
const ledger = s => ({ stocks: copy(s.stocks), water: s.water, morale: s.morale, infrastructure: s.infrastructure, population: s.residents.filter(r => r.present).length });

export function createSettlementWorld({ seed = 980, worldId = 'feradom-preview', startTime = 0, sites = PILOT_SITES, saved } = {}) {
  if (!integer(seed, 0, 4294967295) || !idOK(worldId) || !Number.isFinite(startTime) || startTime < -5256000 || startTime > 52560000) throw new Error('Invalid settlement seed or time.');
  if (!sites.length || sites.some(s => !PILOT_SITES.some(p => p.id === s.id)) || new Set(sites.map(s => s.id)).size !== sites.length) throw new Error('Choose admitted pilot sites.');
  sites.forEach(s => canonFor(s.region));
  let state = { version: 1, canon: CANON_VERSION, worldId, seed, time: startTime, day: dayAt(startTime), sequence: 0,
    settlements: sites.map(s => freshSettlement(s, seed)), outbox: [] };
  function event(s, type, text, actor = s.residents[0], impact = 1) {
    const e = { id: `${state.worldId}_${s.id}_event_${++state.sequence}`, type, text, actorId: actor.id, impact };
    s.pendingEvents.push(e); remember(actor, e.id); return e;
  }
  function page(s, day, kind, before) {
    const events = copy(s.pendingEvents.splice(0));
    const impactful = [...events].sort((a, b) => b.impact - a.impact || a.id.localeCompare(b.id));
    const present = s.residents.filter(r => r.present);
    const consequential = impactful.find(e => present.some(r => r.id === e.actorId));
    const narrator = kind === 'daily' && (consequential?.impact ?? 0) <= 5
      ? present[((day % present.length) + present.length) % present.length]
      : s.residents.find(r => r.id === consequential?.actorId) ?? s.residents[0];
    s.lastNarrator = narrator.id;
    const after = ledger(s), customs = copy(s.customs), voice = { id: narrator.id, name: narrator.name, occupation: narrator.occupation, motive: narrator.motive, voice: narrator.voice };
    const e = { version: 1, canon: CANON_VERSION, worldId: state.worldId, settlementId: s.id, settlementName: s.name,
      id: `${state.worldId}_${s.id}_${kind}_${day < 0 ? 'm' + -day : day}`, day, kind, date: calendar(day),
      events, narrator: voice, before, after, residents: copy(s.residents), customs, generation: 'pending',
      factsHash: String(hash(JSON.stringify({ events, before, after, narrator: voice, customs }))) };
    state.outbox.push(e); s.dayOpening = copy(after);
  }
  function requests(s, day) {
    s.requests = s.requests.filter(r => r.status === 'carried' || r.day >= day - 7);
    for (const type of ['supply', 'repair', 'message']) {
      if (s.requests.some(r => r.type === type && r.status !== 'complete')) continue;
      if (type === 'supply' && s.stocks.barley + s.stocks['cooked-fish'] >= 72) continue;
      if (type === 'repair' && s.infrastructure >= 80) continue;
      const destination = state.settlements.find(x => x.id !== s.id)?.id;
      if (type === 'message' && !destination) continue;
      s.requests.push({ id: `${s.id}-${type}-${day < 0 ? 'm' + -day : day}`, day, type, status: 'open', residentId: s.residents[type === 'repair' ? 2 : 0].id,
        item: type === 'repair' ? 'oak-plank' : 'barley', quantity: type === 'repair' ? 2 : type === 'supply' ? 6 : 1,
        destination: destination ?? s.id, reward: type === 'message' ? 1 : 2 });
    }
  }
  function tickDay(day) {
    const befores = new Map(state.settlements.map(s => [s.id, copy(s.dayOpening ?? ledger(s))]));
    for (const s of state.settlements) {
      const workers = s.residents.filter(r => r.present && r.health >= 30).length;
      const badWeather = noise(state.seed, s.id, day, 'weather') < .25;
      const hungry = s.stocks.barley + s.stocks['cooked-fish'] < (s.customs.some(c => c.id === 'shared-reserve') ? 60 : 48);
      const harvest = Math.max(0, Math.floor(workers * (hungry ? 1.5 : 1.1)) - (badWeather ? 5 : 0));
      const food = s.kind === 'fishing' ? 'cooked-fish' : 'barley';
      s.stocks[food] = Math.min(400, s.stocks[food] + harvest);
      // Aggregate working holdings are separate from every harvestable world node.
      const logs = s.kind === 'forestry' ? (hungry ? 3 : 7) : 1;
      s.stocks['pine-logs'] = Math.min(120, s.stocks['pine-logs'] + logs);
      if (s.kind === 'forestry' && s.stocks['pine-logs'] >= 4 && s.stocks['oak-plank'] < 20) {
        // Planks have their own managed oak allocation; pine is hearth fuel, not converted into oak.
        s.stocks['oak-plank'] += 1;
      }
      s.stocks.herbs = Math.min(30, s.stocks.herbs + (day % 3 === 0 ? 1 : 0));
      const worker = s.residents.filter(r => r.present)[3] ?? s.residents[0];
      event(s, badWeather ? 'weather-loss' : 'work', `${badWeather ? 'Rough weather reduced the day’s yield. ' : ''}The ${hungry ? 'extra food work' : s.kind === 'forestry' ? 'household food plots and managed timber holdings' : 'working households'} provided ${harvest} ${food} and ${logs} pine logs.`, worker, badWeather ? 35 : 5);
      s.water = clamp(s.water + (badWeather ? 18 : 12) - (s.infrastructure < 50 ? 8 : 0), 0, 84);
      s.infrastructure = clamp(s.infrastructure - (badWeather ? 4 : 1));
      if (s.infrastructure < 65 && s.stocks['oak-plank'] >= 2) {
        s.stocks['oak-plank'] -= 2; s.infrastructure = clamp(s.infrastructure + 16);
        event(s, 'repair', 'The water keeper used two oak planks to repair the common shelter and water fittings.', s.residents[2], 40);
      }
    }
    // Conservative transfers between these holdings; no stock appears in player inventory.
    for (const receiver of state.settlements) {
      if (receiver.stocks.barley + receiver.stocks['cooked-fish'] >= 48) continue;
      const donor = state.settlements.find(s => s.id !== receiver.id && s.stocks.barley > 84);
      if (donor) {
        donor.stocks.barley -= 6; receiver.stocks.barley += 6;
        const e = event(receiver, 'mutual-aid', `${donor.name} sent six barley from its surplus.`, receiver.residents[0], 45);
        event(donor, 'mutual-aid-given', `Six barley were sent to ${receiver.name}.`, donor.residents[0], 35);
        receiver.counters.help++; receiver.evidence.help = [...receiver.evidence.help, e.id].slice(-8);
      }
    }
    for (const s of state.settlements) {
      const population = s.residents.filter(r => r.present).length;
      let need = population;
      for (const item of ['cooked-fish', 'barley']) { const used = Math.min(need, s.stocks[item]); s.stocks[item] -= used; need -= used; }
      const waterShort = s.water < population; s.water = Math.max(0, s.water - population);
      const cold = s.stocks['pine-logs'] === 0; s.stocks['pine-logs'] = Math.max(0, s.stocks['pine-logs'] - 1);
      const shortage = need > 0 || waterShort || cold;
      event(s, 'consumption', `The households used ${population - need} food portions, ${waterShort ? 'the remaining' : population} water portions, and ${cold ? 'no available' : 'one'} pine log for the hearth.`, s.residents[0], 1);
      s.shortageDays = shortage ? s.shortageDays + 1 : 0; s.recoveryDays = shortage ? 0 : s.recoveryDays + 1;
      s.morale = clamp(s.morale + (shortage ? s.customs.some(c => c.id === 'ration-council') ? -5 : -7 : s.customs.some(c => c.id === 'hearth-supper') ? 3 : 2));
      if (shortage) {
        const e = event(s, 'shortage', `The households lacked ${need} food portions${waterShort ? ' and enough clean water' : ''}${cold ? ' and hearth fuel' : ''}.`, s.residents[0], 80);
        s.counters.ration++; s.evidence.ration = [...s.evidence.ration, e.id].slice(-8);
        const disputant = s.residents[3], other = Object.keys(disputant.relationships)[0];
        disputant.relationships[other] = clamp(disputant.relationships[other] - 4);
        if (s.shortageDays % 3 === 0) event(s, 'dispute', `${disputant.name} challenged the household allocation at the tally; relations with the neighboring household worsened.`, disputant, 60);
      }
      for (const r of s.residents.filter(r => r.present)) r.health = clamp(r.health + (shortage ? -4 : 1));
      const patient = s.residents.find(r => r.present && r.health < 90);
      if (patient && s.stocks.herbs > 0) {
        s.stocks.herbs--; patient.health = clamp(patient.health + 8);
        const e = event(s, 'care', `${patient.name} received care and one portion of gathered herbs.`, s.residents[1], 55);
        s.counters.care++; s.evidence.care = [...s.evidence.care, e.id].slice(-8);
      }
      if (s.shortageDays >= 5) {
        const migrant = [...s.residents].reverse().find(r => r.present && ![s.residents[0].id, s.residents[1].id, s.residents[2].id].includes(r.id));
        if (migrant) { migrant.present = false; migrant.awaySince = day; event(s, 'departure', `${migrant.name} left to seek temporary support from kin.`, migrant, 90); }
      } else if (s.recoveryDays >= 3) {
        const returning = s.residents.find(r => !r.present && day - r.awaySince >= 3);
        if (returning) { returning.present = true; returning.awaySince = null; event(s, 'return', `${returning.name} returned after hearing that the stores were recovering.`, returning, 70); }
      }
      const beforeCustoms = s.customs.length;
      addCustom(s, 'shared-reserve', 'help', 3); addCustom(s, 'hearth-supper', 'care', 5); addCustom(s, 'ration-council', 'ration', 4);
      for (const c of s.customs.slice(beforeCustoms)) event(s, 'custom', `${c.name}: ${c.rule}`, s.residents[0], 75);
      requests(s, day + 1); page(s, day, 'daily', befores.get(s.id));
    }
  }
  function advanceTo(time, { maxDays = 30 } = {}) {
    if (!Number.isFinite(time) || time < state.time || time > 52560000 || !integer(maxDays, 1, 3650)) return { ok: false, reason: 'Time must move forward within the supported calendar.' };
    let advanced = 0;
    while (state.day < dayAt(time) && advanced < maxDays && state.outbox.length + state.settlements.length <= 128) {
      tickDay(state.day); state.day++; state.time = midnightAt(state.day); advanced++;
    }
    const caughtUp = state.day === dayAt(time); if (caughtUp) state.time = time;
    return { ok: true, advanced, caughtUp, pending: state.outbox.length };
  }
  function applyAction({ settlementId, requestId, action = 'complete', contactId }, inventory) {
    const s = state.settlements.find(x => x.id === settlementId), r = s?.requests.find(x => x.id === requestId);
    if (!s || !r || r.status === 'complete') return { ok: false, reason: 'That request is no longer available.' };
    const contact = state.settlements.flatMap(x => x.residents).find(x => x.id === contactId && x.present);
    if (!contact || s.pendingEvents.length >= 40) return { ok: false, reason: 'Speak to a resident after the current records have been filed.' };
    if (r.type === 'message' && action === 'accept') {
      if (r.status !== 'open' || contactId !== r.residentId) return { ok: false, reason: 'Ask the sender for the message.' };
      r.status = 'carried'; event(s, 'message-taken', 'The traveler accepted a household message for the neighboring community.', contact, 20);
      return { ok: true, reward: 0 };
    }
    if (action !== 'complete' || (r.type === 'message' ? r.status !== 'carried' || !state.settlements.find(x => x.id === r.destination)?.residents.some(x => x.id === contactId) : contactId !== r.residentId))
      return { ok: false, reason: 'Speak to the person responsible for this request.' };
    const reward = Math.min(r.reward, s.stocks['copper-piece']);
    const transfers = [...(r.type === 'message' ? [] : [{ id: r.item, delta: -r.quantity }]), ...(reward ? [{ id: 'copper-piece', delta: reward }] : [])];
    if (transfers.length && !inventory?.transact?.(transfers)) return { ok: false, reason: 'The required goods could not be transferred; nothing changed.' };
    r.status = 'complete'; s.stocks['copper-piece'] -= reward;
    if (r.type === 'supply') s.stocks[r.item] += r.quantity;
    if (r.type === 'repair') s.infrastructure = clamp(s.infrastructure + 20);
    const narrator = s.residents.find(x => x.id === r.residentId);
    narrator.trustPlayer = clamp(narrator.trustPlayer + 10); s.morale = clamp(s.morale + 5);
    for (const id of Object.keys(narrator.relationships)) narrator.relationships[id] = clamp(narrator.relationships[id] + 3);
    const e = event(s, 'player-help', r.type === 'message' ? 'The traveler delivered the household message.' : r.type === 'repair' ? `The traveler supplied ${r.quantity} oak planks, now used in the common repair.` : `The traveler delivered ${r.quantity} ${r.item} to the shared stores.`, narrator, 85);
    s.counters.help++; s.evidence.help = [...s.evidence.help, e.id].slice(-8);
    return { ok: true, reward, eventId: e.id };
  }
  function restore(value) { if (!validateSettlementSnapshot(value, { allowMissing: false })) return false; state = copy(value); return true; }
  if (saved) { if (!restore(saved)) throw new Error('Invalid settlement checkpoint.'); }
  else for (const s of state.settlements) {
    event(s, 'opening', `Twelve residents keep the households of ${s.name}. Their work begins in ${FERADOM_CANON.people.toLowerCase()}, under local lords and councils.`, s.residents[0], 1);
    requests(s, state.day); page(s, state.day, 'opening', ledger(s));
  }
  return { snapshot: () => copy(state), view: () => copy(state.settlements), restore, advanceTo, applyAction,
    entries: () => copy(state.outbox), acknowledge: ids => { const done = new Set(ids); state.outbox = state.outbox.filter(e => !done.has(e.id)); },
    get worldId() { return state.worldId; }, get time() { return state.time; } };
}
