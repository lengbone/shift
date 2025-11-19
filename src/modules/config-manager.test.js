const fc = require('fast-check');
const ConfigManager = require('./config-manager');
const os = require('os');
const path = require('path');

// Simple test runner
const tests = [];
const describes = [];
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
    not: {
      toBeNull() {
        if (value === null) {
          throw new Error(`Expected ${value} not to be null`);
        }
      }
    },
    toBeNull() {
      if (value !== null) {
        throw new Error(`Expected ${value} to be null`);
      }
    },
    toContain(substring) {
      if (!value.includes(substring)) {
        throw new Error(`Expected ${value} to contain ${substring}`);
      }
    },
    toMatch(regex) {
      if (!regex.test(value)) {
        throw new Error(`Expected ${value} to match ${regex}`);
      }
    },
    toHaveProperty(prop) {
      if (!(prop in value)) {
        throw new Error(`Expected ${JSON.stringify(value)} to have property ${prop}`);
      }
    }
  };
}

describe('ConfigManager - Kiro Support', () => {
  // Feature: kiro-support, Property 1: 配置路径检测
  // 对于任何平台（Windows、macOS、Linux），getKiroPath() 函数应该返回该平台特定的有效 Kiro 配置路径格式
  // 验证：需求 1.1, 1.4, 1.5, 1.6
  describe('Property 1: 配置路径检测', () => {
    test('getKiroPath should return valid platform-specific paths', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('win32', 'darwin', 'linux'),
          (platform) => {
            // 创建一个模拟的 ConfigManager 实例
            const originalPlatform = os.platform;
            os.platform = () => platform;
            
            const configManager = new ConfigManager();
            const kiroPath = configManager.getKiroPath();
            
            // 恢复原始平台
            os.platform = originalPlatform;
            
            // 验证路径不为 null
            expect(kiroPath).not.toBeNull();
            
            // 验证路径包含 'Kiro' 和 'User'
            expect(kiroPath).toContain('Kiro');
            expect(kiroPath).toContain('User');
            
            // 验证平台特定的路径格式
            if (platform === 'win32') {
              expect(kiroPath).toContain('AppData');
              expect(kiroPath).toContain('Roaming');
            } else if (platform === 'darwin') {
              expect(kiroPath).toContain('Library');
              expect(kiroPath).toContain('Application Support');
            } else if (platform === 'linux') {
              expect(kiroPath).toContain('.config');
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('getKiroPath should use path.join for all platforms', () => {
      const platforms = ['win32', 'darwin', 'linux'];
      
      platforms.forEach(platform => {
        const originalPlatform = os.platform;
        os.platform = () => platform;
        
        const configManager = new ConfigManager();
        const kiroPath = configManager.getKiroPath();
        
        os.platform = originalPlatform;
        
        // 验证路径包含路径分隔符（path.join 会使用正确的分隔符）
        // 在实际系统上，path.join 会使用系统的分隔符
        expect(kiroPath).toContain(path.sep);
      });
    });

    test('getKiroPath should return consistent paths for the same platform', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('win32', 'darwin', 'linux'),
          (platform) => {
            const originalPlatform = os.platform;
            os.platform = () => platform;
            
            const configManager1 = new ConfigManager();
            const configManager2 = new ConfigManager();
            
            const path1 = configManager1.getKiroPath();
            const path2 = configManager2.getKiroPath();
            
            os.platform = originalPlatform;
            
            // 相同平台应该返回相同的路径
            expect(path1).toBe(path2);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Kiro path structure validation', () => {
    test('Windows path should follow correct structure', () => {
      const originalPlatform = os.platform;
      os.platform = () => 'win32';
      
      const configManager = new ConfigManager();
      const kiroPath = configManager.getKiroPath();
      
      os.platform = originalPlatform;
      
      // Windows: %APPDATA%\Kiro\User
      expect(kiroPath).toMatch(/AppData[\\\/]Roaming[\\\/]Kiro[\\\/]User/);
    });

    test('macOS path should follow correct structure', () => {
      const originalPlatform = os.platform;
      os.platform = () => 'darwin';
      
      const configManager = new ConfigManager();
      const kiroPath = configManager.getKiroPath();
      
      os.platform = originalPlatform;
      
      // macOS: ~/Library/Application Support/Kiro/User
      expect(kiroPath).toMatch(/Library[\\\/]Application Support[\\\/]Kiro[\\\/]User/);
    });

    test('Linux path should follow correct structure', () => {
      const originalPlatform = os.platform;
      os.platform = () => 'linux';
      
      const configManager = new ConfigManager();
      const kiroPath = configManager.getKiroPath();
      
      os.platform = originalPlatform;
      
      // Linux: ~/.config/Kiro/User
      expect(kiroPath).toMatch(/\.config[\\\/]Kiro[\\\/]User/);
    });
  });

  describe('editorPaths should include kiro', () => {
    test('editorPaths object should contain kiro key', () => {
      const configManager = new ConfigManager();
      
      expect(configManager.editorPaths).toHaveProperty('kiro');
      expect(configManager.editorPaths.kiro).not.toBeNull();
    });

    test('kiro path should be consistent with getKiroPath()', () => {
      const configManager = new ConfigManager();
      
      const directPath = configManager.getKiroPath();
      const pathFromObject = configManager.editorPaths.kiro;
      
      expect(pathFromObject).toBe(directPath);
    });
  });
});


// Run all tests
async function runTests() {
  console.log('\n🧪 Running ConfigManager - Kiro Support Tests\n');
  
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
