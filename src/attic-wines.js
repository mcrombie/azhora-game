/**
 * What Juan pours and sells at Tharganhom, the Wine Attic of Solis
 * (src/wine-attic.js). The house rule: nothing from West Suval. Every wine on
 * the shelves comes from somewhere the traveler has not been yet, and each is
 * one the lore names or describes (azhora_lore/culture/azhoran_viticulture.md
 * and svaleen_wines.md): the Svaleen peninsula's Enebreum, lake country and
 * eastern slopes, Amod's dry slopes above the Tarvel, Ascarth, West Pyros and
 * Bouén. Tasted properly, each one teaches the Wine skill (src/wine.js); bought,
 * each is a bottle in the satchel that can be drunk for a little health.
 * Pure data: no DOM, no three.
 */
const wine = (id, entry) => Object.freeze({ id, item: `wine-${id}`, ...entry });

export const ATTIC_WINES = Object.freeze({
  enbraleth: wine('enbraleth', { name: 'Enbraleth', colour: 'red', from: 'Enebreum, on the Svaleen plateau', xp: 20, price: 12, healing: 20,
    note: 'Nearly black. Blackcurrant, dried plum and something like warm iron from the plateau soil; a broad tannin that holds on long after you swallow.',
    pitch: 'Enbraleth, from the Enebreum plateau. The guild there says it keeps thirty years. I say it keeps thirty years if nobody knows where it is. Everybody knows where mine is. That is the problem with being popular.' }),
  imlaveleth: wine('imlaveleth', { name: 'Imlaveleth', colour: 'white', from: 'the lake country of Imlamdris', xp: 15, price: 9, healing: 15,
    note: 'Pale straw with a fine prickle of bubbles. Wet stone, green pear and lake air; bone dry.',
    pitch: 'Imlaveleth, from the Stillwater at Imlamdris. The vines by the lake make it a little fizzy, the vines on the hill do not, and those two villages have not spoken since before my grandfather. You are drinking the lakeside. Do not tell the hill.' }),
  dulannol: wine('dulannol', { name: 'Dulannol', colour: 'sweet', from: 'the lake country of Imlamdris', xp: 20, price: 14, healing: 25,
    note: 'Deep gold and slow in the glass. Honey, dried apricot and orange peel, with enough acid underneath that it never cloys.',
    pitch: 'Dulannol. They leave it on the vine until it rots. On purpose! The good rot. It goes to the desert by camel and the Moroshé pay for it in actual gold. You get it for fourteen copper because I like your face. Mira, I like everybody’s face. Still counts.' }),
  krevethil: wine('krevethil', { name: 'Krevethil', colour: 'white', from: 'the eastern slopes of the Svaleen peninsula', xp: 15, price: 8, healing: 15,
    note: 'Almost clear. Lemon, green apple and crushed shell; sharp enough to make you blink, and made for fish.',
    pitch: 'Krevethil. The side of the peninsula that looks at the sea all day. High acid. You drink this with a fish, the fish thanks you. You drink it without a fish, you go and find a fish. That is the whole speech.' }),
  'ostel-white': wine('ostel-white', { name: 'Ostel dry-slope white', colour: 'white', from: 'Ostel, above the Tarvel in Amod', xp: 15, price: 7, healing: 15,
    note: 'Pale and hard. Flint, bitter herbs and green almond; thin, clean and completely unapologetic.',
    pitch: 'Tela Anset’s white, from Ostel up in Amod. She told me I would not like it. Everybody tells you that about Ostel. Then you have it with goat cheese and walnuts, and a week later you are me, ordering it by the cart.' }),
  'avite-feast-red': wine('avite-feast-red', { name: 'Avite feast red', colour: 'red', from: 'Ascarth', xp: 20, price: 13, healing: 20,
    note: 'Opaque purple. Black cherry, smoke and pepper, and a heat that fills your chest. It is not a polite wine.',
    pitch: 'From Ascarth. The Avites do not drink wine, they drink wine at something: a feast, a funeral, a man coming home. They have a word for what it does to the room, keth. You pour this, the room changes. Watch. ... You see? Keth.' }),
  'pyros-ash-red': wine('pyros-ash-red', { name: 'Ash red of West Pyros', colour: 'red', from: 'West Pyros', xp: 20, price: 11, healing: 20,
    note: 'Garnet with a brick edge. Smoke, dried herbs and red plum, and a salty, stony finish from the old ash in the soil.',
    pitch: 'Volcano wine. A real volcano. West Pyros, grown in ash from eruptions nobody wrote down. The priests here put out statements about how the Pyrosi drink it. The Pyrosi do not read the statements. I love those guys.' }),
  'bouen-fog-white': wine('bouen-fog-white', { name: 'Bouéni fog white', colour: 'white', from: 'the Bouén peninsula, in the cold north', xp: 20, price: 10, healing: 15,
    note: 'Water pale. Sea spray, lime and wet grass, faintly saline, with an acid so bright it hums.',
    pitch: 'This one is Nika’s. From Bouén, all the way up where the fog sits on the vines all summer. One cask a year reaches Solis. I buy the whole cask. She pretends she does not care. Look at her. She cares.' }),
});
export const ATTIC_WINE_IDS = Object.freeze(Object.keys(ATTIC_WINES));
/** The satchel item for each bottle, and back. */
export const ATTIC_BOTTLES = Object.freeze(Object.fromEntries(ATTIC_WINE_IDS.map(id => [ATTIC_WINES[id].item, id])));
