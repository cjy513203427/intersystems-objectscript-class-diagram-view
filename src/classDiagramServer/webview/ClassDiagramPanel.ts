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
                        if (!message.className || message.className === message.methodName) {
                            console.error('Invalid class name for method! Using methodName as className:', message.methodName);
                            vscode.window.showErrorMessage(`无法确定方法 ${message.methodName} 所属的类，请查看控制台日志`);
                        } else {
                            await this.openMethodInIRIS(message.className, message.methodName);
                        }
                        break;
                    case 'openProperty':
                        console.log('Opening property:', message.propertyName, 'in class:', message.className);
                        await this.openPropertyInIRIS(message.className, message.propertyName);
                        break;
                    case 'openParameter':
                        console.log('Opening parameter:', message.parameterName, 'in class:', message.className);
                        await this.openParameterInIRIS(message.className, message.parameterName);
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
     * Opens a parameter in InterSystems IRIS Documatic
     * @param className Class containing the parameter
     * @param parameterName Parameter to open
     */
    private async openParameterInIRIS(className: string, parameterName: string) {
        // Clean up class name and parameter name
        className = className.replace(/^"/, '').replace(/"$/, '');
        
        // Show message
        vscode.window.showInformationMessage(`Opening parameter ${parameterName} in class ${className}`);
        
        try {
            // For parameters, we link directly to the class just like properties
            const irisUrl = `http://${this._irisServer.host}:${this._irisServer.port}/csp/documatic/%25CSP.Documatic.cls?LIBRARY=${this._irisServer.namespace}&CLASSNAME=${encodeURIComponent(className)}`;
            
            console.log('Opening URL for parameter:', irisUrl);
            vscode.env.openExternal(vscode.Uri.parse(irisUrl));
        } catch (error) {
            console.error('Error opening parameter in browser:', error);
            vscode.window.showErrorMessage(`Error opening parameter ${parameterName} in class ${className}: ${error}`);
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
                            console.log('Finding parent class for element:', element.textContent?.trim());
                            let current = element.closest('g');
                            
                            // 遍历所有父级g元素
                            while (current && !current.matches('svg')) {
                                console.log('Checking element group:', current);
                                
                                // 查找所有文本节点
                                const texts = Array.from(current.querySelectorAll('text'));
                                console.log('Found text elements in group:', texts.length);
                                
                                // 尝试找到最顶层的类文本，通常是g元素中的第一个文本元素
                                if (texts.length > 0) {
                                    // 先遍历所有文本，查找明显的类名（带引号的）
                                    for (const t of texts) {
                                        const content = t.textContent?.trim();
                                        // 类名通常以引号包围
                                        if (content && content.startsWith('"') && content.endsWith('"')) {
                                            let className = content.substring(1, content.length - 1);
                                            console.log('Found quoted class name:', className);
                                            return className;
                                        }
                                    }
                                    
                                    // 如果没有找到明确的类名，尝试找包含点号的文本（通常是完整类名）
                                    for (const t of texts) {
                                        const content = t.textContent?.trim();
                                        if (content && content.includes('.') && !content.includes('(') && !content.includes(':')) {
                                            console.log('Found class name with dot:', content);
                                            return content;
                                        }
                                    }
                                    
                                    // 最后一种情况，尝试找第一个不像方法或属性的文本
                                    for (const t of texts) {
                                        const content = t.textContent?.trim();
                                        if (content && !content.includes('(') && !content.includes(':') && !content.startsWith('+')) {
                                            console.log('Found probable class name:', content);
                                            return content;
                                        }
                                    }
                                }
                                
                                // 继续向上查找父元素
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
                            
                            // 识别规则优先级（从高到低检测）
                            
                            // 1. 方法检测 - 包含括号
                            const isMethod = content.includes('(') && content.includes(')');
                            
                            // 2. 属性检测 - 包含冒号并可能带有类型
                            const isProperty = content.includes(':') && !isMethod;
                            
                            // 3. 类名检测 - 用引号包围或包含点号且不是属性或方法
                            const isClassName = !isMethod && !isProperty && (
                                (content.startsWith('"') && content.endsWith('"')) || 
                                (content.includes('.') && !content.includes('+'))
                            );
                            
                            // 4. 参数检测 - 不是上述任何一种
                            const isParameter = !isMethod && !isProperty && !isClassName;

                            console.log('Is method?', isMethod);
                            console.log('Is property?', isProperty);
                            console.log('Is className?', isClassName);
                            console.log('Is parameter?', isParameter);

                            if (isClassName) {
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
                                    // 提取方法名和返回类型 - 格式如"Execute(): %Status"
                                    const methodName = content.split('(')[0].trim();
                                    // 可选：提取返回类型供将来使用
                                    const returnType = content.includes('):') ? content.split('):')[1].trim() : '';
                                    
                                    console.log('Setting up click handler for method:', methodName, 'returnType:', returnType, 'in class:', parentClass);
                                    text.style.cursor = 'pointer';
                                    text.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        console.log('Method clicked:', methodName, 'in class:', parentClass);
                                        // 确保className不为空且不等于methodName
                                        if (parentClass && parentClass !== methodName) {
                                            vscode.postMessage({
                                                command: 'openMethod',
                                                className: parentClass,
                                                methodName: methodName
                                            });
                                        } else {
                                            console.error('Invalid parent class for method:', methodName);
                                            vscode.postMessage({
                                                command: 'openClass',
                                                className: methodName
                                            });
                                        }
                                    });
                                } else {
                                    console.error('Failed to find parent class for method:', content);
                                    // 即使找不到父类，也添加点击处理，直接打开类
                                    text.style.cursor = 'pointer';
                                    const methodName = content.split('(')[0].trim();
                                    text.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        console.log('Method clicked (fallback):', methodName);
                                        vscode.postMessage({
                                            command: 'openClass',
                                            className: methodName
                                        });
                                    });
                                }
                            } else if (isProperty) {
                                // This is a property
                                console.log('Processing property:', content);
                                const parentClass = findParentClassName(text);
                                if (parentClass) {
                                    // 提取属性名和类型 - 格式如"MultiplyDto: EXORPRO.K5.OpenApi.UnitTest.Helper.Dto.MultiplyDto"
                                    const parts = content.split(':');
                                    const propertyName = parts[0].trim();
                                    // 可选：提取类型供将来使用
                                    const propertyType = parts.length > 1 ? parts[1].trim() : '';
                                    
                                    console.log('Setting up click handler for property:', propertyName, 'type:', propertyType);
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
                            } else if (isParameter) {
                                // This is a parameter
                                console.log('Processing parameter:', content);
                                const parentClass = findParentClassName(text);
                                if (parentClass) {
                                    // 提取参数名，考虑有无+号前缀
                                    const parameterName = content.startsWith('+') ? content.substring(1).trim() : content.trim();
                                    console.log('Setting up click handler for parameter:', parameterName);
                                    text.style.cursor = 'pointer';
                                    text.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        console.log('Parameter clicked:', parameterName, 'in class:', parentClass);
                                        vscode.postMessage({
                                            command: 'openParameter',
                                            className: parentClass,
                                            parameterName: parameterName
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