# Harmonie Zone Health Massage

Eine mobil nutzbare Kassen-App für Massageleistungen, Rechnungen, tägliche Ausgaben und Mitarbeiterabrechnungen.

## Firebase-Verbindung

Die App verwendet das Firebase-Projekt `harmonie-zone-health-massage` für die gemeinsame Synchronisierung über Firestore. Der Besitzer meldet jedes Gerät einmal mit seinem Firebase-E-Mail-Konto und Passwort an. Danach melden sich Manager und Mitarbeiter innerhalb der Kasse mit ihrem Namen und ihrem Kassenpasswort an.

Die Mitarbeiterkonten sind Zuordnungen innerhalb der App. Sie sind keine einzelnen Firebase-Konten und haben deshalb keine voneinander getrennten Datenbankrechte. Jedes verbundene Gerät kann die gemeinsamen Geschäftsdaten abrufen. Mitarbeiterpasswörter werden als PBKDF2-Hash gespeichert, nicht als Klartext.

Vor dem ersten Upload fragt die App ausdrücklich nach, ob bestehende Browserdaten in die gemeinsame Datenbank übertragen werden sollen. Die statischen Dateien `index.html` und `firebase-store.js` müssen zusammen auf einem Webhost liegen. Zum lokalen Testen muss die App über einen lokalen Webserver oder HTTPS geöffnet werden, da Browser ES-Module nicht zuverlässig aus `file://` laden.

## Firebase-Sicherheitsregeln

Die Datei `firestore.rules` lässt nur das Besitzer-Firebase-Konto mit der fest eingetragenen UID zugreifen. Diese Regeln in Firebase Console → Firestore Database → Regeln einsetzen und veröffentlichen. Keine öffentlichen Regeln wie `allow read, write: if true` verwenden.

Die Firebase-Client-Konfiguration in `firebase-store.js` ist für Web-Apps vorgesehen; sie enthält keinen privaten Service-Account-Schlüssel. Das App-Passwort für Mitarbeiter ist unabhängig vom Firebase-Passwort des Besitzers.

## Kassenfunktionen

- Massageleistungen mit frei einstellbarem Stundenpreis und Mitarbeiteranteil
- flexible Dauer von 30, 45, 60, 90 und 120 Minuten
- mehrere Leistungen pro Rechnung, anteilige Preisberechnung
- Barzahlung oder Scan-Zahlung; Trinkgeld kann beim Scan erfasst werden
- getrennte Kunden-, Mitarbeiter- und Geschäftsanteile
- Tagesausgaben, Mitarbeiterabrechnung und Admin-Löschfunktion
- Thai, Englisch und Deutsch; thailändische Datumsanzeige im buddhistischen Kalender
- Live-Synchronisierung der Leistungen, Mitarbeitenden, Rechnungen und Ausgaben

Beispiel: 45 Minuten Thai (150 ฿) plus 45 Minuten Öl (225 ฿) ergeben 375 ฿ Kundenumsatz.

## Kosten

Das Projekt kann im Spark-Tarif genutzt werden, solange Nutzung und Ressourcen innerhalb der kostenlosen Quoten bleiben. Kein Blaze-Upgrade oder Abrechnungsprofil hinzufügen, wenn die Vorgabe weiterhin „kostenlos“ lautet.
