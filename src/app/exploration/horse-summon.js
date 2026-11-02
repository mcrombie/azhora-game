import {offeredHorseSpot} from './bear-arrival.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {RIDE} from '../../gameplay/movement/riding.js';

// Check the whole horse on the same reachable floor as the traveler. A river,
// low roof, cliff edge, unloaded cell or stable stall must never be an arrival.
export function horseSummonSpot(player,heading,world,{clearAt=()=>true,avoid=[]}={}){
  if(!Number.isFinite(player?.y))return null;
  const heightAt=(x,z)=>world.supportAt?.(x,z,{maxY:player.y,stepUp:.45,groundSlope:false})?.height??world.heightAt(x,z);
  const field={...world,heightAt,bodyHeight:RIDE.bodyHeight};
  const point=offeredHorseSpot(player,heading,p=>{
    const y=heightAt(p.x,p.z);
    if(!Number.isFinite(y)||Math.abs(y-player.y)>.65)return false;
    for(const [offset,radius] of [[0,RIDE.radius],[-.65,.42],[.85,.42]]){
      const x=p.x+Math.sin(p.yaw)*offset,z=p.z+Math.cos(p.yaw)*offset,ground=heightAt(x,z);
      if(!world.readyAt(x,z)||!world.canExploreAt(x,z)||!clearAt(x,z,radius)
        ||!Number.isFinite(ground)||Math.abs(ground-y)>.35||!canStand(x,z,field,radius,ground)
        ||avoid.some(a=>Math.hypot(x-a.x,z-a.z)<radius+(a.radius??.4)))return false;
    }
    return true;
  });
  return point?{...point,y:heightAt(point.x,point.z)}:null;
}
