import * as THREE from 'three';

// Room-owned haze: it never changes the scene fog, lighting, or other floors.
export function softenDreamScenery(material){
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`
      #include <fog_fragment>
      float dreamHaze = smoothstep(5.0, 30.0, length(vViewPosition)) * .64;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(.55, .65, .74), dreamHaze);
    `);
  };
  material.customProgramCacheKey=()=> 'nessa-room-haze-v1';
}

export function createNessaAtmosphere(parent){
  const root=new THREE.Group();root.name='Nessa: drifting mist and sleeping sky';parent.add(root);
  const clock={value:0},vertices=[],sizes=[],phases=[],kinds=[],uvs=[],indices=[];
  function cloud(x,y,z,w,h,phase,kind){
    const start=vertices.length/3;
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){
      vertices.push(x,y,z);sizes.push(w,h);phases.push(phase);kinds.push(kind);uvs.push(u,v);
    }
    indices.push(start,start+1,start+2,start,start+2,start+3);
  }
  // Low banks around the sleeping alcoves, with lighter wisps across the path.
  for(let i=0;i<18;i++){
    const side=i%2?1:-1,x=side*(i<12?7+(i%3)*1.5:2.5),z=-9+Math.floor(i/2)*2.25;
    cloud(x,.45+(i%3)*.22,z,6.5+(i%4)*.6,1.4+(i%3)*.3,i*2.4,0);
  }
  for(let i=0;i<28;i++){
    const a=i*2.4,r=2+(i%5)*1.9;cloud(Math.sin(a)*r,2.8+(i%4)*1.3,Math.cos(a)*r,.16,.16,a,1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('cloudSize',new THREE.Float32BufferAttribute(sizes,2));
  geometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));
  geometry.setAttribute('kind',new THREE.Float32BufferAttribute(kinds,1));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({uniforms:{time:clock},transparent:true,depthWrite:false,
    vertexShader:`
      uniform float time; attribute vec2 cloudSize; attribute float phase; attribute float kind;
      varying vec2 vUv; varying float vPhase; varying float vKind;
      void main(){
        vUv=uv;vPhase=phase;vKind=kind;
        vec3 p=position;p.x+=sin(time*.07+phase)*.7;p.z+=cos(time*.05+phase)*.45;
        p.y+=sin(time*.25+phase)*mix(.12,.30,kind);
        vec4 view=modelViewMatrix*vec4(p,1.0);view.xy+=(uv-.5)*cloudSize;
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader:`
      uniform float time; varying vec2 vUv; varying float vPhase; varying float vKind;
      void main(){
        vec2 p=vUv*2.0-1.0;float radial=max(0.0,1.0-dot(p,p));
        float curl=.68+.18*sin(p.x*5.0+p.y*3.0+time*.12+vPhase)
          +.14*sin(p.x*9.0-p.y*4.0-time*.09+vPhase);
        float alpha=mix(radial*radial*curl*.24,pow(radial,3.0)*.85,vKind);
        gl_FragColor=vec4(mix(vec3(.65,.76,.84),vec3(.83,.91,1.0),vKind),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mist=new THREE.Mesh(geometry,material);mist.name='Low mist and drifting dream lights';mist.frustumCulled=false;root.add(mist);
  const canopy=new THREE.Mesh(new THREE.PlaneGeometry(26,24),new THREE.ShaderMaterial({uniforms:{time:clock},transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      uniform float time; varying vec2 vUv;
      void main(){
        vec2 p=vUv*2.0-1.0;float edge=1.0-smoothstep(.50,1.0,max(abs(p.x),abs(p.y)));
        float wave=.5+.5*sin(p.x*5.0+sin(p.y*4.0+time*.04)*1.8+time*.035);
        float veil=.5+.5*sin(p.y*9.0-p.x*3.0+time*.025);
        gl_FragColor=vec4(mix(vec3(.22,.31,.48),vec3(.50,.69,.73),wave),edge*(.22+wave*.22+veil*.12));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  canopy.name='Slowly shifting dream canopy';canopy.position.y=8.9;canopy.rotation.x=Math.PI/2;root.add(canopy);
  return {root,update(time){clock.value=time;},state:()=>({time:clock.value,mistBanks:18,lights:28,drawCalls:2,triangles:94})};
}
