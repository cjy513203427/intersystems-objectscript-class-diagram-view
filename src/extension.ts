import * as vscode from 'vscode';
import { generateClassDiagram } from './classDiagramLocal/diagramGenerator';
import { generateServerClassDiagram, getClassNameFromUri } from './classDiagramServer/serverDiagramGenerator';

export function activate(context: vscode.ExtensionContext) {
  // Register the command to generate class diagram
  let generateLocalDisposable = vscode.commands.registerCommand(
    'intersystems-objectscript-class-diagram-view.generateClassDiagram',
    async (uri?: vscode.Uri) => {
      // If uri is not provided, try to get it from active editor
      if (!uri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          uri = activeEditor.document.uri;
        }
      }
      
      if (uri) {
        // Ask user to choose generation method
        const choice = await vscode.window.showQuickPick(
          [
            { label: 'Local Java', description: 'Generate diagram using local Java installation' },
            { label: 'PlantUML Web Server', description: 'Generate diagram using PlantUML Web Server (no Java required)' }
          ],
          { placeHolder: 'Choose how to generate the diagram' }
        );
        
        if (choice?.label === 'Local Java') {
          // Use local Java generation
          generateClassDiagram(uri, false);
        } else if (choice?.label === 'PlantUML Web Server') {
          // Use PlantUML Web Server
          generateClassDiagram(uri, true);
        }
      } else {
        vscode.window.showInformationMessage('Please open a .cls file first');
      }
    }
  );

  // Register the command to generate InterSystems class diagram
  let generateServerDisposable = vscode.commands.registerCommand(
    'intersystems-objectscript-class-diagram-view.generateIntersystemsClassDiagram',
    async (uri?: vscode.Uri) => {
      // If uri is not provided, try to get it from active editor
      if (!uri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          uri = activeEditor.document.uri;
        }
      }
      
      if (uri) {
        // 从URI中提取类名
        let className = await getClassNameFromUri(uri) || '';
        
        if (!className) {
          // 如果无法从URI中提取类名，提示用户输入
          className = await vscode.window.showInputBox({
            prompt: 'Enter the InterSystems class name (e.g., %String, %Library.DynamicObject)',
            placeHolder: '%Library.DynamicObject'
          }) || '';
        }
        
        if (className) {
          // Ask user to choose generation method
          const choice = await vscode.window.showQuickPick(
            [
              { label: 'Local Java', description: 'Generate diagram using local Java installation' },
              { label: 'PlantUML Web Server', description: 'Generate diagram using PlantUML Web Server (no Java required)' }
            ],
            { placeHolder: 'Choose how to generate the diagram' }
          );
          
          if (choice?.label === 'Local Java') {
            // Use local Java generation
            generateServerClassDiagram(className, false);
          } else if (choice?.label === 'PlantUML Web Server') {
            // Use PlantUML Web Server
            generateServerClassDiagram(className, true);
          }
        }
      } else {
        vscode.window.showInformationMessage('Please open a .cls file first');
      }
    }
  );

  context.subscriptions.push(generateLocalDisposable);
  context.subscriptions.push(generateServerDisposable);
}

export function deactivate() {}