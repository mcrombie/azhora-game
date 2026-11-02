/** Fine settlement ground plus a sampler of its rendered triangles. Street
 * paving uses that sampler to avoid flicker on a differently sampled slope. */
import * as THREE from 'three';
export function* createSettlementGroundSteps({parent,box,heightAt,tintAt,spacing=2.5,name='Settlement ground'}){
  const nx=Math.ceil(box.w/spacing),nz=Math.ceil(box.d/spacing),pos=[],colors=[],indices=[],color=new THREE.Color();
  for(let j=0;j<=nz;j++){
    for(let i=0;i<=nx;i++){
      const x=box.x+box.w*i/nx,z=box.z+box.d*j/nz;
      pos.push(x,heightAt(x,z)+.035,z);color.set(tintAt(x,z)??'#91a073');colors.push(color.r,color.g,color.b);
      if(i&&j){const a=j*(nx+1)+i;indices.push(a,a-nx-2,a-1,a,a-nx-1,a-nx-2);}
    }yield;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));mesh.name=name;mesh.receiveShadow=true;parent.add(mesh);
  function surfaceAt(x,z){
    const u=(x-box.x)*nx/box.w,v=(z-box.z)*nz/box.d;
    if(u<0||u>=nx||v<0||v>=nz)return heightAt(x,z);
    const i=Math.floor(u),j=Math.floor(v),tx=u-i,tz=v-j,k=j*(nx+1)+i;
    const a=pos[k*3+1],b=pos[(k+nx+1)*3+1],c=pos[(k+1)*3+1],d=pos[(k+nx+2)*3+1];
    return tx>tz?a+(c-a)*tx+(d-c)*tz:a+(d-b)*tx+(b-a)*tz;
  }
  return {mesh,surfaceAt};
}
