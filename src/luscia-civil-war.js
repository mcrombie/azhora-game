/** The local silver story and recruitment facts. It never settles a province on introduction. */
export const LUSCIA_CIVIL_QUEST_ID = 'civil-war-luscia';
export const LUSCIA_OPERATIVE_ID = 'timber-stall';
export const LUSCIA_SOLDIER_ID = 'relay-republican';
export const LUSCIA_LOYALISTS = Object.freeze([
  Object.freeze({id:LUSCIA_OPERATIVE_ID,name:'Hara',evidence:'A signed cloth order carries Hara’s matching stall mark and instructions for Republican bandages.'}),
  Object.freeze({id:'town-yardhand',name:'Tolm',evidence:'Tolm’s signed dispatch tallies the timber-yard carts diverted to the Republican companies.'}),
  Object.freeze({id:'luscia-ranger',name:'Renn',evidence:'Renn’s orders bear the same sign used by the relay soldier, and name his supply watch at the burned hamlet.'}),
]);
const initial=()=>({version:1,revision:0,soldier:'unmet',introduced:false,mindRead:false,betrayed:false,
  operative:'free',path:null,accepted:false,republicContact:false,proof:[],dead:[],imperialComplete:false});
const copy=s=>({...s,proof:[...s.proof],dead:[...s.dead]});
const ids=LUSCIA_LOYALISTS.map(n=>n.id);
const flags=['introduced','mindRead','betrayed','accepted','republicContact','imperialComplete'];
export function validateLusciaCivilWarSnapshot(s,{allowMissing=true}={}){
  if(s===undefined)return allowMissing;
  if(!s||Array.isArray(s)||s.version!==1||!Number.isSafeInteger(s.revision)||s.revision<0)return false;
  if(Object.keys(s).some(k=>!Object.hasOwn(initial(),k))||flags.some(k=>typeof s[k]!=='boolean'))return false;
  if(!['unmet','peaceful','departed','hostile','dead'].includes(s.soldier)||!['free','dead','arrested'].includes(s.operative)||![null,'empire','coalition'].includes(s.path))return false;
  for(const key of ['proof','dead'])if(!Array.isArray(s[key])||new Set(s[key]).size!==s[key].length||s[key].some(id=>!ids.includes(id)))return false;
  if(s.path&&!s.accepted||s.republicContact&&s.path!=='coalition'||s.imperialComplete&&!ids.every(id=>s.proof.includes(id)&&s.dead.includes(id)))return false;
  return true;
}
export function createLusciaCivilWar({onEvent=()=>{}}={}){
  let s=initial();
  const emit=(action,extra={})=>{s.revision++;const e={ok:true,action,questId:LUSCIA_CIVIL_QUEST_ID,...extra};onEvent(e);return e;};
  const fail=reason=>({ok:false,reason});
  const recruitment=()=>s.operative==='free'&&(s.mindRead||(s.introduced&&!s.betrayed&&s.soldier!=='dead'));
  function meetSoldier(){if(s.soldier!=='unmet')return {ok:true,first:false};s.soldier='peaceful';return emit('meet-soldier',{first:true});}
  function agreeSoldier(){if(s.soldier!=='peaceful')return fail('He is not offering a peaceful introduction.');s.soldier='departed';s.introduced=true;return emit('provisional-agreement');}
  function soldierDeparture(){if(!['unmet','peaceful'].includes(s.soldier))return {ok:false};s.soldier='departed';return emit('soldier-departed');}
  function opposeSoldier(){if(!['peaceful','hostile'].includes(s.soldier))return fail('That argument has ended.');if(s.soldier==='hostile')return {ok:true,first:false};s.soldier='hostile';return emit('oppose-soldier',{first:true});}
  function soldierKilled(){if(s.soldier==='dead')return {ok:true,first:false};s.soldier='dead';return emit('soldier-killed',{first:true});}
  function readOperative(){if(s.operative!=='free')return fail('Hara is no longer free to recruit you.');if(s.mindRead)return {ok:true,first:false};s.mindRead=true;return emit('operative-read',{first:true});}
  function closeOperative(cause){if(!['dead','arrested'].includes(cause))return fail('Unknown outcome.');if(s.operative!=='free')return {ok:true,first:false};s.operative=cause;if(cause==='dead'&&!s.dead.includes(LUSCIA_OPERATIVE_ID))s.dead.push(LUSCIA_OPERATIVE_ID);return emit('operative-unavailable',{cause,first:true});}
  function joinRepublic(){if(!recruitment())return fail(s.operative!=='free'?'Hara is dead or in custody. This recruitment route has closed.':'You have no introduction to the Republican network.');if(s.path==='coalition')return {ok:true,first:false};s.path='coalition';s.accepted=true;s.republicContact=false;return emit('join-republic',{first:true});}
  function reportEmpire(){if(!s.introduced&&s.soldier!=='dead'&&!s.mindRead)return fail('You have no Republican encounter to report.');if(s.path==='empire')return {ok:true,first:false};if(s.path==='coalition')return fail('You have already joined the Republican campaign.');s.path='empire';s.accepted=true;s.betrayed=true;return emit('report-empire',{first:true});}
  function contactRepublic(){if(s.path!=='coalition'||s.operative!=='free')return fail('Hara cannot brief you now.');if(s.republicContact)return {ok:true,first:false};s.republicContact=true;return emit('republic-contact',{first:true});}
  function evidence(id){if(s.path!=='empire'||!ids.includes(id))return fail('That evidence is not part of the investigation.');if(s.proof.includes(id))return {ok:true,first:false};s.proof.push(id);return emit('record-proof',{id,first:true});}
  function recordDeath(id){if(!ids.includes(id))return fail('That person is not on this roster.');if(s.dead.includes(id))return {ok:true,first:false};s.dead.push(id);if(id===LUSCIA_OPERATIVE_ID)s.operative='dead';return emit('loyalist-death',{id,first:true});}
  function finishEmpire(){if(s.path!=='empire'||!ids.every(id=>s.proof.includes(id)&&s.dead.includes(id)))return fail('The identified loyalists have not all been dealt with.');if(s.imperialComplete)return fail('This investigation has already been reported.');s.imperialComplete=true;return emit('complete-imperial-investigation');}
  function view(){
    let stage='unmet',objective='A divided valley',detail='Luscia’s war runs through its towns as well as its battlefields.',destinationIds=[];
    const offered=s.introduced||s.mindRead||s.soldier==='dead';
    if(offered){stage='choice';objective='Choose whom to report to';detail='Delivering the satchel is ordinary army work. Choosing to expose the Republican network to Sergeant Talven, or deliberately joining Hara’s cause, is a separate decision.';destinationIds=[...(recruitment()?[LUSCIA_OPERATIVE_ID]:[]),'lauvel-picket'];}
    if(s.path==='empire'){stage='investigate';objective='Identify the Republican loyalists';detail='Sergeant Talven orders an investigation. Search the relay dispatches for signed proof. Mind Read can suggest leads, but suspicion alone is not evidence.';destinationIds=['luscia-relay-dispatches'];}
    if(s.path==='empire'&&s.proof.length===ids.length){stage='confront';objective='Confront the identified loyalists';detail='The signed dispatches identify Hara, Tolm and Renn. Talven has ordered their deaths. Your journal keeps the evidence and each person’s fate.';destinationIds=ids.filter(id=>!s.dead.includes(id));if(!destinationIds.length){stage='report';objective='Report to Sergeant Talven';detail='The identified loyalists are dead. Report their fate to Talven.';destinationIds=['lauvel-picket'];}}
    if(s.path==='coalition'){stage=s.republicContact?'await-local-orders':'contact';objective=s.republicContact?'The Luscia network':'Speak with Hara privately';detail=s.republicContact?'You have joined the local network. Hara is preparing its next local job; Civil War in Luscia remains unfinished. Your main orders lead to Captain Arlen Voss at Solis.':'Speak to Hara about the Luscia network. Your gold campaign now takes you to the Republican muster at Solis.';destinationIds=s.republicContact?[]:[LUSCIA_OPERATIVE_ID];}
    if(!s.path&&s.operative!=='free'){stage='closed';objective='The contact is unavailable';detail=`Hara is ${s.operative==='dead'?'dead':'in custody'}. The Nothom route into the Republic has closed.`;destinationIds=[];}
    if(s.imperialComplete&&s.path==='empire'){stage='complete';objective='The garrison’s investigation is complete';detail='You reported the deaths to Talven. The Empire has broken this Luscia network.';destinationIds=[];}
    return {id:LUSCIA_CIVIL_QUEST_ID,grade:'plot',region:'Luscia',title:'Civil War in Luscia',objective,detail,stage,destinationIds,
      active:(offered||s.accepted)&&stage!=='closed'&&stage!=='complete',offered:offered&&!s.accepted,accepted:s.accepted,complete:stage==='complete',chosenPath:s.path,
      recruitmentAvailable:recruitment(),knownIds:[...new Set([...destinationIds,...s.proof])],
      entries:[...s.proof.map(id=>LUSCIA_LOYALISTS.find(n=>n.id===id).evidence),...s.dead.map(id=>`${LUSCIA_LOYALISTS.find(n=>n.id===id).name} is dead.`),...(s.imperialComplete?['The Imperial investigation was reported. Changing allegiance does not erase those deaths or grant that reward again.']:[])]};
  }
  return {meetSoldier,agreeSoldier,soldierDeparture,opposeSoldier,soldierKilled,readOperative,closeOperative,joinRepublic,reportEmpire,contactRepublic,evidence,recordDeath,finishEmpire,view,recruitmentAvailable:recruitment,
    state:()=>copy(s),snapshot:()=>copy(s),restore(data){if(!validateLusciaCivilWarSnapshot(data))return false;s=data===undefined?initial():copy(data);return true;}};
}
