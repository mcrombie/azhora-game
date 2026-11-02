import {profile,attack} from './trial-profile.js';

// A deliberately exceptional, optional master. His moves obey the same
// commitment, collision, dodge and recovery rules as every other combatant.
export const UGUTH_DUEL=profile({id:'uguth',name:'Uguth, Battle Wizard',attributes:{vitality:20,power:20,quickness:20,mobility:17},healthMultiplier:8,
  weapon:'greatsword',engage:2.3,guarding:true,defense:{type:'weapon',reduction:.9},armor:.7,labelHeight:3,
  staggerResistant:true,recoveryOpening:true,musicTier:3,
  lesson:'An optional duel with your master',description:'Mithril mail, a two-handed sword, and centuries of practice. Uguth is vastly stronger than the challenge opponents. He cannot be staggered; his sword parry and armor soften staff blows. This duel never blocks your mission.',
  instruction:'Expect very fast cuts and a guard-breaking overhead. Dodge the committed blade, counter briefly, and create space for Fireball. Defeat costs nothing; Esc returns to the refuge.',
  pattern:['master-cut','master-sweep','master-overhead'],attacks:{
    'master-cut':attack('Mithril cut',.12,.12,.035,.2,3,Math.PI*.28,23,0xc0e2f2,{style:'thrust',cue:'CUT / SIDESTEP',lungeDistance:.5,lungeDuration:.06}),
    'master-sweep':attack('Returning sweep',.14,.14,.035,.21,3.3,Math.PI*.7,26,0x94cfe8,{style:'sweep',cue:'SWEEP / BACK AWAY',active:.045}),
    'master-overhead':attack('Breaking stroke',.16,.14,.035,.23,3.2,Math.PI*.22,32,0xe3c46b,{style:'overhead',cue:'OVERHEAD / SIDESTEP',guardBreak:.65}),
  }});
