/** The old Black Fortress, on the cape's northern headland. +Z is inland/south. */
export const THALMAGAR_FORTRESS = Object.freeze({
  x: -3100, z: -2600, floor: 38, yaw: 0, region: 'Cape Thalmagar',
  gate: Object.freeze({ x: -3100, z: -2535 }),
  arrival: Object.freeze({ x: -3100, z: -2440 }),
});
/** Shared by the built curtain, collision and parchment footprint. */
export const THALMAGAR_CURTAIN_LOCAL = Object.freeze(Array.from({ length: 10 }, (_, i) => {
  const angle = (i + .5) / 10 * Math.PI * 2;
  return Object.freeze([Math.sin(angle) * 67, -174 + Math.cos(angle) * 58]);
}));
export const THALMAGAR_CURTAIN = Object.freeze(THALMAGAR_CURTAIN_LOCAL.map(([x, z]) => Object.freeze({
  x: THALMAGAR_FORTRESS.x + x, z: THALMAGAR_FORTRESS.z + z + 174,
})));
export const THALMAGAR_DARK_TOWER = Object.freeze({
  id: 'thalmagar-dark-tower', name: "Dark Wizard's Tower", ...THALMAGAR_FORTRESS,
  height: 154.5, radius: 24, galleryHeight: 84,
});
const smooth = (a,b,v) => { const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t); };
export function thalmagarFortressReserved(x,z,margin=0) {
  const dx=x-THALMAGAR_FORTRESS.x,dz=z-THALMAGAR_FORTRESS.z;
  return Math.hypot(dx/(84+margin),dz/(77+margin))<1
    || (dz>48-margin&&dz<177+margin&&Math.abs(dx)<12+margin);
}
export function thalmagarFortressGround(x,z,base,seaDistance) {
  const dx=x-THALMAGAR_FORTRESS.x,dz=z-THALMAGAR_FORTRESS.z;
  if(Math.abs(dx)>115||dz < -105||dz>200)return base;
  const terrace=1-smooth(1,1.3,Math.hypot(dx/83,dz/76));
  const road=dz>0?(1-smooth(80,190,dz))*(1-smooth(10,20,Math.abs(dx))):0;
  const weight=Math.max(terrace,road)*smooth(0,16,seaDistance);
  return base+(THALMAGAR_FORTRESS.floor-base)*weight;
}
export const THALMAGAR_FORTRESS_LANDMARK = Object.freeze({
  id:'thalmagar-black-fortress',name:'The Black Fortress',region:'Cape Thalmagar',
  ...THALMAGAR_FORTRESS.arrival,
  description:"Thalmagar's fortress crowns the northern headland. At its centre stands the Dark Wizard's Tower: stacked chambers and a high, open lookout beneath a black needle crown, a sinister counterpart to Minora's guild tower. The great gate faces south toward the mainland.",
});
