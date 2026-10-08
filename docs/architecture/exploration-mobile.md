# The exploration host on a phone

On 8 October 2026 the shared exploration host (`index.html`, and with it the **Lizeemi War Scenario**) became playable on a phone: touch controls, a phone-sized HUD, a campaign map that pinches and pans, and a lighter default renderer. The adventure's own phone layer (26 September 2026, `src/ui/input/touch-controls.js`) is reused, not copied.

## What a phone player gets

The touch layer appears on a touch screen (`(pointer: coarse)`) or with `?touch=1`; `?touch=0` turns it off. While it is up, the keyboard help line is replaced by a short touch line that fades after a few seconds and returns whenever its advice changes.

| On screen | Does | Key it presses |
| --- | --- | --- |
| Stick (left thumb) | Walk, ride or fly in the stick's exact direction; pushed to the rim, run or canter | WASD and Shift (see below) |
| A finger anywhere else on the view | Turns the camera; two fingers pinch it closer or further | (right-drag, wheel) |
| **Use** | Talk to Taleth, Bear, the council and residents; use doors; join a marked battle | F |
| **Ride** | Mount or dismount your horse; land a developer mount | G |
| **Call** | Whistle your horse over | H |
| **Jump** | Jump (held: climb while flying) | Space |
| **Run** | Run or canter until tapped again | Shift |
| **Map**, **Save**, **Pause** (top row) | The campaign map, a save, the pause menu | M, F5, Escape |

In a field skirmish the buttons change to **Strike** (X), **Dodge** (Space; hold the stick for its direction, as Space plus a direction on a keyboard), **Target** (T, lock the nearest) and **Withdraw** (Escape) in the top row. Tapping the view also strikes there, as a left click does. Menus, cards, the map and loading screens hide the whole layer, so a card is never under the thumbs.

The Developer (F8) button is hidden on a phone unless the address has `?dev`.

## How it works

- `src/ui/input/touch-controls.js` builds the stick, the buttons and the top row. A host can now pass its own `actions` and `top`; an entry with `when` shows only while `setContext` names one of its contexts. The adventure's defaults are unchanged.
- `src/app/exploration/exploration-touch.js` is the exploration host's adapter. Its buttons press the keys the host already reads, as real `keydown`/`keyup` events on the document; a quick tap is held for at least 90 ms (`MIN_HOLD`) so that the skirmish, which reads the `keys` set on its fixed tick, sees it. Once a frame, `sync(mode)` writes the stick into that same `keys` set as the nearest of eight directions (plus Shift), so walking, riding, flying and the skirmish need no touch code of their own. For travel, `steer(keys, yaw)` swaps those keys for straight ahead along a heading turned by the stick's angle, which the movement code turns into exactly the stick's direction. `createLookDrag` handles the view's pointers: the right mouse button as before, any finger on a touch screen, and a second finger for a pinch. `touchHelpText` rewrites the keyboard help line in a thumb's terms.
- `src/app/exploration/exploration.js` has four insertion points, each with a dated comment: the quality choice before the renderer and camera; the adapter's creation after the movement and mounts; `touch.sync(mode)` at the top of `step` and `...touch.steer(keys, yaw)` in the travel step; and the canvas pointer handlers, which ask `touch.look` whether a pointer looks and by how much. The test API's `state()` reports `quality` and `touch`.
- `src/ui/map/world-map.js` lets a second finger pinch the chart, keeping the atlas point between the fingers under them; the finger left behind carries on panning. Mouse dragging and the wheel are unchanged.

## The phone layout

`src/app/exploration/exploration-phone.css` is loaded last, so a phone rule wins a tie with the desktop rule it replaces. A phone is at most 480 px wide, or a landscape phone at most 960 by 480 px (`PHONE_QUERY` in `exploration-touch.js`; a Pixel 7 on its side is 915 by 412).

- **Upright:** the title, region and war day sit small at the top left and the Map, Save and Pause row at the top right. Down the right are the smaller minimap (96 px) and the Fireball spell; the tracking panel sits beside the minimap. From the thumbs up are the touch line, the prompt for what Use would do, and the war report.
- **On its side:** the title and the tracking panel run down the left, the war report sits in the middle and the minimap and spell run down the right, with both bottom corners kept for the thumbs.
- Cards (Taleth, Bear, the council, residents, the Reaper, the battle choice) span the width and have tall buttons. The field skirmish card is compact at the top and scrolls its result and help inside itself.
- The campaign map fills the screen. The chart pinches and pans, and its zoom buttons and the campaign's day, Run, +1 day and speed controls are large buttons at the bottom.
- The start menu stacks its four cards with the war first. The canvas has `touch-action: none`, the page uses `viewport-fit=cover` with safe-area insets, and nothing scrolls sideways.

## Quality

`src/app/exploration/exploration-quality.js` chooses `phone` on a phone layout or any touch screen and `full` otherwise; `?quality=full` or `?quality=phone` overrides the guess. The exploration host already capped the pixel ratio at 1.5 and has never drawn a shadow map. A phone also turns antialiasing off and pulls the far plane from 1800 m to 600 m, just past the end of the open-air fog at 560 m, so nothing visible is lost. Scenery residency is unchanged. On `phone` quality the console logs `EXPLORATION_FRAMES {...}` once a minute with the frame count, frames per second and the median, 95th-percentile and worst frame times in milliseconds. This is a development aid and is not shown in the HUD.

## Testing

- **On a desktop:** open `index.html?touch=1` (add `&quality=phone` to see the phone renderer) in a narrow window or in the browser's device mode. Touch emulation in device mode drives the stick and the look with the mouse.
- **Node:** `node --test tests/exploration-touch.test.js` covers the action set against the keys the host and the skirmish read, held taps, contexts, the stick-to-keys mapping, exact steering through the real movement code, the look and pinch, the phone flag from a stubbed `matchMedia`, the quality choice and the frame log. `tests/touch-controls.test.js` still covers the adventure's layer.
- **Headless phone smoke:** the 8 October 2026 smoke is kept outside the repository with the other render tooling. It drives Playwright's Pixel 7 descriptor (touch, mobile) at 412 by 915 and 915 by 412 through Chrome's own touch events (CDP `Input.dispatchTouchEvent`). It opens `index.html?war=1&test=1&menu=1` and taps **Lizeemi War Scenario**. It then walks to Taleth with the stick and taps Use, leaves by the door, walks 20 m, drags the view, takes Bear's horse and rides, pinches and pans the map, runs the campaign to day 2, tracks the war report, pauses, and plays a practice skirmish with the stick, Dodge, Strike and Withdraw. It turns the phone and repeats the HUD, map, pause and skirmish checks, then runs the Minora to Ovesos ride-and-defend autoplay to completion. At each step it checks bounding boxes so that no HUD element covers the stick, the buttons or the top row, and that the page never scrolls sideways. It fails on any console error.
