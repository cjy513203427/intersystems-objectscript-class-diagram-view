import * as vscode from 'vscode';
import { makeRESTRequest, ServerConfig } from './makeRESTRequest';
import { ClassMemberInfo, ServerClassInfo } from './types';

/**
 * REST API-based class service for retrieving class information
 */
export class RestClassService {
    private classInfoMap: Map<string, ServerClassInfo> = new Map();
    private classHierarchy: Map<string, string[]> = new Map();
    private processedClasses: Set<string> = new Set();
    private serverConfig: ServerConfig | undefined;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('REST Class Service Debug');
        this.outputChannel.show();
        this.log('RestClassService initialized');
        // Initialize server configuration on startup
        this.initServerConfig();
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
        console.log(`[REST Class Service] ${message}`);
    }

    /**
     * Initialize server configuration
     */
    private async initServerConfig(): Promise<void> {
        try {
            this.log('Starting server configuration initialization...');
            // Get ObjectScript extension configuration
            const config = vscode.workspace.getConfiguration('objectscript');
            const conn = config.get('conn') as any;
            
            this.log(`Retrieved configuration: ${JSON.stringify(config, null, 2)}`);
            this.log(`Connection info: ${JSON.stringify({ ...conn, password: '******' }, null, 2)}`);
            
            if (conn) {
                this.serverConfig = {
                    host: conn.host || 'localhost',
                    port: conn.port || 52773,
                    username: conn.username || '_SYSTEM',
                    password: conn.password || 'SYS',
                    namespace: conn.namespace || 'KELVIN',
                    ssl: conn.ssl || false
                };
                
                this.log(`Server configuration initialized: ${JSON.stringify({ 
                    ...this.serverConfig,
                    password: '******'
                }, null, 2)}`);
            } else {
                this.log('Error: Unable to get ObjectScript extension configuration');
                throw new Error('Unable to get ObjectScript extension configuration');
            }
        } catch (error) {
            this.log(`Failed to initialize server configuration: ${error}`);
            throw error;
        }
    }

    /**
     * Execute SQL query
     */
    private async executeQuery(sql: string, outputChannel?: vscode.OutputChannel): Promise<any[]> {
        if (!this.serverConfig) {
            this.log('Server configuration not initialized, attempting to reinitialize...');
            await this.initServerConfig();
            if (!this.serverConfig) {
                this.log('Server configuration initialization failed');
                return [];
            }
        }
        
        try {
            this.log(`Preparing to execute SQL query: ${sql}`);
            
            // Build query request
            const data = {
                query: sql,
                parameters: []
            };
            
            this.log('Sending REST request...');
            // Send REST request
            const response = await makeRESTRequest(
                'POST',
                1,
                '/action/query',
                this.serverConfig,
                data
            );
            
            if (!response) {
                this.log('REST request returned undefined');
                return [];
            }

            this.log(`REST response status: ${response.status}`);
            this.log(`REST response data: ${JSON.stringify(response.data, null, 2)}`);
            
            if (response.data?.status?.errors?.length > 0) {
                this.log(`Query error: ${JSON.stringify(response.data.status.errors, null, 2)}`);
                return [];
            }
            
            if (response.data?.result?.content) {
                this.log(`Query successful, returned ${response.data.result.content.length} records`);
                return response.data.result.content;
            }
            
            this.log('Query returned empty result');
            return [];
        } catch (error: any) {
            this.log(`Query execution failed: ${error.message}`);
            if (error.response) {
                this.log(`Error response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            return [];
        }
    }

    /**
     * Get class information from server
     * @param className Name of the class to retrieve
     * @param outputChannel Optional output channel for logging
     */
    public async getClassInfoFromServer(className: string, outputChannel?: vscode.OutputChannel): Promise<ServerClassInfo | undefined> {
        // Check if class has already been processed
        if (this.processedClasses.has(className)) {
            this.log(`Class ${className} already processed, returning from cache`);
            return this.classInfoMap.get(className);
        }

        try {
            // Query class members
            this.log(`Starting to query class members: ${className}`);
            const members = await this.queryClassMembers(className, outputChannel);
            
            // Query superclasses
            this.log(`Starting to query superclasses: ${className}`);
            const superClasses = await this.queryClassSuperClasses(className, outputChannel);
            
            // Query if class is abstract
            this.log(`Starting to query if class is abstract: ${className}`);
            const isAbstract = await this.queryClassIsAbstract(className, outputChannel);

            // Create class info
            const classInfo: ServerClassInfo = {
                className,
                superClasses,
                members,
                isAbstract
            };

            // Store class information
            this.classInfoMap.set(className, classInfo);
            this.processedClasses.add(className);
            
            // Store class hierarchy
            this.classHierarchy.set(className, superClasses);
            
            // Recursively process superclasses
            for (const superClass of superClasses) {
                if (!this.processedClasses.has(superClass)) {
                    this.log(`Processing superclass recursively: ${superClass}`);
                    await this.getClassInfoFromServer(superClass, outputChannel);
                }
            }
            
            this.log(`Class ${className} processing completed`);
            return classInfo;
        } catch (error) {
            this.log(`Error processing class ${className}: ${error}`);
            return undefined;
        }
    }

    /**
     * Query class members
     */
    private async queryClassMembers(className: string, outputChannel?: vscode.OutputChannel): Promise<ClassMemberInfo[]> {
        this.log(`Attempting to query class members: ${className}`);
        
        try {
            // Query for properties
            const propertySql = `SELECT Name, Parameters FROM %Dictionary.PropertyDefinition WHERE Parent = '${className}'`;
            this.log(`Property query SQL: ${propertySql}`);
            
            // Execute property query
            const properties = await this.executeQuery(propertySql);
            this.log(`Found ${properties.length} properties`);
            
            // Query for methods
            const methodSql = `SELECT Name, ReturnType, FormalSpec FROM %Dictionary.MethodDefinition WHERE Parent = '${className}'`;
            this.log(`Method query SQL: ${methodSql}`);
            
            // Execute method query
            const methods = await this.executeQuery(methodSql);
            this.log(`Found ${methods.length} methods`);
            
            // Format properties to ClassMemberInfo
            const formattedProperties: ClassMemberInfo[] = properties.map((prop: any) => {
                this.log(`Processing property: ${JSON.stringify(prop, null, 2)}`);
                return {
                    Name: prop.Name,
                    Description: '',
                    Origin: className,
                    FormalSpec: null,
                    Type: prop.Parameters || null,
                    MemberType: 'property'
                };
            });
            
            // Format methods to ClassMemberInfo
            const formattedMethods: ClassMemberInfo[] = methods.map((method: any) => {
                this.log(`Processing method: ${JSON.stringify(method, null, 2)}`);
                return {
                    Name: method.Name,
                    Description: '',
                    Origin: className,
                    FormalSpec: method.FormalSpec || null,
                    Type: method.ReturnType || null,
                    MemberType: 'method'
                };
            });
            
            // Combine properties and methods
            const result = [...formattedProperties, ...formattedMethods];
            this.log(`Total members for class ${className}: ${result.length}`);
            this.log(`Complete member list: ${JSON.stringify(result, null, 2)}`);
            return result;
        } catch (error) {
            this.log(`Error querying class members: ${error}`);
            return [];
        }
    }

    /**
     * Query class superclasses
     */
    private async queryClassSuperClasses(className: string, outputChannel?: vscode.OutputChannel): Promise<string[]> {
        this.log(`Attempting to query superclasses: ${className}`);
        
        try {
            // Query for superclasses
            const superClassSql = `SELECT Super FROM %Dictionary.ClassDefinition WHERE Name = '${className}'`;
            this.log(`Superclass query SQL: ${superClassSql}`);
            
            // Execute query
            const result = await this.executeQuery(superClassSql);
            this.log(`Superclass query result: ${JSON.stringify(result, null, 2)}`);
            
            if (result && result.length > 0 && result[0].Super) {
                const superClasses = result[0].Super.split(',').map((s: string) => s.trim());
                this.log(`Found superclasses: ${JSON.stringify(superClasses)}`);
                return superClasses;
            }
            
            this.log(`Class ${className} has no superclasses`);
            return [];
        } catch (error) {
            this.log(`Error querying superclasses: ${error}`);
            return [];
        }
    }

    /**
     * Query if class is abstract
     */
    private async queryClassIsAbstract(className: string, outputChannel?: vscode.OutputChannel): Promise<boolean> {
        this.log(`Attempting to query if class is abstract: ${className}`);
        
        try {
            // Query if class is abstract
            const abstractSql = `SELECT Abstract FROM %Dictionary.ClassDefinition WHERE Name = '${className}'`;
            this.log(`Abstract class query SQL: ${abstractSql}`);
            
            // Execute query
            const result = await this.executeQuery(abstractSql, outputChannel);
            
            if (result && result.length > 0) {
                const isAbstract = result[0].Abstract === 1 || result[0].Abstract === '1' || result[0].Abstract === true;
                this.log(`Class ${className} is${isAbstract ? '' : ' not'} abstract`);
                return isAbstract;
            }
            
            this.log(`Class ${className} is not abstract (default)`);
            return false;
        } catch (error) {
            this.log(`Error querying abstract status: ${error}`);
            return false;
        }
    }

    /**
     * Get class information
     */
    public getClassInfo(className: string): ServerClassInfo | undefined {
        return this.classInfoMap.get(className);
    }

    /**
     * Get all class information
     */
    public getAllClassInfos(): Map<string, ServerClassInfo> {
        return this.classInfoMap;
    }

    /**
     * Get all superclasses for a given class
     */
    public getAllSuperClasses(className: string): string[] {
        const result: string[] = [];
        const visited = new Set<string>();
        
        const addSuperClasses = (cls: string) => {
            if (visited.has(cls)) return;
            visited.add(cls);
            
            const superClasses = this.classHierarchy.get(cls) || [];
            for (const superClass of superClasses) {
                if (!result.includes(superClass)) {
                    result.push(superClass);
                }
                addSuperClasses(superClass);
            }
        };
        
        addSuperClasses(className);
        return result;
    }

    /**
     * Get class hierarchy
     */
    public getClassHierarchy(): Map<string, string[]> {
        return this.classHierarchy;
    }
} 