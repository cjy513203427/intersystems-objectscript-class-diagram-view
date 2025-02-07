# InterSystems ObjectScript Class Diagram View

A Visual Studio Code extension that generates UML class diagrams for InterSystems ObjectScript classes.

## Features

- Generate UML class diagrams from `.cls` files
- Support for both single class and folder-level diagram generation
- Right-click context menu integration in both editor and explorer
- Visualize class relationships, properties, and methods
- Built on PlantUML for reliable diagram rendering

## Requirements

- Visual Studio Code 1.96.0 or higher
- Java Runtime Environment (JRE) for PlantUML diagram generation
- InterSystems ObjectScript files (`.cls`)

## Installation

1. Install the extension through VS Code Marketplace
2. Ensure you have Java Runtime Environment (JRE) installed on your system
3. Restart VS Code after installation

## Usage

1. Right-click on a `.cls` file in the editor or explorer
2. Select "Generate Class Diagram" from the context menu
3. The class diagram will be generated and displayed

You can also generate diagrams for multiple classes by:
1. Right-clicking on a folder containing `.cls` files
2. Selecting "Generate Class Diagram"

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
