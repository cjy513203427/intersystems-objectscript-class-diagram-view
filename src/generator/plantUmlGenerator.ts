import { IClassInfo } from '../parser/classParser';

export class PlantUmlGenerator {
  private static hasMembers(classInfo: IClassInfo): boolean {
    return classInfo.attributes.length > 0 || classInfo.methods.length > 0;
  }

  private static generateMembers(classInfo: IClassInfo): string {
    const { attributes, methods } = classInfo;
    return `${attributes.map(attr => `  + ${attr}`).join('\n')}${attributes.length > 0 && methods.length > 0 ? '\n' : ''}${methods.map(method => `  + ${method}`).join('\n')}`;
  }

  private static generateClassDefinition(classInfo: IClassInfo): string {
    const className = classInfo.className;
    if (this.hasMembers(classInfo)) {
      return `${classInfo.isAbstract ? 'abstract ' : ''}class "class:${className}" as ${className} {
${this.generateMembers(classInfo)}
}\n`;
    }
    return `${classInfo.isAbstract ? 'abstract ' : ''}class "class:${className}" as ${className}\n`;
  }

  private static generateInheritanceRelations(classHierarchy: Map<string, string[]>): string {
    const relations = new Set<string>();
    classHierarchy.forEach((parents, cls) => {
      parents.forEach(parent => {
        relations.add(`${parent} <|-- ${cls}`);
      });
    });
    return Array.from(relations).join('\n');
  }

  public static generatePlantUml(mainClass: IClassInfo, relatedClasses: IClassInfo[], classHierarchy: Map<string, string[]>): string {
    // Generate definitions for all related classes
    const relatedClassDefinitions = relatedClasses
      .map(classInfo => this.generateClassDefinition(classInfo))
      .join('');

    return `@startuml
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

  public static generatePlantUmlForDirectory(allClasses: IClassInfo[], classHierarchy: Map<string, string[]>): string {
    // Generate definitions for all classes
    const classDefinitions = allClasses
      .map(classInfo => this.generateClassDefinition(classInfo))
      .join('');

    return `@startuml
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