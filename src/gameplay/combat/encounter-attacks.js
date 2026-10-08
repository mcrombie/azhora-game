// Shared by collision, warning shapes, animation timing and demonstration input.
export const ENCOUNTER_ATTACKS=Object.freeze({
  thrust:Object.freeze({name:'Thrust',windup:.85,strike:.3,contact:.12,active:0,recovery:1.15,reach:3,halfAngle:Math.PI/7,color:0xed9856}),
  sweep:Object.freeze({name:'Sweep',windup:1.1,strike:.5,contact:.1,active:.28,recovery:1.35,reach:3.6,halfAngle:Math.PI*.62,color:0xdd76ad}),
});
export const encounterAttack=g=>ENCOUNTER_ATTACKS[g.attack]??ENCOUNTER_ATTACKS.thrust;
