import { ServerClassInfo, ClassMemberInfo } from '../service/types';

/**
 * 服务器端PlantUML生成器，用于生成类图
 */
export class ServerPlantUmlGenerator {
    /**
     * 检查类是否有成员
     */
    private static hasMembers(classInfo: ServerClassInfo): boolean {
        return classInfo.members.length > 0;
    }

    /**
     * 生成类成员部分
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
     * 生成类定义
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
     * 生成类之间的继承关系
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
     * 为单个类及其继承层次结构生成PlantUML图
     */
    public static generatePlantUml(mainClass: ServerClassInfo, relatedClasses: ServerClassInfo[], classHierarchy: Map<string, string[]>): string {
        // 生成所有相关类的定义
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
     * 为目录中的所有类生成PlantUML图
     */
    public static generatePlantUmlForDirectory(allClasses: ServerClassInfo[], classHierarchy: Map<string, string[]>): string {
        // 生成所有类的定义
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