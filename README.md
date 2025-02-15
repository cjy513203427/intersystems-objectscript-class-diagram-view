# InterSystems ObjectScript Class Diagram View

[English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de-DE.md)

A Visual Studio Code extension that generates UML class diagrams for InterSystems ObjectScript classes. This extension not only generates class diagrams but also provides interactive viewing and navigation capabilities.

## Features

- Generate UML class diagrams from `.cls` files
- Support for both single class and folder-level diagram generation
- Right-click context menu integration in both editor and explorer
- Visualize class relationships, properties, and methods
- Built on PlantUML for reliable diagram rendering
- Interactive Class Diagram Browsing
  - Click on class names, properties, or methods to quickly jump to the corresponding code
  - SVG diagrams embedded in HTML for smooth interaction
  - Visual navigation of class relationships

## Requirements

- Visual Studio Code 1.96.0 or higher
- Java Runtime Environment (JRE) for PlantUML diagram generation
- InterSystems ObjectScript files (`.cls`)

## Installation

1. Install the extension through VS Code Marketplace
2. Ensure you have Java Runtime Environment (JRE) installed on your system
3. Restart VS Code after installation

## Usage

### Generating Class Diagrams
1. Open a `.cls` file in the editor
2. Generate a class diagram using one of these methods:
   - Press `Ctrl+Alt+U`
   - Right-click the file and select "Generate Class Diagram"
   - Right-click a folder containing `.cls` files and select "Generate Class Diagram"

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

Please report any issues on the GitHub repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the MIT License.

## Release Notes

### 0.0.1

Initial release of InterSystems ObjectScript Class Diagram View
- Basic class diagram generation
- Support for single file and folder processing
- Context menu integration
- Keyboard shortcut support
- Interactive class diagram browsing features
