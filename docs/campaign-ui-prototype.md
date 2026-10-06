# Campaign UI prototype

UI-only preview, 5 October 2026. This is an interactive design fixture, not a campaign simulation. It uses the game's actual `assets/azhora-world-map.svg` and region metadata, with political overlays on the existing terrain and lettering. All geography is visible.

## Launch

Double-click **[Open campaign UI.cmd](../Open%20campaign%20UI.cmd)** in the Azhora project folder, or run:

```powershell
npm run prototype:campaign
```

A dedicated window opens directly to the whole atlas. It has its own temporary Electron profile and does not load the game, access its saves or change its settings. Close the window to stop the prototype. The launcher prints a localhost URL that also works in a browser while the preview window remains open.

## Try it

1. Drag the map and scroll to zoom. Click a region, or search for its name and press Enter. **Whole atlas** restores the full view.
2. Compare **Realms**, **Control** and **Unrest**. The right panel distinguishes a country's claim from its actual local authority.
3. Open **Factions** to browse the 46 political actors, including four separate Goblinland members and two undead factions. **Author knowledge** shows hidden ties without changing the ordinary discovery state.
4. Use **Next event**, the timeline, or **Play** to inspect five scripted snapshots. Play advances every six seconds and stops at the aftermath. Dates and later outcomes are illustrative, not settled game balance.
5. Inspect **Quests** before and after Northern pressure. A lost community's grain quest stays unavailable even after the crisis.
6. Use **Ithzel conflict**. West Ithzel belongs to Wilhelm's remaining faction; the returned human Lower King holds East Ithzel. Scroll the region panel to preview either victory or restore the roughly balanced starting situation. These controls select UI examples; they do not resolve a war.
7. Switch between **Campaign**, **Hero** and **Observe**. Hero previews the new Minora starting location and the information needed for a physical battle handoff. There is no 3D hero scene in this preview. Observe plays the same sample events, rather than running faction AI.
8. During Invasion, select Yunethre and **Inspect ongoing battle**. The panel explains that inspecting a remote battle does not move the hero there.
9. Preview an aid request, export the sample chronicle, or use **Feedback notebook** to export comments with the current region and view. Feedback stays in session memory until exported. Nothing is published or sent.

**Reset demo** restores the opening state and leaves session feedback intact. Dialogs pause sample playback. Space toggles playback when focus is outside a control; map focus supports +/− and Home. Search supports Enter, Arrow Down and Escape.

## Scope

This builds layout and interactions only. Sample changes are selected fixtures: no strategic AI, economy, recruitment, plague spread, battle resolution, background world service, real diplomacy or saved campaign progression is implemented. All military and postwar examples remain clearly marked as samples. Existing runtime files and tutorial behavior are unaffected.

The author fixture comes from the design roster and is intentionally inspectable; UI concealment is not a security boundary. Its 46 actors include Wilhelm's western Ithzel establishment as a faction while retaining his existing secret-vassal identity. Goblinland remains confederation membership rather than a unified army.

## Verification

```powershell
npm run test:campaign-ui
```

The test launches the isolated renderer, exercises actual UI controls, checks map loading, search, overlays, secret visibility, quest loss, mode continuity, both island outcome previews, diplomacy drafts, reset and absence of local save writes. It fails on renderer console errors. Screenshots are written to `tests/artifacts/campaign-ui/` for whole-atlas, northern-front and invasion views.

Main files: [page](../prototypes/campaign/index.html), [interface](../prototypes/campaign/ui.js), [styles](../prototypes/campaign/style.css), [roster fixture](../prototypes/campaign/factions.json), and [isolated launcher](../scripts/campaign-ui.cjs).
