import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createHadrinWorkshop} from './hadrin-workshop.js';
import {createSenroStudy,SNERO_DESK_SHIFT} from './senro-study.js';

// Ordinary furniture is merged per floor. Hadrin's articulated demonstration
// objects are owned by the compact workshop scenery beside this module.
export function buildGuildFurnishings({id,parent,palette:p,solid,finish,ownedMaterials}){
  const b=createSceneryBuilder(`${id}: books, instruments and working furniture`);let workshop=null,study=null;
  const paper='#d8c9a7',ink='#35444b',metal='#435058';
  function table(x,z,w=4,d=2,yaw=0){
    b.frame(x,0,z,yaw,()=>{
      for(const a of [-1,1])for(const c of [-1,1]){b.block(p.wood,a*(w/2-.25),0,c*(d/2-.22),.24,1.24,.24);b.block(p.gold,a*(w/2-.25),.14,c*(d/2-.22),.28,.1,.28);}
      b.block(p.wood,0,1.16,0,w,.22,d);b.block(p.gold,0,1.37,0,w+.03,.045,d+.03);
      b.block(p.wood,0,.65,0,w-.25,.18,.14);
    });solid(x,0,z,Math.abs(Math.cos(yaw))*w+Math.abs(Math.sin(yaw))*d,1.42,Math.abs(Math.cos(yaw))*d+Math.abs(Math.sin(yaw))*w);
  }
  function chair(x,z,yaw=0){
    b.frame(x,0,z,yaw,()=>{
      for(const xx of [-.38,.38])for(const zz of [-.35,.35])b.block(p.wood,xx,0,zz,.15,.85,.15);
      b.block(p.wood,0,.75,0,1,.18,.95);b.block(p.cloth,0,.92,0,.87,.14,.8);
      for(const xx of [-.4,.4])b.block(p.wood,xx,.8,-.38,.14,1.35,.14);
      b.block(p.wood,0,1.8,-.38,.94,.3,.14);b.block(p.gold,0,2.09,-.38,.95,.055,.18);
      b.block(p.cloth,0,1.2,-.36,.6,.65,.1);
    });solid(x,0,z,1,2.15,1);
  }
  function book(x,y,z,w=.36,h=.65,d=.5,color=p.cloth,yaw=0){
    b.frame(x,y,z,yaw,()=>{
      b.block(color,0,0,0,w,h,d);b.block(paper,.025,.065,.025,w-.075,h-.13,d-.04);
      b.block(color,0,0,-d/2+.04,w,h,.08);
      for(const yy of [.12,h-.14])b.block(p.gold,0,yy,-d/2-.005,w*.8,.035,.018);
    });
  }
  function bookcase(x,z,yaw=0,w=6){
    b.frame(x,0,z,yaw,()=>{
      b.block(p.wood,0,0,.36,w,5,.2);
      for(const xx of [-w/2,w/2]){b.block(p.wood,xx,0,0,.19,5,.95);b.block(p.gold,xx,.15,-.49,.055,4.6,.055);}
      b.block(p.wood,0,4.9,0,w+.35,.25,1.12);
      for(let row=0;row<5;row++){
        const y=.18+row*.92;b.block(p.wood,0,y,0,w+.1,.13,.95);
        for(let j=0;j<12;j++){
          const xx=-w/2+.35+j*(w-.6)/12,hh=.54+(j+row)%3*.09;
          book(xx,y+.14,-.03,.26+(j%2)*.07,hh,.52,['#4b5e63','#8b6249','#746477','#718069','#987948'][(j+row)%5],0);
        }
      }
    });solid(x,0,z,Math.abs(Math.cos(yaw))*w+Math.abs(Math.sin(yaw))*1.2,5.2,Math.abs(Math.cos(yaw))*1.2+Math.abs(Math.sin(yaw))*w);
  }
  function scroll(x,y,z,yaw=0){
    b.frame(x,y,z,yaw,()=>{
      b.box(paper,0,.015,0,.7,.025,1.1);
      for(const zz of [-.54,.54])b.box(p.trim,0,.05,zz,.75,.1,.1);
      for(let j=0;j<5;j++)b.box(ink,0,.032,-.3+j*.13,.42-(j%2)*.14,.01,.012);
    });
  }
  function lantern(x,y,z,s=1,builder=b){
    builder.block(metal,x,y,z,.56*s,.12*s,.56*s);builder.block('#f4d59b',x,y+.12*s,z,.37*s,.60*s,.37*s);
    for(const xx of [-1,1])for(const zz of [-1,1])builder.block(metal,x+xx*.24*s,y+.08*s,z+zz*.24*s,.055*s,.71*s,.055*s);
    builder.cone(metal,x,y+.79*s,z,.43*s,.3*s,Math.PI/4,4);
  }
  function standingLamp(x,z){
    b.cylinder(p.shade,x,0,z,.43,.17);b.cylinder(p.gold,x,.17,z,.10,2.65);lantern(x,2.8,z,.8);solid(x,0,z,.8,3.8,.8);
  }
  function vase(x,y,z){
    b.cylinder(p.gold,x,y,z,.2,.12);b.rock(p.cloth,x,y+.42,z,.36,.42,.36);b.cylinder(p.gold,x,y+.7,z,.2,.15);
    for(const side of [-1,1]){b.beam('#6c7550',[x,y+.75,z],[x+side*.28,y+1.2,z],.035);b.rock('#b5919a',x+side*.28,y+1.22,z,.16,.12,.16);}
  }
  function clockFace(x,y,z,r){
    b.rock(p.shade,x,y,z,r,r,.13);
    for(let i=0;i<32;i++){
      const a=i*Math.PI/16,c=(i+1)*Math.PI/16;b.beam(p.gold,[x+Math.cos(a)*r,y+Math.sin(a)*r,z+.15],[x+Math.cos(c)*r,y+Math.sin(c)*r,z+.15],.11);
    }
    for(let i=0;i<12;i++){const a=i*Math.PI/6;b.beam(p.trim,[x+Math.sin(a)*r*.80,y+Math.cos(a)*r*.80,z+.18],[x+Math.sin(a)*r*.92,y+Math.cos(a)*r*.92,z+.18],i%3===0?.085:.045);}
    b.beam(p.trim,[x,y,z+.23],[x-.46*r,y+.52*r,z+.23],.07);b.beam(p.gold,[x,y,z+.25],[x+.67*r,y+.12*r,z+.25],.065);
    b.rock(p.gold,x,y,z+.27,.12,.12,.07);
  }
  if(id==='taleth'){
    bookcase(-12,-4,-Math.PI/2,8);bookcase(12,-7.5,Math.PI/2,6);
    table(-7.9,-8.1,4.2,2.1);chair(-7.9,-10.3);scroll(-8.4,1.43,-8.1,-.18);book(-6.9,1.43,-8.15,.8,.18,.62,'#465b67',.08);
    b.cylinder(ink,-8.9,1.42,-8.7,.12,.17);b.beam(paper,[-8.9,1.55,-8.7],[-8.62,2.13,-8.67],.04);
    table(-8,7.3,4.5,2.1);chair(-8,5.3,Math.PI);chair(-8,9.2);scroll(-8,1.43,7.3,.1);lantern(-6.55,1.43,7.3,.45);
    table(8.5,9.4,4,1.8);chair(8.5,11.2);vase(9.7,1.43,9.4);book(7.5,1.43,9.4,.65,.15,.8,'#65765b');
    // The dial and its motionless pendulum are the room's dominant motif.
    b.block(p.cloth,0,2.8,-12.14,4.8,6,.10);b.block(p.gold,0,2.8,-12.03,4.9,.09,.04);clockFace(0,6.6,-11.94,1.72);
    b.beam(p.gold,[0,5.1,-11.7],[0,3.5,-11.7],.06);b.rock(p.gold,0,3.45,-11.7,.26,.34,.08);
    for(const x of [-2.2,2.2])b.block(p.gold,x,3,-12.03,.055,5.5,.04);
    // A large hourglass, carefully inside its own low cabinet footprint.
    table(8,-8.2,2.7,2.3);
    for(const xx of [-.75,.75])for(const zz of [-.65,.65])b.cylinder(p.gold,8+xx,1.45,-8.2+zz,.075,2.45);
    for(const y of [1.44,3.83])b.cylinder(p.wood,8,y,-8.2,1.1,.15);
    b.cone('#9cafb4',8,1.65,-8.2,.65,.98);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,c=(i+1)*Math.PI/4;
      b.triangle(i%2?'#b5c5c3':'#9cafb4',[8,2.63,-8.2],[8+Math.cos(a)*.65,3.65,-8.2+Math.sin(a)*.65],[8+Math.cos(c)*.65,3.65,-8.2+Math.sin(c)*.65]);
    }
    b.cone('#ddc790',8,1.66,-8.2,.49,.5);b.beam('#dcc994',[8,2.8,-8.2],[8,2.15,-8.2],.025);
    standingLamp(-4.5,-7.5);standingLamp(5.5,-7.5);
  }else if(id==='senro'){
    bookcase(-12,-4,-Math.PI/2,7);table(-8.4+SNERO_DESK_SHIFT,7.4,4.7,2);chair(-8.4+SNERO_DESK_SHIFT,9.4);lantern(-10+SNERO_DESK_SHIFT,1.44,7.4,.45);
    standingLamp(-4.4,-6.0);standingLamp(4.5,7.5);
    study=createSenroStudy({parent,palette:p,solid,finish,ownedMaterials});
  }else{
    bookcase(-12,-5,-Math.PI/2,6);table(0,-8.6,8,2.8);solid(0,0,-9.7,8,3.5,.3);
    b.block(p.wood,0,1.5,-9.65,7.8,2.6,.18);
    for(let i=0;i<10;i++){
      const x=-3.3+i*.73;b.beam(p.gold,[x,3.65,-9.48],[x,2.7-(i%3)*.17,-9.48],.07);
      b.block(metal,x,2.7-(i%3)*.17,-9.43,.36,.12,.18);
    }
    table(-8,7.2,4.5,2.2);chair(-11.5,7.2,Math.PI/2);
    // Wall-mounted staves and a locked cabinet of finished enchantments.
    b.block(p.wood,-9,1.3,12.12,5.8,3.9,.2);
    for(let i=0;i<4;i++){const x=-11+i*1.25;b.beam(p.gold,[x,1.5,11.9],[x,4.5,11.9],.095);b.rock(['#a4c0ba','#b99aca','#ddbd70','#9fb4c8'][i],x,4.7,11.9,.22,.32,.15);}
    b.block(p.wood,9,0,-7,4,3.6,1.3);b.block(p.cloth,9,.35,-6.32,3.4,2.8,.08);b.block(p.gold,9,.4,-6.25,.06,2.7,.05);solid(9,0,-7,4,3.6,1.4);
    for(const x of [7.5,10.5])b.block(p.gold,x,.2,-6.24,.06,3.2,.05);
    standingLamp(-5,-7);

    workshop=createHadrinWorkshop({parent,palette:p,solid,finish,ownedMaterials});
  }
  finish(b,parent);
  return {
    update(time){workshop?.update(time);},
    demonstrate:object=>workshop?.demonstrate(object)??false,
    workshopState:()=>workshop?.workshopState()??null,
    studyState:()=>study?.studyState()??null,
    dispose(){workshop?.dispose();study?.dispose();},
  };
}
