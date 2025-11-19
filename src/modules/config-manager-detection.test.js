const fc = require('fast-check');
const ConfigManager = require('./config-manager');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Simple test runner
const tests = [];
let currentDescribe = null;

function describe(name, fn) {
  const prevDescribe = currentDescribe;
  currentDescribe = name;
  fn();
  currentDescribe = prevDescribe;
}

function test(name, fn) {
  tests.push({ describe: currentDescribe, name, fn });
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toHaveProperty(prop) {
      if (!(prop in value)) {
        throw new Error(`Expected ${JSON.stringify(value)} to have property ${prop}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      }
    }
  };
}

describe('ConfigManager - Editor Detection', () => {
  // Feature: kiro-support, Property 2: 编辑器安装检测
  // 对于任何文件系统状态，当 Kiro 配置目录存在时，detectInstalledEditors() 应该返回 kiro.installed = true，当目录不存在时应该返回 false
  // 验证：需求 1.2, 1.3
  describe('Property 2: 编辑器安装检测', () => {
    test('detectInstalledEditors should include kiro in results', async () => {
      const configManager = new ConfigManager();
      const detected = await configManager.detectInstalledEditors();
      
      expect(detected).toHaveProperty('kiro');
    });

    test('detectInstalledEditors should return installed=true when Kiro config directory exists', async () => {
      // 创建临时测试目录
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      await fs.ensureDir(tempDir);
      
      try {
        // 模拟 Kiro 配置目录存在
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        const detected = await configManager.detectInstalledEditors();
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        expect(detected.kiro.installed).toBe(true);
        expect(detected.kiro.configPath).toBe(tempDir);
      } finally {
        // 清理临时目录
        await fs.remove(tempDir);
      }
    });

    test('detectInstalledEditors should return installed=false when Kiro config directory does not exist', async () => {
      // 使用不存在的目录
      const nonExistentDir = path.join(os.tmpdir(), `kiro-nonexistent-${Date.now()}`);
      
      // 模拟 Kiro 配置目录不存在
      const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
      ConfigManager.prototype.getKiroPath = function() {
        return nonExistentDir;
      };
      
      const configManager = new ConfigManager();
      const detected = await configManager.detectInstalledEditors();
      
      // 恢复原始方法
      ConfigManager.prototype.getKiroPath = originalGetKiroPath;
      
      expect(detected.kiro.installed).toBe(false);
      expect(detected.kiro.configPath).toBe(nonExistentDir);
    });

    test('detectInstalledEditors should include all required properties for installed Kiro', async () => {
      // 创建临时测试目录
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      await fs.ensureDir(tempDir);
      
      try {
        // 模拟 Kiro 配置目录存在
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        const detected = await configManager.detectInstalledEditors();
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        expect(detected.kiro).toHaveProperty('installed');
        expect(detected.kiro).toHaveProperty('configPath');
        expect(detected.kiro).toHaveProperty('settingsFile');
        expect(detected.kiro).toHaveProperty('keybindingsFile');
        expect(detected.kiro).toHaveProperty('snippetsPath');
        
        expect(detected.kiro.settingsFile).toBe(path.join(tempDir, 'settings.json'));
        expect(detected.kiro.keybindingsFile).toBe(path.join(tempDir, 'keybindings.json'));
        expect(detected.kiro.snippetsPath).toBe(path.join(tempDir, 'snippets'));
      } finally {
        // 清理临时目录
        await fs.remove(tempDir);
      }
    });

    test('Property-based: detectInstalledEditors should correctly detect Kiro across multiple scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (shouldExist) => {
            const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}-${Math.random()}`);
            
            try {
              if (shouldExist) {
                await fs.ensureDir(tempDir);
              }
              
              // 模拟 Kiro 配置目录
              const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
              ConfigManager.prototype.getKiroPath = function() {
                return tempDir;
              };
              
              const configManager = new ConfigManager();
              const detected = await configManager.detectInstalledEditors();
              
              // 恢复原始方法
              ConfigManager.prototype.getKiroPath = originalGetKiroPath;
              
              // 验证检测结果与目录存在性一致
              if (shouldExist) {
                if (detected.kiro.installed !== true) {
                  throw new Error(`Expected kiro.installed to be true when directory exists`);
                }
              } else {
                if (detected.kiro.installed !== false) {
                  throw new Error(`Expected kiro.installed to be false when directory does not exist`);
                }
              }
              
              return true;
            } finally {
              // 清理临时目录
              if (shouldExist) {
                await fs.remove(tempDir);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

// Run all tests
async function runTests() {
  console.log('\n🧪 Running ConfigManager - Editor Detection Tests\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const { describe: desc, name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${desc} > ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${desc} > ${name}`);
      console.log(`   ${error.message}\n`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
