# Changelog

All notable changes to the "InterSystems ObjectScript Class Diagram View" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-04-04
### Added
- Support for connecting to InterSystems IRIS instances to generate class diagrams directly from server
- New command for generating InterSystems class diagrams
- Integration with IRIS REST API for fetching class information
- Ability to browse class details in the IRIS Management Portal by clicking on diagram elements
- Support for navigating to class, method, and property definitions in IRIS Documatic

### Changed
- Improved error handling and feedback for connection issues
- Enhanced SVG rendering and interaction capabilities
- Optimized diagram generation process
- Updated UI for better user experience

### Fixed
- Correct URL format for opening classes in IRIS Documatic
- Fixed clicking on class elements in SVG diagrams
- Resolved issues with diagram rendering in different environments

### Removed
- Test IRIS connection command and related functionality

## [0.1.0] - 2025-02-28
### Added
- Support for generating class diagrams using PlantUML Web Server (no Java required)
- Documentation on using the PlantUML Web Server option

### Changed
- Improved UI for diagram generation options
- Enhanced documentation with usage examples
- Better handling of large class diagrams

### Fixed
- Various minor bugs and performance issues

## [0.0.1] - 2025-02-21
### Added
- Initial release
- Support for generating class diagrams from .cls files using PlantUML
- Context menu integration in editor and explorer
- Interactive class diagram navigation
- Keyboard shortcut (Ctrl+Alt+U) for quick diagram generation

### 🎨 UI Changes
- 🖼️ Update extension icon

### 🔧 Maintenance
- ⚙️ Update minimum VSCode version requirement from 1.74.0 to 1.96.0

### 📝 Documentation
- Add animated GIF demonstrations for installation and usage
- Add detailed known issues section in README
  - External library navigation limitations
  - Subclass generation functionality
  - Large project performance considerations

### 🔧 Maintenance
- Optimized command structure by consolidating diagram generation commands
- Removed redundant code for handling separate web server command
- Simplified user interface by providing generation method choice in a single command

### ⚡️ Performance Improvements
- Streamlined diagram generation process for PlantUML Web Server option
- Reduced code complexity by removing unnecessary WebView creation for web server URLs

[Unreleased]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/compare/v0.0.3...v0.1.0
[0.0.3]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/releases/tag/v0.0.1