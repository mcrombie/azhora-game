// Shared landscape corridors: army routing follows these existing dry reaches;
// new rural planting leaves room beside them for the visible marching column.
const points=values=>values.map(([x,z])=>Object.freeze({x,z}));
export const LIZEEM_COLUMN_ASSEMBLY=Object.freeze({isareos:{x:-2464,z:-28},nethereum:{x:-2650,z:289},caricas:{x:-2092,z:231},ovesos:{x:-1905,z:706},nesdor:{x:-1550,z:462}});
export const LIZEEM_ISA_WAY=Object.freeze(points([[-2490,-40],[-2670,112],[-2660,190]]));
export const LIZEEM_WESTERN_WAY=Object.freeze(points([[-2311,443],[-2281,607],[-2190,615],[-2066,614],[-2007,544],[-1962,541]]));
export const LIZEEM_EASTERN_WAY=Object.freeze(points([[-1950,270],[-1730,260],[-1615,334],[-1550,462],[-1455,565],[-1510,700]]));
