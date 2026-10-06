import { SPELLS } from './sorcery.js';

/** A compact spell selector; it appears only after the first actual lesson. */
export function createMagicUI({ container, magic, onCast = () => {}, onSelect = () => {} }) {
  const root=document.createElement('section');root.className='magic-hud';root.hidden=true;root.setAttribute('aria-label','Spells and focus');
  const header=document.createElement('div');header.className='magic-hud-heading';
  const title=document.createElement('span');title.textContent='Sorcery';
  const amount=document.createElement('span');header.append(title,amount);
  const bar=document.createElement('progress');bar.setAttribute('aria-label','Spell focus');
  const choices=document.createElement('div');choices.className='magic-hud-spells';
  const cast=document.createElement('button');cast.type='button';cast.className='magic-hud-cast';
  const status=document.createElement('p');status.className='magic-hud-status';
  const help=document.createElement('small');help.textContent='Z · Cast   N · Change spell';
  cast.addEventListener('click',()=>onCast());root.append(header,bar,choices,cast,status,help);container.append(root);
  let last='';
  function update({visible=true,blockedReason=''}={}) {
    const state=magic.view();root.hidden=!visible||!state.learned.length;if(root.hidden)return;
    amount.textContent=`Focus ${Math.floor(state.focus)} / ${state.maxFocus}`;bar.max=state.maxFocus;bar.value=state.focus;
    const key=JSON.stringify([state.learned,state.selected]);
    if(key!==last){last=key;choices.replaceChildren();for(const id of state.learned){const button=document.createElement('button');
      button.type='button';button.dataset.spell=id;button.textContent=SPELLS[id].name;button.setAttribute('aria-pressed',String(state.selected===id));
      button.addEventListener('click',()=>{magic.select(id);onSelect(id);update();});choices.append(button);}}
    cast.textContent=state.casting?'Gathering focus…':`Cast ${SPELLS[state.selected]?.name??'spell'}`;
    const ready=state.readiness;
    cast.disabled=!!blockedReason||!ready.ok;
    cast.title=blockedReason||ready.reason||`Costs ${ready.cost} focus`;
    root.dataset.ready=blockedReason?'unavailable':ready.code;
    status.textContent=blockedReason||(['equipment','broken'].includes(ready.code)?`${ready.reason} I opens your satchel.`
      :ready.reason||`${ready.cost} focus · ${SPELLS[state.selected]?.spoken?'Stand near someone.':'Face your target, then cast.'}`);
  }
  return {root,update,destroy:()=>root.remove()};
}
