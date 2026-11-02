const INTRO='Teresod, I have a new assignment for you. In a land called Azhora, humankind faces a peril that could drive it from the continent. Our Guild works across places and ages; I help you find where you are needed. The door here leads to our tower in Minora, where I will explain the Lizeemi War. Uguth, our Battle Wizard, will teach you your staff, guard, dodge, and Fireball, then test you against a militiaman. Speak with him beside the refuge. I am going through this door now to wait in my chamber in Minora. Once Uguth clears you, follow me. The matching door in my room brings you back here whenever you wish. Nothing in this realm takes time from Azhora.';
import {MARKER_STYLE} from '../../../world/actors/marker-style.js';

import {COMBAT_LESSONS} from '../../../gameplay/combat/combat-tutorial.js';
import {COMBAT_TRIALS} from '../../../gameplay/combat/combat-trials.js';
export function createArrivalView({train,challenge,duel,explore,skip,depart,saveExit,resume,handoff,returnVisit=false}){
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./arrival.css',import.meta.url).href;document.head.append(css);
  const root=document.createElement('div');root.id='stillroom-arrival';
  root.innerHTML='<header><span class="eyebrow">TERESOD / BETWEEN PLACES AND AGES</span><h2>The Spirit and Time Realm</h2><small>Time stands still</small></header><aside class="arrival-task"><span class="eyebrow">UGUTH / COMBAT PREPARATION</span><h3></h3><p></p><small></small></aside><footer>WASD move · Shift run · F interact · Right-drag look · Scroll zoom · Esc pause · F5 save</footer><output class="arrival-prompt"></output><output class="arrival-notice" role="status"></output>';
  document.body.append(root);
  const objective=document.createElement('div');objective.className='arrival-objective';objective.hidden=true;
  objective.style.setProperty('--quest-gold','#'+MARKER_STYLE.main.colour.toString(16));
  objective.innerHTML='<span class="arrival-objective-label"><small>Main quest</small><strong>Speak with Uguth</strong></span><svg viewBox="0 0 30 36" width="30" height="36" aria-hidden="true"><path d="M15 2 27 16 15 30 3 16Z"/><path class="arrival-objective-inset" d="M15 8 22 16 15 24 8 16Z"/><ellipse cx="15" cy="33" rx="7" ry="2"/></svg>';
  root.append(objective);
  const objectiveTitle=objective.querySelector('strong');let objectiveActive=false;
  const task=root.querySelector('aside'),prompt=root.querySelector('.arrival-prompt'),notice=root.querySelector('.arrival-notice');
  const dialog=document.createElement('dialog');dialog.id='stillroom-conversation';dialog.setAttribute('aria-labelledby','stillroom-dialog-title');dialog.className='arrival-dialog';document.body.append(dialog);
  function button(id,text,fn){const b=document.createElement('button');b.id='arrival-'+id;b.textContent=text;b.onclick=()=>{close();fn();};return b;}
  function close(){dialog.close();}
  let currentKind=null;
  function show(kind,s){
    objective.hidden=true;
    currentKind=kind;
    const approval=kind==='approval',intro=kind==='intro',paused=kind==='pause',portal=kind==='portal';
    dialog.replaceChildren();
    const eyebrow=document.createElement('span');eyebrow.className='eyebrow';eyebrow.textContent=paused?'THE STILLROOM / PAUSED':portal?'THE WAY TO AZHORA':intro?'TALETH / MASTER TIME WIZARD':'UGUTH / BATTLE WIZARD';
    const title=document.createElement('h2');title.id='stillroom-dialog-title';title.textContent=intro?'An assignment across the ages':approval?'You are ready for Azhora':paused?'Take your time':portal?(s.approved?'The door is open to you':'Preparation comes first'):'Whenever you are ready';
    const copy=document.createElement('p');copy.textContent=intro?INTRO:approval?'Well fought. That shield belongs to a militiaman: an ordinary person given weapons and a little training. You now know what to expect in the Lizeemi War. Taleth entrusted your preparation to me. You are ready to join him. You may also face stronger opponents, or take your time here.':paused?'Your completed lessons and challenge victories are kept separately. Time in Azhora stands still.':portal?(s.approved?'Beyond this threshold is the Wizards’ Tower in Minora. Taleth will explain the war there.':'Uguth must approve your preparation before this door opens. Complete his Combat Training Tutorial, or ask Uguth to skip preparation for now.'):s.approved?'The door to Azhora is ready. You may revisit any activity here; there is no hurry.':'We will start with your staff, movement, and fireball, then learn to face a shield. Each round begins at full health and mana. A defeat here is only a chance to try again.';
    const actions=document.createElement('div');actions.className='menu-actions';
    if(intro){actions.append(button('handoff','Continue',handoff));}
    else if(paused){actions.append(button('resume','Resume',resume));if(!returnVisit)actions.append(button('save-exit','Save and return to menu',saveExit));}
    else if(portal&&s.approved){actions.append(button('depart',returnVisit?'Return to Taleth\u2019s chamber':'Enter Azhora',depart),button('stay','Stay here',explore));}
    else if(portal){actions.append(button('explore','Return to Uguth',explore));}
    else{
      if(approval)actions.append(button('door','Go to the Azhora door',()=>explore(true)));
      actions.append(button('train','Combat Training Tutorial'+(s.lessons.length&&s.lessons.length<COMBAT_LESSONS.length?' / Resume':''),train));
      actions.append(button('challenge','Escalating Challenge',()=>show('challenge',s)));
      actions.append(button('duel','Duel Uguth / Master difficulty',duel));
      if(kind==='challenge'){
        title.textContent='Escalating Challenge';copy.textContent='Optional opponents in increasing difficulty. Start anywhere; challenge victories are separate from your tutorial. Every fight begins at full health and mana.';
        actions.replaceChildren();
        const label=document.createElement('label');label.textContent='Choose opponent ';const select=document.createElement('select');select.id='arrival-challenge-opponent';
        COMBAT_TRIALS.forEach((t,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1}. ${t.name}${s.wins.includes(t.id)?' / defeated':''}`;select.append(option);});
        select.value=Math.max(0,COMBAT_TRIALS.findIndex(t=>!s.wins.includes(t.id)));label.append(select);
        actions.append(label,button('challenge-start','Begin challenge',()=>challenge(Number(select.value))),button('activities','Back to Uguth',()=>show('options',s)));
      }
      actions.append(button('explore','Explore the Stillroom',explore));
      if(!s.approved){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Skip preparation for now';const note=document.createElement('p');note.textContent='Uguth will let you through without completing the tutorial. You can return to combat practice later.';details.append(summary,note,button('skip','Skip tutorial and unlock the door',skip));dialog.append(eyebrow,title,copy,actions,details);dialog.showModal();actions.querySelector('select,button')?.focus();return;}
    }
    dialog.append(eyebrow,title,copy,actions);dialog.showModal();actions.querySelector('select,button')?.focus();
  }
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();if(currentKind==='intro')handoff();else explore();});
  return {show,close,active:()=>dialog.open,
    draw(s,{combat,nearPortal,nearUguth,approaching}){
      objectiveActive=s.introduced&&!s.approved&&!returnVisit&&!approaching&&!combat&&!dialog.open;
      if(!objectiveActive)objective.hidden=true;
      objectiveTitle.textContent=nearUguth?'F · Talk to Uguth':'Speak with Uguth';
      task.querySelector('.eyebrow').textContent=s.approved?'MAIN QUEST / AZHORA':'UGUTH / COMBAT TRAINING';
      root.hidden=!!combat;task.querySelector('h3').textContent=approaching?'Taleth is coming to meet you':s.approved?'Speak with Taleth in Minora':`Training / ${s.lessons.length} of ${COMBAT_LESSONS.length} lessons`;
      task.querySelector('p').textContent=approaching?'Welcome back, Teresod.':s.approved?'Pass through the blue-lit door in the refuge. Taleth is waiting in his tower chamber to explain your mission. All three activities remain available.':'Speak with Uguth and choose Combat Training Tutorial. Learn your moves, then defeat the militiaman to open the way to Taleth.';
      task.querySelector('small').textContent=s.skipped?'Tutorial skipped / Door unlocked':s.approved?'Main quest / Join Taleth':COMBAT_LESSONS[s.lessons.length]?.name??'Training complete';
      prompt.textContent=dialog.open?'':nearPortal?`F · ${s.approved?(returnVisit?'Return to Taleth':'Enter Azhora'):'The door is sealed'}`:nearUguth?'F · Speak with Uguth':'';
      prompt.hidden=!prompt.textContent;
      if(objectiveActive&&nearUguth&&!nearPortal)prompt.hidden=true;
    },placeObjective(point){
      // Projection follows the current rendered camera; never pin a target
      // behind the player onto the opposite side of the screen.
      objective.hidden=!objectiveActive||dialog.open||point.z< -1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
      if(objective.hidden)return;
      objective.style.left=((point.x+1)*innerWidth/2)+'px';
      objective.style.top=((1-point.y)*innerHeight/2)+'px';
    },notice(text){notice.textContent=text;},
    dispose(){close();dialog.remove();root.remove();css.remove();},
  };
}
