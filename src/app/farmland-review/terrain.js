import * as THREE from 'three';
import {westGroundAt,westWaterSurface} from '../../content/regions/western-regions/west-ground.js';
import {hexOwnerAt,SEA_LEVEL} from '../../world/terrain/region-world.js';
import {NETHEREUM_BUILDINGS,NETHEREUM_FARM_VIEW,NETHEREUM_BRIDGES,NETHEREUM_QUAY} from '../../content/regions/nethereum/nethereum-agriculture.js';
import {createFarmlandDeck} from './decks.js';

export const yieldBuild=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function createFarmlandTerrain(parent,progress=()=>{},layout={box:NETHEREUM_FARM_VIEW,buildings:NETHEREUM_BUILDINGS,bridges:NETHEREUM_BRIDGES,quay:NETHEREUM_QUAY,name:'Nethereum'}){
  const {box}=layout,step=3,nx=Math.ceil(box.width/step),nz=Math.ceil(box.depth/step);
  const dx=box.width/nx,dz=box.depth/nz,heights=new Float32Array((nx+1)*(nz+1));
  const groundAt=layout.groundAt??westGroundAt;
  const pads=(layout.terrainBuildings??layout.buildings).map(p=>({...p,y:groundAt(p.x,p.z)}));
  const base=(x,z)=>{
    let h=groundAt(x,z);
    for(const p of pads){
      const edge=Math.max(Math.abs(x-p.x)-p.w/2,Math.abs(z-p.z)-p.d/2);
      if(edge<4){const t=Math.max(0,Math.min(1,(edge-1)/3));h=p.y+(h-p.y)*(t*t*(3-2*t));}
    }
    return h;
  };
  const pos=[],cols=[],indices=[],c=new THREE.Color();
  for(let j=0;j<=nz;j++){
    for(let i=0;i<=nx;i++){
      const x=box.x+i*dx,z=box.z+j*dz,h=base(x,z),index=j*(nx+1)+i;heights[index]=h;pos.push(x,h,z);
      const n=Math.sin(x*.014)*Math.cos(z*.024)*.03;
      c.set(hexOwnerAt(x,z)===layout.name?0x929d70:0x889471);c.offsetHSL(0,0,n);cols.push(c.r,c.g,c.b);
      if(i&&j)indices.push(index-nx-2,index-1,index-nx-1,index-nx-1,index-1,index);
    }
    if(j%10===0){progress(`Shaping fields and riverbanks · ${Math.round(j/nz*100)}%`);await yieldBuild();}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
  if(layout.tileCells){
    // A connected playable landscape is larger than one review rectangle.
    // Give its tiles local bounds so off-screen countryside is not submitted.
    const normals=geometry.getAttribute('normal').array,span=layout.tileCells;
    for(let z0=0;z0<nz;z0+=span){for(let x0=0;x0<nx;x0+=span){
      const width=Math.min(span,nx-x0),depth=Math.min(span,nz-z0),p=[],c=[],n=[],ii=[];
      for(let z=0;z<=depth;z++)for(let x=0;x<=width;x++){
        const global=((z0+z)*(nx+1)+x0+x)*3,k=z*(width+1)+x;
        p.push(pos[global],pos[global+1],pos[global+2]);c.push(cols[global],cols[global+1],cols[global+2]);n.push(normals[global],normals[global+1],normals[global+2]);
        if(x&&z)ii.push(k-width-2,k-1,k-width-1,k-width-1,k-1,k);
      }
      const tile=new THREE.BufferGeometry();tile.setAttribute('position',new THREE.Float32BufferAttribute(p,3));tile.setAttribute('color',new THREE.Float32BufferAttribute(c,3));tile.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));tile.setIndex(ii);
      const mesh=new THREE.Mesh(tile,material);mesh.receiveShadow=true;mesh.userData.reviewedTerrainGrid={width,depth};parent.add(mesh);
    }await yieldBuild();}
    geometry.dispose();
  }else{
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;parent.add(mesh);
  }
  // Match the rendered triangles exactly, avoiding bobbing at grid boundaries.
  const heightAt=(x,z)=>{
    const gx=Math.max(0,Math.min(nx-.00001,(x-box.x)/dx)),gz=Math.max(0,Math.min(nz-.00001,(z-box.z)/dz));
    const i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,k=j*(nx+1)+i;
    const a=heights[k],b=heights[k+1],c=heights[k+nx+1],d=heights[k+nx+2];
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  };
  const bridges=layout.bridges.map(p=>({...p,y:Math.max(heightAt(p.x,p.z),westWaterSurface(p.x,p.z)??0,
    ...[-1,1].map(side=>heightAt(p.x+Math.sin(p.yaw)*p.length/2*side,p.z+Math.cos(p.yaw)*p.length/2*side)))+.3}));
  const quay=layout.quay?{...layout.quay,y:(westWaterSurface(layout.quay.end,layout.quay.z)??15.2)+.7,dir:Math.sign(layout.quay.end-layout.quay.bank)}:null;
  const decks=[...(quay?[createFarmlandDeck({x:(quay.bank+quay.end)/2,z:quay.z,width:quay.width,length:Math.abs(quay.end-quay.bank),yaw:quay.dir*Math.PI/2,heightAt:(x,z)=>{
      const t=Math.max(0,Math.min(1,(x-quay.bank)*quay.dir/10)),start=heightAt(quay.bank,z);return start+(quay.y-start)*t;
    }})]:[]),...bridges.map(b=>createFarmlandDeck({...b,heightAt:(x,z)=>{
      const v=(x-b.x)*Math.sin(b.yaw)+(z-b.z)*Math.cos(b.yaw),bank=heightAt(x,z),lift=Math.max(0,Math.min(1,(b.length/2-Math.abs(v))/3));
      return Math.max(bank,bank+(b.y-bank)*lift);
    }}))];
  const deckAt=(x,z)=>{
    for(const deck of decks){const y=deck.heightAt(x,z);if(y!==null)return y;}
    return layout.deckHeight?.(x,z)??null;
  };
  return {heightAt,bridges,quay,decks,deckAt,surface:{xs:Array.from({length:nx+1},(_,i)=>box.x+i*dx),zs:Array.from({length:nz+1},(_,i)=>box.z+i*dz),positions:pos},walkHeight:(x,z)=>deckAt(x,z)??heightAt(x,z),bounds:{minX:box.x+5,maxX:box.x+box.width-5,minZ:box.z+5,maxZ:box.z+box.depth-5},waterAt:(x,z)=>westWaterSurface(x,z)??SEA_LEVEL};
}
