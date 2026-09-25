import { canStand, QUEST_DONE } from './game-state.js';
import { questLive } from './quest-slate.js';
import { LUSCIA_SITES } from './luscia-chapter.js';
import { OSTLER_OBJECTIVE } from './ostler.js';
import { HAIL } from './lauvel-burying.js';

/** Browser smoke coverage for the actual F prompts, dialogue buttons and combat. */
export async function runRoadSmoke(h) {
  const { world, player, npcData, combat, journey, inventory, weapons, beggar,
    press, release, tap, until, frames, warp, getMode, finishDialogue, choose, setYaw, readState } = h;
  let checks = 0, battleSwings = 0, battleDodges = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Road smoke: ${message}`); };
  const position = player.group.position;
  const query = selector => document.querySelector(selector);
  const sites = world.journeySites;
  const state = () => readState?.() ?? {};

  async function arrive(x, z) {
    warp(x, z);
    await frames(3);
    assert(canStand(position.x, position.z, world), `interaction approach blocked at ${x}, ${z}`);
    noThrow(`after arriving at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  }

  /**
   * The frame is allowed to be slow and is not allowed to throw. `render` runs inside one try,
   * and a throw in it stops the loop and puts the fatal panel up — which is loud to somebody
   * watching the window and silent to everything else. This is the everything else.
   */
  function noThrow(where) {
    const thrown = state().frameErrors;
    if (!thrown || !thrown.count) return;
    assert(false, `the frame threw ${thrown.count} time(s) ${where}: ${thrown.first?.message}`
      + `${thrown.first?.at ? ` at ${thrown.first.at}` : ''}${thrown.first?.frame ? ` (frame ${thrown.first.frame})` : ''}`);
  }

  /** Stand beside somebody wherever they happen to be, on whichever side is clear. */
  async function standBeside(target) {
    for (const [dx, dz] of [[1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.2, -1.2], [1.9, 0], [0, 1.9], [-1.9, 0], [0, -1.9]]) {
      if (canStand(target.x + dx, target.z + dz, world)) { await arrive(target.x + dx, target.z + dz); return true; }
      }
    return false;
  }

  async function visit(id) {
    const npc = npcData.find(item => item.id === id), home = world.npcPositions[id];
    assert(npc && home, `missing NPC ${id}`);
    await arrive(home.x, home.z + 1.8);
    tap('KeyF');
    assert(getMode() === 'dialogue', `F did not open ${id}'s conversation`);
    assert(query('#speaker')?.textContent === npc.name, `wrong NPC answered at ${id}`);
    await finishDialogue();
  }

  async function chooseRoad(id) {
    const button = query(`[data-choice="${id}"]`);
    assert(button && !button.disabled, `missing enabled conversation choice ${id}`);
    choose(id);
    await frames(2);
    assert(getMode() === 'playing', `${id} did not return control to the player`);
    // Finishing a chapter hands the HUD to the next one, so any of the chapters
    // the host can put on the banner counts as the quest having moved on. Iven's
    // horse token puts the ostler's errand on the banner before the Moros chapter's.
    const banner = [journey.view().title, state().luscia?.title, state().moros?.title, state().border?.title, state().aftermath?.title, OSTLER_OBJECTIVE.title];
    assert(banner.includes(query('#quest-title')?.textContent), `quest HUD did not reflect ${id}; the banner reads ${query('#quest-title')?.textContent}`);
  }

  async function checkDestination(id) {
    assert(journey.view().destinationIds.includes(id), `quest does not point to ${id}`);
    const action = journey.availableActions().find(item => item.objectiveId === id);
    assert(action, `no action exposes the destination ${id}`);
    await frames(3);
    assert(query('#objective-distance')?.textContent?.trim(), `objective guidance is empty before ${id}`);
  }

  /**
   * A side errand is offered without being pointed at: the bridge over the Caloss is nobody's
   * step while the slate is trimmed (`bridgeStage`, src/journey.js), so the road does not send
   * the traveler to Chip and Chip is still there to be asked (src/quest-slate.js).
   */
  function checkSideErrand(id) {
    const action = journey.availableActions().find(item => item.objectiveId === id);
    assert(action, `no action exposes the side errand ${id}`);
    assert(!journey.view().destinationIds.includes(id), `${id} is a side errand and the road is pointing at it`);
  }

  async function fightMeadow() {
    assert(combat.state.encounterId === 'meadow-raiders', 'wrong encounter started beside the cart');
    assert(combat.state.enemies.length === 2, 'the meadow did not spawn two raiders');
    press('KeyD'); tap('KeyC'); release('KeyD');
    assert(combat.state.player.action === 'dodge', 'directional dodge did not begin in the meadow fight');
    battleDodges++;
    await until(() => combat.state.player.action === 'idle', 'Meadow dodge never recovered');
    const deadline = performance.now() + 90000;
    while (combat.state.phase === 'active') {
      assert(performance.now() < deadline, 'the meadow fight did not resolve');
      const enemy = combat.state.enemies.find(item => item.hp > 0 && item.active !== false);
      if (!enemy) { await frames(2); continue; }
      if (combat.state.player.action === 'idle') {
        let approach = null;
        for (let i = 0; i < 16; i++) {
          const angle = i * Math.PI / 8;
          const candidate = { x: enemy.x + Math.sin(angle) * 1.35, z: enemy.z + Math.cos(angle) * 1.35 };
          if (canStand(candidate.x, candidate.z, world)) { approach = candidate; break; }
        }
        assert(approach, 'there is no safe approach to a meadow raider');
        warp(approach.x, approach.z);
        player.group.rotation.y = Math.atan2(enemy.x - position.x, enemy.z - position.z);
        if (enemy.action === 'windup' && enemy.progress > .55 && combat.state.player.stamina >= 25) {
          press('KeyD'); tap('KeyC'); release('KeyD'); battleDodges++;
        } else { tap('KeyR'); battleSwings++; }
      }
      await frames(2);
      assert(getMode() !== 'defeated', 'the player lost the meadow smoke fight');
    }
    assert(combat.state.enemies.every(enemy => enemy.hp <= 0), 'an undefeated meadow raider remains');
    await until(() => combat.state.player.action === 'idle', 'Meadow strike never recovered');
  }

  async function gather(id, itemId, quantity) {
    const site = sites[id], before = inventory.count(itemId);
    assert(site, `missing gatherable ${id}`);
    await arrive(site.x, site.z);
    assert(query('#interaction-label')?.textContent.includes(site.name), `gather prompt does not identify ${id}`);
    tap('KeyF'); await frames(2);
    assert(inventory.count(itemId) === before + quantity, `${id} awarded the wrong quantity`);
    assert(world.journeySiteState()[id] === true, `${id} did not disappear after gathering`);
    tap('KeyF'); await frames(2);
    assert(inventory.count(itemId) === before + quantity, `${id} could be gathered twice`);
    assert(getMode() === 'playing', `repeated gathering at ${id} unexpectedly opened a menu`);
  }

  try {
    assert(getMode() === 'playing' && state().questStage === QUEST_DONE, 'the first-shore tutorial must be finished');
    assert(!state().testingEnabled, 'the normal road smoke must run before F8 supplies');
    assert(inventory.has('harbor-letter') && inventory.has('road-token'), 'the road items are missing');
    assert(weapons.profile().id === 'simple-sword' && weapons.profile().usable, 'equip the repaired sword before the road test');
    // **Corvan's field register and his three parcels are off the slate** (src/quest-slate.js).
    // Not deleted: the whole leg is here, behind the switch that turned it off, so this
    // walkthrough runs on the trimmed road and on the whole one.
    if (questLive('courier')) {
      assert(journey.view().stage === 'meet-courier', 'the new road must start with Corvan');

      await checkDestination('meadow-courier');
      await visit('meadow-courier'); await chooseRoad('meet-courier');
      const fishBefore = inventory.count('cooked-fish');
      let fought = false;
      for (const id of ['cart-parcel-1', 'cart-parcel-2', 'cart-parcel-3']) {
        await checkDestination(id);
        const site = sites[id];
        await arrive(site.x, site.z);
        if (combat.state.phase === 'active') { await fightMeadow(); fought = true; await arrive(site.x, site.z); }
        assert(query('#interaction-label')?.textContent.includes('Recover parcel'), `parcel prompt missing at ${id}`);
        tap('KeyF'); await frames(2);
        assert(journey.state.parcels.includes(id) && world.journeySiteState()[id], `${id} was not recovered and hidden`);
        const count = journey.state.parcels.length;
        tap('KeyF'); await frames(2);
        assert(journey.state.parcels.length === count, `${id} could be recovered twice`);
      }
      assert(fought, 'walking to the parcels did not trigger the meadow encounter');
      await visit('meadow-courier'); await chooseRoad('return-courier');
      assert(inventory.count('cooked-fish') === fishBefore + 2, 'Corvan did not give exactly two cooked fish');
      assert(journey.state.completedRegions.includes(2), 'the Avrel clearing errand was not completed');
      await visit('meadow-courier');
      assert(!query('[data-choice="return-courier"]'), 'Corvan offered a duplicate reward');
      choose('leave-road-neighbor'); await frames(2);

      // Inspect the real satchel tooltip and reward description on the new road.
      tap('KeyI');
      const food = query('[data-item-id="cooked-fish"]');
      assert(food, 'Corvan’s provisions are absent from the satchel');
      food.dispatchEvent(new PointerEvent('pointerenter')); await frames(2);
      assert(query('#inventory-tooltip')?.textContent.includes('40 health'), 'cooked-fish tooltip omitted its healing');
      food.click();
      assert(query('#inventory-detail')?.textContent.includes('40 health'), 'cooked-fish detail omitted its healing');
      tap('KeyI');
    } else {
      assert(journey.view().stage === 'deliver-report', 'the trimmed road is the letter and the report');
      // **And the clearing is a farm.** He stood here with nothing to give until the user took the
      // army out of it (23 September 2026); now nobody is posted in the crop, and the walkthrough
      // checks that rather than checking what he does not say.
      assert(!npcData.some(item => item.id === 'meadow-courier'), 'the quartermaster is still standing in the crop');
      assert(!world.npcPositions['meadow-courier'], 'and the world still keeps a place for him');
    }

    if (questLive('courier')) await checkDestination('crossing-keeper');
    else checkSideErrand('crossing-keeper');
    await visit('crossing-keeper'); await chooseRoad('meet-crossing-keeper');
    // Simulate arriving after all loose wood has been spent on weapons or fire.
    // The repair quest must remain completable through Chip's actual dialogue.
    const woodToSpend = inventory.count('forest-stick');
    if (woodToSpend > 0) assert(weapons.spendSticks(woodToSpend), 'could not create the empty-firewood fixture');
    inventory.refresh();
    const beforeLoan = JSON.stringify(journey.snapshot());
    await visit('crossing-keeper');
    assert(query('[data-choice="hollis-repair-wood"]'), 'Chip offered no repair timber after all sticks were spent');
    choose('hollis-repair-wood');
    assert(query('#speech')?.textContent.includes('marked repair timber'), 'the repair timber offer did not explain its source');
    await finishDialogue();
    assert(inventory.count('forest-stick') === 3, 'Chip did not replenish exactly three repair branches');
    assert(JSON.stringify(journey.snapshot()) === beforeLoan, 'borrowing timber advanced the repair quest');
    assert(getMode() === 'dialogue' && query('[data-choice="leave-road-neighbor"]'), 'the repair timber conversation did not return to Chip');
    assert(!query('[data-choice="hollis-repair-wood"]'), 'Chip offered more timber while the player already had enough');
    choose('leave-road-neighbor'); await frames(2);
    await gather('bridge-debris-1', 'forest-stick', 2);
    await gather('bridge-debris-2', 'forest-stick', 2);
    if (questLive('courier')) await checkDestination('bridge-repair');
    else checkSideErrand('bridge-repair');
    // **The repair is made from the last sound plank**, not from the middle of the hole: six
    // paces of the span are in the river now (src/world-regions.js), so the site itself cannot be
    // stood on and a walkthrough that warped onto it would be standing in the water.
    const repair = sites['bridge-repair'];
    let stand = null;
    for (let out = .4; out <= 2.6 && !stand; out += .2)
      for (let turn = 0; turn < 24 && !stand; turn++) {
        const angle = turn / 24 * Math.PI * 2, x = repair.x + Math.cos(angle) * out, z = repair.z + Math.sin(angle) * out;
        if (canStand(x, z, world)) stand = { x, z, out };
      }
    assert(stand, 'there is nowhere to stand within reach of the bridge repair');
    assert(stand.out < 2.7, `the nearest footing is ${stand.out.toFixed(1)} m from the repair and F reaches 2.7`);
    await arrive(stand.x, stand.z);
    const sticksBefore = inventory.count('forest-stick'), wearBefore = weapons.status('forest-stick').durability;
    const damagedLane = world.colliders.filter(c => c.kind === 'bridge-damage');
    const damagedSpot = damagedLane[Math.floor(damagedLane.length / 2)];
    assert(damagedSpot && !canStand(damagedSpot.x, damagedSpot.z, world), 'the damaged side of the bridge was already open');
    // And the break is a break: the far bank is not walked to while it is open.
    assert(!canStand(repair.x + (repair.x - stand.x) * 3, repair.z + (repair.z - stand.z) * 3, world),
      'the broken span could be walked straight across');
    tap('KeyF'); await frames(2);
    assert(journey.state.bridgeRepaired && world.journeySiteState()['bridge-repair'], 'bridge repair did not update the world');
    assert(canStand(damagedSpot.x, damagedSpot.z, world), 'repair did not make the damaged bridge lane walkable');
    assert(inventory.count('forest-stick') === sticksBefore - 3, 'bridge repair did not spend exactly three branches');
    if (sticksBefore > 3) assert(weapons.status('forest-stick').durability === wearBefore, 'bridge repair discarded wear on the retained branch');
    tap('KeyF'); await frames(2);
    assert(inventory.count('forest-stick') === sticksBefore - 3, 'bridge repair charged branches twice');
    // Walk the whole deck on foot, from the Drent approach to the Luscia bank.
    const road = world.routeJourney, crossing = sites['bridge-repair'];
    const nearest = road.reduce((best, point, index) => Math.hypot(point.x - crossing.x, point.z - crossing.z)
      < Math.hypot(road[best].x - crossing.x, road[best].z - crossing.z) ? index : best, 0);
    const approach = road[Math.max(0, nearest - 1)], beyond = road[Math.min(road.length - 1, nearest + 1)];
    await arrive(approach.x, approach.z);
    const bridgeStart = { x: position.x, z: position.z };
    // Walk the road, not the chord between the two banks. The road bends at the
    // crossing, so a traveler who aims straight at the far bank from this one
    // cuts the corner and meets the rail; the deck lies along the road itself.
    for (const target of [road[nearest], beyond]) {
      setYaw(Math.atan2(-(target.x - position.x), -(target.z - position.z)));
      press('KeyW'); press('ShiftLeft');
      await until(() => Math.hypot(position.x - target.x, position.z - target.z) < 1.6,
        'The repaired bridge blocked actual forward movement');
      release('KeyW'); release('ShiftLeft');
    }
    const bridgeWalked = Math.hypot(position.x - bridgeStart.x, position.z - bridgeStart.z);
    assert(bridgeWalked > 25 && canStand(position.x, position.z, world), 'the bridge was not crossed on foot');
    const woodBefore = inventory.count('forest-stick');
    await visit('crossing-keeper'); await chooseRoad('return-crossing-keeper');
    assert(inventory.count('forest-stick') === woodBefore + 4, 'Chip did not grant exactly four spare branches');
    assert(journey.state.completedRegions.includes(3), 'the Caloss crossing was not completed');

    const beforeFishingLesson = JSON.stringify(journey.snapshot()), rodsBefore = inventory.count('fishing-rod');
    await visit('crossing-keeper');
    choose('hollis-fishing'); await finishDialogue();
    assert(getMode() === 'dialogue' && query('[data-choice="leave-road-neighbor"]'), 'the river fishing lesson did not return to Chip');
    // A traveler who already has Bran's rod is not given a second; one who has none - Bran is out
    // of the cast while the main quest is built out (src/cast.js) - is given his first here.
    assert(inventory.count('fishing-rod') === Math.max(1, rodsBefore),
      rodsBefore ? 'Chip duplicated the fishing rod already carried from Tidehaven' : 'Chip did not hand over a rod to a traveler with none');
    assert(JSON.stringify(journey.snapshot()) === beforeFishingLesson, 'the fishing tangent advanced the road quest');
    choose('leave-road-neighbor'); await frames(2);
    const river = world.fishingSpots.find(spot => spot.id === 'reedwater');
    assert(river, 'the Caloss has no fishing bank');
    await arrive(river.fishingSpot.x, river.fishingSpot.z);
    const rawBefore = inventory.count('raw-fish');
    tap('KeyF');
    assert(getMode() === 'fishing', 'F did not cast at the riverbank');
    assert(world.activeFishingSpot().id === 'reedwater', 'the river cast kept the pond float active');
    await until(() => query('#fishing-title')?.textContent.includes('A bite'), 'The river float never signaled a bite');
    tap('KeyF');
    assert(getMode() === 'playing' && inventory.count('raw-fish') === rawBefore + 1, 'the river catch did not add exactly one raw fish');
    await frames(2); tap('KeyF');
    assert(getMode() === 'fishing', 'a second river cast did not start');
    tap('Escape');
    assert(getMode() === 'playing' && inventory.count('raw-fish') === rawBefore + 1, 'Escape failed to cancel the second river cast without a catch');
    assert(JSON.stringify(journey.snapshot()) === beforeFishingLesson, 'river fishing changed the road quest');

    // **And Sava's three waymarkers with them.**
    if (questLive('waymarkers')) {
      await checkDestination('ridge-keeper');
      await visit('ridge-keeper'); await chooseRoad('meet-ridge-keeper');
      for (const id of ['beacon-west', 'beacon-east', 'beacon-north']) {
        await checkDestination(id);
        await arrive(sites[id].x, sites[id].z);
        assert(query('#interaction-label')?.textContent.includes('Restore waymarker'), `waymarker prompt missing at ${id}`);
        const sticks = inventory.count('forest-stick');
        tap('KeyF'); await frames(2);
        assert(journey.state.beacons.includes(id) && world.journeySiteState()[id], `${id} was not restored in the world`);
        assert(inventory.count('forest-stick') === sticks, 'restoring a road stone consumed campfire fuel');
        const count = journey.state.beacons.length;
        tap('KeyF'); await frames(2);
        assert(journey.state.beacons.length === count, `${id} could be restored twice`);
      }
    }

    await checkDestination('relay-clerk');
    await visit('relay-clerk'); await chooseRoad('deliver-report');
    assert(journey.view().complete, 'Iven did not finish the road report');
    // Region 2 is Corvan's and is off the slate; region 3 is the crossing, which is walked either
    // way, and region 4 closes on the report itself and not on Sava's markers (`completedRegions`,
    // src/journey.js), so it is there whichever way the switch is set.
    assert(JSON.stringify(journey.state.completedRegions)
      === JSON.stringify([questLive('courier') ? 2 : null, 3, 4].filter(Boolean)),
      `the road closed on regions ${JSON.stringify(journey.state.completedRegions)}`);
    assert(inventory.has('harbor-letter') && inventory.has('road-token'), 'the relay consumed the onward quest items');
    assert(inventory.count('copper-piece') >= 12, 'the army did not pay for the road report');

    // The current Luscia chapter is a unique timed assignment and a peaceful
    // Republican encounter. Listening and filing the rolls do not choose a side.
    assert(query('#quest-step')?.textContent.includes('LUSCIA'), 'the road did not roll into the Luscia chapter');
    assert(state().campaign?.chapterId === 'luscia-aftermath', 'the campaign did not reach Luscia');
    assert(state().luscia?.stage === 'meet-relay-clerk', 'the chapter did not open at Iven');
    await visit('relay-clerk'); await chooseRoad('accept-lauvel-search');
    assert(state().luscia?.stage === 'find-satchel', 'Iven did not send the traveler to the relay hut');
    const assigned=state().livingStory;
    assert(assigned?.satchel.assignee==='player', 'Iven did not assign the unique courier job');
    const timeLeft=assigned.satchel.deadlineAt-assigned.seconds;
    assert(timeLeft>597&&timeLeft<=600, 'the courier assignment did not start its ten-minute active deadline');
    assert(Array.isArray(assigned.horses)&&assigned.horses.length<=4, 'the army allocated more than four remounts');
    const reservation=assigned.horses.find(horse=>horse.owner==='player');
    assert(inventory.has('horse-token')===!!reservation, 'the reporting-order reservation and actual horse token disagree');
    const satchel = LUSCIA_SITES['courier-satchel'];
    await arrive(satchel.x + 1.5, satchel.z + 1.5);
    if(getMode()==='playing')tap('KeyF');
    assert(getMode()==='dialogue'&&query('#speaker')?.textContent==='Davin', 'the living Republican soldier did not speak at the relay hut');
    await finishDialogue();
    assert(query('[data-choice="luscia-support-empire"]'), 'Davin offered no explicit Imperial refusal/fight choice');
    assert(!inventory.has('courier-satchel'), 'approaching Davin silently took his satchel');
    const listen=query('[data-choice="luscia-listen-republican"]');
    assert(listen&&!listen.disabled&&listen.textContent.includes('Hara'), 'Davin offered no clear peaceful introduction to Hara');
    choose('luscia-listen-republican');await frames(2);
    // Davin closes the exchange. Sela is within earshot of this hut and her
    // one-time roadside hail can begin on the next active frame. Hear that
    // specific interruption; an arbitrary dialogue is still a test failure.
    if(getMode()==='dialogue'){
      const sela=npcData.find(npc=>npc.id==='lauvel-seeker'),speech=query('#speech')?.textContent;
      assert(sela&&query('#speaker')?.textContent===sela.name&&HAIL.includes(speech),
        `unexpected dialogue after Davin: ${query('#speaker')?.textContent}: ${speech}`);
      await finishDialogue();await frames(2);
      assert(state().burying?.stage==='hailed', 'hearing Sela’s call silently accepted her side quest');
    }
    assert(getMode()==='playing', 'the relay introduction and nearby hail did not return control');
    assert(state().luscia?.stage==='return-satchel', 'the peaceful conversation did not advance the return objective');
    assert(inventory.count('courier-satchel')===1&&state().livingStory?.satchel.carrier==='player', 'Davin did not hand over one physical satchel');
    assert(state().lusciaCivilWar?.introduced&&state().lusciaCivilWar.path===null, 'listening did not leave the faction choice open');
    assert(combat.state.phase!=='active', 'listening to Davin unexpectedly started a fight');
    const payBefore=inventory.count('copper-piece'),tokensBefore=inventory.count('horse-token');
    await visit('relay-clerk'); await chooseRoad('return-courier-satchel');
    assert(inventory.count('copper-piece')===payBefore+20, 'the courier delivery did not pay exactly twenty copper');
    assert(inventory.count('horse-token')===tokensBefore, 'satchel delivery issued a second horse entitlement');
    assert(!inventory.has('courier-satchel')&&state().livingStory?.satchel.completedBy==='player', 'the completed delivery left a second physical satchel');
    assert(state().lusciaCivilWar?.path===null&&!state().lusciaCivilWar.betrayed, 'ordinary delivery betrayed the Republican network');
    assert(state().campaign?.chapterId === 'moros-camp', 'the campaign did not move on to the Moros camp');
    assert(state().luscia?.complete, 'the chapter did not finish');

    // Redeem only a real reservation. The late-arrival case must stay playable
    // on foot, and another conversation cannot create a fifth army horse.
    const ostler=npcData.find(npc=>npc.id==='lumber-ostler');
    assert(ostler&&await standBeside(ostler.actor.group.position), 'no clear approach to Bede Harrow');
    tap('KeyF');assert(getMode()==='dialogue'&&query('#speaker')?.textContent===ostler.name, 'Bede did not answer at the stable yard');
    await finishDialogue();
    if(reservation){
      await chooseRoad('redeem-horse');
      assert(!inventory.has('horse-token')&&state().livingStory.horses.find(horse=>horse.owner==='player')?.claimed,
        'Bede did not consume the reserved token and issue its horse');
      tap('KeyF');await finishDialogue();
      assert(!query('[data-choice="redeem-horse"]'), 'Bede offered the same reserved horse twice');
      choose('leave-ostler');await frames(2);
    }else{
      assert(getMode()==='playing'&&!query('[data-choice="redeem-horse"]'), 'an unreserved traveler could claim a fifth horse');
      assert(state().livingStory.horses.length===4, 'the traveler was denied a horse before all four were reserved');
    }

    // Nothom's square: Smiths, who begs until he is paid, and the operative
    // introduced by Davin. Recruitment is explicit and changes the gold route.
    const square = world.landmarks.find(place => place.id === 'lumber-town');
    const smiths = npcData.find(item => item.id === 'town-beggar');
    // He has had the run of the square for the whole visit; start his round afresh.
    // Smiths is out of the cast while the main quest is built out (src/cast.js): his whole
    // round is still written and is skipped here rather than failed.
    if (smiths) {
      beggar.reset();
      await arrive(square.x, square.z);
      await until(() => smiths.actor.group.position.distanceTo(position) < 3.4,
        `Smiths never came over to beg (he is at ${smiths.actor.group.position.x.toFixed(1)}, ${smiths.actor.group.position.z.toFixed(1)}, ${Math.round(smiths.actor.group.position.distanceTo(position))} m off, ${JSON.stringify(beggar.state)})`);
      assert(await standBeside(smiths.actor.group.position), 'no clear ground beside Smiths');
      await frames(2); tap('KeyF');
      assert(getMode() === 'dialogue' && query('#speaker')?.textContent === 'Smiths', 'Smiths did not answer on the square');
      await finishDialogue();
      const purse = inventory.count('copper-piece');
      choose('give-smiths-coin'); await frames(3);
      assert(getMode() === 'playing' && inventory.count('copper-piece') === purse - 1, 'the copper never left the satchel');
      assert(beggar.state.resting && !beggar.state.following, 'a paid Smiths kept begging');
      await arrive(square.x, square.z);
      await frames(120);
      assert(!beggar.state.following, 'Smiths went back to begging after his copper');
    }

    const stall = world.npcPositions['timber-stall'];
    assert(await standBeside(stall), 'no clear ground beside the timber stall');
    await frames(2); tap('KeyF');
    assert(getMode() === 'dialogue' && query('#speaker')?.textContent === 'Hara', 'the stall keeper did not answer');
    await finishDialogue();
    assert(query('[data-choice="luscia-join-republic"]'), 'Davin’s introduction did not unlock Hara’s recruitment choice');
    choose('luscia-join-republic'); await frames(3);
    assert(getMode() === 'playing', 'the stall keeper’s offer did not return control');
    assert(state().campaign?.side==='coalition'&&state().campaign.chapterId==='border-battle'&&state().campaign.entryOrigin==='luscia',
      'Hara did not begin the Republican main campaign');
    assert(state().border?.objectiveId==='solis-captain', 'the Republican main campaign did not direct the traveler to Captain Voss');
    assert(state().lusciaCivilWar?.path==='coalition'&&!state().lusciaCivilWar.imperialComplete,
      'the Luscia silver branch was not kept separate from main-story recruitment');
    assert(query('#quest-title')?.textContent===state().border?.title, 'the gold objective did not update after Republican recruitment');
    noThrow('after the peaceful relay, remount and Republican recruitment');
    assert(!state().testingEnabled, 'the road required a testing override');
    return { roadChecks: checks, roadRegions: 3, roadNPCs: 4, roadParcels: 3, roadWaymarkers: 3,
      roadBridgeWalked: Math.round(bridgeWalked), roadBattleSwings: battleSwings, roadBattleDodges: battleDodges,
      roadRepairLoanChecks: 6, roadRiverFishingChecks: 10, lusciaChapter: 'complete', lusciaWolves: 0,
      lusciaRelay: 'peaceful', horseReservationClaimed: !!reservation,
      townChecks: 12, beggarPaid: !!smiths, rebelContact: 'coalition',
      roadComplete: true, roadLetterRetained: true };
  } finally {
    for (const key of ['KeyW', 'KeyD', 'ShiftLeft']) release(key);
  }
}

/** Separate from normal play: verify the F8 travel selectors without saving. */
export async function runRoadTestingSmoke(h) {
  const { world, player, journey, inventory, tap, frames, until, getMode, readState } = h;
  let checks = 0;
  const assert = (condition, message) => { checks++; if (!condition) throw new Error(`Road testing tools: ${message}`); };
  for (const id of [2, 3, 4]) {
    tap('F8');
    assert(getMode() === 'testing', `F8 did not open tools before Region ${id}`);
    const advanced = document.getElementById('testing-advanced');
    assert(advanced, 'Advanced travel tools are unavailable');
    if (!advanced.open) advanced.querySelector('summary').click();
    const region = world.regions.find(item => item.id === id);
    const country = document.getElementById('test-country'), place = document.getElementById('test-place');
    const button = document.getElementById('test-goto');
    assert(country && place && button && !button.disabled, `Region ${id} travel selectors are unavailable`);
    country.value = region.name; country.dispatchEvent(new Event('change', { bubbles: true }));
    place.value = '0';
    assert(country.value === region.name && place.selectedIndex === 0, `Region ${id} arrival is unavailable`);
    button.click(); await frames(3);
    const point = player.group.position;
    assert(getMode() === 'playing' && readState().testingEnabled, `Region ${id} travel did not enter testing play`);
    assert(Math.hypot(point.x - region.spawn.x, point.z - region.spawn.z) < .01, `Region ${id} travel missed its spawn`);
    assert(canStand(point.x, point.z, world), `Region ${id} testing spawn is blocked`);
    await until(() => document.querySelector('#region-name')?.textContent === region.name, `Region ${id} title did not update`);
    assert(inventory.has('harbor-letter') && inventory.has('road-token') && inventory.has('fishing-rod') && inventory.has('tinderbox'), `Region ${id} test travel omitted essential tools`);
    // Region 2 is Corvan's, and is off the slate (src/quest-slate.js).
    if (id >= 3 && questLive('courier')) assert(journey.state.completedRegions.includes(2), 'Reedwater test travel did not finish the meadow prerequisites');
    if (id >= 4) assert(journey.state.completedRegions.includes(3), 'Threefold test travel did not finish the crossing prerequisites');
  }
  return { roadTestingChecks: checks, roadTestingRegions: [2, 3, 4] };
}
