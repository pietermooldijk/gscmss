/* JSON-Loader mit In-Memory-Cache und parallelem Fetch-Schutz */

import { lang, dataPath, sitePath } from "./i18n.js";

const cache = new Map();
const inflight = new Map();

async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url);
  if (inflight.has(url)) return inflight.get(url);

  const promise = fetch(url, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
      return r.json();
    })
    .then((json) => {
      cache.set(url, json);
      inflight.delete(url);
      return json;
    })
    .catch((err) => {
      inflight.delete(url);
      console.warn(`[data-loader] ${err.message}`);
      cache.set(url, null);
      return null;
    });

  inflight.set(url, promise);
  return promise;
}

/**
 * Lädt eine sprachspezifische Datendatei (z.B. "pages", "projects").
 */
export async function loadData(name) {
  return fetchJson(dataPath(name));
}

export async function loadPages() {
  return loadData("pages");
}

/**
 * Lädt die globale site.json (Brand, Navigation, Footer).
 */
export async function loadSite() {
  return fetchJson(sitePath());
}

/**
 * Lädt mehrere Datendateien parallel.
 */
export async function loadMany(...names) {
  const results = await Promise.all(names.map(loadData));
  const out = {};
  names.forEach((n, i) => (out[n] = results[i]));
  return out;
}

/**
 * Holt einen Eintrag per Slug aus einer Sammlung (z.B. projects[?slug=...]).
 */
export async function findBySlug(collectionName, slug) {
  const data = await loadData(collectionName);
  if (!Array.isArray(data?.items)) return null;
  return data.items.find((it) => it.slug === slug) || null;
}

/**
 * Lädt die Layout- und Sektions-Übergangskonfiguration (data/layout.json).
 */
export async function loadLayout() {
  return fetchJson("/data/layout.json");
}

/**
 * Überschreibt den In-Memory-Cache für Live-Vorschau im CMS.
 */
export function injectLiveCache(overrides = {}) {
  for (const [url, val] of Object.entries(overrides)) {
    if (val !== undefined) {
      cache.set(url, val);
    }
  }
}

export { lang };
