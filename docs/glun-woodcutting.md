# Glun's optional woodcutting lesson

Glun can demonstrate Woodcutting independently of the main combat/cartography lesson. It uses the nearest existing Koopwood pine and ordinary woodcutting rules, so learning elsewhere remains valid and nothing resets existing XP.

Flow: accept the offer; follow Glun north to the pine; watch three axe swings; borrow his bronze hatchet to cut one real log; speak to Glun again to keep the hatchet. The borrowed tool is available only to the practice step, and the permanent inventory reward is handed over only after successful practice and the final conversation. Missing cuts or chopping a different tree do not complete the exercise. An already owned hatchet does not block completion or duplicate the item.

The pure controller in `src/glun-woodcutting.js` owns this flow and a versioned save. The host owns Glun's walking route, temporary axe model and chopping pose. It sends `arrive()` only when Glun and the player are at the demonstration tree. `update()` pauses the demonstration for menus, a distant player or a tree that is still a stump; `glun-wood-swing` events drive visible chips and sound. The tree remains available for the player's own cut. The successful output of ordinary `wood.swing` is passed to `noteSwing`, so normal logs, XP, felling and regrowth are used.

The lesson neither advances a chapter nor blocks leaving for Nothom. After completion, Glun's reminder explains that pines give practice, logs can fuel fires or be sold to Bowden, and better axes and trees require higher levels.

Validation: `node --test --test-isolation=none tests/glun-woodcutting.test.js tests/woodcutting.test.js`. Native integration should verify walking, visible axe replacement, three demonstration swings, the player's real cut and the final inventory reward.
