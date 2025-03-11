import { ServerClassInfo, ClassMemberInfo } from '../service/types';
import { ServerClassService } from '../service/serverClassService';
import * as vscode from 'vscode';

/**
 * Class diagram generator based on database queries
 */
export class ServerDatabaseQueryGenerator {
    public classService: ServerClassService;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.classService = new ServerClassService();
        this.outputChannel = vscode.window.createOutputChannel('InterSystems Class Diagram SQL');
        this.outputChannel.show();
    }

    /**
     * Output log message to output channel
     * @param message Log message
     */
    public log(message: string): void {
        this.outputChannel.appendLine(message);
        console.log(message);
    }

    /**
     * Get class information from database
     * @param className Name of the class
     */
    public async getClassInfoFromDatabase(className: string): Promise<ServerClassInfo | undefined> {
        this.log(`Starting to get class information from database: ${className}`);
        const classInfo = await this.classService.getClassInfoFromServer(className, this.outputChannel);
        
        if (classInfo) {
            this.log(`Successfully retrieved class information: ${className}`);
            this.log(`Class information details: ${JSON.stringify(classInfo, null, 2)}`);
        } else {
            this.log(`Unable to get class information: ${className}`);
        }
        
        return classInfo;
    }

    /**
     * Get all superclasses of a class
     * @param className Name of the class
     */
    public getAllSuperClasses(className: string): string[] {
        return this.classService.getAllSuperClasses(className);
    }

    /**
     * Get class information
     * @param className Name of the class
     */
    public getClassInfo(className: string): ServerClassInfo | undefined {
        return this.classService.getClassInfo(className);
    }

    /**
     * Get all class information
     */
    public getAllClassInfos(): Map<string, ServerClassInfo> {
        return this.classService.getAllClassInfos();
    }

    /**
     * Get class hierarchy
     */
    public getClassHierarchy(): Map<string, string[]> {
        return this.classService.getClassHierarchy();
    }

    /**
     * Generate class diagram
     * @param mainClassName Name of the main class
     */
    public async generateClassDiagram(mainClassName: string): Promise<{
        mainClassInfo: ServerClassInfo;
        relatedClasses: ServerClassInfo[];
        filteredHierarchy: Map<string, string[]>;
    } | undefined> {
        try {
            // 从数据库获取主类信息
            const mainClassInfo = await this.getClassInfoFromDatabase(mainClassName);
            
            if (!mainClassInfo) {
                this.log(`无法获取类信息: ${mainClassName}`);
                return undefined;
            }
            
            // 获取所有父类
            const superClassNames = this.getAllSuperClasses(mainClassName);
            this.log(`父类名称: ${JSON.stringify(superClassNames)}`);
            
            // 获取相关类信息
            const relatedClasses = superClassNames
                .map(name => this.getClassInfo(name))
                .filter((info): info is NonNullable<typeof info> => info !== undefined);
            this.log(`相关类数量: ${relatedClasses.length}`);
            
            // 创建过滤后的层次结构映射
            const filteredHierarchy = new Map<string, string[]>();
            
            // 添加主类继承关系
            filteredHierarchy.set(mainClassInfo.className, mainClassInfo.superClasses);
            
            // 添加父类继承关系
            relatedClasses.forEach(classInfo => {
                if (classInfo.superClasses.length > 0) {
                    filteredHierarchy.set(classInfo.className, classInfo.superClasses);
                }
            });
            
            this.log(`类层次结构: ${JSON.stringify(Array.from(filteredHierarchy.entries()))}`);
            
            return {
                mainClassInfo,
                relatedClasses,
                filteredHierarchy
            };
        } catch (error) {
            this.log(`生成类图时出错: ${error}`);
            return undefined;
        }
    }
} 