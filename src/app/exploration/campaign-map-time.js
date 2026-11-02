// Map fast-forward is temporary transport, not a new campaign clock or save
// setting. Process bounded normal ticks so orders and event timestamps retain
// exactly the same rules as ordinary outdoor play.
export const MAP_CAMPAIGN_SPEEDS=Object.freeze([0,1,4,20]);
export function createCampaignMapTime(){
  let speed=0,until=null;
  function stopAtOpportunity(session){
    if(!until?.(session.snapshot()))return false;
    speed=0;until=null;return true;
  }
  return {
    get speed(){return speed;},
    get waiting(){return !!until;},
    reset(){speed=0;until=null;},
    select(value,{until:stop=null}={}){if(!MAP_CAMPAIGN_SPEEDS.includes(value))throw Error('Invalid map campaign speed.');speed=value;until=value?stop:null;},
    tick(session,dt,enabled){
      if(!enabled||!speed)return false;
      // A physical marching route can finish loading between order ticks.
      // Recheck before spending more time when its marker becomes usable.
      if(until&&session.clock().running&&stopAtOpportunity(session))return true;
      let changed=false;
      for(let i=0;i<speed;i++){
        const clock=session.clock();
        if(clock.pending||clock.complete){speed=0;until=null;break;}
        if(!clock.running)break;
        const advanced=session.tick(dt,true);changed=advanced||changed;
        // New orders are issued on simulation ticks. Stop at that same tick,
        // before the remaining accelerated steps can spend the new opportunity.
        if(advanced&&until&&stopAtOpportunity(session))break;
      }
      const clock=session.clock();if(clock.pending||clock.complete){speed=0;until=null;}
      return changed;
    },
  };
}
