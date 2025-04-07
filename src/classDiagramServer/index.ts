import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';
import { RestService } from './service/restService';
import { ClassParser } from './parser/classParser';
import { PlantUmlGenerator } from './generator/plantUmlGenerator';
import { ClassDiagramPanel } from './webview/ClassDiagramPanel';

/**
 * Main entry point for the ClassDiagramServer functionality
 */
export class ClassDiagramServer {
    private restService: RestService;
    private classParser: ClassParser;

    constructor() {
        this.restService = new RestService();
        this.classParser = new ClassParser();
    }

    /**
     * Get output directory for the generated diagram
     * Uses workspace relative path like original implementation
     */
    private async getOutputDirectory(): Promise<string> {
        // Get workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            // If no workspace is open, use temp directory
            const tempDir = path.join(os.tmpdir(), 'out_classdiagram');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            return tempDir;
        }
        
        // Use first workspace folder
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const outputDir = path.join(workspaceRoot, 'out_classdiagram');
        
        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        return outputDir;
    }

    /**
     * Generate a class diagram for the specified class
     * @param className Full name of the class to diagram
     * @param useWebServer Whether to use the PlantUML web server instead of local Java
     */
    public async generateClassDiagram(className: string, useWebServer: boolean = false): Promise<void> {
        try {
            // Use custom output channel for logging
            const outputChannel = vscode.window.createOutputChannel('Class Diagram Generator');
            outputChannel.show();
            outputChannel.appendLine(`Generating class diagram for: ${className}`);
            
            // Parse the class and its hierarchy
            outputChannel.appendLine(`Parsing class and inheritance hierarchy...`);
            const { mainClass, relatedClasses, classHierarchy } = 
                await this.classParser.parseClassWithHierarchy(className);
            
            // Generate PlantUML diagram
            outputChannel.appendLine(`Generating PlantUML diagram...`);
            const pumlContent = PlantUmlGenerator.generatePlantUml(
                mainClass, 
                relatedClasses, 
                classHierarchy
            );
            
            // Get output directory (workspace relative like original implementation)
            const outputDir = await this.getOutputDirectory();
            
            // Use original class name, consistent with original logic
            const pumlFilePath = path.join(outputDir, `${className}.puml`);
            
            // Ensure directory exists
            const dirName = path.dirname(pumlFilePath);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
            
            // Save PUML file
            fs.writeFileSync(pumlFilePath, pumlContent, 'utf8');
            
            outputChannel.appendLine(`PlantUML file generated: ${pumlFilePath}`);
            
            if (useWebServer) {
                // Use PlantUML web server for diagram generation
                outputChannel.appendLine(`Generating diagram using PlantUML web server...`);
                const webUrl = this.generatePlantUmlWebUrl(pumlContent);
                
                // Show options to user
                const copyAction = 'Copy URL';
                const openAction = 'Open in Browser';
                const result = await vscode.window.showInformationMessage(
                    `PlantUML diagram available at web server.`,
                    copyAction, 
                    openAction
                );
                
                if (result === copyAction) {
                    await vscode.env.clipboard.writeText(webUrl);
                    vscode.window.showInformationMessage('PlantUML URL copied to clipboard');
                } else if (result === openAction) {
                    vscode.env.openExternal(vscode.Uri.parse(webUrl));
                }
                
                outputChannel.appendLine(`PlantUML web server URL: ${webUrl}`);
            } else {
                // Use local Java for diagram generation
                outputChannel.appendLine(`Generating SVG using local Java...`);
                const svgFilePath = await this.exportDiagram(pumlFilePath);
                
                outputChannel.appendLine(`SVG file generated: ${svgFilePath}`);
                outputChannel.appendLine(`Opening diagram in web view...`);
                
                // Get extension path
                const extensionPath = vscode.extensions.getExtension('JinyaoChen.intersystems-objectscript-class-diagram-view')?.extensionPath || 
                                     path.dirname(path.dirname(__dirname));
                
                // Show diagram in web view
                ClassDiagramPanel.createOrShow(extensionPath, svgFilePath, className);
            }
            
            outputChannel.appendLine(`Class diagram generation complete!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate class diagram: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Export diagram from PlantUML to SVG using local Java
     * @param umlFilePath Path to the PlantUML file
     * @returns Path to the generated SVG file
     */
    private async exportDiagram(umlFilePath: string): Promise<string> {
        // Get extension path to find the JAR file
        const extensionPath = vscode.extensions.getExtension('JinyaoChen.intersystems-objectscript-class-diagram-view')?.extensionPath || 
                             path.dirname(path.dirname(__dirname));
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
     * Generate a PlantUML web server URL for the given UML content
     * @param umlContent The PlantUML content
     * @returns The PlantUML web server URL
     */
    private generatePlantUmlWebUrl(umlContent: string): string {
        // Encode the PlantUML content for the URL
        const encoded = this.encodePlantUmlContent(umlContent);
        return `https://www.plantuml.com/plantuml/svg/${encoded}`;
    }

    /**
     * Encodes PlantUML content for use in a URL
     * This is a simplified version of the PlantUML encoding algorithm
     * @param content The PlantUML content to encode
     * @returns The encoded content
     */
    private encodePlantUmlContent(content: string): string {
        // We need to use zlib to compress the data
        // For PlantUML server, we need to use the deflate algorithm and then encode with a custom base64 variant
        
        // Import zlib for compression
        const zlib = require('zlib');
        
        // Compress the content using deflate
        const deflated = zlib.deflateRawSync(content, { level: 9 });
        
        // Convert to PlantUML's custom base64 variant
        return this.encode64(deflated);
    }

    /**
     * Encodes a buffer using PlantUML's custom base64 variant
     * @param data The data to encode
     * @returns The encoded string
     */
    private encode64(data: Buffer): string {
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
} 