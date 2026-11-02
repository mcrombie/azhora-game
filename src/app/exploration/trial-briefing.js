import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
// A fresh opponent waits until the player explicitly starts the round.
import {trialStatsComparison} from './trial-stats-view.js';
export function createTrialBriefing({trial,round,state,onStart,onLeave}){
  const dialog=document.createElement('dialog');dialog.id='combat-trial-briefing';dialog.className='trial-briefing';
  dialog.setAttribute('aria-labelledby','combat-trial-title');
  const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=`THE STILLROOM / ROUND ${round+1} OF ${COMBAT_TRIALS.length} / PAUSED`;
  const title=document.createElement('h2');title.id='combat-trial-title';title.textContent=trial.name;
  const lesson=document.createElement('h3');lesson.textContent=trial.lesson;
  const description=document.createElement('p');description.textContent=trial.description+(trial.id==='militiaman'?` Equipment: ${trial.weapon} and shield.`:'');
  const rules=document.createElement('p');rules.textContent='Full health and mana each round. WASD moves and faces; X strikes; hold F to block frontal blows with your staff (55% less damage); Q casts Fireball. Direction + Space dodges. T locks onto your opponent. R retries this round.';
  const actions=document.createElement('div');actions.className='menu-actions';
  const start=document.createElement('button');start.id='combat-trial-start';start.className='primary';start.textContent='Begin round (Enter)';
  const leave=document.createElement('button');leave.id='combat-trial-leave';leave.textContent='Choose exercise';
  let active=true;
  start.onclick=()=>{if(!active)return;active=false;dialog.close();onStart();};leave.onclick=onLeave;
  const keydown=event=>{if(!active)return;event.stopImmediatePropagation();if(event.repeat){event.preventDefault();return;}
    if(event.code==='Escape'){event.preventDefault();onLeave();}
    else if(event.code==='Enter'){event.preventDefault();(event.target.closest?.('button')??start).click();}
    else if(!['Tab','Space'].includes(event.code))event.preventDefault();
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();onLeave();});document.addEventListener('keydown',keydown,true);
  actions.append(start,leave);dialog.append(eyebrow,title,lesson,description,rules,trialStatsComparison(state.hero,state.guards[0]),actions);document.body.append(dialog);dialog.showModal();start.focus();
  return {active:()=>active,dispose(){active=false;document.removeEventListener('keydown',keydown,true);dialog.close();dialog.remove();}};
}
