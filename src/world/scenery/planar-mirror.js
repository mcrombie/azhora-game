import * as THREE from 'three';

// Reflect the viewer across the glass, then clip everything behind its plane.
// Projective UVs preserve the room's parallax rather than stretching a portrait.
export function mirrorPerspective(camera,viewer,pane,textureMatrix){
  pane.updateWorldMatrix(true,false);viewer.updateMatrixWorld(true);
  const origin=new THREE.Vector3().setFromMatrixPosition(pane.matrixWorld);
  const rotation=new THREE.Matrix4().extractRotation(pane.matrixWorld);
  const normal=new THREE.Vector3(0,0,1).applyMatrix4(rotation);
  const eye=new THREE.Vector3().setFromMatrixPosition(viewer.matrixWorld);
  const view=origin.clone().sub(eye);
  if(view.dot(normal)>=-.03)return false;
  camera.position.copy(view.reflect(normal).negate().add(origin));
  rotation.extractRotation(viewer.matrixWorld);
  const ahead=new THREE.Vector3(0,0,-1).applyMatrix4(rotation).add(eye);
  const target=origin.clone().sub(ahead).reflect(normal).negate().add(origin);
  camera.up.set(0,1,0).applyMatrix4(rotation).reflect(normal);
  camera.lookAt(target);camera.near=viewer.near;camera.far=viewer.far;
  camera.updateMatrixWorld(true);camera.projectionMatrix.copy(viewer.projectionMatrix);
  textureMatrix.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1)
    .multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(pane.matrixWorld);
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,origin).applyMatrix4(camera.matrixWorldInverse);
  const clip=new THREE.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant),e=camera.projectionMatrix.elements;
  const q=new THREE.Vector4((Math.sign(clip.x)+e[8])/e[0],(Math.sign(clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);
  clip.multiplyScalar(2/clip.dot(q));e[2]=clip.x;e[6]=clip.y;e[10]=clip.z+1-.001;e[14]=clip.w;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();return true;
}

export function createPlanarMirror(parent,{width=3.6,height=4.4,x=8,y=2.65,z=5.8,yaw=Math.PI,range=22}={}){
  const textureMatrix=new THREE.Matrix4(),camera=new THREE.PerspectiveCamera();
  const target=new THREE.WebGLRenderTarget(768,768,{depthBuffer:true});
  const material=new THREE.ShaderMaterial({uniforms:{reflection:{value:target.texture},textureMatrix:{value:textureMatrix},ready:{value:0}},
    vertexShader:`uniform mat4 textureMatrix; varying vec4 reflectionUv;
      void main(){reflectionUv=textureMatrix*vec4(position,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D reflection; uniform float ready; varying vec4 reflectionUv;
      void main(){vec3 reflected=texture2DProj(reflection,reflectionUv).rgb;
        gl_FragColor=vec4(mix(vec3(.48,.57,.60),reflected*.96+vec3(.012,.017,.019),ready),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);pane.name='Neris: live silvered mirror';
  pane.position.set(x,y,z);pane.rotation.y=yaw;parent.add(pane);
  const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),bounds=new THREE.Box3(),eye=new THREE.Vector3(),centre=new THREE.Vector3();
  let frames=0,last=-Infinity,active=false,drawCalls=0,triangles=0,renderMs=0,disposed=false;
  return {pane,
    render(renderer,viewer){
      active=false;renderMs=0;if(disposed)return;
      for(let p=pane;p;p=p.parent)if(!p.visible)return;
      pane.updateWorldMatrix(true,false);viewer.updateMatrixWorld(true);
      eye.setFromMatrixPosition(viewer.matrixWorld);centre.setFromMatrixPosition(pane.matrixWorld);
      if(eye.distanceToSquared(centre)>range*range)return;
      frustum.setFromProjectionMatrix(matrix.multiplyMatrices(viewer.projectionMatrix,viewer.matrixWorldInverse));bounds.setFromObject(pane);
      if(!frustum.intersectsBox(bounds))return;
      // Throttle before changing the texture matrix: it must match the saved image.
      const now=performance.now();if(now-last<1000/30){active=true;return;}
      if(!mirrorPerspective(camera,viewer,pane,textureMatrix))return;
      let scene=parent;while(scene.parent)scene=scene.parent;if(!scene.isScene)return;
      const previous={target:renderer.getRenderTarget(),shadow:renderer.shadowMap.autoUpdate,xr:renderer.xr.enabled,autoClear:renderer.autoClear,viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest()};
      try{
        pane.visible=false;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.autoClear=true;
        renderer.setRenderTarget(target);renderer.render(scene,camera);
        material.uniforms.ready.value=1;frames++;last=now;active=true;
        drawCalls=renderer.info.render.calls;triangles=renderer.info.render.triangles;
      }finally{
        pane.visible=true;renderer.setRenderTarget(previous.target);renderer.setViewport(previous.viewport);renderer.setScissor(previous.scissor);renderer.setScissorTest(previous.scissorTest);
        renderer.shadowMap.autoUpdate=previous.shadow;renderer.xr.enabled=previous.xr;renderer.autoClear=previous.autoClear;renderMs=performance.now()-now;
      }
    },
    state:()=>({kind:'planar-reflection',active,frames,drawCalls,triangles,renderMs,resolution:768,maxFps:30,eye:camera.position.toArray()}),
    dispose(){disposed=true;pane.removeFromParent();pane.geometry.dispose();material.dispose();target.dispose();},
  };
}
