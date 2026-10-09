// The startup menu lists the same exercises used by in-world developer tools.
// This module stays lightweight: choosing an exercise loads the 3D host later.
export const COMBAT_EXERCISES=Object.freeze([
  Object.freeze({id:'lesson',name:'Dodge and counter',opponents:'1 soldier',description:'Learn to sidestep a thrust, face your opponent, and counter while their guard is down.'}),
  Object.freeze({id:'advanced',name:'Thrust and sweep',opponents:'1 soldier',description:'Read both attacks: sidestep the narrow thrust and retreat from the broad sweep.'}),
  Object.freeze({id:'squad',name:'Interception practice',opponents:'Runner + 2 escorts',description:'Stop the runner while the escorts try to screen them. Practice positioning, targeting, and choosing your fights.'}),
  Object.freeze({id:'allied',name:'Allied assault',opponents:'You + 3 allies vs 4 enemies',description:'Fight beside a small allied squad. Break the enemy line to win; the last isolated enemy can retreat. Compare with solo from the result screen.'}),
  Object.freeze({id:'solo-assault',name:'Solo assault comparison',opponents:'You vs 4 enemies',description:'The same camp and four opponents, without allies. Compare the challenge before increasing battle size.'}),
]);

// Combat practice deliberately has no persistence capability or save slot.
export const COMBAT_TEST_STORE=Object.freeze({
  read:()=>({ok:true,data:null}),
  save:()=>({ok:false,reason:'Combat testing does not save progress. Choose an exercise to start again.'}),
});

export function createCombatTestingMenu({choose,back}){
  const menu=document.getElementById('combat-testing-menu'),list=document.getElementById('combat-exercises');
  for(const exercise of COMBAT_EXERCISES){
    const card=document.createElement('article'),heading=document.createElement('h2'),count=document.createElement('small'),description=document.createElement('p'),button=document.createElement('button');
    heading.textContent=exercise.name;count.textContent=exercise.opponents;description.textContent=exercise.description;
    button.textContent='Start '+exercise.name.toLowerCase();button.dataset.combatExercise=exercise.id;button.onclick=()=>choose(exercise.id);
    card.append(count,heading,description,button);list.append(card);
  }
  document.getElementById('combat-testing-back').onclick=back;
  document.addEventListener('keydown',event=>{if(!menu.hidden&&event.code==='Escape'&&!event.repeat){event.preventDefault();back();}});
  return {
    show(){document.getElementById('start-screen').hidden=true;menu.hidden=false;list.querySelector('button').focus();},
    hide(){menu.hidden=true;},
  };
}
