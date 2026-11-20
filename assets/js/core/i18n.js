/* Sprache aus URL erkennen + Helper für Sprach-Switching */

const SUPPORTED = ["de", "en"];
const DEFAULT_LANG = "de";

function detectLang() {
  const segs = location.pathname.split("/").filter(Boolean);
  const first = segs[0];
  if (SUPPORTED.includes(first)) return first;
  return DEFAULT_LANG;
}

export const lang = detectLang();
export const otherLang = lang === "de" ? "en" : "de";

document.documentElement.setAttribute("lang", lang);

export function dataPath(name) {
  return `/data/${lang}/${name}.json`;
}

export function sitePath() {
  return `/data/site.json`;
}

/**
 * Findet die korrespondierende URL in der anderen Sprache.
 * Erwartet ein Mapping in site.json:
 *   "pageMap": { "/de/projekte": "/en/projects", ... }
 * Fallback: ersetzt nur den Sprach-Prefix.
 */
export function alternateUrl(pageMap) {
  const here = location.pathname + location.search;
  if (pageMap && pageMap[location.pathname]) {
    return pageMap[location.pathname] + location.search;
  }
  return here.replace(`/${lang}/`, `/${otherLang}/`);
}

/**
 * Übersetzt einen Key aus ui.json. Lazy-geladen via dataLoader.
 */
import { loadData } from "./data-loader.js";

let _ui = null;
export async function t(key, fallback = "") {
  if (!_ui) {
    try {
      _ui = await loadData("ui");
    } catch (e) {
      _ui = {};
    }
  }
  const parts = key.split(".");
  let cur = _ui;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return fallback || key;
  }
  return typeof cur === "string" ? cur : fallback || key;
}

export function formatDate(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}
