import * as THREE from 'three';
import {encounterCue} from '../../gameplay/combat/encounter-cue.js';
import {enemyLabelPlan} from './combat-labels.js';

// Disposable, local combat feedback. None of these labels changes combat state.
export function createSkirmishFeedback(scene,world,count){
  let focusedId=null;
  const labels=Array.from({length:count},()=>{
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,depthTest:true,depthWrite:false});
    const sprite=new THREE.Sprite(material);sprite.userData.combatHealth=true;sprite.scale.set(2.9,1.1,1);scene.add(sprite);
    return {canvas,texture,material,sprite,key:null};
  });
  return {
    draw(state){
      // Keep one readable target/threat label when soldiers crowd together; the rest
      // retain compact health bars instead of three overlapping text panels.
      const plan=enemyLabelPlan(state,focusedId);focusedId=plan.primary;
      state.guards.forEach((g,i)=>{
        const runner=g.role==='runner',cue=encounterCue(g),detailed=g.id===focusedId,label=labels[i],key=`${g.hp}/${g.phase}/${g.attack}/${g.hurt>0}/${g.open}/${g.block>0}/${detailed}/${cue?.kind}/${Math.floor((cue?.fraction??0)*12)}`;
        label.sprite.position.set(g.x,world.heightAt(g.x,g.z)+(g.labelHeight??(detailed?3.15:2.35)),g.z);label.sprite.visible=plan.visible.has(g.id)&&!state.outcome;
        const notice=cue?.kind==='attention'&&!detailed;
        label.sprite.scale.set(detailed?2.6:notice ? .65 : 1,detailed?1.3:notice ? .65 : .15,1);
        if(notice)label.sprite.position.y+=2;
        label.sprite.userData.cue=cue?.kind??null;label.sprite.userData.guardId=g.id;
        const paintKey=key+'/'+Math.ceil(g.burnRemaining??0);
        if(paintKey===label.key)return;label.key=paintKey;
        const c=label.canvas.getContext('2d');c.clearRect(0,0,256,128);c.fillStyle='#351e1be8';c.fillRect(0,0,256,128);
        // An imminent strike retains the main label. A second soldier noticing
        // the player still gets a visible alert instead of a plain health bar.
        if(notice){c.fillStyle='#ffd09a';c.font='bold 104px sans-serif';c.textAlign='center';c.fillText('!',128,100);label.texture.needsUpdate=true;return;}
        if(!detailed){c.fillStyle=g.hurt>0?'#fff4bb':g.phase==='windup'?'#ffb07e':'#df8b75';c.fillRect(8,16,240*g.hp/(g.maxHp??50),96);label.texture.needsUpdate=true;return;}
        c.textAlign='center';c.font=g.name?'bold 18px sans-serif':'bold 25px sans-serif';c.fillStyle=g.hurt>0?'#ffffff':'#f6e8c5';
        c.fillText(`${g.name??(runner?'Runner':g.role==='escort'?'Escort '+(i+1):'Soldier '+(i+1))}  ${Math.ceil(g.hp)}/${g.maxHp??50}`,128,30,232);
        c.fillStyle='#4e3a31';c.fillRect(12,39,232,10);c.fillStyle=g.hurt>0?'#fff4bb':'#df8b75';c.fillRect(12,39,232*g.hp/(g.maxHp??50),10);
        c.font='bold 19px sans-serif';c.fillStyle=cue?'#'+cue.color.toString(16).padStart(6,'0'):'#e0dccd';
        c.fillText(g.block?(g.defense?.type==='weapon'?'Partial parry':'Shield blocked'):cue?cue.text:g.phase==='stagger'?'Staggered':g.phase==='recover'||g.phase==='strike'?'Recovering':g.phase==='march'?'Heading to rally':g.guarding===false?'Closing in':g.defense?.type==='weapon'?'Weapon guard':'Shield raised',128,79,232);
        if(cue){c.fillStyle='#0d2425';c.fillRect(12,97,232,13);c.fillStyle='#'+cue.color.toString(16).padStart(6,'0');c.fillRect(12,97,232*cue.fraction,13);}
        if(g.regeneration){c.font='bold 14px sans-serif';c.fillStyle=g.burnRemaining>0?'#f0ac68':'#93c990';c.fillText(g.burnRemaining>0?`Scorched / ${Math.ceil(g.burnRemaining)}s without healing`:'Regenerates / Fireball stops healing',128,124,236);}
        label.texture.needsUpdate=true;
      });
    },
    dispose(){for(const label of labels){scene.remove(label.sprite);label.texture.dispose();label.material.dispose();}},
  };
}
