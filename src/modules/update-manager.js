const { autoUpdater } = require('electron-updater');
const { app } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');

/**
 * UpdateManager - 管理应用程序的自动更新功能
 */
class UpdateManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.updateInfo = null;
    this.downloadProgress = null;
    this.isChecking = false;
    this.isDownloading = false;
  }

  /**
   * 初始化自动更新器
   */
  initialize() {
    // 开发模式配置
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
      console.log('🔧 开发模式：自动更新功能已启用（测试模式）');
      // 在开发模式下，可以设置本地测试服务器
      // autoUpdater.setFeedURL({
      //   provider: 'generic',
      //   url: 'http://localhost:3000/updates'
      // });
    }
    
    // 配置 autoUpdater
    autoUpdater.autoDownload = false; // 不自动下载，由用户控制
    autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装
    
    // 设置更新服务器 URL（确保使用 HTTPS）
    if (autoUpdater.getFeedURL()) {
      const feedURL = autoUpdater.getFeedURL();
      if (!this.isHttpsUrl(feedURL)) {
        console.warn('Update feed URL is not HTTPS:', feedURL);
      }
    }
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 读取配置并决定是否自动检查
    const config = this.getUpdateConfig();
    if (config.autoCheck) {
      // 延迟检查，避免阻塞启动
      setTimeout(() => {
        this.checkForUpdates(false);
      }, 3000);
    }
  }

  /**
   * 设置 autoUpdater 事件监听器
   */
  setupEventListeners() {
    // 检查更新中
    autoUpdater.on('checking-for-update', () => {
      this.isChecking = true;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-checking');
      }
    });

    // 发现新版本
    autoUpdater.on('update-available', (info) => {
      this.isChecking = false;
      this.updateInfo = info;
      
      // 检查是否跳过此版本
      const config = this.getUpdateConfig();
      if (config.skippedVersion === info.version) {
        return; // 跳过此版本
      }
      
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-available', {
          version: info.version,
          releaseNotes: info.releaseNotes || '',
          releaseDate: info.releaseDate || new Date().toISOString()
        });
      }
      
      // 如果启用自动下载，则自动开始下载
      if (config.autoDownload) {
        this.downloadUpdate();
      }
    });

    // 已是最新版本
    autoUpdater.on('update-not-available', (info) => {
      this.isChecking = false;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-not-available', {
          version: info.version
        });
      }
    });

    // 下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      this.downloadProgress = progressObj;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('download-progress', {
          percent: Math.round(progressObj.percent),
          bytesPerSecond: progressObj.bytesPerSecond,
          transferred: progressObj.transferred,
          total: progressObj.total
        });
      }
    });

    // 更新已下载
    autoUpdater.on('update-downloaded', (info) => {
      this.isDownloading = false;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-downloaded', {
          version: info.version,
          releaseNotes: info.releaseNotes || ''
        });
      }
    });

    // 更新错误
    autoUpdater.on('error', (error) => {
      this.isChecking = false;
      this.isDownloading = false;
      
      // 静默处理错误，只记录日志
      console.error('Update error:', error);
      
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-error', {
          error: error.message
        });
      }
    });
  }

  /**
   * 检查更新
   * @param {boolean} manual - 是否为手动检查
   */
  async checkForUpdates(manual = false) {
    if (this.isChecking) {
      return;
    }

    try {
      await autoUpdater.checkForUpdates();
      
      // 更新最后检查时间
      const config = this.getUpdateConfig();
      config.lastCheckTime = Date.now();
      this.saveUpdateConfig(config);
    } catch (error) {
      console.error('Check for updates error:', error);
      if (manual && this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-error', {
          error: '检查更新失败，请稍后重试'
        });
      }
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate() {
    if (this.isDownloading) {
      return;
    }

    try {
      this.isDownloading = true;
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.isDownloading = false;
      console.error('Download update error:', error);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-error', {
          error: '下载更新失败，请稍后重试'
        });
      }
    }
  }

  /**
   * 退出并安装更新
   */
  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * 获取当前版本
   * @returns {string} 当前版本号
   */
  getCurrentVersion() {
    return app.getVersion();
  }

  /**
   * 获取配置文件路径
   * @returns {string} 配置文件路径
   */
  getConfigPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'update-config.json');
  }

  /**
   * 获取更新配置
   * @returns {Object} 更新配置对象
   */
  getUpdateConfig() {
    const configPath = this.getConfigPath();
    
    // 默认配置
    const defaultConfig = {
      autoCheck: true,
      autoDownload: false,
      checkInterval: 24,
      skippedVersion: null,
      lastCheckTime: 0
    };

    try {
      if (fs.existsSync(configPath)) {
        const config = fs.readJsonSync(configPath);
        return { ...defaultConfig, ...config };
      }
    } catch (error) {
      console.error('Read config error:', error);
    }

    return defaultConfig;
  }

  /**
   * 保存更新配置
   * @param {Object} config - 配置对象
   */
  saveUpdateConfig(config) {
    const configPath = this.getConfigPath();
    
    try {
      fs.ensureDirSync(path.dirname(configPath));
      fs.writeJsonSync(configPath, config, { spaces: 2 });
    } catch (error) {
      console.error('Save config error:', error);
    }
  }

  /**
   * 比较两个版本号
   * @param {string} version1 - 第一个版本号
   * @param {string} version2 - 第二个版本号
   * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
   */
  compareVersions(version1, version2) {
    try {
      // 使用 semver 库进行比较
      const result = semver.compare(version1, version2);
      return result;
    } catch (error) {
      console.error('Version compare error:', error);
      return 0;
    }
  }

  /**
   * 验证版本号格式
   * @param {string} version - 版本号
   * @returns {boolean} 是否为有效的语义化版本号
   */
  isValidVersion(version) {
    try {
      return semver.valid(version) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 判断是否有更新可用
   * @param {string} currentVersion - 当前版本
   * @param {string} remoteVersion - 远程版本
   * @returns {boolean} 是否有更新可用
   */
  isUpdateAvailable(currentVersion, remoteVersion) {
    if (!this.isValidVersion(currentVersion) || !this.isValidVersion(remoteVersion)) {
      return false;
    }
    return this.compareVersions(remoteVersion, currentVersion) > 0;
  }

  /**
   * 解析版本元数据
   * @param {Object} metadata - 版本元数据对象
   * @returns {Object|null} 解析后的版本信息
   */
  parseVersionMetadata(metadata) {
    try {
      if (!metadata || typeof metadata !== 'object') {
        return null;
      }

      const versionInfo = {
        version: metadata.version || '',
        releaseDate: metadata.releaseDate || new Date().toISOString(),
        releaseNotes: metadata.releaseNotes || '',
        files: metadata.files || []
      };

      // 验证必需字段
      if (!versionInfo.version) {
        return null;
      }

      return versionInfo;
    } catch (error) {
      console.error('Parse version metadata error:', error);
      return null;
    }
  }

  /**
   * 解析 Markdown 更新日志
   * @param {string} markdown - Markdown 文本
   * @returns {string} 解析后的文本（简单处理）
   */
  parseMarkdown(markdown) {
    try {
      if (!markdown || typeof markdown !== 'string') {
        return '暂无更新日志';
      }

      // 简单的 Markdown 处理：移除多余的空行，保留基本格式
      return markdown
        .split('\n')
        .filter(line => line.trim())
        .join('\n');
    } catch (error) {
      console.error('Parse markdown error:', error);
      return '暂无更新日志';
    }
  }

  /**
   * 排序版本列表（降序）
   * @param {Array<string>} versions - 版本号数组
   * @returns {Array<string>} 排序后的版本号数组
   */
  sortVersions(versions) {
    try {
      if (!Array.isArray(versions)) {
        return [];
      }

      return versions
        .filter(v => this.isValidVersion(v))
        .sort((a, b) => this.compareVersions(b, a)); // 降序排列
    } catch (error) {
      console.error('Sort versions error:', error);
      return versions;
    }
  }

  /**
   * 获取更新日志摘要（前3行）
   * @param {string} releaseNotes - 完整的更新日志
   * @returns {string} 更新日志摘要
   */
  getReleaseNotesSummary(releaseNotes) {
    try {
      if (!releaseNotes) {
        return '暂无更新说明';
      }

      const lines = releaseNotes.split('\n').filter(line => line.trim());
      const summary = lines.slice(0, 3).join('\n');
      
      return summary || '暂无更新说明';
    } catch (error) {
      console.error('Get release notes summary error:', error);
      return '暂无更新说明';
    }
  }

  /**
   * 验证 URL 是否使用 HTTPS 协议
   * @param {string} url - URL 字符串
   * @returns {boolean} 是否为 HTTPS URL
   */
  isHttpsUrl(url) {
    try {
      if (!url || typeof url !== 'string') {
        return false;
      }
      return url.toLowerCase().startsWith('https://');
    } catch (error) {
      return false;
    }
  }

  /**
   * 安全记录日志（不包含敏感信息）
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  safeLog(level, message, data = {}) {
    // 移除可能的敏感信息
    const safeData = { ...data };
    delete safeData.token;
    delete safeData.password;
    delete safeData.apiKey;
    
    const logMessage = `[UpdateManager] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, safeData);
        break;
      case 'warn':
        console.warn(logMessage, safeData);
        break;
      default:
        console.log(logMessage, safeData);
    }
  }
}

module.exports = UpdateManager;
