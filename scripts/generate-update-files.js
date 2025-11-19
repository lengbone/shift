const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * 生成文件的 SHA512 哈希值
 */
function generateSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha512');
  hashSum.update(fileBuffer);
  return hashSum.digest('base64');
}

/**
 * 获取文件大小
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * 生成 latest-mac.yml
 */
function generateMacYml(version, distPath) {
  const dmgFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.dmg'));
  
  if (dmgFiles.length === 0) {
    console.log('⚠️  未找到 .dmg 文件，跳过 latest-mac.yml');
    return;
  }

  const files = dmgFiles.map(file => {
    const filePath = path.join(distPath, file);
    return {
      url: file,
      sha512: generateSHA512(filePath),
      size: getFileSize(filePath)
    };
  });

  const mainFile = files[0];
  const yml = `version: ${version}
files:
${files.map(f => `  - url: ${f.url}
    sha512: ${f.sha512}
    size: ${f.size}`).join('\n')}
path: ${mainFile.url}
sha512: ${mainFile.sha512}
releaseDate: '${new Date().toISOString()}'
`;

  fs.writeFileSync(path.join(distPath, 'latest-mac.yml'), yml);
  console.log('✅ 已生成 latest-mac.yml');
}

/**
 * 生成 latest.yml (Windows)
 */
function generateWindowsYml(version, distPath) {
  const exeFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.exe') && !f.includes('blockmap'));
  
  if (exeFiles.length === 0) {
    console.log('⚠️  未找到 .exe 文件，跳过 latest.yml');
    return;
  }

  const file = exeFiles[0];
  const filePath = path.join(distPath, file);
  
  const yml = `version: ${version}
files:
  - url: ${file}
    sha512: ${generateSHA512(filePath)}
    size: ${getFileSize(filePath)}
path: ${file}
sha512: ${generateSHA512(filePath)}
releaseDate: '${new Date().toISOString()}'
`;

  fs.writeFileSync(path.join(distPath, 'latest.yml'), yml);
  console.log('✅ 已生成 latest.yml');
}

/**
 * 生成 latest-linux.yml
 */
function generateLinuxYml(version, distPath) {
  const appImageFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.AppImage'));
  
  if (appImageFiles.length === 0) {
    console.log('⚠️  未找到 .AppImage 文件，跳过 latest-linux.yml');
    return;
  }

  const file = appImageFiles[0];
  const filePath = path.join(distPath, file);
  
  const yml = `version: ${version}
files:
  - url: ${file}
    sha512: ${generateSHA512(filePath)}
    size: ${getFileSize(filePath)}
path: ${file}
sha512: ${generateSHA512(filePath)}
releaseDate: '${new Date().toISOString()}'
`;

  fs.writeFileSync(path.join(distPath, 'latest-linux.yml'), yml);
  console.log('✅ 已生成 latest-linux.yml');
}

// 主函数
function main() {
  const packageJson = require('../package.json');
  const version = packageJson.version;
  const distPath = path.join(__dirname, '..', 'dist');

  if (!fs.existsSync(distPath)) {
    console.error('❌ dist 目录不存在，请先运行 npm run build');
    process.exit(1);
  }

  console.log(`📦 正在为版本 ${version} 生成更新文件...`);
  
  generateMacYml(version, distPath);
  generateWindowsYml(version, distPath);
  generateLinuxYml(version, distPath);
  
  console.log('🎉 更新文件生成完成！');
  console.log('\n请将 dist 目录中的以下文件上传到 GitHub Release:');
  console.log('  - latest-mac.yml');
  console.log('  - latest.yml');
  console.log('  - latest-linux.yml');
}

main();
