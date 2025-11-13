const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ExtensionManager {
  constructor() {
    this.platform = os.platform();
    this.homeDir = os.homedir();
    
    // 支持的编辑器扩展路径和命令
    this.editorExtensions = {
      vscode: {
        extensionsPath: this.getVSCodeExtensionsPath(),
        command: 'code',
        installCommand: 'code --install-extension'
      },
      cursor: {
        extensionsPath: this.getCursorExtensionsPath(),
        command: 'cursor',
        installCommand: 'cursor --install-extension'
      },
      trae: {
        extensionsPath: this.getTraeExtensionsPath(),
        command: 'trae',
        installCommand: 'trae --install-extension'
      },
      windsurf: {
        extensionsPath: this.getWindsurfExtensionsPath(),
        command: 'windsurf',
        installCommand: 'windsurf --install-extension'
      },
      qoder: {
        extensionsPath: this.getQoderExtensionsPath(),
        command: 'qoder',
        installCommand: 'qoder --install-extension'
      }
    };
  }

  getVSCodeExtensionsPath() {
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, '.vscode', 'extensions');
      case 'darwin':
        return path.join(this.homeDir, '.vscode', 'extensions');
      case 'linux':
        return path.join(this.homeDir, '.vscode', 'extensions');
      default:
        return null;
    }
  }

  getCursorExtensionsPath() {
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, '.cursor', 'extensions');
      case 'darwin':
        return path.join(this.homeDir, '.cursor', 'extensions');
      case 'linux':
        return path.join(this.homeDir, '.cursor', 'extensions');
      default:
        return null;
    }
  }

  getTraeExtensionsPath() {
    // Trae 可能使用不同的扩展路径
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, '.trae', 'extensions');
      case 'darwin':
        return path.join(this.homeDir, '.trae', 'extensions');
      case 'linux':
        return path.join(this.homeDir, '.trae', 'extensions');
      default:
        return null;
    }
  }

  getWindsurfExtensionsPath() {
    // Windsurf 扩展路径
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, '.windsurf', 'extensions');
      case 'darwin':
        return path.join(this.homeDir, '.windsurf', 'extensions');
      case 'linux':
        return path.join(this.homeDir, '.windsurf', 'extensions');
      default:
        return null;
    }
  }

  getQoderExtensionsPath() {
    // Qoder 扩展路径
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, '.qoder', 'extensions');
      case 'darwin':
        return path.join(this.homeDir, '.qoder', 'extensions');
      case 'linux':
        return path.join(this.homeDir, '.qoder', 'extensions');
      default:
        return null;
    }
  }

  async getExtensions(editorType) {
    const editorInfo = this.editorExtensions[editorType];
    if (!editorInfo) {
      throw new Error(`不支持的编辑器类型: ${editorType}`);
    }

    const extensions = [];

    try {
      // 方法1: 通过命令行获取扩展列表
      const { stdout } = await execAsync(`${editorInfo.command} --list-extensions --show-versions`);
      const extensionLines = stdout.trim().split('\n');
      
      for (const line of extensionLines) {
        if (line.trim()) {
          const [identifier, version] = line.split('@');
          const [publisher, name] = identifier.split('.');
          
          extensions.push({
            identifier,
            publisher,
            name,
            version: version || 'unknown',
            source: 'cli'
          });
        }
      }
    } catch (cliError) {
      console.warn(`CLI方法获取 ${editorType} 扩展失败，尝试文件系统方法:`, cliError.message);
      
      // 方法2: 通过文件系统扫描扩展目录
      try {
        const extensionsPath = editorInfo.extensionsPath;
        if (extensionsPath && await fs.pathExists(extensionsPath)) {
          const extensionDirs = await fs.readdir(extensionsPath);
          
          for (const dir of extensionDirs) {
            const extensionPath = path.join(extensionsPath, dir);
            const packageJsonPath = path.join(extensionPath, 'extension', 'package.json');
            
            if (await fs.pathExists(packageJsonPath)) {
              try {
                const packageJson = await fs.readJson(packageJsonPath);
                extensions.push({
                  identifier: `${packageJson.publisher}.${packageJson.name}`,
                  publisher: packageJson.publisher,
                  name: packageJson.name,
                  version: packageJson.version,
                  displayName: packageJson.displayName,
                  description: packageJson.description,
                  source: 'filesystem'
                });
              } catch (packageError) {
                console.warn(`读取扩展包信息失败: ${dir}`, packageError.message);
              }
            }
          }
        }
      } catch (fsError) {
        console.error(`文件系统方法获取 ${editorType} 扩展失败:`, fsError.message);
      }
    }

    return extensions;
  }

  async importExtensions(editorType, extensions) {
    const editorInfo = this.editorExtensions[editorType];
    if (!editorInfo) {
      throw new Error(`不支持的编辑器类型: ${editorType}`);
    }

    const results = {
      success: [],
      failed: []
    };

    // 验证输入数据
    if (!Array.isArray(extensions)) {
      throw new Error('扩展数据必须是数组格式');
    }

    for (const extension of extensions) {
      try {
        // 获取扩展ID - 支持多种数据格式
        let extensionId;
        if (typeof extension === 'string') {
          extensionId = extension;
        } else if (extension.identifier) {
          extensionId = extension.identifier;
        } else if (extension.id) {
          extensionId = extension.id;
        } else if (extension.name) {
          extensionId = extension.name;
        } else {
          throw new Error('无法识别的扩展格式');
        }

        // 使用命令行安装扩展
        const { stdout, stderr } = await execAsync(
          `${editorInfo.installCommand} ${extensionId}`
        );
        
        results.success.push({
          extension: extensionId,
          output: stdout || stderr
        });
      } catch (error) {
        const extensionId = extension.identifier || extension.id || extension.name || extension;
        results.failed.push({
          extension: extensionId,
          error: error.message
        });
      }
    }

    return results;
  }

  async exportExtensions(editorType, outputPath) {
    const extensions = await this.getExtensions(editorType);
    const exportData = {
      editorType,
      timestamp: new Date().toISOString(),
      extensions,
      platform: this.platform,
      version: '1.0.0'
    };
    
    await fs.writeJson(outputPath, exportData, { spaces: 2 });
    return outputPath;
  }

  async installExtension(editorType, extensionId) {
    const editorInfo = this.editorExtensions[editorType];
    if (!editorInfo) {
      throw new Error(`不支持的编辑器类型: ${editorType}`);
    }

    try {
      const { stdout, stderr } = await execAsync(
        `${editorInfo.installCommand} ${extensionId}`
      );
      
      return {
        success: true,
        extension: extensionId,
        output: stdout || stderr
      };
    } catch (error) {
      return {
        success: false,
        extension: extensionId,
        error: error.message
      };
    }
  }

  async uninstallExtension(editorType, extensionId) {
    const editorInfo = this.editorExtensions[editorType];
    if (!editorInfo) {
      throw new Error(`不支持的编辑器类型: ${editorType}`);
    }

    try {
      const { stdout, stderr } = await execAsync(
        `${editorInfo.command} --uninstall-extension ${extensionId}`
      );
      
      return {
        success: true,
        extension: extensionId,
        output: stdout || stderr
      };
    } catch (error) {
      return {
        success: false,
        extension: extensionId,
        error: error.message
      };
    }
  }
}

module.exports = ExtensionManager;
