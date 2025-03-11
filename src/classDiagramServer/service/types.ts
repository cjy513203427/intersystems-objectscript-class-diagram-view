/**
 * Define query data structure for InterSystems server
 */
export interface QueryData {
    query: string;
    parameters: any[];
}

/**
 * Define class member information returned from InterSystems server
 */
export interface ClassMemberInfo {
    Name: string;
    Description: string;
    Origin: string;
    FormalSpec: string | null;
    Type: string | null;
    MemberType: 'method' | 'query' | 'projection' | 'index' | 'foreignkey' | 'trigger' | 'xdata' | 'property' | 'parameter';
}

/**
 * Define class information
 */
export interface ServerClassInfo {
    className: string;
    superClasses: string[];
    members: ClassMemberInfo[];
    isAbstract: boolean;
} 