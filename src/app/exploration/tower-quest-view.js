import * as THREE from 'three';
import {TOWER,TALETH_SPOT} from './tower-state.js';
import {towerFloorAt} from '../../content/regions/minora-frontier/tower-floor-layout.js';
import {writeHud} from './hud-write.js';
import {guidanceScreenPoint} from '../../ui/map/direction-projection.js';
import {warPointerPlacement} from './war-pointer-layout.js';

export function towerQuest(state,position,mode){
  if(!state.inside||state.room!=='tower'||mode!=='playing')return null;
  // Once the campaign has begun, its existing quest panel owns direction.
  if(state.briefed)return null;
  const floor=towerFloorAt(position.y),here=floor.id==='taleth';
  return {title:'Speak with Taleth',detail:here?'Taleth is waiting in his chamber. Approach him and press F to learn about the Lizeemi War and choose your league.':'Return to Taleth’s chamber on the central floor. He is waiting to explain your mission in Azhora.',
    target:{...TALETH_SPOT,y:TOWER.y+2.25},showMarker:here};
}

export function createTowerQuestView({state,position,mode,quest:readQuest=null,renderCard=null}){
  const card=document.createElement('aside');card.id='tower-main-quest';card.hidden=true;
  card.innerHTML='<small>MAIN QUEST / AZHORA</small><h3></h3><p></p><span>Time stands still in the tower.</span>';
  const marker=document.createElement('div');marker.id='taleth-main-quest-marker';marker.hidden=true;
  marker.innerHTML='<small>Main quest</small><strong>Speak with Taleth</strong><span aria-hidden="true">◆</span>';
  document.body.append(card,marker);const point=new THREE.Vector3();
  let lastLayout=-Infinity,obstacles=[];
  const obstacleIds=['tower-main-quest','exploration-minimap','music-now-playing','exploration-hud','exploration-help','world-autoplay','exploration-status'];
  function layout(){
    const now=performance.now();if(now-lastLayout<250)return;lastLayout=now;obstacles=[];
    for(const id of obstacleIds){const node=document.getElementById(id);if(!node||node.hidden)continue;const r=node.getBoundingClientRect();if(r.width&&r.height)obstacles.push(r);}
  }
  return {hide(){card.hidden=true;marker.hidden=true;},draw(camera){
    const quest=readQuest?readQuest():towerQuest(state(),position,mode());writeHud(card,'hidden',!quest);
    if(!quest){marker.hidden=true;return;}
    // Feature-owned cards share the same screen-space pointer and obstacle bounds.
    if(renderCard)renderCard(card,quest);
    else{
      writeHud(card.querySelector('h3'),'textContent',quest.title);writeHud(card.querySelector('p'),'textContent',quest.detail);
      writeHud(card.querySelector('small'),'textContent',quest.label??'MAIN QUEST / AZHORA');
      writeHud(card.querySelector('span'),'textContent',quest.clock??'Time stands still in the tower.');
    }
    marker.classList.toggle('directional',!!quest.edgeMarker);
    if(quest.edgeMarker){
      const distance=Math.round(Math.hypot(quest.target.x-position.x,quest.target.z-position.z));
      const words=`${quest.markerLabel??quest.title} \u00b7 ${distance} m`;
      writeHud(marker.querySelector('strong'),'textContent',words);
      marker.title=words+' direct';marker.dataset.target=quest.target.id??'';marker.dataset.distance=String(distance);
      marker.hidden=!quest.showMarker;if(marker.hidden)return;
      camera.updateMatrixWorld();point.set(quest.target.x,quest.target.y,quest.target.z).applyMatrix4(camera.matrixWorldInverse);
      const focal=1/Math.tan(camera.fov*Math.PI/360),projected=guidanceScreenPoint({x:point.x*focal,y:point.y*focal,z:point.z},camera.aspect);
      layout();const desired={x:(projected.x+1)*innerWidth/2,y:(projected.y+1)*innerHeight/2};
      const placed=warPointerPlacement(desired,{width:innerWidth,height:innerHeight},{width:Math.min(280,words.length*7+42),height:40},obstacles);
      marker.hidden=!placed;if(!placed)return;
      const edge=projected.edge||placed.shifted,angle=placed.shifted&&!projected.edge?Math.atan2(desired.y-placed.y,desired.x-placed.x):projected.angle;
      const arrow=marker.querySelector('span');arrow.textContent=edge?'\u279c':'\u25c6';arrow.style.transform=edge?`rotate(${angle}rad)`:'none';
      marker.dataset.edge=String(edge);marker.style.left=`${placed.x}px`;marker.style.top=`${placed.y}px`;return;
    }
    writeHud(marker.querySelector('strong'),'textContent',quest.title);
    marker.querySelector('span').textContent='\u25c6';marker.querySelector('span').style.transform='none';
    point.set(quest.target.x,quest.target.y,quest.target.z).project(camera);
    marker.hidden=!quest.showMarker||point.z< -1||point.z>1||Math.abs(point.x)>.96||Math.abs(point.y)>.94;
    if(!marker.hidden){marker.style.left=`${(point.x+1)*innerWidth/2}px`;marker.style.top=`${(1-point.y)*innerHeight/2}px`;}
  },dispose(){card.remove();marker.remove();}};
}
