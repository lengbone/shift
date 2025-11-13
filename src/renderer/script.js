const { ipcRenderer } = require('electron');

class VSCodeConfigMigrator {
    constructor() {
        this.editors = {};
        this.currentExtensions = [];
        this.backups = [];
        this.init();
    }

    init() {
        this.detectPlatform();
        this.initTheme();
        this.initWindowControls();
        this.bindEvents();
        this.initNavigation();
        this.detectEditors();
        this.addLog('应用已启动', 'info');
    }

    initTheme() {
        // 从localStorage读取主题设置
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    initWindowControls() {
        // 绑定窗口控制事件
        window.close = () => {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('window-close');
        };

        window.minimize = () => {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('window-minimize');
        };
    }

    detectPlatform() {
        // 检测平台并添加CSS类
        const platform = require('os').platform();
        if (platform === 'win32') {
            document.body.classList.add('windows');
        } else if (platform === 'darwin') {
            document.body.classList.add('macos');
        } else {
            document.body.classList.add('linux');
        }
    }

    initNavigation() {
        // 绑定导航事件
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
                
                // 更新导航状态
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    switchTab(tabName) {
        // 隐藏所有面板
        const panels = document.querySelectorAll('.content-panel');
        panels.forEach(panel => panel.classList.remove('active'));
        
        // 显示目标面板
        const targetPanel = document.getElementById(`${tabName}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }

    bindEvents() {
        // 检测编辑器
        document.getElementById('detectEditorsBtn').addEventListener('click', () => {
            this.detectEditors();
        });

        // 配置管理
        document.getElementById('exportConfigBtn').addEventListener('click', () => {
            this.exportConfig();
        });

        document.getElementById('importConfigBtn').addEventListener('click', () => {
            this.importConfig();
        });

        // 插件管理
        document.getElementById('loadExtensionsBtn').addEventListener('click', () => {
            this.loadExtensions();
        });

        document.getElementById('exportExtensionsBtn').addEventListener('click', () => {
            this.exportExtensions();
        });

        document.getElementById('importExtensionsBtn').addEventListener('click', () => {
            this.importExtensions();
        });

        document.getElementById('importConfigFromBackupBtn').addEventListener('click', () => {
            this.importConfigFromBackup();
        });

        document.getElementById('importExtensionsFromBackupBtn').addEventListener('click', () => {
            this.importExtensionsFromBackup();
        });

        // 搜索功能
        document.getElementById('extensionSearchInput').addEventListener('input', (e) => {
            this.filterExtensions(e.target.value);
        });

        // 日志管理
        document.getElementById('clearLogBtn').addEventListener('click', () => {
            this.clearLog();
        });

        // 编辑器选择变化
        document.getElementById('sourceEditor').addEventListener('change', (e) => {
            this.updateConfigButtons(e.target.value);
        });

        document.getElementById('extensionEditor').addEventListener('change', (e) => {
            this.updateExtensionButtons(e.target.value);
        });

        // 备份管理
        document.getElementById('backupEditor').addEventListener('change', (e) => {
            this.updateBackupButtons(e.target.value);
        });

        document.getElementById('createBackupBtn').addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('refreshBackupsBtn').addEventListener('click', () => {
            this.loadBackups();
        });
    }

    async detectEditors() {
        this.showLoading('detectBtn', true);
        this.addLog('正在检测已安装的编辑器...', 'info');

        try {
            this.editors = await ipcRenderer.invoke('detect-editors');
            this.renderEditorList();
            this.updateEditorSelects();
            this.addLog('编辑器检测完成', 'success');
        } catch (error) {
            this.addLog(`检测编辑器失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('detectBtn', false);
        }
    }

    renderEditorList() {
        const container = document.getElementById('editorList');
        container.innerHTML = '';

        const editorNames = {
            vscode: 'Visual Studio Code',
            cursor: 'Cursor',
            trae: 'Trae',
            windsurf: 'Windsurf',
            qoder: 'Qoder'
        };

        for (const [key, info] of Object.entries(this.editors)) {
            const editorItem = document.createElement('div');
            editorItem.className = `editor-item ${info.installed ? 'installed' : 'not-installed'}`;
            
            editorItem.innerHTML = `
                <h3>
                    <span class="status-indicator ${info.installed ? 'installed' : 'not-installed'}"></span>
                    ${editorNames[key] || key}
                </h3>
                <p><strong>状态:</strong> ${info.installed ? '已安装' : '未安装'}</p>
                ${info.configPath ? `<p><strong>配置路径:</strong> ${info.configPath}</p>` : ''}
                ${info.settingsFile ? `<p><strong>设置文件:</strong> ${info.settingsFile}</p>` : ''}
            `;

            container.appendChild(editorItem);
        }
    }

    updateEditorSelects() {
        const sourceSelect = document.getElementById('sourceEditor');
        const extensionSelect = document.getElementById('extensionEditor');

        // 清空现有选项
        sourceSelect.innerHTML = '<option value="">选择源编辑器</option>';
        extensionSelect.innerHTML = '<option value="">选择编辑器</option>';

        const editorNames = {
            vscode: 'Visual Studio Code',
            cursor: 'Cursor',
            trae: 'Trae',
            windsurf: 'Windsurf',
            qoder: 'Qoder'
        };

        // 添加已安装的编辑器选项
        for (const [key, info] of Object.entries(this.editors)) {
            if (info.installed) {
                const option1 = document.createElement('option');
                option1.value = key;
                option1.textContent = editorNames[key] || key;
                sourceSelect.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = key;
                option2.textContent = editorNames[key] || key;
                extensionSelect.appendChild(option2);

                const option3 = document.createElement('option');
                option3.value = key;
                option3.textContent = editorNames[key] || key;
                document.getElementById('backupEditor').appendChild(option3);
            }
        }
    }

    updateConfigButtons(editorType) {
        const exportBtn = document.getElementById('exportConfigBtn');
        const importBtn = document.getElementById('importConfigBtn');
        
        const enabled = editorType && this.editors[editorType]?.installed;
        exportBtn.disabled = !enabled;
        importBtn.disabled = !enabled;
    }

    updateExtensionButtons(editorType) {
        const loadBtn = document.getElementById('loadExtensionsBtn');
        const exportBtn = document.getElementById('exportExtensionsBtn');
        const importBtn = document.getElementById('importExtensionsBtn');
        
        const enabled = editorType && this.editors[editorType]?.installed;
        loadBtn.disabled = !enabled;
        exportBtn.disabled = !enabled;
        importBtn.disabled = !enabled;
    }

    updateBackupButtons(editorType) {
        const createBtn = document.getElementById('createBackupBtn');
        const enabled = editorType && this.editors[editorType]?.installed;
        createBtn.disabled = !enabled;
    }

    async exportConfig() {
        const editorType = document.getElementById('sourceEditor').value;
        if (!editorType) return;

        try {
            const result = await ipcRenderer.invoke('save-file');
            if (result.canceled) return;

            this.showLoading('exportConfigBtn', true);
            this.addLog(`正在导出 ${editorType} 配置...`, 'info');

            const exportResult = await ipcRenderer.invoke('export-config', editorType, result.filePath);
            
            if (exportResult.success) {
                this.addLog(`配置导出成功: ${exportResult.path}`, 'success');
            } else {
                this.addLog('配置导出失败', 'error');
            }
        } catch (error) {
            this.addLog(`导出配置失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('exportConfigBtn', false);
        }
    }

    async importConfig() {
        try {
            const result = await ipcRenderer.invoke('select-file');
            if (result.canceled || result.filePaths.length === 0) return;

            const importPath = result.filePaths[0];
            const targetEditor = document.getElementById('sourceEditor').value;
            
            if (!targetEditor) {
                this.addLog('请先选择目标编辑器', 'warning');
                return;
            }

            this.showLoading('importConfigBtn', true);
            this.addLog(`正在导入配置到 ${targetEditor}...`, 'info');

            const importResult = await ipcRenderer.invoke('import-config', importPath, targetEditor);
            
            if (importResult.success) {
                this.addLog('配置导入成功', 'success');
            } else {
                this.addLog(`配置导入失败: ${importResult.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`导入配置失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('importConfigBtn', false);
        }
    }

    async loadExtensions() {
        const editorType = document.getElementById('extensionEditor').value;
        if (!editorType) return;

        this.showLoading('loadExtensionsBtn', true);
        this.addLog(`正在加载 ${editorType} 的插件列表...`, 'info');

        try {
            this.currentExtensions = await ipcRenderer.invoke('get-extensions', editorType);
            this.renderExtensionList();
            this.addLog(`加载到 ${this.currentExtensions.length} 个插件`, 'success');
        } catch (error) {
            this.addLog(`加载插件失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('loadExtensionsBtn', false);
        }
    }

    renderExtensionList(extensionsToRender = null) {
        const container = document.getElementById('extensionList');
        const extensions = extensionsToRender || this.currentExtensions;
        
        // 使用DocumentFragment减少重绘
        const fragment = document.createDocumentFragment();
        
        if (extensions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-content">
                        <h3>${extensionsToRender ? '未找到匹配的插件' : '暂无插件'}</h3>
                        <p>${extensionsToRender ? '尝试使用不同的搜索关键词' : '请先选择编辑器并点击"加载插件"按钮'}</p>
                    </div>
                </div>
            `;
            return;
        }

        // 按字母顺序排序插件
        const sortedExtensions = [...extensions].sort((a, b) => {
            const nameA = (a.displayName || a.name || '').toLowerCase();
            const nameB = (b.displayName || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // 批量创建DOM元素
        sortedExtensions.forEach(extension => {
            const item = document.createElement('div');
            item.className = 'extension-card';
            
            // 处理描述文本，限制长度
            const description = extension.description || '';
            const truncatedDescription = description.length > 80 
                ? description.substring(0, 80) + '...' 
                : description;
            
            // 获取发布者信息
            const publisher = extension.publisher || extension.identifier?.split('.')[0] || '';
            
            // 生成插件图标
            const iconHtml = this.generateExtensionIcon(extension);
            
            item.innerHTML = `
                <div class="extension-icon">
                    ${iconHtml}
                </div>
                <div class="extension-content">
                    <div class="extension-header">
                        <h3 class="extension-name">${extension.displayName || extension.name || 'Unknown Extension'}</h3>
                        <span class="extension-version">${extension.version ? `v${extension.version}` : ''}</span>
                    </div>
                    <div class="extension-publisher">${publisher}</div>
                    ${truncatedDescription ? `<div class="extension-description">${truncatedDescription}</div>` : ''}
                </div>
                <div class="extension-actions">
                    <button class="uninstall-btn" onclick="app.uninstallExtension('${extension.identifier}')" title="卸载插件">
                        卸载
                    </button>
                </div>
            `;

            fragment.appendChild(item);
        });
        
        // 一次性更新DOM
        container.innerHTML = '';
        container.appendChild(fragment);
        
        // 添加统计信息
        this.updateExtensionStats(sortedExtensions.length, this.currentExtensions.length);
    }

    generateExtensionIcon(extension) {
        // 生成Apple风格的简洁图标
        const displayName = extension.displayName || extension.name || 'Extension';
        
        // 获取插件名称的前两个字符作为图标
        let iconText = '';
        const words = displayName.split(/[\s\-_\.]+/);
        
        if (words.length >= 2) {
            // 如果有多个单词，取前两个单词的首字母
            iconText = words[0][0] + words[1][0];
        } else if (displayName.length >= 2) {
            // 如果是单个单词，取前两个字符
            iconText = displayName.substring(0, 2);
        } else {
            // 如果名称太短，使用首字母
            iconText = displayName[0] || 'E';
        }
        
        return `<div class="ext-icon">${iconText.toUpperCase()}</div>`;
    }

    filterExtensions(searchTerm) {
        if (!this.currentExtensions || this.currentExtensions.length === 0) {
            return;
        }

        const filtered = this.currentExtensions.filter(extension => {
            const name = (extension.displayName || extension.name || '').toLowerCase();
            const publisher = (extension.publisher || '').toLowerCase();
            const description = (extension.description || '').toLowerCase();
            const identifier = (extension.identifier || '').toLowerCase();
            
            const term = searchTerm.toLowerCase();
            
            return name.includes(term) || 
                   publisher.includes(term) || 
                   description.includes(term) || 
                   identifier.includes(term);
        });

        this.renderExtensionList(filtered);
    }


    updateExtensionStats(displayCount, totalCount = null) {
        // 更新插件统计信息
        const statsContainer = document.getElementById('extensionStats');
        if (statsContainer) {
            if (totalCount && displayCount !== totalCount) {
                statsContainer.textContent = `显示 ${displayCount} / ${totalCount} 个插件`;
            } else {
                statsContainer.textContent = `共 ${displayCount} 个插件`;
            }
        }
    }

    async exportExtensions() {
        const editorType = document.getElementById('extensionEditor').value;
        if (!editorType) return;

        try {
            const result = await ipcRenderer.invoke('save-file');
            if (result.canceled) return;

            this.showLoading('exportExtensionsBtn', true);
            this.addLog(`正在导出 ${editorType} 插件...`, 'info');

            const exportResult = await ipcRenderer.invoke('export-extensions', editorType, result.filePath);
            
            if (exportResult.success) {
                this.addLog(`插件导出成功: ${exportResult.path}`, 'success');
                this.addLog(`文件已保存到: ${exportResult.path}`, 'info');
            } else {
                this.addLog(`插件导出失败: ${exportResult.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`导出插件失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('exportExtensionsBtn', false);
        }
    }

    async importExtensions() {
        try {
            const result = await ipcRenderer.invoke('select-file');
            if (result.canceled || result.filePaths.length === 0) return;

            const importPath = result.filePaths[0];
            const targetEditor = document.getElementById('extensionEditor').value;
            
            if (!targetEditor) {
                this.addLog('请先选择目标编辑器', 'warning');
                return;
            }

            this.showLoading('importExtensionsBtn', true);
            this.addLog(`正在导入插件到 ${targetEditor}...`, 'info');

            const importResult = await ipcRenderer.invoke('import-extensions', importPath, targetEditor);
            
            if (importResult.success) {
                this.addLog(`插件导入成功，成功: ${importResult.results.success.length}，失败: ${importResult.results.failed.length}`, 'success');
                if (importResult.results.failed.length > 0) {
                    importResult.results.failed.forEach(failed => {
                        this.addLog(`插件安装失败: ${failed.extension} - ${failed.error}`, 'warning');
                    });
                }
            } else {
                this.addLog(`插件导入失败: ${importResult.error}`, 'error');
            }
            
            // 重新加载插件列表
            await this.loadExtensions();
        } catch (error) {
            this.addLog(`导入插件失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('importExtensionsBtn', false);
        }
    }

    async uninstallExtension(extensionId) {
        const editorType = document.getElementById('extensionEditor').value;
        if (!editorType) return;

        try {
            this.addLog(`正在卸载插件: ${extensionId}`, 'info');
            
            const result = await ipcRenderer.invoke('uninstall-extension', editorType, extensionId);
            
            if (result.success) {
                this.addLog(`插件卸载成功: ${extensionId}`, 'success');
            } else {
                this.addLog(`插件卸载失败: ${result.error}`, 'error');
            }
            
            // 重新加载插件列表
            await this.loadExtensions();
        } catch (error) {
            this.addLog(`卸载插件失败: ${error.message}`, 'error');
        }
    }

    // 备份管理功能
    async createBackup() {
        const editorType = document.getElementById('backupEditor').value;
        const backupName = document.getElementById('backupName').value.trim();
        
        if (!editorType) return;

        this.showLoading('createBackupBtn', true);
        this.addLog(`正在创建 ${editorType} 的备份...`, 'info');

        try {
            const result = await ipcRenderer.invoke('create-backup', editorType, backupName || null);
            
            if (result.success) {
                this.addLog(`备份创建成功: ${result.backupId}`, 'success');
                document.getElementById('backupName').value = '';
                await this.loadBackups();
            } else {
                this.addLog('备份创建失败', 'error');
            }
        } catch (error) {
            this.addLog(`创建备份失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('createBackupBtn', false);
        }
    }

    async loadBackups() {
        this.showLoading('refreshBackupsBtn', true);
        this.addLog('正在加载备份列表...', 'info');

        try {
            this.backups = await ipcRenderer.invoke('list-backups');
            this.renderBackupList();
            this.addLog(`加载到 ${this.backups.length} 个备份`, 'success');
        } catch (error) {
            this.addLog(`加载备份失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('refreshBackupsBtn', false);
        }
    }

    renderBackupList() {
        const container = document.getElementById('backupList');
        
        // 使用DocumentFragment减少重绘
        const fragment = document.createDocumentFragment();

        if (this.backups.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #6c757d;">暂无备份</p>';
            return;
        }

        // 批量创建DOM元素
        this.backups.forEach(backup => {
            const item = document.createElement('div');
            item.className = 'backup-item';
            
            const createdDate = new Date(backup.createdAt).toLocaleString('zh-CN');
            const sizeKB = Math.round(backup.size / 1024);
            
            item.innerHTML = `
                <div class="backup-info">
                    <div class="backup-name">${backup.id}</div>
                    <div class="backup-details">编辑器: ${backup.editorType || '未知'}</div>
                    <div class="backup-details">创建时间: ${createdDate}</div>
                    <div class="backup-details">大小: ${sizeKB} KB | 类型: ${backup.type}</div>
                    ${backup.configCount ? `<div class="backup-details">配置项: ${backup.configCount} | 插件: ${backup.extensionCount}</div>` : ''}
                </div>
                <div class="backup-actions">
                    <button class="btn btn-small btn-success" onclick="app.restoreBackup('${backup.id}')">
                        恢复
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="app.exportBackup('${backup.id}')">
                        导出
                    </button>
                    <button class="btn btn-small" style="background: #dc3545; color: white;" onclick="app.deleteBackup('${backup.id}')">
                        删除
                    </button>
                </div>
            `;

            fragment.appendChild(item);
        });
        
        // 一次性更新DOM
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    async restoreBackup(backupId) {
        const targetEditor = document.getElementById('backupEditor').value;
        
        if (!targetEditor) {
            this.addLog('请先选择目标编辑器', 'warning');
            return;
        }

        if (!confirm(`确定要将备份 "${backupId}" 恢复到 ${targetEditor} 吗？这将覆盖现有配置。`)) {
            return;
        }

        try {
            this.addLog(`正在恢复备份: ${backupId}`, 'info');
            
            const result = await ipcRenderer.invoke('restore-backup', backupId, targetEditor);
            
            if (result.success) {
                this.addLog(`备份恢复成功: ${backupId} -> ${targetEditor}`, 'success');
                if (result.extensionsRestored) {
                    this.addLog(`插件恢复: ${result.extensionsRestored.success}/${result.extensionsRestored.total} 成功`, 'info');
                }
            } else {
                this.addLog(`备份恢复失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`恢复备份失败: ${error.message}`, 'error');
        }
    }

    async exportBackup(backupId) {
        try {
            this.addLog(`正在导出备份: ${backupId}`, 'info');
            
            const result = await ipcRenderer.invoke('export-backup', backupId);
            
            if (result.canceled) return;
            
            if (result.success) {
                this.addLog(`备份导出成功: ${result.exportPath}`, 'success');
            } else {
                this.addLog('备份导出失败', 'error');
            }
        } catch (error) {
            this.addLog(`导出备份失败: ${error.message}`, 'error');
        }
    }

    async deleteBackup(backupId) {
        if (!confirm(`确定要删除备份 "${backupId}" 吗？此操作不可撤销。`)) {
            return;
        }

        try {
            this.addLog(`正在删除备份: ${backupId}`, 'info');
            
            const result = await ipcRenderer.invoke('delete-backup', backupId);
            
            if (result.success) {
                this.addLog(`备份删除成功: ${backupId}`, 'success');
                await this.loadBackups();
            } else {
                this.addLog('备份删除失败', 'error');
            }
        } catch (error) {
            this.addLog(`删除备份失败: ${error.message}`, 'error');
        }
    }

    showLoading(buttonId, show) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        if (show) {
            button.disabled = true;
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }
            button.innerHTML = '<span class="loading"></span>处理中...';
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    addLog(message, type = 'info') {
        const container = document.getElementById('logContainer');
        if (!container) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${message}`;
        
        container.appendChild(entry);
        
        // 限制日志条数，避免DOM过多
        const entries = container.children;
        if (entries.length > 100) {
            container.removeChild(entries[0]);
        }
        
        // 防抖滚动到底部
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        this.scrollTimeout = setTimeout(() => {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }, 50);
    }

    clearLog() {
        const container = document.getElementById('logContainer');
        container.innerHTML = '';
        this.addLog('日志已清空', 'info');
    }

    async importConfigFromBackup() {
        try {
            const targetEditor = document.getElementById('sourceEditor').value;
            if (!targetEditor) {
                this.addLog('请先选择目标编辑器', 'warning');
                return;
            }

            // 选择备份文件
            const result = await ipcRenderer.invoke('select-backup-file');
            if (result.canceled || result.filePaths.length === 0) return;

            const backupFilePath = result.filePaths[0];
            this.showLoading('importConfigFromBackupBtn', true);
            this.addLog(`正在从备份文件导入配置...`, 'info');

            // 从备份文件中提取配置数据
            const extractResult = await ipcRenderer.invoke('extract-config-from-backup-file', backupFilePath);
            if (!extractResult.success) {
                throw new Error(extractResult.error);
            }

            // 导入配置
            const importResult = await ipcRenderer.invoke('import-config', null, targetEditor, extractResult.config);
            
            if (importResult.success) {
                this.addLog('从备份文件导入配置成功', 'success');
            } else {
                this.addLog(`从备份文件导入配置失败: ${importResult.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`从备份文件导入配置失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('importConfigFromBackupBtn', false);
        }
    }

    async importExtensionsFromBackup() {
        try {
            const targetEditor = document.getElementById('extensionEditor').value;
            if (!targetEditor) {
                this.addLog('请先选择目标编辑器', 'warning');
                return;
            }

            // 选择备份文件
            const result = await ipcRenderer.invoke('select-backup-file');
            if (result.canceled || result.filePaths.length === 0) return;

            const backupFilePath = result.filePaths[0];
            this.showLoading('importExtensionsFromBackupBtn', true);
            this.addLog(`正在从备份文件导入插件...`, 'info');

            // 从备份文件中提取插件数据
            const extractResult = await ipcRenderer.invoke('extract-extensions-from-backup-file', backupFilePath);
            if (!extractResult.success) {
                throw new Error(extractResult.error);
            }

            // 导入插件
            const importResult = await ipcRenderer.invoke('import-extensions', null, targetEditor, extractResult.extensions);
            
            if (importResult.success) {
                this.addLog(`从备份文件导入插件成功，成功: ${importResult.results.success.length}，失败: ${importResult.results.failed.length}`, 'success');
                if (importResult.results.failed.length > 0) {
                    importResult.results.failed.forEach(failed => {
                        this.addLog(`插件安装失败: ${failed.extension} - ${failed.error}`, 'warning');
                    });
                }
            } else {
                this.addLog(`从备份文件导入插件失败: ${importResult.error}`, 'error');
            }
            
            // 重新加载插件列表
            await this.loadExtensions();
        } catch (error) {
            this.addLog(`从备份文件导入插件失败: ${error.message}`, 'error');
        } finally {
            this.showLoading('importExtensionsFromBackupBtn', false);
        }
    }

    async showBackupSelectionDialog(backups, title) {
        return new Promise((resolve) => {
            // 创建模态对话框
            const modal = document.createElement('div');
            modal.className = 'backup-selection-modal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>${title}</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="backup-selection-list">
                                ${backups.map(backup => `
                                    <div class="backup-selection-item" data-backup-id="${backup.id}">
                                        <div class="backup-info">
                                            <div class="backup-name">${backup.id}</div>
                                            <div class="backup-details">
                                                编辑器: ${backup.editorType || '未知'} | 
                                                创建时间: ${new Date(backup.createdAt).toLocaleString('zh-CN')}
                                            </div>
                                            ${backup.configCount ? `<div class="backup-details">配置项: ${backup.configCount} | 插件: ${backup.extensionCount}</div>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary modal-cancel">取消</button>
                            <button class="btn btn-primary modal-confirm" disabled>确定</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            let selectedBackupId = null;

            // 绑定事件
            const items = modal.querySelectorAll('.backup-selection-item');
            const confirmBtn = modal.querySelector('.modal-confirm');
            
            items.forEach(item => {
                item.addEventListener('click', () => {
                    items.forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    selectedBackupId = item.dataset.backupId;
                    confirmBtn.disabled = false;
                });
            });

            modal.querySelector('.modal-close').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });

            modal.querySelector('.modal-cancel').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });

            modal.querySelector('.modal-confirm').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(selectedBackupId);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal.querySelector('.modal-overlay')) {
                    document.body.removeChild(modal);
                    resolve(null);
                }
            });
        });
    }
}

// 初始化应用
const app = new VSCodeConfigMigrator();

// 全局主题切换函数
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    app.setTheme(newTheme);
}
