# Prompt for Claude Code: Chapter 1 redesign

Michael asked Codex to write a Chapter 1 redesign brief, leave it in this codebase, and send it to Claude for an implementation/design plan. This is that handoff.

**Correction, 21 September 2026, from Michael: the highway robber is MALE.** The brief was drafted with a woman on the road and has been corrected throughout; item 4 below reads as it now stands.

Read `docs/chapter-1-redesign.md` in full. Treat section 1 and the explicit required sequence as the user's requested direction; treat proposed choices and section 7 as recommendations. Read the current `docs/design-answers.md` and actual source as well. Development has continued since the brief's `b828b79` reference; older README/CLAUDE prose and catch-up summaries contain stale implementation claims.

## Task now: plan, do not implement gameplay yet

Prepare a concrete implementation plan for the following:

1. Mara directs the newly arrived traveler to an ordinary Imperial duty soldier who supervises combat instruction. Prefer reusing Footman Ottar (`post-landing`), with a short briefing, practical lesson and completion acknowledgment.
2. Fighting becomes the first mandatory skill introduction. Integrate the existing weapon-family/Arms progression; do not invent a duplicate generic Fighting statistic or erase alternative protagonists' starting skills. Defer Mara's formal Cartography skill lesson until after combat instruction while retaining the chart and directions.
3. The soldier dispatches the player to Corvan's existing Drent post. Preserve the letter, required token, and readable/dismissible inventory lesson.
4. Replace the initial three-goblin raid with exactly one **male highway robber** farther outside Tidehaven on the road to Corvan. This is the first real combat encounter. He openly attacks on the road; he is not a pickpocket or a group. One shared placement must drive world clearance, combat, trigger, checkpoint, markers and autoplay.
5. Resume the existing Corvan/supplies/Caloss/waymarkers/Iven sequence. Keep unrelated goblins and optional content.
6. Replace the wolves at the Luscia courier cart with his gang, with recognizable narrative and visual continuity. Preserve satchel delivery, the existing escape-with-satchel option, horse token, copper reward and onward campaign. This connected change is in the current player-facing Chapter 2; do not accidentally renumber the story.
7. Highway bandits should be harder than goblins and easier than Coalition soldiers. Specify measurable tuning and compare actual country-scaled encounters, not just raw hit points. Keep the opening readable and prevent companions or bystanders from completing its teaching fight for the player.

Your plan should include:

- A concise player-facing before/after sequence and proposed dialogue beats.
- Confirmed current code hooks and dependencies, including any overlapping work already in progress.
- Instructor reuse and a measured method for choosing the road site; distinguish a proposed site from one actually checked in the renderer.
- Explicit tutorial states/events and once-only grants; no progression by hitting straw before the instructor starts the lesson.
- A safe migration for old numeric tutorial stages, completed Greenway saves and `wolvesCleared`/`lauvel-wolves` saves, without replaying completed obligations or duplicating rewards.
- The human bandit model/kind/name wiring and balance criteria.
- Updates for NPC dialogue, opening captions, journal, maps, F8 starts, autoplay, and encounter-specific UI.
- Focused test coverage and review criteria; distinguish checks run from checks planned. Coordinate full-suite runs and follow the current user's Electron-testing policy.
- A short ordered implementation sequence with completion criteria for each step.
- A separate short section of optional regional-story recommendations drawn from section 7 of the brief. Do not quietly add the grain convoy or other new arcs to this implementation's requirements.

When this prompt is delivered through a read-only Claude Code handoff session, **return the plan in your response**. Do not edit source, run tests/the game, commit, alter other sessions, or begin implementation. The handoff driver will save the response for Michael. In a later user-directed implementation session, this prompt and the returned plan are the starting point; first re-check the then-current tree and other agents' ownership.

Confirm that you read the brief. Call out material conflicts or assumptions without asking Michael to reconfirm the requirements he has already specified.
