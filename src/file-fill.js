/**
 * **The army fills your file** (the user, 2026-09-21, docs/design-answers.md).
 *
 * The hunter measured the border battle at level 2 across every kit a smith sells and every level
 * the game can give: a traveler alone, or with three companions, wins nought of forty in every
 * row, the absolute ceiling included, because eight soldiers land a blow every 0.3 s and a dodge
 * is affordable every 1.9 s. **Numbers on your side decide that fight, not gear.** Asked what
 * should happen to a traveler who arrives with too few, the user chose: it is the army's battle,
 * so the army makes up the number.
 *
 * The whole of the rule:
 *
 *   **One constant.** `FILE_FLOOR` is how many are wanted in the file. Fewer than that walking
 *     with him and his commander assigns the difference; six or more and nothing is added, so a
 *     player who gathered a company fights the battle exactly as it is today, to the digit.
 *   **Ordinary soldiers, of the side he signed with**, and the same ally kind the battle's own
 *     side allies already are. They are **trained a little** - `FILL_ARMS`, level 15 and toughness
 *     12 - and **strictly weaker than the weakest companion**, so friends still matter.
 *   **They are not companions.** No regard, no lessons, no journal line, no file behind him
 *     afterwards, no death card, nothing owed to the Marshal's register, and nothing saved. They
 *     exist for the length of one fight and are forgotten with it.
 *   **The army's battles only.** The border battle and the four days after it. Not wolves, not
 *     Mallec, not a raid: nobody assigns a traveler soldiers for a fight of his own.
 *
 * Pure: no DOM, no three, no world.
 */
import { BORDER_ENCOUNTER_ID } from './border-chapter.js';
import { AFTERMATH_VARIANTS, AFTERMATH_IDS } from './aftermath-chapter.js';

const freeze = Object.freeze;

/**
 * **How many are wanted in the file.** Six is where the hunter's measurement put the line: with
 * six companions the border battle is won every time in about eighteen seconds, and with three it
 * cannot be won at all. It is one number on purpose - the hunter is still measuring, and moving
 * it should be one edit and nothing else.
 */
export const FILE_FLOOR = 6;

/** The kind the battle's own side allies already are, so the fill is not a different creature. */
export const FILL_KIND = 'legionary';

/**
 * **The assigned men are trained a little** (the user, 2026-09-21, docs/design-answers.md).
 *
 * They used to carry nothing of their own, which made them the ally kind's plain ninety health,
 * and the hunter measured what that was worth: a lone traveler with six of them won the border
 * battle **21 of 40** at half health, with **five runs in forty still going at the two-minute
 * cap** - a stalemate in a battle the chapter expects to last half a minute. The hunter drove both
 * levers over forty seeds a row (docs/known-issues.md, "the lever that would remove it"):
 *
 * | the assigned man is | won | health | assigned dead | stalemates |
 * |---|---|---|---|---|
 * | plain 90 | 21/40 | 50 % | 6.0 of 6 | **5** |
 * | level 10 / toughness 8 | 28/40 | 58 % | 6.0 of 6 | 0 |
 * | **level 15 / toughness 12** | **32/40** | **59 %** | **5.9 of 6** | **0** |
 * | level 20 / toughness 17 (= Altun's own) | 34/40 | 61 % | 5.8 of 6 | 0 |
 * | level 40 / toughness 34 (= Jerry's) | 40/40 | 94 % | 3.1 of 6 | 0 |
 *
 * **Fifteen and twelve** is the row the user took: it keeps six men and keeps the cost - 5.9 of the
 * 6 still die - it removes every stalemate, and it leaves the traveler at 59 % health having done
 * all of the fighting himself. And it keeps an assigned stranger **strictly weaker than the weakest
 * companion**, which is the whole of what this module is for: Altun is level 20 / toughness 17, and
 * giving the fill 20/17 would make a man the army handed you exactly as good as a man who chose to
 * walk with you. That law is pinned in tests/file-fill.test.js against `MERCENARY_ARMS` itself, so
 * a future companion weaker than Altun trips it rather than passing quietly.
 *
 * Levels are the only thing here: nothing about any fight's own level moves.
 */
export const FILL_ARMS = freeze({ level: 15, toughness: 12 });

/** The army's battles: the border, and every day after it. Nothing else fills anybody's file. */
export const ARMY_BATTLE_IDS = freeze([BORDER_ENCOUNTER_ID,
  ...AFTERMATH_IDS.map(id => AFTERMATH_VARIANTS[id].encounterId)]);
export const isArmyBattle = id => ARMY_BATTLE_IDS.includes(id);

/**
 * What each side's ordinary soldier looks like and is called. Both are lifted from the men the
 * chapter already puts on the field beside him (`BORDER_NPCS`, `borderAllies`), because a man the
 * army assigns you is one of the men the army has, not a new kind of person.
 */
export const FILL_LOOK = freeze({
  empire: freeze({ name: 'Soldier', model: freeze({ role: 'legion-soldier', tunic: 0x8f3b30 }) }),
  coalition: freeze({ name: 'Valley company', model: freeze({ role: 'suvali-guard', tunic: 0x55636f }) }),
});

/**
 * How many the army puts in beside him: the floor, less whoever is already walking with him, and
 * never more than the room the fight has left. Nothing is added to a full file, and nothing is
 * ever subtracted from one.
 */
export function fillCount({ walking = 0, room = Infinity, floor = FILE_FLOOR } = {}) {
  const have = Math.max(0, Math.floor(Number(walking) || 0));
  const want = Math.max(0, Math.floor(floor) - have);
  const space = Number.isFinite(room) ? Math.max(0, Math.floor(room)) : want;
  return Math.min(want, space);
}

/**
 * The men themselves, without places: the host stands them in the file exactly where it stands
 * the companions, because the file is what is being filled.
 */
export function fillFor({ side = 'empire', walking = 0, room = Infinity, floor = FILE_FLOOR } = {}) {
  const look = FILL_LOOK[side] ?? FILL_LOOK.empire;
  return freeze(Array.from({ length: fillCount({ walking, room, floor }) }, (_, index) => freeze({
    id: `file-fill-${index + 1}`, name: look.name, kind: FILL_KIND,
    level: FILL_ARMS.level, toughness: FILL_ARMS.toughness,
    model: { ...look.model },
  })));
}

const plural = count => (count === 1 ? 'one' : count === 2 ? 'two' : count === 3 ? 'three'
  : count === 4 ? 'four' : count === 5 ? 'five' : String(count));

/**
 * What his commander says about it, and **only when it is actually happening**. Two short lines
 * each, in the voice of the man who already gives him the word before that battle - Captain Oswin
 * Brulan of the army's left, or Captain Arlen Voss of the Lauvel companies - and truthful about
 * the number, because a man who is told three and given one has been lied to by a game.
 */
export function fillLines(side, count) {
  const many = Math.max(0, Math.floor(Number(count) || 0));
  if (!many) return freeze([]);
  const them = `${plural(many)} of ${side === 'coalition' ? 'the valley companies' : 'mine'}`;
  return side === 'coalition'
    ? freeze([`You are short of men, so ${them} go in with you. They farmed next to each other; they will stand next to each other.`,
      'They are not your hired swords and they will not fight like them. Keep them on your shoulder and they will keep the flank off you.'])
    : freeze([`Your file is thin, so ${them} go in with you. Line soldiers, on my order, and they are yours until the field is quiet.`,
      'They are not what a paid company is. They will hold a line, which is what a line is for.']);
}
