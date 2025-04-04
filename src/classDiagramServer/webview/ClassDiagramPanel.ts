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
    // IRIS server configuration
    private readonly _irisServer: {
        host: string;
        port: string;
        namespace: string;
    };

    /**
     * Private constructor, use createOrShow to create instances
     * @param panel WebviewPanel to use
     * @param extensionPath Path to extension
     */
    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        // Get IRIS server configuration from settings
        const config = vscode.workspace.getConfiguration('intersystems-objectscript-class-diagram-view.server');
        this._irisServer = {
            host: config.get('host') || 'localhost',
            port: config.get('port') || '52773',
            namespace: config.get('namespace') || 'USER'
        };
        
        console.log('IRIS Server configuration:', this._irisServer);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                console.log('Received message:', message);
                switch (message.command) {
                    case 'openClass':
                        console.log('Opening class:', message.className);
                        await this.openClassInIRIS(message.className);
                        break;
                    case 'openMethod':
                        console.log('Opening method:', message.methodName, 'in class:', message.className);
                        await this.openMethodInIRIS(message.className, message.methodName);
                        break;
                    case 'openProperty':
                        console.log('Opening property:', message.propertyName, 'in class:', message.className);
                        await this.openPropertyInIRIS(message.className, message.propertyName);
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
     * Opens a class in the InterSystems IRIS Documatic page
     */
    private async openClassInIRIS(className: string) {
        // Clean up class name (remove quotes if present)
        className = className.replace(/^"/, '').replace(/"$/, '');
        
        // Show a message with class name
        vscode.window.showInformationMessage(`Opening class in IRIS: ${className}`);
        
        try {
            // Use the Documatic URL which is more reliable for browsing class definitions
            const irisUrl = `http://${this._irisServer.host}:${this._irisServer.port}/csp/documatic/%25CSP.Documatic.cls?LIBRARY=${this._irisServer.namespace}&CLASSNAME=${encodeURIComponent(className)}`;
            
            console.log('Opening URL:', irisUrl);
            vscode.env.openExternal(vscode.Uri.parse(irisUrl));
        } catch (error) {
            console.error('Error opening class in browser:', error);
            vscode.window.showErrorMessage(`Error opening class ${className} in browser: ${error}`);
        }
    }

    /**
     * Opens a method in InterSystems IRIS Documatic
     * @param className Class containing the method
     * @param methodName Method to open
     */
    private async openMethodInIRIS(className: string, methodName: string) {
        // Clean up class name and method name
        className = className.replace(/^"/, '').replace(/"$/, '');
        
        // Show message
        vscode.window.showInformationMessage(`Opening method ${methodName} in class ${className}`);
        
        try {
            // For methods, we can link directly to the class and let the user find the method
            // Most Documatic implementations don't support direct method linking
            const irisUrl = `http://${this._irisServer.host}:${this._irisServer.port}/csp/documatic/%25CSP.Documatic.cls?LIBRARY=${this._irisServer.namespace}&CLASSNAME=${encodeURIComponent(className)}`;
            
            console.log('Opening URL for method:', irisUrl);
            vscode.env.openExternal(vscode.Uri.parse(irisUrl));
        } catch (error) {
            console.error('Error opening method in browser:', error);
            vscode.window.showErrorMessage(`Error opening method ${methodName} in class ${className}: ${error}`);
        }
    }

    /**
     * Opens a property in InterSystems IRIS Documatic
     * @param className Class containing the property
     * @param propertyName Property to open
     */
    private async openPropertyInIRIS(className: string, propertyName: string) {
        // Clean up class name and property name
        className = className.replace(/^"/, '').replace(/"$/, '');
        
        // Show message
        vscode.window.showInformationMessage(`Opening property ${propertyName} in class ${className}`);
        
        try {
            // For properties, we can link directly to the class and let the user find the property
            // Most Documatic implementations don't support direct property linking
            const irisUrl = `http://${this._irisServer.host}:${this._irisServer.port}/csp/documatic/%25CSP.Documatic.cls?LIBRARY=${this._irisServer.namespace}&CLASSNAME=${encodeURIComponent(className)}`;
            
            console.log('Opening URL for property:', irisUrl);
            vscode.env.openExternal(vscode.Uri.parse(irisUrl));
        } catch (error) {
            console.error('Error opening property in browser:', error);
            vscode.window.showErrorMessage(`Error opening property ${propertyName} in class ${className}: ${error}`);
        }
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
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
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

                    // Initialize SVG interaction
                    function initializeSvgInteraction() {
                        const svg = container.querySelector('svg');
                        if (!svg) {
                            console.error('SVG not found in container');
                            return;
                        }

                        // Helper function to find the parent class name of a property/method
                        function findParentClassName(element) {
                            let current = element.closest('g');
                            while (current && !current.matches('svg')) {
                                const texts = Array.from(current.querySelectorAll('text'));
                                // Find the first text that looks like a class name
                                const classText = texts.find(t => {
                                    const content = t.textContent?.trim();
                                    return content && !content.includes(':') && !content.includes('(') && !content.startsWith('+');
                                });
                                
                                if (classText) {
                                    const className = classText.textContent.trim();
                                    console.log('Found parent class:', className);
                                    return className;
                                }
                                current = current.parentElement;
                            }
                            console.log('No parent class found');
                            return null;
                        }

                        // Handle text elements (class names, properties, methods)
                        svg.querySelectorAll('text').forEach(text => {
                            const content = text.textContent?.trim();
                            if (!content) return;

                            console.log('Processing text element:', content);
                            
                            // Fix method detection
                            const isMethod = content.includes('(') && content.includes(')');
                            
                            // Fix property detection
                            const isProperty = content.includes(':') && !isMethod;

                            console.log('Is property?', isProperty);
                            console.log('Is method?', isMethod);

                            if (!isProperty && !isMethod) {
                                // This is a class name - handle both quoted and unquoted cases
                                let className = content;
                                
                                // If there are quotes, remove them
                                if (content.startsWith('"') && content.endsWith('"')) {
                                    className = content.substring(1, content.length - 1);
                                }
                                
                                console.log('Setting up click handler for class:', className);
                                text.style.cursor = 'pointer';
                                text.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    console.log('Class clicked:', className);
                                    vscode.postMessage({
                                        command: 'openClass',
                                        className: className
                                    });
                                });
                            } else if (isMethod) {
                                // This is a method
                                console.log('Processing method:', content);
                                const parentClass = findParentClassName(text);
                                if (parentClass) {
                                    // Simple extraction - get everything before the opening parenthesis
                                    const methodName = content.split('(')[0].trim();
                                    console.log('Setting up click handler for method:', methodName);
                                    text.style.cursor = 'pointer';
                                    text.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        console.log('Method clicked:', methodName, 'in class:', parentClass);
                                        vscode.postMessage({
                                            command: 'openMethod',
                                            className: parentClass,
                                            methodName: methodName
                                        });
                                    });
                                }
                            } else if (isProperty) {
                                // This is a property
                                console.log('Processing property:', content);
                                const parentClass = findParentClassName(text);
                                if (parentClass) {
                                    // Simple extraction - get everything before the colon
                                    const propertyName = content.split(':')[0].trim();
                                    console.log('Setting up click handler for property:', propertyName);
                                    text.style.cursor = 'pointer';
                                    text.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        console.log('Property clicked:', propertyName, 'in class:', parentClass);
                                        vscode.postMessage({
                                            command: 'openProperty',
                                            className: parentClass,
                                            propertyName: propertyName
                                        });
                                    });
                                }
                            }
                        });

                        // Disable pointer events on rectangles to make text clicking easier
                        svg.querySelectorAll('rect').forEach(rect => {
                            rect.style.pointerEvents = 'none';
                        });
                    }

                    // Initialize interaction
                    console.log('Initializing SVG interaction');
                    initializeSvgInteraction();
                    
                    // Apply initial zoom
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
     * Cleans up resources used by this panel
     */
    public dispose() {
        ClassDiagramPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
} 