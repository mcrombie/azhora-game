import {guildRoomKit} from './guild-room-kit.js';
import {buildNerisMirror} from './neris-mirror.js';

export function buildUpperGuildChamber(options){
  const k=guildRoomKit(options),{b,p,table,cabinet,stool,plant,lamp,ring,moving,label,animate,action}=k;
  const id=options.id;
  if(id==='bolbur')return k;
  cabinet(-9,11.6,4.5);lamp(5,-5);lamp(-5,5);stool(-9,7);
  if(id==='neris'){
    for(const x of [-11,11])for(const z of [-8,-3,4,9]){
      b.block(p.gold,x,1.8,z,.28,3.4,2.5);b.block('#384656',x+(x<0?.16:-.16),2,z,.05,3,2.1);
      const portrait=moving('Portrait that looks away '+x+','+z,x+(x<0?.22:-.22),3,z,q=>{q.rock('#c7b08e',0,.65,0,.18,.35,.27);q.rock('#795b73',0,-.15,0,.19,.6,.7);q.rock('#302e40',0,.9,-.04,.20,.2,.28);});
      animate(t=>{portrait.rotation.y=Math.sin(t*.4+z)*.25;portrait.position.y=3+Math.sin(t*.7+z)*.08;});
    }
    table(0,-8,5.8,3.8);label('A CITY / A FOREST',0,4,-10,{width:4});
    const city=moving('Miniature city',0,1.35,-8,q=>{
      q.block('#929ba2',0,0,0,4.8,.12,2.8);
      for(let i=0;i<15;i++){const x=-2+(i%5),z=-1+Math.floor(i/5);q.block('#d4ceb4',x,.12,z,.6,.5+(i%4)*.22,.6);q.cone('#547580',x,.62+(i%4)*.22,z,.48,.4,0,4);}
    });
    const forest=moving('Miniature forest',0,1.35,-8,q=>{q.block('#6e8254',0,0,0,4.8,.12,2.8);for(let i=0;i<20;i++){const x=Math.sin(i*2.4)*2,z=Math.cos(i*2.4)*1.1;q.cylinder('#765e42',x,.12,z,.045,.65);q.rock(i%2?'#426e57':'#79964f',x,.7,z,.34,.45,.34);}});forest.visible=false;
    let woods=false;action('illusion-city',()=>{woods=!woods;city.visible=!woods;forest.visible=woods;});
    buildNerisMirror(k,options);
    for(const side of [-1,1]){b.block('#703f60',side*3.3,1.8,-10.8,.8,6,.14);b.block(p.gold,side*3.3,1.5,-10.8,1,.2,.3);}
  }else if(id==='oris'){
    table(0,-8,5,2.4);label('ONE NOTE / A QUIET ROOM',0,3.6,-10,{width:4.5});
    const flames=[];
    for(let i=0;i<7;i++){const x=-2.1+i*.7;b.cylinder(p.gold,x,1.3,-8,.16,.2);b.cylinder('#e3d8b4',x,1.5,-8,.07,.5+(i%2)*.2);flames.push(moving('Candle flame '+i,x,2.1+(i%2)*.2,-8,q=>q.rock('#f1cf78',0,0,0,.075,.18,.075)));}
    let darkUntil=0;action('silence-candles',t=>{darkUntil=t+10;});animate(t=>flames.forEach((g,i)=>{g.visible=t>=darkUntil;g.scale.y=1+Math.sin(t*5+i)*.15;}));
    for(const x of [-9,9]){table(x,6,3,2);b.cone(p.gold,x,1.3,6,.7,.4);b.cylinder('#485c69',x,1.7,6,.6,.025);}
    label('WHISPER BOWLS',9,3.5,6);
    const whisper=moving('Whisper crossing the chamber',-9,2.3,6,q=>{ring(q,0,0,0,.28,'#aaccca');q.rock('#d7deb7',0,0,0,.08,.10,.08);});whisper.visible=false;
    let start=-100;action('whisper',t=>{start=t;});animate(t=>{const age=t-start;whisper.visible=age<6;whisper.position.x=-9+Math.min(1,age/6)*18;whisper.position.y=2.3+Math.sin(age)*.2;});
    for(let i=0;i<9;i++){
      const x=-11+i*2.7;b.beam(p.gold,[x,9,-11],[x,5+(i%3)*.4,-11],.025);
      const bell=moving('Suspended tuned bell '+i,x,5+(i%3)*.4,-11,q=>{q.cone(p.gold,0,0,0,.3+(i%3)*.07,.65);q.rock('#67533c',0,-.08,0,.09,.12,.09);});animate(t=>{bell.rotation.z=Math.sin(t*1.1+i)*.045;});
    }
    for(let i=0;i<12;i++){
      const x=-4.5+i*.75;b.block(p.wood,x,7.8,4,.12,.2,1);
      const s=moving('Footstep string '+i,x,4.7,4,q=>q.beam(i%2?p.gold:'#b7c9b5',[0,0,0],[0,3,0],.015));
      let last=null,amplitude=0;animate((t,player)=>{if(player&&last){amplitude=Math.min(.10,amplitude*.90+Math.hypot(player.x-last.x,player.z-last.z)*.08);}last=player?{x:player.x,z:player.z}:null;s.rotation.z=Math.sin(t*14+i)*amplitude;});
    }
  }else if(id==='maelon'){
    const stations=[[-8,-7,'SOLID','#a2b7c1'],[8,-7,'LIQUID','#6db3c2'],[-8,7,'GAS','#b1c3bc'],[8,7,'PLASMA','#be91d1']];
    for(const [x,z,name,color] of stations){
      table(x,z,4,3);ring(b,x,1.35,z,1.25);b.cylinder(p.shade,x,1.31,z,1.1,.12);
      label(name,x,3.7,z-1.2,{width:2.9});
      for(const side of [-1,1]){b.block(p.gold,x+side*1.45,1.3,z,.07,2.3,.07);b.rock(color,x+side*1.45,3.6,z,.12,.15,.12);}
    }
    const crystal=moving('Solid crystalline lattice',-8,2.15,-7,q=>{for(let i=0;i<7;i++){const a=i*2.4;q.rock('#b7c7cf',Math.sin(a)*.5,(i%2)*.25,Math.cos(a)*.5,.23,.6,.24);}});
    const drops=[];for(let i=0;i<7;i++)drops.push(moving('Contained liquid drop '+i,8,2,-7,q=>q.rock('#75c2d3',0,0,0,.19,.25,.19)));
    const gas=[];for(let i=0;i<7;i++)gas.push(moving('Contained vapor curl '+i,-8,2,7,q=>{ring(q,0,0,0,.28,'#b6c8bc');ring(q,.15,.12,.05,.18,'#a2b6ac');}));
    const plasma=moving('Contained plasma arc',8,2.5,7,q=>{for(let i=0;i<12;i++){const a=i*Math.PI/6;q.beam(i%2?'#dcc1e4':'#aa83d4',[Math.cos(a)*.8,Math.sin(a)*.7,0],[Math.cos(a+.5)*.55,Math.sin(a+.5)*.6,.1],.045);}q.rock('#e5d2ed',0,0,0,.18,.26,.18);});
    const boost={};for(const name of ['solid','liquid','gas','plasma'])action('matter-'+name,t=>{boost[name]=t+8;});
    animate(t=>{
      crystal.rotation.y=t*(t<(boost.solid??0)?.6:.08);
      drops.forEach((g,i)=>{const a=t*(t<(boost.liquid??0)?1:.25)+i*.9;g.position.set(8+Math.sin(a)*.6,2.25+Math.cos(a)*.5,-7+Math.cos(i)*.3);g.scale.y=1+Math.sin(a)*.25;});
      gas.forEach((g,i)=>{const a=t*.3+i;g.position.set(-8+Math.sin(a)*.7,1.7+(t*(t<(boost.gas??0)?.5:.15)+i*.3)%1.6,7+Math.cos(a)*.7);g.rotation.y=a;});
      plasma.rotation.y=t*.4;plasma.scale.setScalar(t<(boost.plasma??0)?1+Math.sin(t*12)*.12:.7);
    });
    b.cylinder(p.trim,0,.11,3,1.25,.2);ring(b,0,.34,3,1);label('Observe from outside the rings',0,3,11.8,{yaw:Math.PI,width:5});
  }
  k.seal();return k;
}
