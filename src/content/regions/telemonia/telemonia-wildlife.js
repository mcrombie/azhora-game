/**
 * The animals of the Telemon highland, stage 1, as ranges for the western wildlife rigs
 * (`src/content/regions/western-regions/west-regions-life.js` draws them, instanced and distance-culled, and they are ambient: nobody
 * can attack, catch or speak to them).
 *
 * **The lore names no wild animal in Telemonia at all.** What it has is livestock - "the hill pastures
 * carry cattle and horses", the Telemon horse "a specific highland breed" - and every one of those is
 * the kingdom's, held through the band halls: stage 2's, and not here. So everything below is derived
 * from the two built neighbours that share this dry belt with it, the Oves Desert and Gala, and from the
 * fauna overview's East Pyros, whose rocky slopes are the far side of the western rim:
 *
 *  - the **dry-plateau hawk**, which "hunts the upland grasslands" of the eastern rain-shadow country
 *    and is densest on the rocky east-facing slopes of East Pyros - not an extension here, as it is not
 *    in the Oves Desert: this is its own country, riding the air over the western rim and the Rothkar;
 *  - the **upland hare** on the Galmeth's open bunch grass, as on the Oves's grass and Gala's steppe;
 *  - a **harrier** quartering the Galmeth, as over both neighbours' grass.
 *
 * **No boar in the Belketh, and that is a measurement.** Gala's maquis and the Ascarth hills' oak wood
 * both have boar, and the Belketh is the same kind of wood; but it stands on the rim's south-eastern
 * corner, on ledges between cliff bands, and the largest piece of ground in it a boar could stand and
 * turn on is about six hundred square metres - nowhere near the ninety metres a band needs behind it to
 * back off into (the west's law). Open for the user (docs/telemonia-stage1-report.md).
 *
 * **Nothing domestic**: no cattle, no horse, no sheep or goat. Every ground range carries the rig's
 * slope limit (`maxSlope`), so an animal that flees across the plain stops at a terrace wall rather than
 * walking up its face.
 */
const freeze = Object.freeze;
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: 'Telemonia', radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const TELEMONIA_WILDLIFE_ZONES = freeze([
  zone('telemonia-galmeth-hares', 'upland-hare', .3, [-2052, -1922, 1180, 1362], [[-1990, 1300], [-1968, 1318], [-2004, 1326], [-1978, 1282]],
    'Extension, from both neighbours: the Ganoss upland hare, the hare the west already has, on the Galmeth’s open bunch grass in its south-eastern corner, clear of the rock and the washes - the same short open ground it keeps on the Oves’s grass and Gala’s steppe across the border. The plain is open ground until stage 2 farms it.',
    { maxSlope: .6 }),
  zone('telemonia-galmeth-harrier', 'harrier', .3, [-2080, -1930, 1180, 1340], [[-2000, 1262]],
    'Extension, from both neighbours: the Oves and Gala each have a harrier over their grass, and the Galmeth is a plain of bunch grass inside a ring of rock. It quarters low over the plain east of the rock rather than soaring, following the ground at nine metres.',
    { air: 9, circle: 32, period: 19, quarter: 60, bob: 1.6, follow: true }),
  zone('telemonia-rim-hawk', 'plateau-hawk', .3, [-2360, -2220, 1220, 1380], [[-2292, 1300]],
    'The fauna overview’s dry-plateau hawk, which "hunts the upland grasslands" of the eastern rain-shadow country and reaches its densest concentrations on the rocky east-facing slopes of East Pyros - the far side of this rim. Not an extension: this is the bird’s own country, riding the air over the western rim and the Rothkar.',
    { air: 34 }),
]);
