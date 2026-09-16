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
