/**
 * What the frame's one catch caught, kept where something other than a person can read it.
 *
 * `render` (src/main.js) runs inside a single try. For most of a day it threw on the first frame
 * of play — farming's lookups read `p` above the line that declared it — and 1,176 green tests
 * did not notice, because nothing but Electron ever runs the host's frame and nothing had run it.
 *
 * The throw was never quiet: `fail` puts the fatal panel up and writes the error to the console,
 * and `main.cjs` already turns a console error into a non-zero exit. What was missing is anything
 * a *harness* could ask mid-run. So the catch now records, and the record goes three places: onto
 * `state()` where `src/road-smoke.js` asserts it is zero at every arrival, into `main.cjs`'s
 * review path so a picture is never written over a broken frame, and onto the screen as a toast
 * while the testing tools are open.
 *
 * Pure: no DOM, no three.
 */

/** The first line of a stack that is not the `Error: …` header, trimmed, or null. */
export function stackLine(error) {
  const stack = String(error?.stack ?? '');
  const line = stack.split('\n').find(row => /^\s+at\s/.test(row));
  // Without its "at ", because every caller writes its own preposition.
  return line ? line.trim().replace(/^at\s+/, '') : null;
}

/** The message a throw is known by, so the same fault is only shouted about once. */
export const messageOf = error => String(error?.message ?? error ?? 'unknown');

/**
 * @param onNew  called the first time each distinct message is seen: the console's business
 * @param onAny  called for every throw: the toast's business, while anybody is watching
 */
export function createFrameErrors({ onNew = () => {}, onAny = () => {} } = {}) {
  const seen = new Set();
  const state = { count: 0, first: null };

  /** Record one throw out of the frame. Returns what was recorded. */
  function note(error, frame = null) {
    const message = messageOf(error);
    state.count++;
    const entry = { message, at: stackLine(error), frame: Number.isFinite(frame) ? frame : null };
    if (!state.first) state.first = entry;
    if (!seen.has(message)) { seen.add(message); onNew(entry); }
    onAny(entry);
    return entry;
  }

  return {
    note,
    /** What `state()` carries: a count and the first one, and nothing that cannot be JSON. */
    view: () => ({ count: state.count, first: state.first ? { ...state.first } : null }),
    get count() { return state.count; },
    get first() { return state.first ? { ...state.first } : null; },
    /** Distinct messages, for a report that wants them. */
    get messages() { return [...seen]; },
    reset() { seen.clear(); state.count = 0; state.first = null; },
  };
}
