const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const tar = require('tar');

class BackupManager {
  constructor() {
    this.platform = os.platform();
    this.homeDir = os.homedir();
    this.backupDir = path.join(this.homeDir, '.vscode-config-migrator', 'backups');
    this.ensureBackupDir();
  }

  async ensureBackupDir() {
    await fs.ensureDir(this.backupDir);
  }

  async createBackup(editorType, backupName = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = backupName || `${editorType}-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupId);
    
    await fs.ensureDir(backupPath);

    try {
      const ConfigManager = require('./config-manager');
      const ExtensionManager = require('./extension-manager');
      
      const configManager = new ConfigManager();
      const extensionManager = new ExtensionManager();

      // 备份配置
      const config = await configManager.getEditorConfig(editorType);
      await fs.writeJson(path.join(backupPath, 'config.json'), config, { spaces: 2 });

      // 备份插件列表
      const extensions = await extensionManager.getExtensions(editorType);
      await fs.writeJson(path.join(backupPath, 'extensions.json'), extensions, { spaces: 2 });

      // 创建备份元数据
      const metadata = {
        id: backupId,
        editorType,
        timestamp: new Date().toISOString(),
        platform: this.platform,
        version: '1.0.0',
        configCount: Object.keys(config.settings || {}).length,
        extensionCount: extensions.length,
        files: {
          config: 'config.json',
          extensions: 'extensions.json'
        }
      };
      
      await fs.writeJson(path.join(backupPath, 'metadata.json'), metadata, { spaces: 2 });

      // 创建压缩备份
      const compressedPath = await this.createCompressedBackup(backupPath, backupId);

      return {
        success: true,
        backupId,
        backupPath,
        compressedPath,
        metadata
      };

    } catch (error) {
      console.error('创建备份失败:', error);
      throw error;
    }
  }

  async createCompressedBackup(backupPath, backupId) {
    const compressedPath = path.join(this.backupDir, `${backupId}.tar.gz`);
    
    // 创建tar.gz压缩文件
    await tar.create(
      {
        gzip: true,
        file: compressedPath,
        cwd: this.backupDir
      },
      [backupId]
    );

    return compressedPath;
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.backupDir, file);
          const stat = await fs.stat(filePath);
          
          if (file === 'metadata.json') {
            try {
              const metadata = await fs.readJson(filePath);
              backups.push({
                ...metadata,
                size: stat.size,
                createdAt: stat.birthtime.toISOString(),
                type: 'folder'
              });
            } catch (error) {
              console.warn(`读取备份元数据失败: ${file}`, error.message);
            }
          }
        } else if (file.endsWith('.tar.gz')) {
          const filePath = path.join(this.backupDir, file);
          const stat = await fs.stat(filePath);
          
          backups.push({
            id: file.replace('.tar.gz', ''),
            fileName: file,
            size: stat.size,
            createdAt: stat.birthtime.toISOString(),
            type: 'compressed'
          });
        }
      }

      return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('列出备份失败:', error);
      return [];
    }
  }

  async restoreBackup(backupId, targetEditorType) {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      
      // 检查备份是否存在
      if (!(await fs.pathExists(backupPath))) {
        // 尝试从压缩文件恢复
        const compressedPath = path.join(this.backupDir, `${backupId}.tar.gz`);
        if (await fs.pathExists(compressedPath)) {
          await this.extractCompressedBackup(compressedPath, this.backupDir);
        } else {
          throw new Error(`备份不存在: ${backupId}`);
        }
      }

      // 读取备份元数据
      const metadataPath = path.join(backupPath, 'metadata.json');
      if (!(await fs.pathExists(metadataPath))) {
        throw new Error('备份元数据文件不存在');
      }

      const metadata = await fs.readJson(metadataPath);

      // 读取配置和插件数据
      const configPath = path.join(backupPath, 'config.json');
      const extensionsPath = path.join(backupPath, 'extensions.json');

      let config = {};
      let extensions = [];

      if (await fs.pathExists(configPath)) {
        config = await fs.readJson(configPath);
      }

      if (await fs.pathExists(extensionsPath)) {
        extensions = await fs.readJson(extensionsPath);
      }

      // 恢复配置和插件
      const ConfigManager = require('./config-manager');
      const ExtensionManager = require('./extension-manager');
      
      const configManager = new ConfigManager();
      const extensionManager = new ExtensionManager();

      // 导入配置
      if (config && Object.keys(config).length > 0) {
        await configManager.importConfig(targetEditorType, config);
      }

      // 导入插件 - 确保数据格式正确
      let extensionResults = { success: [], failed: [] };
      if (extensions && Array.isArray(extensions) && extensions.length > 0) {
        extensionResults = await extensionManager.importExtensions(targetEditorType, extensions);
      }

      return {
        success: true,
        metadata,
        restoredFrom: backupId,
        restoredTo: targetEditorType,
        configRestored: config && Object.keys(config).length > 0,
        extensionsRestored: {
          total: Array.isArray(extensions) ? extensions.length : 0,
          success: extensionResults.success.length,
          failed: extensionResults.failed.length
        }
      };

    } catch (error) {
      console.error('恢复备份失败:', error);
      throw error;
    }
  }

  async extractCompressedBackup(compressedPath, extractTo) {
    await tar.extract({
      file: compressedPath,
      cwd: extractTo
    });
  }

  async deleteBackup(backupId) {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      const compressedPath = path.join(this.backupDir, `${backupId}.tar.gz`);

      let deleted = [];
      
      if (await fs.pathExists(backupPath)) {
        await fs.remove(backupPath);
        deleted.push(backupPath);
      }

      if (await fs.pathExists(compressedPath)) {
        await fs.remove(compressedPath);
        deleted.push(compressedPath);
      }

      if (deleted.length === 0) {
        throw new Error(`备份不存在: ${backupId}`);
      }

      return {
        success: true,
        deleted,
        backupId
      };

    } catch (error) {
      console.error('删除备份失败:', error);
      throw error;
    }
  }

  async exportBackup(backupId, exportPath) {
    try {
      const compressedPath = path.join(this.backupDir, `${backupId}.tar.gz`);
      
      if (!(await fs.pathExists(compressedPath))) {
        // 如果压缩文件不存在，创建一个
        const backupPath = path.join(this.backupDir, backupId);
        if (await fs.pathExists(backupPath)) {
          await this.createCompressedBackup(backupPath, backupId);
        } else {
          throw new Error(`备份不存在: ${backupId}`);
        }
      }

      await fs.copy(compressedPath, exportPath);
      
      return {
        success: true,
        exportPath,
        backupId
      };

    } catch (error) {
      console.error('导出备份失败:', error);
      throw error;
    }
  }

  async importBackup(importPath, backupId = null) {
    try {
      // 检查文件是否存在
      if (!(await fs.pathExists(importPath))) {
        throw new Error(`导入文件不存在: ${importPath}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newBackupId = backupId || `imported-backup-${timestamp}`;
      const extractPath = path.join(this.backupDir, newBackupId);

      // 如果是压缩文件，先解压
      if (importPath.endsWith('.tar.gz')) {
        await tar.extract({
          file: importPath,
          cwd: this.backupDir
        });
        
        // 重命名解压后的文件夹
        const tempPath = path.join(this.backupDir, path.basename(importPath, '.tar.gz'));
        if (await fs.pathExists(tempPath) && tempPath !== extractPath) {
          await fs.move(tempPath, extractPath);
        }
      } else {
        // 直接复制文件
        await fs.copy(importPath, extractPath);
      }

      // 验证备份完整性
      const metadataPath = path.join(extractPath, 'metadata.json');
      if (!(await fs.pathExists(metadataPath))) {
        throw new Error('导入的备份格式无效：缺少元数据文件');
      }

      return {
        success: true,
        backupId: newBackupId,
        backupPath: extractPath
      };

    } catch (error) {
      console.error('导入备份失败:', error);
      throw error;
    }
  }
}

module.exports = BackupManager;
