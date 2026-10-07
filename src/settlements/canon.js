/** Reviewed lore, not model output. New regions must explicitly pass admission. */
export const CANON_VERSION = 'feradom-1';
export const LORE_REVISION = '97cb61e4dbd9f7d83affaf608add6bb967398bb2';
export const FERADOM_CANON = Object.freeze({
  id: 'feradom', version: CANON_VERSION, region: 'Feradom', admitted: true,
  source: `https://github.com/mcrombie/world-builder/blob/${LORE_REVISION}/azhora_lore/geography/regions/feradom.md`,
  language: 'feradom', people: 'Feradom coastal and valley communities',
  governance: 'Local harbor and valley lords; pass-lords coordinate through councils when outside pressure requires it.',
  livelihoods: ['northern fishing', 'managed timber', 'valley farming', 'grain imports in poor years'],
  beliefs: ['mutual dependence in hardship', 'maritime competence', 'memory of resistance and accommodation'],
  constraints: ['Keep the old-growth upper slopes intact; timber comes from managed lower slopes.',
    'No invented national religion, sovereign, historical war, or replacement for an established named person.',
    'Local customs are developments within Feradom culture, not changes to the continent’s canon.'],
  names: { heads: ['Skar', 'Thorn', 'Grim', 'Vend', 'Hald', 'Mer', 'Tor', 'Arn'], tails: ['en', 'el', 'is', 'an', 'eth', 'und'], houses: ['holt', 'mund', 'dom', 'und'] },
  architecture: 'Small timber houses, stone hearths, wool and linen, wooden working tools, northern fishing equipment.',
});
export const CANON_CONFLICTS = Object.freeze([
  { region: 'Feradom', status: 'reconciled', rule: 'The integration uses the lore’s council of lords; it does not establish a duke or centralized duchy.' },
  { region: 'Yunethre', status: 'blocked', rule: 'Reconcile the lore’s Gate Lord and toll authority with the game’s free-clan polity before admitting settlements.' },
  { region: 'Caricas', status: 'blocked', rule: 'Reconcile Water Council and protected fox corridor lore with the game’s garrison-town baseline before admitting settlements.' },
]);
/** These descriptive working names belong to this generated pilot, not the source atlas. */
export const PILOT_SITES = Object.freeze([
  { id: 'feradom-fishers', name: 'The Northward Nets', kind: 'fishing', region: 'Feradom', anchor: { x: -302.4, z: -485.64 }, description: 'A small northern fishing community, dependent on the sea and grain exchange.' },
  { id: 'feradom-fields', name: 'The Shared Furrows', kind: 'farming', region: 'Feradom', anchor: { x: -196, z: -390.44 }, description: 'A valley farming hamlet whose surplus feeds its neighbors in good years.' },
  { id: 'feradom-woodland', name: 'The Lower Holt', kind: 'forestry', region: 'Feradom', anchor: { x: -268.8, z: -401.64 }, description: 'A community tending managed lower-slope timber, leaving the upper old growth standing.' },
]);
export function canonFor(region) {
  if (region !== 'Feradom') throw new Error(`${region}: regional lore reconciliation is required before generation.`);
  return FERADOM_CANON;
}
export const RESOURCE_ITEMS = Object.freeze(['barley', 'cooked-fish', 'pine-logs', 'oak-plank', 'herbs', 'copper-piece']);
export const CUSTOMS = Object.freeze({
  'shared-reserve': { name: 'The Common Reserve', rule: 'Repeated gifts are remembered in a shared emergency store.' },
  'hearth-supper': { name: 'The Recovery Supper', rule: 'Care work is followed by a meal at the common hearth.' },
  'ration-council': { name: 'The Open Ration Tally', rule: 'Households witness the allocation of scarce stores.' },
});
