# InterSystems ObjectScript Class Diagram View

[English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de-DE.md)

A Visual Studio Code extension that generates UML class diagrams for InterSystems ObjectScript classes. This extension not only generates class diagrams but also provides interactive viewing and navigation capabilities.

## Features

- Generate UML class diagrams from `.cls` files
- Support for both single class and folder-level diagram generation
- Right-click context menu integration in both editor and explorer
- Visualize class relationships, properties, and methods
- Built on PlantUML for reliable diagram rendering
- Generate diagrams using PlantUML Web Server (no Java required)
- Interactive Class Diagram Browsing
  - Click on class names, properties, or methods to quickly jump to the corresponding code
  - SVG diagrams embedded in HTML for smooth interaction
  - Visual navigation of class relationships

## Requirements

| OS      | Required | Optional (for local PlantUML generation) |
|---------|---------|-----------------------------------------|
| Windows | - Visual Studio Code 1.96.0+  <br> - InterSystems ObjectScript (`.cls`) | - Java Runtime Environment (JRE) 8+ |
| Linux   | - Visual Studio Code 1.96.0+  <br> - InterSystems ObjectScript (`.cls`) | - Java Runtime Environment (JRE) 8+ <br> - Graphviz |

💡 *If using the PlantUML Web Server, Java and Graphviz are not required.*



## Installation
1. Install the extension through VS Code
![install plugin](images/install_plugin.gif)
2. Ensure you have Java Runtime Environment (JRE) installed on your system (optional if using PlantUML Web Server)
3. Restart VS Code after installation

## Usage

### Generating Class Diagrams
1. Open a `.cls` file in the editor
2. Generate a class diagram using one of these methods:
   - Press `Ctrl+Alt+U` 
   ![press shortcut](images/press_shortcut.gif)
   - Right-click the file and select "Generate Class Diagram"
   ![right click file](images/right_click_file.gif)
   - Right-click a folder containing `.cls` files and select "Generate Class Diagram"
   ![right click folder](images/right_click_folder.gif)
3. When prompted, choose your preferred generation method:
   - **Local Java**: Generates the diagram using local Java installation and displays it in VS Code
   - **PlantUML Web Server**: Generates a URL that can be opened in any browser (no Java required)

### Using PlantUML Web Server
When choosing the "PlantUML Web Server" option:
- No local Java installation is required
- The diagram is generated on the PlantUML Web Server
- You can copy the URL to clipboard or open it directly in your browser
- The URL can be shared with others to view the diagram

### Interactive Features
- Click on diagram elements to:
  - Jump to class definitions
  - View property definitions
  - Navigate to method implementations
- Support for diagram zooming and panning
- Clear visualization of class relationships

## Keyboard Shortcuts

- `Ctrl+Alt+U`: Generate class diagram for the currently open `.cls` file

## Extension Settings

This extension contributes the following commands:

* `intersystems-objectscript-class-diagram-view.generateClassDiagram`: Generate a class diagram for the selected file or folder

## Known Issues

- **External Library Navigation**: Unable to navigate to intersystem objectscript library definitions through click interactions
- **Subclass Generation**: Missing functionality to generate subclass diagrams for the current class
- **Large Project Performance**: 
  - Generating diagrams for large folders via right-click may experience significant delays
  - Generated webview/SVG for large projects lacks smooth zoom functionality and proper scaling

Please report any issues on the GitHub repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the MIT License.
