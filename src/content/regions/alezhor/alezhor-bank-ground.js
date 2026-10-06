/** The inherited forest channel stays flat past its water ribbon. At the gold
 * outlet that leaves a metre-high sheet above a dry bank. Keep its water and
 * deep channel, but bring a narrow earth/rock bank up to the actual ribbon edge.
 * This affects only the last 40 m of that forest river and Alezhor's gorge above
 * the gravel ford. Other Ibenwood rivers and the west stream remain unchanged. */
import { goldReach, GOLD_REACH_SPEC } from './alezhor-world.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

export function createAlezhorBankGround(forest) {
  const profile=forest.profiles.find(p=>p.course.id==='ibenwood-central-south-river');
  const end=profile.samples.at(-1).along,gold=goldReach();
  const rows=[...profile.samples.filter(p=>p.along>=end-43).map(p=>({...p,along:p.along-end})),...gold.samples.slice(1).filter(p=>p.along<40)];
  const edges=[-1,1].map(side=>rows.map(p=>({x:Math.fround(p.x+p.nx*p.half*side),z:Math.fround(p.z+p.nz*p.half*side),
    y:Math.fround(p.surface),along:p.along,nx:p.nx*side,nz:p.nz*side})));
  const bounds={minX:Math.min(...edges.flat().map(p=>p.x))-13,maxX:Math.max(...edges.flat().map(p=>p.x))+13,
    minZ:Math.min(...edges.flat().map(p=>p.z))-13,maxZ:Math.max(...edges.flat().map(p=>p.z))+13};
  function ground(x,z,base) {
    if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return base;
    let result=base;
    for(const edge of edges){
      let nearest=null,distance=Infinity;
      for(let i=1;i<edge.length;i++){
        const a=edge[i-1],b=edge[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;
        const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/l2,0,1),px=a.x+dx*t,pz=a.z+dz*t,d=Math.hypot(x-px,z-pz);
        if(d>=distance)continue;
        distance=d;const nx=a.nx+(b.nx-a.nx)*t,nz=a.nz+(b.nz-a.nz)*t;
        nearest={along:a.along+(b.along-a.along)*t,y:a.y+(b.y-a.y)*t,out:(x-px)*nx+(z-pz)*nz};
      }
      if(!nearest||nearest.out < -4||distance>12)continue;
      const {along,y,out}=nearest,ends=smooth(-40,-30,along)*(1-smooth(35.5,GOLD_REACH_SPEC.ford.from,along));
      if(!ends)continue;
      // A low rounded lip covers interpolation across the existing <=2 m mesh.
      // Its inner grade is ordinary earth bank, with original deep bed retained.
      const bank=y+.35-Math.max(0,-out)*.7+Math.max(0,out)*.035;
      // Carry the bank gently upward until it meets the original outer ground;
      // an early fade to the old deep bowl would leave a dry trench behind it.
      const weight=ends*(1-smooth(8,12,Math.max(0,out)));
      result=Math.max(result,base+(bank-base)*weight);
    }
    return result;
  }
  return Object.freeze({ground,bounds,edges});
}
