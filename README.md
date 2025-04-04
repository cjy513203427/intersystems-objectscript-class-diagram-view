# InterSystems ObjectScript Class Diagram View

[English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de-DE.md)

A Visual Studio Code extension for generating UML class diagrams for InterSystems ObjectScript classes. This extension not only generates class diagrams but also provides interactive display and navigation features.

## Features

- Generation of UML class diagrams from `.cls` files
- Support for class and folder-level diagram generation
- Context menu integration in both editor and explorer
- Visualization of class relationships, properties, and methods
- Based on PlantUML for reliable diagram representation
- Generate diagrams with PlantUML Web Server (no Java installation required)
- **NEW:** Direct integration with InterSystems IRIS for server-side class information
- **NEW:** Browse classes directly in IRIS Documatic from the diagram
- Interactive class diagram navigation
  - Click on class names, properties, or methods to quickly jump to corresponding code
  - SVG diagrams embedded in HTML for smooth interaction
  - Visual navigation of class relationships

## Requirements

| Operating System | Required | Optional (for local PlantUML generation) |
|---------|---------|-----------------------------------------|
| Windows | - VSCode 1.96.0+  <br> - ObjectScript class files(`.cls`) | - Java 8+ |
| Linux   | - VSCode 1.96.0+  <br> - ObjectScript class files(`.cls`) | - Java 8+ <br> - Graphviz |

💡 *When using the PlantUML Web Server, Java and Graphviz are not required.*

## Installation
1. Install the extension from VS Code
![Install Plugin](images/install_plugin.gif)
2. Ensure Java Runtime Environment (JRE) is installed on your system (optional when using PlantUML Web Server)
3. Restart VS Code after installation

## Usage

### Generating Class Diagrams
1. Open a `.cls` file in the editor
2. Generate a class diagram using one of these methods:
   - Press `Ctrl+Alt+U`
   ![Press Shortcut](images/press_shortcut.gif)
   - Right-click on the file and select "Generate Class Diagram"
   ![Right Click File](images/right_click_file.gif)
   - Right-click on a folder containing `.cls` files and select "Generate Class Diagram"
   ![Right Click Folder](images/right_click_folder.gif)
3. When prompted, select your preferred generation method:
   - **Local Java**: Generates the diagram using local Java installation and displays it in VS Code
   - **PlantUML Web Server**: Generates a URL that can be opened in any browser (no Java installation required)

### Using PlantUML Web Server
When selecting the "PlantUML Web Server" option:

![Remote PlantUML Web Server](images/remote_plantuml_web_server.gif)
- No local Java installation required
- The diagram is generated on the PlantUML Web Server
- You can copy the URL to clipboard or open it directly in the browser
- The URL can be shared with others to view the diagram

### NEW: Using InterSystems IRIS Integration
1. Configure your IRIS connection in VS Code settings:
   - Go to Settings > Extensions > InterSystems ObjectScript Class Diagram
   - Enter your IRIS server host, port, namespace, username, and password
2. Open a `.cls` file in the editor
3. Right-click and select "Generate InterSystems Class Diagram"
4. The extension will connect to your IRIS server and generate a diagram using class information from the server
5. Click on class names, properties, or methods in the diagram to:
   - Open the class in IRIS Documatic
   - View property definitions in IRIS
   - Navigate to method implementations in IRIS

### Interactive Features
- Click on diagram elements to:
  - Jump to class definitions
  - View property definitions
  - Navigate to method implementations
- Support for diagram zooming and panning
- Clear visualization of class relationships

## Keyboard Shortcuts

- `Ctrl+Alt+U`: Generates a class diagram for the currently open `.cls` file

## Extension Settings

This extension contributes the following commands:

* `intersystems-objectscript-class-diagram-view.generateClassDiagram`: Generates a class diagram for the selected file or folder
* `intersystems-objectscript-class-diagram-view.generateIntersystemsClassDiagram`: Generates a class diagram using IRIS server information

This extension contributes the following settings:

* `intersystems-objectscript-class-diagram-view.server.host`: IRIS server host
* `intersystems-objectscript-class-diagram-view.server.port`: IRIS server port
* `intersystems-objectscript-class-diagram-view.server.namespace`: IRIS namespace
* `intersystems-objectscript-class-diagram-view.server.username`: IRIS server username
* `intersystems-objectscript-class-diagram-view.server.password`: IRIS server password

## Known Issues

- **Navigation to external libraries**: No ability to navigate to InterSystems ObjectScript library definitions through click interactions
- **Subclass generation**: Missing functionality to generate subclass diagrams for the current class
- **Performance for large projects**:
  - Generating diagrams for large folders using right-click can have significant delays
  - Generated webview/SVG for large projects lacks smooth zooming functionality and proper scaling

Please report any issues in the GitHub repository.

## Contributing

Contributions are welcome! Feel free to submit a pull request.

## License

This extension is licensed under the MIT License.
