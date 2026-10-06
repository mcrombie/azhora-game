# East Suval's closed frontier

The country remains closed. The existing army-road fort, two locked hill gates and the separately authorized smugglers' door keep their positions and quest behavior.

The surrounding border now alternates lower rock shoulders, tall needles, exposed limestone strata and stepped dressed-stone walls. Cliff footprints overlap continuously; changes in width, height and silhouette do not create gaps in the physical boundary. Talus is scattered in occasional fans rather than repeated beneath every rock.

Four narrow, winding cuts invite investigation from outside East Suval. Two end in collapsed rock; two reveal old iron-barred posterns after their final bend. They have no new NPCs or signs. Each has an open route back out, and its dead end is physically collidable before the region-entry restriction is reached. Ordinary trees and rocks are excluded from these approaches.

`SUVAL_FALSE_PASSES` in `src/content/regions/minora-frontier/frontier-ridges.js` is the shared authored route/obstruction plan. `src/content/regions/minora-frontier/frontier-ridge-works.js` draws that same plan. The original smugglers' door face and standing positions retain their established dimensions.

Validation in `tests/closed-border.test.js` samples every half metre of exposed land boundary, walks both player and horse widths into the existing gates, traverses every new approach in the built world, checks the false ends stop movement, and keeps the existing quest approach clear. The South Suval world checks also retain the old pass road and the new highland/cave routes.
