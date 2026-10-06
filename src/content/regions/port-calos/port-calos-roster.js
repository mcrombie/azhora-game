/** Explicitly requested residents; no inferred personalities or additional citizens. */
export const PORT_CALOS_PLACEHOLDER_NAMES = Object.freeze([
  'Kendall', 'Jay', 'Robert', 'Vic', 'Madi', 'Madison', 'Sierra', 'Franz', 'Marissa', 'Sean',
  'Flor', 'Melissa', 'Richard', 'Laurie', 'Zach', 'Courtney', 'Kathy', 'Karen', 'Kirk', 'Zkayla', 'Pswtr',
]);
export const PORT_CALOS_REGION_IDS = Object.freeze([
  'port-calos-harbourmaster', 'katy', 'christina', 'cobble-imani', 'cobble-jessi',
  ...PORT_CALOS_PLACEHOLDER_NAMES.map(name => `port-calos-${name.toLowerCase()}`),
]);
