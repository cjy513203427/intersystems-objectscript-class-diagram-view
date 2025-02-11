import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ClassDiagramPanel {
    public static currentPanel: ClassDiagramPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'openClass':
                        const uri = vscode.Uri.file(message.filePath);
                        const document = await vscode.workspace.openTextDocument(uri);
                        await vscode.window.showTextDocument(document);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionPath: string, svgPath: string) {
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

        ClassDiagramPanel.currentPanel = new ClassDiagramPanel(panel, extensionPath);
        ClassDiagramPanel.currentPanel.updateContent(svgPath);
    }

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
                /* Customize scrollbar for better visibility */
                #diagram::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                }
                #diagram::-webkit-scrollbar-track {
                    background: var(--vscode-scrollbarSlider-background);
                    border-radius: 6px;
                }
                #diagram::-webkit-scrollbar-thumb {
                    background: var(--vscode-scrollbarSlider-hoverBackground);
                    border-radius: 6px;
                }
                #diagram::-webkit-scrollbar-thumb:hover {
                    background: var(--vscode-scrollbarSlider-activeBackground);
                }
                .clickable {
                    cursor: pointer;
                }
                .clickable:hover {
                    opacity: 0.8;
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
                    
                    // Class name click handler for navigation
                    document.querySelectorAll('.clickable').forEach(element => {
                        element.addEventListener('click', (e) => {
                            const className = e.target.getAttribute('data-class');
                            if (className) {
                                vscode.postMessage({
                                    command: 'openClass',
                                    className: className
                                });
                            }
                        });
                    });
                })();
            </script>
        </body>
        </html>`;
    }

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