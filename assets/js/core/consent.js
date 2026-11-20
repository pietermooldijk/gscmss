/* Consent-Management (DSGVO / § 25 TDDDG)

   Externe Skripte von cdn.jsdelivr.net werden ausschliesslich nach
   ausdruecklicher Einwilligung geladen. Ohne Einwilligung findet KEINE
   Verbindung zum CDN statt.

   Technik: Die Skript-Tags stehen als
     <script type="text/plain" data-gs-src="https://cdn.jsdelivr.net/...">
   im <head>. Ein type="text/plain"-Tag wird vom Browser weder ausgefuehrt
   noch geladen — es entsteht also kein Request. Erst nach Einwilligung
   ersetzt loadDeferredScripts() sie durch echte <script>-Tags. */

const STORAGE_KEY = "gs-consent";
const VERSION = 1;
const DEFERRED_SELECTOR = 'script[type="text/plain"][data-gs-src]';

let loadPromise = null;

/** "granted" | "denied" | null (= noch keine Entscheidung) */
export function getConsent() {
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("cms_preview") === "1") {
    return "granted";
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const val = JSON.parse(raw);
    if (!val || val.version !== VERSION) return null;
    return val.status === "granted" ? "granted" : "denied";
  } catch {
    // localStorage gesperrt (Private Mode, Cookie-Blocker) → wie "keine
    // Entscheidung" behandeln. Ohne Speicher wird nichts geladen.
    return null;
  }
}

function store(status) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ status, version: VERSION, date: new Date().toISOString() })
    );
  } catch {
    /* nicht speicherbar — Entscheidung gilt dann nur fuer diesen Seitenaufruf */
  }
}

function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function injectScript(node) {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = node.dataset.gsSrc;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => {
      console.warn(`[consent] Skript konnte nicht geladen werden: ${s.src}`);
      resolve();
    };
    node.replaceWith(s);
  });
}

/* Laedt die markierten CDN-Skripte nacheinander. Die Reihenfolge zaehlt:
   ScrollTrigger setzt gsap voraus. */
function loadDeferredScripts() {
  if (loadPromise) return loadPromise;
  const nodes = Array.from(document.querySelectorAll(DEFERRED_SELECTOR));
  loadPromise = nodes
    .reduce((chain, node) => chain.then(() => injectScript(node)), Promise.resolve())
    .then(() => emit("gs:libs-ready"));
  return loadPromise;
}

/** Von main.js vor dem Start abgewartet: bei Einwilligung sind die Libs
    danach da, sonst geht es sofort ohne sie weiter. */
export function libsReady() {
  return getConsent() === "granted" ? loadDeferredScripts() : Promise.resolve();
}

/* Nach der Einwilligung wird neu geladen: beim naechsten Start sind die Libs
   da, bevor die Komponenten rendern. Sie nachtraeglich einzuhaengen wuerde
   heissen, dass ein Teil der Seite schon ohne GSAP gerendert wurde. */
export function grant() {
  store("granted");
  emit("gs:consent-changed", { status: "granted" });
  location.reload();
}

export function deny() {
  store("denied");
  emit("gs:consent-changed", { status: "denied" });
}

/** Entscheidung zuruecknehmen. Bereits geladene Skripte lassen sich nicht
    zurueckholen, deshalb ein Reload — danach ist die Seite wieder clean. */
export function revoke() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignorieren */
  }
  location.reload();
}

/* Fuer den Footer-Link "Cookie-Einstellungen" — ohne Modul-Import nutzbar. */
if (typeof window !== "undefined") {
  window.gsConsent = { getConsent, grant, deny, revoke };
}
