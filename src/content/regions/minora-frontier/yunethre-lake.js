import * as THREE from 'three';
import {YUNETHRE_LAKE} from './yunethre-world.js';

// Chapter 2 cannot load South Oremindi, which normally owns this water mesh.
// Draw its exact atlas shoreline locally; do not unlock or rebuild the mountains.
export function createYunethreLakeWater(parent) {
  const lake = YUNETHRE_LAKE, shape = new THREE.Shape(lake.shore.map(p => new THREE.Vector2(p.x, -p.z)));
  const material = new THREE.ShaderMaterial({side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {time: {value: 0}}]),
    vertexShader: `#include <fog_pars_vertex>
varying vec2 waterPoint;
void main(){waterPoint=position.xy;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `#include <fog_pars_fragment>
uniform float time;varying vec2 waterPoint;
void main(){float ripple=sin(waterPoint.x*.58+waterPoint.y*.83-time*.7)*sin(waterPoint.y*.49-waterPoint.x*.16+time*.4);
vec3 colour=vec3(.13,.34,.36)+vec3(.18,.22,.21)*pow(max(ripple,0.),12.);gl_FragColor=vec4(colour,1.);
#include <fog_fragment>
}`});
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.name = 'Laketown / Forest Tarn water'; mesh.rotation.x = -Math.PI / 2; mesh.position.y = lake.surface; parent.add(mesh);
  return {mesh, update: time => {material.uniforms.time.value = time;}};
}
