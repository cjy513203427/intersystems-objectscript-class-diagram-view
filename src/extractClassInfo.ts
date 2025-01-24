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