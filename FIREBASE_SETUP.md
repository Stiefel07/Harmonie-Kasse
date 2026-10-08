# Harmonie: gemeinsamer Speicher ohne eigenen Server

Für den Zugriff von mehreren Handys soll Firebase Authentication die Konten verwalten, Cloud Firestore Rechnungen, Ausgaben und Freigabeanfragen gemeinsam speichern und Firebase Hosting die App über HTTPS bereitstellen. Das ist ein verwalteter Cloud-Dienst, kein gemieteter eigener Server.

## Kostenrahmen

- Nur den **Spark-Tarif** verwenden und kein Abrechnungs-/Zahlungsprofil verknüpfen oder auf **Blaze** umstellen.
- Cloud Firestore hat im Spark-Tarif eine kostenlose Quote von 1 GiB gespeicherten Daten, 50.000 Lesevorgängen pro Tag und 20.000 Schreibvorgängen pro Tag. Wenn diese Grenzen erreicht werden, muss die Nutzung warten, bis das Kontingent wieder verfügbar ist; nicht auf einen kostenpflichtigen Tarif upgraden.
- Keine Cloud Functions einrichten. Automatische E-Mail-Benachrichtigungen sind deshalb nicht Teil des kostenlosen Ablaufs. Freigabeanfragen sollen in der App als wartend erscheinen; die Kollegin kann zusätzlich weiterhin selbst einen E-Mail-Entwurf öffnen und absenden.

## Projekt anlegen

1. In der [Firebase Console](https://console.firebase.google.com/) ein Projekt namens **Harmonie Massage** erstellen. Google Analytics kann ausgeschaltet bleiben.
2. Eine **Web-App** zum Projekt hinzufügen und ihre Web-Konfiguration notieren (`apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId`). Diese Werte identifizieren die Web-App; sie sind keine Service-Account-Schlüssel.
3. Unter **Authentication → Sign-in method** die E-Mail/Passwort-Anmeldung aktivieren. Selbst erstellte Konten dürfen erst nach Freigabe Zugriff auf die Kassendaten erhalten.
4. **Cloud Firestore** in **Production mode** erstellen und als Standort eine nahe Region wählen, zum Beispiel **Singapore (`asia-southeast1`)**. Der Standort lässt sich nach dem Anlegen nicht einfach wechseln.
5. **Billing nicht aktivieren.** In den Firestore-Regeln niemals Testmodus oder `allow read, write: if true` verwenden.

Sobald das Projekt und die Web-Konfiguration vorliegen, kann die App mit Authentifizierung, Freigabeliste, rollenbasierten Datenbankregeln und Live-Synchronisierung verbunden werden.

## Nicht teilen

Keine Passwörter, Bestätigungscodes, Service-Account-JSON-Dateien oder privaten Schlüssel weitergeben. Für die Verbindung der Web-App sind nur die oben genannten Web-Konfigurationswerte erforderlich.
