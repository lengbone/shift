# 更新日志

## [1.0.0] - 2025-11-13

第一个版本，基本功能都有了：

- 支持 VSCode、Cursor、Trae、Windsurf、Qoder 编辑器
- 自动检测已安装的编辑器
- 导出/导入配置（设置、快捷键、代码片段）
- 导出/导入插件列表
- 备份和恢复功能
- 跨平台支持（Windows、macOS、Linux）
- 简单易用的界面

技术栈：
- Electron + Node.js
- 原生 HTML/CSS/JS
- fs-extra 处理文件操作
- electron-builder 打包

已知问题：
- 某些插件可能在不同编辑器间不兼容
- 需要编辑器的命令行工具支持
