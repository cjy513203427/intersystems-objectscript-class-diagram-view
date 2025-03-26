import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { RestService } from './service/restService';
import { ClassParser } from './parser/classParser';
import { PlantUmlGenerator } from './generator/plantUmlGenerator';

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
     */
    public async generateClassDiagram(className: string): Promise<void> {
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
            outputChannel.appendLine(`Class diagram generation complete!`);
            
            // Show success message
            vscode.window.showInformationMessage(`Class diagram generated successfully! PUML file: ${pumlFilePath}`);
            
            // Open generated file
            const uri = vscode.Uri.file(pumlFilePath);
            vscode.workspace.openTextDocument(uri).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate class diagram: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Test the connection to IRIS and execute basic queries
     * @param className Class name to use for testing
     */
    public async testConnection(className: string): Promise<void> {
        try {
            // Test superclass query
            const superclasses = await this.restService.getSuperclasses(className);
            console.log(`Superclasses for ${className}:`, superclasses);

            // Test properties query
            const properties = await this.restService.getClassProperties(className);
            console.log(`Properties for ${className}:`, properties);

            // Test methods query
            const methods = await this.restService.getClassMethods(className);
            console.log(`Methods for ${className}:`, methods);
        } catch (error) {
            console.error('Connection test failed:', error);
            throw new Error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 