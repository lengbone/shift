const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.platform = os.platform();
    this.homeDir = os.homedir();
    
    // 支持的编辑器配置路径
    this.editorPaths = {
      vscode: this.getVSCodePath(),
      cursor: this.getCursorPath(),
      trae: this.getTraePath(),
      windsurf: this.getWindsurfPath(),
      qoder: this.getQoderPath(),
      kiro: this.getKiroPath(),
      antigravity: this.getAntigravityPath()
    };
  }

  getVSCodePath() {
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, 'AppData', 'Roaming', 'Code', 'User');
      case 'darwin':
        return path.join(this.homeDir, 'Library', 'Application Support', 'Code', 'User');
      case 'linux':
        return path.join(this.homeDir, '.config', 'Code', 'User');
      default:
        return null;
    }
  }

  getCursorPath() {
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, 'AppData', 'Roaming', 'Cursor', 'User');
      case 'darwin':
        return path.join(this.homeDir, 'Library', 'Application Support', 'Cursor', 'User');
      case 'linux':
        return path.join(this.homeDir, '.config', 'Cursor', 'User');
      default:
        return null;
    }
  }

  getTraePath() {
    // Trae 基于VSCode，路径类似
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, 'AppData', 'Roaming', 'Trae', 'User');
      case 'darwin':
        return path.join(this.homeDir, 'Library', 'Application Support', 'Trae', 'User');
      case 'linux':
        return path.join(this.homeDir, '.config', 'Trae', 'User');
      default:
        return null;
    }
  }

  getWindsurfPath() {
    // Windsurf 基于VSCode，路径类似
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, 'AppData', 'Roaming', 'Windsurf', 'User');
      case 'darwin':
        return path.join(this.homeDir, 'Library', 'Application Support', 'Windsurf', 'User');
      case 'linux':
        return path.join(this.homeDir, '.config', 'Windsurf', 'User');
      default:
        return null;
    }
  }

  getQoderPath() {
    // Qoder 基于VSCode，路径类似
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, 'AppData', 'Roaming', 'Qoder', 'User');
      case 'darwin':
        return path.join(this.homeDir, 'Library', 'Application Support', 'Qoder', 'User');
      case 'linux':
        return path.join(this.homeDir, '.config', 'Qoder', 'User');
      default:
        return null;
    }
  }

  getKiroPath() {
    // Kiro 基于VSCode，路径类似
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, 'AppData', 'Roaming', 'Kiro', 'User');
      case 'darwin':
        return path.join(this.homeDir, 'Library', 'Application Support', 'Kiro', 'User');
      case 'linux':
        return path.join(this.homeDir, '.config', 'Kiro', 'User');
      default:
        return null;
    }
  }

  getAntigravityPath() {
    // Antigravity 基于VSCode，路径类似
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, 'AppData', 'Roaming', 'Antigravity', 'User');
      case 'darwin':
        return path.join(this.homeDir, 'Library', 'Application Support', 'Antigravity', 'User');
      case 'linux':
        return path.join(this.homeDir, '.config', 'Antigravity', 'User');
      default:
        return null;
    }
  }

  async detectInstalledEditors() {
    const detected = {};
    
    for (const [editor, configPath] of Object.entries(this.editorPaths)) {
      if (configPath && await fs.pathExists(configPath)) {
        detected[editor] = {
          installed: true,
          configPath,
          settingsFile: path.join(configPath, 'settings.json'),
          keybindingsFile: path.join(configPath, 'keybindings.json'),
          snippetsPath: path.join(configPath, 'snippets')
        };
      } else {
        detected[editor] = {
          installed: false,
          configPath
        };
      }
    }
    
    return detected;
  }

  async getEditorConfig(editorType) {
    const editorInfo = this.editorPaths[editorType];
    if (!editorInfo) {
      throw new Error(`不支持的编辑器类型: ${editorType}`);
    }

    const config = {
      settings: {},
      keybindings: [],
      snippets: {}
    };

    try {
      // 读取设置
      const settingsPath = path.join(editorInfo, 'settings.json');
      if (await fs.pathExists(settingsPath)) {
        config.settings = await fs.readJson(settingsPath);
      }

      // 读取快捷键绑定
      const keybindingsPath = path.join(editorInfo, 'keybindings.json');
      if (await fs.pathExists(keybindingsPath)) {
        config.keybindings = await fs.readJson(keybindingsPath);
      }

      // 读取代码片段
      const snippetsPath = path.join(editorInfo, 'snippets');
      if (await fs.pathExists(snippetsPath)) {
        const snippetFiles = await fs.readdir(snippetsPath);
        for (const file of snippetFiles) {
          if (file.endsWith('.json')) {
            const snippetName = path.basename(file, '.json');
            const snippetContent = await fs.readJson(path.join(snippetsPath, file));
            config.snippets[snippetName] = snippetContent;
          }
        }
      }

    } catch (error) {
      console.error(`读取 ${editorType} 配置失败:`, error);
    }

    return config;
  }

  async importConfig(editorType, config) {
    const editorInfo = this.editorPaths[editorType];
    if (!editorInfo) {
      throw new Error(`不支持的编辑器类型: ${editorType}`);
    }

    // 验证配置数据
    if (!config || typeof config !== 'object') {
      throw new Error('配置数据格式无效');
    }

    try {
      // 确保目录存在
      await fs.ensureDir(editorInfo);

      let importedCount = 0;

      // 导入设置
      if (config.settings && typeof config.settings === 'object') {
        const settingsPath = path.join(editorInfo, 'settings.json');
        await fs.writeJson(settingsPath, config.settings, { spaces: 2 });
        importedCount++;
        console.log(`已导入 ${editorType} 设置配置`);
      }

      // 导入快捷键绑定
      if (config.keybindings && Array.isArray(config.keybindings)) {
        const keybindingsPath = path.join(editorInfo, 'keybindings.json');
        await fs.writeJson(keybindingsPath, config.keybindings, { spaces: 2 });
        importedCount++;
        console.log(`已导入 ${editorType} 快捷键配置`);
      }

      // 导入代码片段
      if (config.snippets && typeof config.snippets === 'object') {
        const snippetsPath = path.join(editorInfo, 'snippets');
        await fs.ensureDir(snippetsPath);
        
        for (const [snippetName, snippetContent] of Object.entries(config.snippets)) {
          if (snippetContent && typeof snippetContent === 'object') {
            const snippetFile = path.join(snippetsPath, `${snippetName}.json`);
            await fs.writeJson(snippetFile, snippetContent, { spaces: 2 });
          }
        }
        importedCount++;
        console.log(`已导入 ${editorType} 代码片段配置`);
      }

      if (importedCount === 0) {
        console.warn(`没有找到可导入的 ${editorType} 配置数据`);
      }

      return { importedCount };

    } catch (error) {
      console.error(`导入 ${editorType} 配置失败:`, error);
      throw error;
    }
  }

  async backupConfig(editorType, backupPath) {
    const config = await this.getEditorConfig(editorType);
    const backupData = {
      editorType,
      timestamp: new Date().toISOString(),
      config,
      platform: this.platform
    };
    
    await fs.writeJson(backupPath, backupData, { spaces: 2 });
    return backupPath;
  }
}

module.exports = ConfigManager;
