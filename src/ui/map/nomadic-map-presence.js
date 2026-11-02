// Screen-sized, selectable encampment markers. Presence does not paint territory
// or mutate campaign armies. Future movement must supply an explicit location.
export function createNomadicMapPresence(viewport,onSelect){
  const layer=document.createElement('div');layer.id='atlas-nomadic-presences';viewport.append(layer);
  let current=[],transform={scale:1,x:0,y:0};
  function place(){
    for(const {button,at} of current){
      const x=transform.x+at.x*transform.scale,y=transform.y+at.y*transform.scale;
      button.style.left=x+'px';button.style.top=y+'px';
      button.hidden=x<0||y<0||x>viewport.clientWidth||y>viewport.clientHeight;
    }
  }
  return {
    render(presences,regionCells,knownRegions,knownKeys,reveal,cellKey,visible){
      layer.hidden=!visible;layer.replaceChildren();current=[];if(!visible)return;
      for(const presence of presences){
        if(!knownRegions.has(presence.region))continue;
        const cells=regionCells.get(presence.region)??[],points=cells.flat();if(!points.length)continue;
        const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
        const aim={x:Math.min(...xs)+(Math.max(...xs)-Math.min(...xs))*presence.anchor.x,y:Math.min(...ys)+(Math.max(...ys)-Math.min(...ys))*presence.anchor.y};
        const candidates=cells.map(cell=>({cell,at:{x:cell.reduce((n,p)=>n+p[0],0)/cell.length,y:cell.reduce((n,p)=>n+p[1],0)/cell.length}}));
        candidates.sort((a,b)=>Math.hypot(a.at.x-aim.x,a.at.y-aim.y)-Math.hypot(b.at.x-aim.x,b.at.y-aim.y));
        const point=candidates[0];if(!point||!reveal&&!knownKeys.has(cellKey(point.cell)))continue;
        const button=document.createElement('button');button.type='button';button.dataset.presence=presence.id;
        button.setAttribute('aria-label',`${presence.name}: nomadic encampment in ${presence.region}`);
        button.title=`${presence.name} / nomadic encampment`;
        button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20L12 4L21 20Z M12 4V1 M8 20L12 12L16 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
        button.style.setProperty('--presence-color',presence.color);
        button.addEventListener('click',e=>{e.stopPropagation();onSelect(presence.id);});
        layer.append(button);current.push({button,at:point.at});
      }
      place();
    },
    transform(value){transform=value;place();},
    state:()=>current.map(({button,at})=>({id:button.dataset.presence,at,visible:!button.hidden})),
  };
}
