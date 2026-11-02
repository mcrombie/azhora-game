import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createConversationCamera}=await sourceModule('../src/app/exploration/conversation-camera.js');

test('conversation camera keeps both full figures above the dialogue on desktop and portrait screens',()=>{
  for(const [width,height,top] of [[1920,1080,650],[1280,800,382],[1024,600,244],[390,844,430]]){
    const camera=new THREE.PerspectiveCamera(55,width/height,.12,560),view=createConversationCamera(camera,()=>1);
    const hero={x:-2414,y:-.3,z:42},speaker={x:-2414,y:-.3,z:39.5};
    const cardWidth=Math.min(750,width-24),rect={left:(width-cardWidth)/2,right:(width+cardWidth)/2,top,bottom:height-12};
    view.update({hero,speaker,dialogRect:rect,width,height});
    for(const person of [hero,speaker])for(const y of [0,1.95])for(const x of [-.4,.4])for(const z of [-.32,.32]){
      const p=new THREE.Vector3(person.x+x,person.y+y,person.z+z).project(camera),px=(p.x+1)*width/2,py=(1-p.y)*height/2;
      assert.ok(px>0&&px<width&&py>0&&py<top,`${width}x${height}: both bodies remain in the visible scene (${px}, ${py})`);
    }
    assert.deepEqual(hero,{x:-2414,y:-.3,z:42},'framing does not move the player');
    view.reset();assert.equal(camera.view.enabled,false,'ordinary and panoramic views regain their full projection');
  }
});

test('conversation camera uses the open shoulder and reuses its pose until the dialogue layout changes',()=>{
  const camera=new THREE.PerspectiveCamera(55,1.6,.12,560);let probes=0;
  const view=createConversationCamera(camera,(_focus,eye)=>{probes++;return eye.x>0?.3:1;});
  const options={hero:{x:0,y:0,z:2},speaker:{x:0,y:0,z:0},width:1280,height:800,
    dialogRect:{left:265,right:1015,top:400,bottom:772}};
  view.update(options);assert.ok(camera.position.x<0,'blocked right shoulder uses the left');assert.equal(probes,2);
  const first=camera.position.clone();view.update(options);assert.equal(probes,2);assert.deepEqual(camera.position,first);
  view.update({...options,dialogRect:{...options.dialogRect,top:320}});assert.equal(probes,4,'a longer reply refits the visible area');
});
