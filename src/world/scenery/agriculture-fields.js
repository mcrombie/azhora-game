import {groundPatch} from './ground-face.js';

const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const palettes={
  grain:{ground:[0xa69a60,0xb1a168,0xb5a16a],row:0xbdae74,stem:[0xc4ad6b,0xbca364,0xd1bd80]},
  hay:{ground:[0x82935c,0x8b9c63,0x929e68],row:0x9ca773,stem:[0x9da967,0xaeb574,0x8c9e59]},
  pasture:{ground:[0x839563,0x899c68,0x8e9d6c],row:0x8d9c66,stem:[0x768b4e,0x91a566,0xa0ad70]},
};

// Cut both the soil and its cultivated stripes around infrastructure. Test a
// patch's full footprint, then subdivide only its boundary; a clear field still
// uses the original merged ground mesh and exact terrain draping.
function* fieldPatch(builder,surface,tint,heightAt,x,z,width,depth,lift,cells,clearAt){
  let work=0;
  function* patch(x,z,w,d){
    if(++work%32===0)yield;
    if(clearAt(x,z,Math.hypot(w,d)/2)){
      yield* groundPatch(builder,surface,tint,heightAt,x,z,w,d,0,lift,Math.min(cells,Math.max(1,Math.ceil(Math.max(w,d)/3))));return;
    }
    if(Math.max(w,d)<=.75)return;
    if(!clearAt(x,z)&&[-1,1].every(sx=>[-1,1].every(sz=>!clearAt(x+sx*w/2,z+sz*d/2))))return;
    if(w>d){yield* patch(x-w/4,z,w/2,d);yield* patch(x+w/4,z,w/2,d);}
    else{yield* patch(x,z-d/4,w,d/2);yield* patch(x,z+d/4,w,d/2);}
  }
  yield* patch(x,z,width,depth);
}

// Ground and crop cover remain separate, merged buffers. Every blade is a
// twelve-vertex sheet so the food view can shorten it and restore it exactly.
// These are visual rows inside the authored parcel, not additional food area.
export function* agricultureField({fields,plants,surface,heightAt,field:f,index,clearAt}){
  const p=palettes[f.crop],seed=Math.abs(f.x*3.1+f.z*7.7),variant=Math.floor(random(seed)*3);
  yield* fieldPatch(fields,surface,p.ground[variant],heightAt,f.x,f.z,f.width,f.depth,.035,Math.ceil(Math.max(f.width,f.depth)/3),clearAt);
  const across=index%3===1,span=across?f.depth:f.width,length=across?f.width:f.depth;
  const at=(u,v)=>across?{x:f.x+v,z:f.z+u}:{x:f.x+u,z:f.z+v};
  // Headlands stay open for carts; alternating broad strips read as cultivated
  // land at range without covering the field in isolated trapezoid stumps.
  if(f.crop!=='pasture'){
    const strips=Math.max(2,Math.floor(span/6)),width=(span-2.8)/strips;
    for(let i=0;i<strips;i++)if(i%2===0){
      const point=at(-(span-2.8)/2+(i+.5)*width,0);
      yield* fieldPatch(fields,surface,p.row,heightAt,point.x,point.z,across?length-3:width-.3,across?width-.3:length-3,.055,3,clearAt);
    }
  }
  const spacing=f.crop==='pasture'?4.7:3.1,step=f.crop==='pasture'?4.9:2.6;
  plants.setCrop(f.crop);
  let row=0;
  for(let u=-span/2+1.8;u<span/2-1.8;u+=spacing,row++){
    let item=0;
    for(let v=-length/2+1.8;v<length/2-1.8;v+=step,item++){
      const n=seed+row*79+item*17,point=at(u+(random(n)-.5)*.6,v+(random(n+1)-.5)*.95);
      const half=f.crop==='pasture'?.58:1.48;
      if(!clearAt(point.x,point.z,half))continue;
      const {x,z}=point,grain=f.crop==='grain';
      const height=(grain?1.05:f.crop==='hay'?.65:.24)*(.8+random(n+2)*.35);
      const tint=p.stem[Math.floor(random(n+4)*3)];
      // A card contains many individual stems. Its base samples both ends so
      // the planting stays grounded on slopes instead of cutting into them.
      const left=heightAt(x-half,z)+.065,right=heightAt(x+half,z)+.065;
      const back=heightAt(x,z-half)+.065,front=heightAt(x,z+half)+.065;
      plants.sheet(tint,[x-half,left,z],[x+half,right,z],[x+half,right+height,z],[x-half,left+height,z]);
      plants.sheet(tint,[x,back,z-half],[x,front,z+half],[x,front+height,z+half],[x,back+height,z-half]);
    }
    if(row%5===0)yield 'crop cover';
  }
}
