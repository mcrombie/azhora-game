import {westGroundAt,westWaterSurface} from '../western-regions/west-ground.js';

// A graded market terrace joins the building pads with walkable streets.
// Feather into the hills and preserve the riverbed and crossing approaches.
export function caricasTownGround(x,z,height=westGroundAt(x,z)){
  const edge=Math.max(Math.abs(x+2098)-49,Math.abs(z-275)-54);
  if(edge>=24||westWaterSurface(x,z)!==null)return height;
  const t=Math.max(0,edge/24),blend=t*t*(3-2*t);
  const terrace=18.2+(x+2098)*.012+(z-275)*.008;
  return terrace+(height-terrace)*blend;
}
