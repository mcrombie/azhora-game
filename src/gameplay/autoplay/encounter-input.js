// Read-only demonstration policy. Uses the same movement, dodge and strike inputs
// as the player; it cannot change health, timing, collision or campaign outcomes.
import {encounterAttack} from '../combat/encounter-attacks.js';
export function encounterAutoplayInput(state){
  if(!state||state.outcome)return {};
  const h=state.hero,distance=g=>Math.hypot(g.x-h.x,g.z-h.z);
  const live=state.guards.filter(g=>g.hp>0&&!g.escaped).sort((a,b)=>distance(a)-distance(b)||a.id-b.id);
  if(!live.length||h.dodge>0)return {};
  const threat=live.find(g=>{const a=encounterAttack(g);return !g.hitThisAttack&&distance(g)<a.reach+.3&&((g.phase==='windup'&&g.timer<.18)||(g.phase==='strike'&&!g.contactResolved));});
  if(threat&&h.dodgeCooldown===0){
    // Step across the committed swing, keeping close enough to counter.
    const dx=h.x-threat.x,dz=h.z-threat.z,d=Math.hypot(dx,dz)||1;
    return threat.attack==='sweep'?{x:dx/d,z:dz/d,dodge:true}:{x:dz/d,z:-dx/d,dodge:true};
  }
  // Do not step back into a sweep while its blade is still travelling.
  if(threat?.attack==='sweep'){const d=distance(threat)||1;return {x:(h.x-threat.x)/d,z:(h.z-threat.z)/d};}
  const target=live.find(g=>g.role==='runner'&&distance(g)<12)??live.find(g=>g.open)??live[0],d=distance(target);
  if(target.role==='runner')return {x:d>1.5?(target.x-h.x)/d:0,z:d>1.5?(target.z-h.z)/d:0,attack:d<2.5};
  if(target.open)return {x:d>2.1?(target.x-h.x)/d:0,z:d>2.1?(target.z-h.z)/d:0,attack:d<2.6};
  // Let an approaching soldier commit before evading. Approach distant runners.
  return d>2.2?{x:(target.x-h.x)/d,z:(target.z-h.z)/d}:{};
}
