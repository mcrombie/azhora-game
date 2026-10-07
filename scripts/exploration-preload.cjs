const {contextBridge,ipcRenderer}=require('electron');
function request(operation,key,value){
  const result=ipcRenderer.sendSync('azhora:exploration-save',operation,key,value);
  if(!result?.ok)throw new Error(result?.reason||'Exploration storage is unavailable.');
  return result.value;
}
contextBridge.exposeInMainWorld('azhoraExplorationStorage',Object.freeze({
  getItem:key=>request('get',key)??null,
  setItem:(key,value)=>request('set',key,value),
}));
