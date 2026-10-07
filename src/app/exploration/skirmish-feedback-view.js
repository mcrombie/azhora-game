import * as THREE from 'three';

// Disposable, local combat feedback. None of these labels changes combat state.
export function createSkirmishFeedback(scene,world,count){
  let focusedId=null;
  const labels=Array.from({length:count},()=>{
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
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
      const current=nearby.find(g=>g.id===focusedId);
      const target=nearby.find(g=>g.id===state.hero.targetId),threat=nearby.find(g=>['windup','strike'].includes(g.phase));
      if(target||threat)focusedId=(target??threat).id;
      else if(!current||distance(current)>distance(nearby[0])+.65)focusedId=nearby[0]?.id??null;
      state.guards.forEach((g,i)=>{
        const runner=g.role==='runner',detailed=g.id===focusedId||runner,label=labels[i],key=`${g.hp}/${g.phase}/${g.attack}/${g.hurt>0}/${g.open}/${g.block>0}/${detailed}`;
        label.sprite.position.set(g.x,world.heightAt(g.x,g.z)+(detailed?3.1:2.35),g.z);label.sprite.visible=g.hp>0&&!g.escaped;
        label.sprite.scale.set(detailed?2.6:1,detailed?.98:.15,1);
        if(key===label.key)return;label.key=key;
        const c=label.canvas.getContext('2d');c.clearRect(0,0,256,96);c.fillStyle='#142b28e8';c.fillRect(0,0,256,96);
        if(!detailed){c.fillStyle=g.hurt>0?'#fff4bb':g.phase==='windup'?'#ffb07e':'#89c28d';c.fillRect(8,16,240*g.hp/50,64);label.texture.needsUpdate=true;return;}
        c.textAlign='center';c.font='bold 25px sans-serif';c.fillStyle=g.hurt>0?'#ffffff':'#f6e8c5';
        c.fillText(`${runner?'Runner':g.role==='escort'?'Escort '+(i+1):'Soldier '+(i+1)}  ${g.hp}/50`,128,30);
        c.fillStyle='#4e3a31';c.fillRect(12,39,232,10);c.fillStyle=g.hurt>0?'#fff4bb':'#89c28d';c.fillRect(12,39,232*g.hp/50,10);
        c.font='22px sans-serif';c.fillStyle=g.phase==='windup'?'#ffb07e':'#e0dccd';
        c.fillText(g.block?'Blocked!':g.open?'Open: counter now!':g.phase==='stagger'?'Staggered':['windup','strike'].includes(g.phase)?(g.attack==='sweep'?'Sweep: retreat!':'Thrust: sidestep!'):g.phase==='march'?'Heading to rally':'Guard raised',128,79);label.texture.needsUpdate=true;
      });
    },
    dispose(){for(const label of labels){scene.remove(label.sprite);label.texture.dispose();label.material.dispose();}},
  };
}
