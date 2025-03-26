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
    private _disposables: vscode.Disposable[] = [];
    private _viewState: { scrollX: number; scrollY: number; scale: number } = {
        scrollX: 0,
        scrollY: 0,
        scale: 1
    };

    /**
     * Private constructor, use createOrShow to create instances
     * @param panel WebviewPanel to use
     * @param extensionPath Path to extension
     */
    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                console.log('Received message:', message);
                switch (message.command) {
                    case 'openClass':
                        console.log('Opening class:', message.className);
                        await this.openClassInIRIS(message.className);
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
     * Opens a class in the InterSystems IRIS Management Portal or other appropriate view
     * Since these are server-side classes, we handle differently than local files
     */
    private async openClassInIRIS(className: string) {
        // Show a message with class name
        vscode.window.showInformationMessage(`Opening class in IRIS: ${className}`);
        
        // In the future, this could be enhanced to:
        // 1. Open the class in Management Portal using browser
        // 2. Open the class using a custom viewer within VS Code
        // 3. Fetch class source via REST API and show in editor
    }

    /**
     * Creates and shows a new class diagram panel, or reveals an existing one.
     * If a panel already exists, it will be disposed and a new one will be created.
     */
    public static createOrShow(extensionPath: string, svgPath: string, title: string = 'Class Diagram') {
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

        ClassDiagramPanel.currentPanel = new ClassDiagramPanel(panel, extensionPath);
        ClassDiagramPanel.currentPanel.updateContent(svgPath);
    }

    /**
     * Updates the webview content with the SVG diagram.
     * Reads the SVG file and injects it into the HTML template.
     */
    private async updateContent(svgPath: string) {
        let svgContent = '';
        try {
            svgContent = await fs.promises.readFile(svgPath, 'utf8');
        } catch (error) {
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
                <text x="50%" y="50%" text-anchor="middle" fill="red">Error loading SVG: ${error}</text>
            </svg>`;
            console.error('Error reading SVG file:', error);
        }
        const webviewContent = this.getWebviewContent(svgContent);
        this._panel.webview.html = webviewContent;
    }

    /**
     * Generates the HTML content for the webview
     * @param svgContent SVG content to display
     * @returns HTML for the webview
     */
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
                /* SVG styles */
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

                    // Initialize class interaction
                    initializeClassInteraction();
                    
                    // Apply initial zoom level
                    applyZoom();

                    // Setup global zoom functions
                    window.zoomIn = function() {
                        if (currentScale < MAX_SCALE) {
                            currentScale = Math.min(currentScale + ZOOM_STEP, MAX_SCALE);
                            applyZoom();
                            updateZoom();
                            saveViewState();
                        }
                    };

                    window.zoomOut = function() {
                        if (currentScale > MIN_SCALE) {
                            currentScale = Math.max(currentScale - ZOOM_STEP, MIN_SCALE);
                            applyZoom();
                            updateZoom();
                            saveViewState();
                        }
                    };

                    window.resetZoom = function() {
                        currentScale = 1;
                        applyZoom();
                        updateZoom();
                        saveViewState();
                    };

                    function applyZoom() {
                        container.style.transform = 'scale(' + currentScale + ')';
                    }

                    function updateZoom() {
                        zoomLevelDisplay.textContent = Math.round(currentScale * 100) + '%';
                    }

                    function initializeClassInteraction() {
                        // Add click handlers for class elements
                        const svg = container.querySelector('svg');
                        if (!svg) {
                            console.error('SVG not found in container');
                            return;
                        }

                        // Process all text elements that contain class names
                        const classTexts = Array.from(svg.querySelectorAll('text'));
                        
                        classTexts.forEach(text => {
                            if (text.textContent && !text.textContent.includes(':') && !text.textContent.includes('(')) {
                                // This might be a class name
                                text.addEventListener('click', function(e) {
                                    const className = text.textContent.trim().replace(/^"/, '').replace(/"$/, '');
                                    console.log('Class clicked:', className);
                                    
                                    // Send message to extension
                                    vscode.postMessage({
                                        command: 'openClass',
                                        className: className
                                    });
                                });
                            }
                        });
                    }
                })();
            </script>
        </body>
        </html>`;
    }

    /**
     * Cleans up resources used by this panel
     */
    public dispose() {
        ClassDiagramPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
} 