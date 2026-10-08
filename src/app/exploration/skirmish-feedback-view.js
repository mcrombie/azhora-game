import * as THREE from 'three';
import {encounterCue} from '../../gameplay/combat/encounter-cue.js';

// Disposable, local combat feedback. None of these labels changes combat state.
export function createSkirmishFeedback(scene,world,count){
  let focusedId=null;
  const labels=Array.from({length:count},()=>{
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,depthTest:false});
    const sprite=new THREE.Sprite(material);sprite.userData.combatHealth=true;sprite.scale.set(2.9,1.1,1);scene.add(sprite);
    return {canvas,texture,material,sprite,key:null};
  });
  return {
    draw(state){
      // Keep one readable target/threat label when soldiers crowd together; the rest
      // retain compact health bars instead of three overlapping text panels.
      const distance=g=>Math.hypot(g.x-state.hero.x,g.z-state.hero.z);
      const nearby=state.guards.filter(g=>g.hp>0&&!g.escaped).sort((a,b)=>distance(a)-distance(b)||a.id-b.id);
      const opening=nearby.find(g=>g.open),locked=nearby.find(g=>g.id===state.hero.focusId);
      const current=nearby.find(g=>g.id===focusedId);
      const target=nearby.find(g=>g.id===state.hero.targetId);
      const threat=nearby.find(g=>(!state.squad||g.targetId===-1)&&['windup','strike'].includes(g.phase))??nearby.find(g=>g.phase==='turn');
      if(threat||opening||locked||target)focusedId=(threat??opening??locked??target).id;
      else if(!current||distance(current)>distance(nearby[0])+.65)focusedId=nearby[0]?.id??null;
      state.guards.forEach((g,i)=>{
        const runner=g.role==='runner',cue=encounterCue(g),detailed=g.routed||g.id===focusedId||runner&&!threat,label=labels[i],key=`${g.hp}/${g.phase}/${g.attack}/${g.hurt>0}/${g.open}/${g.block>0}/${detailed}/${cue?.kind}/${Math.floor((cue?.fraction??0)*12)}`;
        label.sprite.position.set(g.x,world.heightAt(g.x,g.z)+(detailed?3.15:2.35),g.z);label.sprite.visible=g.hp>0&&(!g.escaped||g.routed&&state.time-g.brokeAt<3);
        const notice=cue?.kind==='attention'&&!detailed;
        label.sprite.scale.set(detailed?2.6:notice ? .65 : 1,detailed?1.3:notice ? .65 : .15,1);
        if(notice)label.sprite.position.y+=2;
        label.sprite.userData.cue=cue?.kind??null;label.sprite.userData.guardId=g.id;
        if(key===label.key)return;label.key=key;
        const c=label.canvas.getContext('2d');c.clearRect(0,0,256,128);c.fillStyle='#142b28e8';c.fillRect(0,0,256,128);
        // An imminent strike retains the main label. A second soldier noticing
        // the player still gets a visible alert instead of a plain health bar.
        if(notice){c.fillStyle='#ffd09a';c.font='bold 104px sans-serif';c.textAlign='center';c.fillText('!',128,100);label.texture.needsUpdate=true;return;}
        if(!detailed){c.fillStyle=g.hurt>0?'#fff4bb':g.phase==='windup'?'#ffb07e':'#89c28d';c.fillRect(8,16,240*g.hp/50,96);label.texture.needsUpdate=true;return;}
        c.textAlign='center';c.font='bold 25px sans-serif';c.fillStyle=g.hurt>0?'#ffffff':'#f6e8c5';
        c.fillText(`${runner?'Runner':g.role==='escort'?'Escort '+(i+1):'Soldier '+(i+1)}  ${g.hp}/50`,128,30);
        c.fillStyle='#4e3a31';c.fillRect(12,39,232,10);c.fillStyle=g.hurt>0?'#fff4bb':'#89c28d';c.fillRect(12,39,232*g.hp/50,10);
        c.font='bold 19px sans-serif';c.fillStyle=cue?'#'+cue.color.toString(16).padStart(6,'0'):'#e0dccd';
        c.fillText(g.block?'Blocked!':cue?cue.text:g.phase==='stagger'?'Staggered':g.phase==='recover'||g.phase==='strike'?'Resetting guard':g.phase==='march'?'Heading to rally':'Guard raised',128,79);
        if(cue){c.fillStyle='#0d2425';c.fillRect(12,97,232,13);c.fillStyle='#'+cue.color.toString(16).padStart(6,'0');c.fillRect(12,97,232*cue.fraction,13);}
        label.texture.needsUpdate=true;
      });
    },
    dispose(){for(const label of labels){scene.remove(label.sprite);label.texture.dispose();label.material.dispose();}},
  };
}
