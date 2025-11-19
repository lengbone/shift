# GitHub 发布指南

本指南介绍如何将 Shift 项目发布到 GitHub，并实现自动构建和版本控制。

## 🚀 快速开始

### 1. 初始化 Git 仓库

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 创建初始提交
git commit -m "feat: initial commit"

# 添加远程仓库（替换为你的 GitHub 仓库地址）
git remote add origin https://github.com/your-username/shift.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 2. 创建 GitHub 仓库

1. 访问 [GitHub](https://github.com)
2. 点击 "New repository"
3. 仓库名称：`shift`
4. 描述：`现代化跨平台编辑器配置迁移工具`
5. 选择 "Public" 或 "Private"
6. 不要初始化 README（我们已经有了）
7. 点击 "Create repository"

### 3. 配置 GitHub Actions

GitHub Actions 工作流程已经配置在 `.github/workflows/build-and-release.yml`。

#### 需要的权限
确保仓库设置中启用了以下权限：
- Settings → Actions → General → Workflow permissions
- 选择 "Read and write permissions"
- 勾选 "Allow GitHub Actions to create and approve pull requests"

## 📦 版本发布流程

### 自动发布（推荐）

使用内置的发布脚本：

```bash
# 发布补丁版本 (1.0.0 -> 1.0.1)
npm run release:patch

# 发布次要版本 (1.0.0 -> 1.1.0)
npm run release:minor

# 发布主要版本 (1.0.0 -> 2.0.0)
npm run release:major
```

发布脚本会自动：
1. 更新 `package.json` 中的版本号
2. 更新 `CHANGELOG.md`
3. 创建 Git 提交和标签
4. 推送到 GitHub
5. 触发自动构建和发布

### 手动发布

如果需要手动控制：

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 更新 CHANGELOG.md
# 手动编辑 CHANGELOG.md 文件

# 3. 提交更改
git add .
git commit -m "chore: release v1.0.1"

# 4. 创建标签
git tag -a v1.0.1 -m "Release v1.0.1"

# 5. 推送到 GitHub
git push origin main
git push origin v1.0.1
```

## 🔄 自动构建流程

当推送版本标签（如 `v1.0.1`）时，GitHub Actions 会自动：

### 构建阶段
1. **多平台构建**：在 macOS、Windows、Linux 上并行构建
2. **生成安装包**：
   - macOS: `.dmg` 文件
   - Windows: `.exe` 安装程序
   - Linux: `.AppImage` 和 `.deb` 文件

### 发布阶段
1. **创建 Release**：自动创建 GitHub Release
2. **上传文件**：将构建的安装包上传到 Release
3. **生成说明**：自动生成 Release 说明

## 📋 版本控制规范

### 语义化版本

遵循 [Semantic Versioning](https://semver.org/) 规范：

- **主版本号** (MAJOR)：不兼容的 API 修改
- **次版本号** (MINOR)：向下兼容的功能性新增
- **修订号** (PATCH)：向下兼容的问题修正

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型：
- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```bash
git commit -m "feat: add qoder editor support"
git commit -m "fix: resolve icon display issue on windows"
git commit -m "docs: update installation guide"
```

## 🔧 配置文件说明

### GitHub Actions 工作流程

`.github/workflows/build-and-release.yml` 包含：

- **触发条件**：推送版本标签时自动运行
- **构建矩阵**：支持 macOS、Windows、Linux
- **构建步骤**：安装依赖、构建、上传
- **发布步骤**：创建 Release、上传文件

### 版本管理脚本

`scripts/release.js` 提供：

- 自动版本号更新
- CHANGELOG.md 更新
- Git 标签创建和推送
- 错误处理和回滚

## 📁 发布文件结构

发布后，用户可以下载：

```
Release v1.0.1/
├── Shift-1.0.1-macos-x64.dmg      # macOS Intel
├── Shift-1.0.1-macos-arm64.dmg    # macOS Apple Silicon
├── Shift-Setup-1.0.1.exe          # Windows 安装程序
├── Shift-1.0.1-linux.AppImage     # Linux 便携版
└── Shift-1.0.1.deb                # Linux Debian 包
```

## 🛠️ 故障排除

### 构建失败

1. **检查日志**：在 GitHub Actions 页面查看详细日志
2. **本地测试**：先在本地运行 `npm run build` 测试
3. **依赖问题**：确保 `package.json` 中的依赖正确

### 发布失败

1. **权限问题**：检查 GitHub Actions 权限设置
2. **标签冲突**：确保版本标签唯一
3. **网络问题**：重新运行失败的工作流程

### Draft Release 不会自动发布

如果 GitHub Release 保持 Draft（草稿）状态：

1. **自动发布配置**：确保 `package.json` 中配置了 `releaseType: "release"`
   ```json
   "publish": [
     {
       "provider": "github",
       "owner": "lengbone",
       "repo": "shift",
       "releaseType": "release"
     }
   ]
   ```

2. **手动发布草稿**：
   - 访问 GitHub Releases 页面
   - 找到 Draft 版本
   - 点击 "Edit" 按钮
   - 取消勾选 "Set as a pre-release"
   - 点击 "Publish release" 按钮

3. **删除旧的 Draft**：
   - 如果有多个 Draft 版本，可以删除旧的
   - 点击 Draft 版本的 "Delete" 按钮

### 缺少 latest-mac.yml 等更新文件

如果自动更新检查失败，提示找不到 `latest-mac.yml`：

1. **原因**：Release 是 Draft 状态，或构建时未生成更新元数据文件

2. **解决方案**：
   
   **方法 1: 发布 Draft Release**
   - 访问 GitHub Releases 页面
   - 发布 Draft 版本（见上文）
   
   **方法 2: 手动生成并上传更新文件**
   ```bash
   # 构建应用
   npm run build
   
   # 生成更新元数据文件
   npm run generate-update-files
   
   # 文件会生成在 dist 目录中：
   # - latest-mac.yml (macOS)
   # - latest.yml (Windows)
   # - latest-linux.yml (Linux)
   ```
   
   然后手动上传这些文件到 GitHub Release

3. **验证**：
   - 确保 Release 已发布（不是 Draft）
   - 确保以下文件存在于 Release 中：
     - `latest-mac.yml`
     - `latest.yml`
     - `latest-linux.yml`
   - 访问 URL 验证文件可访问：
     `https://github.com/lengbone/shift/releases/download/v1.0.3/latest-mac.yml`

### 版本管理问题

1. **标签已存在**：删除本地和远程标签后重新创建
   ```bash
   git tag -d v1.0.1
   git push origin :refs/tags/v1.0.1
   ```

2. **提交冲突**：先拉取最新代码再发布
   ```bash
   git pull origin main
   npm run release:patch
   ```

## 📚 相关资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Electron Builder 文档](https://www.electron.build/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
