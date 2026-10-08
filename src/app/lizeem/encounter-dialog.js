import {createAssaultChoice} from './assault-choice.js';
import {availableBattleStage} from '../../simulation/battle-stages.js';
import {battlePhase} from '../exploration/battle-progress.js';
export function createEncounterDialog({scenario,getCampaign,pause,onClose,localEncounter=null,position=()=>null,onBeforeFight=()=>{},onDeath=null,prepareBattle=()=>{}}){
  const $=id=>document.getElementById(id),name=id=>scenario.regions.find(r=>r.id===id)?.name??id,faction=id=>scenario.factions.find(f=>f.id===id);
  let view=null,result=null,resultReason=null,side=null,active=null,ticket=0,loading=false;
  const phasePath=document.createElement('p');phasePath.id='encounter-phase-path';phasePath.hidden=true;$('encounter-brief').after(phasePath);
  const assaultChoice=createAssaultChoice($('encounter-brief'));
  function clear(){ticket++;loading=false;view?.dispose();view=null;$('encounter-canvas').replaceWith($('encounter-canvas').cloneNode());result=null;resultReason=null;side=null;active=null;if($('encounter-dialog').open)$('encounter-dialog').close();}
  function open(){
    const pending=getCampaign().snapshot().pending;if(!pending)return;pause();clear();active=pending;
    phasePath.hidden=!pending.participation;phasePath.textContent=battlePhase(pending).path;
    $('encounter-title').textContent=`Battle of ${name(pending.region)}`;
    $('encounter-brief').textContent=`${faction(pending.attacker).short}: ${pending.attackers} attacking. ${faction(pending.defender).short}: ${pending.defenders} defending. Break three enemy guards in a small test encounter. Success adds up to 20 percentage points to your side's chance; defeat subtracts up to 10. It does not guarantee the regional victory. Campaign time is paused.`;
    if(pending.reinforcements)$('encounter-brief').textContent=`${faction(pending.attacker).short}: ${pending.attackers} committed strength, including ${pending.reinforcements[pending.attacker].strength} approaching reinforcements. ${faction(pending.defender).short}: ${pending.defenders} committed, including ${pending.reinforcements[pending.defender].strength} reinforcements. Intercept the opposing side's vanguard: stop as many of the three soldiers as you can before they reach the blue rally marker. Each stopped soldier removes one third of the detachment (rounded down). You keep that contribution even if you retreat or are driven back. Campaign time is paused.`;
    if(pending.battleId)$('encounter-brief').textContent+=` The regional battle remains underway until day ${pending.endsOn}; territorial control is decided then.`;
    if(pending.reinforcements)$('encounter-brief').textContent+=' An escaping soldier leaves the encounter; keep fighting the others. Soldiers resume marching when you move away from them.';
    if(localEncounter?.supports(pending))$('encounter-brief').textContent+=' Fight here in the landscape on foot. WASD moves, X or left click strikes, Space dodges, and Escape withdraws. Stay within 45 metres of the flag.';
    $('fight-attacker').textContent=`Help ${faction(pending.attacker).short}`;$('fight-defender').textContent=`Help ${faction(pending.defender).short}`;
    $('fight-attacker').disabled=!!pending.reinforcements&&!pending.reinforcements[pending.defender].strength;
    $('fight-defender').disabled=!!pending.reinforcements&&!pending.reinforcements[pending.attacker].strength;
    $('fight-attacker').hidden=$('fight-defender').hidden=false;
    if(pending.rally){
      $('encounter-title').textContent='Ovesos / 2 of 2: Break the rally';
      $('encounter-brief').textContent=`Your interception removed ${pending.rally.blocked} enemy strength. Now break the remaining ${pending.rally.guards} rally guards, then hold the gold ring for 6 seconds. Your allies rally behind you; success forces an enemy retreat and wins Ovesos immediately for ${faction(pending.rally.faction).short}. You regroup at full health for this last push. If you lose or leave, both sides continue fighting until day ${pending.endsOn}; your earlier contribution remains. This is your one rally attempt. Campaign time is paused.`;
      for(const [id,side] of [['fight-attacker',pending.attacker],['fight-defender',pending.defender]]){$(id).hidden=side!==pending.rally.faction;$(id).disabled=false;$(id).textContent='Begin the rally assault / '+faction(side).short;}
    }else if(pending.stage==='intercept')$('encounter-brief').textContent+=' Stage 1 of 2: afterward you can regroup for a decisive assault on the enemy rally. More surviving reinforcements mean more rally guards.';
    $('encounter-choice').hidden=false;$('encounter-stage').hidden=true;$('encounter-result').textContent='';$('encounter-return').textContent='Stay out — resolve automatically';$('encounter-return').disabled=false;
    if(pending.battleId)$('encounter-return').textContent='Leave the battle underway';
    if(pending.rally)$('encounter-return').textContent='Leave / armies resolve on day '+pending.endsOn;
    if(pending.participation){
      const committed=pending.participation.faction;
      $('encounter-title').textContent=`Battle of ${name(pending.region)} / ${pending.rally?'2 of 2: Final assault':'1 of 2: Reinforcements'}`;
      $('encounter-brief').textContent=pending.rally
        ?`Your interception removed ${pending.rally.blocked} enemy strength. ${pending.rally.guards} rally guards remain${pending.rally.stopped?`; you already defeated ${pending.rally.stopped}`:''}. Break their line, then hold the gold ring for 6 seconds to win ${name(pending.region)} for ${faction(pending.rally.faction).short}. You begin at full health. Completing this phase advances directly to the day-${pending.endsOn} result. Withdrawing keeps your casualties and lets you return while the battle is active.`
        :`${faction(pending.attacker).short} attacks ${faction(pending.defender).short}. ${committed?'Continue helping '+faction(committed).short:'Choose a side'}: stop the opposing reinforcements before they reach the blue marker. ${pending.participation.guards} soldiers remain${pending.participation.stopped||pending.participation.escaped?`; ${pending.participation.stopped} already stopped and ${pending.participation.escaped} escaped`:''}. Stopping them removes enemy strength and can reduce the final assault's guard. This phase does not decide who holds ${name(pending.region)}; afterward you can regroup and fight the decisive assault.`;
      $('encounter-brief').textContent+=' You will take position near the centre of this battlefield on foot. Stay out and return any time before day '+pending.endsOn+'.';
      for(const [id,side] of [['fight-attacker',pending.attacker],['fight-defender',pending.defender]]){
        $(id).hidden=!!committed&&side!==committed;$(id).disabled=false;
        $(id).textContent=(pending.rally?'Begin final assault / ':committed?'Rejoin / ':'Join / ')+faction(side).short;
      }
      if(!pending.reinforcements){
        $('encounter-title').textContent=`Battle of ${name(pending.region)} / Final skirmish`;
        $('encounter-brief').textContent=`${pending.participation.guards} enemy soldiers remain. Choose a side to join this skirmish. Completing it advances to day ${pending.endsOn}, when the armies decide the outcome with your contribution. Withdrawing preserves defeated soldiers and lets you return while the battle remains active.`;
      }
      $('encounter-return').textContent='Stay out / return while the battle is active';
    }
    assaultChoice.show(pending,localEncounter?.supports(pending));
    $('encounter-dialog').showModal();(pending.rally?.faction===pending.defender?$('fight-defender'):$('fight-attacker')).focus();
  }
  async function join(factionId){
    if(loading||view||!active||![active.attacker,active.defender].includes(factionId)||active.rally&&active.rally.faction!==factionId||active?.participation?.faction&&active.participation.faction!==factionId)return;loading=true;side=factionId;const current=++ticket;
    $('encounter-choice').hidden=true;$('encounter-result').textContent='Preparing the test battlefield…';
    try{
      if(active.rally&&active.participation&&localEncounter?.supports(active)){
        const selected=getCampaign().chooseAssault(active.id,assaultChoice.style());if(!selected.ok)throw Error(selected.reason);active=getCampaign().snapshot().pending;
      }
      const enemyColor=faction(factionId===active.attacker?active.defender:active.attacker).color;
      onBeforeFight();prepareBattle(active);
      if(localEncounter?.supports(active)){
        $('encounter-dialog').close();
        const enemy=factionId===active.attacker?active.defender:active.attacker;
        view=localEncounter.open({pending:active,enemyColor,allyColor:faction(factionId).color,allyName:faction(factionId).short,reinforcements:active.reinforcements?{...active.reinforcements[enemy],name:faction(enemy).short}:null,onEnd:(outcome,reason,field)=>{result=outcome;resultReason=reason;if(field?.hero.hp===0&&onDeath)leave(false,true);},onContinue:()=>leave(true),onWithdraw:()=>leave(false)});
        return;
      }
      const {openEncounter}=await import('./encounter-view.js');if(current!==ticket)return;
      $('encounter-stage').hidden=false;
      view=openEncounter({guardCount:active.participation?.guards??3,canvas:$('encounter-canvas'),hud:$('encounter-health'),enemyColor:faction(factionId===active.attacker?active.defender:active.attacker).color,
        onEnd(outcome){result=outcome;if(view?.snapshot().hero.hp===0&&onDeath){leave(false,true);return;}$('encounter-result').textContent=outcome==='success'?'Guards broken. Your side gains up to 20 percentage points of battle chance.':'Teresod is driven back. Your side loses up to 10 percentage points of battle chance.';$('encounter-return').textContent=active.battleId?'Record result and return':'Apply result and return to map';$('encounter-return').focus();}});
      $('encounter-result').textContent=`Helping ${faction(factionId).short}. Break the ${active.participation?.guards??3} remaining guards. Red circles warn of incoming strikes.`;$('encounter-return').textContent='Withdraw — no battle bonus';
    }catch(error){view?.dispose();view=null;side=null;$('encounter-stage').hidden=true;$('encounter-choice').hidden=false;$('encounter-result').textContent='Battlefield could not load: '+error.message;if(!$('encounter-dialog').open)$('encounter-dialog').showModal();}
    finally{if(current===ticket)loading=false;}
  }
  function leave(followup=false,dead=false){
    if(!active)return;
    const field=view?.snapshot(),stopped=field?.interception||active.rally||active.participation?field?.guards.filter(g=>!g.hp||g.routed).length??0:null;
    const answer=active.participation
      ?getCampaign().resolveEncounter(active.id,view?side:null,result??'withdraw',resultReason??(view?'withdrew':'declined'),stopped??0,{escaped:field?.guards.filter(g=>g.escaped&&!g.routed).length??0,...(field?.squad?{alliesLost:field.squad.alliesLost,routed:field.squad.routed,allyDamage:field.squad.damageByAllies}:{})})
      :getCampaign().resolveEncounter(active.id,result||stopped>0?side:null,result??'withdraw',resultReason??(stopped!==null?'withdrew':null),stopped);
    if(!answer.ok){$('encounter-result').textContent=answer.reason;return;}const region=active.region,battleId=active.battleId,death=dead?{pending:structuredClone(active),side,field}:null;clear();onClose(region);
    if(death){if(!localEncounter?.supports(death.pending))Object.assign(death.field.hero,position());onDeath(death);return;}
    const battle=getCampaign().snapshot().engagements.find(b=>b.id===battleId);
    if(followup&&battle&&availableBattleStage(battle)==='rally'&&getCampaign().joinBattle(battleId,position()).ok)open();
  }
  $('fight-attacker').onclick=()=>join(active.attacker);$('fight-defender').onclick=()=>join(active.defender);$('encounter-return').onclick=()=>leave(false);
  $('encounter-dialog').addEventListener('cancel',e=>{e.preventDefault();leave();});
  return {open,clear,join,withdraw:()=>leave(false),continue:()=>leave(true),state:()=>({active:active?.id??null,loading,result,encounter:view?.snapshot()??null})};
}
