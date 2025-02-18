# InterSystems ObjectScript Klassendiagramm-Ansicht

[English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de-DE.md)

Eine Visual Studio Code-Erweiterung zur Generierung von UML-Klassendiagrammen für InterSystems ObjectScript-Klassen. Diese Erweiterung generiert nicht nur Klassendiagramme, sondern bietet auch interaktive Anzeige- und Navigationsfunktionen.

## Funktionen

- Generierung von UML-Klassendiagrammen aus `.cls`-Dateien
- Unterstützung für Diagrammerstellung auf Klassen- und Ordnerebene
- Kontextmenü-Integration in Editor und Explorer
- Visualisierung von Klassenbeziehungen, Eigenschaften und Methoden
- Zuverlässige Diagrammdarstellung basierend auf PlantUML
- Interaktives Durchsuchen von Klassendiagrammen
  - Klicken Sie auf Klassennamen, Eigenschaften oder Methoden, um schnell zum entsprechenden Code zu springen
  - In HTML eingebettete SVG-Diagramme für reibungslose Interaktion
  - Visuelle Navigation von Klassenbeziehungen

## Anforderungen

- Visual Studio Code 1.74.0 oder höher
- Java Runtime Environment (JRE) 8 oder höher für PlantUML-Diagrammgenerierung
- InterSystems ObjectScript-Dateien (`.cls`)

## Installation

1. Installieren Sie die Erweiterung über den VS Code Marketplace
2. Stellen Sie sicher, dass Java Runtime Environment (JRE) auf Ihrem System installiert ist
3. Starten Sie VS Code nach der Installation neu

## Verwendung

### Klassendiagramme generieren
1. Öffnen Sie eine `.cls`-Datei im Editor
2. Generieren Sie ein Klassendiagramm mit einer dieser Methoden:
   - Drücken Sie `Strg+Alt+U`
   - Klicken Sie mit der rechten Maustaste auf die Datei und wählen Sie "Klassendiagramm generieren"
   - Klicken Sie mit der rechten Maustaste auf einen Ordner mit `.cls`-Dateien und wählen Sie "Klassendiagramm generieren"

### Interaktive Funktionen
- Klicken Sie auf Diagrammelemente, um:
  - Zu Klassendefinitionen zu springen
  - Eigenschaftsdefinitionen anzuzeigen
  - Zu Methodenimplementierungen zu navigieren
- Unterstützung für Diagramm-Zoom und -Verschiebung
- Klare Visualisierung von Klassenbeziehungen

## Tastenkombinationen

- `Strg+Alt+U`: Klassendiagramm für die aktuell geöffnete `.cls`-Datei generieren

## Erweiterungseinstellungen

Diese Erweiterung stellt folgende Befehle bereit:

* `intersystems-objectscript-class-diagram-view.generateClassDiagram`: Generiert ein Klassendiagramm für die ausgewählte Datei oder den ausgewählten Ordner

## Bekannte Probleme

Bitte melden Sie Probleme im GitHub-Repository.

## Mitwirken

Beiträge sind willkommen! Reichen Sie gerne einen Pull Request ein.

## Lizenz

Diese Erweiterung steht unter der MIT-Lizenz.

## Versionshinweise

### 0.0.1

Erste Veröffentlichung der InterSystems ObjectScript Klassendiagramm-Ansicht
- Grundlegende Klassendiagramm-Generierung
- Unterstützung für Einzel- und Ordnerverarbeitung
- Kontextmenü-Integration
- Tastenkombinationsunterstützung
- Interaktive Klassendiagramm-Browsing-Funktionen 