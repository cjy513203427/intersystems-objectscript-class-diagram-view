import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { extractClassName, extractSuperClasses, extractAttributes, extractMethods, scanDirectory, getAllSuperClasses } from './extractClassInfo';

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
    const superClasses = getAllSuperClasses(className); // Get all super classes recursively
    const attributes = extractAttributes(data);
    const methods = extractMethods(data);
    generateUmlFile(filePath, className, superClasses, attributes, methods);
  });
}

function generateUmlFile(filePath: string, className: string, superClasses: string[], attributes: string[], methods: string[]) {
  const sanitizedClassName = className.replace(/\./g, '_');
  const sanitizedSuperClasses = superClasses.map(superClass => superClass.replace(/\./g, '_'));
  
  const umlContent = `
@startuml
${generateClassDefinitions(sanitizedSuperClasses)}
class ${sanitizedClassName} {
  ${attributes.map(attr => `+ ${attr}`).join('\n  ')}
  ${methods.map(method => `+ ${method}`).join('\n  ')}
}
${generateInheritanceRelations(sanitizedClassName, sanitizedSuperClasses)}
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

function generateClassDefinitions(superClasses: string[]): string {
  const classDefinitions = new Set<string>();
  superClasses.forEach(superClass => {
    classDefinitions.add(`class ${superClass} {\n}\n`);
  });
  return Array.from(classDefinitions).join('');
}

function generateInheritanceRelations(className: string, superClasses: string[]): string {
  const inheritanceRelations = new Set<string>();

  function addInheritanceRelations(currentClass: string, superClasses: string[]) {
    superClasses.forEach(superClass => {
      const relation = `${superClass} <|-- ${currentClass}`;
      if (!inheritanceRelations.has(relation)) {
        inheritanceRelations.add(relation);
        addInheritanceRelations(superClass, getAllSuperClasses(superClass));
      }
    });
  }

  addInheritanceRelations(className, superClasses);

  // Filter out redundant relations
  const filteredRelations = new Set<string>();
  inheritanceRelations.forEach(relation => {
    const [superClass, subClass] = relation.split(' <|-- ');
    if (!Array.from(inheritanceRelations).some(r => r.startsWith(`${superClass} <|--`) && r !== relation && r.endsWith(` <|-- ${subClass}`))) {
      filteredRelations.add(relation);
    }
  });

  return Array.from(filteredRelations).join('\n');
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