import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { ClassService } from './service/classService';
import { ClassParser } from './parser/classParser';
import { PlantUmlGenerator } from './generator/plantUmlGenerator';

export async function generateClassDiagram(uri: vscode.Uri) {
  if (!uri || !uri.fsPath.endsWith('.cls')) {
    vscode.window.showInformationMessage('Please select a .cls file');
    return;
  }

  try {
    const classService = new ClassService();
    const baseDir = path.dirname(uri.fsPath);
    
    // First scan the immediate directory
    await classService.scanDirectory(baseDir);
    
    // Read and parse the main class
    const fileContent = await fs.promises.readFile(uri.fsPath, 'utf8');
    const mainClassInfo = ClassParser.parseClassContent(fileContent);
    
    // Get all superclasses
    const superClasses = classService.getAllSuperClasses(mainClassInfo.className);
    
    // Ensure all superclasses are loaded
    for (const superClass of superClasses) {
      await classService.ensureClassInfoLoaded(superClass, baseDir);
    }
    
    const relatedClasses = superClasses
      .map(className => classService.getClassInfo(className))
      .filter((info): info is NonNullable<typeof info> => info !== undefined);
    
    // Create a filtered hierarchy map that includes the inheritance chain
    const filteredHierarchy = new Map<string, string[]>();
    
    // Add main class's inheritance
    filteredHierarchy.set(mainClassInfo.className, mainClassInfo.superClasses);
    
    // Add parent classes' inheritance
    relatedClasses.forEach(classInfo => {
      if (classInfo.superClasses.length > 0) {
        filteredHierarchy.set(classInfo.className, classInfo.superClasses);
      }
    });
    
    const umlContent = PlantUmlGenerator.generatePlantUml(
      mainClassInfo,
      relatedClasses,
      filteredHierarchy
    );

    const umlFilePath = uri.fsPath.replace('.cls', '.puml');
    await fs.promises.writeFile(umlFilePath, umlContent);
    
    vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
    await exportPng(umlFilePath);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to generate class diagram: ${err}`);
  }
}

async function exportPng(umlFilePath: string): Promise<void> {
  const jarPath = path.join(__dirname, '..', 'lib', 'plantuml-mit-1.2025.0.jar');
  const command = `java -jar "${jarPath}" -tpng "${umlFilePath}"`;

  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }
      if (stderr) {
        console.error(stderr);
      }
      const pngFilePath = umlFilePath.replace('.puml', '.png');
      vscode.window.showInformationMessage(`PNG file generated: ${pngFilePath}`);
      resolve();
    });
  });
}