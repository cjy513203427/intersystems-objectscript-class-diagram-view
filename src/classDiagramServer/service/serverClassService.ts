import * as vscode from 'vscode';
import { QueryData, ClassMemberInfo, ServerClassInfo } from './types';

/**
 * 服务器端类服务，用于从InterSystems服务器获取类信息
 */
export class ServerClassService {
    private classInfoMap: Map<string, ServerClassInfo> = new Map();
    private classHierarchy: Map<string, string[]> = new Map();
    private processedClasses: Set<string> = new Set();

    /**
     * 从InterSystems服务器获取类信息
     * @param className 类名
     */
    public async getClassInfoFromServer(className: string): Promise<ServerClassInfo | undefined> {
        // 检查是否已处理过该类
        if (this.processedClasses.has(className)) {
            return this.classInfoMap.get(className);
        }

        try {
            // 获取ObjectScript扩展的API
            const objectScriptApi = await this.getObjectScriptApi();
            if (!objectScriptApi) {
                vscode.window.showErrorMessage('InterSystems ObjectScript extension API not available');
                return undefined;
            }

            // 查询类成员信息
            const members = await this.queryClassMembers(objectScriptApi, className);
            if (!members) {
                return undefined;
            }

            // 查询类的超类
            const superClasses = await this.queryClassSuperClasses(objectScriptApi, className);
            
            // 查询类是否为抽象类
            const isAbstract = await this.queryClassIsAbstract(objectScriptApi, className);

            // 创建类信息
            const classInfo: ServerClassInfo = {
                className,
                superClasses,
                members,
                isAbstract
            };

            // 存储类信息
            this.processedClasses.add(className);
            this.classInfoMap.set(className, classInfo);
            this.classHierarchy.set(className, superClasses);

            // 递归处理超类
            for (const superClass of superClasses) {
                if (!this.processedClasses.has(superClass)) {
                    await this.getClassInfoFromServer(superClass);
                }
            }

            return classInfo;
        } catch (error) {
            console.error(`Error getting class info for ${className}:`, error);
            vscode.window.showErrorMessage(`Failed to get class info for ${className}: ${error}`);
            return undefined;
        }
    }

    /**
     * 获取ObjectScript扩展的API
     */
    private async getObjectScriptApi(): Promise<any> {
        const objectScriptExtension = vscode.extensions.getExtension('intersystems-community.vscode-objectscript');
        if (!objectScriptExtension) {
            vscode.window.showErrorMessage('InterSystems ObjectScript extension is not installed');
            return undefined;
        }

        if (!objectScriptExtension.isActive) {
            await objectScriptExtension.activate();
        }

        const api = objectScriptExtension.exports;
        
        // 获取当前命名空间
        try {
            let namespace = '';
            if (api.serverInfo && typeof api.serverInfo.namespace === 'string') {
                namespace = api.serverInfo.namespace;
            } else if (api.conn && api.conn.namespace) {
                namespace = api.conn.namespace;
            } else if (api.connection && api.connection.namespace) {
                namespace = api.connection.namespace;
            }
            console.log(`ServerClassService - 当前命名空间: ${namespace || '未知'}`);
        } catch (error) {
            console.error('获取命名空间失败:', error);
        }
        
        return api;
    }

    /**
     * 查询类成员信息
     * @param api ObjectScript扩展的API
     * @param className 类名
     */
    private async queryClassMembers(api: any, className: string): Promise<ClassMemberInfo[]> {
        console.log(`尝试查询类成员: ${className}`);
        
        try {
            // 尝试使用不同的API方法
            if (api.serverExecuteQuery && typeof api.serverExecuteQuery === 'function') {
                // 使用serverExecuteQuery方法
                const query: QueryData = {
                    query: "SELECT Name, Description, Origin, FormalSpec, ReturnType AS Type, 'method' AS MemberType " +
                        "FROM %Dictionary.CompiledMethod WHERE parent->ID = ? AND Abstract = 0 AND Internal = 0 AND Stub IS NULL AND ((Origin = parent->ID) OR (Origin != parent->ID AND NotInheritable = 0)) UNION ALL %PARALLEL " +
                        "SELECT Name, Description, Origin, FormalSpec, Type, 'query' AS MemberType " +
                        "FROM %Dictionary.CompiledQuery WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                        "SELECT Name, Description, Origin, NULL AS FormalSpec, Type, 'projection' AS MemberType " +
                        "FROM %Dictionary.CompiledProjection WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                        "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'index' AS MemberType " +
                        "FROM %Dictionary.CompiledIndex WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                        "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'foreignkey' AS MemberType " +
                        "FROM %Dictionary.CompiledForeignKey WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                        "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'trigger' AS MemberType " +
                        "FROM %Dictionary.CompiledTrigger WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                        "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'xdata' AS MemberType " +
                        "FROM %Dictionary.CompiledXData WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                        "SELECT Name, Description, Origin, NULL AS FormalSpec, RuntimeType AS Type, 'property' AS MemberType " +
                        "FROM %Dictionary.CompiledProperty WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                        "SELECT Name, Description, Origin, NULL AS FormalSpec, Type, 'parameter' AS MemberType " +
                        "FROM %Dictionary.CompiledParameter WHERE parent->ID = ? AND Internal = 0",
                    parameters: new Array(9).fill(className)
                };
                
                console.log('使用 serverExecuteQuery 方法查询');
                const result = await api.serverExecuteQuery(query);
                console.log(`查询结果: ${JSON.stringify(result)}`);
                return result || [];
            } else if (api.atelier && typeof api.atelier.query === 'function') {
                // 使用atelier.query方法
                const query = "SELECT Name, Description, Origin, FormalSpec, ReturnType AS Type, 'method' AS MemberType " +
                    "FROM %Dictionary.CompiledMethod WHERE parent->ID = ? AND Abstract = 0 AND Internal = 0 AND Stub IS NULL AND ((Origin = parent->ID) OR (Origin != parent->ID AND NotInheritable = 0)) UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, FormalSpec, Type, 'query' AS MemberType " +
                    "FROM %Dictionary.CompiledQuery WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, Type, 'projection' AS MemberType " +
                    "FROM %Dictionary.CompiledProjection WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'index' AS MemberType " +
                    "FROM %Dictionary.CompiledIndex WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'foreignkey' AS MemberType " +
                    "FROM %Dictionary.CompiledForeignKey WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'trigger' AS MemberType " +
                    "FROM %Dictionary.CompiledTrigger WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'xdata' AS MemberType " +
                    "FROM %Dictionary.CompiledXData WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, RuntimeType AS Type, 'property' AS MemberType " +
                    "FROM %Dictionary.CompiledProperty WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, Type, 'parameter' AS MemberType " +
                    "FROM %Dictionary.CompiledParameter WHERE parent->ID = ? AND Internal = 0";
                
                const parameters = new Array(9).fill(className);
                
                console.log('使用 atelier.query 方法查询');
                const result = await api.atelier.query(query, parameters, 'IRISAPP');
                console.log(`查询结果: ${JSON.stringify(result)}`);
                return result?.result?.content || [];
            } else if (api.serverActions && typeof api.serverActions.runQuery === 'function') {
                // 使用serverActions.runQuery方法
                const query = "SELECT Name, Description, Origin, FormalSpec, ReturnType AS Type, 'method' AS MemberType " +
                    "FROM %Dictionary.CompiledMethod WHERE parent->ID = ? AND Abstract = 0 AND Internal = 0 AND Stub IS NULL AND ((Origin = parent->ID) OR (Origin != parent->ID AND NotInheritable = 0)) UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, FormalSpec, Type, 'query' AS MemberType " +
                    "FROM %Dictionary.CompiledQuery WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, Type, 'projection' AS MemberType " +
                    "FROM %Dictionary.CompiledProjection WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'index' AS MemberType " +
                    "FROM %Dictionary.CompiledIndex WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'foreignkey' AS MemberType " +
                    "FROM %Dictionary.CompiledForeignKey WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'trigger' AS MemberType " +
                    "FROM %Dictionary.CompiledTrigger WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, NULL AS Type, 'xdata' AS MemberType " +
                    "FROM %Dictionary.CompiledXData WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, RuntimeType AS Type, 'property' AS MemberType " +
                    "FROM %Dictionary.CompiledProperty WHERE parent->ID = ? AND Internal = 0 UNION ALL %PARALLEL " +
                    "SELECT Name, Description, Origin, NULL AS FormalSpec, Type, 'parameter' AS MemberType " +
                    "FROM %Dictionary.CompiledParameter WHERE parent->ID = ? AND Internal = 0";
                
                const parameters = new Array(9).fill(className);
                
                console.log('使用 serverActions.runQuery 方法查询');
                const result = await api.serverActions.runQuery(query, parameters, 'IRISAPP');
                console.log(`查询结果: ${JSON.stringify(result)}`);
                return result || [];
            }
            
            // 如果没有可用的查询方法，返回空数组
            console.error('没有可用的查询方法');
            return [];
        } catch (error) {
            console.error(`Error querying class members for ${className}:`, error);
            return [];
        }
    }

    /**
     * 查询类的超类
     * @param api ObjectScript扩展的API
     * @param className 类名
     */
    private async queryClassSuperClasses(api: any, className: string): Promise<string[]> {
        console.log(`尝试查询超类: ${className}`);
        
        try {
            // 尝试使用不同的API方法
            if (api.serverExecuteQuery && typeof api.serverExecuteQuery === 'function') {
                // 使用serverExecuteQuery方法
                const query: QueryData = {
                    query: "SELECT Super FROM %Dictionary.CompiledClass WHERE ID = ?",
                    parameters: [className]
                };
                
                console.log('使用 serverExecuteQuery 方法查询超类');
                const result = await api.serverExecuteQuery(query);
                console.log(`超类查询结果: ${JSON.stringify(result)}`);
                if (result && result.length > 0 && result[0].Super) {
                    return result[0].Super.split(',').map((s: string) => s.trim());
                }
            } else if (api.atelier && typeof api.atelier.query === 'function') {
                // 使用atelier.query方法
                const query = "SELECT Super FROM %Dictionary.CompiledClass WHERE ID = ?";
                const parameters = [className];
                
                console.log('使用 atelier.query 方法查询超类');
                const result = await api.atelier.query(query, parameters, 'IRISAPP');
                console.log(`超类查询结果: ${JSON.stringify(result)}`);
                if (result?.result?.content && result.result.content.length > 0 && result.result.content[0].Super) {
                    return result.result.content[0].Super.split(',').map((s: string) => s.trim());
                }
            } else if (api.serverActions && typeof api.serverActions.runQuery === 'function') {
                // 使用serverActions.runQuery方法
                const query = "SELECT Super FROM %Dictionary.CompiledClass WHERE ID = ?";
                const parameters = [className];
                
                console.log('使用 serverActions.runQuery 方法查询超类');
                const result = await api.serverActions.runQuery(query, parameters, 'IRISAPP');
                console.log(`超类查询结果: ${JSON.stringify(result)}`);
                if (result && result.length > 0 && result[0].Super) {
                    return result[0].Super.split(',').map((s: string) => s.trim());
                }
            }
            
            // 如果没有可用的查询方法或查询结果为空，返回空数组
            return [];
        } catch (error) {
            console.error(`Error querying superclasses for ${className}:`, error);
            return [];
        }
    }

    /**
     * 查询类是否为抽象类
     * @param api ObjectScript扩展的API
     * @param className 类名
     */
    private async queryClassIsAbstract(api: any, className: string): Promise<boolean> {
        console.log(`尝试查询类是否为抽象类: ${className}`);
        
        try {
            // 尝试使用不同的API方法
            if (api.serverExecuteQuery && typeof api.serverExecuteQuery === 'function') {
                // 使用serverExecuteQuery方法
                const query: QueryData = {
                    query: "SELECT Abstract FROM %Dictionary.CompiledClass WHERE ID = ?",
                    parameters: [className]
                };
                
                console.log('使用 serverExecuteQuery 方法查询抽象类');
                const result = await api.serverExecuteQuery(query);
                console.log(`抽象类查询结果: ${JSON.stringify(result)}`);
                return result && result.length > 0 && result[0].Abstract === 1;
            } else if (api.atelier && typeof api.atelier.query === 'function') {
                // 使用atelier.query方法
                const query = "SELECT Abstract FROM %Dictionary.CompiledClass WHERE ID = ?";
                const parameters = [className];
                
                console.log('使用 atelier.query 方法查询抽象类');
                const result = await api.atelier.query(query, parameters, 'IRISAPP');
                console.log(`抽象类查询结果: ${JSON.stringify(result)}`);
                return result?.result?.content && result.result.content.length > 0 && result.result.content[0].Abstract === 1;
            } else if (api.serverActions && typeof api.serverActions.runQuery === 'function') {
                // 使用serverActions.runQuery方法
                const query = "SELECT Abstract FROM %Dictionary.CompiledClass WHERE ID = ?";
                const parameters = [className];
                
                console.log('使用 serverActions.runQuery 方法查询抽象类');
                const result = await api.serverActions.runQuery(query, parameters, 'IRISAPP');
                console.log(`抽象类查询结果: ${JSON.stringify(result)}`);
                return result && result.length > 0 && result[0].Abstract === 1;
            }
            
            // 如果没有可用的查询方法或查询结果为空，默认返回false
            return false;
        } catch (error) {
            console.error(`Error querying abstract status for ${className}:`, error);
            return false;
        }
    }

    /**
     * 获取类信息
     * @param className 类名
     */
    public getClassInfo(className: string): ServerClassInfo | undefined {
        return this.classInfoMap.get(className);
    }

    /**
     * 获取所有类信息
     */
    public getAllClassInfos(): Map<string, ServerClassInfo> {
        return this.classInfoMap;
    }

    /**
     * 获取所有超类
     * @param className 类名
     */
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

    /**
     * 获取类层次结构
     */
    public getClassHierarchy(): Map<string, string[]> {
        return this.classHierarchy;
    }
} 