// Eight connected 32-beat sections: the melody develops before it returns.
// All timing is musical/device time, independent of accelerated campaign time.
const D=[50,57,64],G=[43,55,62],C=[48,55,64],A=[45,57,64],F=[41,53,60],Bm=[47,54,62];
const THEMES={
  tower:{chords:[D,C,G,A],away:[F,C,G,A],voice:'bell',
    theme:[[1,74,2],[5,69,2],[9,76,3],[14,73,2],[18,69,2],[22,67,2],[26,74,4]],
    answer:[[1,69,3],[6,72,2],[10,76,3],[15,74,2],[19,71,3],[24,69,2],[28,64,3]],
    awayMelody:[[2,65,3],[7,69,2],[11,72,3],[16,67,2],[20,71,3],[25,76,2],[28,73,3]]},
  country:{chords:[D,G,C,A],away:[Bm,G,C,A],voice:'reed',
    theme:[[1,62,1],[3,66,1],[5,69,2],[9,67,2],[13,64,1],[15,62,3],[21,66,2],[24,69,2],[27,71,1],[29,67,2]],
    answer:[[1,69,2],[4,66,1],[7,64,2],[11,62,2],[15,67,3],[20,71,2],[23,69,1],[26,64,2],[29,61,2]],
    awayMelody:[[2,66,2],[5,71,3],[10,69,2],[14,67,3],[19,64,2],[22,67,1],[25,69,3],[29,73,2]]},
  night:{chords:[D,C,F,A],away:[Bm,G,C,A],voice:'bell',
    theme:[[2,69,4],[10,64,4],[19,67,3],[27,62,4]],
    answer:[[3,66,4],[11,67,3],[20,65,4],[28,64,3]],
    awayMelody:[[3,71,3],[10,69,4],[20,67,3],[27,64,4]]},
  battle:{chords:[[38,45,50],F,G,A],away:[C,G,F,A],voice:'reed',
    theme:[[0,62,2],[4,65,2],[7,64,1],[10,62,3],[16,57,2],[20,60,2],[24,62,4]],
    answer:[[1,57,2],[5,60,2],[9,62,2],[12,65,3],[18,67,2],[22,65,1],[25,64,2],[29,61,2]],
    awayMelody:[[0,60,3],[5,64,2],[9,67,3],[14,62,2],[18,65,3],[24,64,2],[28,61,3]]},
  stillroom:{chords:[D,C,G,A],away:[F,C,G,D],voice:'bell',
    theme:[[1,74,3],[7,69,3],[13,77,3],[20,76,3],[26,74,4]],
    answer:[[3,69,3],[10,72,3],[18,71,4],[26,73,3]],
    awayMelody:[[2,65,4],[11,72,4],[20,67,3],[28,69,3]]},
  duel:{chords:[D,F,C,A],away:[G,C,F,A],voice:'reed',
    theme:[[1,62,2],[7,65,2],[12,69,3],[19,67,2],[25,64,2],[29,62,2]],
    answer:[[1,69,2],[5,67,2],[10,65,3],[16,64,2],[21,60,2],[26,61,3]],
    awayMelody:[[1,67,3],[7,62,2],[11,64,3],[17,65,2],[22,69,2],[27,73,3]]},
};
export const SCORE_SECTIONS=Object.freeze(['Threshold','First theme','An answer','Breathing space','Farther afield','Two voices','Homeward','Afterglow']);
export const LONGFORM_BEATS=256;

export function longformPhrase(id,beat,variation=0,tier=0){
  const theme=THEMES[id];if(!theme)return null;
  const events=[],combat=id==='battle'||id==='duel',sparse=id==='night'||id==='stillroom';
  const weight=Math.max(0,Math.min(3,Math.floor(tier))),cycle=Math.abs(Math.floor(variation))%3;
  const add=(at,note,duration,voice,level,pan=0)=>events.push({at:at*beat,note,duration:duration*beat,voice,level,pan});
  for(let section=0;section<8;section++){
    const offset=section*32,quiet=section===0||section===3||section===7;
    const chords=section===3||section===4?theme.away:theme.chords;
    // A breathing passage and final cadence leave real room for birds and air.
    const bars=section===7?3:4;
    for(let bar=0;bar<bars;bar++){
      const chord=chords[bar],at=offset+bar*8,held=sparse?5.4:6.6;
      chord.forEach((note,j)=>add(at+j*.12,note,held,'pad',(combat?.014:sparse?.017:.024)*(quiet?.8:1),(j-1)*.35));
      if(!sparse&&section!==3){
        const steps=quiet?[1,5]:combat?[0,2,4,6]:[.5,3,6];
        steps.forEach((step,k)=>add(at+step,chord[(k+bar+cycle)%3]+(combat?0:12),1.1,'pluck',combat?.038:.045,k%2?.32:-.32));
      }
      if(id==='battle'||id==='duel'&&weight>=1||!combat&&!sparse&&[2,5,6].includes(section))
        add(at+.2,chord[0]-12,quiet?3.2:5.5,'bow',combat?.023:.018,-.2);
      if(id==='duel'&&weight>=2||id==='battle'&&[2,4,6].includes(section))
        add(at+4,chord[1]-12,2.2,'horn',.019,.18);
      if(id==='duel'&&weight===3)add(at+2,chord[0]-12,1.1,'bow',.021);
    }
    let melody=section===2||section===5?theme.answer:section===4?theme.awayMelody:theme.theme;
    if(cycle===1&&section===6)melody=theme.answer;
    if(cycle===2&&section===2)melody=theme.awayMelody;
    if(section===3)melody=theme.awayMelody.filter((_,i)=>i%2===0);
    if(section===0)melody=melody.slice(0,sparse?2:3);
    if(section===7)melody=[[2,69,3],[10,64,3],[18,62,5]];
    const voice=section===4||section===5?(sparse?'reed':combat?'reed':'bow'):theme.voice;
    for(const [at,note,duration]of melody){
      const octave=(id==='tower'||id==='stillroom')&&[3,4,5].includes(section)?-12:0;
      add(offset+at+.025*(section%3),note+octave,duration,voice,(combat?.036:sparse?.035:.047)*(quiet?.75:1),.15);
    }
    // A separate low reply, placed in the melody's rests rather than doubling it.
    if(section===5)for(const [at,note]of [[3,chords[0][1]],[14,chords[1][1]],[24,chords[3][0]]])
      add(offset+at,note,2.4,'bell',.022,-.3);
    if(combat)for(let at=0;at<(section===7?24:32);at+=section===3?8:4)
      add(offset+at,38,.35,'drum',(at%8===0?.07:.045)*(quiet?.8:1),-.1);
  }
  return events.sort((a,b)=>a.at-b.at);
}
