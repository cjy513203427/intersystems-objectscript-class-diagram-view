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
    private _viewState: { scrollX: number; scrollY: number; scale: number } = {
        scrollX: 0,
        scrollY: 0,
        scale: 1
    };

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
     * Opens the class file in the editor.
     * First tries to find the file using the full namespace path,
     * then falls back to searching by class name only.
     */
    private async openClass(className: string) {
        try {
            // 1. First try: exact path with namespace structure
            const classPath = className.replace(/\./g, path.sep);
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(this._baseDir, `**/${classPath}.cls`)
            );

            if (files.length > 0) {
                // Ensure exact match by checking the full path
                const exactMatch = files.find(file => {
                    const normalizedPath = file.fsPath.replace(/\\/g, '/').toLowerCase();
                    const normalizedClass = classPath.replace(/\\/g, '/').toLowerCase();
                    return normalizedPath.endsWith(`/${normalizedClass}.cls`);
                });

                if (exactMatch) {
                    const document = await vscode.workspace.openTextDocument(exactMatch);
                    await vscode.window.showTextDocument(document);
                    return;
                }
            }

            // 2. Second try: search in parent directories
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(this._baseDir));
            if (workspaceFolder) {
                const filesInWorkspace = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(workspaceFolder, `**/${classPath}.cls`)
                );

                // Ensure exact match by checking the full path
                const exactMatch = filesInWorkspace.find(file => {
                    const normalizedPath = file.fsPath.replace(/\\/g, '/').toLowerCase();
                    const normalizedClass = classPath.replace(/\\/g, '/').toLowerCase();
                    return normalizedPath.endsWith(`/${normalizedClass}.cls`);
                });

                if (exactMatch) {
                    const document = await vscode.workspace.openTextDocument(exactMatch);
                    await vscode.window.showTextDocument(document);
                    return;
                }
            }

            // 3. Third try: search by simple class name
            const simpleClassName = className.split('.').pop() || className;
            const filesByName = await vscode.workspace.findFiles(
                new vscode.RelativePattern(workspaceFolder || this._baseDir, `**/${simpleClassName}.cls`)
            );

            if (filesByName.length > 0) {
                // Only consider exact matches for the simple class name
                const exactMatches = filesByName.filter(file => {
                    const fileName = path.basename(file.fsPath, '.cls');
                    return fileName.toLowerCase() === simpleClassName.toLowerCase();
                });

                // Among exact matches, prefer the one with matching namespace structure
                const bestMatch = exactMatches.find(file => {
                    const normalizedPath = file.fsPath.replace(/\\/g, '/').toLowerCase();
                    const normalizedClass = className.toLowerCase().replace(/\./g, '/');
                    return normalizedPath.includes(normalizedClass);
                });

                if (bestMatch) {
                    const document = await vscode.workspace.openTextDocument(bestMatch);
                    await vscode.window.showTextDocument(document);
                    return;
                }
            }

            // If still not found, show error message with search paths
            vscode.window.showWarningMessage(
                `Class file not found: ${className}.cls\nSearched paths:\n` +
                `1. ${this._baseDir}/**/${classPath}.cls\n` +
                `2. ${workspaceFolder?.uri.fsPath || ''}/**/${classPath}.cls\n` +
                `3. **/${simpleClassName}.cls`
            );
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open class: ${err}`);
        }
    }

    /**
     * Creates and shows a new class diagram panel, or reveals an existing one.
     * If a panel already exists, it will be disposed and a new one will be created.
     */
    public static createOrShow(extensionPath: string, svgPath: string, baseDir: string, title: string = 'Class Diagram') {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ClassDiagramPanel.currentPanel) {
            ClassDiagramPanel.currentPanel.dispose();
        }

        const panel = vscode.window.createWebviewPanel(
            'classDiagram',
            title,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
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
                    let currentScale = ${this._viewState.scale};
                    const ZOOM_STEP = 0.1;
                    const MIN_SCALE = 0.1;
                    const MAX_SCALE = 5;
                    
                    // Restore scroll position
                    diagram.scrollLeft = ${this._viewState.scrollX};
                    diagram.scrollTop = ${this._viewState.scrollY};
                    
                    // Update zoom display
                    updateZoom();

                    // Save view state periodically
                    function saveViewState() {
                        vscode.postMessage({
                            command: 'saveViewState',
                            scrollX: diagram.scrollLeft,
                            scrollY: diagram.scrollTop,
                            scale: currentScale
                        });
                    }

                    // Add scroll event listener
                    diagram.addEventListener('scroll', () => {
                        saveViewState();
                    });

                    // Initialize SVG interaction
                    function initializeSvgInteraction() {
                        const svg = container.querySelector('svg');
                        if (!svg) return;

                        // Handle text elements (class names)
                        svg.querySelectorAll('text').forEach(text => {
                            const content = text.textContent?.trim();
                            if (content && !content.startsWith('+')) { // Skip method and attribute names
                                text.style.cursor = 'pointer';
                                text.addEventListener('click', () => {
                                    // Save state before navigation
                                    saveViewState();
                                    console.log('Clicked class:', content);
                                    vscode.postMessage({
                                        command: 'openClass',
                                        className: content
                                    });
                                });
                            }
                        });

                        // Handle class rectangles
                        svg.querySelectorAll('g[id^="elem_"] rect').forEach(rect => {
                            const g = rect.parentElement;
                            if (g) {
                                const text = g.querySelector('text');
                                if (text && !text.textContent?.startsWith('+')) {
                                    const className = text.textContent?.trim();
                                    g.style.cursor = 'pointer';
                                    g.addEventListener('click', () => {
                                        // Save state before navigation
                                        saveViewState();
                                        console.log('Clicked class container:', className);
                                        vscode.postMessage({
                                            command: 'openClass',
                                            className: className
                                        });
                                    });
                                }
                            }
                        });
                    }

                    // Initialize interaction
                    initializeSvgInteraction();
                    
                    // Zoom functions
                    window.zoomIn = () => {
                        if (currentScale < MAX_SCALE) {
                            currentScale = Math.min(currentScale + ZOOM_STEP, MAX_SCALE);
                            updateZoom();
                            saveViewState();
                        }
                    };
                    
                    window.zoomOut = () => {
                        if (currentScale > MIN_SCALE) {
                            currentScale = Math.max(currentScale - ZOOM_STEP, MIN_SCALE);
                            updateZoom();
                            saveViewState();
                        }
                    };
                    
                    window.resetZoom = () => {
                        currentScale = 1;
                        updateZoom();
                        saveViewState();
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