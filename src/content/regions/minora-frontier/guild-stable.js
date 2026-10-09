import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

export const GUILD_STABLE=Object.freeze({x:-2426.5,z:60,width:11,depth:8});

// Two open stalls face the Guild Way. Bear and the existing starting horse
// remain on the clear apron; no new animals, animation or interior system.
export function* createGuildStableSteps({root,ground,push,metrics}){
  const b=createSceneryBuilder('Minora guild stable / open stalls'),{x,z}=GUILD_STABLE,y=ground(x,z);
  const wood='#6b503b',trim='#ac956e',stone='#c8c8b3',roof='#526c6b',straw='#baa16b';
  function solid(id,px,pz,w,d,h,tint=wood){
    const py=ground(px,pz);b.block(tint,px,py,pz,w,h,d);
    push({id:'guild-stable-'+id,kind:'building',x:px,z:pz,hx:w/2,hz:d/2,minY:py,maxY:py+h});
  }
  yield* b.patchSteps('#ad9e7d',ground,x,z,11,8,0,.025,4);
  solid('back',x,z-3.8,11,.3,2.9,stone);
  solid('west',x-5.3,z,.3,8,1.5,stone);
  for(const dx of [-5.25,0,5.25])for(const dz of [-3.7,3.7])solid('post-'+dx+'-'+dz,x+dx,z+dz,.25,.25,3.7);
  // The middle partition ends short of the open front for easy mounting.
  solid('partition',x,z-1,.16,5.7,1.25);
  b.roof(roof,x,y+3.7,z,12.2,9.6,1.25,Math.PI/2,wood);
  b.beam(trim,[x-5.5,y+3.5,z+3.7],[x+5.5,y+3.5,z+3.7],.26);
  for(const dx of [-2.7,2.7]){
    yield* b.patchSteps(straw,ground,x+dx,z+.3,4.4,5.8,0,.05,2);
    b.block(wood,x+dx,y,z-3,3.5,.75,.65);
    b.box(straw,x+dx,y+.76,z-3,3.25,.1,.45);
    for(const shift of [-1.3,-.65,0,.65,1.3])b.beam(trim,[x+dx+shift,y+.35,z-2.65],[x+dx+shift,y+1.2,z-3.2],.07);
  }
  solid('trough',x+5.95,z,1,2.4,.6,stone);
  b.box('#577f7c',x+5.95,ground(x+5.95,z)+.62,z,.76,.03,2.1);
  // A saddle and bridle rack, sheltered under the eave.
  b.block(wood,x-4,y,z-2,1.1,.95,.5);
  b.box('#493727',x-4,y+1.03,z-2,1.3,.28,.75);
  for(const dx of [-.45,.45])b.beam('#3c3831',[x-4+dx,y+1,z-1.7],[x-4+dx,y+.35,z-1.65],.07);
  b.box(trim,x+3,y+3,z+3.86,2.4,.5,.1);
  // Horseshoe emblem reads without a label.
  for(let i=0;i<8;i++){const a=Math.PI*.2+i*Math.PI*1.6/7;b.box('#e0c884',x+3+Math.sin(a)*.2,y+3+Math.cos(a)*.17,z+3.94,.09,.09,.04);}
  metrics.vertices+=b.vertexCount;if(yield* b.finishSteps(root))metrics.batches++;
  return {...GUILD_STABLE,id:'minora-guild-stable',name:'Guild stable',kind:'stable'};
}
