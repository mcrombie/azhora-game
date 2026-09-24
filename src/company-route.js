import {questLive} from './quest-slate.js';
import {distanceAlongRoad,roadLengths} from './mercenaries.js';
import {MUS_ROUTE} from './wild-route.js';

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

/** Upgrade the old company's restored timetable once, without walking everybody
 * back to a bridge they already crossed. Call only after old companion releases,
 * deaths and the landing lesson have been restored into that company instance.
 * New living-story saves already own their real feet and never use this adapter.
 */
export function legacyCompanyProgress({placements=[],roster=[],road=[],ambush,bridgeExit,relay,
  playerPosition=null,wildRoute=MUS_ROUTE}={}){
  const valid=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z);
  const spans=road.length>1?roadLengths(road):null;
  const along=p=>spans&&valid(p)?distanceAlongRoad(road,p,spans):Infinity;
  const ambushAt=along(ambush),crossedAt=along(bridgeExit),relayAt=along(relay);
  const wildSpans=wildRoute.length>1?roadLengths(wildRoute):null;
  return placements.map(p=>{
    const entry=roster.find(a=>a.id===p.id),withPlayer=p.phase==='with-traveler';
    const at=withPlayer?playerPosition:p;
    const position=valid(at)?{x:at.x,z:at.z}:null;
    const result={id:p.id,position,withPlayer,stage:'arrival',route:{},tasks:[],reported:false};
    // An in-progress original opening lesson retains its authored placement.
    if(['coming','landing'].includes(p.phase)||p.chapterOne)return result;
    if(entry?.route==='wild'&&wildSpans){
      const distance=withPlayer&&position?distanceAlongRoad(wildRoute,position,wildSpans)
        :Number.isFinite(p.distance)?p.distance:0;
      let waypoint=wildSpans.findIndex(length=>length>distance+.1);
      if(waypoint<0)waypoint=wildRoute.length;
      result.stage=p.phase==='mustered'?'mustered':waypoint>=wildRoute.length?'imperial-muster':'road';
      result.route={waypoint:Math.min(waypoint,wildRoute.length-1)};
      return result;
    }
    const distance=withPlayer&&position?along(position):Number.isFinite(p.distance)?p.distance:along(position);
    if(!Number.isFinite(distance))return result;
    result.tasks=['harbor','training'];
    result.stage='road';
    if(distance>ambushAt+2){result.stage='bridge';result.tasks.push('ambush');}
    if(distance>=crossedAt){result.stage='nothom';result.tasks.push('chip','crossing');}
    if(distance>relayAt+3&&p.stopId!=='relay'){
      result.stage='imperial-muster';result.tasks.push('nothom');result.reported=true;
    }
    if(p.phase==='mustered'){
      result.stage='mustered';result.reported=true;
      result.tasks=[...new Set([...result.tasks,'ambush','chip','crossing','nothom','empire-muster'])];
    }
    return result;
  });
}
