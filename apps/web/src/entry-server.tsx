import { renderToString } from "react-dom/server";
import App from "./App";

/* Build-time prerender entry: scripts/prerender.mjs loads this against a jsdom
   shim and injects the result into dist/index.html's #root, so crawlers that
   do not execute JavaScript still read the page. Effects never run here — the
   QR canvas, storage reads and analytics all stay browser-only. */
export function render(): string {
  return renderToString(<App />);
}
