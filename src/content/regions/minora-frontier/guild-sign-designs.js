// Authored lettering and craft traditions for the eleven Guild landings.
// Names use distinct local faces with offline fallbacks; canvas artwork is
// painted once when the tower is built, never during a frame update.
export const GUILD_SIGN_DESIGNS=Object.freeze({
  taleth:{font:'"Cinzel", "Palatino Linotype", serif',weight:'600',size:83,shape:'time',base:'#243d52',edge:'#af975e',ink:'#f3e5b6',muted:'#c5ceb9',icon:'clock'},
  senro:{font:'"Segoe Print", "Comic Sans MS", cursive',weight:'bold',size:73,shape:'tag',base:'#d6c6a0',edge:'#62725c',ink:'#354f47',muted:'#5d6150',icon:'door'},
  hadrin:{font:'"Bahnschrift", "Franklin Gothic Medium", sans-serif',weight:'bold',size:77,shape:'plate',base:'#6e422e',edge:'#d5a66a',ink:'#ffe2a6',muted:'#e2c4a0',icon:'gear'},
  veyra:{font:'"Constantia", "Cambria", serif',weight:'normal',size:83,shape:'lozenge',base:'#dddcc4',edge:'#76998a',ink:'#315b52',muted:'#587264',icon:'bowl'},
  nessa:{font:'"Gabriola", "Palatino Linotype", cursive',weight:'normal',size:110,shape:'moon',base:'#354559',edge:'#b8c5d0',ink:'#e6e6d5',muted:'#bfcad4',icon:'moon'},
  odran:{font:'"EB Garamond", "Times New Roman", serif',weight:'600',size:86,shape:'charter',base:'#d6c4a0',edge:'#8b6749',ink:'#3f382c',muted:'#65533c',icon:'seal'},
  helba:{font:'"Segoe Script", "Segoe Print", cursive',weight:'bold',size:74,shape:'bark',base:'#4f6242',edge:'#a8b680',ink:'#f2e6be',muted:'#d4d7ac',icon:'sprout'},
  neris:{font:'"Sitka Display", "Georgia", serif',weight:'bold',size:83,shape:'stage',base:'#6b344b',edge:'#c9a474',ink:'#f7e0bf',muted:'#ddbbbc',icon:'masks'},
  oris:{font:'"Palatino Linotype", "Georgia", serif',weight:'italic',size:84,shape:'lyre',base:'#66513b',edge:'#c7ab73',ink:'#f2dfae',muted:'#dcc8a3',icon:'lyre'},
  maelon:{font:'"Consolas", "Courier New", monospace',weight:'bold',size:74,shape:'states',base:'#354b51',edge:'#94b3b3',ink:'#e0e6cf',muted:'#b4d0cc',icon:'states'},
  bolbur:{font:'"Trebuchet MS", "Verdana", sans-serif',weight:'bold',size:74,shape:'timber',base:'#997446',edge:'#dbc08b',ink:'#fff0c8',muted:'#f1ddb4',icon:'paw',lines:['Bolbur Faunad','Beastbester']},
});

export const GUILD_SIGN_SIZE={width:1024,height:448,metres:3.7};
export function guildSignOutline(shape){
  switch(shape){
    case 'time':return [[18,108],[104,58],[412,58],[452,28],[572,28],[612,58],[920,58],[1006,108],[1006,340],[920,390],[612,390],[572,420],[452,420],[412,390],[104,390],[18,340]];
    case 'tag':return [[20,150],[134,48],[968,48],[1004,84],[1004,364],[968,400],[134,400],[20,298]];
    case 'plate':return [[28,97],[91,34],[933,34],[996,97],[996,351],[933,414],[91,414],[28,351]];
    case 'lozenge':return [[18,173],[69,89],[151,44],[873,44],[955,89],[1006,173],[1006,275],[955,359],[873,404],[151,404],[69,359],[18,275]];
    case 'moon':return Array.from({length:40},(_,i)=>{const a=i*Math.PI/20;return [512+494*Math.cos(a),224+199*Math.sin(a)];});
    case 'charter':return [[40,51],[204,43],[429,54],[661,40],[852,49],[981,37],[975,125],[990,227],[975,322],[986,400],[798,405],[569,392],[348,410],[162,399],[34,411],[43,314],[30,199]];
    case 'bark':return [[18,125],[63,67],[174,52],[330,67],[471,38],[660,54],[794,39],[951,70],[1004,118],[984,232],[1006,322],[951,385],[781,399],[624,385],[478,411],[330,392],[173,410],[62,377],[24,310],[40,215]];
    case 'stage':return [[26,117],[82,81],[185,81],[224,45],[447,45],[512,19],[577,45],[800,45],[839,81],[942,81],[998,117],[979,338],[908,364],[780,382],[575,382],[512,429],[449,382],[244,382],[116,364],[45,338]];
    case 'lyre':return [[25,133],[98,62],[233,43],[792,43],[927,62],[999,133],[963,224],[999,315],[927,386],[792,405],[233,405],[98,386],[25,315],[61,224]];
    case 'states':return [[26,76],[68,34],[956,34],[998,76],[998,372],[956,414],[68,414],[26,372]];
    case 'timber':return [[29,72],[186,47],[386,53],[577,39],[796,56],[987,45],[1001,153],[984,250],[1000,370],[806,399],[591,391],[389,410],[181,399],[24,377],[39,270],[21,169]];
    default:throw Error('Unknown guild sign silhouette: '+shape);
  }
}

function outline(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function line(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function circle(c,x,y,r,fill=false){c.beginPath();c.arc(x,y,r,0,Math.PI*2);fill?c.fill():c.stroke();}
function ellipse(c,x,y,rx,ry,angle=0,fill=false){c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);fill?c.fill():c.stroke();}
function leaf(c,x,y,s=1,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-24*s,-8*s,-28*s,-36*s,0,-55*s);c.bezierCurveTo(28*s,-36*s,24*s,-8*s,0,0);c.fill();c.restore();}
function star(c,x,y,r){line(c,[[x-r,y],[x+r,y]]);line(c,[[x,y-r],[x,y+r]]);}

function emblem(c,id,d){
  c.save();c.translate(143,222);c.strokeStyle=d.ink;c.fillStyle=d.ink;c.lineWidth=5;c.lineCap='round';c.lineJoin='round';
  if(id==='clock'){
    circle(c,0,0,66);circle(c,0,0,54);circle(c,0,0,7,true);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;line(c,[[Math.sin(a)*58,Math.cos(a)*58],[Math.sin(a)*65,Math.cos(a)*65]]);}
    line(c,[[0,-40],[0,0],[31,18]]);line(c,[[-43,-78],[43,-78]]);line(c,[[-43,78],[43,78]]);
  }else if(id==='door'){
    for(let i=0;i<3;i++)line(c,[[-55+i*12,64],[-55+i*12,-69+i*10],[53-i*8,-69+i*10],[53-i*8,64]]);
    line(c,[[-22,-42],[29,-58],[29,64],[-22,46],[-22,-42]]);circle(c,15,11,4,true);
    c.setLineDash([4,9]);line(c,[[-68,78],[1,94],[68,72]]);c.setLineDash([]);
  }else if(id==='gear'){
    circle(c,0,0,49);circle(c,0,0,25);
    for(let i=0;i<10;i++){c.save();c.rotate(i*Math.PI/5);c.fillRect(-8,-69,16,23);c.restore();}
    line(c,[[-38,53],[28,-44]]);circle(c,0,0,5,true);
  }else if(id==='bowl'){
    line(c,[[-62,5],[62,5]]);c.beginPath();c.arc(0,5,56,0,Math.PI);c.stroke();line(c,[[-31,66],[31,66]]);
    c.beginPath();c.moveTo(0,-75);c.bezierCurveTo(-50,-23,-26,-5,0,-5);c.bezierCurveTo(26,-5,50,-23,0,-75);c.stroke();
    leaf(c,-67,5,.63,-.7);leaf(c,67,5,.63,.7);
  }else if(id==='moon'){
    c.beginPath();c.arc(0,0,67,0,Math.PI*2);c.fill();c.fillStyle=d.base;circle(c,27,-18,58,true);
    star(c,48,-61,8);star(c,60,26,11);star(c,17,67,6);
  }else if(id==='seal'){
    c.fillStyle='#7e453a';c.strokeStyle='#7e453a';line(c,[[-16,35],[-35,89],[-5,73],[4,91],[16,39]]);
    circle(c,0,0,57,true);c.strokeStyle='#d6b680';c.fillStyle='#d6b680';circle(c,0,0,46);circle(c,0,0,35);
    c.beginPath();c.moveTo(-15,23);c.bezierCurveTo(-24,-8,-2,-25,24,-31);c.bezierCurveTo(23,-3,12,9,-15,23);c.stroke();line(c,[[-23,34],[19,-24]]);
  }else if(id==='sprout'){
    line(c,[[0,63],[0,-18],[-28,-51]]);leaf(c,0,5,.9,1.0);leaf(c,-10,-19,1,-.65);
    c.beginPath();c.moveTo(-50,44);c.quadraticCurveTo(-77,-17,-100,44);c.closePath();c.fill();line(c,[[-75,44],[-75,70]]);
    for(let i=0;i<4;i++)line(c,[[0,47],[Math.sin(i*2.4)*50,79],[Math.sin(i*2.4)*61,90]]);
  }else if(id==='masks'){
    for(const side of [-1,1]){c.save();c.translate(side*31,side*-10);c.rotate(side*.2);c.beginPath();c.moveTo(-34,-54);c.lineTo(34,-54);c.bezierCurveTo(40,26,21,60,0,67);c.bezierCurveTo(-21,60,-40,26,-34,-54);c.fill();c.strokeStyle=d.base;c.lineWidth=5;
      line(c,[[-24,-8],[-9,-11]]);line(c,[[9,-11],[24,-8]]);c.beginPath();c.moveTo(-15,25);c.quadraticCurveTo(0,25+side*23,15,25);c.stroke();c.restore();}
  }else if(id==='lyre'){
    c.beginPath();c.moveTo(-59,-67);c.bezierCurveTo(-20,-58,-58,37,-34,60);c.quadraticCurveTo(0,85,34,60);c.bezierCurveTo(58,37,20,-58,59,-67);c.stroke();
    line(c,[[-45,-45],[45,-45]]);line(c,[[-35,45],[35,45]]);
    for(const x of [-24,-12,0,12,24])line(c,[[x,-44],[x,47]]);
    circle(c,-58,-67,8,true);circle(c,58,-67,8,true);
  }else if(id==='states'){
    const colors=['#b9b6a0','#87b8c2','#c6d8cf','#ddb27e'];
    for(let i=0;i<4;i++){c.strokeStyle=colors[i];c.fillStyle=colors[i];const x=i%2?38:-38,y=i<2?-38:38;
      if(i===0){line(c,[[x-19,y-15],[x+15,y-15],[x+21,y-8],[x+21,y+19],[x-13,y+19],[x-19,y+12],[x-19,y-15]]);line(c,[[x+15,y-15],[x+15,y+12],[x-19,y+12]]);}
      else if(i===1){c.beginPath();c.moveTo(x,y-24);c.bezierCurveTo(x-36,y+19,x+32,y+35,x+18,y);c.closePath();c.stroke();}
      else if(i===2){for(let n=0;n<3;n++)ellipse(c,x+(n-1)*13,y+Math.sin(n)*13,8,7);}
      else{star(c,x,y,23);c.save();c.translate(x,y);c.rotate(.7);star(c,0,0,17);c.restore();circle(c,x,y,6,true);}
    }
  }else if(id==='paw'){
    ellipse(c,0,23,38,31,0,true);
    for(const [x,y,r,a] of [[-49,-11,16,-.5],[-19,-43,18,-.2],[20,-43,18,.2],[50,-11,16,.5]])ellipse(c,x,y,r,r*1.27,a,true);
    line(c,[[-63,75],[-26,91],[31,89],[65,67]]);
  }
  c.restore();
}

function craft(c,d,points){
  outline(c,points);c.fillStyle=d.base;c.fill();c.save();c.clip();
  // Subtle grain and tooling are baked into the face, rather than extra meshes.
  c.strokeStyle=d.edge;c.globalAlpha=.10;c.lineWidth=1;
  for(let i=0;i<32;i++)line(c,[[0,14+i*14],[350,12+i*14+Math.sin(i)*6],[710,15+i*14],[1024,13+i*14]]);
  c.globalAlpha=1;
  const grain=c.createLinearGradient(0,0,0,448);grain.addColorStop(0,'#ffffff16');grain.addColorStop(.4,'#ffffff00');grain.addColorStop(1,'#00000020');c.fillStyle=grain;c.fillRect(0,0,1024,448);
  c.restore();
  c.lineJoin='round';c.strokeStyle=d.edge;c.lineWidth=12;outline(c,points);c.stroke();
  const inner=points.map(([x,y])=>[512+(x-512)*.972,224+(y-224)*.91]);c.lineWidth=2;outline(c,inner);c.stroke();
  c.save();outline(c,points);c.clip();
  if(d.shape==='plate'){
    for(const x of [75,949])for(const y of [103,345]){c.fillStyle='#332e2b';circle(c,x+2,y+3,11,true);c.fillStyle='#dbb37b';circle(c,x,y,9,true);c.strokeStyle='#76573a';c.lineWidth=3;line(c,[[x-4,y],[x+4,y]]);}
    c.strokeStyle='#b98d5b';c.lineWidth=3;line(c,[[262,78],[894,78]]);line(c,[[262,367],[894,367]]);
  }else if(d.shape==='charter'){
    c.strokeStyle='#ab926c';c.lineWidth=2;for(const x of [65,83,942,960])line(c,[[x,73],[x,378]]);
    c.globalAlpha=.14;for(let i=0;i<8;i++)line(c,[[275,91+i*38],[909,91+i*38]]);c.globalAlpha=1;
    c.strokeStyle='#826543';c.lineWidth=3;line(c,[[293,355],[580,355],[606,343],[632,355],[905,355]]);
  }else if(d.shape==='tag'){
    c.strokeStyle='#6d7059';c.setLineDash([10,10]);c.lineWidth=3;line(c,[[256,77],[962,77],[962,371],[256,371]]);c.setLineDash([]);
    c.fillStyle='#7a6040';circle(c,64,224,11,true);c.strokeStyle='#dac296';c.lineWidth=6;circle(c,64,224,19);
    c.globalAlpha=.25;line(c,[[800,353],[855,325],[895,339],[942,294]]);c.globalAlpha=1;
  }else if(d.shape==='moon'){
    c.strokeStyle=d.edge;c.fillStyle=d.edge;c.lineWidth=2;
    for(let i=0;i<30;i++){const x=84+(i*137)%863,y=i%2?355+(i%3)*12:60+(i%3)*13;if(i%5)circle(c,x,y,1.5,true);else star(c,x,y,5);}
    c.globalAlpha=.4;for(let i=0;i<3;i++){c.beginPath();c.moveTo(235,344+i*8);c.bezierCurveTo(450,316+i*10,690,382-i*7,905,334+i*7);c.stroke();}c.globalAlpha=1;
  }else if(d.shape==='bark'||d.shape==='lozenge'){
    c.strokeStyle=d.edge;c.fillStyle=d.edge;c.lineWidth=3;
    for(const side of [-1,1]){const y=224+side*148;c.beginPath();c.moveTo(275,y);c.bezierCurveTo(450,y-side*20,740,y+side*15,930,y-side*7);c.stroke();
      for(let i=0;i<8;i++)leaf(c,302+i*81,y+Math.sin(i)*8,.32,side*(i%2?.8:2.2));}
  }else if(d.shape==='stage'){
    c.fillStyle='#8f4c60';for(const side of [-1,1]){c.beginPath();c.moveTo(side<0?30:994,75);c.lineTo(side<0?110:914,75);c.quadraticCurveTo(side<0?93:931,240,side<0?32:992,334);c.fill();}
    c.strokeStyle=d.edge;c.lineWidth=3;for(const x of [262,925]){line(c,[[x,83],[x,341]]);star(c,x,68,9);}
  }else if(d.shape==='lyre'){
    c.strokeStyle=d.edge;c.globalAlpha=.22;c.lineWidth=2;
    for(let i=0;i<5;i++)line(c,[[285,333+i*8],[906,333+i*8]]);c.globalAlpha=1;
    for(let i=0;i<5;i++){const x=318+i*131,y=347+(i%3)*7;c.fillStyle=d.edge;ellipse(c,x,y,7,5,-.4,true);line(c,[[x+7,y],[x+7,y-25]]);}
  }else if(d.shape==='states'){
    for(const [i,color] of ['#b9b6a0','#87b8c2','#c6d8cf','#ddb27e'].entries()){c.strokeStyle=color;c.lineWidth=7;const x=277+i*164;line(c,[[x,80],[x+130,80]]);line(c,[[x,368],[x+130,368]]);}
  }else if(d.shape==='timber'){
    c.strokeStyle='#634e35';c.lineWidth=3;for(const y of [109,357])line(c,[[49,y],[346,y-4],[675,y+3],[972,y-3]]);
    for(const x of [73,950])for(const y of [82,363]){c.fillStyle='#d2c193';circle(c,x,y,7,true);}
  }else if(d.shape==='time'){
    c.strokeStyle=d.edge;c.lineWidth=2;for(let i=0;i<20;i++){const x=300+i*32;line(c,[[x,82],[x,82+(i%5?7:15)]]);line(c,[[x,366],[x,366-(i%5?7:15)]]);}
  }
  c.restore();
}

function fitText(c,text,font,size,x,y,width,color,tracking=0){
  c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';
  const set=()=>{c.font=`${font.weight} ${size}px ${font.font}`;};set();
  while(c.measureText(text).width+tracking*(text.length-1)>width&&size>24){size--;set();}
  if(!tracking){c.fillText(text,x,y);return;}
  c.textAlign='left';let xx=x-(c.measureText(text).width+tracking*(text.length-1))/2;
  for(const letter of text){c.fillText(letter,xx,y);xx+=c.measureText(letter).width+tracking;}
}
export function paintGuildSign(floor,canvas){
  const d=GUILD_SIGN_DESIGNS[floor.id];if(!d)throw Error('Missing landing sign design: '+floor.id);
  canvas.width=1024;canvas.height=448;const c=canvas.getContext('2d');
  c.fillStyle=d.base;c.fillRect(0,0,1024,448);
  const points=guildSignOutline(d.shape);craft(c,d,points);emblem(c,d.icon,d);
  const center=603,width=650;
  if(d.lines){
    d.lines.forEach((name,i)=>fitText(c,name,d,d.size,center,151+i*70,width,d.ink));
    fitText(c,floor.title,{font:'"Constantia", serif',weight:'normal'},36,center,284,width,d.muted);
  }else{
    fitText(c,floor.wizard,d,d.size,center,170,width,d.ink,floor.id==='taleth'?2:0);
    fitText(c,floor.title,{font:'"Constantia", serif',weight:'normal'},39,center,247,width,d.muted);
  }
  fitText(c,floor.name,{font:'"Palatino Linotype", serif',weight:'normal'},28,center,d.lines?328:310,width,d.muted);
  // Hidden paint sample supplies the side, back and mounting brackets, so the
  // physical sign needs only the same one texture/material as its lettering.
  c.fillStyle=d.edge;c.fillRect(1018,440,6,8);
  return {design:d,points};
}
