import {openingReport} from '../../experiments/day-night/opening-presentation.js';
import {campaignGuidance} from './campaign-guidance.js';
import {writeHud} from './hud-write.js';

export function createCampaignGuidanceView(){
  const $=id=>document.getElementById(id),root=$('world-war-report'),more=$('world-war-report-more');let reportId=null;
  const objective=root.querySelector('.war-objective');
  const toggle=$('campaign-panel-toggle')??document.createElement('button');toggle.id='campaign-panel-toggle';toggle.type='button';
  toggle.setAttribute('aria-controls','world-war-objective-detail world-war-report-more');objective.prepend(toggle);
  const small=matchMedia('(max-width:480px), (max-width:960px) and (max-height:480px)');let compact=small.matches;
  function fold(){if(compact)more.open=false;root.classList.toggle('campaign-panel-compact',compact);toggle.textContent=compact?'Details':'Less';toggle.setAttribute('aria-expanded',String(!compact));toggle.setAttribute('aria-label',compact?'Show objective details':'Hide objective details');}
  toggle.onclick=()=>{compact=!compact;fold();};fold();
  const resize=event=>{compact=event.matches;fold();};small.addEventListener('change',resize);
  // Map is already a permanent top-level control; the report-specific shortcut
  // remains available with its historical report instead of a second main CTA.
  root.querySelector('.war-report-extra-actions').prepend($('world-war-report-map'));
  return {update(next,context,report,visible){
    const card=openingReport(campaignGuidance(next,context),context.clockModel);
    writeHud(objective,'hidden',false);
    writeHud(root,'hidden',!visible);
    for(const [id,value] of [['world-war-objective-stage',card.stage],['world-war-objective-title',card.title],['world-war-objective-detail',card.detail],['world-war-objective-clock',card.clock]])writeHud($(id),'textContent',value);
    if(next?.campaignSide&&!['briefing','complete','finale'].includes(next.kind))writeHud($('world-war-objective-stage'),'textContent',"TALETH’S RECOMMENDATION");
    const following=next?.target&&context.trackedTarget?.kind===next.target.kind&&context.trackedTarget?.id===next.target.id;
    const button=$('world-war-next');writeHud(button,'hidden',!card.action||following&&context.clockModel?.running&&context.navigationMode!=='manual'||next?.kind==='army'&&!next.target);if(card.action)writeHud(button,'textContent',next?.target&&context.navigationMode==='manual'?"Follow Taleth’s recommendation":card.action.replace(' / resume time',context.clockModel?.running?'':' & resume'));
    writeHud($('world-war-latest-report'),'hidden',!report);
    writeHud($('world-war-report-dismiss'),'hidden',!report);
    writeHud(more.querySelector('summary'),'textContent','Latest report / optional');
    if(reportId!==(report?.id??null)){more.open=false;reportId=report?.id??null;}
  },dispose(){objective.hidden=false;small.removeEventListener('change',resize);toggle.remove();root.classList.remove('campaign-panel-compact');}};
}
