# A map of the code

*Written against commit `1dfa80d`. Where a line number is given, it was true at that commit; the file names will outlive the numbers.*

---

## 1. How to read this map

You designed this world. This is the other half of it: the part written in a language you do not work in every day. The map is here so you can open the thing you are curious about and read it, rather than opening `src/` and meeting a hundred and ninety-eight files at once.

Three things first, because they make the reading easier, not harder.

**The folder says `typescript`. The game is plain JavaScript.** There is no compiler, no bundler, no build step, no `dist` folder. [`index.html`](../index.html) names one file, [`src/main.js`](../src/main.js), and the browser reads it as written. Every file under `src/` is loaded by the browser exactly as it sits on disk. If you change a line and reload the window, that line is what runs. Nothing is translated on the way in. The folder name is an accident of where the project was put.

**Almost every file is a *module*.** A module is a file that says out loud what it is willing to share, with the word `export`, and asks for what it needs, with the word `import`. Open [`src/lauvel-burying.js`](../src/lauvel-burying.js) and the first line of code is `import { fieldPoint } from './lauvel-aftermath.js';` — that file, and only that file, and only the one name it asked for. Nothing in this project reaches into another file's insides. That is the whole discipline, and it is why you can open one file and understand it without the other hundred and ninety-seven.

**Each section below has three depths.** A plain paragraph for what the part does. Then **where to look**, which is two or three files you can click. Then **go deeper**, which is the exact function, the test that proves it, and the design document it came from. Skim the paragraphs; drop into the links when something catches.

Every link in this document is relative and checked. In VS Code, `Ctrl+Click` opens the file. On GitHub they are ordinary links.

---

## 2. The shape of the thing

The world is spoken into being once, by `createWorld`, and everything after that is people moving through it.

```
  index.html ─────────── the page: one canvas, every HUD panel, the journal,
       │                 the opening screen. An import map points the bare
       │                 name "three" at vendor/three.module.js.
       │
       └── src/main.js ── THE HOST. One file, 3,600 lines, ~360 KB.
             │            It builds the world, places every person, runs the
             │            render loop, owns the HUD and the dialogue panel,
             │            the keys, the saves, and the test harness.
             │
             ├── src/world.js ───── the ground. Terrain, water, roads, props,
             │     │                colliders. Built once, at startup.
             │     └── derived from the authored atlas:
             │            region-survey.js  (generated from the map)
             │         →  region-layout.js  (pure geometry)
             │         →  region-world.js   (actual places, roads, bounds)
             │         →  world-terrain.js  (height and colour of the ground)
             │         →  world-regions.js  (each region's own scenery)
             │
             ├── src/characters.js ─ the bodies. Every person, goblin, wolf,
             │                       dog, cat, horse and ogre, built in code.
             │
             └── 139 PURE MODULES ─── no DOM, no three, no drawing. Each is a
                                      createSomething() that returns an object
                                      with methods, a snapshot() and a restore().
                                      The burying, the campaign, birding, riding,
                                      the money, the charts, each character with
                                      a story of their own.
                                      (Of the 188 .js files in src/, only 49
                                       import three.js at all.)

  tests/*.test.js ─── import the pure modules directly and check their rules.
  main.cjs ────────── the Electron shell: serves the folder, owns the save file,
                      and drives the screenshot and smoke runs.
```

Two words in that picture are worth stopping on.

**The host.** [`src/main.js`](../src/main.js) is the only file that talks to the screen and the keyboard at large. Everything else describes rules and content; the host is what makes them happen. It is the composition root: it creates each subsystem, listens to what each one reports, and puts the result on the HUD.

**Pure.** A module is *pure* when it touches nothing outside itself: no screen, no keyboard, no three.js, no clock of its own. Most files say so in their own header — "Pure: no DOM, no three." A pure module can be run by a test in a fraction of a second with no game window at all, which is why there are 134 test files and the whole suite runs in a minute or so.

---

## 3. A worked example: the burying at the Lauvel

Read this one section and every later section makes sense, because every later section can say "like the burying".

[`src/lauvel-burying.js`](../src/lauvel-burying.js) is 311 lines. A woman named Sela is kneeling at the end of a row of shrouds ten days after a battle, asking everybody who comes up the road whether they saw a young man in a green coat. Take the hurdle, and on the fourth trip out you carry in a man in a green coat with two fingers missing off his left hand. Then you have to go and tell her.

### First: what it is made of

The file opens with a long comment that is not decoration. It is the design, written down where the code is, and it ends with the sentence that tells you what kind of file this is:

```js
 * Pure: no DOM, no three.
```

Then the facts, frozen so nothing can change them by accident ([lines 34–51](../src/lauvel-burying.js#L34)):

```js
export const SON = freeze({
  name: 'Bevan', age: 19,
```

`Object.freeze` — shortened to `freeze` at the top of the file — makes an object permanently read-only. Once frozen, a stray line elsewhere cannot quietly rename Bevan. Most data in this project is frozen. It is a small habit with a large payoff: data that cannot change is data you can trust while reading.

### Second: the state machine

[Line 60](../src/lauvel-burying.js#L60):

```js
export const BURYING_STAGES = freeze(['unknown', 'hailed', 'asked', 'helping', 'found', 'told', 'done']);
```

A **state machine** is a list of the states a thing can be in and the rules for moving between them. That is all it is. This quest is in exactly one of seven states at any moment, and it can only move forward along that list, one step at a time.

The rules are the small functions in [`createBurying`](../src/lauvel-burying.js#L79). Each one checks where you are before it does anything:

```js
  function hail() {
    if (!at('unknown')) return { ok: false };
    state.stage = 'hailed';
    onEvent({ type: 'sela-hailed' });
    return { ok: true };
  }
```

Three lines and they are all load-bearing. She only calls out to somebody she has not called out to. The stage moves. And `onEvent` tells whoever is listening — the host — that something happened, so it can play a sound or write a line in the journal. The module never plays the sound itself. It reports.

The one function with a story in it is [`work(id)`](../src/lauvel-burying.js#L108):

```js
    const foundNow = id === 'hurdle' && state.carried >= FOUND_ON_TRIP && at('helping');
```

Digging graves will never find him. Writing names will never find him. He is in the long grass at the far hedge, and the only way to him is the hurdle, on the fourth trip. That single line is the whole shape of the quest.

### Third: `snapshot` and `restore`

[Line 146](../src/lauvel-burying.js#L146):

```js
  const snapshot = () => ({ version: BURYING_VERSION, stage: state.stage, done: JOB_IDS.filter(id => state.done.has(id)), carried: state.carried });
```

A **snapshot** is everything about this quest that needs to survive being written to a file and read back tomorrow — reduced to plain data: a number, a word, a list of words. Not the functions, not the dialogue, just what you did. `restore` is the other direction: it takes that plain data and puts the module back the way it was.

Every saveable module in the project has this pair. It is why the save file is small and why a save from last week still loads.

### Fourth: the validator, which is the interesting one

[Line 64](../src/lauvel-burying.js#L64) is `validateBuryingSnapshot`, and its comment says why it exists:

```js
  // The stage, the jobs and the tally have to agree, because the quest only ever makes
  // them agree: nobody works before she asks, the tally only moves at the hurdle, and he
  // comes in on the fourth trip. A save that says otherwise is not one this quest wrote.
  if (data.carried > 0 && !data.done.includes('hurdle')) return false;
```

The save layer, [`src/road-checkpoint.js`](../src/road-checkpoint.js), calls this before it applies anything. If any one section of a save is nonsense, the whole save is refused and the running game is left untouched. That is deliberate: a half-applied save is worse than no save.

The commit that added this rule is called *"The burying only loads a save whose stage, jobs and tally agree"* (`1ae7609`). The commit messages in this project say **why**, not what. `git log --oneline -15` reads like a changelog someone actually wrote.

### Fifth: the test

[`tests/lauvel-burying.test.js`](../tests/lauvel-burying.test.js) is the proof. A **test** is a small program that plays the module and then states, in plain words, what must be true. If the statement is false, the test fails and prints the sentence.

It starts by writing a helper that plays the quest the way a traveler would ([line 10](../tests/lauvel-burying.test.js#L10)):

```js
function play(to = 'done') {
  const burying = createBurying();
  if (to === 'unknown') return burying;
  burying.hail(); if (to === 'hailed') return burying;
```

And then the checks. This is the one that matters ([line 65](../tests/lauvel-burying.test.js#L65)):

```js
test('the fourth man carried in off the field is the one she is looking for', () => {
  const burying = play('helping');
  // Digging and writing names do not turn him up, however long you do them: he is in the grass.
  for (let i = 0; i < 20; i++) { burying.work('spade'); burying.work('names'); }
  assert.equal(burying.found, false, 'he is not in the row and not on the list');
```

Read the test names alone and you have the design of the quest. That is the convention: a test is named as a full sentence describing the rule it holds.

Run just this one:

```sh
node --test tests/lauvel-burying.test.js
```

It takes under a second. No game window, no Electron, no cost. That is what "pure" buys.

### The same shape, everywhere

[`src/bosco.js`](../src/bosco.js) — Brandy Frank's small round dog — is built the same way: a frozen description, a `createBosco`, a `snapshot`, a validator, and [`tests/bosco.test.js`](../tests/bosco.test.js) beside it. So is [`src/riding.js`](../src/riding.js). So is [`src/campaign.js`](../src/campaign.js), which is the whole civil war. Once you have read the burying you can open any of them and know where you are.

---

## 4. The tour

### The page, and the host

[`index.html`](../index.html) is one page. It holds the canvas the world is drawn on, and then every panel the game will ever show: the quest card, the journal with its four tabs, the dialogue box, the satchel, the pause screen, the testing tools. They are all in the page from the start, hidden, and the host shows and hides them. Near the top is a small block that matters more than its size suggests:

```html
<script type="importmap">{"imports":{"three":"./vendor/three.module.js"}}</script>
```

An **import map** tells the browser what a bare name means. Every module in the project writes `import * as THREE from 'three'`, and this line is what turns `'three'` into the copy of the three.js library sitting in [`vendor/`](../vendor/three.module.js). There is no package manager involved at run time; the library is a file in the repository.

The last line of the page starts everything: `<script type="module" src="./src/main.js">`.

[`src/main.js`](../src/main.js) is the big one, and it is dense on purpose — long lines, one concern per line. **Do not read it top to bottom.** Navigate it:

- Nearly the whole file is inside one function, [`init()`](../src/main.js#L147), which runs once when the page loads. Line 161 builds the world; line 163 begins `npcData`, the list of everyone in it.
- **Looking for a person?** Search the file for their name or their id. `npcById.get(...)` appears about thirty times, and each one is the host reaching for a specific character to move them or make them speak.
- **The render loop** is [`render(now)`](../src/main.js#L2521), and `requestAnimationFrame(render)` at [line 2851](../src/main.js#L2851) is what starts it turning.
- **The quest card** is [`refreshQuest()`](../src/main.js#L1310); the journal is `refreshJournal()` at 1521; the whole HUD is `updateHUD()` at 2453.
- **Conversation** is [`openDialogue`](../src/main.js#L2111) and `updateSpeech` at 2117. `conversation(npc)` at 1899 is the big switchboard that decides which module gets to speak for a given person.
- **Pressing F** is [`interact()`](../src/main.js#L2145).
- **The save** is written by [`saveRoad()`](../src/main.js#L1651) and read by `continueRoad()` at 1664. Look at the object literal in `saveRoad` and you are looking at the entire contents of a save file.
- **The test harness** is the block guarded by `?test=1` at [line 2854](../src/main.js#L2854), which hangs `window.__AZHORA__` off the page. Nothing in it exists during a normal game.

**Where to look**

- [`index.html`](../index.html) — the page, every panel, the import map, the one script tag.
- [`src/main.js`](../src/main.js) — the host. 133 imports at the top; that list alone is a table of contents for the project.
- [`main.cjs`](../main.cjs) — the Electron shell around the page. It serves the folder over a local HTTP server, opens one window, and owns the save file.

**Go deeper**

- [`preload.cjs`](../preload.cjs) exposes `window.azhoraRoadStorage` to the page — a `localStorage`-shaped thing backed by the real file. The game itself never sees the filesystem.
- [`scripts/checkpoint-store.cjs`](../scripts/checkpoint-store.cjs) is the save file: validated JSON, written to a temporary file and renamed into place, capped at 64 KB.
- [`CLAUDE.md`](../CLAUDE.md) is the working brief for the codebase, and its "Architecture" section is the shortest true description of the process layout.

### The world: how the ground exists

The ground is not drawn by hand. It is derived from the atlas you authored in World Builder, and the pipeline is a straight line, each step doing one thing.

The atlas is exported to [`assets/azhora-dev-regions.json`](../assets/azhora-dev-regions.json) and reduced to [`src/region-survey.js`](../src/region-survey.js), a generated file that lists the hexes of the playable regions. Its own header says *"GENERATED... Do not edit by hand"*, and [`tests/region-survey.test.js`](../tests/region-survey.test.js) fails if it ever drifts from the export.

From there, [`src/region-layout.js`](../src/region-layout.js) is pure geometry over those hexes: where a region's cells are in world metres, its outline, the anchors of the road, the bounds of the playable world. [`src/region-world.js`](../src/region-world.js) turns geometry into named places — `ANCHORS`, `WORLD_BOUNDS`, `MAIN_ROAD`, and where every person and site stands. [`src/world-terrain.js`](../src/world-terrain.js) answers the two questions the ground has to answer: how high is it here, and what colour. And [`src/world.js`](../src/world.js) — 1,888 lines — takes all of that and builds the actual three.js scene: terrain mesh, water, roads, buildings, props, colliders.

The single fact to hold on to: **north is `-Z`, east is `+X`, and one authored hex is 100 metres.** That last number lives in [`src/world-scale.js`](../src/world-scale.js#L38), and it is the reason that file exists. The regions were authored at 56 m per hex and the playable world uses 100. So the world got bigger, but a village must not: if you scaled everything, Tidehaven's houses would drift apart. `world-scale.js` solves that with a **cluster** — a named place that keeps its internal distances while the space *between* places grows. Its header comment explains the whole scheme in twenty lines and is worth reading in full.

Collision is small and lives apart from all of this. [`canStand(x, z, world, radius)`](../src/game-state.js#L13) is fifteen lines: are you inside the bounds, is anything in the way, is the ground above water. [`moveCharacter`](../src/game-state.js#L27) walks a step in small slices so you slide along a wall instead of sticking to it. [`src/collider-grid.js`](../src/collider-grid.js) is the one optimisation: it buckets the world's colliders so a step asks a handful of shapes rather than all nine thousand.

**Where to look**

- [`src/world.js`](../src/world.js) — `createWorld(scene)` at [line 68](../src/world.js#L68). It returns one object, `api`, with everything the host needs: `heightAt`, `colliders`, `paths`, `npcPositions`, `firePits`, and an `update` for the things that move on their own.
- [`src/region-layout.js`](../src/region-layout.js) — the pure geometry. [`createAtlasTransform`](../src/region-layout.js#L104) is the hinge between the map and the world.
- [`src/game-state.js`](../src/game-state.js) — 62 lines, and among the most-used code in the project.

**Go deeper**

- `axisSamples` in [`world.js` line 336](../src/world.js#L336) decides where the terrain grid is fine and where it is coarse: dense near the road, sparse out at the edges.
- The atlas is **not north-up in world terms**. [`northOffset`](../src/region-layout.js#L108) is the bearing of world `-Z` on the chart, and `worldHeadingToAtlas` rotates the traveler's facing through the same turn as their position. Get this wrong and the "you are here" arrow points somewhere plausible and false.
- Tests: [`tests/region-layout.test.js`](../tests/region-layout.test.js), [`tests/region-survey.test.js`](../tests/region-survey.test.js), [`tests/world-scale.test.js`](../tests/world-scale.test.js), [`tests/collider-grid.test.js`](../tests/collider-grid.test.js), [`tests/game-state.test.js`](../tests/game-state.test.js).
- Docs: [`region-rebuild.md`](region-rebuild.md) is the brief, [`region-rebuild-report.md`](region-rebuild-report.md) the build report, [`world-scale-brief.md`](world-scale-brief.md) and [`world-scale-report.md`](world-scale-report.md) the scale change.

### The regions

Each region follows the same three-file pattern, so once you can read one you can read all of them.

A `*-world.js` says what is there in plain data — places, roads, water, where people stand — and imports no three.js at all. A `*-scenery.js` draws it. A `*-people.js` speaks for it. Pueth is the clearest example: [`pueth-world.js`](../src/pueth-world.js), [`pueth-scenery.js`](../src/pueth-scenery.js), [`pueth-people.js`](../src/pueth-people.js). West Suval, East Suval, Elagos, Amod, Peblos and West Izol all repeat it. The four newest — Vastos, Meneth, Caricas and Nesdor — share three files between them: [`west-regions.js`](../src/west-regions.js), [`west-regions-scenery.js`](../src/west-regions-scenery.js), [`west-regions-life.js`](../src/west-regions-life.js).

The split is not tidiness. The `*-world.js` half is pure, so a test can ask "is Ammi Tal reachable from anywhere?" without opening a window. That is a real test ([`tests/amod-world.test.js`](../tests/amod-world.test.js)) and it caught a real problem, recorded in commit `c67ba65`.

**Where to look**

- [`src/peblos-world.js`](../src/peblos-world.js) — the shortest one worth reading end to end, and its header explains something important: the nine authored hexes of Peblos fall into six groups that touch nothing, so each group *is* an island. The number and size of the islands are the map's, not the file's.
- [`src/west-suval.js`](../src/west-suval.js) and [`src/west-suval-world.js`](../src/west-suval-world.js) — the largest region pair: Solis, its walls and gates, the Coalition's camp.
- [`src/west-suval-host.js`](../src/west-suval-host.js) and [`src/izol-host.js`](../src/izol-host.js) — 84 and 54 lines each, and worth reading as a pattern: they are the one place the host hands a region its people and conversations, which keeps `main.js` from growing another thousand lines per region.

**Go deeper**

- [`src/build-status.js`](../src/build-status.js) records how far each region has actually been built, and the developer's chart tints the atlas by it.
- Every region has a brief and a report in [`docs/`](.): [`pueth-brief.md`](pueth-brief.md) / [`pueth-report.md`](pueth-report.md), [`elagos-brief.md`](elagos-brief.md) / [`elagos-report.md`](elagos-report.md), [`amod-brief.md`](amod-brief.md) / [`amod-report.md`](amod-report.md), [`peblos-brief.md`](peblos-brief.md) / [`peblos-report.md`](peblos-report.md), [`east-suval-brief.md`](east-suval-brief.md), [`west-suval-brief.md`](west-suval-brief.md), [`west-izol-brief.md`](west-izol-brief.md), [`four-regions-brief.md`](four-regions-brief.md).
- [`docs/difficulty-ladder.md`](difficulty-ladder.md) proposes a level, 0 to 11, for every region on the atlas.

### People

There are two halves to a person: the body and the mind.

The body is [`src/characters.js`](../src/characters.js), 3,406 lines, and it is the only file in the project that builds a human being out of boxes and cylinders. `createCharacter({ role, tunic, ... })` returns an articulated figure with a walk; there are also `createGoblin`, `createWolf`, `createDog` (a wolf with the dog flag), `createCat`, `createHorse`, `createOgre` and `createRockTroll`. Roles carry their own clothing — a legion soldier, a field courier, a reed worker — so a person's look is a word, not a pile of numbers at the call site. Several characters distinctive enough to need their own shape have a `*-model.js` of their own: [`bosco-model.js`](../src/bosco-model.js), [`chameleon-model.js`](../src/chameleon-model.js), [`woodcutter-model.js`](../src/woodcutter-model.js), [`troupe-models.js`](../src/troupe-models.js), [`batman-model.js`](../src/batman-model.js).

The mind is a module per person, and it is where nearly all the writing lives. Anyone with a story has one: [`brandy.js`](../src/brandy.js), [`bosco.js`](../src/bosco.js), [`katy.js`](../src/katy.js), [`vineyard.js`](../src/vineyard.js), [`lighthouse.js`](../src/lighthouse.js), [`rival-light.js`](../src/rival-light.js), [`salt-sultan.js`](../src/salt-sultan.js), [`troupe.js`](../src/troupe.js), [`wine-chameleon.js`](../src/wine-chameleon.js), [`beekeeper.js`](../src/beekeeper.js), [`batman.js`](../src/batman.js), [`talking-tree.js`](../src/talking-tree.js), [`village-cat.js`](../src/village-cat.js), [`village-dog.js`](../src/village-dog.js). Each is pure. Each has a test.

Crowds work differently: [`ambron-people.js`](../src/ambron-people.js), [`elod-people.js`](../src/elod-people.js), [`izol-people.js`](../src/izol-people.js), [`solis-town.js`](../src/solis-town.js), [`town-life.js`](../src/town-life.js) hold ambient conversation only. Their headers say it plainly — *"nobody here moves a quest"* — which is a useful thing to be able to promise.

**Where to look**

- [`src/characters.js`](../src/characters.js) — `createCharacter` at [line 838](../src/characters.js#L838). The file is long but repetitive; read one animal and you have read them all.
- [`src/bodies.js`](../src/bodies.js) — 75 lines that make people solid to one another, so a villager steps round you instead of through you.
- [`src/mercenaries.js`](../src/mercenaries.js) — the company of eleven. Their arrivals are a pure function of play time: nothing but the clock decides where each of them is.

**Go deeper**

- [`src/bystanders.js`](../src/bystanders.js): when a fight starts next to people who live there, they do not stand about.
- [`src/lakota-mind.js`](../src/lakota-mind.js) and [`src/lakota-knows.js`](../src/lakota-knows.js) are the pure half of the free-talk pilot described in [`docs/lakota-ai-pilot.md`](lakota-ai-pilot.md).
- Tests: [`tests/mercenaries.test.js`](../tests/mercenaries.test.js), [`tests/mercenary-characters.test.js`](../tests/mercenary-characters.test.js), [`tests/bodies.test.js`](../tests/bodies.test.js), [`tests/bystanders.test.js`](../tests/bystanders.test.js), [`tests/no-avatar-twins.test.js`](../tests/no-avatar-twins.test.js) — the last of which checks that nobody in the world is wearing the traveler's own face.

### Fighting

[`src/combat.js`](../src/combat.js) is the rules and [`src/combat-view.js`](../src/combat-view.js) is the bodies. The rules file is pure: swings with their three-hit combo, dodges, stamina, the amber tell before an enemy strikes, who is still standing. It knows nothing about how a goblin looks. The view file creates and recycles the actual figures as encounters start and end.

An **encounter** is a named fight with a place and a list of who is in it. [`src/opening-fights.js`](../src/opening-fights.js) holds the two raids of the opening. The chapters hold theirs. [`tests/every-fight.test.js`](../tests/every-fight.test.js) gathers every encounter the game can start from every module that defines one and checks that `combat.js` will accept each of them — the commit is called *"Every fight the game can start is one combat will accept"* (`eb80e6b`).

**Where to look**

- [`src/combat.js`](../src/combat.js) — [`createCombat`](../src/combat.js#L147); `fightBox(encounter)` at line 81 is the ground a fight's people may step on.
- [`src/weapons.js`](../src/weapons.js) — what is equipped, how landed hits wear it, what a repair bench restores. Missed swings cost nothing.
- [`src/amod-ogre.js`](../src/amod-ogre.js) — Mallec, who holds the Pueth road. Not a spawn; a person three times your size with a toll and an opinion.

**Go deeper**

- Tests: [`tests/combat.test.js`](../tests/combat.test.js), [`tests/every-fight.test.js`](../tests/every-fight.test.js), [`tests/wolves.test.js`](../tests/wolves.test.js), [`tests/allies.test.js`](../tests/allies.test.js), [`tests/weapons.test.js`](../tests/weapons.test.js). Note that there is no `src/wolves.js` — wolves are a kind inside `combat.js` and `characters.js`, and the test is named for the behaviour, not a file.

### The story

There are three layers stacked on each other, and they are genuinely different things.

**The tutorial** is the smallest and oldest: eleven steps in [`questSteps`](../src/game-state.js#L35), advanced by [`advanceQuest(stage, event)`](../src/game-state.js#L48), which is a plain list of `if (stage === 3 && event === 'ambush') return 4;`. That runs from the boat to the Caloss Gate and then stops.

**The chapters** are what the player reads. [`src/story-chapters.js`](../src/story-chapters.js) numbers them and gives each a goal, and a chapter is finished when its own `done(state)` function says so, from the same views the journal already has. Each chapter that is playable in 3D has a module: [`luscia-chapter.js`](../src/luscia-chapter.js) (the field at the Lauvel), [`moros-chapter.js`](../src/moros-chapter.js) (the army on the plain), [`border-chapter.js`](../src/border-chapter.js) (the envoy and the battle), [`aftermath-chapter.js`](../src/aftermath-chapter.js) (the four ways the day after can go).

**The campaign** is underneath all of it. [`src/campaign.js`](../src/campaign.js) is the whole civil war as a graph of chapters with a fork at Solis, battles whose odds are tilted by side quests, regional arcs that flip provinces on the political map, faction trust, and exposure when you have been dealing with both sides. Most of it is not yet playable in 3D, but all of it is executable and tested. [`src/campaign-world.js`](../src/campaign-world.js) is the registry it reads: every authored region, its faction, its threats, its level.

The road out of Drent into Luscia is its own smaller thing: [`src/journey.js`](../src/journey.js) holds the errands and [`src/journey-content.js`](../src/journey-content.js) holds the people and what they say.

**Where to look**

- [`src/story-chapters.js`](../src/story-chapters.js) — [`STORY_CHAPTERS`](../src/story-chapters.js#L40). Read the `goal` strings; that is the game's spine in a page.
- [`src/campaign.js`](../src/campaign.js) — [`CHAPTERS`](../src/campaign.js#L21), the graph. `next` is a chapter id, or a map from outcome to chapter, or `null` at the frontier of what is designed.
- [`src/story-starts.js`](../src/story-starts.js) — 45 lines. The main quest is built in order, so the newest stretch is the least played; this table is how you start there. It is what the opening screen's **Start at the newest chapter** button uses.

**Go deeper**

- [`tests/story-spine.test.js`](../tests/story-spine.test.js) checks the chapters, the starts, the campaign graph and the playable chapter modules all agree with one another.
- [`src/occupation.js`](../src/occupation.js) — 51 lines that turn the campaign's political map into who is actually standing at a gate.
- [`src/refugees.js`](../src/refugees.js) — three people walking away from the battle, and the first thing in the war the traveler sees with their own eyes.
- Docs: [`campaign-design.md`](campaign-design.md) is the design record and the tests check the two agree. [`original-brief.md`](original-brief.md) is your full spoken brief for the whole game; [`brief-review.md`](brief-review.md) is the review of it with the open questions. [`the-war-and-the-house-of-ambron.md`](the-war-and-the-house-of-ambron.md) and [`izol-and-the-triumvirate.md`](izol-and-the-triumvirate.md) are the politics.

### Skills

[`src/skills.js`](../src/skills.js) is the table underneath all of them. There are two kinds. The *knowing* skills — birding, botany, fishing, geology, mycology, archaeology, wine — grow by finding a thing for the first time, through ten levels. The *working* skills are done RuneScape's way: you do the thing over and over, and the level climbs RuneScape's own curve to 99. That curve is computed, not typed out ([line 20](../src/skills.js#L20)):

```js
  for (let l = 1; l < 99; l++) { points += Math.floor(l + 300 * 2 ** (l / 7)); table.push(Math.floor(points / 4)); }
```

Level 2 is 83 experience; level 99 is 13,034,431; level 92 is half of 99. Woodcutting was the first to move onto it.

Each skill is a module, and most have a companion file holding the *things* the skill finds: [`birding.js`](../src/birding.js) with [`drent-birds.js`](../src/drent-birds.js), [`botany.js`](../src/botany.js) with [`drent-flora.js`](../src/drent-flora.js) and [`drent-trees.js`](../src/drent-trees.js), [`mycology.js`](../src/mycology.js) with [`mushrooms.js`](../src/mushrooms.js), [`geology.js`](../src/geology.js) with [`drent-stones.js`](../src/drent-stones.js), [`archaeology.js`](../src/archaeology.js) with [`rena-digs.js`](../src/rena-digs.js), [`wine.js`](../src/wine.js) with [`attic-wines.js`](../src/attic-wines.js). The rest: [`fishing-skill.js`](../src/fishing-skill.js), [`cooking.js`](../src/cooking.js), [`woodcutting.js`](../src/woodcutting.js), [`construction.js`](../src/construction.js).

Every skill has a teacher, named in the table, and the teacher is a real person standing somewhere.

**Where to look**

- [`src/skills.js`](../src/skills.js) — [`SKILLS`](../src/skills.js#L28), one entry per skill with its blurb, its teacher and its thresholds.
- [`src/birding.js`](../src/birding.js) — the first one built, and the fullest.
- [`src/woodcutting.js`](../src/woodcutting.js) — the first working skill, and the one to read for how the 99 grid actually feels.

**Go deeper**

- Tests: [`tests/skills.test.js`](../tests/skills.test.js), [`tests/birding.test.js`](../tests/birding.test.js), [`tests/drent-birds.test.js`](../tests/drent-birds.test.js), [`tests/botany.test.js`](../tests/botany.test.js), [`tests/geology.test.js`](../tests/geology.test.js), [`tests/mycology.test.js`](../tests/mycology.test.js), [`tests/fishing-skill.test.js`](../tests/fishing-skill.test.js), [`tests/woodcutting.test.js`](../tests/woodcutting.test.js), [`tests/cooking.test.js`](../tests/cooking.test.js), [`tests/wine.test.js`](../tests/wine.test.js).

### The chart

There are three maps and they answer different questions.

**The chart** — the continental atlas, opened with `M` — is [`src/world-map.js`](../src/world-map.js). It draws the parchment SVG exported from World Builder and lays a fog overlay over it. It starts blank. [`src/map-fog.js`](../src/map-fog.js) is what uncovers it: a hex of the atlas is revealed only when you have walked into it, and the ground between the hexes is named by **subregions** — small authored areas that get written into the journal the first time you reach one.

**The local trail map** — `L` — is [`src/trail-map.js`](../src/trail-map.js), drawn from a model built by [`src/local-map-data.js`](../src/local-map-data.js). **The minimap** in the corner is [`src/minimap.js`](../src/minimap.js), the same projection drawn small each frame. Both are north-up and keep real distances equal, so a thing twice as far away looks twice as far away.

**Where to look**

- [`src/map-fog.js`](../src/map-fog.js) — [`SUBREGIONS`](../src/map-fog.js#L17). This is a good file to browse for its own sake; each entry is a short piece of place writing.
- [`src/world-map.js`](../src/world-map.js) — the atlas, its zoom, and the "you are here" marker.
- [`src/region-layout.js`](../src/region-layout.js#L104) — `createAtlasTransform`, which is what lets a world position become a point on a chart that is not north-up.

**Go deeper**

- One id in `map-fog.js` is worth knowing about. Tidehaven's subregion is still called `eastreena`, and there is a comment saying why: *"The id stays `eastreena` so older charts keep loading; the name on the chart is the one the village uses now."* Ids never change once a save has written them. Names on screen change freely. The same rule is why the birding skill's teacher is keyed `bird-watcher`.
- Tests: [`tests/map-fog.test.js`](../tests/map-fog.test.js), [`tests/minimap.test.js`](../tests/minimap.test.js), [`tests/trail-map.test.js`](../tests/trail-map.test.js), [`tests/local-map-data.test.js`](../tests/local-map-data.test.js), [`tests/map-tutorial.test.js`](../tests/map-tutorial.test.js).

### Carrying, paying, riding, and sound

[`src/inventory.js`](../src/inventory.js) is the satchel: every item that exists, what it is, what its hint says. [`src/economy.js`](../src/economy.js) is the money, and it is honest about being unfinished — copper is built, silver and gold and the Coalition's paper scrip are recorded so Wendel the peddler can explain them truthfully before they exist. [`src/consumables.js`](../src/consumables.js) governs food: it changes health and nothing else. [`src/campcraft.js`](../src/campcraft.js) is fires, the tinderbox, cooking and fishing tackle.

[`src/riding.js`](../src/riding.js) is the horse. Its header is the best short statement of design intent in the project: *"The rules are small on purpose."* G mounts, H whistles. A horse walks faster than a man runs. It will not fight; a fight puts you on the ground. [`src/ostler.js`](../src/ostler.js) is the man in Lumber Town who turns the army's token into the horse.

[`src/road-audio.js`](../src/road-audio.js) is all the sound, and there is no audio file anywhere in the repository. Every sound is synthesized from a few numbers — the array `swing:[180,70,.13,.10]` is a frequency sweep, a length and a volume. The sea, the river, the camp, the bell, and every effect from a swing to a discovery come out of that one file.

**Where to look**

- [`src/economy.js`](../src/economy.js) — 74 lines, and `describeSum` reads a number of copper back the way a market would say it.
- [`src/riding.js`](../src/riding.js) — [`createRiding`](../src/riding.js#L69).
- [`src/road-audio.js`](../src/road-audio.js) — the `EFFECTS` table near the top.

**Go deeper**

- [`docs/economy.md`](economy.md) is the design the money is built toward.
- [`tests/tills.test.js`](../tests/tills.test.js) checks that every shop in the game agrees about prices; it reads the source files as text to do it, which is a trick worth knowing about (see *Conventions*, below).
- Tests: [`tests/inventory.test.js`](../tests/inventory.test.js), [`tests/economy.test.js`](../tests/economy.test.js), [`tests/consumables.test.js`](../tests/consumables.test.js), [`tests/foods.test.js`](../tests/foods.test.js), [`tests/riding.test.js`](../tests/riding.test.js), [`tests/ostler.test.js`](../tests/ostler.test.js), [`tests/road-audio.test.js`](../tests/road-audio.test.js).

### Optional life

The things that are not the main quest and never block it. [`src/forest-story.js`](../src/forest-story.js) and [`src/forest-places.js`](../src/forest-places.js) are the six woodland places off the Greenway. [`src/forest-hideout.js`](../src/forest-hideout.js) is the Bramble Scout Camp. [`src/forest-ecology.js`](../src/forest-ecology.js) and [`src/woodland-life.js`](../src/woodland-life.js) are the wood as a living thing — deer, thrushes, squirrels with a memory of their own tree, butterflies. [`src/acorn-quest.js`](../src/acorn-quest.js) is Lysa's errand. [`src/regional-life.js`](../src/regional-life.js) is the three working places along the road.

They share a rule, written in several of their headers: *these never advance or replace the main journey*, and every reward is given exactly once.

**Where to look**

- [`src/forest-story.js`](../src/forest-story.js) — the pattern for an optional arc with a one-time reward.
- [`src/woodland-life.js`](../src/woodland-life.js) — note the comment that a squirrel cannot eat an acorn the village errand needs.
- [`src/talking-tree.js`](../src/talking-tree.js) — the old tree in Drent's wood, with [`talking-tree-view.js`](../src/talking-tree-view.js) drawing it.

**Go deeper**

- Tests: [`tests/forest-story.test.js`](../tests/forest-story.test.js), [`tests/forest-places.test.js`](../tests/forest-places.test.js), [`tests/forest-hideout.test.js`](../tests/forest-hideout.test.js), [`tests/woodland-life.test.js`](../tests/woodland-life.test.js), [`tests/acorn-quest.test.js`](../tests/acorn-quest.test.js), [`tests/regional-life.test.js`](../tests/regional-life.test.js).

---

## 5. How the pieces talk

Four mechanisms carry nearly all the traffic between the host and the modules. Learn these and the wiring stops being mysterious.

### The loop

[`render(now)`](../src/main.js#L2521) runs once per frame, about sixty times a second, because its last act is to ask the browser to call it again. Its first job is honest time:

```js
    const rawDt=Math.max(0,(now-lastTime)/1000),dt=Math.min(rawDt,.05);lastTime=Math.max(lastTime,now);elapsed+=dt;frameCount++;
```

That is one line, and it is four concerns — which is what "dense on purpose" looks like in practice. `dt` is how long since the last frame, in seconds, clamped so a long pause cannot teleport anything. The comment above it explains the clamp: a frame's stamp can predate the clock, and time must never run backwards. Everything that moves is then told how much time passed: `world.update(elapsed, dt)`, `woodlandLife.update(dt, ...)`, `combat.update(dt, ...)`, and so on down the list. That is the whole of animation in this project. Nothing has a clock of its own.

### Events

A module never reaches out. It reports, by calling the `onEvent` it was handed when it was created:

```js
    onEvent({ type: 'sela-hailed' });
```

The host decides what that means: a sound from `road-audio.js`, a line in the journal, a **toast** — the small notice that slides in at the corner, written by [`toast(title, kicker)`](../src/main.js#L1281). This is why the modules are testable. A test creates the module with its own `onEvent` and simply collects what the module claims happened.

### Snapshots and saves

Every module that has anything worth keeping offers `snapshot()` and `restore(data)`. [`saveRoad()`](../src/main.js#L1651) collects them into one object and hands it to [`src/road-checkpoint.js`](../src/road-checkpoint.js), which checks every section — `validateJourneySnapshot`, `validateBuryingSnapshot`, `validateRidingSnapshot` and the rest; forty-four files in `src/` export one — before it writes. On the way back in, `continueRoad()` restores each section, or starts that section fresh if the save predates it:

```js
    skills.restore(saved.skills??createSkills().snapshot());
```

That `??` is the whole compatibility policy in one operator: use what the save has, or a brand-new empty one. It is why a save from before a feature existed still loads after it does.

There is one save slot, keyed `azhora-road-checkpoint-v1`. [`tests/save-round-trip.test.js`](../tests/save-round-trip.test.js) sweeps every `validate*Snapshot` in `src/` and checks each one accepts what its own `snapshot()` writes — because a validator that rejects its own output does not lose a feature, it loses the player's whole save.

### Review views

This is the project's way of *looking* at something without playing to it.

When the page is opened with `?test=1`, [`src/main.js` line 2854](../src/main.js#L2854) hangs an object called `window.__AZHORA__` off the page: the game's state, the camera, and a set of named viewpoints. [`main.cjs`](../main.cjs#L17) parses `--review-views=a,b`, opens the game, calls each named view, and photographs it. The views are deterministic — the same name always puts the camera in the same place — so two screenshots a week apart are comparable.

The comment at [`main.js` line 638](../src/main.js#L638) explains the geometry, and it is the clearest bit of it:

> `review()` puts the camera at `look + (sin yaw, cos yaw) * d` and points it back at `look`, so a shot is fully described by the thing being looked at and the place the camera is looking from.

Pictures land in `tests/artifacts/`, which is gitignored. `--review-clean` hides the HUD; `--review-jpeg` saves a fraction of the bytes.

---

## 6. How to run it, test it, and see a thing

```sh
npm start                    # play it. Or double-click "Play Azhora.cmd".
npm test                     # 134 test files, about a minute, no game window. Free.
node --test tests/bosco.test.js                        # one file
node --test --test-name-pattern="green coat" tests/lauvel-burying.test.js   # one test
```

`npm test` is the one to reach for. It needs no Electron, opens nothing, and costs nothing but the time.

**One thing to know about `npm test`.** [`package.json`](../package.json) lists every test file by name in one enormous `test` script. A new `tests/*.test.js` file **does not run** until it is added to that list. At `1dfa80d` all 134 files on disk are listed, so nothing is silently skipped — but that is a fact you have to maintain, not one the tooling maintains for you.

Everything below opens a real window and drives the real renderer. **These cost money** and take from under a minute to several. Run them one at a time, and only when you need to see the game rather than test a rule.

```sh
npm run test:game            # full story walkthrough: tutorial, fights, quests, satchel, saves
npm run test:road            # holds real movement keys along the whole road and back
npm run test:autoplay        # the computer plays the road end to end, at real speed
npm run test:checkpoints     # save, quit, reopen in a fresh renderer, check it came back
npm run review:forest        # screenshots, same machinery
```

To photograph a specific thing:

```sh
node scripts/launch.cjs --smoke-test --review-views=brandy,brandy-close --review-clean --review-jpeg
```

Two generators, for when the World Builder map has changed:

```sh
node scripts/build-region-survey.mjs   # rebuilds src/region-survey.js from the atlas export
npm run map:refresh                    # the journal's parchment chart
npm run map:developer                  # the developer hex survey
```

`src/region-survey.js` and `src/region-rivers.js` are generated. Their headers say *"Do not edit by hand"* and a test fails if they drift.

---

## 7. Conventions worth naming

These are habits rather than rules, but they are consistent enough that breaking one will look wrong.

**A header comment that says what the file is for.** Most modules open with a paragraph in plain English, and most end it with `Pure: no DOM, no three.` If you want to know what a file does, the file will usually tell you in its first twenty lines. The index in section 8 is built from those headers.

**Commit messages that say why.** `git log --oneline -15` at `1dfa80d`:

```
1dfa80d The difficulty ladder: every region on the atlas, 0 to 11, proposed for approval
eb80e6b Every fight the game can start is one combat will accept
9c2df1a The bar going amber and the warning about it now mean the same thing
e0dc43a A company of refugees with no road to walk is empty, not broken
1ae7609 The burying only loads a save whose stage, jobs and tally agree
```

**`Object.freeze` on anything that is data.** If it describes the world rather than tracking it, it is frozen.

**Ids never change; names do.** `eastreena` is still the id of Tidehaven's subregion. `bird-watcher` is still the id of the birder. Saves refer to ids, so an id is a promise.

**Names come from the lore.** Places, people and wines are named from the world, not invented at the keyboard.

**Tests named as sentences.** `test('the fourth man carried in off the field is the one she is looking for', ...)`.

**A few tests read the source as text.** [`tests/save-round-trip.test.js`](../tests/save-round-trip.test.js), [`tests/story-spine.test.js`](../tests/story-spine.test.js), [`tests/tills.test.js`](../tests/tills.test.js) and [`tests/session-clock.test.js`](../tests/session-clock.test.js) open files in `src/` and search them, rather than calling them. It is how you check a rule that holds across every module — *every* save section has a validator, *every* shop agrees about prices — without trusting each module to remember on its own.

**Long dense lines in `main.js` are deliberate.** One concern per line. Do not reformat around an edit.

**Line endings are stored byte for byte.** [`.gitattributes`](../.gitattributes) sets `* -text`. `src/main.js`, `index.html` and `src/campaign.js` are CRLF; nearly everything else is LF. Preserve whatever a file already uses.

### Where the written notes have drifted from the code

Prose goes stale faster than code. Three places to be careful, at `1dfa80d`:

- [`README.md`](../README.md) says birding is taught by *"Ansel in Tidehaven"*. In the code it is Lakota ([`src/birding.js`](../src/birding.js)). The character was renamed and the README was not.
- [`CLAUDE.md`](../CLAUDE.md) says `tests/module-loader.js` *"rewrites `three` and relative specifiers into `data:` URLs"*. It no longer does; it uses `registerHooks` ([`tests/module-loader.js`](../tests/module-loader.js#L10)), and the comment in that file explains why the old way was abandoned — it copied shared modules once per import path and the world took minutes to load.
- [`CLAUDE.md`](../CLAUDE.md) says one authored hex is 56 m. Both numbers are true of different things and the sentence does not say which: the content was *authored* at 56 m and the playable world *uses* 100 m. [`src/world-scale.js`](../src/world-scale.js) is the authority.

When a document and the code disagree, the code is what runs.

---

## 8. The index: every file in `src/`

All 198 files, alphabetically. The description is taken from the file's own header comment where it has a useful one, and written by hand where it does not. Line counts are from `1dfa80d`.

| File | What it is | Area | Lines |
| --- | --- | --- | ---: |
| [`src/acorn-quest.js`](../src/acorn-quest.js) | A small favor, separate from the road tutorial and its progression | Optional life | 39 |
| [`src/adventure.css`](../src/adventure.css) | The quest panel, lesson card and the quiet teaching at the edges of the screen | Style | 69 |
| [`src/aftermath-chapter.js`](../src/aftermath-chapter.js) | After the border battle: the four chapters the campaign can reach from it | The story | 286 |
| [`src/aftermath-sites.js`](../src/aftermath-sites.js) | Where the chapter after the border battle happens (`src/aftermath-chapter.js` names these sites and arenas; this module puts them on the ground) | The story | 54 |
| [`src/ambron-people.js`](../src/ambron-people.js) | The people of Ambron, and of the lake country round it | The regions | 420 |
| [`src/ambron.js`](../src/ambron.js) | Ambron: the walled city on the Lake Ela narrows, and the seat of the empire | The regions | 329 |
| [`src/amod-ogre.js`](../src/amod-ogre.js) | Mallec, who holds the Pueth road at the Amod pass stones | People and fighting | 250 |
| [`src/amod-people.js`](../src/amod-people.js) | The people of Ostel, and the two working on the road outside it | The regions | 175 |
| [`src/amod-scenery.js`](../src/amod-scenery.js) | Amod's scenery, in world metres. The one thing that has to be right is the terraces, and most of them are not here: `src/amod-terraces.js` puts the stair into the ground | The regions | 678 |
| [`src/amod-terraces.js`](../src/amod-terraces.js) | The shape of Amod's east end: the Tarvel's valley, the terrace steps that rib every slope above it, the channel that holds grade along the contour | The regions | 315 |
| [`src/amod-world.js`](../src/amod-world.js) | Amod: the terrace country west of Pueth, as places, roads and water | The regions | 287 |
| [`src/archaeology.js`](../src/archaeology.js) | Archaeology, taught by Lakota, Tidehaven's birder, who digs as well as he watches: old towns and older bones | Skills | 152 |
| [`src/attic-wines.js`](../src/attic-wines.js) | What Juan pours and sells at Tharganhom, the Wine Attic of Solis (src/wine-attic.js) | Carrying and paying | 43 |
| [`src/autopilot.js`](../src/autopilot.js) | Autoplay: the computer walks the main quest while the player watches | Testing and tools | 737 |
| [`src/autoplay-smoke.js`](../src/autoplay-smoke.js) | Rendered autoplay check: the computer plays the road from the boat to Iven's relay using only ordinary inputs, while the harness watches for teleports | Testing and tools | 145 |
| [`src/batman-model.js`](../src/batman-model.js) | Batman, as he actually is rather than as Katy draws him | People and fighting | 168 |
| [`src/batman.js`](../src/batman.js) | The blue trade: Batman's hunt, and the traveler's part in it | People with a story | 313 |
| [`src/beekeeper.js`](../src/beekeeper.js) | Troy, who keeps the bees at the Bee Fold in Drent's wood | People with a story | 109 |
| [`src/beggar.js`](../src/beggar.js) | Smiths, the beggar of Lumber Town | People with a story | 152 |
| [`src/bird-garden.js`](../src/bird-garden.js) | Lakota's garden on the eastern side of Tidehaven: a hook for the hummingbird feeder among red bee balm, a stone bird bath, and the bench where he keeps his notebook | The regions | 114 |
| [`src/birding.css`](../src/birding.css) | The observe prompt, the first-sighting card and the journal’s skills sheet | Style | 38 |
| [`src/birding.js`](../src/birding.js) | Birding, the first of the traveler's skills. Lakota, Tidehaven's bird-watcher, teaches it; every kind of bird the traveler observes for the first time is worth experience | Skills | 421 |
| [`src/bodies.js`](../src/bodies.js) | People and animals are solid to one another. The traveler bumps into a passer-by instead of walking through them; a villager on a lane steps round the traveler | People and fighting | 75 |
| [`src/border-chapter.js`](../src/border-chapter.js) | The envoy and the border battle: the fork of the main quest | The story | 323 |
| [`src/bosco-model.js`](../src/bosco-model.js) | Bosco (src/bosco.js), built small and round on purpose | People and fighting | 136 |
| [`src/bosco.js`](../src/bosco.js) | Bosco, who belongs to Brandy Frank and would say it the other way round | People with a story | 289 |
| [`src/botany.js`](../src/botany.js) | Botany, the catch-all skill for everything that grows, as mycology is the catch-all for mushrooms | Skills | 353 |
| [`src/brandy-boards.js`](../src/brandy-boards.js) | Brandy Frank's painted boards (src/brandy.js): the animals the way they ought to be, and the houses the way they ought to be, in every colour she makes | People with a story | 212 |
| [`src/brandy-yard.js`](../src/brandy-yard.js) | Brandy Frank's dye yard (src/brandy.js), on the lane up to Saltwind Lookout: three dye vats of colours Drent has no business having | The regions | 94 |
| [`src/brandy.js`](../src/brandy.js) | Brandy Frank, Tidehaven's dyer, in her own words: "charismatic, and yet the way I normally am, which is a little bit like Eeyore"; ordinary looking and somehow not | People with a story | 157 |
| [`src/build-status.js`](../src/build-status.js) | How far each region of Azhora has actually been built, for the developer's chart | Testing and tools | 74 |
| [`src/bystanders.js`](../src/bystanders.js) | When a fight breaks out beside people who live there, they do not stand about | People and fighting | 116 |
| [`src/campaign-world.js`](../src/campaign-world.js) | The campaign atlas: what each authored Azhora region means for play | The story | 333 |
| [`src/campaign.js`](../src/campaign.js) | The civil-war campaign: the branching main quest across Azhora's regions | The story | 411 |
| [`src/campcraft.css`](../src/campcraft.css) | The fishing panel, the fire and cooking menus, and the testing button on the opening screen | Style | 18 |
| [`src/campcraft.js`](../src/campcraft.js) | Fires, the tinderbox, cooking at a lit fire, and the rod, float and bite of fishing | Carrying and paying | 141 |
| [`src/chameleon-model.js`](../src/chameleon-model.js) | Ed, the wine chameleon of Solis, as a figure: a big chameleon, tall and thin the way they are, with a helmet crest, a spined back | People and fighting | 197 |
| [`src/characters.js`](../src/characters.js) | Every body in the world, built out of boxes and cylinders in code: the traveler, each NPC role and its clothing, goblins, wolves, dogs, cats, horses, ogres and trolls | People and fighting | 3406 |
| [`src/closed-border.js`](../src/closed-border.js) | Closed regions: ground the traveler may not enter yet | Places and factions | 49 |
| [`src/collider-grid.js`](../src/collider-grid.js) | A grid over the world's colliders, so a step asks a handful of shapes whether it is blocked instead of all nine thousand | The world | 56 |
| [`src/combat-view.js`](../src/combat-view.js) | The bodies a fight puts on the ground: goblins, wolves, soldiers and ogres, drawn, animated and recycled as `combat.js` starts and ends encounters | People and fighting | 158 |
| [`src/combat.js`](../src/combat.js) | The whole of fighting as pure rules: swings and their three-hit combo, dodges, stamina, the enemy tell, encounters and who is still standing | People and fighting | 758 |
| [`src/construction.js`](../src/construction.js) | Construction, the RuneScape way: logs are sawn into planks, planks and a hammer and saw make things, every plank used is experience | Skills | 208 |
| [`src/consumables.js`](../src/consumables.js) | Food changes health only; it does not reset combat or grant protection | Carrying and paying | 105 |
| [`src/cooking.js`](../src/cooking.js) | Cooking: what the traveler can make at a lit fire | Skills | 113 |
| [`src/developer-atlas.js`](../src/developer-atlas.js) | Developer destinations on the authored atlas | Testing and tools | 178 |
| [`src/developer-mode.css`](../src/developer-mode.css) | The ghost-view overlay: its panels, buttons and the rule that hides the rest of the game | Style | 39 |
| [`src/developer-mode.js`](../src/developer-mode.js) | A separate spectator scene/controller. It has no quest, inventory, or save APIs | Testing and tools | 98 |
| [`src/developer-smoke.js`](../src/developer-smoke.js) | Isolated renderer exercise: UI entry, real keyboard flight and atlas clicks | Testing and tools | 175 |
| [`src/drent-birds.js`](../src/drent-birds.js) | The birds about Tidehaven that the traveler can learn to see: a pair of cardinals on the western fences, a wren on the barrels east of the square | Skills | 762 |
| [`src/drent-flora.js`](../src/drent-flora.js) | The plants of Drent: what Nell Harrow teaches the traveler to find (`src/botany.js`) | Skills | 445 |
| [`src/drent-stones.js`](../src/drent-stones.js) | The stones of Drent: what Silas Garrow teaches the traveler to read (`src/geology.js`) | Skills | 174 |
| [`src/drent-trees.js`](../src/drent-trees.js) | The trees of Drent that botany teaches the traveler to name (`src/botany.js`, the `tree` kinds) | Skills | 177 |
| [`src/east-suval-world.js`](../src/east-suval-world.js) | The scenery of East Suval: the Elodi city of Elod, the places along its coast and its dry valleys, and the region's own scatter | The regions | 713 |
| [`src/east-suval.js`](../src/east-suval.js) | East Suval, the stone country behind Elod's shut gate, and the city of Elod | The regions | 449 |
| [`src/economy.js`](../src/economy.js) | Money. For now the game runs on Ambroni copper pieces alone; the rest of the design (silver and gold at ten to one | Carrying and paying | 74 |
| [`src/elagos-scenery.js`](../src/elagos-scenery.js) | The scenery of Elagos: the lakes, Ambron on the narrows, and the lake country | The regions | 925 |
| [`src/elagos-world.js`](../src/elagos-world.js) | Elagos, the Lake Lands, as water, roads and places | The regions | 452 |
| [`src/elod-people.js`](../src/elod-people.js) | The people of Elod, and of East Suval outside it | The regions | 279 |
| [`src/ferry.js`](../src/ferry.js) | The crossing to Peblos: Corran Sell's boat, the fee, and the short scene | People with a story | 251 |
| [`src/fishing-skill.js`](../src/fishing-skill.js) | Fishing, the traveler's second skill. The rod, the float and the bite are campcraft's (`src/campcraft.js`); this is what comes up on the line | Skills | 160 |
| [`src/forest-ecology.js`](../src/forest-ecology.js) | The wood as a living thing: instanced understory plants, mossy logs, deer that graze and flee, foraging thrushes, butterflies, bees and dragonflies | Optional life | 476 |
| [`src/forest-hideout-smoke.js`](../src/forest-hideout-smoke.js) | The Bramble Scout Camp, played through the real game: keyboard, conversation buttons, combat and the save slot | Testing and tools | 295 |
| [`src/forest-hideout-watch.js`](../src/forest-hideout-watch.js) | The camp can be scouted before its optional fight is accepted | Optional life | 26 |
| [`src/forest-hideout-world.js`](../src/forest-hideout-world.js) | Small, authored scenery only. Quest decisions and both goblins belong to gameplay | Optional life | 209 |
| [`src/forest-hideout.js`](../src/forest-hideout.js) | The optional Bramble Scout Camp: scouting it, the two-scout fight, the stolen supplies and Tamsin’s one-time reward | Optional life | 282 |
| [`src/forest-places.js`](../src/forest-places.js) | The six woodland places off the Greenway, their paths, and the rule that reserves ground before hiding the scatter already on it | Optional life | 329 |
| [`src/forest-smoke.js`](../src/forest-smoke.js) | Browser-only checks use real keyboard dispatch and the visible conversation buttons | Testing and tools | 252 |
| [`src/forest-story.js`](../src/forest-story.js) | Optional, local woodland lives. These never advance or replace the main journey | Optional life | 258 |
| [`src/fortification.js`](../src/fortification.js) | The fortification standard, shared by both sides of the war | Places and factions | 246 |
| [`src/fortworks.js`](../src/fortworks.js) | Draws a fortification circuit (`src/fortification.js`) in one of two materials of equal strength: the army's squared timber palisade on an earth rampart, or dressed stone | Places and factions | 171 |
| [`src/frontier-works.js`](../src/frontier-works.js) | Draws Elod's closed frontier: the grey stone wall with its shut gatehouse, the guard house, stable, watch platform and signal beacon behind it | Places and factions | 107 |
| [`src/frontier.js`](../src/frontier.js) | Elod's closed frontier with Luscia. Elod has shut its whole country to stay out of the war, and this border, the one the armies of the Lauvel valley can reach | Places and factions | 157 |
| [`src/game-state.js`](../src/game-state.js) | The smallest rules and the most used: movement input, `canStand` and `moveCharacter` collision, and the eleven tutorial steps | The world | 62 |
| [`src/geology.js`](../src/geology.js) | Geology, the traveler's fifth skill. Silas Garrow digs marl out of the bank under the Weatherhead and has picked up every stone on this coast at least once | Skills | 203 |
| [`src/ghost-camera.js`](../src/ghost-camera.js) | Developer-only free flight. This controller has no world, DOM, collider, character, or checkpoint references; the caller explicitly applies its pose | Testing and tools | 116 |
| [`src/hawk-flight.js`](../src/hawk-flight.js) | Lakota's red-tailed hawk. She rides his gauntlet, and every so often she goes up: a few hard wingbeats off the fist, then wide slow circles over the green | People with a story | 83 |
| [`src/homestead-world.js`](../src/homestead-world.js) | The traveler's house on the plot beside the Koopwood, and the birdhouse posts in the Greenway (src/construction.js) | The regions | 172 |
| [`src/inventory.css`](../src/inventory.css) | The satchel drawer: slots, item tooltips, equipment and food | Style | 53 |
| [`src/inventory.js`](../src/inventory.js) | The small, physical things carried through the first journey out of Drent | Carrying and paying | 889 |
| [`src/izol-host.js`](../src/izol-host.js) | West Izol in the running game: the one place `src/main.js` hands Izolveth its people, their conversations and their frame | The regions | 54 |
| [`src/izol-people.js`](../src/izol-people.js) | The people of Izolveth, of Ardveth and of the Coalition's camp above the town | The regions | 260 |
| [`src/izol-scenery.js`](../src/izol-scenery.js) | West Izol's scenery: Izolveth and its harbour, the Coalition's camp on the pasture above it, Ardveth down the coast, the boatyard at Kelvath Cove | The regions | 971 |
| [`src/izol-world.js`](../src/izol-world.js) | West Izol, and Izolveth, as places | The regions | 540 |
| [`src/jimson-quest.js`](../src/jimson-quest.js) | Toft's errand: the silliest thing anyone in Drent will ask the traveler to do | Optional life | 167 |
| [`src/journey-content.js`](../src/journey-content.js) | These are local districts and people invented for the playable road out of Drent into Luscia | The story | 128 |
| [`src/journey.css`](../src/journey.css) | The location header and the journal’s journey list | Style | 31 |
| [`src/journey.js`](../src/journey.js) | Local Drent-to-Luscia errands beyond the first shore | The story | 170 |
| [`src/katy.js`](../src/katy.js) | Katy, at Vaervelm Caelazh. The traveler finds her by the spring pool below the cabin with a brass spyglass up to her eye, watching the birds | People with a story | 133 |
| [`src/lakota-hawk.js`](../src/lakota-hawk.js) | The red-tailed hawk that rides Lakota's glove (her flight: src/hawk-flight.js) | People with a story | 72 |
| [`src/lakota-knows.js`](../src/lakota-knows.js) | What Lakota knows of the world, for his free talk (src/lakota-mind.js) | People with a story | 46 |
| [`src/lakota-mind.js`](../src/lakota-mind.js) | Lakota, thinking for himself: the pure half of the free-talk pilot (docs/lakota-ai-pilot.md) | People with a story | 253 |
| [`src/lauvel-aftermath.js`](../src/lauvel-aftermath.js) | The field at the Lauvel, ten days after the battle (src/luscia-chapter.js): the dead are still coming in | People with a story | 115 |
| [`src/lauvel-burying.js`](../src/lauvel-burying.js) | The burying at the Lauvel: helping the valley bury its dead, and what that turns up | People with a story | 312 |
| [`src/lauvel-field-world.js`](../src/lauvel-field-world.js) | The field at the Lauvel ten days on (src/lauvel-aftermath.js), as scenery: the fallen where they fell, drawn plainly and without gore (a man's shape in the grass | The regions | 120 |
| [`src/lauvel-people-models.js`](../src/lauvel-people-models.js) | The people burying the dead at the Lauvel (src/lauvel-aftermath.js): the gravedigger with his spade, who digs whenever he is standing still | People and fighting | 44 |
| [`src/legion-posts.js`](../src/legion-posts.js) | The Ambroni army's posts along the road: the soldiers a hired sword sees all the way from Tidehaven's landing to the muster on the Moros Plain | Places and factions | 69 |
| [`src/lighthouse-world.js`](../src/lighthouse-world.js) | The Suval Light on its head on the West Suval coast, south of the winery lane (src/lighthouse.js): a round stone tower tapering to a corbelled gallery and a glazed | The regions | 200 |
| [`src/lighthouse.js`](../src/lighthouse.js) | The Suval Light, and Addison, who keeps it. Where the Solis road runs south past the turning for the winery | People with a story | 220 |
| [`src/local-map-data.js`](../src/local-map-data.js) | Builds the local trail map’s model from world state: which places are known, the roads and paths near them, and the bounds to draw | The charts | 179 |
| [`src/local-map-smoke.js`](../src/local-map-smoke.js) | Real UI checks: chart browsing must never become travel or a quest shortcut | The charts | 185 |
| [`src/luscia-chapter.js`](../src/luscia-chapter.js) | The Luscia chapter: the field at the Lauvel. The campaign's second chapter (`luscia-aftermath`) made playable | The story | 277 |
| [`src/luscia-town.js`](../src/luscia-town.js) | Lumber Town: the people of Luscia's market town | The regions | 137 |
| [`src/main.js`](../src/main.js) | The host: builds the world, places every person, runs the render loop, owns the HUD, the dialogue panel, the keys, the saves and the test harness | The host | 3602 |
| [`src/map-fog.js`](../src/map-fog.js) | What the traveler has charted. The world chart starts blank: a hex of the authored atlas is uncovered only when the traveler has walked into it | The charts | 178 |
| [`src/map-tutorial.js`](../src/map-tutorial.js) | The lay-of-the-land tutorial: shown once, on first entering a region beyond Drent, it prompts the traveler to open the continental chart and then the local trail map | The story | 56 |
| [`src/mercenaries.js`](../src/mercenaries.js) | The mercenary company: eleven hired swords, the traveler among them, called from abroad by the Ambroni Empire and mustering at the army's camp on the Moros Plain | Places and factions | 279 |
| [`src/minimap.js`](../src/minimap.js) | The corner chart: the same north-up projection as the trail map, drawn small onto a canvas each frame | The charts | 287 |
| [`src/moros-chapter.js`](../src/moros-chapter.js) | The army on the plain: the third chapter of the main quest | The story | 151 |
| [`src/moros-works.js`](../src/moros-works.js) | The Moros Plain's built places: the Ambroni outpost (the army's timber fort), the forward stockade on the border | Places and factions | 377 |
| [`src/mushrooms.js`](../src/mushrooms.js) | The mushrooms of Drent's woods: what Odger Pell teaches the traveler to find (`src/mycology.js`) | Skills | 235 |
| [`src/mycology.js`](../src/mycology.js) | Mycology, the traveler's third skill. Odger Pell keeps a drying rack at the edge of the Greenway outside Tidehaven and will teach anyone who stops: what grows on a stump | Skills | 199 |
| [`src/occupation.js`](../src/occupation.js) | Who stands where once places change hands. The campaign keeps the political map (`campaign.mapControl()`: region -> 'empire' / 'coalition' / ...) | The story | 51 |
| [`src/opening-fights.js`](../src/opening-fights.js) | The two raids of the opening, in world metres: the goblins on the Greenway beside Tidehaven, and the raiders at the tumbled cart in the Avrel clearing | People and fighting | 24 |
| [`src/ostler.js`](../src/ostler.js) | The ostler of Lumber Town. Iven pays for the Lauvel with a token for an army horse; this is the man who turns the token into the horse | Riding | 60 |
| [`src/outpost.js`](../src/outpost.js) | The Ambroni outpost on the Moros Plain: the army's timber fort at the exact centre of the plain, built to the shared fortification standard | Places and factions | 141 |
| [`src/peblos-people.js`](../src/peblos-people.js) | The people of Cobble, the fishing village in the Pebbles, and the Empire's small garrison there | The regions | 100 |
| [`src/peblos-scenery.js`](../src/peblos-scenery.js) | Peblos's scenery, in world metres: the quay and village of Cobble, the Empire's tally shed, the headland light, the seal cove and the drowned field | The regions | 562 |
| [`src/peblos-world.js`](../src/peblos-world.js) | Peblos: the islands south-east of Drent, as islands, places and stands | The regions | 248 |
| [`src/pipeweed.js`](../src/pipeweed.js) | The Weatherhead, and the pipe. Drent grows tobacco — half its good ground is under it (`src/botany.js`) — and what the barns cure is cut for the pipe | Optional life | 119 |
| [`src/place-works.js`](../src/place-works.js) | Draws the built-up places of Drent and Luscia (`places.js`) and the Drent wayside (`wayside.js`) | Places and factions | 562 |
| [`src/places.js`](../src/places.js) | The built-up places of Drent and Luscia: what the towns-and-signs pass adds round each place's existing people, sites and colliders | Places and factions | 163 |
| [`src/pueth-people.js`](../src/pueth-people.js) | The people of Rimeholt, Pueth's timber town on the Feradom road | The regions | 64 |
| [`src/pueth-scenery.js`](../src/pueth-scenery.js) | Pueth's scenery, in world metres: its two rivers, the Tessen bridge, the army's road post, Rimeholt, the landmarks of the hills, the east and the coast | The regions | 452 |
| [`src/pueth-world.js`](../src/pueth-world.js) | Pueth: the region north of Drent, as places, roads and water | The regions | 333 |
| [`src/refugees.js`](../src/refugees.js) | Three people walking away from the battle. The field at the Lauvel is the end of Chapter 1, and its aftermath is the first thing in this war the traveler sees with their | The story | 239 |
| [`src/region-layout.js`](../src/region-layout.js) | Region layout: how the authored atlas becomes playable ground | The world | 356 |
| [`src/region-rivers.js`](../src/region-rivers.js) | GENERATED by scripts/build-region-rivers.mjs from the World Builder map's river edges | The world | 73 |
| [`src/region-survey.js`](../src/region-survey.js) | GENERATED by scripts/build-region-survey.mjs from assets/azhora-dev-regions.json | The world | 187 |
| [`src/region-world.js`](../src/region-world.js) | The playable world, derived from the atlas. `region-layout.js` is pure geometry over the survey; this module turns that geometry into the actual places the game needs: | The world | 682 |
| [`src/regional-life-smoke.js`](../src/regional-life-smoke.js) | Actual F prompts and visible dialogue choices, followed by a fresh-renderer checkpoint test | Testing and tools | 154 |
| [`src/regional-life.js`](../src/regional-life.js) | Optional local lives along the road. This module never advances the main journey | Optional life | 341 |
| [`src/regional-places.js`](../src/regional-places.js) | The three working places along the road — the Avrel mill, the reedcutters’ landing, the roofless waystation — and where their people and tasks stand | Optional life | 359 |
| [`src/regions.js`](../src/regions.js) | The four playable regions and the places along their road | The world | 21 |
| [`src/rena-digs.js`](../src/rena-digs.js) | Lakota's pegs at the ruins of Rena (the finds themselves: src/archaeology.js) | Places and factions | 46 |
| [`src/rena-letters.js`](../src/rena-letters.js) | The Ardrys' letters: the one errand the ruins of Rena leave behind | Places and factions | 253 |
| [`src/rena-people.js`](../src/rena-people.js) | The people this pass adds to Drent: the two Ardrys who remember Rena, the five villagers of Applegarth, two more in Tidehaven and one on the Greenway | Places and factions | 199 |
| [`src/rena-works.js`](../src/rena-works.js) | Draws the ruins of Rena, the village of Applegarth, the three small places on the Avrel road and the East Rena stone (`src/rena.js`) | Places and factions | 417 |
| [`src/rena.js`](../src/rena.js) | The three Renas: the razed town at the centre of Drent, the village west of it, and the old road that still joins them | Places and factions | 292 |
| [`src/riding.js`](../src/riding.js) | Riding. The army pays the traveler for the Lauvel with a horse, handed over by the ostler in Lumber Town, and the long roads beyond are meant to be ridden | Riding | 197 |
| [`src/rival-light.js`](../src/rival-light.js) | The Elod Light, the woman who keeps it, and the thing Addison wants taken off her | People with a story | 297 |
| [`src/road-audio.js`](../src/road-audio.js) | All the game’s sound, synthesized: the sea, the river, the camp, the bell, and every effect from a swing to a discovery | Sound | 156 |
| [`src/road-check-smoke.js`](../src/road-check-smoke.js) | Focused renderer regressions; prepare supplies an isolated normal-road fixture | Testing and tools | 169 |
| [`src/road-checkpoint.js`](../src/road-checkpoint.js) | Stable adventure checkpoints. Legacy onward-only saves remain supported | Saves | 280 |
| [`src/road-life.js`](../src/road-life.js) | The animals and small life along the rebuilt road, instanced by flock with an authored range each | Optional life | 253 |
| [`src/road-smoke.js`](../src/road-smoke.js) | Browser smoke coverage for the actual F prompts, dialogue buttons and combat | Testing and tools | 336 |
| [`src/road-traversal.js`](../src/road-traversal.js) | The road walked with the real keyboard: holds movement keys through the whole route and back, exercising camera-relative movement and collision | Testing and tools | 212 |
| [`src/road-verges.js`](../src/road-verges.js) | Small static verge patches; no colliders, interaction targets, or world RNG changes | Optional life | 121 |
| [`src/rock-troll.js`](../src/rock-troll.js) | Rock trolls: what is known, and where they will be when there is anywhere to put them | People and fighting | 48 |
| [`src/salt-ship.js`](../src/salt-ship.js) | John, the Sultan of the Salt Trade (src/salt-sultan.js), and his ship the Sultana | People with a story | 211 |
| [`src/salt-sultan.js`](../src/salt-sultan.js) | John, the Sultan of the Salt Trade. Not a real sultan: there is no such office, he asked, so he took it | People with a story | 253 |
| [`src/scenery-builder.js`](../src/scenery-builder.js) | A merged, vertex-coloured scenery builder for the hand-built places | The world | 153 |
| [`src/signs.js`](../src/signs.js) | One sign language for the whole road. Every sign is weathered timber in the village's own carpentry: square posts in the dark post wood | Places and factions | 281 |
| [`src/skills.js`](../src/skills.js) | The traveler's skills: things learned from people along the road that grow with practice | Skills | 186 |
| [`src/solis-sack.js`](../src/solis-sack.js) | The sack of Solis, three years on (docs/the-war-and-the-house-of-ambron.md): in 977 Prince Wilhelm stormed the city, burned it | The regions | 102 |
| [`src/solis-town.js`](../src/solis-town.js) | The people of Solis and the Coalition's camp outside it: both garrisons, the contingents' captains, and the townsfolk | The regions | 172 |
| [`src/story-chapters.js`](../src/story-chapters.js) | The main quest as the player reads it: numbered chapters with a goal apiece | The story | 121 |
| [`src/story-starts.js`](../src/story-starts.js) | Somewhere to begin besides the beginning. The main quest is built in order, so the newest stretch of it is always the least played: this table says where that stretch | The story | 45 |
| [`src/style.css`](../src/style.css) | The base sheet: page, canvas, typography, the location header, the compass, vitals, toasts and the region card | Style | 4 |
| [`src/survey-world.js`](../src/survey-world.js) | An honest, plainly-coloured survey of the authored hex terrain for the developer view; never presented as finished game content | The world | 34 |
| [`src/talking-tree-view.js`](../src/talking-tree-view.js) | The Old Tree, drawn (`src/talking-tree.js` is what it does) | Optional life | 82 |
| [`src/talking-tree.js`](../src/talking-tree.js) | The old tree in Drent's wood. Nobody in Tidehaven talks about it, because nobody in Tidehaven is sure | Optional life | 124 |
| [`src/thalmagar-world.js`](../src/thalmagar-world.js) | An isolated art study for developer flight; this does not unlock the cape | Testing and tools | 350 |
| [`src/town-life.js`](../src/town-life.js) | The people of the built-up places: townsfolk and workers in Drent and Luscia, the army's garrison of its outpost on the Moros (and the Coalition's, if it falls) | Places and factions | 189 |
| [`src/trail-map.css`](../src/trail-map.css) | The local trail sheet inside the journal: parchment, ink, markers and its wider layout | Style | 91 |
| [`src/trail-map.js`](../src/trail-map.js) | The local trail sheet in the journal: an equal-distance, north-up projection of the ground near the traveler, drawn as markup | The charts | 290 |
| [`src/troupe-models.js`](../src/troupe-models.js) | Talaelos, the players of Nylon (src/troupe.js), as figures | People and fighting | 228 |
| [`src/troupe.js`](../src/troupe.js) | Talaelos ("fiery speech"), the players of Nylon: a company of Elizabethan players who travel the country in a painted pageant wagon and play nothing but improvisation | People with a story | 385 |
| [`src/village-cat.js`](../src/village-cat.js) | Tidehaven's cat: a harbour tabby who belongs to nobody and is fed by everyone | People with a story | 303 |
| [`src/village-dog.js`](../src/village-dog.js) | Tidehaven's dog: a friendly stray that sniffs about the green, comes to see who has arrived, and will usually eat whatever food it is offered | People with a story | 85 |
| [`src/vineyard.js`](../src/vineyard.js) | Imani, who keeps the vines at Vaervelm Caelazh, and keeps something else as well | People with a story | 298 |
| [`src/wayside.js`](../src/wayside.js) | Wayside life on the empty stretches of road. The scaled world left the first 250 m of forest road beyond Tidehaven and the 270 m of plain between the Moros gate and the | Optional life | 68 |
| [`src/weapons.js`](../src/weapons.js) | What is equipped, how landed hits wear it, what a repair bench restores, and what a broken sword means | People and fighting | 165 |
| [`src/west-ground.js`](../src/west-ground.js) | The shape of the four western regions: the water cut into them, the standing water they hold, and the landforms their lore describes | The regions | 354 |
| [`src/west-regions-life.js`](../src/west-regions-life.js) | The animals of the four western regions. Built on the same plan as `road-life.js`: every kind's parts are merged once into vertex-coloured geometry and then instanced | The regions | 569 |
| [`src/west-regions-scenery.js`](../src/west-regions-scenery.js) | What the four western regions look like where the ground alone is not enough: the water on top of the channels `west-ground.js` cut for it | The regions | 688 |
| [`src/west-regions.js`](../src/west-regions.js) | The four western regions of the playable world — Vastos, Meneth, Caricas and Nesdor — as water, landform parameters and named natural ground | The regions | 564 |
| [`src/west-suval-host.js`](../src/west-suval-host.js) | West Suval in the running game: the one place `src/main.js` hands Solis its people, its conversations and its frame | The regions | 84 |
| [`src/west-suval-world.js`](../src/west-suval-world.js) | The scenery of West Suval: Solis and its walls, the Coalition's camp, and the country along the road from the border | The regions | 966 |
| [`src/west-suval.js`](../src/west-suval.js) | West Suval and Solis as places: the country along the road from the border, the city's walls, gates and streets, the Coalition's camp outside them | The regions | 442 |
| [`src/wine-attic-world.js`](../src/wine-attic-world.js) | Tharganhom as a building (src/wine-attic.js has the plan): a whitewashed stone ground floor on Solis's main street | Skills | 193 |
| [`src/wine-attic.js`](../src/wine-attic.js) | Tharganhom, the Wine Attic of Solis: a wine shop up an outside stair, in the attic of an old house on the main street of the upper town | Skills | 384 |
| [`src/wine-chameleon.js`](../src/wine-chameleon.js) | Ed, the wine chameleon of Solis: clever, magic, permanently drunk, never without his sunglasses, and never without his pipe | Skills | 271 |
| [`src/wine.js`](../src/wine.js) | Wine, the traveler's skill of looking, smelling and tasting properly | Skills | 304 |
| [`src/winery-world.js`](../src/winery-world.js) | Paradise Springs as scenery (the tables are src/winery.js): the log cabin, the hall, the terrace, the barrels, the spring, the rows and the lane | Skills | 206 |
| [`src/winery.js`](../src/winery.js) | Vaervelm Caelazh, the winery in the north-east of West Suval where Lakota worked before he came to Tidehaven | Skills | 106 |
| [`src/woodcutter-model.js`](../src/woodcutter-model.js) | Bowden Koop, King of the Koopwood (src/woodcutting.js), as a figure: the game's own man, made huge, dressed as near to a certain spiky turtle king as a woodcutter in | People and fighting | 82 |
| [`src/woodcutting.js`](../src/woodcutting.js) | Woodcutting, done the RuneScape way, in Drent's own trees: every tree has the level it wants from you (pine at 1, oak at 15, willow at 30, red maple at 45 | Skills | 302 |
| [`src/woodland-life.js`](../src/woodland-life.js) | Squirrels with a memory of their own tree, individually owned acorn sites, forage and fallen branches — scenery, never a combat target | Optional life | 519 |
| [`src/woodland-progress.js`](../src/woodland-progress.js) | Stable village progress accompanies both first-shore and onward checkpoints | Saves | 35 |
| [`src/woodland.css`](../src/woodland.css) | The dialogue panel and its reply buttons, plus the woodland journal sections | Style | 34 |
| [`src/woodlot-world.js`](../src/woodlot-world.js) | The Koopwood (src/woodcutting.js): Bowden Koop's woodlot on the edge of the wood north-west of Tidehaven | The regions | 255 |
| [`src/world-map.css`](../src/world-map.css) | The atlas tab: viewport, toolbar, zoom, legend and the "you are here" marker | Style | 40 |
| [`src/world-map.js`](../src/world-map.js) | A read-only parchment chart exported from World Builder's authored Azhora hex map | The world | 258 |
| [`src/world-regions.js`](../src/world-regions.js) | Draws each region’s own scenery and scatter onto the terrain: what makes Drent look like Drent and the Moros like the Moros | The world | 710 |
| [`src/world-scale.js`](../src/world-scale.js) | World scale: authored metres to world metres | The world | 197 |
| [`src/world-terrain.js`](../src/world-terrain.js) | The ground of the rebuilt world: where land ends, how high it stands, and what colour it is | The world | 267 |
| [`src/world.js`](../src/world.js) | The playable world of Drent, Luscia, the Moros Plain and East Suval | The world | 1888 |

---

## 9. Glossary

Words the project uses in its own particular way.

**The road.** The playable main route: Tidehaven → the Greenway → Fernway Rest → the Caloss Gate → across the Caloss into Luscia → Lumber Town → the Moros Plain → Solis. `world.paths[0]` is the main road and the autopilot follows it, so it must stay first in that list.

**The chart.** The continental atlas, opened with `M`. Blank at the start and uncovered as you walk. Not to be confused with the *local trail map* (`L`) or the *minimap* in the corner.

**A hex.** One cell of the authored World Builder atlas. 100 metres across in the playable world; the content was authored when it was 56.

**A region.** One of the named provinces of Azhora — Drent, Luscia, the Moros Plain, East Suval, West Suval, Pueth, Peblos, Elagos, Amod, West Izol, and the four western ones. Region ids are stable numbers: 1 Drent, 2 Luscia, 3 Moros Plain, 4 East Suval, and on.

**A subregion.** A small named area inside a region — the Greenway, Willowmere, the Caloss Bank — with a point and a reach. Reaching one for the first time writes it into the journal. They live in [`src/map-fog.js`](../src/map-fog.js).

**A cluster.** A place that keeps its own internal distances when the world is scaled. A village's houses stay the same distance apart while the distance to the next village grows. [`src/world-scale.js`](../src/world-scale.js).

**A stand.** Where a particular person stands. Also, in the flora modules, a group of plants authored in one place rather than scattered.

**A site.** A fixed point you can do something at: a gathering spot, a fishing ledge, a repair bench, a shrine.

**A clearing.** Ground reserved so the scatter — trees, bushes, rocks — is kept off it. Every built place claims a clearing before anything is drawn, which is why a house is never inside a tree.

**A collider.** A shape the world says you cannot walk into. `canStand` tests against them.

**A checkpoint.** A save. One slot, validated section by section before it is applied. [`src/road-checkpoint.js`](../src/road-checkpoint.js).

**A snapshot.** What one module's state looks like as plain data, ready to be written into a checkpoint.

**The company.** The eleven hired swords, the traveler among them, called from overseas and mustering on the Moros. [`src/mercenaries.js`](../src/mercenaries.js).

**A review view.** A named camera position the game can be asked to take, so a thing can be photographed the same way twice. [`main.cjs`](../main.cjs) `--review-views=`.

**A smoke test.** A test that opens the real game window and drives it with real keys. Slower and costlier than an ordinary test; lives in `src/*-smoke.js`.

**A toast.** The small notice that slides in at the corner of the screen.

**Pure.** A module that touches no screen, no keyboard and no three.js. Testable in milliseconds.

**The host.** [`src/main.js`](../src/main.js). The one file that owns the screen.

---

## 10. What is being built this week

Everything above describes the tree at `1dfa80d`. Several things are in flight on other branches and are **not in this tree yet** — if you go looking for their files here you will not find them:

- Skills moving onto the 99-level grid, and a cartography skill with a dark chart to go with it.
- A linguist skill, with the languages of Azhora behind it.
- Playable characters: choosing who you are, rather than always being the same traveler.
- A bird pointer, and an arrival cutscene.
- Lakota becoming a mercenary, with Perrin taking over the bird garden; Puck and Ed splitting into two.

When those land they will follow the shapes in this map: a pure module with a `create…`, a `snapshot`, a validator, and a test beside it. The map will need a new row in the index and little else.
