import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {GUILD_EXPANSION} from '../src/content/regions/minora-frontier/guild-expansion.js';

const {createCharacter,disposeCharacter}=await sourceModule('../src/content/characters/characters.js');

function coveredCrown(actor,hair,label){
  actor.group.updateMatrixWorld(true);
  const head=actor.group.getObjectByName('Head'),expected=new THREE.Color(hair).toArray();
  for(const x of [-.12,-.06,0,.06,.12])for(const z of [-.10,-.04,.02,.08,.14]){
    const ray=new THREE.Raycaster(head.localToWorld(new THREE.Vector3(x,1,z)),new THREE.Vector3(0,-1,0).transformDirection(head.matrixWorld));
    const hit=ray.intersectObject(head,true)[0];assert.ok(hit,label+' has a visible crown');
    const colors=hit.object.geometry.attributes.color;
    const visible=colors?[colors.getX(hit.face.a),colors.getY(hit.face.a),colors.getZ(hit.face.a)]:hit.object.material.color.toArray();
    assert.ok(visible.every((c,i)=>Math.abs(c-expected[i])<.0001),`${label}: scalp is exposed at ${x}, ${z}`);
  }
}

test('full hairstyles cover the crown from an elevated third-person view',()=>{
  for(const hairStyle of ['long-tied','cropped','short-cropped','long','bob','long-curly','curls','mane','lank','braid','ponytail','long-loose']){
    const hair=0x353349,actor=createCharacter({role:'mercenary',armed:false,hat:false,look:{headgear:'bare',hairStyle,hair,facialHair:'clean',garment:'robe'}});
    try{coveredCrown(actor,hair,hairStyle);}finally{disposeCharacter(actor);}
  }
});

test('Nessa, Veyra and Helba retain full crown coverage with their authored builds',()=>{
  for(const id of ['nessa','veyra','helba']){
    const w=GUILD_EXPANSION.find(w=>w.id===id),actor=createCharacter({role:'mercenary',tunic:w.color,skin:w.skin,look:w.look,armed:false,hat:false});
    try{coveredCrown(actor,w.look.hair,w.name);}finally{disposeCharacter(actor);}
  }
});
