# Bear quests: implementation and validation

26 September 2026

Kayla now offers **The Honey Race** outside Ambron's east gate. The player rides and steers her against the existing Ed the Chameleon on a unicycle, along the road to the prophet's crossroads. Winning awards three honeycombs once. Losing permits a physical ride back for another attempt.

The unnamed **Bear cub** offers **A Cub's Share** beside the Drent river crossing into Pueth. It teaches Stealth and asks for a specific comb stolen from Liz's apiary. Liz patrols visibly; detection triggers a casting warning and ten bee swarms. Escape allows another attempt, and defeat uses normal checkpoint recovery. Liz pauses the apiary lesson to welcome her cat home and offer that quest's reward.

Kayla walks back to her cub after the race. Both quests can be completed in either order. They begin roaming together only after both rewards and their physical reunion. Injuries, deaths, quest items, race progress, and family progress persist through checkpoints.

**F8 → Quest playtests** now contains separate **Kayla** and **Bear cub** autoplay cards. These use ordinary movement, dialogue, and interactions after their initial setup teleport; the normal adventure save remains unchanged. Manual input takes control, and **P** resumes the focused quest.

Liz's cat is now **Olive** in dialogue, quest objectives, notifications, the journal, and testing tools. Stable actor and save identifiers remain unchanged, preserving existing progress.

## Verification

Native Electron runs were sequential, with isolated profiles and saves:

| Run | Result |
| --- | --- |
| `npm run test:bear-quests` | 40 checks passed: both actual autoplay runs, pause, mounted and carrying checkpoints, rewards, physical reunion, ten visible swarms, escape, defeat, and checkpoint recovery. No frame errors. |
| `npm run test:liz:autoplay` | 37 checks passed: Olive walks home, the reward remains a choice, Animal Sorcery is learned, checkpoints work, and the unfinished cub lesson coexists with Liz's errand. No frame errors. |
| `npm run test:kayla` | 16 checks passed: invitation, peaceful refusal, strong self-defense, persistent health, and corpse restoration. |
| `npm run test:testing-tools` | 75 checks passed: all six quest cards, main-story jumps, travel, hacks, normal-save isolation, and teleporting out of an active race without being pulled back. |

Focused Node checks passed for the new quest state machines, actual-world routes and autopilots, family movement, bee damage and visuals, checkpoint validation, Kayla combat, Liz/Olive behavior, and prompt priority. Screenshots were reviewed for the mounted race, unicycle, cub, and ten swarms. The web build passed.

The broader suite audit was **partial**, covering 105 files and 817 tests before it was stopped. It initially found four failures. The introduced prompt-priority regression was fixed and all six tests in that file then passed. Three failures remain in unchanged pre-existing code:

- Two assertions in `tests/long-road.test.js` disagree with the existing Fernway troupe camp coordinates.
- One assertion in `tests/salt-sultan.test.js` finds the existing Sultana berth overlapping the Solis north pier.

This is not a claim that the full repository suite passes. Machine-readable native results, screenshots, and the partial-audit classification are in the ignored `tests/artifacts/` directory.
