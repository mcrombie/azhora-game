/** The old Black Fortress, on the cape's northern headland. +Z is inland/south. */
export const THALMAGAR_FORTRESS = Object.freeze({
  x: -3100, z: -2600, floor: 38, yaw: 0, region: 'Cape Thalmagar',
  gate: Object.freeze({ x: -3100, z: -2535 }),
  arrival: Object.freeze({ x: -3100, z: -2440 }),
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
  description:'The dark castle crowns the northern tip of Cape Thalmagar. Its needle towers rise above the sea, while the great gate faces south, down the open approach toward the mainland.',
});
