/** A local settlement of the Common Water, not a conquest of Vastos. Pure state and rules. */
export const VASTOS_QUEST_ID = 'civil-war-vastos';
export const VASTOS_PATHS = Object.freeze(['republican', 'monarchist', 'mediation']);
export const VASTOS_STRAYS = Object.freeze(['west', 'east', 'ridge']);
export const VASTOS_NPCS = Object.freeze([
  Object.freeze({id:'vastos-herder',name:'Mera Rusk',role:'Keeper of the Common Water',modelRole:'commons-miller',color:0x88734d,look:{beard:false}}),
  Object.freeze({id:'vastos-republican',name:'Tessa Mere',role:'Delegate of the range communities',modelRole:'rise-custodian',color:0x536f79,look:{beard:false}}),
  Object.freeze({id:'vastos-monarchist',name:'Sergeant Alden',role:'Royal provisioning officer',modelRole:'legion-soldier',color:0x8b443b}),
]);
const flags = ['accepted','wateringOpened','heardHerder','heardRepublican','heardMonarchist','covenantRead',
  'republicanConcession','monarchistConcession','routeNoticePosted','levyManifestFiled','rewardGranted'];
const empty = () => ({version:1,...Object.fromEntries(flags.map(key=>[key,false])),strays:[],chosenPath:null,outcome:null});
const copy = state => ({...state,strays:[...state.strays]});
const recovered = s => s.wateringOpened && s.strays.length === 3;
const heardBoth = s => s.heardRepublican && s.heardMonarchist;
const foundPact = s => s.covenantRead && s.heardHerder && heardBoth(s);
const ready = s => s.chosenPath === 'republican' ? s.routeNoticePosted
  : s.chosenPath === 'monarchist' ? s.levyManifestFiled
    : s.chosenPath === 'mediation' && s.republicanConcession && s.monarchistConcession;

export const VASTOS_ENDINGS = Object.freeze({
  republican: Object.freeze({title:'The range keeps its own count',detail:'The communities keep the watering route and decide what cattle leave it. Tessa takes responsibility for the road watch. The royal supply contract is withdrawn; the herders must find another market for this season’s surplus.'}),
  monarchist: Object.freeze({title:'A levy with a limit',detail:'Alden accepts a written ceiling on the levy and reserves the breeding herd. Royal patrols and market access remain. The communities must surrender some surplus cattle and accept the Crown’s tally at the route.'}),
  mediation: Object.freeze({title:'The Common Water covenant',detail:'Both parties recognize the herders’ seasonal route. Alden gives up compulsory seizure and buys a capped surplus; Tessa accepts escorted royal buyers under a joint watch. The herders owe water upkeep and a public tally. This local bargain settles neither the succession nor the war.'}),
});

export function validateVastosCivilWarSnapshot(data,{allowMissing=true}={}) {
  if(data===undefined)return allowMissing;
  if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==1)return false;
  const keys=Object.keys(empty());
  if(Object.keys(data).length!==keys.length||Object.keys(data).some(k=>!keys.includes(k))||flags.some(k=>typeof data[k]!=='boolean'))return false;
  if(!Array.isArray(data.strays)||new Set(data.strays).size!==data.strays.length||data.strays.some(id=>!VASTOS_STRAYS.includes(id)))return false;
  if(![null,...VASTOS_PATHS].includes(data.chosenPath)||![null,...VASTOS_PATHS].includes(data.outcome))return false;
  if(!data.accepted&&(data.strays.length||flags.some(k=>data[k])||data.chosenPath||data.outcome))return false;
  if(data.chosenPath&&(!recovered(data)||!heardBoth(data)))return false;
  if(data.chosenPath==='mediation'&&!foundPact(data))return false;
  if(data.routeNoticePosted&&data.chosenPath!=='republican')return false;
  if(data.levyManifestFiled&&data.chosenPath!=='monarchist')return false;
  if((data.republicanConcession||data.monarchistConcession)&&data.chosenPath!=='mediation')return false;
  if(data.outcome&&(data.outcome!==data.chosenPath||!ready(data)))return false;
  return data.rewardGranted===!!data.outcome;
}

const actionSite = Object.freeze({
  'find-stray-west':'vastos-stray-west','find-stray-east':'vastos-stray-east','find-stray-ridge':'vastos-stray-ridge',
  'reopen-watering':'vastos-watering','read-covenant':'vastos-covenant',
  'post-route-notice':'vastos-route-notice','file-levy-manifest':'vastos-levy-manifest',
});
export const VASTOS_SITE_ACTIONS = Object.freeze(Object.fromEntries(Object.entries(actionSite).map(([a,id])=>[id,a])));
const labels = Object.freeze({
  'find-stray-west':'Lead the dun cow back to the fold', 'find-stray-east':'Lead the red cow back to the fold', 'find-stray-ridge':'Lead the pale cow back to the fold',
  'reopen-watering':'Lift the fallen hurdle from the watercourse', 'read-covenant':'Read the old grazing covenant',
  'post-route-notice':'Post the communities’ route notice', 'file-levy-manifest':'File the capped royal levy',
});

export function createVastosCivilWar({inventory,onEvent=()=>{}}={}) {
  let state=empty();
  function allowed(id) {
    if(typeof id!=='string')return false;
    if(state.outcome)return false;
    if(id==='accept-herd')return !state.accepted;
    if(!state.accepted)return false;
    if(id.startsWith('find-stray-'))return VASTOS_STRAYS.includes(id.slice(11))&&!state.strays.includes(id.slice(11));
    const fields={'reopen-watering':'wateringOpened','hear-herder':'heardHerder','hear-republican':'heardRepublican','hear-monarchist':'heardMonarchist','read-covenant':'covenantRead'};
    const field=Object.hasOwn(fields,id)?fields[id]:null;
    if(field)return !state[field];
    if(id.startsWith('choose-')){const path=id.slice(7);return !state.chosenPath&&recovered(state)&&heardBoth(state)&&VASTOS_PATHS.includes(path)&&(path!=='mediation'||foundPact(state));}
    if(id==='post-route-notice')return state.chosenPath==='republican'&&!state.routeNoticePosted;
    if(id==='file-levy-manifest')return state.chosenPath==='monarchist'&&!state.levyManifestFiled;
    if(id==='secure-republican-concession')return state.chosenPath==='mediation'&&!state.republicanConcession;
    if(id==='secure-monarchist-concession')return state.chosenPath==='mediation'&&!state.monarchistConcession;
    return id==='settle-camp'&&ready(state);
  }
  function act(id) {
    if(typeof id!=='string'||!allowed(id))return {ok:false,reason:'There is nothing to settle that way yet.'};
    if(id==='settle-camp'){
      // Pay through one inventory operation. A refused grant leaves the quest pending.
      if(typeof inventory?.add!=='function'||!inventory.add('salt-beef',2))return {ok:false,reason:'The food could not be put in your satchel. Try again.'};
      state.outcome=state.chosenPath;state.rewardGranted=true;
    } else if(id==='accept-herd')state.accepted=true;
    else if(id.startsWith('find-stray-'))state.strays.push(id.slice(11));
    else if(id.startsWith('choose-'))state.chosenPath=id.slice(7);
    else {const field=({'reopen-watering':'wateringOpened','hear-herder':'heardHerder','hear-republican':'heardRepublican',
      'hear-monarchist':'heardMonarchist','read-covenant':'covenantRead','post-route-notice':'routeNoticePosted',
      'file-levy-manifest':'levyManifestFiled','secure-republican-concession':'republicanConcession','secure-monarchist-concession':'monarchistConcession'})[id];state[field]=true;}
    const result={ok:true,type:'civil-war-progress',questId:VASTOS_QUEST_ID,action:id,outcome:state.outcome};onEvent(result);return result;
  }
  function view() {
    let stage='unmet',detail='The herders at the Common Water have lost cattle along a disputed watering route.',destinationIds=['vastos-herder'];
    if(state.accepted){
      stage='recover';destinationIds=VASTOS_STRAYS.filter(id=>!state.strays.includes(id)).map(id=>`vastos-stray-${id}`);
      if(!state.wateringOpened)destinationIds.push('vastos-watering');
      detail=`Bring the three strays home (${state.strays.length}/3) and open the watering place. The grazing route is caught between two claims.`;
      if(recovered(state)){
        stage='claims';destinationIds=[];
        if(!state.heardRepublican)destinationIds.push('vastos-republican');
        if(!state.heardMonarchist)destinationIds.push('vastos-monarchist');
        detail='Hear Tessa and Sergeant Alden, then take their claims to Mera. The cattle are home; whose terms will govern the route?';
        if(heardBoth(state)){stage='decision';destinationIds=['vastos-herder'];}
      }
      if(state.chosenPath){
        stage='terms';destinationIds=state.chosenPath==='republican'?['vastos-route-notice']:state.chosenPath==='monarchist'?['vastos-levy-manifest']:
          [...(!state.republicanConcession?['vastos-republican']:[]),...(!state.monarchistConcession?['vastos-monarchist']:[])];
        detail=state.chosenPath==='republican'?'Post the communities’ claim at the route notice, then return to Mera.':state.chosenPath==='monarchist'?
          'File the levy ceiling at Alden’s tally table, then return to Mera.':'Ask both parties for the concessions the old covenant requires, then return to Mera.';
        if(ready(state)){stage='settle';destinationIds=['vastos-herder'];detail='Both the work and the terms are ready. Ask Mera to close the settlement at the camp.';}
      }
    }
    if(state.outcome){stage='complete';detail=VASTOS_ENDINGS[state.outcome].detail;destinationIds=[];}
    const knownIds=state.accepted?['vastos-herder','vastos-republican','vastos-monarchist','vastos-watering',...VASTOS_STRAYS.map(id=>`vastos-stray-${id}`),
      ...(state.covenantRead?['vastos-covenant']:[]),...(state.chosenPath==='republican'?['vastos-route-notice']:[]),...(state.chosenPath==='monarchist'?['vastos-levy-manifest']:[])]:[];
    const entries=[];
    if(state.heardHerder)entries.push('Mera: breeding cattle and the seasonal route keep this community alive. Whoever wins needs to leave both intact.');
    if(state.heardRepublican)entries.push('Tessa offers a community road watch and local control of the herd. Losing the royal contract means finding other buyers.');
    if(state.heardMonarchist)entries.push('Alden offers patrols and the lake-country market, in return for a limited levy and the Crown’s tally.');
    if(state.covenantRead)entries.push('The old covenant ties water upkeep to passage: no claim to the crossing cancels another herd’s seasonal use. Buyers once paid a fixed price at a public tally.');
    if(state.outcome)entries.push('Mera has shared two portions of salt beef. The settlement is recorded; the main war and your army contract continue.');
    return {id:VASTOS_QUEST_ID,grade:'plot',region:'Vastos',title:'The Common Water',stage,detail,destinationIds,knownIds,entries,
      complete:!!state.outcome,outcome:state.outcome,mediationDiscovered:foundPact(state)};
  }
  const siteView=id=>{const action=Object.hasOwn(VASTOS_SITE_ACTIONS,id)?VASTOS_SITE_ACTIONS[id]:null;return action&&allowed(action)?{id,action,prompt:labels[action]}:null;};
  return {state:()=>copy(state),snapshot:()=>copy(state),restore(data){if(!validateVastosCivilWarSnapshot(data))return false;state=data===undefined?empty():copy(data);return true;},
    act,view,allowed,siteView,availableActions:()=>Object.keys(actionSite).filter(allowed)};
}
