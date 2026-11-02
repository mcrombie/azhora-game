import {NYLON_SEA_LIONS as C} from './nylon-city.js';

const BRONZE='#997e50',LIGHT='#b29a68',SHADE='#806b48',PATINA='#657d69',DARK='#3d493e';
const MANE=['#786846','#88754c','#968052','#7c7250'],TAU=Math.PI*2;

/** Two seated, sea-facing bronze guardians on the original sea-tower plinths.
 * Built as one static mesh. Local +Z is the open sea, away from the city.
 * Broad seated haunches and upright forelegs carry the weight visibly. */
export function buildNylonSeaLions(b,push){
  for(const [figureIndex,figure] of C.figures.entries()){
    const male=figure.form==='lion',width=male?1:.92;
    function solid(id,minX,maxX,minY,maxY,minZ,maxZ){
      push({id:figure.id+'-'+id,kind:'monument',x:figure.x+(minX+maxX)/2,z:figure.z+(minZ+maxZ)/2,
        hx:(maxX-minX)/2,hz:(maxZ-minZ)/2,minY:C.baseY+minY,maxY:C.baseY+maxY});
    }
    function loft(id,rings,tints=[BRONZE],sides=14){
      const at=(r,i)=>[r[0]+Math.sin(i*TAU/sides)*r[3],r[1],r[2]+Math.cos(i*TAU/sides)*r[4]];
      for(let j=1;j<rings.length;j++){
        const a=rings[j-1],c=rings[j];
        for(let i=0;i<sides;i++)b.quad(tints[i%tints.length],at(a,i),at(a,i+1),at(c,i+1),at(c,i));
        if(id)solid(id+'-'+j,Math.min(a[0]-a[3],c[0]-c[3]),Math.max(a[0]+a[3],c[0]+c[3]),a[1],c[1],Math.min(a[2]-a[4],c[2]-c[4]),Math.max(a[2]+a[4],c[2]+c[4]));
      }
      const first=rings[0],last=rings.at(-1);
      for(let i=0;i<sides;i++){
        b.triangle(tints[0],first.slice(0,3),at(first,i+1),at(first,i));
        b.triangle(tints[0],last.slice(0,3),at(last,i),at(last,i+1));
      }
    }
    function oval(id,tint,x,y,z,rx,ry,rz,sides=14){
      const rings=[];
      for(let j=0;j<=7;j++){const a=-Math.PI/2+j*Math.PI/7,r=Math.max(.012,Math.cos(a));rings.push([x,y+Math.sin(a)*ry,z,rx*r,rz*r]);}
      loft(null,rings,[tint],sides);if(id)solid(id,x-rx,x+rx,y-ry,y+ry,z-rz,z+rz);
    }
    function tail(side){
      const path=[[-2.7,3.6,-4.1],[-4.1,2,-4.6],[-5.2,.8,-3.8],[-5.7,.55,-2.4],[-5.6,.55,-.8],[-4.9,.65,.8],[-4,1,1.4]]
        .map(([x,y,z])=>[x*side,y,z]);
      const rings=path.map((p,i)=>{
        const a=path[Math.max(0,i-1)],c=path[Math.min(path.length-1,i+1)],dx=c[0]-a[0],dz=c[2]-a[2],len=Math.hypot(dx,dz),r=.34-i*.012;
        return Array.from({length:8},(_,j)=>{const t=j*TAU/8;return [p[0]+Math.cos(t)*dz/len*r,p[1]+Math.sin(t)*r,p[2]-Math.cos(t)*dx/len*r];});
      });
      for(let i=1;i<rings.length;i++)for(let j=0;j<8;j++)b.quad(j<4?BRONZE:PATINA,rings[i-1][j],rings[i-1][(j+1)%8],rings[i][(j+1)%8],rings[i][j]);
      for(let i=1;i<path.length;i++){
        const a=path[i-1],c=path[i];solid('tail-'+i,Math.min(a[0],c[0])-.35,Math.max(a[0],c[0])+.35,Math.min(a[1],c[1])-.35,Math.max(a[1],c[1])+.35,Math.min(a[2],c[2])-.35,Math.max(a[2],c[2])+.35);
      }
      oval('tail-tuft',SHADE,...path.at(-1),.55,.48,.8,10);
    }
    b.frame(figure.x,C.baseY,figure.z,0,()=>{
      tail(figureIndex===0?1:-1);
      // Continuous back and barrel, leaning forward over the forelegs.
      loft('body',[[0,.05,-2.1,2.2*width,2.4],[0,2,-2,3*width,3.1],[0,5,-1.7,3.45*width,3.3],
        [0,8,-.8,3.6*width,2.9],[0,10.5,.2,3.75*width,2.8],[0,12.5,1,3.05*width,2.4],[0,14.9,1.7,2.35*width,2]],
        [BRONZE,BRONZE,LIGHT,BRONZE,SHADE,BRONZE,BRONZE]);
      for(const side of [-1,1]){
        // Folded rear legs, with the rump low on the stone and tucked hocks.
        oval('haunch-'+side,BRONZE,side*2.6*width,4.2,-2,2.35*width,4.15,3.25);
        oval('hock-'+side,SHADE,side*3.6*width,1.45,-.4,1.2,1.4,1.9);
        oval('hind-paw-'+side,BRONZE,side*3.7*width,.65,.9,1.15,.65,1.75);
        const x=side*1.95*width;
        loft('foreleg-'+side,[[x,1.1,3.3,1.04,1.2],[x,2.6,3.1,.94,1],[x,5.5,2.5,1,1.1],
          [x,7.7,1.9,1.25,1.35],[x*.97,10.4,1.25,1.45,1.6],[x*.85,12.1,1.05,1.2,1.3]],
          [BRONZE,LIGHT,BRONZE,BRONZE,SHADE,BRONZE]);
        // Broad flat-bottomed paws and rounded toes, without exposed claws.
        loft('paw-'+side,[[x,0,3.65,1.22,1.9],[x,.35,3.65,1.4,2],[x,1,3.45,1.35,1.85],[x,1.65,3.1,.9,1.25]]);
        for(let i=-1;i<=1;i++){
          oval(null,LIGHT,x+i*.78,.52,5.12,.42,.48,.63,10);
          if(i<1)b.beam(SHADE,[x+(i+.5)*.78,.45,5.7],[x+(i+.5)*.78,.95,4.72],.065);
        }
        oval(null,LIGHT,side*2.25*width,10.5,1.7,1,1.6,.9,10);
        b.beam(LIGHT,[x,2.1,4.03],[x,5.5,3.5],.1,.11);
      }
      loft('neck',[[0,11.6,1.1,2.65*width,2.3],[0,14.8,1.8,2.45*width,2.2],[0,17,2.4,2.15*width,2]]);
      if(male){
        // A connected layered mane narrows into a deep chest ruff.
        loft('mane',[[0,9.2,1.4,1.9,1.8],[0,12,1.2,3.1,2.8],[0,16,1.15,4.1,3.25],
          [0,19.6,1.5,3.65,2.95],[0,21.7,1.65,2.4,2.15],[0,22.2,1.7,.75,.8]],MANE,18);
        for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<5;i++){
          const a=.4+i*.44,x=side*Math.sin(a)*(3.5-row*.22),z=1.2+Math.cos(a)*(3.1-row*.15),y=19.8-row*3.1+(i%2)*.3;
          loft(null,[[x*.87,y-3.5,z-.05,.04,.06],[x,y-1.3,z,.52,.5],[x*.95,y+.55,z-.17,.38,.42]],[MANE[(i+row)%4]],7);
        }
      }
      // Broad skull, rounded ears, closed muzzle and a calm, level gaze.
      const hw=male?1:.94;
      oval('head',BRONZE,0,18,2.7,2.75*hw,2.65,2.55,18);
      oval('jaw',SHADE,0,15.95,4.5,1.75*hw,.85,1.85);
      // The nasal bridge slopes into the muzzle as one plane, not a separate bulb.
      b.quad(BRONZE,[-.55,18.85,4.9],[-.68,17.36,6.27],[.68,17.36,6.27],[.55,18.85,4.9]);
      for(const side of [-1,1]){
        oval(null,BRONZE,side*1.6*hw,17,4.18,1.06,1.3,1.4);
        oval(null,LIGHT,side*.8*hw,16.55,5.48,.97,.78,1.13);
        const earX=side*(male?2.65:2.15)*hw,earY=male?21:20.05;
        oval('ear-'+side,BRONZE,earX,earY,2.15,.75,.86,.63);
        oval(null,SHADE,earX,earY+.07,2.7,.43,.53,.11,12);
        const x=side*1.36*hw;
        b.sheet(DARK,[x-.48,18.12,4.91],[x,18.34,5.08],[x+.48,18.12,4.91],[x,17.99,5.09]);
        b.beam(LIGHT,[x-.5,18.22,4.98],[x,18.43,5.12],.15,.13);
        b.beam(LIGHT,[x,18.43,5.12],[x+.48,18.24,4.97],.15,.13);
        oval(null,'#ba9e62',x,18.17,5.105,.14,.11,.045,10);
        b.beam(SHADE,[side*.12,16.05,6.3],[side*.9,15.85,6.16],.065);
        b.beam(SHADE,[side*.9,15.85,6.16],[side*1.4,16,5.7],.065);
        for(const [dx,dy,dz] of [[.54,16.65,6.54],[.9,16.55,6.53],[.69,16.3,6.49]])
          oval(null,SHADE,side*dx,dy,dz,.055,.055,.035,7);
      }
      b.triangle(DARK,[-.68,17.36,6.27],[0,16.66,6.65],[.68,17.36,6.27]);
      b.triangle(SHADE,[-.68,17.36,6.27],[.68,17.36,6.27],[0,17.58,6.15]);
      b.beam(SHADE,[0,16.72,6.58],[0,16.05,6.31],.08);
      for(const side of [-1,1]){
        b.beam(PATINA,[side*.58,9.3,2.84],[side*.25,7.7,2.25],.11);
        b.beam(PATINA,[side*3.6,5.4,-4.36],[side*3.95,2.5,-3.95],.1);
      }
    });
  }
}
