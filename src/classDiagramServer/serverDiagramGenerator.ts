import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { ServerClassService } from './service/serverClassService';
import { ServerPlantUmlGenerator } from './generator/serverPlantUmlGenerator';
import { ServerClassDiagramPanel } from './webview/ServerClassDiagramPanel';

/**
 * 确保输出目录存在
 */
async function ensureOutputDirectory(workspaceRoot: string): Promise<string> {
    const outputDir = path.join(workspaceRoot, 'out_classdiagram');
    try {
        await fs.promises.access(outputDir);
    } catch {
        await fs.promises.mkdir(outputDir, { recursive: true });
    }
    return outputDir;
}

/**
 * 从服务器生成类图
 * @param className 类名
 * @param useWebServer 是否使用PlantUML Web服务器
 */
export async function generateServerClassDiagram(className: string, useWebServer: boolean = false): Promise<void> {
    try {
        // 检查InterSystems ObjectScript扩展是否安装
        const objectScriptExtension = vscode.extensions.getExtension('intersystems-community.vscode-objectscript');
        if (!objectScriptExtension) {
            vscode.window.showErrorMessage('InterSystems ObjectScript extension is not installed. Please install it from the VS Code marketplace.');
            return;
        }

        if (!objectScriptExtension.isActive) {
            await objectScriptExtension.activate();
        }

        // 获取ObjectScript API
        const api = objectScriptExtension.exports;
        
        console.log('使用固定命名空间: IRISAPP');
        
        // 使用固定命名空间
        const selectedNamespace = 'IRISAPP';
        
        // 尝试切换命名空间
        try {
            console.log(`尝试切换到命名空间: ${selectedNamespace}`);
            
            // 尝试不同的方法切换命名空间
            if (api.serverInfo && typeof api.serverInfo.setNamespace === 'function') {
                await api.serverInfo.setNamespace(selectedNamespace);
                console.log('使用 api.serverInfo.setNamespace 切换命名空间');
            } else if (api.setNamespace && typeof api.setNamespace === 'function') {
                await api.setNamespace(selectedNamespace);
                console.log('使用 api.setNamespace 切换命名空间');
            } else if (api.conn && typeof api.conn.setNamespace === 'function') {
                await api.conn.setNamespace(selectedNamespace);
                console.log('使用 api.conn.setNamespace 切换命名空间');
            } else {
                console.log('无法直接切换命名空间，将使用固定命名空间');
            }
        } catch (error) {
            console.error('切换命名空间失败，但将继续使用固定命名空间:', error);
        }
        
        // 如果提供了类名，直接使用
        if (className) {
            console.log(`使用提供的类名: ${className}`);
        } else {
            // 如果没有提供类名，使用默认类名
            className = 'apiPub.samples.Pet';
            console.log(`使用默认类名: ${className}`);
        }

        // 获取工作区根目录
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        
        // 确保输出目录存在
        const outputDir = await ensureOutputDirectory(workspaceRoot);

        // 创建服务器类服务
        const classService = new ServerClassService();
        
        // 从服务器获取类信息
        console.log(`开始获取类信息: ${className}`);
        const mainClassInfo = await classService.getClassInfoFromServer(className);
        console.log(`主类信息: ${JSON.stringify(mainClassInfo)}`);
        
        if (!mainClassInfo) {
            vscode.window.showErrorMessage(`Failed to get class info for ${className}`);
            return;
        }
        
        // 获取所有超类
        const superClassNames = classService.getAllSuperClasses(className);
        console.log(`超类名称: ${JSON.stringify(superClassNames)}`);
        
        // 获取相关类信息
        const relatedClasses = superClassNames
            .map(name => classService.getClassInfo(name))
            .filter((info): info is NonNullable<typeof info> => info !== undefined);
        console.log(`相关类数量: ${relatedClasses.length}`);
        
        // 创建过滤后的层次结构映射
        const filteredHierarchy = new Map<string, string[]>();
        
        // 添加主类的继承关系
        filteredHierarchy.set(mainClassInfo.className, mainClassInfo.superClasses);
        
        // 添加父类的继承关系
        relatedClasses.forEach(classInfo => {
            if (classInfo.superClasses.length > 0) {
                filteredHierarchy.set(classInfo.className, classInfo.superClasses);
            }
        });
        
        console.log(`类层次结构: ${JSON.stringify(Array.from(filteredHierarchy.entries()))}`);
        
        // 生成PlantUML内容
        const umlContent = ServerPlantUmlGenerator.generatePlantUml(
            mainClassInfo,
            relatedClasses,
            filteredHierarchy
        );
        
        console.log(`生成的UML内容: ${umlContent}`);

        // 使用类名作为文件名
        const outputFileName = mainClassInfo.className.replace(/\./g, '_');
        const umlFilePath = path.join(outputDir, `${outputFileName}.puml`);
        await fs.promises.writeFile(umlFilePath, umlContent);
        
        vscode.window.showInformationMessage(`UML file generated: ${umlFilePath}`);
        
        if (useWebServer) {
            // 生成PlantUML Web服务器URL
            const plantUmlUrl = generatePlantUmlWebUrl(umlContent);
            
            // 向用户显示URL并提供复制选项
            const copyAction = 'Copy URL';
            const openAction = 'Open in Browser';
            const result = await vscode.window.showInformationMessage(
                `PlantUML diagram available at web server. You can copy the URL or open it in browser.`,
                copyAction,
                openAction
            );
            
            if (result === copyAction) {
                // 复制URL到剪贴板
                await vscode.env.clipboard.writeText(plantUmlUrl);
                vscode.window.showInformationMessage('PlantUML URL copied to clipboard');
            } else if (result === openAction) {
                // 在浏览器中打开URL
                vscode.env.openExternal(vscode.Uri.parse(plantUmlUrl));
            }
        } else {
            // 使用现有的本地Java方法
            const svgFilePath = await exportDiagram(umlFilePath);
            // 获取扩展路径
            const extensionPath = vscode.extensions.getExtension('JinyaoChen.intersystems-objectscript-class-diagram-view')?.extensionPath || 
                                 path.join(path.dirname(path.dirname(path.dirname(__dirname))));
            // 在WebView中显示图表
            ServerClassDiagramPanel.createOrShow(extensionPath, svgFilePath, classService, outputFileName);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to generate class diagram: ${err}`);
    }
}

/**
 * 从URI中提取InterSystems类名
 * @param uri 文件URI
 */
export async function getClassNameFromUri(uri: vscode.Uri): Promise<string | undefined> {
    try {
        // 检查是否是ObjectScript文件
        if (!uri.fsPath.endsWith('.cls')) {
            return undefined;
        }
        
        // 尝试使用ObjectScript扩展API获取类名
        const objectScriptExtension = vscode.extensions.getExtension('intersystems-community.vscode-objectscript');
        if (objectScriptExtension) {
            if (!objectScriptExtension.isActive) {
                await objectScriptExtension.activate();
            }
            
            const api = objectScriptExtension.exports;
            try {
                // 使用API获取类名
                return await api.serverDocumentContentProvider.getClassNameFromUri(uri);
            } catch (error) {
                console.error('Error getting class name from URI:', error);
            }
        }
        
        // 如果API调用失败或没有ObjectScript扩展，尝试从文件名中提取
        const fileName = uri.fsPath.split(/[\/\\]/).pop() || '';
        return fileName.replace('.cls', '');
    } catch (error) {
        console.error('Error extracting class name:', error);
        return undefined;
    }
}

/**
 * 导出图表为SVG
 */
async function exportDiagram(umlFilePath: string): Promise<string> {
    // 使用绝对路径
    const extensionPath = vscode.extensions.getExtension('JinyaoChen.intersystems-objectscript-class-diagram-view')?.extensionPath || 
                          path.join(path.dirname(path.dirname(path.dirname(__dirname))));
    const jarPath = path.join(extensionPath, 'lib', 'plantuml-mit-1.2025.0.jar');
    const command = `java -jar "${jarPath}" -tsvg "${umlFilePath}"`;

    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(err);
                return;
            }
            if (stderr) {
                console.error(stderr);
            }
            const svgFilePath = umlFilePath.replace('.puml', '.svg');
            vscode.window.showInformationMessage(`SVG file generated: ${svgFilePath}`);
            resolve(svgFilePath);
        });
    });
}

/**
 * 为给定的UML内容生成PlantUML Web服务器URL
 */
function generatePlantUmlWebUrl(umlContent: string): string {
    // 为URL编码PlantUML内容
    // 我们需要使用PlantUML编码算法
    const encoded = encodePlantUmlContent(umlContent);
    return `https://www.plantuml.com/plantuml/svg/${encoded}`;
}

/**
 * 编码PlantUML内容以在URL中使用
 * 这是PlantUML编码算法的简化版本
 */
function encodePlantUmlContent(content: string): string {
    try {
        // 导入zlib进行压缩
        const zlib = require('zlib');
        
        // 使用deflate压缩内容
        const deflated = zlib.deflateRawSync(Buffer.from(content, 'utf-8'), { level: 9 });
        
        // 转换为PlantUML的自定义base64变体
        return encode64(deflated);
    } catch (error) {
        console.error('Error encoding PlantUML content:', error);
        // 如果编码失败，返回一个简单的编码，显示错误信息
        return 'SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80';
    }
}

/**
 * 使用PlantUML的自定义base64变体编码缓冲区
 */
function encode64(data: Buffer): string {
    let r = '';
    // PlantUML使用与标准不同的base64表
    // 这是他们的编码表：0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_
    const encode6bit = (b: number): string => {
        if (b < 10) {
            return String.fromCharCode(48 + b);
        }
        b -= 10;
        if (b < 26) {
            return String.fromCharCode(65 + b);
        }
        b -= 26;
        if (b < 26) {
            return String.fromCharCode(97 + b);
        }
        b -= 26;
        if (b === 0) {
            return '-';
        }
        if (b === 1) {
            return '_';
        }
        return '?';
    };
    
    // 一次处理3个字节
    for (let i = 0; i < data.length; i += 3) {
        // 特殊情况：如果只剩下1或2个字节
        if (i + 2 === data.length) {
            r += encode6bit((data[i] & 0xFC) >> 2);
            r += encode6bit(((data[i] & 0x03) << 4) | ((data[i + 1] & 0xF0) >> 4));
            r += encode6bit((data[i + 1] & 0x0F) << 2);
            break;
        }
        if (i + 1 === data.length) {
            r += encode6bit((data[i] & 0xFC) >> 2);
            r += encode6bit((data[i] & 0x03) << 4);
            break;
        }
        
        // 正常情况：处理3个字节
        const b1 = data[i];
        const b2 = data[i + 1];
        const b3 = data[i + 2];
        
        r += encode6bit((b1 & 0xFC) >> 2);
        r += encode6bit(((b1 & 0x03) << 4) | ((b2 & 0xF0) >> 4));
        r += encode6bit(((b2 & 0x0F) << 2) | ((b3 & 0xC0) >> 6));
        r += encode6bit(b3 & 0x3F);
    }
    
    return r;
} 