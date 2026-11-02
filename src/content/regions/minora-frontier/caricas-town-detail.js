import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {cityLantern,cityMedallion,flowerBox,stripedAwning} from '../../../world/scenery/city-detail.js';

export const CARICAS_PALETTE={stone:'#aa9d86',wall:'#ded4b7',trim:'#eee1c3',timber:'#69513b',wood:'#69513b',
  roof:'#6c7a76',dark:'#303e3c',red:'#9a3937',gold:'#c5a05a',metal:'#454b46',
  shutter:'#638579',cloth:'#638579',pot:'#a06a4e',leaf:'#4f713e',leafLight:'#789458',flower:'#e1bd6c'};

/** Details stay attached to the eight existing solids: no new door colliders or AI. */
export function caricasFacade(b,house,y,index){
  const p=CARICAS_PALETTE,{x,z,w,d,h,kind}=house,toward=x<-2092?1:-1;
  b.block(p.stone,x,y+.12,z,w+.16,.46,d+.16);
  b.block(p.trim,x,y+h-.24,z,w+.36,.28,d+.36);
  // Street faces are the long eaves, not the gables. Give them actual windows.
  b.frame(x+toward*(w/2+.075),y,z,toward*Math.PI/2,()=>{
    for(const xx of [-d*.29,d*.29])for(const yy of [1.15,h-2.1]){
      b.block(p.trim,xx,yy-.16,0,1.64,1.72,.17);
      b.block(p.dark,xx,yy,.11,1.24,1.35,.08);
      b.block('#8fa7a2',xx,yy+.08,.16,1.04,1.17,.035);
      b.block(p.trim,xx,yy+.04,.19,.075,1.26,.07);
      b.block(p.trim,xx,yy+.62,.19,1.14,.075,.07);
      b.block(p.stone,xx,yy-.17,.14,1.86,.16,.42);
      for(const side of [-1,1]){
        b.block(p.shutter,xx+side*1.02,yy-.02,.08,.53,1.42,.13);
        for(const at of [.18,1.09])b.block(p.dark,xx+side*1.02,yy+at,.16,.47,.07,.045);
      }
      if(index%2===0&&yy>2)flowerBox(b,p,xx,yy-.44,.39,1.5);
    }
    for(const side of [-1,1])b.block(p.trim,side*1.06,0,.02,.24,2.85,.27);
    b.block(p.trim,0,2.7,.02,2.38,.27,.27);
    for(let i=0;i<6;i++)b.block(i%2?p.wood:'#775d44',(i-2.5)*.24,.14,.12,.22,2.35,.065);
    for(const yy of [.67,1.9])b.block(p.metal,0,yy,.17,1.39,.075,.04);
    b.block(p.gold,.48,1.28,.19,.09,.2,.09);
    stripedAwning(b,{...p,cloth:index%3===0?'#a46a4b':p.cloth},0,3.12,.02,2.8,1.4);
    b.beam(p.metal,[-1.45,2.7,0],[-1.45,2.7,.6],.1);
    cityLantern(b,p,-1.45,1.95,.58,.65);
    if(kind==='granary')cityMedallion(b,p,0,5.85,.14,.69,'reed');
  });
  // Gable braces, shutters and ridge caps break up the plain box silhouette.
  for(const side of [-1,1])b.frame(x,y,z+side*(d/2+.09),side<0?Math.PI:0,()=>{
    b.beam(p.timber,[-w/2,h,0],[0,h+1.96,0],.17);
    b.beam(p.timber,[0,h+1.96,0],[w/2,h,0],.17);
    b.beam(p.timber,[0,h,0],[0,h+1.96,0],.15);
    for(const xx of [-w*.28,w*.28])for(const yy of [1.3,h-2.05]){
      b.block(p.trim,xx,yy-.16,.08,1.74,.17,.33);
      for(const s of [-1,1])b.block(p.shutter,xx+s*.94,yy,.08,.39,1.43,.14);
    }
  });
  b.beam(p.stone,[x,y+h+2.12,z-d/2-.5],[x,y+h+2.12,z+d/2+.5],.23);
  const cx=x-w*.28,cz=z+d*.2,cy=y+h+.75;
  b.block(p.stone,cx,cy,cz,.85,2.4,.9);b.block(p.trim,cx,cy+2.22,cz,1.09,.24,1.13);
  b.block(p.dark,cx,cy+2.46,cz,.59,.04,.62);
  if(kind==='granary'){
    const roofY=y+h+1.9;
    b.block(p.trim,x,roofY,z,2.7,.32,2.7);
    b.block(p.wall,x,roofY+.32,z,2.12,2.18,2.12);
    for(let side=0;side<4;side++)b.frame(x,roofY+.32,z,side*Math.PI/2,()=>{
      b.block(p.dark,0,.32,1.075,1.24,1.47,.045);
      for(let i=0;i<5;i++)b.block(p.shutter,0,.42+i*.27,1.13,1.38,.12,.16);
      for(const xx of [-.94,.94])b.block(p.trim,xx,0,1.08,.17,2.18,.14);
    });
    b.block(p.trim,x,roofY+2.47,z,2.6,.25,2.6);
    b.cone(p.roof,x,roofY+2.72,z,2.08,1.3,Math.PI/4,4);
    b.beam(p.metal,[x,roofY+3.9,z],[x,roofY+4.8,z],.075);
    b.beam(p.gold,[x-.48,roofY+4.5,z],[x+.55,roofY+4.5,z],.085);
    b.sheet(p.gold,[x+.48,roofY+4.7,z],[x+.87,roofY+4.5,z],[x+.48,roofY+4.3,z],[x+.58,roofY+4.5,z]);
  }
}

// All new ground-level solids are south of the opening combat staging area.
// The court's centre, roads and the three residents' shelter routes stay open.
export const CARICAS_FURNISHINGS=[
  {id:'caricas-court-lime-west',type:'tree',x:-2110,z:267,r:1.18},
  {id:'caricas-court-lime-east',type:'tree',x:-2074,z:268,r:1.18},
  {id:'caricas-south-lime-west',type:'tree',x:-2107,z:291,r:1.18},
  {id:'caricas-south-lime-east',type:'tree',x:-2077,z:292,r:1.18},
  {id:'caricas-market-well',type:'well',x:-2110,z:295.5,r:1.3}
];
function limeTree(b,p,x,y,z,index){
  b.cylinder(p.stone,x,y-.08,z,1.1,.53);b.cylinder(p.trim,x,y+.45,z,1.18,.16);
  b.cylinder('#665841',x,y+.59,z,.98,.025);

}
export function* caricasCourtDetail({parent,kit:b,earth,heightAt,colliders}){
  const p=CARICAS_PALETTE,trees=[];
  for(const [index,item] of CARICAS_FURNISHINGS.entries()){
    yield;const {x,z}=item,y=heightAt(x,z);
    if(item.type==='tree'){
      limeTree(b,p,x,y,z,index);
      trees.push({id:item.id+'-tree',species:'small-leaved-lime',region:'Caricas',x,z,y:y+.61,height:7,crownRadius:2.8,trunkRadius:.23,
        harvestable:false,protectedReason:'A planted town tree.',rotation:index*.4});
    }
    else{
      b.cylinder(p.stone,x,y-.05,z,1.24,.82);b.cylinder(p.dark,x,y+.78,z,.91,.035);
      // Segmented coping leaves an actual dark opening.
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4;b.box(p.trim,x+Math.sin(angle)*1.08,y+.88,z+Math.cos(angle)*1.08,.81,.23,.34,angle);
      }
      for(const side of [-1,1])b.block(p.wood,x+side*1.05,y,z,.2,2.8,.2);
      b.roof(p.roof,x,y+2.77,z,3,2.3,.8);b.beam(p.wood,[x-1.16,y+2.3,z],[x+1.16,y+2.3,z],.16);
      b.beam('#a99772',[x,y+2.3,z],[x,y+.82,z],.045);
    }
    colliders.push({id:item.id,x,z,r:item.r,minY:y-.15,maxY:y+(item.type==='tree'?.62:3.6),kind:'prop'});
  }
  yield* createSpeciesTreesSteps({parent,colliders,trees,chunkSize:512,name:'Caricas small-leaved limes'});
}

export function caricasMarketStall(b,x,y,z,index){
  const p=CARICAS_PALETTE,cloth=index?'#a46a4b':p.cloth;
  for(const side of [-1,1])b.block(p.wood,x+side*2,y,z,.16,2.8,.16);
  // Six canvas strips on each slope, with a hanging front valance.
  for(let i=0;i<6;i++){
    const x0=x-2.7+i*.9,x1=x0+.9,c=i%2?cloth:p.trim;
    for(const side of [-1,1])b.sheet(c,[x0,y+3.36,z],[x1,y+3.36,z],[x1,y+2.8,z+side*1.6],[x0,y+2.8,z+side*1.6]);
    b.sheet(c,[x0,y+2.8,z+1.6],[x1,y+2.8,z+1.6],[x1,y+2.55,z+1.6],[x0,y+2.55,z+1.6]);
  }
  b.block(p.wood,x,y+.75,z,4.4,.18,1.4);
  for(let n=0;n<4;n++){
    const xx=x-1.53+n*1.02;
    b.block('#967449',xx,y+.91,z,.86,.12,1.1);
    for(const side of [-1,1]){b.block(p.wood,xx+side*.44,y+.98,z,.07,.23,1.1);b.block(p.wood,xx,y+.98,z+side*.55,.95,.23,.07);}
    for(let k=0;k<5;k++)b.rock(index?'#caad63':['#b77946','#738747','#b04e3e','#c2a461'][n],xx+(k%2-.5)*.3,y+1.23,z+(Math.floor(k/2)-1)*.3,.18,.17,.2);
  }
}
