import {encounterInstruction} from '../../gameplay/combat/encounter-lesson.js';

// One active instruction; reference controls are available without advancing combat.
export function createSkirmishHud({practice,reinforcements,pending,site,onPauseChange}){
  const $=id=>document.getElementById('world-skirmish-'+id);
  const objective=$('objective'),help=$('controls'),toggle=$('help'),health=$('health'),dodge=$('dodge');
  let helpOpen=false,ended=false,withdrawLabel;
  const context=practice
    ?'Practice only. No campaign troops or territory change. R restarts this exercise.'
    :`Stop the runner and escorts before they reach the blue rally point. Each soldier stopped removes ${Math.floor(reinforcements.strength/3)} ${reinforcements.name} reinforcement strength. The larger battle at ${site.name} continues until day ${pending.endsOn}; this interception does not transfer territory.`;
  $('context').textContent=context;
  for(const name of ['objective','health','vitals','actions','help'])$(name).hidden=false;
  help.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.textContent='Help / pause (H)';
  function setHelp(value){
    if(ended)return;
    if(value)withdrawLabel=$('withdraw').textContent;
    $('withdraw').textContent=value?withdrawLabel.replace(' (Esc)',''):withdrawLabel;
    helpOpen=value;help.hidden=!value;objective.hidden=value;
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
    draw(state,{inactive=false,introRemaining=0,watching=false}={}){
      ended=!!state.outcome;
      if(ended){
        for(const name of ['objective','vitals','actions','help','controls'])$(name).hidden=true;
        return;
      }
      health.textContent=`Health ${state.hero.hp} / 100`;
      health.dataset.hurt=String(state.hero.hp<=25);
      $('health-meter').value=state.hero.hp;
      $('strike').disabled=helpOpen;
      dodge.disabled=helpOpen||!!state.hero.dodgeCooldown;
      dodge.textContent=state.hero.dodgeCooldown?`Dodge: ${state.hero.dodgeCooldown.toFixed(1)}s`:'Dodge ready (Space)';
      let instruction=encounterInstruction(state,practice);
      if(!helpOpen)toggle.textContent=inactive?'Paused / Help (H)':'Help / pause (H)';
      if(introRemaining>0)instruction={kind:'prepare',text:`Get ready. The interception begins in ${Math.ceil(introRemaining)}s.`};
      objective.dataset.kind=instruction.kind;
      const text=(watching&&!inactive&&!introRemaining?'Watching / P takes control. ':'')+instruction.text;
      if(objective.textContent!==text)objective.textContent=text;
    },
    dispose(){toggle.onclick=null;help.hidden=true;toggle.setAttribute('aria-expanded','false');}
  };
}
