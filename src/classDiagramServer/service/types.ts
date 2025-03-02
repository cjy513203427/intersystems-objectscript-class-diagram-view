/**
 * 定义从InterSystems服务器查询的数据结构
 */
export interface QueryData {
    query: string;
    parameters: any[];
}

/**
 * 定义从InterSystems服务器返回的类成员信息
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
 * 定义类信息
 */
export interface ServerClassInfo {
    className: string;
    superClasses: string[];
    members: ClassMemberInfo[];
    isAbstract: boolean;
} 