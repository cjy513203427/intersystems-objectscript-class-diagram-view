export function extractClassName(data: string): string {
    const match = data.match(/Class ([\w.]+)/);
    if (match) {
      const classNameParts = match[1].split('.');
      return classNameParts[classNameParts.length - 1];
    }
    return 'UnknownClass';
  }
  
  export function extractAttributes(data: string): string[] {
    const matches = data.match(/Property (\w+)/g);
    return matches ? matches.map(m => m.split(' ')[1]) : [];
  }
  
  export function extractMethods(data: string): string[] {
    const matches = data.match(/Method (\w+)/g);
    return matches ? matches.map(m => m.split(' ')[1]) : [];
  }