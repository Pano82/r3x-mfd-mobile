# R3x Mobile 4.0 (beta)

Android-App von M-Industries (mindustries.org): die Oberfläche von **R34 OS 3.221** direkt auf dem Handy, ohne Raspberry Pi.
Live-Daten des Nissan Skyline (R32/R33/R34, Nissan Consult I) über einen Bluetooth-Consult-Adapter. Die App liest nur und schreibt nichts ins Steuergerät.

## Was drin ist
- **MFD**: Rundinstrumente, Drehzahlband, Geschwindigkeit, Drosselklappe, Batterie, Warngrenzen, Einheiten per Antippen.
- **NAVIGATION**: OpenStreetMap, Zielsuche, Handy-GPS (Position, Kurs, Genauigkeit), Splitscreen mit MFD oder Musik.
- **MEDIA**: Musik vom Handy („MUSIK WÄHLEN“ öffnet die Android-Dateiauswahl; die Auswahl gilt bis zum Schließen der App).
- **EINSTELLUNGEN**: Consult-Adapter und Fahrzeug, 5 Sprachen, 6 Schriften, 6 Designs, Kontrast/Helligkeit/Farbton.
- **Einrichtungsassistent**: Sprache → Fahrzeug → Bluetooth-Adapter suchen und mit PIN koppeln → Verbindungstest → Drosselklappe einlernen → Sensoren → Einheiten → Aussehen.
- **Demo-Modus** ohne Auto. Querformat, Vollbild, Bildschirm bleibt an.

## Was es gegenüber R34 OS am Pi nicht gibt
- Kein Reiter **APPS** (Freeware-Starter).
- Kein WLAN-Panel, kein USB-Update, kein Neustart/Ausschalten, keine Zündungs-Abschaltung, keine Diagnose-Aufzeichnung.
- Kein USB-Consult-Kabel, kein ESP32 (Ladedruck/Öl). Diese Werte kommen nur, wenn das Steuergerät sie liefert (Demo).
- Link G4, Haltech und Power FC: in der Auswahl als „NUR R34 OS (PI)“ markiert.

## Aufbau
- `src/App.tsx`, `src/Setup.tsx`: Oberfläche aus R34 OS 3.221. App-Unterschiede hängen am Schalter `APP` in `src/platform.ts`.
- `src/mobile/backend.ts`: ersetzt `backend/server.py` + `ecu.py`. Beantwortet `/api/…` und `/stream` direkt im Handy.
- `src/mobile/consult.ts`: Consult-Protokoll (gleiche Logik wie `backend/consult.py`).
- `src/mobile/bt.ts`: Bluetooth-Seriell. Auf dem Handy das native Plugin, im Browser ein simulierter Consult-Adapter.
- `src/mobile/music.ts`: Musikauswahl vom Handy.
- `android/app/src/main/java/org/mindustries/r3xmfd/BluetoothSerialPlugin.java`: Suchen, Koppeln mit PIN, RFCOMM/SPP, Bildschirm an.
- `.github/workflows/android.yml`: baut die APK automatisch auf GitHub.

## Bauen
- **Auf GitHub (empfohlen):** Ordnerinhalt in ein Repository hochladen. Der Workflow „Android APK“ startet automatisch. Ergebnis unter Actions → Lauf → Artifacts → `r3x-mfd-mobile-apk`.
- **Browser-Vorschau** mit simuliertem Adapter: `npm install && npm run dev`. Im Assistenten „HC-05 (Simulator)“ wählen, PIN 1234.
- **Lokal:** Android Studio, `npm install && npm run sync`, dann den Ordner `android` öffnen → Build → APK.
- **Play Store:** vier Secrets im Repository eintragen (`R3X_KEYSTORE_BASE64`, `R3X_KEYSTORE_PASSWORD`, `R3X_KEY_ALIAS`, `R3X_KEY_PASSWORD`). Dann baut der Workflow zusätzlich das signierte Bundle `r3x-mfd-mobile-aab`.

App-ID `org.mindustries.r3xmfd`, Version 4.0 (versionCode 40). Ersetzt beim Installieren die bisherige R3x MFD Mobile 3.19.
