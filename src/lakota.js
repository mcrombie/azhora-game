/**
 * Lakota, apart from his birds.
 *
 * He used to be two people at once: the man at the head of the pier who handed
 * over the letter, and the birder in the garden who taught you to look. He is
 * neither now. Jojo meets the boat, Perrin keeps the garden, and Lakota is the
 * seventh hired sword to come up the road (`src/mercenaries.js`, arrival 1980) -
 * a man with a quarterstaff, a red-tailed hawk on his glove and no intention of
 * hurrying to a war.
 *
 * That split needs a second piece of state. `birding.met` is "somebody has taught
 * you to look at birds", and that is Perrin's from the first minute. This is the
 * other thing: whether the traveler has got far enough with Lakota that he stops
 * being a hired sword who is plainly not one and starts offering what is his -
 * the hawk, the list of a hundred and six, the digging, the wine, the chocolate,
 * and what is on his mind.
 *
 * Deliberately small. Whatever else Lakota turns out to want remembering goes
 * here rather than into birding's snapshot, which belongs to the garden now.
 * Pure: no DOM, no three.
 */
export const LAKOTA_VERSION = 1;

export function validateLakotaSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== LAKOTA_VERSION) return false;
  return typeof data.met === 'boolean';
}

export function createLakota({ onEvent = () => {} } = {}) {
  let met = false;

  /** The traveler has worked out what he is. Once. */
  function know() {
    if (met) return { ok: true, first: false };
    met = true;
    onEvent({ type: 'lakota-known' });
    return { ok: true, first: true };
  }

  const snapshot = () => ({ version: LAKOTA_VERSION, met });

  function restore(data) {
    met = false;
    if (!validateLakotaSnapshot(data, { allowMissing: false })) return false;
    met = data.met;
    return true;
  }

  return { know, snapshot, restore, get met() { return met; } };
}

/** Lakota has his own conversation, but recruiting him follows the company's rules.
 * Always show the invitation; let him explain unmet requirements instead of removing it.
 * Read context at the click as well, so a menu cannot bypass a changed story restriction. */
export function lakotaTravelChoice({npc,companions,context=()=>({}),openDialogue,closeDialogue,
  onChange=()=>{},back=closeDialogue}={}) {
  if(npc?.id!=='merc-lakota'||!companions)return null;
  const refusal=(line)=>openDialogue(npc,[line],null,'Back to our conversation',{onComplete:back});
  if(companions.walksWith(npc.id))return {id:'merc-send-on',label:'Go on ahead of me.',action:()=>{
    const result=companions.sendOn(npc.id);if(result.ok)onChange();
    openDialogue(npc,['I will keep an eye on the road. And above it. Catch me up when you are ready.'],null,'Back to the road',{onComplete:closeDialogue});
  }};
  return {id:'merc-ask',label:'Join me on the road.',action:()=>{
    const now=context();
    if(!now.trained){refusal('Finish Officer Glun\'s training first. Then we can talk about taking the road together.');return;}
    if(now.restriction){refusal(now.restriction);return;}
    if(now.where!=='road'){
      refusal(now.phase==='mustered'?'I have already reported to the muster. The officers have the company in hand now; I cannot leave my assigned place.'
        :'Let me get onto the road first. Ask me while I am walking or stopped along the way.');return;
    }
    const may=companions.askable(npc.id,{where:now.where,has:now.has??{}});
    if(!may.ok){
      const line=may.reason==='needs'&&may.needs==='birded'
        ?`${may.line} Perrin keeps the village bird garden. Learn to observe there, then look at a bird and press B. Come back and ask me again.`
        :may.line??(may.reason==='already'?'I am already walking with you.':may.reason==='full'?'There is no room in the company just now. Send someone ahead, then ask me again.':'I cannot leave my place in the company just now.');
      refusal(line);return;
    }
    const came=companions.ask(npc.id,{where:now.where,has:now.has??{}});
    if(!came.ok){refusal(came.line??'Something has changed. Ask me again when we are both ready.');return;}
    onChange();openDialogue(npc,[came.line],null,'Back to the road',{onComplete:closeDialogue});
  }};
}
