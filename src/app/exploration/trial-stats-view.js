import {COMBAT_ATTRIBUTES,COMBAT_ATTRIBUTE_INFO,combatAttributes,playerCombatStats} from '../../gameplay/combat/combat-stats.js';

export const selectedTrialAttributes=()=>combatAttributes(Object.fromEntries(COMBAT_ATTRIBUTE_INFO.map(({id})=>[id,document.getElementById('trial-stat-'+id)?.valueAsNumber??10])));

export function createTrialStatsControls(startButton){
  const panel=document.createElement('details');panel.className='trial-stats';panel.id='trial-stat-controls';
  const summary=document.createElement('summary');summary.textContent='Teresod’s practice stats';
  const note=document.createElement('p');note.textContent='10 is Teresod’s starting rating. Changes apply to this series of trials and carry through retries. They do not change your campaign character.';
  const fields=document.createElement('div');fields.className='trial-stat-fields';
  for(const stat of COMBAT_ATTRIBUTE_INFO){
    const label=document.createElement('label'),name=document.createElement('span'),input=document.createElement('input'),hint=document.createElement('small');
    name.textContent=stat.name;input.type='number';input.id='trial-stat-'+stat.id;input.min='1';input.max='20';input.step='.5';input.value=COMBAT_ATTRIBUTES[stat.id];
    hint.id=input.id+'-hint';hint.textContent=stat.description;input.setAttribute('aria-describedby',hint.id);label.append(name,input,hint);fields.append(label);
  }
  const preview=document.createElement('p');preview.id='trial-stat-preview';preview.setAttribute('aria-live','polite');
  const reset=document.createElement('button');reset.type='button';reset.textContent='Restore starting stats';reset.id='trial-stat-reset';
  const update=()=>{
    try{const s=playerCombatStats(selectedTrialAttributes());if([...fields.querySelectorAll('input')].some(input=>!input.validity.valid))throw Error('Use ratings from 1 to 20 in half-point steps.');
      preview.textContent=`${s.maxHp} health · ${s.damage} staff damage · ${s.moveSpeed.toFixed(1)} m/s · ${s.attackRate.toFixed(2)}× attack speed. Swing ${s.timing.swing.toFixed(2)}s; contact ${s.timing.contact.toFixed(2)}s; next attack ${s.timing.attackCooldown.toFixed(2)}s.`;
      startButton.disabled=false;preview.removeAttribute('data-error');
    }catch{preview.textContent='Use ratings from 1 to 20 in half-point steps.';preview.dataset.error='true';startButton.disabled=true;}
  };
  fields.addEventListener('input',update);
  reset.onclick=()=>{for(const {id} of COMBAT_ATTRIBUTE_INFO)fields.querySelector('#trial-stat-'+id).value=COMBAT_ATTRIBUTES[id];update();};
  panel.append(summary,note,fields,preview,reset);
  update();
  return panel;
}

export function trialStatsComparison(hero,opponent){
  const table=document.createElement('table');table.className='trial-stats-comparison';
  const caption=table.createCaption();caption.textContent='This round';
  const head=table.createTHead().insertRow();for(const label of ['Combat stats','Teresod',opponent.name]){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);}
  const h=hero.combat,g=opponent.combat,attack=Object.values(g.attacks)[0],body=table.createTBody();
  for(const [label,a,b] of [
    ...COMBAT_ATTRIBUTE_INFO.map(({id,name})=>[name,h.attributes[id],g.attributes[id]]),
    ['Equipment','Staff',opponent.weapon??opponent.name],['Defense','None',opponent.defense?.type??'None'],['Armor reduction','0%',Math.round((opponent.armor??0)*100)+'%'],['Health',h.maxHp,g.maxHp],['Opening damage',h.damage,attack.damage],
    [attack.projectile?'Contact / spell release':'First hit',h.timing.contact.toFixed(2)+'s',(attack.windup+attack.contact).toFixed(2)+'s'],
    ['Movement',h.moveSpeed.toFixed(1)+' m/s',g.moveSpeed.toFixed(1)+' m/s'],
  ]){const row=body.insertRow(),th=document.createElement('th');th.scope='row';th.textContent=label;row.append(th);for(const text of [a,b])row.insertCell().textContent=text;}
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Compare combat stats';
  const note=document.createElement('p');note.textContent='Enemy damage and first-hit time describe its opening attack. Quickness scales each move’s preparation, strike and recovery; the weapon or attack defines its baseline.';
  if(attack.projectile)note.textContent+=' Spell release time excludes the bolt’s travel to its target.';
  details.append(summary,table,note);return details;
}
