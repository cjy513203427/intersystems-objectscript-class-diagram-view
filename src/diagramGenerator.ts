import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { extractClassName, extractSuperClasses, extractAttributes, extractMethods, scanDirectory, getAllSuperClasses, inheritanceMap } from './extractClassInfo';

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
    
    // Get direct parent classes for each related class
    [className, ...allRelatedClasses].forEach(cls => {
      classHierarchy.set(cls, inheritanceMap[cls] || []);
    });
    
    const attributes = extractAttributes(data);
    const methods = extractMethods(data);
    generateUmlFile(filePath, className, Array.from(classHierarchy.entries()), attributes, methods);
  });
}

function generateUmlFile(filePath: string, className: string, classHierarchy: [string, string[]][], attributes: string[], methods: string[]) {
  const sanitizedClassName = className.replace(/\./g, '_');
  const allClasses = new Set(classHierarchy.flatMap(([cls, parents]) => [cls, ...parents]));
  
  const umlContent = `
@startuml
${generateClassDefinitions(Array.from(allClasses).filter(cls => cls !== sanitizedClassName))}
class ${sanitizedClassName} {
  ${attributes.map(attr => `+ ${attr}`).join('\n  ')}
  ${methods.map(method => `+ ${method}`).join('\n  ')}
}
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

function generateClassDefinitions(classes: string[]): string {
  const classDefinitions = new Set<string>();
  classes.forEach(className => {
    classDefinitions.add(`class ${className} {\n}\n`);
  });
  return Array.from(classDefinitions).join('');
}

function generateInheritanceRelations(classHierarchy: [string, string[]][]): string {
  const relations = new Set<string>();
  classHierarchy.forEach(([cls, parents]) => {
    parents.forEach(parent => {
      relations.add(`${parent} <|-- ${cls}`);
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