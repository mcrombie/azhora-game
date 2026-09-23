/**
 * The other man from the boat has the same three errands, on his own clock:
 * report to Jojo, learn Glun's drill, then take the road to the muster.
 * Nothing here reads or changes the player's quest. Play time and the authored
 * road determine his lesson, so loading a save does not replay or skip it.
 * The mercenary company takes over his road journey once the lesson is done.
 */
import { distanceAlongRoad, pointAlongRoad, roadLengths } from './mercenaries.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = p => ({ x: p.x, z: p.z });
const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const validPoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.z);

export const LANDING_MATE_LESSON = Object.freeze({
  harborTalk: 12, instructorTalk: 7, strikes: 6, guard: 3, dodge: 3, report: 5,
});

/** A refusal is still a conversation, and always tells the player what is missing. */
export function landingMatePartnership({ trained = false, playerTrained = false, withTraveler = false } = {}) {
  if (withTraveler) return { ok: true, reason: 'together', line: 'We are already going the same way. I am with you.' };
  if (!trained) return { ok: false, reason: 'mate-training',
    line: 'Not yet. I have to report to Jojo and finish Officer Glun\'s training first. Find me afterward and we can take the road together.' };
  if (!playerTrained) return { ok: false, reason: 'player-training',
    line: 'I have finished with Glun, but you still need his training. He is beside the straw post at the village crossroads. Speak to him, finish the drill, then come and find me on the road.' };
  return { ok: true, reason: 'ready',
    line: 'Both signed off, then. Yes, let us take the road to the muster together. I will stay with you.' };
}

/**
 * Stand beside the person or post, never on top of it. The host may supply its
 * collision check; the nearest clear alternative is then chosen once, not every frame.
 */
function standNear(at, toward, standable) {
  const angle = facing(at, toward);
  for (const reach of [2.15, 2.65, 3.15]) for (const turn of [0, .5, -.5, 1, -1, 1.5, -1.5, Math.PI]) {
    const candidate = { x: at.x + Math.sin(angle + turn) * reach, z: at.z + Math.cos(angle + turn) * reach };
    if (!standable || standable(candidate.x, candidate.z)) return candidate;
  }
  return { x: at.x + Math.sin(angle) * 2.15, z: at.z + Math.cos(angle) * 2.15 };
}

/** Travel along the road between the two nearest road points, then approach the person. */
function approachRoad(road, lengths, from, to) {
  const start = distanceAlongRoad(road, from, lengths), end = distanceAlongRoad(road, to, lengths);
  const middle = road.filter((p, i) => lengths[i] > Math.min(start, end) && lengths[i] < Math.max(start, end));
  if (end < start) middle.reverse();
  const path = [point(from), point(pointAlongRoad(road, start, lengths)), ...middle.map(point), point(pointAlongRoad(road, end, lengths)), point(to)];
  return path.filter((p, i) => !i || distance(p, path[i - 1]) > .05);
}

export function createLandingMateQuest({
  id = 'merc-gotwood', name = 'Chris Scotwood', road, landing, harbormaster, instructor, training,
  pace = 1.28, standable = null,
} = {}) {
  if (!Array.isArray(road) || road.length < 2 || !road.every(validPoint)
    || ![landing, harbormaster, instructor, training].every(validPoint) || !(pace > 0) || !Number.isFinite(pace))
    throw new TypeError('The landing mate needs the road, landing, Jojo, Glun and the straw post.');
  const lengths = roadLengths(road), harborStand = standNear(harbormaster, landing, standable);
  const instructorStand = standNear(instructor, harbormaster, standable);
  const practiceStand = standNear(training, harbormaster, standable);
  const legs = [];
  let clock = 0;
  function walk(stage, path, destinationId) {
    const spans = roadLengths(path), duration = spans.at(-1) / pace;
    legs.push({ stage, activity: 'walking', begin: clock, end: clock + duration, path, spans, destinationId });
    clock += duration;
  }
  function hold(stage, activity, at, face, duration, destinationId, lines = []) {
    legs.push({ stage, activity, begin: clock, end: clock + duration, at, face, destinationId, lines });
    clock += duration;
  }
  walk('report-harbor', approachRoad(road, lengths, landing, harborStand), 'harbormaster');
  hold('report-harbor', 'talking', harborStand, harbormaster, LANDING_MATE_LESSON.harborTalk, 'harbormaster', [
    { speakerId: id, text: 'Same boat, same army contract. Where do I report?' },
    { speakerId: 'harbormaster', text: 'Officer Glun at the straw post. He trains everyone before they take the road.' },
    { speakerId: id, text: 'Glun first, then the muster. Understood.' },
  ]);
  walk('combat-training', approachRoad(road, lengths, harborStand, instructorStand), 'instructor');
  hold('combat-training', 'talking', instructorStand, instructor, LANDING_MATE_LESSON.instructorTalk, 'instructor', [
    { speakerId: 'instructor', text: 'Two clean strikes. Hold your guard. Then step clear. Show me, and I will send you up the road.' },
    { speakerId: id, text: 'I had better earn the contract before they start paying it.' },
  ]);
  walk('combat-training', [instructorStand, practiceStand], 'training');
  hold('combat-training', 'striking', practiceStand, training, LANDING_MATE_LESSON.strikes, 'training');
  hold('combat-training', 'guarding', practiceStand, training, LANDING_MATE_LESSON.guard, 'training');
  hold('combat-training', 'dodging', practiceStand, training, LANDING_MATE_LESSON.dodge, 'training');
  hold('combat-training', 'talking', practiceStand, instructor, LANDING_MATE_LESSON.report, 'instructor', [
    { speakerId: 'instructor', text: 'That will do. Take the road west and report for the muster. Keep your letter dry.' },
    { speakerId: id, text: 'Thank you, Officer. I am on my way.' },
  ]);
  const departureAt = clock, roadDistance = distanceAlongRoad(road, practiceStand, lengths);

  function view(playSeconds, { placement: placed = null } = {}) {
    const at = Math.max(0, Number(playSeconds) || 0), leg = legs.find(part => at < part.end);
    if (!leg) return { id, name, stage: placed?.phase === 'mustered' ? 'complete' : 'report-muster',
      phase: placed?.phase ?? 'walking', activity: placed?.phase === 'mustered' ? 'mustered' : 'on-road',
      trained: true, departureAt, destinationId: 'muster', at: validPoint(placed) ? point(placed) : null,
      face: null, progress: 1, animation: null, speech: null };
    const duration = leg.end - leg.begin, elapsed = at - leg.begin, progress = duration ? elapsed / duration : 1;
    const walking = leg.activity === 'walking';
    const pose = walking ? pointAlongRoad(leg.path, elapsed * pace, leg.spans) : leg.at;
    const yaw = walking ? pose.yaw : facing(leg.at, leg.face);
    const animation = leg.activity === 'striking' ? { action: 'attack', progress: (elapsed % 3) / 3, combo: Math.min(1, Math.floor(elapsed / 3)), armed: true }
      : leg.activity === 'guarding' ? { action: 'idle', guarding: true, armed: true }
        : leg.activity === 'dodging' ? { action: 'dodge', progress, armed: true } : null;
    const speech = leg.lines?.length ? leg.lines[Math.min(leg.lines.length - 1, Math.floor(progress * leg.lines.length))] : null;
    return { id, name, stage: leg.stage, phase: walking ? 'walking' : 'stopped', activity: leg.activity,
      trained: false, departureAt, destinationId: leg.destinationId, at: point(pose), face: leg.face ? point(leg.face) : null,
      yaw, progress, animation, speech };
  }
  function placement(playSeconds) {
    const step = view(playSeconds);
    if (step.trained) return null;
    return { id, name, phase: step.phase, distance: distanceAlongRoad(road, step.at, lengths), stopId: step.phase === 'stopped' ? step.destinationId : null,
      ...step.at, yaw: step.yaw, walking: step.phase === 'walking', pace: step.phase === 'walking' ? pace : 0,
      chapterOne: step.stage, activity: step.activity, face: step.face, animation: step.animation, speech: step.speech };
  }
  return Object.freeze({ id, name, departureAt, roadDistance, view, placement,
    partnership: (seconds, context = {}) => landingMatePartnership({ ...context, trained: view(seconds).trained }),
    timeline: Object.freeze(legs.map(({ stage, activity, begin, end, destinationId }) => Object.freeze({ stage, activity, begin, end, destinationId }))),
  });
}
