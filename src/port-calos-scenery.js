import * as THREE from 'three';
import { createSceneryBuilder } from './scenery-builder.js';
import { PORT_CALOS_BUILDINGS, PORT_CALOS_QUAY, portCalosDeckHeight } from './port-calos-world.js';

const WOOD='#735236', DARK='#473b2c', LIGHT='#b69a68', STONE='#999b88', PALE='#c1bda3';
/** A working river port: sixteen roofs, fish market, net lofts and a stone quay. */
export function createPortCalosScenery({parent,heightAt,colliders,signs}) {
  const group=new THREE.Group(); group.name='Port Calos'; parent.add(group);
  const metrics={buildings:0,vertices:0,batches:0,colliders:0};
  const ground=(x,z)=>portCalosDeckHeight(x,z)??heightAt(x,z);
  const push=c=>{colliders.push(c);metrics.colliders++;};
  const finish=b=>{metrics.vertices+=b.vertexCount;if(b.finish(group))metrics.batches++;};
  for(const home of PORT_CALOS_BUILDINGS) {
    const b=createSceneryBuilder(home.id), w=home.width,d=home.depth,h=home.height;
    const footing=[];
    for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])
      footing.push(heightAt(home.x+dx*Math.cos(home.yaw)+dz*Math.sin(home.yaw),home.z-dx*Math.sin(home.yaw)+dz*Math.cos(home.yaw)));
    const y=Math.max(heightAt(home.x,home.z),...footing), foundationBottom=Math.min(...footing)-y-.22;

    b.frame(home.x,y,home.z,home.yaw,()=>{
      b.block(STONE,0,foundationBottom,0,w+.4,.05-foundationBottom,d+.4);
      b.block(home.wall,0,0,0,w,h,d);
      for(const sx of [-1,1])for(const sz of [-1,1])b.block(DARK,sx*(w/2-.08),0,sz*(d/2-.08),.23,h,.23);
      for(const yy of [.24,h-.16])b.box(WOOD,0,yy,d/2+.03,w,.18,.12);
      b.roof(home.roof,0,h,0,w+1,d+1,Math.min(w*.34,3),0,home.wall);
      b.box(DARK,0,1.2,d/2+.08,1.55,2.4,.14);
      b.box(WOOD,0,1.16,d/2+.17,1.27,2.22,.1);
      for(let p=-.45;p<=.45;p+=.3)b.box(LIGHT,p,1.16,d/2+.23,.025,2.12,.025);
      b.box('#c9af58',.4,1.12,d/2+.27,.11,.11,.1);
      b.box(STONE,0,.12,d/2+.65,2,.25,1.1);
      for(const sx of [-1,1]) {
        const xx=sx*w*.31;
        b.box(DARK,xx,2.5,d/2+.08,1.6,1.85,.14);
        b.box('#d9d5ac',xx,2.5,d/2+.16,1.36,1.59,.08);
        b.box(WOOD,xx,2.5,d/2+.23,.1,1.62,.08);
        b.box(WOOD,xx,2.5,d/2+.23,1.4,.1,.08);
        for(const side of [-1,1])b.box(home.roof,xx+side*.97,2.5,d/2+.16,.36,1.82,.1);
      }
      b.block(STONE,-w*.26,h-.4,-d*.24,1,3,1.1);
      b.box(PALE,-w*.26,h+2.63,-d*.24,1.25,.2,1.3);
    });
    const turned=Math.abs(Math.sin(home.yaw))>.5;
    push({x:home.x,z:home.z,hx:(turned?d:w)/2+.12,hz:(turned?w:d)/2+.12,kind:'house',width:w,depth:d,angle:home.yaw,id:home.id});
    finish(b);metrics.buildings++;
  }

  const q=PORT_CALOS_QUAY, quay=createSceneryBuilder('Port Calos quay');
  const mid=(q.minX+q.maxX)/2, length=q.maxX-q.minX, width=q.maxZ-q.minZ;
  quay.box('#757d72',mid,q.deckY-2.6,286,length,5.2,width);
  quay.box(PALE,mid,q.deckY-.14,286,length,.28,width);
  // Visible dressed courses face the inlet, with uneven joints along the water.
  for(const z of [q.minZ-.02,q.maxZ+.02])for(let x=q.minX+1;x<q.maxX;x+=3.5) {
    quay.box(STONE,x,1.2,z,3.3,.8,.12);
    quay.box(STONE,x+1.3,2.15,z,3.3,.8,.12);
  }
  for(const z of [q.minZ+.45,q.maxZ-.45])for(let x=q.minX+3;x<q.maxX-2;x+=9) {
    quay.cylinder(DARK,x,3,z,.25,.65);
    quay.box(DARK,x,3.53,z,.8,.18,.2);
    push({x,z,r:.32,kind:'port-bollard'});
  }
  // The mooring side is open; low guards protect the harbour's exposed head.
  for(const z of [280.4,291.6])for(const x of [-374,-365])quay.block(WOOD,x,3,z,.19,1,.19);
  for(const z of [280.4,291.6])quay.beam(LIGHT,[-374,3.88,z],[-365,3.88,z],.14);
  quay.beam(LIGHT,[-364.4,3.88,280.4],[-364.4,3.88,291.6],.14);
  push({x:-364.35,z:286,hx:.18,hz:6,kind:'port-quay-rail'});
  for(const z of [280.4,291.6])push({x:-369.5,z,hx:4.7,hz:.13,kind:'port-quay-rail'});
  // Crane, capstan and cargo occupy the north edge, leaving a four-metre lane.
  quay.block(DARK,-396,3,281.6,.42,5,.42);
  quay.beam(WOOD,[-396,7.7,281.6],[-389,7.7,278.2],.35);
  quay.beam(LIGHT,[-396,4.8,281.6],[-390.5,7.7,279],.22);
  quay.beam('#b7ae85',[-389,7.7,278.2],[-389,1.6,278.2],.055);
  quay.cylinder(WOOD,-397.8,3,282,.52,.7);
  quay.beam(LIGHT,[-399,3.75,282],[-396.8,3.75,282],.14);
  push({x:-396,z:281.6,r:.55,kind:'port-crane'});
  push({x:-397.8,z:282,r:.68,kind:'port-capstan'});
  for(const [x,z] of [[-420,289.8],[-402,282.2],[-384,290],[-380,290]]) {
    quay.block(LIGHT,x,3,z,1.5,1.2,1.3);
    for(const side of [-.52,.52])quay.box(DARK,x+side,3.6,z, .1,1.25,1.36);
    push({x,z,hx:.8,hz:.7,kind:'port-cargo'});
  }
  // A white daymark and small bell identify the ferry landing from the water.
  quay.block(WOOD,-373,3,282,.2,4.3,.2);
  quay.beam(WOOD,[-373,7.1,282],[-371.7,7.1,282],.18);
  quay.sheet('#e3d7a3',[-372.9,6.9,282],[-371.6,6.9,282],[-371.6,5.6,282],[-372.9,5.6,282]);
  quay.cone('#c2a255',-372.6,5.05,282,.25,.34);
  push({x:-373,z:282,r:.2,kind:'port-daymark'});
  finish(quay);

  const trade=createSceneryBuilder('Port Calos market and working waterfront');
  const barrel=(x,z)=>{const y=ground(x,z);trade.cylinder('#a08355',x,y,z,.4,.95);for(const yy of [.14,.76])trade.cylinder('#4f534b',x,y+yy,z,.414,.07);push({x,z,r:.44,kind:'port-barrel'});};
  const crate=(x,z)=>{const y=ground(x,z);trade.block(LIGHT,x,y,z,1,.8,.9);for(const side of [-.35,.35])trade.box(DARK,x+side,y+.4,z,.08,.82,.93);push({x,z,hx:.52,hz:.47,kind:'port-crate'});};
  for(const [x,z] of [[-442,302],[-442,304],[-444,302],[-432,299],[-432,301],[-514,313],[-528,314]])barrel(x,z);
  for(const [x,z] of [[-515,313],[-531,315],[-445,307],[-435,301]])crate(x,z);
  for(const [x,z,tint] of [[-459,299,'#657e80'],[-470,292,'#a88054'],[-491,307,'#92956b']]) {
    const y=ground(x,z);
    for(const dx of [-1.9,1.9])for(const dz of [-.8,.8])trade.block(WOOD,x+dx,y,z+dz,.11,2.5,.11);
    trade.box(LIGHT,x,y+.9,z,4,.15,1.8);
    trade.roof(tint,x,y+2.4,z,4.6,2.4,.6);
    for(let i=0;i<6;i++){trade.rock(i%2?'#b4bc9b':'#cdcab0',x-1.5+i*.57,y+1.06,z,.12,.08,.37);}
    push({x,z,hx:2.08,hz:.96,kind:'port-stall'});
  }
  // Nets dry on open frames on the river side of the customs house.
  for(const [x,z] of [[-451,268],[-460,267]]){
    const y=ground(x,z);
    for(const dx of [-2,2])trade.block(WOOD,x+dx,y,z,.12,2.5,.12);
    trade.beam(WOOD,[x-2,y+2.4,z],[x+2,y+2.4,z],.12);
    for(let i=0;i<9;i++)trade.beam('#858e70',[x-1.8+i*.45,y+.45,z],[x-1.8+i*.45,y+2.25,z],.028);
    for(let i=0;i<5;i++)trade.beam('#858e70',[x-1.8,y+.45+i*.45,z],[x+1.8,y+.45+i*.45,z],.028);
    push({x,z,hx:2.15,hz:.14,kind:'port-net-rack'});
  }
  // Boatwright's keel and ribs: a hull under repair, not a decorative filled box.
  const sx=-422,sz=309,sy=ground(sx,sz);
  trade.beam(DARK,[sx-5,sy+.38,sz],[sx+5,sy+.38,sz],.3);
  for(let i=-4;i<=4;i+=1.3){
    const span=(1-Math.abs(i)/7)*1.4;
    trade.beam(WOOD,[sx+i,sy+.35,sz],[sx+i,sy+1.4,sz-span],.16);
    trade.beam(WOOD,[sx+i,sy+.35,sz],[sx+i,sy+1.4,sz+span],.16);
  }
  for(const dz of [-1,1])trade.beam(LIGHT,[sx-4.8,sy+1.1,sz+dz*.6],[sx+4.8,sy+1.1,sz+dz*.6],.12);
  push({x:sx,z:sz,hx:5.2,hz:1.6,kind:'port-boat-repair'});
  // A public well and bench make the square a place people actually use.
  const wx=-490,wz=296,wy=ground(wx,wz);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;trade.box(STONE,wx+Math.sin(a)*.8,wy+.55,wz+Math.cos(a)*.8,.7,1.1,.45,a);}
  for(const dx of [-1.3,1.3])trade.block(WOOD,wx+dx,wy,wz,.15,2.9,.15);
  trade.beam(WOOD,[wx-1.5,wy+2.8,wz],[wx+1.5,wy+2.8,wz],.18);
  trade.beam('#b7ae85',[wx,wy+2.8,wz],[wx,wy+.3,wz],.04);
  push({x:wx,z:wz,r:1.2,kind:'port-well'});
  for(const [x,z] of [[-511,297],[-485,327]]){
    const y=ground(x,z);trade.box(WOOD,x,y+.55,z,3,.15,.8);
    for(const dx of [-1.15,1.15])trade.block(DARK,x+dx,y,z,.18,.5,.6);
    push({x,z,hx:1.6,hz:.5,kind:'port-bench'});
  }
  finish(trade);
  signs?.place({x:-559,z:319,label:'Port Calos',facing:-Math.PI/2,parent:group});
  signs?.place({x:-424,z:304,label:'The Quay',facing:-Math.PI/2,parent:group});
  return {group,metrics,quay:PORT_CALOS_QUAY};
}
