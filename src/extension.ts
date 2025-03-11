import * as vscode from 'vscode';
import { generateClassDiagram } from './classDiagramLocal/diagramGenerator';
import { 
  generateServerClassDiagram, 
  getFullClassNameFromUri,
  generateDatabaseQueryClassDiagram
} from './classDiagramServer/serverDiagramGenerator';

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
        let className = await getFullClassNameFromUri(uri) || '';
        
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

  // Register the command to generate InterSystems class diagram using database query
  let generateDatabaseQueryDisposable = vscode.commands.registerCommand(
    'intersystems-objectscript-class-diagram-view.generateDatabaseQueryClassDiagram',
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
        let className = await getFullClassNameFromUri(uri) || '';
        
        if (!className) {
          // 如果无法从URI中提取类名，提示用户输入
          className = await vscode.window.showInputBox({
            prompt: '输入InterSystems类名 (例如, %String, %Library.DynamicObject)',
            placeHolder: '%Library.DynamicObject'
          }) || '';
        }
        
        if (className) {
          // Ask user to choose generation method
          const choice = await vscode.window.showQuickPick(
            [
              { label: 'Local Java', description: '使用本地Java安装生成图表' },
              { label: 'PlantUML Web Server', description: '使用PlantUML Web服务器生成图表 (无需Java)' }
            ],
            { placeHolder: '选择如何生成图表' }
          );
          
          if (choice?.label === 'Local Java') {
            // Use local Java generation
            generateDatabaseQueryClassDiagram(className, false);
          } else if (choice?.label === 'PlantUML Web Server') {
            // Use PlantUML Web Server
            generateDatabaseQueryClassDiagram(className, true);
          }
        }
      } else {
        vscode.window.showInformationMessage('请先输入类名');
      }
    }
  );

  context.subscriptions.push(generateLocalDisposable);
  context.subscriptions.push(generateServerDisposable);
  context.subscriptions.push(generateDatabaseQueryDisposable);
}

export function deactivate() {}