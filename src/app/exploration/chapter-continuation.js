// Read the completed prior chapter before switching mode. This never writes the
// source save and never falls back to an unattended premise on a failed Continue.
export function continuationMode(search=''){
  const id=new URLSearchParams(search).get('continuation');return ['yunethre','oremindi'].includes(id)?id:null;
}
export async function loadChapterContinuation(mode,storage){
  try{
    if(mode==='yunethre'){
      const {worldWarStore}=await import('./war-checkpoint.js'),previous=worldWarStore(storage).read();
      if(!previous.ok)return previous;
      if(!previous.data)return {ok:false,reason:'Finish and save Chapter 1 before continuing to Yunethre.'};
      const {newYunethreSave}=await import('../../content/chapters/yunethre/checkpoint.js');
      return {ok:true,mode,data:newYunethreSave(previous.data)};
    }
    if(mode==='oremindi'){
      const {yunethreStore}=await import('../../content/chapters/yunethre/checkpoint.js'),previous=yunethreStore(storage).read();
      if(!previous.ok)return previous;
      if(!previous.data)return {ok:false,reason:'Finish and save Chapter 2 before continuing to the relocated tower.'};
      const {newOremindiSave}=await import('../../content/chapters/oremindi/checkpoint.js');
      return {ok:true,mode,data:newOremindiSave(previous.data)};
    }
    return {ok:false,reason:'Unknown chapter continuation.'};
  }catch(error){return {ok:false,reason:error.message||'The prior chapter could not be opened. Its save has been kept.'};}
}
