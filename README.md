# Shift

一个简单的编辑器配置迁移工具，用于在不同的 VSCode 衍生品编辑器之间转移配置和插件。

## 为什么做这个？

经常在不同的编辑器之间切换，每次都要重新配置很麻烦。所以写了这个小工具，可以快速迁移配置、插件和设置。

## 支持的编辑器

- VSCode
- Cursor  
- Trae
- Windsurf
- Qoder
- Kiro

## 功能

- 自动检测已安装的编辑器
- 导出/导入编辑器配置（设置、快捷键、代码片段）
- 导出/导入插件列表
- 创建和恢复备份
- 自动更新功能（自动检测、下载和安装新版本）
- 跨平台支持（Windows、macOS、Linux）

## 安装

去 [Releases](https://github.com/lengbone/shift/releases) 下载对应平台的安装包：

- Windows: `.exe` 安装程序
- macOS: `.dmg` 文件

## 使用

1. 打开应用，点击"检测编辑器"
2. 选择源编辑器，导出配置
3. 选择目标编辑器，导入配置
4. 完成！

## 开发

```bash
git clone https://github.com/your-username/shift.git
cd shift
npm install
npm run dev
```

构建：
```bash
npm run build:win    # Windows
npm run build:mac    # macOS  
```

## 技术栈

- Electron
- Node.js
- 原生 HTML/CSS/JS

## 许可证

MIT
