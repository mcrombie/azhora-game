/**
 * The colour of the sky over a country.
 *
 * Until now there was one sky in Azhora: `scene.background` 0xaacfd3 and
 * `FogExp2(0xb3d3d0, .0062)`, set once when the scene is made and never touched
 * again. That is the right sky for the lake country and for Drent, and it is the
 * wrong sky for a rain-shadow desert, which is the first thing this job needs
 * that the game has never drawn.
 *
 * Two rules, and they are the whole design:
 *
 *  - **Nothing that exists changes.** A region gets a horizon of its own only by
 *    declaring one — `palette.sky`, `palette.haze`, `palette.hazeDensity` in
 *    `REGION_TEXT` — and no region declares one today. Every region without them,
 *    and open country, and no region at all, get `DEFAULT_SKY`, which is the
 *    three numbers `src/main.js` has always used, to the digit. The existing
 *    `palette.fog` is *not* read: it is the chart legend's colour and has been
 *    chosen for that.
 *  - **It is one layer of something that will have more.** A day and night cycle
 *    is designed (`docs/day-night-brief.md`) in which the hour tints the same
 *    sky. So the country's sky is a value, and anything that modifies it is a
 *    function from a sky to a sky: `composeSky(regionSky(region), hour, weather)`
 *    is the shape that takes, and it needs nothing here rewritten to allow it.
 *
 * Pure: no three, no DOM, no atlas. The host turns what comes out of here into
 * `scene.background`, `scene.fog.color` and `scene.fog.density`, which is the one
 * place any of those three are written.
 */

/** The sky the game has always had, and still has everywhere nothing says otherwise. */
export const DEFAULT_SKY = Object.freeze({ background: 0xaacfd3, fog: 0xb3d3d0, density: .0062 });

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const hex = value => (Number.isInteger(value) && value >= 0 && value <= 0xffffff ? value : null);

/**
 * Two colours mixed in the space they are written in. Deliberately not HSL: a
 * lightness picked for sRGB comes back two stops paler through the renderer's
 * working space, which is how the Meneth nut groves came out nearly white
 * (docs/four-regions-brief.md). These are the same integers the host has always
 * handed `THREE.Color`, so they arrive the same way.
 */
export function mixHex(from, to, t) {
  const k = clamp(t, 0, 1);
  const channel = shift => {
    const a = (from >> shift) & 0xff, b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * k) & 0xff;
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** One sky lerped toward another. `t` of 0 is the first, 1 is the second. */
export function mixSky(from, to, t) {
  const k = clamp(t, 0, 1);
  return Object.freeze({
    background: mixHex(from.background, to.background, k),
    fog: mixHex(from.fog, to.fog, k),
    density: from.density + (to.density - from.density) * k,
  });
}

/**
 * The sky a country has of its own, or the default. `region` is what
 * `world.regionAt` answers — the country the traveler is *told* they are in,
 * shore fringe and all — and not `hexOwnerAt`, because a horizon belongs to the
 * place you believe you are standing. Open country (id 0) keeps the default: no
 * country's weather, because no country.
 */
export function regionSky(region) {
  const palette = region && region.id !== 0 ? region.palette : null;
  if (!palette) return DEFAULT_SKY;
  const background = hex(palette.sky), fog = hex(palette.haze ?? palette.sky);
  if (background === null) return DEFAULT_SKY;
  const density = Number.isFinite(palette.hazeDensity) && palette.hazeDensity > 0 ? palette.hazeDensity : DEFAULT_SKY.density;
  return Object.freeze({ background, fog: fog ?? background, density });
}

/**
 * A sky with every tint applied in turn. A tint is a function from a sky to a
 * sky — the hour of the day, the weather, whatever comes — and one that returns
 * nothing leaves the sky it was handed, so a tint that has no opinion costs
 * nothing to pass.
 */
export function composeSky(sky, ...tints) {
  let current = sky;
  for (const tint of tints) {
    if (typeof tint !== 'function') continue;
    const next = tint(current);
    if (next && Number.isInteger(next.background) && Number.isInteger(next.fog) && Number.isFinite(next.density)) current = next;
  }
  return current;
}

/**
 * The horizon as the traveler actually meets it: it does not change the moment
 * they step over a border, it comes round to the new country over a second or
 * two, the way weather does and the way the eye does.
 *
 * Except when they did not walk there. A traveler who is put down somewhere —
 * a testing-panel travel button, a review view, a restored save — has not walked
 * over a gradient, and a sky sliding for two seconds after a jump would be a lie
 * and would be caught mid-slide by any screenshot. So a step longer than `jump`
 * metres snaps: on foot the longest stride the game allows is 7.2 m/s over a dt
 * clamped to a quarter second, which is 1.8 m, so sixty is a teleport and
 * nothing else.
 */
export function createSkyBlend({ seconds = 1.6, jump = 60 } = {}) {
  let from = DEFAULT_SKY, target = DEFAULT_SKY, current = DEFAULT_SKY;
  let since = seconds, last = null, snapped = 0;
  const same = (a, b) => a.background === b.background && a.fog === b.fog && a.density === b.density;
  return {
    get current() { return current; },
    get target() { return target; },
    get snaps() { return snapped; },
    /** Set the sky outright, with no blend. Returns it. */
    snap(region, ...tints) {
      target = composeSky(regionSky(region), ...tints);
      from = target; current = target; since = seconds; snapped++;
      return current;
    },
    /**
     * One frame of it. `where` is the traveler's position, so that a jump is
     * told from a walk without the host having to keep a flag for it.
     *
     * The blend is linear in time from the sky the traveler had when the country
     * changed, not an exponential chase of the target. An exponential one never
     * arrives: mixing two colours a single step apart rounds back to where it
     * started, so the last shade of every transition would hang about for ever.
     */
    step(region, dt, where = null, ...tints) {
      const next = composeSky(regionSky(region), ...tints);
      if (!same(next, target)) { from = current; target = next; since = 0; }
      const far = where && last && Math.hypot(where.x - last.x, where.z - last.z) > jump;
      if (where && Number.isFinite(where.x) && Number.isFinite(where.z)) last = { x: where.x, z: where.z };
      if (far || !Number.isFinite(dt) || dt <= 0 || seconds <= 0) {
        from = target; current = target; since = seconds; if (far) snapped++;
        return current;
      }
      since = Math.min(seconds, since + dt);
      current = since >= seconds ? target : mixSky(from, target, since / seconds);
      return current;
    },
  };
}
