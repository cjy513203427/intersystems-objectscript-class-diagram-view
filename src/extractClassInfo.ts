export function extractClassName(data: string): string {
  const match = data.match(/Class ([\w.]+)/);
  if (match) {
    const classNameParts = match[1].split('.');
    return classNameParts[classNameParts.length - 1];
  }
  return 'UnknownClass';
}

export function extractSuperClasses(data: string): string[] {
  const match = data.match(/Class [\w.]+ Extends \(([^)]+)\)/);
  if (match) {
    return match[1].split(',').map(superClass => {
      const superClassParts = superClass.trim().split('.');
      return superClassParts[superClassParts.length - 1].replace(/[^a-zA-Z0-9_]/g, ''); // delete special characters
    });
  }
  return [];
}

export function extractAttributes(data: string): string[] {
  const propertyMatches = data.match(/Property (\w+) As ([\w.]+)/g);
  const parameterMatches = data.match(/Parameter (\w+) = "([^"]*)"/g);
  const properties = propertyMatches ? propertyMatches.map(m => {
    const match = m.match(/Property (\w+) As ([\w.]+)/);
    return match ? `${match[1]}: ${match[2]}` : '';
  }) : [];
  const parameters = parameterMatches ? parameterMatches.map(m => {
    const match = m.match(/Parameter (\w+) = "([^"]*)"/);
    return match ? `${match[1]}: String` : ''; // Default Type is String
  }) : [];
  return [...properties, ...parameters];
}

export function extractMethods(data: string): string[] {
  const matches = data.match(/Method (\w+)\(([^)]*)\)/g);
  return matches ? matches.map(m => {
    const methodMatch = m.match(/Method (\w+)\(([^)]*)\)/);
    if (methodMatch) {
      const methodName = methodMatch[1];
      const params = methodMatch[2].split(',').map(p => p.trim()).join(', ');
      return `${methodName}(${params})`;
    }
    return '';
  }) : [];
}