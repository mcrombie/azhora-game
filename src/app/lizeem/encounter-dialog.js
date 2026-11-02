import {roadsideBrief} from '../exploration/roadside-presentation.js';
import {applyEncounterResult} from './encounter-result.js';
import {createDuelChoice} from './duel-choice.js';
import {duelEffect,LIZEEM_CHAMPIONS,commanderFor} from '../../content/scenarios/lizeem-champions.js';
import {createAssaultChoice} from './assault-choice.js';
import {availableBattleStage} from '../../simulation/battle-stages.js';
import {battlePhase} from '../exploration/battle-progress.js';
import {adventureTimeLabel} from '../../experiments/day-night/opening-time-label.js';
import {fieldBattleBrief,battleApproaches} from './battle-approach.js';
export function createEncounterDialog({scenario,getCampaign,pause,onClose,localEncounter=null,position=()=>null,onBeforeFight=()=>{},onDeath=null,prepareBattle=()=>{},timeNotice=()=>'',elapsedClock=()=>null,campaignSide=()=>null,onResult=()=>null}){
  const $=id=>document.getElementById(id),name=id=>scenario.regions.find(r=>r.id===id)?.name??id,faction=id=>scenario.factions.find(f=>f.id===id);
  let view=null,result=null,resultReason=null,side=null,active=null,ticket=0,loading=false,duelConfirmed=null;
  const phasePath=document.createElement('p');phasePath.id='encounter-phase-path';phasePath.hidden=true;$('encounter-brief').after(phasePath);
  const timeNote=document.createElement('p');timeNote.id='encounter-time-notice';timeNote.hidden=true;phasePath.after(timeNote);
  let interceptBrief='';
  const duelChoice=createDuelChoice($('encounter-brief'),openingPresentation);
  const assaultChoice=createAssaultChoice($('encounter-brief'));
  function roadsidePresentation(){
    if(active?.kind!=='roadside')return;
    $('encounter-title').textContent='Intercept / '+active.armyName;
    $('encounter-brief').textContent=roadsideBrief(active,{elapsed:!!elapsedClock()?.sharedOpening});
    phasePath.hidden=false;phasePath.textContent=battlePhase(active).path;
    $('fight-attacker').hidden=true;$('fight-defender').hidden=false;$('fight-defender').disabled=false;
    $('fight-defender').textContent='Proceed / Intercept the column';
    $('encounter-return').textContent='Let them pass / Continue exploring';
  }
  function allegiancePresentation(approach=duelChoice.approach()){
    if(active?.kind==='roadside'){roadsidePresentation();return;}
    if(fieldPresentation(approach))return;
    const chosen=campaignSide();if(!chosen||!active)return;
    const enemy=chosen===active.attacker?active.defender:active.attacker;
    const shared=!!elapsedClock()?.sharedOpening,deadline=shared?adventureTimeLabel(active.endsOn*60):'day '+active.endsOn;
    const local=localEncounter?.supports(active),duel=approach==='duel'&&!active.rally&&local;
    const captain=commanderFor(active,enemy);
    const aim=chosen===active.attacker?'Take':'Defend';
    $('encounter-title').textContent=`${aim} ${name(active.region)} / ${active.rally?'Final assault':duel?'Champion duel':active.reinforcements?'Intercept reinforcements':'Skirmish'}`;
    const situation=`You fight for ${faction(chosen).short}. ${faction(active.attacker).short} is attacking ${name(active.region)}, held by ${faction(active.defender).short}.`;
    const conditions=active.rally
      ?`Win by breaking the remaining ${active.rally.guards} guards${captain?' and defeating or routing '+captain.name:''}. Your allies join this final assault.`
      :duel?`Defeat ${captain?.name??LIZEEM_CHAMPIONS[enemy].name} in the duel to weaken their line. Then lead the final assault with allies to decide the field.`
      :active.reinforcements?`Stop the enemy reinforcements before they reach the blue rally marker. Each one stopped means fewer enemies in the final assault, where you fight alongside allies.`
      :`Defeat the enemy guards to help your army win the field.`;
    $('encounter-brief').textContent=`${situation} ${conditions} ${local?'You start on foot near the field’s centre. ':''}Time is held while you fight. You may stay out; the armies will settle the battle at ${deadline}.`;
    phasePath.hidden=false;phasePath.textContent=duel?'Champion duel → Final assault with allies → Battle result':battlePhase(active).path;
    for(const [id,side] of [['fight-attacker',active.attacker],['fight-defender',active.defender]]){
      $(id).hidden=side!==chosen;
      if(side===chosen){$(id).textContent=active.rally?'Begin final assault':duel?'Proceed / Challenge the champion':'Proceed / Join battle';$(id).disabled=duel&&!!active.commanders&&!captain;}
    }
    $('encounter-return').textContent='Stay out / Continue exploring';
  }
  function openingPresentation(approach){
    if(fieldPresentation(approach))return;
    if(!active?.duelAvailable||active.rally)return;
    const duel=approach==='duel';
    $('encounter-title').textContent=`Battle of ${name(active.region)} / 1 of 2: ${duel?'Champion duel':'Choose your opening'}`;
    $('encounter-brief').textContent=duel
      ?`Choose the league you want to support. Face the opposing captain alone, then lead an assault with allies to decide the battle. Winning the duel weakens that assault’s opposition; it does not capture the region.`:interceptBrief;
    phasePath.textContent=duel?'Champion duel → Final assault with allies → Battle result':battlePhase(active).path;
    $('fight-attacker').textContent=(duel?'Challenge for / ':'Join / ')+faction(active.attacker).short;
    $('fight-defender').textContent=(duel?'Challenge for / ':'Join / ')+faction(active.defender).short;
    if(active.commanders)for(const [id,side] of [['fight-attacker',active.attacker],['fight-defender',active.defender]])$(id).disabled=duel&&!commanderFor(active,side===active.attacker?active.defender:active.attacker);
    allegiancePresentation(approach);
  }
  function fieldPresentation(approach){
    if(!active?.fieldBattleAvailable&&!active?.rally?.direct)return false;
    const chosen=campaignSide()??active.participation?.faction,duel=approach==='duel'&&!active.rally;
    const shared=!!elapsedClock()?.sharedOpening,deadline=shared?adventureTimeLabel(active.endsOn*60):'day '+active.endsOn;
    const aim=chosen?(chosen===active.attacker?'Take':'Defend'):'Battle of';
    $('encounter-title').textContent=`${aim} ${name(active.region)}${duel?' / Champion duel':''}`;
    const situation=`${faction(active.attacker).short} is attacking ${name(active.region)}, held by ${faction(active.defender).short}.`;
    const conditions=duel?'Face the opposing champion first. Victory makes the champion and two soldiers retreat and raises your army’s morale. Then join your allies to decide the battle.':(active.duel?duelEffect(active.duel)+' ':'')+(chosen?fieldBattleBrief(active,chosen):`Join either army in one continuous battle. Fight alongside allied soldiers, break the opposing line, and defeat or rout its commander to win.`);
    $('encounter-brief').textContent=`${chosen?'You fight for '+faction(chosen).short+'. ':''}${situation} ${conditions} Time is held while you fight. If you stay out, the armies settle the battle at ${deadline}.`;
    phasePath.hidden=false;phasePath.textContent=duel?'Optional champion duel → Battle with allies → Battle result':battlePhase(active).path;
    for(const [id,side] of [['fight-attacker',active.attacker],['fight-defender',active.defender]]){
      $(id).hidden=!!chosen&&side!==chosen;$(id).disabled=duel&&!battleApproaches(active,side).includes('duel');
      $(id).textContent=(duel?'Challenge the champion':active.rally?.stopped?'Rejoin battle':'Join battle')+(chosen?'':' / '+faction(side).short);
    }
    $('encounter-return').textContent='Stay out / Continue exploring';return true;
  }
  function clear(){duelConfirmed=null;ticket++;loading=false;view?.dispose();view=null;$('encounter-canvas').replaceWith($('encounter-canvas').cloneNode());result=null;resultReason=null;side=null;active=null;if($('encounter-dialog').open)$('encounter-dialog').close();}
  function open(reopening=false){
    const pending=getCampaign().snapshot().pending;if(!pending)return;if(reopening!==true)pause();clear();active=pending;
    const clock=elapsedClock(),shared=!!clock?.sharedOpening,deadline=adventureTimeLabel(pending.endsOn*60);
    const completion=clock?.localBattleTiming==='scheduled'?`Completing the main battle advances the campaign to ${deadline}. Other armies, supplies and battles progress during that interval.`:'Completing the main battle settles it at the current adventure time.';
    timeNote.textContent=timeNotice(pending);timeNote.hidden=!timeNote.textContent;
    phasePath.hidden=!pending.participation;phasePath.textContent=battlePhase(pending).path;
    $('encounter-title').textContent=`Battle of ${name(pending.region)}`;
    $('encounter-brief').textContent=`${faction(pending.attacker).short}: ${pending.attackers} attacking. ${faction(pending.defender).short}: ${pending.defenders} defending. Break three enemy guards in a small test encounter. Success adds up to 20 percentage points to your side's chance; defeat subtracts up to 10. It does not guarantee the regional victory. Campaign time is paused.`;
    if(pending.reinforcements)$('encounter-brief').textContent=`${faction(pending.attacker).short}: ${pending.attackers} committed strength, including ${pending.reinforcements[pending.attacker].strength} approaching reinforcements. ${faction(pending.defender).short}: ${pending.defenders} committed, including ${pending.reinforcements[pending.defender].strength} reinforcements. Intercept the opposing side's vanguard: stop as many of the three soldiers as you can before they reach the blue rally marker. Each stopped soldier removes one third of the detachment (rounded down). You keep that contribution even if you retreat or are driven back. Campaign time is paused.`;
    if(pending.battleId)$('encounter-brief').textContent+=shared?` If you stay out, this battle resolves at ${deadline}.`:` The regional battle remains underway until day ${pending.endsOn}; territorial control is decided then.`;
    if(pending.reinforcements)$('encounter-brief').textContent+=' An escaping soldier leaves the encounter; keep fighting the others. Soldiers resume marching when you move away from them.';
    if(localEncounter?.supports(pending))$('encounter-brief').textContent+=' Fight here in the landscape on foot. WASD moves, X or left click strikes, Space dodges, and Escape withdraws. Stay within 45 metres of the flag.';
    $('fight-attacker').textContent=`Help ${faction(pending.attacker).short}`;$('fight-defender').textContent=`Help ${faction(pending.defender).short}`;
    $('fight-attacker').disabled=!!pending.reinforcements&&!pending.reinforcements[pending.defender].strength;
    $('fight-defender').disabled=!!pending.reinforcements&&!pending.reinforcements[pending.attacker].strength;
    $('fight-attacker').hidden=$('fight-defender').hidden=false;
    if(pending.rally){
      $('encounter-title').textContent='Ovesos / 2 of 2: Break the rally';
      $('encounter-brief').textContent=`Your interception removed ${pending.rally.blocked} enemy strength. Now break the remaining ${pending.rally.guards} rally guards. Victory follows automatically when their line breaks. Your allies rally behind you; success forces an enemy retreat and wins Ovesos immediately for ${faction(pending.rally.faction).short}. You regroup at full health for this last push. ${shared?`${completion} If you leave, the armies continue until ${deadline}; your earlier contribution remains.`:`If you lose or leave, both sides continue fighting until day ${pending.endsOn}; your earlier contribution remains.`} This is your one rally attempt. Campaign time is paused.`;
      for(const [id,side] of [['fight-attacker',pending.attacker],['fight-defender',pending.defender]]){$(id).hidden=side!==pending.rally.faction;$(id).disabled=false;$(id).textContent='Begin the rally assault / '+faction(side).short;}
    }else if(pending.stage==='intercept')$('encounter-brief').textContent+=' Stage 1 of 2: afterward you can regroup for a decisive assault on the enemy rally. More surviving reinforcements mean more rally guards.';
    $('encounter-choice').hidden=false;$('encounter-stage').hidden=true;$('encounter-result').textContent='';$('encounter-return').textContent='Stay out — resolve automatically';$('encounter-return').disabled=false;
    if(pending.battleId)$('encounter-return').textContent='Leave the battle underway';
    if(pending.rally)$('encounter-return').textContent=shared?'Leave / armies resolve at '+deadline:'Leave / armies resolve on day '+pending.endsOn;
    if(pending.participation){
      const committed=pending.participation.faction;
      $('encounter-title').textContent=`Battle of ${name(pending.region)} / ${pending.rally?'2 of 2: Final assault':'1 of 2: Reinforcements'}`;
      $('encounter-brief').textContent=pending.rally
        ?`Your interception removed ${pending.rally.blocked} enemy strength. ${pending.rally.guards} rally guards remain${pending.rally.stopped?`; you already defeated ${pending.rally.stopped}`:''}. Break their line to win ${name(pending.region)} for ${faction(pending.rally.faction).short}. You begin at full health. ${shared?completion:`Completing this phase advances directly to the day-${pending.endsOn} result.`} Withdrawing keeps your casualties and lets you return while the battle is active.`
        :`${faction(pending.attacker).short} attacks ${faction(pending.defender).short}. ${committed?'Continue helping '+faction(committed).short:'Choose a side'} and stop ${pending.participation.guards} reinforcements before they reach the blue marker. Each soldier stopped means fewer enemies in the final assault${pending.participation.stopped||pending.participation.escaped?`; ${pending.participation.stopped} already stopped, ${pending.participation.escaped} escaped`:''}. You then fight alongside allies to decide the field.`;
      $('encounter-brief').textContent+=' You start on foot near the field’s centre. You may leave and return before '+(shared?deadline:'day '+pending.endsOn)+'.';
      for(const [id,side] of [['fight-attacker',pending.attacker],['fight-defender',pending.defender]]){
        $(id).hidden=!!committed&&side!==committed;$(id).disabled=false;
        $(id).textContent=(pending.rally?'Begin final assault / ':committed?'Rejoin / ':'Join / ')+faction(side).short;
      }
      if(!pending.reinforcements){
        $('encounter-title').textContent=`Battle of ${name(pending.region)} / Final skirmish`;
        $('encounter-brief').textContent=`${pending.participation.guards} enemy soldiers remain. Choose a side to join this skirmish. ${shared?completion:`Completing it advances to day ${pending.endsOn}, when the armies decide the outcome with your contribution.`} Withdrawing preserves defeated soldiers and lets you return while the battle remains active.`;
      }
      $('encounter-return').textContent='Stay out / return while the battle is active';
    }
    if(pending.rally&&pending.duel)$('encounter-brief').textContent=duelEffect(pending.duel)+` ${pending.rally.guards} rally guards remain. Lead the final assault with allies to decide ${name(pending.region)}. You regroup at full health. ${shared?`${completion} Withdrawing lets you return before ${deadline}.`:`Completing it advances to day ${pending.endsOn}; withdrawing lets you return while the field remains active.`}`;
    if(pending.commanders){
      if(pending.rally){
        const enemy=commanderFor(pending,pending.rally.faction===pending.attacker?pending.defender:pending.attacker);
        const ally=commanderFor(pending,pending.rally.faction);
        $('encounter-brief').textContent+=enemy?` You must defeat or rout ${enemy.name}, commanding ${enemy.armyName.split(' / ')[0]}, as well as break the soldiers. Their fall raises your morale and lowers theirs.`:' The opposing commander is absent from this assault.';
        if(ally)$('encounter-brief').textContent+=` ${ally.name} fights alongside you. Protect your captain to preserve morale.`;
      }
    }
    duelChoice.show(pending,localEncounter?.supports(pending),campaignSide());
    interceptBrief=$('encounter-brief').textContent;
    if(pending.duelAvailable&&localEncounter?.supports(pending))openingPresentation(duelChoice.approach());
    assaultChoice.show(pending,pending.kind!=='roadside'&&localEncounter?.supports(pending));
    allegiancePresentation();
    $('encounter-dialog').showModal();((campaignSide()??pending.rally?.faction)===pending.defender?$('fight-defender'):$('fight-attacker')).focus();
  }
  async function join(factionId,approach=null){
    if(campaignSide()&&factionId!==campaignSide())return false;
    if(loading||view||!active||![active.attacker,active.defender].includes(factionId)||active.rally&&active.rally.faction!==factionId||active?.participation?.faction&&active.participation.faction!==factionId)return;
    const wantsDuel=!active.rally&&(active.duel?.status==='accepted'||(approach??duelChoice.approach())==='duel');
    if(wantsDuel&&active.commanders&&!commanderFor(active,factionId===active.attacker?active.defender:active.attacker))return;
    if(wantsDuel&&!approach&&duelConfirmed!==factionId){
      duelConfirmed=factionId;const champion=LIZEEM_CHAMPIONS[factionId===active.attacker?active.defender:active.attacker];
      $('encounter-title').textContent='Challenge / '+champion.name;
      $('encounter-brief').textContent=`${champion.name} of ${champion.home}: “${champion.words}” Win within two minutes to make two rally guards fall back, then fight the assault with allies. Yielding forfeits the advantage; death takes you to the Reaper.`;
      for(const [id,side] of [['fight-attacker',active.attacker],['fight-defender',active.defender]]){$(id).hidden=side!==factionId;$(id).textContent='Accept the challenge / '+faction(side).short;}
      $('encounter-duel-choice').hidden=true;phasePath.textContent='Champion duel → Final assault with allies → Battle result';
      $('encounter-return').textContent='Back to battle choices';return;
    }
    loading=true;side=factionId;const current=++ticket;
    $('encounter-choice').hidden=true;$('encounter-result').textContent='Preparing the battlefield…';
    try{
      if(!active.rally)onBeforeFight();
      if(!active.rally&&(active.duel?.status==='accepted'||(approach??(duelConfirmed?'duel':duelChoice.approach()))==='duel')){
        const chosen=getCampaign().chooseDuel(active.id,factionId,!!active.fieldBattleAvailable);if(!chosen.ok)throw Error(chosen.reason);active=getCampaign().snapshot().pending;
      }else if(active.fieldBattleAvailable&&localEncounter?.supports(active)&&(approach??duelChoice.approach())==='field'){
        const chosen=getCampaign().chooseFieldBattle(active.id,factionId);if(!chosen.ok)throw Error(chosen.reason);active=getCampaign().snapshot().pending;
      }
      if(active.kind!=='roadside'&&active.rally&&active.participation&&localEncounter?.supports(active)){
        const selected=getCampaign().chooseAssault(active.id,assaultChoice.style());if(!selected.ok)throw Error(selected.reason);active=getCampaign().snapshot().pending;
      }
      if(active.rally)onBeforeFight();
      const enemyColor=faction(factionId===active.attacker?active.defender:active.attacker).color;
      prepareBattle(active);
      if(localEncounter?.supports(active)){
        $('encounter-dialog').close();
        const enemy=factionId===active.attacker?active.defender:active.attacker;
        view=localEncounter.open({pending:active,allyFaction:factionId,enemyColor,allyColor:faction(factionId).color,allyName:faction(factionId).short,reinforcements:active.reinforcements?{...active.reinforcements[enemy],name:faction(enemy).short}:null,onEnd:(outcome,reason,field)=>{result=outcome;resultReason=reason;if(field?.hero.hp===0&&onDeath){leave(false,true);return;}const guidance=onResult({pending:active,field,side,outcome,reason,started:true});if(guidance){const next=$('world-skirmish-next');next.hidden=false;next.textContent=guidance.next;$('world-skirmish-continue').textContent=guidance.button;}},onContinue:()=>leave(true),onWithdraw:()=>leave(false)});
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
    const field=view?.snapshot(),completed=!!result;
    const answer=applyEncounterResult(getCampaign(),{pending:active,field,side,outcome:result,reason:resultReason,started:!!view});
    if(!answer.ok){$('encounter-result').textContent=answer.reason;return;}const region=active.region,battleId=active.battleId,death=dead?{pending:structuredClone(active),side,field}:null;clear();onClose(region,{battleId,completed,dead});
    if(death){if(!localEncounter?.supports(death.pending))Object.assign(death.field.hero,position());onDeath(death);return;}
    const battle=getCampaign().snapshot().engagements.find(b=>b.id===battleId);
    if(followup&&battle&&availableBattleStage(battle)==='rally'&&getCampaign().joinBattle(battleId,position()).ok)open();
  }
  $('fight-attacker').onclick=()=>join(active.attacker);$('fight-defender').onclick=()=>join(active.defender);$('encounter-return').onclick=()=>{if(duelConfirmed&&!view&&!loading)open(true);else leave(false);};
  $('encounter-dialog').addEventListener('cancel',e=>{e.preventDefault();if(duelConfirmed&&!view&&!loading)open(true);else leave();});
  return {open,clear,join,withdraw:()=>leave(false),continue:()=>leave(true),fighting:()=>!!view&&!result,state:()=>({active:active?.id??null,loading,result,encounter:view?.snapshot()??null})};
}
