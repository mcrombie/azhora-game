import {profile,attack} from './trial-profile.js';

// Training apparitions only; these profiles do not replace world inhabitants.
export const ADVANCED_TRIALS=Object.freeze([
  profile({id:'elven-duelist',name:'Elven duelist',attributes:{vitality:14,power:11,quickness:12,mobility:9},engage:2.1,guarding:true,
    weapon:'Dueling sword',defense:{type:'weapon',reduction:.35},armor:.06,labelHeight:3.2,staggerResistant:true,sidestep:3,
    lesson:'Wait for the second blade',description:'A lightly armored elven swordsman. He links a thrust into a second cut, then steps aside. His combination stays committed when struck; the second cut leaves the real counter opening.',
    instruction:'Two strikes, then your turn. Sidestep the thrust, stay clear of the follow-up cut, and counter when the green opening appears. F softens a frontal hit.',
    pattern:['elf-first'],attacks:{
      'elf-first':attack('Opening thrust',.5,.3,.11,.2,2.9,Math.PI/7,18,0xdea66a,{style:'thrust',chain:'elf-second',cue:'FIRST / FOLLOW-UP COMING'}),
      'elf-second':attack('Returning cut',.48,.34,.11,1.25,3.05,Math.PI*.43,22,0xbca3e2,{style:'sweep',active:.1,cue:'SECOND CUT / THEN COUNTER'}),
    }}),
  profile({id:'dwarven-shieldwarden',name:'Dwarven shieldwarden',attributes:{vitality:18,power:13,quickness:10,mobility:5.5},engage:1.95,guarding:true,
    weapon:'War hammer and tower shield',defense:{type:'shield',reduction:1},armor:.42,labelHeight:2.6,bodyRadius:.62,turnRate:1.5,
    closeAttack:'warden-shove',closeRange:1.8,recoveryOpening:true,
    lesson:'Turn the shield',description:'A heavily armored dwarf with a broad shield and forged hammer. He turns slowly and shoves opponents who crowd him. The shield stops frontal staff blows; armor still softens hits from behind.',
    instruction:'Circle around his slow turn. Keep clear of the hammer and counter its recovery. A close shield shove pushes you back, even when you block.',
    pattern:['warden-hammer','warden-sweep'],attacks:{
      'warden-hammer':attack('Hammer fall',.72,.4,.15,1.25,2.85,Math.PI/6,25,0xe0bf73,{style:'overhead',cue:'HAMMER / SIDESTEP'}),
      'warden-sweep':attack('Hammer sweep',.68,.4,.12,1.3,2.95,Math.PI*.52,22,0xdd76ad,{style:'sweep',active:.12,cue:'HAMMER SWEEP / BACK AWAY'}),
      'warden-shove':attack('Shield shove',.5,.3,.12,.85,2.3,Math.PI*.32,11,0x7fbac9,{style:'shove',push:1.6,cue:'SHIELD SHOVE / STEP ASIDE'}),
    }}),
  profile({id:'rogue-battlemage',name:'Rogue battlemage',attributes:{vitality:15,power:12,quickness:10,mobility:6.5},engage:10,guarding:false,
    weapon:'Runed staff',armor:.1,labelHeight:3.2,closeAttack:'mage-staff',closeRange:2.2,
    lesson:'Close through the spellfire',description:'A wandering spellfighter who fires bright, straight-traveling bolts. Watch his staff gather light: the aim is committed before release. He must recover after casting and uses his staff if you crowd him.',
    instruction:'Move sideways to let the bolt pass, then close during recovery. F reduces frontal bolt damage. Q lets you answer at range; his staff remains dangerous up close.',
    pattern:['mage-bolt'],attacks:{
      'mage-bolt':attack('Arcane bolt',.9,.4,.16,2.1,16,.045,24,0x7be0ed,{style:'cast',projectile:{speed:6.5,radius:.3,range:18},cue:'BOLT / MOVE SIDEWAYS'}),
      'mage-staff':attack('Staff sweep',.58,.38,.12,1.2,2.75,Math.PI*.5,17,0xdd76ad,{style:'sweep',active:.1,cue:'STAFF SWEEP / STEP BACK'}),
    }}),
  profile({id:'regenerating-troll',name:'Troll',attributes:{vitality:20,power:15,quickness:10,mobility:6},engage:3.1,guarding:false,
    weapon:'Claws and crushing fists',armor:.18,labelHeight:4.6,bodyRadius:1.2,staggerResistant:true,recoveryOpening:true,regeneration:2,
    lesson:'Break the regeneration',description:'A long-armed, moss-skinned troll whose wounds gradually close. Fireball suppresses its healing for six seconds. Its sweeping claws and crushing fists stay committed when hit. Careful staff counters can also outpace the healing.',
    instruction:'Evade the claws, then counter. Q scorches the troll and stops regeneration for six seconds; use that window for staff attacks. Watch the healing and scorched indicators.',
    pattern:['troll-rake','troll-crush'],attacks:{
      'troll-rake':attack('Raking claws',.78,.5,.16,1.4,4.2,Math.PI*.65,23,0xdd8b81,{style:'sweep',active:.18,cue:'CLAWS / BACK AWAY'}),
      'troll-crush':attack('Crushing fist',.9,.46,.19,1.65,3.95,Math.PI/5,29,0xe8cc65,{style:'overhead',cue:'CRUSH / SIDESTEP'}),
    }}),
  profile({id:'undead-knight',name:'Undead knight',attributes:{vitality:19,power:13,quickness:12,mobility:7},engage:2.1,guarding:true,
    weapon:'Ancient sword',defense:{type:'weapon',reduction:.65},armor:.3,labelHeight:3.25,restoration:true,
    lesson:'Interrupt the binding',description:'An ancient swordsman held together by necromancy. When wounded, he periodically lowers his blade to restore his body. A staff hit or Fireball interrupts the ritual before it can heal him.',
    instruction:'Evade his sword and counter. When violet bindings rise and RESTORING appears, strike or cast Q before the ritual completes. Do not let him mend between exchanges.',
    pattern:['grave-thrust','grave-sweep'],attacks:{
      'grave-thrust':attack('Ancient thrust',.48,.34,.11,.95,3.1,Math.PI/7,23,0xaeb3dc,{style:'thrust',cue:'THRUST / SIDESTEP'}),
      'grave-sweep':attack('Grave sweep',.64,.43,.14,1.15,3.3,Math.PI*.57,25,0xc789d3,{style:'sweep',active:.16,cue:'GRAVE SWEEP / BACK AWAY'}),
    }}),
]);
