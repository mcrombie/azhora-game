// Smooth the rendered mount only; collision, travel speed and saved position
// continue to use the physical position without delay.
export function createMountedPresentation(){
  let current=null;
  return {
    reset(){current=null;},
    update({y,heading,speed},dt){
      if(!current)current={y,heading,speed};
      const blend=1-Math.exp(-12*Math.max(0,dt));
      current.y+= (y-current.y)*blend;
      current.y=Math.max(y-.25,Math.min(y+.35,current.y));
      current.heading+=Math.atan2(Math.sin(heading-current.heading),Math.cos(heading-current.heading))*blend;
      current.speed+=(speed-current.speed)*blend;
      return {...current};
    },
  };
}
