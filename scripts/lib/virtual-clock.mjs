/**
 * The recorders' virtual clock (6 October 2026; docs/flyover-video.md). Runs in the page before any of its scripts
 * (Playwright's addInitScript), so it must stay self-contained: everything it touches comes through `scope`.
 *
 * Until __freezeClock() the page runs on the real clock: the loader and startup measure with it, and a frozen clock
 * would stall them. Afterwards requestAnimationFrame callbacks queue, and __tick(ms) moves a synthetic timestamp on by
 * `ms` and runs the queue once, so every frame is exactly `ms` of game time however long it takes to draw.
 *
 * __freezeClock({timers: true}) also puts setTimeout, setInterval, clearTimeout, clearInterval, performance.now and
 * Date.now on that clock: a toast's 4.2 s is then 4.2 s of game time, not of the machine's. Timers set before the
 * freeze stay real, and so do their ids. {animations: true} pauses every CSS transition and animation and seeks it
 * to the virtual time on each tick, so a fade or a rising experience drop lasts as long in the video as in play.
 * __thawClock() hands everything back: queued frames to the real requestAnimationFrame, pending timers to real ones
 * with what was left of their delay, and the paused animations to the document's own timeline.
 */
export function installVirtualClock(_options = {}, scope = globalThis) {
  const realRAF = scope.requestAnimationFrame.bind(scope), realCancel = scope.cancelAnimationFrame.bind(scope);
  const real = { setTimeout: scope.setTimeout, setInterval: scope.setInterval, clearTimeout: scope.clearTimeout, clearInterval: scope.clearInterval,
    now: scope.performance.now, dateNow: scope.Date.now };
  const realNow = () => real.now.call(scope.performance);
  const frames = new Map(), timers = new Map(), started = new WeakMap();
  let frozen = false, timed = false, animated = false, now = 0, dateAtFreeze = 0, nowAtFreeze = 0, nextFrame = 1, nextTimer = 1e9;
  const firstTimer = nextTimer, ownTimer = id => typeof id === 'number' && id >= firstTimer;

  scope.requestAnimationFrame = callback => {
    if (frozen) { const id = -(nextFrame++); frames.set(id, callback); return id; }
    return realRAF(time => { if (frozen) frames.set(-(nextFrame++), callback); else callback(time); });
  };
  scope.cancelAnimationFrame = id => { if (!frames.delete(id)) realCancel(id); };

  function schedule(fn, delay, args, repeat) {
    const id = nextTimer++, wait = Math.max(0, Number(delay) || 0);
    timers.set(id, { id, fn, args, due: now + wait, every: repeat ? Math.max(1, wait) : null });
    return id;
  }
  const virtualTimers = {
    setTimeout: (fn, delay, ...args) => schedule(fn, delay, args, false),
    setInterval: (fn, delay, ...args) => schedule(fn, delay, args, true),
    clearTimeout: id => { if (!timers.delete(id) && !ownTimer(id)) real.clearTimeout.call(scope, id); },
    clearInterval: id => { if (!timers.delete(id) && !ownTimer(id)) real.clearInterval.call(scope, id); },
  };
  const call = (fn, args) => { try { if (typeof fn === 'function') fn(...args); else (0, eval)(String(fn)); } catch (error) { scope.console?.error?.(error); } };

  /**
   * Every timer due by `until`, earliest first, each at its own time: the clock reads its due time while it runs, so
   * one it sets is due from there, and runs in this tick if that is still before `until`.
   */
  function runTimers(until) {
    for (let guard = 0; guard < 10000; guard++) {
      let due = null;
      for (const timer of timers.values()) if (timer.due <= until && (!due || timer.due < due.due || (timer.due === due.due && timer.id < due.id))) due = timer;
      if (!due) return;
      now = Math.max(now, due.due);
      if (due.every === null) timers.delete(due.id); else due.due += due.every;
      call(due.fn, due.args);
    }
  }

  /** CSS transitions and animations, paused and seeked to the clock: a new one starts at this frame. */
  function stepAnimations() {
    const list = scope.document?.getAnimations?.() ?? [];
    for (const animation of list) {
      if (!started.has(animation)) {
        started.set(animation, now - (Number(animation.currentTime) || 0));
        try { animation.pause(); } catch {}
      }
      try { animation.currentTime = now - started.get(animation); } catch {}
    }
  }

  scope.__freezeClock = ({ timers: withTimers = false, animations = false } = {}) => {
    if (!frozen) { frozen = true; now = realNow(); }
    if (withTimers && !timed) {
      timed = true; nowAtFreeze = now; dateAtFreeze = real.dateNow.call(scope.Date);
      Object.assign(scope, virtualTimers);
      scope.performance.now = () => now;
      scope.Date.now = () => dateAtFreeze + (now - nowAtFreeze);
    }
    if (animations && !animated) { animated = true; stepAnimations(); }
    return now;
  };
  scope.__tick = ms => {
    const until = now + ms;
    if (timed) runTimers(until);
    now = until;
    const callbacks = [...frames.values()]; frames.clear();
    for (const callback of callbacks) { try { callback(now); } catch (error) { scope.console?.error?.(error); } }
    if (animated) stepAnimations();
    return callbacks.length;
  };
  scope.__thawClock = () => {
    if (animated) {
      for (const animation of scope.document?.getAnimations?.() ?? []) { try { if (started.has(animation) && animation.playState === 'paused') animation.play(); } catch {} }
      animated = false;
    }
    if (timed) {
      Object.assign(scope, { setTimeout: real.setTimeout, setInterval: real.setInterval, clearTimeout: real.clearTimeout, clearInterval: real.clearInterval });
      delete scope.performance.now; if (scope.performance.now !== real.now) scope.performance.now = real.now;
      scope.Date.now = real.dateNow;
      // What is left of a pending timer runs on the real clock. Its id changes, which only matters to a page
      // that clears a timer across a thaw, and the recorders thaw at the end.
      for (const timer of timers.values()) {
        const left = Math.max(0, timer.due - now);
        if (timer.every === null) real.setTimeout.call(scope, () => call(timer.fn, timer.args), left);
        else real.setTimeout.call(scope, () => { call(timer.fn, timer.args); real.setInterval.call(scope, () => call(timer.fn, timer.args), timer.every); }, left);
      }
      timers.clear(); timed = false;
    }
    frozen = false;
    const callbacks = [...frames.values()]; frames.clear();
    for (const callback of callbacks) realRAF(callback);
  };
  scope.__clock = () => ({ frozen, timed, animated, now, frames: frames.size, timers: timers.size });
}
