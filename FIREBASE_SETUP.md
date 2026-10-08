# Firebase-Kurzanleitung

Das Projekt `harmonie-zone-health-massage` ist bereits eingerichtet. Authentifizierung erfolgt nur über das Besitzerkonto. Mitarbeitende werden in der Kasse durch Namen und Kassenpasswörter unterschieden; sie brauchen keine eigenen E-Mail-Adressen oder Firebase-Accounts.

## Einmalige Schritte in Firebase

1. Unter **Authentication → Sign-in method** E-Mail/Passwort für das Besitzerkonto aktivieren. Dieses Konto hat der Inhaber selbst angelegt.
2. Unter **Firestore Database → Regeln** den Inhalt aus `firestore.rules` einsetzen und veröffentlichen. Die Regeln erlauben nur die UID des Besitzers.
3. Die App mit `index.html` und `firebase-store.js` gemeinsam über HTTPS bereitstellen. Firebase Authentication kann lokale `file://`-Seiten für die Anmeldung blockieren; für Tests die GitHub-Pages-Adresse oder einen lokalen Webserver verwenden.
4. Jedes Gerät einmal mit dem Firebase-Besitzerkonto anmelden. Anschließend erfolgt die normale Kassen-Anmeldung pro Mitarbeitername und App-Passwort.
5. Beim ersten Gerät die Abfrage zum Übertragen vorhandener Browserdaten bestätigen. Die Daten werden dann zu Firebase kopiert und auf verbundenen Geräten synchronisiert.

## Datenzugriff

Alle Geräte, die mit dem Besitzerkonto verbunden sind, erhalten denselben Firestore-Zugriff. Mitarbeitername und Kassenpasswort dienen der Zuordnung und dem einfachen Anmeldebildschirm, bieten aber keine getrennten Datenbankberechtigungen. Ein Gerät, das mit dem Besitzerkonto verbunden ist, kann technisch alle Geschäftsdaten laden.

Mitarbeiterpasswörter werden clientseitig mit PBKDF2 gehasht. Das Firebase-Besitzerpasswort wird ausschließlich über Firebase Authentication geprüft und nicht in der App gespeichert.

Die Web-Konfiguration in `firebase-store.js` enthält die übliche öffentliche Firebase-Web-App-Konfiguration, keinen privaten Admin-Schlüssel.

## Tarif

Beim Firebase Spark-Tarif bleiben. Keine Abrechnung aktivieren oder auf Blaze umstellen, solange die App strikt kostenlos bleiben soll. Wenn kostenlose Quoten ausgeschöpft werden, kann die Synchronisierung pausieren.
