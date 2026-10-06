import { createPeninsulaTutorial, PENINSULA_TUTORIAL_ANCHORS as A, PENINSULA_TEACHERS, PENINSULA_JESS_WARNING } from './peninsula-tutorial.js';
import { createTutorialBoundaryVisuals } from '../../../world/environment/tutorial-boundary-visuals.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lessons = {
  inventory: ['Welcome ashore. Here, a sandwich for the journey. Open your satchel with I and select it to see what you are carrying.'],
  walking: ['Watch Chris Scotwood find his feet. Follow the path to the two white posts. WASD walks; time actually spent walking improves your Walking skill. Even a practiced walk stays slower than a run.'],
  running: ['Hold Shift or Tab to run. Your stamina falls while you run, so ease back to a walk to catch your breath. Practice makes your running faster and more economical. Give it six seconds, then recover. Glun is up the path by the straw target.'],
  combat: ['Strike the straw twice, hold V to guard for a moment, and use C to dodge. A blade, a shield, and knowing when to move will get you through more than bravado.', 'Afterward, learn the chart from Bear, swimming from Jess, and fishing from Ryan. Bring your catch back to Jojo to cook. I will sign your letter when everybody is satisfied.'],
  cartography: ['I am Bear. This chart shows where you have been, and the hexes beside it show what might be next. Press M, find your marker, and close it when you are ready.'],
  swimming: ['Stay in this sheltered cove. Swim out to the blue buoy and back to this beach. Swimming improves with distance, but uses stamina, so leave enough for the return.', PENINSULA_JESS_WARNING],
  fishing: ['The quiet bank just south of me is a good place to cast. Press F there, wait for the bite, then press F again. The fish must reach your satchel before you take it to Jojo.'],
  cooking: ['You caught supper. My fire is already lit: take your raw fish over to it and turn it over the heat. You are learning Cooking today. Lee Anne can teach you to build a fire of your own later.'],
};

// Keep the current task visible after the teacher's dialogue closes. These are
// instructions from saved lesson progress, never an alternate completion path.
function practiceObjective(v) {
  const p=v.practice, seconds=(value,total)=>`${Math.min(total,Math.floor(value+1e-6))}/${total} seconds`;
  switch(v.next.id) {
    case 'inventory': return 'Press I to open your satchel, then select Jojo\'s sandwich.';
    case 'walking': return p.walked<4 ? `Use WASD to walk along the trail toward the two white posts (${seconds(p.walked,4)}).` : 'Walk between the two white trail posts to finish your first steps.';
    case 'running': return p.ran<6 ? `Hold Shift or Tab while moving to run along the trail (${seconds(p.ran,6)}).` : `Release Shift or Tab. Walk or rest to catch your breath (${seconds(p.recovered,2)}).`;
    case 'combat': return p.strikes<2 ? `Face the straw target and press left mouse or R to strike (${Math.min(2,p.strikes)}/2).` : p.guarded<1.5 ? 'Stay by the straw target and hold V to guard for a moment.' : 'Stay by the straw target and press C to dodge.';
    case 'cartography': return 'Press M to open Bear\'s chart and find your position.';
    case 'swimming': return !p.buoy ? 'Swim to the blue buoy in Jess\'s sheltered cove.' : p.swam<4 ? `Keep swimming beside the buoy (${seconds(p.swam,4)}), then return to Jess\'s beach.` : 'Return to Jess\'s beach and walk out of the water.';
    case 'fishing': return 'At the quiet bank south of Ryan, press F to cast. Wait for a bite, then press F to reel in your fish.';
    case 'cooking': return 'Walk to Jojo\'s lit fire, press F, and choose Cook one raw fish.';
    default: return v.next.detail;
  }
}

/** Connects saved tutorial facts to the ordinary inventory, combat and movement.
 * No lesson is completed merely by visiting its teacher. */
export function createPeninsulaTutorialHost({ scene, world, player, npcById, inventory, skills,
  cooking, campcraft, cartography, swimming, fishing, combat, openDialogue, closeDialogue,
  toast, read, onEvent = () => {}, save = () => {}, moveChris = (_from, to) => to, startFishing }) {
  const scenery = world.peninsulaTutorial;
  const visuals = createTutorialBoundaryVisuals({ parent: scene });
  const originalTraining = { ...world.training };
  const homes = Object.fromEntries(Object.keys(PENINSULA_TEACHERS).map(id => [id, { ...world.npcPositions[id] }]));
  const originals = new Map(Object.keys(PENINSULA_TEACHERS).map(id => { const npc = npcById.get(id); return [id,
    npc ? { name: npc.name, hidden: npc.hidden, residentMotion: npc.residentMotion, face: npc.face } : null]; }));
  let previous = null, camera = null, gateOpen = true;
  const model = createPeninsulaTutorial({ onEvent: event => {
    if (event.type === 'tutorial-grant') {
      if (event.item) inventory.grant(event.item);
      // Skip represents the same first meal: one item, one recipe record and its normal XP.
      if (event.key === 'cooked-fish') cooking.noteMade('cooked-fish');
      if (event.skill === 'swimming') swimming.learn();
      else if (event.skill === 'fishing') { fishing.learn(); campcraft.teachFishing(); }
      else if (event.skill === 'cartography') cartography.learn();
      else if (event.skill === 'cooking') cooking.learn('cooked-fish', { preparedFire: true });
      else if (event.skill) skills.learn(event.skill);
      inventory.refresh();
    }
    if (event.type === 'tutorial-practiced') {
      toast(`${model.view().checklist.find(l => l.id === event.lesson).title} complete.`, 'PENINSULA LESSON');
    }
    if (event.type === 'tutorial-boundary-return' || event.type === 'tutorial-warning') toast(event.text, 'THE TRAINING SHORE');
    onEvent(event);
  }});
  const chosen = () => ['tutorial', 'skip'].includes(model.view().path);
  function sync() {
    const v = model.view(), isChosen = chosen();
    if (scenery && gateOpen === v.active) { gateOpen = !v.active; scenery.gate.setOpen(gateOpen); world.reindexColliders(); }
    if (!isChosen) return;
    for (const [id, at] of Object.entries(PENINSULA_TEACHERS)) {
      const npc = npcById.get(id); if (!npc || npc.fallen) continue;
      const away = !v.active && (npc.walkingWith || npc.woodLessonActive || npc.fishingLessonActive || npc.lawControlled || read().teacherAwayIds?.includes(id));
      if (away) {
        // Later field lessons and their return routes own these feet until they finish.
        if (npc.tutorialStation) { delete npc.tutorialStation; delete npc.residentMotion; }
        continue;
      }
      world.npcPositions[id] = { ...at };
      npc.actor.group.position.set(at.x, world.heightAt(at.x, at.z), at.z);
      npc.tutorialStation = true; npc.residentMotion = 0; npc.hidden = false;
      npc.face = { x: at.x - 3, z: at.z + 3 };
      if (id === 'willowmere-barrett') npc.name = 'Bear';
    }
    Object.assign(world.training, A.dummy, { y: world.heightAt(A.dummy.x, A.dummy.z) });
    if (originalTraining.object) originalTraining.object.visible = false;
    const chrisId = read().chrisId ?? 'merc-gotwood', chris = npcById.get(chrisId);
    if (chris && !chris.fallen && v.chris.departedAt === null) {
      const c = v.chris, wet = c.activity === 'swimming' && world.heightAt(c.at.x, c.at.z) < -.35;
      world.npcPositions[chrisId] = { ...c.at };
      chris.actor.group.position.set(c.at.x, wet ? -.65 : world.heightAt(c.at.x, c.at.z), c.at.z);
      chris.actor.group.rotation.y = c.yaw; chris.residentMotion = c.walking ? c.pace : 0;
      chris.tutorialChris = true; chris.hidden = false; chris.escorting = false;
      chris.placement = { ...(chris.placement ?? {}), animation: c.activity === 'striking' ? { action: 'attack', progress: (c.elapsed % 2) / 2, combo: 0, armed: true } : c.activity === 'guarding' ? { guarding: true, armed: true } : c.activity === 'dodging' ? { action: 'dodge', progress: (c.elapsed % 1), armed: true } : wet ? { swimming: true } : null };
      if (c.activity === 'fishing') chris.placement.animation = { fishing: true, armed: false };
      else chris.actor.setFishing?.(false);
      if (['reading', 'cooking'].includes(c.activity)) chris.placement.animation = { conversing: true, armed: false };
      chris.swimming = wet ? { ...c.at, yaw: c.yaw } : null;
    } else if (chris?.tutorialChris) { delete chris.residentMotion; delete chris.tutorialChris; chris.swimming = null; chris.actor.setFishing?.(false); }
  }
  function introduce(id) {
    const result = model.introduce(id);
    if (!result.ok) { toast(result.reason, 'PENINSULA LESSON'); return; }
    closeDialogue(); sync(); save();
  }
  function conversation(npc) {
    if (!chosen() || read().mode !== 'playing' || !npc) return false;
    const v = model.view();
    if (npc.id === 'post-landing' && v.completed && !v.enlisted) {
      openDialogue(npc, ['Glun has signed this. Welcome to the Ambroni service. Keep your orders dry and take the road west to the muster.'], null, 'Enlist', {
        noWayfinding: true, choices: [{ id: 'peninsula-enlist', label: 'Hand over Glun’s letter and enlist', action: () => { model.enlist(); closeDialogue(); save(); } }],
      }); return true;
    }
    if (!v.active) return false;
    const chrisId = read().chrisId ?? 'merc-gotwood';
    if (![...Object.keys(PENINSULA_TEACHERS), chrisId].includes(npc.id)) return false;
    const ids = npc.id === 'harbormaster' ? ['inventory', 'walking', 'running', 'cooking'] : npc.id === chrisId ? ['walking'] : v.checklist.filter(l => l.teacher === npc.id).map(l => l.id);
    const offered = ids.map(id => v.checklist.find(l => l.id === id)).filter(l => l.available && !l.practiced);
    const choices = offered.map(l => ({ id: `peninsula-${l.id}`, label: l.introduced ? `Remind me: ${l.title}` : l.title, action: () => {
      const lines = l.id === 'walking' && chrisId !== 'merc-gotwood'
        ? ['Cromb will practice alongside you. Follow the path to the two white posts. WASD walks; time actually spent walking improves your Walking skill. Even a practiced walk stays slower than a run.']
        : lessons[l.id];
      openDialogue(npc, lines, null, 'I’ll give it a try', { noWayfinding: true, onComplete: () => introduce(l.id) });
    }}));
    if (npc.id === 'instructor') choices.push({ id: 'peninsula-graduate', label: 'Collect my letter for Tidewater Haven', disabled: !v.canGraduate,
      reason: v.canGraduate ? '' : 'Complete all eight lessons first.', action: () => { model.signOff(read().playSeconds); closeDialogue(); sync(); save(); } });
    choices.push({ id: 'peninsula-leave', label: 'Back to the lesson', action: closeDialogue });
    const line = v.canGraduate ? 'All your teachers are satisfied. Glun can sign you off now.' : `${v.next?.detail ?? ''}${npc.id === 'instructor' && !v.canGraduate ? ' Your journal tracks the remaining lessons.' : ''}`;
    openDialogue(npc, [line], null, 'Back to the lesson', { noWayfinding: true, choices }); return true;
  }
  function nearby() {
    if (!chosen()) return null;
    const p = player.group.position;
    if (gap(p, A.cookfire) < 2.8) return { id: 'peninsula-fire', fireId: 'peninsula-fire', kind: 'fire', label: 'Cook at Jojo’s fire' };
    if (gap(p, { x: 156, z: 32 }) < 2.8 && model.view().lessons.fishing.introduced) return { id: 'peninsula-fishing', kind: 'fishing', label: 'Cast a line in the cove' };
    if (model.view().active && gap(p, A.gate) < 4) return { id: 'peninsula-gate', kind: 'gate', label: 'Read the training gate notice' };
    return null;
  }
  function fireMenu(feedback = '') {
    const taught = model.view().lessons.cooking.introduced;
    openDialogue({ id: 'peninsula-fire', name: 'Jojo’s cooking fire', role: 'A first meal' }, [feedback || 'The fire is already burning. Bring the fish you caught and cook it here.'], null, 'Leave the fire', {
      noWayfinding: true, choices: [
        { id: 'cook-fish', label: 'Cook one raw fish', disabled: !taught || inventory.count('raw-fish') < 1, reason: !taught ? 'Ask Jojo for her cooking lesson.' : 'Catch a fish with Ryan first.', action: () => {
          if (gap(player.group.position, A.cookfire) > 3.2) { closeDialogue(); return; }
          const made = cooking.make('cooked-fish', inventory, { preparedFire: true }); model.noteCook(made); inventory.refresh(); save();
          fireMenu(made.ok ? 'Your fish is cooked. Keep it for the road, or eat it from your satchel.' : made.reason);
        } }, { id: 'leave-fire', label: 'Leave the fire', action: closeDialogue },
      ],
    });
  }
  function interact() { const n = nearby(); if (!n) return false;
    if (n.kind === 'fire') fireMenu(); else if (n.kind === 'fishing') startFishing(scenery.fishingSpot);
    else toast('Glun opens the gate after all eight lessons. Your journal shows what remains.', 'TRAINING GATE'); return true;
  }
  function frame(dt) {
    const context = read(), v = model.view();
    const running = ['playing', 'fishing', 'tutorial-boundary'].includes(context.mode);
    if (chosen() && v.active && context.mode === 'playing') {
      if (!context.inWater && context.grounded && !context.flight) {
        if (gap(player.group.position, A.walkingEnd) < 3) model.practice('walking', 'arrive');
        if (context.running !== true) model.practice('running', 'recover', dt);
        if (gap(player.group.position, A.swimExit) < 3) model.practice('swimming', 'exit');
      }
      if (context.inWater && !context.flight) {
        if (previous && gap(player.group.position, previous) > .002) model.practice('swimming', 'swim', dt);
        if (gap(player.group.position, A.swimTurn) < 2.5) model.practice('swimming', 'buoy');
      }
      if (gap(player.group.position, A.dummy) < 9) {
        const progress = model.view().practice;
        if (context.hits > progress.strikes) model.practice('combat', 'strike', context.hits - progress.strikes);
        if (context.dodges > progress.dodges) model.practice('combat', 'dodge', context.dodges - progress.dodges);
        if (combat.state.player.guarding) model.practice('combat', 'guard', dt);
      }
      if (previous) {
        const result = model.boundary(previous, player.group.position, { flight: context.flight, swimming: context.inWater, water: world.heightAt(player.group.position.x, player.group.position.z) < -.8 });
        if (!result.allowed && result.at) player.group.position.set(result.at.x, result.at.y ?? world.heightAt(result.at.x, result.at.z), result.at.z);
      }
    }
    model.update(dt, { paused: !running, playSeconds: context.playSeconds, chrisAlive: !npcById.get(context.chrisId)?.fallen, moveChris });
    previous = { x: player.group.position.x, y: player.group.position.y, z: player.group.position.z };
    camera = visuals.sync(model.view().boundary.encounter, { yaw: player.group.rotation.y });
  }
  function restore(value) {
    if (!model.restore(value)) return false;
    previous = null;
    if (!chosen()) {
      Object.assign(world.training, originalTraining); if (originalTraining.object) originalTraining.object.visible = true;
      for (const [id, at] of Object.entries(homes)) {
        world.npcPositions[id] = { ...at }; const npc = npcById.get(id);
        if (npc?.tutorialStation) { delete npc.tutorialStation; Object.assign(npc, originals.get(id)); }
      }
      for (const npc of npcById.values()) if (npc.tutorialChris) { delete npc.residentMotion; delete npc.tutorialChris; npc.swimming = null; npc.actor.setFishing?.(false); }
    }
    sync(); visuals.sync(null);
    const encounter = model.view().boundary.encounter;
    if (model.view().active && encounter) onEvent({ type: 'tutorial-boundary-encounter', ...encounter, resumed: true });
    return true;
  }
  return { model, frame, sync, conversation, nearby, interact, restore,
    choose(path) { const result = model.choose(path, read().playSeconds); sync(); previous = null; return result; },
    view: model.view, snapshot: model.snapshot,
    inspectInventory() { model.noteInventoryInspected(); }, noteCatch() { model.noteCatch({ ok: true }); },
    openedChart() { model.practice('cartography', 'open-map'); },
    noteFootPractice(mode, seconds) { if (seconds > 0) model.practice(mode === 'running' ? 'running' : 'walking', mode === 'running' ? 'run' : 'walk', seconds); },
    recover() { model.recover(); previous = null; save(); },
    get camera() { return camera; }, get chosen() { return chosen(); }, get active() { return model.view().active; }, get enlisted() { return model.view().enlisted; },
    objective() { const v = model.view(); if (!chosen() || v.enlisted) return null;
      if (v.completed) return { title: 'Report to Tidewater Haven', detail: 'The gate is open. Take Glun’s letter to Footman Ottar in Tidewater Haven to enlist.', at: npcById.get('post-landing')?.actor.group.position ?? world.npcPositions['post-landing'], target: 'Footman Ottar' };
      if (v.canGraduate || !v.next) return { title: 'Report back to Glun', detail: 'You have completed every lesson. Ask Glun for your letter.', at: A.glun, target: 'Glun' };
      return { title: v.next.title, detail: v.next.introduced ? practiceObjective(v) : v.next.detail, at: v.next.introduced ? v.next.at : PENINSULA_TEACHERS[v.next.teacher] ?? A.jojo, target: v.next.title };
    },
  };
}
