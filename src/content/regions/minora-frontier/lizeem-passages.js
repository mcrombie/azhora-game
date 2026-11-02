import {MINORA_HARBOR} from './minora-harbor.js';
import {NETHEREUM_QUAY} from '../nethereum/nethereum-agriculture.js';
import {CARICAS_AGRICULTURE_QUAY} from './caricas-agriculture.js';
import {OVESOS_AGRICULTURE_QUAY} from '../oves/ovesos-agriculture.js';
import {NESDOR_AGRICULTURE_QUAY} from '../nesdor/nesdor-agriculture.js';

const town=(id,name,quay)=>{
  const dir=Math.sign(quay.end-quay.bank);
  return {id,name,keeper:{x:quay.bank+dir*3,z:quay.z},arrival:{x:quay.bank-dir*3,z:quay.z},heading:-dir*Math.PI/2};
};
export const LIZEEM_PORTS=[
  {id:'minora',name:'Minora',keeper:MINORA_HARBOR.keeper,arrival:MINORA_HARBOR.arrival,heading:Math.PI},
  town('nethereum','Nethereum',NETHEREUM_QUAY),
  town('caricas','Caricas',CARICAS_AGRICULTURE_QUAY),
  town('ovesos','Ovesos',OVESOS_AGRICULTURE_QUAY),
  town('nesdor','Nesdor',NESDOR_AGRICULTURE_QUAY),
];

export const passageBattle=(port,battles=[])=>battles.find(b=>b.region===port.id&&b.status==='active'&&!b.heroResult)??null;

// Keep the horse to the side or behind the traveler, never in the guide's lane.
export function passageHorseArrival(at,{clear,heightAt}){
  const y=heightAt(at.x,at.z),heading=at.heading??0;
  for(const r of [3.5,5,7])for(const offset of [Math.PI/2,-Math.PI/2,Math.PI*3/4,-Math.PI*3/4,Math.PI]){
    const angle=heading+offset,p={x:at.x+Math.sin(angle)*r,z:at.z+Math.cos(angle)*r};
    if(clear(p)&&Math.abs(heightAt(p.x,p.z)-y)<.6)return p;
  }
  return null;
}

// Land on a tested walking surface. A guide stops outside the gold boundary;
// neither a ferry nor a new save should silently commit the player to combat.
export function passageArrival(port,{battle=null,battles=[],clear,approachable=()=>true}){
  const outside=p=>battles.every(b=>b.status!=='active'||!b.location||Math.hypot(p.x-b.location.x,p.z-b.location.z)>(b.entryRadius??70)+4);
  if(battle?.location){
    const center=battle.location,angle=Math.atan2(port.arrival.x-center.x,port.arrival.z-center.z);
    for(const extra of [9,15,23])for(let i=0;i<32;i++){
      const a=angle+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/16,r=(battle.entryRadius??70)+extra;
      const p={x:center.x+Math.sin(a)*r,z:center.z+Math.cos(a)*r};
      if(outside(p)&&clear(p)&&approachable(p,battle))return {...p,heading:a+Math.PI,battleId:battle.id};
    }
    // Do not quietly promise a guided arrival and put the player far away.
    return null;
  }
  for(const r of [0,1.5,3,5,8,12])for(let i=0;i<(r?16:1);i++){
    const p={x:port.arrival.x+Math.sin(i*Math.PI/8)*r,z:port.arrival.z+Math.cos(i*Math.PI/8)*r};
    if(outside(p)&&clear(p))return {...p,heading:port.heading,battleId:null};
  }
  return null;
}
