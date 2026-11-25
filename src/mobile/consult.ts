// Nissan Consult (CONSULT-I) – gleiche Logik wie R34 OS backend/consult.py, hier über Bluetooth-SPP.
// Init FF FF EF → ECU antwortet 10. Je Register 5A <reg>, ECU echot jedes Byte invertiert.
// Stream-Start F0 (Echo 0F), danach Frames FF <Anzahl> <Daten…>. Stop: 30.
// Register: 00/01 RPM (x12,5), 08 Wasser (−50 °C), 0B Speed (x2 km/h), 0C Batterie (x80 mV), 0D Drosselklappe (x20 mV).
import { bt } from "./bt";

export const REGS = [0x00, 0x01, 0x08, 0x0b, 0x0c, 0x0d];
export const TPS_CLOSED_V = 0.45;
export const TPS_WOT_V = 4.05;
export type Frame = { rpm: number; water: number; speed: number; volt: number; tps: number; tps_v: number };

export function tpsPct(tv: number, cal: [number, number] | null) {
  const [c, w] = cal ?? [TPS_CLOSED_V, TPS_WOT_V];
  return Math.min(100, Math.max(0, ((tv - c) / Math.max(0.1, w - c)) * 100));
}
export function decode(b: Uint8Array, cal: [number, number] | null): Frame {
  const tv = Math.round(b[5] * 0.02 * 100) / 100;
  return { rpm: ((b[0] << 8) | b[1]) * 12.5, water: b[2] - 50, speed: b[3] * 2, volt: Math.round(b[4] * 0.08 * 100) / 100, tps: tpsPct(tv, cal), tps_v: tv };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Empfangspuffer mit "lies n Bytes, höchstens t ms warten" (wie serial.read mit timeout)
class Rx {
  buf: number[] = [];
  wake: (() => void) | null = null;
  lost = false;
  push(b: Uint8Array) { for (const x of b) this.buf.push(x); if (this.buf.length > 8192) this.buf.splice(0, this.buf.length - 4096); this.wake?.(); }
  clear() { this.buf = []; }
  async read(n: number, ms = 500): Promise<number[]> {
    const end = Date.now() + ms;
    while (this.buf.length < n && Date.now() < end && !this.lost) {
      await new Promise<void>((r) => { this.wake = r; setTimeout(r, Math.max(1, end - Date.now())); });
      this.wake = null;
    }
    if (this.lost) throw new Error("Verbindung getrennt");
    return this.buf.splice(0, Math.min(n, this.buf.length));
  }
}

async function open(mac: string): Promise<Rx> {
  const rx = new Rx();
  await bt.connect(mac, (b) => rx.push(b), () => { rx.lost = true; rx.wake?.(); });
  return rx;
}
async function echo(rx: Rx, b: number) {
  await bt.write(Uint8Array.of(b));
  const r = await rx.read(1);
  return r.length === 1 && r[0] === (b ^ 0xff);
}
async function handshake(rx: Rx) {
  await bt.write(Uint8Array.of(0x30)); await sleep(200); rx.clear();
  await bt.write(Uint8Array.of(0xff, 0xff, 0xef));
  const end = Date.now() + 2000;
  let ok = false;
  while (Date.now() < end) { const r = await rx.read(1, end - Date.now()); if (r[0] === 0x10) { ok = true; break; } }
  if (!ok) throw new Error("ECU antwortet nicht auf Init");
  for (const r of REGS) if (!((await echo(rx, 0x5a)) && (await echo(rx, r)))) throw new Error("Register-Echo fehlt");
  if (!(await echo(rx, 0xf0))) throw new Error("Stream-Start ohne Echo");
}

/** Antwortet an diesem Adapter ein Consult-Steuergerät? (für AUTOMATISCH SUCHEN, ca. 3–10 s) */
export async function probe(mac: string) {
  try {
    const rx = await open(mac);
    await handshake(rx);
    await bt.write(Uint8Array.of(0x30));
    return true;
  } catch {
    return false;
  } finally {
    await bt.disconnect();
  }
}

/** Endlosschleife: verbindet, liest Frames, verbindet bei Fehlern neu – bis stop() true liefert. */
export async function run(mac: string, stop: () => boolean, onFrame: (f: Frame) => void, cal: () => [number, number] | null, onState?: (s: "connecting" | "live" | "error") => void) {
  while (!stop()) {
    try {
      onState?.("connecting");
      const rx = await open(mac);
      await handshake(rx);
      let last = Date.now();
      while (!stop()) {
        // keine Frames mehr (z. B. Zündung aus): neu aufbauen, die ECU braucht danach ein neues Init
        if (Date.now() - last > 2000) throw new Error("ECU schweigt");
        const h = await rx.read(1, 300);
        if (h[0] !== 0xff) continue;
        const n = await rx.read(1);
        if (n[0] !== REGS.length) continue;
        const d = await rx.read(REGS.length);
        if (d.length === REGS.length) { last = Date.now(); onState?.("live"); onFrame(decode(Uint8Array.from(d), cal())); }
      }
      await bt.write(Uint8Array.of(0x30)).catch(() => undefined);
    } catch {
      onState?.("error");
    }
    await bt.disconnect();
    if (!stop()) await sleep(1000);
  }
}
