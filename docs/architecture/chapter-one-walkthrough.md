# Following the conquest of Solis

This walkthrough connects a familiar game event to the reorganized source. It describes the current implementation, including coordination that still lives in `main.js`.

## Choose allegiance and fight the field battle

[Chapter 1](../../src/content/chapters/chapter-one/chapter-one.js) defines objectives, the playable army encounter, report destinations and the conquest required by each side. [The border chapter](../../src/content/chapters/chapter-one/border-chapter.js) supplies the envoy mission, allegiance choice and marching readiness.

[The army column](../../src/content/chapters/chapter-one/chapter-one-column.js) moves soldiers to the field. [Combat](../../src/gameplay/combat/combat.js) and [the army battle model](../../src/gameplay/combat/army-battle.js) resolve fighting. `main.js` connects their results to chapter progress.

## Follow the victory to Solis

Winning the field leaves conquest unfinished. After the commander report, the monarchist objective leads to Captain Brulan and `solis-sweep` in [aftermath-chapter.js](../../src/content/chapters/chapter-one/aftermath-chapter.js).

[aftermath-sites.js](../../src/content/chapters/chapter-one/aftermath-sites.js) supplies rally, assault and report positions. The model controls whether the assault is active, cleared or debriefed. The Coalition branch uses `moros-outpost`.

## Capture the city and display the consequence

Clearing the Solis encounter records capture. [Occupation](../../src/gameplay/company/occupation.js) interprets occupation consequences; [the map model](../../src/ui/map/campaign-map-model.js) projects the capture as Ambroni control of West Suval.

[The political layer](../../src/ui/map/campaign-map-layer.js) draws ownership, while [the ordinary map](../../src/ui/map/world-map.js) supplies explored cells. Political display cannot disclose unexplored holdings unless developer reveal-all is enabled.

The conquest debrief and final report in Ambron remain later steps. They complete the chapter; the territorial display changes when the city is captured.

## Save and resume

`main.js` collects snapshots. [road-checkpoint.js](../../src/app/saves/road-checkpoint.js) validates the combined save, including agreement between campaign and aftermath progress. Desktop storage remains in `scripts/`, with a browser-storage fallback in the game.

Several models currently record related story progress. Folder organization makes those connections easier to inspect but does not replace them with the proposed simulation ledger.

## Verify a change

[Chapter tests](../../tests/chapter-one.test.js), [aftermath tests](../../tests/aftermath-chapter.test.js), [map tests](../../tests/campaign-map.test.js) and [checkpoint tests](../../tests/road-checkpoint.test.js) exercise the models. [Native Chapter 1 checks](../../src/dev/checks/chapter-one-smoke.js) run both branches through conquest, discovery limits and save/Continue transitions.
