import {UGUTH_DUEL} from './uguth-duel.js';
import {EXPEDITION_TRIALS} from './expedition-trials.js';
import {TRIAL_ORDER,TRIAL_DIFFICULTY} from './trial-order.js';
import {combatUnit} from './combat-units.js';
// Authored one-on-one practice opponents. These do not change campaign guards.
import {profile,attack} from './trial-profile.js';
import {FRONTIER_TRIALS} from './frontier-trials.js';
import {ADVANCED_TRIALS} from './advanced-trials.js';
const TRIAL_ROSTER=Object.freeze([
  profile({id:'bramble-goblin',name:'Bramble goblin',attributes:{vitality:5,power:5,mobility:4.5},engage:1.65,guarding:false,labelHeight:2.25,
    lesson:'Find your opening',description:'A small woodland raider with a crooked stick. His attacks are slow and he cannot block your staff.',
    instruction:'Sidestep the stick, face the goblin, then strike. X attacks; direction + Space dodges.',
    pattern:Object.freeze(['poke']),attacks:Object.freeze({poke:attack('Stick jab',.62,.3,.1,1.1,2.05,Math.PI/6,20,0xe5bb72,{style:'thrust',cue:'STICK JAB / SIDESTEP'})})}),
  profile({id:'wolf',name:'Grey wolf',attributes:{vitality:7.5,power:8.5,mobility:8.5},engage:2.8,guarding:false,labelHeight:1.85,
    lesson:'Evade the pounce',description:'The wolf closes quickly, crouches, and lunges along a committed line. Dodge across its path and turn back to strike.',
    instruction:'Watch the crouch. Dodge sideways across the pounce, then turn and counter while the wolf recovers.',
    pattern:Object.freeze(['pounce']),attacks:Object.freeze({pounce:attack('Pounce',.42,.4,.14,.85,1.85,Math.PI/6,20,0xe5a467,{style:'thrust',cue:'POUNCE / SIDESTEP',lungeDistance:1.15,active:.06})})}),
  profile({id:'bandit',name:'Road bandit',attributes:{mobility:6.75},engage:1.9,guarding:true,weapon:'sword',defense:{type:'weapon',reduction:.55},armor:0,labelHeight:3.0,
    lesson:'Read the swordsman',description:'A swordsman with no shield. His sword parries soften frontal blows, but cannot stop them completely. He mixes quick cuts, broad sweeps, and a heavier overhead. Bait a miss or move around his defense.',
    instruction:'His sword guard reduces damage. Bait a miss or flank him to deal full damage. Sidestep cuts and overheads; back away from a sweep, then counter.',
    pattern:Object.freeze(['cut','wide-cut','heavy-cut']),attacks:Object.freeze({
      cut:attack('Quick cut',.36,.3,.09,.7,2.6,Math.PI/5,20,0xed9856,{style:'thrust',cue:'CUT / SIDESTEP'}),
      'wide-cut':attack('Wide sweep',.5,.4,.1,.9,2.9,Math.PI*.58,22,0xdd76ad,{style:'sweep',cue:'SWEEP / BACK AWAY',active:.16}),
      'heavy-cut':attack('Heavy overhead',.64,.36,.11,1.05,2.75,Math.PI/6,27,0xe8cc65,{style:'overhead',cue:'OVERHEAD / SIDESTEP',active:.04}),
    })}),
  {...combatUnit('militiaman'),lesson:'Get around the shield',description:'An ordinary recruit in cloth, with basic training and a wooden shield. A raised shield stops frontal staff blows completely. No helmet or mail.',instruction:'Bait a missed attack, then counter during recovery, or circle beyond the shield. Your chosen militia weapon changes its reach and timing.'},
  {...combatUnit('orc-raider'),lesson:'Respect the heavy axe',description:'A powerful raider in rough leather, carrying a heavy axe and wooden shield. Broad swings punish careless approaches; his raised shield stops frontal staff blows.',instruction:'Back away from the cleave; sidestep the chop. Counter during recovery or flank his shield.'},
  {...combatUnit('ambron-soldier'),lesson:'Face a professional',description:'A trained Ambroni soldier with a metal sword, shield, helmet and mail. Armor reduces damage even when you bypass the shield.',instruction:'Use controlled counters. Keep clear of the blade and get around the shield; repeated frontal strikes will be blocked.'},
  {...combatUnit('orc-warrior'),lesson:'Match an athletic warrior',description:'An athletic professional orc with fitted armor, shield and a longer blade. He closes quickly and covers a wider arc than the Ambron soldier.',instruction:'Watch your distance. Evade the committed attack before returning to strike.'},
  {...combatUnit('veteran-ambron-soldier'),lesson:'Challenge a decorated veteran',description:'The standard of Ambroni officers: disciplined sword work, strong armor and a gold sunburst honor badge.',instruction:'The veteran recovers faster. Take one clean counter and reset your position.'},
  {...combatUnit('veteran-orc-warrior'),lesson:'Defeat the veteran warrior',description:'A decorated orc professional with reinforced armor and an ivory-and-bronze honor crest. Stronger and quicker than the ordinary warrior.',instruction:'Use everything you have learned: distance, committed dodges, shield flanks, and measured counters.'},
  profile({id:'ogre-bruiser',name:'Ogre bruiser',attributes:{vitality:20,power:17,mobility:5.5},engage:3,guarding:false,weapon:'Heavy club',armor:.35,labelHeight:4.4,
    bodyRadius:.95,staggerResistant:true,recoveryOpening:true,closeAttack:'ogre-stomp',closeRange:2.55,
    lesson:'Fight a larger foe',description:'A towering bruiser with a heavy wooden club. He has no shield; his thick hide softens physical blows, and neither staff hits nor fireballs interrupt him. Long swings leave generous openings; lingering at his feet invites a stomp in every direction.',
    instruction:'Back away from the club sweep and the circular stomp; sidestep the overhead. Take one or two hits during recovery, then get clear. His attacks stay committed even when you hit him.',
    pattern:Object.freeze(['ogre-sweep','ogre-slam']),attacks:Object.freeze({
      'ogre-sweep':attack('Heavy club sweep',.85,.6,.18,1.6,4.2,Math.PI*.74,24,0xdd945e,{style:'sweep',cue:'CLUB SWEEP / BACK AWAY',active:.24}),
      'ogre-slam':attack('Club overhead',1.05,.55,.24,1.9,3.8,Math.PI/5,32,0xe8cc65,{style:'overhead',cue:'CLUB OVERHEAD / SIDESTEP',active:.08}),
      'ogre-stomp':attack('Ground stomp',.58,.34,.16,1.15,2.85,Math.PI,18,0xd57ca9,{style:'stomp',cue:'STOMP / GET CLEAR',active:.06}),
    })}),
  ...ADVANCED_TRIALS,
  ...FRONTIER_TRIALS,...EXPEDITION_TRIALS,
]);
export const COMBAT_TRIALS=Object.freeze(TRIAL_ORDER.map(id=>Object.freeze({...TRIAL_ROSTER.find(p=>p.id===id),difficulty:TRIAL_DIFFICULTY[id],musicTier:TRIAL_DIFFICULTY[id]<3?0:TRIAL_DIFFICULTY[id]<10?1:TRIAL_DIFFICULTY[id]<40?2:3})));
export const trialOpponent=id=>id==='uguth'?UGUTH_DUEL:COMBAT_TRIALS.find(round=>round.id===id)??null;

export function configuredTrial(index,weapon='sword'){const p=COMBAT_TRIALS[index];return p.id==='militiaman'?{...p,...combatUnit(p.id,weapon)}:p;}
