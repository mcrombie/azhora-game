import { distanceAlongRoad, roadLengths } from '../../../gameplay/company/mercenaries.js';
import { landingMatePartnership } from '../../quests/roadside/landing-mate-quest.js';
import { PENINSULA_TUTORIAL_ANCHORS as A, PENINSULA_CHRIS_TASKS } from './peninsula-tutorial.js';

const validPoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.z);
const at = p => ({ x: p.x, z: p.z });
const timestamp = value => Number.isFinite(value) && value >= 0;

/** The ordinary company captures arrivals when constructed. Rebuild on these
 * changes, never each frame as Chris advances through his physical lesson. */
export function peninsulaCompanyStamp(view, id = 'merc-gotwood') {
  return `${id}:${view?.path ?? 'unchosen'}:${view?.signedOffAt ?? 'pending'}:${view?.chris?.departedAt ?? 'waiting'}`;
}

/**
 * Bridge the live peninsula routine into the old landingQuest interface.
 * It never advances time, creates people, awards training or places an actor.
 * Root retains the actual physical pose when handing the recruit to livingRoutes.
 * Ed's arrival begins at the player's sign-off, even if Chris has not arrived
 * in Tidewater Haven yet; Chris's departure is a separate event.
 */
export function createPeninsulaLandingQuest({ read, id = 'merc-gotwood', name = 'Chris Scotwood', road } = {}) {
  if (typeof read !== 'function' || !Array.isArray(road) || road.length < 2 || !road.every(validPoint))
    throw new TypeError('The peninsula company bridge needs a tutorial reader and a valid road.');
  const lengths = roadLengths(road);
  const current = () => read() ?? {};
  const departure = () => timestamp(current().chris?.departedAt) ? current().chris.departedAt : Infinity;
  const arrival = () => timestamp(current().signedOffAt) ? current().signedOffAt : null;
  const roadDistance = () => {
    const q = current(), home = timestamp(q.chris?.departedAt) && validPoint(q.chris?.at) ? q.chris.at : A.tidehavenWait;
    return distanceAlongRoad(road, home, lengths);
  };
  function view(_playSeconds, { placement: placed = null } = {}) {
    const q = current(), c = q.chris ?? {}, departed = timestamp(c.departedAt), pose = validPoint(c.at) ? c.at : A.chris;
    const activity = c.activity ?? 'waiting', elapsed = Math.max(0, Number(c.elapsed) || 0);
    const duration = PENINSULA_CHRIS_TASKS[c.task]?.seconds ?? 0;
    const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;
    if (departed) return { id, name, stage: placed?.phase === 'mustered' ? 'complete' : 'report-muster',
      phase: placed?.phase ?? 'walking', activity: placed?.phase === 'mustered' ? 'mustered' : 'on-road',
      trained: true, departureAt: c.departedAt, arrivalStartedAt: arrival(), destinationId: 'muster',
      at: validPoint(placed) ? at(placed) : at(pose), face: null,
      yaw: placed?.yaw ?? c.yaw ?? 0, progress: 1, animation: null, speech: null };
    const step = PENINSULA_CHRIS_TASKS[c.task], waiting = !step;
    const moving = c.walking === true && c.phase !== 'stopped';
    const animation = activity === 'striking' ? { action: 'attack', progress: (elapsed % 1.2) / 1.2, combo: Math.floor(elapsed / 1.2) % 2, armed: true }
      : activity === 'guarding' ? { action: 'idle', guarding: true, armed: true }
        : activity === 'dodging' ? { action: 'dodge', progress, armed: true } : null;
    return { id, name, stage: waiting ? 'await-player' : step.name === 'walk-to-tidehaven' ? 'walk-to-tidehaven' : 'peninsula-training',
      phase: moving ? 'walking' : 'stopped', activity: waiting ? 'waiting' : activity,
      // To the route system trained means released, not merely personally qualified.
      trained: false, personallyTrained: !!c.trained, departureAt: Infinity, arrivalStartedAt: arrival(),
      destinationId: waiting || step?.name === 'walk-to-tidehaven' ? 'tidehaven' : step?.name ?? 'harbormaster',
      at: at(pose), face: validPoint(c.target) ? at(c.target) : null, yaw: Number.isFinite(c.yaw) ? c.yaw : 0,
      pace: moving && Number.isFinite(c.pace) ? c.pace : 0, progress, animation, speech: null };
  }
  function placement(seconds) {
    const step = view(seconds);
    if (step.trained) return null;
    return { id, name, ...step.at, phase: step.phase, distance: distanceAlongRoad(road, step.at, lengths),
      stopId: step.phase === 'stopped' ? step.destinationId : null, yaw: step.yaw,
      walking: step.phase === 'walking', pace: step.pace, chapterOne: step.stage,
      activity: step.activity, face: step.face, animation: step.animation, speech: step.speech };
  }
  function partnership(seconds, context = {}) {
    if (context.withTraveler) return landingMatePartnership(context);
    const q = current(), c = q.chris ?? {};
    if (timestamp(c.departedAt)) return landingMatePartnership({ ...context, trained: true });
    if (c.trained && !q.completed) return { ok: false, reason: 'player-training',
      line: "I have finished my lessons. Finish yours and collect Glun's letter; I will wait for you in Tidewater Haven." };
    if (c.trained) return { ok: false, reason: 'mate-travel',
      line: 'I am walking to Tidewater Haven. Find me there and we can take the next road together.' };
    return { ok: false, reason: 'mate-training',
      line: "Not yet. I still have lessons to finish on the peninsula. We can talk about traveling together after Glun's sign-off." };
  }
  return Object.freeze({ id, name, view, placement, partnership,
    get departureAt() { return departure(); }, get arrivalStartedAt() { return arrival(); }, get roadDistance() { return roadDistance(); },
    get signature() { return peninsulaCompanyStamp(current(), id); },
    // Timelines are stateful now. Keep this shape for readers, without inventing
    // elapsed-time placements that would bypass a stalled or unfinished lesson.
    timeline: Object.freeze([]),
  });
}
