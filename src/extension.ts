import * as vscode from 'vscode';
import { generateClassDiagram } from './diagramGenerator';

export function activate(context: vscode.ExtensionContext) {
  // Register the command to generate class diagram
  let generateDisposable = vscode.commands.registerCommand(
    'intersystems-objectscript-class-diagram-view.generateClassDiagram',
    (uri?: vscode.Uri) => {
      // If uri is not provided, try to get it from active editor
      if (!uri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          uri = activeEditor.document.uri;
        }
      }
      
      if (uri) {
        generateClassDiagram(uri);
      } else {
        vscode.window.showInformationMessage('Please open a .cls file first');
      }
    }
  );

  context.subscriptions.push(generateDisposable);
}

export function deactivate() {}