# Companions (design, 2026-09-21)

The user's oldest standing request, and the leg the combat brief's phase 7 hangs off: friendship
with a mercenary is how you learn the weapon they carry, so companions must exist before teachers
can. Written before any code, as briefed.

**The rule that shapes everything else:** the long road already built one companion — Chris
Gotwood walking Drent at your shoulder, `phase: 'with-traveler'`, released and taken back. This
is not a second system beside it. It is the same system, in which Chris walking Drent with you is
simply the first case and the only one that is automatic.

## What is already there

- `createMercenaryCompany({ companion })` takes `{ id, with: true }` or
  `{ id, releasedAt, releasedDistance }`, gives that man the phase `with-traveler`, and returns
  `companionId`. `summary` counts the phase under its own key; `travelerRank` counts him behind
  you. **Undefined is today's clock exactly**, which is the property every change below must keep.
- The host places him 2.5 m behind the traveler's left shoulder, walks him when he is more than
  four metres off, sets him down beside you past forty, and keeps him out of the raid's fight box.
- `combat.state.allies` already exist, fight, can be wounded, and now take the country's scaled
  damage (combat phase 2).
- Friendship already has a vocabulary in this game, and it is not a bar:
  **a stranger → an acquaintance → glad to see you → fond of you** (`src/rena-letters.js`,
  `src/acorn-quest.js`). Companions use the same four rungs.
- `createFallen()` in `src/bystanders.js` is a set of ids that survives the save. The dead of the
  company belong in it rather than in a new list of their own.

## Settled, and why

### As many as will come

**The user's ruling, 2026-09-21.** There is no limit. A traveler may reach the muster with most
of the company behind him, and that is the generous reading on purpose. I had proposed one on the
road and two after it; the answer was the other end of the range.

So the scarcity is not a number. It is that **each man says yes only for his own reason at his
own moment**, and some of those moments are narrow: Ed is on his strand for twenty-five minutes,
Mus is only ever found off the road, Kristen wants the road charted first. Keep those honest and
the company stays something gathered rather than collected. "Asking a second is asking the first
to go on ahead" is gone, and so is the `'full'` refusal — the only reasons anybody says no are
his own.

### How each of the nine is asked

The general rule: **every man says yes for a reason already written in his own two lines**, and
each has one moment where asking is natural. Nobody is recruited from a menu.

| Who | Where he is asked | What makes him say yes |
|---|---|---|
| **Chris Gotwood** | off the boat, automatic | he is already walking with you; the long road's slot rule (or Cromb, when you are Chris) |
| **Ed the Word** | on his own strand, minute 6 to 31 | "A man wants an adventure." He is the easiest yes in the game and says so |
| **The three riders** | on the road together, from minute 18 | they are arguing about whether to stay together, and asking settles it. **Ciarán** goes with whoever is going. **Jerry** wants to split up anyway. **Kristen** will not leave the other two unless you can tell her the road — she says "you know the road and we do not", so she needs you to have charted it |
| **Lakota** | Tidehaven's bird garden or the road | he stops for anything worth looking at; he comes if you have looked at one with him |
| **Eliana** | on the road, alone, from minute 48 | her back wants the trade; she comes for somebody who carries an edge she can swap for |
| **Matt and Al the Tun** | the last pair in, minute 63 | Matt comes if there is a line to hold; **Al** comes for company, and would rather it never came to the mace |
| **Mus** | only in the woods, on his wild line | you left the road, which is the one thing he respects. He never says why he says yes — he is the sage's eyes, and he does not explain the route either |

**All of them may walk with you**, and the three who rode in together can all come. What keeps
the company from being a shopping list is that each is asked where he is and for what he wants.

### Friendship: four rungs, and what moves them

Not a bar on the HUD. The same four rungs the rest of the game uses, so a milestone is a rung and
combat phase 7 has somewhere to hang a lesson:

| Rung | Reached by | What it is for later |
|---|---|---|
| a stranger | — | he will fight beside you and say little |
| an acquaintance | asked and travelled with | the first lesson in his weapon |
| glad to see you | fights survived together; a weapon traded | the second, and a raised sparring ceiling |
| fond of you | his own small business done; a long road walked | the last lesson, and the thing only he can give |

What moves it: time walked with you, fights come through together, a weapon traded, and the one
errand each man has. What does not move it: gifts, or repeating a conversation.

**Where it is shown:** the journal's company page — one line a man, where he is, whether he walks
with you, and his rung in words. The HUD already carries `companyStanding`; it stays as it is.

### What a companion does in a fight

He is an ally, because allies already exist and already work. A companion joins **every** fight
you are in, at his own weapon and his own level, and he does not flee. He takes the country's
scaled damage like everything else.

### What death changes

Permanent, in any fight, anywhere — wolves on a night road as surely as the border battle
(`docs/design-answers.md`). A dead man:

- goes into `createFallen()`, which the save already carries;
- is never placed on the road again, and never waits at a landing;
- **is not greeted at the muster.** `musterVoices` builds its `company` from a roster; the dead
  must be out of that roster, and the Marshal's "That is eleven, and eleven is what I was
  promised" cannot be said over a gap. A muster short of its eleven needs its own line;
- teaches nothing, ever (combat phase 7);
- and is the reason the count the Marshal gives is a count and not a constant.

### What the muster does

Recruitable **until** the muster: the road is where you find people, and the finding is the game.
Once the company is mustered the army has them, and who walks with you is settled at the camp
instead of on the road — and two may, because from there the country is level 2 and climbing.

## Answered by the user

All four were answered on 2026-09-21 (docs/design-answers.md):

1. **How many: as many as will come.** No limit.
2. **Kristen keeps her condition:** she comes if you have charted the road.
3. **The gap at the muster: he asks you what happened.** A short conversation, once for each
   missing name. Tell it true, say only "Dead.", or lie — and a lie is known to everyone who was
   walking with you when it happened, each of whom drops a rung and says so once, later, by their
   own fire. If nobody living saw it, the lie stands and the campaign remembers the register says
   something false. Built in step 5.
4. **A dead companion's weapon lies where they fell**, marked, until picked up, as a named weapon
   — "Eliana's greatsword" — and if they carried the traveler's traded sword, that is what lies
   there. The only named weapons in the game.

## Build order

1. `src/companions.js`, pure: who may be asked, where, on what condition; the four rungs and what
   moves them; who walks with you; the dead; snapshot and validation.
2. The company honours it: no dead man placed, the companion slot driven by it rather than by the
   long road's single argument.
3. The asking, in each man's own conversation, with his own reason. — **built.** One choice,
   "Walk with me.", offered only where he is; his own refusal line where he wants something
   first; nothing at all where he is somewhere else, rather than a greyed-out line. A man walking
   with you is offered "Go on ahead of me." instead. The three gates are `explored` for Kristen
   (charted would open itself — Drent is charted from the first morning), a bird seen for
   Lakota, and an edge worth swapping for Eliana.
4. **The people walking with you are in the fight** — **built.** `createCombat` takes a
   `getAllies`, so no authored encounter changed: whoever walks with the traveler is added to
   whatever the fight already had, at his own `MERCENARY_ARMS` numbers. The border battle's own
   four soldiers keep their places and the company stands with them.

   **The three fights the player is taught alone in are a named list, not a place** — the
   Greenway raid and the Avrel clearing raiders, beside the straw post's practice. "The fights he
   is being taught alone in" is not a country: Drent has later fights that are no lesson, and
   Luscia's wolves are a lesson in nothing. The hold fired on *any* fight before this, inherited
   from the long road keeping Chris out of the tutorial raid, so a company stood beside the box
   and watched.

   Losing one is unmistakable: a card naming who, where, and that nobody in this company comes
   back; `companions.died` puts him in `fallen`, and he is never placed, never in another fight,
   and not at the muster.
5. The journal's company page.
6. **Death at the muster** — **built.** The count is right in both directions: in camp is
   mustered plus whoever walked in with you, still coming is on the road and alive, and the dead
   are neither. A third table, `MUSTER_ARRIVED_WITH`, for a man who came through the gate at your
   shoulder — neither of the other two could say it, and nine of ten were falling back on
   "somewhere back down that road" from men who had never left it.

   The Marshal counts, stops, and asks after each missing name. Tell it true (built from what was
   written down when he fell), say only "Dead.", or lie. Truth and silence cost nothing. **A lie
   is known for one by everyone who was walking with you when it happened**, each of whom drops a
   rung and has a line for it, said once. If no witness is still alive, the lie stands and the
   register says something false.

   A dead man's weapon lies where he fell, named — "Eliana's greatsword", the only named
   weapons in the game — until somebody takes it, and if he was carrying the traveler's traded
   sword, that is what is lying there.
