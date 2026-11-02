# Music and nature

Explore, the Lizeemi campaign (including Food World), and Combat Testing share a small local Web Audio score. This is an original synthesized prototype, not a finished recorded soundtrack. It adds no audio downloads or world-preload work. The legacy adventure launcher is unchanged.

## Player experience

- **The Still Hours:** soft bell, plucked and sustained voices in the Wizards' Tower. Music continues while campaign time stands still.
- **Mist Without Hours:** sparse, reverberant bells and soft sustained chords in the Stillroom, including trial briefings and the quiet after results.
- **A Measure of Courage:** a separate duel theme sharing the chamber's motif. Rounds 1-3 use a restrained plucked pulse; rounds 4-6 add a bowed bass; rounds 7-9 add a low horn; the ogre gets an extra bass response. Tempo and drum level stay constant so increasing difficulty does not become increasing loudness.
- **A Lesson Learned / Begin Again:** brief victory and defeat cadences, each played once per actual trial result before returning to the chamber. Muting, focus changes or reopening Help cannot replay a result. No missed fanfare is queued while music is off.
- **Along the Lizeem:** a restrained traveling melody in the open world, followed by long rests where nature carries the scene.
- **Under the Quiet Sky:** a slower, sparse nighttime variation, following the existing sky hour.
- **Two Banks, One River:** low percussion and a minor variation during actual combat. Marching armies and battle-choice screens do not trigger it. Results return to the surrounding theme.
- Conversations and maps lower the mix without repeatedly restarting the phrase. Pause, loading and inactive windows silence it; losing focus also suspends the audio device.
- **Music & nature** is a collapsed section in the launcher, Combat Testing menu, pause menu and combat Help panel. Music and nature have separate volume sliders and a combined mute; music at zero leaves nature audible. Existing combat-effect controls remain separate.
- A compact **Now playing** label sits immediately below the minimap. It names the active piece and reports quiet interludes or muted/off music instead of claiming a track is playing through silence. It follows minimap visibility and fits the smaller phone layout.

Settings persist across modes and launches, independently of campaign saves. Electron uses a fixed `saves/sound/` preference slot through the existing constrained storage bridge because its loopback web port changes on each launch. Browser builds use localStorage. Test profiles use an in-memory slot.

## Birdsong boundary

Daylight temperate country has provisional stereo synthesized bird phrases, separate from instrumental notes. The music ducks during these phrases, and its instruments stay mainly below the songbirds' register. Desert, bare alpine, open-sea and Thalmagar regions do not borrow these calls; night, indoor rooms, training and combat do not emit the daytime songbird layer.

These calls are ambience sketches, **not accurate species recordings or proof of a nearby rendered bird**. They award no sightings, journal entries or campaign rewards. Tower residents keep their visual species identities; species-specific calls and a listening/observation journal remain a later nature pass. Replace the sketches with curated, licensed, species-correct recordings and bind them to actual bird positions before using sound for identification. No music notes should masquerade as a journal clue.

## Implementation and review

- `src/world/audio/stillroom-score.js`: chamber motif, four duel arrangements and two result cadences. The duel mix is reduced to leave room for combat feedback; no combat-effect volumes are changed.
- `src/world/audio/score.js`: authored phrases, scene choice, region eligibility and settings validation. No simulation imports.
- `src/world/audio/soundscape.js`: one lazy audio context, reused room reverb/filter/limiter, short look-ahead scheduling, explicit voice cleanup, maximum 40 transient voices. No timer loop, workers, fetched assets or renderer objects.
- `src/app/exploration/audio-host.js`: trusted gesture unlock, focus/visibility handling, launcher/pause controls and context binding. The current host updates it at most every 80 ms; audio timing uses the device clock, never the campaign clock.
- `tests/soundscape.test.js`: scene routing, quiet loading, independent preferences, bird/music balance, pause/focus, missed-frame handling and long-run cleanup.
- Native checks: `node scripts/launch.cjs --exploration --food-world --smoke-test --internal-review --music-checks`, or omit `--food-world` for ordinary Explore. Audio is muted at the native window during these checks. They verify live Web Audio, settings, focus, frozen tower time, and render the same synth through OfflineAudioContext.
- Review reel: `tests/artifacts/music-first-pass.wav` — tower at 0:00, morning country/birds at 0:17, combat at 0:38. The native report records finite samples, peak/RMS and voice budget; this is a technical validation and a listening reference for artistic review, not a claim that the final soundtrack is complete.

Stillroom verification: `node scripts/launch.cjs --exploration --combat-testing --smoke-test --internal-review --trial-music-checks` checks live music through all ten opponent selections, Help, retry, victory, defeat, mute and focus. `tests/artifacts/stillroom-music-pass.wav` is an 80-second listening reel: mist at 0:00, early duel 0:10, bass 0:30, horn 0:44, ogre 0:58, victory 1:10, defeat 1:15. Offline rendering also checks maximum volume for finite, unclipped samples. Model checks exercise a longer repeated-round run and cleanup. These are technical checks; musical taste still needs listening feedback.

## Expanded arrangements (October 22)

The six recurring pieces now contain eight connected sections rather than a
single 18–35 second phrase. Each moves from a spare introduction through its
main theme, an answering melody, a breathing passage, changed harmony, a low
countermelody, a returning theme and a final cadence. Subsequent performances
vary voicing and the returning melody. Short result cadences remain short.

| Piece | Music before the final rest |
| --- | --- |
| The Still Hours | 3:56 |
| Along the Lizeem | 3:20 |
| Under the Quiet Sky | 4:42 |
| Two Banks, One River | 2:21 |
| Mist Without Hours | 4:29 |
| A Measure of Courage | 2:54 |

`src/world/audio/longform-score.js` owns the longer compositions. The runtime
keeps a position for each piece, so pausing, muting or briefly entering combat
does not repeatedly restart its introduction. Duel difficulty changes can
replace the instrumentation at the current musical position. Birdsong retains
its independent volume, space in the arrangement, and music ducking.

Run the existing native music check with `--extended-music` to render all six
complete pieces through the same synth at maximum volume. The listening files
are `tests/artifacts/music-expanded-{tower,country,night,battle,stillroom,duel}.wav`;
`music-expanded.json` records sample validity, peak/RMS, and voice usage. They
are review artifacts, not additional game downloads. This pass rendered all
six without clipping, using at most 14 of the 40 allowed transient voices.

These remain synthesized compositions. The render checks establish technical
correctness; the listening files are available for musical feedback.
Species-accurate bird recordings remain separate future work.

## Chapter 2 regional themes

Yunethre adds four original compositions without replacing the existing Minora,
tower, Sky Lookout or Chapter 1 music. Each develops over eight sections with a
main melody, an answer, contrasting harmony and a final cadence.

| Place | Piece | Character | Music before the final rest |
| --- | --- | --- | --- |
| Laketown | A Table Beside the Lake | Lilting plucked strings and a reed answer in G major | 3:15 |
| Centaur camp | Hooves upon the Open Grass | Dorian reed melody with a gentle uneven pulse | 2:49 |
| Celder | The Oath at Canerd | Restrained B-minor horn melody over bowed fifths | 3:20 |
| Yunethre countryside | Beyond the Familiar Road | Spacious A-minor traveling melody | 4:01 |

`src/world/audio/yunethre-score.js` owns the pieces and the pure
`yunethreMusicArea({regionId, position, inside, town, centaurs}, previous)`
selector. The chapter host supplies the actual speaker positions, avoiding a
terrain import into the audio system. Settlement music begins within 72 metres
and persists until 94 metres, so pacing along a boundary does not keep changing
the piece. Celder covers its two chapter regions; other Yunethre locations use
the countryside theme. Indoors and outside the chapter return no regional cue.

The host passes that result as `musicArea` in the ordinary soundtrack context.
Loading, pause, focus, combat and tower priorities remain in `soundScene`.
Regional changes crossfade over 2.4 seconds and keep each piece's musical
position for a later return. Music uses audio-device time, independent of the
chapter deadline or autoplay speed. Existing mute and volume controls apply.

`tests/soundscape.test.js` covers spatial hysteresis, scene priorities, distinct
melodies, crossfade overlap, resumed positions and bounded voice cleanup.
`src/dev/checks/music-smoke.js` can render each complete piece with
`renderPreview({track: 'yunethre-town'})` (or `yunethre-centaurs`,
`yunethre-celder`, `yunethre-wilds`). The review WAVs live in
`tests/artifacts/music-yunethre-*.wav`, with technical results in
`tests/artifacts/yunethre-music.json`; they are not runtime downloads.
All four complete pieces rendered through Chromium's OfflineAudioContext at
maximum music volume with finite samples, peaks between 0.213 and 0.247, and
at most 11 simultaneous voices. These checks verify sound output and headroom;
the WAVs remain available for musical feedback.
