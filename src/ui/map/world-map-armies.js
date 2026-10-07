// Screen-space markers stay legible at every zoom. Only selection opens detail.
export function createMapArmies(viewport,traveler,onTrack){
  const layer=document.createElement('div');layer.id='atlas-armies';layer.setAttribute('aria-label','Discovered armies');
  const card=document.createElement('aside');card.id='atlas-army-detail';card.hidden=true;card.setAttribute('aria-label','Selected army');
  const close=document.createElement('button');close.textContent='Close';close.setAttribute('aria-label','Close army details');
  const title=document.createElement('h3'),summary=document.createElement('p'),detail=document.createElement('p'),note=document.createElement('small');
  note.textContent='Daily strategic estimate. Routes are not physical roads.';
  const track=document.createElement('button');track.id='atlas-track-army';track.textContent='Track army';track.onclick=()=>onTrack({kind:'army',id:selected});
  card.append(close,title,summary,detail,note,track);viewport.insertBefore(layer,traveler??null);viewport.append(card);
  let marks=[],selected=null,layout=null,tracked=null;
  close.onclick=()=>{selected=null;draw();};
  function select(id){selected=id;draw();}
  function draw(){
    if(!layout)return;
    const {scale,x:ox,y:oy,width,height,known}=layout;
    const visible=marks.filter(known),chosen=visible.find(m=>m.id===selected);
    if(!chosen)selected=null;
    card.hidden=!chosen;
    track.textContent=tracked?.kind==='army'&&tracked.id===selected?'Stop tracking':'Track army';
    if(chosen){title.textContent=chosen.name;summary.textContent=`${chosen.faction} / ${chosen.strength} strength`;detail.textContent=chosen.detail;}
    const focused=layer.querySelector('button:focus')?.dataset.armyId;
    layer.replaceChildren();
    if(chosen?.route){
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','100%');svg.setAttribute('height','100%');
      const line=document.createElementNS(svg.namespaceURI,'line');
      for(const [k,v]of Object.entries({x1:ox+chosen.route.from.x*scale,y1:oy+chosen.route.from.y*scale,x2:ox+chosen.route.to.x*scale,y2:oy+chosen.route.to.y*scale,stroke:chosen.color,'stroke-width':3,'stroke-dasharray':'6 5'}))line.setAttribute(k,v);
      svg.append(line);layer.append(svg);
    }
    const placed=[];
    for(const m of visible){
      let x=ox+m.x*scale,y=oy+m.y*scale;
      if(x<0||y<0||x>width||y>height)continue;
      // Fan out co-located armies without changing their strategic coordinates.
      while(placed.some(p=>Math.hypot(x-p.x,y-p.y)<29))x+=30;
      placed.push({x,y});
      const b=document.createElement('button');b.className='atlas-army';b.dataset.armyId=m.id;b.textContent=m.status==='retreating'?'\u21a9':m.status==='marching'?'\u279c':'\u2691';
      b.style.left=x+'px';b.style.top=y+'px';b.style.setProperty('--army-color',m.color);b.setAttribute('aria-pressed',String(m.id===selected));
      b.setAttribute('aria-label',`${m.name}, ${m.faction}, ${m.strength} strength, ${m.status}`);b.title=`${m.name}: ${m.status}. Select for details.`;
      b.onclick=()=>select(m.id);layer.append(b);if(focused===String(m.id))b.focus({preventScroll:true});
    }
  }
  return {set(m){marks=m;draw();},setTracked(value){tracked=value;draw();},render(value){layout=value;draw();},select,find:id=>marks.find(m=>m.id===id&&layout?.known(m)),
    state:()=>({markers:marks.filter(m=>layout?.known(m)).map(m=>m.id),selected,route:!!marks.find(m=>m.id===selected)?.route})};
}
