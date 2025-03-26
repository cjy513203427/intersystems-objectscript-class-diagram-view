import * as vscode from 'vscode';

/**
 * Service for managing configuration settings
 */
export class ConfigService {
    /**
     * Get connection configuration for IRIS
     * @returns Connection configuration object
     */
    public getIrisConnection(): { url: string, username: string, password: string, namespace: string } {
        // In a real implementation, these values would be retrieved from VS Code settings
        // For now, we're using hardcoded values for testing as per requirements
        return {
            url: 'http://localhost:51536/api/atelier/v1',
            username: '_SYSTEM',
            password: 'SYS',
            namespace: 'KELVIN'
        };
    }

    /**
     * Initialize configuration with default values if not set
     */
    public initializeConfig(): void {
        // This would initialize the extension's configuration
        // Currently just using hardcoded values
        console.log('Configuration initialized with default test values');
    }
} 