import * as THREE from 'three';

// The reviewed countryside and the authored regional builders share the same
// water colour, world-coordinate ripple and fog. The prepared lookout export
// contains this shader as well, so the river does not change at region edges.
export function createWestWaterMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{time:{value:0}}]),side:THREE.DoubleSide,fog:true,
    vertexShader:`varying vec3 p;
      #include <fog_pars_vertex>
      void main(){p=position;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader:`uniform float time; varying vec3 p;
      #include <fog_pars_fragment>
      void main(){float w=sin(p.x*.42-time*1.5+p.z*1.1)*sin(p.x*.17+p.z*1.3);vec3 c=vec3(.22,.35,.38)+vec3(.13,.16,.15)*pow(max(w,0.),8.);gl_FragColor=vec4(c,1.);
      #include <fog_fragment>
      }`,
  });
}
