# Guided fishing outings

Glun, Mark and Jean offer a walk to Willowmere. Stanley uses the small Avrel farm pond. These are optional, repeatable outings alongside their other lessons. A single teacher leads at a time; another outing can begin once that teacher has returned home.

The teacher follows authored dry approach points with the existing NPC navigator, waits when the player falls more than 11 metres behind, and resumes within 7 metres. Menus, pause, combat and competing scripted duties suspend the lesson. A dead teacher cannot continue. The four-second demonstration uses the teacher's own rod, line and float. The player then casts with F at the ordinary fishing bank and reels with F after the bite. Only a successful catch at the selected pond, near the teacher, completes the exercise. The teacher returns along the approach afterward; leaving early is also offered in conversation.

Fishing knowledge, catch history and XP remain in the existing shared Fishing model. Another teacher never resets them, and the introduction grants a fishing rod only when one is missing. The real fishing system awards catch XP and the fish. The outing itself does not manufacture a catch or an extra XP payment. The bank remains more than talk range from the teacher so the F fishing interaction is available.

The optional checkpoint field is fishingLessons (version 1): teacher, stage, demonstration time, physical position, route waypoint, waiting flag and completed teacher IDs. Existing saves without the field start with no active outing. Load restores the guide's position without restarting the lesson. Character rods are built lazily when a teacher first demonstrates, preserving ordinary NPC geometry budgets.

Native checks: --fishing-lesson-checks exercises Jean and Stanley through ordinary dialogue, physical movement and actual F casts. Unit tests cover all four routes against the built world, catch validation, repeat teaching, pause/wait, death, checkpoint migration and teacher rod geometry. Visual review fixtures are fishing-lesson-glun, fishing-lesson-mark, fishing-lesson-jean and fishing-lesson-stanley.
