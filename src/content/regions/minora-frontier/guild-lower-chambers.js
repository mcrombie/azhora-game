import {guildRoomKit} from './guild-room-kit.js';
import {createNessaAtmosphere} from './nessa-atmosphere.js';
import {buildHelbaGarden} from './helba-garden.js';

export function buildLowerGuildChamber(options){
  const k=guildRoomKit(options),{b,p,table,cabinet,stool,plant,lamp,ring,moving,label,animate,action}=k;
  const id=options.id;
  if(id==='helba'){buildHelbaGarden(k,options);k.seal();return k;}
  cabinet(8,-11.7,5);lamp(-4,-7);lamp(5,7);stool(-6,5);
  if(id==='veyra'){
    for(const x of [-9,9])for(const z of [3,8]){
      b.block(p.wood,x,.15,z,3.3,.45,2);b.block('#d8d5c0',x,.60,z,3.1,.22,1.85);
      b.block('#829c91',x,.84,z+.28,2.9,.05,1.18);b.block('#eee4cb',x,.84,z-.65,2.6,.18,.42);
      options.solid(x,0,z,3.4,1.1,2.1);
      for(const dx of [-1.9,1.9])b.block(p.trim,x+dx,0,z,.08,3,.08);
      b.block('#b1bbaa',x,1.1,z+1.2,3.8,1.8,.05);
    }
    table(0,-8,5,2.6);label('RESTORATION / Attend to what remains',0,3,-9.4,{width:5});
    for(const x of [-11,-8,-5])plant(x,0,-10,1.3);table(-9,-5,4,1.4);
    for(let i=0;i<8;i++){b.cylinder(i%2?'#87a49b':'#c2aa72',-10.3+i*.38,1.31,-5,.12,.26+(i%3)*.1);b.cylinder(p.wood,-10.3+i*.38,1.55+(i%3)*.1,-5,.09,.08);}
    const pieces=[];for(let i=0;i<8;i++){
      const a=i*Math.PI/4,c=(i+1)*Math.PI/4;
      pieces.push(moving('Mending bowl fragment '+i,Math.cos(a)*.45,1.36,-8+Math.sin(a)*.45,q=>{
        const pt=(angle,r,y)=>[Math.cos(angle)*r,y,Math.sin(angle)*r];
        q.quad('#d7c9a7',pt(a,.27,0),pt(c,.27,0),pt(c,.65,.34),pt(a,.65,.34));
        q.quad('#eadfc3',pt(a,.59,.34),pt(c,.59,.34),pt(c,.23,.08),pt(a,.23,.08));
        q.quad('#b89b61',pt(a,.65,.34),pt(c,.65,.34),pt(c,.59,.34),pt(a,.59,.34));
        q.triangle('#ded3b6',[0,.08,0],pt(a,.23,.08),pt(c,.23,.08));
      }));
    }
    const water=moving('Restoring water',0,1.50,-8,q=>{q.cylinder('#83c4c1',0,0,0,.37,.018);ring(q,0,.02,0,.35,'#c1e6dd');});
    for(let i=0;i<3;i++)b.cylinder('#eee4ce',-1.8,1.32+i*.09,-7.4,.25,.08);
    b.block('#d8d0b9',1.8,1.32,-8.3,.65,.025,.9);for(let i=0;i<5;i++)b.block('#777d6b',1.8,1.35,-8.6+i*.13,.45,.006,.025);
    let start=-100;action('restoration',t=>{start=t;});animate(t=>{
      const age=t-start,u=age<0?0:age<2?age/2:age<9?1:Math.max(0,1-(age-9)/2);
      pieces.forEach((g,i)=>{const a=i*Math.PI/4;g.position.set(Math.cos(a)*(.45*(1-u)),1.36,-8+Math.sin(a)*(.45*(1-u)));g.rotation.y=(1-u)*Math.sin(t+i)*.12;});
      water.scale.setScalar(.7+u*.3);water.position.y=1.50+Math.sin(t*2)*.015*(1-u);
    });
  }else if(id==='nessa'){
    const atmosphere=createNessaAtmosphere(options.parent),baseState=k.state;
    animate(t=>atmosphere.update(t));k.state=()=>({...baseState(),atmosphere:atmosphere.state()});
    for(const x of [-9,9])for(const z of [-5,4,9]){
      b.block(p.wood,x,.15,z,4,.25,2.5);b.block('#a7a0b7',x,.4,z,3.6,.22,2.2);b.block('#d2c5c9',x,.62,z-.7,2.6,.2,.55);
      for(const dx of [-2,2])b.block(p.gold,x+dx,0,z-.9,.09,4,.09);
      b.block(p.cloth,x,1.0,z-1.1,4,3,.055);b.block(p.cloth,x+1.8,1,z,.06,3,2.2);
      options.solid(x,0,z,4,.9,2.5);
    }
    table(0,-8,4,3);label('THE DREAM BASIN',0,3,-10);b.cylinder(p.trim,0,1.3,-8,1.25,.25);b.cylinder('#5a597b',0,1.56,-8,1.12,.04);
    const vision=moving('Dream of converging roads',0,1.7,-8,q=>{
      for(const side of [-1,1])q.beam('#aec4cf',[side*.9,0,.65],[0,0,-.6],.09);
      q.rock('#393b5c',0,.65,-.55,.6,.8,.17);q.rock('#dbcfa8',.25,.45,.1,.11,.2,.1);
    });vision.scale.setScalar(.01);let until=0;action('dream',t=>{until=t+15;});
    const ceiling=moving('Sleeping constellation',0,9.35,0,q=>{
      for(let i=0;i<55;i++)q.rock(i%3?'#9faac7':'#d6c5a2',Math.sin(i*3.7)*11,Math.sin(i)*.05,Math.cos(i*2.1)*10,.045,.04,.045);
      for(let i=0;i<12;i++)q.beam('#6f7794',[Math.sin(i*2.4)*7,0,Math.cos(i*2.4)*7],[Math.sin((i+1)*2.4)*7,0,Math.cos((i+1)*2.4)*7],.025);
    });animate(t=>{ceiling.rotation.y=Math.sin(t*.025)*.08;vision.scale.setScalar(t<until?Math.min(1,(until-t)*.5):.01);vision.rotation.y=Math.sin(t*.25)*.15;});
  }else if(id==='odran'){
    for(const x of [-9,-4,3,8])cabinet(x,11.5,3.7,5.2);
    table(0,-8,5,2.7);label('KETTLE / Terms must be clear',0,3.4,-10,{width:4.7});
    for(const x of [-10,9]){table(x,4,3.6,2.5);stool(x,6.1);}
    for(let i=0;i<8;i++){
      const x=-11+i*.6;b.block(i%2?p.cloth:'#8c7060',x,1.31,4,.48,.12,.65);
      for(let j=0;j<6;j++)ring(b,x,1.48,4+j*.10,.045,p.gold);
    }
    b.block('#6e6050',-1.8,1.32,-8.6,.6,.09,.9);b.block('#d7ccb0',-1.8,1.42,-8.6,.55,.025,.85);
    for(let i=0;i<5;i++)b.block('#777b6c',-1.8,1.45,-8.9+i*.13,.4,.006,.018);
    b.cylinder('#324b56',1.7,1.32,-8.6,.13,.2);b.beam('#d7cfad',[1.7,1.5,-8.6],[1.95,2,-8.7],.025);
    const kettle=moving('Obstinate kettle',-.75,1.52,-8,q=>{q.rock('#bdad85',0,.22,0,.43,.37,.35);q.cylinder(p.gold,0,.5,0,.27,.08);q.beam(p.gold,[.3,.25,0],[.65,.42,0],.13);for(let i=0;i<12;i++){const a=i*Math.PI/6,c=(i+1)*Math.PI/6;q.beam(p.gold,[-.3+Math.sin(a)*.24,.36+Math.cos(a)*.30,0],[-.3+Math.sin(c)*.24,.36+Math.cos(c)*.30,0],.045);}});
    b.cylinder(p.trim,.6,1.32,-8,.24,.32);b.cylinder('#544c40',.6,1.63,-8,.20,.018);
    const stream=moving('One cup of tea',.13,1.86,-8,q=>q.beam('#b6c9c1',[0,0,0],[.47,-.2,0],.065));stream.visible=false;
    let until=0,wrong=false;action('kettle-pour',t=>{until=t+5;wrong=false;});action('kettle-refuse',t=>{until=t+3;wrong=true;});
    animate(t=>{const active=t<until;kettle.rotation.z=active?(wrong?Math.sin(t*8)*.12:-.22):0;stream.visible=active&&!wrong;});
    for(let i=0;i<3;i++){
      const g=moving('Bound page assistant '+i,8+i,2.2+i*.45,4,q=>{q.block('#d8ccb0',0,0,0,.55,.7,.07);for(let j=0;j<4;j++)q.block('#73867d',0,.16+j*.11,.04,.3,.025,.01);q.rock('#b09b68',0,.8,0,.1,.13,.08);});
      animate(t=>{g.position.y=2.2+i*.45+Math.sin(t+i)*.12;g.rotation.y=Math.sin(t*.4+i)*.3;});
    }
    label('Name / Duty / Release',9,3.9,3.8,{width:3.7});
    for(let i=0;i<5;i++){const g=moving('Floating inscription '+i,-10+i*1.2,4+i*.3,-9,q=>{for(let j=0;j<5;j++){q.block(p.gold,j*.16,Math.sin(j+i)*.1,0,.07,.18,.035);}});animate(t=>{g.position.y=4+i*.3+Math.sin(t*.5+i)*.13;});}
  }
  k.seal();return k;
}
