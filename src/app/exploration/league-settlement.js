// The winner stays west/east in the replay log: those are historical identities.
// The present-day country is a negotiated league, with Minora as its seat.
// This projection never rewrites armies, commands, neutral borders or old saves.
export const UNITED_LEAGUE='Lizeemi League';
export const hasSettlement=state=>['west','east'].includes(state?.winner);
export function presentFaction(faction,state){
  return hasSettlement(state)&&faction.id===state.winner?{...faction,name:UNITED_LEAGUE,short:UNITED_LEAGUE}: {...faction};
}
export function settledOwners(owners,winner){
  return ['west','east'].includes(winner)?Object.fromEntries(Object.keys(owners).map(id=>[id,winner])):{...owners};
}
export function councilPeaceWords(id,state){
  if(!hasSettlement(state))return null;
  const west=state.winner==='west';
  if(id==='mayor')return west
    ?'The western councils have prevailed. We are the Lizeemi League now, and Minora is its seat. I lead this council, but the eastern towns must have a country worth belonging to. Victory is a poor excuse for neglecting them.'
    :'My friends in Ovesos lost this war. The High Priest leads our council, and the Lizeemi League flies the eastern colors. I will serve this city, but do not ask me to celebrate the people we lost.';
  if(id==='temple')return !west
    ?'Our eastern allies have prevailed. I now lead the council of the Lizeemi League, here in Minora. Let the temples offer thanks, and then tend to the grieving on both banks. They belong to the same country now.'
    :'Nesdor mourns a defeat, and the Mayor leads this council. We belong to the Lizeemi League now. I will pray for its peace, though changing a banner cannot mend every wound this war has left.';
  return 'The Lizeemi League is united, with Minora as its seat. Its colors tell you who won; its people will tell you what that cost. The Chronoscope can show you the course of your campaign without changing it.';
}
export function residentPeaceWords(id,state){
  if(!hasSettlement(state))return null;
  const west=state.winner==='west';
  return {
    seshat:'One name on the new documents: the Lizeemi League. I am keeping the old records too. The missing people do not become less missing because the forms have changed.',
    satet:'The Lizeemi League can celebrate if it likes. I am glad the fighting is over. I want visitors asking for clean water again, not a place to wash blood from their hands.',
    portunus:west?'Caricas lost. People tell me the roads belong to the Lizeemi League now, as if that should make the losses easier to bear. I will trade with the western towns. That does not mean I have forgotten.':'Our eastern side won. I am glad Caricas has a voice in the Lizeemi League. Now let us get the carts moving and make this peace worth something.',
    njord:west?'The news was bitter in Nesdor. We are all the Lizeemi League now, they say. I will be grateful if that means the next cart brings food instead of wounded soldiers.':'Nesdor will be pleased that the eastern colors stayed. Me, I am pleased the war ended. The Lizeemi League still needs feeding; a victory does not load a cart.',
    manawydan:west?'The western councils won, and the Mayor leads in Minora. I am proud of that. But the Lizeemi League needs both banks trading again. I would rather meet my eastern neighbors at a stall than a battlefield.':'Nethereum backed the losing side. That hurts. Still, I would rather live with an eastern banner over the Lizeemi League than send another generation down that road.',
    hapi:'East, west, and now the Lizeemi League. The river carried the wounded from both. I am glad it is over. Perhaps we can spend a season repairing things instead of breaking them.'
  }[id]??null;
}
