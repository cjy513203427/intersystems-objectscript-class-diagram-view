# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🚀 New Features
- Added support for generating class diagrams using PlantUML Web Server (no Java required)
- Implemented user choice between local Java and PlantUML Web Server for diagram generation
- Added ability to copy PlantUML URL to clipboard or open directly in browser

### 🐛 Bug Fixes
- None

### 📝 Documentation
- Updated README files (English, Chinese, German) with new PlantUML Web Server functionality
- Added detailed instructions for using the PlantUML Web Server option
- Improved requirements section with a clear table format for better readability
- Enhanced documentation with clearer distinction between required and optional dependencies

### 🔧 Maintenance
- Optimized command structure by consolidating diagram generation commands
- Removed redundant code for handling separate web server command
- Simplified user interface by providing generation method choice in a single command

### ⚡️ Performance Improvements
- Streamlined diagram generation process for PlantUML Web Server option
- Reduced code complexity by removing unnecessary WebView creation for web server URLs

### 💥 Breaking Changes
- None

## [0.0.3] - 2025-02-24

### 🎨 UI Changes
- 🖼️ Update extension icon

### 🔧 Maintenance
- ⚙️ Update minimum VSCode version requirement from 1.74.0 to 1.96.0

## [0.0.2] - 2024-02-19

### 📝 Documentation
- Add animated GIF demonstrations for installation and usage
- Add detailed known issues section in README
  - External library navigation limitations
  - Subclass generation functionality
  - Large project performance considerations

## [0.0.1] - 2024-02-19

### 🎉 First Release
- Initial project setup with basic functionality framework
- Core features:
  - VSCode extension setup
  - Basic class diagram visualization
  - PlantUML integration foundation

### 📝 Documentation
- Initial README.md
- Basic usage documentation
- Development setup guide

[Unreleased]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view/releases/tag/v0.0.1