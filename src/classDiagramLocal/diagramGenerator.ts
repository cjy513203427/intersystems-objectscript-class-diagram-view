import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { ClassService } from './service/classService';
import { ClassParser, IClassInfo } from './parser/classParser';
import { PlantUmlGenerator } from './generator/plantUmlGenerator';
import { ClassDiagramPanel } from './webview/ClassDiagramPanel';

// make sure the outputDir is not null
async function ensureOutputDirectory(workspaceRoot: string): Promise<string> {
    const outputDir = path.join(workspaceRoot, 'out_classdiagram');
    try {
        await fs.promises.access(outputDir);
    } catch {
        await fs.promises.mkdir(outputDir, { recursive: true });
    }
    return outputDir;
}

async function hasClsFiles(dirPath: string): Promise<boolean> {
    try {
        const files = await fs.promises.readdir(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.promises.stat(filePath);
            if (stats.isDirectory()) {
                const hasChildClsFiles = await hasClsFiles(filePath);
                if (hasChildClsFiles) {
                    return true;
                }
            } else if (file.endsWith('.cls')) {
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error('Error checking for .cls files:', err);
        return false;
    }
}

/**
 * Generates a class diagram for the given URI
 * @param uri The URI of the file or directory to generate a diagram for
 * @param useWebServer Whether to use the PlantUML Web Server (true) or local Java (false)
 */
export async function generateClassDiagram(uri: vscode.Uri, useWebServer: boolean = false) {
    if (!uri || (!uri.fsPath.endsWith('.cls') && !fs.statSync(uri.fsPath).isDirectory())) {
        vscode.window.showInformationMessage('Please select a .cls file or a directory containing .cls files');
        return;
    }

    // Check if the selected path is 'src' directory
    if (fs.statSync(uri.fsPath).isDirectory() && path.basename(uri.fsPath).toLowerCase() === 'src') {
        vscode.window.showWarningMessage('The src directory is not supported for class diagram generation');
        return;
    }

    try {
        // make sure the workspaceRoot is not null
        const workspaceRoot = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath || path.dirname(uri.fsPath);
        
        // make sure the outputDir is not null
        const outputDir = await ensureOutputDirectory(workspaceRoot);

        // Check for .cls files in directory
        if (fs.statSync(uri.fsPath).isDirectory()) {
            const hasClsFilesInDir = await hasClsFiles(uri.fsPath);
            if (!hasClsFilesInDir) {
                vscode.window.showInformationMessage('Selected directory does not contain any .cls files');
                return;
            }
        }

        const classService = new ClassService();
        const baseDir = fs.statSync(uri.fsPath).isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);
        
        // First scan the immediate directory
        await classService.scanDirectory(baseDir);

        let umlContent: string;
        let outputFileName: string;
        
        if (fs.statSync(uri.fsPath).isDirectory()) {
            // Generate diagram for directory
            const allClassInfos = Array.from(classService.getAllClassInfos().values());
            if (allClassInfos.length === 0) {
                vscode.window.showInformationMessage('No valid class files found in the selected directory');
                return;
            }

            const classHierarchy = classService.getClassHierarchy();
            
            // Generate PUML content
            umlContent = PlantUmlGenerator.generatePlantUmlForDirectory(allClassInfos, classHierarchy);

            // Get full package name from the directory name
            outputFileName = path.basename(uri.fsPath).split(path.sep).join('.');
            
            // Walk up the directory tree to build the full package name
            let currentDir = path.dirname(uri.fsPath);
            while (currentDir && currentDir !== baseDir && path.basename(currentDir) !== 'src') {
                const parentDir = path.basename(currentDir);
                if (parentDir) {
                    outputFileName = parentDir + '.' + outputFileName;
                }
                currentDir = path.dirname(currentDir);
            }
        } else {
            // Generate diagram for single file
            const fileContent = await fs.promises.readFile(uri.fsPath, 'utf8');
            const mainClassInfo = ClassParser.parseClassContent(fileContent);
            
            // Get all superclasses
            const superClasses = classService.getAllSuperClasses(mainClassInfo.className);
            
            // Ensure all superclasses are loaded
            for (const superClass of superClasses) {
                await classService.ensureClassInfoLoaded(superClass, baseDir);
            }
            
            const relatedClasses = superClasses
                .map(className => classService.getClassInfo(className))
                .filter((info): info is NonNullable<typeof info> => info !== undefined);
            
            // Create a filtered hierarchy map that includes the inheritance chain
            const filteredHierarchy = new Map<string, string[]>();
            
            // Add main class's inheritance
            filteredHierarchy.set(mainClassInfo.className, mainClassInfo.superClasses);
            
            // Add parent classes' inheritance
            relatedClasses.forEach(classInfo => {
                if (classInfo.superClasses.length > 0) {
                    filteredHierarchy.set(classInfo.className, classInfo.superClasses);
                }
            });
            
            umlContent = PlantUmlGenerator.generatePlantUml(
                mainClassInfo,
                relatedClasses,
                filteredHierarchy
            );

            // Use class name as file name
            outputFileName = mainClassInfo.className;
        }

        const umlFilePath = path.join(outputDir, `${outputFileName}.puml`);
        await fs.promises.writeFile(umlFilePath, umlContent);
        
        vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
        
        if (useWebServer) {
            // Generate PlantUML Web Server URL
            const plantUmlUrl = generatePlantUmlWebUrl(umlContent);
            
            // Show URL to user and offer to copy it
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
            // Show the diagram in a WebView with baseDir for class lookup
            ClassDiagramPanel.createOrShow(__dirname, svgFilePath, baseDir, outputFileName);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to generate class diagram: ${err}`);
    }
}

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
 * Generates a PlantUML Web Server URL for the given UML content
 * @param umlContent The PlantUML content
 * @returns The PlantUML Web Server URL
 */
function generatePlantUmlWebUrl(umlContent: string): string {
    // Encode the PlantUML content for the URL
    // We need to use the PlantUML encoding algorithm
    const encoded = encodePlantUmlContent(umlContent);
    return `https://www.plantuml.com/plantuml/svg/${encoded}`;
}

/**
 * Encodes PlantUML content for use in a URL
 * This is a simplified version of the PlantUML encoding algorithm
 * @param content The PlantUML content to encode
 * @returns The encoded content
 */
function encodePlantUmlContent(content: string): string {
    // We need to use zlib to compress the data
    // For PlantUML server, we need to use the deflate algorithm and then encode with a custom base64 variant
    
    // Import zlib for compression
    const zlib = require('zlib');
    
    // Compress the content using deflate
    const deflated = zlib.deflateRawSync(content, { level: 9 });
    
    // Convert to PlantUML's custom base64 variant
    return encode64(deflated);
}

/**
 * Encodes a buffer using PlantUML's custom base64 variant
 * @param data The data to encode
 * @returns The encoded string
 */
function encode64(data: Buffer): string {
    let r = '';
    // PlantUML uses a different base64 table than the standard one
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
        // Special processing for the last few bytes
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
        
        // Normal case for 3 bytes
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
 * Generates a class diagram for multiple selected .cls files
 * @param uris Array of URIs of the selected .cls files
 * @param useWebServer Whether to use the PlantUML Web Server (true) or local Java (false)
 */
export async function generateClassDiagramForMultipleFiles(uris: vscode.Uri[], useWebServer: boolean = false) {
    // Validate that all URIs are .cls files
    const invalidFiles = uris.filter(uri => !uri.fsPath.endsWith('.cls'));
    if (invalidFiles.length > 0) {
        vscode.window.showInformationMessage('Please select only .cls files');
        return;
    }

    if (uris.length === 0) {
        vscode.window.showInformationMessage('No .cls files selected');
        return;
    }

    try {
        // Get workspace root from the first file
        const workspaceRoot = vscode.workspace.getWorkspaceFolder(uris[0])?.uri.fsPath || path.dirname(uris[0].fsPath);
        
        // Ensure output directory exists
        const outputDir = await ensureOutputDirectory(workspaceRoot);

        const classInfos: IClassInfo[] = [];
        const classNames = new Set<string>();

        // Parse all selected class files
        for (const uri of uris) {
            const fileContent = await fs.promises.readFile(uri.fsPath, 'utf8');
            const classInfo = ClassParser.parseClassContent(fileContent);
            classInfos.push(classInfo);
            classNames.add(classInfo.className);
        }

        // Collect all superclasses (including those not in the selected set)
        const allSuperClasses = new Set<string>();
        for (const classInfo of classInfos) {
            for (const superClass of classInfo.superClasses) {
                if (!classNames.has(superClass)) {
                    allSuperClasses.add(superClass);
                }
            }
        }

        // Create placeholder class info for superclasses that are not in the selected set
        for (const superClassName of allSuperClasses) {
            const superClassInfo: IClassInfo = {
                className: superClassName,
                superClasses: [],
                attributes: [],
                methods: [],
                isAbstract: false
            };
            classInfos.push(superClassInfo);
        }

        // Build hierarchy map that includes all inheritance relationships
        const classHierarchy = new Map<string, string[]>();
        
        for (const classInfo of classInfos) {
            if (classInfo.superClasses.length > 0) {
                classHierarchy.set(classInfo.className, classInfo.superClasses);
            }
        }

        // Generate PlantUML content using the directory generator (works for multiple classes)
        const umlContent = PlantUmlGenerator.generatePlantUmlForDirectory(classInfos, classHierarchy);

        // Generate output file name based on selected classes
        const outputFileName = `SelectedClasses_${classInfos.length}`;
        const umlFilePath = path.join(outputDir, `${outputFileName}.puml`);
        await fs.promises.writeFile(umlFilePath, umlContent);
        
        vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
        
        if (useWebServer) {
            // Generate PlantUML Web Server URL
            const plantUmlUrl = generatePlantUmlWebUrl(umlContent);
            
            // Show URL to user and offer to copy it
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
            // Use the directory of the first file as the base directory for class lookup
            const baseDir = path.dirname(uris[0].fsPath);
            // Show the diagram in a WebView
            ClassDiagramPanel.createOrShow(__dirname, svgFilePath, baseDir, outputFileName);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to generate class diagram for multiple files: ${err}`);
    }
}