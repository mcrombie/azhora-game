import { JESSE, JESSE_WORKSHOP, JESSE_GUILD, CARRIAGE_PARTS, JESSE_CARRIAGE_RADIUS, JESSE_HORSE_OFFSET } from './jesse-carriage-world.js';
import { JESSE_QUEST, CARRIAGE_TIMBERS, CARRIAGE_ASSEMBLY, JESSE_RIDE_LINES } from './jesse-carriage-quest.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const JESSE_GUILD_NOTICE = 'The Carpenter\'s Guild story is not fleshed out yet.';

/** UI and scene adapter. The root supplies ordinary collision navigation and
 * the same mounted-player controls used for other passenger journeys. */
export function createJesseCarriageHost({ quest, world, npc, player, view, moveCart, moveJesse,
  onMount = () => {}, onDismount = () => {}, seatRiders = () => {}, openDialogue, closeDialogue,
  toast = () => {}, refresh = () => {}, save = () => {}, focus = () => {}, available = () => true, busy = () => false }) {
  let wasMounted = false, previousStage = quest.view().stage, spoken = new Set(quest.view().spoken), dirty = false;
  const position = () => player.group.position;
  const changed = () => { refresh(); save(); sync(); };
  function place(state) {
    if (!available() || busy()) return;
    npc.hidden = state.hidden;
    npc.carriageRider = state.mounted;
    npc.mounted = state.mounted;
    if (state.mounted) {
      npc.residentMotion = 0; seatRiders(view, state);
      const seated = npc.actor.group.position;
      world.npcPositions[JESSE.id] = { x: seated.x, z: seated.z };
      npc.lift = seated.y - world.heightAt(seated.x, seated.z);
      return;
    }
    npc.lift = 0;
    const at = state.complete ? state.jesse : JESSE_WORKSHOP.stand;
    world.npcPositions[JESSE.id] = { x: at.x, z: at.z };
    npc.actor.group.position.set(at.x, world.heightAt(at.x, at.z), at.z);
    npc.actor.group.rotation.y = at.yaw ?? JESSE_WORKSHOP.stand.yaw;
    npc.residentMotion = state.jesseSpeed;
    if (state.hidden) { npc.actor.group.visible = false; if (npc.marker) npc.marker.visible = false; }
  }
  function sync(time = 0, dt = 0) {
    const state = quest.view(); view?.update(time, dt, state);
    if (state.mounted && !wasMounted) onMount(state);
    if (!state.mounted && wasMounted) onDismount({ x: JESSE_GUILD.cartParking.x + 2.7, z: JESSE_GUILD.cartParking.z, yaw: state.cart.yaw });
    wasMounted = state.mounted;
    place(state);
    for (const i of state.spoken) if (!spoken.has(i)) { toast(JESSE_RIDE_LINES[i], 'JESSE'); spoken.add(i); }
    if (state.stage !== previousStage) {
      previousStage = state.stage;
      if (state.stage === 'arrived') toast('You and Jesse have reached the Carpenter\'s Guild in Ambron.', 'CARRIAGE LESSON COMPLETE');
      if (state.stage === 'inside') toast('Jesse has gone into the guild. Knock if you want them to come out.', 'THE CARPENTER\'S GUILD');
      dirty = true;
    }
    if (dirty) { dirty = false; refresh(); save(); }
    return state;
  }
  function frame(dt, playing = true, time = 0) {
    quest.tick(dt, { playing: playing && available() && !busy(), moveCart, moveJesse, player: position() });
    return sync(time, dt);
  }
  const leave = { id: 'jesse-leave', label: 'Catch you later.', action: closeDialogue };
  const say = (lines, choices) => openDialogue(npc, lines, null, 'Jesse\'s carriage workshop', { choices: [...choices, leave], noWayfinding: true });
  function conversation(person = npc) {
    if (person?.id !== JESSE.id) return false;
    const state = quest.view();
    if (state.complete) {
      openDialogue(npc, ['Ayy, good to see you! The carriage made it, the wheels stayed on, and your joints held. That is a win.'],
        null, 'The Carpenter\'s Guild', { notice: JESSE_GUILD_NOTICE, choices: [
          { id: 'jesse-guild-notice', label: 'About the guild story', action: () => {
            closeDialogue(); toast(JESSE_GUILD_NOTICE, 'THE CARPENTER\'S GUILD');
          } }, leave,
        ] }); return true;
    }
    if (state.stage === 'available') {
      say(['Yo, I am Jesse. Carriage repair. Wheels, axles, busted frames: that is my whole thing. This rig? Currently extremely not it.',
        'Help me fetch the two wheels, the axle, and that prepared pine bundle round the workshop. I will show you how the bits become a carriage. Then I will drive us to the Carpenter\'s Guild in Ambron. Absolute road-trip energy.',
        'Chip knows the bridge game; I do the rolling game. Same Carpentry skill. If you cut wood, bring better boards: sound oak for strength, walnut for fine bodywork. Reading the grain saves a rig from being cooked.'], [
        { id: 'jesse-accept', label: 'Teach me to assemble a carriage.', action: () => { closeDialogue(); if (quest.accept().ok) { focus(JESSE_QUEST.id); changed(); } } },
      ]); return true;
    }
    if (state.stage === 'collecting') {
      say(['Two wheels, one axle, and four sound planks. Bring them close and we can start cooking. Figuratively. Please do not actually set my carriage on fire.',
        'My prepared pine bundle covers the lesson. If you brought four oak or walnut planks of your own, we can work with those instead.'], CARRIAGE_TIMBERS.map(wood => {
        const offer = quest.timberOffer(wood.id);
        return { id: `jesse-timber-${wood.id}`, label: `${wood.name}${offer.supplied ? ' · use Jesse\'s bundle' : ' · four planks'}${offer.ok ? '' : ' · parts needed'}`,
          disabled: !offer.ok, action: () => {
            const result = quest.chooseTimber(wood.id, position());
            if (!result.ok) { toast(result.reason, 'CARRIAGE PARTS'); return; }
            changed(); conversation();
          } };
      })); return true;
    }
    if (state.stage === 'assembling') {
      const step = CARRIAGE_ASSEMBLY[state.assembly];
      say([step.line], [{ id: `jesse-assemble-${step.id}`, label: step.label, action: () => {
        const result = quest.assemble(position()); if (!result.ok) { toast(result.reason, 'CARRIAGE LESSON'); return; }
        changed(); if (result.complete) toast(`+${result.xp} Carpentry experience. ${result.durability} carriage durability.`, 'CARRIAGE BUILT');
        conversation();
      } }]); return true;
    }
    if (state.stage === 'ready') {
      say(['Look at that. You built an actual, non-disastrous carriage. Peak behavior. Hop aboard: I drive, you enjoy the view, and we roll to Ambron.'], [
        { id: 'jesse-board', label: 'Ride with Jesse to the Carpenter\'s Guild.', action: () => {
          const result = quest.board(position()); if (!result.ok) { toast(result.reason, 'COME ALONGSIDE'); return; }
          closeDialogue(); changed();
        } },
      ]); return true;
    }
    return false;
  }
  function nearby() {
    const state = quest.view(), at = position();
    if (state.mounted) return null;
    if (state.stage === 'inside' && gap(at, JESSE_GUILD.door) < 3.2)
      return { id: 'jesse-guild-door', kind: 'door', label: 'Knock at the Carpenter\'s Guild', ...JESSE_GUILD.door };
    if (state.stage === 'collecting') {
      const part = CARRIAGE_PARTS.filter(p => !state.collected.includes(p.id) && gap(at, p) <= p.reach).sort((a, b) => gap(at, a) - gap(at, b))[0];
      if (part) return { ...part, kind: 'part', label: `Collect ${part.name.toLowerCase()}` };
    }
    if (state.stage === 'ready' && gap(at, state.cart) < 4.5) return { id: 'jesse-board', kind: 'board', label: 'Ride to Ambron with Jesse', ...state.cart };
    return null;
  }
  function interact(site = nearby()) {
    if (!site) return false;
    if (!available() || busy()) { toast('Jesse cannot help just now.', 'CARRIAGE LESSON'); return true; }
    if (site.kind === 'part') {
      const result = quest.collect(site.id, position());
      toast(result.ok ? `${result.part.name} added to your satchel.` : result.reason, 'CARRIAGE PARTS');
      if (result.ok) changed(); return true;
    }
    if (site.kind === 'board') { conversation(); return true; }
    if (site.kind === 'door') {
      if (quest.knock().ok) { toast(`Jesse is coming out. ${JESSE_GUILD_NOTICE}`, 'THE CARPENTER\'S GUILD'); changed(); }
      return true;
    }
    return false;
  }
  function restore(data) {
    if (!quest.restore(data)) return false;
    wasMounted = false; previousStage = quest.view().stage; spoken = new Set(quest.view().spoken); dirty = false; sync(); return true;
  }
  function trackableView() {
    const state = quest.view();
    if (state.stage === 'available') return null;
    const parts = CARRIAGE_PARTS.filter(p => !state.collected.includes(p.id));
    const target = state.stage === 'collecting' && parts.length ? parts.sort((a, b) => gap(position(), a) - gap(position(), b))[0]
      : state.stage === 'ready' || state.stage === 'riding' ? state.cart : state.complete ? JESSE_GUILD.door : JESSE_WORKSHOP.stand;
    const detail = state.stage === 'collecting' ? 'Collect the two wheels, axle and prepared timber around Jesse\'s workshop, then bring them back.'
      : state.stage === 'assembling' ? 'Work with Jesse to square the frame, fit the wheels, and brace the carriage.'
        : state.stage === 'ready' ? 'Come alongside the carriage and ride with Jesse to Ambron.'
          : state.stage === 'riding' ? 'Jesse is driving you along the road to the Carpenter\'s Guild.'
            : 'You built a carriage and reached the Carpenter\'s Guild with Jesse. Knock at the guild if you want them to come out.';
    return { id: JESSE_QUEST.id, title: JESSE_QUEST.title, type: 'skill', grade: 'skill', stage: state.stage,
      status: state.complete ? 'complete' : 'active',
      state: state.complete ? 'complete' : 'active', active: !state.complete, complete: state.complete,
      detail, objective: detail, target: { x: target.x, z: target.z, name: target.name ?? (state.complete ? 'Carpenter\'s Guild' : 'Jesse') },
      destinationIds: state.complete ? [] : [JESSE.id] };
  }
  function bodies() {
    const state = quest.view(), at = state.cart;
    const result = [{ id: 'jesse-carriage-horse', x: at.x + Math.sin(at.yaw) * JESSE_HORSE_OFFSET,
      z: at.z + Math.cos(at.yaw) * JESSE_HORSE_OFFSET, r: .55 }];
    if (state.assembly > 0) result.push({ id: 'jesse-carriage', x: at.x, z: at.z, r: JESSE_CARRIAGE_RADIUS });
    return result;
  }
  return Object.freeze({ frame, sync, conversation, nearby, interact, restore, trackableView, bodies, event: () => { dirty = true; },
    snapshot: quest.snapshot, state: quest.view, get mounted() { return quest.view().mounted; } });
}
