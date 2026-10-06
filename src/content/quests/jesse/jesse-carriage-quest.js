/** Carriage repair uses the existing Carpentry/woodcutting skills and planks.
 * Quest cargo is collected once; timber, assembly and experience commit once.
 * The same saved carriage follows the road into Ambron with Jesse driving. */
import { PLANKS } from '../../../gameplay/skills/woodcutting/construction.js';
import { CARRIAGE_PARTS, JESSE, JESSE_WORKSHOP, JESSE_CARRIAGE_ROUTE, JESSE_GUILD, JESSE_GUILD_WALK } from './jesse-carriage-world.js';

const freeze = Object.freeze, clone = value => JSON.parse(JSON.stringify(value));
const point = p => ({ x: p.x, z: p.z });
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) < 10000 && Math.abs(p.z) < 10000;
const phases = ['available', 'collecting', 'assembling', 'ready', 'riding', 'arrived', 'entering', 'inside', 'coming-out', 'outside'];
export const JESSE_QUEST = freeze({ id: 'jesse-carriage', title: 'A carriage worth the road', giver: JESSE.id, grade: 'skill', reach: 4 });
export const CARRIAGE_TIMBERS = freeze([
  freeze({ id: 'pine', name: 'Pine', plank: 'pine-plank', harvestLevel: 1, pace: 5, durability: 100,
    note: 'Light, workable teaching timber. Jesse has a prepared bundle for you.' }),
  freeze({ id: 'oak', name: 'Oak', plank: 'oak-plank', harvestLevel: 15, pace: 5, durability: 165,
    note: 'Tougher rails and joints for heavier loads. Harvest white oak from Woodcutting level 15.' }),
  freeze({ id: 'walnut', name: 'Black walnut', plank: 'walnut-plank', harvestLevel: 60, pace: 5, durability: 135,
    note: 'Dark timber for finely finished bodywork; oak remains the tougher load carrier. Harvest black walnut from Woodcutting level 60.' }),
]);
export const CARRIAGE_ASSEMBLY = freeze([
  freeze({ id: 'frame', label: 'Square and join the frame', line: 'Ayy, square first. If the rails are wonky, the whole ride is cooked. Fit the grain along the load, not across it.' }),
  freeze({ id: 'wheels', label: 'Fit the axle and wheels', line: 'Now the axle. Both wheels turn clean, neither one wobbles. No cap, a wheel leaving the chat is a bad time.' }),
  freeze({ id: 'braces', label: 'Brace the seat and check the pins', line: 'Brace the corners, peg the joints, check every pin. That is the move. This rig is ready to roll.' }),
]);
export const JESSE_RIDE_LINES = freeze([
  'Ayy, we are rolling! That breeze off the lakes hits different. Rain or shine, a dry joint and a sound axle are the real road drip.',
  'Everyone has an opinion about who ought to rule Ambron. Empire, Republic, whoever: farmers still need carts, and the wheels do not mend themselves.',
  'See the grain on those rails? Pine gets you started. Oak takes a beating. Walnut rewards careful hands. Knowing trees helps you choose sound wood instead of making expensive firewood.',
  'The Carpenter\'s Guild is our stop. Big workshop energy. If the streets smell of fresh shavings, you are going the right way. Mind the carts at the gate; everyone thinks their load is urgent.',
]);
const fresh = () => ({ version: 1, stage: 'available', collected: [], timber: null, assembly: 0, xpGranted: false,
  durability: 0, spoken: [], cart: { ...point(JESSE_WORKSHOP.carriage), yaw: JESSE_WORKSHOP.carriage.yaw, next: 1 },
  jesse: { ...point(JESSE_WORKSHOP.stand), yaw: JESSE_WORKSHOP.stand.yaw, next: 1 }, clock: 0 });
export function validateJesseCarriage(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || data.version !== 1 || !phases.includes(data.stage) || !Array.isArray(data.collected)
    || new Set(data.collected).size !== data.collected.length || !data.collected.every(id => CARRIAGE_PARTS.some(p => p.id === id))
    || ![null, ...CARRIAGE_TIMBERS.map(t => t.id)].includes(data.timber)
    || !Number.isInteger(data.assembly) || data.assembly < 0 || data.assembly > 3 || typeof data.xpGranted !== 'boolean'
    || !Number.isFinite(data.durability) || data.durability < 0 || data.durability > 300
    || !Number.isFinite(data.clock) || data.clock < 0 || data.clock > 100000
    || !Array.isArray(data.spoken) || new Set(data.spoken).size !== data.spoken.length
    || !data.spoken.every(i => Number.isInteger(i) && i >= 0 && i < JESSE_RIDE_LINES.length)) return false;
  for (const [walker, limit] of [[data.cart, JESSE_CARRIAGE_ROUTE.length], [data.jesse, JESSE_GUILD_WALK.length]])
    if (!validPoint(walker) || !Number.isFinite(walker.yaw) || !Number.isInteger(walker.next) || walker.next < 1 || walker.next > limit) return false;
  if (data.stage === 'available' && (data.collected.length || data.timber || data.assembly || data.xpGranted)) return false;
  if (data.stage === 'collecting' && (data.timber || data.assembly || data.xpGranted)) return false;
  if (data.stage === 'assembling' && (!data.timber || data.assembly === 3 || data.xpGranted)) return false;
  if (!['available', 'collecting', 'assembling'].includes(data.stage) && (!data.timber || data.assembly !== 3 || !data.xpGranted)) return false;
  if (data.timber && !['wheel-near', 'wheel-far', 'axle'].every(id => data.collected.includes(id))) return false;
  if (data.stage === 'inside' && gap(data.jesse, JESSE_GUILD.door) > .2) return false;
  return true;
}

export function createJesseCarriage({ inventory, skills, onEvent = () => {} } = {}) {
  let state = fresh(), cartSpeed = 0, jesseSpeed = 0;
  const emit = (type, extra = {}) => onEvent({ type, questId: JESSE_QUEST.id, ...extra });
  const stage = value => { state.stage = value; state.clock = 0; emit('stage', { stage: value }); };
  const nearWorkshop = position => validPoint(position) && gap(position, JESSE_WORKSHOP.stand) <= JESSE_QUEST.reach;
  function accept() {
    if (state.stage !== 'available') return { ok: false };
    skills?.learn?.('construction');
    for (const tool of ['hammer', 'saw']) if (!inventory?.count?.(tool)) inventory?.add?.(tool, 1);
    stage('collecting'); return { ok: true };
  }
  function collect(id, position) {
    const part = CARRIAGE_PARTS.find(p => p.id === id);
    if (state.stage !== 'collecting' || !part || state.collected.includes(id)) return { ok: false, reason: 'There is nothing more to collect here.' };
    if (!validPoint(position) || gap(position, part) > part.reach) return { ok: false, reason: 'Move closer to the carriage part.' };
    if (inventory?.add?.(part.item, 1) === false) return { ok: false, reason: 'The part could not be put in your satchel.' };
    state.collected.push(id); emit('collected', { part }); return { ok: true, part };
  }
  function timberOffer(id) {
    const timber = CARRIAGE_TIMBERS.find(t => t.id === id);
    if (!timber) return { ok: false, reason: 'Choose pine, oak, or walnut.' };
    const supplied = id === 'pine' && inventory?.count?.('carriage-pine-bundle') > 0;
    const missing = [];
    if ((inventory?.count?.('carriage-wheel') ?? 0) < 2) missing.push('two wheels');
    if ((inventory?.count?.('carriage-axle') ?? 0) < 1) missing.push('the axle');
    if (!supplied && (inventory?.count?.(timber.plank) ?? 0) < 4) missing.push(`four ${timber.name.toLowerCase()} planks`);
    return { ok: !missing.length, reason: missing.length ? `Bring ${missing.join(', ')}.` : '', timber, supplied };
  }
  function chooseTimber(id, position) {
    if (state.stage !== 'collecting' || !nearWorkshop(position)) return { ok: false, reason: 'Bring the parts back to Jesse.' };
    if (!['wheel-near', 'wheel-far', 'axle'].every(part => state.collected.includes(part))) return { ok: false, reason: 'Recover both of Jesse\'s wheels and the axle first.' };
    const offer = timberOffer(id); if (!offer.ok) return offer;
    const takes = [['carriage-wheel', 2], ['carriage-axle', 1], [offer.supplied ? 'carriage-pine-bundle' : offer.timber.plank, offer.supplied ? 1 : 4]];
    const removed = [];
    for (const [item, n] of takes) {
      if (inventory.remove(item, n) === false) {
        for (const [old, amount] of removed) inventory.add(old, amount);
        return { ok: false, reason: 'Check your parts and try again.' };
      }
      removed.push([item, n]);
    }
    state.timber = id;
    const craftsmanship = 1 + Math.min(.2, Math.max(0, (skills?.level?.('woodcutting') ?? 1) - 1) * .004);
    state.durability = Math.round(offer.timber.durability * craftsmanship);
    stage('assembling'); return { ok: true, timber: offer.timber, durability: state.durability };
  }
  function assemble(position) {
    if (state.stage !== 'assembling' || !nearWorkshop(position)) return { ok: false, reason: 'Work beside Jesse to finish the lesson.' };
    const step = CARRIAGE_ASSEMBLY[state.assembly]; state.assembly++;
    if (state.assembly === CARRIAGE_ASSEMBLY.length) {
      const wood = CARRIAGE_TIMBERS.find(t => t.id === state.timber), xp = PLANKS[wood.plank].xp * 4 + 45;
      state.xpGranted = true; skills?.gain?.('construction', xp); stage('ready');
      return { ok: true, step, complete: true, xp, durability: state.durability };
    }
    emit('assembled', { step: state.assembly }); return { ok: true, step, complete: false, xp: 0 };
  }
  function board(position) {
    if (state.stage !== 'ready' || !validPoint(position) || gap(position, state.cart) > 6) return { ok: false, reason: 'Come alongside the carriage.' };
    stage('riding'); return { ok: true };
  }
  function advance(walker, route, dt, speed, move, targetOverride) {
    const target = targetOverride ?? route[Math.min(walker.next, route.length - 1)], before = point(walker);
    const amount = Math.min(speed * dt, gap(before, target)), candidate = move?.(before, target, amount) ?? before;
    if (validPoint(candidate) && gap(before, candidate) <= amount + .001) {
      walker.x = candidate.x; walker.z = candidate.z;
      if (gap(before, candidate) > .001) {
        const yaw = Math.atan2(candidate.x - before.x, candidate.z - before.z);
        const turn = Math.atan2(Math.sin(yaw - walker.yaw), Math.cos(yaw - walker.yaw));
        walker.yaw += turn * (1 - Math.exp(-6 * dt));
      }
    }
    const actual = gap(before, walker) / dt;
    if (gap(walker, target) < .12 && !targetOverride) walker.next++;
    return actual;
  }
  function knock() {
    if (state.stage !== 'inside') return { ok: false, reason: 'Jesse is already outside or coming to the door.' };
    stage('coming-out'); return { ok: true };
  }
  function tick(dt, { playing = true, moveCart, moveJesse, player } = {}) {
    cartSpeed = 0; jesseSpeed = 0;
    if (!playing || !Number.isFinite(dt) || dt <= 0) return view();
    if (state.stage === 'riding') {
      cartSpeed = advance(state.cart, JESSE_CARRIAGE_ROUTE, dt, 5, moveCart);
      const progress = (state.cart.next - 1) / (JESSE_CARRIAGE_ROUTE.length - 1);
      for (let i = 0; i < JESSE_RIDE_LINES.length; i++) if (progress >= [0, .26, .53, .82][i] && !state.spoken.includes(i)) {
        state.spoken.push(i); emit('ride-line', { line: JESSE_RIDE_LINES[i], index: i });
      }
      if (state.cart.next >= JESSE_CARRIAGE_ROUTE.length) {
        state.jesse = { ...point(state.cart), yaw: state.cart.yaw, next: 1 }; stage('arrived');
      }
    } else if (state.stage === 'arrived') stage('entering');
    else if (state.stage === 'entering') {
      jesseSpeed = advance(state.jesse, JESSE_GUILD_WALK, dt, 2.6, moveJesse);
      if (state.jesse.next >= JESSE_GUILD_WALK.length) stage('inside');
    } else if (state.stage === 'coming-out') {
      jesseSpeed = advance(state.jesse, [], dt, 2.6, moveJesse, JESSE_GUILD.porch);
      if (gap(state.jesse, JESSE_GUILD.porch) < .15 || (validPoint(player) && gap(state.jesse, JESSE_GUILD.porch) < 1.6 && gap(state.jesse, player) < 3)) stage('outside');
    } else if (state.stage === 'outside') {
      state.clock = validPoint(player) && gap(player, state.jesse) < 8 ? 0 : state.clock + dt;
      if (state.clock >= 12) { state.jesse.next = JESSE_GUILD_WALK.length - 1; stage('entering'); }
    }
    return view();
  }
  function view() { return { ...clone(state), cartSpeed, jesseSpeed, mounted: state.stage === 'riding',
    hidden: state.stage === 'inside', complete: ['arrived', 'entering', 'inside', 'coming-out', 'outside'].includes(state.stage) }; }
  function restore(data) {
    if (!validateJesseCarriage(data)) return false;
    state = data ? clone(data) : fresh(); cartSpeed = jesseSpeed = 0; return true;
  }
  return Object.freeze({ accept, collect, timberOffer, chooseTimber, assemble, board, knock, tick, view, state: view, restore,
    snapshot: () => clone(state) });
}
