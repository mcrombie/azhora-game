// A small capsule follows the saddled horse's body, not its reins or tail.
// Kept separate from terrain colliders so a ridden/called horse never collides
// with its own parked representation or rebuilds the world's collision index.
export const HORSE_BODY=Object.freeze({rear:-.55,front:.82,radius:.38,height:1.95});

export function stopAtHorse(previous,next,horse,personRadius=.34){
  if(Math.min(previous.y,next.y)>horse.y+HORSE_BODY.height||Math.max(previous.y,next.y)+1.7<horse.y)return null;
  const cos=Math.cos(horse.yaw),sin=Math.sin(horse.yaw);
  const px=previous.x-horse.x,pz=previous.z-horse.z,dx=next.x-previous.x,dz=next.z-previous.z;
  const x=px*cos-pz*sin,z=px*sin+pz*cos,vx=dx*cos-dz*sin,vz=dx*sin+dz*cos;
  const length=vx*vx+vz*vz,r=HORSE_BODY.radius+personRadius,{rear,front}=HORSE_BODY;
  if(length<1e-12)return null;
  const az=z-Math.max(rear,Math.min(front,z));
  // Mounted saves restore on foot at the saddle. Allow escape from an existing
  // overlap instead of trapping the player between several separate circles.
  if(x*x+az*az<r*r){return x*vx+az*vz< -1e-10?{x:previous.x,z:previous.z}:null;}
  let fraction=1;
  for(const end of [rear,front]){
    const ez=z-end,b=x*vx+ez*vz,c=x*x+ez*ez-r*r,discriminant=b*b-length*c;
    if(b>=0||discriminant<0)continue;
    const t=(-b-Math.sqrt(discriminant))/length;
    if(t>=0&&t<fraction)fraction=t;
  }
  if(Math.abs(vx)>1e-10){
    for(const side of [-r,r]){
      if(vx*side>=0)continue;
      const t=(side-x)/vx,hitZ=z+vz*t;
      if(t>=0&&t<fraction&&hitZ>=rear&&hitZ<=front)fraction=t;
    }
  }
  if(fraction>=1)return null;
  fraction=Math.max(0,fraction-.001/Math.sqrt(length));
  return {x:previous.x+dx*fraction,z:previous.z+dz*fraction};
}
