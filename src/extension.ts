import * as vscode from 'vscode';
import { generateClassDiagram } from './diagramGenerator';

export function activate(context: vscode.ExtensionContext) {
  // Register the command to generate class diagram
  let generateDisposable = vscode.commands.registerCommand(
    'intersystems-objectscript-class-diagram-view.generateClassDiagram',
    (uri: vscode.Uri) => {
      generateClassDiagram(uri);
    }
  );

  context.subscriptions.push(generateDisposable);
}

export function deactivate() {}