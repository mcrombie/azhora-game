// Short local sight lines only. Uses the existing collider index, never scene-wide raycasts.
export function localSight(world,a,b,height=1.5){
  const ay=a.y??world.heightAt(a.x,a.z)+height,by=b.y??world.heightAt(b.x,b.z)+height;
  const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z,by-ay)/.35);
  for(let i=1;i<steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=ay+(by-ay)*t;
    if(!world.readyAt(x,z)||y<world.heightAt(x,z)+.1)return false;
    if(world.nearColliders(x,z,.05).some(c=>{
      if(['river-water','pond-water'].includes(c.kind))return false;
      const bottom=c.minY??world.heightAt(c.x,c.z),top=c.maxY??bottom+2;
      return y>=bottom&&y<=top&&(c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+.05:Math.abs(x-c.x)<c.hx+.05&&Math.abs(z-c.z)<c.hz+.05);
    }))return false;
  }
  return true;
}
