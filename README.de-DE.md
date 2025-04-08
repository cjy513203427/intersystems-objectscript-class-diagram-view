# InterSystems ObjectScript Klassendiagramm-Ansicht

[English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de-DE.md)

Eine Visual Studio Code-Erweiterung zur Generierung von UML-Klassendiagrammen für InterSystems ObjectScript-Klassen. Diese Erweiterung generiert nicht nur Klassendiagramme, sondern bietet auch interaktive Anzeige- und Navigationsfunktionen.

## Funktionen

- Generierung von UML-Klassendiagrammen aus `.cls`-Dateien
- Unterstützung für Diagrammerstellung auf Klassen- und Ordnerebene
- Integration des Kontextmenüs sowohl im Editor als auch im Explorer
- Visualisierung von Klassenbeziehungen, Eigenschaften und Methoden
- Basierend auf PlantUML für zuverlässige Diagrammdarstellung
- Generierung von Diagrammen mit PlantUML Web Server (keine Java-Installation erforderlich)
- **NEU:** Direkte Integration mit InterSystems IRIS für serverseitige Klasseninformationen
- **NEU:** Klassen direkt in IRIS Documatic aus dem Diagramm durchsuchen
- Interaktive Klassendiagramm-Navigation
  - Klicken Sie auf Klassennamen, Eigenschaften oder Methoden, um schnell zum entsprechenden Code zu springen
  - SVG-Diagramme in HTML eingebettet für reibungslose Interaktion
  - Visuelle Navigation von Klassenbeziehungen

## Anforderungen

| Betriebssystem | Erforderlich | Optional (für lokale PlantUML-Generierung) |
|---------|---------|-----------------------------------------|
| Windows | - VSCode 1.96.0+  <br> - ObjectScript Klassendateien(`.cls`) | - Java 8+ |
| Linux   | - VSCode 1.96.0+  <br> - ObjectScript Klassendateien(`.cls`) | - Java 8+ <br> - Graphviz |

💡 *Bei Verwendung des PlantUML Web Servers werden Java und Graphviz nicht benötigt.*

## Installation
1. Installieren Sie die Erweiterung über VS Code
![Plugin installieren](images/install_plugin.gif)
2. Stellen Sie sicher, dass Java Runtime Environment (JRE) auf Ihrem System installiert ist (optional bei Verwendung des PlantUML Web Servers)
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
3. Wählen Sie bei Aufforderung Ihre bevorzugte Generierungsmethode:
   - **Lokales Java**: Generiert das Diagramm mit lokaler Java-Installation und zeigt es in VS Code an
   - **PlantUML Web Server**: Generiert eine URL, die in jedem Browser geöffnet werden kann (keine Java-Installation erforderlich)

### Verwendung des PlantUML Web Servers
Bei Auswahl der Option "PlantUML Web Server":

![Remote PlantUML Web Server](images/remote_plantuml_web_server.gif)
- Keine lokale Java-Installation erforderlich
- Das Diagramm wird auf dem PlantUML Web Server generiert
- Sie können die URL in die Zwischenablage kopieren oder direkt im Browser öffnen
- Die URL kann mit anderen geteilt werden, um das Diagramm anzuzeigen

### Klassendiagramm mit IRIS-Integration generieren
Diese Funktion ist abhängig von Intersystem-Plugins und generiert alle Klasseneigenschaften, Parameter und Methoden aus der ausgewählten Klasse.
Es ist wichtig zu beachten, dass die Funktion die gesamte Vererbungshierarchie generiert, auch für Klassen, die im lokalen Projekt nicht vorhanden sind.
1. Konfigurieren Sie Ihre IRIS-Verbindung in den VS Code-Einstellungen:
   - Gehen Sie zu Einstellungen > Erweiterungen > InterSystems ObjectScript Klassendiagramm
   - Geben Sie Ihren IRIS-Server-Host, Port, Namespace, Benutzernamen und Passwort ein
   ![IRIS-Einstellungen konfigurieren](images/configure_iris.gif)
2. Öffnen Sie eine `.cls`-Datei im Editor
3. Rechtsklick und wählen Sie "InterSystems Klassendiagramm generieren"
4. Die Erweiterung verbindet sich mit Ihrem IRIS-Server und generiert ein Diagramm mit Klasseninformationen vom Server
5. Klicken Sie auf Klassennamen, Eigenschaften oder Methoden im Diagramm, um:
   - Die Klasse in IRIS Documatic zu öffnen
   - Eigenschaftsdefinitionen in IRIS anzuzeigen
   - Zu Methodenimplementierungen in IRIS zu navigieren
   ![InterSystems Klassendiagramm generieren](images/generate_intersystems_class_diagram.gif)

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
* `intersystems-objectscript-class-diagram-view.generateIntersystemsClassDiagram`: Generiert ein Klassendiagramm mit IRIS-Serverinformationen

Diese Erweiterung bietet folgende Einstellungen:

* `intersystems-objectscript-class-diagram-view.server.host`: IRIS-Server-Host
* `intersystems-objectscript-class-diagram-view.server.port`: IRIS-Server-Port
* `intersystems-objectscript-class-diagram-view.server.namespace`: IRIS-Namespace
* `intersystems-objectscript-class-diagram-view.server.username`: IRIS-Server-Benutzername
* `intersystems-objectscript-class-diagram-view.server.password`: IRIS-Server-Passwort

## Bekannte Probleme

- **Unterklassen-Generierung**: Fehlende Funktionalität zur Generierung von Unterklassendiagrammen für die aktuelle Klasse
- **Performance bei großen Projekten**:
  - Generierung von Diagrammen für große Ordner per Rechtsklick kann erhebliche Verzögerungen aufweisen
  - Generierte Webview/SVG für große Projekte mangelt es an flüssiger Zoomfunktionalität und korrekter Skalierung

Bitte melden Sie alle Probleme im GitHub-Repository.

## Mitwirken

Beiträge sind willkommen! Reichen Sie gerne einen Pull Request ein.

## Lizenz

Diese Erweiterung steht unter der MIT-Lizenz.