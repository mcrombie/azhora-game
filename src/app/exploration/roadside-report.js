import {adventureTimeLabel} from '../../experiments/day-night/opening-time-label.js';

// The same saved outcome feeds the live report and the Chronoscope. A road
// victory affects a column; territorial changes still require a regional battle.
export function roadsideReport(event,{region=id=>id,faction=id=>id,elapsed=false}={}){
  const destroyed=event.strength===0,arrival=elapsed?adventureTimeLabel(event.arrives*60):`day ${event.arrives}`;
  const title=destroyed?'Enemy column destroyed':event.outcome==='success'?`Roadside victory in ${region(event.region)}`:event.outcome==='withdraw'?'Left the roadside fight':'Roadside interception repelled';
  const travel=destroyed?'The army will not reach its destination.':event.delay?`The survivors are delayed, now expected at ${region(event.to)} on ${arrival}.`:`The survivors continue toward ${region(event.to)} on their original schedule.`;
  const captain=event.commander,fallen=captain&&['routed','slain','captured'].includes(captain.status);
  const commander=captain?` ${captain.name} ${captain.status==='slain'?'was slain':captain.status==='routed'?'retreated':captain.status==='captured'?'was captured':'survived with the column'}.${fallen&&Object.keys(event.morale??{}).length?' Their loss of command weakened their morale and strengthened yours.':''}`:'';
  const detail=`You fought ${event.armyName} for ${faction(event.faction)}, removing ${event.removed} enemy strength.${event.routed?` ${event.routed} enemy soldier${event.routed===1?' fled':'s fled'} and survived.`:''} ${travel} No town changed hands.${commander}`;
  return {id:event.id,hero:true,roadside:true,armyId:event.armyId,region:event.region,title,detail,
    note:'This march has been intercepted. Follow Taleth’s next directive or continue exploring.',
    facts:[['Enemy strength removed',String(event.removed)],['Allied scouts lost',`${event.alliesLost}${event.support?' / from '+event.support.name:''}`],['Column remaining',String(event.strength)],...(event.routed?[['Enemy retreats',`${event.routed} survived`]]:[])]};
}
