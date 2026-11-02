// Encounter-local geometry. No scene, campaign or terrain dependencies.
export const cavalryAngle = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const cavalryClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function cavalryTurn(heading, desired, rate, dt) {
  return heading + cavalryClamp(cavalryAngle(desired, heading), -rate * dt, rate * dt);
}

/** First intersection of a swept point with a circular body; null means miss.
 * The caller includes the projectile/lance radius in the supplied radius. */
export function cavalryContact(from, to, body, radius) {
  const dx = to.x - from.x, dz = to.z - from.z, x = from.x - body.x, z = from.z - body.z;
  const a = dx * dx + dz * dz, c = x * x + z * z - radius * radius;
  if (c <= 0) return 0;
  if (a < 1e-12) return null;
  const b = x * dx + z * dz, discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : null;
}

/** Front mail/shield protects Celder riders; the flanks and spent horses are
 * real openings for either the hero or another combatant. */
export function cavalryArmor(target, source) {
  if (target.kind !== 'celder-knight') return {scale: 1, opening: null};
  if (target.open || target.phase === 'recover') return {scale: 1.45, opening: 'recovery'};
  const angle = Math.abs(cavalryAngle(Math.atan2(source.x - target.x, source.z - target.z), target.heading));
  return angle > Math.PI * .42 ? {scale: 1.25, opening: 'flank'} : {scale: .4, opening: 'shield'};
}
