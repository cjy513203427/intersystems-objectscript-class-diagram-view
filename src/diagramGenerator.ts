import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { extractClassName, extractSuperClasses, extractAttributes, extractMethods } from './extractClassInfo';

export function generateClassDiagram(uri: vscode.Uri) {
  if (uri && uri.fsPath.endsWith('.cls')) {
    vscode.window.showInformationMessage('Generating class diagram for ' + uri.fsPath);
    parseObjectScriptFile(uri.fsPath);
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
    const superClasses = extractSuperClasses(data);
    const attributes = extractAttributes(data);
    const methods = extractMethods(data);
    generateUmlFile(filePath, className, superClasses, attributes, methods);
  });
}

function generateUmlFile(filePath: string, className: string, superClasses: string[], attributes: string[], methods: string[]) {
  const umlContent = `
@startuml
${superClasses.map(superClass => `class ${superClass} {\n}\n`).join('')}
class ${className} {
  ${attributes.map(attr => `+ ${attr}`).join('\n  ')}
  ${methods.map(method => `+ ${method}()`).join('\n  ')}
}
${superClasses.map(superClass => `${superClass} <|-- ${className}`).join('\n')}
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