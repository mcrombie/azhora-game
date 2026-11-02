import * as THREE from 'three';

// Roadside sites checked against guild-stable.js, menora-city.js and
// caricas-settlement.js. These seven fixtures have no AI, shadows or collision.
export const NIGHT_LANTERN_SITES = Object.freeze([
  ['guild-stable', -2433.5, 65], ['minora-north-gate', -2316, 21],
  ['minora-river-gate', -2259, 143], ['minora-isa-gate', -2300, 201],
  ['caricas-north-court', -2098, 247], ['caricas-market-court', -2098, 278],
  ['caricas-south-court', -2086, 292],
].map(([id,x,z]) => Object.freeze({id,x,z})));

const SIGHT_RANGE = 220, LIGHT_RANGE = 30, LAMP_HEIGHT = 2.68;
const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/** Optional experiment scenery. The caller may return NaN from heightAt when
 * a region is unprepared; this layer never asks the loader to prepare it.
 * Seven height probes at most, three instanced draw batches and two reusable,
 * short-range PointLights. No changes to the world's existing materials. */
export function createNightLanterns({scene, heightAt}) {
  let root = null, meshes = [], materials = [], geometries = [], lights = [];
  let enabled = false, exterior = false, night = 0, disposed = false, fixtures = [];
  let arrangement = '';
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const location = new THREE.Vector3(), scale = new THREE.Vector3();

  function build() {
    root = new THREE.Group();root.name = 'Day and night experiment / landmark lanterns';
    const box = new THREE.BoxGeometry(1,1,1), roof = new THREE.ConeGeometry(.34,.23,4);
    roof.rotateY(Math.PI/4);geometries = [box,roof];
    const iron = new THREE.MeshStandardMaterial({color:'#494438',roughness:.85});
    const glass = new THREE.MeshStandardMaterial({color:'#9f8250',emissive:'#ffbc64',emissiveIntensity:0,roughness:.55});
    const cap = new THREE.MeshStandardMaterial({color:'#806641',roughness:.8});
    materials = [iron,glass,cap];
    meshes = [new THREE.InstancedMesh(box,iron,NIGHT_LANTERN_SITES.length*7),
      new THREE.InstancedMesh(box,glass,NIGHT_LANTERN_SITES.length),
      new THREE.InstancedMesh(roof,cap,NIGHT_LANTERN_SITES.length)];
    meshes.forEach(mesh => {
      mesh.count = 0;mesh.castShadow = false;mesh.receiveShadow = false;
      mesh.frustumCulled = false;root.add(mesh);
    });
    lights = Array.from({length:2}, () => {
      const light = new THREE.PointLight('#ffd299',0,17,2);
      light.castShadow = false;light.visible = false;root.add(light);return light;
    });
    scene.add(root);
  }

  function place(mesh,index,x,y,z,w,h,d) {
    matrix.compose(location.set(x,y,z),rotation,scale.set(w,h,d));
    mesh.setMatrixAt(index,matrix);
  }

  function arrange(sites) {
    const key = sites.map(p => `${p.id}:${p.y}`).join('|');
    if(key === arrangement)return;
    arrangement = key;
    let frame = 0;
    sites.forEach((p,index) => {
      const {x,y,z} = p;
      place(meshes[0],frame++,x,y+1.25,z,.13,2.5,.13);
      for(const dy of [2.43,2.91])place(meshes[0],frame++,x,y+dy,z,.4,.075,.4);
      for(const dx of [-.175,.175])for(const dz of [-.175,.175])
        place(meshes[0],frame++,x+dx,y+LAMP_HEIGHT,z+dz,.045,.45,.045);
      place(meshes[1],index,x,y+LAMP_HEIGHT,z,.305,.4,.305);
      place(meshes[2],index,x,y+3.025,z,1,1,1);
    });
    meshes[0].count = frame;meshes[1].count = meshes[2].count = sites.length;
    for(const mesh of meshes)mesh.instanceMatrix.needsUpdate = true;
  }

  function hide() {
    if(root)root.visible = false;
    for(const light of lights){light.visible = false;light.intensity = 0;light.userData.site = null;}
    fixtures = [];
  }

  function update(options = {}) {
    if(disposed)return;
    enabled = Boolean(options.enabled);exterior = Boolean(options.exterior);night = clamp(options.night);
    const p = options.position;
    if(!enabled || !exterior || !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)){
      hide();return;
    }
    // Test horizontal proximity before sampling. A tower camera can see local
    // lamps below, but distant Caricas never initiates terrain work from Minora.
    fixtures = [];
    for(const site of NIGHT_LANTERN_SITES){
      if(Math.hypot(site.x-p.x,site.z-p.z)>SIGHT_RANGE)continue;
      const y = heightAt(site.x,site.z);
      if(!Number.isFinite(y))continue;
      fixtures.push({...site,y});
    }
    if(!fixtures.length){hide();return;}
    if(!root)build();
    root.visible = true;arrange(fixtures);
    materials[1].emissiveIntensity = night*2.4;
    const nearest = fixtures.map(site => ({...site,distance:Math.hypot(site.x-p.x,site.y+LAMP_HEIGHT-p.y,site.z-p.z)}))
      .filter(site => site.distance<LIGHT_RANGE).sort((a,b) => a.distance-b.distance);
    lights.forEach((light,index) => {
      const site = nearest[index];light.visible = Boolean(site && night>.001);
      light.intensity = light.visible ? 32*night*clamp((LIGHT_RANGE-site.distance)/8) : 0;
      light.userData.site = light.visible ? site.id : null;
      if(site)light.position.set(site.x,site.y+LAMP_HEIGHT,site.z);
    });
  }

  return {
    update,
    state:() => ({enabled,exterior,night,built:Boolean(root),visible:Boolean(root?.visible),
      fixtures:fixtures.map(p=>({...p})),activeLights:lights.filter(light=>light.visible&&light.intensity>0).length,
      drawBatches:root?.visible?meshes.length:0,
      lights:lights.map(light=>({site:light.userData.site??null,visible:light.visible,intensity:light.intensity,shadows:light.castShadow}))}),
    dispose(){
      if(disposed)return;disposed = true;hide();root?.removeFromParent();
      for(const geometry of geometries)geometry.dispose();
      for(const material of materials)material.dispose();
      for(const light of lights)light.dispose?.();
      root = null;meshes = [];materials = [];geometries = [];lights = [];
    },
  };
}
