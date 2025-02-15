# InterSystems ObjectScript 类图查看器

[English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de-DE.md)

一个用于生成 InterSystems ObjectScript 类 UML 图的 Visual Studio Code 扩展。这个扩展不仅能生成类图，还提供了交互式的查看和导航功能。

## 特性

- 生成 `.cls` 文件的 UML 类图
- 支持单个类和文件夹级别的图表生成
- 提供编辑器和资源管理器的右键菜单集成
- 可视化类关系、属性和方法
- 基于 PlantUML 实现可靠的图表渲染
- 交互式类图浏览
  - 点击类名、属性或方法可快速跳转到相应代码
  - SVG 图表内嵌在 HTML 中，提供流畅的交互体验
  - 支持类之间关系的可视化导航

## 要求

- Visual Studio Code 1.96.0 或更高版本
- Java 运行时环境 (JRE)，用于 PlantUML 图表生成
- InterSystems ObjectScript 文件 (`.cls`)

## 安装

1. 通过 VS Code Marketplace 安装扩展
2. 确保系统上已安装 Java 运行时环境 (JRE)
3. 安装后重启 VS Code

## 使用方法

### 生成类图
1. 在编辑器中打开 `.cls` 文件
2. 使用以下方式之一生成类图：
   - 按快捷键 `Ctrl+Alt+U`
   - 右键点击文件并选择 "生成类图"
   - 右键点击包含 `.cls` 文件的文件夹并选择 "生成类图"

### 交互式功能
- 点击类图中的元素可以：
  - 跳转到类定义
  - 查看属性定义
  - 导航到方法实现
- 图表支持缩放和平移操作
- 类之间的关系清晰可见

## 快捷键

- `Ctrl+Alt+U`: 为当前打开的 `.cls` 文件生成类图

## 扩展设置

此扩展提供以下命令：

* `intersystems-objectscript-class-diagram-view.generateClassDiagram`: 为选定的文件或文件夹生成类图

## 已知问题

请在 GitHub 仓库上报告任何问题。

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

此扩展基于 MIT 许可证。

## 发布说明

### 0.0.1

InterSystems ObjectScript 类图查看器的初始发布
- 基本类图生成功能
- 支持单文件和文件夹处理
- 上下文菜单集成
- 快捷键支持
- 交互式类图浏览功能 