/** Persistent consequences for hurting people outside an agreed or hostile fight. */
export const LAW = Object.freeze({assaultFine:20,killingFine:100,resistingFine:30,jailSeconds:300,
  recoverySeconds:180,cleanupSeconds:120,noticeRadius:65,talkRange:3.2});
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)
  &&!['constructor','prototype','__proto__'].includes(id);
const count=value=>Number.isSafeInteger(value)&&value>=0;
const point=value=>value&&Number.isFinite(value.x)&&Number.isFinite(value.z)
  &&(value.y===undefined||Number.isFinite(value.y));
const copy=value=>JSON.parse(JSON.stringify(value));
const fresh=()=>({version:1,time:0,bounty:0,phase:'clear',assaults:0,killings:0,refusals:0,
  jailCount:0,finesPaid:0,people:{},lastVictim:null});

export function validCrimeState(value){
  if(!value||value.version!==1||!Number.isFinite(value.time)||value.time<0
    ||!['clear','wanted','resisting'].includes(value.phase)
    ||!['bounty','assaults','killings','refusals','jailCount','finesPaid'].every(key=>count(value[key]))
    ||(value.bounty===0)!==(value.phase==='clear')||!(value.lastVictim===null||validId(value.lastVictim))
    ||!value.people||typeof value.people!=='object'||Array.isArray(value.people)||Object.keys(value.people).length>4096)return false;
  for(const [id,person] of Object.entries(value.people)){
    if(!validId(id)||!person||!Number.isFinite(person.maxHp)||person.maxHp<=0||person.maxHp>10000
      ||!Number.isFinite(person.hp)||person.hp<0||person.hp>person.maxHp
      ||!['alive','downed','dead'].includes(person.status)||(person.status==='alive')!==(person.hp>0)
      ||typeof person.essential!=='boolean'||typeof person.cleaned!=='boolean'
      ||!(person.position===null||point(person.position))
      ||!(person.recoverAt===null||(Number.isFinite(person.recoverAt)&&person.recoverAt>=0))
      ||!(person.cleanupAt===null||(Number.isFinite(person.cleanupAt)&&person.cleanupAt>=0))
      ||(person.status==='downed'&&(!person.essential||person.recoverAt===null))
      ||(person.status==='dead'&&(person.essential||person.recoverAt!==null)))return false;
  }
  return true;
}

export function createCrime(){
  let state=fresh();
  function health(id,{maxHp=60,essential=false}={}){
    if(!validId(id)||!Number.isFinite(maxHp)||maxHp<=0||maxHp>10000)return null;
    return copy(state.people[id]??{hp:maxHp,maxHp,status:'alive',essential:!!essential,
      position:null,recoverAt:null,cleanupAt:null,cleaned:false});
  }
  function hit({id,damage,maxHp=60,essential=false,position=null,unlawful=true,permanent=false,recoverable=false}={}){
    if(!Number.isFinite(damage)||damage<=0||damage>10000||!(position===null||point(position)))return {ok:false,reason:'invalid'};
    const person=health(id,{maxHp,essential});
    if(!person)return {ok:false,reason:'invalid'};
    if(person.status!=='alive')return {ok:false,reason:'down'};
    const dealt=Math.min(person.hp,damage);person.hp=Math.max(0,person.hp-dealt);
    if(!person.hp){if(permanent)person.essential=false;else if(recoverable)person.essential=true;
      person.status=person.essential?'downed':'dead';person.position=position?copy(position):null;
      person.recoverAt=person.essential?state.time+LAW.recoverySeconds:null;
      person.cleanupAt=state.time+LAW.cleanupSeconds;person.cleaned=false;}
    state.people[id]=person;
    if(unlawful){state.assaults++;state.bounty+=LAW.assaultFine;state.lastVictim=id;
      if(!person.hp){if(person.status==='dead')state.killings++;state.bounty+=LAW.killingFine;}
      if(state.phase==='clear')state.phase='wanted';}
    return {ok:true,id,damage:dealt,hp:person.hp,maxHp:person.maxHp,downed:person.status==='downed',
      dead:person.status==='dead',crime:!!unlawful,bounty:state.bounty,person:copy(person)};
  }
  function tick(seconds){
    if(!Number.isFinite(seconds)||seconds<=0)return [];
    state.time+=seconds;const events=[];
    for(const [id,person] of Object.entries(state.people)){
      if(person.status==='downed'&&state.time>=person.recoverAt){
        person.hp=person.maxHp;person.status='alive';person.recoverAt=null;person.cleanupAt=null;person.cleaned=false;
        events.push({type:'revived',id,person:copy(person)});
      }else if(person.status!=='alive'&&!person.cleaned&&state.time>=person.cleanupAt){
        person.cleaned=true;events.push({type:'cleanup',id,person:copy(person)});
      }
    }
    return events;
  }
  function settle(method,charge=()=>true){
    if(!state.bounty||!['fine','jail'].includes(method))return {ok:false,reason:'no-charge'};
    const amount=state.bounty;
    if(method==='fine'&&charge(amount)!==true)return {ok:false,reason:'funds',amount};
    if(method==='fine')state.finesPaid+=amount;else state.jailCount++;
    state.bounty=0;state.phase='clear';
    return {ok:true,method,amount,seconds:method==='jail'?LAW.jailSeconds:0};
  }
  return {health,hit,tick,settle,
    resist(){if(!state.bounty)return {ok:false};if(state.phase!=='resisting'){state.refusals++;state.bounty+=LAW.resistingFine;state.phase='resisting';}return {ok:true,bounty:state.bounty};},
    leaveFight(){if(state.bounty)state.phase='wanted';},
    state:()=>copy(state),snapshot:()=>copy(state),
    restore(value){if(value===undefined||value===null){state=fresh();return true;}if(!validCrimeState(value))return false;state=copy(value);return true;},
    view(){return {wanted:state.bounty>0,bounty:state.bounty,phase:state.phase,
      title:state.bounty?'Wanted by the Imperial watch':'No outstanding bounty',
      detail:state.bounty?`${state.bounty} copper fine. Guards may stop you. Pay the fine, serve time, or resist arrest.`:'The watch has no charges against you.',
      deaths:Object.entries(state.people).filter(([,person])=>person.status==='dead').map(([id])=>id),
      downed:Object.entries(state.people).filter(([,person])=>person.status==='downed').map(([id])=>id)};},
  };
}
