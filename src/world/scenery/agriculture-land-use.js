// A planting decision must reserve the whole infrastructure footprint, including
// door aprons. The same predicate clips soil, crop cards, hedges and livestock.
export function agricultureBuiltLand(layout,x,z,r=0){
  if(layout.buildings.some(b=>{
    const dx=Math.abs(x-b.x),dz=Math.abs(z-b.z);
    return (dx<=b.w/2+2+r&&dz<=b.d/2+2+r)||
      (dx<=2.5+r&&dz<=b.d/2+6+r);
  }))return true;
  if(layout.farms.some(f=>Math.abs(x-f.home[0])<=12+r&&Math.abs(z-f.home[1])<=12+r))return true;
  const square=layout.town?.market;
  return !!square&&Math.abs(x-square[0])<=square[2]/2+2+r&&Math.abs(z-square[1])<=square[3]/2+2+r;
}
