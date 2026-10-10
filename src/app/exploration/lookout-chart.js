// Taleth's completed review supplies chart knowledge, never world loading,
// visits, secret portal locations or new simulated territory.
import {REGION_CELLS} from '../../world/terrain/region-world.js';
import {LOOKOUT} from './tower-state.js';
import {MODES} from './modes.js';

// Match the prepared landscape's regional coverage (lookout-landscape-bake.js),
// not the much shorter list of countries explicitly named in the narration.
// This is Taleth's regional chart, not a per-pixel line-of-sight simulation.
// An atlas regression compares it with the actual scenery manifest.
export const LOOKOUT_CHART_REGIONS=Object.freeze(Object.entries(REGION_CELLS)
  .filter(([name,cells])=>name!=='Urubond'&&!MODES.war.mapRegions.includes(name)
    &&cells.some(p=>Math.hypot(p.x-LOOKOUT.x,p.z-LOOKOUT.z)<2800))
  .map(([name])=>name));
export function lookoutChart(baseRegions,concluded){
  const regions=[...new Set([...baseRegions,...(concluded?LOOKOUT_CHART_REGIONS:[])])];
  return {regions,chartedRegions:concluded?regions:[],
    label:concluded?'Known regions':'Five regions',
    help:concluded
      ?'Taleth has charted the surrounding landscape visible from the lookout. Five regions remain playable in this scenario; the wider chart is for reference.'
      :'Five regions are playable in this scenario. Speak with Taleth before beginning; M shows the current armies and battles.'};
}
