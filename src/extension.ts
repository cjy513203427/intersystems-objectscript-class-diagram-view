import * as vscode from 'vscode';
import { generateClassDiagram } from './classDiagramLocal/diagramGenerator';
import { ClassDiagramServer } from './classDiagramServer';

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

  // Register the command to test IRIS REST connection
  let testIrisConnectionDisposable = vscode.commands.registerCommand(
    'intersystems-objectscript-class-diagram-view.testIrisConnection',
    async (uri?: vscode.Uri) => {
      // If uri is not provided, try to get it from active editor
      if (!uri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          uri = activeEditor.document.uri;
        }
      }
      
      if (uri) {
        // 从URI中提取类名或请求用户输入
        let className = await getFullClassNameFromUri(uri) || '';
        
        if (!className) {
          // 如果无法从URI中提取类名，提示用户输入
          className = await vscode.window.showInputBox({
            prompt: 'Enter the InterSystems class name for connection test (e.g., %String, %Library.DynamicObject)',
            placeHolder: '%Library.DynamicObject'
          }) || '';
        }
        
        if (className) {
          try {
            // 显示测试开始消息
            vscode.window.showInformationMessage(`Testing IRIS connection with class: ${className}`);
            
            // 创建服务器实例并测试连接
            const classDiagramServer = new ClassDiagramServer();
            await classDiagramServer.testConnection(className);
            
            // 显示成功消息
            vscode.window.showInformationMessage(`Connection test successful for class: ${className}`);
          } catch (error) {
            // 显示错误消息
            vscode.window.showErrorMessage(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          vscode.window.showInformationMessage('No class name provided. Test canceled.');
        }
      } else {
        vscode.window.showInformationMessage('Please open a .cls file first');
      }
    }
  );

  context.subscriptions.push(generateLocalDisposable);
  context.subscriptions.push(generateServerDisposable);
  context.subscriptions.push(testIrisConnectionDisposable);
}

export function deactivate() {}

/**
 * Generate a class diagram using server mode
 * @param className Full class name
 * @param useWebServer Whether to use the PlantUML web server instead of local Java
 */
async function generateServerClassDiagram(className: string, useWebServer: boolean): Promise<void> {
  try {
    const classDiagramServer = new ClassDiagramServer();
    await classDiagramServer.generateClassDiagram(className, useWebServer);
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating server class diagram: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get full class name from URI (file path)
 * @param uri URI of the .cls file
 * @returns The full class name or undefined
 */
async function getFullClassNameFromUri(uri: vscode.Uri): Promise<string | undefined> {
  if (uri.fsPath.endsWith('.cls')) {
    // Read the file content
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      
      // Try to extract class name from Class ... Extends pattern
      const classMatch = /^Class\s+([^\s]+)\s+Extends/im.exec(text);
      if (classMatch && classMatch[1]) {
        return classMatch[1];
      }
      
      // Fallback to file path based extraction
      const parts = uri.fsPath.split(/[/\\]/);
      const fileName = parts[parts.length - 1];
      if (fileName.endsWith('.cls')) {
        // Remove .cls extension
        return fileName.substring(0, fileName.length - 4);
      }
    } catch (error) {
      console.error('Error reading class file:', error);
    }
  }
  
  return undefined;
}