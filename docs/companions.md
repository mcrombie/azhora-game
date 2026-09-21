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

### One at a time, and two once the country asks for it

The combat brief says level-6 country — "Go armed, and not alone" — is "tuned for a traveler with
one or two companions". So: **one companion until the Moros muster, two after it.**

One on the road keeps the long road exactly as it is: Chris at your shoulder, one set of remarks,
one figure in the fight box, one man to lose. Two would make the road's noticing, the dialogue
prompts and the fight box all more crowded at the very hour the long road was tuned. After the
muster the company is formed, the country gets harder, and the brief's own "one or two" comes
due.

**This is the user's to confirm.** It is the single number that most changes how companions feel,
and I have taken the reading that keeps the long road untouched.

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

**Only one may walk with you**, so asking a second is asking the first to go on ahead. That is a
choice with a cost and it is the point.

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

## For the user to decide

1. **One companion on the road, two after the muster** — my reading of "one or two". The single
   number most worth confirming.
2. **Kristen's condition** is the only one that asks the player for something specific (the road
   charted). Everything else is met by being in the right place. If that is too much of a gate, she
   falls back to Ciarán's reason.
3. **What the Marshal says when the eleven are not eleven**, because somebody died. It is one line
   and it is the user's voice, not mine. Until it exists the muster keeps its present line for a
   full company and says the plain count otherwise, which is already what `musterVoices` does.
4. **Whether a dead companion's weapon can be recovered.** The save already holds
   `mercenaryWeapons`, so a sword traded to a man who then dies is somewhere. Not built either way.

## Build order

1. `src/companions.js`, pure: who may be asked, where, on what condition; the four rungs and what
   moves them; who walks with you; the dead; snapshot and validation.
2. The company honours it: no dead man placed, the companion slot driven by it rather than by the
   long road's single argument.
3. The asking, in each man's own conversation, with his own reason.
4. The journal's company page.
5. Death: the muster's faces and count, and the roster `musterVoices` is given.
