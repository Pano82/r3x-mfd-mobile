import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Setup, SETUP_T, profileLabel } from "./Setup";
import type { EcuInfo } from "./Setup";
import { APP } from "./platform";
import { musicUrl, pickMusic } from "./mobile/music";


type Tab = "mfd" | "nav" | "media" | "apps" | "settings";
// Reihenfolge der Knöpfe in der oberen Leiste – Navigation direkt zwischen MFD und MEDIA.
// App: ohne APPS-Reiter (Freeware-Starter gibt es nur am Pi)
export const TABS: Tab[] = APP ? ["mfd", "nav", "media", "settings"] : ["mfd", "nav", "media", "apps", "settings"];
export type Lang = "de" | "en" | "es" | "el" | "ja";

// 7-Zoll-Panels: 800x480 (Raspberry-Pi-Touch-Display) und 1024x600 (HDMI-Panel).
// Die UI wird über die Wurzel- Schriftgröße maßstäblich auf das Panel gesetzt.
const FIT_BASE = { w: 1024, h: 620 };
// App im Hochformat: eigenes Grundmaß (Handy hochkant)
const FIT_PORTRAIT = { w: 600, h: 1000 };
export function fitScale(w: number, h: number) {
  const b = APP && h > w ? FIT_PORTRAIT : FIT_BASE;
  const k = Math.min(w / b.w, h / b.h);
  return Math.min(1, Math.max(APP ? 0.5 : 0.6, Math.round(k * 100) / 100));
}
// Eingebettet in fremde Seiten (Kiosk-Erweiterung): "#bar" = nur die obere Leiste, "#mini" = schmale MFD-Spalte (Splitscreen)
export const EMBED: "bar" | "mini" | null = location.hash === "#bar" ? "bar" : location.hash === "#mini" ? "mini" : null;
const toParent = (m: Record<string, unknown>) => { try { window.parent.postMessage({ r34: 1, ...m }, "*"); } catch { /* ignore */ } };
// Hochformat (nur App): eigene Anordnung je Reiter, quer bleibt wie am Pi
export function usePortrait() {
  const q = () => APP && window.innerHeight > window.innerWidth;
  const [p, setP] = useState(q);
  useEffect(() => { const f = () => setP(q()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return p;
}
function useFit() {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    // eingebettet: Maßstab vom ganzen Bildschirm, nicht vom kleinen Rahmen – so sieht die Leiste aus wie in der Oberfläche
    const f = () => setFit(EMBED ? fitScale(screen.width, screen.height) : fitScale(window.innerWidth, window.innerHeight));
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return fit;
}

export const T = {
  de: { btNoAdapter: "Kein Bluetooth-Adapter gefunden", btBlocked: "Bluetooth ist gesperrt oder aus – Pi neu starten", found: "gefunden", unnamed: "ohne Namen", here: "Mein Standort", hereFail: "Standort nicht verfügbar", hereIp: "ungefähr (über Internet)", showPw: "Passwort zeigen", mfd: "MFD", media: "MEDIA", settings: "EINSTELLUNGEN", apps: "APPS", wifi: "WLAN", signal: "SIGNAL", bt: "BLUETOOTH", lang: "SPRACHE", font: "SCHRIFT", design: "DESIGN", display: "ANZEIGE", contrast: "KONTRAST", brightness: "HELLIGKEIT", tint: "FARBTÖNUNG", on: "AN", off: "AUS", connected: "Verbunden", devices: "Geräte", reset: "ZURÜCKSETZEN", music: "MUSIK", nav: "NAVIGATION", split: "SPLITSCREEN", scan: "SUCHEN", connect: "VERBINDEN", disconnect: "TRENNEN", password: "Passwort", searching: "SUCHE…", none: "Nichts gefunden", failed: "Fehlgeschlagen", close: "SCHLIESSEN", destHint: "Ziel eingeben…", course: "KURS", dest: "ZIEL", eta: "ANKUNFT", dist: "DISTANZ", dirs: "N,NO,O,SO,S,SW,W,NW", noEcu: "KEINE ECU", offline: "SYSTEM OFFLINE", tapFx: "TIPP-LEUCHTEN", active: "AKTIV", passive: "PASSIV", recent: "ZULETZT GEÖFFNET", editHint: "Lange drücken zum Bearbeiten", done: "FERTIG", addApp: "APP HINZUFÜGEN", appName: "Name", appUrl: "Adresse (z. B. spotify.com)", save: "SPEICHERN", cancel: "ABBRECHEN", del: "LÖSCHEN?", resetApps: "STANDARD", limits: "WARNGRENZEN", rescan: "USB NEU EINLESEN", noMusic: "Keine Musik – USB-Stick einstecken", nowPlaying: "LÄUFT GERADE", ignOff: "Zündung aus – Herunterfahren in", notFound: "Ziel nicht gefunden", noNet: "Keine Internetverbindung", system: "SYSTEM", version: "VERSION", usbUpdate: "UPDATE VOM USB-STICK", searchUsb: "USB DURCHSUCHEN", install: "INSTALLIEREN", noUpdate: "Kein Paket gefunden – r34-os….zip auf den USB-Stick kopieren und einstecken", updating: "Update läuft – die Oberfläche startet gleich neu", reboot: "NEUSTART", poweroff: "AUSSCHALTEN", sure: "SICHER?", installed: "installiert" },
  en: { btNoAdapter: "No Bluetooth adapter found", btBlocked: "Bluetooth is blocked or off – restart the Pi", found: "found", unnamed: "unnamed", here: "My location", hereFail: "Location not available", hereIp: "approximate (via internet)", showPw: "Show password", mfd: "MFD", media: "MEDIA", settings: "SETTINGS", apps: "APPS", wifi: "WI-FI", signal: "SIGNAL", bt: "BLUETOOTH", lang: "LANGUAGE", font: "FONT", design: "DESIGN", display: "DISPLAY", contrast: "CONTRAST", brightness: "BRIGHTNESS", tint: "COLOR TINT", on: "ON", off: "OFF", connected: "Connected", devices: "Devices", reset: "RESET", music: "MUSIC", nav: "NAVIGATION", split: "SPLIT SCREEN", scan: "SCAN", connect: "CONNECT", disconnect: "DISCONNECT", password: "Password", searching: "SEARCHING…", none: "Nothing found", failed: "Failed", close: "CLOSE", destHint: "Enter destination…", course: "HEADING", dest: "DESTINATION", eta: "ETA", dist: "DISTANCE", dirs: "N,NE,E,SE,S,SW,W,NW", noEcu: "NO ECU", offline: "SYSTEM OFFLINE", tapFx: "TAP LIGHTS", active: "ACTIVE", passive: "PASSIVE", recent: "RECENTLY OPENED", editHint: "Long press to edit", done: "DONE", addApp: "ADD APP", appName: "Name", appUrl: "Address (e.g. spotify.com)", save: "SAVE", cancel: "CANCEL", del: "DELETE?", resetApps: "DEFAULTS", limits: "WARNING LIMITS", rescan: "RESCAN USB", noMusic: "No music – insert a USB stick", nowPlaying: "NOW PLAYING", ignOff: "Ignition off – shutting down in", notFound: "Destination not found", noNet: "No internet connection", system: "SYSTEM", version: "VERSION", usbUpdate: "UPDATE FROM USB STICK", searchUsb: "SEARCH USB", install: "INSTALL", noUpdate: "No package found – copy r34-os….zip to a USB stick and plug it in", updating: "Updating – the interface will restart shortly", reboot: "RESTART", poweroff: "SHUT DOWN", sure: "SURE?", installed: "installed" },
  es: { btNoAdapter: "No se encontró adaptador Bluetooth", btBlocked: "Bluetooth bloqueado o apagado – reinicia la Pi", found: "encontrados", unnamed: "sin nombre", here: "Mi ubicación", hereFail: "Ubicación no disponible", hereIp: "aproximada (por internet)", showPw: "Mostrar contraseña", mfd: "PANTALLA", media: "MEDIA", settings: "AJUSTES", apps: "APPS", wifi: "WI-FI", signal: "SEÑAL", bt: "BLUETOOTH", lang: "IDIOMA", font: "FUENTE", design: "DISEÑO", display: "PANTALLA", contrast: "CONTRASTE", brightness: "BRILLO", tint: "TONO DE COLOR", on: "SÍ", off: "NO", connected: "Conectado", devices: "Dispositivos", reset: "RESTABLECER", music: "MÚSICA", nav: "NAVEGACIÓN", split: "PANTALLA DIVIDIDA", scan: "BUSCAR", connect: "CONECTAR", disconnect: "DESCONECTAR", password: "Contraseña", searching: "BUSCANDO…", none: "Nada encontrado", failed: "Error", close: "CERRAR", destHint: "Introducir destino…", course: "RUMBO", dest: "DESTINO", eta: "LLEGADA", dist: "DISTANCIA", dirs: "N,NE,E,SE,S,SO,O,NO", noEcu: "SIN ECU", offline: "SISTEMA SIN CONEXIÓN", tapFx: "LUCES AL TOCAR", active: "ACTIVO", passive: "PASIVO", recent: "RECIENTES", editHint: "Mantén pulsado para editar", done: "LISTO", addApp: "AÑADIR APP", appName: "Nombre", appUrl: "Dirección (p. ej. spotify.com)", save: "GUARDAR", cancel: "CANCELAR", del: "¿BORRAR?", resetApps: "PREDETERMINADO", limits: "LÍMITES DE AVISO", rescan: "LEER USB DE NUEVO", noMusic: "Sin música – conecta un USB", nowPlaying: "REPRODUCIENDO", ignOff: "Contacto apagado – apagando en", notFound: "Destino no encontrado", noNet: "Sin conexión a internet", system: "SISTEMA", version: "VERSIÓN", usbUpdate: "ACTUALIZAR DESDE USB", searchUsb: "BUSCAR EN USB", install: "INSTALAR", noUpdate: "No se encontró paquete – copia r34-os….zip a un USB y conéctalo", updating: "Actualizando – la interfaz se reiniciará", reboot: "REINICIAR", poweroff: "APAGAR", sure: "¿SEGURO?", installed: "instalada" },
  el: { btNoAdapter: "Δεν βρέθηκε αντάπτορας Bluetooth", btBlocked: "Το Bluetooth είναι μπλοκαρισμένο ή κλειστό – επανεκκίνηση Pi", found: "βρέθηκαν", unnamed: "χωρίς όνομα", here: "Η θέση μου", hereFail: "Η θέση δεν είναι διαθέσιμη", hereIp: "κατά προσέγγιση (μέσω internet)", showPw: "Εμφάνιση κωδικού", mfd: "ΠΙΝΑΚΑΣ", media: "ΜΕΣΑ", settings: "ΡΥΘΜΙΣΕΙΣ", apps: "ΕΦΑΡΜΟΓΕΣ", wifi: "WiFi", signal: "ΣΗΜΑ", bt: "BLUETOOTH", lang: "ΓΛΩΣΣΑ", font: "ΓΡΑΜΜΑΤΟΣΕΙΡΑ", design: "ΘΕΜΑ", display: "ΟΘΟΝΗ", contrast: "ΑΝΤΙΘΕΣΗ", brightness: "ΦΩΤΕΙΝΟΤΗΤΑ", tint: "ΑΠΟΧΡΩΣΗ ΧΡΩΜΑΤΟΣ", on: "ΝΑΙ", off: "ΟΧΙ", connected: "Συνδεδεμένο", devices: "Συσκευές", reset: "ΕΠΑΝΑΦΟΡΑ", music: "ΜΟΥΣΙΚΗ", nav: "ΠΛΟΗΓΗΣΗ", split: "ΟΘΟΝΗ ΧΩΡΙΣΜΕΝΗ", scan: "ΑΝΑΖΗΤΗΣΗ", connect: "ΣΥΝΔΕΣΗ", disconnect: "ΑΠΟΣΥΝΔΕΣΗ", password: "Κωδικός", searching: "ΑΝΑΖΗΤΗΣΗ…", none: "Δεν βρέθηκε τίποτα", failed: "Αποτυχία", close: "ΚΛΕΙΣΙΜΟ", destHint: "Εισαγωγή προορισμού…", course: "ΠΟΡΕΙΑ", dest: "ΠΡΟΟΡΙΣΜΟΣ", eta: "ΑΦΙΞΗ", dist: "ΑΠΟΣΤΑΣΗ", dirs: "Β,ΒΑ,Α,ΝΑ,Ν,ΝΔ,Δ,ΒΔ", noEcu: "ΧΩΡΙΣ ECU", offline: "ΣΥΣΤΗΜΑ ΕΚΤΟΣ", tapFx: "ΦΩΤΑ ΑΦΗΣ", active: "ΕΝΕΡΓΟ", passive: "ΠΑΘΗΤΙΚΟ", recent: "ΠΡΟΣΦΑΤΑ", editHint: "Πατήστε παρατεταμένα για επεξεργασία", done: "ΤΕΛΟΣ", addApp: "ΠΡΟΣΘΗΚΗ", appName: "Όνομα", appUrl: "Διεύθυνση (π.χ. spotify.com)", save: "ΑΠΟΘΗΚΕΥΣΗ", cancel: "ΑΚΥΡΩΣΗ", del: "ΔΙΑΓΡΑΦΗ;", resetApps: "ΠΡΟΕΠΙΛΟΓΗ", limits: "ΟΡΙΑ ΠΡΟΕΙΔΟΠΟΙΗΣΗΣ", rescan: "ΕΠΑΝΑΣΑΡΩΣΗ USB", noMusic: "Χωρίς μουσική – συνδέστε USB", nowPlaying: "ΑΝΑΠΑΡΑΓΩΓΗ", ignOff: "Ανάφλεξη εκτός – τερματισμός σε", notFound: "Ο προορισμός δεν βρέθηκε", noNet: "Χωρίς σύνδεση στο διαδίκτυο", system: "ΣΥΣΤΗΜΑ", version: "ΕΚΔΟΣΗ", usbUpdate: "ΕΝΗΜΕΡΩΣΗ ΑΠΟ USB", searchUsb: "ΑΝΑΖΗΤΗΣΗ USB", install: "ΕΓΚΑΤΑΣΤΑΣΗ", noUpdate: "Δεν βρέθηκε πακέτο – αντιγράψτε το r34-os….zip σε USB", updating: "Ενημέρωση – η οθόνη θα επανεκκινήσει", reboot: "ΕΠΑΝΕΚΚΙΝΗΣΗ", poweroff: "ΤΕΡΜΑΤΙΣΜΟΣ", sure: "ΣΙΓΟΥΡΑ;", installed: "εγκατεστημένη" },
  ja: { btNoAdapter: "Bluetoothアダプターが見つかりません", btBlocked: "Bluetoothがブロックまたはオフ – Piを再起動", found: "件", unnamed: "名前なし", here: "現在地", hereFail: "現在地を取得できません", hereIp: "おおよそ（インターネット経由）", showPw: "パスワードを表示", mfd: "メーター", media: "メディア", settings: "設定", apps: "アプリ", wifi: "Wi-Fi", signal: "電波", bt: "Bluetooth", lang: "言語", font: "フォント", design: "デザイン", display: "画面", contrast: "コントラスト", brightness: "明るさ", tint: "色調", on: "オン", off: "オフ", connected: "接続済み", devices: "デバイス", reset: "リセット", music: "音楽", nav: "ナビ", split: "分割画面", scan: "検索", connect: "接続", disconnect: "切断", password: "パスワード", searching: "検索中…", none: "見つかりません", failed: "失敗しました", close: "閉じる", destHint: "目的地を入力…", course: "方位", dest: "目的地", eta: "到着", dist: "距離", dirs: "北,北東,東,南東,南,南西,西,北西", noEcu: "ECU未接続", offline: "システム停止", tapFx: "タップ表示", active: "アクティブ", passive: "パッシブ", recent: "最近使用", editHint: "長押しで編集", done: "完了", addApp: "アプリを追加", appName: "名前", appUrl: "アドレス（例: spotify.com）", save: "保存", cancel: "キャンセル", del: "削除？", resetApps: "初期設定", limits: "警告値", rescan: "USBを再読込", noMusic: "音楽なし – USBを挿してください", nowPlaying: "再生中", ignOff: "イグニッションOFF – シャットダウンまで", notFound: "目的地が見つかりません", noNet: "インターネット未接続", system: "システム", version: "バージョン", usbUpdate: "USBから更新", searchUsb: "USBを検索", install: "インストール", noUpdate: "パッケージなし – r34-os….zip をUSBにコピーして挿してください", updating: "更新中 – 画面がまもなく再起動します", reboot: "再起動", poweroff: "電源オフ", sure: "よろしいですか？", installed: "インストール済み" },
};
// App: Musik kommt vom Handy statt vom USB-Stick
if (APP) {
  const X: Record<Lang, { rescan: string; noMusic: string; adapter: string }> = {
    de: { rescan: "MUSIK WÄHLEN", noMusic: "Keine Musik – MUSIK WÄHLEN antippen", adapter: "CONSULT-ADAPTER" },
    en: { rescan: "CHOOSE MUSIC", noMusic: "No music – tap CHOOSE MUSIC", adapter: "CONSULT ADAPTER" },
    es: { rescan: "ELEGIR MÚSICA", noMusic: "Sin música – toca ELEGIR MÚSICA", adapter: "ADAPTADOR CONSULT" },
    el: { rescan: "ΕΠΙΛΟΓΗ ΜΟΥΣΙΚΗΣ", noMusic: "Χωρίς μουσική – πάτα ΕΠΙΛΟΓΗ ΜΟΥΣΙΚΗΣ", adapter: "ΑΝΤΑΠΤΟΡΑΣ CONSULT" },
    ja: { rescan: "音楽を選ぶ", noMusic: "音楽なし – 「音楽を選ぶ」をタップ", adapter: "Consult アダプター" },
  };
  for (const k of Object.keys(X) as Lang[]) Object.assign(T[k], X[k]);
}
type Dict = (typeof T)["de"] & { adapter?: string };

export type FontKey = "techno" | "terminal" | "arcade" | "sleek" | "vintage" | "ev";
// Jede Schrift legt Display- und Fließtext-Font fest; Noto Sans/JP bleiben Fallback
// damit Griechisch und Japanisch immer rendert. scale passt die UI-Größe mit an.
export const FONTS: Record<FontKey, { label: string; display: string; mono: string; scale: number }> = {
  techno: { label: "TECHNO", display: '"Orbitron", "Noto Sans", "Noto Sans JP", sans-serif', mono: '"Share Tech Mono", "Noto Sans", "Noto Sans JP", monospace', scale: 1 },
  terminal: { label: "TERMINAL", display: '"VT323", "Noto Sans", "Noto Sans JP", monospace', mono: '"VT323", "Noto Sans", "Noto Sans JP", monospace', scale: 1.18 },
  arcade: { label: "ARCADE", display: '"Press Start 2P", "Noto Sans", "Noto Sans JP", monospace', mono: '"VT323", "Noto Sans", "Noto Sans JP", monospace', scale: 0.82 },
  sleek: { label: "SLEEK", display: '"Rajdhani", "Noto Sans", "Noto Sans JP", sans-serif', mono: '"Rajdhani", "Noto Sans", "Noto Sans JP", sans-serif', scale: 1.1 },
  // 90er/2000er Rennspiel- und Tuning-Look
  vintage: { label: "VINTAGE", display: '"Audiowide", "Noto Sans", "Noto Sans JP", sans-serif', mono: '"Share Tech Mono", "Noto Sans", "Noto Sans JP", monospace', scale: 0.95 },
  // klare, moderne Grotesk wie in aktuellen Elektroautos
  ev: { label: "EV", display: '"Outfit", "Noto Sans", "Noto Sans JP", sans-serif', mono: '"Outfit", "Noto Sans", "Noto Sans JP", sans-serif', scale: 1.05 },
};

export type DesignKey = "serie" | "bayside" | "schwarz" | "purple" | "weiss" | "jade";
// Die Farbnamen kommen vom R34 GT-T; die Werte liegen als data-design-Blöcke in src/styles.css.
export const DESIGNS: Record<DesignKey, { label: string }> = {
  serie: { label: "ORIGINAL" },
  bayside: { label: "BAYSIDE BLUE" },
  schwarz: { label: "BLACK PEARL" },
  purple: { label: "MIDNIGHT PURPLE" },
  weiss: { label: "PEARL WHITE" },
  jade: { label: "MILLENNIUM JADE" },
};

// Einheiten: Werte kommen immer in bar / °C / km/h vom Backend und werden nur für die Anzeige umgerechnet
type Units = { speed: "kmh" | "mph"; temp: "c" | "f"; press: "bar" | "psi" };
// Warngrenzen in Basiseinheiten (bar, °C, V, U/min)
type Limits = { boost: number; oilT: number; waterT: number; oilP: number; batt: number; redline: number };
const DEF_UNITS: Units = { speed: "kmh", temp: "c", press: "bar" };
const DEF_LIMITS: Limits = { boost: 1.0, oilT: 120, waterT: 100, oilP: 1.0, batt: 12.0, redline: 6600 };
type Settings = { lang: Lang; font: FontKey; design: DesignKey; wifi: boolean; bt: boolean; contrast: number; brightness: number; tint: number; tapFx: boolean; units: Units; limits: Limits };
const DEFAULTS: Settings = { lang: "de", font: "techno", design: "serie", wifi: true, bt: true, contrast: 100, brightness: 100, tint: 0, tapFx: true, units: DEF_UNITS, limits: DEF_LIMITS };
type SetS = (f: (p: Settings) => Settings) => void;
// Alle Backend-Abfragen tragen die Kennung X-R34: fremde Webseiten können diesen Kopf nicht ohne
// CORS-Vorabfrage senden, und die beantwortet das Backend nie – so kommen nur Befehle der eigenen Oberfläche an.
export const rfetch = (u: string, o: RequestInit = {}) => fetch(u, { ...o, headers: { ...(o.headers as Record<string, string> | undefined), "X-R34": "1" } });
// Gespeicherte Einstellungen prüfen: unbekannte oder kaputte Werte (z. B. aus älteren Versionen) fallen auf den Standard zurück
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const oneOf = <K extends string>(v: unknown, keys: readonly string[], d: K): K => (typeof v === "string" && keys.includes(v) ? (v as K) : d);
const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : d);
function cleanSettings(raw: unknown): Settings {
  const o = isObj(raw) ? raw : {};
  const u = isObj(o.units) ? o.units : {};
  const l = isObj(o.limits) ? o.limits : {};
  return {
    lang: oneOf(o.lang, Object.keys(T), DEFAULTS.lang),
    font: oneOf(o.font, Object.keys(FONTS), DEFAULTS.font),
    design: oneOf(o.design, Object.keys(DESIGNS), DEFAULTS.design),
    wifi: typeof o.wifi === "boolean" ? o.wifi : DEFAULTS.wifi,
    bt: typeof o.bt === "boolean" ? o.bt : DEFAULTS.bt,
    contrast: num(o.contrast, 100, 50, 150), brightness: num(o.brightness, 100, 30, 130), tint: num(o.tint, 0, -180, 180),
    tapFx: typeof o.tapFx === "boolean" ? o.tapFx : DEFAULTS.tapFx,
    units: { speed: oneOf(u.speed, ["kmh", "mph"], DEF_UNITS.speed), temp: oneOf(u.temp, ["c", "f"], DEF_UNITS.temp), press: oneOf(u.press, ["bar", "psi"], DEF_UNITS.press) },
    limits: { boost: num(l.boost, DEF_LIMITS.boost, -1, 5), oilT: num(l.oilT, DEF_LIMITS.oilT, 0, 250), waterT: num(l.waterT, DEF_LIMITS.waterT, 0, 200),
      oilP: num(l.oilP, DEF_LIMITS.oilP, 0, 20), batt: num(l.batt, DEF_LIMITS.batt, 0, 20), redline: num(l.redline, DEF_LIMITS.redline, 1000, 12000) },
  };
}
export const Cfg = createContext<{ s: Settings; setS: SetS }>({ s: DEFAULTS, setS: () => undefined });

type Kind = "press" | "temp" | "speed" | "plain";
// Umrechnung Basiswert -> Anzeige
function show(kind: Kind, v: number, u: Units, dec: number, plainUnit = "", ok = true): { v: string; unit: string } {
  if (!ok) { const x = show(kind, 0, u, dec, plainUnit); return { v: "—", unit: x.unit }; }
  if (kind === "temp") return u.temp === "f" ? { v: (v * 9 / 5 + 32).toFixed(0), unit: "°F" } : { v: v.toFixed(0), unit: "°C" };
  if (kind === "speed") return u.speed === "mph" ? { v: (v * 0.621371).toFixed(0), unit: "MPH" } : { v: v.toFixed(0), unit: "KM/H" };
  if (kind === "press") return u.press === "psi" ? { v: (v * 14.5038).toFixed(1), unit: "PSI" } : { v: v.toFixed(dec), unit: "BAR" };
  return { v: v.toFixed(dec), unit: plainUnit };
}
function useUnits() {
  const { s, setS } = useContext(Cfg);
  const u = { ...DEF_UNITS, ...s.units };
  const lim = { ...DEF_LIMITS, ...s.limits };
  const flip = (kind: Kind) => {
    if (kind === "plain") return;
    setS((p) => {
      const x = { ...DEF_UNITS, ...p.units };
      if (kind === "temp") x.temp = x.temp === "c" ? "f" : "c";
      if (kind === "speed") x.speed = x.speed === "kmh" ? "mph" : "kmh";
      if (kind === "press") x.press = x.press === "bar" ? "psi" : "bar";
      return { ...p, units: x };
    });
  };
  return { u, lim, flip };
}

// Obere Leiste: Rückleuchten, Tabs, WLAN/BT, Uhr – in der Oberfläche und (über die Erweiterung) auf jeder fremden Seite
function TopBar({ t, s, net, tab, soft, hue, onTab, split, onSplit }: { t: Dict; s: Settings; net: Net; tab: Tab | null; soft?: Tab; hue?: CSSProperties; onTab: (k: Tab) => void; split?: boolean; onSplit?: () => void }) {
  const portrait = usePortrait();
  if (portrait) return (
    <header className="flex shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <StatusLogo t={t} tapFx={s.tapFx} />
        <div className="flex shrink-0 items-center gap-2 text-xs" style={hue}>
          {net.bt.length > 0 && <span className="text-primary">BT</span>}
          <Clock h12={s.lang === "en"} />
        </div>
      </div>
      <nav className="grid grid-cols-[1fr_1.35fr_1fr_0.6fr] gap-1" style={hue}>
        {TABS.map((k) => (
          <button key={k} data-k={k} onClick={() => onTab(k)}
            aria-label={t[k]} title={t[k]}
            className={`min-h-10 min-w-0 truncate border px-1 py-1.5 font-[family-name:var(--font-display)] ${k === "settings" ? "text-lg leading-none" : "text-xs"} ${tab === k ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {k === "settings" ? "⚙" : t[k]}
          </button>
        ))}
      </nav>
    </header>
  );
  return (
    <header className="flex shrink-0 items-center justify-between gap-3">
      <StatusLogo t={t} tapFx={s.tapFx} />
      <nav className="flex min-w-0 gap-2" style={hue}>
        {TABS.map((k) => (
          <button key={k} data-k={k} onClick={() => onTab(k)}
            className={`min-h-8 shrink-0 border px-3 py-1.5 font-[family-name:var(--font-display)] text-xs tracking-widest ${tab === k ? "border-primary bg-primary text-primary-foreground" : soft === k ? "border-primary text-primary" : "text-muted-foreground"}`}>
            {t[k]}
          </button>
        ))}
        {onSplit && (
          <button data-k="split" onClick={onSplit} aria-pressed={!!split}
            className={`min-h-8 shrink-0 border px-3 py-1.5 font-[family-name:var(--font-display)] text-xs tracking-widest ${split ? "border-accent bg-accent text-black" : "border-accent text-accent"}`}>
            ◧ {t.mfd}
          </button>
        )}
      </nav>
      <div className="flex shrink-0 items-center gap-2 text-xs" style={hue}>
        {s.wifi && net.ssid && <span className="text-primary">{"WIFI " + "▂▄▆█".slice(0, Math.max(1, Math.ceil(net.signal / 25)))}</span>}
        {(APP ? net.bt.length > 0 : s.bt) && <span className="text-primary">BT</span>}
        <Clock h12={s.lang === "en"} />
      </div>
    </header>
  );
}

// Leiste allein (Rahmen der Kiosk-Erweiterung auf fremden Seiten): Tabs springen zurück in die Oberfläche
function EmbedBar() {
  const { s } = useContext(Cfg);
  const t = T[s.lang];
  const net = useNet();
  const [split, setSplit] = useState(false);
  const loadRef = useRef(false);
  useEffect(() => {
    const f = (e: MessageEvent) => {
      const m = e.data as { r34?: number; split?: boolean; tap?: boolean; loading?: boolean };
      if (!m || m.r34 !== 1 || e.source !== window.parent) return;
      if (typeof m.split === "boolean") setSplit(m.split);
      if (m.tap) document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      // Seite lädt: Rückleuchten-Ladeanimation (Zustand statt Zähler, Nachrichten können doppelt kommen)
      if (typeof m.loading === "boolean" && m.loading !== loadRef.current) { loadRef.current = m.loading; busyBus(m.loading ? 1 : -1); }
    };
    window.addEventListener("message", f);
    // Höhe und Lage der Knöpfe melden: die Erweiterung leitet Tipps weiter, falls die fremde Seite über der Leiste liegt
    const report = () => {
      const btns = [...document.querySelectorAll<HTMLElement>("header [data-k]")].map((b) => { const r = b.getBoundingClientRect(); return { k: b.dataset["k"], x: r.left, y: r.top, w: r.width, h: r.height }; });
      toParent({ h: Math.ceil(document.querySelector("header")?.getBoundingClientRect().height ?? 0) + 16, btns });
    };
    const ro = new ResizeObserver(report);
    const tm = setInterval(report, 3000);
    // Berührung in der Leiste: offen halten (Erweiterung schließt sie sonst nach einigen Sekunden)
    const act = () => toParent({ act: 1 });
    document.addEventListener("pointerdown", act, true);
    const h = document.querySelector("header"); if (h) ro.observe(h);
    return () => { window.removeEventListener("message", f); ro.disconnect(); clearInterval(tm); document.removeEventListener("pointerdown", act, true); };
  }, []);
  const hue = s.tint ? { filter: `hue-rotate(${s.tint}deg)` } : undefined;
  return (
    <div className="flex h-dvh flex-col justify-center overflow-hidden bg-background px-3" style={{ filter: `brightness(${s.brightness}%) contrast(${s.contrast}%)` }}>
      <TopBar t={t} s={s} net={net} tab={null} soft="apps" hue={hue} onTab={(k) => {
        toParent({ nav: k });
        // dritter Weg: die Leiste selbst wechselt das ganze Fenster (erlaubt, weil direkt angetippt)
        setTimeout(() => { try { window.top!.location.href = `http://localhost:8080/#${k}`; } catch { /* ignore */ } }, 250);
      }} split={split} onSplit={() => toParent({ split: !split })} />
    </div>
  );
}
// Schmale MFD-Spalte für den Splitscreen auf fremden Seiten (wie Navigation + MFD)
function EmbedMini() {
  const { s } = useContext(Cfg);
  const g = useConsult();
  const hue = s.tint ? { filter: `hue-rotate(${s.tint}deg)` } : undefined;
  return (
    <div className="flex h-dvh gap-2 overflow-hidden bg-background p-2" style={{ ...hue, filter: `${hue ? hue.filter + " " : ""}brightness(${s.brightness}%) contrast(${s.contrast}%)` }}>
      <RpmBar rpm={g.rpm} ok={g.live === 1} />
      <div className="min-h-0 min-w-0 flex-1"><Mfd compact /></div>
    </div>
  );
}
function EmbedRoot() {
  const [s, setS] = useState<Settings>(() => { try { return cleanSettings(JSON.parse(localStorage.getItem("r34") || "{}")); } catch { return DEFAULTS; } });
  // Einstellungen der Oberfläche vom Pi holen (hier eingebettet in eine fremde Seite: eigener Browser-Speicher)
  useEffect(() => {
    const load = () => rfetch("/api/ui").then((r) => r.json()).then((j) => { if (j && Object.keys(j).length) setS(cleanSettings(j)); }).catch(() => undefined);
    load(); const tm = setInterval(load, 15000);
    return () => clearInterval(tm);
  }, []);
  const fit = useFit();
  useEffect(() => {
    const f = FONTS[s.font]; const root = document.documentElement;
    root.style.setProperty("--font-display", f.display); root.style.setProperty("--font-mono", f.mono);
    root.style.fontSize = `${Math.round(f.scale * fit * 110)}%`; root.style.setProperty("--fscale", String(f.scale));
    root.dataset["design"] = s.design; root.style.setProperty("--tint", `${s.tint}deg`);
  }, [s.font, s.design, s.tint, fit]);
  return (
    <Cfg.Provider value={{ s, setS }}>
      <MusicProvider>{EMBED === "bar" ? <EmbedBar /> : <EmbedMini />}</MusicProvider>
    </Cfg.Provider>
  );
}

export default function App() {
  if (EMBED) return <EmbedRoot />;
  return <MainApp />;
}
function MainApp() {
  const [booted, setBooted] = useState(() => { try { return sessionStorage.getItem("booted") === "1"; } catch { return false; } });
  // Direktsprung aus fremden Seiten: http://localhost:8080/#nav usw.
  const fromHash = (): Tab => { const h = location.hash.slice(1) as Tab; return TABS.includes(h) ? h : "mfd"; };
  const [tab, setTab] = useState<Tab>(fromHash);
  useEffect(() => { const f = () => setTab(fromHash()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const [s, setS] = useState<Settings>(() => { try { return cleanSettings(JSON.parse(localStorage.getItem("r34") || "{}")); } catch { return DEFAULTS; } });
  useEffect(() => { try { localStorage.setItem("r34", JSON.stringify(s)); } catch { /* ignore */ } }, [s]);
  // auch beim Pi ablegen – die Leiste auf App-Seiten liest sie von dort (eigener, getrennter Browser-Speicher)
  useEffect(() => { const tm = setTimeout(() => { post("/api/ui", s).catch(() => undefined); }, 800); return () => clearTimeout(tm); }, [s]);
  const net = useNet();
  const fit = useFit();
  const t = T[s.lang];
  useEffect(() => {
    const f = FONTS[s.font];
    const root = document.documentElement;
    root.style.setProperty("--font-display", f.display);
    root.style.setProperty("--font-mono", f.mono);
    root.style.fontSize = `${Math.round(f.scale * fit * 110)}%`; // +10 % für bessere Lesbarkeit im Auto
    root.style.setProperty("--fscale", String(f.scale)); // Logo: gleiche Größe bei jeder Schrift (nur Bildschirm-Skalierung)
    root.dataset["design"] = s.design;
    root.style.setProperty("--tint", `${s.tint}deg`);
  }, [s.font, s.design, s.tint, fit]);
  // Farbton gilt für alles außer dem Rücklicht-Logo (Warnfarben bleiben fest)
  const hue = s.tint ? { filter: `hue-rotate(${s.tint}deg)` } : undefined;
  // Einrichtungsassistent: beim ersten Start automatisch, sonst aus SYSTEM ("r34-setup"-Ereignis)
  const [setup, setSetup] = useState<null | { start: number; only?: "ecu" }>(null);
  useEffect(() => {
    if (!booted) return;
    rfetch("/api/ecu").then((r) => r.json()).then((j: EcuInfo) => { if (j && j.setup === false) setSetup({ start: 0 }); }).catch(() => undefined);
    const f = (e: Event) => setSetup((e as CustomEvent).detail ?? { start: 0 });
    window.addEventListener("r34-setup", f); return () => window.removeEventListener("r34-setup", f);
  }, [booted]);
  if (!booted) return <Boot onDone={() => { try { sessionStorage.setItem("booted", "1"); } catch { /* ignore */ } setBooted(true); }} />;
  return (
    <Cfg.Provider value={{ s, setS }}>
    <MusicProvider>
    <div className="scanlines flex h-dvh flex-col gap-3 overflow-hidden p-3"
      style={{ filter: `brightness(${s.brightness}%) contrast(${s.contrast}%)` }}>
      <TopBar t={t} s={s} net={net} tab={tab} hue={hue} onTab={setTab} />
      <PowerOverlay t={t} />
      {setup && <Setup start={setup.start} only={setup.only} onDone={() => setSetup(null)} />}
      <main className="min-h-0 flex-1 overflow-hidden" style={hue}>
        {tab === "mfd" ? <Mfd /> : tab === "nav" ? <NavHub t={t} /> : tab === "media" ? <Media /> : tab === "apps" ? <Apps t={t} /> : <SettingsView s={s} setS={setS} t={t} />}
      </main>
    </div>
    </MusicProvider>
    </Cfg.Provider>
  );
}

function Toggle({ on, onClick, t }: { on: boolean; onClick: () => void; t: Dict }) {
  return (
    <button onClick={onClick} className={`min-h-9 w-20 shrink-0 border px-3 py-2 text-xs tracking-widest ${on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
      {on ? t.on : t.off}
    </button>
  );
}

function SettingsView({ s, setS, t }: { s: Settings; setS: (f: (p: Settings) => Settings) => void; t: Dict }) {
  const net = useNet();
  const portrait = usePortrait();
  const [panel, setPanel] = useState<"" | "wifi" | "bt" | "limits" | "system">("");
  const bars = Math.ceil(net.signal / 25);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));
  const head = "text-xs tracking-[0.3em] text-muted-foreground";
  const btn = "h-full min-h-9 min-w-0 truncate border px-0.5 text-[0.8rem] tracking-wide";
  const sel = (on: boolean) => (on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground");
  return (
    <div className="relative h-full">
    <div className={portrait ? "flex h-full flex-col gap-2 overflow-y-auto" : "grid h-full grid-rows-[3fr_3fr_2fr] gap-2 overflow-hidden"}>
      <div className={portrait ? "grid shrink-0 grid-cols-1 gap-2" : "grid min-h-0 grid-cols-3 gap-2"}>
        {APP ? <AdapterPanel t={t} net={net} wide={!portrait} /> : <>
        <div className="mfd-panel flex min-w-0 flex-col gap-2 p-2">
          <div className="flex items-center justify-between gap-2"><div className={head}>{t.wifi}</div><Toggle on={s.wifi} onClick={() => { set("wifi", !s.wifi); api("wifi", !s.wifi); }} t={t} /></div>
          <button disabled={!s.wifi} onClick={() => setPanel("wifi")} className="flex min-h-9 min-w-0 flex-1 items-center gap-2 border px-2 text-left disabled:opacity-40">
            <span className="flex h-4 shrink-0 items-end gap-0.5">{[1, 2, 3, 4].map((b) => <span key={b} className={`w-1 ${s.wifi && b <= bars ? "bg-primary" : "bg-muted"}`} style={{ height: `${b * 25}%` }} />)}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-accent">{s.wifi && net.ssid ? net.ssid : "—"}</span>
            <span className="shrink-0 text-primary">›</span>
          </button>
        </div>
        <div className="mfd-panel flex min-w-0 flex-col gap-2 p-2">
          <div className="flex items-center justify-between gap-2"><div className={head}>{t.bt}</div><Toggle on={s.bt} onClick={() => { set("bt", !s.bt); api("bt", !s.bt); }} t={t} /></div>
          <button disabled={!s.bt} onClick={() => setPanel("bt")} className="flex min-h-9 min-w-0 flex-1 items-center gap-2 border px-2 text-left disabled:opacity-40">
            <span className="min-w-0 flex-1 truncate text-sm text-accent">{s.bt && net.bt.length ? net.bt.join(", ") : t.devices}</span>
            <span className="shrink-0 text-primary">›</span>
          </button>
        </div>
        </>}
        <div className="mfd-panel flex min-w-0 flex-col p-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className={head}>{t.lang}</div>
            <button onClick={() => setPanel("system")} className="min-h-7 shrink-0 border border-primary px-2 text-xs tracking-wide text-primary">{t.system} ›</button>
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-1">
            {([["de", "DEUTSCH"], ["en", "ENGLISH"], ["es", "ESPAÑOL"], ["el", "ΕΛΛΗΝΙΚΆ"], ["ja", "日本語"]] as [Lang, string][]).map(([k, l]) => (
              <button key={k} onClick={() => set("lang", k)} className={`${btn} ${sel(s.lang === k)}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className={portrait ? "grid shrink-0 grid-cols-1 gap-2" : "grid min-h-0 grid-cols-[2fr_3fr] gap-2"}>
        <div className="mfd-panel flex min-w-0 flex-col p-2">
          <div className={`${head} mb-1`}>{t.font}</div>
          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-1">
            {(Object.keys(FONTS) as FontKey[]).map((k) => (
              <button key={k} onClick={() => set("font", k)} style={{ fontFamily: FONTS[k].display }} className={`${btn} ${sel(s.font === k)}`}>{FONTS[k].label}</button>
            ))}
          </div>
        </div>
        <div className="mfd-panel flex min-w-0 flex-col p-2">
          <div className={`${head} mb-1`}>{t.design}</div>
          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-1">
            {(Object.keys(DESIGNS) as DesignKey[]).map((k) => (
              <button key={k} onClick={() => set("design", k)}
                className={`flex h-full min-h-9 min-w-0 items-center gap-1.5 border px-1.5 ${s.design === k ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                <span data-design={k} className="flex shrink-0 gap-0.5 border p-0.5" style={{ background: "var(--background)" }}>
                  <span className="h-2.5 w-2.5 bg-primary" /><span className="h-2.5 w-2.5 bg-accent" />
                </span>
                <span className="min-w-0 truncate text-xs tracking-wide">{DESIGNS[k].label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={`mfd-panel flex flex-col justify-center p-2 ${portrait ? "shrink-0" : "min-h-0"}`}>
        <div className={`flex items-center justify-between gap-2 ${portrait ? "flex-wrap" : ""}`}><div className={head}>{t.display}</div>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 truncate text-xs tracking-widest text-muted-foreground">{t.tapFx}</span>
            {([[true, t.active], [false, t.passive]] as [boolean, string][]).map(([v, l]) => (
              <button key={l} onClick={() => set("tapFx", v)} className={`min-h-7 shrink-0 border px-2 text-xs tracking-wide ${sel(s.tapFx === v)}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => setPanel("limits")} className="min-h-7 shrink-0 border border-primary px-3 text-xs tracking-wide text-primary">{t.limits} ›</button>
          <button onClick={() => setS((p) => ({ ...p, contrast: 100, brightness: 100, tint: 0 }))} className="min-h-7 shrink-0 border border-accent px-3 text-xs text-accent">{t.reset}</button>
        </div>
        <div className={`mt-1 grid gap-4 ${portrait ? "grid-cols-1" : "grid-cols-3"}`}>
          {([["contrast", t.contrast, 50, 150, "%"], ["brightness", t.brightness, 30, 130, "%"], ["tint", t.tint, -180, 180, "°"]] as const).map(([k, l, min, max, u]) => (
            <div key={k} className="min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-xs tracking-widest text-muted-foreground">{l}</span>
                <span className="text-sm text-primary">{s[k]}{u}</span>
              </div>
              <input type="range" min={min} max={max} value={s[k]} onChange={(e) => set(k, +e.target.value)} className="h-9 w-full accent-[var(--primary)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
      {panel === "wifi" && <WifiPanel t={t} onClose={() => setPanel("")} />}
      {panel === "bt" && <BtPanel t={t} onClose={() => setPanel("")} />}
      {panel === "limits" && <LimitsPanel t={t} onClose={() => setPanel("")} />}
      {panel === "system" && <SystemPanel t={t} onClose={() => setPanel("")} />}
    </div>
  );
}

export const post = (url: string, body: object) =>
  rfetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

function PanelFrame({ title, t, onClose, onScan, busy, children }: { title: string; t: Dict; onClose: () => void; onScan: () => void; busy: boolean; children: ReactNode }) {
  useBusy(busy);
  return (
    <div className="mfd-panel absolute inset-0 z-10 flex flex-col gap-2 p-2" style={{ background: "var(--background)" }}>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex-1 text-xs tracking-[0.3em] text-muted-foreground">{title}</div>
        <button onClick={onScan} disabled={busy} className="min-h-9 border border-primary px-3 text-xs tracking-widest text-primary disabled:opacity-40">{busy ? t.searching : t.scan}</button>
        <button onClick={onClose} className="min-h-9 border px-3 text-xs tracking-widest text-muted-foreground">{t.close}</button>
      </div>
      {children}
    </div>
  );
}

// Warngrenzen: Werte in Basiseinheiten speichern, in gewählter Einheit anzeigen
const LIMIT_ROWS: { k: keyof Limits; label: string; kind: Kind; step: number; min: number; max: number; dec: number; unit?: string }[] = [
  { k: "boost", label: "BOOST MAX", kind: "press", step: 0.05, min: 0.2, max: 3, dec: 2 },
  { k: "oilT", label: "OIL TEMP MAX", kind: "temp", step: 1, min: 80, max: 160, dec: 0 },
  { k: "waterT", label: "WATER TEMP MAX", kind: "temp", step: 1, min: 80, max: 130, dec: 0 },
  { k: "oilP", label: "OIL PRESS MIN", kind: "press", step: 0.1, min: 0.3, max: 5, dec: 1 },
  { k: "batt", label: "BATTERY MIN", kind: "plain", step: 0.1, min: 10.5, max: 13.5, dec: 1, unit: "V" },
  { k: "redline", label: "RPM REDLINE", kind: "plain", step: 100, min: 4000, max: 9500, dec: 0, unit: "RPM" },
];
function LimitsPanel({ t, onClose }: { t: Dict; onClose: () => void }) {
  const { setS } = useContext(Cfg);
  const portrait = usePortrait();
  const { u, lim } = useUnits();
  const change = (k: keyof Limits, v: number) => setS((p) => ({ ...p, limits: { ...DEF_LIMITS, ...p.limits, [k]: v } }));
  return (
    <div className="mfd-panel absolute inset-0 z-10 flex flex-col gap-2 p-2" style={{ background: "var(--background)" }}>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex-1 text-xs tracking-[0.3em] text-muted-foreground">{t.limits}</div>
        <button onClick={() => setS((p) => ({ ...p, limits: DEF_LIMITS }))} className="min-h-9 border border-accent px-3 text-xs tracking-widest text-accent">{t.resetApps}</button>
        <button onClick={onClose} className="min-h-9 border px-3 text-xs tracking-widest text-muted-foreground">{t.close}</button>
      </div>
      <div className={`grid min-h-0 flex-1 auto-rows-fr gap-2 ${portrait ? "grid-cols-1" : "grid-cols-2"}`}>
        {LIMIT_ROWS.map((r) => {
          const v = lim[r.k];
          const d = show(r.kind, v, u, r.dec, r.unit);
          const set = (dir: number) => change(r.k, Math.min(r.max, Math.max(r.min, +(v + dir * r.step).toFixed(2))));
          const changed = v !== DEF_LIMITS[r.k];
          return (
            <div key={r.k} className="mfd-panel flex min-h-0 items-center gap-2 px-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold tracking-wider text-foreground">{r.label}</div>
                <div className="flex items-baseline gap-1">
                  <span className={`font-[family-name:var(--font-display)] text-2xl font-bold ${changed ? "text-accent" : "text-primary"}`}>{d.v}</span>
                  <span className="text-xs font-bold text-accent">{d.unit}</span>
                </div>
              </div>
              <button onClick={() => set(-1)} className="h-11 w-11 shrink-0 border border-primary text-2xl text-primary">−</button>
              <button onClick={() => set(1)} className="h-11 w-11 shrink-0 border border-primary text-2xl text-primary">+</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Upd = { id: number; file: string; version: string };
function SystemPanel({ t, onClose }: { t: Dict; onClose: () => void }) {
  const { s } = useContext(Cfg); const w = SETUP_T[s.lang];
  const portrait = usePortrait();
  const [ecu, setEcu] = useState<EcuInfo | null>(null);
  useEffect(() => { rfetch("/api/ecu").then((r) => r.json()).then(setEcu).catch(() => undefined); }, []);
  // Diagnose-Aufzeichnung (60 s Rohdaten auf USB-Stick)
  const [dg, setDg] = useState<{ running: boolean; left: number; file: string; msg: string } | null>(null);
  const pollDiag = () => rfetch("/api/diag").then((r) => r.json()).then((j) => { setDg(j); if (j.running) setTimeout(pollDiag, 1000); }).catch(() => undefined);
  const startDiag = () => post("/api/diag", {}).then((r) => { if (r.ok) pollDiag(); }).catch(() => undefined);
  const openSetup = (d: { start: number; only?: "ecu" }) => { window.dispatchEvent(new CustomEvent("r34-setup", { detail: d })); onClose(); };
  const [info, setInfo] = useState<{ version: string; updates: Upd[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ask, setAsk] = useState<string>("");
  useBusy(busy);
  const scan = () => { setBusy(true); setMsg(""); rfetch("/api/system").then((r) => r.json()).then((j) => { setInfo(j); if (!j.updates.length && !APP) setMsg(t.noUpdate); }).catch(() => setMsg(t.failed)).finally(() => setBusy(false)); };
  useEffect(() => scan(), []);
  const install = (u: Upd) => {
    setBusy(true); setAsk("");
    post("/api/system/update", { id: u.id }).then((r) => setMsg(r.ok ? t.updating : `${t.failed}${r.msg ? ": " + r.msg : ""}`)).catch(() => setMsg(t.failed)).finally(() => setBusy(false));
  };
  const power = (action: "reboot" | "poweroff") => { setAsk(""); post("/api/system/power", { action }).catch(() => undefined); };
  const sureBtn = (key: string, label: string, run: () => void, cls: string) => ask === key
    ? <div className="flex gap-1"><button onClick={run} className={`min-h-11 flex-1 border px-2 text-xs tracking-widest ${cls}`}>{t.sure} ✓</button><button onClick={() => setAsk("")} className="min-h-11 w-11 border text-muted-foreground">✕</button></div>
    : <button onClick={() => setAsk(key)} className={`min-h-11 w-full border px-2 text-xs tracking-widest ${cls}`}>{label}</button>;
  return (
    <div className="mfd-panel absolute inset-0 z-10 flex flex-col gap-2 p-2" style={{ background: "var(--background)" }}>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex-1 text-xs tracking-[0.3em] text-muted-foreground">{t.system}</div>
        <button onClick={onClose} className="min-h-9 border px-3 text-xs tracking-widest text-muted-foreground">{t.close}</button>
      </div>
      <div className={portrait ? "flex min-h-0 flex-1 flex-col-reverse gap-2 overflow-y-auto" : "grid min-h-0 flex-1 grid-cols-[2fr_1fr] gap-2"}>
        <div className="mfd-panel flex min-h-0 flex-col gap-2 p-3">
          <div className="flex items-baseline gap-2"><span className="text-xs tracking-widest text-muted-foreground">{t.version}</span><span className="font-[family-name:var(--font-display)] text-2xl text-primary">{info?.version ?? "…"}</span></div>
          {!APP && <><div className="flex items-center justify-between gap-2">
            <span className="text-xs tracking-widest text-muted-foreground">{t.usbUpdate}</span>
            <button onClick={scan} disabled={busy} className="min-h-9 shrink-0 border border-accent px-3 text-xs tracking-widest text-accent disabled:opacity-50">⟳ {busy ? t.searching : t.searchUsb}</button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto">
            {info?.updates.map((u) => (
              <div key={u.id} className="flex items-center gap-2 border p-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">{u.file}</div>
                  <div className="text-xs text-muted-foreground">{t.version} {u.version}{u.version === info.version ? ` · ${t.installed}` : ""}</div>
                </div>
                <div className="w-44 shrink-0">{sureBtn("u" + u.id, t.install, () => install(u), "border-primary bg-primary text-primary-foreground")}</div>
              </div>
            ))}
          </div>
          {msg && <div data-msg className="shrink-0 text-xs text-accent">{msg}</div>}
          <div className="flex shrink-0 items-center gap-2 border-t pt-2">
            <button onClick={startDiag} disabled={!!dg?.running} className="min-h-10 shrink-0 border border-accent px-3 text-xs tracking-widest text-accent disabled:opacity-50">● {w.diag}</button>
            <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {dg?.running ? `${w.diagRun} ${dg.left} s` : dg?.file ? `${dg.msg === "usb" ? w.diagUsb : w.diagInt} ${dg.file}` : w.diagHint}
            </div>
          </div></>}
          {APP && <AppInfo />}
        </div>
        <div className="mfd-panel flex flex-col justify-center gap-3 p-3">
          <div className="min-w-0">
            <div className="text-xs tracking-widest text-muted-foreground">{w.vehicle}</div>
            <div className="truncate text-sm text-primary">{ecu ? profileLabel(ecu.profiles.find((p) => p.id === ecu.profile), w) : "…"}</div>
          </div>
          <button onClick={() => openSetup({ start: 0, only: "ecu" })} className="min-h-11 w-full border border-primary px-2 text-xs tracking-widest text-primary">{w.change} ›</button>
          <button onClick={() => openSetup({ start: 0 })} className="min-h-11 w-full border border-accent px-2 text-xs tracking-widest text-accent">{w.runSetup}</button>
          {!APP && sureBtn("reboot", t.reboot, () => power("reboot"), "border-primary text-primary")}
          {!APP && sureBtn("poweroff", t.poweroff, () => power("poweroff"), "border-destructive text-destructive")}
        </div>
      </div>
    </div>
  );
}

// App: statt WLAN/Bluetooth des Pi – Consult-Adapter und Fahrzeug auf einen Blick
function AdapterPanel({ t, net, wide }: { t: Dict; net: Net; wide: boolean }) {
  const { s } = useContext(Cfg); const w = SETUP_T[s.lang];
  const [ecu, setEcu] = useState<EcuInfo | null>(null);
  useEffect(() => { rfetch("/api/ecu").then((r) => r.json()).then(setEcu).catch(() => undefined); }, [net.bt.length]);
  const cur = ecu?.profiles.find((p) => p.id === ecu.profile);
  const live = net.bt.length > 0;
  const head = "text-xs tracking-[0.3em] text-muted-foreground";
  return (
    <div className={`mfd-panel flex min-w-0 flex-col gap-2 p-2 ${wide ? "col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={head}>{t.adapter}</div>
        <span className={`text-xs tracking-widest ${live ? "text-primary" : "text-accent"}`}>{live ? "● " + t.connected : cur?.driver === "demo" ? "DEMO" : "—"}</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-accent">{live ? net.bt.join(", ") : ecu?.port ? ecu.port.slice(3) : "—"}</div>
          <div className="truncate text-xs text-muted-foreground">{w.vehicle}: <span className="text-primary">{profileLabel(cur, w)}</span></div>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent("r34-setup", { detail: { start: 0, only: "ecu" } }))} className="min-h-9 shrink-0 border border-primary px-3 text-xs tracking-widest text-primary">{w.change} ›</button>
      </div>
    </div>
  );
}
function AppInfo() {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 text-sm text-muted-foreground">
      <div className="font-[family-name:var(--font-display)] text-lg tracking-widest text-foreground">R3x MOBILE</div>
      <div>M-Industries · mindustries.org</div>
      <div className="text-xs">Basis: R34 OS 3.221 · Nissan Consult I über Bluetooth (SPP)</div>
    </div>
  );
}

type WNet = { ssid: string; signal: number; secure: boolean; active: boolean };
export function WifiPanel({ t, onClose }: { t: Dict; onClose: () => void }) {
  const [list, setList] = useState<WNet[]>([]);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<WNet | null>(null);
  const [pw, setPw] = useState("");
  const [seePw, setSeePw] = useState(false);
  const [msg, setMsg] = useState("");
  const scan = (keep = false) => { setBusy(true); if (!keep) setMsg(""); rfetch("/api/wifi/scan").then((r) => r.json()).then((l: WNet[]) => { setList(l); if (!l.length) setMsg(t.none); }).catch(() => setMsg(t.failed)).finally(() => setBusy(false)); };
  useEffect(() => scan(), []);
  const connect = (n: WNet, pass: string) => {
    setBusy(true); setMsg(t.connect + " " + n.ssid + " …");
    post("/api/wifi/connect", { ssid: n.ssid, pw: pass })
      .then((r) => { setMsg(r.ok ? `${n.ssid} · ${t.connected}` : `${t.failed}${r.msg ? ": " + r.msg : ""}`); if (r.ok) { setPick(null); setPw(""); scan(true); } })
      .catch(() => setMsg(t.failed)).finally(() => setBusy(false));
  };
  return (
    <PanelFrame title={t.wifi} t={t} onClose={onClose} onScan={() => scan()} busy={busy}>
      {pick && (
        <form className="flex shrink-0 gap-2" onSubmit={(e) => { e.preventDefault(); connect(pick, pw); }}>
          <div className="flex min-w-0 shrink items-center truncate px-2 text-sm text-accent">{pick.ssid}</div>
          <input autoFocus type={seePw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t.password}
            autoComplete="off" autoCapitalize="off" spellCheck={false}
            className="min-h-9 min-w-0 flex-1 border bg-transparent px-2 text-sm text-primary" />
          <button type="button" aria-label={t.showPw} title={t.showPw} onPointerDown={(e) => e.preventDefault()} onClick={() => setSeePw((v) => !v)}
            className={`min-h-9 w-10 shrink-0 border text-base ${seePw ? "border-primary text-primary" : "text-muted-foreground"}`}><EyeIcon open={seePw} /></button>
          <button disabled={busy} className="min-h-9 shrink-0 border border-primary bg-primary px-3 text-xs tracking-widest text-primary-foreground disabled:opacity-40">{t.connect}</button>
        </form>
      )}
      {msg && <div data-msg className="shrink-0 truncate px-1 text-xs text-accent">{msg}</div>}
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1 overflow-auto">
        {list.map((n) => (
          <button key={n.ssid} onClick={() => { if (n.active) return; if (n.secure) { setPick(n); setPw(""); } else connect(n, ""); }}
            className={`flex min-h-10 min-w-0 items-center gap-2 border px-2 text-left ${n.active ? "border-primary text-primary" : pick?.ssid === n.ssid ? "border-accent text-accent" : "text-foreground"}`}>
            <span className="flex h-4 shrink-0 items-end gap-0.5">{[1, 2, 3, 4].map((b) => <span key={b} className={`w-1 ${b <= Math.ceil(n.signal / 25) ? "bg-primary" : "bg-muted"}`} style={{ height: `${b * 25}%` }} />)}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{n.ssid}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{n.active ? "✓" : n.secure ? "🔒" : ""}</span>
          </button>
        ))}
      </div>
    </PanelFrame>
  );
}

// Auge: Passwort sichtbar/verborgen
function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

type BDev = { mac: string; name: string; named?: boolean; paired: boolean; connected: boolean };
function BtPanel({ t, onClose }: { t: Dict; onClose: () => void }) {
  const [list, setList] = useState<BDev[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = (scan: boolean) => {
    setBusy(true); if (scan) setMsg(t.searching);
    rfetch(`/api/bt/devices?scan=${scan ? 1 : 0}`).then((r) => r.json())
      .then((j: { err?: string; devices?: BDev[] } | BDev[]) => {
        const l = Array.isArray(j) ? j : j.devices ?? [];
        const err = Array.isArray(j) ? "" : j.err ?? "";
        setList(l);
        if (err) setMsg(err === "noadapter" ? t.btNoAdapter : t.btBlocked);
        else if (scan || !l.length) setMsg(l.length ? `${l.length} ${t.found}` : t.none);
      }).catch(() => setMsg(t.failed)).finally(() => setBusy(false));
  };
  useEffect(() => load(true), []);
  const act = (d: BDev) => {
    setBusy(true); setMsg((d.connected ? t.disconnect : t.connect) + " " + d.name + " …");
    post(d.connected ? "/api/bt/disconnect" : "/api/bt/connect", { mac: d.mac })
      .then((r) => { setMsg(r.ok ? `${d.name} · ${d.connected ? t.disconnect : t.connected}` : `${t.failed}${r.msg ? ": " + r.msg : ""}`); })
      .catch(() => setMsg(t.failed)).finally(() => { setBusy(false); load(false); });
  };
  return (
    <PanelFrame title={t.bt} t={t} onClose={onClose} onScan={() => load(true)} busy={busy}>
      {msg && <div data-msg className="shrink-0 truncate px-1 text-xs text-accent">{msg}</div>}
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1 overflow-auto">
        {list.map((d) => (
          <button key={d.mac} disabled={busy} onClick={() => act(d)}
            className={`flex min-h-10 min-w-0 items-center gap-2 border px-2 text-left disabled:opacity-60 ${d.connected ? "border-primary text-primary" : "text-foreground"}`}>
            <span className={`min-w-0 flex-1 truncate text-sm ${d.named === false ? "text-muted-foreground" : ""}`}>{d.named === false ? `${t.unnamed} · ${d.mac.slice(-8)}` : d.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{d.connected ? t.connected : d.paired ? "●" : ""}</span>
          </button>
        ))}
      </div>
    </PanelFrame>
  );
}

function Clock({ h12 }: { h12: boolean }) {
  // Englisch: 12-Stunden-Format mit AM/PM, sonst 24 Stunden
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  const m = String(now.getMinutes()).padStart(2, "0");
  if (h12) {
    const h = now.getHours() % 12 || 12;
    return <span className="shrink-0 text-xl text-accent">{h}:{m}<span className="ml-1 text-xs">{now.getHours() < 12 ? "AM" : "PM"}</span></span>;
  }
  return <span className="shrink-0 text-xl text-accent">{String(now.getHours()).padStart(2, "0")}:{m}</span>;
}

function Boot({ onDone }: { onDone: () => void }) {
  const portrait = usePortrait();
  const [p, setP] = useState(0);
  const g = useConsult();
  useEffect(() => {
    const i = setInterval(() => setP((v) => (v >= 100 ? 100 : v + 2)), 40);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    if (p < 100) return undefined;
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [p, onDone]);
  const [ver, setVer] = useState("");
  useEffect(() => { rfetch("/api/version").then((r) => r.json()).then((j) => setVer(j.version)).catch(() => undefined); }, []);
  // Startsequenz: Kranz außen → Kern außen → Kranz innen → Kern innen → Mittellinie → alle hell
  const s1 = p >= 12, s2 = p >= 28, s3 = p >= 44, s4 = p >= 60, s5 = p >= 76, full = p >= 100;
  const parts = { ring: [s1, s3, s3, s1], core: [s2, s4, s4, s2], bar: s5 };
  return (
    <div className="relative flex h-dvh flex-col items-center justify-center gap-6 overflow-hidden bg-black">
      {ver && <div className="absolute right-4 top-3 text-xs tracking-[0.25em] text-muted-foreground">VERSION {ver.toUpperCase()}</div>}
      <TaillightLogo mode={full ? "tap" : "idle"} parts={full ? undefined : parts} className="h-[calc(6rem/var(--fscale,1))] w-auto max-w-[80vw]" />
      <div className="flex flex-col items-center gap-2">
        <div className={`animate-in fade-in font-[family-name:var(--font-display)] font-extrabold tracking-[0.18em] text-white duration-1000 ${portrait ? "text-3xl" : "text-5xl"}`}>M-INDUSTRIES</div>
        <div className="text-xs tracking-[0.5em] text-muted-foreground">MINDUSTRIES.ORG</div>
      </div>
      <div className="h-6 text-sm tracking-widest text-primary">{p > 50 && <span>ECU {g.live ? "OK" : "—"} · GPS {APP ? (g.fix ? "OK" : "—") : `${g.sats} SAT`}</span>}</div>
    </div>
  );
}

type Live = { acc?: number; rpm: number; speed: number; water: number; volt: number; throttle: number; boost: number; oil: number; oilp: number; heading: number; sats: number; live: number; lat: number; lon: number; fix: number; ign: number; off_in: number; aux: number;
  tps_v?: number; src?: Partial<Record<"boost" | "oilp" | "oilt", "ecu" | "esp32" | "none">> };
// Zusatzwerte: Quelle laut Einstellung „Sensoren“ – "none" = ausblenden, "ecu" = gültig, solange das Steuergerät liefert
type SKey = "boost" | "oilp" | "oilt";
const has = (d: Live, k: SKey) => (d.src?.[k] ?? "esp32") !== "none";
const okOf = (d: Live, k: SKey) => ((d.src?.[k] ?? "esp32") === "ecu" ? d.live === 1 : d.aux === 1);
const ZERO: Live = { rpm: 0, speed: 0, water: 0, volt: 0, throttle: 0, boost: 0, oil: 0, oilp: 0, heading: 0, sats: 0, live: 0, lat: 0, lon: 0, fix: 0, ign: 1, off_in: 0, aux: 0 };
// Echte Daten vom Pi-Backend (Consult, Zusatzsensoren, GPS), 10 Hz
export function useConsult() {
  const [d, setD] = useState<Live>(ZERO);
  useEffect(() => {
    const es = new EventSource("/stream");
    es.onmessage = (e) => { const j = JSON.parse(e.data); setD({ ...j, throttle: j.tps, oil: j.oilt }); };
    return () => es.close();
  }, []);
  return d;
}
type Net = { ssid: string; signal: number; bt: string[] };
function useNet() {
  const [n, setN] = useState<Net>({ ssid: "", signal: 0, bt: [] });
  useEffect(() => {
    let on = true;
    const f = () => rfetch("/api/status").then((r) => r.json()).then((j) => { if (on) setN(j); }).catch(() => undefined);
    f(); const i = setInterval(f, 3000);
    return () => { on = false; clearInterval(i); };
  }, []);
  return n;
}
const api = (k: "wifi" | "bt", on: boolean) => rfetch(`/api/${k}?on=${on ? 1 : 0}`).catch(() => undefined);

// Rundinstrument; Antippen wechselt die Einheit
function Gauge({ label, value, min, max, kind, dec = 0, hot: hotIn, ok = true, span = false }: { label: string; value: number; min: number; max: number; kind: Kind; dec?: number; hot: boolean; ok?: boolean; span?: boolean }) {
  const { u, flip } = useUnits();
  const hot = ok && hotIn;
  const pct = ok ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const r = 70, c = Math.PI * r * 1.5;
  const d = show(kind, value, u, dec, "", ok);
  return (
    <button type="button" onClick={() => flip(kind)} className={`mfd-panel flex min-h-0 min-w-0 flex-col items-center p-2 ${ok ? "" : "opacity-50"} ${span ? "col-span-2" : ""}`}>
      <div className="shrink-0 truncate text-lg font-bold tracking-[0.15em] text-foreground">{label}</div>
      <svg viewBox="8 12 164 150" className="min-h-0 w-full flex-1">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--muted)" strokeWidth="13" strokeDasharray={`${c} 999`} transform="rotate(135 90 90)" />
        <circle cx="90" cy="90" r={r} fill="none" stroke={hot ? "var(--destructive)" : "var(--primary)"} strokeWidth="13"
          strokeDasharray={`${c * pct} 999`} transform="rotate(135 90 90)" style={{ filter: "drop-shadow(var(--glow))" }} />
        <text x="90" y="104" textAnchor="middle" fill={hot ? "var(--destructive)" : ok ? "var(--foreground)" : "var(--muted-foreground)"} fontSize={d.v.length > 3 ? 38 : 46} fontWeight="700" fontFamily="var(--font-display)">{d.v}</text>
        <text x="90" y="134" textAnchor="middle" fill="var(--accent)" fontSize="20" fontWeight="700">{d.unit}</text>
      </svg>
    </button>
  );
}


// ---- Rücklicht-Logo "Oo——oO" oben links ----
// Zustände: tap (alle vier kurz rot), load (nacheinander rot), error (langsam orange blinkend), idle (aus)
const busyBus = (d: number) => window.dispatchEvent(new CustomEvent("r34-busy", { detail: d }));
function useBusy(on: boolean) {
  useEffect(() => { if (!on) return undefined; busyBus(1); return () => { busyBus(-1); }; }, [on]);
}
function useStatus() {
  // "offline", wenn länger als 3 s keine Daten vom Backend kommen (robuster als onerror)
  const [st, setSt] = useState({ got: false, live: 0, last: 0, now: Date.now() });
  useEffect(() => {
    const es = new EventSource("/stream");
    es.onmessage = (e) => { const j = JSON.parse(e.data); setSt((p) => ({ ...p, got: true, live: j.live, last: Date.now() })); };
    const i = setInterval(() => setSt((p) => ({ ...p, now: Date.now() })), 1000);
    return () => { es.close(); clearInterval(i); };
  }, []);
  return { got: st.got, live: st.live, open: st.got && st.now - st.last < 3000 };
}
type Parts = { ring: boolean[]; core: boolean[]; bar: boolean };
export function TaillightLogo({ mode, className = "", lit, parts }: { mode: "idle" | "tap" | "load" | "error"; className?: string; lit?: boolean[]; parts?: Parts }) {
  // kleine Leuchten unten bündig mit den großen (Oo___oO), Verbindungslinie am unteren Rand
  // (Konturlinien des Hecks sind zurückgestellt)
  const lamps: [number, number, number][] = [[18, 18, 15], [50, 23, 10], [150, 23, 10], [182, 18, 15]];
  return (
    <svg viewBox="0 0 200 36" className={`tl tl-${mode} ${className}`} aria-hidden="true">
      <line x1="62" y1="31.5" x2="138" y2="31.5" className={`tl-bar${parts?.bar ? " tl-bar-on" : ""}`} />
      {lamps.map(([x, y, r], i) => (
        <g key={i} className={`tl-lamp ${i === 0 || i === 3 ? "tl-outer" : "tl-inner"}${lit?.[i] ? " tl-on" : ""}`}>
          <circle cx={x} cy={y} r={r} className={`tl-ring${parts?.ring[i] ? " tl-ring-on" : ""}`} />
          <circle cx={x} cy={y} r={r * 0.55} className={`tl-core${parts?.core[i] ? " tl-core-on" : ""}`} />
        </g>
      ))}
    </svg>
  );
}
function StatusLogo({ t, tapFx }: { t: Dict; tapFx: boolean }) {
  const st = useStatus();
  const [tap, setTap] = useState(false);
  const [busy, setBusy] = useState(0);
  const tapRef = useRef(tapFx);
  tapRef.current = tapFx;
  useEffect(() => {
    let tm: ReturnType<typeof setTimeout> | undefined;
    const down = () => { if (!tapRef.current) return; setTap(true); clearTimeout(tm); tm = setTimeout(() => setTap(false), 150); };
    const b = (e: Event) => setBusy((v) => Math.max(0, v + (e as CustomEvent<number>).detail));
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("r34-busy", b);
    return () => { document.removeEventListener("pointerdown", down, true); window.removeEventListener("r34-busy", b); clearTimeout(tm); };
  }, []);
  const error = st.got && (!st.open ? t.offline : !st.live ? t.noEcu : "");
  const mode = tap ? "tap" : error ? "error" : busy > 0 || !st.got ? "load" : "idle";
  return (
    <div className="flex shrink-0 items-center gap-2">
      <TaillightLogo mode={mode} className="h-[calc(1.75rem/var(--fscale,1))] w-auto" />
      {error && <span className="text-xs font-bold tracking-widest text-[#ff9a1f]">{error}</span>}
    </div>
  );
}
// Zündung aus: Bildschirm schwarz, dezenter Countdown bis zum Herunterfahren
function PowerOverlay({ t }: { t: Dict }) {
  const d = useConsult();
  if (d.ign !== 0) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black pb-6">
      <span className="text-xs tracking-widest text-[#3a3a3a]">{t.ignOff} {d.off_in} s</span>
    </div>
  );
}
// Schmaler senkrechter Drehzahlbalken (Splitscreen Navi + MFD)
// Drehzahl-Segmente: Orange 800 U/min vor der Rotgrenze, Rot ab der Rotgrenze
function rpmSeg(i: number, n: number, rpm: number, redline: number) {
  const max = Math.max(8000, redline + 1000);
  const at = (i / n) * max;
  if (at >= rpm) return "bg-muted";
  return at >= redline ? "bg-destructive" : at >= redline - 800 ? "bg-accent" : "bg-primary";
}
function RpmBar({ rpm, ok = true }: { rpm: number; ok?: boolean }) {
  const { lim } = useUnits();
  const n = 40;
  return (
    <div className="flex h-full w-10 flex-col items-center gap-1">
      <div className="mfd-panel flex min-h-0 w-6 flex-1 flex-col-reverse gap-0.5 p-0.5" title="RPM">
        {Array.from({ length: n }).map((_, i) => <div key={i} className={`flex-1 ${ok ? rpmSeg(i, n, rpm, lim.redline) : "bg-muted"}`} />)}
      </div>
      <div className="shrink-0 text-sm font-bold leading-none tracking-wider text-foreground">RPM</div>
    </div>
  );
}
// Kleine Wertekachel (Musik-Splitscreen)
function MiniTile({ label, value, kind, dec = 0, hot: hotIn, ok = true }: { label: string; value: number; kind: Kind; dec?: number; hot: boolean; ok?: boolean }) {
  const { u, flip } = useUnits();
  const hot = ok && hotIn;
  const d = show(kind, value, u, dec, "", ok);
  return (
    <button type="button" onClick={() => flip(kind)} className={`mfd-panel min-w-0 px-2 py-1.5 text-center ${ok ? "" : "opacity-50"}`}>
      <div className="truncate text-sm font-bold tracking-[0.12em] text-foreground">{label}</div>
      <div className="flex items-baseline justify-center gap-1">
        <span className={`font-[family-name:var(--font-display)] text-3xl font-bold leading-tight ${hot ? "glow text-destructive" : ok ? "glow text-primary" : "text-muted-foreground"}`}>{d.v}</span>
        <span className="text-sm font-bold text-accent">{d.unit}</span>
      </div>
    </button>
  );
}
// Große Zahlenanzeige für den Splitscreen (besser lesbar als kleine Rundinstrumente)
// Wert verkleinern, falls er in schmalen Spalten (Splitscreen, breite Schriften) nicht in die Kachel passt
function useFitWidth(dep: string) {
  const box = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const b = box.current, i = inner.current;
    if (!b || !i) return;
    const need = Math.min(1, (b.clientWidth - 2) / Math.max(1, i.offsetWidth));
    if (Math.abs(need - k) > 0.01) setK(need);
  });
  useEffect(() => { const r = () => setK(1); addEventListener("resize", r); return () => removeEventListener("resize", r); }, []);
  void dep;
  return { box, inner, k };
}
function BigTile({ label, value, min, max, kind, dec = 0, hot: hotIn, ok = true }: { label: string; value: number; min: number; max: number; kind: Kind; dec?: number; hot: boolean; ok?: boolean }) {
  const { u, flip } = useUnits();
  const hot = ok && hotIn;
  const pct = ok ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const d = show(kind, value, u, dec, "", ok);
  const fit = useFitWidth(d.v + d.unit);
  return (
    <button type="button" onClick={() => flip(kind)} className={`mfd-panel flex min-h-0 min-w-0 flex-col justify-between px-3 py-2 text-left ${ok ? "" : "opacity-50"}`}>
      <div className="truncate text-lg font-bold tracking-[0.15em] text-foreground">{label}</div>
      <div ref={fit.box} className="flex min-w-0 justify-center overflow-hidden">
        <div ref={fit.inner} className="flex shrink-0 items-baseline gap-2" style={{ transform: `scale(${fit.k})` }}>
          <span className={`font-[family-name:var(--font-display)] text-6xl font-bold leading-none ${hot ? "glow text-destructive" : ok ? "glow text-primary" : "text-muted-foreground"}`}>{d.v}</span>
          <span className="text-xl font-bold text-accent">{d.unit}</span>
        </div>
      </div>
      <div className="h-2 w-full bg-muted"><div className={`h-full ${hot ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct * 100}%` }} /></div>
    </button>
  );
}
// Warnungen aus den einstellbaren Grenzen (immer in Basiseinheiten verglichen)
// Datenquellen: Consult (live) liefert Drehzahl, Speed, Wasser, Batterie, Drosselklappe;
// der ESP32 (aux) liefert Ladedruck, Öldruck, Öltemperatur. Ohne Daten: "—" und ausgegraut, keine Warnung.
function warnings(d: Live, lim: Limits) {
  const e = d.live === 1;
  const ok = (k: SKey) => has(d, k) && okOf(d, k);
  return {
    boost: ok("boost") && d.boost >= lim.boost, oilT: ok("oilt") && d.oil >= lim.oilT, waterT: e && d.water >= lim.waterT,
    oilP: ok("oilp") && e && d.rpm > 1500 && d.oilp < lim.oilP, batt: e && d.volt > 0 && d.volt < lim.batt, rpm: e && d.rpm >= lim.redline,
  };
}
function Mfd({ compact = false }: { compact?: boolean }) {
  const d = useConsult();
  const portrait = usePortrait();
  const { u, lim, flip } = useUnits();
  const w = warnings(d, lim);
  if (compact) {
    return (
      <div className="grid h-full gap-2 overflow-hidden" style={{ gridTemplateRows: `repeat(${1 + +has(d, "boost") + +has(d, "oilt")}, minmax(0, 1fr))` }}>
        {has(d, "boost") && <BigTile label="BOOST" value={d.boost} min={-1} max={Math.max(1.2, lim.boost + 0.2)} kind="press" dec={2} hot={w.boost} ok={okOf(d, "boost")} />}
        {has(d, "oilt") && <BigTile label="OIL TEMP" value={d.oil} min={40} max={140} kind="temp" hot={w.oilT} ok={okOf(d, "oilt")} />}
        <BigTile label="WATER TEMP" value={d.water} min={40} max={120} kind="temp" hot={w.waterT} ok={d.live === 1} />
      </div>
    );
  }
  const e = d.live === 1;
  const tiles: [string, number, Kind, number, string, boolean, boolean][] = [
    ["SPEED", d.speed, "speed", 0, "", false, e], ["THROTTLE", d.throttle, "plain", 0, "%", false, e],
    ["BATTERY", d.volt, "plain", 1, "V", w.batt, e],
    ...(has(d, "oilp") ? [["OIL PRESS", d.oilp, "press", 1, "", w.oilP, okOf(d, "oilp")] as [string, number, Kind, number, string, boolean, boolean]] : []),
  ];
  const gauges = 1 + +has(d, "boost") + +has(d, "oilt");
  // Hochformat: bei drei Instrumenten Ladedruck groß oben, Öl + Wasser darunter; Kacheln zweispaltig
  const gCols = portrait ? Math.min(gauges, 2) : gauges;
  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto_auto] gap-2 overflow-hidden">
      <div className="grid min-h-0 gap-2" style={{ gridTemplateColumns: `repeat(${gCols}, minmax(0, 1fr))` }}>
        {has(d, "boost") && <Gauge span={portrait && gauges === 3} label="BOOST" value={d.boost} min={-1} max={Math.max(1.2, lim.boost + 0.2)} kind="press" dec={2} hot={w.boost} ok={okOf(d, "boost")} />}
        {has(d, "oilt") && <Gauge label="OIL TEMP" value={d.oil} min={40} max={140} kind="temp" hot={w.oilT} ok={okOf(d, "oilt")} />}
        <Gauge label="WATER TEMP" value={d.water} min={40} max={120} kind="temp" hot={w.waterT} ok={d.live === 1} />
      </div>
      <div className="mfd-panel shrink-0 px-3 py-2">
        <div className="mb-1 flex items-baseline justify-between"><span className="text-lg font-bold tracking-[0.15em] text-foreground">RPM<span className="text-sm text-destructive">{d.live ? "" : " · NO ECU DATA"}</span></span><span className={`font-[family-name:var(--font-display)] text-4xl font-bold ${!e ? "text-muted-foreground" : w.rpm ? "glow text-destructive" : "glow text-primary"}`}>{e ? Math.round(d.rpm) : "—"}</span></div>
        <div className="flex h-7 gap-1">
          {Array.from({ length: 40 }).map((_, i) => <div key={i} className={`flex-1 ${e ? rpmSeg(i, 40, d.rpm, lim.redline) : "bg-muted"}`} />)}
        </div>
      </div>
      <div className="grid shrink-0 gap-2" style={{ gridTemplateColumns: `repeat(${portrait ? 2 : tiles.length}, minmax(0, 1fr))` }}>
        {tiles.map(([l, v, k, dec, pu, hot, ok]) => {
          const x = show(k, v, u, dec, pu, ok);
          return (
            <button type="button" key={l} onClick={() => flip(k)} className={`mfd-panel min-w-0 px-2 py-1.5 text-center ${ok ? "" : "opacity-50"}`}>
              <div className="truncate text-lg font-bold leading-tight tracking-[0.12em] text-foreground">{l}</div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className={`font-[family-name:var(--font-display)] text-5xl font-bold leading-none ${hot ? "glow text-destructive" : ok ? "glow text-primary" : "text-muted-foreground"}`}>{x.v}</span>
                <span className="text-lg font-bold text-accent">{x.unit}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Musik: ein Player für die ganze Oberfläche, läuft beim Seitenwechsel weiter ----
type Track = { id: number; name: string; folder: string };
type MusicApi = {
  tracks: Track[]; idx: number; playing: boolean; cur: number; dur: number; vol: number; scanning: boolean;
  toggle: () => void; next: () => void; prev: () => void; play: (i: number) => void; seek: (v: number) => void; setVol: (v: number) => void; rescan: () => void;
};
const MusicCtx = createContext<MusicApi | null>(null);
function MusicProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const [scanning, setScanning] = useState(false);
  const [vol, setVolRaw] = useState(() => num(load<unknown>("r34vol", 80), 80, 0, 100));
  useBusy(scanning);
  const rescan = () => { setScanning(true); rfetch("/api/music").then((r) => r.json()).then((l: Track[]) => { setTracks(l); setIdx((i) => (i < l.length ? i : 0)); }).catch(() => undefined).finally(() => setScanning(false)); };
  useEffect(() => { rescan(); }, []);
  useEffect(() => { if (audio.current) audio.current.volume = vol / 100; }, [vol]);
  const cur = tracks[idx];
  useEffect(() => { if (cur && playing) audio.current?.play().catch(() => setPlaying(false)); }, [idx, cur?.id]);
  const api: MusicApi = {
    tracks, idx, playing, cur: time.cur, dur: time.dur, vol, scanning, rescan,
    toggle: () => { const a = audio.current; if (!a || !cur) return; if (playing) { a.pause(); setPlaying(false); } else { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); } },
    next: () => { setIdx((i) => (tracks.length ? (i + 1) % tracks.length : 0)); },
    prev: () => { const a = audio.current; if (a && a.currentTime > 3) { a.currentTime = 0; return; } setIdx((i) => Math.max(0, i - 1)); },
    play: (i) => { setIdx(i); setPlaying(true); setTimeout(() => audio.current?.play().catch(() => setPlaying(false)), 0); },
    seek: (v) => { if (audio.current) audio.current.currentTime = v; },
    setVol: (v) => { setVolRaw(v); keep("r34vol", v); },
  };
  return (
    <MusicCtx.Provider value={api}>
      {children}
      <audio ref={audio} src={cur ? (APP ? musicUrl(cur.id) : `/music/${cur.id}`) : undefined} preload="metadata"
        onTimeUpdate={(e) => setTime({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration || 0 })}
        onEnded={() => setIdx((i) => (i + 1) % Math.max(1, tracks.length))} />
    </MusicCtx.Provider>
  );
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Media({ compact = false }: { compact?: boolean }) {
  const m = useContext(MusicCtx)!;
  const portrait = usePortrait();
  const { s } = useContext(Cfg);
  const t = T[s.lang];
  const d = useConsult();
  const { lim } = useUnits();
  const cur = m.tracks[m.idx];
  const rescanBtn = (
    <button onClick={APP ? () => { void pickMusic().then(m.rescan); } : m.rescan} disabled={m.scanning} className="min-h-10 shrink-0 border border-accent px-2 text-xs tracking-widest text-accent disabled:opacity-50">
      ⟳ {m.scanning ? t.searching : t.rescan}
    </button>
  );
  const title = (
    <div className="min-w-0">
      <div className="text-xs tracking-[0.3em] text-muted-foreground">{t.nowPlaying}</div>
      <div className={`truncate font-[family-name:var(--font-display)] text-primary glow ${compact ? "text-lg" : "text-2xl"}`}>{cur?.name ?? t.noMusic}</div>
      {cur?.folder && <div className="truncate text-xs text-muted-foreground">{cur.folder}</div>}
    </div>
  );
  const progress = (
    <div className="w-full">
      <input type="range" min={0} max={m.dur || 1} value={m.cur} onChange={(e) => m.seek(+e.target.value)} className="h-6 w-full accent-[var(--primary)]" />
      <div className="flex justify-between text-xs text-muted-foreground"><span>{fmt(m.cur)}</span><span>{fmt(m.dur)}</span></div>
    </div>
  );
  const buttons = (
    <div className="grid grid-cols-3 gap-2">
      {([["⏮", m.prev], [m.playing ? "⏸" : "▶", m.toggle], ["⏭", m.next]] as [string, () => void][]).map(([l, f], i) => (
        <button key={i} onClick={f} disabled={!m.tracks.length} className={`h-14 border border-primary text-2xl disabled:opacity-40 ${i === 1 ? "bg-primary text-primary-foreground" : "text-primary"}`}>{l}</button>
      ))}
    </div>
  );
  const volume = (
    <div className="flex items-center gap-2">
      <span className="text-lg text-muted-foreground">🔈</span>
      <input type="range" min={0} max={100} value={m.vol} onChange={(e) => m.setVol(+e.target.value)} className="h-8 min-w-0 flex-1 accent-[var(--primary)]" />
      <span className="w-9 text-right text-sm text-primary">{m.vol}</span>
    </div>
  );
  if (compact) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        {rescanBtn}
        <div className="mfd-panel flex min-h-0 flex-1 flex-col justify-between gap-2 p-3">{title}{progress}{buttons}{volume}</div>
        <div className="grid shrink-0 grid-cols-2 gap-2">
          {has(d, "boost")
            ? <MiniTile label="BOOST" value={d.boost} kind="press" dec={2} hot={d.boost >= lim.boost} ok={okOf(d, "boost")} />
            : <MiniTile label="SPEED" value={d.speed} kind="speed" hot={false} ok={d.live === 1} />}
          <MiniTile label="WATER" value={d.water} kind="temp" hot={d.water >= lim.waterT} ok={d.live === 1} />
        </div>
      </div>
    );
  }
  return (
    <div className={portrait ? "flex h-full flex-col gap-3" : "grid h-full grid-cols-3 gap-3"}>
      <div className={`mfd-panel flex min-h-0 flex-col justify-center gap-5 p-5 ${portrait ? "shrink-0" : "col-span-2"}`}>{title}{progress}{buttons}{volume}</div>
      <div className={`mfd-panel flex min-h-0 flex-col gap-2 p-3 ${portrait ? "flex-1" : ""}`}>
        {rescanBtn}
        <div className="min-h-0 flex-1 space-y-1 overflow-auto text-sm">
          {m.tracks.map((tr, i) => (
            <button key={tr.id} onClick={() => m.play(i)} className={`block min-h-9 w-full truncate px-2 text-left ${i === m.idx ? "bg-muted text-primary" : "text-muted-foreground"}`}>{tr.name}</button>
          ))}
          {!m.tracks.length && <div className="p-2 text-xs text-muted-foreground">{t.noMusic}</div>}
        </div>
      </div>
    </div>
  );
}

type SplitKey = "off" | "mfd" | "music";

// Navigation ist ein eigener Tab; hier sitzt nur die Splitscreen-Auswahl für die Karte.
export function NavHub({ t }: { t: Dict }) {
  const [split, setSplitRaw] = useState<SplitKey>(() => { try { return oneOf<SplitKey>(localStorage.getItem("r34split"), ["off", "mfd", "music"], "off"); } catch { return "off"; } });
  const setSplit = (k: SplitKey) => { setSplitRaw(k); try { localStorage.setItem("r34split", k); } catch { /* ignore */ } };
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-xs tracking-[0.3em] text-muted-foreground">{t.split}</span>
        {([["off", t.off], ["mfd", t.mfd], ["music", t.music]] as [SplitKey, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setSplit(k)} className={`min-h-9 border px-3 py-2 text-xs tracking-widest ${split === k ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <Nav split={split} t={t} />
      </div>
    </div>
  );
}

// ---- Karte: OpenStreetMap über Leaflet (statt inoffizieller Google-Einbettung) ----
type Dest = { q: string; lat: number; lon: number };
const TOKYO: [number, number] = [35.6812, 139.7671];
type Here = { lat: number; lon: number; acc: number; n: number };
function OsmMap({ dest, car, here }: { dest: Dest | null; car: { lat: number; lon: number; heading: number; fix: number }; here?: Here | null }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const carM = useRef<L.Marker | null>(null);
  const hereM = useRef<L.Circle | null>(null);
  const destM = useRef<L.CircleMarker | null>(null);
  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView(TOKYO, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    m.attributionControl.setPrefix(false);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; carM.current = null; destM.current = null; hereM.current = null; };
  }, []);
  // "Mein Standort": Karte auf die eigene Position (GPS oder ungefähr über das Internet) setzen
  useEffect(() => {
    const m = map.current; if (!m || !here) return;
    hereM.current?.remove();
    hereM.current = L.circle([here.lat, here.lon], { radius: Math.max(30, here.acc), color: "#2fb8d6", weight: 2, fillOpacity: 0.12 }).addTo(m);
    m.setView([here.lat, here.lon], here.acc > 1000 ? 12 : 16);
  }, [here?.n]);
  // Ziel anzeigen
  useEffect(() => {
    const m = map.current; if (!m) return;
    destM.current?.remove(); destM.current = null;
    if (!dest) return;
    destM.current = L.circleMarker([dest.lat, dest.lon], { radius: 10, color: "#ff3b3b", weight: 3, fillOpacity: 0.6 }).addTo(m);
    if (car.fix) m.fitBounds(L.latLngBounds([[dest.lat, dest.lon], [car.lat, car.lon]]), { padding: [40, 40], maxZoom: 15 });
    else m.setView([dest.lat, dest.lon], 14);
  }, [dest?.lat, dest?.lon]);
  // Fahrzeug (Pfeil in Fahrtrichtung); ohne Ziel folgt die Karte dem Auto
  useEffect(() => {
    const m = map.current; if (!m || !car.fix) return;
    const icon = L.divIcon({ className: "r34-car", iconSize: [28, 28], iconAnchor: [14, 14],
      html: `<svg viewBox="0 0 28 28" style="transform:rotate(${car.heading}deg)"><path d="M14 2 L24 25 L14 19 L4 25 Z" fill="#2fb8d6" stroke="#000" stroke-width="1.5"/></svg>` });
    if (!carM.current) carM.current = L.marker([car.lat, car.lon], { icon, interactive: false }).addTo(m);
    else { carM.current.setLatLng([car.lat, car.lon]); carM.current.setIcon(icon); }
    if (!dest) m.panTo([car.lat, car.lon], { animate: false });
  }, [car.lat, car.lon, car.heading, car.fix]);
  return <div ref={box} className="r34-map h-full w-full" />;
}

function Nav({ split = "off", t }: { split?: SplitKey; t: Dict }) {
  const [target, setTarget] = useState<Dest | null>(() => { try { return JSON.parse(sessionStorage.getItem("r34dest") || "null"); } catch { return null; } });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [here, setHere] = useState<Here | null>(null);
  useBusy(busy);
  const dest = target?.q ?? "";
  const locate = () => {
    setBusy(true); setMsg("");
    rfetch("/api/geo").then((r) => r.json()).then((r) => {
      if (!r.ok) { setMsg(t.hereFail); return; }
      setHere((h) => ({ lat: r.lat, lon: r.lon, acc: r.acc, n: (h?.n ?? 0) + 1 }));
      if (r.src === "ip") setMsg(`${t.here}: ${t.hereIp}`);
    }).catch(() => setMsg(t.hereFail)).finally(() => setBusy(false));
  };
  const search = (q: string) => {
    if (!q.trim()) { setTarget(null); try { sessionStorage.removeItem("r34dest"); } catch { /* ignore */ } return; }
    setBusy(true); setMsg("");
    rfetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((r) => {
      if (!r.ok) { setMsg(r.offline ? t.noNet : t.notFound); return; }
      const d = { q: q.trim(), lat: r.lat, lon: r.lon };
      setTarget(d); try { sessionStorage.setItem("r34dest", JSON.stringify(d)); } catch { /* ignore */ }
    }).catch(() => setMsg(t.noNet)).finally(() => setBusy(false));
  };
  const g = useConsult();
  const portrait = usePortrait();
  const heading = Math.round(g.heading);
  const dir = t.dirs.split(",")[Math.round(((heading % 360) + 360) % 360 / 45) % 8];
  const course = `${dir} ${String(heading).padStart(3, "0")}°`;
  const gpsTxt = g.fix ? (APP ? `±${g.acc ?? 0} m` : String(g.sats)) : "—";
  const rows: [string, string][] = [[t.course, course], [t.dest, dest || "—"], [APP ? "GPS" : "GPS SAT", gpsTxt]];
  const form = (
    <form onSubmit={(e) => { e.preventDefault(); search((e.currentTarget.elements.namedItem("d") as HTMLInputElement).value); }} className="flex w-full flex-wrap gap-2">
      <input name="d" defaultValue={dest} key={dest} placeholder={t.destHint} className="min-h-9 min-w-0 flex-1 border bg-transparent px-2 py-2 text-sm text-primary" />
      <button disabled={busy} className="min-h-9 shrink-0 border border-primary px-3 text-primary disabled:opacity-40">GO</button>
      <button type="button" disabled={busy} onClick={locate} aria-label={t.here} title={t.here}
        className="flex min-h-9 w-9 shrink-0 items-center justify-center border text-primary disabled:opacity-40">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
      </button>
      {msg && <div className="w-full text-xs text-accent">{msg}</div>}
    </form>
  );
  const turn = null as null;
  const _turnDemo = (
    <div className="shrink-0 border border-accent p-2 text-center">
      <div className="text-3xl text-accent">↱</div>
      <div className="font-[family-name:var(--font-display)] text-xl text-primary glow">350 m</div>
      <div className="text-xs text-muted-foreground">RECHTS ABBIEGEN</div>
    </div>
  );
  const map = (
    <div className="mfd-panel min-h-0 flex-1 overflow-hidden p-0">
      <OsmMap dest={target} here={here} car={{ lat: g.lat, lon: g.lon, heading: g.heading, fix: g.fix }} />
    </div>
  );
  if (split !== "off") {
    const info: [string, string][] = [[t.course, course], [t.dest, dest || "—"], ["GPS", gpsTxt]];
    // Beide Splits gleich aufgeteilt (Maß: Musik): Karte 2/3, rechte Spalte 1/3 – die Drehzahlleiste sitzt in der rechten Spalte
    return (
      <div className={`grid h-full gap-3 ${portrait ? "grid-rows-[3fr_2fr]" : "grid-cols-[2fr_1fr]"}`}>
        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          {map}
          <div className="mfd-panel flex shrink-0 flex-col gap-2 p-2">
            {form}
            <div className="flex min-w-0 gap-4 text-sm">
              {info.map(([l, v]) => <span key={l} className="min-w-0 truncate"><span className="text-muted-foreground">{l} </span><span className="text-primary">{v}</span></span>)}
            </div>
          </div>
        </div>
        <div className={`min-h-0 min-w-0 overflow-hidden ${split === "mfd" ? "flex gap-2" : ""}`}>
          {split === "mfd" && <RpmBar rpm={g.rpm} ok={g.live === 1} />}
          {split === "mfd" ? <div className="min-h-0 min-w-0 flex-1"><Mfd compact /></div> : <Media compact />}
        </div>
      </div>
    );
  }
  return (
    <div className={portrait ? "flex h-full flex-col gap-3" : "grid h-full grid-cols-3 gap-3"}>
      <div className={`flex min-h-0 ${portrait ? "flex-1" : "col-span-2"}`}>{map}</div>
      <div className={`mfd-panel flex flex-col gap-3 overflow-auto p-3 ${portrait ? "shrink-0" : "min-h-0"}`}>
        {form}
        {turn}
        {rows.map(([l, v]) => (
          <div key={l} className="flex justify-between border-b pb-1 text-sm"><span className="text-muted-foreground">{l}</span><span className="truncate text-primary">{v}</span></div>
        ))}
      </div>
    </div>
  );
}

const APPS = [
  { n: "Netflix", i: "▶", u: "https://www.netflix.com" },
  { n: "Google Maps", i: "⌖", u: "https://maps.google.com" },
  { n: "Waze", i: "◉", u: "https://www.waze.com/live-map" },
  { n: "Spotify", i: "♫", u: "https://open.spotify.com" },
  { n: "YouTube Music", i: "♪", u: "https://music.youtube.com" },
  { n: "YouTube", i: "▣", u: "https://www.youtube.com" },
  { n: "Prime Video", i: "▷", u: "https://www.primevideo.com" },
  { n: "Browser", i: "◎", u: "https://www.google.com" },
];

type AppTile = { n: string; i: string; u: string };
const ICONS = ["▶", "▷", "♫", "♪", "▣", "◎", "⌖", "◉", "★", "☰", "✉", "☁"];
const MAX_APPS = 12;
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const cleanApps = (v: unknown): AppTile[] => (Array.isArray(v) ? v.filter((a) => isObj(a) && typeof a.n === "string" && typeof a.i === "string" && typeof a.u === "string" && /^https?:\/\//i.test(a.u)).slice(0, MAX_APPS) as AppTile[] : APPS);
const cleanRecent = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : []);
const keep = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

function Apps({ t }: { t: Dict }) {
  const [apps, setAppsRaw] = useState<AppTile[]>(() => cleanApps(load<unknown>("r34apps", APPS)));
  const [recent, setRecentRaw] = useState<string[]>(() => cleanRecent(load<unknown>("r34recent", [])));
  const [edit, setEdit] = useState(false);
  const [ask, setAsk] = useState<number | null>(null);
  const [form, setForm] = useState<AppTile | null>(null);
  const setApps = (f: (a: AppTile[]) => AppTile[]) => setAppsRaw((a) => { const n = f(a); keep("r34apps", n); return n; });
  // sofort speichern: die Seite wird direkt danach verlassen
  const setRecent = (n: string) => { const x = [n, ...recent.filter((y) => y !== n)].slice(0, 5); keep("r34recent", x); setRecentRaw(x); };
  // Langes Drücken (1,5 s) startet den Bearbeitungsmodus
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longFired = useRef(false);
  const start = () => { longFired.current = false; clearTimeout(timer.current); timer.current = setTimeout(() => { longFired.current = true; setEdit(true); }, 1500); };
  const stop = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  const move = (i: number, d: number) => setApps((a) => { const j = i + d; if (j < 0 || j >= a.length) return a; const n = [...a]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const saveForm = () => {
    if (!form || !form.n.trim() || !form.u.trim()) return;
    const u = /^https?:\/\//i.test(form.u.trim()) ? form.u.trim() : "https://" + form.u.trim();
    setApps((a) => [...a, { n: form.n.trim().slice(0, 24), i: form.i, u }].slice(0, MAX_APPS));
    setForm(null);
  };
  const inp = "min-h-10 w-full border bg-transparent px-2 text-sm text-primary";
  return (
    <div className="relative flex h-full flex-col gap-3 overflow-hidden">
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-4 gap-3">
        {apps.map((a, i) => (
          <div key={a.n + i} className={`relative min-h-0 min-w-0 ${edit ? "r34-wiggle" : ""}`} style={edit ? { animationDelay: `${(i % 3) * 0.07}s` } : undefined}>
            <a href={a.u} draggable={false}
              onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => { if (edit || longFired.current) { e.preventDefault(); return; } setRecent(a.n); }}
              className="mfd-panel flex h-full min-w-0 select-none flex-col items-center justify-center gap-2 p-3 [-webkit-touch-callout:none] hover:border-primary">
              <span className="text-4xl text-primary glow">{a.i}</span>
              <span className="max-w-full truncate text-xs tracking-widest text-muted-foreground">{a.n.toUpperCase()}</span>
            </a>
            {edit && ask !== i && (
              <>
                <button onClick={() => setAsk(i)} aria-label="✕" className="absolute right-1 top-1 h-9 w-9 rounded-full border-2 border-background bg-destructive text-lg font-bold text-white">✕</button>
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="h-9 w-10 border bg-background text-primary disabled:opacity-30">◀</button>
                  <button onClick={() => move(i, 1)} disabled={i === apps.length - 1} className="h-9 w-10 border bg-background text-primary disabled:opacity-30">▶</button>
                </div>
              </>
            )}
            {edit && ask === i && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border border-destructive bg-background/95 p-2">
                <span className="text-sm font-bold text-destructive">{t.del}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setApps((x) => x.filter((_, k) => k !== i)); setAsk(null); }} className="h-10 w-12 border border-destructive bg-destructive text-white">✓</button>
                  <button onClick={() => setAsk(null)} className="h-10 w-12 border text-muted-foreground">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {(edit || !apps.length) && apps.length < MAX_APPS && (
          <button onClick={() => setForm({ n: "", i: "◎", u: "" })} className="mfd-panel flex min-h-0 flex-col items-center justify-center gap-2 border-dashed border-primary p-3 text-primary">
            <span className="text-4xl">+</span><span className="text-xs tracking-widest">{t.addApp}</span>
          </button>
        )}
      </div>
      {edit || !apps.length ? (
        <div className="flex shrink-0 gap-2">
          <button onClick={() => { setApps(() => APPS); setAsk(null); }} className="min-h-10 border border-accent px-4 text-xs tracking-widest text-accent">{t.resetApps}</button>
          <button onClick={() => { setEdit(false); setAsk(null); }} className="min-h-10 flex-1 border border-primary bg-primary text-sm tracking-widest text-primary-foreground">{t.done}</button>
        </div>
      ) : (
        <div className="mfd-panel flex min-h-9 shrink-0 items-center gap-2 p-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">{t.recent}: <span className="text-primary">{recent.join(" · ") || "—"}</span></span>
          <span className="shrink-0 opacity-70">{t.editHint}</span>
        </div>
      )}
      {form && (
        <form onSubmit={(e) => { e.preventDefault(); saveForm(); }} className="mfd-panel absolute inset-0 z-10 flex flex-col gap-2 p-3" style={{ background: "var(--background)" }}>
          {/* Knöpfe oben, damit die Bildschirmtastatur sie nicht verdeckt */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex-1 text-xs tracking-[0.3em] text-muted-foreground">{t.addApp}</div>
            <button type="button" onClick={() => setForm(null)} className="min-h-10 border px-4 text-sm tracking-widest text-muted-foreground">{t.cancel}</button>
            <button disabled={!form.n.trim() || !form.u.trim()} className="min-h-10 border border-primary bg-primary px-4 text-sm tracking-widest text-primary-foreground disabled:opacity-40">{t.save}</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input autoFocus value={form.n} onChange={(e) => setForm({ ...form, n: e.target.value })} placeholder={t.appName} className={inp} />
            <input value={form.u} onChange={(e) => setForm({ ...form, u: e.target.value })} placeholder={t.appUrl} className={inp} />
          </div>
          <div className="flex flex-wrap gap-1">
            {ICONS.map((ic) => (
              <button type="button" key={ic} onClick={() => setForm({ ...form, i: ic })} className={`h-10 w-10 border text-xl ${form.i === ic ? "border-primary bg-primary text-primary-foreground" : "text-primary"}`}>{ic}</button>
            ))}
          </div>
        </form>
      )}
    </div>
  );
}
