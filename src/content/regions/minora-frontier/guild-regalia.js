import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

// Small personal details distinguish the Guild's silhouettes without adding
// separate character rigs, physics, or one mesh per ornament.
export function addGuildRegalia(actor,id,p){
  const chest=actor.group.getObjectByName('Chest'),head=actor.group.getObjectByName('Head');if(!chest||!head)return;
  const b=createSceneryBuilder(id+': personal guild clothing');
  if(id==='veyra'){
    b.box('#d9ded0',0,.86,.23,.34,.65,.035);b.box('#8fae9c',0,.69,.255,.29,.13,.02);
    for(const x of [-.11,.11])b.beam('#d9ded0',[x,1.17,.20],[x,1.30,.13],.05,.025);
    b.block('#638876',.25,.69,0,.20,.22,.22);for(let i=0;i<3;i++)b.cylinder('#c9c5a5',.20+i*.05,.9,.04,.018,.10);
  }else if(id==='nessa'){
    for(const side of [-1,1]){b.box('#7c7898',side*.21,1.18,.1,.18,.24,.27);b.beam('#aeb7cd',[side*.2,1.25,.26],[side*.12,.70,.27],.06,.025);}
    for(let i=0;i<6;i++)b.rock('#d3cfb5',Math.sin(i*2.4)*.13,.75+i*.07,.29,.017,.023,.01);
  }else if(id==='odran'){
    b.beam('#bdaf80',[-.2,1.3,.2],[.23,.78,.24],.045,.025);b.box('#78674d',.25,.78,.10,.22,.32,.25);
    b.box('#d2c9a7',.25,.82,.232,.15,.16,.012);for(let i=0;i<3;i++)b.box('#465c65',.25,.86-i*.04,.241,.1,.008,.005);
    b.beam('#c7b990',[-.15,.73,.25],[-.15,1.06,.25],.025);b.rock('#ddd4bb',-.16,1.1,.25,.06,.15,.02);
  }else if(id==='helba'){
    for(const side of [-1,1])for(let i=0;i<5;i++)b.rock(i%2?'#7e9958':'#536e42',side*(.08+i*.04),1.22-i*.045,.20,.11,.04,.08,side*.5);
    b.box('#856a48',.26,.77,0,.20,.25,.22);b.beam('#a49568',[.24,1.2,.18],[.26,.77,.12],.035);
    for(let i=0;i<3;i++){b.cylinder('#decaa2',.19+i*.05,.9,.02,.02,.10);b.rock('#be8f77',.19+i*.05,1.02,.02,.05,.025,.05);}
  }else if(id==='neris'){
    for(const side of [-1,1])b.box(side<0?'#d3b678':'#598b87',side*.12,1.15,.23,.16,.26,.035);
    for(let i=0;i<5;i++)b.rock('#d3b678',0,.68+i*.11,.27,.025,.04,.014);
    b.box('#56847f',.25,.83,0,.14,.4,.22);
  }else if(id==='oris'){
    b.beam('#b6bda0',[-.2,1.26,.21],[.25,.78,.21],.09,.025);
    for(let i=0;i<3;i++){b.cylinder(p.gold,.18+i*.055,.74,.23,.035,.07);b.rock('#6f604a',.18+i*.055,.73,.23,.018,.023,.018);}
    b.beam('#b4bfb0',[-.24,.72,.18],[-.24,1.07,.18],.055);for(let i=0;i<4;i++)b.rock('#444f4e',-.24,.78+i*.06,.211,.012,.012,.006);
  }else if(id==='maelon'){
    for(let i=0;i<4;i++)b.box(['#bdcbd2','#74b9c7','#b6c7b4','#b48bc9'][i],i%2?.085:-.085,i<2?1.15:.98,.245,.145,.145,.022);
    for(const x of [-.19,.19])b.beam(p.gold,[x,.8,.25],[x,1.3,.18],.025);
  }else if(id==='bolbur'){
    b.box('#b5aa7b',0,.90,.23,.42,.58,.035);for(const side of [-1,1]){b.box('#7a7955',side*.12,.94,.26,.14,.13,.025);b.box(p.gold,side*.12,1.01,.28,.025,.018,.01);}
    b.beam('#66563b',[-.24,1.26,.2],[.24,.75,.24],.045);b.box('#87734d',.29,.72,.02,.23,.28,.3);
    b.cylinder('#d3ca9f',.29,.95,.05,.055,.24);b.cylinder('#a79b71',.29,1.12,.05,.06,.06);
  }
  const mesh=b.finish(chest,{castShadow:false});mesh.position.y=-chest.position.y;mesh.material=mesh.material.clone();
  if(id==='helba'){
    const crown=createSceneryBuilder('Helba: living flower circlet');
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;crown.rock(i%3?'#799050':'#cda8b2',Math.sin(a)*.19,.39,Math.cos(a)*.18,.07,.04,.07);}
    const decoration=crown.finish(head,{castShadow:false});decoration.material=decoration.material.clone();
  }
}
