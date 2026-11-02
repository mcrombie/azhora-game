// Original chapter music: four melodies, with answers and a contrasting middle.
// The chapter host supplies settlement positions; audio never imports terrain.
export const YUNETHRE_SCORES=Object.freeze({
  'yunethre-town':{title:'A Table Beside the Lake',beat:.76,length:256,rest:14,mix:.92,area:true,fadeIn:2.4,fadeOut:2.4},
  'yunethre-centaurs':{title:'Hooves upon the Open Grass',beat:.66,length:256,rest:12,mix:.91,area:true,fadeIn:2.4,fadeOut:2.4},
  'yunethre-celder':{title:'The Oath at Canerd',beat:.78,length:256,rest:15,mix:.88,area:true,fadeIn:2.4,fadeOut:2.4},
  'yunethre-wilds':{title:'Beyond the Familiar Road',beat:.94,length:256,rest:19,mix:.93,area:true,fadeIn:2.4,fadeOut:2.4},
});

// Hysteresis prevents a character pacing at a town boundary from continually
// changing pieces. A region/room change still takes effect immediately.
export function yunethreMusicArea({regionId,position,inside=false,town,centaurs}={},previous=null){
  if(inside)return null;
  if(regionId===61||regionId===62)return 'yunethre-celder';
  if(regionId!==38)return null;
  if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return 'yunethre-wilds';
  for(const [id,site]of [['yunethre-town',town],['yunethre-centaurs',centaurs]]){
    if(!Number.isFinite(site?.x)||!Number.isFinite(site?.z))continue;
    if(Math.hypot(position.x-site.x,position.z-site.z)<=(previous===id?94:72))return id;
  }
  return 'yunethre-wilds';
}

const THEMES={
  'yunethre-town':{
    // A lilting G-major tune, plucked strings answered by a small reed voice.
    chords:[[43,50,59],[40,52,59],[48,55,60],[50,57,62]],
    away:[[45,52,60],[48,55,64],[43,50,59],[50,57,66]],voice:'pluck',answerVoice:'reed',pulse:[.5,3.5,5.5],
    tune:[[0,67,1.5],[2,71,1],[3.5,74,2],[6,72,1],[8,71,2],[11,69,1],[12.5,67,2.5],[16,64,1.5],[18,67,1],[20,72,2],[23,71,1],[24.5,69,2],[28,67,3]],
    reply:[[1,74,2],[4,76,1.5],[6,74,1],[9,71,2],[12,67,2],[16,72,2],[19,71,1],[21,69,2],[24,66,1.5],[27,69,1],[29,67,2]],
    middle:[[1,69,2],[4,72,2],[8,76,3],[13,74,2],[17,71,3],[22,69,2],[26,66,2],[29,62,2]],
    cadence:[[1,71,2],[6,69,2],[11,66,2],[17,67,6]],
  },
  'yunethre-centaurs':{
    // Dorian reed calls and an uneven, gentle hoof-like pulse; never a war drum.
    chords:[[50,57,65],[48,55,64],[43,50,59],[50,57,65]],
    away:[[43,55,62],[45,52,60],[48,55,64],[50,57,65]],voice:'reed',answerVoice:'bow',pulse:[0,1.5,4,5.5],
    tune:[[0,74,1],[1.5,77,.75],[3,76,1.5],[5,74,2],[8,72,1],[9.5,69,.75],[11,72,1.5],[14,74,1],[16,79,2],[19,77,1],[21,76,1.5],[24,74,2],[28,69,2]],
    reply:[[.5,69,1],[2,72,1],[4,74,2],[8,77,1],[10,76,1],[12,74,2],[16,71,1],[18,74,1],[20,79,2],[24,77,1],[26,76,1],[28,74,3]],
    middle:[[1,67,2],[4,71,2],[8,72,1],[10,69,2],[14,67,1],[17,72,2],[20,76,2],[25,77,2],[28,74,3]],
    cadence:[[0,77,2],[5,76,1.5],[9,72,2],[15,74,7]],
  },
  'yunethre-celder':{
    // A restrained B-minor heraldic melody over bowed fifths, not combat music.
    chords:[[47,54,62],[43,50,59],[50,57,66],[45,52,61]],
    away:[[40,47,55],[43,50,59],[50,57,66],[42,49,58]],voice:'horn',answerVoice:'bow',pulse:[0,4,6],
    tune:[[0,66,2],[3,71,2],[6,74,1],[8,73,2],[12,71,3],[16,69,2],[19,66,1],[21,62,2],[25,66,2],[28,71,3]],
    reply:[[1,74,2],[4,78,2],[8,76,2],[12,74,2],[16,73,3],[21,69,2],[25,70,1],[28,71,3]],
    middle:[[1,67,3],[6,71,2],[10,74,3],[15,73,2],[19,69,3],[24,70,2],[28,66,3]],
    cadence:[[1,74,2],[6,73,2],[11,70,2],[17,71,6]],
  },
  'yunethre-wilds':{
    // An unhurried A-minor walking melody: long breaths and open intervals.
    chords:[[45,52,60],[41,48,57],[48,55,64],[43,50,59]],
    away:[[50,57,65],[41,53,60],[48,55,64],[40,52,59]],voice:'reed',answerVoice:'bell',pulse:[1,5],
    tune:[[1,69,3],[6,72,2],[10,76,3],[15,74,2],[19,72,3],[24,67,2],[28,69,3]],
    reply:[[1,64,3],[6,67,2],[10,71,3],[15,72,2],[19,69,3],[24,67,2],[28,64,3]],
    middle:[[2,65,3],[7,69,3],[12,72,2],[17,76,3],[23,71,2],[27,68,3]],
    cadence:[[2,72,3],[8,71,3],[15,69,7]],
  },
};

export function yunethrePhrase(id,variation=0){
  const theme=THEMES[id],score=YUNETHRE_SCORES[id];if(!theme)return null;
  const events=[],cycle=Math.abs(Math.floor(variation))%3,wild=id==='yunethre-wilds',centaurs=id==='yunethre-centaurs',celder=id==='yunethre-celder';
  const add=(at,note,duration,voice,level,pan=0)=>events.push({at:at*score.beat,note,duration:duration*score.beat,voice,level,pan});
  for(let section=0;section<8;section++){
    const offset=section*32,quiet=[0,3,7].includes(section),chords=[3,4].includes(section)?theme.away:theme.chords;
    for(let bar=0;bar<(section===7?3:4);bar++){
      const at=offset+bar*8,chord=chords[bar];
      chord.forEach((note,j)=>add(at+j*.16,note,quiet?5.2:6.4,'pad',quiet?.015:.021,(j-1)*.3));
      if(section!==3)for(const [k,step]of theme.pulse.entries()){
        if(quiet&&k%2)continue;
        add(at+step,chord[(k+cycle+bar)%3]+(celder?0:12),wild?1.8:1.2,'pluck',quiet?.025:celder?.033:.038,k%2?.28:-.28);
      }
      if(celder&&[1,2,4,5,6].includes(section))add(at+.2,chord[0]-12,4.5,'bow',.019,-.16);
      if(centaurs&&[1,2,5,6].includes(section))for(const step of [0,3,4.5])add(at+step,38,.22,'drum',step===0?.020:.012,-.18);
    }
    let melody=[2,5].includes(section)?theme.reply:section===4?theme.middle:theme.tune;
    if(section===3)melody=theme.middle.filter((_,i)=>i%2===0);
    if(section===0)melody=theme.tune.slice(0,4);
    if(section===7)melody=theme.cadence;
    if(section===6&&cycle===1)melody=theme.reply;
    if(section===2&&cycle===2)melody=theme.middle;
    const voice=[2,5].includes(section)?theme.answerVoice:section===3?'bell':theme.voice;
    for(const [at,note,duration]of melody)add(offset+at,note,duration,voice,(celder?.036:wild?.043:.047)*(quiet?.78:1),.12);
    // The countervoice answers only in gaps; the tune remains easy to follow.
    if(section===5)for(const [bar,at]of [[0,7],[1,15],[2,23]])add(offset+at,chords[bar][1],2,'bell',.019,-.3);
  }
  return events.sort((a,b)=>a.at-b.at);
}
