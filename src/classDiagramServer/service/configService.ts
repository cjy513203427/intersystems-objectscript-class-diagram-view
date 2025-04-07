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
        // Get settings from VSCode configuration
        const config = vscode.workspace.getConfiguration('intersystems-objectscript-class-diagram-view.server');
        
        // Get values from configuration or use defaults
        const host = config.get<string>('host') || 'localhost';
        const port = config.get<string>('port') || '52773';
        const namespace = config.get<string>('namespace') || 'USER';
        const username = config.get<string>('username') || '_SYSTEM';
        const password = config.get<string>('password') || 'SYS';
        
        // Construct the URL
        const url = `http://${host}:${port}/api/atelier/v1`;
        
        return {
            url,
            username,
            password,
            namespace
        };
    }

    /**
     * Initialize configuration with default values if not set
     */
    public initializeConfig(): void {
        // Simply log configuration values for debugging
        const connection = this.getIrisConnection();
        console.log('IRIS Connection Configuration:', connection);
    }
} 