import * as THREE from 'three';
import { FAMILY_HOMES, homePoint } from './family-homes.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';

const cloth=['#c16679','#dabd6a','#5e9b95','#8b73a7','#d89558'];
function labelMaterial(text){
  if(typeof document==='undefined')return new THREE.MeshStandardMaterial({color:'#f0dfb8'});
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=144;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#efdfb7';ctx.fillRect(0,0,768,144);ctx.strokeStyle='#72523d';ctx.lineWidth=8;ctx.strokeRect(5,5,758,134);
  ctx.fillStyle='#343c32';ctx.font=`bold ${text.length>19?47:59}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,75);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map:texture,roughness:.9,side:THREE.DoubleSide});
}

/** Personalize existing cottages without duplicating houses or creating NPCs. */
export function createFamilyHomeScenery({parent,heightAt,colliders,movingGroups}){
  const root=new THREE.Group();root.name='Drent family homes';parent.add(root);const roots=new Map();
  for(const home of FAMILY_HOMES){
    const group=new THREE.Group();group.name=`${home.name} home`;group.userData.homeId=home.id;root.add(group);roots.set(home.id,group);movingGroups?.add(group);
    const b=createSceneryBuilder(`${home.name} home details`),h=home.house,y=home.buildingId?Math.min(heightAt(h.x,h.z),heightAt(h.x+h.width/2,h.z),heightAt(h.x-h.width/2,h.z),heightAt(h.x,h.z+h.depth/2),heightAt(h.x,h.z-h.depth/2)):heightAt(h.x,h.z),face=h.depth/2+.32;
    const yardY=(x,z)=>{const p=homePoint(home,x,z);return heightAt(p.x,p.z)-y;};
    const mat=(tint,x,z,width,depth)=>{
      const corner=(dx,dz)=>[x+dx,yardY(x+dx,z+dz)+.05,z+dz];
      b.sheet(tint,corner(-width/2,-depth/2),corner(width/2,-depth/2),corner(width/2,depth/2),corner(-width/2,depth/2));
    };
    b.frame(h.x,y,h.z,h.yaw,()=>{
      if(home.style==='hippie'){
        // Uneven bright fabric, hanging beads, mismatched cushions and toys.
        for(let i=0;i<13;i++){const x=-h.width*.46+i*h.width*.92/12,drop=.18+Math.sin(i*.8)*.09;
          b.sheet(cloth[i%5],[x-.2,h.height+.25,face],[x+.2,h.height+.25,face],[x+.08,h.height-.22-drop,face+.08],[x-.08,h.height-.22-drop,face+.08]);}
        for(const side of [-1,1])for(let i=0;i<7;i++)b.rock(cloth[(i+2)%5],side*.7,2.35-i*.23,face+.07,.04,.07,.04);
        for(let i=0;i<5;i++)b.box(cloth[i%5],-h.width*.32+(i%2)*.5,.28+(i%2)*.11,face+.8+Math.floor(i/2)*.4,.68,.18,.48,i*.73);
        for(let i=0;i<4;i++)b.box(cloth[(i+1)%5],h.width*.31+(i%2)*.22,.13,face+.7+Math.floor(i/2)*.25,.2,.22,.2,i*.8);
        b.cylinder('#8b6244',h.width*.36,.04,face+1.2,.26,.18);b.cylinder('#8faebb',h.width*.36,.21,face+1.2,.21,.015);
        b.box('#6b887e',0,.03,face+.8,1.5,.04,.7,0);
      }else if(home.style==='orderly'){
        for(const side of [-1,1]){b.box('#edf0d0',side*.69,1.52,face,.11,2.37,.11);b.block('#5e7357',side*h.width*.36,.0,face+.7,.65,.38,.65);
          for(let i=0;i<5;i++)b.rock('#557446',side*h.width*.36+Math.sin(i*2.4)*.2,.68,face+.7+Math.cos(i*2.4)*.2,.22,.27,.22);}
        b.box('#416477',0,.035,face+1.0,1.5,.06,.68);b.box('#c6b99d',0,.12,face+.55,1.65,.15,.55);
        for(let i=0;i<5;i++)b.cylinder('#74513a',h.width*.32+i*.12,.1,face+.15,.045,.58);
      }else if(home.style==='hearth'){
        for(const side of [-1,1]){b.box('#435055',side*.69,1.43,face,.12,2.35,.12);for(let i=0;i<3;i++)b.rock('#bd9860',side*.69,.6+i*.72,face+.07,.048,.048,.028);}
        b.beam('#435055',[1.55,2.45,face],[1.55,2.45,face+.65],.055);
        b.box('#b9764a',1.55,2.0,face+.6,.38,.53,.34);b.box('#ead79b',1.55,2.0,face+.79,.22,.35,.035);b.roof('#6d5244',1.55,2.28,face+.6,.46,.4,.16);
        for(let i=0;i<6;i++)b.cylinder('#906c45',-h.width*.35+(i%3)*.24,.12+Math.floor(i/3)*.18,face+.65,.12,.4);
        mat('#9d654e',0,face+1.05,1.3,.62);
      }else if(home.style==='garden'){
        for(const side of [-1,1]){const bx=side*h.width*.36,ground=yardY(bx,face+.9);b.block('#856646',bx,ground,face+.9,1.3,.3,.7);b.box('#493c2e',bx,ground+.32,face+.9,1.2,.025,.6);
          for(let i=0;i<5;i++)b.rock(i%2?'#76964b':'#537c45',bx-.42+i*.21,ground+.48,face+.9,.17,.22,.18);}
        const birdX=h.width*.5+.7,birdZ=face+.1,birdY=yardY(birdX,birdZ);
        b.block('#907448',birdX,birdY,birdZ,.12,2.1,.12);b.block('#7d9a8b',birdX,birdY+2.03,birdZ,.5,.47,.46);b.roof('#b38b56',birdX,birdY+2.49,birdZ,.65,.58,.24);
        b.rock('#343f34',birdX,birdY+2.29,birdZ+.24,.09,.09,.02);
        mat('#d2b96d',0,face+.8,1.35,.6);
      }else{
        // Waxing-moon charms and bundles of harmless herbs, no blood-god imagery.
        for(let i=0;i<8;i++){const a=(i+1)/10*Math.PI*1.6;b.rock('#cdc6a0',Math.cos(a)*.27,2.7+Math.sin(a)*.27,face+.04,.1,.1,.035);}
        for(const side of [-1,1])for(let i=0;i<3;i++)b.beam('#8d8861',[side*1.1+i*.13,2.6,face+.12],[side*1.1+i*.13,2.14-i*.08,face+.12],.045);
        for(const side of [-1,1])for(let i=0;i<4;i++)b.rock(i%2?'#728564':'#9f997b',side*(h.width*.4+.2),.12+i*.22,face+.2,.4-i*.045,.17,.3-i*.025,i);
        for(let i=0;i<3;i++){b.cylinder('#856047',h.width*.35,.02,face+.8+i*.35,.22,.35);b.rock('#60724d',h.width*.35,.48,face+.8+i*.35,.28,.23,.25);}
      }
    });
    const mail=home.mailbox,ground=heightAt(mail.x,mail.z),tint=home.style==='hippie'?'#a579a7':home.style==='orderly'?'#416477':home.style==='hearth'?'#ac704d':home.style==='garden'?'#76916d':'#776989';
    b.frame(mail.x,ground,mail.z,mail.yaw,()=>{
      b.block('#72553e',0,0,0,.14,1.15,.14);b.box('#937249',0,1.12,0,1.22,.09,.58);b.block(tint,0,1.15,0,1.12,.47,.5);b.roof('#465447',0,1.62,0,1.31,.65,.2);
      b.box('#414036',0,1.51,.262,.55,.027,.018);
      if(home.style==='hippie')for(let i=0;i<3;i++)b.box('#eadcaf',-.35+i*.23,1.72+i*.035,.08,.27,.18,.03,0,0,.18-i*.13);
      if(home.style==='orderly')b.rock('#d2b56a',.46,1.31,.269,.043,.055,.025);
    });
    b.finish(group);
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(1.02,.195),labelMaterial(mail.name));plate.name=`${mail.name} mailbox nameplate`;plate.userData.label=mail.name;
    plate.position.set(mail.x+Math.sin(mail.yaw)*.266,ground+1.31,mail.z+Math.cos(mail.yaw)*.266);plate.rotation.y=mail.yaw;group.add(plate);
    colliders.push({x:mail.x,z:mail.z,r:.42,kind:'family-mailbox',homeId:home.id});
    group.traverse(object=>{if(object.isMesh)object.userData.passable=true;});
  }
  return{root,homes:FAMILY_HOMES,roots};
}
