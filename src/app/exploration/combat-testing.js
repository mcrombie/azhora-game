import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
import {MILITIA_WEAPONS} from '../../gameplay/combat/combat-units.js';
// The startup menu lists the same exercises used by in-world developer tools.
// This module stays lightweight: choosing an exercise loads the 3D host later.
import {createTrialStatsControls} from './trial-stats-view.js';
export {selectedTrialAttributes} from './trial-stats-view.js';
export const COMBAT_EXERCISES=Object.freeze([
  Object.freeze({id:'trials',name:'One-on-one trials',opponents:`${COMBAT_TRIALS.length} rounds / One opponent at a time`,description:`Enter the Stillroom, the Spirit and Time chamber in the Wizard\'s Tower. ${COMBAT_TRIALS.length} opponents ordered by measured combat difficulty, from goblins and wildlife to trained soldiers, constructs and undead. Choose your starting opponent, then continue up the ladder. Full health and mana each round; retry anytime.`}),
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

export const selectedCombatTempo=()=>document.getElementById('combat-tempo')?.value==='classic'?'classic':'matched';

export function createCombatTestingMenu({choose,back}){
  const menu=document.getElementById('combat-testing-menu'),list=document.getElementById('combat-exercises');
  document.getElementById('combat-tempo').onchange=()=>{
    document.getElementById('combat-tempo-note').textContent=selectedCombatTempo()==='matched'
      ?'Soldiers and allies swing as quickly as Teresod. Warnings are brief, with a short recovery opening to counter. Start with one soldier.'
      :'The previous, slower windups and longer counter openings. Use this to compare the same exercise.';
  };
  for(const exercise of COMBAT_EXERCISES){
    const card=document.createElement('article'),heading=document.createElement('h2'),count=document.createElement('small'),description=document.createElement('p'),button=document.createElement('button');
    heading.textContent=exercise.name;count.textContent=exercise.opponents;description.textContent=exercise.description;
    button.textContent='Start '+exercise.name.toLowerCase();button.dataset.combatExercise=exercise.id;button.onclick=()=>choose(exercise.id);
    card.append(count,heading,description);if(exercise.id==='trials')card.append(createTrialStatsControls(button));
    if(exercise.id==='trials'){
      const opponentLabel=document.createElement('label');opponentLabel.textContent='Start with ';
      const opponents=document.createElement('select');opponents.id='trial-start-opponent';
      COMBAT_TRIALS.forEach((trial,i)=>{const option=document.createElement('option');option.value=trial.id;option.textContent=`${i+1}. ${trial.name}`;opponents.append(option);});
      opponentLabel.append(opponents);card.append(opponentLabel);
      const label=document.createElement('label');label.textContent='Militiaman weapon ';
      const select=document.createElement('select');select.id='trial-militia-weapon';
      for(const weapon of MILITIA_WEAPONS){const option=document.createElement('option');option.value=weapon;option.textContent=weapon[0].toUpperCase()+weapon.slice(1)+' and shield';select.append(option);}
      label.append(select);card.append(label);
    }
    card.append(button);(exercise.id==='trials'?document.getElementById('combat-trial-exercises'):list).append(card);
  }
  document.getElementById('combat-testing-back').onclick=back;
  document.addEventListener('keydown',event=>{if(!menu.hidden&&event.code==='Escape'&&!event.repeat){event.preventDefault();back();}});
  return {
    show(){document.getElementById('start-screen').hidden=true;menu.hidden=false;document.querySelector('[data-combat-exercise="trials"]').focus();},
    hide(){menu.hidden=true;},
  };
}

export const selectedTrialRound=()=>Math.max(0,COMBAT_TRIALS.findIndex(t=>t.id===document.getElementById('trial-start-opponent')?.value));
export const selectedMilitiaWeapon=()=>document.getElementById('trial-militia-weapon')?.value??'sword';
