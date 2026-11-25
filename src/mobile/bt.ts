// Bluetooth-Seriell (SPP): auf dem Handy das native Plugin (BluetoothSerialPlugin.java),
// im Browser (npm run dev) ein simulierter Consult-Adapter – damit lässt sich die App ohne Auto testen.
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export type BtDev = { mac: string; name: string; paired: boolean; likely: boolean; connected?: boolean };
type DevRes = { devices: BtDev[]; err?: string };
interface Native {
  devices(o: { scan: boolean }): Promise<DevRes>;
  pair(o: { mac: string; pin: string }): Promise<{ ok: boolean; msg: string }>;
  connect(o: { mac: string }): Promise<{ ok: boolean }>;
  write(o: { b64: string }): Promise<void>;
  disconnect(): Promise<void>;
  keepAwake(o: { on: boolean }): Promise<void>;
  addListener(ev: "data", f: (e: { b64: string }) => void): Promise<PluginListenerHandle>;
  addListener(ev: "state", f: (e: { connected: boolean }) => void): Promise<PluginListenerHandle>;
}

export interface Bt {
  devices(scan: boolean): Promise<DevRes>;
  pair(mac: string, pin: string): Promise<{ ok: boolean; msg: string }>;
  connect(mac: string, onData: (b: Uint8Array) => void, onLost: () => void): Promise<void>;
  write(b: Uint8Array): Promise<void>;
  disconnect(): Promise<void>;
  keepAwake(on: boolean): Promise<void>;
}

const toB64 = (b: Uint8Array) => { let s = ""; b.forEach((x) => { s += String.fromCharCode(x); }); return btoa(s); };
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

class NativeBt implements Bt {
  p = registerPlugin<Native>("BluetoothSerial");
  subs: PluginListenerHandle[] = [];
  devices(scan: boolean) { return this.p.devices({ scan }); }
  pair(mac: string, pin: string) { return this.p.pair({ mac, pin }); }
  async connect(mac: string, onData: (b: Uint8Array) => void, onLost: () => void) {
    await this.drop();
    this.subs.push(await this.p.addListener("data", (e) => onData(fromB64(e.b64))));
    this.subs.push(await this.p.addListener("state", (e) => { if (!e.connected) onLost(); }));
    await this.p.connect({ mac });
  }
  write(b: Uint8Array) { return this.p.write({ b64: toB64(b) }); }
  async disconnect() { await this.drop(); await this.p.disconnect().catch(() => undefined); }
  keepAwake(on: boolean) { return this.p.keepAwake({ on }).catch(() => undefined); }
  private async drop() { const s = this.subs; this.subs = []; for (const h of s) await h.remove().catch(() => undefined); }
}

// ---- Simulator: verhält sich wie ein Consult-Steuergerät (Init FF FF EF → 10, Echo invertiert, F0 → Datenstrom) ----
class SimBt implements Bt {
  onData: ((b: Uint8Array) => void) | null = null;
  stage: "idle" | "regs" | "stream" = "idle";
  ff = 0; regs = 0; tm: ReturnType<typeof setInterval> | undefined; t0 = Date.now();
  async devices(scan: boolean) {
    if (scan) await new Promise((r) => setTimeout(r, 800));
    return { devices: [{ mac: "00:11:22:33:44:55", name: "HC-05 (Simulator)", paired: true, likely: true }, { mac: "AA:BB:CC:00:11:22", name: "JBL Flip 5", paired: false, likely: false }] };
  }
  async pair(mac: string, pin: string) { await new Promise((r) => setTimeout(r, 600)); return mac.startsWith("00:11") && pin === "1234" ? { ok: true, msg: "" } : { ok: false, msg: "pin" }; }
  async connect(mac: string, onData: (b: Uint8Array) => void) {
    if (!mac.startsWith("00:11")) throw new Error("connect");
    this.onData = onData; this.stage = "idle"; this.ff = 0;
  }
  private send(...b: number[]) { const f = this.onData; setTimeout(() => f?.(Uint8Array.from(b)), 5); }
  async write(b: Uint8Array) {
    for (const x of b) {
      if (x === 0x30) { clearInterval(this.tm); this.stage = "idle"; this.ff = 0; continue; }
      if (this.stage === "idle") {
        if (x === 0xff) this.ff++;
        else if (x === 0xef && this.ff >= 2) { this.stage = "regs"; this.regs = 0; this.send(0x10); }
        else this.ff = 0;
        continue;
      }
      if (this.stage === "regs") {
        this.send(x ^ 0xff);
        if (x === 0xf0) { this.stage = "stream"; this.startStream(); }
      }
    }
  }
  private startStream() {
    clearInterval(this.tm);
    this.tm = setInterval(() => {
      const t = ((Date.now() - this.t0) / 1000) % 20;
      const rpm = t < 5 ? 850 : t < 11 ? 850 + 5600 * ((t - 5) / 6) : 6450 - 5600 * ((t - 11) / 9);
      const r = Math.round(rpm / 12.5);
      const load = Math.max(0, (rpm - 850) / 5600);
      this.send(0xff, 6, r >> 8, r & 0xff, 50 + 86, Math.round((t < 5 ? 0 : 20 + load * 120) / 2), Math.round((14.0 - load * 0.3) / 0.08), Math.round((0.46 + load * 3.5) / 0.02));
    }, 50);
  }
  async disconnect() { clearInterval(this.tm); this.onData = null; this.stage = "idle"; }
  async keepAwake() { /* Browser: nichts */ }
}

export const NATIVE = Capacitor.isNativePlatform();
export const bt: Bt = NATIVE ? new NativeBt() : new SimBt();
