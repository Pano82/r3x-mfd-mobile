// Musik vom Handy: Dateien über die Android-Dateiauswahl wählen (statt USB-Stick am Pi).
// Die Auswahl gilt bis zum Schließen der App.
export type Track = { id: number; name: string; folder: string };
const files: { t: Track; url: string; size: number }[] = [];
let nextId = 1;

export const musicList = (): Track[] => files.map((f) => f.t);
export const musicUrl = (id: number) => files.find((f) => f.t.id === id)?.url;

/** Öffnet die Dateiauswahl (muss direkt aus einem Antippen kommen). Ergebnis: Anzahl neu hinzugefügter Titel. */
export function pickMusic(): Promise<number> {
  return new Promise((resolve) => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "audio/*"; inp.multiple = true;
    inp.style.display = "none";
    let done = false;
    const end = (n: number) => { if (done) return; done = true; inp.remove(); resolve(n); };
    inp.onchange = () => {
      let n = 0;
      for (const f of Array.from(inp.files ?? [])) {
        if (files.some((x) => x.t.name === f.name.replace(/\.[^.]+$/, "") && x.size === f.size)) continue;
        files.push({ t: { id: nextId++, name: f.name.replace(/\.[^.]+$/, ""), folder: "" }, url: URL.createObjectURL(f), size: f.size });
        n++;
      }
      end(n);
    };
    inp.addEventListener("cancel", () => end(0));
    document.body.appendChild(inp);
    inp.click();
  });
}
