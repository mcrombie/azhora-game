import {LONGFORM_BEATS,longformPhrase} from './longform-score.js';
// One motif shared by the chamber, its duels and their short cadences.
// Later rounds add low voices, not tempo or volume: warnings keep their space.
export const STILLROOM_SCORES=Object.freeze({
  stillroom:{title:'Mist Without Hours',beat:1.05,length:LONGFORM_BEATS,rest:12,mix:.85},
  duel:{title:'A Measure of Courage',beat:.68,length:LONGFORM_BEATS,rest:3,mix:.72},
  'trial-victory':{title:'A Lesson Learned',beat:.6,length:6,rest:0,mix:.85,once:true},
  'trial-defeat':{title:'Begin Again',beat:.75,length:5,rest:0,mix:.85,once:true},
});

export const trialMusicTier=round=>round>=9?3:round>=6?2:round>=3?1:0;

export function stillroomPhrase(id,variation=0,tier=0){
  const score=STILLROOM_SCORES[id];if(!score)return null;
  const events=[],add=(at,note,duration,voice,level,pan=0)=>events.push({at:at*score.beat,note,duration:duration*score.beat,voice,level,pan});
  if(score.once){
    const victory=id==='trial-victory';
    for(const [at,note]of (victory?[[0,62],[1,65],[2,69],[3.5,74]]:[[0,69],[1.5,65],[3,62]]))add(at,note,1.4,'bell',.055);
    for(const note of (victory?[50,57,65]:[50,57,62]))add(.3,note,2.5,'pad',.018);
  }else return longformPhrase(id,score.beat,variation,tier);
  return events.sort((a,b)=>a.at-b.at);
}
