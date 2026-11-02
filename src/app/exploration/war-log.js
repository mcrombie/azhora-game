import {worldWarReports} from './war-reports.js';
import {isElapsedWorldWar} from './world-war.js';
import {openingTimelineText} from '../../experiments/day-night/opening-presentation.js';

// Derived from replayable events, never from the latest letter or UI receipts.
// Every entry keeps its original time even after later battles or a reload.
export function warLogEntries(state,scenario,known=()=>true){
  const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const side=id=>scenario.factions.find(f=>f.id===id)?.short??id;
  const seen=id=>{const point=scenario.regions.find(r=>r.id===id)?.battlefield;return point&&known(point);};
  const reports=new Map(worldWarReports(state,scenario,known).map(r=>[r.id,r]));
  const elapsed=isElapsedWorldWar(state.scenario),entries=[];
  for(const e of state.events){
    let title,detail,personal=false;
    if(e.type==='opening'){
      title='The Lizeemi War begins';detail='Taleth recommends where to help. You may track a different battle or army from the map; the war continues when you leave a front to its armies.';
    }else if(e.type==='battle-start'&&known(e.engagement.location)){
      title='Battle begins at '+region(e.engagement.region);
      detail=`${side(e.engagement.attacker)} attacks ${side(e.engagement.defender)}. The field remains open until day ${e.engagement.endsOn}.`;
    }else if(e.type==='battle'&&reports.has(e.id)){
      const report=reports.get(e.id);title=report.title;personal=report.hero;
      detail=report.detail+(personal?'':' You left this field to the armies; no player intervention affected it.');
    }else if(e.type==='roadside-result'&&reports.has(e.id)){
      const report=reports.get(e.id);title=report.title;detail=report.detail;personal=true;
    }else if(e.type==='hero-result'&&seen(e.region)){
      personal=true;title='Your intervention at '+region(e.region);
      detail=!e.faction||e.reason==='declined'?'You chose to stay out. The armies continue fighting.':
        e.objective?.type==='duel'?`You challenged the champion for ${side(e.faction)} and ${e.outcome==='success'?'won':e.outcome==='withdraw'?'yielded':'lost'}. The main battle remains to be decided.`:
        `You fought for ${side(e.faction)} and ${e.outcome==='success'?'won the skirmish':e.outcome==='withdraw'?'withdrew':'were defeated'}. ${e.objective?.blocked??0} reinforcement strength removed. The regional battle continues.`;
    }else if(e.type==='rally-result'&&seen(e.region)){
      personal=true;title='Your fighting at '+region(e.region);
      detail=`Fighting for ${side(e.faction)}, you ${e.outcome==='success'?'broke the enemy line':e.outcome==='withdraw'?'withdrew':'were driven back'}. ${e.removed??0} enemy strength removed.${e.progress?.alliesLost!==undefined?` ${e.progress.alliesLost} allied soldiers fell; ${e.progress.routed??0} enemies routed and survived.`:''} The regional outcome is recorded separately.`;
    }else if(['march','retreat'].includes(e.type)&&(seen(e.army.from)||seen(e.army.to))){
      title=`${side(e.army.owner)} ${e.type==='retreat'?'retreats':'advances'}`;
      detail=`${e.army.name} ${e.type==='retreat'?'withdraws':'marches'} from ${region(e.army.from)} toward ${region(e.army.to)}, arriving on day ${e.army.arrives}.`;
    }else if(e.type==='victory'){
      title='The Lizeemi War ends';detail=`${side(e.faction)} has prevailed. The country unites as the Lizeemi League. Return to Taleth in Minora.`;
    }
    if(title)entries.push({id:e.id,day:e.day,elapsedSeconds:e.elapsedSeconds??e.day*60,title,detail:elapsed?openingTimelineText(detail,{sharedOpening:true}):detail,personal});
  }
  return entries.reverse();
}
