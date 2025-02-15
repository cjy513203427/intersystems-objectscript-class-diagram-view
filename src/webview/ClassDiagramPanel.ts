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
            // Get workspace root
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Try different possible file locations
            const possiblePaths = [
                // 1. Direct file in workspace root (keeping dots in filename)
                path.join(workspaceFolder.uri.fsPath, `${className}.cls`),
                // 2. File in parent directory (keeping dots in filename)
                path.join(path.dirname(workspaceFolder.uri.fsPath), `${className}.cls`),
                // 3. File with namespace as directory structure
                path.join(workspaceFolder.uri.fsPath, `${className.replace(/\./g, path.sep)}.cls`),
                // 4. File in parent directory with namespace structure
                path.join(path.dirname(workspaceFolder.uri.fsPath), `${className.replace(/\./g, path.sep)}.cls`),
                // 5. Simple filename in workspace root
                path.join(workspaceFolder.uri.fsPath, `${className.split('.').pop()}.cls`),
                // 6. Simple filename in parent directory
                path.join(path.dirname(workspaceFolder.uri.fsPath), `${className.split('.').pop()}.cls`)
            ];

            console.log('Searching for class file in paths:', possiblePaths);

            // Try each possible path
            for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                    console.log('Found class file at:', filePath);
                    await this.openAndShowFile(vscode.Uri.file(filePath), className);
                    return;
                }
            }

            // If not found in direct paths, try using workspace search
            const searchPatterns = [
                // Try with original class name (keeping dots)
                new vscode.RelativePattern(workspaceFolder, `**/${className}.cls`),
                // Try with namespace structure
                new vscode.RelativePattern(workspaceFolder, `**/${className.replace(/\./g, '/')}.cls`),
                // Try with simple class name
                new vscode.RelativePattern(workspaceFolder, `**/${className.split('.').pop()}.cls`)
            ];

            for (const pattern of searchPatterns) {
                const files = await vscode.workspace.findFiles(pattern);
                if (files.length > 0) {
                    // For exact matches, prefer files that match the full class name
                    const exactMatch = files.find(file => {
                        const fileName = path.basename(file.fsPath, '.cls');
                        return fileName.toLowerCase() === className.toLowerCase();
                    });

                    if (exactMatch) {
                        console.log('Found class file through workspace search:', exactMatch.fsPath);
                        await this.openAndShowFile(exactMatch, className);
                        return;
                    }

                    // If no exact match found, use the first file
                    console.log('Found class file (non-exact match):', files[0].fsPath);
                    await this.openAndShowFile(files[0], className);
                    return;
                }
            }

            // If still not found, show error message with search paths
            vscode.window.showWarningMessage(
                `Class file not found: ${className}.cls\nSearched paths:\n` +
                possiblePaths.map((p, i) => `${i + 1}. ${p}\n`).join('') +
                searchPatterns.map((p, i) => `${possiblePaths.length + i + 1}. ${workspaceFolder.uri.fsPath}/${p.pattern}\n`).join('')
            );
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open class: ${err}`);
        }
    }

    /**
     * Helper method to open and show a file at the class definition
     */
    private async openAndShowFile(fileUri: vscode.Uri, className: string) {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const classDefLine = await this.findClassDefinitionLine(document, className);
        const editor = await vscode.window.showTextDocument(document);
        if (classDefLine !== -1) {
            const position = new vscode.Position(classDefLine, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
                new vscode.Range(position, position),
                vscode.TextEditorRevealType.InCenter
            );
        }
    }

    /**
     * Opens the attribute definition (Property, Parameter, or Index) in the class file
     * @param className The name of the class containing the attribute
     * @param propertyName The name of the attribute to locate
     */
    private async openAttribute(className: string, propertyName: string) {
        try {
            // First find and open the class file using openClass
            await this.openClass(className);

            // Get the active editor after openClass
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage(`Failed to open class ${className}`);
                return;
            }

            const document = editor.document;

            // Find the attribute definition within the class
            const attributePatterns = [
                // Match standard property declaration with As keyword
                new RegExp(`^\\s*(?:Property|property)\\s+${propertyName}\\s+As\\s+`, 'i'),
                // Match property declaration with colon
                new RegExp(`^\\s*(?:Property|property)\\s+${propertyName}\\s*:`, 'i'),
                // Match property declaration with parameters
                new RegExp(`^\\s*(?:Property|property)\\s+${propertyName}\\s*\\(`, 'i'),
                // Match basic property declaration
                new RegExp(`^\\s*(?:Property|property)\\s+${propertyName}\\b`, 'i'),
                // Match parameter declaration with assignment
                new RegExp(`^\\s*Parameter\\s+${propertyName}\\s*=`, 'i'),
                // Match basic parameter declaration
                new RegExp(`^\\s*Parameter\\s+${propertyName}\\b`, 'i'),
                // Match index declaration with options
                new RegExp(`^\\s*Index\\s+${propertyName}\\s+On\\s+`, 'i'),
                // Match basic index declaration
                new RegExp(`^\\s*Index\\s+${propertyName}\\b`, 'i')
            ];
            
            // Search for the attribute definition
            let attributeLine = -1;
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const text = line.text;
                
                // Try each pattern in order of specificity
                for (const pattern of attributePatterns) {
                    if (pattern.test(text)) {
                        console.log('Found attribute match:', text);
                        attributeLine = i;
                        break;
                    }
                }
                
                if (attributeLine !== -1) break;
            }

            if (attributeLine !== -1) {
                // Move cursor to the attribute definition line
                const position = new vscode.Position(attributeLine, 0);
                editor.selection = new vscode.Selection(position, position);
                // Reveal the line in the center of the editor
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                );
            } else {
                vscode.window.showWarningMessage(`Attribute ${propertyName} not found in class ${className}`);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open attribute: ${err}`);
        }
    }

    /**
     * Finds the line number where the class is defined
     * @param document The text document to search in
     * @param className The name of the class to find
     * @returns The 0-based line number of the class definition, or -1 if not found
     */
    private async findClassDefinitionLine(document: vscode.TextDocument, className: string): Promise<number> {
        const simpleClassName = className.split('.').pop() || className;
        const classDefRegex = new RegExp(`^\\s*(?:Class|class)\\s+(?:${className}|${simpleClassName})\\b`, 'i');
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (classDefRegex.test(line.text)) {
                return i;
            }
        }
        return -1;
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
                        if (!svg) {
                            console.log('SVG not found');
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

                        // Handle text elements (class names and properties)
                        svg.querySelectorAll('text').forEach(text => {
                            const content = text.textContent?.trim();
                            if (!content) return;

                            console.log('Processing text element:', content);
                            console.log('Text element parent:', text.parentElement?.tagName);
                            console.log('Text element classes:', text.className);
                            
                            // Check if this is a property by looking at its content and context
                            const isProperty = (
                                // Standard property with type
                                content.includes(':') ||
                                // Parameter or Property without explicit type
                                content.match(/^(Parameter|Property)\s+\w+(\s|$)/) ||
                                // Parameter with assignment
                                content.match(/^Parameter\s+\w+\s*=/) ||
                                // Index declaration
                                content.match(/^Index\s+\w+/)
                            ) && !content.startsWith('class') && 
                               !content.startsWith('Class') &&
                               !content.startsWith('%');

                            console.log('Is property?', isProperty);

                            if (!isProperty) {
                                // This is a class name
                                if (!content.includes('(')) {
                                    console.log('Setting up click handler for class:', content);
                                    text.style.cursor = 'pointer';
                                    text.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        console.log('Class clicked:', content);
                                        vscode.postMessage({
                                            command: 'openClass',
                                            className: content
                                        });
                                    });
                                }
                            } else {
                                // This is a property
                                console.log('Processing property:', content);
                                const parentClass = findParentClassName(text);
                                if (parentClass) {
                                    console.log('Found parent class for property:', parentClass);
                                    
                                    // Extract property name from the content
                                    let propertyName = '';
                                    const colonMatch = content.match(/^([^:]+):/);
                                    const parameterMatch = content.match(/^Parameter\s+(\w+)(?:\s*=|\s|$)/);
                                    const propertyMatch = content.match(/^Property\s+(\w+)(?:\s|$)/);
                                    const indexMatch = content.match(/^Index\s+(\w+)(?:\s+On\s+|$)/);
                                    
                                    if (colonMatch) {
                                        propertyName = colonMatch[1].trim();
                                    } else if (parameterMatch) {
                                        propertyName = parameterMatch[1].trim();
                                    } else if (propertyMatch) {
                                        propertyName = propertyMatch[1].trim();
                                    } else if (indexMatch) {
                                        propertyName = indexMatch[1].trim();
                                    }
                                    
                                    console.log('Extracted property name:', propertyName);
                                    
                                    if (propertyName) {
                                        console.log('Setting up click handler for property:', propertyName);
                                        text.style.cursor = 'pointer';
                                        text.addEventListener('click', (e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            console.log('Property clicked:', propertyName, 'in class:', parentClass);
                                            vscode.postMessage({
                                                command: 'openProperty',
                                                className: parentClass,
                                                propertyName: propertyName
                                            });
                                        });
                                    } else {
                                        console.log('No property name found in text:', content);
                                    }
                                } else {
                                    console.log('No parent class found for property:', content);
                                }
                            }
                        });

                        // Disable pointer events on rectangles
                        svg.querySelectorAll('rect').forEach(rect => {
                            rect.style.pointerEvents = 'none';
                        });
                    }

                    // Initialize interaction
                    console.log('Initializing SVG interaction');
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