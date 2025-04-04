import axios, { AxiosRequestConfig } from 'axios';
import * as vscode from 'vscode';
import { ConfigService } from './configService';

// OutputChannel for dedicated logging
const outputChannel = vscode.window.createOutputChannel('IRIS REST Connector');

/**
 * Rest service for communicating with InterSystems IRIS database
 */
export class RestService {
    private configService: ConfigService;
    private username: string;
    private password: string;
    private baseUrl: string;
    private namespace: string;

    constructor() {
        this.configService = new ConfigService();
        const config = this.configService.getIrisConnection();
        this.username = config.username;
        this.password = config.password;
        this.baseUrl = config.url;
        this.namespace = config.namespace;
        
        this.log(`RestService initialized with connection settings:
            URL: ${this.baseUrl}
            Namespace: ${this.namespace}
            Username: ${this.username}
        `);
    }

    /**
     * Log message to output channel
     * @param message Message to log
     */
    private log(message: string): void {
        outputChannel.appendLine(message);
        console.log(message);
    }

    /**
     * Show output channel and bring it to focus
     */
    private showOutputChannel(): void {
        outputChannel.show(true);
    }

    /**
     * Create authorization header for REST requests
     * @returns Authorization header string
     */
    private getAuthHeader(): string {
        const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        return `Basic ${auth}`;
    }

    /**
     * Execute a SQL query against InterSystems IRIS database
     * @param query SQL query string to execute
     * @param parameters Optional parameters for the query
     * @returns Promise with query result
     */
    public async executeQuery(query: string, parameters: any[] = []): Promise<any> {
        try {
            // Make sure output channel is visible
            this.showOutputChannel();
            
            // Log query for debugging
            this.log(`\n===== IRIS REST REQUEST =====`);
            this.log(`SQL Query: ${query}`);
            this.log(`Parameters: ${JSON.stringify(parameters)}`);
            
            const url = `${this.baseUrl}/${this.namespace}/action/query`;
            this.log(`URL: ${url}`);
            
            const params = {
                query: query,
                parameters: parameters
            };

            const config: AxiosRequestConfig = {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            };

            this.log(`Sending request...`);
            const response = await axios.post(url, params, config);
            
            // Log response for debugging
            this.log(`\n===== IRIS REST RESPONSE =====`);
            this.log(`Status: ${response.status}`);
            this.log(`Response data:\n${JSON.stringify(response.data, null, 2)}`);
            
            return response.data;
        } catch (error) {
            this.log(`\n===== IRIS REST ERROR =====`);
            
            if (axios.isAxiosError(error)) {
                this.log(`Axios error: ${error.message}`);
                this.log(`Request URL: ${error.config?.url}`);
                this.log(`Request Method: ${error.config?.method}`);
                this.log(`Status: ${error.response?.status}`);
                this.log(`Status Text: ${error.response?.statusText}`);
                this.log(`Response Data:\n${JSON.stringify(error.response?.data, null, 2)}`);
                
                vscode.window.showErrorMessage(`IRIS REST error: ${error.message}. Status: ${error.response?.status || 'Unknown'}`);
            } else {
                this.log(`Error executing query: ${error instanceof Error ? error.message : String(error)}`);
                vscode.window.showErrorMessage(`Failed to execute query: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            throw error;
        }
    }

    /**
     * Get superclasses for a given class
     * @param className Full class name
     * @returns Promise with superclass information
     */
    public async getSuperclasses(className: string): Promise<string[]> {
        this.log(`\nGetting superclasses for: ${className}`);
        const query = `SELECT Super FROM %Dictionary.ClassDefinition WHERE Name = ?`;
        const result = await this.executeQuery(query, [className]);
        
        if (result && result.result && result.result.content && result.result.content.length > 0) {
            const superClassesStr = result.result.content[0].Super || '';
            if (superClassesStr) {
                const superClasses = superClassesStr.split(',');
                this.log(`Found superclasses: ${superClasses.join(', ')}`);
                return superClasses;
            }
        }
        
        this.log(`No superclasses found for: ${className}`);
        return [];
    }

    /**
     * Get class properties 
     * @param className Full class name
     * @returns Promise with property information
     */
    public async getClassProperties(className: string): Promise<any[]> {
        this.log(`\nGetting properties for: ${className}`);
        const query = `SELECT Name, Type FROM %Dictionary.PropertyDefinition WHERE Parent = ?`;
        const result = await this.executeQuery(query, [className]);
        
        if (result && result.result && result.result.content) {
            this.log(`Found ${result.result.content.length} properties for: ${className}`);
            return result.result.content;
        }
        
        this.log(`No properties found for: ${className}`);
        return [];
    }

    /**
     * Get class methods
     * @param className Full class name
     * @returns Promise with method information
     */
    public async getClassMethods(className: string): Promise<any[]> {
        this.log(`\nGetting methods for: ${className}`);
        const query = `SELECT Name, ReturnType, FormalSpec FROM %Dictionary.MethodDefinition WHERE Parent = ?`;
        const result = await this.executeQuery(query, [className]);
        
        if (result && result.result && result.result.content) {
            this.log(`Found ${result.result.content.length} methods for: ${className}`);
            return result.result.content;
        }
        
        this.log(`No methods found for: ${className}`);
        return [];
    }

    /**
     * Get class parameters
     * @param className Full class name
     * @returns Promise with parameter information
     */
    public async getClassParameters(className: string): Promise<any[]> {
        this.log(`\nGetting parameters for: ${className}`);
        const query = `SELECT Name FROM %Dictionary.ParameterDefinition WHERE Parent = ?`;
        const result = await this.executeQuery(query, [className]);
        
        if (result && result.result && result.result.content) {
            this.log(`Found ${result.result.content.length} parameters for: ${className}`);
            return result.result.content;
        }
        
        this.log(`No parameters found for: ${className}`);
        return [];
    }
} 