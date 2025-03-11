import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { ServerClassService } from './service/serverClassService';
import { ServerPlantUmlGenerator } from './generator/serverPlantUmlGenerator';
import { ServerClassDiagramPanel } from './webview/ServerClassDiagramPanel';
import { ServerDatabaseQueryGenerator } from './generator/serverDatabaseQueryGenerator';
import { RestDatabaseQueryGenerator } from './generator/restDatabaseQueryGenerator';

/**
 * Ensure output directory exists
 */
async function ensureOutputDirectory(workspaceRoot: string): Promise<string> {
    const outputDir = path.join(workspaceRoot, 'out_classdiagram');
    try {
        await fs.promises.access(outputDir);
    } catch {
        await fs.promises.mkdir(outputDir, { recursive: true });
    }
    return outputDir;
}

/**
 * Get the URI of the currently selected file in VS Code
 * @returns URI of the currently selected file or undefined if no file is selected
 */
async function getCurrentlySelectedFileUri(): Promise<vscode.Uri | undefined> {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        return activeEditor.document.uri;
    }
    
    // If no editor is active, try to get the selected file from the explorer
    if (vscode.window.activeTextEditor === undefined && vscode.window.visibleTextEditors.length === 0) {
        // No editor is open, try to get the selected item from the explorer
        const uris = await vscode.commands.executeCommand<vscode.Uri[]>('_getOpenEditorViewSelectedItems');
        if (uris && uris.length > 0) {
            return uris[0];
        }
    }
    
    return undefined;
}

/**
 * Generate class diagram from server
 * @param className Class name
 * @param useWebServer Whether to use PlantUML Web server
 */
export async function generateServerClassDiagram(className: string, useWebServer: boolean = false): Promise<void> {
    try {
        // Check if InterSystems ObjectScript extension is installed
        const objectScriptExtension = vscode.extensions.getExtension('intersystems-community.vscode-objectscript');
        if (!objectScriptExtension) {
            vscode.window.showErrorMessage('InterSystems ObjectScript extension is not installed. Please install it from the VS Code marketplace.');
            return;
        }

        if (!objectScriptExtension.isActive) {
            await objectScriptExtension.activate();
        }

        // Get ObjectScript API
        const api = objectScriptExtension.exports;
        
        console.log('Using fixed namespace: KELVIN');
        
        // Use fixed namespace
        const selectedNamespace = 'KELVIN';
        
        // Try to switch namespace
        try {
            console.log(`Attempting to switch to namespace: ${selectedNamespace}`);
            
            // Try different methods to switch namespace
            if (api.serverInfo && typeof api.serverInfo.setNamespace === 'function') {
                await api.serverInfo.setNamespace(selectedNamespace);
                console.log('Using api.serverInfo.setNamespace to switch namespace');
            } else if (api.setNamespace && typeof api.setNamespace === 'function') {
                await api.setNamespace(selectedNamespace);
                console.log('Using api.setNamespace to switch namespace');
            } else if (api.conn && typeof api.conn.setNamespace === 'function') {
                await api.conn.setNamespace(selectedNamespace);
                console.log('Using api.conn.setNamespace to switch namespace');
            } else {
                console.log('Cannot directly switch namespace, will use fixed namespace');
            }
        } catch (error) {
            console.error('Failed to switch namespace, but will continue using fixed namespace:', error);
        }
        
        let fullClassName: string;
        
        // If class name is provided, use it directly
        if (className) {
            console.log(`Using provided class name: ${className}`);
            
            // Check if we need to resolve the full class name
            if (!className.includes('.') || className.split('.').length <= 2) {
                console.log('Class name appears to be a simple name, attempting to resolve full name');
                
                // Try to get the currently selected file URI
                const selectedFileUri = await getCurrentlySelectedFileUri();
                
                if (selectedFileUri) {
                    console.log(`Got selected file URI: ${selectedFileUri.toString()}`);
                    
                    // Try to build full class name from the URI
                    const resolvedClassName = await getFullClassNameFromUri(selectedFileUri);
                    
                    if (resolvedClassName) {
                        fullClassName = resolvedClassName;
                        console.log(`Resolved full class name from URI: ${fullClassName}`);
                    } else {
                        // Fall back to database search
                        fullClassName = await findFullClassName(api, className);
                        console.log(`Resolved full class name from database: ${fullClassName}`);
                    }
                } else {
                    // Fall back to database search
                    fullClassName = await findFullClassName(api, className);
                    console.log(`Resolved full class name from database: ${fullClassName}`);
                }
            } else {
                // Class name already appears to be a full name
                fullClassName = className;
                console.log(`Using provided full class name: ${fullClassName}`);
            }
        } else {
            // If no class name is provided, use default class name
            fullClassName = 'apiPub.samples.Pet';
            console.log(`Using default class name: ${fullClassName}`);
        }
        
        // Use the resolved full class name for the rest of the function
        className = fullClassName;
        
        // Get workspace root directory
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        
        // Ensure output directory exists
        const outputDir = await ensureOutputDirectory(workspaceRoot);

        // Create server class service
        const classService = new ServerClassService();
        
        // Get class info from server
        console.log(`Starting to get class info: ${className}`);
        const mainClassInfo = await classService.getClassInfoFromServer(className);
        console.log(`Main class info: ${JSON.stringify(mainClassInfo)}`);
        
        if (!mainClassInfo) {
            vscode.window.showErrorMessage(`Failed to get class info for ${className}`);
            return;
        }
        
        // Get all superclasses
        const superClassNames = classService.getAllSuperClasses(className);
        console.log(`Superclass names: ${JSON.stringify(superClassNames)}`);
        
        // Get related class info
        const relatedClasses = superClassNames
            .map(name => classService.getClassInfo(name))
            .filter((info): info is NonNullable<typeof info> => info !== undefined);
        console.log(`Related classes count: ${relatedClasses.length}`);
        
        // Create filtered hierarchy map
        const filteredHierarchy = new Map<string, string[]>();
        
        // Add main class inheritance relationship
        filteredHierarchy.set(mainClassInfo.className, mainClassInfo.superClasses);
        
        // Add parent class inheritance relationships
        relatedClasses.forEach(classInfo => {
            if (classInfo.superClasses.length > 0) {
                filteredHierarchy.set(classInfo.className, classInfo.superClasses);
            }
        });
        
        console.log(`Class hierarchy: ${JSON.stringify(Array.from(filteredHierarchy.entries()))}`);
        
        // Generate PlantUML content
        const umlContent = ServerPlantUmlGenerator.generatePlantUml(
            mainClassInfo,
            relatedClasses,
            filteredHierarchy
        );
        
        console.log(`Generated UML content: ${umlContent}`);

        // Use class name as file name
        const outputFileName = mainClassInfo.className.replace(/\./g, '_');
        const umlFilePath = path.join(outputDir, `${outputFileName}.puml`);
        await fs.promises.writeFile(umlFilePath, umlContent);
        
        vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
        
        if (useWebServer) {
            // Generate PlantUML Web server URL
            const plantUmlUrl = generatePlantUmlWebUrl(umlContent);
            
            // Show URL to user and provide copy option
            const copyAction = 'Copy URL';
            const openAction = 'Open in Browser';
            const result = await vscode.window.showInformationMessage(
                `PlantUML diagram available at web server. You can copy the URL or open it in browser.`,
                copyAction,
                openAction
            );
            
            if (result === copyAction) {
                // Copy URL to clipboard
                await vscode.env.clipboard.writeText(plantUmlUrl);
                vscode.window.showInformationMessage('PlantUML URL copied to clipboard');
            } else if (result === openAction) {
                // Open URL in browser
                vscode.env.openExternal(vscode.Uri.parse(plantUmlUrl));
            }
        } else {
            // Use existing local Java method
            const svgFilePath = await exportDiagram(umlFilePath);
            // Get extension path
            const extensionPath = vscode.extensions.getExtension('JinyaoChen.intersystems-objectscript-class-diagram-view')?.extensionPath || 
                                 path.join(path.dirname(path.dirname(path.dirname(__dirname))));
            // Display chart in WebView
            ServerClassDiagramPanel.createOrShow(extensionPath, svgFilePath, classService, outputFileName);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to generate class diagram: ${err}`);
    }
}

/**
 * Get class name from URI using ObjectScript extension
 * @param uri URI of the class file
 * @returns Class name or undefined if not found
 */
async function getClassNameFromUri(uri: vscode.Uri): Promise<string | undefined> {
    try {
        // Check if InterSystems ObjectScript extension is installed
        const objectScriptExtension = vscode.extensions.getExtension('intersystems-community.vscode-objectscript');
        if (!objectScriptExtension) {
            console.log('InterSystems ObjectScript extension is not installed');
            return undefined;
        }

        if (!objectScriptExtension.isActive) {
            await objectScriptExtension.activate();
        }

        // Get ObjectScript API
        const api = objectScriptExtension.exports;
        
        // Try different methods to get class name from URI
        if (api.getClassName && typeof api.getClassName === 'function') {
            const className = await api.getClassName(uri);
            if (className) {
                return className;
            }
        }
        
        if (api.documentContentProvider && typeof api.documentContentProvider.getClassName === 'function') {
            const className = await api.documentContentProvider.getClassName(uri);
            if (className) {
                return className;
            }
        }
        
        // If we couldn't get the class name from the API, try to extract it from the URI
        if (uri.fsPath.endsWith('.cls')) {
            const fileName = path.basename(uri.fsPath, '.cls');
            return fileName;
        }
        
        return undefined;
    } catch (error) {
        console.error('Error getting class name from URI:', error);
        return undefined;
    }
}

/**
 * Export chart as SVG
 */
async function exportDiagram(umlFilePath: string): Promise<string> {
    // Use absolute path
    const extensionPath = vscode.extensions.getExtension('JinyaoChen.intersystems-objectscript-class-diagram-view')?.extensionPath || 
                          path.join(path.dirname(path.dirname(path.dirname(__dirname))));
    const jarPath = path.join(extensionPath, 'lib', 'plantuml-mit-1.2025.0.jar');
    const command = `java -jar "${jarPath}" -tsvg "${umlFilePath}"`;

    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(err);
                return;
            }
            if (stderr) {
                console.error(stderr);
            }
            const svgFilePath = umlFilePath.replace('.puml', '.svg');
            vscode.window.showInformationMessage(`SVG file generated: ${svgFilePath}`);
            resolve(svgFilePath);
        });
    });
}

/**
 * Generate PlantUML Web server URL for given UML content
 */
function generatePlantUmlWebUrl(umlContent: string): string {
    // URL-encode PlantUML content
    // We need to use PlantUML encoding algorithm
    const encoded = encodePlantUmlContent(umlContent);
    return `https://www.plantuml.com/plantuml/svg/${encoded}`;
}

/**
 * Encode PlantUML content for use in URL
 * This is a simplified version of PlantUML encoding algorithm
 */
function encodePlantUmlContent(content: string): string {
    try {
        // Import zlib for compression
        const zlib = require('zlib');
        
        // Use deflate to compress content
        const deflated = zlib.deflateRawSync(Buffer.from(content, 'utf-8'), { level: 9 });
        
        // Convert to PlantUML's custom base64 variant
        return encode64(deflated);
    } catch (error) {
        console.error('Error encoding PlantUML content:', error);
        // If encoding fails, return a simple encoding, display error message
        return 'SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80';
    }
}

/**
 * Encode PlantUML's custom base64 variant for buffer
 */
function encode64(data: Buffer): string {
    let r = '';
    // PlantUML uses different base64 table from standard
    // This is their encoding table: 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_
    const encode6bit = (b: number): string => {
        if (b < 10) {
            return String.fromCharCode(48 + b);
        }
        b -= 10;
        if (b < 26) {
            return String.fromCharCode(65 + b);
        }
        b -= 26;
        if (b < 26) {
            return String.fromCharCode(97 + b);
        }
        b -= 26;
        if (b === 0) {
            return '-';
        }
        if (b === 1) {
            return '_';
        }
        return '?';
    };
    
    // Process 3 bytes at a time
    for (let i = 0; i < data.length; i += 3) {
        // Special case: If only 1 or 2 bytes left
        if (i + 2 === data.length) {
            r += encode6bit((data[i] & 0xFC) >> 2);
            r += encode6bit(((data[i] & 0x03) << 4) | ((data[i + 1] & 0xF0) >> 4));
            r += encode6bit((data[i + 1] & 0x0F) << 2);
            break;
        }
        if (i + 1 === data.length) {
            r += encode6bit((data[i] & 0xFC) >> 2);
            r += encode6bit((data[i] & 0x03) << 4);
            break;
        }
        
        // Normal case: Process 3 bytes
        const b1 = data[i];
        const b2 = data[i + 1];
        const b3 = data[i + 2];
        
        r += encode6bit((b1 & 0xFC) >> 2);
        r += encode6bit(((b1 & 0x03) << 4) | ((b2 & 0xF0) >> 4));
        r += encode6bit(((b2 & 0x0F) << 2) | ((b3 & 0xC0) >> 6));
        r += encode6bit(b3 & 0x3F);
    }
    
    return r;
}

/**
 * Find the best match for a class name from a list of candidates
 * @param candidates List of candidate class names
 * @param targetClassName Target class name to match
 * @returns Best matching class name or undefined if no good match found
 */
function findBestClassNameMatch(candidates: any[], targetClassName: string): string | undefined {
    if (!candidates || candidates.length === 0) {
        return undefined;
    }
    
    // First, try to find an exact match at the end of the name
    const exactEndMatch = candidates.find(cls => 
        cls.Name.endsWith(`.${targetClassName}`)
    );
    
    if (exactEndMatch) {
        return exactEndMatch.Name;
    }
    
    // Next, try to find a match with the target as a segment in the name
    const segmentMatch = candidates.find(cls => {
        const segments = cls.Name.split('.');
        return segments.includes(targetClassName);
    });
    
    if (segmentMatch) {
        return segmentMatch.Name;
    }
    
    // If no specific matches found, return undefined
    return undefined;
}

/**
 * List all available classes in the current namespace for debugging purposes
 * @param api ObjectScript API
 */
async function listAllAvailableClasses(api: any): Promise<void> {
    try {
        const listClassesSql = "SELECT TOP 100 Name FROM %Dictionary.ClassDefinition ORDER BY Name";
        console.log(`SQL for listing all classes: ${listClassesSql}`);
        
        if (api.serverExecuteQuery && typeof api.serverExecuteQuery === 'function') {
            const result = await api.serverExecuteQuery({
                query: listClassesSql,
                parameters: []
            });
            console.log(`Available classes (top 100): ${JSON.stringify(result)}`);
        } else if (api.atelier && typeof api.atelier.query === 'function') {
            const result = await api.atelier.query(listClassesSql, [], 'KELVIN');
            console.log(`Available classes (top 100): ${JSON.stringify(result)}`);
        } else if (api.serverActions && typeof api.serverActions.runQuery === 'function') {
            const result = await api.serverActions.runQuery(listClassesSql, [], 'KELVIN');
            console.log(`Available classes (top 100): ${JSON.stringify(result)}`);
        }
    } catch (error) {
        console.error('Error listing available classes:', error);
    }
}

/**
 * Find the full class name by searching in the database
 * @param api ObjectScript API
 * @param className Short class name or partial class name
 * @returns Full class name if found, otherwise the original class name
 */
async function findFullClassName(api: any, className: string): Promise<string> {
    console.log(`Attempting to find full class name for: ${className}`);
    
    // If the class name already contains dots, it might be a full class name
    if (className.includes('.') && className.split('.').length > 2) {
        console.log(`Class name already appears to be a full name: ${className}`);
        
        // 验证这个类名是否存在
        const verifySQL = `SELECT Name FROM %Dictionary.ClassDefinition WHERE Name = '${className}';`;
        console.log(`Verifying class name with SQL: ${verifySQL}`);
        
        try {
            let results = [];
            
            if (api.serverExecuteQuery && typeof api.serverExecuteQuery === 'function') {
                const result = await api.serverExecuteQuery({
                    query: verifySQL
                });
                results = result || [];
            } else if (api.atelier && typeof api.atelier.query === 'function') {
                const result = await api.atelier.query(verifySQL, [], 'KELVIN');
                results = result?.result?.content || [];
            } else if (api.serverActions && typeof api.serverActions.runQuery === 'function') {
                const result = await api.serverActions.runQuery(verifySQL, [], 'KELVIN');
                results = result || [];
            }
            
            if (results.length > 0) {
                console.log(`Verified class name exists: ${className}`);
                return className;
            }
            
            console.log(`Class name not found in database: ${className}`);
        } catch (error) {
            console.error('Error verifying class name:', error);
        }
    }
    
    try {
        // 首先尝试直接查询完整类名
        const directSQL = `SELECT Name FROM %Dictionary.ClassDefinition WHERE Name LIKE '%${className}%' ORDER BY Name;`;
        console.log(`Trying direct SQL: ${directSQL}`);
        
        let directResults = [];
        
        if (api.serverExecuteQuery && typeof api.serverExecuteQuery === 'function') {
            const result = await api.serverExecuteQuery({
                query: directSQL
            });
            directResults = result || [];
        } else if (api.atelier && typeof api.atelier.query === 'function') {
            const result = await api.atelier.query(directSQL, [], 'KELVIN');
            directResults = result?.result?.content || [];
        } else if (api.serverActions && typeof api.serverActions.runQuery === 'function') {
            const result = await api.serverActions.runQuery(directSQL, [], 'KELVIN');
            directResults = result || [];
        }
        
        console.log(`Direct search results: ${JSON.stringify(directResults)}`);
        
        if (directResults.length > 0) {
            // Find the best match
            const bestMatch = findBestClassNameMatch(directResults, className);
            if (bestMatch) {
                console.log(`Found best match for class name: ${bestMatch}`);
                return bestMatch;
            }
            
            // If no best match found but we have results, use the first one
            console.log(`Using first match for class name: ${directResults[0].Name}`);
            return directResults[0].Name;
        }
        
        // Try different search patterns in order of specificity
        const searchPatterns = [
            // 1. Exact match at the end of the name (most specific)
            `SELECT Name FROM %Dictionary.ClassDefinition WHERE Name LIKE '%.${className}' ORDER BY Name;`,
            // 2. Exact match anywhere in the name
            `SELECT Name FROM %Dictionary.ClassDefinition WHERE Name LIKE '%${className}%' ORDER BY Name;`,
            // 3. Match with package prefix (for classes in specific packages)
            `SELECT Name FROM %Dictionary.ClassDefinition WHERE Name LIKE 'EXORPRO.%.${className}' ORDER BY Name;`,
            // 4. Match with common prefixes
            `SELECT Name FROM %Dictionary.ClassDefinition WHERE Name LIKE 'EXORPRO.K5.OpenApi.%.${className}' ORDER BY Name;`
        ];
        
        // Try each search pattern until we find a match
        for (const sql of searchPatterns) {
            console.log(`Trying SQL: ${sql}`);
            
            let results = [];
            
            if (api.serverExecuteQuery && typeof api.serverExecuteQuery === 'function') {
                const result = await api.serverExecuteQuery({
                    query: sql
                });
                console.log(`Search result: ${JSON.stringify(result)}`);
                results = result || [];
            } else if (api.atelier && typeof api.atelier.query === 'function') {
                const result = await api.atelier.query(sql, [], 'KELVIN');
                console.log(`Search result: ${JSON.stringify(result)}`);
                results = result?.result?.content || [];
            } else if (api.serverActions && typeof api.serverActions.runQuery === 'function') {
                const result = await api.serverActions.runQuery(sql, [], 'KELVIN');
                console.log(`Search result: ${JSON.stringify(result)}`);
                results = result || [];
            }
            
            if (results.length > 0) {
                // Find the best match
                const bestMatch = findBestClassNameMatch(results, className);
                if (bestMatch) {
                    console.log(`Found best match for class name: ${bestMatch}`);
                    return bestMatch;
                }
                
                // If no best match found but we have results, use the first one
                console.log(`Using first match for class name: ${results[0].Name}`);
                return results[0].Name;
            }
        }
        
        // If all searches fail, return the original class name
        console.log(`No matches found, using original class name: ${className}`);
        return className;
    } catch (error) {
        console.error('Error finding full class name:', error);
        return className;
    }
}

/**
 * Build full class name from file path by recursively traversing up to src directory
 * @param filePath Path to the class file
 * @returns Full class name constructed from directory structure
 */
export async function buildFullClassNameFromPath(filePath: string): Promise<string | undefined> {
    try {
        if (!filePath.endsWith('.cls')) {
            console.log(`File is not a class file: ${filePath}`);
            return undefined;
        }
        
        // Get the file name without extension (base class name)
        const baseClassName = path.basename(filePath, '.cls');
        console.log(`Base class name: ${baseClassName}`);
        
        // Start building the full class name from the base
        const segments: string[] = [baseClassName];
        
        // Get the directory containing the file
        let currentDir = path.dirname(filePath);
        let parentDir = path.dirname(currentDir);
        
        console.log(`Starting directory traversal from: ${currentDir}`);
        
        // Traverse up the directory structure until we reach 'src' or the root
        while (path.basename(currentDir) !== 'src' && currentDir !== parentDir) {
            // Add the current directory name to the segments
            segments.unshift(path.basename(currentDir));
            
            // Move up one level
            currentDir = parentDir;
            parentDir = path.dirname(currentDir);
            
            console.log(`Traversing to: ${currentDir}`);
            
            // Safety check to prevent infinite loops
            if (segments.length > 20) {
                console.log('Too many segments, stopping traversal');
                break;
            }
        }
        
        // Construct the full class name
        const fullClassName = segments.join('.');
        console.log(`Constructed full class name: ${fullClassName}`);
        
        return fullClassName;
    } catch (error) {
        console.error('Error building full class name from path:', error);
        return undefined;
    }
}

/**
 * Get class name from URI and build full class name
 * @param uri URI of the class file
 * @returns Full class name
 */
export async function getFullClassNameFromUri(uri: vscode.Uri): Promise<string | undefined> {
    try {
        // First try to get the class name using the ObjectScript extension
        const simpleClassName = await getClassNameFromUri(uri);
        
        if (!simpleClassName) {
            console.log('Could not get class name from URI using ObjectScript extension');
            return undefined;
        }
        
        console.log(`Got simple class name from URI: ${simpleClassName}`);
        
        // If the simple class name already contains dots, it might be a full class name
        if (simpleClassName.includes('.') && simpleClassName.split('.').length > 2) {
            console.log(`Class name already appears to be a full name: ${simpleClassName}`);
            return simpleClassName;
        }
        
        // Try to build the full class name from the file path
        const fullClassName = await buildFullClassNameFromPath(uri.fsPath);
        
        if (fullClassName) {
            console.log(`Using full class name from path: ${fullClassName}`);
            return fullClassName;
        }
        
        // If we couldn't build the full class name from the path, return the simple class name
        console.log(`Using simple class name: ${simpleClassName}`);
        return simpleClassName;
    } catch (error) {
        console.error('Error getting full class name from URI:', error);
        return undefined;
    }
}

/**
 * Handle right-click context menu command for generating class diagram
 * @param uri URI of the selected file
 */
export async function handleContextMenuCommand(uri: vscode.Uri): Promise<void> {
    try {
        console.log(`Context menu command triggered for URI: ${uri.toString()}`);
        
        // Get class name from URI
        const className = await getFullClassNameFromUri(uri);
        
        if (!className) {
            vscode.window.showErrorMessage('Could not determine class name from the selected file.');
            return;
        }
        
        console.log(`Generating class diagram for class: ${className}`);
        
        // Generate class diagram using the resolved class name
        await generateServerClassDiagram(className, false);
    } catch (error) {
        console.error('Error handling context menu command:', error);
        vscode.window.showErrorMessage(`Error generating class diagram: ${error}`);
    }
}

/**
 * 使用数据库查询生成类图
 * @param className 类名
 * @param useWebServer 是否使用PlantUML Web服务器
 */
export async function generateDatabaseQueryClassDiagram(className: string, useWebServer: boolean = false): Promise<void> {
    try {
        // 检查InterSystems ObjectScript扩展是否已安装
        const objectScriptExtension = vscode.extensions.getExtension('intersystems-community.vscode-objectscript');
        if (!objectScriptExtension) {
            vscode.window.showErrorMessage('未安装InterSystems ObjectScript扩展。请从VS Code市场安装。');
            return;
        }

        if (!objectScriptExtension.isActive) {
            await objectScriptExtension.activate();
        }

        // 获取ObjectScript API
        const api = objectScriptExtension.exports;
        
        // 获取当前命名空间
        let currentNamespace = '';
        try {
            if (api.serverInfo && typeof api.serverInfo.getNamespace === 'function') {
                currentNamespace = await api.serverInfo.getNamespace();
            } else if (api.getNamespace && typeof api.getNamespace === 'function') {
                currentNamespace = await api.getNamespace();
            } else if (api.conn && typeof api.conn.getNamespace === 'function') {
                currentNamespace = await api.conn.getNamespace();
            }
        } catch (error) {
            console.error('获取当前命名空间失败:', error);
        }
        
        console.log(`当前命名空间: ${currentNamespace}`);
        
        // 如果未提供类名，尝试从活动编辑器获取
        if (!className) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const uri = activeEditor.document.uri;
                className = await getFullClassNameFromUri(uri) || '';
            }
        }
        
        // 如果仍然没有类名，提示用户输入
        if (!className) {
            className = await vscode.window.showInputBox({
                prompt: '输入InterSystems类名 (例如, %String, %Library.DynamicObject)',
                placeHolder: '%Library.DynamicObject'
            }) || '';
        }
        
        if (!className) {
            vscode.window.showErrorMessage('未提供类名，无法生成类图');
            return;
        }
        
        // 获取工作区根目录
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('未找到工作区文件夹');
            return;
        }
        
        // 确保输出目录存在
        const outputDir = await ensureOutputDirectory(workspaceRoot);

        // 创建数据库查询生成器
        const dbQueryGenerator = new ServerDatabaseQueryGenerator();
        
        // 创建输出通道
        const outputChannel = vscode.window.createOutputChannel('InterSystems Class Diagram SQL');
        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine(`开始为类 ${className} 生成类图`);
        outputChannel.appendLine(`当前命名空间: ${currentNamespace}`);
        
        // 显示进度指示器
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `正在生成类图: ${className}`,
            cancellable: false
        }, async (progress) => {
            progress.report({ message: '正在查询类信息...' });
            outputChannel.appendLine('正在查询类信息...');
            
            // 生成类图
            const diagramData = await dbQueryGenerator.generateClassDiagram(className);
            
            if (!diagramData) {
                const errorMsg = `无法获取类 ${className} 的信息`;
                outputChannel.appendLine(errorMsg);
                vscode.window.showErrorMessage(errorMsg);
                return;
            }
            
            outputChannel.appendLine(`成功获取类 ${className} 的信息`);
            outputChannel.appendLine(`类信息详情: ${JSON.stringify(diagramData.mainClassInfo, null, 2)}`);
            outputChannel.appendLine(`相关类数量: ${diagramData.relatedClasses.length}`);
            outputChannel.appendLine(`类层次结构: ${JSON.stringify(Array.from(diagramData.filteredHierarchy.entries()), null, 2)}`);
            
            progress.report({ message: '正在生成PlantUML内容...' });
            outputChannel.appendLine('正在生成PlantUML内容...');
            
            // 生成PlantUML内容
            const umlContent = ServerPlantUmlGenerator.generatePlantUml(
                diagramData.mainClassInfo,
                diagramData.relatedClasses,
                diagramData.filteredHierarchy
            );
            
            outputChannel.appendLine(`PlantUML内容:\n${umlContent}`);
            
            // 使用类名作为文件名
            const outputFileName = diagramData.mainClassInfo.className.replace(/\./g, '_');
            const umlFilePath = path.join(outputDir, `${outputFileName}.puml`);
            await fs.promises.writeFile(umlFilePath, umlContent);
            
            outputChannel.appendLine(`UML文件已生成: ${umlFilePath}`);
            vscode.window.showInformationMessage(`UML文件已生成: ${umlFilePath}`);
            
            if (useWebServer) {
                // 生成PlantUML Web服务器URL
                const plantUmlUrl = generatePlantUmlWebUrl(umlContent);
                outputChannel.appendLine(`PlantUML Web URL: ${plantUmlUrl}`);
                
                // 向用户显示URL并提供复制选项
                const copyAction = '复制URL';
                const openAction = '在浏览器中打开';
                const result = await vscode.window.showInformationMessage(
                    `PlantUML图表可在Web服务器上获取。您可以复制URL或在浏览器中打开。`,
                    copyAction,
                    openAction
                );
                
                if (result === copyAction) {
                    // 将URL复制到剪贴板
                    await vscode.env.clipboard.writeText(plantUmlUrl);
                    vscode.window.showInformationMessage('PlantUML URL已复制到剪贴板');
                } else if (result === openAction) {
                    // 在浏览器中打开URL
                    vscode.env.openExternal(vscode.Uri.parse(plantUmlUrl));
                }
            } else {
                progress.report({ message: '正在导出SVG图表...' });
                outputChannel.appendLine('正在导出SVG图表...');
                
                // 使用现有的本地Java方法
                const svgFilePath = await exportDiagram(umlFilePath);
                outputChannel.appendLine(`SVG文件已生成: ${svgFilePath}`);
                
                // 获取扩展路径
                const extensionPath = vscode.extensions.getExtension('JinyaoChen.intersystems-objectscript-class-diagram-view')?.extensionPath || 
                                    path.join(path.dirname(path.dirname(path.dirname(__dirname))));
                
                // 在WebView中显示图表
                ServerClassDiagramPanel.createOrShow(extensionPath, svgFilePath, dbQueryGenerator.classService, outputFileName);
                outputChannel.appendLine('类图已在WebView中显示');
            }
        });
    } catch (err) {
        console.error('生成类图失败:', err);
        vscode.window.showErrorMessage(`生成类图失败: ${err}`);
    }
}

/**
 * 使用REST API生成类图
 * @param className 类名
 * @param useWebServer 是否使用PlantUML Web服务器
 */
export async function generateRestDatabaseQueryClassDiagram(className: string, useWebServer: boolean = false): Promise<void> {
    try {
        // 如果未提供类名，尝试从活动编辑器获取
        if (!className) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const uri = activeEditor.document.uri;
                className = await getFullClassNameFromUri(uri) || '';
            }
        }
        
        // 如果仍然没有类名，提示用户输入
        if (!className) {
            className = await vscode.window.showInputBox({
                prompt: '输入InterSystems类名 (例如, %String, %Library.DynamicObject)',
                placeHolder: '%Library.DynamicObject'
            }) || '';
        }
        
        if (!className) {
            vscode.window.showErrorMessage('未提供类名，无法生成类图');
            return;
        }
        
        // 获取工作区根目录
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('未找到工作区文件夹');
            return;
        }
        
        // 确保输出目录存在
        const outputDir = await ensureOutputDirectory(workspaceRoot);

        // 创建REST数据库查询生成器
        const restQueryGenerator = new RestDatabaseQueryGenerator();
        
        // 创建输出通道
        const outputChannel = vscode.window.createOutputChannel('InterSystems Class Diagram REST SQL');
        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine(`开始为类 ${className} 生成类图 (使用REST API)`);
        
        // 显示进度指示器
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `正在生成类图: ${className} (REST API)`,
            cancellable: false
        }, async (progress) => {
            progress.report({ message: '正在查询类信息...' });
            outputChannel.appendLine('正在查询类信息...');
            
            // 生成类图
            const diagramData = await restQueryGenerator.generateClassDiagram(className);
            
            if (!diagramData) {
                const errorMsg = `无法获取类 ${className} 的信息`;
                outputChannel.appendLine(errorMsg);
                vscode.window.showErrorMessage(errorMsg);
                return;
            }
            
            outputChannel.appendLine(`成功获取类 ${className} 的信息`);
            outputChannel.appendLine(`类信息详情: ${JSON.stringify(diagramData.mainClassInfo, null, 2)}`);
            outputChannel.appendLine(`相关类数量: ${diagramData.relatedClasses.length}`);
            outputChannel.appendLine(`类层次结构: ${JSON.stringify(Array.from(diagramData.filteredHierarchy.entries()), null, 2)}`);
            
            progress.report({ message: '正在生成PlantUML内容...' });
            outputChannel.appendLine('正在生成PlantUML内容...');
            
            // 生成PlantUML内容
            const umlContent = ServerPlantUmlGenerator.generatePlantUml(
                diagramData.mainClassInfo,
                diagramData.relatedClasses,
                diagramData.filteredHierarchy
            );
            
            outputChannel.appendLine(`PlantUML内容:\n${umlContent}`);
            
            // 使用类名作为文件名
            const outputFileName = diagramData.mainClassInfo.className.replace(/\./g, '_');
            const umlFilePath = path.join(outputDir, `${outputFileName}.puml`);
            await fs.promises.writeFile(umlFilePath, umlContent);
            
            outputChannel.appendLine(`UML文件已生成: ${umlFilePath}`);
            vscode.window.showInformationMessage(`UML文件已生成: ${umlFilePath}`);
            
            if (useWebServer) {
                // 生成PlantUML Web服务器URL
                const plantUmlUrl = generatePlantUmlWebUrl(umlContent);
                outputChannel.appendLine(`PlantUML Web URL: ${plantUmlUrl}`);
                
                // 向用户显示URL并提供复制选项
                const copyAction = '复制URL';
                const openAction = '在浏览器中打开';
                const result = await vscode.window.showInformationMessage(
                    `PlantUML图表可在Web服务器上获取。您可以复制URL或在浏览器中打开。`,
                    copyAction,
                    openAction
                );
                
                if (result === copyAction) {
                    // 将URL复制到剪贴板
                    await vscode.env.clipboard.writeText(plantUmlUrl);
                    vscode.window.showInformationMessage('PlantUML URL已复制到剪贴板');
                } else if (result === openAction) {
                    // 在浏览器中打开URL
                    vscode.env.openExternal(vscode.Uri.parse(plantUmlUrl));
                }
            } else {
                progress.report({ message: '正在导出SVG图表...' });
                outputChannel.appendLine('正在导出SVG图表...');
                
                // 使用现有的本地Java方法
                const svgFilePath = await exportDiagram(umlFilePath);
                outputChannel.appendLine(`SVG文件已生成: ${svgFilePath}`);
                
                // 获取扩展路径
                const extensionPath = vscode.extensions.getExtension('JinyaoChen.intersystems-objectscript-class-diagram-view')?.extensionPath || 
                                    path.join(path.dirname(path.dirname(path.dirname(__dirname))));
                
                // 在WebView中显示图表
                ServerClassDiagramPanel.createOrShow(extensionPath, svgFilePath, restQueryGenerator.classService, outputFileName);
                outputChannel.appendLine('类图已在WebView中显示');
            }
        });
    } catch (err) {
        console.error('生成类图失败:', err);
        vscode.window.showErrorMessage(`生成类图失败: ${err}`);
    }
} 