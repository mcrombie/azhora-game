import {encounterInstruction} from '../../gameplay/combat/encounter-lesson.js';
import {battleProgress} from './battle-progress.js';
import {writeHud} from './hud-write.js';
import {trackingBearing} from './war-tracking.js';

// One active instruction; reference controls are available without advancing combat.
export function createSkirmishHud({practice,reinforcements,pending,site,onPauseChange}){
  const $=id=>document.getElementById('world-skirmish-'+id);
  const objective=$('objective'),help=$('controls'),toggle=$('help'),health=$('health'),dodge=$('dodge');
  const phase=$('phase');phase.hidden=!!practice;
  const guide=document.createElement('div');guide.id='world-skirmish-rally-guide';guide.hidden=true;
  const arrow=document.createElement('span');arrow.textContent='↑';arrow.setAttribute('aria-hidden','true');
  const destination=document.createElement('strong');guide.append(arrow,destination);objective.after(guide);
  let helpOpen=false,ended=false,withdrawLabel;
  const context=practice
    ?'Practice only. No campaign troops or territory change. R restarts this exercise.'
    :pending.rally?`Break ${pending.rally.guards} guards, then hold the gold ring for 6 seconds. Victory forces their retreat and secures ${site.name} for your side. Losing or withdrawing keeps the interception but leaves the outcome to the armies on day ${pending.endsOn}.`
    :`Stop the runner and escorts before they reach the blue rally point. Each soldier stopped removes ${Math.floor(reinforcements.strength/3)} ${reinforcements.name} reinforcement strength. The larger battle at ${site.name} continues until day ${pending.endsOn}; this interception does not transfer territory.`;
  $('context').textContent=!practice&&pending.participation
    ?pending.rally?`Break the remaining ${pending.rally.guards} guards, then hold the gold ring for 6 seconds. Finish to advance to day ${pending.endsOn} and the battle result. Withdraw to preserve casualties and return while it remains active.`
    :`Intercept the remaining ${pending.participation.guards} soldiers. Earlier casualties and escapes are preserved. Completing this phase advances campaign time and opens the final assault. Esc withdraws; you may return to this battlefield while active.`
    :context;
  for(const name of ['objective','health','vitals','actions','help'])$(name).hidden=false;
  help.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.textContent='Help / pause (H)';
  function setHelp(value){
    if(ended)return;
    if(value)withdrawLabel=$('withdraw').textContent;
    $('withdraw').textContent=value?withdrawLabel.replace(' (Esc)',''):withdrawLabel;
    helpOpen=value;help.hidden=!value;objective.hidden=value;if(value)guide.hidden=true;
    toggle.setAttribute('aria-expanded',String(value));toggle.textContent=value?'Resume (H / Esc)':'Help / pause (H)';
    $('strike').disabled=dodge.disabled=value;
    onPauseChange();
    (value?toggle:document.getElementById('exploration-canvas')).focus();
  }
  toggle.onclick=()=>setHelp(!helpOpen);
  return {
    paused:()=>helpOpen,
    keydown(event){
      if(!ended&&(event.code==='KeyH'||helpOpen&&event.code==='Escape')){
        event.preventDefault();if(!event.repeat)setHelp(!helpOpen);return true;
      }
      if(helpOpen&&event.code!=='KeyR'){
        // Preserve native Tab navigation and button activation while reading Help.
        if(!['Tab','Enter','Space'].includes(event.code))event.preventDefault();
        return true;
      }
      return false;
    },
    draw(state,{inactive=false,introRemaining=0,watching=false,yaw=0}={}){
      if(!practice){const progress=battleProgress(pending,state);for(const [tag,text] of [['strong',progress.label],['span',progress.detail]]){const node=phase.querySelector(tag);if(node.textContent!==text)node.textContent=text;}}
      ended=!!state.outcome;
      const securing=state.objective?.type==='rally'&&state.guards.every(g=>!g.hp||g.routed);
      writeHud(guide,'hidden',!securing||ended||helpOpen);
      if(!guide.hidden){
        const bearing=trackingBearing(state.hero,state.objective.rally,yaw),holding=bearing.distance<=2.5;
        writeHud(arrow,'hidden',holding);
        if(!holding)writeHud(arrow.style,'transform',`rotate(${Math.round(bearing.angle*180/Math.PI)}deg)`);
        writeHud(destination,'textContent',holding?`Hold position · ${Math.ceil(state.objective.required-state.objective.held)}s`:`Gold standard · ${Math.ceil(bearing.distance)} m`);
      }
      if(ended){
        for(const name of ['objective','vitals','actions','help','controls'])writeHud($(name),'hidden',true);
        return;
      }
      writeHud(health,'textContent',`Health ${state.hero.hp} / 100`);
      writeHud(health.dataset,'hurt',String(state.hero.hp<=25));
      writeHud($('health-meter'),'value',state.hero.hp);
      writeHud($('strike'),'disabled',helpOpen);
      writeHud(dodge,'disabled',helpOpen||!!state.hero.dodgeCooldown);
      writeHud(dodge,'textContent',state.hero.dodgeCooldown?`Dodge: ${state.hero.dodgeCooldown.toFixed(1)}s`:'Dodge ready (Space)');
      let instruction=encounterInstruction(state,practice);
      if(!helpOpen)writeHud(toggle,'textContent',inactive?'Paused / Help (H)':'Help / pause (H)');
      if(introRemaining>0)instruction={kind:'prepare',text:`Get ready. The ${pending.rally?'rally assault':'interception'} begins in ${Math.ceil(introRemaining)}s.`};
      writeHud(objective.dataset,'kind',instruction.kind);
      const text=(watching&&!inactive&&!introRemaining?'Watching / P takes control. ':'')+instruction.text;
      if(objective.textContent!==text)objective.textContent=text;
    },
    dispose(){guide.remove();toggle.onclick=null;help.hidden=true;phase.hidden=true;toggle.setAttribute('aria-expanded','false');}
  };
}
