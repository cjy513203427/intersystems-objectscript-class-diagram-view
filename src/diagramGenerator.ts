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
  try {
    const stats = await fs.promises.stat(uri.fsPath);
    const isDirectory = stats.isDirectory();

    if (!isDirectory && !uri.fsPath.endsWith('.cls')) {
      vscode.window.showInformationMessage('Please select a .cls file or a directory containing .cls files');
      return;
    }

    if (isDirectory) {
      const hasClsFilesInDir = await hasClsFiles(uri.fsPath);
      if (!hasClsFilesInDir) {
        vscode.window.showInformationMessage('Selected directory does not contain any .cls files');
        return;
      }
    }

    const classService = new ClassService();
    const baseDir = isDirectory ? uri.fsPath : path.dirname(uri.fsPath);
    
    // Scan all classes in the directory
    await classService.scanDirectory(baseDir);

    if (isDirectory) {
      // Generate diagram for directory
      const allClassInfos = Array.from(classService.getAllClassInfos().values());
      const classHierarchy = classService.getClassHierarchy();
      
      // Generate PUML content
      const umlContent = PlantUmlGenerator.generatePlantUmlForDirectory(allClassInfos, classHierarchy);

      // Get package name from directory path
      const getPackageName = (dirPath: string): string => {
        // Split path into parts
        const parts = dirPath.split(path.sep);
        // Find the position of apiPub
        const apiPubIndex = parts.findIndex(part => part.toLowerCase() === 'apipub');
        if (apiPubIndex !== -1) {
          // Join parts from apiPub onwards with dots
          return parts.slice(apiPubIndex).join('.');
        }
        // If apiPub not found, use directory name
        return path.basename(dirPath);
      };

      const packageName = getPackageName(uri.fsPath);
      const umlFilePath = path.join(baseDir, `${packageName}.puml`);
      await fs.promises.writeFile(umlFilePath, umlContent);
      
      vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
      await exportPng(umlFilePath);
    } else {
      // Generate diagram for single file
      const fileContent = await fs.promises.readFile(uri.fsPath, 'utf8');
      const mainClassInfo = ClassParser.parseClassContent(fileContent);
      
      // Get all parent classes
      const superClasses = classService.getAllSuperClasses(mainClassInfo.className);
      
      // Ensure all parent classes are loaded
      for (const superClass of superClasses) {
        await classService.ensureClassInfoLoaded(superClass, baseDir);
      }
      
      const relatedClasses = superClasses
        .map(className => classService.getClassInfo(className))
        .filter((info): info is NonNullable<typeof info> => info !== undefined);
      
      // Create filtered inheritance map
      const filteredHierarchy = new Map<string, string[]>();
      
      // Add main class inheritance
      filteredHierarchy.set(mainClassInfo.className, mainClassInfo.superClasses);
      
      // Add parent classes inheritance
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

      // Use full class name as file name
      const umlFilePath = path.join(baseDir, `${mainClassInfo.className}.puml`);
      await fs.promises.writeFile(umlFilePath, umlContent);
      
      vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
      await exportPng(umlFilePath);
    }
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