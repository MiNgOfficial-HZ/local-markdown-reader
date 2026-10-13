const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reader', {
  openFiles: () => ipcRenderer.invoke('documents:open'),
  openPaths: (paths) => ipcRenderer.invoke('documents:openPaths', paths),
  openFolder: () => ipcRenderer.invoke('documents:openFolder'),
  reveal: (filePath) => ipcRenderer.invoke('documents:reveal', filePath),
  toFileUrl: (baseDir, target) => ipcRenderer.invoke('documents:toFileUrl', baseDir, target),
  setFullscreen: (enabled) => ipcRenderer.invoke('window:setFullscreen', !!enabled),
  onFullscreenChange: (callback) => ipcRenderer.on('window:fullscreen', (_event, enabled) => callback(!!enabled)),
  onInitialDocuments: (callback) => ipcRenderer.on('documents:initial', (_event, result) => callback(result))
});
