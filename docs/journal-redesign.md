# Journal readability pass

The journal shows the player's current work, rather than a catalogue of future quests.

- Journey opens on **Active**. Completed quests and discovered notes have separate filters.
- A compact list stays beside one reading pane. Selecting a row reads it; **Track quest** explicitly changes the HUD and objective marker.
- Only accepted quests enter Active. Completed steps are collapsed, and future chapters are absent.
- Skills opens on **Practiced** (taught or earned experience), with search, categories and an explicit All skills view. The next milestone is visible; full progression and collections are expandable.
- Tabs remain in view. The list and detail pane scroll independently, with ordinary text controls protected from gameplay hotkeys.
- Region names use the original World Builder lettering. Hearing a name reveals that lettering without revealing terrain or local places.

## Reference decisions

[Baldur's Gate 3's journal structure](https://docs.baldursgate3.game/index.php?title=Journal_Structure_Overview) separates a quest index from selected objectives and distinguishes completed quests. Azhora adopts that organization while preserving its existing colors and typography.

[ESO's quest guide](https://www.elderscrollsonline.com/en-us/newplayerguide/questing) distinguishes reviewing accepted quests from setting a focused quest. Azhora likewise keeps reading and tracking separate.

[Xbox's text-display guidance](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101) informed readable body text, spacing, contrast and stable navigation. This is a readability improvement, not a claim of full accessibility certification.

## Focused verification

The journal-entry, journey-browser and skills-browser Node tests cover filtering and state isolation. `node scripts/launch.cjs --smoke-test --journal-checks` exercises the actual desktop UI using an isolated save profile. Screenshots can be captured with `--review-views=quest-journal,skills-readable,chart-close`.
