import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { extractClassName, extractSuperClasses, extractAttributes, extractMethods, scanDirectory, getAllSuperClasses, inheritanceMap, getClassContent, abstractClassMap } from './extractClassInfo';

export function generateClassDiagram(uri: vscode.Uri) {
  if (uri && uri.fsPath.endsWith('.cls')) {
    vscode.window.showInformationMessage('Generating class diagram for ' + uri.fsPath);
    scanDirectory(path.dirname(uri.fsPath)).then(() => {
      parseObjectScriptFile(uri.fsPath);
    }).catch(err => {
      vscode.window.showErrorMessage('Failed to scan directory: ' + err);
    });
  } else {
    vscode.window.showInformationMessage('Please select a .cls file');
  }
}

function parseObjectScriptFile(filePath: string) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const className = extractClassName(data);
    const allRelatedClasses = getAllSuperClasses(className); // Get all related parent classes
    const classHierarchy = new Map<string, string[]>();
    const classAttributes = new Map<string, string[]>();
    const classMethods = new Map<string, string[]>();
    
    // Get direct parent classes for each related class
    [className, ...allRelatedClasses].forEach(cls => {
      classHierarchy.set(cls, inheritanceMap[cls] || []);
      
      // Extract attributes and methods for each class
      const classContent = getClassContent(cls);
      if (classContent) {
        classAttributes.set(cls, extractAttributes(classContent));
        classMethods.set(cls, extractMethods(classContent));
      }
    });
    
    // Extract attributes and methods for the current class
    classAttributes.set(className, extractAttributes(data));
    classMethods.set(className, extractMethods(data));
    
    generateUmlFile(filePath, className, Array.from(classHierarchy.entries()), classAttributes, classMethods);
  });
}

function generateUmlFile(
  filePath: string, 
  className: string, 
  classHierarchy: [string, string[]][], 
  classAttributes: Map<string, string[]>,
  classMethods: Map<string, string[]>
) {
  const allClasses = new Set(classHierarchy.flatMap(([cls, parents]) => [cls, ...parents]));
  const isAbstract = abstractClassMap[className];
  
  const umlContent = `
@startuml
set namespaceSeparator none
hide empty members

${generateClassDefinitions(Array.from(allClasses).filter(cls => cls !== className), classAttributes, classMethods)}${hasMembers(className, classAttributes, classMethods) ? 
`${isAbstract ? 'abstract ' : ''}class "${className}" {
${generateMembers(className, classAttributes, classMethods)}
}` : 
`${isAbstract ? 'abstract ' : ''}class "${className}"`}

${generateInheritanceRelations(classHierarchy)}
@enduml
`;

  const umlFilePath = filePath.replace('.cls', '.puml');
  fs.writeFile(umlFilePath, umlContent, (err) => {
    if (err) {
      console.error(err);
    } else {
      vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
      exportPng(umlFilePath);
    }
  });
}

function hasMembers(className: string, classAttributes: Map<string, string[]>, classMethods: Map<string, string[]>): boolean {
  const attributes = classAttributes.get(className) || [];
  const methods = classMethods.get(className) || [];
  return attributes.length > 0 || methods.length > 0;
}

function generateMembers(className: string, classAttributes: Map<string, string[]>, classMethods: Map<string, string[]>): string {
  const attributes = classAttributes.get(className) || [];
  const methods = classMethods.get(className) || [];
  return `${attributes.map(attr => `  + ${attr}`).join('\n')}${attributes.length > 0 && methods.length > 0 ? '\n' : ''}${methods.map(method => `  + ${method}`).join('\n')}`;
}

function generateClassDefinitions(
  classes: string[], 
  classAttributes: Map<string, string[]>,
  classMethods: Map<string, string[]>
): string {
  const classDefinitions = new Set<string>();
  classes.forEach(className => {
    const isAbstract = abstractClassMap[className];
    if (hasMembers(className, classAttributes, classMethods)) {
      classDefinitions.add(`${isAbstract ? 'abstract ' : ''}class "${className}" {
${generateMembers(className, classAttributes, classMethods)}
}\n`);
    } else {
      classDefinitions.add(`${isAbstract ? 'abstract ' : ''}class "${className}"\n`);
    }
  });
  return Array.from(classDefinitions).join('');
}

function generateInheritanceRelations(classHierarchy: [string, string[]][]): string {
  const relations = new Set<string>();
  classHierarchy.forEach(([cls, parents]) => {
    parents.forEach(parent => {
      relations.add(`"${parent}" <|-- "${cls}"`);
    });
  });
  return Array.from(relations).join('\n');
}

function exportPng(umlFilePath: string) {
  const jarPath = path.join(__dirname, '..', 'lib', 'plantuml-mit-1.2025.0.jar');
  const pngFilePath = umlFilePath.replace('.puml', '.png');
  const command = `java -jar "${jarPath}" -tpng "${umlFilePath}"`;

  console.log(`Executing command: ${command}`);

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      vscode.window.showErrorMessage(`Failed to generate PNG file: ${err}`);
      return;
    }
    if (stderr) {
      console.error(stderr);
    }
    vscode.window.showInformationMessage(`PNG file generated: ${pngFilePath}`);
  });
}