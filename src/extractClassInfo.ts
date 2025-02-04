import * as fs from 'fs';
import * as path from 'path';

export const inheritanceMap: { [key: string]: string[] } = {};
export const classContentMap: { [key: string]: string } = {};
export const abstractClassMap: { [key: string]: boolean } = {};

export function extractClassName(data: string): string {
  const match = data.match(/Class ([\w.]+)/);
  if (match) {
    return match[1].replace(/\./g, '_');
  }
  return 'UnknownClass';
}

export function extractSuperClasses(data: string): string[] {
  const match = data.match(/Class [\w.]+ Extends \(([^)]+)\)/);
  if (match) {
    return match[1].split(',').map(superClass => superClass.trim().replace(/%/g, '').replace(/\./g, '_'));
  }
  const singleMatch = data.match(/Class [\w.]+ Extends ([\w.%]+)/);
  if (singleMatch) {
    return [singleMatch[1].trim().replace(/%/g, '').replace(/\./g, '_')];
  }
  return [];
}

export function extractAttributes(data: string): string[] {
  const propertyMatches = data.match(/Property (\w+) As ([\w.%()]+)/g);
  const parameterMatches = data.match(/Parameter (\w+) = "([^"]*)"/g);
  const indexMatches = data.match(/Index (\w+) On (\w+)/g);
  
  const properties = propertyMatches ? propertyMatches.map(m => {
    const match = m.match(/Property (\w+) As ([\w.%()]+)/);
    if (match) {
      const type = match[2].split('(')[0].replace(/%/g, '').replace(/\./g, '_');
      return `${match[1]}: ${type}`;
    }
    return '';
  }) : [];
  
  const parameters = parameterMatches ? parameterMatches.map(m => {
    const match = m.match(/Parameter (\w+) = "([^"]*)"/);
    return match ? `${match[1]}: String` : ''; // Default Type is String
  }) : [];
  
  const indexes = indexMatches ? indexMatches.map(m => {
    const match = m.match(/Index (\w+) On (\w+)/);
    return match ? `Index ${match[1]} On ${match[2]}` : '';
  }) : [];
  
  return [...properties, ...parameters, ...indexes];
}

export function extractMethods(data: string): string[] {
  const matches = data.match(/Method (\w+)\(([^)]*)\)/g);
  return matches ? matches.map(m => {
    const methodMatch = m.match(/Method (\w+)\(([^)]*)\)/);
    if (methodMatch) {
      const methodName = methodMatch[1];
      return `${methodName}()`;
    }
    return '';
  }) : [];
}

export function isAbstractClass(data: string): boolean {
  // Match all possible class definition patterns
  const classDefMatch = data.match(/Class [\w.]+ Extends [^[{]+ \[(.*?)\]/);
  if (classDefMatch) {
    const attributes = classDefMatch[1].split(',').map(attr => attr.trim());
    return attributes.includes('Abstract');
  }
  return false;
}

function parseObjectScriptFile(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }
      const className = extractClassName(data);
      const superClasses = extractSuperClasses(data);
      inheritanceMap[className] = superClasses;
      classContentMap[className] = data;
      abstractClassMap[className] = isAbstractClass(data); // Store whether the class is abstract
      resolve();
    });
  });
}

export function scanDirectory(dir: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }
      const promises = files.map(file => {
        const filePath = path.join(dir, file);
        return new Promise<void>((resolve, reject) => {
          fs.stat(filePath, (err, stats) => {
            if (err) {
              console.error(err);
              reject(err);
              return;
            }
            if (stats.isDirectory()) {
              scanDirectory(filePath).then(resolve).catch(reject);
            } else if (filePath.endsWith('.cls')) {
              parseObjectScriptFile(filePath).then(resolve).catch(reject);
            } else {
              resolve();
            }
          });
        });
      });
      Promise.all(promises).then(() => resolve()).catch(reject);
    });
  });
}

export function getAllSuperClasses(className: string): string[] {
  const superClasses = inheritanceMap[className] || [];
  const allSuperClasses = new Set<string>();

  function addSuperClasses(classes: string[]) {
    classes.forEach(cls => {
      if (!allSuperClasses.has(cls)) {
        allSuperClasses.add(cls);
        addSuperClasses(inheritanceMap[cls] || []);
      }
    });
  }

  addSuperClasses(superClasses);
  return Array.from(allSuperClasses);
}

export function getClassContent(className: string): string {
  return classContentMap[className] || '';
}