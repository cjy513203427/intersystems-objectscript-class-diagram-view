import * as vscode from 'vscode';
import { RestService } from '../service/restService';
import { IClassInfo, ClassModelHelper } from './classModel';

/**
 * Parser that fetches class information from IRIS database via REST API
 */
export class ClassParser {
    private restService: RestService;
    private processedClasses: Set<string>;
    private classHierarchy: Map<string, string[]>;

    constructor() {
        this.restService = new RestService();
        this.processedClasses = new Set<string>();
        this.classHierarchy = new Map<string, string[]>();
    }

    /**
     * Parse a single class from InterSystems IRIS
     * @param className Full name of the class to parse
     * @returns Promise with class information
     */
    public async parseClass(className: string): Promise<IClassInfo> {
        try {
            // Get superclasses
            const superClasses = await this.restService.getSuperclasses(className);
            
            // Get properties
            const properties = await this.restService.getClassProperties(className);
            
            // Get parameters
            const parameters = await this.restService.getClassParameters(className);
            
            // Get methods
            const methods = await this.restService.getClassMethods(className);
            
            // Add to class hierarchy
            this.classHierarchy.set(className, superClasses);
            
            // Return class info
            return ClassModelHelper.toClassInfo(
                className,
                superClasses,
                properties,
                parameters,
                methods
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Error parsing class ${className}: ${error instanceof Error ? error.message : String(error)}`);
            // Return a minimal class info object
            return {
                className,
                superClasses: [],
                properties: [],
                parameters: [],
                methods: [],
                isAbstract: false
            };
        }
    }

    /**
     * Parse a class and its inheritance hierarchy
     * @param className Full name of the class to parse
     * @param maxDepth Maximum depth to traverse in the inheritance hierarchy
     * @returns Promise with the main class and all related classes
     */
    public async parseClassWithHierarchy(className: string, maxDepth: number = 5): Promise<{
        mainClass: IClassInfo;
        relatedClasses: IClassInfo[];
        classHierarchy: Map<string, string[]>;
    }> {
        // Reset processed classes and hierarchy
        this.processedClasses = new Set<string>();
        this.classHierarchy = new Map<string, string[]>();
        
        // Parse the main class
        const mainClass = await this.parseClass(className);
        this.processedClasses.add(className);
        
        // Process the inheritance hierarchy
        const relatedClasses: IClassInfo[] = [];
        await this.processInheritanceHierarchy(className, maxDepth, relatedClasses);
        
        return {
            mainClass,
            relatedClasses,
            classHierarchy: this.classHierarchy
        };
    }
    
    /**
     * Process the inheritance hierarchy of a class
     * @param className Full name of the class
     * @param maxDepth Maximum depth to traverse
     * @param relatedClasses Array to store related classes
     * @param currentDepth Current depth in the hierarchy
     */
    private async processInheritanceHierarchy(
        className: string,
        maxDepth: number,
        relatedClasses: IClassInfo[],
        currentDepth: number = 0
    ): Promise<void> {
        // Stop if we've reached the maximum depth
        if (currentDepth >= maxDepth) {
            return;
        }
        
        // Get superclasses of the current class
        const superClasses = this.classHierarchy.get(className) || [];
        
        // Process each superclass
        for (const superClass of superClasses) {
            // Skip if we've already processed this class
            if (this.processedClasses.has(superClass)) {
                continue;
            }
            
            // Parse the superclass
            const classInfo = await this.parseClass(superClass);
            relatedClasses.push(classInfo);
            this.processedClasses.add(superClass);
            
            // Process the superclass's hierarchy
            await this.processInheritanceHierarchy(superClass, maxDepth, relatedClasses, currentDepth + 1);
        }
    }
} 