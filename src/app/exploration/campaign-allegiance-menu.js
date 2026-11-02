import {CAMPAIGN_SIDES,isCampaignSide} from './campaign-allegiance.js';

export function createCampaignAllegianceMenu({choose,back}){
  const menu=document.getElementById('campaign-allegiance-menu'),list=document.getElementById('campaign-allegiance-options');
  const begin=document.getElementById('campaign-allegiance-begin'),note=document.getElementById('campaign-allegiance-note');
  let request=null,selection=null;
  const inputs=CAMPAIGN_SIDES.map(side=>{
    const card=document.createElement('label'),radio=document.createElement('input'),copy=document.createElement('span');
    const heading=document.createElement('strong'),description=document.createElement('span');
    radio.type='radio';radio.name='campaign-side';radio.value=side.id;
    heading.textContent=side.name;description.textContent=side.description;copy.append(heading,description);card.append(radio,copy);list.append(card);
    radio.onchange=()=>{selection=side.id;begin.disabled=false;begin.textContent=`${request.data?'Continue with':'Begin for'} ${side.name}`;};
    return radio;
  });
  begin.onclick=()=>{if(!request||!request.legacy&&!isCampaignSide(selection))return;const next={...request,side:request.legacy?null:selection};request=null;menu.hidden=true;choose(next);};
  document.getElementById('campaign-allegiance-back').onclick=()=>back(request);
  menu.addEventListener('keydown',event=>{if(event.code==='Escape'&&!event.repeat){event.preventDefault();back(request);}});
  return {
    show(next){
      request=next;selection=null;begin.disabled=!next.legacy;begin.textContent=next.legacy?'Continue existing campaign':next.data?'Continue campaign':'Begin campaign';
      document.getElementById('campaign-allegiance-heading').textContent=next.legacy?'Continue your existing campaign.':'Which league will you support?';
      menu.querySelector('.campaign-allegiance-card>p').textContent=next.legacy?'Your past battles and saved retry will remain available.':'Help your chosen side unite the river country. Taleth will guide you as the war changes.';
      list.hidden=!!next.legacy;
      const commitment=CAMPAIGN_SIDES.find(side=>side.id===next.commitment);
      note.textContent=next.legacy?'This older journey has an unfinished battle for one side and a saved retry for the other. Continue with its original battle choices so both remain playable. New campaigns choose a fixed side before setting out.':
        commitment?`Your unfinished battle or saved battle retry supports ${commitment.name}. Keep that side to continue this campaign; your past actions are preserved.`:
        next.data?'This older save has no fixed allegiance. Choose the side Taleth should guide you toward from now on. Your past actions and campaign timing are preserved.':
        'Your choice lasts for this campaign. Taleth will suggest the next step toward victory. You may explore, fight elsewhere, or leave his recommended battle to the armies.';
      for(const input of inputs){input.checked=false;input.disabled=!!next.legacy||!!commitment&&input.value!==commitment.id;}
      document.getElementById('start-screen').hidden=true;menu.hidden=false;(next.legacy?begin:inputs.find(input=>!input.disabled)).focus();
    },
    hide(){request=null;selection=null;menu.hidden=true;},
  };
}
