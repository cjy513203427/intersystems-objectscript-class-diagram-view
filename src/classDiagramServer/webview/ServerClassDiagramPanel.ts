import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ServerClassService } from '../service/serverClassService';

/**
 * 服务器端类图面板，用于在WebView中显示类图
 * 支持交互功能，如缩放和点击类导航到其定义
 */
export class ServerClassDiagramPanel {
    public static currentPanel: ServerClassDiagramPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private readonly _classService: ServerClassService;
    private _disposables: vscode.Disposable[] = [];
    private _viewState: { scrollX: number; scrollY: number; scale: number } = {
        scrollX: 0,
        scrollY: 0,
        scale: 1
    };

    private constructor(panel: vscode.WebviewPanel, extensionPath: string, classService: ServerClassService) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._classService = classService;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                console.log('Received message:', message);
                switch (message.command) {
                    case 'openClass':
                        console.log('Opening class:', message.className);
                        await this.openClass(message.className);
                        break;
                    case 'openProperty':
                        console.log('Opening attribute:', message.propertyName, 'in class:', message.className);
                        await this.openAttribute(message.className, message.propertyName);
                        break;
                    case 'openMethod':
                        console.log('Opening method:', message.methodName, 'in class:', message.className);
                        await this.openMethod(message.className, message.methodName);
                        break;
                    case 'saveViewState':
                        this._viewState = {
                            scrollX: message.scrollX,
                            scrollY: message.scrollY,
                            scale: message.scale
                        };
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * 创建或显示类图面板
     */
    public static createOrShow(extensionPath: string, svgFilePath: string, classService: ServerClassService, title: string = 'Class Diagram'): ServerClassDiagramPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 如果已经有面板，则显示它
        if (ServerClassDiagramPanel.currentPanel) {
            ServerClassDiagramPanel.currentPanel._panel.reveal(column);
            return ServerClassDiagramPanel.currentPanel;
        }

        // 否则，创建一个新面板
        const panel = vscode.window.createWebviewPanel(
            'classDiagramServer',
            title,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(extensionPath, 'media')),
                    vscode.Uri.file(path.dirname(svgFilePath))
                ]
            }
        );

        ServerClassDiagramPanel.currentPanel = new ServerClassDiagramPanel(panel, extensionPath, classService);
        ServerClassDiagramPanel.currentPanel.updateContent(svgFilePath);

        return ServerClassDiagramPanel.currentPanel;
    }

    /**
     * 更新面板内容
     */
    private updateContent(svgFilePath: string): void {
        const webview = this._panel.webview;
        
        // 读取SVG文件内容
        const svgContent = fs.readFileSync(svgFilePath, 'utf8');
        
        // 创建WebView内容
        this._panel.webview.html = this.getHtmlForWebview(webview, svgContent);
    }

    /**
     * 获取WebView的HTML内容
     */
    private getHtmlForWebview(webview: vscode.Webview, svgContent: string): string {
        // 提取SVG内容，移除XML声明
        const svgBody = svgContent.replace(/<\?xml[^>]*\?>/, '');
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Class Diagram</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .toolbar {
            padding: 8px;
            background-color: #f3f3f3;
            border-bottom: 1px solid #ddd;
            display: flex;
            align-items: center;
        }
        .toolbar button {
            margin-right: 8px;
            padding: 4px 8px;
            background-color: #007acc;
            color: white;
            border: none;
            border-radius: 2px;
            cursor: pointer;
        }
        .toolbar button:hover {
            background-color: #005999;
        }
        .toolbar .scale-display {
            margin-left: auto;
            font-family: monospace;
        }
        .diagram-container {
            flex: 1;
            overflow: auto;
            position: relative;
        }
        #diagram {
            position: absolute;
            transform-origin: 0 0;
            cursor: grab;
        }
        #diagram:active {
            cursor: grabbing;
        }
        .class-box {
            cursor: pointer;
        }
        .class-box:hover {
            filter: drop-shadow(0 0 5px rgba(0, 122, 204, 0.7));
        }
        .method, .attribute {
            cursor: pointer;
        }
        .method:hover, .attribute:hover {
            fill: #007acc;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button id="zoomIn">Zoom In</button>
        <button id="zoomOut">Zoom Out</button>
        <button id="resetView">Reset View</button>
        <span class="scale-display" id="scaleDisplay">100%</span>
    </div>
    <div class="diagram-container" id="diagramContainer">
        <div id="diagram">
            ${svgBody}
        </div>
    </div>
    <script>
        (function() {
            // 初始化变量
            const diagram = document.getElementById('diagram');
            const container = document.getElementById('diagramContainer');
            const zoomInBtn = document.getElementById('zoomIn');
            const zoomOutBtn = document.getElementById('zoomOut');
            const resetViewBtn = document.getElementById('resetView');
            const scaleDisplay = document.getElementById('scaleDisplay');
            
            let scale = ${this._viewState.scale};
            let offsetX = ${this._viewState.scrollX};
            let offsetY = ${this._viewState.scrollY};
            let isDragging = false;
            let startX, startY;
            
            // 应用初始变换
            updateTransform();
            
            // 添加事件监听器
            zoomInBtn.addEventListener('click', () => {
                scale *= 1.2;
                updateTransform();
            });
            
            zoomOutBtn.addEventListener('click', () => {
                scale /= 1.2;
                updateTransform();
            });
            
            resetViewBtn.addEventListener('click', () => {
                scale = 1;
                offsetX = 0;
                offsetY = 0;
                updateTransform();
            });
            
            container.addEventListener('mousedown', (e) => {
                if (e.target.closest('text') || e.target.closest('a')) return;
                isDragging = true;
                startX = e.clientX - offsetX;
                startY = e.clientY - offsetY;
                diagram.style.cursor = 'grabbing';
            });
            
            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                offsetX = e.clientX - startX;
                offsetY = e.clientY - startY;
                updateTransform();
            });
            
            window.addEventListener('mouseup', () => {
                isDragging = false;
                diagram.style.cursor = 'grab';
            });
            
            container.addEventListener('wheel', (e) => {
                e.preventDefault();
                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // 计算鼠标在缩放前的图表坐标
                const beforeX = (mouseX - offsetX) / scale;
                const beforeY = (mouseY - offsetY) / scale;
                
                // 缩放
                if (e.deltaY < 0) {
                    scale *= 1.1;
                } else {
                    scale /= 1.1;
                }
                
                // 计算鼠标在缩放后的图表坐标
                const afterX = (mouseX - offsetX) / scale;
                const afterY = (mouseY - offsetY) / scale;
                
                // 调整偏移量，使鼠标位置保持不变
                offsetX += (afterX - beforeX) * scale;
                offsetY += (afterY - beforeY) * scale;
                
                updateTransform();
            });
            
            // 处理类点击事件
            document.querySelectorAll('g[id^="elem_"]').forEach(classElement => {
                classElement.addEventListener('click', (e) => {
                    // 检查是否点击了类名文本
                    const titleElement = classElement.querySelector('text.classname');
                    if (titleElement && (e.target === titleElement || titleElement.contains(e.target))) {
                        const className = titleElement.textContent.trim().replace(/"/g, '');
                        vscode.postMessage({
                            command: 'openClass',
                            className: className
                        });
                    }
                });
            });
            
            // 处理属性点击事件
            document.querySelectorAll('text.attribute').forEach(attrElement => {
                attrElement.addEventListener('click', (e) => {
                    const attrText = attrElement.textContent.trim();
                    const match = attrText.match(/\+ ([^:]+):/);
                    if (match) {
                        const propertyName = match[1].trim();
                        const classElement = attrElement.closest('g[id^="elem_"]');
                        if (classElement) {
                            const titleElement = classElement.querySelector('text.classname');
                            if (titleElement) {
                                const className = titleElement.textContent.trim().replace(/"/g, '');
                                vscode.postMessage({
                                    command: 'openProperty',
                                    className: className,
                                    propertyName: propertyName
                                });
                            }
                        }
                    }
                });
            });
            
            // 处理方法点击事件
            document.querySelectorAll('text.method').forEach(methodElement => {
                methodElement.addEventListener('click', (e) => {
                    const methodText = methodElement.textContent.trim();
                    const match = methodText.match(/\+ ([^(]+)\(/);
                    if (match) {
                        const methodName = match[1].trim();
                        const classElement = methodElement.closest('g[id^="elem_"]');
                        if (classElement) {
                            const titleElement = classElement.querySelector('text.classname');
                            if (titleElement) {
                                const className = titleElement.textContent.trim().replace(/"/g, '');
                                vscode.postMessage({
                                    command: 'openMethod',
                                    className: className,
                                    methodName: methodName
                                });
                            }
                        }
                    }
                });
            });
            
            // 更新变换
            function updateTransform() {
                diagram.style.transform = \`translate(\${offsetX}px, \${offsetY}px) scale(\${scale})\`;
                scaleDisplay.textContent = \`\${Math.round(scale * 100)}%\`;
                
                // 保存视图状态
                vscode.postMessage({
                    command: 'saveViewState',
                    scrollX: offsetX,
                    scrollY: offsetY,
                    scale: scale
                });
            }
            
            // 添加VSCode API
            const vscode = acquireVsCodeApi();
            
            // 初始化SVG
            const svg = document.querySelector('svg');
            if (svg) {
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                
                // 添加类名和方法/属性的样式类
                svg.querySelectorAll('g[id^="elem_"] > text:first-of-type').forEach(text => {
                    text.classList.add('classname');
                });
                
                svg.querySelectorAll('g[id^="elem_"] > g > text').forEach(text => {
                    const content = text.textContent.trim();
                    if (content.includes('(')) {
                        text.classList.add('method');
                    } else {
                        text.classList.add('attribute');
                    }
                });
            }
        })();
    </script>
</body>
</html>`;
    }

    /**
     * 打开类定义
     */
    private async openClass(className: string): Promise<void> {
        try {
            // 获取ObjectScript扩展的API
            const objectScriptExtension = vscode.extensions.getExtension('intersystems-community.vscode-objectscript');
            if (!objectScriptExtension) {
                vscode.window.showErrorMessage('InterSystems ObjectScript extension is not installed');
                return;
            }

            if (!objectScriptExtension.isActive) {
                await objectScriptExtension.activate();
            }

            const api = objectScriptExtension.exports;
            
            // 使用ObjectScript扩展的API打开类
            await api.serverActions.openClass(className);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open class: ${err}`);
        }
    }

    /**
     * 打开属性定义
     */
    private async openAttribute(className: string, propertyName: string): Promise<void> {
        try {
            // 获取ObjectScript扩展的API
            const objectScriptExtension = vscode.extensions.getExtension('intersystems.objectscript');
            if (!objectScriptExtension) {
                vscode.window.showErrorMessage('InterSystems ObjectScript extension is not installed');
                return;
            }

            if (!objectScriptExtension.isActive) {
                await objectScriptExtension.activate();
            }

            const api = objectScriptExtension.exports;
            
            // 使用ObjectScript扩展的API打开类
            await api.serverActions.openClassMember(className, propertyName, 'property');
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open property: ${err}`);
        }
    }

    /**
     * 打开方法定义
     */
    private async openMethod(className: string, methodName: string): Promise<void> {
        try {
            // 获取ObjectScript扩展的API
            const objectScriptExtension = vscode.extensions.getExtension('intersystems.objectscript');
            if (!objectScriptExtension) {
                vscode.window.showErrorMessage('InterSystems ObjectScript extension is not installed');
                return;
            }

            if (!objectScriptExtension.isActive) {
                await objectScriptExtension.activate();
            }

            const api = objectScriptExtension.exports;
            
            // 使用ObjectScript扩展的API打开类
            await api.serverActions.openClassMember(className, methodName, 'method');
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open method: ${err}`);
        }
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        ServerClassDiagramPanel.currentPanel = undefined;
        
        this._panel.dispose();
        
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
} 