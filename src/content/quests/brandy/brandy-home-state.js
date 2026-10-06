import { validateBrandyHome, validateJonHomeVisit } from './brandy-home.js';
import { BRANDY_HOME } from './brandy-home-world.js';
import { BRANDY_STAND } from './brandy.js';
import { SALT_PORTS } from '../salt/salt-sultan.js';

/** Optional section: older saves pick up the daily schedule on loading. */
export function validateBrandyHousehold(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  return !!data && data.version === 1
    && validateBrandyHome(data.brandy, { allowMissing: false, home: BRANDY_HOME, yard: BRANDY_STAND })
    && validateJonHomeVisit(data.jon, { allowMissing: false,
      home: { ...BRANDY_HOME, porch: BRANDY_HOME.visitor }, pier: SALT_PORTS[0].stand });
}
