import * as THREE from 'three';

const HEIGHTS={ocean:-3,coast:1,lake:-1,wetland:3,plains:6,grassland:7,forest:13,deep_forest:18,deep_jungle:20,hills:32,highland:48,mountain:85,high_mountain:135};
const COLORS={ocean:0x286879,coast:0xb5ac7b,lake:0x4c94a2,wetland:0x6c8867,plains:0xa0ab71,grassland:0x98ad62,forest:0x58794f,deep_forest:0x355d48,deep_jungle:0x276752,hills:0x8b9572,highland:0x8b9581,mountain:0x7d8787,high_mountain:0xc6d1cf};

// An honest survey of the authored hex terrain, never presented as finished game content.
export function createSurveyWorld(scene, region) {
  const root=new THREE.Group();root.name=`Atlas terrain survey: ${region.name}`;scene.add(root);
  const cells=region.cells||[],centerX=region.centerX??region.x+region.width/2,centerY=region.centerY??region.y+region.height/2;
  const scale=1.8,hexRadius=16*scale;
  const material=new THREE.MeshStandardMaterial({roughness:1,flatShading:true});
  const geometry=new THREE.CylinderGeometry(hexRadius,hexRadius,1,6);
  const ground=new THREE.InstancedMesh(geometry,material,cells.length),dummy=new THREE.Object3D(),tint=new THREE.Color();
  const points=cells.map(cell=>({x:(cell.x-centerX)*scale,z:(cell.y-centerY)*scale,terrain:cell.terrain,height:HEIGHTS[cell.terrain]??6}));
  points.forEach((cell,i)=>{const h=cell.height;dummy.position.set(cell.x,(h-18)/2,cell.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,h+18,1);dummy.updateMatrix();ground.setMatrixAt(i,dummy.matrix);ground.setColorAt(i,tint.setHex(COLORS[cell.terrain]??COLORS.plains));});
  ground.instanceMatrix.needsUpdate=true;if(ground.instanceColor)ground.instanceColor.needsUpdate=true;ground.receiveShadow=true;root.add(ground);ground.computeBoundingSphere();
  const waterGeometry=new THREE.PlaneGeometry(Math.max(1400,region.width*scale+500),Math.max(1400,region.height*scale+500));
  waterGeometry.rotateX(-Math.PI/2);const waterMaterial=new THREE.MeshStandardMaterial({color:0x304047,roughness:1});
  const water=new THREE.Mesh(waterGeometry,waterMaterial);water.name='Neutral survey base — outside region is unmodeled';water.position.y=-18.1;root.add(water);
  const forest=points.filter(p=>['forest','deep_forest','deep_jungle'].includes(p.terrain));
  const treeGeometry=new THREE.ConeGeometry(3.6,13,5),treeMaterial=new THREE.MeshStandardMaterial({color:0x315d44,flatShading:true,roughness:1});
  const trees=new THREE.InstancedMesh(treeGeometry,treeMaterial,forest.length*3);
  forest.forEach((p,i)=>{for(let k=0;k<3;k++){dummy.position.set(p.x+Math.sin(i*2.4+k*2.1)*8,p.height+6,p.z+Math.cos(i*1.8+k*2.1)*8);dummy.scale.setScalar(1);dummy.rotation.set(0,i+k,0);dummy.updateMatrix();trees.setMatrixAt(i*3+k,dummy.matrix);}});
  if(forest.length){trees.instanceMatrix.needsUpdate=true;trees.computeBoundingSphere();root.add(trees);}
  const span=Math.max(180,region.width*scale,region.height*scale),halfX=Math.max(span,region.width*scale/2+100),halfZ=Math.max(span,region.height*scale/2+100),peak=Math.max(10,...points.map(p=>p.height));
  let disposed=false;
  return {root,bounds:{minX:-halfX,maxX:halfX,minZ:-halfZ,maxZ:halfZ,minY:-25,maxY:Math.max(500,peak+span*1.5)},
    spawn:{x:0,y:peak+span*.65,z:span*.7},lookAt:{x:0,y:peak*.4,z:0},
    metadata:{title:region.name,subtitle:'Atlas terrain survey · gameplay not built',cells:cells.length},
    heightAt(x,z){let nearest=null,d=Infinity;for(const p of points){const n=Math.hypot(x-p.x,z-p.z);if(n<d){d=n;nearest=p;}}return d<hexRadius*1.1?nearest.height:0;},
    update(){},dispose(){if(disposed)return;disposed=true;root.removeFromParent();ground.dispose();trees.dispose();for(const item of [geometry,material,waterGeometry,waterMaterial,treeGeometry,treeMaterial])item.dispose();}
  };
}
