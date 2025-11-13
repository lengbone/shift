#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 版本类型
const VERSION_TYPES = {
  major: 'major',
  minor: 'minor', 
  patch: 'patch'
};

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function updateVersion(type) {
  const currentVersion = getCurrentVersion();
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case VERSION_TYPES.major:
      newVersion = `${major + 1}.0.0`;
      break;
    case VERSION_TYPES.minor:
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case VERSION_TYPES.patch:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      throw new Error(`无效的版本类型: ${type}`);
  }
  
  // 更新 package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ 版本已更新: ${currentVersion} -> ${newVersion}`);
  return newVersion;
}

function createGitTag(version) {
  const tag = `v${version}`;
  
  try {
    // 检查是否有未提交的更改
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('📝 检测到未提交的更改，正在提交...');
      execSync('git add .');
      execSync(`git commit -m "chore: release v${version}"`);
    }
    
    // 创建标签
    execSync(`git tag -a ${tag} -m "Release ${tag}"`);
    console.log(`✅ Git 标签已创建: ${tag}`);
    
    // 推送到远程
    console.log('🚀 推送到远程仓库...');
    execSync('git push origin main');
    execSync(`git push origin ${tag}`);
    console.log('✅ 推送完成');
    
    return tag;
  } catch (error) {
    console.error('❌ Git 操作失败:', error.message);
    throw error;
  }
}

function updateChangelog(version) {
  const changelogPath = 'CHANGELOG.md';
  
  if (!fs.existsSync(changelogPath)) {
    console.log('⚠️ CHANGELOG.md 不存在，跳过更新');
    return;
  }
  
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  // 替换 [未发布] 为当前版本
  const updatedChangelog = changelog.replace(
    '## [未发布]',
    `## [未发布]

### 新增
- 待添加的新功能

### 修改
- 待修改的现有功能

### 修复
- 待修复的问题

## [${version}] - ${today}`
  );
  
  fs.writeFileSync(changelogPath, updatedChangelog);
  console.log('✅ CHANGELOG.md 已更新');
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0];
  
  if (!versionType || !Object.values(VERSION_TYPES).includes(versionType)) {
    console.log(`
使用方法: node scripts/release.js <version_type>

版本类型:
  major - 主版本号 (1.0.0 -> 2.0.0)
  minor - 次版本号 (1.0.0 -> 1.1.0)  
  patch - 修订号   (1.0.0 -> 1.0.1)

示例:
  node scripts/release.js patch
  node scripts/release.js minor
  node scripts/release.js major
`);
    process.exit(1);
  }
  
  try {
    console.log(`🚀 开始发布 ${versionType} 版本...`);
    
    // 更新版本号
    const newVersion = updateVersion(versionType);
    
    // 更新更新日志
    updateChangelog(newVersion);
    
    // 创建 Git 标签并推送
    const tag = createGitTag(newVersion);
    
    console.log(`
🎉 发布成功！

版本: ${newVersion}
标签: ${tag}

GitHub Actions 将自动构建并发布到 Releases。
请访问 GitHub 仓库查看构建状态。
`);
    
  } catch (error) {
    console.error('❌ 发布失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getCurrentVersion,
  updateVersion,
  createGitTag,
  updateChangelog
};
