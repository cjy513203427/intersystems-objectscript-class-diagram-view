# InterSystems ObjectScript Klassendiagramm-Ansicht

[English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de-DE.md)

Eine Visual Studio Code-Erweiterung zur Generierung von UML-Klassendiagrammen für InterSystems ObjectScript-Klassen. Diese Erweiterung generiert nicht nur Klassendiagramme, sondern bietet auch interaktive Anzeige- und Navigationsfunktionen.

## Funktionen

- Generierung von UML-Klassendiagrammen aus `.cls`-Dateien
- Unterstützung für Diagrammerstellung auf Klassen- und Ordnerebene
- Integration des Kontextmenüs sowohl im Editor als auch im Explorer
- Visualisierung von Klassenbeziehungen, Eigenschaften und Methoden
- Basierend auf PlantUML für zuverlässige Diagrammdarstellung
- Interaktive Klassendiagramm-Navigation
  - Klicken Sie auf Klassennamen, Eigenschaften oder Methoden, um schnell zum entsprechenden Code zu springen
  - SVG-Diagramme in HTML eingebettet für reibungslose Interaktion
  - Visuelle Navigation von Klassenbeziehungen

## Anforderungen

- Visual Studio Code 1.96.0 oder höher
- Java Runtime Environment (JRE) 8 oder höher für PlantUML-Diagrammerstellung
- InterSystems ObjectScript-Dateien (`.cls`)

## Installation
1. Installieren Sie die Erweiterung über VS Code
![Plugin installieren](images/install_plugin.gif)
2. Stellen Sie sicher, dass Java Runtime Environment (JRE) auf Ihrem System installiert ist
3. Starten Sie VS Code nach der Installation neu

## Verwendung

### Klassendiagramme generieren
1. Öffnen Sie eine `.cls`-Datei im Editor
2. Generieren Sie ein Klassendiagramm mit einer dieser Methoden:
   - Drücken Sie `Strg+Alt+U`
   ![Tastenkombination drücken](images/press_shortcut.gif)
   - Rechtsklick auf die Datei und wählen Sie "Klassendiagramm generieren"
   ![Rechtsklick auf Datei](images/right_click_file.gif)
   - Rechtsklick auf einen Ordner mit `.cls`-Dateien und wählen Sie "Klassendiagramm generieren"
   ![Rechtsklick auf Ordner](images/right_click_folder.gif)

### Interaktive Funktionen
- Klicken Sie auf Diagrammelemente, um:
  - Zu Klassendefinitionen zu springen
  - Eigenschaftsdefinitionen anzuzeigen
  - Zu Methodenimplementierungen zu navigieren
- Unterstützung für Diagramm-Zoom und -Verschiebung
- Klare Visualisierung von Klassenbeziehungen

## Tastenkombinationen

- `Strg+Alt+U`: Generiert ein Klassendiagramm für die aktuell geöffnete `.cls`-Datei

## Erweiterungseinstellungen

Diese Erweiterung stellt folgende Befehle bereit:

* `intersystems-objectscript-class-diagram-view.generateClassDiagram`: Generiert ein Klassendiagramm für die ausgewählte Datei oder den ausgewählten Ordner

## Bekannte Probleme

- **Navigation in externen Bibliotheken**: Keine Navigation zu InterSystems ObjectScript-Bibliotheksdefinitionen durch Klickinteraktionen möglich
- **Unterklassen-Generierung**: Fehlende Funktionalität zur Generierung von Unterklassendiagrammen für die aktuelle Klasse
- **Performance bei großen Projekten**:
  - Generierung von Diagrammen für große Ordner per Rechtsklick kann erhebliche Verzögerungen aufweisen
  - Generierte Webview/SVG für große Projekte mangelt es an flüssiger Zoomfunktionalität und korrekter Skalierung

Bitte melden Sie alle Probleme im GitHub-Repository.

## Mitwirken

Beiträge sind willkommen! Reichen Sie gerne einen Pull Request ein.

## Lizenz

Diese Erweiterung steht unter der MIT-Lizenz.