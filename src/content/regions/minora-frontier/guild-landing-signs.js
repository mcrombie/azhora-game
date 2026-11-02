import * as THREE from 'three';
import {GUILD_SIGN_SIZE,paintGuildSign} from './guild-sign-designs.js';

// One shallow carved board, one baked canvas and one draw call per resident.
// Its outline, bevel and wall fixings are real geometry, not a floating UI card.
export function createGuildLandingSign(floor,{width=GUILD_SIGN_SIZE.metres}={}){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas'),painted=paintGuildSign(floor,canvas),points=painted.points.toReversed();
  const scale=width/GUILD_SIGN_SIZE.width,positions=[],uvs=[];
  const front=points.map(([x,y])=>[(x-512)*scale,(224-y)*scale,0]);
  const rim=front.map(([x,y])=>[x*1.018,y*1.045,-.055]),back=rim.map(([x,y])=>[x,y,-.13]);
  const tri=(a,b,c,uv=null)=>{positions.push(...a,...b,...c);uvs.push(...(uv??[.997,.009,.997,.009,.997,.009]));};
  const quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
  const faces=THREE.ShapeUtils.triangulateShape(front.map(p=>new THREE.Vector2(p[0],p[1])),[]);
  for(const face of faces){
    tri(...face.map(i=>front[i]),face.flatMap(i=>[points[i][0]/1024,1-points[i][1]/448]));
    tri(...face.toReversed().map(i=>back[i]));
  }
  // Reverse the canvas outline to keep it counterclockwise in world Y.
  // The bevel and edge then face outward, including at cutaway corners.
  for(let i=0;i<front.length;i++){
    const j=(i+1)%front.length;quad(front[i],rim[i],rim[j],front[j]);quad(rim[i],back[i],back[j],rim[j]);
  }
  for(const x of [-.65,.65]){
    const a=[[x-.07,-.34,-.13],[x+.07,-.34,-.13],[x+.07,.34,-.13],[x-.07,.34,-.13]],b=a.map(p=>[p[0],p[1],-.48]);
    quad(...a);quad(b[3],b[2],b[1],b[0]);for(let i=0;i<4;i++)quad(a[i],b[i],b[(i+1)%4],a[(i+1)%4]);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.16,roughness:.88});
  const sign=new THREE.Mesh(geometry,material);sign.name=`Landing sign: ${floor.wizard}`;
  sign.rotation.y=-Math.PI/2;sign.position.set(16.8,floor.y+2.85,0);
  return sign;
}
