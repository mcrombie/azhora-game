# The three sorcerers

Written for: whoever builds the rest of this, including me.

Michael's brief of 22 September 2026, with the rulings taken in the same conversation. All three
are built and wired: Ben in Nothom, Troy in Cobble, Liz in the woods of Pueth. What is *not* built
is casting — see **What is unsettled**.

## Sorcery, as ruled

Five schools on the sheet, three of them teachable. Each sorcerer teaches one, and each is the
only person in Azhora who teaches it.

| School | Teacher | Level-1 spell | Built? |
|--------|---------|---------------|--------|
| Fire | Ben, on Nothom's square | **Fireball** — a ball of fire at what you are looking at | the school, not the casting |
| Mind | Troy, in Cobble | **Mindread** — a second thing to say in a conversation | yes, in Cobble |
| Beast | Liz, in Pueth's woods | **Summon bees** — a swarm that attacks whoever is attacking you | the school, not the casting |
| Frost | nobody yet | — | — |
| Wards | nobody yet | — | — |

Frost and Wards stay named and unteachable, the way the Arms table names weapons that do not
exist yet (the user's ruling: keep them).

**The four decisions** (`src/sorcery.js`): focus is its own pool, not wind and not health; a wand
or staff **is** the weapon, so a sword casts nothing; damage dealt is the only thing that pays a
school; and the numbers run from level 1 to 99 on a straight line, the way `ARMS` does.

Each lesson is **one of two rewards, once**: the money or the school. Taking the coin closes the
only door in the game that teaches that school.

## Ben — Fire — Nothom

`src/spider-quest.js`. Light brown, bald under a hat, round spectacles, a wand and nothing else.
Of the sorcerer's guild, sent to kill a giant spider north-west of the town, and not sure he can
do it alone. Agree and he walks you to the den; the fight is hard and his fireballs are why it is
winnable. Kill it with him alive and he pays: **35 copper or the first lesson in fire**. Stand
back and the spider kills him — `abandoned` is a real ending, and fire stays unlearned.

## Troy — Mind — Cobble, in Peblos

`src/murder-quest.js`. He was the beekeeper at the Bee Fold in Drent; **the skeps and the
honeycomb went to Liz** (the user's ruling), and `src/beekeeper.js` is now the comb trade rather
than the man. Half his hair is dirty blonde and the other half is the red he came with
(`look.hairSplit`); he does not explain it.

**The case.** Bregga Sell kept the nets and the tally and was found at the quay root with the
tally book gone. Three suspects, **all three innocent**, each with one true thing they would
rather not say:

| Who | What they give | Their secret |
|-----|----------------|--------------|
| **Jessi** — fishes, teaches it; red and green hair, glasses | `light-boats` — three weeks of light boats that were not light | she is not sorry, and says so |
| **Ari** — the village's accountant; brown skin, curly black hair | `weights-not-counts` — the counts have matched for years, the weights have not | she was out at the skerry with Ed the Word's mutineers |
| **Imani** — the vine keeper, in Cobble for kelp | `lamp-under-the-beam` — a man at the weigh-beam with a lamp before light | nothing; nobody thought to ask the outsider |

**Torven Oss**, the weighmaster, has been shaving the barrels for eleven years, and Bregga's tally
had got close enough to say so. He is the only person who says the book was never *found* rather
than that it was lost.

**Naming him.** Troy will not act on a guess: the right name with nothing behind it is refused
(`UNPROVEN`), a wrong name is refused with his reason for it (`CLEARED`), and either way **he will
not hear another name for three minutes** (`ACCUSE_REST`), so the list cannot be walked. Reward:
**40 copper or mind sorcery**.

**Mindread, as built.** A `⟨Read them.⟩` option on Cobble's four, which shows what that person
decided not to say — including the weighmaster, whose reading is the only one that is a
confession. It works while the case is open *and after it is closed*, so the thing Troy teaches is
usable where it was learned. **Nowhere else in the game answers it yet** (see below).

## Liz — Beast — the woods of Pueth

`src/cat-quest.js`. Straight black hair, tan skin, a canvas smock and a smoker: her own build
(`skep-keeper`), because `bee-keeper` is Troy's red beard and grin. She keeps three skeps in a
clearing 93 m from the goblin camp and 26 m off its trail, and she is **the game's only source of
honeycomb** now.

**The cat.** Mop is on the midden at the edge of the camp, 22 m from the middle of it and 19 m
from the nearest goblin. He will not be carried and will not be led: stand near him quietly and he
decides about you, then trails four or five metres behind and sits down when you do. A fight near
enough to hear and he bolts, hides, and has to be walked back to — counted, so a player who keeps
starting fights around him feels it. He can die, and if he does the errand ends and cannot be paid
for. Reward for getting him home alive: **30 copper or beast sorcery**.

## What is unsettled

- **No spell is castable yet.** Fireball and summon-bees exist as numbers in `src/sorcery.js` and
  as skills on the sheet; nothing in `src/combat.js` throws them. That is one piece of work for all
  three schools, and it is the next one.
- **Mindread speaks only in Cobble.** Every other conversation in the game has no reading written
  for it. Either each person gets a line, or there is a general answer for people who have nothing
  written — which is a decision, not a chore.
- **How Mind and Beast earn experience**, given neither spell deals damage and damage is what pays
  a school (`spellXp`). Mind has `perReading`; Beast has nothing.
- **Whether Mop can be killed in play.** The module has the ending; nothing in the host can reach
  it, because goblins do not attack the cat.
- **Whether Imani has moved to Cobble or is visiting.** She says she is there for kelp twice a
  year, which reads as visiting, and the vineyard still has her.
