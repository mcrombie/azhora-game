# Visual Arts at the Sunken Lane

Sylvia is a kindly older painter outside her cottage in Drent, beyond the Avrel farms. The cottage stands at **(-505, 24)**, northwest of the Sunken Lane hedge banks. Sylvia paints at **(-505, 30.5)** with a brush and palette. Her green teacher marker offers an introduction to **Visual Arts**.

Drawing, painting and calligraphy share one skill in the journal's **Arts** category. Sylvia's introduction teaches the skill without awarding practice experience. Lessons are not exclusive: learning another teacher's skills does not close Sylvia's introduction.

The spare easel is at **(-500, 32)**; the clear working position is **(-500, 30.95)**. Approach it and press **F** to choose a study:

| Level | Study | Active time | Experience |
| --- | --- | --- | --- |
| 1 | Draw the old oak | 6 seconds | 18 XP |
| 2 | Paint the woodland light | 8 seconds | 24 XP |
| 3 | Practice a calligraphic greeting | 8 seconds | 24 XP |

The character puts away their weapon and shield, takes up the studio brush and palette, and works in the ordinary world. The interaction prompt shows progress. Press F again, move, fight, guard, swim or mount to interrupt; unfinished studies award no experience. Menus and pause freeze progress. Studies are repeatable, and materials remain at the studio.

The normal skills checkpoint stores the introduction and experience. An unfinished study is cancelled on reload; it never resumes or pays twice. No separate save section is required.

Validation: `tests/visual-arts.test.js` covers teaching, timed practice, interruption, pause, unlocks and saved skill progress. `tests/visual-arts-world.test.js` checks the built cottage/easels, collision clearance and actual brush-arm animation. `npm run test:visual-arts:desktop` exercises the real teaching and F-key UI, drawing frames, cancellation and checkpoint reload. The `sylvia` review view frames the cottage and painting scene.
