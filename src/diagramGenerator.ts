import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { ClassService } from './service/classService';
import { ClassParser } from './parser/classParser';
import { PlantUmlGenerator } from './generator/plantUmlGenerator';

async function hasClsFiles(dirPath: string): Promise<boolean> {
  try {
    const files = await fs.promises.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.promises.stat(filePath);
      if (stats.isDirectory()) {
        const hasChildClsFiles = await hasClsFiles(filePath);
        if (hasChildClsFiles) {
          return true;
        }
      } else if (file.endsWith('.cls')) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Error checking for .cls files:', err);
    return false;
  }
}

export async function generateClassDiagram(uri: vscode.Uri) {
  if (!uri || (!uri.fsPath.endsWith('.cls') && !fs.statSync(uri.fsPath).isDirectory())) {
    vscode.window.showInformationMessage('Please select a .cls file or a directory containing .cls files');
    return;
  }

  try {
    // Check for .cls files in directory
    if (fs.statSync(uri.fsPath).isDirectory()) {
      const hasClsFilesInDir = await hasClsFiles(uri.fsPath);
      if (!hasClsFilesInDir) {
        vscode.window.showInformationMessage('Selected directory does not contain any .cls files');
        return;
      }
    }

    const classService = new ClassService();
    const baseDir = fs.statSync(uri.fsPath).isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);
    
    // First scan the immediate directory
    await classService.scanDirectory(baseDir);

    let umlContent: string;
    let outputFileName: string;
    
    if (fs.statSync(uri.fsPath).isDirectory()) {
      // Generate diagram for directory
      const allClassInfos = Array.from(classService.getAllClassInfos().values());
      if (allClassInfos.length === 0) {
        vscode.window.showInformationMessage('No valid class files found in the selected directory');
        return;
      }

      const classHierarchy = classService.getClassHierarchy();
      
      // Generate PUML content
      umlContent = PlantUmlGenerator.generatePlantUmlForDirectory(allClassInfos, classHierarchy);

      // Get full package name from the directory name
      outputFileName = path.basename(uri.fsPath).split(path.sep).join('.');
      
      // Walk up the directory tree to build the full package name
      let currentDir = path.dirname(uri.fsPath);
      while (currentDir && currentDir !== baseDir && path.basename(currentDir) !== 'src') {
        const parentDir = path.basename(currentDir);
        if (parentDir) {
          outputFileName = parentDir + '.' + outputFileName;
        }
        currentDir = path.dirname(currentDir);
      }
    } else {
      // Generate diagram for single file
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
      
      umlContent = PlantUmlGenerator.generatePlantUml(
        mainClassInfo,
        relatedClasses,
        filteredHierarchy
      );

      // Use class name as file name
      outputFileName = mainClassInfo.className;
    }

    const umlFilePath = path.join(baseDir, `${outputFileName}.puml`);
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