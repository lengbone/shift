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
        command: this.getVSCodeCommand(),
        installCommand: this.getVSCodeCommand() + ' --install-extension'
      },
      cursor: {
        extensionsPath: this.getCursorExtensionsPath(),
        command: this.getCursorCommand(),
        installCommand: this.getCursorCommand() + ' --install-extension'
      },
      trae: {
        extensionsPath: this.getTraeExtensionsPath(),
        command: this.getTraeCommand(),
        installCommand: this.getTraeCommand() + ' --install-extension'
      },
      windsurf: {
        extensionsPath: this.getWindsurfExtensionsPath(),
        command: this.getWindsurfCommand(),
        installCommand: this.getWindsurfCommand() + ' --install-extension'
      },
      qoder: {
        extensionsPath: this.getQoderExtensionsPath(),
        command: this.getQoderCommand(),
        installCommand: this.getQoderCommand() + ' --install-extension'
      },
      kiro: {
        extensionsPath: this.getKiroExtensionsPath(),
        command: this.getKiroCommand(),
        installCommand: this.getKiroCommand() + ' --install-extension'
      },
      antigravity: {
        extensionsPath: this.getAntigravityExtensionsPath(),
        command: this.getAntigravityCommand(),
        installCommand: this.getAntigravityCommand() + ' --install-extension'
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

  // 获取编辑器命令的完整路径
  getVSCodeCommand() {
    switch (this.platform) {
      case 'win32':
        // Windows 上尝试多个可能的路径
        const winPaths = [
          'code',
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
          path.join(process.env.PROGRAMFILES || '', 'Microsoft VS Code', 'bin', 'code.cmd')
        ];
        return this.findWorkingCommand(winPaths);
      case 'darwin':
        // macOS 上的路径
        const macPaths = [
          'code',
          '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
          '/usr/local/bin/code'
        ];
        return this.findWorkingCommand(macPaths);
      default:
        return 'code';
    }
  }

  getCursorCommand() {
    switch (this.platform) {
      case 'win32':
        const winPaths = [
          'cursor',
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'resources', 'app', 'bin', 'cursor.cmd')
        ];
        return this.findWorkingCommand(winPaths);
      case 'darwin':
        const macPaths = [
          'cursor',
          '/Applications/Cursor.app/Contents/Resources/app/bin/cursor'
        ];
        return this.findWorkingCommand(macPaths);
      default:
        return 'cursor';
    }
  }

  getTraeCommand() {
    return 'trae'; // Trae 可能没有标准安装路径，先用简单命令
  }

  getWindsurfCommand() {
    switch (this.platform) {
      case 'win32':
        return 'windsurf';
      case 'darwin':
        const macPaths = [
          'windsurf',
          '/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf'
        ];
        return this.findWorkingCommand(macPaths);
      default:
        return 'windsurf';
    }
  }

  getQoderCommand() {
    return 'qoder'; // Qoder 可能没有标准安装路径，先用简单命令
  }

  getKiroExtensionsPath() {
    // Kiro 扩展路径
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, '.kiro', 'extensions');
      case 'darwin':
        return path.join(this.homeDir, '.kiro', 'extensions');
      case 'linux':
        return path.join(this.homeDir, '.kiro', 'extensions');
      default:
        return null;
    }
  }

  getKiroCommand() {
    switch (this.platform) {
      case 'win32':
        return 'kiro';
      case 'darwin':
        const macPaths = [
          'kiro',
          '/Applications/Kiro.app/Contents/Resources/app/bin/kiro'
        ];
        return this.findWorkingCommand(macPaths);
      default:
        return 'kiro';
    }
  }

  getAntigravityExtensionsPath() {
    // Antigravity 扩展路径
    switch (this.platform) {
      case 'win32':
        return path.join(this.homeDir, '.antigravity', 'extensions');
      case 'darwin':
        return path.join(this.homeDir, '.antigravity', 'extensions');
      case 'linux':
        return path.join(this.homeDir, '.antigravity', 'extensions');
      default:
        return null;
    }
  }

  getAntigravityCommand() {
    switch (this.platform) {
      case 'win32':
        return 'antigravity';
      case 'darwin':
        const macPaths = [
          'antigravity',
          '/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity'
        ];
        return this.findWorkingCommand(macPaths);
      default:
        return 'antigravity';
    }
  }

  // 查找可用的命令路径
  findWorkingCommand(paths) {
    for (const cmdPath of paths) {
      try {
        // 简单返回第一个路径，实际使用时会在 getExtensions 中处理错误
        if (fs.existsSync(cmdPath) || cmdPath === paths[0]) {
          return cmdPath;
        }
      } catch (error) {
        continue;
      }
    }
    return paths[0]; // 如果都不存在，返回第一个作为默认值
  }

  async getExtensions(editorType) {
    const editorInfo = this.editorExtensions[editorType];
    if (!editorInfo) {
      throw new Error(`不支持的编辑器类型: ${editorType}`);
    }

    console.log(`开始获取 ${editorType} 扩展列表...`);
    const extensions = [];

    // 优先使用文件系统方法，因为在打包后更可靠
    try {
      const extensionsPath = editorInfo.extensionsPath;
      console.log(`扫描扩展目录: ${extensionsPath}`);
      
      if (extensionsPath && await fs.pathExists(extensionsPath)) {
        const extensionDirs = await fs.readdir(extensionsPath);
        console.log(`找到 ${extensionDirs.length} 个扩展目录`);
        
        for (const dir of extensionDirs) {
          // 跳过隐藏文件和临时文件
          if (dir.startsWith('.') || dir.includes('tmp')) {
            continue;
          }
          
          const extensionPath = path.join(extensionsPath, dir);
          const stat = await fs.stat(extensionPath);
          
          if (!stat.isDirectory()) {
            continue;
          }
          
          // 尝试多个可能的 package.json 位置
          const possiblePackageJsonPaths = [
            path.join(extensionPath, 'package.json'),
            path.join(extensionPath, 'extension', 'package.json'),
            path.join(extensionPath, 'extension.vsixmanifest') // 备用方案
          ];
          
          let packageJson = null;
          for (const packageJsonPath of possiblePackageJsonPaths) {
            if (await fs.pathExists(packageJsonPath)) {
              try {
                if (packageJsonPath.endsWith('.json')) {
                  packageJson = await fs.readJson(packageJsonPath);
                  break;
                }
              } catch (error) {
                console.warn(`读取 ${packageJsonPath} 失败:`, error.message);
              }
            }
          }
          
          if (packageJson && packageJson.publisher && packageJson.name) {
            // 处理 displayName，如果是本地化变量则尝试解析
            let displayName = packageJson.displayName || packageJson.name;
            let description = packageJson.description || '';
            
            if (displayName && displayName.startsWith('%') && displayName.endsWith('%')) {
              // 尝试从本地化文件读取
              try {
                const nlsPath = path.join(extensionPath, 'package.nls.json');
                if (await fs.pathExists(nlsPath)) {
                  const nlsData = await fs.readJson(nlsPath);
                  const key = displayName.slice(1, -1); // 移除 % 符号
                  displayName = nlsData[key] || packageJson.name;
                } else {
                  displayName = packageJson.name;
                }
              } catch (nlsError) {
                displayName = packageJson.name;
              }
            }
            
            // 同样处理 description
            if (description && description.startsWith('%') && description.endsWith('%')) {
              try {
                const nlsPath = path.join(extensionPath, 'package.nls.json');
                if (await fs.pathExists(nlsPath)) {
                  const nlsData = await fs.readJson(nlsPath);
                  const key = description.slice(1, -1);
                  description = nlsData[key] || '';
                } else {
                  description = '';
                }
              } catch (nlsError) {
                description = '';
              }
            }
            
            extensions.push({
              identifier: `${packageJson.publisher}.${packageJson.name}`,
              publisher: packageJson.publisher,
              name: packageJson.name,
              version: packageJson.version || 'unknown',
              displayName: displayName,
              description: description,
              source: 'filesystem'
            });
          } else {
            // 如果没有找到 package.json，尝试从目录名解析
            const parts = dir.split('.');
            if (parts.length >= 2) {
              extensions.push({
                identifier: dir,
                publisher: parts[0],
                name: parts.slice(1).join('.'),
                version: 'unknown',
                displayName: dir,
                description: '',
                source: 'directory'
              });
            }
          }
        }
        
        console.log(`文件系统方法找到 ${extensions.length} 个扩展`);
      } else {
        console.warn(`扩展目录不存在: ${extensionsPath}`);
      }
    } catch (fsError) {
      console.error(`文件系统方法获取 ${editorType} 扩展失败:`, fsError.message);
    }

    // 如果文件系统方法没有找到扩展，尝试命令行方法
    if (extensions.length === 0) {
      try {
        console.log(`尝试命令行方法: ${editorInfo.command}`);
        const { stdout } = await execAsync(`"${editorInfo.command}" --list-extensions --show-versions`, {
          timeout: 10000, // 10秒超时
          env: { ...process.env, PATH: process.env.PATH }
        });
        
        const extensionLines = stdout.trim().split('\n');
        console.log(`命令行方法返回 ${extensionLines.length} 行`);
        
        for (const line of extensionLines) {
          if (line.trim()) {
            const [identifier, version] = line.split('@');
            if (identifier && identifier.includes('.')) {
              const [publisher, name] = identifier.split('.');
              
              extensions.push({
                identifier,
                publisher,
                name,
                version: version || 'unknown',
                displayName: name,
                description: '',
                source: 'cli'
              });
            }
          }
        }
        
        console.log(`命令行方法找到 ${extensions.length} 个扩展`);
      } catch (cliError) {
        console.warn(`CLI方法获取 ${editorType} 扩展失败:`, cliError.message);
      }
    }

    console.log(`最终返回 ${extensions.length} 个 ${editorType} 扩展`);
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
