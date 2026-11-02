import {profile,attack} from './trial-profile.js';

// Stillroom apparitions. Their abilities are encounter-local, never world spawns.
export const FRONTIER_TRIALS=Object.freeze([
  profile({id:'goblin-slinger',name:'Goblin slinger',attributes:{vitality:6,power:7,mobility:5},mechanic:'slinger',engage:8,guarding:false,weapon:'Leather sling',armor:0,labelHeight:2.25,
    closeAttack:'slinger-jab',closeRange:2.1,lesson:'Advance between shots',
    description:'A wiry goblin with a sling and an enormous ammunition pouch. He retreats a short distance before winding up a shot, but cannot outrun you forever.',
    instruction:'Move sideways as the sling turns, then close between stones. His stick is much less dangerous than his sling. F can soften a frontal stone.',
    pattern:['sling-stone'],attacks:{
      'sling-stone':attack('Sling stone',.9,.36,.15,1.6,12,.055,19,0xd6bc81,{style:'cast',projectile:{speed:8,radius:.18,range:14,kind:'stone'},cue:'SLING / MOVE SIDEWAYS'}),
      'slinger-jab':attack('Panicked jab',.65,.3,.1,1.25,2.3,Math.PI/6,12,0xe5bb72,{style:'thrust',cue:'STICK / SIDESTEP'}),
    }}),
  profile({id:'cref-axeman',name:'Cref axeman',attributes:{vitality:12,power:11,mobility:6.5},engage:2.15,guarding:true,weapon:'Long-handled axe',defense:{type:'weapon',reduction:.35},armor:.08,labelHeight:3.15,
    lesson:'Recognize a guard-breaking hook',description:'A northern fighter in layered wool and leather. Ordinary cuts can be blocked. His slower axe hook pulls a raised staff aside and briefly prevents another block.',
    instruction:'Dodge the hooked axe. Holding F through it leaves your guard broken for a moment. Answer his long recovery with a staff strike or Fireball.',
    pattern:['cref-cut','cref-hook'],attacks:{
      'cref-cut':attack('Long axe cut',.56,.38,.12,1.05,3.05,Math.PI*.4,23,0xdd985a,{style:'sweep',active:.12,cue:'AXE CUT / BACK AWAY'}),
      'cref-hook':attack('Guard hook',.82,.42,.18,1.5,3.15,Math.PI/5,17,0xf2b55c,{style:'overhead',guardBreak:1.25,cue:'HOOK / DODGE, DO NOT BLOCK'}),
    }}),
  profile({id:'centaur-lancer',name:'Centaur lancer',attributes:{vitality:15,power:11,mobility:10},mechanic:'centaur',engage:6,guarding:false,weapon:'Long cavalry lance',armor:.12,labelHeight:3.6,bodyRadius:.85,staggerResistant:true,recoveryOpening:true,
    closeAttack:'centaur-kick',closeRange:2.6,lesson:'Step across the charge',description:'A lightly armored plains warrior who lowers his lance before a straight charging pass. He needs time to turn and regain distance. Crowding his hindquarters invites a kick.',
    instruction:'Sidestep the lowered lance, then close while he slows. A raised pair of hind legs warns of a backward kick. Staff and Fireball both work during recovery.',
    pattern:['centaur-charge'],attacks:{
      'centaur-charge':attack('Lance charge',1.05,.78,.05,1.85,2.7,Math.PI/9,28,0xe5bc73,{style:'thrust',lungeDistance:5.5,lungeDuration:.55,active:.5,cue:'LANCE LOWERED / SIDESTEP'}),
      'centaur-kick':attack('Hind kick',.67,.4,.16,1.3,2.8,Math.PI*.3,20,0xd6a873,{style:'kick',headingOffset:Math.PI,push:1.4,cue:'HIND KICK / STEP ASIDE'}),
    }}),
  profile({id:'satyr-thornrunner',name:'Satyr thornrunner',attributes:{vitality:11,power:10,mobility:9,quickness:11},engage:3.4,guarding:false,weapon:'Thorn spear',armor:.04,labelHeight:3.15,sidestep:2.8,staggerResistant:true,
    lesson:'Wait for the commitment',description:'An agile woodland spear-fighter. A harmless spear feint leads into a committed leaping thrust. His recovery is the safe moment to close.',
    instruction:'Do not spend your dodge on the feint. Watch the crouch that follows, sidestep the leap, and strike after he lands.',
    pattern:['satyr-feint'],attacks:{
      'satyr-feint':attack('Spear feint',.44,.27,.1,.1,3,Math.PI/6,1,0x9dc99b,{style:'feint',noContact:true,chain:'satyr-leap',cue:'FEINT / WATCH THE SPEAR'}),
      'satyr-leap':attack('Leaping thrust',.65,.46,.18,1.5,2.8,Math.PI/7,25,0xe7b866,{style:'thrust',lungeDistance:1.8,cue:'LEAP / SIDESTEP'}),
    }}),
  profile({id:'web-spider',name:'Giant web spider',attributes:{vitality:13,power:10,mobility:7.5},mechanic:'spider',engage:3.6,guarding:false,weapon:'Fangs and web silk',armor:.06,labelHeight:2.1,bodyRadius:.85,staggerResistant:true,recoveryOpening:true,
    lesson:'Keep an escape route',description:'A broad-bodied spider that spits a visible patch of silk before lunging. Silk slows ordinary movement, but does not disable your dodge. Only three patches can remain at once.',
    instruction:'Leave the pale circle before the silk lands. Strike a web to clear it, or burn it with Q. Evade the raised forelegs and counter the pounce.',
    pattern:['spider-web','spider-bite'],attacks:{
      'spider-web':attack('Web spit',.9,.4,.18,1.25,5,.2,1,0xb7d4d3,{style:'cast',noContact:true,web:true,cue:'WEB / LEAVE THE PALE CIRCLE'}),
      'spider-bite':attack('Fang lunge',.64,.42,.16,1.45,2.65,Math.PI/5,24,0xe4ae68,{style:'thrust',lungeDistance:1.6,cue:'FANGS / SIDESTEP'}),
    }}),
  profile({id:'guild-golem',name:'Guild training golem',attributes:{vitality:16,power:12,mobility:5},mechanic:'golem',engage:2.7,guarding:false,weapon:'Articulated stone fists',armor:.12,labelHeight:4,bodyRadius:.9,staggerResistant:true,recoveryOpening:true,
    lesson:'Wait for the plates to open',description:'Hadrin’s brass-and-stone practice construct. Closed plates absorb most damage. After a heavy strike, its chest opens to vent heat and exposes the light within.',
    instruction:'Avoid the fist or sweeping arm. Attack the bright exposed core during recovery; staff and Fireball both work. Closed armor reduces both kinds of damage.',
    pattern:['golem-fall','golem-sweep'],attacks:{
      'golem-fall':attack('Piston fist',.95,.48,.2,1.9,3.5,Math.PI/6,27,0xe5bd71,{style:'overhead',cue:'PISTON FIST / SIDESTEP'}),
      'golem-sweep':attack('Stone arm sweep',.85,.5,.16,1.8,3.75,Math.PI*.64,23,0xd6a3cb,{style:'sweep',active:.18,cue:'STONE ARM / BACK AWAY'}),
    }}),
  profile({id:'acor-wraith',name:'Acor wraith',attributes:{vitality:14,power:12,mobility:7},mechanic:'wraith',engage:2.4,guarding:false,weapon:'Spectral sickle',armor:.04,labelHeight:3.5,staggerResistant:true,recoveryOpening:true,
    lesson:'Strike the returning shape',description:'An undead High Goblin wearing the remnants of ancient finery. It drifts through mist, then gathers a solid body before striking. Both enchanted staff and Fireball can wound that body.',
    instruction:'Mist cannot be hurt. Watch it gather into a solid figure, evade the sickle, then counter before it dissolves again. No spell is required.',
    pattern:['wraith-sickle','wraith-reap'],attacks:{
      'wraith-sickle':attack('Condensed sickle',.85,.38,.14,1.45,3.1,Math.PI/5,25,0xa5d8cb,{style:'thrust',cue:'TAKING SHAPE / SIDESTEP'}),
      'wraith-reap':attack('Mist reaping',.95,.45,.14,1.5,3.35,Math.PI*.6,25,0xb0badd,{style:'sweep',active:.15,cue:'SOLID SWEEP / BACK AWAY'}),
    }}),
  profile({id:'dark-dwarf-runesmith',name:'Dark Dwarf runesmith',attributes:{vitality:15,power:12,mobility:6},mechanic:'runesmith',engage:2.1,guarding:false,weapon:'Rune hammer',armor:.22,labelHeight:2.7,bodyRadius:.62,staggerResistant:true,recoveryOpening:true,
    lesson:'Break the ward’s anchor',description:'An ancient dwarf supported by engraved metal braces. A runestone protects him while he remains within its circle. The stone is a separate target and never returns once broken.',
    instruction:'Release target lock with T, face the runestone, and strike twice or cast at it to break the ward. You can also lure the dwarf outside its circle. His body still has ordinary armor.',
    pattern:['runesmith-hammer','runesmith-sweep'],attacks:{
      'runesmith-hammer':attack('Runed hammer',.7,.38,.14,1.25,2.95,Math.PI/6,25,0xc5a4e1,{style:'overhead',cue:'RUNE HAMMER / SIDESTEP'}),
      'runesmith-sweep':attack('Brace-assisted sweep',.74,.42,.12,1.3,3.1,Math.PI*.55,23,0xd69bbf,{style:'sweep',active:.14,cue:'HAMMER SWEEP / BACK AWAY'}),
    }}),
  profile({id:'nanvir-adept',name:'Nanvir blood adept',attributes:{vitality:15,power:11,quickness:12,mobility:7},mechanic:'adept',engage:2.1,guarding:true,weapon:'Ceremonial blade',defense:{type:'weapon',reduction:.4},armor:.08,labelHeight:3.2,
    lesson:'Deny the consecrated ground',description:'A seemingly human priest-warrior who traces blood seals beneath his feet. His blade strikes harder while he stands within a completed seal. Inscribing another takes time and can be interrupted.',
    instruction:'Lure him beyond the red circle, or strike while he is drawing it. A completed seal fades by itself; it does not hurt you merely for stepping inside.',
    pattern:['adept-thrust','adept-sweep'],attacks:{
      'adept-thrust':attack('Ceremonial thrust',.46,.34,.12,1.05,2.9,Math.PI/6,22,0xd88c83,{style:'thrust',cue:'BLOOD BLADE / SIDESTEP'}),
      'adept-sweep':attack('Ritual cut',.6,.4,.12,1.15,3.05,Math.PI*.5,22,0xdd76ad,{style:'sweep',active:.12,cue:'RITUAL CUT / BACK AWAY'}),
    }}),
  profile({id:'eshtor-barrow-guardian',name:'Eshtor barrow guardian',attributes:{vitality:18,power:12,quickness:11,mobility:7},mechanic:'echo',engage:2.5,guarding:true,weapon:'Funerary polearm',defense:{type:'weapon',reduction:.4},armor:.24,labelHeight:3.4,staggerResistant:true,recoveryOpening:true,
    lesson:'Evade the blade and its memory',description:'A warrior from an ancient undead outbreak. Each polearm strike leaves a pale echo at the place it was swung. The echo repeats the attack after a short, visible delay; it never follows you.',
    instruction:'Clear the original strike and the pale echo before closing. The echo is fixed in place. Wait for it to fade, then use the remaining recovery to counter.',
    pattern:['barrow-thrust','barrow-sweep'],attacks:{
      'barrow-thrust':attack('Burial spear',.62,.4,.14,2.1,3.5,Math.PI/7,24,0xd2c5a8,{style:'thrust',echo:true,cue:'SPEAR / AN ECHO WILL FOLLOW'}),
      'barrow-sweep':attack('Remembered sweep',.78,.48,.14,2.15,3.65,Math.PI*.57,24,0xc7b8df,{style:'sweep',active:.16,echo:true,cue:'SWEEP / THEN ITS ECHO'}),
    }}),
]);
