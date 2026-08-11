import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initAnalytics } from "./analytics";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
/* IBM Plex ships from our own origin (#81): the header says nothing leaves
   your machine, so the page must not send every visitor's IP to Google for a
   font. JS imports, not CSS @import — the bundler drops mid-file @imports
   silently, the exact trap documented in index.html's font comment. */
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

initAnalytics();

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
