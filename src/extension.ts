import * as vscode from 'vscode';
import { generateClassDiagram } from './diagramGenerator';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('intersystems-objectscript-class-diagram-view.generateClassDiagram', (uri: vscode.Uri) => {
    generateClassDiagram(uri);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}