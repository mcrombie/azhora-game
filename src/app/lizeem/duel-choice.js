import {LIZEEM_CHAMPIONS} from '../../content/scenarios/lizeem-champions.js';
import {battleApproaches} from './battle-approach.js';

export function createDuelChoice(anchor,onChange=()=>{}){
  const root=document.createElement('fieldset');root.id='encounter-duel-choice';root.hidden=true;
  const legend=document.createElement('legend');legend.textContent='Battle approach';
  const options=document.createElement('div');options.className='duel-options';
  const select=document.createElement('select');select.id='encounter-opening';select.setAttribute('aria-label','Battle opening');
  select.onchange=()=>onChange(select.value);
  const labels={field:'Join the battle',intercept:'Resume reinforcements encounter',duel:'Challenge their champion'};
  let defaultApproach='field';
  const stakes=document.createElement('p');const legacyStakes='An optional one-on-one duel replaces interception. Victory makes two rally guards fall back; it does not win the field or kill those soldiers. Then lead the assault with allies. Withdrawing or losing forfeits the advantage. Death leads to the Reaper, where you may retry. You can issue one challenge in this campaign.';
  const champions=document.createElement('p');champions.className='duel-champions';
  options.append(select);root.append(legend,options,stakes,champions);anchor.after(root);
  return {show(pending,supported,side=null){
    const approaches=battleApproaches(pending,side);defaultApproach=approaches[0];select.replaceChildren();
    for(const value of approaches){const o=document.createElement('option');o.value=value;o.textContent=labels[value];select.append(o);}
    root.hidden=!supported||!!pending.rally||approaches.length<2&&pending.duel?.status!=='accepted';select.value=defaultApproach;select.disabled=!!pending.duel;
    stakes.textContent=pending.fieldBattleAvailable?'Join the armies in one battle, or challenge the opposing champion first. Winning the optional duel makes the captain and two soldiers retreat and lifts your side’s morale. Losing or yielding strengthens enemy morale; the captain still joins the battle.':pending.commanders?'Resume this saved encounter, or challenge the opposing captain before the allied assault. Winning the duel makes the captain and two guards retreat and lifts your side’s morale.':legacyStakes;
    champions.textContent=Object.entries(pending.commanders??LIZEEM_CHAMPIONS).map(([side,c])=>`${side==='west'?'West':'East'}: ${c.name} of ${c.home}${c.status?' / '+c.status:''}`).join(' / ');
  },approach:()=>root.hidden?defaultApproach:select.value};
}
