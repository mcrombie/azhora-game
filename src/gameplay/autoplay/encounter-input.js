// Read-only demonstration policy. Uses the same movement, dodge and strike inputs
// as the player; it cannot change health, timing, collision or campaign outcomes.
import {encounterAttack} from '../combat/encounter-attacks.js';
import {encounterSteering} from '../combat/encounter-space.js';
import {encounterFacing,selectEncounterTarget} from '../combat/encounter-target.js';
export function encounterAutoplayInput(state){
  if(!state||state.outcome)return {};
  const h=state.hero,distance=g=>Math.hypot(g.x-h.x,g.z-h.z);
  const live=state.guards.filter(g=>g.hp>0&&!g.escaped).sort((a,b)=>distance(a)-distance(b)||a.id-b.id);
  if(!live.length||h.dodge>0)return {};
  const threat=live.find(g=>{if(state.squad&&g.targetId!==-1)return false;const a=encounterAttack(g);return !g.hitThisAttack&&distance(g)<a.reach+.3&&((g.phase==='windup'&&g.timer<.18)||(g.phase==='strike'&&!g.contactResolved));});
  if(threat&&h.dodgeCooldown===0){
    // Step across the committed swing, keeping close enough to counter.
    const dx=h.x-threat.x,dz=h.z-threat.z,d=Math.hypot(dx,dz)||1;
    return threat.attack==='sweep'?{x:dx/d,z:dz/d,dodge:true}:{x:dz/d,z:-dx/d,dodge:true};
  }
  // Do not step back into a sweep while its blade is still travelling.
  if(threat?.attack==='sweep'){const d=distance(threat)||1;return {x:(h.x-threat.x)/d,z:(h.z-threat.z)/d};}
  const target=live.find(g=>g.role==='runner'&&distance(g)<12)??live.find(g=>g.open)??live[0],d=distance(target);
  if(target.role==='runner'||target.open||state.squad&&target.targetId!==-1){
    const selected=selectEncounterTarget(h,live),approach=d>(target.role==='runner'?1.5:2.1)||!encounterFacing(h,target,Math.PI/6)||selected?.id!==target.id;
    const direction=approach?encounterSteering(h,target,[...live,...(state.allies??[])]):{x:0,z:0};
    const aimed={...h,heading:approach&&!h.swing?Math.atan2(direction.x,direction.z):h.heading};
    return {...direction,attack:d<2.5&&selectEncounterTarget(aimed,live)?.id===target.id};
  }
  // Let an approaching soldier commit before evading. Approach distant runners.
  return d>2.2?encounterSteering(h,target,[...live,...(state.allies??[])]):{};
}
