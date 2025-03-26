import * as vscode from 'vscode';
import { RestService } from './service/restService';

/**
 * Main entry point for the ClassDiagramServer functionality
 */
export class ClassDiagramServer {
    private restService: RestService;

    constructor() {
        this.restService = new RestService();
    }

    /**
     * Generate a class diagram for the specified class
     * @param className Full name of the class to diagram
     */
    public async generateClassDiagram(className: string): Promise<void> {
        try {
            // Test the connection and basic queries
            await this.testConnection(className);
            
            // Next steps will be implementing diagram generation logic
            vscode.window.showInformationMessage(`Server mode class diagram for ${className} connection test successful!`);
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