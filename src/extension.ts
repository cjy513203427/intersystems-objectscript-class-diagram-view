import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('intersystems-objectscript-class-diagram-view.generateClassDiagram', () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
	  vscode.window.showInformationMessage('Scanning folders');
      const rootPath = workspaceFolders[0].uri.fsPath;
      scanDirectory(rootPath);
    } else {
      vscode.window.showInformationMessage('No workspace folder open');
    }
  });

  context.subscriptions.push(disposable);
}

function scanDirectory(dir: string) {
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }
    files.forEach(file => {
      const filePath = path.join(dir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(err);
          return;
        }
        if (stats.isDirectory()) {
          scanDirectory(filePath);
        } else if (filePath.endsWith('.cls')) {
          parseObjectScriptFile(filePath);
        }
      });
    });
  });
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