/** Saved ferry state, kept separate from terrain and renderer imports. */
export const COMPANY_FERRY_SECONDS = 12;

export function validCompanyTransit(t) {
  return !!t && typeof t === 'object' && !Array.isArray(t)
    && ['approach', 'sailing'].includes(t.status)
    && ['drent', 'peblos'].includes(t.from) && ['drent', 'peblos'].includes(t.to) && t.from !== t.to
    && Number.isFinite(t.destination?.x) && Number.isFinite(t.destination?.z)
    && Number.isFinite(t.elapsed) && t.elapsed >= 0 && t.elapsed <= COMPANY_FERRY_SECONDS
    && typeof t.purpose === 'string' && t.purpose.length <= 120
    && typeof t.mounted === 'boolean' && typeof t.passenger === 'boolean';
}
