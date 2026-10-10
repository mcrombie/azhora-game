import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {AMBRON_FORTRESSES,AMBRON_HARBOURS,AMBRON_SHIPS,ambronHarbourDeck} from './ambron-capital.js';
import {AMBRON_PALACE,CITY_CANALS,AMBRON_CENTRE,ambronGroundLevel,cityCanalAt,cityCanalDeck} from './ambron-city-layout.js';

import {elagosWaterDistance} from './elagos-world.js';
import {lakeSeal,lakeFrieze,roofGarden} from './ambron-landmark-scenery.js';
import {ambronLantern} from './ambron-living-detail.js';
import {capitalRoof,stoneDrum,stoneDome,archedRecess,stoneBattlements} from './ambron-architecture.js';

const STONE='#c9c8b6',DARK_STONE='#92998e',CAP='#e1dcc8',TIMBER='#49362b',RED='#844438',GOLD='#c7a35d',WATER='#477a82';

function standard(b,x,y,z,height=7){
  b.cylinder(TIMBER,x,y,z,.1,height);b.cone(GOLD,x,y+height,z,.3,.6);
  b.sheet(RED,[x,y+height-1,z],[x+2.1,y+height-1.2,z],[x+2.1,y+height-3.5,z],[x,y+height-3.2,z]);
  b.cylinder(GOLD,x+1,y+height-2.7,z,.32,.1,0,7);
}
function sentry(b,x,y,z,yaw=0){
  b.frame(x,y,z,yaw,()=>{
    for(const dx of [-.17,.17])b.block('#373b35',dx,0,0,.22,.8,.27);
    b.block('#67716c',0,.7,0,.64,.66,.38);b.block(RED,0,.66,-.23,.7,.82,.06);
    b.cylinder('#b9a184',0,1.35,0,.21,.27);b.cone('#8f9c98',0,1.56,0,.27,.3);
    b.block(TIMBER,.42,.7,0,.15,.65,.15);b.block(TIMBER,-.42,.7,0,.15,.65,.15);
    b.cylinder(RED,-.43,.64,.25,.31,.12);b.block(GOLD,-.43,.8,.34,.4,.09,.04);
    b.cylinder(TIMBER,.5,0,.1,.035,2.7);b.cone('#bac1ae',.5,2.7,.1,.09,.35);
  });
}

function palace(b){
  const p=AMBRON_PALACE,y=ambronGroundLevel(p.x,p.z);
  // Broad masonry stairs follow the real graded ascent to the royal precinct.
  const front=p.z+p.d/2+3;
  for(let i=0;i<38;i++){
    const z=front+i*.55,top=ambronGroundLevel(p.x,z)+.08;
    b.box(CAP,p.x,top-.12,z,13,.24,.6);
    for(const side of [-1,1])b.block(STONE,p.x+side*7.1,top-.15,z,.8,.85,.58);
  }
  b.frame(p.x,y,p.z,0,()=>{
    // A broad arcaded palace supports one dominant stone tower. The wings
    // remain inside the existing royal precinct and leave the stairs open.
    b.block(STONE,0,0,0,p.w,12,p.d);
    for(const level of [.7,7.8,11.6,12.5])b.box(CAP,0,level,0,p.w+.6,.5,p.d+.6);
    for(const side of [-1,1]){
      for(const x of [-20,-14,-8,8,14,20]){
        archedRecess(b,x,1.2,side*(p.d/2+.08),2.5,5.8,side<0?Math.PI:0,CAP);
        b.block(CAP,x-2.1,1,side*(p.d/2+.18),.6,10.3,.7);
        archedRecess(b,x,8.6,side*(p.d/2+.1),1.6,2,side<0?Math.PI:0,CAP);
      }
      for(const z of [-13,-6,1,8,14])archedRecess(b,side*(p.w/2+.08),2,z,2.8,6,side*Math.PI/2,CAP);
      // Two round audience halls and compact stone corner turrets.
      stoneDrum(b,side*15,12.8,2,7,5.5,STONE);
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4;
        archedRecess(b,side*15+Math.sin(angle)*6.9,13.6,2+Math.cos(angle)*6.9,1.6,3.2,angle,CAP);
      }
      stoneDome(b,side*15,18.3,2,7.2,5.8,'#757f7d');
      for(const end of [-1,1]){
        b.block(STONE,side*20,12.8,end*15,5.5,5.4,5.5);
        stoneBattlements(b,side*20,18.2,end*15,5.8,5.8,CAP);
      }
      standard(b,side*20,20,15,5);
      sentry(b,side*8,0,p.d/2+2);
    }
    for(const side of [-1,1]){
      lakeFrieze(b,0,7.9,side*(p.d/2+.22),p.w-.8,side<0?Math.PI:0);
      lakeFrieze(b,side*(p.w/2+.22),7.9,0,p.d-.8,side*Math.PI/2);
      roofGarden(b,side*12.6,12.8,-13,7,3.5);
      b.block(DARK_STONE,side*6.5,12.8,13,4.2,.5,3.4);
      b.box('#619395',side*6.5,13.32,13,3.5,.05,2.7);
    }
    // A slender stone balustrade edges the royal roof garden.
    for(const side of [-1,1]){
      for(let x=-16;x<=16;x+=1.6)b.block(CAP,x,12.9,side*18.7,.22,1.05,.28);
      b.box(CAP,0,14.05,side*18.7,33,.22,.5);
      for(let z=-10;z<=10;z+=1.6)b.block(CAP,side*23.6,12.9,z,.28,1.05,.22);
      b.box(CAP,side*23.6,14.05,0,.5,.22,21);
      for(const end of [-1,1]){
        b.block(STONE,side*16.3,12.8,end*16.5,1.2,1.15,1.2);
        ambronLantern(b,side*16.3,14,end*16.5,1.3);
      }
      // Bronze ribs articulate the two audience-hall domes.
      for(let i=0;i<8;i++)for(let ring=0;ring<6;ring++){
        const angle=i*Math.PI/4,at=t=>[side*15+Math.sin(angle)*7.23*Math.cos(t),18.35+5.8*Math.sin(t),2+Math.cos(angle)*7.23*Math.cos(t)];
        b.beam('#969374',at(ring*Math.PI/12),at((ring+1)*Math.PI/12),.085);
      }
    }
    b.box(CAP,0,13.1,13,4,.5,4);
    b.cylinder(DARK_STONE,0,13.35,13,.7,2.4);
    b.rock(GOLD,0,16,13,1.1,.35,1.1);
    // The tower's ribs and progressively narrower stone crown create a clear
    // vertical silhouette without stacked roof pavilions.
    stoneDrum(b,0,12.8,-3,9,33,STONE);
    for(const level of [14,24,35,45.8])stoneDrum(b,0,level,-3,9.5,.6,CAP);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4,x=Math.sin(angle)*8.65,z=-3+Math.cos(angle)*8.65;
      b.frame(x,14,z,angle,()=>{
        b.block(CAP,0,0,0,.65,31,.65);
      });
      const faceAngle=angle+Math.PI/8;
      for(const level of [17,27.5,38])archedRecess(b,Math.sin(faceAngle)*8.88,level,-3+Math.cos(faceAngle)*8.88,2.1,5.5,faceAngle,CAP);
    }
    for(const level of [24.1,35.1])stoneDrum(b,0,level,-3,9.57,.35,'#4f8085');
    lakeSeal(b,0,33.5,6.58,.85);
    stoneDrum(b,0,46.4,-3,9.5,4.8,CAP,16,6.2);
    stoneDrum(b,0,51.2,-3,6.2,9.4,STONE);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      archedRecess(b,Math.sin(angle)*6.05,52.6,-3+Math.cos(angle)*6.05,1.8,5.5,angle,CAP);
    }
    stoneDrum(b,0,60.6,-3,6.6,.8,CAP);
    stoneDrum(b,0,61.4,-3,6.6,7.4,CAP,16,2.6);
    stoneDrum(b,0,68.8,-3,2.6,5,STONE,12,2);
    stoneDome(b,0,73.8,-3,2.3,2.2,'#7f877d');
    b.cone(GOLD,0,76,-3,.6,4);
    // An arched ceremonial entrance and a modest pediment over the portico.
    archedRecess(b,0,.15,p.d/2+.1,5,7,0,CAP,TIMBER);
    for(const x of [-4,4]){
      b.cylinder(CAP,x,0,p.d/2+1,.55,8.2);
      b.box(CAP,x,8.2,p.d/2+1,1.6,.6,1.6);
    }
    b.roof(CAP,0,8.5,p.d/2+.5,11,3.4,2.2,0,STONE);
    for(let step=0;step<7;step++)b.block(CAP,0,-1.6+step*.23,p.d/2+7-step*.8,10,.3,1);
  });
}

function fortress(b,f,colliders){
  b.frame(f.x,f.level,f.z,0,()=>{
    b.block(DARK_STONE,0,-4,0,f.w+4,4,f.d+4);
    for(const side of [-1,1]){
      b.block(STONE,side*f.w/2,0,0,3.4,9,f.d);
      if(side<0)b.block(STONE,0,0,side*f.d/2,f.w,9,3.4);
      else {
        for(const flank of [-1,1])b.block(STONE,flank*(f.w/4+2),0,f.d/2,f.w/2-4,9,3.4);
        b.block(CAP,0,7,f.d/2,8,2,3.4);
        stoneBattlements(b,0,9,f.d/2,9,4.4,CAP);
        for(const flank of [-1,1])b.block(TIMBER,flank*3.8,0,f.d/2-1.8,.25,6,3.6);
      }
      for(let x=-f.w/2;x<f.w/2;x+=3)if(side<0||Math.abs(x)>5)b.block(CAP,x,9,side*f.d/2,1.6,1.5,3.5);
      for(let z=-f.d/2;z<f.d/2;z+=3)b.block(CAP,side*f.w/2,9,z,3.5,1.5,1.6);
      for(const other of [-1,1]){
        b.block(DARK_STONE,side*f.w/2,-.5,other*f.d/2,7,14,7);
        stoneBattlements(b,side*f.w/2,13.5,other*f.d/2,7.6,7.6,CAP);
        archedRecess(b,side*f.w/2,7,other*(f.d/2+3.54),1.4,3.7,other<0?Math.PI:0,CAP);
        sentry(b,side*(f.w/2-3),10,other*(f.d/2-2),side*Math.PI/2);
      }
    }
    b.block(STONE,0,0,0,16,f.height,14);
    for(let level=5;level<f.height;level+=5){
      b.box(CAP,0,level,0,16.4,.4,14.4);
      for(const side of [-1,1])for(const x of [-5,0,5])archedRecess(b,x,level-3.5,side*7.1,1.3,2.8,side<0?Math.PI:0,CAP);
    }
    stoneBattlements(b,0,f.height,0,16.4,14.4,CAP);
    stoneDrum(b,0,f.height+.2,0,4.1,5.5,STONE);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      archedRecess(b,Math.sin(angle)*4.04,f.height+1,Math.cos(angle)*4.04,1.2,3.1,angle,CAP);
    }
    stoneDome(b,0,f.height+5.7,0,4.3,3.4,'#666f75');standard(b,0,f.height+9.1,0,5);

  });
  const add=(x,z,hx,hz)=>colliders.push({x:f.x+x,z:f.z+z,hx,hz,kind:'ambron-fortress',id:f.id});
  add(0,0,8,7);add(0,-f.d/2,f.w/2,1.7);
  for(const side of [-1,1]){
    add(side*f.w/2,0,1.7,f.d/2);
    add(side*(f.w/4+2),f.d/2,f.w/4-2,1.7);
    for(const end of [-1,1])add(side*f.w/2,end*f.d/2,3.5,3.5);
  }
}

function ship(b,s){
  b.frame(s.x,s.y,s.z,s.yaw,()=>{
    const w=s.width/2,l=s.length/2;
    const rim=[[-w*.4,1.5,-l],[w*.4,1.5,-l],[w,1.1,-l*.65],[w,1.1,l*.55],[0,2.2,l],[-w,1.1,l*.55],[-w,1.1,-l*.65]];
    for(let i=0;i<rim.length;i++){
      const j=(i+1)%rim.length,a=rim[i],c=rim[j];
      b.quad('#594534',a,c,[c[0]*.65,-.5,c[2]*.83],[a[0]*.65,-.5,a[2]*.83]);
      b.triangle('#a48453',[0,1.05,0],c,a);b.beam('#352f28',a,c,.18,.25);
    }
    if(s.kind==='barge'){
      for(const z of [-3,-1,1,3])b.block('#a89561',0,1.05,z,2.8,.8,1.4);
      b.beam(TIMBER,[-w,1.5,-l*.7],[w+2,1.8,-l*.8],.09);return;
    }
    const mast=s.kind==='warship'?14:s.kind==='trader'?11:5;
    b.cylinder(TIMBER,0,1,0,.13,mast);b.beam(TIMBER,[-w*1.3,mast-1,0],[w*1.3,mast-1,0],.14);
    const sail=s.kind==='warship'?'#853f36':s.kind==='trader'?'#c9b783':'#bbbd9f';
    b.sheet(sail,[-w*1.25,mast-1,.1],[w*1.25,mast-1,.1],[w*1.05,mast*.43,1.1],[-w*1.05,mast*.43,1.1]);
    for(let n=1;n<4;n++){
      const y=mast-1-(mast*.57-1)*n/4,z=.1+n*.25;b.beam(TIMBER,[-w*1.15,y,z],[w*1.15,y,z],.08);
    }
    if(s.kind==='warship'){
      b.block(DARK_STONE,0,1.1,-l*.65,s.width*.83,2.6,4);
      capitalRoof(b,0,3.7,-l*.65,s.width+1,5.5,2.1);
      b.beam(GOLD,[0,.8,l*.7],[0,1,l+3.3],.6,.45);
      for(const side of [-1,1])for(let z=-l*.4;z<l*.6;z+=2.2){
        b.beam(TIMBER,[side*w,.9,z],[side*(w+3.5),.1,z-1.3],.11);
        b.block(RED,side*(w+.05),1,z,.12,1.1,.8);
        b.block(GOLD,side*(w+.13),1.5,z,.04,.12,.7);
      }
      standard(b,0,4,-l*.7,4);sentry(b,0,1.4,l*.55);
    }else if(s.kind==='trader'){
      b.block(TIMBER,0,1.2,-l*.6,s.width*.75,2.5,3.5);capitalRoof(b,0,3.7,-l*.6,s.width+.5,4.4,1.6,'#886345');
      for(const x of [-1,1])for(const z of [1.5,3.1])b.block(x<0?'#b09a60':'#796944',x,1.15,z,1.2,1,1.2);
    }else{
      for(const z of [-1.5,1,2])b.box(TIMBER,0,1.2,z,s.width*.8,.16,.4);
      for(let n=0;n<5;n++)b.beam('#73878a',[w,1.1,-1+n*.35],[w+1.2,.05,-.7+n*.35],.045);
    }
  });
}

export function* createAmbronCapitalSteps({parent,heightAt,colliders,circuit,waterMaterial}){
  let vertices=0,soldiers=0;
  const royal=createSceneryBuilder('Ambron royal acropolis');palace(royal);vertices+=royal.vertexCount;yield* royal.finishSteps(parent);
  for(const f of AMBRON_FORTRESSES){
    const b=createSceneryBuilder(f.name);fortress(b,f,colliders);vertices+=b.vertexCount;yield* b.finishSteps(parent);soldiers+=4;
  }
  const waterways=createSceneryBuilder('Ambron shipping canals, locks and towpaths');
  const channelWater=createSceneryBuilder('Ambron connected canal water');
  let locks=0,barges=0;
  for(const canal of CITY_CANALS){
    for(const p of canal.points){
      const x=AMBRON_CENTRE.x+p.a,z=AMBRON_CENTRE.z+p.b;
      channelWater.cylinder(WATER,x,p.surface-.025,z,canal.width/2,.04,0,16);
    }
    for(let j=1;j<canal.points.length;j++){
      const a=canal.points[j-1],c=canal.points[j],length=Math.hypot(c.a-a.a,c.b-a.b),steps=Math.ceil(length/2);
      const dx=(c.a-a.a)/length,dz=(c.b-a.b)/length,nx=dz,nz=-dx,h=canal.width/2;
      const at=t=>({x:AMBRON_CENTRE.x+a.a+dx*length*t,z:AMBRON_CENTRE.z+a.b+dz*length*t,y:a.surface+(c.surface-a.surface)*t});
      for(let i=0;i<steps;i++){
        const start=at(i/steps),end=at((i+1)/steps),mid=at((i+.5)/steps);
        const V=(p,side,lift=0)=>[p.x+nx*h*side,p.y+lift,p.z+nz*h*side];
        channelWater.sheet(WATER,V(start,-1,.015),V(end,-1,.015),V(end,1,.015),V(start,1,.015));
        const crossing=cityCanalAt(mid.x,mid.z)?.bridge;
        if(crossing){
          const deck=cityCanalDeck(mid.x,mid.z);
          waterways.box(CAP,mid.x,deck-.25,mid.z,canal.width+3,.5,length/steps+.06,Math.atan2(dx,dz));
        }
        for(const side of [-1,1]){
          const bank=p=>{const x=p.x+nx*(h+.4)*side,z=p.z+nz*(h+.4)*side;return [x,Math.max(p.y+.6,heightAt(x+nx*side*1.4,z+nz*side*1.4)),z];};
          const A=bank(start),B=bank(end);
          if(elagosWaterDistance(A[0],A[2])<1||elagosWaterDistance(B[0],B[2])<1)continue;
          // Masonry follows the excavated bank; the clear channel has no centre piers.
          waterways.sheet(i%5?DARK_STONE:STONE,[A[0],start.y-2,A[2]],[B[0],end.y-2,B[2]],B,A);
          waterways.beam(CAP,A,B,1.25,.4);
          if(!crossing&&i%10===0){
            waterways.cylinder(TIMBER,A[0],A[1],A[2],.16,1);
            waterways.box(GOLD,A[0],A[1]+.8,A[2],.6,.12,.6);
          }
        }
        if(i%24===0)yield;
      }
      // Paired open lock leaves and hoists mark each change of lake level.
      if(a.surface!==c.surface){
        locks++;
        for(const t of [.15,.85]){
          const p=at(t);
          for(const side of [-1,1]){
            const x=p.x+nx*(h-.35)*side,z=p.z+nz*(h-.35)*side;
            waterways.box(TIMBER,x,p.y+.6,z,.45,2.5,6,Math.atan2(dx,dz));
            waterways.cylinder(TIMBER,x+nx*side*1.3,p.y,z+nz*side*1.3,.25,4.5);
            waterways.beam(GOLD,[x,p.y+3,z],[x+nx*side*2,p.y+3,z+nz*side*2],.16);
          }
        }
      }
      if(length>35){
        const p=at(.48);
        if(!cityCanalAt(p.x,p.z)?.bridge){ship(waterways,{...p,y:p.y,x:p.x,z:p.z,width:3.6,length:10,kind:'barge',yaw:Math.atan2(dx,dz)});barges++;}
      }
    }
  }
  // Distribution tanks and small terraced irrigation beds east of the lower avenue.
  for(const [x,z] of [[-1086,191],[-1068,174]]){
    const y=heightAt(x,z);waterways.block(STONE,x,y,z,9,1,7);waterways.box(WATER,x,y+1.02,z,7,.08,5);
    for(let i=0;i<4;i++){
      waterways.block('#665a3d',x-5+i*3,y,z+9,2.4,.4,7);
      for(let n=0;n<5;n++)waterways.cone('#628244',x-5+i*3,y+.4,z+6+n*1.2,.35,.65);
    }
  }
  vertices+=waterways.vertexCount+channelWater.vertexCount;yield* waterways.finishSteps(parent);
  const waterMesh=yield* channelWater.finishSteps(parent,{castShadow:false});
  if(waterMesh&&waterMaterial){waterMesh.material=waterMaterial;waterMesh.receiveShadow=false;}
  for(const h of AMBRON_HARBOURS){
    const b=createSceneryBuilder(h.name),steps=24;
    for(let i=0;i<steps;i++){
      const along=-17+77*(i+.5)/steps,x=h.shore.x+h.dx*along,z=h.shore.z+h.dz*along,y=ambronHarbourDeck(x,z);
      const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([side,end])=>{
        const px=x+h.dz*side*h.width/2+h.dx*end*77/steps/2,pz=z-h.dx*side*h.width/2+h.dz*end*77/steps/2;
        const centreAlong=along+end*77/steps/2;
        return [px,ambronHarbourDeck(h.shore.x+h.dx*centreAlong,h.shore.z+h.dz*centreAlong)??y,pz];
      });
      b.sheet(i%2?'#9d8258':'#ae9466',...corners);
      for(const [a,c] of [[0,3],[1,2]])b.beam(TIMBER,corners[a],corners[c],.16,.3);
      if(i%4===0)for(const side of [-1,1]){
        const px=x+h.dz*side*h.width/2,pz=z-h.dx*side*h.width/2;
        b.cylinder(TIMBER,px,h.surface-3,pz,.26,y-h.surface+4);
      }
    }
    const {x,z}=h.store,y=heightAt(x,z);
    b.block(STONE,x,y,z,8,6,7);capitalRoof(b,x,y+6,z,9,8,2.7);
    for(const side of [-1,1]){
      lakeFrieze(b,x,y+4.6,z+side*3.58,7.6,side<0?Math.PI:0);
      for(const dx of [-2.3,2.3])archedRecess(b,x+dx,y+.8,z+side*3.58,1.4,2.7,side<0?Math.PI:0,CAP);
    }
    colliders.push({x,z,hx:4,hz:3.5,kind:'ambron-harbour-store'});
    b.cylinder(TIMBER,h.shore.x+h.dz*4,h.deck,h.shore.z-h.dx*4,.3,8);
    b.beam(TIMBER,[h.shore.x+h.dz*4,h.deck+7,h.shore.z-h.dx*4],[h.tip.x,h.deck+7,h.tip.z],.35);
    b.beam('#b4a583',[h.tip.x,h.deck+7,h.tip.z],[h.tip.x,h.deck+.6,h.tip.z],.04);
    for(let i=0;i<5;i++)b.block(i%2?RED:'#ad925e',x+6,y,z-4+i*1.6,1.3,1.2,1.3);
    vertices+=b.vertexCount;yield* b.finishSteps(parent);
  }
  for(const s of AMBRON_SHIPS){const b=createSceneryBuilder(`Ambron ${s.kind}`);ship(b,s);vertices+=b.vertexCount;yield* b.finishSteps(parent);}
  const garrison=createSceneryBuilder('Ambroni garrison');
  for(const gate of circuit.gates.filter(g=>g.kind==='gate'))for(const side of [-1,1]){
    const x=gate.centre.x+gate.inward.x*8+gate.along.x*side*4.4,z=gate.centre.z+gate.inward.z*8+gate.along.z*side*4.4;
    sentry(garrison,x,heightAt(x,z),z,Math.atan2(-gate.inward.x,-gate.inward.z));soldiers++;
  }
  for(const tower of circuit.towers.filter((_,i)=>i%3===0)){
    const x=tower.x+Math.cos(tower.yaw)*3.1,z=tower.z-Math.sin(tower.yaw)*3.1;
    sentry(garrison,x,ambronGroundLevel(tower.x,tower.z)+circuit.standard.towerPlatform+.3,z,tower.yaw);soldiers++;
  }
  vertices+=garrison.vertexCount;yield* garrison.finishSteps(parent);
  return {vertices,fortresses:AMBRON_FORTRESSES.length,ships:AMBRON_SHIPS.length,harbours:AMBRON_HARBOURS.length,canals:CITY_CANALS.length,locks,barges,soldiers:soldiers+2+AMBRON_SHIPS.filter(s=>s.kind==='warship').length};
}
