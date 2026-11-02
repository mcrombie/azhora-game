import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

// Four vertex-coloured batches per bird: body/feet, head and two wings. No
// skinned skeleton, textures, shadow pass or dependency on outdoor wildlife.
export function createTowerBirdModel(parent,d){
  const root=new THREE.Group(),rig=new THREE.Group();root.name=d.name;root.add(rig);
  const meshes=[];let material;
  function part(name,holder,build){
    const b=createSceneryBuilder(`${d.name}: ${name}`);build(b);
    const mesh=b.finish(holder,{castShadow:false});
    material??=mesh.material.clone();mesh.material=material;meshes.push(mesh);return mesh;
  }
  const owl=d.form==='owl',hover=d.form==='hummingbird',longTail=['magpie','swallow'].includes(d.form);
  const head=new THREE.Group();head.position.set(0,owl?.66:.53,owl?-.06:-.23);rig.add(head);
  part('plumage and gripping feet',rig,b=>{
    b.rock(d.back,0,owl?.38:.32,0,owl?.26:.18,owl?.34:.22,.28);
    b.rock(d.belly,0,owl?.35:.29,-.12,owl?.225:.155,owl?.27:.18,.19);
    if(d.form==='swallow'){
      for(const s of [-1,1])b.beam(d.wing,[s*.04,.24,.20],[s*.15,.18,.79],.065,.025);
      b.rock(d.accent,0,.44,-.28,.12,.08,.07);
    }else{
      const end=longTail?.82:owl?.32:d.form==='dove'?.59:.49;
      for(let i=-1;i<=1;i++)b.beam(d.wing,[i*.055,.23,.16],[i*.075,.16,end-Math.abs(i)*.05],.085,.028);
    }
    const foot=owl||d.form==='falcon'?'#a28b57':'#867567';
    for(const s of [-1,1]){
      const x=s*(owl?.10:.075);
      b.beam(foot,[x,.02,0],[x,.19,.035],.023);
      for(let j=-1;j<=1;j++)b.beam(foot,[x,.025,0],[x+j*.028,.003,-.09],.014);
      b.beam(foot,[x,.025,.008],[x,.009,.067],.014);
    }
    if(d.form==='raven')for(let i=-1;i<=1;i++)b.beam(d.accent,[i*.035,.46,-.24],[i*.05,.31,-.28],.035);
    if(d.form==='kingfisher')b.rock(d.back,0,.38,-.27,.14,.06,.03);
    if(d.form==='falcon'||d.species==='snowy-owl')for(let row=0;row<4;row++)for(const s of [-1,1])
      b.rock(d.accent,s*.085,.24+row*.065,-.278,.049,.013,.016);
  });
  part('face, bill and species markings',head,b=>{
    b.rock(d.head,0,0,0,owl?.27:.145,owl?.24:.145,owl?.22:.15);
    if(owl){
      for(const s of [-1,1]){
        b.rock(d.species==='barn-owl'?'#8b7657':'#b9bdb6',s*.115,-.006,-.182,.135,.178,.058);
        b.rock(d.belly,s*.112,-.012,-.211,.12,.16,.038);
      }
      b.rock(d.belly,0,-.13,-.213,.115,.11,.027);
      b.rock(d.beak,0,-.085,-.25,.033,.067,.055);
      for(const s of [-1,1]){
        b.rock(d.eye,s*.112,.025,-.25,.045,.051,.025);
        b.rock('#242a2c',s*.112,.025,-.272,.022,.032,.009);
        b.rock('#efeee0',s*.104,.043,-.282,.009,.011,.006);
      }
    }else{
      const bill=hover?.27:d.form==='kingfisher'?.25:d.form==='raven'?.19:.10;
      b.rock(d.beak,0,-.025,-.14-bill*.40,.042,.033,bill*.67);
      if(d.form==='falcon')b.rock('#393b38',0,-.065,-.221,.026,.045,.034);
      for(const s of [-1,1]){
        if(['jay','falcon','swallow'].includes(d.form))b.rock(d.form==='swallow'?d.accent:d.belly,s*.10,-.05,-.05,.055,.07,.08);
        if(d.form==='falcon')b.rock(d.head,s*.125,-.055,-.10,.025,.095,.034);
        b.rock(d.form==='dove'?'#b7bcb6':d.belly,s*.126,.027,-.085,.028,.032,.024);
        b.rock('#20282c',s*.145,.029,-.095,.020,.022,.016);
        b.rock('#eeefdf',s*.155,.036,-.101,.006,.007,.006);
      }
      if(d.form==='jay')b.rock(d.head,0,.15,.055,.07,.15,.08);
      if(d.form==='kingfisher')for(let i=0;i<4;i++)b.rock(d.head,0,.12+i*.01,-.05+i*.065,.07,.07+i*.02,.065);
      if(hover)b.rock(d.accent,0,-.09,-.13,.085,.055,.035);
      if(d.form==='swallow')b.rock(d.accent,0,-.045,-.13,.09,.085,.04);
    }
  });
  const wings=[-1,1].map(s=>{
    const pivot=new THREE.Group();pivot.position.set(s*(owl?.20:.135),.40,.015);rig.add(pivot);
    part('wing',pivot,b=>{
      if(hover){b.rock(d.wing,s*.30,0,.02,.33,.025,.11);return;}
      b.rock(d.wing,s*.035,-.045,.085,owl?.09:.075,owl?.28:.19,.28);
      for(let i=0;i<4;i++)b.beam(i%2?d.back:d.wing,[s*.05,-.02,.09+i*.038],[s*.06,-.19,.29+i*.026],.038,.022);
      if(d.form==='magpie')b.rock(d.accent,s*.093,.025,-.005,.024,.12,.105);
      if(d.form==='jay')for(let i=0;i<4;i++)b.rock(i%2?d.belly:d.accent,s*.096,-.04-i*.045,.17,.022,.015,.115);
      if(d.form==='dove'||d.species==='snowy-owl')for(let i=0;i<5;i++)b.rock(d.accent,s*.097,-.10+(i%2)*.09,-.03+i*.055,.012,.022,.026);
      if(d.species==='barn-owl')for(let i=0;i<5;i++)b.rock('#e8d6ac',s*.11,-.18+i*.07,.10+(i%2)*.08,.015,.018,.024);
    });return pivot;
  });
  rig.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(rig).getSize(new THREE.Vector3());
  rig.scale.setScalar(d.length/(owl?size.y:size.z));
  // Keep toes on the perch, independent of the chosen bird's proportions.
  rig.updateMatrixWorld(true);rig.position.y=-new THREE.Box3().setFromObject(rig).min.y;
  parent.add(root);
  return {root,rig,head,wings,meshes,
    animate(t){
      head.rotation.y=Math.sin(t*.77)*.4+Math.sin(t*.23)*.17;
      head.rotation.x=.045*Math.sin(t*1.9);
      const stretch=Math.max(0,Math.sin(t*.62)-.90)*6;
      wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(hover?Math.sin(t*95)*.85:stretch));
    },
    dispose(){root.removeFromParent();for(const m of meshes)m.geometry.dispose();material.dispose();},
  };
}
