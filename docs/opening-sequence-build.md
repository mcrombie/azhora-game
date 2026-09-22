# Build brief: wiring the opening sequence

For a builder who has not seen this game. The design is `docs/opening-sequence.md`; read it first,
it is short. The data is `src/opening-sequence.js` and its test `tests/opening-sequence.test.js`,
both already committed and passing. This brief says exactly which host pieces to touch, in what
order, with what tests, and what must not change. Every design decision is made; if something
here contradicts the world as you find it, stop and say so rather than deciding.

## The game in one minute

`index.html` is one page. `src/main.js` (3,600 lines, one `main()` closure) owns the Three.js
scene, the input, the HUD and every mode. `mode` is a string: `'opening'` on the title screen,
`'arriving'` for the walk-in after Step ashore, then `'playing'`, `'dialogue'`, `'pause'`,
`'journal'`, `'testing'`, `'inventory'`, `'fishing'`, `'defeated'`, `'ferry'`. The frame loop is
`render()`; it reads `mode` to decide what advances. `show(id, visible)` toggles `.hidden`;
`$(id)` is `getElementById`; `toast(title, kicker)` shows the centred serif toast for 4.2 s.

`createWorld(scene)` in `src/world.js` builds Tidehaven and everything else and returns a frozen
API (`world.spawn`, `world.pierHead`, `world.heightAt`, `world.ringBell`, `world.update`, ...).
Pure modules (no DOM, no three) sit beside it and are tested under Node with `node --test`;
`package.json`'s `test` script lists the files explicitly. `npm test` is the unit suite.
`npm run test:game` launches Electron with `?test=1`, which makes `main.js` run a scripted
walkthrough (`if (new URLSearchParams(location.search).has('test'))` near line 2854) against the
real renderer; it starts by clicking Step ashore.

The camera: every frame `main.js` computes `cameraTarget` (where the camera should be) and
`cameraFocus` (what it looks at); then `camera.position.lerp(cameraTarget, 1 − e^(−5·dt))` and
`camera.lookAt(cameraFocus)`. The ordinary third-person camera derives `cameraTarget` from
`yaw`, `pitch`, `distance` around the player. On the title screen it is fixed:
`if (mode === 'opening') { cameraTarget.set(15 + sin(elapsed·.09)·2, 12.5, 57); cameraFocus.set(0, 3.5, 14); }`.

Characters are `createCharacter()` actors: `actor.group` (a `THREE.Group`, `rotation.y` is the
facing, forward is `(sin, cos)`), `actor.animate(time, speed, grounded, pose)`. NPCs live in
`npcData` / `npcById`; each has a home in `world.npcPositions[id]`, and the per-frame NPC loop
(near line 2656) snaps an NPC to its home when the home is more than 180 m from the player,
otherwise steers it home only while `mode === 'playing'`. `placeMercenaries()` (line 290) is
called every frame (line 2618) and rewrites `world.npcPositions` for the ten hired swords from
`company.placements(playSeconds)`; `settleMercenaries()` also moves their actors there.

Line numbers below are from `main` at `1dfa80d`. The harbourmaster branch (`6fbd9c6`, "The
harbourmaster meets the boat, and her name is Jojo") shifts them by up to ~80 lines but changes
none of the shapes named here; build on whichever is merged first.

## What the data module gives you

```js
import { stateAt, eventsBetween, variantFor, boatBob, SKIP_BY_VARIANT, LANDED, DEFAULT_PLAYER } from './opening-sequence.js';
```

- `variantFor(playerId)` → `{ id: 'standard'|'word'|'mus', player, companion, seconds, captions }`.
- `stateAt(seconds, { variant, companion })` → for that moment:
  - `boat: { x, z, y, yaw, moving }` — world metres, `yaw` is a `rotation.y`; `y` is the boat's
    rest height, the world adds the bob itself;
  - `companion: { x, y, z, yaw, aboard }` — where the companion's actor goes; add `boatBob(elapsed)`
    to `y` while `aboard`;
  - `traveler: { visible, x, y, z, yaw }` — hidden and riding at the eye until the end, then
    standing on the landing;
  - `camera: { position: {x,y,z}, target: {x,y,z} }` — set the camera there, no lag (see step 3);
  - `bobWeight` — how much of `boatBob(elapsed)` to add to the eye and the traveler (1 aboard, 0
    ashore, fading through the step up);
  - `caption: { eyebrow, text, alpha } | null`;
  - `done`, and when done `landed` (= `LANDED`).
- `eventsBetween(from, to, variant)` → the events with `from < at ≤ to`: `bell` (30 s),
  `companion-turns`, `stand`, `ashore`, `landed`. Only `bell` needs the host to do anything;
  the rest are already in `stateAt`.
- `SKIP_BY_VARIANT[variant]` is `stateAt(end)` for that variant; `LANDED` holds the landing:
  `traveler`, `companion`, `camera`, `view: { yaw, pitch, distance }` (the ordinary camera's
  numbers), `toast: { title, kicker }`.

## Order of work

### Step 1 — `src/world.js`: let the host move the arrival boat

The boat the traveler arrives in is `arrivalBoat` (line 673, `boat(-5.0, 43, 1, -.12, true)`), a
child of `villageRoot`, already in `movingGroups` so it is never baked into a static batch, and
bobbed every frame by `world.update` (line 1789, `arrivalBoat.position.y = .38 + ...`). Its
`position.x/z` and `rotation.y` are in the village's local frame. Add three members to the
returned API object, beside `ringBell` (line 1721):

```js
    /**
     * The arrival boat, for the opening sequence (src/opening-sequence.js): world metres and a world
     * heading in. It is a child of the village root, so its own frame is the village's.
     */
    placeArrivalBoat(x, z, yaw) { const local = worldToVillage(x, z); arrivalBoat.position.x = local.x; arrivalBoat.position.z = local.z; arrivalBoat.rotation.y = yaw - VILLAGE.yaw; },
    /** Back to where the boat has always lain, against the pier's south face with the gangplank up to the deck. */
    restArrivalBoat() { arrivalBoat.position.x = -5.0; arrivalBoat.position.z = 43; arrivalBoat.rotation.y = -.12; },
    /** Where the boat is now, in world terms, for tests. */
    arrivalBoatPose() { const p = villageToWorld(arrivalBoat.position.x, arrivalBoat.position.z); return { x: p.x, z: p.z, yaw: arrivalBoat.rotation.y + VILLAGE.yaw }; },
```

`worldToVillage`, `villageToWorld` and `VILLAGE` are already imported at the top of `world.js`.
Do not touch the bob in `update`; `y` stays the world's.

**Test** (add to `tests/opening-sequence.test.js`, which already builds a world):

```js
test('the world lets the host move the arrival boat and put it back', () => {
  const rest = world.arrivalBoatPose();
  near(flat(rest, BOAT_REST), 0, 1e-9, 'it rests at the berth'); near(Math.cos(rest.yaw - BOAT_REST.yaw), 1, 1e-9, 'bow east');
  world.placeArrivalBoat(100, 50, 1); const moved = world.arrivalBoatPose();
  near(moved.x, 100, 1e-9, 'x'); near(moved.z, 50, 1e-9, 'z'); near(moved.yaw, 1, 1e-9, 'yaw');
  world.restArrivalBoat(); near(flat(world.arrivalBoatPose(), BOAT_REST), 0, 1e-9, 'and back');
});
```

### Step 2 — `index.html` and `src/adventure.css`: the caption layer and the Skip button

In `index.html`, directly after the `#crossing` div (line 13), add:

```html
  <div id="cutscene" class="hidden" aria-live="polite"><div class="cutscene-caption"><span class="eyebrow" id="cutscene-eyebrow"></span><p id="cutscene-text"></p></div><button id="skip-cutscene" class="secondary">Skip cutscene <kbd>Esc</kbd></button></div>
```

In `src/adventure.css`, after the `#crossing` rules, add verbatim:

```css
/* The opening sequence: the boat comes in, the traveler watches, the captions say what they know (src/opening-sequence.js, docs/opening-sequence.md). */
#cutscene {position:fixed;inset:0;z-index:12;pointer-events:none;display:grid;place-items:end center;padding-bottom:18vh;}
#cutscene .cutscene-caption {max-width:640px;padding:0 24px;text-align:center;text-shadow:0 3px 30px #102c37ab;opacity:0;}
#cutscene .eyebrow {display:block;color:#f8df9f;margin-bottom:10px;}
#cutscene p {font-family:Adventure,Georgia,serif;font-size:24px;line-height:1.4;color:#fffae8;}
#skip-cutscene {position:absolute;right:34px;bottom:22px;pointer-events:auto;}
body.cutscene #location,body.cutscene #compass,body.cutscene #map-wrap,body.cutscene #quest,body.cutscene #controls,body.cutscene #bottom-right,body.cutscene #lesson,body.cutscene #interaction {display:none!important;}
@media(max-width:1100px){#cutscene p{font-size:20px;}#skip-cutscene{right:24px;bottom:15px;}}
```

Nothing else in the stylesheet changes. `z-index` 12 sits above the HUD and under the modal
backdrop (20) and the ferry veil (30). The `.eyebrow` and `.secondary` rules and `kbd` styling
already exist in `src/style.css`.

### Step 3 — `src/main.js`: drive the sequence

**3a. Import and state.** Add to the imports:

```js
import { stateAt, eventsBetween, variantFor, boatBob, SKIP_BY_VARIANT, LANDED, DEFAULT_PLAYER } from './opening-sequence.js';
```

At line 300, replace `arrivalProgress=0` with `openingTime=0,openingFired=0,opening=null` (three
`let`s in the same declaration). `opening` is the `variantFor(...)` result while the sequence
runs, `null` otherwise.

**3b. The title screen.** Line 162 puts the player in the moored boat for the title screen:
`player.group.position.set(world.boatStart.x, ...)`. Keep it, and add `player.group.visible=false;`
(the title shows no traveler now). After `world` is created and before the first frame, put the
boat where the sequence starts: `{const s=stateAt(0);world.placeArrivalBoat(s.boat.x,s.boat.z,s.boat.yaw);}`.
Line 2547 bobs the player in `'opening'` mode (`if(mode==='opening')player.group.position.y=...`);
delete it.

**3c. `begin()`** (line 1378). It becomes:

```js
  function begin() {
    if(mode!=='opening')return;
    campaign.restore(createCampaign().snapshot());
    playSeconds=0;refugeeHold=0;settleMercenaries();mercenaryWeapons.clear();
    mode='arriving';document.body.classList.add('playing','cutscene');$('opening').style.opacity='0';$('opening').style.transform='translateY(15px)';
    opening=variantFor(currentPlayerId());openingTime=0;openingFired=0;player.group.visible=false;
    show('cutscene',true);$('cutscene-eyebrow').textContent='';$('cutscene-text').textContent='';$('cutscene').querySelector('.cutscene-caption').style.opacity='0';
    setTimeout(()=>show('opening',false),700);canvas.focus();
    if(autopilot.active)skipOpening();
  }
```

The bell no longer rings in `begin()`: the sequence rings it at 30 s. `currentPlayerId()` reads
the chosen traveler from the playable-characters module when that lands; until then
`const currentPlayerId=()=>DEFAULT_PLAYER;`.

**3d. Landing and skipping.** Add beside `begin()`:

```js
  /** The end of the opening, reached or skipped: the landing, exactly as src/opening-sequence.js says it. */
  function landOpening() {
    if(mode!=='arriving'||!opening)return;
    for(const e of eventsBetween(openingFired,Infinity,opening.id))if(e.type==='bell'){world.ringBell?.(elapsed);audio?.effect('bell');}
    const s=SKIP_BY_VARIANT[opening.id],landed=s.landed;
    world.restArrivalBoat();
    player.group.visible=true;player.group.position.set(landed.traveler.x,world.heightAt(landed.traveler.x,landed.traveler.z),landed.traveler.z);player.group.rotation.y=landed.traveler.yaw;
    grounded=true;verticalSpeed=0;yaw=landed.view.yaw;pitch=landed.view.pitch;distance=targetDistance=landed.view.distance;
    settleMercenaries();settleCamera();camera.position.set(s.camera.position.x,s.camera.position.y,s.camera.position.z);
    opening=null;document.body.classList.remove('cutscene');show('cutscene',false);
    mode='playing';stopInput();canvas.focus();refreshQuest();
    toast(landed.toast.title,landed.toast.kicker);
    if(pendingTesting){pendingTesting=false;modal('testing');}
  }
  function skipOpening(){landOpening();}
```

`settleCamera()` computes the ordinary camera from `yaw/pitch/distance`; `LANDED.camera` is the
same numbers, so the explicit `camera.position.set` only removes the lerp's lag on the first
frame. The toast replaces today's *SPEAK TO CHRIS ON THE LANDING* (line 2554): the errand is
Jojo's since `6fbd9c6`, and `LANDED.toast.kicker` says so.

**3e. The frame.** Delete the `if(mode==='arriving'){...}` block at lines 2548–2555 (the
`arrivalProgress` lerp and the Chris placement). Immediately **after** `placeMercenaries();`
(line 2618) add:

```js
      if(mode==='arriving'&&opening){
        openingTime+=dt;
        const s=stateAt(openingTime,{variant:opening.id,companion:opening.companion}),bob=boatBob(elapsed);
        for(const e of eventsBetween(openingFired,openingTime,opening.id))if(e.type==='bell'){world.ringBell?.(elapsed);audio?.effect('bell');}
        openingFired=openingTime;
        if(s.done){landOpening();}
        else{
          world.placeArrivalBoat(s.boat.x,s.boat.z,s.boat.yaw);
          player.group.position.set(s.traveler.x,s.traveler.y+bob*s.bobWeight,s.traveler.z);player.group.rotation.y=s.traveler.yaw;player.group.visible=false;
          const mate=npcById.get(companionNpcId(opening));
          if(mate){const c=s.companion;mate.actor.group.position.set(c.x,c.y+(c.aboard?bob:0),c.z);mate.actor.group.rotation.y=c.yaw;mate.actor.group.visible=true;mate.hidden=false;world.npcPositions[mate.id]={x:c.x,z:c.z};}
          openingCamera.position.set(s.camera.position.x,s.camera.position.y+bob*s.bobWeight,s.camera.position.z);openingCamera.target.set(s.camera.target.x,s.camera.target.y,s.camera.target.z);
          const cap=$('cutscene').querySelector('.cutscene-caption');
          if(s.caption){$('cutscene-eyebrow').textContent=s.caption.eyebrow;$('cutscene-text').textContent=s.caption.text;cap.style.opacity=String(s.caption.alpha);}else cap.style.opacity='0';
        }
      }
```

`openingCamera` is `{position:new THREE.Vector3(),target:new THREE.Vector3()}` declared with the
state in 3a. `companionNpcId(opening)` returns `'merc-gotwood'` unless the traveler is Chris, in
which case it returns the id the playable-characters module gives Cromb's actor; until that
module lands, it returns `'merc-gotwood'` always, with the `TODO` written on it.

Why after `placeMercenaries()`: that call rewrites `world.npcPositions['merc-gotwood']` to the
landing ring every frame, and the NPC loop at line 2656 snaps an NPC home and hides him when his
home is more than 180 m from the player. The player is in a boat 170 m out; setting the home to
the boat *after* `placeMercenaries()` and *before* the loop keeps Chris aboard and drawn. The
loop does not steer in `'arriving'` (`if(mode==='playing'&&dHome>.1)`), so it leaves him where
the sequence puts him.

**3f. The camera.** At line 2833, the camera branch is
`if(mode==='opening'){...} else {...}`. Make it:

```js
      if(mode==='opening'){cameraTarget.set(15+Math.sin(elapsed*.09)*2,12.5,57);cameraFocus.set(0,3.5,14);}
      else if(mode==='arriving'&&opening){cameraTarget.copy(openingCamera.position);cameraFocus.copy(openingCamera.target);camera.position.copy(cameraTarget);}
      else {
```

The `camera.position.copy` matters: the lerp two lines down lags the camera about a fifth of a
second behind its target, which at five metres a second is a metre astern of the eye, inside the
boat's stern. During the sequence the camera is the eye, exactly; the lerp resumes at the
landing from a camera that is already where the ordinary one wants it.

**3g. The clock.** Line 2617: `if(!['opening','pause'].includes(mode)&&!reviewFrozen)playSeconds+=dt;`
becomes `if(!['opening','pause','arriving'].includes(mode)&&!reviewFrozen)playSeconds+=dt;`.
The roster counts arrivals from the landing, not from the title screen.

**3h. Keys and buttons.**

- `$('skip-cutscene').onclick=skipOpening;` with the other button bindings (near line 2262).
- In the keydown handler's Escape branch (line 2329): `if(mode==='arriving'){e.preventDefault();skipOpening();return;}` first.
- In the Enter branch (line 2333): add `else if(mode==='arriving'){e.preventDefault();skipOpening();}`
  after the `'opening'` case.
- `testingMenu()` (line 2078): `if(mode==='arriving'){pendingTesting=true;skipOpening();return;}`
  (it used to wait for the arrival; now it skips into the testing tools).
- `startAutopilot()` needs nothing: `begin()` skips when autopilot is active, and the autopilot
  module already answers `wait` for `'arriving'` (`tests/autopilot.test.js` pins it; leave it).

**3i. Every way in that is not the sequence** must leave the boat at its berth and the traveler
visible: `continueRoad()` (line 1664, before `mode='playing'`), `beginNewestChapter()` (line
~1373), and the `?test=1` `prepare`/`prepareVillage`/review hooks that set `mode='playing'` and
`show('opening',false)` (lines 2870, 2992, 3263). Add one helper and call it from each:

```js
  /** Any start that is not the boat: the harbour as built, the traveler on their feet. */
  function leaveOpening(){opening=null;world.restArrivalBoat();player.group.visible=true;document.body.classList.remove('cutscene');show('cutscene',false);}
```

`recover` (line 2143, "Return to the pier") does not need it; it only runs from `'playing'`.

### Step 4 — the `?test=1` harness (in `src/main.js`)

Line 3028 today: `await frames(3);$('begin').click();await until(()=>mode==='playing','Boat arrival did not finish');`.
The harness's `until` gives up after 30 s and the sequence is 44 s, so the walkthrough skips it,
and checks the skip lands exactly:

```js
        await frames(3);$('begin').click();await frames(2);
        assert(mode==='arriving'&&!$('cutscene').classList.contains('hidden')&&$('skip-cutscene').getClientRects().length,'The opening sequence did not start with Skip on screen');
        {const pose=world.arrivalBoatPose();assert(Math.hypot(pose.x-world.spawn.x,pose.z-world.spawn.z)>100,'The boat did not start out at sea');}
        assert(!player.group.visible,'The traveler was drawn during the opening');
        $('skip-cutscene').click();await until(()=>mode==='playing','Boat arrival did not finish');
        assert($('cutscene').classList.contains('hidden')&&!document.body.classList.contains('cutscene'),'The caption layer stayed up');
        assert(player.group.visible&&Math.hypot(player.group.position.x-world.spawn.x,player.group.position.z-world.spawn.z)<.01,'Skip did not land the traveler at the spawn');
        {const pose=world.arrivalBoatPose();assert(Math.hypot(pose.x-23,pose.z-34)<.01,'Skip did not moor the boat');}
        {const mate=npcById.get('merc-gotwood');assert(mate.actor.group.visible&&Math.abs(mate.actor.group.position.y-1.8)<.05&&canStand(mate.actor.group.position.x,mate.actor.group.position.z,world),'Chris is not standing on the deck');}
        assert(Math.abs(yaw-Math.PI/2)<1e-9&&Math.abs(player.group.rotation.y+Math.PI/2)<1e-9,'The landing does not face west with the camera behind');
```

Then the existing assertions (`simple-sword`, `renderer.info.render.triangles`, ...) continue
unchanged. Also add a hook for the sequence itself, so a review can run it without waiting 44 s
of wall clock: in `focusedRoadHooks()` (line 2856) expose `openingState:()=>opening&&stateAt(openingTime,{variant:opening.id,companion:opening.companion})`
and `advanceOpening:seconds=>{openingTime+=seconds;}`; a harness step that clicks Step ashore,
calls `advanceOpening(29.9)`, waits two frames, asserts the bell has not swung, calls
`advanceOpening(.2)`, waits two frames and asserts `world.ringBell` was called (wrap it in the
harness) is worth having; keep it under the existing `--smoke-test` and not in a new flag.

Run `npm test` (the unit suite) after step 1 and again at the end, and `npm run test:game` at the
end. Ask before any other Electron run: the user prefers tests batched at milestones.

### Step 5 — the playable characters, when that module lands

`variantFor(playerId)` takes the chosen traveler's id (`crom`, `merc-gotwood`, `Chris`, ...).
Wire `currentPlayerId()` to it and `companionNpcId()` to whichever actor plays the companion
when the traveler is Chris (the design: "you and Cromb"). Nothing else changes; the shore variants
for Ed the Word and Mus are already in the data and end in the same `LANDED` state.

## What must not change

- **The `?test=1` harness starts** the same way: `$('begin').click()` still begins the game, and
  every review view (`view=...`) and `prepare*` hook still reaches `mode='playing'` with the
  world as built. Use `leaveOpening()` in each; do not fork them.
- **`mode === 'arriving'`** keeps its name and meaning: `src/autopilot.js` answers `wait` for it
  and `tests/autopilot.test.js` asserts that; `updateHUD` hides the vitals for it; `walkTime`
  advances for it. No new mode string.
- **Saves.** Nothing new is written to a checkpoint; `saveRoad` is untouched; the sequence never
  runs on Continue. `tests/save-round-trip.test.js` must pass as it is.
- **The world's authored harbour**: the arrival boat's rest position, the gangplank, the ferry
  mooring, the bell, `world.spawn`, `world.pierHead` — none move. `restArrivalBoat()` restores
  the exact authored numbers.
- **`tests/first-contact.test.js`** (on the harbourmaster branch) sweeps `index.html` and every
  file in `src/` for phrasings that send the player up the pier to Lakota; the new markup and code
  must not mention Lakota at the pier at all. The data module does not.
- **The bell rings once per start**, from the sequence, not from `begin()`.
- **Nothing in `src/opening-sequence.js`** needs to change to wire it; if you find you must,
  the test file says what it guarantees, and the design note says why.

## Acceptance

1. `npm test` passes, including `tests/opening-sequence.test.js` (it builds a world once; about a
   minute on this machine) and the new boat-pose test.
2. `npm run test:game` passes with the harness lines above.
3. A fresh start: the title screen shows the harbour with no boat at the gangplank and no traveler;
   Step ashore cuts to the bow at sea with Skip visible in the corner; the six captions come and go
   at the times in `docs/opening-sequence.md`; the bell is heard at 30 s while the boat is still off
   the pier's end; the boat rounds up south of the pier and stops at the gangplank, bow east; the
   view rises, cranes back to the ordinary camera behind the traveler on the pier; the toast reads
   SPEAK TO MARA AT THE HEAD OF THE PIER; Chris stands on the deck's edge beside you; Jojo is at the
   root of the pier.
4. Esc at any second lands you in that same frame, with the bell rung and the boat moored.
5. Continue adventure and Start at the newest chapter show the boat at the gangplank and never
   the sequence.
