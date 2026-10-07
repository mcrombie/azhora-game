export function createEncounterDialog({scenario,getCampaign,pause,onClose,localEncounter=null}){
  const $=id=>document.getElementById(id),name=id=>scenario.regions.find(r=>r.id===id)?.name??id,faction=id=>scenario.factions.find(f=>f.id===id);
  let view=null,result=null,resultReason=null,side=null,active=null,ticket=0,loading=false;
  function clear(){ticket++;loading=false;view?.dispose();view=null;$('encounter-canvas').replaceWith($('encounter-canvas').cloneNode());result=null;resultReason=null;side=null;active=null;if($('encounter-dialog').open)$('encounter-dialog').close();}
  function open(){
    const pending=getCampaign().snapshot().pending;if(!pending)return;pause();clear();active=pending;
    $('encounter-title').textContent=`Battle of ${name(pending.region)}`;
    $('encounter-brief').textContent=`${faction(pending.attacker).short}: ${pending.attackers} attacking. ${faction(pending.defender).short}: ${pending.defenders} defending. Break three enemy guards in a small test encounter. Success adds up to 20 percentage points to your side's chance; defeat subtracts up to 10. It does not guarantee the regional victory. Campaign time is paused.`;
    if(pending.reinforcements)$('encounter-brief').textContent=`${faction(pending.attacker).short}: ${pending.attackers} committed strength, including ${pending.reinforcements[pending.attacker].strength} approaching reinforcements. ${faction(pending.defender).short}: ${pending.defenders} committed, including ${pending.reinforcements[pending.defender].strength} reinforcements. Intercept the opposing side's vanguard: stop as many of the three soldiers as you can before they reach the blue rally marker. Each stopped soldier removes one third of the detachment (rounded down). You keep that contribution even if you retreat or are driven back. Campaign time is paused.`;
    if(pending.battleId)$('encounter-brief').textContent+=` The regional battle remains underway until day ${pending.endsOn}; territorial control is decided then.`;
    if(pending.reinforcements)$('encounter-brief').textContent+=' An escaping soldier leaves the encounter; keep fighting the others. Soldiers resume marching when you move away from them.';
    if(localEncounter?.supports(pending))$('encounter-brief').textContent+=' Fight here in the landscape on foot. WASD moves, X or left click strikes, Space dodges, and Escape withdraws. Stay within 45 metres of the flag.';
    $('fight-attacker').textContent=`Help ${faction(pending.attacker).short}`;$('fight-defender').textContent=`Help ${faction(pending.defender).short}`;
    $('fight-attacker').disabled=!!pending.reinforcements&&!pending.reinforcements[pending.defender].strength;
    $('fight-defender').disabled=!!pending.reinforcements&&!pending.reinforcements[pending.attacker].strength;
    $('encounter-choice').hidden=false;$('encounter-stage').hidden=true;$('encounter-result').textContent='';$('encounter-return').textContent='Stay out — resolve automatically';$('encounter-return').disabled=false;
    if(pending.battleId)$('encounter-return').textContent='Leave the battle underway';
    $('encounter-dialog').showModal();$('fight-attacker').focus();
  }
  async function join(factionId){
    if(loading||view||!active||![active.attacker,active.defender].includes(factionId))return;loading=true;side=factionId;const current=++ticket;
    $('encounter-choice').hidden=true;$('encounter-result').textContent='Preparing the test battlefield…';
    try{
      const enemyColor=faction(factionId===active.attacker?active.defender:active.attacker).color;
      if(localEncounter?.supports(active)){
        $('encounter-dialog').close();
        const enemy=factionId===active.attacker?active.defender:active.attacker;
        view=localEncounter.open({pending:active,enemyColor,allyName:faction(factionId).short,reinforcements:active.reinforcements?{...active.reinforcements[enemy],name:faction(enemy).short}:null,onEnd:(outcome,reason)=>{result=outcome;resultReason=reason;},onContinue:leave,onWithdraw:leave});
        return;
      }
      const {openEncounter}=await import('./encounter-view.js');if(current!==ticket)return;
      $('encounter-stage').hidden=false;
      view=openEncounter({canvas:$('encounter-canvas'),hud:$('encounter-health'),enemyColor:faction(factionId===active.attacker?active.defender:active.attacker).color,
        onEnd(outcome){result=outcome;$('encounter-result').textContent=outcome==='success'?'Guards broken. Your side gains up to 20 percentage points of battle chance.':'Teresod is driven back. Your side loses up to 10 percentage points of battle chance.';$('encounter-return').textContent=active.battleId?'Record result and return':'Apply result and return to map';$('encounter-return').focus();}});
      $('encounter-result').textContent=`Helping ${faction(factionId).short}. Break the three guards. Red circles warn of incoming strikes.`;$('encounter-return').textContent='Withdraw — no battle bonus';
    }catch(error){view?.dispose();view=null;side=null;$('encounter-stage').hidden=true;$('encounter-choice').hidden=false;$('encounter-result').textContent='Battlefield could not load: '+error.message;if(!$('encounter-dialog').open)$('encounter-dialog').showModal();}
    finally{if(current===ticket)loading=false;}
  }
  function leave(){
    if(!active)return;
    const field=view?.snapshot(),stopped=field?.interception?field.guards.filter(g=>!g.hp).length:null;
    const answer=getCampaign().resolveEncounter(active.id,result||stopped>0?side:null,result??'withdraw',resultReason??(stopped!==null?'withdrew':null),stopped);
    if(!answer.ok){$('encounter-result').textContent=answer.reason;return;}const region=active.region;clear();onClose(region);
  }
  $('fight-attacker').onclick=()=>join(active.attacker);$('fight-defender').onclick=()=>join(active.defender);$('encounter-return').onclick=leave;
  $('encounter-dialog').addEventListener('cancel',e=>{e.preventDefault();leave();});
  return {open,clear,join,withdraw:leave,state:()=>({active:active?.id??null,loading,result,encounter:view?.snapshot()??null})};
}
