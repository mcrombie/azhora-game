# Chapter 3: autumn, the returning prince, and the approach of winter

Status: **planning only, 24 September 2026**. This records the user's new direction and unresolved choices. None of the calendar, seasonal invasion, moon, night danger, or Chapter 3 campaign changes described here is implemented by this document.

The running game still begins on **1 April 980**. Its established clock remains one game minute per active real second, or 24 active real minutes per game day. Do not change that date, saved calendar, existing campaign, or weather while these questions are pending. The current baseline is documented in [the living main arc plan](living-main-arc-plan.md).

## Requested opening and seasonal setting

The proposed opening moves the player's arrival to **15 September 980**, when the nearby pawpaws are ripe. Autumn should matter to the world and its food, rather than appearing only in a calendar label.

As the world passes into winter, **Falbguard armies** descend on the human realms. Without intervention, they can take territory. The invasion should develop in the world while the player pursues other work. Its exact start date, pacing, routes, and the time available to respond remain undecided. "Falbguard" is retained from the brief as a tentative name; its relationship to already authored factions needs confirmation before creating new faction IDs.

The proposed September start and winter invasion are a change to the currently approved April opening. They are not a retroactive calendar conversion for existing saves.

## The returning prince

Use **Valroy** as the provisional reference name because it already exists in [the royal-house history](the-war-and-the-house-of-ambron.md). The latest spoken brief also uses **Valory** and **Falvois**. Do not silently create three princes or settle their spelling in code.

The prince returns from a colonial crusade on another continent with a battle-hardened army. He claims the throne that Cedric took during his absence. The latest brief describes him as the eldest son and Cedric as his half-brother. Earlier royal-house notes call Valroy the second son and eldest living son, and give Cedric a particular fate before the game. Those relationships and chronology need reconciliation with the user.

News arrives that the Republicans have captured **Ambron**, the capital, and installed **Willard** as a constitutional monarch. The latest brief does not settle Willard's relationship to this prince or to Cedric. Existing lore supplies relationships, but this proposal does not treat those as newly confirmed answers.

Both the Republican and Monarchist main-story routes send the player as a messenger: first to a representative, then to the prince. Preserve the player's existing allegiance and the reason each side sends its messenger. These routes share an encounter with the returning prince; the exact representatives, message wording, negotiation choices, and any opportunity to serve the prince remain to be designed. A common destination alone should not silently switch the player's faction.

## Landing and the territorial campaign

The prince lands at **Tidewater Haven**, the same arrival place used by the player. Existing game text often calls the settlement **Tidehaven**; retain existing location IDs rather than making a second settlement from that variation.

The prince is popular with the local garrison. Virtually the whole garrison, including **Officer Glun**, transfers its loyalty to him and adopts **blue and gold**. That is a visible local change of allegiance. It must not recolor every Imperial soldier in the world by changing a shared material or globally rewriting the existing red-and-gold army.

The requested advance is:

1. Establish the landing and garrison allegiance at Tidehaven.
2. Take the major positions of **Drent** and **Pueth**, raising the prince's flags as control changes.
3. Continue into **Luscia** and capture it.
4. Advance on **Ambron** and lay siege, visibly constructing siege equipment.

This large Chapter 3 movement unfolds over **several game days**, including when the player is elsewhere. Troops stop for the night and make camp. Marching, capture, camp, and siege preparation need distinct observable states, with progress saved on the same active world clock as the rest of the campaign. No exact number of days, capture duration, camp hours, route, or sequence between the Drent and Pueth objectives has been selected.

The landing's trigger is also unresolved: reaching Chapter 3, a calendar deadline, or another condition could each produce different early-game consequences. The user has been asked to choose. Do not make the army land on the player at the beginning by assuming that "the same landing place" means "the same moment."

## Nights and the moon

Drent remains the safest region in ordinary conditions, but travel outside protected places becomes dangerous at night. Wolves are mostly benign during the day and hostile at night. Danger also depends on the moon cycle.

The **first night is a full moon**. During a full moon a werewolf roams and hunts: exceptionally fast, athletic, lethal, and difficult to kill. Protected areas should provide a meaningful alternative to remaining outside, but the exact safe zones, entrance rules, shelter options, moon-cycle length, and recurrence of the werewolf are not settled.

**Proposed presentation, not yet confirmed:** warn the player before the first dusk through local dialogue, visible gate preparations, and an intelligible route to shelter. This would give the dangerous first night a readable warning. Do not treat these proposed warnings as an already approved quest or new mandatory tutorial.

Night camps and safe settlements should fit the same time system as the advancing army. Menus and pause continue to stop active time under the existing policy; this proposal does not introduce offline progress.

## Questions already sent and still unanswered

| Topic | Decision still needed |
| --- | --- |
| Identity and relationships | Confirm the prince's name, whether "eldest son" means eldest living son, and how Cedric and Willard relate to him; reconcile Cedric's chronology with existing lore. |
| Landing trigger | Decide when the prince's landing occurs relative to the September opening, player progress, and the world clock. |
| Time until winter | Decide how much active play should pass before winter and its invasion, and whether to keep the current calendar speed for that span. |

These are pending user questions, not defaults selected by this document. Additional implementation details above should be refined after those answers. In particular, save migration, player responses to the prince, consequences of Glun's death or an earlier civil-war choice, siege outcomes, and the interaction between the prince's war and Falbguard's invasion still require design.

## Implementation boundary

This is an additive proposal alongside the current lore and main-story plan, not a silent replacement for either. The next deliverable is a reconciled plan with the open decisions answered. Calendar changes, new enemies, NPC allegiance changes, night safety, capture logic, and siege development should then be implemented and tested as explicit work.
