// Reuses the field encounter without submitting an outcome to the campaign.
// The host restores the exploration snapshot on exit; retries reuse loaded scenery.
import {COMBAT_TRIALS,configuredTrial} from '../../gameplay/combat/combat-trials.js';
import {combatAttributes} from '../../gameplay/combat/combat-stats.js';
export function createOvesosPractice({capture,prepare,open,restore,onError,attributes=()=>({}),militiaWeapon=()=>'sword',startingRound=()=>0}){
  let active=false,loading=false,saved=null,view=null,attempt=0,profile=null,exercise='lesson';
  let weapon='sword',round=0,results=[],heroAttributes=combatAttributes();
  function retry(){
    if(!active||loading)return;
    view?.dispose();view=null;attempt++;
    view=open({retry,finish,compare,attempt,exercise,advance,trial:exercise==='trials'?configuredTrial(round,weapon):null,round,results:[...results],heroAttributes});
  }
  function advance(){
    if(!active||loading)return false;
    if(exercise!=='trials'){finish();return true;}
    const s=view?.snapshot();if(!s?.outcome)return false;
    if(s.outcome!=='success'){finish();return true;}
    results.push({id:COMBAT_TRIALS[round].id,name:COMBAT_TRIALS[round].name,hp:s.hero.hp,maxHp:s.hero.maxHp??100,time:s.time,attempts:attempt});
    if(round===COMBAT_TRIALS.length-1){finish();return true;}
    round++;attempt=0;retry();return true;
  }
  function compare(){
    if(!active||loading||!view?.snapshot().outcome||!['allied','solo-assault'].includes(exercise))return false;
    exercise=exercise==='allied'?'solo-assault':'allied';attempt=0;retry();return true;
  }
  function finish(){
    if(!active||loading)return;
    view?.dispose();view=null;active=false;restore(saved);saved=null;
  }
  async function start(selected='lesson'){
    if(active)return;
    try{heroAttributes=combatAttributes(selected==='trials'?attributes():{});}catch(error){onError(error);return;}
    weapon=militiaWeapon();
    const first=selected==='trials'?startingRound():0;
    if(!Number.isInteger(first)||first<0||first>=COMBAT_TRIALS.length){onError(Error('Choose a known starting opponent.'));return;}
    exercise=['trials','advanced','squad','allied','solo-assault'].includes(selected)?selected:'lesson';round=first;results=[];saved=capture();active=true;loading=true;attempt=0;
    try{profile=await prepare(exercise);loading=false;retry();}
    catch(error){loading=false;finish();onError(error);}
  }
  return {start,retry,finish,compare,advance,state:()=>({active,loading,attempt,exercise,round,results:[...results],profile,encounter:view?.snapshot()??null})};
}
