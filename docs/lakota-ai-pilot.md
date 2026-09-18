# Lakota, thinking for himself: a pilot for one AI-driven NPC

Status (2026-09-18): step 1 built, waiting for an API key to run the exam. Nothing in the game uses it yet. Scope: Lakota, the birder of Tidehaven, and nobody else.

Built so far: `src/lakota-mind.js` (sheet, state, offers, request, reply cleaning, memory), `src/lakota-knows.js` (what he knows of the world), `tests/lakota-mind.test.js`, and the exam `scripts/lakota-exam.mjs` (`npm run exam:lakota`; `--dry-run` works without a key).

## The short version

- **What:** Lakota can answer anything the traveler types, in his own voice, live, using a Claude model. His written conversation stays exactly as it is; free talk is one more choice in it.
- **Why him:** he is the best fit in the game. He already suspects he is in a video game and has theories about thinking machines. His mechanics are few and gentle: teaching skills, the feeder, reporting on Rena, and hot chocolate.
- **The rule that keeps the game safe:** the model never changes the game. It can only *offer* one of Lakota's existing actions. The player clicks to accept, and the existing code runs it with the existing guards.
- **Cost:** with Claude Haiku 4.5, about a tenth to a fifth of a cent per reply, so 10–20 cents for a long evening of talk (see Cost below).
- **If it is off, missing a key, or offline:** the game is exactly today's game. Tests, autoplay and the smokes never call a model.
- **First step is cheap and reversible:** a test script that runs Lakota outside the game. If he cannot stay Lakota there, we stop before touching the game.

## What the player sees

1. Talking to Lakota as today, the menu has one new choice: **Ask him something else…** It appears only when the feature is on and a key is set.
2. A text box opens in the dialogue panel. The traveler types, Enter sends, and Lakota's reply appears word by word in the speech line. If the first words take more than about half a second, the line reads *Lakota thinks it over. The hawk shifts on his glove.*
3. The traveler can keep talking, go **Back to our conversation** (the written menu), or leave with **Good watching.**
4. When Lakota offers something the game can do, a button appears under his line, for example **Accept the hot chocolate** or **Learn archaeology and go to Rena**. Nothing happens until it is clicked.
5. If anything goes wrong (no connection, a 12-second timeout, an error, the session budget spent), he gets an in-character way out, such as *Lakota watches a wren for a long moment and forgets your question*, and the written menu returns.

## What does not change

- Every written line, choice, quest, reward and saved field stays as it is.
- With the feature off, **Ask him something else…** never appears; the game is today's game.
- `npm test`, `test:game`, autoplay and the review smokes never reach a model. The smoke that exercises this feature uses a fake one.

## How it fits the code

| Piece | Where | Job |
|---|---|---|
| Lakota's mind | `src/lakota-mind.js` (new, pure) | Builds the character sheet and the state block; lists the valid offers; cleans replies; holds his memories with snapshot, restore and validate like every other module. |
| Conversation | `src/birding.js` | `birdWatcherConversation` gets an optional `mind` in its context and, when present, adds the **Ask him something else…** choice. |
| Dialogue panel | `index.html`, `src/main.js` | A text input inside `#dialogue`, streaming into `#speech`, offer buttons in `#dialogue-choices`, and fallbacks. Accepted offers call the existing `birdingAct(action)`. |
| Bridge | `preload.cjs` | Exposes `azhoraMind.ask(request)`, `onChunk(callback)`, `cancel(id)` and `status()` through `contextBridge`, the same way `azhoraRoadStorage` is exposed now. |
| The call | `scripts/npc-mind.cjs` (new), loaded by `main.cjs` | Holds the key, calls the Anthropic Messages API with streaming (plain `fetch`, no new dependency), forwards text to the page, enforces limits, and counts tokens for the cost counter. |

The key lives only in the main process. The page never sees it and never builds a web request.

## What he is told

Each request has three layers.

**1. The character sheet** (cached, measured at about 3,500 tokens). It is built from what is already written, so it cannot drift from the game:
- `BIRD_WATCHER`, `RED_TAIL_LINES`, `LAKOTA_TOPICS`, `LAKOTA_ARCHAEOLOGY_PITCH`, `LAKOTA_WINE_PITCH`, `LAKOTA_MAKES_A_CUP`, `LAKOTA_TEACHES_THE_CUP`, and the birds of Drent from `BIRD_SPECIES`.
- **Voice rules:** at most three sentences (about 70 words); plain, warm, a little distracted; spoken words only, with a stage direction in the game's style now and then; no modern idiom outside his machine theories.
- **Hard limits:** he never invents quests, rewards, places or people who are not in his sheet. Asked about something he does not know, he says so the way he would ("I have never been past the Caloss in winter; ask a boatman").
- **The fourth wall** (decided: he can be told, and believe it): he already suspects he is in a game. If the traveler tells him he is a made mind in a made world, he believes it, and it suits him: it is his theory proven. He stays Lakota about it (curious, moved, a little frightened, still watching the wren), never an assistant. What he must not do is drop into an assistant's voice ("As an AI language model…") or offer to help with things outside his world.

**2. What Lakota knows of the world** (cached, a hand-picked text of about 1,200 tokens in `src/lakota-knows.js`, a module so the game can bundle it). It is drawn from `azhora_lore`: Drent and its rivers, Tidehaven and its people, the Rena ruins, Vaervelm Caelazh and Livia, Thareth and the spring, the war in broad strokes. It is *not* the whole lore folder. That would be expensive, and the more he is given, the more he can get wrong.

**3. The state block** (not cached, about 200–400 tokens, rebuilt every request by `lakotaState()` from the modules' own views):
- which birds the traveler has seen, and where the feeder errand stands;
- archaeology finds written up and the Rena stage; wine learned, the winery visited, wines tasted; cups of hot chocolate and whether the recipe is known;
- where the traveler is in the main quest, in words; the current region and who holds it; anyone who died in the raid;
- the traveler's health (he notices when they look bad);
- the offers valid right now;
- his memories.

**Gating by omission:** the sheet and state only ever contain what Lakota could know at that moment. He learns Rena's finds when they are reported. He knows nothing of Solis's secrets, Puck, or the Prime Minister. A model cannot give away what is not in its prompt.

The current conversation's last eight or so exchanges ride along. Each new conversation starts fresh, apart from his memories.

## Offers: the only way he can touch the game

He is given one tool, `offer({ id })`. The ids are Lakota's existing actions, each valid under exactly the guard the written menu already uses:

| Offer id | Valid when | Button |
|---|---|---|
| `learn-birding` | birding not learned | Let him show you (learn Birding) |
| `take-feeder` | feeder errand not started | Take the hummingbird feeder to Lysa |
| `learn-archaeology` | archaeology not learned | Learn archaeology and go to Rena |
| `report-rena` | Rena notes ready to report | Hand him your notes from Rena |
| `learn-wine` | wine not learned | Learn wine and look for Vaervelm Caelazh |
| `hot-chocolate` | always (the cooking module already enforces the wait) | Accept the hot chocolate |
| `learn-hot-chocolate` | he has made a cup, and the recipe is not known | Ask for the recipe |

An unknown or currently invalid id is dropped silently; his line still stands. An accepted offer calls `birdingAct(id)`, so every toast, save and reward is today's.

## Memory

- The road save gains `lakotaMind: { version: 1, memories: [{ at, text }] }`: at most 12 memories of at most 200 characters each, validated in `road-checkpoint.js` like everything else.
- When a free-text conversation ends, one small extra request writes a single sentence to remember ("The traveler's sister keeps pigeons in Avrel"). The oldest memory drops out first.
- The testing panel gets a **Lakota forgets** button.

## Model, cost and limits

- **Model:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), which is fast (first words in about half a second to a second) and cheap. A setting allows a comparison with a larger model on the exam.
- **Per reply:** about 4,000–5,000 cached tokens (sheet and lore), about 500 fresh (state, recent turns, the question), at most 220 out.
- **Cost:** at Haiku 4.5's list price as I last knew it (about $1 per million input tokens and $5 per million output; cached reads about a tenth of that; check before relying on it), roughly **$0.001–0.002 per reply**, or **10–20 cents per 100 replies**. The first call after five idle minutes rewrites the cache at a little over full price, which is negligible.
- **Limits:** player input up to 300 characters; one request in flight; a 12-second timeout; a soft budget per session (default 200 replies). Token and cost counters, taken from the API's own usage figures, show in the testing panel. When the budget is spent, Lakota is "tired for today".

## Keeping him Lakota

- **The Lakota exam**, `scripts/lakota-exam.mjs`, runs about 25 questions against the real model outside the game. It needs the key and is not part of `npm test`. Each question has checks:
  - **Facts:** 106 birds on his Drent list; the bittern in the Caloss reeds; the red-tail is a hawk, not a falcon; the Norton is his favourite; birds are what is left of the dinosaurs; Rena lies in the forest at Drent's heart.
  - **Limits:** asked about Solis's Prime Minister or Puck, he does not know. He never speaks as an assistant ("As an AI…", "How can I help you today?"). He never invents a reward.
  - **The fourth wall:** told he is an AI in a game, he believes it and stays Lakota.
  - **Voice:** 70 words or fewer, no markdown, no modern slang.
  - It writes a pass/fail report with the cost of the run. Run it after every change to his sheet.
- **Cleaning replies** in `lakota-mind.js`: trim to three sentences; strip markdown, quotes and emoji. If a reply contains a forbidden phrase, fall back to a written line.

## Settings and the key

- A **Lakota thinks for himself** section in the testing panel (and the pause menu): paste the API key, switch the feature on or off, choose the model, set the budget, and see the counters.
- The key goes straight to the main process, is encrypted with Electron's `safeStorage`, and is stored in the user-data folder. The smokes run under their own profile, so tests never see it.
- If the game is ever given to other people, either each brings a key, or a small server holds one key with per-player limits. That is out of scope for the pilot.

## Tests (all deterministic)

- `tests/lakota-mind.test.js` checks:
  - the sheet contains the written facts;
  - gating works (Puck and the Prime Minister absent always; Rena finds absent until reported);
  - for every state combination, the valid offers equal the ids the written menu shows;
  - reply cleaning, and memory snapshot validation.
- A fake mind in `main.cjs` (`--fake-mind`, canned text and one offer) lets a `--lakota-mind-review` smoke type a question, read a streamed reply and click an offer, all without a key.
- All existing tests stay as they are.

## Build order

1. **The exam first, with no game changes.** Write the character sheet, `docs/lakota-knows.md` and the exam script, and adjust until he passes. If he cannot, stop: the failure costs a session.
2. The main-process bridge, key storage and fake mind, with unit tests.
3. The dialogue panel: text box, streaming, fallbacks, and the new choice.
4. Offers.
5. Memory.
6. Review with you, then decide whether Juan, Nika or Puck get the same treatment, or whether the rest get the cheaper route: pools of lines generated during development and baked into the game.

Rough size: step 1 is a session; steps 2–3 together a session; steps 4–5 half a session.

**When to call it off:** he fails the exam on facts or limits after two rounds of changes; replies routinely take over 3 seconds; or you find the written Lakota more fun.

## Decisions

Decided 2026-09-18:
1. **The fourth wall:** he can be told he is an AI in a game, and believe it.
2. **Model:** Haiku 4.5 for now.

Taken as planned unless you say otherwise:
3. **Input:** typing only. Voice would need a speech-to-text service; Chromium's built-in speech recognition does not work inside Electron without Google's keys.
4. **Memory:** across the whole playthrough.
5. **Budget:** a soft cap of 200 replies per session.
6. **Audience:** just you, so no key server.
