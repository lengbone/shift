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
        throw new Error(`Expected object to have property ${prop}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      }
    }
  };
}

describe('ConfigManager - Config Export', () => {
  // Feature: kiro-support, Property 3: 配置导出完整性
  // 对于任何有效的 Kiro 配置目录，getEditorConfig('kiro') 应该返回包含 settings、keybindings 和 snippets 的完整配置对象
  // 验证：需求 2.1, 2.2, 2.3
  describe('Property 3: 配置导出完整性', () => {
    test('getEditorConfig should return config object with all required properties', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      await fs.ensureDir(tempDir);
      
      try {
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        const config = await configManager.getEditorConfig('kiro');
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        expect(config).toHaveProperty('settings');
        expect(config).toHaveProperty('keybindings');
        expect(config).toHaveProperty('snippets');
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('getEditorConfig should read settings.json when it exists', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      await fs.ensureDir(tempDir);
      
      try {
        // 创建测试配置文件
        const testSettings = { 'editor.fontSize': 14, 'editor.theme': 'dark' };
        await fs.writeJson(path.join(tempDir, 'settings.json'), testSettings);
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        const config = await configManager.getEditorConfig('kiro');
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        expect(config.settings).toEqual(testSettings);
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('getEditorConfig should read keybindings.json when it exists', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      await fs.ensureDir(tempDir);
      
      try {
        // 创建测试快捷键文件
        const testKeybindings = [
          { key: 'ctrl+s', command: 'workbench.action.files.save' }
        ];
        await fs.writeJson(path.join(tempDir, 'keybindings.json'), testKeybindings);
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        const config = await configManager.getEditorConfig('kiro');
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        expect(config.keybindings).toEqual(testKeybindings);
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('getEditorConfig should read all snippet files from snippets directory', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      await fs.ensureDir(tempDir);
      const snippetsDir = path.join(tempDir, 'snippets');
      await fs.ensureDir(snippetsDir);
      
      try {
        // 创建测试代码片段文件
        const testSnippet1 = { 'console.log': { prefix: 'log', body: 'console.log($1);' } };
        const testSnippet2 = { 'function': { prefix: 'fn', body: 'function $1() {\n\t$2\n}' } };
        
        await fs.writeJson(path.join(snippetsDir, 'javascript.json'), testSnippet1);
        await fs.writeJson(path.join(snippetsDir, 'typescript.json'), testSnippet2);
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        const config = await configManager.getEditorConfig('kiro');
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        expect(config.snippets).toHaveProperty('javascript');
        expect(config.snippets).toHaveProperty('typescript');
        expect(config.snippets.javascript).toEqual(testSnippet1);
        expect(config.snippets.typescript).toEqual(testSnippet2);
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('getEditorConfig should return empty objects when config files do not exist', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      await fs.ensureDir(tempDir);
      
      try {
        // 不创建任何配置文件
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        const config = await configManager.getEditorConfig('kiro');
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        expect(config.settings).toEqual({});
        expect(config.keybindings).toEqual([]);
        expect(config.snippets).toEqual({});
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('Property-based: getEditorConfig should correctly read any valid configuration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            settings: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
            keybindings: fc.array(fc.record({
              key: fc.string(),
              command: fc.string()
            })),
            hasSnippets: fc.boolean()
          }),
          async ({ settings, keybindings, hasSnippets }) => {
            const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}-${Math.random()}`);
            await fs.ensureDir(tempDir);
            
            try {
              // 创建配置文件
              await fs.writeJson(path.join(tempDir, 'settings.json'), settings);
              await fs.writeJson(path.join(tempDir, 'keybindings.json'), keybindings);
              
              if (hasSnippets) {
                const snippetsDir = path.join(tempDir, 'snippets');
                await fs.ensureDir(snippetsDir);
                await fs.writeJson(path.join(snippetsDir, 'test.json'), { test: { prefix: 'test' } });
              }
              
              // 模拟 Kiro 配置目录
              const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
              ConfigManager.prototype.getKiroPath = function() {
                return tempDir;
              };
              
              const configManager = new ConfigManager();
              const config = await configManager.getEditorConfig('kiro');
              
              // 恢复原始方法
              ConfigManager.prototype.getKiroPath = originalGetKiroPath;
              
              // 验证读取的配置与写入的配置一致
              if (JSON.stringify(config.settings) !== JSON.stringify(settings)) {
                throw new Error('Settings mismatch');
              }
              if (JSON.stringify(config.keybindings) !== JSON.stringify(keybindings)) {
                throw new Error('Keybindings mismatch');
              }
              
              return true;
            } finally {
              await fs.remove(tempDir);
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
  console.log('\n🧪 Running ConfigManager - Config Export Tests\n');
  
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
