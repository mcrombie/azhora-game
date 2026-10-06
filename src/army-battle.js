/** Matched exchanges for the first army battle. Both sides use the same timing
 * and damage rules. Contacts are collected before damage is applied, so frame
 * iteration order cannot decide a trade. Player hits use the ordinary combat
 * controller and can break a pair, freeing its survivor to reinforce another. */
export const ARMY_BATTLE_ID = 'chapter-one-army';
export function createArmyExchanges({allies,enemies,seed=0,move,hit,player,attackPlayer,lineClear=()=>true}) {
  let clock=0;
  const pairs=allies.map((a,i)=>({a,b:enemies[i],time:0,wait:i===19?22:i*.19,hit:false}));
  // A fair coin gives one soldier a tiny initial advantage, not a scripted win.
  const edge=(seed&1)?enemies[19]:allies[19];
  if(edge){edge.hp+=2;edge.maxHp+=2;}
  const alive=a=>a&&a.active!==false&&a.hp>0;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function tick(dt) {
    clock+=dt;
    const impacts=[];
    for(const pair of pairs){
      let {a,b}=pair;
      if(!alive(a)&&!alive(b))continue;
      if(!alive(a)||!alive(b)){
        const survivor=alive(a)?a:b,team=alive(a)?'ally':'enemy';
        const target=(team==='ally'?enemies:allies).filter(alive).sort((x,y)=>distance(survivor,x)-distance(survivor,y))[0];
        if(!target){
          if(team==='enemy'&&player.hp>0&&distance(survivor,player)<16){
            survivor.yaw=Math.atan2(player.x-survivor.x,player.z-survivor.z);
            if(distance(survivor,player)>2)move(survivor,player,dt,team);
            else {pair.time+=dt;survivor.action=pair.time<.7?'windup':'attack';survivor.progress=Math.min(1,pair.time/.7);
              if(pair.time>=1){attackPlayer(survivor,14);pair.time=-.65;}}
          }else{survivor.action='idle';survivor.speed=0;}
          continue;
        }
        if(team==='ally')b=target;else a=target;
      }
      for(const [actor,target,team] of [[a,b,'ally'],[b,a,'enemy']]){
        actor.yaw=Math.atan2(target.x-actor.x,target.z-actor.z);
        if(distance(actor,target)>2.1){actor.action='idle';move(actor,target,dt,team);}
        else actor.speed=0;
      }
      if(distance(a,b)>2.6||!lineClear(a,b))continue;
      pair.wait-=dt;if(pair.wait>0)continue;
      pair.time+=dt;
      const phase=pair.time<.7?'windup':pair.time<1.05?'attack':'idle';
      // Reinforcements do not restart their target's own attack animation.
      for(const actor of [pair.a,pair.b])if(alive(actor)){actor.action=phase;actor.progress=phase==='windup'?pair.time/.7:phase==='attack'?(pair.time-.7)/.35:0;}
      if(pair.time>=.86&&!pair.hit){
        pair.hit=true;
        if(alive(pair.a))impacts.push({target:b,source:pair.a,team:'enemy',damage:15});
        if(alive(pair.b))impacts.push({target:a,source:pair.b,team:'ally',damage:15});
      }
      if(pair.time>=1.8){pair.time=0;pair.hit=false;}
    }
    // Damage is real and remains on the shared combat actors, including any
    // prior player damage. A dying soldier's already committed blow can trade.
    for(const impact of impacts)hit(impact);
    return {clock,allies:allies.filter(alive).length,enemies:enemies.filter(alive).length};
  }
  return {tick};
}
