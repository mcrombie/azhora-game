// Short, live objectives. Historical letters and strategic alternatives remain
// in the report; this presentation does not select a faction or change time.
export function campaignGuidance(next,{opening=null,owned=false,mounted=false,running=false,region=id=>id,winnerName=null,recoveringUntil=null}={}){
  if(!next||next.kind==='briefing')return {stage:'LIZEEMI WAR / BEGIN',title:'Speak with Taleth',detail:'The Wizard Guild Master is waiting inside the tower. Speak with him to begin.',action:null,clock:''};
  if(next.kind==='finale')return {stage:'LIZEEMI WAR / RETURN',title:'Return to Taleth',detail:`${winnerName?winnerName+' has won.':'The war is over.'} Meet Taleth at the Wizard Guild lookout in Minora to finish the campaign.`,action:'Return to Taleth',clock:''};
  if(next.kind==='complete')return {stage:'LIZEEMI WAR / COMPLETE',title:'A united Lizeemi League',detail:'Your campaign is complete. Explore, speak with the people, or revisit Taleth.',action:'Visit Taleth / optional',clock:''};
  const clock=running?'War time is running.':'War time is paused.';
  if(recoveringUntil)return {stage:'LIZEEMI WAR / RECOVER',title:'Recover before rejoining',detail:`You can fight again on day ${recoveringUntil}. Let time run while you travel or visit Minora.`,action:next.kind==='regroup'?'Wait for next dispatch':'Track front / resume time',clock};
  if(opening==='bear'&&!owned)return {stage:'LIZEEMI WAR / PREPARE',title:'Meet Bear at the stable',detail:'Bear has a horse ready outside the tower. Approach him and press F to talk.',action:null,clock};
  if(opening==='bear'&&owned&&!mounted)return {stage:'LIZEEMI WAR / SET OUT',title:'Your horse is ready',detail:'Approach your horse and press G to mount. You can also travel on foot.',action:next.label,clock};
  if(next.kind==='army')return {stage:'LIZEEMI WAR / FIND THE FRONT',title:`Follow the army toward ${region(next.region)}`,detail:`It is expected there on day ${next.deadline}. Choose your own route; you will choose a side at the battlefield.`,action:'Track army / resume time',clock};
  if(next.kind==='battle')return {stage:'LIZEEMI WAR / JOIN THE FIGHT',title:`${next.committed?'Finish the battle':'Reach the battlefield'} at ${region(next.region)}`,detail:next.committed?`Your earlier progress is kept. Enter the marked boundary to rejoin before day ${next.deadline}.`:`Walk or ride up to the marked boundary before day ${next.deadline}. There you can choose a side or stay out.`,action:'Track battlefield / resume time',clock};
  return {stage:'LIZEEMI WAR / BETWEEN BATTLES',title:'Await the next dispatch',detail:'The armies are regrouping. Wait for the next known front, or explore while time runs.',action:'Wait for next dispatch',clock:'Wait advances up to seven days.'};
}
