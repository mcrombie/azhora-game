/**
 * How hard every country on the atlas is, 0 to 11. One table, read by the region card, by the
 * cartography journal, and by whatever comes to decide what lives in a region.
 *
 * It is docs/difficulty-ladder.md turned into data, and that file is the argument: seventy-four
 * regions were levelled in the spoken brief (docs/original-brief.md) with its contradictions
 * resolved, and the other fifty-seven placed from their neighbours on the atlas, the lore, and the
 * brief’s own rules of thumb. All 131 regions of assets/azhora-dev-regions.json are here, under
 * the atlas’s own spellings; the Cold Stones are the one row the ladder leaves open, at the 9 it
 * proposes. Level 11 is the hidden island, which is not on the atlas and so is not in the table.
 *
 * The player never sees the number on the HUD. The region card gives the words on first entering;
 * the number appears only in the cartography section of the journal, and only once the region is
 * charted, because finding out how dangerous a country is, is part of charting it.
 *
 * Pure: no DOM, no three, no atlas.
 */

/** What a region card says in place of the number. Level 11 has no words: it is not meant to be found. */
export const LEVEL_WORDS = Object.freeze([
  'A quiet country', 'Mind the road at night', 'A troubled country',
  'A hard country', 'A dangerous country', 'Wild country',
  'Go armed, and not alone', 'The mountains keep their dead', 'The dark lord’s shadow',
  'Few return', 'None return',
]);

/** Every region of the atlas, by the name the atlas gives it. */
export const REGION_LEVELS = Object.freeze({
  // 0 · A quiet country — the tutorial and the heartland
  'Drent': 0, 'Elagos': 0, 'West Izol': 0,
  // 1 · Mind the road at night — wolves, and goblins who keep to the trees
  'East Izol': 1, 'Luscia': 1, 'Meneth': 1, 'Peblos': 1, 'Pueth': 1, 'Vastos': 1,
  // 2 · A troubled country — a war on, or bandits on the road
  'Amod': 2, 'Caricas': 2, 'East Suval': 2, 'Eer': 2, 'Feradom': 2, 'Hama': 2, 'Marosh': 2, 'Moros Plain': 2,
  'Nesdor': 2, 'Southern Ascarth': 2, 'West Suval': 2,
  // 3 · A hard country — rebels, hill goblins, the first orc scouts
  'Alezhor': 3, 'East Lotharn Mountains': 3, 'East Pyros': 3, 'Gala': 3, 'Ganesh Plain': 3, 'Isareos': 3,
  'Iscare Archipeligo': 3, 'Legemum': 3, 'Nether Desert': 3, 'Nethereum': 3, 'North Meroshe Desert': 3, 'Ovesos': 3,
  'Selemi': 3, 'South Celder': 3, 'South Ibenal': 3, 'South Mithala': 3, 'South Suval': 3, 'Telemonia': 3,
  'Trogo': 3, 'West Mithala': 3, 'West Pyros': 3, 'Yunethre': 3,
  // 4 · A dangerous country — orcs with a purpose
  'Aurumlis Archipeligo': 4, 'Babon': 4, 'Central Meroshe Desert': 4, 'East Ibenwood': 4, 'East Mithala': 4,
  'Ganesh Desert': 4, 'Navarth': 4, 'North Celder': 4, 'North Ibenal': 4, 'North Ibenwood': 4, 'North Mithala': 4,
  'Northern Ascarth': 4, 'Oves Desert': 4, 'South Ibenwood': 4, 'South Meroshe Desert': 4, 'West Ibenwood': 4,
  'West Lotharn Mountains': 4, 'West Meroshe Desert': 4,
  // 5 · Wild country — country that does not care whether you come back
  'Acor Wetlands': 5, 'Azhor Stones': 5, 'Cape Heth': 5, 'Central Ibenwood': 5, 'Dinelv Highlands': 5,
  'East Acordwood': 5, 'East Endevor': 5, 'Henborth': 5, 'North Acorwood': 5, 'South Acordwood': 5,
  'South Endevor': 5, 'South Oremindi Mountains': 5, 'West Acorwood': 5,
  // 6 · Go armed, and not alone — the near mountains, and the far north’s farms
  'Central Lond': 6, 'East Ganun': 6, 'East Lond': 6, 'East Oremindi Mountains': 6, 'Lesser Oremindi Mountains': 6,
  'Narcosh': 6, 'North Endevor': 6, 'North Ganun': 6, 'North Lond': 6, 'North Nonoth': 6,
  'North Oreminidi Mountains': 6, 'Qadwaaqaad': 6, 'Saxrul': 6, 'South Ganun': 6, 'South Lond': 6, 'South Nonoth': 6,
  'West Endevor': 6, 'West Ganun': 6, 'West Lond': 6,
  // 7 · The mountains keep their dead — the high passes, the cold sea, the jungle ring
  'Anubrul': 7, 'Cudon': 7, 'East Inseld': 7, 'Haatrul': 7, 'Maanub': 7, 'Maawad': 7, 'North Riesov': 7,
  'Noth Hills': 7, 'Nothwood': 7, 'Nuurat': 7, 'Rihas': 7, 'Riwaad': 7, 'Sabrqad': 7, 'South Riesov': 7,
  'South Thoth': 7, 'West Inseld': 7, 'West Oremindi Mountains': 7,
  // 8 · The dark lord’s shadow — the cape, and what the cape reaches
  'Barqat': 8, 'Cape Thalmagar': 8, 'Central Thoth': 8, 'East Baldro Mountains': 8, 'North Thoth': 8, 'Qadmar': 8,
  'Saxhan': 8, 'South Orsa': 8,
  // 9 · Few return — the Gorgi and the Scythe
  'Cold Stones': 9, 'East Gorgi Mountains': 9, 'East Witherst': 9, 'Eshtor Plateau': 9, 'North Orsa': 9,
  'Orgmala': 9, 'South Scythe': 9, 'Waahaat': 9, 'Waahan': 9, 'West Baldro Mountains': 9, 'West Gorgi Mountains': 9,
  'West Witherst': 9,
  // 10 · None return — the orcs’ homeland and the mountain island
  'North Gorgi Mountains': 10, 'North Scythe': 10,
});

/** The level of a region, or null for a name the atlas does not have. */
export const regionLevel = name => (Object.hasOwn(REGION_LEVELS, name) ? REGION_LEVELS[name] : null);

/** What the region card says for a level, or null where there is nothing to say. */
export const levelWords = level => (Number.isInteger(level) && level >= 0 && level < LEVEL_WORDS.length ? LEVEL_WORDS[level] : null);

/** How many regions sit at each level: the shape of the world’s danger, for tests and for the journal. */
export const LEVEL_COUNTS = Object.freeze(Object.values(REGION_LEVELS).reduce((counts, level) => {
  counts[level] = (counts[level] ?? 0) + 1; return counts;
}, {}));
