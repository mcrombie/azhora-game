import * as THREE from 'three';
import {createSceneryBuilder} from './scenery-builder.js';

let material;
const tileSize=256,atlasWidth=tileSize*3;
function cropMaterial(){
  if(material)return material;
  // Three small silhouette tiles: ears of grain, hay, pasture grass. A single
  // shared cutout atlas gives many stems per card without an object per stem.
  // Generated as data rather than canvas so scenery builds stay headless-safe.
  const size=tileSize,width=atlasWidth,data=new Uint8Array(width*size*4);
  // White transparent texels prevent dark fringes when silhouettes are filtered.
  for(let i=0;i<data.length;i+=4)data[i]=data[i+1]=data[i+2]=255;
  function dot(tile,x,y,r=1){
    const scale=tileSize/128;x*=scale;y*=scale;r*=scale;
    for(let yy=Math.max(0,Math.floor(y-r));yy<=Math.min(size-1,Math.ceil(y+r));yy++)for(let xx=Math.max(0,Math.floor(x-r));xx<=Math.min(size-1,Math.ceil(x+r));xx++){
      if((xx-x)**2+(yy-y)**2>(r+.4)**2)continue;
      const at=(yy*width+tile*size+xx)*4;data[at+3]=255;
    }
  }
  function line(tile,x,y,xx,yy,r){
    const steps=Math.ceil(Math.hypot(xx-x,yy-y));
    for(let n=0;n<=steps;n++)dot(tile,x+(xx-x)*n/Math.max(1,steps),y+(yy-y)*n/Math.max(1,steps),r);
  }
  for(let tile=0;tile<3;tile++)for(let i=0;i<15;i++){
    const x=5+i*8.1,top=72+((i*17+tile*13)%43),lean=((i*7)%11)-5;
    line(tile,x,0,x+lean,top,.7);
    if(tile===0){
      for(let n=0;n<5;n++)for(const side of [-1,1]){
        const y=top-3-n*3.3;
        line(tile,x+lean,y-2,x+lean+side*2.1,y+1.3,1);
      }
      line(tile,x+lean,top-3,x+lean,top+5,.55);
    }
    for(const side of [-1,1]){
      const y=top*(side<0?.37:.55),tip=tile===0?6:9;
      line(tile,x+lean*.5,y,x+side*tip,y+top*.24,.8);
    }
  }
  const texture=new THREE.DataTexture(data,width,size,THREE.RGBAFormat);
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;
  material=new THREE.MeshStandardMaterial({map:texture,vertexColors:true,alphaTest:.38,roughness:1,metalness:0});
  return material;
}

export function createAgricultureCrops(name){
  const builder=createSceneryBuilder(name),uv=[],ground=[];let tile=0;
  return {
    setCrop:crop=>{tile=crop==='grain'?0:crop==='hay'?1:2;},
    sheet(...args){
      builder.sheet(...args);
      const left=(tile*tileSize+.5)/atlasWidth,right=((tile+1)*tileSize-.5)/atlasWidth;
      // Same double winding as sceneryBuilder.sheet; twelve vertices per card.
      for(const [u,v] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1],[0,0],[0,1],[1,1],[0,0],[1,1],[1,0]])uv.push(u?right:left,v);
      const a=args[1][1],b=args[2][1];ground.push(a,b,b,a,b,a,a,a,b,a,b,b);
    },
    get vertexCount(){return builder.vertexCount;},
    finish(parent){
      const mesh=builder.finish(parent);if(!mesh)return null;
      mesh.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      mesh.geometry.setAttribute('cropGround',new THREE.Float32BufferAttribute(ground,1));
      mesh.material=cropMaterial();mesh.castShadow=false;return mesh;
    },
  };
}
