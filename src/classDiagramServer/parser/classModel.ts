/**
 * Represents a property of a class
 */
export interface IClassProperty {
    name: string;
    type: string;
}

/**
 * Represents a method of a class
 */
export interface IClassMethod {
    name: string;
    returnType: string;
    parameters: string;
}

/**
 * Represents a class in the object model
 */
export interface IClassInfo {
    className: string;
    superClasses: string[];
    properties: IClassProperty[];
    methods: IClassMethod[];
    isAbstract: boolean;
}

/**
 * Helper class with methods to convert between database results and class model
 */
export class ClassModelHelper {
    /**
     * Determine if a class is abstract
     * Currently assuming classes are not abstract as we don't have this info from the database
     * This could be enhanced with additional queries
     */
    public static isAbstract(className: string): boolean {
        // For now, assume no classes are abstract since we don't have that info
        // This could be enhanced with additional queries
        return false;
    }

    /**
     * Convert property database result to IClassProperty model
     */
    public static toClassProperty(dbProperty: any): IClassProperty {
        return {
            name: dbProperty.Name || '',
            type: dbProperty.Type || 'any'
        };
    }

    /**
     * Convert method database result to IClassMethod model
     */
    public static toClassMethod(dbMethod: any): IClassMethod {
        return {
            name: dbMethod.Name || '',
            returnType: dbMethod.ReturnType || 'void',
            parameters: dbMethod.FormalSpec || ''
        };
    }

    /**
     * Convert database results to IClassInfo model
     */
    public static toClassInfo(
        className: string,
        superClasses: string[], 
        properties: any[], 
        methods: any[]
    ): IClassInfo {
        return {
            className,
            superClasses,
            properties: properties.map(p => this.toClassProperty(p)),
            methods: methods.map(m => this.toClassMethod(m)),
            isAbstract: this.isAbstract(className)
        };
    }
} 