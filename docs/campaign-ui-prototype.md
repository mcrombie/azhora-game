# Campaign map UI prototype

Revised 6 October 2026. This is a minimal, informational map for a player who is one character in Azhora. It uses the game's existing atlas. The standalone preview does not run campaign systems or access game saves. The normal in-game M map also offers the three views and reads existing Chapter 1 completion to display its territorial outcome.

## Launch

Double-click **[Open campaign UI.cmd](../Open%20campaign%20UI.cmd)** in the project folder, or run:

```powershell
npm run prototype:campaign
```

Close and reopen an earlier preview window to load this revision. The dedicated launcher uses a separate temporary Electron profile. Its printed localhost URL also works in a browser while the preview window is open.

## The three map views

- **Regions:** the default, preserving the original atlas with each region's name and borders. In-game, M opens the normal chart and resets to this view; existing travel detail, chart knowledge and navigation remain intact.
- **Geopolitical:** colored faction territories have country names and merged outer borders. Internal regional borders and regional names are hidden. Lond is one five-region territory; the four independent goblin factions remain separate. Small country labels appear as space allows when zooming. A country name can move to a visible exclave when its main territory is offscreen.
- **Stability:** the same regional map with stable, unstable, conflict and unassessed colors. Unknown conditions are not assumed stable.

Drag to pan, scroll to zoom, or use Whole map and the zoom buttons. Preview search finds factions and regions; Enter selects the first result and Arrow Down focuses it. Clicking Geopolitical opens the country's profile; clicking Regions or Stability inspects the region. Profiles show rulers or governments where established, seats, known allegiances, relevant wars and current territory. Ambron, Izol, West Suval and Lond have authored profiles. Unspecified leadership stays unspecified; secret vassal ties and Thalmagar's secret capital are not disclosed.

The in-game political inspector appears only in Geopolitical and Stability; returning to Regions restores the normal chart layout. Both alternate views are clipped to the player's visited hexes. Faction labels, available faction entries and territory counts use those discoveries rather than exposing whole countries. The normal developer reveal-all toggle is the only in-game override, and switching it off restores the limits without adding discoveries. The standalone UI preview remains an explicitly separate full-atlas fixture with no player save attached.

There are no Campaign/Hero/Observe tabs, play controls, timeline, chronicle, army commands or diplomatic actions. Possible future influence through the campaign map is deferred.

## Test territory changes

Open **Preview tools** in the upper-right corner. These are isolated UI fixtures, not gameplay orders:

1. **Opening territories:** Moros Plain belongs to Ambron. The republican Coalition holds West Suval as a distinct country allied with Izol. Thalmagar directly holds Cape Thalmagar, Urubond, Narcosh, Cudon and Lesser Oremindi Mountains.
2. **Chapter 1: Ambron takes West Suval:** successful monarchist service culminates in the conquest of Solis. West Suval joins Ambron's territory; Moros remains Ambroni.
3. **Chapter 1: Izol takes Moros Plain:** successful Coalition service brings Moros under Izol. West Suval remains a distinct coalition-held country.
4. **Undeadland takes North Riesov:** retained geometry example combining Eshtor and North Riesov.
5. **Lond loses East Lond to Undeadland:** retained geometry example shrinking Lond to four regions.

Switch between all three map views after choosing a snapshot. The ownership state stays the same. Every snapshot starts from the opening, so the two Chapter 1 outcomes never accumulate. Return to Opening territories to restore the starting fixture. Newly conquered territory is marked as conflict rather than automatically stable.

## Chapter 1 quest connection

Select **Ambron → Chapter 1** or open **Quests**, then read the Monarchist or Coalition path. The panel describes what is at stake, links to the relevant territory and provides an expandable quest route. **Preview successful ending** and **Restore opening territories** are explicitly preview controls, not gameplay choices. The quest examples use the existing envoy mission, commanders, battle and final reports from `src/content/chapters/chapter-one/chapter-one.js`, `src/content/chapters/chapter-one/border-chapter.js` and `docs/chapter-one-entry.md`. Northern example quests have been removed from this panel.

In-game there are no outcome preview buttons. The map requires the matching cleared conquest record in the existing aftermath state: `solis-sweep` for the Empire or `moros-outpost` for the Coalition. The actual assault now follows the field victory and commander report. Ownership changes when its defenders are defeated, before the assault debrief and final city report. Save/Continue retains that capture; retreat and old completion flags without conquest do not grant territory. This restores the existing authored encounters and occupation behavior, rather than adding a general campaign simulation.

The roster remains 46 political actors. Disputed holdings use hatching, and unassigned territory stays neutral. The two Yunethre societies share one region; the map's shared-area label does not unite their governments. Local exceptions, such as Cedric holding Minora without confirmed control of all its countryside, remain explained in the inspector. Territorial display does not reveal secret overlords.

## Verification

```powershell
npm run test:campaign-ui
```

The isolated renderer checks map loading, merged borders and preserved land area, faction labels, view switching, both Chapter 1 outcomes and restoration, faction and quest inspection, mouse selection, compact layout and absence of save writes. Renderer errors fail the check. Screenshots appear in `tests/artifacts/campaign-ui/`, including `ambron.png`, `chapter-monarchy.png` and `chapter-coalition.png`.

`node scripts/run-tests.cjs tests/campaign-map.test.js tests/chapter-one.test.js` checks conquest gating, state preservation and the existing chapter logic. `node scripts/launch.cjs --smoke-test --chapter-one-checks` verifies the real M map's visited-hex limits and developer reveal toggle, both conquest encounters, blocked premature reports, and saves before capture, after capture and after the final report in an isolated game profile.

6 October verification: 98 focused Node checks passed across the border, Chapter 1, aftermath, map, occupation and checkpoint suites. The native Chapter 1 report records all 72 assertions passing with no frame errors; Electron emitted a GPU shutdown error afterward and the shell returned a nonzero status. The separate campaign UI regression run passed and exited normally. These checks exercise combat and dialogue transitions with test positioning; they do not constitute a complete manual walk through both routes or a long-running campaign simulation.

Main files: [preview interface](../prototypes/campaign/ui.js), [shared map data and outcomes](../src/ui/map/campaign-map-model.js), [shared inspector](../src/ui/map/campaign-map-info.js), [in-game layers](../src/ui/map/campaign-map-layer.js), [territory geometry](../src/ui/map/campaign-map-geometry.js), [roster](../assets/campaign-factions.json), and [isolated launcher](../scripts/campaign-ui.cjs).
