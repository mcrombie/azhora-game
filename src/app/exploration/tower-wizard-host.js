import {GUILD_WIZARDS} from '../../content/regions/minora-frontier/guild-wizards.js';
import {TOWER} from './tower-state.js';
import {writeHud} from './hud-write.js';

const topicsFor=wizard=>wizard.topics??[{id:'work',question:wizard.question,topic:wizard.topic,answer:wizard.answer}];

export const guildWizardPosition=id=>{
  const wizard=GUILD_WIZARDS.find(w=>w.id===id);
  return wizard?{x:TOWER.x+wizard.offset.x,y:TOWER.y+wizard.offset.y,z:TOWER.z+wizard.offset.z}:null;
};

// These introductions are optional and have no campaign or save side effects.
// Height matters: standing over Snero on another floor is not a conversation.
export function createTowerWizardHost({state,position,mode,setMode}){
  const prompt=document.createElement('button');prompt.id='guild-wizard-interact';prompt.hidden=true;
  const dialog=document.createElement('section');dialog.id='guild-wizard-dialog';dialog.hidden=true;
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','guild-wizard-name');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow" id="guild-wizard-floor"></span><h2 id="guild-wizard-name"></h2><h3 id="guild-wizard-topic"></h3><p id="guild-wizard-words"></p><small>Time stands still throughout the tower.</small><div class="tower-dialog-actions"><button id="guild-wizard-question"></button><button id="guild-wizard-back" hidden>Back to our conversation</button><button id="guild-wizard-close">Continue exploring</button></div></div>';
  document.body.append(prompt,dialog);
  const $=id=>dialog.querySelector('#guild-wizard-'+id),topicButtons=new Map([['work',$('question')]]);
  for(const wizard of GUILD_WIZARDS)for(const item of topicsFor(wizard)){
    if(topicButtons.has(item.id))continue;
    const button=document.createElement('button');button.id='guild-wizard-question-'+item.id;button.hidden=true;
    $('back').before(button);topicButtons.set(item.id,button);
  }
  const buttons=[...dialog.querySelectorAll('button')];
  let speaking=null,topic='hello',previousFocus=null,bolburWelcomed=false;
  const target=()=>{
    if(state().room!=='tower'||mode()!=='playing')return null;
    return GUILD_WIZARDS.find(w=>{const at=guildWizardPosition(w.id);return Math.abs(position.y-at.y)<2.4&&Math.hypot(position.x-at.x,position.z-at.z)<3.6;})??null;
  };
  function paint(){
    if(!speaking)return;
    $('floor').textContent='WIZARD GUILD / '+speaking.title.toUpperCase();
    $('name').textContent=speaking.name;
    const items=topicsFor(speaking),selected=items.find(item=>item.id===topic);
    $('topic').textContent=selected?.topic??speaking.title;
    $('words').textContent=selected?.answer??speaking.greeting;
    for(const [id,button] of topicButtons){
      const item=items.find(value=>value.id===id);button.hidden=topic!=='hello'||!item;
      if(item)button.textContent=item.question;
    }
    $('back').hidden=topic==='hello';
  }
  function update(){
    const wizard=target();writeHud(prompt,'hidden',!wizard);
    if(wizard)writeHud(prompt,'textContent',`F / Talk to ${wizard.name}`);
    if(wizard?.id==='bolbur'&&!bolburWelcomed&&position.x<TOWER.x+11){bolburWelcomed=true;interact();}
  }
  function interact(){
    const wizard=target();if(!wizard)return false;
    previousFocus=document.activeElement;speaking=wizard;topic='hello';
    setMode('briefing');prompt.hidden=true;dialog.hidden=false;paint();$('question').focus();return true;
  }
  function close(){
    if(!speaking)return false;
    speaking=null;topic='hello';dialog.hidden=true;setMode('playing');update();
    if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;return true;
  }
  function restore(){speaking=null;topic='hello';previousFocus=null;dialog.hidden=true;prompt.hidden=true;}
  prompt.onclick=interact;$('close').onclick=close;
  for(const [id,button] of topicButtons)button.onclick=()=>{
    if(!speaking||!topicsFor(speaking).some(item=>item.id===id))return;
    topic=id;paint();$('back').focus();
  };
  $('back').onclick=()=>{if(!speaking)return;topic='hello';paint();$('question').focus();};
  return {interact,update,close,restore,
    speaker:()=>speaking?guildWizardPosition(speaking.id):null,
    state:()=>({open:!!speaking,id:speaking?.id??null,topic,near:target()?.id??null}),
    keydown(event){
      if(!speaking)return false;
      if(event.code==='Escape'){event.preventDefault();close();}
      else if(event.code==='Tab'){
        event.preventDefault();const visible=buttons.filter(button=>!button.hidden),index=visible.indexOf(document.activeElement);
        visible[(index+(event.shiftKey?-1:1)+visible.length)%visible.length].focus();
      }else if(!['Enter','Space'].includes(event.code))event.preventDefault();
      return true;
    },
    dispose(){restore();prompt.remove();dialog.remove();},
  };
}
