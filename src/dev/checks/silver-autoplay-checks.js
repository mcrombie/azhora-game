/** Native renderer proof: use the F8 cards and ordinary movement/dialogue/combat. */
export async function runSilverAutoplayChecks(h) {
  const checks = [], started = performance.now();
  const check = (ok, message) => {
    if (!ok) throw new Error(`${message}: ${JSON.stringify(h.summary())}`);
    checks.push(message);
  };
  const wait = async (predicate, label, seconds = 600) => {
    const until = performance.now() + seconds * 1000;
    let nextReport = performance.now() + 20000;
    while (!predicate()) {
      check(performance.now() < until, label);
      // Keep only the final assertion, not one entry per rendered frame.
      checks.pop();
      if(performance.now()>nextReport){const {nearby,...progress}=h.summary();console.log('SILVER_PROGRESS '+JSON.stringify(progress));nextReport=performance.now()+20000;}
      await h.frames();
    }
  };
  await h.prepare(); const saved = h.saved();
  try {
    for (const kind of ['luscia', 'drent']) {
      await h.open(); document.getElementById(`test-silver-${kind}-autoplay`).click();
      check(h.autoplay.active && h.autoplay.id === `civil-${kind}`, `${kind} launches its own pilot`);
      await wait(() => !h.autoplay.active, `${kind} makes progress within ten minutes`);
      const s = h.summary();
      if (kind === 'luscia') {
        check(s.luscia.introduced && s.luscia.republicContact, 'Luscia obtains the real introduction and completes Hara\'s briefing');
        check(s.luscia.path === 'coalition' && /not built/.test(h.autoplay.reason), 'Luscia hands back control at the unfinished local-orders boundary');
      } else check(s.drent.outcome === 'monarchist' && s.drent.rewardGranted, 'Drent returns from the investigation and awards the actual quest reward');
      check(h.saved() === saved, `${kind} does not change the normal checkpoint`);
    }
    return { silverAutoplayChecks: checks.length, checks, elapsedMs: Math.round(performance.now() - started) };
  } finally { h.stop(); }
}
