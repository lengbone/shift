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
    toEqual(expected) {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toContain(substring) {
      if (!value.includes(substring)) {
        throw new Error(`Expected ${value} to contain ${substring}`);
      }
    }
  };
}

describe('ConfigManager - Config Import', () => {
  // Feature: kiro-support, Property 4: 配置导入往返一致性
  // 对于任何有效的配置数据，导出配置然后导入到新位置应该产生相同的配置内容
  // 验证：需求 3.1, 3.2, 3.3
  describe('Property 4: 配置导入往返一致性', () => {
    test('importConfig should write settings to Kiro directory', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      
      try {
        const testConfig = {
          settings: { 'editor.fontSize': 16 },
          keybindings: [],
          snippets: {}
        };
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        await configManager.importConfig('kiro', testConfig);
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        // 验证文件已创建
        const settingsPath = path.join(tempDir, 'settings.json');
        const exists = await fs.pathExists(settingsPath);
        if (!exists) {
          throw new Error('Settings file was not created');
        }
        
        const savedSettings = await fs.readJson(settingsPath);
        expect(savedSettings).toEqual(testConfig.settings);
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('importConfig should write keybindings to Kiro directory', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      
      try {
        const testConfig = {
          settings: {},
          keybindings: [{ key: 'ctrl+s', command: 'save' }],
          snippets: {}
        };
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        await configManager.importConfig('kiro', testConfig);
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        // 验证文件已创建
        const keybindingsPath = path.join(tempDir, 'keybindings.json');
        const exists = await fs.pathExists(keybindingsPath);
        if (!exists) {
          throw new Error('Keybindings file was not created');
        }
        
        const savedKeybindings = await fs.readJson(keybindingsPath);
        expect(savedKeybindings).toEqual(testConfig.keybindings);
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('importConfig should write snippets to Kiro directory', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      
      try {
        const testConfig = {
          settings: {},
          keybindings: [],
          snippets: {
            javascript: { log: { prefix: 'log', body: 'console.log($1);' } }
          }
        };
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        await configManager.importConfig('kiro', testConfig);
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        // 验证文件已创建
        const snippetPath = path.join(tempDir, 'snippets', 'javascript.json');
        const exists = await fs.pathExists(snippetPath);
        if (!exists) {
          throw new Error('Snippet file was not created');
        }
        
        const savedSnippet = await fs.readJson(snippetPath);
        expect(savedSnippet).toEqual(testConfig.snippets.javascript);
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('Round-trip import/export with valid config', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      
      try {
        const originalConfig = {
          settings: { 'editor.fontSize': 14, 'editor.theme': 'dark' },
          keybindings: [{ key: 'ctrl+s', command: 'save' }],
          snippets: {
            javascript: { log: { prefix: 'log', body: 'console.log($1);' } }
          }
        };
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        
        // 导入配置
        await configManager.importConfig('kiro', originalConfig);
        
        // 导出配置
        const exportedConfig = await configManager.getEditorConfig('kiro');
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        // 验证往返一致性
        expect(exportedConfig.settings).toEqual(originalConfig.settings);
        expect(exportedConfig.keybindings).toEqual(originalConfig.keybindings);
        expect(exportedConfig.snippets).toEqual(originalConfig.snippets);
      } finally {
        await fs.remove(tempDir);
      }
    });
  });

  // Feature: kiro-support, Property 5: 目录自动创建
  // 对于任何不存在的目标路径，importConfig() 应该创建必要的目录结构而不抛出错误
  // 验证：需求 3.4
  describe('Property 5: 目录自动创建', () => {
    test('importConfig should create directory if it does not exist', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      
      try {
        // 确保目录不存在
        await fs.remove(tempDir);
        
        const testConfig = {
          settings: { 'editor.fontSize': 14 },
          keybindings: [],
          snippets: {}
        };
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        await configManager.importConfig('kiro', testConfig);
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        // 验证目录已创建
        const exists = await fs.pathExists(tempDir);
        if (!exists) {
          throw new Error('Directory was not created');
        }
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('importConfig should create snippets directory if it does not exist', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      
      try {
        const testConfig = {
          settings: {},
          keybindings: [],
          snippets: {
            test: { snippet: { prefix: 'test' } }
          }
        };
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        await configManager.importConfig('kiro', testConfig);
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        // 验证 snippets 目录已创建
        const snippetsDir = path.join(tempDir, 'snippets');
        const exists = await fs.pathExists(snippetsDir);
        if (!exists) {
          throw new Error('Snippets directory was not created');
        }
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('Property-based: importConfig should handle non-existent directories', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            settings: fc.dictionary(fc.string().filter(s => /^[a-zA-Z0-9._-]+$/.test(s)), fc.string()),
            keybindings: fc.array(fc.record({ key: fc.string().filter(s => /^[a-zA-Z0-9+]+$/.test(s)), command: fc.string().filter(s => /^[a-zA-Z0-9._-]+$/.test(s)) })),
            snippets: fc.dictionary(fc.string().filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), fc.object().filter(o => Object.keys(o).length > 0))
          }),
          async (config) => {
            const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}-${Math.random()}`);
            
            try {
              // 确保目录不存在
              await fs.remove(tempDir);
              
              // 模拟 Kiro 配置目录
              const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
              ConfigManager.prototype.getKiroPath = function() {
                return tempDir;
              };
              
              const configManager = new ConfigManager();
              
              // 应该不抛出错误
              await configManager.importConfig('kiro', config);
              
              // 恢复原始方法
              ConfigManager.prototype.getKiroPath = originalGetKiroPath;
              
              // 验证目录已创建
              const exists = await fs.pathExists(tempDir);
              if (!exists) {
                throw new Error('Directory was not created');
              }
              
              return true;
            } finally {
              await fs.remove(tempDir);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // Feature: kiro-support, Property 6: JSON 格式保持
  // 对于任何导入的配置，生成的 JSON 文件应该使用 2 空格缩进格式
  // 验证：需求 3.5
  describe('Property 6: JSON 格式保持', () => {
    test('importConfig should format JSON files with 2-space indentation', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      
      try {
        const testConfig = {
          settings: { 'editor.fontSize': 14, 'editor.theme': 'dark' },
          keybindings: [{ key: 'ctrl+s', command: 'save' }],
          snippets: {}
        };
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        await configManager.importConfig('kiro', testConfig);
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        // 读取文件内容并检查格式
        const settingsPath = path.join(tempDir, 'settings.json');
        const settingsContent = await fs.readFile(settingsPath, 'utf8');
        
        // 验证使用 2 空格缩进
        expect(settingsContent).toContain('  "editor.fontSize"');
        
        const keybindingsPath = path.join(tempDir, 'keybindings.json');
        const keybindingsContent = await fs.readFile(keybindingsPath, 'utf8');
        
        // 验证使用 2 空格缩进
        expect(keybindingsContent).toContain('  {');
      } finally {
        await fs.remove(tempDir);
      }
    });

    test('Imported JSON files with non-empty data use 2-space indentation', async () => {
      const tempDir = path.join(os.tmpdir(), `kiro-test-${Date.now()}`);
      
      try {
        const config = {
          settings: { 'editor.fontSize': 14, 'editor.theme': 'dark' },
          keybindings: [{ key: 'ctrl+s', command: 'save' }],
          snippets: {}
        };
        
        // 模拟 Kiro 配置目录
        const originalGetKiroPath = ConfigManager.prototype.getKiroPath;
        ConfigManager.prototype.getKiroPath = function() {
          return tempDir;
        };
        
        const configManager = new ConfigManager();
        await configManager.importConfig('kiro', config);
        
        // 恢复原始方法
        ConfigManager.prototype.getKiroPath = originalGetKiroPath;
        
        // 检查所有生成的 JSON 文件
        const settingsPath = path.join(tempDir, 'settings.json');
        const settingsContent = await fs.readFile(settingsPath, 'utf8');
        const settingsParsed = JSON.parse(settingsContent);
        const settingsFormatted = JSON.stringify(settingsParsed, null, 2);
        expect(settingsContent.trim()).toBe(settingsFormatted);
        
        const keybindingsPath = path.join(tempDir, 'keybindings.json');
        const keybindingsContent = await fs.readFile(keybindingsPath, 'utf8');
        const keybindingsParsed = JSON.parse(keybindingsContent);
        const keybindingsFormatted = JSON.stringify(keybindingsParsed, null, 2);
        expect(keybindingsContent.trim()).toBe(keybindingsFormatted);
      } finally {
        await fs.remove(tempDir);
      }
    });
  });
});

// Run all tests
async function runTests() {
  console.log('\n🧪 Running ConfigManager - Config Import Tests\n');
  
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
