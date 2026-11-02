import {STILLROOM_SCORES,stillroomPhrase} from './stillroom-score.js';
import {LONGFORM_BEATS,longformPhrase} from './longform-score.js';
import {YUNETHRE_SCORES,yunethrePhrase} from './yunethre-score.js';

// Complete multi-section pieces. Nature has space inside and between them.
export const SCORE = Object.freeze({
  ...STILLROOM_SCORES,
  ...YUNETHRE_SCORES,
  tower: {title:'The Still Hours',beat:.92,length:LONGFORM_BEATS,rest:17},
  country: {title:'Along the Lizeem',beat:.78,length:LONGFORM_BEATS,rest:22},
  night: {title:'Under the Quiet Sky',beat:1.1,length:LONGFORM_BEATS,rest:28},
  battle: {title:'Two Banks, One River',beat:.55,length:LONGFORM_BEATS,rest:3,mix:.85},
});

export function soundScene({mode='loading',active=true,inside=false,room=null,hour=10,training=false,reviewing=false,combatActive=false,trial=null,musicArea=null}={}) {
  if(!active||['loading','pause','sailing-paused','developer','combat-menu','crossing'].includes(mode))return null;
  if(trial&&mode==='skirmish')return reviewing||trial.outcome?'stillroom':'duel';
  if(mode==='skirmish'&&!reviewing||combatActive)return 'battle';
  if(training)return 'stillroom';
  if(inside&&room!=='lookout'||['limbo','reaper'].includes(mode))return 'tower';
  if(!inside&&YUNETHRE_SCORES[musicArea])return musicArea;
  return hour<5.5||hour>=19.5?'night':'country';
}

export function scorePhrase(id,variation=0,tier=0) {
  const chamber=stillroomPhrase(id,variation,tier);if(chamber)return chamber;
  const chapter=yunethrePhrase(id,variation);if(chapter)return chapter;
  const score=SCORE[id];
  return score?longformPhrase(id,score.beat,variation,tier)??[]:[];
}

export const AUDIO_DEFAULTS=Object.freeze({music:.42,nature:.65,muted:false});
// The first bird sketches belong to temperate woodland/farmland, not deserts,
// bare alpine ground, open sea or Thalmagar's country. Expand with real habitats.
const SONGBIRD_REGIONS=new Set([1,2,3,13,14,16,17,25,28,29,30,31,32,33,34,35,36,72,73,74,75,76,77,78,79,114,115]);
export const hasSongbirdAmbience=(regionId=1)=>SONGBIRD_REGIONS.has(regionId);
export const AUDIO_SETTINGS_KEY='azhora-sound-v1';
export function audioSettings(value={}) {
  const volume=(name)=>typeof value?.[name]==='number'&&Number.isFinite(value[name])?Math.max(0,Math.min(1,value[name])):AUDIO_DEFAULTS[name];
  return {music:volume('music'),nature:volume('nature'),muted:typeof value?.muted==='boolean'?value.muted:false};
}
