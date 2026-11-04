# A short Lizeemi War demonstration

Use the local release candidate for the current launcher. The live Render site is
manually deployed and may still be older. Allow loading to finish before timing
the demonstration. Aim for 5–8 minutes of play; exact outcomes depend on combat.

1. Open **Story → Begin Story**. Taleth introduces the assignment in the Spirit
   and Time Realm. After he leaves, approach Uguth and press **F**. For a short
   demonstration, expand **Skip preparation for now** and choose **Skip tutorial
   and unlock the door**. This is an existing, explicit skip, not a test victory.
2. Approach the large door, press **F**, and enter Azhora. Speak to Taleth in his
   tower. Choose **West Lizeem**, finish his briefing, and leave the tower. Time
   starts with the attack on Caricas; Ovesos starts at Adventure **02:00**.
3. Open **M**. Show the faction colors, armies and the recommendation to help at
   Caricas. Explain that the campaign owns these forces independently of the
   player. Close the map and keep the campaign running while traveling.
4. For a reliable route, use Minora's White Bridge boatkeeper and choose Caricas.
   Leave the onward guide enabled. **Skip voyage** is optional and consumes the
   remaining travel time. At the gold battlefield boundary, press **F**, review
   the encounter, and join the main battle.
5. Demonstrate **X / click** to strike, **F** to block, **Space + direction** to
   dodge, **T** to lock a target, and **Q** for Fireball. **H** opens combat help.
   Fight alongside the allied militia. The result may be a win or a loss; neither
   is scripted for this walkthrough.
6. Continue from the result. Open **M** and **War log**. Point out the recorded
   participation, losses and territory changes that actually occurred. Compare
   them with the pre-battle map. The battle advances campaign time to its
   scheduled end; it does not award an invented result or leave the clock frozen.
7. Keep playing, or use the existing map speed controls / **Time & waiting** to
   reach the next event. Show a different army order or battle resolving without
   joining it. Restore normal speed before ending the demonstration.

For a deterministic engineering follow-up, show the seeded model tests in
`tests/lizeem-simulation.test.js`, campaign commands in `src/simulation/campaign.js`,
and save validation in `src/app/exploration/war-checkpoint.js`. Explain the boundary
between pure simulation, tactical result application and rendering. Do not claim
that every visible resident or field is individually simulated: campaign food,
population and housing values are abstracted from fixed scenery.

## Existing recorded demonstration

[Azhora Demo 7](https://www.youtube.com/watch?v=7-BWZjqXetg) is the most useful
existing full playthrough for this portfolio. The accompanying
[Azhora III: The Lizeem War](https://www.mcrombie.com/cromblog/azhora-iii) explains
the design and AI-assisted development. The recording predates this launcher
cleanup and should not be presented as footage of this exact release candidate.

## Engineering source trace

- `src/app/exploration/entry.js` selects the existing mode and save slot;
  `launcher-presentation.js` changes only what the launcher shows.
- `src/app/exploration/training/arrival.js` owns the initial Spirit and Time
  session; `src/app/exploration/exploration.js` assembles the 3D campaign host.
- `src/experiments/day-night/opening-war.js` adapts elapsed adventure time to the
  campaign. Its historical folder name does not mean this path is unused.
- `src/simulation/campaign.js` and `src/simulation/food.js` own strategic state
  changes. `src/app/exploration/world-war.js` connects campaign state to the world.
- `src/app/exploration/war-checkpoint.js` validates/persists the campaign;
  `src/app/exploration/war-log.js` derives the player's history from events.
- `src/world/loading/region-loading.js` schedules cooperative construction.
  A time budget cannot interrupt one expensive builder step; large steps remain
  a performance limitation, not background worker parallelism.

The older `docs/architecture/chapter-one-walkthrough.md` describes the conquest
of Solis in the original adventure. Do not confuse that numbering with the
current Lizeemi War launcher entry.

## Reproduce locally

Use Node **22.15+** (this pass used **24.15.0**) and a desktop with WebGL support:

```sh
npm ci
npm start
```

The native app intentionally shows the developer menu. Select **Chapter 1:
Lizeemi War** for the same Story implementation. For the public browser menu:

```sh
npm run build:web
python -m http.server 8080 --bind 127.0.0.1 --directory public
```

Open `http://127.0.0.1:8080/`. The optional Python command serves only the built
public directory. Browser saves are specific to that browser/origin and are
separate from native saves. A fresh browser profile makes the walkthrough
repeatable without erasing existing progress. Append `?launcher=developer` for
the developer browser presentation; it is presentation policy, not authorization.
