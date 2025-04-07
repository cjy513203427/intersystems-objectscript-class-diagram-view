import { IClassInfo, IClassMethod, IClassProperty, IClassParameter } from '../parser/classModel';

/**
 * Generator for creating PlantUML diagrams from class information
 */
export class PlantUmlGenerator {

    /**
     * Format a property for PlantUML display
     * @param property Property to format
     * @returns Formatted property string
     */
    private static formatProperty(property: IClassProperty): string {
        return `+ ${property.name}: ${property.type}`;
    }

    /**
     * Format a parameter for PlantUML display
     * @param parameter Parameter to format
     * @returns Formatted parameter string
     */
    private static formatParameter(parameter: IClassParameter): string {
        return `+ ${parameter.name}`;
    }

    /**
     * Format a method for PlantUML display
     * @param method Method to format
     * @returns Formatted method string
     */
    private static formatMethod(method: IClassMethod): string {
        // Extract parameter names and types from formal spec
        let formattedParams = '';
        if (method.parameters) {
            // Format parameters in a simplified way for now
            formattedParams = method.parameters
                .split(',')
                .map(param => param.trim())
                .join(', ');
        }
        
        return `+ ${method.name}(${formattedParams}): ${method.returnType || 'void'}`;
    }

    /**
     * Checks if the class has any members (properties, parameters or methods)
     * @param classInfo Class information
     * @returns True if class has members
     */
    private static hasMembers(classInfo: IClassInfo): boolean {
        return classInfo.properties.length > 0 || 
               classInfo.parameters.length > 0 || 
               classInfo.methods.length > 0;
    }

    /**
     * Generates the member section of a class definition
     * @param classInfo Class information
     * @returns Formatted member section
     */
    private static generateMembers(classInfo: IClassInfo): string {
        const { properties, parameters, methods } = classInfo;
        
        const formattedProperties = properties.map(prop => 
            this.formatProperty(prop)
        );
        
        const formattedParameters = parameters.map(param => 
            this.formatParameter(param)
        );
        
        const formattedMethods = methods.map(method => 
            this.formatMethod(method)
        );
        
        return [
            ...formattedProperties,
            ...formattedParameters,
            ...formattedMethods
        ].map(member => `  ${member}`).join('\n');
    }

    /**
     * Generates a class definition in PlantUML format
     * @param classInfo Class information
     * @returns PlantUML class definition
     */
    private static generateClassDefinition(classInfo: IClassInfo): string {
        const className = classInfo.className;
        
        if (this.hasMembers(classInfo)) {
            return `${classInfo.isAbstract ? 'abstract ' : ''}class "${className}" {
${this.generateMembers(classInfo)}
}\n`;
        }
        
        return `${classInfo.isAbstract ? 'abstract ' : ''}class "${className}"\n`;
    }

    /**
     * Generates inheritance relationships between classes
     * @param classHierarchy Map of class names to their superclasses
     * @returns PlantUML inheritance relationships
     */
    private static generateInheritanceRelations(classHierarchy: Map<string, string[]>): string {
        const relations = new Set<string>();
        
        classHierarchy.forEach((parents, cls) => {
            parents.forEach(parent => {
                relations.add(`"${parent}" <|-- "${cls}"`);
            });
        });
        
        return Array.from(relations).join('\n');
    }

    /**
     * Generates PlantUML diagram for a single class and its inheritance hierarchy
     * @param mainClass Main class information
     * @param relatedClasses Related classes information
     * @param classHierarchy Map of class names to their superclasses
     * @returns Complete PlantUML diagram
     */
    public static generatePlantUml(
        mainClass: IClassInfo, 
        relatedClasses: IClassInfo[], 
        classHierarchy: Map<string, string[]>
    ): string {
        // Generate definitions for all related classes
        const relatedClassDefinitions = relatedClasses
            .map(classInfo => this.generateClassDefinition(classInfo))
            .join('');

        return `@startuml
!pragma diagramType class
scale max 2000 width
skinparam dpi 150
skinparam nodesep 50
skinparam ranksep 50
set namespaceSeparator none
hide empty members

' Add click style for classes
skinparam class {
    BackgroundColor<<click>> White
    BorderColor<<click>> Blue
}

${relatedClassDefinitions}${this.generateClassDefinition(mainClass)}
${this.generateInheritanceRelations(classHierarchy)}
@enduml`;
    }
} 