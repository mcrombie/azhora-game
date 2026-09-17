/**
 * The mercenary company: twelve hired swords, the traveler among them, called
 * from abroad by the Ambroni Empire and mustering at the Legion's camp on the
 * Moros Plain. One landed beside the traveler; ten more arrive over the hours
 * that follow and walk the same road, pausing where the traveler paused, so a
 * brisk traveler stays first and a slow one is overtaken. All of it is a pure
 * function of play time, so nothing but the clock needs saving.
 */
export const MERCENARY_COMPANY_SIZE = 12;

const merc = (id, name, origin, arrival, departs, pace, look, lines) => Object.freeze({ id: `merc-${id}`, name, origin, arrival, departs, pace, look: Object.freeze(look), lines: Object.freeze(lines), ...MERCENARY_STYLES[id] });

/** Each man fights his own way; his weapon is modelled, and he will explain it. `trades` says whether he swaps his weapon for the traveler's sword. */
export const MERCENARY_STYLES = Object.freeze({
  brannock: Object.freeze({ weapon: 'sword', style: 'The sword, same as yours', trades: true, styleLines: Object.freeze(['You and I carry the same blade, so listen: three cuts in a row, each heavier, and the third lands hardest. Keep your stamina for a step aside when the amber tell shows; a swing you cannot finish is worse than none.', 'Iron wears. Find a bench and mend it before the edge goes, and carry a stick for when it does. That is the whole art, and men die for want of it.']), tradeLine: 'Same blade as mine. There is no trade in that.' }),
  tesk: Object.freeze({ weapon: 'bow', style: 'The bow', trades: false, styleLines: Object.freeze(['I do not wait for the amber tell; I put an arrow in it at thirty paces. A bow needs room and light. In the woods I am a man with a stick.', 'Against archers, close the ground fast and never walk straight at them. Every archer you meet will try to keep a field between you.']), tradeLine: 'Trade the bow? A sword cannot reach thirty paces. No.' }),
  oru: Object.freeze({ weapon: 'mace', style: 'The mace', trades: true, styleLines: Object.freeze(['A mace does not cut; it breaks. Slow to raise, and there is no third strike in me, but one blow through a helmet ends the argument.', 'When a maceman winds up, do not block; be somewhere else. It comes down slower than a sword and it does not stop.']), tradeLine: 'My mace for your sword? I miss having an edge. Straight swap, if you mean it.' }),
  halvard: Object.freeze({ weapon: 'dagger', style: 'The dagger', trades: true, styleLines: Object.freeze(['Short reach, no reach at all, and I like it that way. I step inside a swing where the long weapons are useless and put the point in twice before they recover.', 'A dagger is beaten by keeping your distance. Nobody keeps their distance.']), tradeLine: 'Your sword for my dagger? You would be trading down, and I would be trading up. I accept.' }),
  dain: Object.freeze({ weapon: 'axe', style: 'The axe', trades: true, styleLines: Object.freeze(['The axe hooks: a shield rim, a spear shaft, a knee. Heavier than your sword, and it bites deep on the second swing.', "Against an axe, watch the shoulder. It goes back before the cut comes, longer than a sword's, and that is your moment to step in or out."]), tradeLine: 'The axe for the sword? Aye. My arms are tired of it. Swap.' }),
  cassel: Object.freeze({ weapon: 'spear', style: 'The spear', trades: false, styleLines: Object.freeze(['Two paces of ash between me and anything with teeth. Thrust, recover, thrust; I never let a goblin inside the point.', 'If a spearman gets his point on you, go left or right, not back. Back is where he wants you.']), tradeLine: 'The spear stays with me. A spearman without a spear is a farmer.' }),
  pell: Object.freeze({ weapon: 'spears', style: 'Two spears, one to throw', trades: false, styleLines: Object.freeze(['Two spears: a medium one for the line and a short one I throw. The throw is the trick. The first thing you see of a fight with me is a spear in your leg.', 'When a man carries more than one spear, count them. He will not close until he has thrown the short one.']), tradeLine: 'I need both spears, and you would not know what to do with either.' }),
  yorvo: Object.freeze({ weapon: 'pike', style: 'The long spear', trades: false, styleLines: Object.freeze(['Nothing reaches me before I reach it. The long spear rules open ground and is worthless in a doorway.', 'On the Moros there are no doorways. If you ever face a wall of these, get to the side of it; the front is a hedge of points.']), tradeLine: 'Trade a pike for a sword? Then who holds the line? No.' }),
  anselm: Object.freeze({ weapon: 'sword-shield', style: 'Sword and shield', trades: true, styleLines: Object.freeze(['Sword and shield: I take the first blow on the boards and answer over the rim. Slower than you, harder to kill.', 'Against a shield, feint high and cut the legs. Legion soldiers fight this way; remember it if the contract ever turns.']), tradeLine: 'Your sword for mine? Like for like is no trade. Keep yours.' }),
  kest: Object.freeze({ weapon: 'greatsword', style: 'The greatsword', trades: true, styleLines: Object.freeze(["Two hands, one edge, and everything within a cart's width. The great blade is slow to start and impossible to stop; I clear ground with it.", 'Get inside the arc or stay well out. The middle is where people die.']), tradeLine: 'The great blade for your little one? I have wanted to rest my back for a month. Swap, and welcome.' }),
  fennick: Object.freeze({ weapon: 'staff', style: 'The quarterstaff', trades: false, styleLines: Object.freeze(['A staff. Laugh; the goblins did. It has two ends, it strikes twice as often as your sword, and nobody hangs you for carrying one.', 'It will not cut, so I aim for hands and knees. A man who cannot hold his weapon has lost.']), tradeLine: 'You would want my staff? No. It is the only thing I own that has never broken.' }),
});

/** Arrival and departure are seconds of play after the traveler's landing; pace is metres per second on the road. */
export const MERCENARY_ROSTER = Object.freeze([
  merc('brannock', 'Brannock', 'the Marosh fens', 0, 420, 1.28, { tunic: 0x6b5a3e, hair: 0x2b221b, beard: true, cap: false, skin: 0xd7ad7e },
    ['Same boat, same coin. Brannock, out of the Marosh fens. I’ll give the village a look and take the road after you; no sense two of us crowding one quartermaster.', 'They say the muster is a Legion camp out on the Moros Plain, past some river. I’ll see you there, or on the way.']),
  merc('tesk', 'Tesk', 'the Selemi coast', 240, 45, 1.36, { tunic: 0x4f6a5b, hair: 0x5a3d26, beard: false, cap: true, skin: 0xd7ad7e },
    ['Tesk. Selemi coast, before the coast stopped paying. You landed ahead of me, so you know the road better than I do.', 'A river, a rise, and a plain, the letter said. I walk fast. Don’t take it personally when I pass you.']),
  merc('oru', 'Oru', 'the southern islands', 540, 60, 1.22, { tunic: 0x7a4a3a, hair: 0x1f1a16, beard: true, cap: false, skin: 0x8f6a4a },
    ['Oru. The islands in the south, where the Coalition is buying spears too. The Empire paid first, so here I am.', 'Cold country. I’ll keep moving so I stop noticing it.']),
  merc('halvard', 'Halvard', 'Feradom', 900, 50, 1.3, { tunic: 0x5c5b6e, hair: 0xa38b5c, beard: true, cap: false, skin: 0xe2bd93 },
    ['Halvard, of Feradom. My father fought for the old emperor. I fight for whoever writes the contract.', 'Twelve of us, they said, and a whole Legion. That is a lot of coin for one border.']),
  merc('dain', 'Dain Marrow', 'the Izoli ports', 1320, 70, 1.34, { tunic: 0x8a7a4a, hair: 0x3a3a3a, beard: false, cap: true, skin: 0xd7ad7e },
    ['Dain Marrow. Izoli ports, though I would not say so loudly around a Legion post. I’m no rebel; I’m a man with a sword and rent to pay.', 'Which way is the quartermaster? I’d rather be signed in before dark.']),
  merc('cassel', 'Cassel', 'the Pyrosi hills', 1800, 40, 1.4, { tunic: 0x3f5a6b, hair: 0x6b4b2b, beard: false, cap: false, skin: 0xc99b70 },
    ['Cassel, from the Pyrosi hills. Pyros sent a handful to the other side, so I came to this one. Family argument.', 'Keep your eyes on the woods. Goblins do not care whose coin you carry.']),
  merc('pell', 'Pell', 'the Izoli ports', 2400, 55, 1.26, { tunic: 0x6e4f5a, hair: 0x7a5a3a, beard: true, cap: true, skin: 0xd7ad7e },
    ['Pell. I came over with Dain, then lost him at the first tavern. He will be ahead of me by now; he always is.', 'A road with a bridge and then a plain. I can manage a road.']),
  merc('yorvo', 'Yorvo', 'the southern islands', 3000, 60, 1.2, { tunic: 0x5a6b3f, hair: 0x2f2a25, beard: false, cap: false, skin: 0x8f6a4a },
    ['Yorvo. Islands. I row better than I walk, and the road here does not row.', 'When we all stand in one camp, count us. The Empire will, and it pays by the head.']),
  merc('anselm', 'Anselm', 'Feradom', 3720, 50, 1.32, { tunic: 0x7c6b55, hair: 0x8f7550, beard: true, cap: false, skin: 0xe2bd93 },
    ['Anselm, of Feradom, late of three other companies. This one at least feeds you before the fighting.', 'The rise past the river has a shrine, they say. I will light nothing there; I never know whose gods are listening.']),
  merc('kest', 'Ruddy Kest', 'the Marosh fens', 4500, 45, 1.38, { tunic: 0x4a5c6b, hair: 0xb04a2a, beard: true, cap: false, skin: 0xe2bd93 },
    ['Ruddy Kest, and yes, the hair. Marosh fens, same as Brannock, though he left a season before me.', 'I don’t stop for much. If you want company on the road, you will have to keep up.']),
  merc('fennick', 'Fennick', 'the Selemi coast', 5400, 60, 1.24, { tunic: 0x6b4a4a, hair: 0x4a3524, beard: false, cap: true, skin: 0xd7ad7e },
    ['Fennick, last off the boats, as usual. Selemi coast. My brother is somewhere on the other side of this war and I try not to think about it.', 'If the camp is where they say, I will make it by nightfall. Save me a place by the fire.']),
]);

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Cumulative lengths along a polyline road. */
export function roadLengths(road) {
  const lengths = [0];
  for (let i = 1; i < road.length; i++) lengths.push(lengths[i - 1] + distance(road[i - 1], road[i]));
  return lengths;
}

/** The road distance of the point of the polyline nearest to `point`. */
export function distanceAlongRoad(road, point, lengths = roadLengths(road)) {
  let best = 0, bestGap = Infinity;
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    if (!length) continue;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (length * length)));
    const gap = Math.hypot(point.x - (a.x + dx * t), point.z - (a.z + dz * t));
    if (gap < bestGap) { bestGap = gap; best = lengths[i - 1] + length * t; }
  }
  return best;
}

/** The point and forward direction at a road distance. */
export function pointAlongRoad(road, distanceOnRoad, lengths = roadLengths(road)) {
  const total = lengths[lengths.length - 1];
  const d = Math.max(0, Math.min(total, distanceOnRoad));
  for (let i = 1; i < road.length; i++) {
    if (d > lengths[i] && i < road.length - 1) continue;
    const a = road[i - 1], b = road[i], length = lengths[i] - lengths[i - 1] || 1;
    const t = Math.max(0, Math.min(1, (d - lengths[i - 1]) / length));
    const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx, dz, yaw: Math.atan2(dx, dz) };
  }
  const last = road[road.length - 1], prev = road[road.length - 2] ?? last;
  return { x: last.x, z: last.z, dx: 0, dz: 1, yaw: Math.atan2(last.x - prev.x, last.z - prev.z) };
}

/**
 * Where a mercenary stands at a moment of play: not yet arrived, waiting at the
 * landing, walking the road, stopped where the traveler had business, or mustered.
 */
export function mercenaryProgress(mercenary, playSeconds, stops, musterDistance) {
  let remaining = playSeconds - mercenary.arrival;
  if (!(remaining >= 0)) return { phase: 'coming', distance: 0, stopId: null };
  remaining -= mercenary.departs;
  if (remaining < 0) return { phase: 'landing', distance: 0, stopId: null };
  let at = 0;
  for (const stop of [...stops].sort((a, b) => a.distance - b.distance)) {
    if (stop.distance >= musterDistance) break;
    const travel = Math.max(0, stop.distance - at) / mercenary.pace;
    if (remaining < travel) return { phase: 'walking', distance: at + remaining * mercenary.pace, stopId: null };
    remaining -= travel; at = stop.distance;
    if (remaining < stop.dwell) return { phase: 'stopped', distance: at, stopId: stop.id };
    remaining -= stop.dwell;
  }
  const travel = Math.max(0, musterDistance - at) / mercenary.pace;
  if (remaining < travel) return { phase: 'walking', distance: at + remaining * mercenary.pace, stopId: null };
  return { phase: 'mustered', distance: musterDistance, stopId: null };
}

/**
 * @param road the main road polyline (world.paths[0])
 * @param stops [{ id, point, dwell }] places where each mercenary pauses to do the traveler's business
 * @param muster the Legion camp's rendezvous point
 * @param landing where the boats put people ashore
 */
export function createMercenaryCompany({ road, stops = [], muster, landing, roster = MERCENARY_ROSTER } = {}) {
  if (!Array.isArray(road) || road.length < 2) throw new TypeError('The mercenaries need the main road.');
  const lengths = roadLengths(road);
  const musterDistance = muster ? distanceAlongRoad(road, muster, lengths) : lengths[lengths.length - 1];
  const roadStops = stops.map(stop => ({ id: stop.id, dwell: stop.dwell, distance: distanceAlongRoad(road, stop.point, lengths) }));
  const start = landing ?? road[0];
  const lateral = index => (index % 2 ? -1 : 1) * (1.4 + Math.floor(index / 2) * .8);

  function placements(playSeconds) {
    return roster.map((mercenary, index) => {
      const progress = mercenaryProgress(mercenary, playSeconds, roadStops, musterDistance);
      const side = lateral(index);
      if (progress.phase === 'coming' || progress.phase === 'landing') {
        const angle = index * 1.9;
        return { id: mercenary.id, name: mercenary.name, ...progress, x: start.x + Math.sin(angle) * (2.2 + index * .3), z: start.z + Math.cos(angle) * (2.2 + index * .3), yaw: angle + Math.PI, walking: false };
      }
      const point = pointAlongRoad(road, progress.distance, lengths);
      const off = progress.phase === 'stopped' ? side * 2.2 : progress.phase === 'mustered' ? 0 : side;
      let x = point.x + point.dz * off, z = point.z - point.dx * off;
      if (progress.phase === 'mustered') { x = point.x + point.dz * lateral(index) * 1.6 - point.dx * (4 + Math.floor(index / 2) * 2.2); z = point.z - point.dx * lateral(index) * 1.6 - point.dz * (4 + Math.floor(index / 2) * 2.2); }
      return { id: mercenary.id, name: mercenary.name, ...progress, x, z, yaw: progress.phase === 'walking' ? point.yaw : point.yaw + (progress.phase === 'stopped' ? Math.PI / 2 * Math.sign(side) : Math.PI), walking: progress.phase === 'walking' };
    });
  }

  function summary(playSeconds) {
    const counts = { coming: 0, landing: 0, walking: 0, stopped: 0, mustered: 0 };
    for (const placement of placements(playSeconds)) counts[placement.phase]++;
    return { ...counts, arrived: roster.length - counts.coming, total: roster.length + 1, musterDistance, roadLength: lengths[lengths.length - 1] };
  }

  /** The traveler's own standing in the company by road distance: 1 means first to the muster. */
  function travelerRank(playSeconds, travelerDistance) {
    return 1 + placements(playSeconds).filter(p => p.distance > travelerDistance || p.phase === 'mustered').length;
  }

  return { placements, summary, travelerRank, musterDistance, roadLength: lengths[lengths.length - 1], stops: roadStops.map(stop => ({ ...stop })) };
}

/** How a mercenary fights, in his own words; also a guide to facing that weapon. */
export function mercenaryStyleLines(id) {
  const mercenary = MERCENARY_ROSTER.find(entry => entry.id === id);
  return mercenary ? [...mercenary.styleLines] : [];
}

/** The weapon a mercenary carries and whether he would swap it for the traveler's sword. */
export function mercenaryWeapon(id) {
  const mercenary = MERCENARY_ROSTER.find(entry => entry.id === id);
  return mercenary ? { weapon: mercenary.weapon, style: mercenary.style, trades: mercenary.trades, tradeLine: mercenary.tradeLine } : null;
}

/** What a mercenary says when spoken to on the road, given where he is. */
export function mercenaryLines(id, placement) {
  const mercenary = MERCENARY_ROSTER.find(entry => entry.id === id);
  if (!mercenary) return [];
  const status = placement?.phase === 'mustered' ? 'We made it, then. The camp counts heads at dusk; make sure yours is one of them.'
    : placement?.phase === 'stopped' ? 'Same errand as you, I expect. Go on ahead; I will catch you up.'
    : placement?.phase === 'walking' ? 'No time to stand about. The camp on the Moros Plain, that is the word. Walk with me or after me.'
    : mercenary.lines[1];
  return [mercenary.lines[0], status];
}
