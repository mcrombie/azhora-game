// Shared by collision, warning shapes, animation timing and demonstration input.
export const ENCOUNTER_ATTACKS=Object.freeze({
  thrust:Object.freeze({name:'Thrust',windup:.7,strike:.3,contact:.12,active:0,recovery:.85,reach:3,halfAngle:Math.PI/7,color:0xed9856}),
  sweep:Object.freeze({name:'Sweep',windup:1,strike:.5,contact:.1,active:.28,recovery:1.05,reach:3.6,halfAngle:Math.PI*.62,color:0xdd76ad}),
});
export const encounterAttack=g=>ENCOUNTER_ATTACKS[g.attack]??ENCOUNTER_ATTACKS.thrust;
