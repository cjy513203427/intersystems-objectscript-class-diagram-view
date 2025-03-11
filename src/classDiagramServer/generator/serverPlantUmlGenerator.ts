import { ServerClassInfo, ClassMemberInfo } from '../service/types';

/**
 * Server-side PlantUML generator for class diagrams
 */
export class ServerPlantUmlGenerator {
    /**
     * Check if class has members
     */
    private static hasMembers(classInfo: ServerClassInfo): boolean {
        return classInfo.members.length > 0;
    }

    /**
     * Generate class members section
     */
    private static generateMembers(classInfo: ServerClassInfo): string {
        const properties = classInfo.members
            .filter(member => member.MemberType === 'property')
            .map(member => `  + ${member.Name}: ${member.Type || 'Any'}`);
        
        const methods = classInfo.members
            .filter(member => member.MemberType === 'method')
            .map(member => {
                const params = member.FormalSpec ? 
                    member.FormalSpec.split(',').map(p => p.trim()).join(', ') : '';
                return `  + ${member.Name}(${params}): ${member.Type || 'Void'}`;
            });
        
        return `${properties.join('\n')}${properties.length > 0 && methods.length > 0 ? '\n' : ''}${methods.join('\n')}`;
    }

    /**
     * Generate class definition
     */
    private static generateClassDefinition(classInfo: ServerClassInfo): string {
        const className = classInfo.className;
        
        if (this.hasMembers(classInfo)) {
            return `${classInfo.isAbstract ? 'abstract ' : ''}class "${className}" {
${this.generateMembers(classInfo)}
}\n`;
        }
        return `${classInfo.isAbstract ? 'abstract ' : ''}class "${className}"\n`;
    }

    /**
     * Generate inheritance relationships between classes
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
     * Generate PlantUML diagram for a single class and its inheritance hierarchy
     */
    public static generatePlantUml(mainClass: ServerClassInfo, relatedClasses: ServerClassInfo[], classHierarchy: Map<string, string[]>): string {
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

    /**
     * Generate PlantUML diagram for all classes in a directory
     */
    public static generatePlantUmlForDirectory(allClasses: ServerClassInfo[], classHierarchy: Map<string, string[]>): string {
        // Generate definitions for all classes
        const classDefinitions = allClasses
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

${classDefinitions}
${this.generateInheritanceRelations(classHierarchy)}
@enduml`;
    }
} 