import * as fs from 'fs';
import * as path from 'path';
import { IClassInfo, ClassParser } from '../parser/classParser';

export class ClassService {
  private classInfoMap: Map<string, IClassInfo> = new Map();
  private classHierarchy: Map<string, string[]> = new Map();
  private processedClasses: Set<string> = new Set();

  public async scanDirectory(dir: string): Promise<void> {
    const files = await fs.promises.readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.promises.stat(filePath);
      
      if (stats.isDirectory()) {
        await this.scanDirectory(filePath);
      } else if (filePath.endsWith('.cls')) {
        await this.parseObjectScriptFile(filePath);
      }
    }
  }

  private async parseObjectScriptFile(filePath: string): Promise<void> {
    const data = await fs.promises.readFile(filePath, 'utf8');
    const classInfo = ClassParser.parseClassContent(data);
    
    if (!this.processedClasses.has(classInfo.className)) {
      this.processedClasses.add(classInfo.className);
      this.classInfoMap.set(classInfo.className, classInfo);
      this.classHierarchy.set(classInfo.className, classInfo.superClasses);

      // Recursively process parent classes if they haven't been processed
      for (const parentClass of classInfo.superClasses) {
        if (!this.processedClasses.has(parentClass)) {
          // Try to find and parse the parent class file
          const parentFilePath = await this.findClassFile(path.dirname(filePath), parentClass);
          if (parentFilePath) {
            await this.parseObjectScriptFile(parentFilePath);
          } else {
            console.log(`Warning: Could not find parent class file for ${parentClass}`);
          }
        }
      }
    }
  }

  private async findClassFile(baseDir: string, className: string): Promise<string | undefined> {
    // For system classes (starting with %), create a placeholder class info
    if (className.startsWith('%')) {
      if (!this.processedClasses.has(className)) {
        this.processedClasses.add(className);
        const systemClassInfo: IClassInfo = {
          className,
          superClasses: [],
          attributes: [],
          methods: [],
          isAbstract: false
        };
        this.classInfoMap.set(className, systemClassInfo);
      }
      return undefined;
    }

    const classPath = className.replace(/\./g, path.sep) + '.cls';
    
    // Build a list of directories to search, starting from the most specific to the most general
    const searchDirs: string[] = [];
    let currentDir = baseDir;
    
    // Add current directory and its parents
    while (currentDir.length > 3) { // Stop at drive root (e.g., "C:\")
      searchDirs.push(currentDir);
      currentDir = path.dirname(currentDir);
    }

    // For each search directory, try different relative paths
    for (const searchDir of searchDirs) {
      const possiblePaths = [
        path.join(searchDir, classPath),
        path.join(searchDir, 'src', classPath),
        path.join(searchDir, '..', classPath),
        path.join(searchDir, '..', 'src', classPath),
        // Try to find in parallel directories
        ...className.split('.').slice(0, -1).map(segment => 
          path.join(searchDir, '..', segment, classPath)
        )
      ];

      for (const filePath of possiblePaths) {
        try {
          await fs.promises.access(filePath);
          return filePath;
        } catch {
          continue;
        }
      }
    }
    
    // If class not found, store an empty class info to prevent further searches
    if (!this.processedClasses.has(className)) {
      this.processedClasses.add(className);
      const emptyClassInfo: IClassInfo = {
        className,
        superClasses: [],
        attributes: [],
        methods: [],
        isAbstract: false
      };
      this.classInfoMap.set(className, emptyClassInfo);
    }
    
    return undefined;
  }

  public getClassInfo(className: string): IClassInfo | undefined {
    return this.classInfoMap.get(className);
  }

  public getAllClassInfos(): Map<string, IClassInfo> {
    return this.classInfoMap;
  }

  public getAllSuperClasses(className: string): string[] {
    const allSuperClasses = new Set<string>();

    const addSuperClasses = (cls: string) => {
      const superClasses = this.classHierarchy.get(cls) || [];
      superClasses.forEach(superClass => {
        if (!allSuperClasses.has(superClass)) {
          allSuperClasses.add(superClass);
          addSuperClasses(superClass);
        }
      });
    };

    addSuperClasses(className);
    return Array.from(allSuperClasses);
  }

  public getClassHierarchy(): Map<string, string[]> {
    return this.classHierarchy;
  }

  public async ensureClassInfoLoaded(className: string, baseDir: string): Promise<void> {
    if (!this.processedClasses.has(className)) {
      const classFilePath = await this.findClassFile(baseDir, className);
      if (classFilePath) {
        await this.parseObjectScriptFile(classFilePath);
      }
    }
  }
} 