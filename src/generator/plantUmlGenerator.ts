import { IClassInfo } from '../parser/classParser';

export class PlantUmlGenerator {
  /**
   * Escapes special characters in class names for PlantUML compatibility
   */
  private static escapeClassName(name: string): string {
    return name;
  }

  /**
   * Checks if the class has any members (attributes or methods)
   */
  private static hasMembers(classInfo: IClassInfo): boolean {
    return classInfo.attributes.length > 0 || classInfo.methods.length > 0;
  }

  /**
   * Generates the member section of a class definition
   */
  private static generateMembers(classInfo: IClassInfo): string {
    const { attributes, methods } = classInfo;
    return `${attributes.map(attr => `  + ${attr}`).join('\n')}${attributes.length > 0 && methods.length > 0 ? '\n' : ''}${methods.map(method => `  + ${method}`).join('\n')}`;
  }

  /**
   * Generates a class definition in PlantUML format
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
   */
  public static generatePlantUml(mainClass: IClassInfo, relatedClasses: IClassInfo[], classHierarchy: Map<string, string[]>): string {
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
   * Generates PlantUML diagram for all classes in a directory
   */
  public static generatePlantUmlForDirectory(allClasses: IClassInfo[], classHierarchy: Map<string, string[]>): string {
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