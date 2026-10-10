/** Ambroni ashlar, round arches and restrained roofs, shared by the capital's
 * civic buildings. These are scenery details; footprints remain in city layout. */
const PALE='#ded9c7', SHADE='#a5a898', SLATE='#5b646b', DARK='#303b3c';

export function capitalRoof(b,x,y,z,w,d,rise,tint=SLATE){
  b.frame(x,y,z,0,()=>{
    const a=[-w/2,0,-d/2],c=[w/2,0,-d/2],e=[w/2,0,d/2],f=[-w/2,0,d/2];
    const left=[-w*.2,rise,0],right=[w*.2,rise,0];
    b.sheet(tint,a,c,right,left);b.sheet(tint,e,f,left,right);
    b.triangle(tint,c,e,right);b.triangle(tint,c,right,e);
    b.triangle(tint,f,a,left);b.triangle(tint,f,left,a);
    b.beam(SHADE,left,right,.18,.18);
    // Straight, close eaves rather than broad swept roof tiers.
    b.box(SHADE,0,-.12,0,w,.24,d);
  });
}

export function stoneDrum(b,x,y,z,r,height,tint=PALE,sides=16,topRadius=r){
  for(let i=0;i<sides;i++){
    const a=i*Math.PI*2/sides,c=(i+1)*Math.PI*2/sides;
    b.sheet(tint,[x+Math.sin(a)*r,y,z+Math.cos(a)*r],[x+Math.sin(c)*r,y,z+Math.cos(c)*r],
      [x+Math.sin(c)*topRadius,y+height,z+Math.cos(c)*topRadius],[x+Math.sin(a)*topRadius,y+height,z+Math.cos(a)*topRadius]);
    b.triangle(tint,[x,y+height,z],[x+Math.sin(a)*topRadius,y+height,z+Math.cos(a)*topRadius],
      [x+Math.sin(c)*topRadius,y+height,z+Math.cos(c)*topRadius]);
  }
}

export function stoneDome(b,x,y,z,r,rise,tint=SLATE){
  stoneDrum(b,x,y-.25,z,r+.25,.4,PALE);
  const rings=6,sides=16;
  for(let ring=0;ring<rings;ring++){
    const lower=ring/rings*Math.PI/2,upper=(ring+1)/rings*Math.PI/2;
    const at=(angle,latitude)=>[x+Math.sin(angle)*r*Math.cos(latitude),y+Math.sin(latitude)*rise,z+Math.cos(angle)*r*Math.cos(latitude)];
    for(let i=0;i<sides;i++){
      const a=i*Math.PI*2/sides,c=(i+1)*Math.PI*2/sides;
      b.sheet(tint,at(a,lower),at(c,lower),at(c,upper),at(a,upper));
    }
  }
}

/** Decorative arched recess facing local +Z, with individual voussoirs. */
export function archedRecess(b,x,y,z,width,height,yaw=0,tint=PALE,fill=DARK){
  b.frame(x,y,z,yaw,()=>{
    const r=width/2,spring=height-r,trim=Math.min(.3,width*.14);
    // Facade details only need their outward faces. Thousands of windows stay
    // inexpensive, without boxes and back faces buried inside the masonry.
    b.quad(fill,[-r,0,.066],[r,0,.066],[r,spring,.066],[-r,spring,.066]);
    for(const side of [-1,1]){
      const left=side<0?-r-trim:r,right=left+trim;
      b.quad(tint,[left,-.08,.16],[right,-.08,.16],[right,spring,.16],[left,spring,.16]);
    }
    const segments=width<2?6:8;
    for(let i=0;i<segments;i++){
      const a=i*Math.PI/segments,c=(i+1)*Math.PI/segments;
      const at=(angle,radius,z)=>[Math.cos(angle)*radius,spring+Math.sin(angle)*radius,z];
      b.triangle(fill,[0,spring,.066],at(a,r,.066),at(c,r,.066));
      b.quad(tint,at(a+.015,r,.16),at(a+.015,r+trim,.16),at(c-.015,r+trim,.16),at(c-.015,r,.16));
    }
    b.box(tint,0,-.12,.13,width+trim*3,.24,.36);
  });
}

export function stoneBattlements(b,x,y,z,w,d,tint=PALE){
  b.frame(x,y,z,0,()=>{
    b.box(tint,0,-.2,0,w+.45,.4,d+.45);
    for(const side of [-1,1]){
      b.block(tint,0,0,side*d/2,w,.65,.6);
      b.block(tint,side*w/2,0,0,.6,.65,d);
      const nx=Math.max(2,Math.round(w/2.4)),nz=Math.max(2,Math.round(d/2.4));
      for(let i=0;i<=nx;i++)b.block(tint,-w/2+w*i/nx,.65,side*d/2,.95,1,.7);
      for(let i=1;i<nz;i++)b.block(tint,side*w/2,.65,-d/2+d*i/nz,.7,1,.95);
    }
  });
}
