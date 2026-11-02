import * as THREE from 'three';
import {SNERO_WINDOWS,SNERO_WINDOW_SIZE} from './snero-window-views.js';
import {destinationBasis,windowPerspective} from '../../../world/scenery/window-perspective.js';
export {SNERO_WINDOWS,SNERO_WINDOW_SIZE} from './snero-window-views.js';

// Actual regional meshes and animated water; no remote campaign simulation.
export function createSenroWindows(parent){
  const root=new THREE.Group();root.name="Snero's live windows onto distant regions";parent.add(root);
  const {width,height,sill}=SNERO_WINDOW_SIZE,geometry=new THREE.PlaneGeometry(width,height),records=[],textures=new Set(),materials=[];
  const eye=new THREE.Vector3(),frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),bounds=new THREE.Box3();
  let disposed=false,sceneModule=null,lastRenderMs=0,activeCount=0;
  for(const view of SNERO_WINDOWS){
    const frame=new THREE.Group();frame.position.set(view.x,0,view.z);frame.rotation.y=view.yaw;root.add(frame);
    const material=new THREE.MeshBasicMaterial({color:'#c2cfce',toneMapped:false});materials.push(material);
    const pane=new THREE.Mesh(geometry,material);pane.name=view.place;pane.position.set(0,sill+height/2,.02);frame.add(pane);
    const camera=new THREE.PerspectiveCamera(),basis=destinationBasis(view.eye,view.target),origin=new THREE.Vector3(...view.eye);
    records.push({...view,pane,camera,basis,origin,ready:false,error:null,loading:null,built:null,scene:null,target:null,frames:0,active:false,loadMs:0,drawCalls:0,triangles:0});
    if(typeof document!=='undefined'){
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const c=canvas.getContext('2d');
      c.fillStyle='#303f38';c.fillRect(0,0,768,128);c.strokeStyle='#bda66f';c.lineWidth=7;c.strokeRect(6,6,756,116);
      c.fillStyle='#eee1bc';c.textAlign='center';c.font='40px Georgia';c.fillText(view.place,384,78,720);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
      const plaque=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.6),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
      materials.push(plaque.material);plaque.position.set(0,.48,.15);frame.add(plaque);
    }
  }
  function load(r){
    if(r.loading||disposed||r.error)return;
    const begun=performance.now();
    r.loading=(async()=>{
      sceneModule??=import('./lookout-scenery.js');const {fetchLookoutLandscape}=await sceneModule;
      const data=await fetchLookoutLandscape(r.url);if(disposed)return;
      const {assembleLookoutScene}=await import('./lookout-scene.js');if(disposed)return;
      r.built=assembleLookoutScene(data.manifest,data.buffer);r.scene=new THREE.Scene();r.scene.background=new THREE.Color('#bbc9c5');
      r.scene.fog=new THREE.Fog('#bbc9c5',1800,4200);r.scene.add(r.built.root);
      r.scene.add(new THREE.HemisphereLight('#fff1d5','#617970',2.1));
      const sun=new THREE.DirectionalLight('#fff0d0',2.5);sun.position.set(180,400,80);r.scene.add(sun);
      r.target=new THREE.WebGLRenderTarget(512,Math.round(512*height/width),{depthBuffer:true});r.target.texture.colorSpace=THREE.SRGBColorSpace;
      r.pane.material.map=r.target.texture;r.pane.material.color.set('#ffffff');r.pane.material.needsUpdate=true;
      r.ready=true;r.loadMs=Math.round(performance.now()-begun);r.bytes=data.manifest.downloadBytes;r.sceneTriangles=data.manifest.triangles;
    })().catch(error=>{if(!disposed){r.error=error.message;console.warn('Snero window '+r.place+': '+error.message);}});
  }
  return {root,
    render(renderer,viewer,time){
      const begun=performance.now();activeCount=0;lastRenderMs=0;for(const r of records)r.active=false;
      if(disposed||!root.visible)return;
      for(let p=root.parent;p;p=p.parent)if(!p.visible)return;
      root.updateWorldMatrix(true,true);viewer.updateMatrixWorld(true);
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(viewer.projectionMatrix,viewer.matrixWorldInverse));
      const previous={target:renderer.getRenderTarget(),shadow:renderer.shadowMap.autoUpdate,xr:renderer.xr.enabled,autoClear:renderer.autoClear};
      try{
        renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.autoClear=true;
        for(const r of records){
          bounds.setFromObject(r.pane);eye.copy(viewer.position);r.pane.worldToLocal(eye);
          if(eye.z<=.06||!frustum.intersectsBox(bounds)||activeCount>=2)continue;
          load(r);r.active=true;activeCount++;
          if(!r.ready||!windowPerspective(r.camera,eye,{width,height,origin:r.origin,basis:r.basis}))continue;
          r.built.update(time);renderer.setRenderTarget(r.target);renderer.render(r.scene,r.camera);
          r.frames++;r.drawCalls=renderer.info.render.calls;r.triangles=renderer.info.render.triangles;
        }
      }finally{
        renderer.setRenderTarget(previous.target);renderer.shadowMap.autoUpdate=previous.shadow;renderer.xr.enabled=previous.xr;renderer.autoClear=previous.autoClear;
        lastRenderMs=performance.now()-begun;
      }
    },
    state:()=>({kind:'live-perspective',remoteScenes:records.filter(r=>r.ready).length,remoteSimulations:0,activeCount,lastRenderMs,
      views:records.map(r=>({id:r.id,place:r.place,wall:r.wall,region:r.region,ready:r.ready,error:r.error,active:r.active,frames:r.frames,loadMs:r.loadMs,bytes:r.bytes,
        drawCalls:r.drawCalls,triangles:r.triangles,sceneTriangles:r.sceneTriangles,eye:r.camera.position.toArray(),projection:r.camera.projectionMatrix.toArray()}))}),
    dispose(){disposed=true;root.removeFromParent();for(const r of records){r.built?.dispose();r.target?.dispose();}
      const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();},
  };
}
