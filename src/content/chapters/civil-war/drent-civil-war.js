/** Drent's optional silver story. Evidence, allegiance and rewards are saved independently
 * of the gold journey: accepting this investigation never advances or blocks Chapter 1. */
export const DRENT_QUEST_ID = 'civil-war-drent';
export const DRENT_EVIDENCE_ID = 'drent-rebel-evidence';
export const DRENT_SUPPLIES_ID = 'drent-armory-supplies';
export const DRENT_PATHS = Object.freeze(['monarchist', 'republican']);
export const DRENT_EVIDENCE_TEXT = Object.freeze([
  'To the Greenway watch: keep the road, but leave the farm paths open. Our people still need to reach the harbor.',
  'Killian in Tidehaven keeps the Republican supply account. Find him near the harbor cottages. Tell him the empty camp has lost its watch, and he will know what must be moved.',
  'The Crown calls us a few hired rebels. Ask the families who feed this camp who they chose to speak for them. We need bandages and food from the garrison stores, not another village burned for choosing its own government.',
]);
export const DRENT_ENDINGS = Object.freeze({
  monarchist: Object.freeze({title:'The Crown holds Tidehaven',detail:'Killian is dead. Glun has broken the local supply link and commended your service to the Empire. The people who relied on that link must manage without it.'}),
  republican: Object.freeze({title:'Supplies for the Republic',detail:'Killian has hidden the barracks supplies for the Republican network. He remains in Tidehaven, and the local rebels know you helped them. Glun does not have the evidence.'}),
});

const flags = ['ambushDefeated','accepted','evidenceFound','evidenceRead','confrontationStarted','killianDefeated','suppliesStolen','rewardGranted'];
const empty = () => ({version:1,...Object.fromEntries(flags.map(key=>[key,false])),chosenPath:null,outcome:null,favor:{empire:0,republic:0}});
const copy = state => ({...state,favor:{...state.favor}});
const actions = Object.freeze(['defeat-ambush','accept-investigation','search-camp','read-evidence','report-glun','report-killian',
  'confront-killian','failed-confrontation','kill-killian','report-victory','steal-supplies','return-supplies']);

export function validateDrentCivilWarSnapshot(data,{allowMissing=true}={}) {
  if(data===undefined)return allowMissing;
  if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==1)return false;
  const keys=Object.keys(empty());
  if(Object.keys(data).length!==keys.length||Object.keys(data).some(key=>!keys.includes(key))||flags.some(key=>typeof data[key]!=='boolean'))return false;
  if(![null,...DRENT_PATHS].includes(data.chosenPath)||![null,...DRENT_PATHS].includes(data.outcome))return false;
  if(!data.ambushDefeated&&(flags.some(key=>data[key])||data.chosenPath||data.outcome))return false;
  if(!data.accepted&&(flags.some(key=>!['ambushDefeated','accepted'].includes(key)&&data[key])||data.chosenPath||data.outcome))return false;
  if(!data.evidenceFound&&(data.evidenceRead||data.chosenPath))return false;
  if(data.chosenPath==='republican'&&!data.evidenceRead)return false;
  if((data.confrontationStarted||data.killianDefeated)&&data.chosenPath!=='monarchist')return false;
  if(data.killianDefeated&&!data.confrontationStarted)return false;
  if(data.suppliesStolen&&data.chosenPath!=='republican')return false;
  if(data.outcome&&(data.outcome!==data.chosenPath||(data.outcome==='monarchist'?!data.killianDefeated:!data.suppliesStolen)))return false;
  if(data.rewardGranted!==!!data.outcome)return false;
  const favor=data.favor;
  return !!favor&&typeof favor==='object'&&!Array.isArray(favor)&&Object.keys(favor).length===2
    &&favor.empire===(data.outcome==='monarchist'?10:0)&&favor.republic===(data.outcome==='republican'?10:0);
}

/** The host applies a whole effects batch before a transition commits. Return false when
 * the satchel or other dependency rejects it; a retry then remains possible. Inspecting an
 * item is deliberately separate from read-evidence, which is an explicit player choice. */
export function createDrentCivilWar({applyEffects=()=>true,onEvent=()=>{}}={}) {
  let state=empty();
  function allowed(action) {
    if(!actions.includes(action)||state.outcome)return false;
    switch(action){
      case 'defeat-ambush': return !state.ambushDefeated;
      case 'accept-investigation': return state.ambushDefeated&&!state.accepted;
      case 'search-camp': return state.accepted&&!state.evidenceFound;
      case 'read-evidence': return state.evidenceFound&&!state.evidenceRead&&!state.chosenPath;
      case 'report-glun': return state.evidenceFound&&!state.chosenPath;
      case 'report-killian': return state.evidenceRead&&!state.chosenPath;
      case 'confront-killian': return state.chosenPath==='monarchist'&&!state.confrontationStarted;
      case 'failed-confrontation': return state.confrontationStarted&&!state.killianDefeated;
      case 'kill-killian': return state.confrontationStarted&&!state.killianDefeated;
      case 'report-victory': return state.killianDefeated;
      case 'steal-supplies': return state.chosenPath==='republican'&&!state.suppliesStolen;
      case 'return-supplies': return state.suppliesStolen;
      default:return false;
    }
  }
  function preview(action) {
    if(!allowed(action))return null;
    switch(action){
      case 'search-camp':return [{type:'grant',id:DRENT_EVIDENCE_ID,quantity:1}];
      case 'report-glun':return [{type:'remove',id:DRENT_EVIDENCE_ID,quantity:1}];
      case 'report-killian':return [{type:'remove',id:DRENT_EVIDENCE_ID,quantity:1},{type:'learn',id:'stealth'}];
      case 'steal-supplies':return [{type:'grant',id:DRENT_SUPPLIES_ID,quantity:1},{type:'skill-floor',id:'stealth',xp:83}];
      case 'report-victory':return [{type:'favor',faction:'empire',amount:10}];
      case 'return-supplies':return [{type:'remove',id:DRENT_SUPPLIES_ID,quantity:1},{type:'favor',faction:'republic',amount:10}];
      default:return [];
    }
  }
  function act(action) {
    const effects=preview(action);
    if(effects===null)return {ok:false,reason:'That step is not available now.'};
    if(applyEffects(effects,{action,state:copy(state)})===false)return {ok:false,reason:'The quest could not update your supplies. Try again.'};
    switch(action){
      case 'defeat-ambush':state.ambushDefeated=true;break;
      case 'accept-investigation':state.accepted=true;break;
      case 'search-camp':state.evidenceFound=true;break;
      case 'read-evidence':state.evidenceRead=true;break;
      case 'report-glun':state.chosenPath='monarchist';break;
      case 'report-killian':state.chosenPath='republican';break;
      case 'confront-killian':state.confrontationStarted=true;break;
      case 'failed-confrontation':state.confrontationStarted=false;break;
      case 'kill-killian':state.killianDefeated=true;break;
      case 'steal-supplies':state.suppliesStolen=true;break;
      case 'report-victory':state.outcome='monarchist';state.rewardGranted=true;state.favor.empire=10;break;
      case 'return-supplies':state.outcome='republican';state.rewardGranted=true;state.favor.republic=10;break;
    }
    const result={ok:true,questId:DRENT_QUEST_ID,action,effects,stage:view().stage,outcome:state.outcome};
    onEvent(result);return result;
  }
  function view() {
    let stage='unmet',objective='A troubled road',detail='The Drent road has troubles of its own.',destinationIds=[];
    if(state.ambushDefeated){stage='offered';objective='Report the rebels to Glun';detail='You defeated the Greenway ambushers. You may report them to Officer Glun, or continue to Nothom on your army orders.';destinationIds=['instructor'];}
    if(state.accepted){stage='camp';objective='Search the rebel camp';detail='Find the deserted camp in the woods beside Greenway Watch. Search their belongings for evidence. Glun told you to bring any papers back without reading them.';destinationIds=['drent-rebel-camp'];}
    if(state.evidenceFound){stage='evidence';objective='Return the sealed evidence';detail='Take the recovered papers to Glun. You can also inspect the packet in your satchel (I) and choose to break its seal. Reading it is your decision.';destinationIds=['instructor'];}
    if(state.evidenceRead){stage='choice';objective='Choose whom to trust';detail='The papers name Killian in Tidehaven as a Republican contact. Deliver them to Killian to help the Republic, or to Glun to side with the Empire. Handing them over commits you to that side in Drent.';destinationIds=['killian','instructor'];}
    if(state.chosenPath==='monarchist'){stage='ready';objective='Speak to Glun when ready';detail='You gave the evidence to Glun. Tell him when you are ready to confront Killian together in Tidehaven.';destinationIds=['instructor'];}
    if(state.confrontationStarted){stage='confronting';objective='Confront Killian with Glun';detail='Follow Glun to Killian. Killian has refused to surrender; fight alongside the officer.';destinationIds=['killian'];}
    if(state.killianDefeated){stage='report';objective='Report to Glun';detail='Killian is dead. Speak with Glun to finish the investigation and receive the Empire\'s recognition.';destinationIds=['instructor'];}
    if(state.chosenPath==='republican'){stage='supplies';objective='Sneak into the barracks';detail='Killian taught you Stealth. Enter sneak mode, pass the barracks guards without being spotted, and take the armory supplies. Return them to Killian.';destinationIds=['drent-barracks-supplies'];}
    if(state.suppliesStolen){stage='return';objective='Bring the supplies to Killian';detail='You have the barracks supplies. Return to Killian in Tidehaven to help the Republican network.';destinationIds=['killian'];}
    if(state.outcome){stage='complete';objective=DRENT_ENDINGS[state.outcome].title;detail=DRENT_ENDINGS[state.outcome].detail;destinationIds=[];}
    const entries=[];
    if(state.accepted)entries.push('Glun asked you to search the camp and return any papers unread. Your army orders to report to Nothom remain open.');
    if(state.evidenceRead)entries.push(...DRENT_EVIDENCE_TEXT);
    if(state.chosenPath)entries.push(state.chosenPath==='monarchist'?'You entrusted the evidence to Glun and chose the Empire in Drent.':'You entrusted the evidence to Killian and chose the Republic in Drent.');
    if(state.outcome)entries.push(state.outcome==='monarchist'?'Empire favor +10.':'Republic favor +10.');
    return {id:DRENT_QUEST_ID,grade:'plot',region:'Drent',title:'Civil War in Drent',objective,detail,stage,destinationIds,entries,
      active:state.accepted&&!state.outcome,accepted:state.accepted,offered:state.ambushDefeated&&!state.accepted,
      complete:!!state.outcome,outcome:state.outcome,chosenPath:state.chosenPath,evidenceRead:state.evidenceRead,
      favor:{...state.favor},knownIds:state.accepted?['instructor','drent-rebel-camp',...(state.evidenceRead?['killian']:[]),...(state.chosenPath==='republican'?['drent-barracks-supplies']:[])]:[]};
  }
  return {state:()=>copy(state),snapshot:()=>copy(state),allowed,preview,act,view,availableActions:()=>actions.filter(allowed),
    restore(data){if(!validateDrentCivilWarSnapshot(data))return false;state=data===undefined?empty():copy(data);return true;}};
}
