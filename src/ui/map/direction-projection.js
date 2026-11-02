// Normalized screen-space direction, including a target behind the camera.
// Pure UI math: sharing it must not pull a campaign or world into a quest card.
export function guidanceScreenPoint(clip,aspect){
  const front=clip.z<0,depth=Math.max(.001,Math.abs(clip.z));
  let x=clip.x/depth/aspect,y=-clip.y/depth;
  if(!front&&Math.abs(x)<.08)x=.35; // directly behind still gives a turn direction
  const edge=!front||Math.abs(x)>.78||Math.abs(y)>.6;
  if(edge){const divisor=Math.max(Math.abs(x)/.78,Math.abs(y)/.6,.001);x/=divisor;y/=divisor;}
  return {x,y,edge,angle:Math.atan2(y,x)};
}
