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
    if (this.hasMembers(classInfo)) {
      return `${classInfo.isAbstract ? 'abstract ' : ''}class "${classInfo.className}" {
${this.generateMembers(classInfo)}
}\n`;
    }
    return `${classInfo.isAbstract ? 'abstract ' : ''}class "${classInfo.className}"\n`;
  }

  private static generateInheritanceRelations(classHierarchy: Map<string, string[]>): string {
    const relations = new Set<string>();
    classHierarchy.forEach((parents, cls) => {
      parents.forEach(parent => {
        relations.add(`"${parent}" <|-- "${cls}"`);
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
set namespaceSeparator none
hide empty members

${relatedClassDefinitions}${this.generateClassDefinition(mainClass)}
${this.generateInheritanceRelations(classHierarchy)}
@enduml`;
  }
} 