// App-Backend: ersetzt den Python-Server des Raspberry Pi (backend/server.py + ecu.py) direkt im Handy.
// Die Oberfläche aus R34 OS bleibt unverändert und spricht weiter /api/… und /stream –
// diese Datei fängt die Aufrufe ab und beantwortet sie mit Consult über Bluetooth, Demo-Werten und Handy-GPS.
import { Geolocation } from "@capacitor/geolocation";
import { NATIVE, bt } from "./bt";
import * as consult from "./consult";
import { musicList } from "./music";
import { VERSION } from "../platform";

// ---------------- Live-Werte (wie S im Backend) ----------------
type Src = "ecu" | "esp32" | "none";
type SensorKey = "boost" | "oilp" | "oilt";
const SENSORS: SensorKey[] = ["boost", "oilp", "oilt"];
const S: Record<string, unknown> = { rpm: 0, speed: 0, water: 0, volt: 0, tps: 0, tps_v: 0, boost: 0, oilp: 0, oilt: 0, heading: 0, sats: 0, acc: 0, lat: 0, lon: 0, fix: 0, ign: 1, off_in: 0 };
const LAST = { consult: 0, aux: 0 };

// ---------------- Fahrzeug-Profile (wie ecu.py; CAN und Power FC nur am Pi) ----------------
type Profile = { id: string; group: "nissan" | "tuned" | "standalone" | "demo"; name: string; engine: string; driver: string; status: "ready" | "soon"; eta?: string; redline: number | null; provides: string[] };
const P = (id: string, group: Profile["group"], name: string, engine: string, driver: string, redline: number | null, provides: string[] = [], status: Profile["status"] = "ready", eta?: string): Profile =>
  ({ id, group, name, engine, driver, status, redline, provides, ...(eta ? { eta } : {}) });
const PROFILES: Profile[] = [
  P("r34-gtt", "nissan", "R34 GT-T", "RB25DET NEO", "consult", 6600),
  P("r34-gtr", "nissan", "R34 GT-R", "RB26DETT", "consult", 7500),
  P("r33-gtst", "nissan", "R33 GTS-T", "RB25DET", "consult", 6600),
  P("r33-gtr", "nissan", "R33 GT-R", "RB26DETT", "consult", 7500),
  P("r32-gtst", "nissan", "R32 GTS-T", "RB20DET", "consult", 7000),
  P("r32-gtr", "nissan", "R32 GT-R", "RB26DETT", "consult", 7500),
  P("nistune", "tuned", "Nistune", "Consult", "consult", null),
  P("piggyback", "tuned", "e-manage / F-CON iS", "Consult", "consult", null),
  P("link-g4", "standalone", "Link G4 / G4+ / G4X", "CAN", "can-link", null, ["boost", "oilp", "oilt"], "soon", "pi"),
  P("powerfc", "standalone", "Apexi Power FC", "FC-Datalogit", "powerfc", null, ["boost"], "soon", "pi"),
  P("haltech", "standalone", "Haltech Elite / Nexus", "CAN", "can-haltech", null, ["boost", "oilp", "oilt"], "soon", "pi"),
  P("demo", "demo", "Demo", "", "demo", null, ["boost", "oilp", "oilt"]),
];
const BY_ID = Object.fromEntries(PROFILES.map((p) => [p.id, p])) as Record<string, Profile>;
const DEFAULT = "r34-gtt";

// ---------------- Zustand (statt ~/.config/r34/state.json) ----------------
type State = { profile: string; car: string; setup: boolean; port: string; sensors: Record<SensorKey, Src>; tps: [number, number] | null };
const KEY = "r34app";
function loadState(): State {
  let st: Partial<State> = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { /* ignore */ }
  const profile = st.profile && BY_ID[st.profile]?.status === "ready" ? st.profile : DEFAULT;
  const car = st.car && BY_ID[st.car]?.group === "nissan" ? st.car : BY_ID[profile].group === "nissan" ? profile : "";
  const sen = (st.sensors ?? {}) as Partial<Record<SensorKey, Src>>;
  const prov = BY_ID[profile].provides;
  const sensors = Object.fromEntries(SENSORS.map((k) => [k, sen[k] !== "none" && prov.includes(k) ? "ecu" : "none"])) as Record<SensorKey, Src>;
  const tps = Array.isArray(st.tps) && st.tps.length === 2 && st.tps[1] - st.tps[0] >= 0.5 ? st.tps : null;
  return { profile, car, setup: !!st.setup, port: typeof st.port === "string" ? st.port : "", sensors, tps };
}
const state = loadState();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } };
const publish = () => { S.src = { ...state.sensors }; };
publish();
const profile = () => BY_ID[state.profile];
const mac = () => (state.port.startsWith("bt:") ? state.port.slice(3) : "");

// ---------------- Treiber ----------------
let gen = 0;            // jede Treiber-Runde bekommt eine Nummer; ändert sie sich, hört die alte auf
let adapterName = "";
function stopDriver() {
  gen++;
  LAST.consult = 0;
  Object.assign(S, { rpm: 0, speed: 0, water: 0, volt: 0, tps: 0 });
}
function startDriver() {
  stopDriver();
  const my = gen;
  const stop = () => my !== gen;
  const drv = profile().driver;
  if (drv === "demo") void runDemo(stop);
  else if (drv === "consult" && mac()) void consult.run(mac(), stop, (f) => { Object.assign(S, f); LAST.consult = Date.now(); }, () => state.tps);
}
async function runDemo(stop: () => boolean) {
  // Vorführmodus: Leerlauf, Hochdrehen, Schalten, Rollen (wie run_demo in ecu.py)
  const t0 = Date.now();
  while (!stop()) {
    const t = ((Date.now() - t0) / 1000) % 24;
    let rpm;
    if (t < 4) rpm = 900 + 20 * Math.sin(t * 9);
    else if (t < 9) rpm = 900 + 5800 * ((t - 4) / 5) ** 1.4;
    else if (t < 9.4) rpm = 6700 - (2400 * (t - 9)) / 0.4;
    else if (t < 14) rpm = 4300 + 1900 * ((t - 9.4) / 4.6);
    else if (t < 20) rpm = 6200 - 3800 * ((t - 14) / 6);
    else rpm = 2400 - 1500 * ((t - 20) / 4);
    const load = Math.max(0, Math.min(1, (rpm - 900) / 6000));
    const r2 = (x: number) => Math.round(x * 100) / 100;
    Object.assign(S, { rpm: Math.round(rpm), speed: t >= 4 ? Math.round(Math.min(180, 18 + load * 150)) : 0, water: 88, volt: r2(14.1 - load * 0.2),
      tps: Math.round((4 <= t && t < 14 ? load * 100 : 8) * 10) / 10, tps_v: r2(0.45 + 3.6 * (4 <= t && t < 14 ? load : 0.08)), boost: r2(-0.62 + 1.6 * load ** 0.9),
      oilp: Math.round((1.3 + load * 4.4) * 10) / 10, oilt: Math.round(95 + load * 12) });
    LAST.consult = LAST.aux = Date.now();
    await new Promise((r) => setTimeout(r, 100));
  }
  LAST.aux = 0; Object.assign(S, { boost: 0, oilp: 0, oilt: 0 });
}

function select(pid: string) {
  let p = BY_ID[pid];
  if (!p) return { ok: false, msg: "?" };
  if (p.status !== "ready") return { ok: false, msg: "soon", eta: p.eta ?? "" };
  const cur = profile();
  if (p.group === "nissan") { state.car = pid; if (cur.group === "tuned" || cur.group === "standalone") pid = cur.id; }
  else if (p.group === "demo") state.car = "";
  else if (cur.id === pid) { pid = state.car || DEFAULT; if (!state.car) state.car = pid; }
  else if (!state.car && cur.group === "nissan") state.car = cur.id;
  p = BY_ID[pid];
  state.profile = pid;
  // ohne ESP32 in der App: Zusatzwerte nur vom Steuergerät, sonst ausblenden
  for (const k of SENSORS) state.sensors[k] = p.provides.includes(k) ? "ecu" : "none";
  save(); publish(); startDriver();
  return { ok: true };
}
function tpsLearn(point: string) {
  if (point === "reset") { state.tps = null; save(); return { ok: true, tps: null }; }
  if (Date.now() - LAST.consult > 2000) return { ok: false, msg: "nodata" };
  const v = Number(S.tps_v) || 0;
  let [c, w] = state.tps ?? [consult.TPS_CLOSED_V, consult.TPS_WOT_V];
  if (point === "closed") c = v; else if (point === "wot") w = v; else return { ok: false, msg: "?" };
  if (w - c < 0.5) return { ok: false, msg: "range", v };
  state.tps = [Math.round(c * 100) / 100, Math.round(w * 100) / 100]; save();
  return { ok: true, tps: state.tps, v };
}
function setSensors(d: Record<string, unknown>) {
  const prov = profile().provides;
  for (const k of SENSORS) { const v = d[k]; if (v === "none" || (v === "ecu" && prov.includes(k))) state.sensors[k] = v; }
  save(); publish();
  return { ok: true, sensors: state.sensors };
}
function info() {
  return { profile: state.profile, car: state.car, setup: state.setup, port: state.port, conn: "bt", pi: { model: "Android", gen: 0, ram: 0, hints: [] },
    sensors: state.sensors, tps: state.tps, tps_default: [consult.TPS_CLOSED_V, consult.TPS_WOT_V], profiles: PROFILES };
}
async function btDevices(scan: boolean) {
  try {
    const r = await bt.devices(scan);
    return [...r.devices].sort((a, b) => +b.likely - +a.likely || +b.paired - +a.paired || a.name.localeCompare(b.name));
  } catch { return []; }
}
async function useBt(m: string, pin: string) {
  const r = await bt.pair(m, pin).catch(() => ({ ok: false, msg: "fail" }));
  if (!r.ok) return r;
  state.port = "bt:" + m.toUpperCase(); save();
  const d = (await btDevices(false)).find((x) => x.mac === m.toUpperCase()); adapterName = d?.name ?? "";
  if (profile().driver === "consult") startDriver();
  return { ok: true, port: state.port };
}
async function scan() {
  const res = { consult: "", powerfc: "", can: [] as string[], serial: [] as string[], suggest: [] as string[], silent: false };
  if (Date.now() - LAST.consult < 2000 && profile().driver === "consult") res.consult = state.port;
  else {
    const devs = (await btDevices(false)).filter((d) => d.paired);
    res.serial = devs.map((d) => "bt:" + d.mac);
    stopDriver();
    try {
      for (const d of [...devs.filter((x) => x.likely), ...devs.filter((x) => !x.likely)]) {
        if (await consult.probe(d.mac)) { res.consult = "bt:" + d.mac; adapterName = d.name; break; }
      }
    } finally {
      if (res.consult && res.consult !== state.port) { state.port = res.consult; save(); }
      startDriver();
    }
    res.silent = devs.length > 0 && !res.consult;
  }
  if (res.consult) res.suggest.push("r34-gtt", "r34-gtr", "nistune");
  return res;
}

// ---------------- GPS vom Handy ----------------
function onPos(p: { coords: { latitude: number; longitude: number; accuracy: number; heading?: number | null; speed?: number | null } }) {
  const c = p.coords;
  Object.assign(S, { lat: c.latitude, lon: c.longitude, acc: Math.round(c.accuracy), fix: 1, sats: 0 });
  if (c.heading != null && !Number.isNaN(c.heading) && (c.speed ?? 0) > 1) S.heading = c.heading;   // Kurs nur in Fahrt sinnvoll
}
async function startGps() {
  try {
    if (NATIVE) {
      const perm = await Geolocation.checkPermissions().catch(() => null);
      if (perm?.location !== "granted") await Geolocation.requestPermissions().catch(() => undefined);
      await Geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }, (p) => { if (p) onPos(p); else S.fix = 0; });
    } else if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(onPos, () => { S.fix = 0; }, { enableHighAccuracy: true, maximumAge: 1000 });
    }
  } catch { S.fix = 0; }
}
async function myPosition() {
  if (S.fix) return { ok: true, lat: S.lat, lon: S.lon, acc: S.acc || 15, src: "gps" };
  try {
    const p = NATIVE ? await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
      : await new Promise<GeolocationPosition>((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, { timeout: 10000 }));
    onPos(p);
    return { ok: true, lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy), src: "gps" };
  } catch { return { ok: false }; }
}

// ---------------- Zielsuche (OpenStreetMap Nominatim, max. 1 Anfrage/s) ----------------
const realFetch = window.fetch.bind(window);
const geoCache = new Map<string, unknown>();
let geoLast = 0;
async function geocode(q: string) {
  q = q.trim().slice(0, 200);
  if (!q) return { ok: false };
  const hit = geoCache.get(q.toLowerCase()); if (hit) return hit;
  const wait = 1000 - (Date.now() - geoLast); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  geoLast = Date.now();
  try {
    const r = await realFetch("https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ q, format: "jsonv2", limit: "1", email: "info@mindustries.org" }), { headers: { "Accept-Language": navigator.language || "de,en" } });
    const res = (await r.json()) as { lat: string; lon: string; display_name?: string }[];
    const out = res.length ? { ok: true, lat: +res[0].lat, lon: +res[0].lon, name: res[0].display_name ?? q } : { ok: false };
    if (out.ok) geoCache.set(q.toLowerCase(), out);
    return out;
  } catch { return { ok: false, offline: true }; }
}

// ---------------- Router: /api/… wie server.py ----------------
async function route(url: URL, method: string, body: Record<string, unknown>): Promise<unknown> {
  const p = url.pathname, q = url.searchParams;
  if (method === "GET") {
    switch (p) {
      case "/api/status": return { ssid: "", signal: 0, bt: Date.now() - LAST.consult < 2000 && profile().driver === "consult" ? [adapterName || "Consult"] : [] };
      case "/api/version": return { version: VERSION };
      case "/api/ui": return {};
      case "/api/ecu": return info();
      case "/api/ecu/bt": return btDevices(q.get("scan") === "1");
      case "/api/geo": return myPosition();
      case "/api/geocode": return geocode(q.get("q") ?? "");
      case "/api/music": return musicList();
      case "/api/diag": return { running: false, left: 0, file: "", msg: "" };
      case "/api/system": return { version: VERSION, updates: [] };
      case "/api/bt/devices": return { devices: [] };
      case "/api/wifi/scan": return [];
    }
  } else {
    switch (p) {
      case "/api/ecu": return select(String(body.profile ?? ""));
      case "/api/ecu/scan": return scan();
      case "/api/ecu/conn": return body.mode === "bt" ? useBt(String(body.mac ?? ""), String(body.pin ?? "1234")) : { ok: true, port: state.port };
      case "/api/ecu/tps": return tpsLearn(String(body.point ?? ""));
      case "/api/ecu/sensors": return setSensors(body);
      case "/api/setup": state.setup = !!body.done; save(); return { ok: true };
      case "/api/ui": return { ok: true };
    }
  }
  return { ok: false, msg: "app" };
}

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });

// /stream: 10 Hz wie beim Pi (Server-Sent Events)
class StreamSource {
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 1;
  private tm = setInterval(() => {
    S.live = +(Date.now() - LAST.consult < 2000);
    S.aux = +(Date.now() - LAST.aux < 2000);
    this.onmessage?.({ data: JSON.stringify(S) });
  }, 100);
  close() { clearInterval(this.tm); this.readyState = 2; }
  addEventListener(ev: string, f: (e: { data: string }) => void) { if (ev === "message") this.onmessage = f; }
  removeEventListener() { /* ignore */ }
}

export function install() {
  const own = (u: string) => { try { const x = new URL(u, location.href); return x.origin === location.origin && x.pathname.startsWith("/api/") ? x : null; } catch { return null; } };
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = own(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (!u) return realFetch(input, init);
    let body: Record<string, unknown> = {};
    try { if (typeof init?.body === "string") body = JSON.parse(init.body); } catch { /* ignore */ }
    try { return json(await route(u, (init?.method ?? "GET").toUpperCase(), body && typeof body === "object" ? body : {})); }
    catch { return json({ ok: false, msg: "error" }, 500); }
  };
  const RealES = window.EventSource;
  (window as unknown as { EventSource: unknown }).EventSource = function (this: unknown, url: string, opt?: EventSourceInit) {
    return new URL(url, location.href).pathname === "/stream" ? new StreamSource() : new RealES(url, opt);
  };
  void bt.keepAwake(true);
  void startGps();
  startDriver();
}
