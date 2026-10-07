const { contextBridge, ipcRenderer } = require('electron');

function request(operation, key, value) {
  const result = ipcRenderer.sendSync('azhora:road-checkpoint', operation, key, value);
  if (!result || result.ok !== true)
    throw new Error(result?.reason || 'Checkpoint storage is unavailable.');
  return result.value;
}

// A narrow storage-shaped API keeps the sandboxed renderer away from the file system.
contextBridge.exposeInMainWorld('azhoraRoadStorage', Object.freeze({
  getItem(key) { return request('get', key) ?? null; },
  setItem(key, value) { request('set', key, value); },
  removeItem(key) { request('remove', key); },
}));

// Derived terrain only; no renderer-controlled paths and no access to game saves.
let terrainVersion=null;
contextBridge.exposeInMainWorld('azhoraTerrainCache',Object.freeze({
  async read(){const result=await ipcRenderer.invoke('azhora:terrain-cache','read');terrainVersion=result?.version??null;return result?.entry??null;},
  write(value){return ipcRenderer.invoke('azhora:terrain-cache','write',{version:terrainVersion,entry:value});},
}));

// Append-only facts and generated accounts; renderer IDs never become paths.
contextBridge.exposeInMainWorld('azhoraChronicles',Object.freeze({request:(operation,args)=>ipcRenderer.invoke('azhora:chronicles',operation,args)}));
