import {writeHud} from './hud-write.js';

const fate=a=>a.yielded?'yielded':!a.hp?'fallen':a.routed?'retreated':null;
const spirit=value=>value<=25?'Breaking':value<50?'Shaken':value>=80?'Inspired':'Steady';

// A fixed pair of commander rows, two meters, and one temporary announcement.
// No extra actors, polling loop, timers or campaign mutation.
export function createCommanderHud(){
  const root=document.createElement('div');root.id='commander-hud';root.hidden=true;
  const enemy=document.createElement('div'),ally=document.createElement('div'),morale=document.createElement('div');
  morale.className='commander-morale';
  const meters=['Your morale','Enemy morale'].map(name=>{
    const row=document.createElement('label'),text=document.createElement('span'),meter=document.createElement('meter');
    meter.min=0;meter.max=100;meter.setAttribute('aria-label',name);row.append(text,meter);morale.append(row);return {text,meter,name};
  });
  root.append(enemy,ally,morale);document.getElementById('world-skirmish-phase').after(root);
  const notice=document.createElement('div');notice.id='commander-notice';notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.setAttribute('aria-atomic','true');
  const title=document.createElement('strong'),effect=document.createElement('span');notice.append(title,effect);document.body.append(notice);
  const seen=new Map();let until=0;
  function row(node,who,side){
    writeHud(node,'hidden',!who);
    if(who)writeHud(node,'textContent',`${side}: ${who.name.replace(/^Captain /,'')} / ${fate(who)??`${Math.ceil(who.hp)} health`}`);
  }
  return {draw(s){
    const opposing=s.guards.find(a=>a.commanderId||a.role==='champion'),friendly=s.allies?.find(a=>a.commanderId);
    writeHud(root,'hidden',!!s.outcome||!opposing?.commanderId&&!friendly&&!s.morale);
    row(enemy,opposing,'Enemy captain');row(ally,friendly,'Your captain');
    writeHud(morale,'hidden',!s.morale);
    if(s.morale)for(const [i,key] of ['allies','enemies'].entries()){
      const value=s.morale[key],m=meters[i];writeHud(m.meter,'value',value);
      writeHud(m.text,'textContent',`${m.name}: ${spirit(value)} ${value}`);
    }
    const changed=[];
    for(const [key,a] of [['enemy',opposing],['ally',friendly]]){
      if(!a?.commanderId)continue;
      const now=fate(a);if(seen.has(a.commanderId)&&now&&!seen.get(a.commanderId))changed.push({key,a,now});
      seen.set(a.commanderId,now);
    }
    if(changed.length){
      until=s.time+6;
      writeHud(title,'textContent',changed.map(({a,now})=>`${a.name} has ${now}`).join(' · '));
      writeHud(effect,'textContent',changed.length>1?'Both captains are out of the fight. The morale shifts offset each other.':changed[0].key==='enemy'?'Your morale rises · Enemy morale falls':'Your morale falls · Enemy morale rises');
    }
    writeHud(notice,'hidden',!!s.outcome||s.time>=until);
  },dispose(){root.remove();notice.remove();}};
}
