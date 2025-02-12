import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * A panel that displays class diagrams in a webview.
 * Supports interactive features like zooming and clicking on classes to navigate to their definitions.
 */
export class ClassDiagramPanel {
    public static currentPanel: ClassDiagramPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private readonly _baseDir: string;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionPath: string, baseDir: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._baseDir = baseDir;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'openClass':
                        await this.openClass(message.className);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Opens the class file in the editor.
     * First tries to find the file using the full namespace path,
     * then falls back to searching by class name only.
     */
    private async openClass(className: string) {
        try {
            // Replace dots in class name with path separators
            const classPath = className.replace(/\./g, path.sep);
            
            // Try to find the file using the full path
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(this._baseDir, `**/${classPath}.cls`)
            );

            if (files.length > 0) {
                const document = await vscode.workspace.openTextDocument(files[0]);
                await vscode.window.showTextDocument(document);
                return;
            }

            // If not found, try searching by class name only
            const simpleClassName = className.split('.').pop() || className;
            const filesByName = await vscode.workspace.findFiles(
                new vscode.RelativePattern(this._baseDir, `**/${simpleClassName}.cls`)
            );

            if (filesByName.length > 0) {
                const document = await vscode.workspace.openTextDocument(filesByName[0]);
                await vscode.window.showTextDocument(document);
                return;
            }

            // If still not found, show error message with search paths
            vscode.window.showWarningMessage(
                `Class file not found: ${className}.cls\nSearched paths:\n` +
                `1. ${classPath}.cls\n` +
                `2. ${simpleClassName}.cls`
            );
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open class: ${err}`);
        }
    }

    /**
     * Creates and shows a new class diagram panel, or reveals an existing one.
     * If a panel already exists, it will be disposed and a new one will be created.
     */
    public static createOrShow(extensionPath: string, svgPath: string, baseDir: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ClassDiagramPanel.currentPanel) {
            ClassDiagramPanel.currentPanel.dispose();
        }

        const panel = vscode.window.createWebviewPanel(
            'classDiagram',
            'Class Diagram',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(extensionPath, 'media')),
                    vscode.Uri.file(path.dirname(svgPath))
                ]
            }
        );

        ClassDiagramPanel.currentPanel = new ClassDiagramPanel(panel, extensionPath, baseDir);
        ClassDiagramPanel.currentPanel.updateContent(svgPath);
    }

    /**
     * Updates the webview content with the SVG diagram.
     * Reads the SVG file and injects it into the HTML template.
     */
    private async updateContent(svgPath: string) {
        const svgContent = await fs.promises.readFile(svgPath, 'utf8');
        const webviewContent = this.getWebviewContent(svgContent);
        this._panel.webview.html = webviewContent;
    }

    private getWebviewContent(svgContent: string) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Class Diagram</title>
            <style>
                body {
                    margin: 0;
                    padding: 10px;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    overflow: hidden;
                }
                #diagram {
                    width: 100%;
                    height: 100vh;
                    overflow: auto;
                    position: relative;
                }
                #svg-container {
                    transform-origin: 0 0;
                    transition: transform 0.1s ease-out;
                    min-width: min-content;
                    min-height: min-content;
                    padding: 20px;
                }
                #svg-container svg {
                    width: 100%;
                    height: auto;
                }
                .zoom-controls {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    gap: 10px;
                    background: var(--vscode-editor-background);
                    padding: 10px;
                    border-radius: 4px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    z-index: 1000;
                }
                .zoom-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 2px;
                    font-size: 14px;
                }
                .zoom-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .zoom-level {
                    color: var(--vscode-foreground);
                    margin: 0 10px;
                    line-height: 32px;
                }
                /* SVG 样式 */
                #svg-container text {
                    cursor: pointer;
                }
                #svg-container text:hover {
                    fill: var(--vscode-textLink-foreground);
                }
                #svg-container g[id^="elem_"] {
                    cursor: pointer;
                }
                #svg-container g[id^="elem_"]:hover rect {
                    stroke: var(--vscode-textLink-foreground);
                }
            </style>
        </head>
        <body>
            <div id="diagram">
                <div id="svg-container">
                    ${svgContent}
                </div>
            </div>
            <div class="zoom-controls">
                <button class="zoom-btn" onclick="zoomOut()">-</button>
                <span class="zoom-level">100%</span>
                <button class="zoom-btn" onclick="zoomIn()">+</button>
                <button class="zoom-btn" onclick="resetZoom()">Reset</button>
            </div>
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    const container = document.getElementById('svg-container');
                    const diagram = document.getElementById('diagram');
                    const zoomLevelDisplay = document.querySelector('.zoom-level');
                    let currentScale = 1;
                    const ZOOM_STEP = 0.1;
                    const MIN_SCALE = 0.1;
                    const MAX_SCALE = 5;
                    
                    // 初始化 SVG 交互
                    function initializeSvgInteraction() {
                        const svg = container.querySelector('svg');
                        if (!svg) return;

                        // 处理所有文本元素的点击
                        svg.querySelectorAll('text').forEach(text => {
                            const content = text.textContent;
                            if (content && content.includes('class:')) {
                                const className = content.split('class:')[1];
                                text.textContent = className; // 移除 class: 前缀
                                text.addEventListener('click', () => {
                                    console.log('Clicked class:', className);
                                    vscode.postMessage({
                                        command: 'openClass',
                                        className: className
                                    });
                                });
                            }
                        });

                        // 处理所有类矩形的点击
                        svg.querySelectorAll('g[id^="elem_"]').forEach(g => {
                            const text = g.querySelector('text');
                            if (text && text.textContent.includes('class:')) {
                                const className = text.textContent.split('class:')[1];
                                text.textContent = className;
                                g.addEventListener('click', () => {
                                    console.log('Clicked class container:', className);
                                    vscode.postMessage({
                                        command: 'openClass',
                                        className: className
                                    });
                                });
                            }
                        });
                    }

                    // 初始化交互
                    initializeSvgInteraction();
                    
                    // Zoom functions
                    window.zoomIn = () => {
                        if (currentScale < MAX_SCALE) {
                            currentScale = Math.min(currentScale + ZOOM_STEP, MAX_SCALE);
                            updateZoom();
                        }
                    };
                    
                    window.zoomOut = () => {
                        if (currentScale > MIN_SCALE) {
                            currentScale = Math.max(currentScale - ZOOM_STEP, MIN_SCALE);
                            updateZoom();
                        }
                    };
                    
                    window.resetZoom = () => {
                        currentScale = 1;
                        updateZoom();
                    };
                    
                    function updateZoom() {
                        container.style.transform = \`scale(\${currentScale})\`;
                        zoomLevelDisplay.textContent = \`\${Math.round(currentScale * 100)}%\`;
                    }
                    
                    // Mouse wheel zoom with Ctrl key
                    diagram.addEventListener('wheel', (e) => {
                        if (e.ctrlKey) {
                            e.preventDefault();
                            if (e.deltaY < 0) {
                                zoomIn();
                            } else {
                                zoomOut();
                            }
                        }
                    });
                })();
            </script>
        </body>
        </html>`;
    }

    /**
     * Cleans up resources when the panel is closed.
     */
    public dispose() {
        ClassDiagramPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
} 