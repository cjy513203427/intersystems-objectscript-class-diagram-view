import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('intersystems-objectscript-class-diagram-view.generateClassDiagram', (uri: vscode.Uri) => {
    if (uri && uri.fsPath.endsWith('.cls')) {
      vscode.window.showInformationMessage('Generating class diagram for ' + uri.fsPath);
      parseObjectScriptFile(uri.fsPath);
    } else {
      vscode.window.showInformationMessage('Please select a .cls file');
    }
  });

  context.subscriptions.push(disposable);
}

function parseObjectScriptFile(filePath: string) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const className = extractClassName(data);
    const attributes = extractAttributes(data);
    const methods = extractMethods(data);
    generateUmlFile(filePath, className, attributes, methods);
  });
}

function extractClassName(data: string): string {
  const match = data.match(/Class ([\w.]+)/);
  if (match) {
    const classNameParts = match[1].split('.');
    return classNameParts[classNameParts.length - 1];
  }
  return 'UnknownClass';
}

function extractAttributes(data: string): string[] {
  const matches = data.match(/Property (\w+)/g);
  return matches ? matches.map(m => m.split(' ')[1]) : [];
}

function extractMethods(data: string): string[] {
  const matches = data.match(/Method (\w+)/g);
  return matches ? matches.map(m => m.split(' ')[1]) : [];
}

function generateUmlFile(filePath: string, className: string, attributes: string[], methods: string[]) {
  const umlContent = `
@startuml
class ${className} {
  ${attributes.map(attr => `+ ${attr}`).join('\n  ')}
  ${methods.map(method => `+ ${method}()`).join('\n  ')}
}
@enduml
  `;
  const umlFilePath = filePath.replace('.cls', '.puml');
  fs.writeFile(umlFilePath, umlContent, (err) => {
    if (err) {
      console.error(err);
    } else {
      vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
    }
  });
}

export function deactivate() {}