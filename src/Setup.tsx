// Einrichtungsassistent (wie beim ersten Start eines Android-Handys):
// Sprache → WLAN → Fahrzeug & Steuergerät → Verbindungstest → Einheiten → Aussehen → Fertig.
// Jederzeit neu startbar (EINSTELLUNGEN → SYSTEM). Nur Steuergerät ändern: only="ecu".
import { useContext, useEffect, useState } from "react";
import { Cfg, DESIGNS, FONTS, T, TaillightLogo, WifiPanel, post, rfetch, useConsult, usePortrait } from "./App";
import type { DesignKey, FontKey, Lang } from "./App";
import { APP } from "./platform";

type Profile = { id: string; group: "nissan" | "tuned" | "standalone" | "demo"; name: string; engine: string; driver: string; status: "ready" | "soon"; eta?: string; redline: number | null; provides: string[] };
type Src = "ecu" | "esp32" | "none";
type SensorKey = "boost" | "oilp" | "oilt";
export type EcuInfo = { profile: string; car?: string; setup: boolean; port: string; conn?: "usb" | "bt"; pi: { model: string; gen: number; ram: number; hints: string[] }; profiles: Profile[];
  sensors: Record<SensorKey, Src>; tps: [number, number] | null; tps_default: [number, number] };
type Scan = { consult: string; can: string[]; serial: string[]; suggest: string[]; silent?: boolean };

const W = {
  de: {
    piOnly: "", piOnlyMsg: "", welcome: "WILLKOMMEN", welcomeSub: "Richten wir dein R34 OS in wenigen Schritten ein.", lang: "SPRACHE",
    wifi: "WLAN", wifiSub: "Für Karte, Apps und Streaming. Geht auch später.",
    ecu: "FAHRZEUG & STEUERGERÄT", ecuSub: "Wähle dein Steuergerät – oder lass suchen (Zündung an).",
    auto: "AUTOMATISCH SUCHEN", scanning: "SUCHE …", foundConsult: "Consult-Steuergerät gefunden – bitte Fahrzeug wählen:",
    foundCan: "CAN-Adapter gefunden – Link/Haltech-Treiber folgen in Kürze.", silent: "Adapter gefunden, aber keine Antwort. Zündung an?",
    nothing: "Nichts gefunden – Kabel prüfen oder unten auswählen.",
    g_nissan: "NISSAN ORIGINAL", g_tuned: "GETUNT · CONSULT", g_standalone: "FREI PROGRAMMIERBAR", g_demo: "OHNE AUTO",
    d_nistune: "im Original-Steuergerät", d_piggyback: "Zusatz-Steuergerät", d_link: "USB-CAN-Adapter", d_powerfc: "FC-Datalogit", d_haltech: "USB-CAN-Adapter", d_demo: "Vorführmodus mit Beispielwerten",
    soon: "BALD", soonMsg: "Treiber folgt mit Version",
    test: "VERBINDUNGSTEST", ok: "VERBINDUNG STEHT", wait: "WARTE AUF DATEN …",
    hintConsult: "Zündung an? Consult-Kabel am Diagnosestecker (Fahrerfußraum) eingesteckt?", hintDemo: "Demo-Modus: Es werden Beispielwerte angezeigt.",
    later: "Du kannst auch ohne Verbindung weitermachen.",
    units: "EINHEITEN", look: "AUSSEHEN", font: "SCHRIFT", design: "DESIGN",
    done: "FERTIG", doneSub: "Alles eingerichtet. Gute Fahrt!", go: "LOS GEHT'S",
    back: "ZURÜCK", next: "WEITER", skip: "ÜBERSPRINGEN", close: "SCHLIESSEN",
    h_weak: "Raspberry Pi 3: Video-Streaming kann ruckeln.", h_psu27: "Pi 5: offizielles 27-W-Netzteil verwenden.",
    h_noJack: "Pi 5 hat keine Klinke – Ton über HDMI, Bluetooth oder USB.", h_power: "Unterspannung erkannt – stärkeres Netzteil verwenden.",
    tps: "DROSSELKLAPPE EINLERNEN", tpsHelp: "Motor aus, Zündung an. 1. Fuß vom Gas → LEERLAUF SPEICHERN. 2. Gaspedal ganz durchtreten → VOLLGAS SPEICHERN.", saveIdle: "LEERLAUF SPEICHERN", saveWot: "VOLLGAS SPEICHERN", std: "STANDARD", tpsNoData: "Keine Daten – Zündung an?", tpsRange: "Leerlauf und Vollgas liegen zu nah beieinander – Pedal ganz durchtreten.", saved: "Gespeichert", sensors: "SENSOREN", sensorsSub: "Woher kommen Ladedruck und Öl-Werte? Nicht vorhandene Sensoren werden ausgeblendet.", s_boost: "LADEDRUCK", s_oilp: "ÖLDRUCK", s_oilt: "ÖLTEMPERATUR", src_ecu: "STEUERGERÄT", src_esp32: "ZUSATZSENSOR", src_none: "KEINER", diag: "DIAGNOSE AUFZEICHNEN (60 s)", diagRun: "Aufzeichnung läuft … noch", diagUsb: "Gespeichert auf USB-Stick:", diagInt: "Kein USB-Stick – intern gespeichert:", diagHint: "Zündung an, Motor laufen lassen, Gas geben. Die Datei danach an M-Industries schicken.", voltage: "SPANNUNG",
    fc: "POWER FC PRÜFEN", fcAdapter: "USB-ADAPTER", fcNone: "Kein Adapter mit Power-FC-Antwort – FC-Datalogit am Pi eingesteckt?", fcStream: "POWER FC", fcWait: "Warte auf Antwort … Zündung an?", fcTitle: "ANSCHLUSS", fc1: "FC-Datalogit an den Anschluss der Power FC stecken (dort, wo sonst Commander oder Laptop hängt).", fc2: "USB-Kabel des Datalogit an den Pi, Zündung an.", fc3: "Nicht gleichzeitig mit FC-Edit am Laptop verbinden.", 
    link: "LINK EINRICHTEN", adapter: "CAN-ADAPTER", noAdapter: "Kein USB-CAN-Adapter gefunden – einstecken (z. B. CANable / candleLight).", stream: "LINK-DATENSTROM", streamWait: "Warte auf Daten … Zündung an?", noPerm: "CAN-Adapter lässt sich nicht aktivieren – Update erneut installieren.", pcl1: "PCLink verbinden → ECU Controls → CAN Setup.", pcl2: "Freien CAN-Kanal auf „Transmit Generic Dash“ stellen, ID 1000, Rate 20 Hz.", pcl3: "Bitrate des CAN-Moduls: 1 Mbit/s (500 kbit/s wird ebenfalls erkannt).", pcl4: "Speichern (Store). Gilt für G4, G4+ und G4X.", pclTitle: "EINSTELLUNG IN PCLINK", hal: "HALTECH EINRICHTEN", halStream: "HALTECH-DATENSTROM", halTitle: "EINSTELLUNG IN NSP", hal1: "USB-CAN-Adapter an den CAN-Bus der Haltech (CAN H / CAN L, 120 Ω Abschluss am Busende).", hal2: "NSP verbinden → Main Setup → CAN Setup.", hal3: "Auf dem genutzten CAN-Bus „Haltech CAN Broadcast“ aktivieren, Bitrate 1 Mbit/s.", hal4: "An die ECU senden und speichern. Gilt für Elite und Nexus.",
    conn: "CONSULT-VERBINDUNG", connSub: "Wie ist das Consult-Steuergerät angeschlossen?", c_usb: "USB-KABEL", c_bt: "BLUETOOTH", usbHint: "Consult-USB-Kabel am Diagnosestecker und am Pi einstecken. Wird beim Verbindungstest automatisch erkannt.", btHint: "Bluetooth-Adapter am Consult-Stecker einstecken, Zündung an. PIN meist 1234 oder 0000.", btScan: "ADAPTER SUCHEN", btScanning: "SUCHE (ca. 10 s) …", btNone: "Kein Gerät gefunden – Adapter eingesteckt, Zündung an?", pin: "PIN", pair: "KOPPELN", pairing: "KOPPLE …", paired: "Gekoppelt ✓ – weiter zum Verbindungstest", pairFail: "Koppeln fehlgeschlagen – Adapter in Reichweite?", pinFail: "Falsche PIN", likely: "CONSULT?", active: "AKTIV", hintBt: "Zündung an? Bluetooth-Adapter am Consult-Stecker eingesteckt und gekoppelt?",
    vehicle: "FAHRZEUG", change: "ÄNDERN", runSetup: "EINRICHTUNG STARTEN", rpm: "DREHZAHL", water: "WASSER", volt: "BATTERIE",
  },
  en: {
    piOnly: "", piOnlyMsg: "", welcome: "WELCOME", welcomeSub: "Let's set up your R34 OS in a few steps.", lang: "LANGUAGE",
    wifi: "WI-FI", wifiSub: "For maps, apps and streaming. You can also do this later.",
    ecu: "VEHICLE & ECU", ecuSub: "Choose your ECU – or let the system search (ignition on).",
    auto: "AUTO DETECT", scanning: "SEARCHING …", foundConsult: "Consult ECU found – please choose your vehicle:",
    foundCan: "CAN adapter found – Link/Haltech drivers are coming soon.", silent: "Adapter found but no answer. Ignition on?",
    nothing: "Nothing found – check the cable or choose below.",
    g_nissan: "NISSAN STOCK", g_tuned: "TUNED · CONSULT", g_standalone: "STANDALONE", g_demo: "NO CAR",
    d_nistune: "inside the stock ECU", d_piggyback: "piggyback ECU", d_link: "USB-CAN adapter", d_powerfc: "FC-Datalogit", d_haltech: "USB-CAN adapter", d_demo: "showroom mode with sample values",
    soon: "SOON", soonMsg: "Driver arrives with version",
    test: "CONNECTION TEST", ok: "CONNECTED", wait: "WAITING FOR DATA …",
    hintConsult: "Ignition on? Consult cable plugged into the diagnostic port (driver's footwell)?", hintDemo: "Demo mode: showing sample values.",
    later: "You can continue without a connection.",
    units: "UNITS", look: "LOOK", font: "FONT", design: "DESIGN",
    done: "DONE", doneSub: "All set. Enjoy the drive!", go: "LET'S GO",
    back: "BACK", next: "NEXT", skip: "SKIP", close: "CLOSE",
    h_weak: "Raspberry Pi 3: video streaming may stutter.", h_psu27: "Pi 5: use the official 27 W power supply.",
    h_noJack: "Pi 5 has no audio jack – use HDMI, Bluetooth or USB audio.", h_power: "Under-voltage detected – use a stronger power supply.",
    tps: "LEARN THROTTLE", tpsHelp: "Engine off, ignition on. 1. Foot off the pedal → SAVE IDLE. 2. Pedal fully down → SAVE FULL THROTTLE.", saveIdle: "SAVE IDLE", saveWot: "SAVE FULL THROTTLE", std: "DEFAULT", tpsNoData: "No data – ignition on?", tpsRange: "Idle and full throttle are too close – press the pedal all the way down.", saved: "Saved", sensors: "SENSORS", sensorsSub: "Where do boost and oil values come from? Missing sensors are hidden.", s_boost: "BOOST", s_oilp: "OIL PRESSURE", s_oilt: "OIL TEMP", src_ecu: "ECU", src_esp32: "EXTRA SENSOR", src_none: "NONE", diag: "RECORD DIAGNOSTICS (60 s)", diagRun: "Recording … remaining", diagUsb: "Saved to USB stick:", diagInt: "No USB stick – saved internally:", diagHint: "Ignition on, engine running, rev it. Then send the file to M-Industries.", voltage: "VOLTAGE",
    fc: "CHECK POWER FC", fcAdapter: "USB ADAPTER", fcNone: "No adapter with a Power FC answer – FC-Datalogit plugged into the Pi?", fcStream: "POWER FC", fcWait: "Waiting for an answer … ignition on?", fcTitle: "CONNECTION", fc1: "Plug the FC-Datalogit into the Power FC port (where the Commander or laptop usually goes).", fc2: "Datalogit USB cable to the Pi, ignition on.", fc3: "Do not connect FC-Edit on a laptop at the same time.", 
    link: "LINK SETUP", adapter: "CAN ADAPTER", noAdapter: "No USB-CAN adapter found – plug one in (e.g. CANable / candleLight).", stream: "LINK DATA STREAM", streamWait: "Waiting for data … ignition on?", noPerm: "Cannot activate the CAN adapter – reinstall the update.", pcl1: "Connect PCLink → ECU Controls → CAN Setup.", pcl2: "Set a free CAN channel to “Transmit Generic Dash”, ID 1000, rate 20 Hz.", pcl3: "CAN module bit rate: 1 Mbit/s (500 kbit/s is detected too).", pcl4: "Store. Applies to G4, G4+ and G4X.", pclTitle: "SETTINGS IN PCLINK", hal: "HALTECH SETUP", halStream: "HALTECH DATA STREAM", halTitle: "SETTINGS IN NSP", hal1: "Connect the USB-CAN adapter to the Haltech CAN bus (CAN H / CAN L, 120 Ω termination at the bus end).", hal2: "Connect NSP → Main Setup → CAN Setup.", hal3: "Enable “Haltech CAN Broadcast” on the CAN bus you use, bit rate 1 Mbit/s.", hal4: "Send to the ECU and save. Applies to Elite and Nexus.",
    conn: "CONSULT CONNECTION", connSub: "How is the Consult ECU connected?", c_usb: "USB CABLE", c_bt: "BLUETOOTH", usbHint: "Plug the Consult USB cable into the diagnostic port and the Pi. It is detected automatically in the connection test.", btHint: "Plug the Bluetooth adapter into the Consult port, ignition on. PIN is usually 1234 or 0000.", btScan: "SEARCH ADAPTER", btScanning: "SEARCHING (approx. 10 s) …", btNone: "No device found – adapter plugged in, ignition on?", pin: "PIN", pair: "PAIR", pairing: "PAIRING …", paired: "Paired ✓ – continue to the connection test", pairFail: "Pairing failed – adapter in range?", pinFail: "Wrong PIN", likely: "CONSULT?", active: "ACTIVE", hintBt: "Ignition on? Bluetooth adapter plugged into the Consult port and paired?",
    vehicle: "VEHICLE", change: "CHANGE", runSetup: "RUN SETUP", rpm: "RPM", water: "WATER", volt: "BATTERY",
  },
  es: {
    piOnly: "", piOnlyMsg: "", welcome: "BIENVENIDO", welcomeSub: "Configuremos tu R34 OS en pocos pasos.", lang: "IDIOMA",
    wifi: "WI-FI", wifiSub: "Para mapa, apps y streaming. También puedes hacerlo más tarde.",
    ecu: "VEHÍCULO Y CENTRALITA", ecuSub: "Elige tu centralita – o deja que el sistema la busque (contacto puesto).",
    auto: "BUSCAR AUTOMÁTICAMENTE", scanning: "BUSCANDO …", foundConsult: "Centralita Consult encontrada – elige tu vehículo:",
    foundCan: "Adaptador CAN encontrado – los drivers Link/Haltech llegarán pronto.", silent: "Adaptador encontrado, pero sin respuesta. ¿Contacto puesto?",
    nothing: "No se encontró nada – revisa el cable o elige abajo.",
    g_nissan: "NISSAN ORIGINAL", g_tuned: "PREPARADO · CONSULT", g_standalone: "PROGRAMABLE", g_demo: "SIN COCHE",
    d_nistune: "en la centralita original", d_piggyback: "centralita adicional", d_link: "adaptador USB-CAN", d_powerfc: "FC-Datalogit", d_haltech: "adaptador USB-CAN", d_demo: "modo demostración con valores de ejemplo",
    soon: "PRONTO", soonMsg: "El driver llega con la versión",
    test: "PRUEBA DE CONEXIÓN", ok: "CONECTADO", wait: "ESPERANDO DATOS …",
    hintConsult: "¿Contacto puesto? ¿Cable Consult en el conector de diagnóstico (zona de pies del conductor)?", hintDemo: "Modo demo: se muestran valores de ejemplo.",
    later: "Puedes continuar sin conexión.",
    units: "UNIDADES", look: "ASPECTO", font: "FUENTE", design: "DISEÑO",
    done: "LISTO", doneSub: "Todo configurado. ¡Buen viaje!", go: "VAMOS",
    back: "ATRÁS", next: "SIGUIENTE", skip: "OMITIR", close: "CERRAR",
    h_weak: "Raspberry Pi 3: el streaming de vídeo puede ir a tirones.", h_psu27: "Pi 5: usa la fuente oficial de 27 W.",
    h_noJack: "La Pi 5 no tiene jack – sonido por HDMI, Bluetooth o USB.", h_power: "Subtensión detectada – usa una fuente más potente.",
    tps: "CALIBRAR MARIPOSA", tpsHelp: "Motor apagado, contacto puesto. 1. Pie fuera del acelerador → GUARDAR RALENTÍ. 2. Acelerador a fondo → GUARDAR A FONDO.", saveIdle: "GUARDAR RALENTÍ", saveWot: "GUARDAR A FONDO", std: "ESTÁNDAR", tpsNoData: "Sin datos – ¿contacto puesto?", tpsRange: "Ralentí y a fondo están demasiado cerca – pisa el acelerador hasta el fondo.", saved: "Guardado", sensors: "SENSORES", sensorsSub: "¿De dónde vienen la presión de turbo y los valores de aceite? Los sensores que no existen se ocultan.", s_boost: "PRESIÓN TURBO", s_oilp: "PRESIÓN ACEITE", s_oilt: "TEMP. ACEITE", src_ecu: "CENTRALITA", src_esp32: "SENSOR EXTRA", src_none: "NINGUNO", diag: "GRABAR DIAGNÓSTICO (60 s)", diagRun: "Grabando … quedan", diagUsb: "Guardado en el USB:", diagInt: "Sin USB – guardado internamente:", diagHint: "Contacto puesto, motor en marcha, acelera. Después envía el archivo a M-Industries.", voltage: "TENSIÓN",
    fc: "COMPROBAR POWER FC", fcAdapter: "ADAPTADOR USB", fcNone: "Ningún adaptador responde como Power FC – ¿FC-Datalogit conectado a la Pi?", fcStream: "POWER FC", fcWait: "Esperando respuesta … ¿contacto puesto?", fcTitle: "CONEXIÓN", fc1: "Conecta el FC-Datalogit al puerto de la Power FC (donde va el Commander o el portátil).", fc2: "Cable USB del Datalogit a la Pi, contacto puesto.", fc3: "No conectes FC-Edit en un portátil al mismo tiempo.", 
    link: "CONFIGURAR LINK", adapter: "ADAPTADOR CAN", noAdapter: "No se encontró adaptador USB-CAN – conéctalo (p. ej. CANable / candleLight).", stream: "DATOS DE LINK", streamWait: "Esperando datos … ¿contacto puesto?", noPerm: "No se puede activar el adaptador CAN – reinstala la actualización.", pcl1: "Conecta PCLink → ECU Controls → CAN Setup.", pcl2: "Pon un canal CAN libre en “Transmit Generic Dash”, ID 1000, 20 Hz.", pcl3: "Velocidad del módulo CAN: 1 Mbit/s (también se detecta 500 kbit/s).", pcl4: "Guardar (Store). Vale para G4, G4+ y G4X.", pclTitle: "AJUSTES EN PCLINK", hal: "CONFIGURAR HALTECH", halStream: "DATOS DE HALTECH", halTitle: "AJUSTES EN NSP", hal1: "Conecta el adaptador USB-CAN al bus CAN de la Haltech (CAN H / CAN L, terminación de 120 Ω al final del bus).", hal2: "Conecta NSP → Main Setup → CAN Setup.", hal3: "Activa “Haltech CAN Broadcast” en el bus CAN que uses, 1 Mbit/s.", hal4: "Envía a la ECU y guarda. Vale para Elite y Nexus.",
    conn: "CONEXIÓN CONSULT", connSub: "¿Cómo está conectada la centralita Consult?", c_usb: "CABLE USB", c_bt: "BLUETOOTH", usbHint: "Conecta el cable Consult USB al conector de diagnóstico y a la Pi. Se detecta automáticamente en la prueba de conexión.", btHint: "Conecta el adaptador Bluetooth al conector Consult, contacto puesto. El PIN suele ser 1234 o 0000.", btScan: "BUSCAR ADAPTADOR", btScanning: "BUSCANDO (aprox. 10 s) …", btNone: "No se encontró ningún dispositivo – ¿adaptador conectado, contacto puesto?", pin: "PIN", pair: "VINCULAR", pairing: "VINCULANDO …", paired: "Vinculado ✓ – sigue con la prueba de conexión", pairFail: "Error al vincular – ¿adaptador al alcance?", pinFail: "PIN incorrecto", likely: "¿CONSULT?", active: "ACTIVO", hintBt: "¿Contacto puesto? ¿Adaptador Bluetooth en el conector Consult y vinculado?",
    vehicle: "VEHÍCULO", change: "CAMBIAR", runSetup: "INICIAR CONFIGURACIÓN", rpm: "RPM", water: "AGUA", volt: "BATERÍA",
  },
  el: {
    piOnly: "", piOnlyMsg: "", welcome: "ΚΑΛΩΣ ΗΡΘΕΣ", welcomeSub: "Ας ρυθμίσουμε το R34 OS σε λίγα βήματα.", lang: "ΓΛΩΣΣΑ",
    wifi: "WI-FI", wifiSub: "Για χάρτη, εφαρμογές και streaming. Γίνεται και αργότερα.",
    ecu: "ΟΧΗΜΑ & ΕΓΚΕΦΑΛΟΣ", ecuSub: "Διάλεξε τον εγκέφαλο – ή άφησε το σύστημα να ψάξει (μίζα ανοιχτή).",
    auto: "ΑΥΤΟΜΑΤΗ ΑΝΑΖΗΤΗΣΗ", scanning: "ΑΝΑΖΗΤΗΣΗ …", foundConsult: "Βρέθηκε εγκέφαλος Consult – διάλεξε όχημα:",
    foundCan: "Βρέθηκε αντάπτορας CAN – οι οδηγοί Link/Haltech έρχονται σύντομα.", silent: "Βρέθηκε αντάπτορας, αλλά χωρίς απάντηση. Μίζα ανοιχτή;",
    nothing: "Δεν βρέθηκε τίποτα – έλεγξε το καλώδιο ή διάλεξε παρακάτω.",
    g_nissan: "NISSAN ΕΡΓΟΣΤΑΣΙΑΚΟ", g_tuned: "ΠΕΙΡΑΓΜΕΝΟ · CONSULT", g_standalone: "ΠΡΟΓΡΑΜΜΑΤΙΖΟΜΕΝΟ", g_demo: "ΧΩΡΙΣ ΑΥΤΟΚΙΝΗΤΟ",
    d_nistune: "μέσα στον εργοστασιακό εγκέφαλο", d_piggyback: "πρόσθετος εγκέφαλος", d_link: "αντάπτορας USB-CAN", d_powerfc: "FC-Datalogit", d_haltech: "αντάπτορας USB-CAN", d_demo: "λειτουργία επίδειξης με παραδείγματα",
    soon: "ΣΥΝΤΟΜΑ", soonMsg: "Ο οδηγός έρχεται με την έκδοση",
    test: "ΔΟΚΙΜΗ ΣΥΝΔΕΣΗΣ", ok: "ΣΥΝΔΕΘΗΚΕ", wait: "ΑΝΑΜΟΝΗ ΔΕΔΟΜΕΝΩΝ …",
    hintConsult: "Μίζα ανοιχτή; Καλώδιο Consult στην υποδοχή διάγνωσης (χώρος ποδιών οδηγού);", hintDemo: "Λειτουργία επίδειξης: εμφανίζονται τιμές παραδείγματος.",
    later: "Μπορείς να συνεχίσεις και χωρίς σύνδεση.",
    units: "ΜΟΝΑΔΕΣ", look: "ΕΜΦΑΝΙΣΗ", font: "ΓΡΑΜΜΑΤΟΣΕΙΡΑ", design: "ΣΧΕΔΙΟ",
    done: "ΕΤΟΙΜΟ", doneSub: "Όλα ρυθμίστηκαν. Καλό δρόμο!", go: "ΠΑΜΕ",
    back: "ΠΙΣΩ", next: "ΕΠΟΜΕΝΟ", skip: "ΠΑΡΑΛΕΙΨΗ", close: "ΚΛΕΙΣΙΜΟ",
    h_weak: "Raspberry Pi 3: το streaming βίντεο μπορεί να κολλάει.", h_psu27: "Pi 5: χρησιμοποίησε το επίσημο τροφοδοτικό 27 W.",
    h_noJack: "Το Pi 5 δεν έχει υποδοχή ήχου – ήχος μέσω HDMI, Bluetooth ή USB.", h_power: "Χαμηλή τάση – χρησιμοποίησε ισχυρότερο τροφοδοτικό.",
    tps: "ΕΚΜΑΘΗΣΗ ΠΕΤΑΛΟΥΔΑΣ", tpsHelp: "Κινητήρας σβηστός, μίζα ανοιχτή. 1. Πόδι εκτός γκαζιού → ΑΠΟΘΗΚΕΥΣΗ ΡΕΛΑΝΤΙ. 2. Γκάζι μέχρι κάτω → ΑΠΟΘΗΚΕΥΣΗ ΤΕΡΜΑ.", saveIdle: "ΑΠΟΘΗΚΕΥΣΗ ΡΕΛΑΝΤΙ", saveWot: "ΑΠΟΘΗΚΕΥΣΗ ΤΕΡΜΑ", std: "ΠΡΟΕΠΙΛΟΓΗ", tpsNoData: "Χωρίς δεδομένα – μίζα ανοιχτή;", tpsRange: "Ρελαντί και τέρμα είναι πολύ κοντά – πάτα το γκάζι μέχρι κάτω.", saved: "Αποθηκεύτηκε", sensors: "ΑΙΣΘΗΤΗΡΕΣ", sensorsSub: "Από πού έρχονται η πίεση turbo και οι τιμές λαδιού; Οι αισθητήρες που λείπουν κρύβονται.", s_boost: "ΠΙΕΣΗ TURBO", s_oilp: "ΠΙΕΣΗ ΛΑΔΙΟΥ", s_oilt: "ΘΕΡΜ. ΛΑΔΙΟΥ", src_ecu: "ΕΓΚΕΦΑΛΟΣ", src_esp32: "ΠΡΟΣΘ. ΑΙΣΘΗΤΗΡΑΣ", src_none: "ΚΑΝΕΝΑΣ", diag: "ΚΑΤΑΓΡΑΦΗ ΔΙΑΓΝΩΣΗΣ (60 s)", diagRun: "Καταγραφή … απομένουν", diagUsb: "Αποθηκεύτηκε στο USB:", diagInt: "Χωρίς USB – αποθηκεύτηκε εσωτερικά:", diagHint: "Μίζα ανοιχτή, κινητήρας σε λειτουργία, δώσε γκάζι. Μετά στείλε το αρχείο στη M-Industries.", voltage: "ΤΑΣΗ",
    fc: "ΕΛΕΓΧΟΣ POWER FC", fcAdapter: "ΑΝΤΑΠΤΟΡΑΣ USB", fcNone: "Κανένας αντάπτορας δεν απαντά ως Power FC – FC-Datalogit στο Pi;", fcStream: "POWER FC", fcWait: "Αναμονή απάντησης … μίζα ανοιχτή;", fcTitle: "ΣΥΝΔΕΣΗ", fc1: "Σύνδεσε το FC-Datalogit στην υποδοχή της Power FC (εκεί που μπαίνει ο Commander ή το laptop).", fc2: "Καλώδιο USB του Datalogit στο Pi, μίζα ανοιχτή.", fc3: "Μη συνδέεις ταυτόχρονα FC-Edit σε laptop.", 
    link: "ΡΥΘΜΙΣΗ LINK", adapter: "ΑΝΤΑΠΤΟΡΑΣ CAN", noAdapter: "Δεν βρέθηκε αντάπτορας USB-CAN – σύνδεσέ τον (π.χ. CANable / candleLight).", stream: "ΔΕΔΟΜΕΝΑ LINK", streamWait: "Αναμονή δεδομένων … μίζα ανοιχτή;", noPerm: "Ο αντάπτορας CAN δεν ενεργοποιείται – εγκατάστησε ξανά την ενημέρωση.", pcl1: "Σύνδεσε το PCLink → ECU Controls → CAN Setup.", pcl2: "Βάλε ένα ελεύθερο κανάλι CAN σε «Transmit Generic Dash», ID 1000, 20 Hz.", pcl3: "Ταχύτητα μονάδας CAN: 1 Mbit/s (αναγνωρίζεται και 500 kbit/s).", pcl4: "Αποθήκευση (Store). Ισχύει για G4, G4+ και G4X.", pclTitle: "ΡΥΘΜΙΣΕΙΣ ΣΤΟ PCLINK", hal: "ΡΥΘΜΙΣΗ HALTECH", halStream: "ΔΕΔΟΜΕΝΑ HALTECH", halTitle: "ΡΥΘΜΙΣΕΙΣ ΣΤΟ NSP", hal1: "Σύνδεσε τον αντάπτορα USB-CAN στο CAN της Haltech (CAN H / CAN L, τερματισμός 120 Ω στο τέλος του δικτύου).", hal2: "Σύνδεσε το NSP → Main Setup → CAN Setup.", hal3: "Ενεργοποίησε «Haltech CAN Broadcast» στο κανάλι CAN που χρησιμοποιείς, 1 Mbit/s.", hal4: "Αποστολή στον εγκέφαλο και αποθήκευση. Ισχύει για Elite και Nexus.",
    conn: "ΣΥΝΔΕΣΗ CONSULT", connSub: "Πώς συνδέεται ο εγκέφαλος Consult;", c_usb: "ΚΑΛΩΔΙΟ USB", c_bt: "BLUETOOTH", usbHint: "Σύνδεσε το καλώδιο Consult USB στην υποδοχή διάγνωσης και στο Pi. Αναγνωρίζεται αυτόματα στη δοκιμή σύνδεσης.", btHint: "Σύνδεσε τον αντάπτορα Bluetooth στην υποδοχή Consult, μίζα ανοιχτή. Το PIN είναι συνήθως 1234 ή 0000.", btScan: "ΑΝΑΖΗΤΗΣΗ ΑΝΤΑΠΤΟΡΑ", btScanning: "ΑΝΑΖΗΤΗΣΗ (περ. 10 s) …", btNone: "Δεν βρέθηκε συσκευή – αντάπτορας συνδεδεμένος, μίζα ανοιχτή;", pin: "PIN", pair: "ΣΥΖΕΥΞΗ", pairing: "ΣΥΖΕΥΞΗ …", paired: "Έγινε σύζευξη ✓ – συνέχεια στη δοκιμή σύνδεσης", pairFail: "Η σύζευξη απέτυχε – αντάπτορας εντός εμβέλειας;", pinFail: "Λάθος PIN", likely: "CONSULT;", active: "ΕΝΕΡΓΟ", hintBt: "Μίζα ανοιχτή; Αντάπτορας Bluetooth στην υποδοχή Consult και σε σύζευξη;",
    vehicle: "ΟΧΗΜΑ", change: "ΑΛΛΑΓΗ", runSetup: "ΕΚΚΙΝΗΣΗ ΡΥΘΜΙΣΗΣ", rpm: "ΣΤΡΟΦΕΣ", water: "ΝΕΡΟ", volt: "ΜΠΑΤΑΡΙΑ",
  },
  ja: {
    piOnly: "", piOnlyMsg: "", welcome: "ようこそ", welcomeSub: "数ステップで R34 OS を設定しましょう。", lang: "言語",
    wifi: "WI-FI", wifiSub: "地図・アプリ・ストリーミング用。後でも設定できます。",
    ecu: "車両と ECU", ecuSub: "ECU を選ぶか、自動検索してください（イグニッション ON）。",
    auto: "自動検索", scanning: "検索中 …", foundConsult: "Consult ECU を検出 – 車両を選んでください：",
    foundCan: "CAN アダプターを検出 – Link/Haltech ドライバーは近日対応。", silent: "アダプターはありますが応答がありません。イグニッション ON？",
    nothing: "見つかりません – ケーブルを確認するか下から選んでください。",
    g_nissan: "日産純正", g_tuned: "チューニング · CONSULT", g_standalone: "フルコン", g_demo: "車なし",
    d_nistune: "純正 ECU 内蔵", d_piggyback: "サブコン", d_link: "USB-CAN アダプター", d_powerfc: "FC-Datalogit", d_haltech: "USB-CAN アダプター", d_demo: "サンプル値のデモモード",
    soon: "近日", soonMsg: "ドライバー対応バージョン",
    test: "接続テスト", ok: "接続 OK", wait: "データ待ち …",
    hintConsult: "イグニッション ON？ Consult ケーブルは診断コネクター（運転席足元）に接続済み？", hintDemo: "デモモード：サンプル値を表示しています。",
    later: "接続なしでも続行できます。",
    units: "単位", look: "外観", font: "フォント", design: "デザイン",
    done: "完了", doneSub: "設定完了。よいドライブを！", go: "スタート",
    back: "戻る", next: "次へ", skip: "スキップ", close: "閉じる",
    h_weak: "Raspberry Pi 3：動画ストリーミングがカクつくことがあります。", h_psu27: "Pi 5：公式 27 W 電源を使用してください。",
    h_noJack: "Pi 5 にはオーディオ端子がありません – HDMI・Bluetooth・USB で出力。", h_power: "電圧不足を検出 – より強力な電源を使用してください。",
    tps: "スロットル学習", tpsHelp: "エンジン停止・イグニッション ON。1. アクセルから足を離す → アイドル保存。2. アクセルを全開まで踏む → 全開保存。", saveIdle: "アイドル保存", saveWot: "全開保存", std: "標準", tpsNoData: "データなし – イグニッション ON？", tpsRange: "アイドルと全開が近すぎます – ペダルを最後まで踏んでください。", saved: "保存しました", sensors: "センサー", sensorsSub: "ブースト・油圧・油温の取得元は？ 無いセンサーは非表示になります。", s_boost: "ブースト", s_oilp: "油圧", s_oilt: "油温", src_ecu: "ECU", src_esp32: "追加センサー", src_none: "なし", diag: "診断記録（60 秒）", diagRun: "記録中 … 残り", diagUsb: "USB に保存：", diagInt: "USB なし – 内部に保存：", diagHint: "イグニッション ON、エンジン始動、空ぶかし。その後ファイルを M-Industries に送ってください。", voltage: "電圧",
    fc: "POWER FC 確認", fcAdapter: "USB アダプター", fcNone: "Power FC の応答がありません – FC-Datalogit は Pi に接続済み？", fcStream: "POWER FC", fcWait: "応答待ち … イグニッション ON？", fcTitle: "接続", fc1: "FC-Datalogit を Power FC のポート（コマンダーやノート PC をつなぐ所）に接続。", fc2: "Datalogit の USB ケーブルを Pi へ、イグニッション ON。", fc3: "ノート PC の FC-Edit と同時に接続しないでください。", 
    link: "LINK 設定", adapter: "CAN アダプター", noAdapter: "USB-CAN アダプターが見つかりません – 接続してください（例：CANable / candleLight）。", stream: "LINK データ", streamWait: "データ待ち … イグニッション ON？", noPerm: "CAN アダプターを有効にできません – アップデートを再インストールしてください。", pcl1: "PCLink を接続 → ECU Controls → CAN Setup。", pcl2: "空いている CAN チャンネルを「Transmit Generic Dash」、ID 1000、20 Hz に設定。", pcl3: "CAN モジュールのビットレート：1 Mbit/s（500 kbit/s も自動認識）。", pcl4: "保存（Store）。G4・G4+・G4X 共通。", pclTitle: "PCLINK の設定", hal: "HALTECH 設定", halStream: "HALTECH データ", halTitle: "NSP の設定", hal1: "USB-CAN アダプターを Haltech の CAN バスに接続（CAN H / CAN L、バス終端に 120 Ω）。", hal2: "NSP を接続 → Main Setup → CAN Setup。", hal3: "使用する CAN バスで「Haltech CAN Broadcast」を有効化、1 Mbit/s。", hal4: "ECU に送信して保存。Elite・Nexus 共通。",
    conn: "CONSULT 接続", connSub: "Consult ECU の接続方法は？", c_usb: "USB ケーブル", c_bt: "BLUETOOTH", usbHint: "Consult USB ケーブルを診断コネクターと Pi に接続。接続テストで自動検出されます。", btHint: "Bluetooth アダプターを Consult コネクターに接続、イグニッション ON。PIN は通常 1234 または 0000。", btScan: "アダプター検索", btScanning: "検索中（約 10 秒）…", btNone: "デバイスが見つかりません – アダプター接続済み、イグニッション ON？", pin: "PIN", pair: "ペアリング", pairing: "ペアリング中 …", paired: "ペアリング完了 ✓ – 接続テストへ", pairFail: "ペアリング失敗 – アダプターは範囲内？", pinFail: "PIN が違います", likely: "CONSULT？", active: "使用中", hintBt: "イグニッション ON？ Bluetooth アダプターは Consult コネクターに接続・ペアリング済み？",
    vehicle: "車両", change: "変更", runSetup: "セットアップ開始", rpm: "回転数", water: "水温", volt: "バッテリー",
  },
};
// App: eigene Begrüßung; CAN- und Power-FC-Steuergeräte gibt es (noch) nur am Pi
if (APP) {
  const X: Record<Lang, { welcomeSub: string; piOnly: string; piOnlyMsg: string }> = {
    de: { welcomeSub: "Richten wir R3x Mobile in wenigen Schritten ein.", piOnly: "NUR R34 OS (PI)", piOnlyMsg: "geht in der App noch nicht – nur mit R34 OS am Raspberry Pi." },
    en: { welcomeSub: "Let's set up R3x Mobile in a few steps.", piOnly: "R34 OS (PI) ONLY", piOnlyMsg: "is not available in the app yet – only with R34 OS on the Raspberry Pi." },
    es: { welcomeSub: "Configuremos R3x Mobile en pocos pasos.", piOnly: "SOLO R34 OS (PI)", piOnlyMsg: "aún no está disponible en la app – solo con R34 OS en la Raspberry Pi." },
    el: { welcomeSub: "Ας ρυθμίσουμε το R3x Mobile σε λίγα βήματα.", piOnly: "ΜΟΝΟ R34 OS (PI)", piOnlyMsg: "δεν είναι ακόμη διαθέσιμο στην εφαρμογή – μόνο με R34 OS στο Raspberry Pi." },
    ja: { welcomeSub: "数ステップで R3x Mobile を設定しましょう。", piOnly: "R34 OS（Pi）のみ", piOnlyMsg: "はアプリではまだ使えません – Raspberry Pi の R34 OS のみ対応。" },
  };
  for (const k of Object.keys(X) as Lang[]) Object.assign(W[k], X[k]);
}
export const SETUP_T = W;
type WD = (typeof W)["de"];

const LANGS: [Lang, string][] = [["de", "DEUTSCH"], ["en", "ENGLISH"], ["es", "ESPAÑOL"], ["el", "ΕΛΛΗΝΙΚΆ"], ["ja", "日本語"]];
const DESC: Record<string, keyof WD> = { nistune: "d_nistune", piggyback: "d_piggyback", "link-g4": "d_link", powerfc: "d_powerfc", haltech: "d_haltech", demo: "d_demo" };
const GROUPS: Profile["group"][] = ["nissan", "tuned", "standalone", "demo"];

export function profileLabel(p: Profile | undefined, w: WD) {
  if (!p) return "—";
  const d = DESC[p.id] ? w[DESC[p.id]] : p.engine;
  return `${p.id === "demo" ? "DEMO" : p.name}${d ? " · " + d : ""}`;
}

type Step = "lang" | "wifi" | "ecu" | "conn" | "link" | "hal" | "fc" | "test" | "tps" | "sensors" | "units" | "look" | "done";
export function Setup({ start = 0, only, onDone }: { start?: number; only?: "ecu"; onDone: () => void }) {
  const { s, setS } = useContext(Cfg);
  const portrait = usePortrait();
  const w = W[s.lang]; const t = T[s.lang];
  const [info, setInfo] = useState<EcuInfo | null>(null);
  const cur = info?.profiles.find((p) => p.id === info.profile);
  // Zusatzschritte je Treiber: Consult → Drosselklappe einlernen; immer → Sensoren-Quelle
  // Link: eigener Einrichtungsschritt vor dem Verbindungstest
  const pre: Step[] = cur?.driver === "can-link" ? ["link"] : cur?.driver === "can-haltech" ? ["hal"] : cur?.driver === "consult" ? ["conn"] : cur?.driver === "powerfc" ? ["fc"] : [];
  const extra: Step[] = [...(cur?.driver === "consult" || cur?.driver === "powerfc" ? ["tps" as Step] : []), "sensors"];
  const steps: Step[] = only === "ecu" ? ["ecu", ...pre, "test", ...extra] : ["lang", ...(APP ? [] : ["wifi" as Step]), "ecu", ...pre, "test", ...extra, "units", "look", "done"];
  const [i, setI] = useState(Math.min(start, 8));
  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [wifiOpen, setWifiOpen] = useState(false);
  const reload = () => rfetch("/api/ecu").then((r) => r.json()).then(setInfo).catch(() => undefined);
  useEffect(() => { reload(); }, []);
  const step = steps[Math.min(i, steps.length - 1)];
  const finish = () => { post("/api/setup", { done: true }).catch(() => undefined); onDone(); };
  const next = () => (i < steps.length - 1 ? setI(i + 1) : only ? onDone() : finish());
  const back = () => setI(Math.max(0, i - 1));

  const pick = (p: Profile) => {
    if (p.status !== "ready") { setNote(p.eta === "pi" ? `${p.name} ${w.piOnlyMsg}` : `${p.name}: ${w.soonMsg} ${p.eta ?? ""}`); return; }
    setNote("");
    post("/api/ecu", { profile: p.id }).then((r) => {
      if (!r.ok) return;
      reload();
      // Schaltwarnung vom Fahrzeug (bei Tuning-Auswahl vom gewählten Grundfahrzeug)
      const car = p.group === "nissan" ? p : info?.profiles.find((x) => x.id === info?.car);
      if (car?.redline) setS((x) => ({ ...x, limits: { ...x.limits, redline: car.redline as number } }));
    }).catch(() => undefined);
  };
  const autoScan = () => {
    setBusy(true); setScan(null); setNote("");
    post("/api/ecu/scan", {}).then((r: Scan) => { setScan(r); reload(); }).catch(() => setScan({ consult: "", can: [], serial: [], suggest: [] })).finally(() => setBusy(false));
  };

  const big = "font-[family-name:var(--font-display)]";
  // Fußleiste: quer feste Breiten, hochkant teilen sich die Knöpfe die Zeile
  const fb = (wq: string) => (portrait ? "min-w-0 flex-1 truncate px-1 tracking-wide" : `${wq} tracking-widest`);
  const card = (on: boolean, dim = false) => `flex min-h-0 min-w-0 flex-col justify-center border px-2 py-1 text-left ${on ? "border-primary bg-primary/15 text-primary" : dim ? "text-muted-foreground opacity-60" : "text-foreground"}`;
  const sel = (on: boolean) => (on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground");
  const title = { lang: w.welcome, wifi: w.wifi, ecu: w.ecu, conn: w.conn, link: w.link, hal: w.hal, fc: w.fc, test: w.test, tps: w.tps, sensors: w.sensors, units: w.units, look: w.look, done: w.done }[step];
  const current = info?.profiles.find((p) => p.id === info.profile);

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-2 p-3" style={{ background: "var(--background)" }}>
      <div className="flex shrink-0 items-center gap-3">
        <TaillightLogo mode={busy ? "load" : "idle"} className="h-[calc(1.75rem/var(--fscale,1))] w-auto" />
        <div className={`${big} flex-1 text-primary ${portrait ? "text-sm leading-tight tracking-wide" : "truncate text-lg tracking-widest"}`}>{title}</div>
        <div className="flex shrink-0 gap-1.5">{steps.map((_, k) => <span key={k} className={`h-2 w-2 rounded-full ${k === i ? "bg-primary" : k < i ? "bg-primary/50" : "bg-muted"}`} />)}</div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {step === "lang" && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <TaillightLogo mode="idle" lit={[true, true, true, true]} className="h-[calc(4rem/var(--fscale,1))] w-auto" />
            <div className="text-sm text-muted-foreground">{w.welcomeSub}</div>
            <div className={`grid w-full max-w-2xl gap-2 ${portrait ? "grid-cols-2" : "grid-cols-5"}`}>
              {LANGS.map(([k, l]) => <button key={k} onClick={() => setS((p) => ({ ...p, lang: k }))} className={`min-h-14 border text-sm tracking-wide ${sel(s.lang === k)}`}>{l}</button>)}
            </div>
          </div>
        )}

        {step === "wifi" && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="text-sm text-muted-foreground">{w.wifiSub}</div>
            <button onClick={() => setWifiOpen(true)} className="min-h-14 w-72 border border-primary text-sm tracking-widest text-primary">{w.wifi} ›</button>
            {wifiOpen && <WifiPanel t={t} onClose={() => setWifiOpen(false)} />}
          </div>
        )}

        {step === "ecu" && (
          <div className="flex h-full flex-col gap-2">
            <div className="flex shrink-0 items-center gap-2">
              <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{note || (scan ? (scan.consult ? w.foundConsult : scan.can.length ? w.foundCan : scan.silent ? w.silent : w.nothing) : w.ecuSub)}</div>
              <button onClick={autoScan} disabled={busy} className="min-h-10 shrink-0 border border-accent px-3 text-xs tracking-widest text-accent disabled:opacity-50">⟳ {busy ? w.scanning : w.auto}</button>
            </div>
            <div className={`grid min-h-0 flex-1 gap-2 ${portrait ? "grid-cols-2 overflow-y-auto" : "grid-cols-4"}`}>
              {GROUPS.map((g) => (
                <div key={g} className="mfd-panel flex min-h-0 min-w-0 flex-col gap-1 p-1.5">
                  <div className="shrink-0 truncate text-[0.65rem] tracking-[0.2em] text-muted-foreground">{w[`g_${g}` as keyof WD]}</div>
                  <div className="grid min-h-0 flex-1 auto-rows-fr gap-1">
                    {info?.profiles.filter((p) => p.group === g).map((p) => {
                      // Grundfahrzeug bleibt markiert, auch wenn zusätzlich Tuning/freies Steuergerät gewählt ist (außer Demo)
                      const on = info.profile === p.id || (p.group === "nissan" && !!info.car && info.car === p.id && info.profile !== "demo");
                      const hint = scan?.suggest.includes(p.id);
                      return (
                        <button key={p.id} onClick={() => pick(p)} className={`${card(on, p.status !== "ready")} ${hint && !on ? "border-accent" : ""}`}>
                          <span className={`${big} truncate text-sm`}>{p.id === "demo" ? "DEMO" : p.name}{on ? " ✓" : ""}</span>
                          <span className="line-clamp-2 text-xs leading-tight text-muted-foreground">{p.status === "ready" ? (DESC[p.id] ? w[DESC[p.id]] : p.engine) : p.eta === "pi" ? w.piOnly : `${w.soon} · ${p.eta ?? ""}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {info && (
              <div className="shrink-0 truncate text-[0.7rem] text-muted-foreground">
                {info.pi.model !== "?" ? info.pi.model : "Raspberry Pi"}{info.pi.ram ? ` · ${Math.round(info.pi.ram / 1024)} GB` : ""}
                {info.pi.hints.map((h) => <span key={h} className="ml-2 text-accent">⚠ {w[`h_${h}` as keyof WD] ?? h}</span>)}
              </div>
            )}
          </div>
        )}

        {step === "conn" && <ConnStep w={w} info={info} onChanged={reload} onPaired={next} />}
        {step === "test" && <TestStep w={w} demo={current?.driver === "demo"} bt={info?.conn === "bt"} label={profileLabel(current, w) + (current?.driver === "consult" && info?.conn === "bt" ? " · BLUETOOTH" : "")} />}

        {step === "tps" && <TpsStep w={w} info={info} onSaved={reload} />}
        {step === "link" && <LinkStep w={w} />}
        {step === "hal" && <LinkStep w={w} hal />}
        {step === "fc" && <FcStep w={w} />}

        {step === "sensors" && info && (
          <div className="flex h-full flex-col justify-center gap-3">
            <div className="text-center text-sm text-muted-foreground">{w.sensorsSub}</div>
            {(["boost", "oilp", "oilt"] as SensorKey[]).map((k) => (
              <div key={k} className={`mx-auto grid w-full max-w-3xl items-center gap-2 ${APP ? "grid-cols-[1.2fr_1fr_1fr]" : "grid-cols-[1.2fr_1fr_1fr_1fr]"}`}>
                <span className={`${big} truncate text-base tracking-widest text-foreground`}>{w[`s_${k}` as keyof WD]}</span>
                {((APP ? ["ecu", "none"] : ["ecu", "esp32", "none"]) as Src[]).map((v) => {
                  const can = v !== "ecu" || (cur?.provides ?? []).includes(k);
                  return (
                    <button key={v} disabled={!can} onClick={() => post("/api/ecu/sensors", { [k]: v }).then(reload).catch(() => undefined)}
                      className={`min-h-12 truncate border px-1 text-xs tracking-widest disabled:opacity-25 ${sel(info.sensors[k] === v)}`}>{w[`src_${v}` as keyof WD]}</button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {step === "units" && (
          <div className="flex h-full flex-col justify-center gap-3">
            {([["speed", [["kmh", "KM/H"], ["mph", "MPH"]]], ["temp", [["c", "°C"], ["f", "°F"]]], ["press", [["bar", "BAR"], ["psi", "PSI"]]]] as const).map(([k, opts]) => (
              <div key={k} className="mx-auto grid w-full max-w-xl grid-cols-2 gap-2">
                {opts.map(([v, l]) => (
                  <button key={v} onClick={() => setS((p) => ({ ...p, units: { ...p.units, [k]: v } }))}
                    className={`${big} min-h-14 border text-lg tracking-widest ${sel((s.units as Record<string, string>)[k] === v)}`}>{l}</button>
                ))}
              </div>
            ))}
          </div>
        )}

        {step === "look" && (
          <div className="grid h-full grid-rows-2 gap-2">
            <div className="mfd-panel flex min-h-0 flex-col gap-1 p-2">
              <div className="text-xs tracking-[0.3em] text-muted-foreground">{w.design}</div>
              <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-1">
                {(Object.keys(DESIGNS) as DesignKey[]).map((k) => (
                  <button key={k} onClick={() => setS((p) => ({ ...p, design: k }))} className={`flex min-h-0 items-center gap-2 border px-2 ${s.design === k ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                    <span data-design={k} className="flex shrink-0 gap-0.5 border p-0.5" style={{ background: "var(--background)" }}><span className="h-3 w-3 bg-primary" /><span className="h-3 w-3 bg-accent" /></span>
                    <span className="truncate text-sm tracking-wide">{DESIGNS[k].label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mfd-panel flex min-h-0 flex-col gap-1 p-2">
              <div className="text-xs tracking-[0.3em] text-muted-foreground">{w.font}</div>
              <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-1">
                {(Object.keys(FONTS) as FontKey[]).map((k) => (
                  <button key={k} onClick={() => setS((p) => ({ ...p, font: k }))} style={{ fontFamily: FONTS[k].display }} className={`min-h-0 border text-base ${sel(s.font === k)}`}>{FONTS[k].label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <TaillightLogo mode="idle" lit={[true, true, true, true]} className="h-[calc(4rem/var(--fscale,1))] w-auto" />
            <div className={`${big} text-2xl tracking-widest text-primary`}>{w.doneSub}</div>
            <div className="text-sm text-muted-foreground">{profileLabel(current, w)}</div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {i > 0 ? <button onClick={back} className={`min-h-12 border text-sm text-muted-foreground ${fb("w-36")}`}>‹ {w.back}</button> : <span className={fb("w-36")} />}
        {!portrait && <div className="flex-1" />}
        {only === "ecu" && step !== steps[steps.length - 1] && <button onClick={onDone} className={`min-h-12 border text-sm text-muted-foreground ${fb("w-36")}`}>{w.close}</button>}
        {!only && step !== "done" && step !== "lang" && <button onClick={next} className={`min-h-12 border text-sm text-muted-foreground ${fb("w-40")}`}>{w.skip}</button>}
        <button onClick={next} className={`min-h-12 border border-primary bg-primary text-sm text-primary-foreground ${fb("w-48")}`}>{step === "done" ? w.go : step === steps[steps.length - 1] ? w.done : `${w.next} ›`}</button>
      </div>
    </div>
  );
}

function TestStep({ w, demo, bt, label }: { w: WD; demo: boolean; bt?: boolean; label: string }) {
  const d = useConsult();
  const ok = d.live === 1;
  const big = "font-[family-name:var(--font-display)]";
  const val = (v: number, dec = 0) => (ok ? v.toFixed(dec) : "—");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`${big} text-2xl tracking-widest ${ok ? "text-primary" : "text-accent"}`}>{ok ? "✓ " + w.ok : w.wait}</div>
      <div className="grid w-full max-w-2xl grid-cols-3 gap-2">
        {([[w.rpm, val(d.rpm), "/min"], [w.water, val(d.water), "°C"], [w.volt, val(d.volt, 1), "V"]] as const).map(([l, v, u]) => (
          <div key={l} className={`mfd-panel flex flex-col items-center p-3 ${ok ? "" : "opacity-50"}`}>
            <span className="text-xs tracking-widest text-muted-foreground">{l}</span>
            <span className={`${big} text-4xl text-primary`}>{v}</span>
            <span className="text-xs text-accent">{u}</span>
          </div>
        ))}
      </div>
      <div className="max-w-2xl text-center text-xs text-muted-foreground">{demo ? w.hintDemo : ok ? "" : `${bt ? w.hintBt : w.hintConsult} ${w.later}`}</div>
    </div>
  );
}

function TpsStep({ w, info, onSaved }: { w: WD; info: EcuInfo | null; onSaved: () => void }) {
  const d = useConsult() as ReturnType<typeof useConsult> & { tps_v?: number };
  const [msg, setMsg] = useState("");
  const ok = d.live === 1;
  const cal = info?.tps ?? info?.tps_default ?? [0.45, 4.05];
  const big = "font-[family-name:var(--font-display)]";
  const learn = (point: "closed" | "wot" | "reset") =>
    post("/api/ecu/tps", { point }).then((r) => { setMsg(r.ok ? w.saved + " ✓" : r.msg === "range" ? w.tpsRange : r.msg === "nodata" ? w.tpsNoData : "?"); onSaved(); }).catch(() => setMsg("?"));
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="max-w-3xl text-center text-sm text-muted-foreground">{w.tpsHelp}</div>
      <div className="grid w-full max-w-2xl grid-cols-2 gap-2">
        <div className={`mfd-panel flex flex-col items-center p-3 ${ok ? "" : "opacity-50"}`}>
          <span className="text-xs tracking-widest text-muted-foreground">{w.voltage}</span>
          <span className={`${big} text-4xl text-primary`}>{ok ? (d.tps_v ?? 0).toFixed(2) : "—"}</span><span className="text-xs text-accent">V</span>
        </div>
        <div className={`mfd-panel flex flex-col items-center p-3 ${ok ? "" : "opacity-50"}`}>
          <span className="text-xs tracking-widest text-muted-foreground">THROTTLE</span>
          <span className={`${big} text-4xl text-primary`}>{ok ? Math.round(d.throttle) : "—"}</span><span className="text-xs text-accent">%</span>
        </div>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-[1fr_1fr_auto] gap-2">
        <button disabled={!ok} onClick={() => learn("closed")} className="min-h-12 border border-primary text-xs tracking-widest text-primary disabled:opacity-40">{w.saveIdle} · {cal[0].toFixed(2)} V</button>
        <button disabled={!ok} onClick={() => learn("wot")} className="min-h-12 border border-primary text-xs tracking-widest text-primary disabled:opacity-40">{w.saveWot} · {cal[1].toFixed(2)} V</button>
        <button onClick={() => learn("reset")} className="min-h-12 border px-3 text-xs tracking-widest text-muted-foreground">{w.std}</button>
      </div>
      <div className="h-4 text-xs text-accent">{msg || (ok ? "" : w.tpsNoData)}</div>
    </div>
  );
}

type CanSt = { iface: string; bitrate: number; id: number | null; hz: number; frames: number; age: number | null; msg: string; ifaces: string[]; ids?: number[] };
function LinkStep({ w, hal = false }: { w: WD; hal?: boolean }) {
  const [c, setC] = useState<CanSt | null>(null);
  useEffect(() => {
    let on = true;
    const tick = () => rfetch("/api/ecu/can").then((r) => r.json()).then((j) => { if (on) setC(j); }).catch(() => undefined).finally(() => { if (on) setTimeout(tick, 1000); });
    tick(); return () => { on = false; };
  }, []);
  const hasAd = !!c && (c.ifaces.length > 0 || c.iface.startsWith("udp:"));
  const live = !!c && c.msg === "ok" && c.age !== null && c.age < 2;
  const row = (ok: boolean, label: string, text: string) => (
    <div className="mfd-panel flex items-center gap-3 px-3 py-2">
      <span className={`w-6 text-center text-xl ${ok ? "text-primary" : "text-accent"}`}>{ok ? "✓" : "…"}</span>
      <span className="w-44 shrink-0 text-xs tracking-widest text-muted-foreground">{label}</span>
      <span className={`min-w-0 flex-1 truncate text-sm ${ok ? "text-primary" : "text-accent"}`}>{text}</span>
    </div>
  );
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-2">
      {row(hasAd, w.adapter, hasAd ? (c!.iface || c!.ifaces[0]) + (c!.bitrate ? ` · ${c!.bitrate / 1000} kbit/s` : "") : w.noAdapter)}
      {row(live, hal ? w.halStream : w.stream, live ? (hal ? `${(c!.ids ?? []).map((x) => "0x" + x.toString(16).toUpperCase()).join(" ")} · ${c!.hz} Hz` : `ID ${c!.id} (0x${(c!.id ?? 0).toString(16).toUpperCase()}) · ${c!.hz} Hz`) : c?.msg === "noperm" ? w.noPerm : w.streamWait)}
      <div className="mfd-panel px-3 py-2">
        <div className="mb-1 text-xs tracking-widest text-muted-foreground">{hal ? w.halTitle : w.pclTitle}</div>
        <ol className="list-decimal space-y-0.5 pl-5 text-sm text-foreground">
          {hal ? <><li>{w.hal1}</li><li>{w.hal2}</li><li>{w.hal3}</li><li>{w.hal4}</li></> : <><li>{w.pcl1}</li><li>{w.pcl2}</li><li>{w.pcl3}</li><li>{w.pcl4}</li></>}
        </ol>
      </div>
    </div>
  );
}

type FcSt = { port: string; frames: number; hz: number; msg: string; age: number | null; active: boolean };
// Apexi Power FC: Adapter gefunden? Antwortet die Power FC? (Live-Prüfung alle 1 s)
function FcStep({ w }: { w: WD }) {
  const [c, setC] = useState<FcSt | null>(null);
  useEffect(() => {
    let on = true;
    const tick = () => rfetch("/api/ecu/fc").then((r) => r.json()).then((j) => { if (on) setC(j); }).catch(() => undefined).finally(() => { if (on) setTimeout(tick, 1000); });
    tick(); return () => { on = false; };
  }, []);
  const hasAd = !!c && !!c.port;
  const live = !!c && c.msg === "ok" && c.age !== null && c.age < 2;
  const row = (ok: boolean, label: string, text: string) => (
    <div className="mfd-panel flex items-center gap-3 px-3 py-2">
      <span className={`w-6 text-center text-xl ${ok ? "text-primary" : "text-accent"}`}>{ok ? "✓" : "…"}</span>
      <span className="w-44 shrink-0 text-xs tracking-widest text-muted-foreground">{label}</span>
      <span className={`min-w-0 flex-1 truncate text-sm ${ok ? "text-primary" : "text-accent"}`}>{text}</span>
    </div>
  );
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-2">
      {row(hasAd, w.fcAdapter, hasAd ? c!.port : w.fcNone)}
      {row(live, w.fcStream, live ? `${c!.hz} Hz` : w.fcWait)}
      <div className="mfd-panel px-3 py-2">
        <div className="mb-1 text-xs tracking-widest text-muted-foreground">{w.fcTitle}</div>
        <ol className="list-decimal space-y-0.5 pl-5 text-sm text-foreground"><li>{w.fc1}</li><li>{w.fc2}</li><li>{w.fc3}</li></ol>
      </div>
    </div>
  );
}

type BtDev = { mac: string; name: string; paired: boolean; likely: boolean };
// Consult-Verbindung: USB-Kabel oder Bluetooth-Adapter (SPP) suchen und mit PIN koppeln
function ConnStep({ w, info, onChanged, onPaired }: { w: WD; info: EcuInfo | null; onChanged: () => void; onPaired: () => void }) {
  const [mode, setMode] = useState<"usb" | "bt">(APP ? "bt" : info?.conn ?? "usb");
  const [devs, setDevs] = useState<BtDev[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pick, setPick] = useState("");
  const [pin, setPin] = useState("1234");
  const [state, setState] = useState<"" | "pairing" | "ok" | "fail" | "pin">("");
  const big = "font-[family-name:var(--font-display)]";
  const sel = (on: boolean) => (on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground");
  const curMac = info?.port?.startsWith("bt:") ? info.port.slice(3).toUpperCase() : "";
  const scan = () => {
    setScanning(true); setState("");
    rfetch("/api/ecu/bt?scan=1").then((r) => r.json()).then((d: BtDev[]) => { setDevs(d); if (!pick && d[0]?.likely) setPick(d[0].mac); }).catch(() => setDevs([])).finally(() => setScanning(false));
  };
  useEffect(() => { if (mode === "bt" && devs === null) rfetch("/api/ecu/bt").then((r) => r.json()).then(setDevs).catch(() => setDevs([])); }, [mode, devs]);
  const useUsb = () => { setMode("usb"); setState(""); if (info?.conn === "bt") post("/api/ecu/conn", { mode: "usb" }).then(onChanged).catch(() => undefined); };
  const pair = () => {
    if (!pick) return;
    setState("pairing");
    post("/api/ecu/conn", { mode: "bt", mac: pick, pin }).then((r) => { if (r.ok) { setState("ok"); onChanged(); setTimeout(onPaired, 1200); } else setState(r.msg === "pin" ? "pin" : "fail"); }).catch(() => setState("fail"));
  };
  const msg = state === "pairing" ? w.pairing : state === "ok" ? w.paired : state === "pin" ? w.pinFail : state === "fail" ? w.pairFail : "";
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-2">
      <div className="shrink-0 text-center text-sm text-muted-foreground">{w.connSub}</div>
      {!APP && <div className="grid shrink-0 grid-cols-2 gap-2">
        <button onClick={useUsb} className={`${big} min-h-14 border text-lg tracking-widest ${sel(mode === "usb")}`}>{w.c_usb}</button>
        <button onClick={() => setMode("bt")} className={`${big} min-h-14 border text-lg tracking-widest ${sel(mode === "bt")}`}>{w.c_bt}</button>
      </div>}
      {mode === "usb" ? (
        <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">{w.usbHint}</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{w.btHint}</div>
            <button onClick={scan} disabled={scanning || state === "pairing"} className="min-h-10 shrink-0 border border-accent px-3 text-xs tracking-widest text-accent disabled:opacity-50">⟳ {scanning ? w.btScanning : w.btScan}</button>
          </div>
          <div className="mfd-panel grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1 overflow-y-auto p-1.5">
            {devs && devs.length === 0 && !scanning && <div className="col-span-2 p-2 text-center text-xs text-accent">{w.btNone}</div>}
            {devs?.map((d) => (
              <button key={d.mac} onClick={() => { setPick(d.mac); setState(""); }} className={`flex min-h-11 min-w-0 items-center gap-2 border px-2 text-left ${pick === d.mac ? "border-primary bg-primary/15 text-primary" : "text-foreground"}`}>
                <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
                {d.mac === curMac && <span className="shrink-0 text-[0.65rem] tracking-widest text-primary">{w.active}</span>}
                {d.likely && d.mac !== curMac && <span className="shrink-0 text-[0.65rem] tracking-widest text-accent">{w.likely}</span>}
                {d.paired && <span className="shrink-0 text-xs text-muted-foreground">✓</span>}
              </button>
            ))}
          </div>
          <div className="grid shrink-0 grid-cols-[auto_8rem_1fr] items-center gap-2">
            <span className="text-xs tracking-widest text-muted-foreground">{w.pin}</span>
            <input id="bt-pin" value={pin} inputMode="numeric" maxLength={8} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="min-h-12 border bg-transparent px-2 text-center text-lg tracking-[0.3em] text-foreground" />
            <button onClick={pair} disabled={!pick || state === "pairing"} className="min-h-12 border border-primary text-sm tracking-widest text-primary disabled:opacity-40">{state === "pairing" ? w.pairing : w.pair}</button>
          </div>
          <div className={`h-4 shrink-0 text-center text-xs ${state === "ok" ? "text-primary" : "text-accent"}`}>{msg}</div>
        </div>
      )}
    </div>
  );
}
