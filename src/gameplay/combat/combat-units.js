import {combatStats,combatAttack} from './combat-stats.js';

export const MILITIA_WEAPONS=Object.freeze(['sword','spear','axe','mace']);
export const militiaWeapon=index=>MILITIA_WEAPONS[((index%4)+4)%4];
export const defaultHumanUnit=({faction='',officer=false}={})=>['ambron','ambroni','empire'].includes(faction.toLowerCase())?(officer?'veteran-ambron-soldier':'ambron-soldier'):'militiaman';
const move=(name,style,windup,recovery,reach,halfAngle,damage,extra={})=>Object.freeze({name,style,windup,strike:.34,contact:.11,active:0,recovery,reach,halfAngle,damage,color:style==='sweep'?0xdd76ad:style==='overhead'?0xe8cc65:0xed9856,cue:style==='sweep'?'SWEEP / BACK AWAY':'STRIKE / SIDESTEP',...extra});
export const UNIT_ATTACKS=Object.freeze({
  'sword-cut':move('Sword cut','thrust',.38,.78,2.6,Math.PI/5,20),
  'sword-sweep':move('Sword sweep','sweep',.5,.92,2.85,Math.PI*.55,22,{active:.14}),
  'sword-overhead':move('Sword overhead','overhead',.58,.95,2.8,Math.PI/5,24),
  'spear-jab':move('Spear thrust','thrust',.48,1.05,3.45,Math.PI/8,21),
  'axe-chop':move('Axe chop','overhead',.62,1.12,2.8,Math.PI/6,28),
  'mace-blow':move('Mace blow','overhead',.56,1.02,2.45,Math.PI/5,24,{armorPiercing:.65}),
  'raider-cleave':move('Raider cleave','sweep',.6,1.05,3.1,Math.PI*.6,26,{active:.16}),
  'raider-chop':move('Raider axe','overhead',.68,1.12,3,Math.PI/6,30),
  'orc-cut':move('Warrior cut','thrust',.35,.72,2.9,Math.PI/5,22),
  'orc-sweep':move('Warrior sweep','sweep',.48,.86,3.1,Math.PI*.55,24,{active:.14}),
});
const patterns={sword:['sword-cut','sword-sweep'],spear:['spear-jab'],axe:['axe-chop'],mace:['mace-blow']};
const definitions={
  militiaman:{name:'Militiaman',attributes:{vitality:10,power:10,mobility:6.25},weapon:'sword',defense:{type:'shield',reduction:1},armor:0,engage:1.9},
  'orc-raider':{name:'Orc Raider',attributes:{vitality:13,power:13,quickness:11,mobility:7.5},weapon:'axe',defense:{type:'shield',reduction:1},armor:.05,engage:2.15,pattern:['raider-cleave','raider-chop']},
  'ambron-soldier':{name:'Ambron Soldier',attributes:{vitality:13,power:11,quickness:11,mobility:7},weapon:'sword',defense:{type:'shield',reduction:1},armor:.15,engage:1.9},
  'orc-warrior':{name:'Orc Warrior',attributes:{vitality:14.5,power:12.5,quickness:12,mobility:8},weapon:'sword',defense:{type:'shield',reduction:1},armor:.18,engage:2.05,pattern:['orc-cut','orc-sweep']},
  'veteran-ambron-soldier':{name:'Veteran Ambron Soldier',attributes:{vitality:16,power:13,quickness:14,mobility:8},weapon:'sword',defense:{type:'shield',reduction:1},armor:.25,engage:1.9},
  'veteran-orc-warrior':{name:'Veteran Orc Warrior',attributes:{vitality:17.5,power:14,quickness:15,mobility:9},weapon:'sword',defense:{type:'shield',reduction:1},armor:.28,engage:2.05,pattern:['orc-cut','orc-sweep','orc-cut']},
};
export function combatUnit(id='militiaman',weapon){
  const data=definitions[id];if(!data)throw Error('Unknown combat unit: '+id);
  weapon=weapon??data.weapon;
  if(id==='militiaman'&&!MILITIA_WEAPONS.includes(weapon))throw Error('Unknown militia weapon: '+weapon);
  if(id!=='militiaman'&&weapon!==data.weapon)throw Error('This unit has authored equipment.');
  const pattern=data.pattern??patterns[weapon],attacks=Object.fromEntries(pattern.map(key=>[key,UNIT_ATTACKS[key]]));
  const stats=combatStats(data.attributes);
  return {...data,defense:{...data.defense},id,weapon,engage:weapon==='spear'?2.8:data.engage,attributes:stats.attributes,pattern:[...pattern],attacks,guarding:true,labelHeight:id.includes('orc')?3.35:3,
    hp:stats.maxHp,speed:stats.moveSpeed,combat:{...stats,attacks:Object.fromEntries(Object.entries(attacks).map(([key,a])=>[key,combatAttack(a,stats)]))}};
}
export function unitBody(id,weapon){
  const p=combatUnit(id,weapon);
  return {archetype:id,unitType:id,weapon:p.weapon,name:p.name,combat:p.combat,hp:p.hp,maxHp:p.hp,defense:p.defense,armor:p.armor,engage:p.engage,pattern:p.pattern,attack:p.pattern[0],guarding:true,labelHeight:p.labelHeight};
}

// The older adventure has a different combat engine. Adapt ordinary army
// defaults at its boundary, leaving authored creatures and special NPCs alone.
const legacyProfiles=new Map();
export function legacyHumanProfile(person){
  const role=person.model?.role??person.role;
  const id=role==='legion-officer'||person.kind==='officer'&&(!person.model||role==='legion-soldier')?'veteran-ambron-soldier':
    role==='legion-soldier'||person.kind==='legionary'&&!person.model||person.look==='legion'?'ambron-soldier':
    ['militiaman','soldier'].includes(role)||person.kind==='soldier'&&!person.model?'militiaman':null;
  if(!id)return null;
  if(legacyProfiles.has(id))return legacyProfiles.get(id);
  const unit=combatUnit(id),a=Object.values(unit.combat.attacks)[0];
  const profile=Object.freeze({unitType:id,hp:unit.hp,level:1,tell:a.windup,attack:a.strike,contact:a.contact,recovery:a.recovery,damage:a.damage,speed:unit.speed,engage:unit.engage,reach:a.reach,lunge:1.7,guard:1,armor:unit.armor,poise:true,pack:2});
  legacyProfiles.set(id,profile);return profile;
}

// A raised shield protects only the front. Weapon parries still admit damage;
// armor reduces connecting physical blows, with maces bypassing much of it.
export function physicalDamage(amount,target,{guarded=false,armorPiercing=0}={}){
  const reduction=guarded?(target.defense?.reduction??1):0;
  const afterGuard=amount*(1-reduction),armor=Math.max(0,Math.min(.8,target.armor??0))*(1-armorPiercing);
  const damage=afterGuard>0?Math.max(1,Math.round(afterGuard*(1-armor))):0;
  return {damage,blockedDamage:Math.round(amount-afterGuard),armorAbsorbed:Math.max(0,Math.round(afterGuard)-damage),defense:guarded?(target.defense?.type??'shield'):null};
}
