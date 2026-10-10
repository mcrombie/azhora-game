import {hasSettlement} from './league-settlement.js';
import {latestPersonalBattle} from './battle-consequences.js';

// Intentions and memories, not new tasks or simulated reconstruction orders.
export function postwarPlans(id,state){
  if(!hasSettlement(state))return null;
  const west=state.winner==='west';
  return {
    mayor:west?'First, I want the roads open and the eastern towns heard in this council. My allies won; that does not give us leave to govern half the League as conquered ground. Judge this government by whether people can bring a cart home safely.':'I will press the High Priest to hear Ovesos and the western towns. Losing a war must not mean losing our voice. There is work for a Mayor even when someone else sets the council agenda.',
    temple:west?'The mourning belongs to both banks. I want the temple open to eastern and western families alike. I will also remind the Mayor that a country cannot be held together by markets alone.':'I want the wounded cared for and the dead remembered on both banks. Our eastern allies prevailed, but this is a League, not a congregation compelled to agree. The Mayor must have room to speak.',
    seshat:'Accounts of what came back, and names of those who did not. I want the new League to preserve both. If you need to remember how the war unfolded, Taleth keeps the campaign in his Chronoscope.',
    satet:'Keep filling the bowls. Peace still arrives thirsty. I would like a day when I can finish the washing without wondering how many more people will need it.',
    portunus:'Find out which carriers are ready to travel again, then speak to the western stalls. Trade will need more than a new name stamped on a document. I can start with the people standing beside me.',
    njord:'Check the wheels, count the loads, see who is still willing to take the road to Nesdor. The speeches can wait until the cart is ready.',
    manawydan:'Ask my eastern neighbors what they need and tell them what Nethereum can spare. That is how I would begin making a League. No one needs to pretend the war never happened.',
    hapi:'Inspect the mooring lines and talk to the carriers on both banks. Let this river carry ordinary cargo again. I would welcome an uneventful crossing.'
  }[id]??null;
}
export function postwarMemory(id,state,residentSide=null){
  if(!hasSettlement(state))return null;
  const last=latestPersonalBattle(state);
  if(!last)return 'You let the armies decide the fighting. People here have their own memories of its result; you need not claim their victory to hear them.';
  const side=last.side==='west'?'West Lizeem':'East Lizeem';
  const allegiance=residentSide??{mayor:'west',temple:'east',portunus:'east',njord:'east',manawydan:'west'}[id];
  return `I heard you chose ${side} at ${last.region}. `+(allegiance?(allegiance===last.side?'You stood with my people. I remember that, whichever banners are flying now.':'You chose against my people. I can speak with you, but I will not pretend that is easy.'):'That is part of your history now. What happens after the fighting matters too.');
}
export function bearAfterWar(state){
  if(!hasSettlement(state))return null;
  return 'You are back. I am glad of that. '+(latestPersonalBattle(state)?'I heard you went into the fighting. ':'I kept wondering how the fighting would end. ')+
    'They are calling it the Lizeemi League now. I am mostly glad the horse can carry you somewhere without a battle waiting at the other end. Keep the reins; the horse is still yours.';
}
