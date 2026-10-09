// Reuses the field encounter without submitting an outcome to the campaign.
// The host restores the exploration snapshot on exit; retries reuse loaded scenery.
export function createOvesosPractice({capture,prepare,open,restore,onError}){
  let active=false,loading=false,saved=null,view=null,attempt=0,profile=null,exercise='lesson';
  function retry(){
    if(!active||loading)return;
    view?.dispose();view=null;attempt++;
    view=open({retry,finish,compare,attempt,exercise});
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
    exercise=['advanced','squad','allied','solo-assault'].includes(selected)?selected:'lesson';saved=capture();active=true;loading=true;attempt=0;
    try{profile=await prepare();loading=false;retry();}
    catch(error){loading=false;finish();onError(error);}
  }
  return {start,retry,finish,compare,state:()=>({active,loading,attempt,exercise,profile,encounter:view?.snapshot()??null})};
}
