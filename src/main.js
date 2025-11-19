const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

const ConfigManager = require('./modules/config-manager');
const ExtensionManager = require('./modules/extension-manager');
const BackupManager = require('./modules/backup-manager');
const UpdateManager = require('./modules/update-manager');

let mainWindow;
let updateManager;

function createWindow() {
  // 设置应用图标
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    
  if (process.platform === 'darwin') {
    try {
      app.dock.setIcon(iconPath);
    } catch (error) {
      console.error('设置Dock图标失败:', error);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: false,
    maximizable: false,
    frame: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 完全隐藏菜单栏
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);

  mainWindow.loadFile('src/renderer/index.html');
  
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 初始化更新管理器
  updateManager = new UpdateManager(mainWindow);
  updateManager.initialize();

  // 处理窗口控制IPC消息
  ipcMain.on('window-close', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.on('window-minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('detect-editors', async () => {
  const configManager = new ConfigManager();
  return await configManager.detectInstalledEditors();
});

ipcMain.handle('get-editor-config', async (event, editorType) => {
  const configManager = new ConfigManager();
  return await configManager.getEditorConfig(editorType);
});

ipcMain.handle('get-extensions', async (event, editorType) => {
  const extensionManager = new ExtensionManager();
  return await extensionManager.getExtensions(editorType);
});

ipcMain.handle('export-config', async (event, editorType, outputPath) => {
  const configManager = new ConfigManager();
  const extensionManager = new ExtensionManager();
  
  const config = await configManager.getEditorConfig(editorType);
  const extensions = await extensionManager.getExtensions(editorType);
  
  const exportData = {
    editorType,
    timestamp: new Date().toISOString(),
    config,
    extensions,
    platform: os.platform(),
    version: '1.0.0'
  };
  
  await fs.writeJson(outputPath, exportData, { spaces: 2 });
  return { success: true, path: outputPath };
});

ipcMain.handle('import-config', async (event, importPath, targetEditorType, configData = null) => {
  try {
    let importData;
    
    if (configData) {
      // 直接使用传入的配置数据
      importData = { config: configData };
    } else {
      // 从文件读取配置数据
      importData = await fs.readJson(importPath);
    }
    
    const configManager = new ConfigManager();
    
    await configManager.importConfig(targetEditorType, importData.config);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });
  
  return result;
});

ipcMain.handle('save-file', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'Backup Files', extensions: ['tar.gz'] }
    ],
    defaultPath: `vscode-config-${Date.now()}.json`
  });
  
  return result;
});

ipcMain.handle('select-backup-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Backup Files', extensions: ['tar.gz'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result;
});

// 备份管理IPC处理器
ipcMain.handle('create-backup', async (event, editorType, backupName) => {
  const backupManager = new BackupManager();
  return await backupManager.createBackup(editorType, backupName);
});

ipcMain.handle('list-backups', async () => {
  const backupManager = new BackupManager();
  return await backupManager.listBackups();
});

ipcMain.handle('restore-backup', async (event, backupId, targetEditorType) => {
  const backupManager = new BackupManager();
  return await backupManager.restoreBackup(backupId, targetEditorType);
});

ipcMain.handle('delete-backup', async (event, backupId) => {
  const backupManager = new BackupManager();
  return await backupManager.deleteBackup(backupId);
});

ipcMain.handle('export-backup', async (event, backupId) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Backup Files', extensions: ['tar.gz'] }
    ],
    defaultPath: `${backupId}.tar.gz`
  });
  
  if (result.canceled) return { canceled: true };
  
  const backupManager = new BackupManager();
  return await backupManager.exportBackup(backupId, result.filePath);
});

ipcMain.handle('import-backup', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Backup Files', extensions: ['tar.gz'] }
    ]
  });
  
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  
  const backupManager = new BackupManager();
  return await backupManager.importBackup(result.filePaths[0]);
});

// 扩展管理增强
ipcMain.handle('install-extension', async (event, editorType, extensionId) => {
  const extensionManager = new ExtensionManager();
  return await extensionManager.installExtension(editorType, extensionId);
});

ipcMain.handle('uninstall-extension', async (event, editorType, extensionId) => {
  const extensionManager = new ExtensionManager();
  return await extensionManager.uninstallExtension(editorType, extensionId);
});

ipcMain.handle('export-extensions', async (event, editorType, outputPath) => {
  try {
    const extensionManager = new ExtensionManager();
    const result = await extensionManager.exportExtensions(editorType, outputPath);
    return { success: true, path: result };
  } catch (error) {
    console.error('Export extensions error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-extensions', async (event, importPath, targetEditorType, extensionsData = null) => {
  try {
    let extensions;
    
    if (extensionsData) {
      // 直接使用传入的插件数据
      extensions = extensionsData;
    } else {
      // 从文件读取插件数据
      const importData = await fs.readJson(importPath);
      extensions = importData.extensions;
    }
    
    const extensionManager = new ExtensionManager();
    const results = await extensionManager.importExtensions(targetEditorType, extensions);
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 从备份文件中提取配置数据
ipcMain.handle('extract-config-from-backup-file', async (event, backupFilePath) => {
  try {
    const backupManager = new BackupManager();
    const tempDir = path.join(os.tmpdir(), `backup-extract-${Date.now()}`);
    
    // 创建临时目录
    await fs.ensureDir(tempDir);
    
    try {
      // 解压备份文件到临时目录
      await backupManager.extractCompressedBackup(backupFilePath, tempDir);
      
      // 查找解压后的文件夹
      const extractedItems = await fs.readdir(tempDir);
      let configPath = null;
      
      for (const item of extractedItems) {
        const itemPath = path.join(tempDir, item);
        const configFile = path.join(itemPath, 'config.json');
        if (await fs.pathExists(configFile)) {
          configPath = configFile;
          break;
        }
      }
      
      if (!configPath) {
        throw new Error('备份文件中没有找到配置数据');
      }
      
      // 读取配置数据
      const config = await fs.readJson(configPath);
      return { success: true, config };
      
    } finally {
      // 清理临时目录
      await fs.remove(tempDir);
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 从备份文件中提取插件数据
ipcMain.handle('extract-extensions-from-backup-file', async (event, backupFilePath) => {
  try {
    const backupManager = new BackupManager();
    const tempDir = path.join(os.tmpdir(), `backup-extract-${Date.now()}`);
    
    // 创建临时目录
    await fs.ensureDir(tempDir);
    
    try {
      // 解压备份文件到临时目录
      await backupManager.extractCompressedBackup(backupFilePath, tempDir);
      
      // 查找解压后的文件夹
      const extractedItems = await fs.readdir(tempDir);
      let extensionsPath = null;
      
      for (const item of extractedItems) {
        const itemPath = path.join(tempDir, item);
        const extensionsFile = path.join(itemPath, 'extensions.json');
        if (await fs.pathExists(extensionsFile)) {
          extensionsPath = extensionsFile;
          break;
        }
      }
      
      if (!extensionsPath) {
        throw new Error('备份文件中没有找到插件数据');
      }
      
      // 读取插件数据
      const extensions = await fs.readJson(extensionsPath);
      return { success: true, extensions };
      
    } finally {
      // 清理临时目录
      await fs.remove(tempDir);
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// JSON文件操作
ipcMain.handle('read-json-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-json-file', async (event, filePath, data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 读取配置文件
ipcMain.handle('read-config-file', async (event, configType) => {
  try {
    const configManager = new ConfigManager();
    let filePath;
    
    // 获取当前选择的编辑器类型
    const editorType = 'vscode'; // 默认使用vscode
    const editorPath = configManager.editorPaths[editorType];
    
    if (!editorPath) {
      throw new Error(`编辑器路径未找到: ${editorType}`);
    }
    
    switch (configType) {
      case 'settings':
        filePath = path.join(editorPath, 'settings.json');
        break;
      case 'keybindings':
        filePath = path.join(editorPath, 'keybindings.json');
        break;
      default:
        throw new Error(`不支持的配置类型: ${configType}`);
    }
    
    if (!(await fs.pathExists(filePath))) {
      // 如果文件不存在，创建空的配置文件
      const emptyConfig = configType === 'keybindings' ? [] : {};
      await fs.writeJson(filePath, emptyConfig, { spaces: 2 });
      return { success: true, data: emptyConfig };
    }
    
    const data = await fs.readJson(filePath);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存配置文件
ipcMain.handle('save-config-file', async (event, configType, data) => {
  try {
    const configManager = new ConfigManager();
    let filePath;
    
    // 获取当前选择的编辑器类型
    const editorType = 'vscode'; // 默认使用vscode
    const editorPath = configManager.editorPaths[editorType];
    
    if (!editorPath) {
      throw new Error(`编辑器路径未找到: ${editorType}`);
    }
    
    // 确保目录存在
    await fs.ensureDir(editorPath);
    
    switch (configType) {
      case 'settings':
        filePath = path.join(editorPath, 'settings.json');
        break;
      case 'keybindings':
        filePath = path.join(editorPath, 'keybindings.json');
        break;
      default:
        throw new Error(`不支持的配置类型: ${configType}`);
    }
    
    await fs.writeJson(filePath, data, { spaces: 2 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 读取编辑器设置
ipcMain.handle('read-editor-settings', async (event, editorType) => {
  try {
    const configManager = new ConfigManager();
    const editorPath = configManager.editorPaths[editorType];
    
    if (!editorPath) {
      throw new Error(`编辑器路径未找到: ${editorType}`);
    }
    
    const settingsPath = path.join(editorPath, 'settings.json');
    
    if (!(await fs.pathExists(settingsPath))) {
      // 如果文件不存在，创建空的设置文件
      const emptySettings = {};
      await fs.ensureDir(editorPath);
      await fs.writeJson(settingsPath, emptySettings, { spaces: 2 });
      return { success: true, data: emptySettings };
    }
    
    const data = await fs.readJson(settingsPath);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存编辑器设置
ipcMain.handle('save-editor-settings', async (event, editorType, data) => {
  try {
    const configManager = new ConfigManager();
    const editorPath = configManager.editorPaths[editorType];
    
    if (!editorPath) {
      throw new Error(`编辑器路径未找到: ${editorType}`);
    }
    
    // 确保目录存在
    await fs.ensureDir(editorPath);
    
    const settingsPath = path.join(editorPath, 'settings.json');
    await fs.writeJson(settingsPath, data, { spaces: 2 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 更新管理 IPC 处理器
ipcMain.handle('check-for-updates', async () => {
  try {
    if (updateManager) {
      await updateManager.checkForUpdates(true);
      return { success: true };
    }
    return { success: false, error: '更新管理器未初始化' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    if (updateManager) {
      await updateManager.downloadUpdate();
      return { success: true };
    }
    return { success: false, error: '更新管理器未初始化' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  try {
    if (updateManager) {
      updateManager.quitAndInstall();
      return { success: true };
    }
    return { success: false, error: '更新管理器未初始化' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('skip-version', async (event, version) => {
  try {
    if (updateManager) {
      const config = updateManager.getUpdateConfig();
      config.skippedVersion = version;
      updateManager.saveUpdateConfig(config);
      return { success: true };
    }
    return { success: false, error: '更新管理器未初始化' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-update-config', async () => {
  try {
    if (updateManager) {
      const config = updateManager.getUpdateConfig();
      return { success: true, config };
    }
    return { success: false, error: '更新管理器未初始化' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-update-config', async (event, config) => {
  try {
    if (updateManager) {
      updateManager.saveUpdateConfig(config);
      return { success: true };
    }
    return { success: false, error: '更新管理器未初始化' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-current-version', async () => {
  try {
    if (updateManager) {
      const version = updateManager.getCurrentVersion();
      return { success: true, version };
    }
    return { success: false, error: '更新管理器未初始化' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
