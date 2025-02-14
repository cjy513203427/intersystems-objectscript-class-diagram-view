export interface IClassInfo {
  className: string;
  superClasses: string[];
  attributes: string[];
  methods: string[];
  isAbstract: boolean;
}

export class ClassParser {
  private static extractClassName(data: string): string {
    const match = data.match(/Class ([\w.]+)/);
    return match ? match[1] : 'UnknownClass';
  }

  private static extractSuperClasses(data: string): string[] {
    const match = data.match(/Class [\w.]+ Extends \(([^)]+)\)/);
    if (match) {
      return match[1].split(',').map(superClass => {
        const trimmed = superClass.trim();
        // Keep the % prefix for system classes
        return trimmed.startsWith('%') ? trimmed : trimmed.replace(/%/g, '');
      });
    }
    const singleMatch = data.match(/Class [\w.]+ Extends ([\w.%]+)/);
    if (singleMatch) {
      const trimmed = singleMatch[1].trim();
      // Keep the % prefix for system classes
      return [trimmed.startsWith('%') ? trimmed : trimmed.replace(/%/g, '')];
    }
    return [];
  }

  private static extractAttributes(data: string): string[] {
    const propertyMatches = data.match(/Property (\w+) As ([\w.%() ]+(?:\([^)]*\))?)/g);
    const parameterMatches = data.match(/Parameter (\w+) = "([^"]*)"/g);
    const indexMatches = data.match(/Index (\w+) On (\w+)/g);
    
    const properties = propertyMatches ? propertyMatches.map(m => {
      const match = m.match(/Property (\w+) As ([\w.%() ]+(?:\([^)]*\))?)/);
      if (match) {
        const propertyName = match[1];
        let fullType = match[2].trim();
        
        // deal with list and array types
        if (fullType.toLowerCase().startsWith('list of ')) {
          const elementType = fullType.replace(/list of /i, '').split('(')[0].trim();
          return `${propertyName}: list Of ${elementType}`;
        } else if (fullType.toLowerCase().startsWith('array of ')) {
          const elementType = fullType.replace(/array of /i, '').split('(')[0].trim();
          return `${propertyName}: array Of ${elementType}`;
        }
        
        // remove (JsonName) part
        const typeWithoutJsonName = fullType.split('(')[0].trim();
        return `${propertyName}: ${typeWithoutJsonName}`;
      }
      return '';
    }) : [];
    
    const parameters = parameterMatches ? parameterMatches.map(m => {
      const match = m.match(/Parameter (\w+) = "([^"]*)"/);
      return match ? `${match[1]}: String` : '';
    }) : [];
    
    const indexes = indexMatches ? indexMatches.map(m => {
      const match = m.match(/Index (\w+) On (\w+)/);
      return match ? `Index ${match[1]} On ${match[2]}` : '';
    }) : [];
    
    return [...properties, ...parameters, ...indexes];
  }

  private static extractMethods(data: string): string[] {
    const matches = data.match(/Method (\w+)\(([^)]*)\)/g);
    return matches ? matches.map(m => {
      const methodMatch = m.match(/Method (\w+)\(([^)]*)\)/);
      if (methodMatch) {
        return `${methodMatch[1]}()`;
      }
      return '';
    }) : [];
  }

  private static isAbstractClass(data: string): boolean {
    const classDefMatch = data.match(/Class [\w.]+ Extends [^[{]+ \[(.*?)\]/);
    if (classDefMatch) {
      const attributes = classDefMatch[1].split(',').map(attr => attr.trim());
      return attributes.includes('Abstract');
    }
    return false;
  }

  public static parseClassContent(data: string): IClassInfo {
    return {
      className: this.extractClassName(data),
      superClasses: this.extractSuperClasses(data),
      attributes: this.extractAttributes(data),
      methods: this.extractMethods(data),
      isAbstract: this.isAbstractClass(data)
    };
  }
} 