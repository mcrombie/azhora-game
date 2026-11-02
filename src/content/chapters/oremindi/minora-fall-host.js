import {createMinoraFallScene} from './minora-fall-scene.js';
// Presentation only: the Chapter 2 host commits occupation after this promise
// completes, and then opens the speaking bird's conversation.
export function createMinoraFallPresentation({scene,world,setMode}){
  let view=null,resolve=null,active=false,disposed=false;const hidden=new Map();
  const release=world.addExteriorFeature({filterCollider:c=>!view?.state().completed||c.id!=='menora-sorcerers-guild'});
  const card=document.createElement('section');card.hidden=true;card.setAttribute('aria-label','The fall of Minora');
  card.style.cssText='position:fixed;bottom:5%;left:5%;max-width:540px;background:#17292ded;color:#eee0bc;padding:22px 26px;border-left:3px solid #913b45;z-index:65';
  const title=document.createElement('h2'),words=document.createElement('p'),skip=document.createElement('button');skip.textContent='Skip to the messenger';skip.onclick=()=>view?.finish();card.append(title,words,skip);document.body.append(card);
  function end(){if(!active)return;active=false;card.hidden=true;const done=resolve;resolve=null;setMode('playing');done?.(true);}
  return {
    async start(){if(active||disposed)return false;view?.dispose();for(const [node,visible]of hidden)node.visible=visible;hidden.clear();active=true;card.hidden=false;setMode('cinematic');
      return new Promise(done=>{resolve=done;try{view=createMinoraFallScene({scene,world,onComplete:end});}catch(error){active=false;resolve=null;card.hidden=true;setMode('playing');done(false);console.error(error);}});
    },
    occupied(){if(view||disposed)return;view=createMinoraFallScene({scene,world,phase:'occupied'});},
    update(dt,running,point,inside=false){
      const visible=!inside&&(active||!point||Math.hypot(point.x+2438,point.z-148)<520);if(view)view.group.visible=visible;
      view?.update(dt,{active:running&&visible,loading:false});
      if(!hidden.size&&view?.state().elapsed>=42&&world.readyAt(-2414,42))world.exteriorRoot?.traverse(o=>{if(o.name==='The Sorcerers’ Guild'){hidden.set(o,o.visible);o.visible=false;}});
      if(active){const shot=view.camera();title.textContent=shot.caption;words.textContent=shot.detail;}
    },
    reset(){if(active)return false;view?.dispose();view=null;for(const [node,visible]of hidden)node.visible=visible;hidden.clear();return true;},
    camera:()=>active?view?.camera():null,active:()=>active,state:()=>view?.state()??null,
    keydown(event){if(!active)return false;if(event.code==='Escape'){event.preventDefault();if(!event.repeat)view.finish();}return !event.target?.closest('button')||!['Enter','Space','Tab'].includes(event.code);},
    dispose(){disposed=true;active=false;resolve?.(false);resolve=null;view?.dispose();for(const [node,visible]of hidden)node.visible=visible;hidden.clear();release();card.remove();},
  };
}
