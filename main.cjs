const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkdn', '.txt']);
let mainWindow;
const initialDocuments = process.argv.filter((value) => typeof value === 'string' && isMarkdownPath(value));

function isMarkdownPath(filePath) {
  return MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function titleFromMarkdown(content, filePath) {
  const heading = String(content).match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(filePath, path.extname(filePath));
}

async function readDocument(filePath) {
  const absolutePath = path.resolve(filePath);
  const stat = await fs.stat(absolutePath);
  if (!stat.isFile()) throw new Error('不是文件：' + absolutePath);
  if (stat.size > MAX_DOCUMENT_BYTES) throw new Error('文件超过 8 MB：' + absolutePath);
  const content = await fs.readFile(absolutePath, 'utf8');
  return {
    id: absolutePath,
    path: absolutePath,
    dir: path.dirname(absolutePath),
    name: path.basename(absolutePath),
    title: titleFromMarkdown(content, absolutePath),
    content,
    bytes: stat.size,
    modifiedAt: stat.mtimeMs
  };
}

async function readPaths(paths) {
  const results = [];
  const errors = [];
  for (const filePath of paths) {
    try {
      if (isMarkdownPath(filePath)) results.push(await readDocument(filePath));
    } catch (error) {
      errors.push({ path: filePath, message: error.message });
    }
  }
  return { documents: results, errors };
}

async function findMarkdownFiles(folder) {
  const files = [];
  const entries = await fs.readdir(folder, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(entryPath));
    } else if (entry.isFile() && isMarkdownPath(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#131b24',
    title: 'MiNg Markdown Reader',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('window:fullscreen', true));
  mainWindow.on('leave-full-screen', () => mainWindow.webContents.send('window:fullscreen', false));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.once('did-finish-load', async () => {
    if (!initialDocuments.length) return;
    mainWindow.webContents.send('documents:initial', await readPaths(initialDocuments));
  });
}

ipcMain.handle('documents:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开 Markdown 文件',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Markdown 文档', extensions: ['md', 'markdown', 'mdown', 'mkdn', 'txt'] }]
  });
  if (result.canceled) return { documents: [], errors: [] };
  return readPaths(result.filePaths);
});

ipcMain.handle('documents:openPaths', (_event, paths) => {
  if (!Array.isArray(paths)) return { documents: [], errors: [] };
  return readPaths(paths.filter((value) => typeof value === 'string'));
});

ipcMain.handle('documents:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开 Markdown 文件夹',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths[0]) return { documents: [], errors: [] };
  const folder = result.filePaths[0];
  const names = (await findMarkdownFiles(folder)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  return readPaths(names);
});

ipcMain.handle('documents:reveal', (_event, filePath) => {
  if (typeof filePath === 'string') shell.showItemInFolder(filePath);
});

ipcMain.handle('window:setFullscreen', (_event, enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  mainWindow.setFullScreen(Boolean(enabled));
  return mainWindow.isFullScreen();
});

ipcMain.handle('documents:toFileUrl', (_event, baseDir, target) => {
  if (typeof baseDir !== 'string' || typeof target !== 'string') return '';
  if (/^(?:https?:|data:|file:|mailto:|#)/i.test(target)) return target;
  return pathToFileURL(path.resolve(baseDir, target)).href;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
