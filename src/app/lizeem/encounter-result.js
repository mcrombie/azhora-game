import {commanderReports} from '../../gameplay/combat/commander-morale.js';

// The result preview and the actual commit use identical accounting. A preview
// supplies a replayed campaign; it must never mutate the running campaign.
export function applyEncounterResult(campaign,{pending,field=null,side=null,outcome=null,reason=null,started=false}){
  const duel=pending.duel?.status==='accepted';
  const stopped=duel?0:field?.interception||pending.rally||pending.participation
    ?field?.guards.filter(g=>!g.commanderId&&(!g.hp||g.routed)).length??0:null;
  return pending.participation
    ?campaign.resolveEncounter(pending.id,started?side:duel?pending.duel.faction:null,outcome??'withdraw',reason??(started||duel?'withdrew':'declined'),stopped??0,{
      escaped:field?.guards.filter(g=>g.escaped&&!g.routed).length??0,
      ...(field?.squad?{alliesLost:field.squad.alliesLost,routed:field.squad.routed,allyDamage:field.squad.damageByAllies}:{}),
      ...(field&&pending.rally&&pending.commanders?{commanders:commanderReports(field)}:{}),
    })
    :campaign.resolveEncounter(pending.id,outcome||stopped>0?side:null,outcome??'withdraw',reason??(stopped!==null?'withdrew':null),stopped);
}
