# Fire Making and Smithing in Tidehaven

Lee Anne stands beside the existing village fire ring. She has short blonde hair,
and her green teacher marker offers **Fire Making**, separately from Cooking.
The ring begins empty. Her optional lesson gives a tinderbox and two dry sticks
once; the player must use **F → Light fire** to finish. Lighting that first fire
teaches the skill and awards 18 experience. Later successful fires earn the same
experience, consume fuel, and burn down only while play advances.

Jojo keeps the cooking introduction. If the player has not learned Fire Making,
Jojo walks them from the landing to Lee Anne, waits if they fall behind, and waits
at the ring until their first fire is lit. The player then speaks to Jojo to learn
Cooking. Stanley also checks this prerequisite before teaching farm recipes.
Lee Anne does not grant Cooking or recipes. Cooking at any fire requires both
the completed Fire Making lesson and Cooking knowledge.

Fire Making has an optional version-1 checkpoint field containing the lesson
stage, one-time supplies flag, Jojo referral stage, and number of fires lit.
Older checkpoints with learned Cooking silently receive Fire Making knowledge;
their recipes and experience remain intact. New travelers receive no automatic
lesson. Existing fire fuel is still saved by campcraft.

Tidehaven's smith keeps his stable `tidehaven-smith` ID and shop, but is now
**Martin**, with cropped black hair and spectacles. He offers a green Smithing
introduction and can help repair the player's worn weapons. Actual repairs award
18 Smithing experience, both at Martin and ordinary repair benches, once the
skill has been taught. Repeatedly checking undamaged gear gives no experience.
The other named smiths and their stock are unchanged.

Focused tests cover fuel use, pause, repeat rewards, prerequisite checks for both
cooks, quiet save migration, model appearance, and the real world route from the
landing to Lee Anne. `runFireMakingChecks` additionally exercises the escort,
dialogue choices, fire interaction, first meal and checkpoint restoration through
the native renderer. The broad road-skills check begins with this prerequisite
as fixture setup so it does not repeat the same guided walk.
