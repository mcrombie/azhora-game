export const NESDOR_DEMO_STEPS=[
  {day:2,title:'Normal trade',region:'nesdor',view:'map',text:'Nesdor feeds itself narrowly. Caricas and Nethereum also supply neutral Minora. Armies and recruitment are held for this temporary supply exercise.'},
  {day:2,title:'Production disrupted',region:'nesdor',view:'fields',action:{type:'production',region:'nesdor',condition:.25},text:'The test sets Nesdor production condition to 25%. Fields fade and crop cover falls. Buildings and housing capacity remain standing; stored food initially protects meals.'},
  {day:3,title:'Relief changes trade',region:'caricas',view:'map',text:'Caricas sends relief to Nesdor before trading with Minora. Read the recorded deliveries here; Nethereum can initially cover part of the lost trade.'},
  {day:32,title:'Reserves run out',region:'nesdor',view:'map',text:'Relief cannot cover the whole deficit. Civilian rations fall, unrest reduces output, and garrison readiness declines. These consequences took weeks, not a single bad day.'},
  {day:32,title:'Production restored',region:'nesdor',view:'fields',action:{type:'production',region:'nesdor',condition:1},text:'The test restores production condition. Fields improve immediately, but remaining unrest keeps output below normal. Restoring farms does not instantly refill stores or heal readiness.'},
  {day:33,title:'Meals return first',region:'nesdor',view:'map',text:'Full rations return with relief. Stability and military readiness still need time to recover. Caricas continues helping rebuild Nesdor’s reserve.'},
  {day:52,title:'Trade resumes',region:'isareos',view:'map',text:'Nesdor is productive again and relief has ended. Caricas resumes supplying Minora; Minora’s reserve is growing but has not returned to its starting level. Return to your game whenever you are ready.'},
];

// Drives the existing host one authoritative day at a time. No simulation or
// alternate food allocator is hidden in the demonstration player.
export function createFoodDemoPlayer({day,advance,action,present}){
  let index=0,arrived=false,held=0,phase=0,paused=false,complete=false;
  function arrive(){const s=NESDOR_DEMO_STEPS[index];if(s.action){const result=action(s.action);if(!result.ok)throw Error(result.reason);}arrived=true;held=0;present(s,index);}
  function next(){
    if(complete)return;
    if(!arrived){while(day()<NESDOR_DEMO_STEPS[index].day){const before=day();advance();if(day()===before)throw Error('Food demonstration could not advance.');}arrive();return;}
    if(index===NESDOR_DEMO_STEPS.length-1){complete=true;paused=true;return;}
    index++;arrived=false;phase=0;
    if(day()>=NESDOR_DEMO_STEPS[index].day)arrive();
  }
  function tick(dt){
    if(paused||complete)return;
    if(arrived){held+=dt;if(held>=8)next();return;}
    phase+=dt*20;
    while(phase>=30&&day()<NESDOR_DEMO_STEPS[index].day){phase-=30;const before=day();advance();if(day()===before)throw Error('Food demonstration could not advance.');}
    if(day()>=NESDOR_DEMO_STEPS[index].day)arrive();
  }
  return {tick,next,toggle(){if(!complete)paused=!paused;},state:()=>({index,arrived,paused,complete,targetDay:NESDOR_DEMO_STEPS[index].day})};
}
