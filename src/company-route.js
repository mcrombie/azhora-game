import {questLive} from './quest-slate.js';

/** The company's roadside business must agree with the quests currently in the world.
 * Corvan's old register still has a saved position, although he and his quest are paused.
 * Using that position alone made every mercenary face an empty Avrel clearing for 90 seconds.
 */
export function companyRoadStops(positions, isLive=questLive){
  return [
    isLive('courier')&&{id:'induction',point:positions?.['meadow-courier'],dwell:90},
    isLive('bridge')&&{id:'crossing',point:positions?.['crossing-keeper'],dwell:60},
    {id:'relay',point:positions?.['relay-clerk'],dwell:120},
  ].filter(stop=>stop&&Number.isFinite(stop.point?.x)&&Number.isFinite(stop.point?.z));
}
