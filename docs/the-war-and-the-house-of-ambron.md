# The war, and the house of Ambron

The user's own history, set down so the game and every agent build from one text. The
present year is **980**. Anything here that contradicts an older note wins. Where this
touches the world-builder lore (`../world-builder/azhora_lore`), the lore's geography is
taken as given: Ambron on the Lake Ela narrows (`geography/regions/elagos.md`), Izol with
no capital (`izol.md`), Nylon at the mouth of the Lizeem (`nylon.md`) with **Eer** as its
farming hinterland, which foreign powers take in order to starve the city (`eer.md`).

## The house of Ambron

| | |
| --- | --- |
| **Valdemar the elder** | The old king. Dead. Named his first son for himself. |
| **Valdemar the younger** | The eldest son. Died before his father. |
| **Ruzo** | Valdemar the younger's son — christened Valdemar too, and goes by **Ruzo**, the name he took when he renounced his family. The old king thought him the ablest of them. He did not believe in the Empire's mission and would not take the throne he arguably had the first claim to. He is friendly with Willard and backs the constitutional monarchy. In the game he is already named, unwitting, in the Coalition's roster: "the prince who renounced his family". |
| **Valroy** | Second son, and the eldest living. Abroad across the eastern sea on a colonial crusade when his father died, and claimed the throne from there. **Has just landed in the east with his army** — the news that opens Chapter 3 on both branches. Determined, independent, and deaf to argument. |
| **Cedric** | Third son, half-brother to Valroy. Took the throne in fact while Valroy was away. Hated. Driven out of Ambron by the revolution; fled to the holy city in Isareos; killed there by Wilhelm, with all his family. |
| **Wilhelm** | Younger than Cedric, older than Willard. **The Blood Prince.** Worships Nanvir, the man-eating god. Sacked Solis in 977, took Nylon, went north into Isareos claiming to relieve Cedric, killed him instead and razed the holy city. Now besieged in Nylon. |
| **Willard** | The youngest. Installed as **constitutional monarch in Ambron** by the republicans, one day before the traveler arrives. |

## King, or emperor?

Officially Ambron has a **king**. "Empire" and "emperor" are also used, and which word a
person reaches for says what they believe:

- **Royalists** say *Empire* for legitimacy: a great monarchical empire whose restoration
  justifies them.
- **Republicans and rebels** say it with contempt: the empire was tyranny, and calling the
  king an emperor is calling him a tyrant.

Write dialogue to that rule. Nobody in the game should use the two words interchangeably by
accident.

## The Empire's army

Ambron's soldiers are a medieval kingdom's men-at-arms, closer to the Elder Scrolls' Empire or
Stormwind's guards than to Rome. Nothing about them is Roman: not the ranks, not the names, not
the kit. (Decided 2026-09-19; the game used Legion, Legate, Tribune and Latin names before.)

- **The force** is *the army*, or *the Imperial army* when someone means the institution.
  Never "the Legion". Its men are *soldiers* or *men-at-arms*; a private's title is *Footman*.
- **Ranks**: *Lord Marshal* (Duvo Harn, commander of the narrows), *Marshal* (Hadric Venmor,
  the camp on the Moros), *Captain* (Oswin Brulan of the left, Aldous Drevan at the Tessen road
  post), *Lieutenant*, *Sergeant*, *Quartermaster*.
- **Names** follow the royal house (Valdemar, Valroy, Cedric, Wilhelm, Willard): medieval given
  names, with surnames from the Elagosi naming profile (`venmor`, `brulan`, `drevan`, `ossan`).
- **Look**: mail under a red tabard, gold-hemmed, bearing the device of Ambron, a gold tower over
  the water of the narrows; big rounded pauldrons; a bascinet with a nasal and a mail aventail;
  greaves and knee cops; a red heater shield with the same device; spear or sword. Officers add a
  red-and-white plume and a gold-edged red cloak. Ambron's colours stay red and gold.
- Internal ids (`legion-soldier`, `legion-posts.js`, `camp-legate`) still carry the old word, so
  saves keep working. They are never shown to the player.

## The war, year by year

- **976** — At Prince Willard's wedding, **Prince Maro of Solis** carries off the bride and
  takes her home. The King of Solis refuses to give her back. Ambron and a coalition —
  **Pyros, the Avites, Nylon** — declare war on Solis. Solis stands alone: **Lamdris** in
  South Suval and **East Suval** stay neutral rather than be destroyed with it.
- **976–977** — The siege of Solis, about a year, without taking the city.
- **977** — **Prince Wilhelm arrives and storms Solis**: he burns the city, and kills the
  allies besieging it alongside him. That provokes war with Pyros, the Avites and Nylon.
  He marches straight on **Nylon** in **Eer**, seizes the city, and disappears for a time.
  **Solis is left mostly destroyed.**
- **980, before the game** — Revolution in Ambron drives Cedric out; he flees to the holy
  city in Isareos. Wilhelm follows, kills him and his family, and razes the holy city:
  hence the Blood Prince. The revolutionaries and Willard settle on a constitutional
  monarchy. The Coalition — the Izoli Republic, Suval, Ambroni rebels, Pyros, Selemis,
  Marosh, the island cities — raises its own war against the Empire, and takes Solis.
- **980, the game** — The traveler lands at Tidehaven. Chapter 2 ends at the border battle
  and their own side's ground. Chapter 3 opens in Ambron a day after the revolution, and
  with the news that **Valroy has landed in the east**.

## What this means for what is already built

1. **Solis must show its scars.** The city in the game is whole and prosperous; three years
   ago it was stormed and burned. It wants burnt quarters, patched walls, a rebuilt gate,
   roofless houses kept as they fell, and people who talk about the fire as the thing that
   happened to them. This is a content pass on `src/west-suval-world.js` and `src/solis-town.js`.
2. **Prince Maro** is a name the game does not use yet, and the reason the whole war started.
3. **Chapter 3** sends the traveler from either side to treat with Valroy; he refuses and
   turns his army on **Drent**, taking the province over game time while the traveler watches,
   interferes, or carries the news. Then the choice of prince: Willard, Valroy, or Wilhelm.
4. **Ruzo's claim is the senior one** — he is the eldest son's son. That he will not press it
   is the lever the whole succession balances on.

The Republic's own half of this history — Izol's war on Selemis, and the three generals who hold
the island between them — is in `izol-and-the-triumvirate.md`, and is its equal in authority.

## Still open

- Does the razed holy city in Isareos have a name? The lore does not give one.
- Nanvir is new: he wants a place in `../world-builder/azhora_lore/culture/azhoran_religions.md`.
- Is Prince Maro alive in 980, and where?
