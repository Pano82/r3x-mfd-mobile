import { createRoot } from "react-dom/client";
import "./styles.css";
import "@fontsource/orbitron/latin-500.css"; import "@fontsource/orbitron/latin-800.css";
import "@fontsource/share-tech-mono/latin-400.css";
import "@fontsource/noto-sans/latin-400.css"; import "@fontsource/noto-sans/latin-700.css";
import "@fontsource/noto-sans/greek-400.css"; import "@fontsource/noto-sans/greek-700.css";
import "@fontsource/noto-sans-jp/japanese-400.css"; import "@fontsource/noto-sans-jp/japanese-700.css";
import "@fontsource/vt323/latin-400.css"; import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource/audiowide/latin-400.css";
import "@fontsource/outfit/latin-400.css"; import "@fontsource/outfit/latin-600.css";
import "@fontsource/rajdhani/latin-500.css"; import "@fontsource/rajdhani/latin-700.css";
import { Component } from "react";
import App from "./App";
import { install } from "./mobile/backend";

// App: Datenschicht im Handy statt Python-Backend am Pi (Consult über Bluetooth, GPS, Musik)
install();

// Auffangnetz: stürzt die Oberfläche ab, erscheint statt eines schwarzen Bildschirms ein Rücksetz-Knopf.
const KEYS = ["r34", "r34split", "r34vol"];
class Guard extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error("R34 UI:", err); }
  render() {
    if (!this.state.err) return this.props.children;
    const reset = () => { try { KEYS.forEach((k) => localStorage.removeItem(k)); sessionStorage.removeItem("r34dest"); } catch { /* ignore */ } location.reload(); };
    const btn = { font: "700 18px system-ui, sans-serif", letterSpacing: ".08em", minHeight: 64, padding: "0 28px", border: "2px solid #2fb8d6", borderRadius: 10, background: "transparent", color: "#2fb8d6" };
    return (
      <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, font: "16px system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div style={{ color: "#ff9a2e", fontWeight: 700, letterSpacing: ".1em" }}>FEHLER IN DER OBERFLÄCHE · INTERFACE ERROR</div>
        <div style={{ opacity: 0.7, maxWidth: 560 }}>Einstellungen zurücksetzen behebt das meistens. · Resetting the settings usually fixes this.</div>
        <div style={{ display: "flex", gap: 16 }}>
          <button style={btn} onClick={reset}>EINSTELLUNGEN ZURÜCKSETZEN · RESET</button>
          <button style={{ ...btn, borderColor: "#555", color: "#aaa" }} onClick={() => location.reload()}>NEU LADEN · RELOAD</button>
        </div>
      </div>
    );
  }
}
createRoot(document.getElementById("root")).render(<Guard><App /></Guard>);
