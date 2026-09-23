import { VASTOS_NPCS, VASTOS_ENDINGS } from './vastos-civil-war.js';

/** Short conversations; the pact only becomes a proposal after its evidence is found. */
export function vastosConversation(npc,context) {
  if(!VASTOS_NPCS.some(person=>person.id===npc?.id))return false;
  const {quest,openDialogue,closeDialogue,act}=context;
  const who=npc.id.replace('vastos-','');
  if(quest.state().accepted&&!quest.state().outcome&&quest.allowed(`hear-${who}`))act(`hear-${who}`);
  const s=quest.state(),v=quest.view(),choices=[];
  const choice=(id,label)=>{if(quest.allowed(id))choices.push({id,label,action:()=>{closeDialogue();act(id);vastosConversation(npc,context);}});};
  let lines;
  if(who==='herder'){
    lines=s.outcome?[VASTOS_ENDINGS[s.outcome].detail,'There is food for you at our fire whenever you pass. We will remember who brought the cattle back.']:
      !s.accepted?['Three of our cattle have scattered. The hurdle has fallen into the watercourse, and the beasts went looking for a drink elsewhere.',
        'Then two sets of people arrived to count what was left. Tessa claims the route for the communities. Alden claims a levy for the Crown. Find the cattle and open the water first. Hungry beasts cannot wait for a king.']:
        ['A breeding cow feeds a household for years. A butchered one provisions an army for a day. I need whoever keeps this route to understand the difference.',v.detail];
    choice('accept-herd','I’ll find your cattle and open the water.');
    if(s.accepted){
      choice('choose-republican','Back Tessa: the communities will govern the route.');
      choice('choose-monarchist','Back Alden: bind the royal levy to a written limit.');
      choice('choose-mediation','The old covenant could bind both claims. Let me seek their terms.');
      choice('settle-camp','Record the settlement and share the camp’s meal.');
    }
  } else if(who==='republican'){
    lines=s.outcome?[s.outcome==='republican'?'The route is ours to keep open now. That means watchers and upkeep, not simply pulling down a royal board.':s.outcome==='mediation'?
      'Royal buyers under our watch, at a public price. I can live with a buyer. I would not live with another collector.':'I will not tear up the agreement the herders signed. I will be here to count what Alden takes.']:
      ['These families know when the river rises and where the herds must pass. A warrant from Ambron cannot teach that.',
        'Let the range communities keep their own count. We can watch this road. But if we turn away the levy, we lose its buyers too. That is a real cost, and Mera should hear it.'];
    if(s.chosenPath==='mediation')lines.push('I will accept escorted royal buyers if the price is public and nobody can seize a breeding beast. Our watchers must stand beside theirs.');
    choice('secure-republican-concession','Agree to paid royal buyers under a joint watch.');
  } else {
    lines=s.outcome?[s.outcome==='monarchist'?'The levy is bounded and the breeding herd reserved. I have signed the ceiling. Hold me to it.':s.outcome==='mediation'?
      'Purchases, not seizures. A public tally and a joint watch. It will take longer, but the road will feed both the herd and the men.':'I have withdrawn the levy and its contract. My men leave the water alone. The communities must arrange their own buyers.']:
      ['My men need food, and the lake-country buyers need a road they can trust. The Crown’s warrant provides both a patrol and a market.',
        'I can put a ceiling on the levy and spare the breeding herd. I cannot promise that government comes without a claim on the surplus.'];
    if(s.chosenPath==='mediation')lines.push('A fixed purchase instead of a seizure, if the herders keep the water open and publish the count. Their watchers beside mine. Those are terms I can sign.');
    choice('secure-monarchist-concession','Agree to capped purchases and the herders’ seasonal rights.');
  }
  choices.push({id:'leave-vastos',label:'Back to the road.',action:closeDialogue});
  openDialogue(npc,lines,null,'Back to the road',{choices});return true;
}

export function vastosSiteConversation(id,context) {
  const site=context.quest.siteView(id);if(!site)return false;
  const lines=id==='vastos-covenant'?[
    'The stone carries three herd marks under an older crown. Below them: “Water kept in common; passage owed in season. No levy shall take the breeding line.”',
    'The reverse gives a public purchase tally. Whoever used this route once bound the claim on cattle to the duty to keep water and passage open.',
  ]:[site.prompt+'.'];
  context.openDialogue({name:id==='vastos-covenant'?'The grazing covenant':'The Common Water',role:'Vastos'},lines,null,'Leave it for now',{
    choices:[{id:site.action,label:id==='vastos-covenant'?'Copy the terms into your journal.':site.prompt,action:()=>{context.closeDialogue();context.act(site.action);}},
      {id:'leave-vastos-site',label:'Leave it for now.',action:context.closeDialogue}],
  });return true;
}
