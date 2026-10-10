/** Infill on the dry banks: narrow townhouses, taller terraces and small homes
 * behind the main avenues. The bridge, quays and existing market stay clear. */
const homes=[];
const add=(u,v,width,depth,height)=>homes.push(Object.freeze({u,v,width,depth,height}));
for(const side of [-1,1]){
  for(const row of [-1,1]){
    for(const v of [row*35,row*66]){
      if(side===-1&&v===-66)continue; // Existing imperial records hall.
      add(side*114,v,7,16,16+(row+side+2)*1.4);
    }
    for(const [i,u] of [52,68,100,120].entries()){
      if(side===-1&&row===-1&&u>=100)continue; // Eaves behind the records hall.
      add(side*u,row*81,10,8,11+(i%3)*3.5);
    }
  }
  for(const u of [101,127])add(side*u,-19,12,10,12+(u===101?5:0));
}
add(-132,-67,10,13,17);
export const PYRA_INFILL_HOMES=Object.freeze(homes);
