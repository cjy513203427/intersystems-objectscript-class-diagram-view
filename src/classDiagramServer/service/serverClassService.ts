import * as vscode from 'vscode';
import { QueryData, ClassMemberInfo, ServerClassInfo } from './types';

/**
 * Server-side class service for retrieving class information from InterSystems server
 */
export class ServerClassService {
    private classInfoMap: Map<string, ServerClassInfo> = new Map();
    private classHierarchy: Map<string, string[]> = new Map();
    private processedClasses: Set<string> = new Set();

    /**
     * Execute SQL query using ObjectScript API
     * @param api ObjectScript API instance
     * @param sql SQL query to execute
     * @param outputChannel Optional output channel for logging
     */
    private async executeQuery(api: any, sql: string, outputChannel?: vscode.OutputChannel): Promise<any[]> {
        try {
            let result: any;
            
            // Attempt to use different API methods
            if (api.serverExecuteQuery && typeof api.serverExecuteQuery === 'function') {
                // Use serverExecuteQuery method
                const query: QueryData = {
                    query: sql,
                    parameters: []
                };
                
                this.log('Using serverExecuteQuery method', outputChannel);
                result = await api.serverExecuteQuery(query);
                this.log(`Query result: ${JSON.stringify(result)}`, outputChannel);
                result = result?.result?.content || result;
            } else if (api.atelier && typeof api.atelier.query === 'function') {
                // Use atelier.query method
                this.log('Using atelier.query method', outputChannel);
                result = await api.atelier.query(sql, []);
                this.log(`Query result: ${JSON.stringify(result)}`, outputChannel);
                result = result?.result?.content;
            } else if (api.serverActions && typeof api.serverActions.runQuery === 'function') {
                // Use serverActions.runQuery method
                this.log('Using serverActions.runQuery method', outputChannel);
                result = await api.serverActions.runQuery(sql, []);
                this.log(`Query result: ${JSON.stringify(result)}`, outputChannel);
            }
            
            return result || [];
        } catch (error) {
            this.log(`Error executing query: ${error}`, outputChannel);
            return [];
        }
    }

    /**
     * Get class information from InterSystems server
     * @param className Class name
     * @param outputChannel Optional output channel for logging
     */
    public async getClassInfoFromServer(className: string, outputChannel?: vscode.OutputChannel): Promise<ServerClassInfo | undefined> {
        // Check if the class has already been processed
        if (this.processedClasses.has(className)) {
            this.log(`Class ${className} already processed, returning from cache`, outputChannel);
            return this.classInfoMap.get(className);
        }

        try {
            // Get ObjectScript extension API
            const objectScriptApi = await this.getObjectScriptApi();
            if (!objectScriptApi) {
                this.log('InterSystems ObjectScript extension API not available', outputChannel);
                vscode.window.showErrorMessage('InterSystems ObjectScript extension API not available');
                return undefined;
            }

            // Query class members
            this.log(`Starting to query class members: ${className}`, outputChannel);
            const members = await this.queryClassMembers(objectScriptApi, className, outputChannel);
            if (!members) {
                this.log(`Unable to get members for class ${className}`, outputChannel);
                return undefined;
            }

            // Query class superclasses
            this.log(`Starting to query superclasses: ${className}`, outputChannel);
            const superClasses = await this.queryClassSuperClasses(objectScriptApi, className, outputChannel);
            
            // Query if class is abstract
            this.log(`Starting to query if class is abstract: ${className}`, outputChannel);
            const isAbstract = await this.queryClassIsAbstract(objectScriptApi, className, outputChannel);

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
                    this.log(`Processing superclass recursively: ${superClass}`, outputChannel);
                    await this.getClassInfoFromServer(superClass, outputChannel);
                }
            }
            
            this.log(`Class ${className} processing completed`, outputChannel);
            return classInfo;
        } catch (error) {
            this.log(`Error processing class ${className}: ${error}`, outputChannel);
            return undefined;
        }
    }

    /**
     * Log message to output channel
     */
    private log(message: string, outputChannel?: vscode.OutputChannel): void {
        console.log(message);
        if (outputChannel) {
            outputChannel.appendLine(message);
        }
    }

    /**
     * Get ObjectScript extension API
     */
    private async getObjectScriptApi(): Promise<any> {
        try {
            const extension = vscode.extensions.getExtension('intersystems-community.vscode-objectscript');
            if (!extension) {
                vscode.window.showErrorMessage('InterSystems ObjectScript extension not found');
                return undefined;
            }

            if (!extension.isActive) {
                await extension.activate();
            }

            return extension.exports;
        } catch (error) {
            vscode.window.showErrorMessage(`Error getting ObjectScript API: ${error}`);
            return undefined;
        }
    }

    /**
     * Query class members
     */
    private async queryClassMembers(api: any, className: string, outputChannel?: vscode.OutputChannel): Promise<ClassMemberInfo[]> {
        this.log(`Attempting to query class members: ${className}`, outputChannel);
        
        try {
            // Query for properties
            const propertySql = `SELECT Name, Parameters FROM %Dictionary.PropertyDefinition WHERE Parent = '${className}'`;
            this.log(`Property query SQL: ${propertySql}`, outputChannel);
            
            // Execute property query
            const properties = await this.executeQuery(api, propertySql, outputChannel);
            this.log(`Found ${properties.length} properties`, outputChannel);
            
            // Query for methods
            const methodSql = `SELECT Name, ReturnType, FormalSpec FROM %Dictionary.MethodDefinition WHERE Parent = '${className}'`;
            this.log(`Method query SQL: ${methodSql}`, outputChannel);
            
            // Execute method query
            const methods = await this.executeQuery(api, methodSql, outputChannel);
            this.log(`Found ${methods.length} methods`, outputChannel);
            
            // Format properties to ClassMemberInfo
            const formattedProperties: ClassMemberInfo[] = properties.map((prop: any) => {
                this.log(`Processing property: ${JSON.stringify(prop, null, 2)}`, outputChannel);
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
                this.log(`Processing method: ${JSON.stringify(method, null, 2)}`, outputChannel);
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
            this.log(`Total members for class ${className}: ${result.length}`, outputChannel);
            this.log(`Complete member list: ${JSON.stringify(result, null, 2)}`, outputChannel);
            return result;
        } catch (error) {
            this.log(`Error querying class members: ${error}`, outputChannel);
            return [];
        }
    }

    /**
     * Query class superclasses
     */
    private async queryClassSuperClasses(api: any, className: string, outputChannel?: vscode.OutputChannel): Promise<string[]> {
        this.log(`Attempting to query superclasses: ${className}`, outputChannel);
        
        try {
            // Query for superclasses
            const superClassSql = `SELECT Super FROM %Dictionary.ClassDefinition WHERE Name = '${className}'`;
            this.log(`Superclass query SQL: ${superClassSql}`, outputChannel);
            
            // Execute query
            const result = await this.executeQuery(api, superClassSql, outputChannel);
            this.log(`Superclass query result: ${JSON.stringify(result, null, 2)}`, outputChannel);
            
            if (result && result.length > 0 && result[0].Super) {
                const superClasses = result[0].Super.split(',').map((s: string) => s.trim());
                this.log(`Found superclasses: ${JSON.stringify(superClasses)}`, outputChannel);
                return superClasses;
            }
            
            this.log(`Class ${className} has no superclasses`, outputChannel);
            return [];
        } catch (error) {
            this.log(`Error querying superclasses: ${error}`, outputChannel);
            return [];
        }
    }

    /**
     * Query if class is abstract
     */
    private async queryClassIsAbstract(api: any, className: string, outputChannel?: vscode.OutputChannel): Promise<boolean> {
        this.log(`Attempting to query if class is abstract: ${className}`, outputChannel);
        
        try {
            // Query if class is abstract
            const abstractSql = `SELECT Abstract FROM %Dictionary.ClassDefinition WHERE Name = '${className}'`;
            this.log(`Abstract class query SQL: ${abstractSql}`, outputChannel);
            
            // Execute query
            const result = await this.executeQuery(api, abstractSql, outputChannel);
            
            if (result && result.length > 0) {
                const isAbstract = result[0].Abstract === 1 || result[0].Abstract === '1' || result[0].Abstract === true;
                this.log(`Class ${className} is${isAbstract ? '' : ' not'} abstract`, outputChannel);
                return isAbstract;
            }
            
            this.log(`Class ${className} is not abstract (default)`, outputChannel);
            return false;
        } catch (error) {
            this.log(`Error querying abstract status: ${error}`, outputChannel);
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