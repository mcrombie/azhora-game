import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

// Metres, with +Z forward. Each species has a merged body, articulated head and
// shared leg/wing geometry, so a whole nearby herd needs only three draw calls.
const PROFILES={
  'american-bison':{coat:'#4c3326',head:'#35271f',leg:.83,body:1.27,w:.59,d:1.04,neck:1.08,muzzle:.48,hip:.68,foot:.14},
  'moose':{coat:'#514137',head:'#564638',leg:1.35,body:1.77,w:.43,d:1.13,neck:1.75,muzzle:.48,hip:.77,foot:.115},
  'elk':{coat:'#98734d',head:'#5b4430',leg:1.03,body:1.38,w:.36,d:.86,neck:1.49,muzzle:.30,hip:.60,foot:.095},
  'white-tailed-deer':{coat:'#a68561',head:'#a3825c',leg:.74,body:.98,w:.26,d:.65,neck:1.08,muzzle:.23,hip:.44,foot:.07},
  'american-black-bear':{coat:'#292a27',head:'#30312c',leg:.46,body:.80,w:.43,d:.74,neck:.85,muzzle:.25,hip:.49,foot:.14},
  'gray-wolf':{coat:'#8c8e84',head:'#a3a79a',leg:.51,body:.75,w:.22,d:.61,neck:.81,muzzle:.26,hip:.42,foot:.075},
  'red-fox':{coat:'#ad582e',head:'#bd6a38',leg:.28,body:.42,w:.14,d:.39,neck:.49,muzzle:.20,hip:.28,foot:.045},
  'raccoon':{coat:'#737871',head:'#989b90',leg:.16,body:.30,w:.18,d:.33,neck:.32,muzzle:.13,hip:.21,foot:.05},
  'north-american-beaver':{coat:'#664b35',head:'#75563b',leg:.16,body:.34,w:.25,d:.46,neck:.36,muzzle:.16,hip:.25,foot:.065},
  'north-american-river-otter':{coat:'#5b4d3e',head:'#79664f',leg:.12,body:.25,w:.14,d:.48,neck:.29,muzzle:.14,hip:.31,foot:.045},
  'wild-turkey':{coat:'#514235',head:'#8e706e',leg:.31,body:.57,w:.26,d:.36,neck:.83,muzzle:.09,hip:0,foot:.025,bird:true},
  'bald-eagle':{coat:'#42382e',head:'#e5e2ce',leg:.14,body:.29,w:.17,d:.34,neck:.43,muzzle:.12,hip:0,foot:.025,bird:true,flight:true},
};
export const sanctuaryAnimalProfile=id=>PROFILES[id];
export function buildSanctuaryAnimal(id){
  const p=PROFILES[id];if(!p)throw Error('Unknown sanctuary animal '+id);
  const body=createSceneryBuilder(id+' body'),head=createSceneryBuilder(id+' head'),leg=createSceneryBuilder(id+' leg');
  const hooved=['american-bison','moose','elk','white-tailed-deer'].includes(id),canid=id==='gray-wolf'||id==='red-fox';
  body.rock(p.coat,0,p.body,0,p.w,p.bird?.27:p.w*.84,p.d);
  body.rock(p.coat,0,p.body+.03,p.d*.59,p.w*.88,p.w*.96,p.d*.48);
  if(!p.bird)for(const side of [-1,1])for(const fore of [-1,1])
    body.rock(p.coat,side*p.w*.68,(p.body+p.leg)/2,fore*p.hip,p.foot*1.5,(p.body-p.leg)*.8+.09,p.foot*1.7);
  const hz=p.d*.80,hy=p.neck;
  head.rock(p.head,0,.13,.10,p.w*.57,p.w*.6,p.w*.7);
  head.rock(id==='american-black-bear'?'#9c8b67':p.head,0,.04,p.muzzle,p.w*.39,p.w*.32,p.muzzle*.65);
  head.rock('#292a25',0,.075,p.muzzle*1.53,p.w*.26,p.w*.15,p.w*.13);
  for(const side of [-1,1]){
    head.rock('#171e19',side*p.w*.45,.20,p.w*.46,.022,.023,.022);
    head.rock('#d4cbac',side*p.w*.46,.208,p.w*.48,.006,.006,.006);
    if(!p.bird){
      const round=id==='american-black-bear'||id==='raccoon'||id.includes('beaver')||id.includes('otter');
      const earY=.13+p.w*.55;
      head.rock(p.coat,side*p.w*.53,earY,0,p.w*.26,round?p.w*.22:p.w*.48,p.w*.16,side*.5);
      head.rock(round?'#6d655a':'#baaa87',side*p.w*.54,earY+.01,.02,p.w*.15,round?p.w*.12:p.w*.27,.025,side*.5);
    }
  }
  if(hooved){
    body.rock(p.head,0,(p.body+hy)/2,hz*.92,p.w*.70,.38,p.w*.74);
    for(const side of [-1,1]){
      leg.rock(p.coat,0,-p.leg*.24,0,p.foot*.70,p.leg*.28,p.foot*.9);
      leg.beam(p.head,[0,-p.leg*.28,0],[.01,-p.leg+.11,.025],p.foot*.6);
      leg.block('#35382e',side*p.foot*.26,-p.leg,.04,p.foot*.48,.11,p.foot*1.55);
    }
  }else if(!p.bird){
    leg.rock(p.coat,0,-p.leg*.39,0,p.foot*.95,p.leg*.50,p.foot*1.2);
    leg.rock(canid?'#3a352b':p.coat,0,-p.leg+.035,.065,p.foot,.055,p.foot*1.75);
    for(let i=-1;i<=1;i++)leg.rock('#3c3b30',i*p.foot*.4,-p.leg+.025,p.foot*1.65,.014,.018,.024);
  }else{
    leg.beam('#b6a270',[0,0,0],[0,-p.leg,0],.028);
    for(const side of [-1,0,1])leg.beam('#c5ae75',[0,-p.leg,0],[side*.055,-p.leg,.10],.015);
  }
  if(id==='american-bison'){
    body.rock('#493327',0,1.61,.36,.53,.55,.63);
    for(let i=0;i<8;i++)body.rock(i%2?'#392b22':'#604532',Math.sin(i*2.4)*.43,1.04+(i%3)*.18,.7+Math.cos(i*2.4)*.24,.20,.28,.21);
    head.rock('#392b22',0,-.15,.21,.22,.37,.21);
    for(const side of [-1,1]){head.beam('#d6d0b3',[side*.25,.24,0],[side*.44,.39,.05],.09);head.beam('#544d3e',[side*.44,.39,.05],[side*.48,.57,.10],.05);}
  }
  if(['moose','elk','white-tailed-deer'].includes(id))for(const side of [-1,1]){
    const size=id==='moose'?.9:id==='elk'?1.0:.53;
    head.beam('#b7aa88',[side*.15,.32,-.08],[side*.39,.32+size*.4,-.22],.055);
    if(id==='moose'){
      head.rock('#a69d7d',side*.56,.67,-.16,.36,.13,.32,side*.3);
      for(let i=0;i<5;i++)head.beam('#c3b68f',[side*(.35+i*.10),.71,-.36+i*.10],[side*(.40+i*.13),.88+(i%2)*.1,-.43+i*.12],.04);
      head.rock('#46392e',0,-.19,.18,.08,.20,.09);
    }else for(let i=0;i<4;i++){
      const a=[side*(.20+i*.09),.38+i*size*.20,-.12-i*.09],b=[side*(.29+i*.09),.38+(i+1)*size*.20,-.21-i*.09];
      head.beam('#c9bb92',a,b,.045-i*.007);head.beam('#c9bb92',a,[a[0]+side*.09,a[1]+.20,a[2]+.20],.025);
    }
  }
  if(id==='elk')body.rock('#d1b88d',0,p.body,-p.d*.76,p.w*.87,.28,.17);
  if(id==='white-tailed-deer'){
    body.rock('#dcd8c3',0,p.body-.18,.08,.18,.10,.50);
    body.rock('#e1dfd0',0,p.body+.20,-p.d*.88,.11,.23,.09);
    head.rock('#e1ddc8',0,-.07,.19,.12,.08,.12);
  }
  if(canid){
    body.rock(id==='red-fox'?'#eee0bd':'#c2c4b7',0,p.body-.08,p.d*.72,p.w*.70,p.w*.85,.22);
    body.rock(p.coat,0,p.body-.09,-p.d*1.25,p.w*.58,.14,p.d*.56);
    body.rock(id==='red-fox'?'#e2d8b8':'#5e655e',0,p.body-.18,-p.d*1.61,.08,.10,p.d*.24);
  }
  if(id==='raccoon'){
    for(const side of [-1,1])head.rock('#292f2b',side*.07,.17,.12,.075,.048,.04);
    for(let i=0;i<6;i++)body.rock(i%2?'#393d36':'#989b86',0,.21-i*.014,-.30-i*.075,.075,.075,.07);
  }
  if(id.includes('beaver')){
    body.rock('#443e33',0,.08,-.69,.16,.042,.31);
    for(let i=0;i<4;i++)body.beam('#645847',[-.11,.12,-.49-i*.09],[.11,.12,-.55-i*.09],.013);
    head.block('#d4b287',0,-.055,.23,.07,.075,.025);
  }
  if(id.includes('otter')){
    body.rock('#584a3b',0,.23,-.56,.10,.09,.32);body.rock('#615343',0,.20,-.82,.055,.055,.19);
    head.rock('#b0a089',0,-.04,.15,.10,.055,.09);
    for(const side of [-1,1])for(let i=0;i<3;i++)head.beam('#d5c9a8',[side*.08,.02,.19],[side*.20,.02+i*.012,.20-i*.02],.006);
  }
  let wing=null;
  if(p.bird){
    body.rock(id==='bald-eagle'?'#e5e0c9':'#785f43',0,p.body-.06,-p.d*.98,.16,.045,.23);
    head.beam('#c4a254',[0,.10,.13],[0,.06,.30],.075);head.rock('#b7a05f',0,.035,.28,.045,.045,.055);
    if(id==='wild-turkey'){
      body.beam('#968b82',[0,.60,.21],[0,.94,.27],.08);
      head.rock('#b64d48',0,.03,.16,.048,.16,.035);
      for(let i=0;i<11;i++){
        const a=(i-5)*.17,tip=[Math.sin(a)*.45,.57+Math.cos(a)*.55,-.48];
        body.beam(i%2?'#6a5540':'#3d3c32',[0,.52,-.23],tip,.085,.035);
        body.rock('#c5ad7c',tip[0],tip[1],tip[2],.045,.055,.025);
      }
      for(const side of [-1,1])for(let i=0;i<5;i++)body.rock(i%2?'#aaa38a':'#51483b',side*.22,.53-i*.027,-.05+i*.07,.05,.05,.17);
    }else{
      wing=createSceneryBuilder('bald eagle wing');
      for(const side of [-1,1]){
        wing.sheet('#493d31',[0,0,.12],[side*.55,.04,.16],[side*.94,-.04,-.15],[side*.15,0,-.27]);
        for(let i=0;i<6;i++)wing.beam(i%2?'#514438':'#342f2a',[side*(.38+i*.09),0,-.08],[side*(.53+i*.11),-.035,-.42-i*.025],.09,.02);
      }
    }
  }
  const geometry=b=>{const holder=new THREE.Group(),mesh=b.finish(holder,{castShadow:false});return mesh.geometry;};
  return {body:geometry(body),head:geometry(head),leg:geometry(leg),wing:wing?geometry(wing):null,profile:p,headAt:{y:hy,z:hz}};
}
