/* Markdown-Loader für Journal-Posts
   - Liest .md-Dateien mit YAML-ähnlichem Front-Matter
   - Cached Resultate
   - Bietet loadPost(slug) und loadAllPosts() */

import { lang } from "./i18n.js";

const cache = new Map();
const inflight = new Map();

/**
 * Parst Front-Matter im Stil:
 *   ---
 *   title: Mein Titel
 *   date: 2025-04-12
 *   ---
 *   Body content...
 */
export function parseFrontMatter(text) {
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };

  const meta = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let arrayBuffer = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;

    // Array-Eintrag (- value)
    const arrItem = line.match(/^\s*-\s+(.*)$/);
    if (arrItem && currentKey && Array.isArray(meta[currentKey])) {
      let v = arrItem[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      meta[currentKey].push(v);
      continue;
    }

    // key: value oder key:
    const kv = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      let val = kv[2].trim();
      if (val === "") {
        meta[currentKey] = [];
      } else {
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        meta[currentKey] = val;
      }
    }
  }

  return { meta, body: match[2] || "" };
}

function postUrl(slug) {
  return `/data/journal/${lang}/${slug}.md`;
}

function indexUrl() {
  return `/data/journal/${lang}/index.json`;
}

async function fetchPost(slug) {
  const url = postUrl(slug);
  if (cache.has(url)) return cache.get(url);
  if (inflight.has(url)) return inflight.get(url);

  const promise = fetch(url, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`Post not found: ${slug} (${r.status})`);
      return r.text();
    })
    .then((text) => {
      const { meta, body } = parseFrontMatter(text);
      const post = { slug, ...meta, body };
      cache.set(url, post);
      inflight.delete(url);
      return post;
    })
    .catch((err) => {
      inflight.delete(url);
      console.warn(`[markdown] ${err.message}`);
      cache.set(url, null);
      return null;
    });

  inflight.set(url, promise);
  return promise;
}

/** Lädt einen einzelnen Post per Slug. */
export async function loadPost(slug) {
  if (!slug) return null;
  return fetchPost(slug);
}

/** Lädt alle Posts (über index.json) und sortiert nach Datum absteigend. */
export async function loadAllPosts() {
  const url = indexUrl();
  let slugs;
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(`Index missing: ${url}`);
    slugs = await r.json();
  } catch (err) {
    console.warn(`[markdown] ${err.message}`);
    return [];
  }
  if (!Array.isArray(slugs)) return [];

  const posts = await Promise.all(slugs.map(fetchPost));
  const valid = posts.filter((p) => p && p.title);
  valid.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return valid;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Bild-Renderer, der den optionalen Titel — ![alt](url "Quelle: ...") —
// statt als HTML title-Tooltip als sichtbare, kleine Quellenangabe unter
// dem Bild ausgibt.
let imageCreditRenderer = null;
function getImageCreditRenderer() {
  if (imageCreditRenderer || typeof window.marked === "undefined") {
    return imageCreditRenderer;
  }
  imageCreditRenderer = new window.marked.Renderer();
  imageCreditRenderer.image = (href, title, text) => {
    const img = `<img src="${escapeHtml(href)}" alt="${escapeHtml(text || "")}" loading="lazy" />`;
    if (!title) return img;
    return `${img}<span class="gs-journal-post__credit">${escapeHtml(title)}</span>`;
  };
  return imageCreditRenderer;
}

/** Markdown → HTML via marked (CDN). Fallback: Plain Paragraphs. */
export function renderMarkdown(text) {
  if (!text) return "";
  if (typeof window.marked !== "undefined") {
    return window.marked.parse(text, {
      gfm: true,
      breaks: false,
      renderer: getImageCreditRenderer(),
    });
  }
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
