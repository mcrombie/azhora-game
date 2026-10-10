import {capitalRoof,stoneDrum,stoneDome,archedRecess,stoneBattlements} from './ambron-architecture.js';

// Interpretive civic landmarks, not reconstructions: Roman basilica massing,
// lake-city terraces, Mauryan column halls and fortified waterside storehouses.
// All construction stays on existing plots; the city's masonry unifies them.
const STONE='#cfceba', PALE='#e4dfc9', DARK='#939a8c', SLATE='#53666a';
const BLUE='#4f8085', BRONZE='#ac8950', RED='#805043', WOOD='#554336', LEAF='#527453';
const IDS=new Set(['legate-seat','lake-temple','record-house','lake-granary','south-guild-hall','royal-bell-tower']);

export function lakeFrieze(b,x,y,z,width,yaw=0){
  b.frame(x,y,z,yaw,()=>{
    b.block(BLUE,0,0,0,width,.85,.13);
    for(const h of [-.05,.85])b.box(BRONZE,0,h,.08,width,.12,.12);
    const n=Math.max(2,Math.floor(width/1.8)),step=width/n;
    for(let i=0;i<n;i++){
      const x=-width/2+(i+.5)*step;
      b.beam(PALE,[x-step*.36,.23,.1],[x,.57,.1],.08);
      b.beam(PALE,[x,.57,.1],[x+step*.36,.23,.1],.08);
    }
  });
}

export function lakeSeal(b,x,y,z,r=1,yaw=0){
  b.frame(x,y,z,yaw,()=>{
    // The sun over three water lines is an invented Ambroni civic emblem.
    const n=12;
    for(let i=0;i<n;i++){
      const a=i*Math.PI*2/n,c=(i+1)*Math.PI*2/n;
      b.beam(BRONZE,[Math.cos(a)*r,Math.sin(a)*r,.08],[Math.cos(c)*r,Math.sin(c)*r,.08],.12);
      b.beam(BRONZE,[Math.cos(a)*r*.35,Math.sin(a)*r*.35,.09],[Math.cos(a)*r*.78,Math.sin(a)*r*.78,.09],.08);
    }
    for(let row=0;row<3;row++)b.beam(PALE,[-r*.85,-r-.3-row*.24,.08],[r*.85,-r-.3-row*.24,.08],.09);
  });
}

export function roofGarden(b,x,y,z,w,d){
  b.block(DARK,x,y,z,w,.6,d);
  b.box('#645d42',x,y+.62,z,w-.45,.08,d-.45);
  for(const side of [-1,1])b.block(PALE,x+side*(w/2-.13),y+.5,z,.26,.35,d);
  for(const end of [-1,1])b.block(PALE,x,y+.5,z+end*(d/2-.13),w,.35,.26);
  for(const side of [-1,1]){
    const tx=x+side*w*.25;
    b.cylinder(WOOD,tx,y+.65,z,.13,2.1);
    b.rock(LEAF,tx,y+2.65,z,1.1,1.25,1.1);
    b.rock('#6a854f',tx+.4,y+2.4,z+.35,.8,.85,.8);
  }
}

function column(b,x,y,z,height,r=.4,tint=RED){
  b.block(PALE,x,y,z,r*2.6,.4,r*2.6);
  stoneDrum(b,x,y+.4,z,r,height-.9,tint,8,r*.87);
  stoneDrum(b,x,y+height-.5,z,r*1.5,.22,BRONZE,8);
  b.box(PALE,x,y+height-.1,z,r*3.1,.3,r*3.1);
}
function pool(b,x,y,z,w,d){
  b.block(DARK,x,y,z,w,.55,d);
  b.box('#619395',x,y+.56,z,w-.65,.05,d-.65);
  for(const side of [-1,1])b.block(PALE,x+side*(w/2-.15),y+.5,z,.3,.3,d);
  for(const side of [-1,1])b.block(PALE,x,y+.5,z+side*(d/2-.15),w,.3,.3);
}
function skin(b,w,d,y,h){
  for(const side of [-1,1]){
    for(let x=-w/2+2.4;x<w/2-1;x+=4.3)archedRecess(b,x,y,side*(d/2+.05),1.65,h,side<0?Math.PI:0,PALE);
    for(let z=-d/2+2.4;z<d/2-1;z+=4.3)archedRecess(b,side*(w/2+.05),y,z,1.65,h,side*Math.PI/2,PALE);
  }
}
function door(b,e){
  const [sx,sz]={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]}[e.door]??[0,-1];
  // These recessed halls need a real entrance vestibule behind the door.
  // It fills the old plot's frontage rather than leaving a floating door panel.
  if(e.id==='record-house'||e.id==='lake-temple'){
    const depth=e.id==='record-house'?3.5:1.7;
    b.block(STONE,sx*(e.w/2-depth/2),1.1,sz*(e.d/2-depth/2),sx?depth:4.8,5,sz?depth:4.8);
    b.box(PALE,sx*(e.w/2-depth/2),6.1,sz*(e.d/2-depth/2),sx?depth+.2:5,.3,sz?depth+.2:5);
  }
  archedRecess(b,sx*(e.w/2+.08),1.1,sz*(e.d/2+.08),2.8,3.8,Math.atan2(sx,sz),PALE,WOOD);
}

function basilica(b,e){
  const {w,d,h}=e;
  b.block(STONE,0,1.1,0,w,h*.57,d);
  skin(b,w,d,2.2,5.7);
  b.box(PALE,0,h*.57+1.1,0,w+.4,.55,d+.4);
  // Raised nave, side aisles and a visible rhythm of clerestory windows.
  b.block(STONE,0,h*.57+1.35,0,w*.52,h*.43,d-2);
  for(const side of [-1,1]){
    capitalRoof(b,side*w*.385,h*.57+1.45,0,w*.22,d+.3,1.4,SLATE);
    for(let z=-d/2+3;z<d/2-2;z+=4.2)archedRecess(b,side*w*.26,h*.63+1,z,1.4,3.6,side*Math.PI/2,PALE);
    lakeFrieze(b,side*(w/2+.08),8.8,0,d-.8,side*Math.PI/2);
  }
  b.roof(SLATE,0,h+1.4,0,w*.57,d,3.6,0,PALE);
  for(const side of [-1,1]){
    lakeSeal(b,0,h+2.6,side*(d/2+.07),.85,side<0?Math.PI:0);
    for(const x of [-w*.23,w*.23])column(b,x,1.1,side*(d/2-.8),9,.48);
  }
}

function lakeSanctuary(b,e){
  const {w,d}=e;
  // Low, stepped lake terraces support twin domed sanctuaries. Their geometry
  // borrows the ceremonial rhythm of a lake capital, not a copied sacred site.
  for(let tier=0;tier<3;tier++){
    const halfW=w/2-tier,halfD=d/2-tier,y=1.1+tier*1.7;
    const slab=(x,z,width,depth)=>{
      b.block(tier===1?DARK:STONE,x,y,z,width,1.7,depth);
      b.box(PALE,x,y+1.7,z,width+.1,.23,depth+.1);
    };
    slab((halfW-2.5)/2,0,halfW+2.5,halfD*2);
    // Leave two actual openings in the terraces for the staircase flights.
    for(const [start,end] of [[-halfD,-8.55],[-5.45,5.45],[8.55,halfD]]){
      slab((-halfW-2.5)/2,(start+end)/2,halfW-2.5,end-start);
    }
  }
  for(const z of [-7,7]){
    b.block(STONE,2,6.2,z,9,6.1,8);
    archedRecess(b,-2.56,7,z,2.4,3.8,-Math.PI/2,PALE);
    lakeFrieze(b,-2.57,11.1,z,7.5,-Math.PI/2);
    stoneDrum(b,2,12.3,z,3.65,1.2,STONE);
    stoneDome(b,2,13.5,z,3.9,3.2,SLATE);
    b.cone(BRONZE,2,16.7,z,.28,1.2);
    for(let step=0;step<12;step++)b.block(PALE,-w/2+(step+.5)*.625,1.1,z,.64,(step+1)*5.1/12,3.1);
    for(const side of [-1,1])b.beam(BRONZE,[-w/2+.3,2,z+side*1.75],[-2.5,7,z+side*1.75],.12);
  }
  pool(b,2,6.2,0,7,3.2);
  lakeFrieze(b,w/2+.07,3.3,0,d-2,Math.PI/2);
}

function recordsHall(b,e){
  const {w,d,h}=e;
  // A clerestory reveals the roof height above a many-column porch.
  b.block(STONE,0,1.1,0,w-7,h-2,d-7);
  for(const side of [-1,1]){
    for(let z=-d/2+1.3;z<=d/2-1;z+=4.6)column(b,side*(w/2-1.25),1.1,z,h-2,.43);
    for(const x of [-w*.28,-2.9,2.9,w*.28])column(b,x,1.1,side*(d/2-1.25),h-2,.43);
    b.box(PALE,side*(w/2-1.25),h-.8,0,1.4,.7,d-.7);
    lakeFrieze(b,0,h-.6,side*(d/2-.2),w-.6,side<0?Math.PI:0);
  }
  capitalRoof(b,0,h+.35,0,w+.4,d+.4,3.2,SLATE);
  b.block(STONE,0,h+2.2,0,w*.48,2.2,d*.55);
  for(const side of [-1,1])for(const x of [-3,0,3])archedRecess(b,x,h+2.5,side*d*.275,1.1,1.5,side<0?Math.PI:0,PALE);
  capitalRoof(b,0,h+4.4,0,w*.5,d*.59,1.5,SLATE);
  lakeSeal(b,0,h+.4,d/2+.12,.65);
}

function granary(b,e){
  const {w,d,h}=e;
  // A defended provisioning house: massive pale piers, raised store floors,
  // vented drums and hoists, with the lake-city's blue stone identification band.
  b.block(STONE,0,1.1,0,w,h-2,d);
  for(const side of [-1,1]){
    for(const x of [-w/2+1,0,w/2-1])b.block(PALE,x,1.1,side*(d/2-.1),1,h-1,.5);
    lakeFrieze(b,0,h-1.3,side*(d/2+.05),w-.6,side<0?Math.PI:0);
    for(const x of [-7,0,7])archedRecess(b,x,3,side*(d/2+.1),2.7,4,side<0?Math.PI:0,PALE,WOOD);
    for(const x of [-6,6]){
      stoneDrum(b,x,h-.6,side*4,3.5,3.8,STONE);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        archedRecess(b,x+Math.sin(a)*3.45,h+.3,side*4+Math.cos(a)*3.45,.8,1.7,a,PALE);
      }
      stoneDome(b,x,h+3.2,side*4,3.7,2.5,SLATE);
    }
  }
  b.beam(WOOD,[-w/2+.8,2,-4],[-w/2+.8,h+1,-4],.3);
  b.beam(WOOD,[-w/2+.8,h,-4],[-w/2+.8,h,1],.25);
  b.beam(BRONZE,[-w/2+.8,h,1],[-w/2+.8,3.3,1],.05);
}

function courtyardHall(b,e){
  const {w,d,h}=e;
  b.block(STONE,0,1.1,0,w,5.5,d);skin(b,w,d,2,3);
  b.box(PALE,0,6.6,0,w+.3,.4,d+.3);
  // A planted roof court above the shops, ringed by covered merchant galleries.
  for(const side of [-1,1]){
    b.block(STONE,side*(w/2-2.1),6.8,0,4.2,h-5.8,d);
    for(let z=-d/2+2;z<d/2-1;z+=4.1){
      archedRecess(b,side*(w/2+.05),7.3,z,1.6,2.5,side*Math.PI/2,PALE);
      column(b,side*(w/2-4.6),6.8,z,3.8,.22,WOOD);
    }
    capitalRoof(b,side*(w/2-2.25),h+1,0,5.5,d+.3,1.7,SLATE);
    for(let x=-w/2+1.5;x<w/2;x+=3.2)column(b,x,6.8,side*(d/2-1),3.8,.22,WOOD);
    capitalRoof(b,0,10.6,side*(d/2-1),w-8,3,1.1,SLATE);
    lakeFrieze(b,0,5.6,side*(d/2+.05),w-.5,side<0?Math.PI:0);
    roofGarden(b,side*4.8,6.8,0,2.4,5.2);
  }
  pool(b,0,6.8,0,4.6,7);
}

function assemblyTower(b,e){
  const {w,d,h}=e;
  b.block(STONE,0,1.1,0,w,h-5,d);
  skin(b,w,d,3,3.8);
  for(const level of [7.5,13.5,h-4])b.box(PALE,0,level,0,w+.3,.4,d+.3);
  for(const side of [-1,1])for(const end of [-1,1])column(b,side*(w/2-.8),h-4,end*(d/2-.8),5,.34);
  b.box(PALE,0,h+1,0,w+.4,.4,d+.4);
  stoneDrum(b,0,h-1.4,0,1.5,1.1,BRONZE,12,.8);
  b.cylinder(WOOD,0,h-2.6,0,.09,3.2);
  stoneDome(b,0,h+1.3,0,w*.53,3.5,SLATE);
  lakeSeal(b,0,11.1,d/2+.1,1.5);
  for(const side of [-1,1])lakeFrieze(b,side*(w/2+.1),h-5.6,0,d-.5,side*Math.PI/2);
}

export function buildAmbronLandmark(b,entry){
  if(!IDS.has(entry.id))return false;
  b.block(DARK,0,-4,0,entry.w+.5,5.1,entry.d+.5);
  const build={'legate-seat':basilica,'lake-temple':lakeSanctuary,'record-house':recordsHall,
    'lake-granary':granary,'south-guild-hall':courtyardHall,'royal-bell-tower':assemblyTower}[entry.id];
  build(b,entry);door(b,entry);
  return true;
}
