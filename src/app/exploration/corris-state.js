// Conversation receipts belong to this scenario save, never the campaign engine.
export function validCorrisSave(s){return s===undefined||!!s&&s.version===1&&Number.isSafeInteger(s.heardThrough)&&s.heardThrough>=0&&typeof s.introduced==='boolean';}
export function createCorrisState(saved){
  if(!validCorrisSave(saved))throw Error('Invalid Corris conversation save.');
  let heardThrough=saved?.heardThrough??0,introduced=saved?.introduced??false;
  return {
    pending:reports=>reports.findLast(r=>r.id>heardThrough)??null,
    acknowledge(id){introduced=true;if(Number.isSafeInteger(id))heardThrough=Math.max(heardThrough,id);},
    snapshot:()=>({version:1,heardThrough,introduced}),
  };
}

export function corrisNext(opportunity){
  if(!opportunity||opportunity.kind==='briefing')return 'Speak with Taleth when you are ready to begin. I will find you after the fighting with his counsel.';
  if(opportunity.kind==='finale')return 'Taleth asks you to return to the Wizard Guild in Minora. Meet him at the lookout above his chamber.';
  if(opportunity.kind==='complete')return 'Our work in this war is done. Taleth can review it with you at the guild; the people of Minora will have their own thoughts.';
  if(opportunity.kind==='regroup')return 'The armies are regrouping. Explore while they prepare, or use the map to wait for the next report.';
  // Keep live directions separate from the dated message and its historical advice.
  const directions=opportunity.detail.replace(/^Continuing from your support for [^.]+\. /,'');
  return directions+(opportunity.alternative?' There is also another front; ask about Taleth’s reasoning before choosing.':'');
}

export const CORRIS_INTRO="Corris Weatherwise, in your tongue. A raven, and Master Taleth's envoy. He supplies the advice; I do the flying. After a battle, look for my black wings nearby. I can wait, or you can call me closer. Our earlier reports are on your map.";
