import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { CANERD, CANERD_GARDEN } from './canerd-world.js';
import { createCanerdSacredOak } from './canerd-sacred-oak.js';

const STONE='#b5af98',DARK_STONE='#77796c',WOOD='#716044',SLATE='#586b63',GRAVEL='#c2baa0',MOSS='#71815a';
const TAU=Math.PI*2;

/** A quiet working garden inside the existing court. Paths and NPC stations
 * share CANERD_GARDEN; none of the castle's doors or stair approaches move. */
export function* createCanerdGardenSteps({parent,heightAt,colliders}) {
  const y=heightAt(CANERD.x,CANERD.z),b=createSceneryBuilder('Canerd - sacred oak garden and court craft'),solids=[];
  const at=(x,z)=>({x:CANERD.x+x,z:CANERD.z+z});
  const block=(x,z,hx,hz,h,kind='garden-stone')=>{
    const c={...at(x,z),hx,hz,minY:y,maxY:y+h,kind:'canerd-'+kind};colliders.push(c);solids.push(c);return c;
  };
  b.frame(CANERD.x,y,CANERD.z,0,()=>{
    b.box(GRAVEL,11,.081,15.5,13.5,.012,19.9);
    // A restrained enclosure: a low fitted stone wall, timber screens and a
    // roofed western entrance, rather than a second fortress inside the court.
    const wall=(x,z,length,yaw)=>b.frame(x,0,z,yaw,()=>{
      b.block(DARK_STONE,0,.06,0,length,.44,.38);
      b.box(STONE,0,.52,0,length+.12,.13,.50);
      for(let s=-length/2+.85;s<length/2;s+=1.65) {
        b.block(WOOD,s,.59,0,.11,1.06,.11);
        b.beam('#8e8061',[s-.64,.66,0],[s+.62,1.55,0],.045);
        b.beam('#8e8061',[s+.62,.66,0],[s-.64,1.55,0],.045);
      }
      b.box(WOOD,0,1.62,0,length,.12,.17);
    });
    wall(11,5.5,13.6,0);wall(11,25.5,13.6,0);wall(17.8,15.5,20,Math.PI/2);
    wall(4.2,8.85,6.7,Math.PI/2);wall(4.2,21.0,9.0,Math.PI/2);
    for(const [x,z] of [[4.2,5.5],[17.8,5.5],[17.8,25.5],[4.2,25.5],[4.2,12.2],[4.2,16.5]]) {
      b.block(DARK_STONE,x,.02,z,.65,.38,.65);b.block(STONE,x,.4,z,.42,1.70,.42);
      b.box('#d0c8ae',x,2.13,z,.65,.18,.65);b.rock(STONE,x,2.36,z,.28,.21,.28);
    }
    b.frame(4.2,0,14.35,Math.PI/2,()=>{
      for(const side of [-1,1])b.block(WOOD,side*2.15,1.9,0,.28,2.94,.34);
      b.box(WOOD,0,4.70,0,5.0,.28,.46);
      b.roof(SLATE,0,4.86,0,5.8,1.75,.66);
      for(const side of [-1,1])b.beam('#839185',[side*2.45,4.92,0],[side*2.98,5.18,0],.18);
    });
    // A shallow stone water bowl. Its dark water is contained by visible walls;
    // it does not pretend to cut a new pond into the castle's level ground.
    b.box(DARK_STONE,6.5,.22,8.0,2.25,.32,2.45);b.box('#5d7772',6.5,.395,8.0,1.85,.02,2.05);
    for(const side of [-1,1]) {
      b.box(STONE,6.5+side*1.08,.43,8.0,.22,.28,2.52);
      b.box(STONE,6.5,.43,8.0+side*1.18,2.25,.28,.20);
    }
    b.rock('#6d7869',7.35,.67,7.0,.35,.47,.30);
    b.beam('#91a6a0',[7.33,.81,7.10],[7.16,.41,7.35],.045);
    // Islands of moss and three weathered stones break the fine gravel waves.
    for(const [x,z,sx,sz] of [[11.8,8.2,1.35,.95],[10.7,24.0,1.8,.7],[14.1,17.8,.95,1.3]])
      b.rock(MOSS,x,.16,z,sx,.17,sz,.4);
    for(const [x,z,s,h] of [[11.8,8.15,.66,1.1],[12.55,8.6,.43,.63],[11.15,8.65,.38,.45],[10.65,24.15,.75,.85]])
      b.rock(x>12?'#8c9180':'#969b87',x,h*.45+.12,z,s,h*.58,s*.65,x*.3);
    for(let ring=0;ring<7;ring++)for(let j=0;j<32;j++) {
      const r=1.25+ring*.19,a=j*TAU/32,c=(j+1)*TAU/32;
      b.beam('#a69d85',[11.8+Math.sin(a)*r,.099,8.2+Math.cos(a)*r*.61],
        [11.8+Math.sin(c)*r,.099,8.2+Math.cos(c)*r*.61],.022,.008);
    }
    for(let line=0;line<9;line++)for(let step=0;step<12;step++) {
      const x=7.5+step*.55,z=22.8+line*.21;
      b.beam('#a99f87',[x,.099,z+Math.sin(x*.72)*.14],[x+.55,.099,z+Math.sin((x+.55)*.72)*.14],.022,.008);
    }
    const lantern=(x,z)=>{
      b.box(STONE,x,.15,z,.74,.22,.74);b.cylinder('#aaa58f',x,.26,z,.20,.85);
      b.box(STONE,x,1.16,z,.64,.14,.64);b.box('#bda66a',x,1.48,z,.30,.48,.30);
      for(const side of [-1,1])for(const edge of [-1,1])b.block(DARK_STONE,x+side*.23,1.22,z+edge*.23,.10,.58,.10);
      b.box(STONE,x,1.85,z,.79,.17,.79);b.cone(SLATE,x,1.91,z,.58,.38,Math.PI/4,4);
      b.rock(STONE,x,2.36,z,.14,.15,.14);
    };
    for(const [x,z] of [[5.3,10.9],[5.3,23.7],[16.7,24.0],[16.7,6.8]])lantern(x,z);
    // The bench, tools and basin make this a tended place, with a clear loop
    // around the tree for its gardener and a clear western audience position.
    for(const x of [14.4,16.0])b.block(DARK_STONE,x,.04,6.9,.35,.47,.55);
    b.box(STONE,15.2,.55,6.9,2.35,.18,.72);
    b.beam(WOOD,[15.6,.12,25.1],[15.6,2.00,25.3],.06);
    b.box(WOOD,15.6,.19,25.1,.80,.08,.09);
    for(let tooth=-3;tooth<=3;tooth++)b.block('#655b45',15.6+tooth*.11,.08,25.1,.035,.14,.045);
    b.cylinder('#83745a',14.9,.09,24.6,.27,.43);b.cylinder('#4a5145',14.9,.49,24.6,.20,.025);
    // A worked oak-leaf badge sits on the entrance post, carved into a thick
    // small timber panel. It is a physical emblem, never floating text.
    b.box('#65553e',3.94,1.38,16.5,.12,.68,.46);
    for(let lobe=0;lobe<4;lobe++)for(const side of [-1,1])
      b.rock('#b5a57b',3.86,1.16+lobe*.13,16.5+side*(.11-lobe*.014),.038,.105,.09);
    b.beam('#b5a57b',[3.85,1.03,16.5],[3.85,1.71,16.5],.025);
    // Modest castle polish stays on existing walls, above all walking routes.
    for(const side of [-1,1]) {
      b.beam(WOOD,[side*9.5,7.8,33.8],[side*9.5,7.8,35.0],.13);
      b.sheet(side<0?'#586b53':'#717e60',[side*9.5-.65,7.65,34.8],[side*9.5+.65,7.65,34.8],
        [side*9.5+.60,4.8,34.86],[side*9.5-.60,4.8,34.86]);
      b.box('#c1b27d',side*9.5,6.1,34.89,.17,1.4,.025);
      for(let j=0;j<3;j++)b.rock('#c1b27d',side*9.5+(j%2?.22:-.22),5.8+j*.32,34.91,.22,.16,.025);
    }
  });
  for(const [x,z,hx,hz] of [[11,5.5,6.8,.24],[11,25.5,6.8,.24],[17.8,15.5,.24,10],[4.2,8.85,.24,3.35],[4.2,21,.24,4.5]])block(x,z,hx,hz,1.68,'garden-screen');
  for(const [x,z] of [[4.2,5.5],[17.8,5.5],[17.8,25.5],[4.2,25.5],[4.2,12.2],[4.2,16.5]])block(x,z,.34,.34,x===4.2&&(z===12.2||z===16.5)?4.84:2.6,'garden-post');
  // Overhead collision lets the camera see the real roof while preserving the
  // full walking opening underneath it.
  const roof=block(4.2,14.35,.96,3.05,5.55,'garden-roof');roof.minY=y+4.56;
  block(6.5,8.0,1.13,1.25,.59,'garden-basin');block(15.2,6.9,1.2,.4,.65,'garden-bench');
  for(const [x,z] of [[5.3,10.9],[5.3,23.7],[16.7,24],[16.7,6.8]])block(x,z,.32,.32,2.5,'garden-lantern');
  for(const [x,z,r,h] of [[11.8,8.15,.66,1.1],[12.55,8.6,.43,.63],[10.65,24.15,.75,.85]])block(x,z,r,r*.65,h+.15);
  // Open paths are a contrasting fine stone ribbon with irregular stepping
  // flags. Their rise is below a normal walking step and needs no false floor.
  const paths=[[CANERD_GARDEN.entry,CANERD_GARDEN.approach],CANERD_GARDEN.gardenerRoute];
  for(const route of paths)for(let i=1;i<route.length;i++) {
    const a=route[i-1],c=route[i],length=Math.hypot(c.x-a.x,c.z-a.z),yaw=Math.atan2(c.x-a.x,c.z-a.z);
    yield* b.patchSteps('#aaa790',heightAt,(a.x+c.x)/2,(a.z+c.z)/2,1.5,length+.3,yaw,.105,1);
    const steps=Math.max(1,Math.ceil(length/.88));
    for(let j=0;j<steps;j++) {
      const t=(j+.5)/steps,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t;
      b.rock(j%2?'#c3c0ac':'#b5b39e',x,heightAt(x,z)+.12,z,.51,.035,.36,yaw+(j%2?.08:-.06));
    }
  }
  const mesh=yield* b.finishSteps(parent),oak=createCanerdSacredOak({parent,heightAt,colliders});
  return {mesh,sacredOak:oak,anchors:CANERD_GARDEN,metrics:{batches:1+oak.metrics.meshes,vertices:b.vertexCount+oak.metrics.vertices,colliders:solids.length+1},
    mapFeature:{id:CANERD_GARDEN.id,name:CANERD_GARDEN.name,x:CANERD.x+11,z:CANERD.z+15.5,width:13.6,depth:20,kind:'garden'}};
}
