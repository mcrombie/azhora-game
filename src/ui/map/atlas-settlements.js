import { STONEFIST, LOND_TOWN } from '../../content/regions/lond/lond-layout.js';
import { NONTH_TOWN } from '../../content/regions/nonth/nonth-town-layout.js';
import { THOTH_TOWN } from '../../content/regions/thoth/thoth-town-layout.js';
import { ORSA_TOWN } from '../../content/regions/orsa/orsa-town-layout.js';
import { RIESOV, WITHERST } from '../../content/regions/northern-towns/northern-towns-layout.js';
import { GANUN_TOWN } from '../../content/regions/ganun/ganun-layout.js';
import { ENDEVOR_TOWN } from '../../content/regions/endevor/endevor-site.js';

/** Built settlements use their world layout positions in both the adventure
 * chart and the public atlas. No scenery, actors or regional loading is needed. */
export const ATLAS_SETTLEMENTS = Object.freeze([
  [STONEFIST, 'Capital of Tolgufeld'],
  [LOND_TOWN, 'River town'],
  [NONTH_TOWN, 'West-bank market town'],
  [THOTH_TOWN, 'River market town'],
  [ORSA_TOWN, 'Timber fishing port'],
  [RIESOV, 'Northern fishing port'],
  [WITHERST, 'River-mouth trading town'],
  [GANUN_TOWN, 'Estuary market town'],
  [ENDEVOR_TOWN, 'River-mouth port'],
].map(([site, subtitle]) => Object.freeze({ id: site.id, name: site.name, region: site.region,
  x: site.x, z: site.z, description: site.description, subtitle })));
