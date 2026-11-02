import {prepare, view as capture} from './caricas-polish-smoke.js';
import {ISAREOS_BECKS, NETHEREUM_STREAMS,LIZEEM_HEAD} from '../../content/regions/western-regions/west-regions.js';
import {WEST_PROFILES} from '../../content/regions/western-regions/west-ground.js';
export {prepare};
export async function view(a, index) {
  const beck = [...ISAREOS_BECKS, ...NETHEREUM_STREAMS,LIZEEM_HEAD][index], profile = WEST_PROFILES.get(beck.id), mouth = profile.at(-1);
  const mid=profile[Math.floor(profile.length*.5)],source=profile[0];
  const position = {x: mid.x+10, z: mid.z};
  const result = await capture(a, position, {yaw: Math.atan2(mid.x-source.x,mid.z-source.z), pitch: .8, distance: 145});
  const dry = profile.filter(p => (!beck.fadeBed || p.along < .65) && a.groundProbe(p.x, p.z).water === null);
  if (dry.length) throw Error(beck.id + ': dry break in the stream');
  const hidden=profile.filter(p=>p.half>.8&&(!beck.fadeBed||p.along<.65))
    .map(p=>({x:p.x,z:p.z,water:a.groundProbe(p.x,p.z).water,ground:a.testWorld.renderedGroundHeight(p.x,p.z)}))
    .filter(p=>p.ground>=p.water);
  if(hidden.length)throw Error(beck.id+': rendered terrain hides stream: '+JSON.stringify(hidden.slice(0,4)));
  return {id: beck.id, ...result,terrain:a.testWorld.riverGroundMetrics()};
}
