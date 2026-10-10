import {campaignGuidance} from './campaign-guidance.js';
import {writeHud} from './hud-write.js';

export function createCampaignGuidanceView(){
  const $=id=>document.getElementById(id),root=$('world-war-report'),more=$('world-war-report-more');let reportId=null;
  return {update(next,context,report,visible){
    const card=campaignGuidance(next,context);
    writeHud(root,'hidden',!visible);
    for(const [id,value] of [['world-war-objective-stage',card.stage],['world-war-objective-title',card.title],['world-war-objective-detail',card.detail],['world-war-objective-clock',card.clock]])writeHud($(id),'textContent',value);
    const button=$('world-war-next');writeHud(button,'hidden',!card.action);if(card.action)writeHud(button,'textContent',card.action);
    writeHud($('world-war-latest-report'),'hidden',!report);
    writeHud($('world-war-report-dismiss'),'hidden',!report);
    writeHud(more.querySelector('summary'),'textContent',report?.taleth?'Taleth’s letter and strategy':'Report and strategy');
    if(reportId!==(report?.id??null)){more.open=false;reportId=report?.id??null;}
  }};
}
