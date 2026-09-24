# Friendly fire, Imperial law, and bodies

This implementation gives ordinary world NPCs real health and carries the consequences of
hurting them through combat, saves, arrest, and body cleanup. The integration lives in
`main.js`; the independent systems are `crime.js`, `crime-host.js`, `melee-contact.js`,
`corpses.js`, `corpse-host.js`, and `corpse-view.js`.

## Physical contact

- A melee swing checks bodies at its contact frame, with its actual range, facing, arc,
  and solid obstruction. A civilian, companion, or friendly soldier can be struck.
- Living bodies also block walking, sword lunges, dodges, and knockback. Movement reads
  live positions, so the next actor sees where the previous actor actually moved. An
  initial spawn overlap permits outward escape, not walking through the other person.
  Fallen actors do not keep a standing collision footprint.
- An arrow strikes the first body in its path. A world NPC is no longer an immunity wall.
- Combat actors already damaged by the combat system are listed in the impact event.
  Their world NPC aliases are excluded from a second hit. Impact IDs also prevent replay.
- A player striking an ally is responsible for the assault. Damage inflicted by another
  NPC is not charged to the player. Authored hostile encounters, such as the rebel ambush
  and the authorized Killian confrontation, retain their existing lawful combat rules.
- Training dummies and agreed sparring participants remain nonlethal. Ordinary civilians
  standing beside a practice session are still ordinary civilians.
- Peaceful-world armored guards mitigate damage before it reaches their health. Inside a
  fight, the existing combat armor and shield system applies it once instead.
- Trained soldiers and officers bring their shields up during idle recovery. The frontal
  shield arc reduces damage; winding up, swinging, recoiling, and attacks from the rear
  still offer openings. Repeated contacts cannot continually restart a trained fighter
  recovering from a swing. Their attack speeds, health, and damage are unchanged.

## Health and death rules

Default health is 60 for ordinary people, 100 for mercenaries, 240 for soldiers and guards,
and 420 for Officer Glun. Explicit NPC `maxHp` or `hp` values take precedence. Ogres use
620, horses 100, dogs 45, and cats 25 unless authored otherwise. These are starting
profiles, not a completed balance pass for every region.

For peaceful-world attacks, the main quest contacts in `cast.QUEST_IDS`, the mercenary
company, and explicitly essential NPCs fall unconscious instead of permanently removing
the player's current story. They remain damageable and unavailable while down, then
recover after three minutes of actual play. Unconscious bodies cannot be looted. Ordinary
NPC deaths remain deaths after cleanup.

This default does **not** replace existing mercenary deaths in normal encounters with
knockouts. Those encounters keep their permanent-death rules. An actor explicitly marked
`spared` by an encounter is unconscious and recovers. Quest-authored enemy deaths remain
owned by their quest: in particular, the completed Imperial Killian outcome stays dead.
The crime host's `canRevive(npc)` callback must veto actors already killed by another system.

Injuries persist. `healthFraction(id)` lets the host reduce a newly created combat actor's
health without discarding that encounter's level-scaled maximum. Law encounters create
their full maximum and then restore the guard's current health, so repeatedly fleeing and
being arrested cannot heal a guard or shrink the guard's maximum health.

## Wanted status and arrest

Each unlawful damaging contact adds 20 copper to the bounty. Felling a person adds another
100; resisting arrest adds 30 once per confrontation. The record distinguishes permanent
kills from unconscious victims. A visible wanted indicator reports the outstanding bounty.

Imperial guards within 65 meters can pursue. They move through the same collision-aware
navigation as other NPCs. A guard must be within 3.2 meters, with a clear line of sight,
before opening an arrest conversation. Arrest waits while the player is in another active
fight, modal interaction, or developer review. Guards elsewhere in the country do not
teleport to the scene. Dismissing the demand leaves the bounty outstanding; the watch can
ask again or the player can speak to a nearby guard directly.

The guard presents all three choices together:

1. **Pay the fine.** Copper is removed before the bounty is cleared. Insufficient funds or
   a rejected removal leave the charge intact. A stale choice cannot charge twice.
2. **Serve time.** Five minutes of game time pass, the bounty clears, and the traveler is
   released on safe ground near Tidehaven, with health restored. Equipment and possessions
   are retained. This is a custody time skip and release; there is no playable prison
   interior, escort cutscene, confiscation system, or sentence minigame yet.
3. **Refuse arrest.** Nearby real guards enter the existing combat system. The corresponding
   world models are hidden during the fight so nobody exists twice. Ordinary guards have
   240 HP, armor, shields, and soldier pressure. Glun has 420 HP, stronger officer damage
   (32 versus a soldier's 24), more armor, and a stronger guard. The desktop regression
   verifies that a solo starting traveler who keeps walking forward and swinging loses
   to the responding watch without overlapping their bodies, then enters custody.

Losing an arrest fight results in custody. Retreating or defeating the responding patrol
leaves the bounty intact for the next patrol. An arrest fight never completes or advances
the main quest or Civil War in Drent.
The arrest encounter uses only the wanted badge; it does not inherit a quest encounter
heading or an enemies-remaining counter.

## Bodies and loot

Named NPC bodies have stable `npc:<id>` identities across combat and world attacks.
Anonymous enemies are scoped to their encounter. Bodies retain their appearance and lie
where the person fell. Taking loot changes the saved body inventory; already owned unique
equipment remains on the body instead of being duplicated. Companion weapon trades are
handled by the existing equipment system, so corpse loot does not mint another copy.

A combatant owns its named NPC identity for both rendering and collision. The original
world figure is hidden until the fight ends, and the roster deduplicates NPC aliases.
Fallen figures restore their articulated model before the corpse pose is applied; a
distant upright stand-in is never adopted as the corpse. Companion death notices have
no skill meter, and the landing companion follows the same permanent-death/save path
as the later recruited company.

The corpse system uses time spent actually playing, not time while the game is closed:

| Place | Progression |
| --- | --- |
| Settlement | Covered after 12 minutes; collected after 15 minutes |
| Wilderness | Weathered after 20 minutes; remains after 40; cleared after 60 |
| Unconscious | Kept unlootable until its owner recovers |

The last 45 seconds of a body's lifetime fade it out. Cleanup never resurrects its NPC.
Cleared records retain their tombstones so reloading or re-entering a region cannot create
the body or its loot again. The crime ledger also has a cleanup-eligibility marker; the
corpse system's longer location-specific lifecycle controls the visible body.

## Saves and integration

`crime` and `corpses` are optional fields on older road checkpoints. New saves contain the
bounty, injuries, deaths, recovery clocks, custody statistics, body phases, and remaining
loot. Malformed data is rejected before state changes.

The host processes a frame's impact records before death/body notifications. This makes
the unconscious/permanent status available when the corpse is created. It then handles
law combat outcomes before ordinary quest outcome branches, preventing arrest from
triggering unrelated victory or defeat logic. Call `crime.frame` after routine patrol
updates and skip normal movement for `crime.controlsNpc(id)`; the law host physically
moves those guards itself. `crime.isDown(id)` suppresses ordinary living models and
interaction while their fallen representation exists.

Custom animated people use the host's `additionalPeople` resolver alongside the ordinary
cast. Puck, Ed the Chameleon, Bosco, Batman, and the army's stationary stable horses now
share melee, arrow and spell damage, persistent health and fallen visibility. `crime.people()`
returns that deduplicated cast; `crime.person(id)` resolves identities for corpse rendering.
Custom animation hosts stop movement, conversations and living-model visibility when the
ledger says their character is down. Bosco has 45 health, Batman 180, and stable horses 100.

## Current limits and verification

This is one shared Imperial bounty, not separate town or faction jurisdictions. Witness
testimony, disguises, escalating prison sentences, bribery, civilian flight, and individual
retaliation are not implemented. The bounty records a player's assault immediately; a
nearby Imperial patrol is required for an actual arrest. The core-NPC recovery policy is
configurable, pending a final decision about permanent quest failure.

The player's owned horse and companion remounts still follow the existing riding system;
they do not yet have separate injury or death rules. While mounted, the rider is the physical
combat target. A future mount-death change needs to handle dismounts, replacement horses and
saved ownership together. Puck and Ed retain their authored escape/teleport behavior while
alive; an actual blade, arrow or spell contact can hurt them, but they may evade the approach.

Run `node --test --test-isolation=none tests/crime.test.js tests/crime-host.test.js` for the
bounded law checks. They cover real guard combat, physical approach around a house, fine
atomicity, custody, replayed contacts, arrow attribution, scaled injuries, repeated arrest,
essential recovery, spared bystanders, permanent companion deaths, and the Killian
resurrection edge case. The combat-contact and corpse tests cover the adjacent systems;
Electron smoke checks validate their actual renderer integration.

Run `npm run test:law:desktop` for the physical swing, arrest, forward attack spam, custody,
loot and save/reload checks. `npm run test:companions:combat:desktop` checks the road
ambush, one representation per companion, fallen Chris, death notices, victory and reload.
Both launch isolated test profiles rather than modifying the normal adventure save.
