/* Entry-Point — lädt Core, wendet Layout/Übergänge/Hintergrundmedien aus data/layout.json an + registriert alle Web Components */

import "./core/theme.js"; // initialisiert sich selbst
import { libsReady } from "./core/consent.js";
import { initSmoothScroll } from "./core/smooth-scroll.js";
import { initPageTransitions } from "./core/page-transitions.js";
import { animateSectionCrossfades, refreshScrollTrigger } from "./core/animations.js";
import { loadLayout, loadSite, injectLiveCache, lang } from "./core/data-loader.js";

let activeLayout = null;
let activePageKey = null;
let bgObserver = null;
let bgVideoObserver = null;
const bgNodeCache = new Map();

function releaseVideoEl(el) {
  const vid = el?.tagName === "VIDEO" ? el : el?.querySelector?.("video");
  if (!vid) return;
  try {
    bgVideoObserver?.unobserve(vid);
    vid.pause();
    vid.removeAttribute("src");
    vid.load();
  } catch { /* ignore */ }
}

function observeBgVideo(vid) {
  if (!vid || vid.dataset.bgVidObserved === "1") return;
  vid.dataset.bgVidObserved = "1";
  if (typeof IntersectionObserver === "undefined") {
    vid.play?.().catch(() => {});
    return;
  }
  if (!bgVideoObserver) {
    bgVideoObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const v = entry.target;
          if (entry.isIntersecting && !document.hidden) {
            v.dataset.inView = "1";
            v.play?.().catch(() => {});
          } else {
            v.dataset.inView = "0";
            if (!v.paused) v.pause();
          }
        }
      },
      { rootMargin: "200px 0px" }
    );
    document.addEventListener("visibilitychange", () => {
      document.querySelectorAll(".gs-sec-bg video").forEach((v) => {
        if (document.hidden) {
          if (!v.paused) v.pause();
        } else if (v.dataset.inView === "1") {
          v.play?.().catch(() => {});
        }
      });
    });
  }
  bgVideoObserver.observe(vid);
}

function normalizePath(p = "") {
  return p.replace(/index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "") || "/";
}

function resolvePageKey(layout) {
  if (!layout?.pages) return null;
  const cur = normalizePath(location.pathname);
  for (const [pageKey, cfg] of Object.entries(layout.pages)) {
    if (normalizePath(cfg.pathDe) === cur || normalizePath(cfg.pathEn) === cur) {
      return pageKey;
    }
  }
  return null;
}

function hexToRgbTuple(hex = "") {
  const clean = String(hex).replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) ? null : `${r}, ${g}, ${b}`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) ? null : `${r}, ${g}, ${b}`;
  }
  return null;
}

function applyThemeOverrides(themeOverrides = {}, site = null) {
  let styleEl = document.getElementById("gs-cms-theme-overrides");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "gs-cms-theme-overrides";
    document.head.appendChild(styleEl);
  }

  document.documentElement.setAttribute(
    "data-cinema-deco",
    themeOverrides.cinemaDeco === false ? "off" : "on"
  );

  if (site?.brand?.favicon) {
    const fav = document.querySelector('link[rel="icon"]');
    if (fav) fav.href = site.brand.favicon;
  }

  const rules = [];
  const rootTokens = [];

  if (themeOverrides.fontDisplay) {
    rootTokens.push(`--font-display: ${themeOverrides.fontDisplay};`);
  }
  if (themeOverrides.fontSans) {
    rootTokens.push(`--font-sans: ${themeOverrides.fontSans};`);
  }
  if (themeOverrides.radiusStyle === "sharp") {
    rootTokens.push(`--radius-xs: 2px; --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px; --radius-xl: 10px;`);
  } else if (themeOverrides.radiusStyle === "pill") {
    rootTokens.push(`--radius-xs: 8px; --radius-sm: 14px; --radius-md: 20px; --radius-lg: 28px; --radius-xl: 40px;`);
  }
  if (rootTokens.length) {
    rules.push(`:root { ${rootTokens.join(" ")} }`);
  }

  // Dark Mode Overrides
  const darkVars = [];
  if (themeOverrides.accentDark) {
    const rgb = hexToRgbTuple(themeOverrides.accentDark);
    darkVars.push(`--accent: ${themeOverrides.accentDark};`);
    darkVars.push(`--accent-hover: ${themeOverrides.accentDark};`);
    darkVars.push(`--border-focus: ${themeOverrides.accentDark};`);
    if (rgb) darkVars.push(`--accent-rgb: ${rgb};`);
    const gradEnd = themeOverrides.accentSecondary || themeOverrides.accentGoldDark || themeOverrides.accentDark;
    darkVars.push(`--gradient-accent: linear-gradient(135deg, ${themeOverrides.accentDark} 0%, ${gradEnd} 100%);`);
  }
  if (themeOverrides.accentSecondary) {
    const rgb2 = hexToRgbTuple(themeOverrides.accentSecondary);
    if (rgb2) darkVars.push(`--accent-2: ${rgb2};`);
  }
  if (themeOverrides.accentGoldDark) {
    const goldRgb = hexToRgbTuple(themeOverrides.accentGoldDark);
    darkVars.push(`--accent-gold: ${themeOverrides.accentGoldDark};`);
    if (goldRgb) darkVars.push(`--accent-gold-rgb: ${goldRgb};`);
  }
  if (themeOverrides.bgDark) {
    darkVars.push(`--bg: ${themeOverrides.bgDark};`);
  }
  if (darkVars.length) {
    rules.push(`:root, :root[data-theme="dark"] { ${darkVars.join(" ")} }`);
  }

  // Light Mode Overrides
  const lightVars = [];
  if (themeOverrides.accentLight) {
    const rgb = hexToRgbTuple(themeOverrides.accentLight);
    lightVars.push(`--accent: ${themeOverrides.accentLight};`);
    lightVars.push(`--accent-hover: ${themeOverrides.accentLight};`);
    lightVars.push(`--border-focus: ${themeOverrides.accentLight};`);
    if (rgb) lightVars.push(`--accent-rgb: ${rgb};`);
    const gradEnd = themeOverrides.accentSecondary || themeOverrides.accentGoldDark || themeOverrides.accentLight;
    lightVars.push(`--gradient-accent: linear-gradient(135deg, ${themeOverrides.accentLight} 0%, ${gradEnd} 100%);`);
  }
  if (themeOverrides.accentGoldDark) {
    const goldRgb = hexToRgbTuple(themeOverrides.accentGoldDark);
    lightVars.push(`--accent-gold: ${themeOverrides.accentGoldDark};`);
    if (goldRgb) lightVars.push(`--accent-gold-rgb: ${goldRgb};`);
  }
  if (themeOverrides.bgLight) {
    lightVars.push(`--bg: ${themeOverrides.bgLight};`);
  }
  if (lightVars.length) {
    rules.push(`:root[data-theme="light"] { ${lightVars.join(" ")} }`);
  }

  styleEl.textContent = rules.join("\n");
}

function isVideoUrl(url = "") {
  return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url);
}

function computeEdgeMasks(edgesMode = "all-sides", featherPct = 32, customSides = null) {
  if (edgesMode === "none") {
    return { maskY: "none", maskX: "none" };
  }
  if (edgesMode === "radial-cloud") {
    return { maskY: "", maskX: "none" }; // handled by [data-bg-edges="radial-cloud"]
  }

  let top = false;
  let bottom = false;
  let left = false;
  let right = false;

  if (customSides && typeof customSides === "object") {
    top = Boolean(customSides.top);
    bottom = Boolean(customSides.bottom);
    left = Boolean(customSides.left);
    right = Boolean(customSides.right);
  } else {
    if (edgesMode === "all-sides") { top = true; bottom = true; left = true; right = true; }
    else if (edgesMode === "top-bottom") { top = true; bottom = true; }
    else if (edgesMode === "bottom") { bottom = true; }
    else if (edgesMode === "top") { top = true; }
    else if (edgesMode === "left-right") { left = true; right = true; }
  }

  const f = Math.max(8, Math.min(48, Number(featherPct) || 32));
  const f1 = (f * 0.28).toFixed(1);
  const f2 = (f * 0.62).toFixed(1);
  const b1 = (100 - f).toFixed(1);
  const b2 = (100 - f * 0.62).toFixed(1);
  const b3 = (100 - f * 0.28).toFixed(1);

  const buildGrad = (deg, startSoft, endSoft) => {
    if (!startSoft && !endSoft) return "none";
    const stops = [];
    if (startSoft) {
      stops.push(`transparent 0%`, `rgba(0,0,0,0.16) ${f1}%`, `rgba(0,0,0,0.58) ${f2}%`, `#000 ${f}%`);
    } else {
      stops.push(`#000 0%`);
    }
    if (endSoft) {
      stops.push(`#000 ${b1}%`, `rgba(0,0,0,0.58) ${b2}%`, `rgba(0,0,0,0.16) ${b3}%`, `transparent 100%`);
    } else {
      stops.push(`#000 100%`);
    }
    return `linear-gradient(${deg}, ${stops.join(", ")})`;
  };

  return {
    maskY: buildGrad("180deg", top, bottom),
    maskX: buildGrad("90deg", left, right),
  };
}

/**
 * Stellt sicher, dass jeder Abschnitt mit konfiguriertem Hintergrund-Bild oder -Video
 * sein .gs-sec-bg Element mit den gewählten weichen Rändern (data-bg-edges) besitzt.
 */
function ensureSectionBackgrounds() {
  const main = document.getElementById("main");
  if (!main || !activeLayout || !activePageKey) return;

  const sections = activeLayout.pages?.[activePageKey]?.sections || [];
  const activeIds = new Set();
  for (let secIdx = 0; secIdx < sections.length; secIdx++) {
    const sec = sections[secIdx];
    if (!sec.id) continue;
    activeIds.add(sec.id);
    const hostEl = main.querySelector(`[data-cms-sec-id="${sec.id}"]`);
    if (!hostEl) continue;

    // Warten bis die Web Component ihren eigenen Inhalt (<section> oder .gs-marquee) gerendert hat
    const hasRenderedContent = hostEl.querySelector(":scope > section, :scope > div:not(.gs-sec-bg)");
    if (!hasRenderedContent) continue;

    const existingBg = hostEl.querySelector(":scope > .gs-sec-bg");
    if (!sec.bgMedia) {
      if (existingBg) {
        releaseVideoEl(existingBg);
        existingBg.remove();
      }
      const oldCached = bgNodeCache.get(sec.id);
      if (oldCached) {
        releaseVideoEl(oldCached.el);
        bgNodeCache.delete(sec.id);
      }
      continue;
    }

    const edges = sec.bgEdges || "all-sides";
    const feather = sec.bgFeather !== undefined ? sec.bgFeather : 32;
    const sidesKey = sec.bgSides ? JSON.stringify(sec.bgSides) : "";
    const opacity = sec.bgOpacity !== undefined ? sec.bgOpacity : 0.32;
    const blur = sec.bgBlur !== undefined ? sec.bgBlur : 0;
    const fit = sec.bgFit || "cover";
    const sig = `${sec.bgMedia}|${edges}|${feather}|${sidesKey}|${opacity}|${blur}|${fit}`;

    if (existingBg && existingBg.getAttribute("data-bg-sig") === sig) {
      bgNodeCache.set(sec.id, { sig, mediaUrl: sec.bgMedia, el: existingBg });
      const existingVid = existingBg.querySelector("video");
      if (existingVid) observeBgVideo(existingVid);
      continue;
    }

    const cached = bgNodeCache.get(sec.id);
    if (cached && cached.sig === sig && cached.el) {
      if (existingBg && existingBg !== cached.el) {
        releaseVideoEl(existingBg);
        existingBg.remove();
      }
      hostEl.prepend(cached.el);
      const cachedVid = cached.el.querySelector("video");
      if (cachedVid) observeBgVideo(cachedVid);
      continue;
    }

    const { maskY, maskX } = computeEdgeMasks(edges, feather, sec.bgSides || null);

    // Wenn dasselbe Bild/Video nur andere Ränder/Opacity/Blur bekommt, DOM-Element wiederverwenden (0 Flackern!)
    let bgWrap = existingBg || (cached && cached.mediaUrl === sec.bgMedia ? cached.el : null);
    if (bgWrap && cached && cached.mediaUrl !== sec.bgMedia) {
      releaseVideoEl(bgWrap);
      bgWrap.remove();
      bgWrap = null;
    }
    if (!bgWrap) {
      bgWrap = document.createElement("div");
      bgWrap.className = "gs-sec-bg";
      if (isVideoUrl(sec.bgMedia)) {
        const vid = document.createElement("video");
        vid.className = "gs-sec-bg__media";
        vid.src = sec.bgMedia;
        vid.preload = "metadata";
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.disablePictureInPicture = true;
        vid.setAttribute("playsinline", "");
        vid.setAttribute("muted", "");
        bgWrap.appendChild(vid);
        observeBgVideo(vid);
      } else {
        const img = document.createElement("img");
        img.className = "gs-sec-bg__media";
        img.src = sec.bgMedia;
        img.alt = "";
        img.decoding = "async";
        img.loading = secIdx === 0 ? "eager" : "lazy";
        bgWrap.appendChild(img);
      }
    }

    bgWrap.setAttribute("data-bg-edges", edges);
    bgWrap.setAttribute("data-bg-sig", sig);
    bgWrap.style.setProperty("--sec-bg-opacity", String(opacity));
    bgWrap.style.setProperty("--sec-bg-fit", fit);
    bgWrap.style.setProperty("--sec-mask-y", maskY || "none");
    bgWrap.style.setProperty("--sec-mask-x", maskX || "none");
    const mediaEl = bgWrap.querySelector(".gs-sec-bg__media");
    if (mediaEl) {
      mediaEl.style.filter = Number(blur) > 0 ? `blur(${blur}px)` : "";
      if (mediaEl.tagName === "VIDEO") observeBgVideo(mediaEl);
    }

    bgNodeCache.set(sec.id, { sig, mediaUrl: sec.bgMedia, el: bgWrap });
    if (bgWrap.parentNode !== hostEl) {
      hostEl.prepend(bgWrap);
    }
  }

  // Verwaiste Cache-Einträge freigeben
  for (const [id, entry] of bgNodeCache.entries()) {
    if (!activeIds.has(id)) {
      releaseVideoEl(entry.el);
      bgNodeCache.delete(id);
    }
  }
}

async function composeMainSections(layout, pageKey) {
  const main = document.getElementById("main");
  if (!main || !pageKey || !layout?.pages?.[pageKey]) return;

  activeLayout = layout;
  activePageKey = pageKey;
  document.documentElement.dataset.pageKey = pageKey;

  const sections = (layout.pages[pageKey].sections || []).filter((s) => s.visible !== false);
  const sig = sections
    .map((s) => `${s.id || ""}|${s.component || ""}|${s.key || ""}|${s.variant || ""}|${s.limit || ""}|${s.transition || "none"}`)
    .join("::");

  // Wenn Struktur/Reihenfolge unverändert ist, bestehende Komponenten nur in-place aktualisieren
  // (kein Flackern, kein Neu-Aufbau der kompletten Seite in der CMSS-Vorschau)
  if (main.dataset.secSig === sig && main.children.length === sections.length) {
    await Promise.all(
      Array.from(main.children).map((el, idx) => {
        const s = sections[idx];
        if (s?.maxWidthPct && Number(s.maxWidthPct) < 100) {
          el.style.maxWidth = `${Number(s.maxWidthPct)}%`;
          el.style.marginInline = "auto";
        } else {
          el.style.maxWidth = "";
          el.style.marginInline = "";
        }
        if (el.tagName !== "GS-SOCIAL-FEED" && typeof el.connectedCallback === "function") {
          return Promise.resolve(el.connectedCallback());
        }
        return Promise.resolve();
      })
    );
    ensureSectionBackgrounds();
    mountPreviewBuilderTools();
    return;
  }

  main.dataset.secSig = sig;
  const html = sections
    .map((sec) => {
      const tag = sec.component || "gs-section";
      const attrs = [];
      if (sec.id) attrs.push(`data-cms-sec-id="${sec.id}"`);
      if (sec.key) attrs.push(`data-key="${sec.key}"`);
      if (sec.variant) attrs.push(`data-variant="${sec.variant}"`);
      if (sec.limit !== undefined && sec.limit !== "" && Number(sec.limit) > 0) {
        attrs.push(`data-limit="${sec.limit}"`);
      }
      if (sec.maxWidthPct && Number(sec.maxWidthPct) < 100) {
        attrs.push(`style="max-width:${Number(sec.maxWidthPct)}%; margin-inline:auto;"`);
      }
      if (sec.transition && sec.transition !== "none") {
        attrs.push(`data-transition="${sec.transition}"`);
      } else {
        attrs.push(`data-transition="none"`);
      }
      return `<${tag} ${attrs.join(" ")}></${tag}>`;
    })
    .join("\n    ");

  main.innerHTML = html;
  ensureSectionBackgrounds();
  mountPreviewBuilderTools();

  if (!bgObserver) {
    let rafPending = false;
    bgObserver = new MutationObserver(() => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        ensureSectionBackgrounds();
        mountPreviewBuilderTools();
      });
    });
    bgObserver.observe(main, { childList: true });
  }
}

async function mountCmsFab() {
  const isPreview = new URLSearchParams(location.search).get("cms_preview") === "1";
  if (isPreview) {
    document.documentElement.setAttribute("data-cms-preview", "true");
  }
}

let draggedPreviewSecId = null;

let previewObserverBound = false;
function mountPreviewBuilderTools() {
  if (new URLSearchParams(location.search).get("cms_preview") !== "1") return;
  const main = document.getElementById("main");
  if (!main) return;

  // Beobachte async nachladende Web Components (<gs-hero>, <gs-text-block>, <gs-custom-block>, ...)
  if (!previewObserverBound) {
    previewObserverBound = true;
    let t = null;
    const obs = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => mountPreviewBuilderTools(), 40);
    });
    obs.observe(main, { childList: true, subtree: true });
  }

  main.querySelectorAll(":scope > [data-cms-sec-id]").forEach((secEl) => {
    const secId = secEl.getAttribute("data-cms-sec-id");
    secEl.setAttribute("draggable", "false");

    if (!secEl.querySelector(":scope > .gs-pb-toolbar")) {
      const bar = document.createElement("div");
      bar.className = "gs-pb-toolbar";
      bar.innerHTML = `
        <span class="gs-pb-btn gs-pb-btn--drag" draggable="true" title="Abschnitt in der Vorschau verschieben">⠿ Ziehen</span>
        <button type="button" class="gs-pb-btn" data-pb-act="up" title="Nach oben">↑</button>
        <button type="button" class="gs-pb-btn" data-pb-act="down" title="Nach unten">↓</button>
        <button type="button" class="gs-pb-btn" data-pb-act="dup" title="Duplizieren">⧉</button>
        <button type="button" class="gs-pb-btn gs-pb-btn--danger" data-pb-act="del" title="Löschen">✕</button>
      `;
      const dragHandle = bar.querySelector(".gs-pb-btn--drag");
      dragHandle?.addEventListener("dragstart", (e) => {
        draggedPreviewSecId = secId;
        e.dataTransfer?.setData("text/plain", secId || "");
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });
      bar.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-pb-act]");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        window.parent?.postMessage(
          { type: "GS_PREVIEW_SECTION_ACTION", secId, act: btn.getAttribute("data-pb-act") },
          "*"
        );
      });
      secEl.prepend(bar);
    }

    if (secEl.dataset.pbBound !== "1") {
      secEl.dataset.pbBound = "1";

      const getDropPos = (e) => {
        const rect = secEl.getBoundingClientRect();
        if (secEl.tagName === "GS-CUSTOM-BLOCK") {
          const edge = Math.min(180, rect.width * 0.24);
          if (e.clientX < rect.left + edge) return "left";
          if (e.clientX > rect.right - edge) return "right";
        }
        return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
      };

      const clearDropClasses = () => {
        secEl.classList.remove("gs-pb-drop-before", "gs-pb-drop-after", "gs-pb-drop-left", "gs-pb-drop-right");
      };

      secEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        const pos = getDropPos(e);
        clearDropClasses();
        secEl.classList.add(`gs-pb-drop-${pos}`);
      });

      secEl.addEventListener("dragleave", () => {
        clearDropClasses();
      });

      secEl.addEventListener("drop", (e) => {
        e.preventDefault();
        const pos = getDropPos(e);
        clearDropClasses();

        const rawBlock = e.dataTransfer?.getData("application/x-gs-block");
        if (rawBlock) {
          try {
            const block = JSON.parse(rawBlock);
            window.parent?.postMessage(
              { type: "GS_PREVIEW_INSERT_BLOCK", targetSecId: secId, pos, block },
              "*"
            );
          } catch { /* ignore */ }
          draggedPreviewSecId = null;
          return;
        }

        if (draggedPreviewSecId && draggedPreviewSecId !== secId) {
          window.parent?.postMessage(
            { type: "GS_PREVIEW_REORDER_SECTION", sourceSecId: draggedPreviewSecId, targetSecId: secId, pos },
            "*"
          );
        }
        draggedPreviewSecId = null;
      });
    }

    const dropzone = secEl.querySelector(".gs-cb__layout-dropzone");
    if (dropzone && dropzone.dataset.pbBound !== "1") {
      dropzone.dataset.pbBound = "1";
      dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("is-over");
      });
      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("is-over");
      });
      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("is-over");
        const rawBlock = e.dataTransfer?.getData("application/x-gs-block");
        if (!rawBlock) return;
        try {
          const block = JSON.parse(rawBlock);
          window.parent?.postMessage(
            { type: "GS_PREVIEW_INSERT_INTO_LAYOUT", targetSecId: secId, block },
            "*"
          );
        } catch { /* ignore */ }
      });
    }

    // --- WYSIWYG Inline-Editing (wie Word, auf ALLEN Elementen der Seite) ---
    const editableSelectors = [
      [".gs-hero__eyebrow", "eyebrow", false],
      [".gs-hero__title", "title", false],
      [".gs-hero__subtitle", "subtitle", false],
      [".gs-hero__cta-row a", "ctaLabel", false],
      [".gs-hero__meta-value", "metaValue", false],
      [".gs-hero__meta-item > span:not(.gs-hero__meta-value)", "metaLabel", false],
      [".gs-text-block .eyebrow", "eyebrow", false],
      [".gs-text-block__title", "title", false],
      [".gs-text-block__body", "body", true],
      [".gs-cta .eyebrow", "eyebrow", false],
      [".gs-cta__title", "title", false],
      [".gs-cta__subtitle", "subtitle", false],
      [".gs-cta__row a", "ctaLabel", false],
      [".gs-features__head .eyebrow", "eyebrow", false],
      [".gs-features__title", "title", false],
      [".gs-features__intro", "intro", false],
      [".gs-manifesto-row__title", "itemTitle", false],
      [".gs-manifesto-row__body", "itemBody", false],
      [".gs-projects__head .eyebrow", "eyebrow", false],
      [".gs-projects__title", "title", false],
      [".gs-projects__head a.btn", "headCtaLabel", false],
      [".gs-team__head .eyebrow", "eyebrow", false],
      [".gs-team__head .gs-features__title", "title", false],
      [".gs-team__head .gs-features__intro", "intro", false],
      [".gs-team__head a.btn", "headCtaLabel", false],
      [".gs-custom-block .eyebrow", "eyebrow", false],
      [".gs-cb__title", "title", false],
      [".gs-cb__body", "body", true],
      [".gs-cb__split-text a.btn", "headCtaLabel", false],
      [".gs-cb__buttons a", "cbBtnLabel", false],
      [".gs-cb__quote p", "quote", false],
      [".gs-cb__figure figcaption", "caption", false],
      [".gs-cb__caption", "caption", false],
    ];
    editableSelectors.forEach(([sel, field, isBodyArray]) => {
      secEl.querySelectorAll(sel).forEach((el) => {
        if (el.dataset.wysiwygBound === "1") return;
        el.dataset.wysiwygBound = "1";
        el.title = "Klicken zum direkten Bearbeiten";
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          secEl.setAttribute("draggable", "false");
          document.querySelectorAll(".gs-wysiwyg-editing").forEach((other) => {
            if (other !== el) other.classList.remove("gs-wysiwyg-editing");
          });
          el.contentEditable = "true";
          el.classList.add("gs-wysiwyg-editing");
          el.focus();
          showWysiwygToolbar(el, secId);
          window.parent?.postMessage({ type: "GS_PREVIEW_SECTION_CLICK", secId }, "*");
        });
        let emitTimer = null;
        const sendEdit = () => {
          const itemEl = el.closest("[data-cb-item-idx]");
          const itemIdx = itemEl ? Number(itemEl.getAttribute("data-cb-item-idx")) : null;
          const rowEl = el.closest(".gs-manifesto-row");
          const rowIdx = rowEl ? Array.from(secEl.querySelectorAll(".gs-manifesto-row")).indexOf(rowEl) : null;
          const metaEl = el.closest(".gs-hero__meta-item");
          const metaIdx = metaEl ? Array.from(secEl.querySelectorAll(".gs-hero__meta-item")).indexOf(metaEl) : null;
          const btnWrap = el.closest(".gs-hero__cta-row, .gs-cta__row, .gs-cb__buttons");
          const btnIdx = btnWrap ? Array.from(btnWrap.querySelectorAll("a")).indexOf(el) : null;
          const val = isBodyArray
            ? Array.from(el.querySelectorAll("p")).map((p) => p.innerHTML.trim()).filter(Boolean)
            : el.innerHTML.trim();
          const finalVal = (isBodyArray && (!val || !val.length))
            ? [el.innerHTML.trim()].filter(Boolean)
            : val;
          window.parent?.postMessage({
            type: "GS_PREVIEW_INLINE_EDIT",
            secId,
            itemIdx,
            rowIdx,
            metaIdx,
            btnIdx,
            field,
            value: finalVal,
          }, "*");
        };
        el.addEventListener("input", () => {
          clearTimeout(emitTimer);
          emitTimer = setTimeout(sendEdit, 180);
        });
        el.addEventListener("blur", () => {
          clearTimeout(emitTimer);
          sendEdit();
        });
      });
    });

    // --- Drag-to-Resize Handles für ALLE Bausteine, Sektionen & Spalten-Elemente ---
    const attachResizeHandle = (targetEl, itemIdx = null) => {
      if (!targetEl || targetEl.querySelector(":scope > .gs-pb-resize-handle")) return;
      const handle = document.createElement("div");
      handle.className = "gs-pb-resize-handle";
      handle.title = "Ziehen zum Vergrößern / Verkleinern";
      handle.textContent = "↘";
      targetEl.appendChild(handle);

      handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const parentRect = (targetEl.parentElement || secEl).getBoundingClientRect();
        const startWidth = targetEl.getBoundingClientRect().width;
        let currentPct = Math.round((startWidth / Math.max(1, parentRect.width)) * 100);

        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const nextW = Math.max(200, startWidth + dx);
          currentPct = Math.max(30, Math.min(100, Math.round((nextW / Math.max(1, parentRect.width)) * 100)));
          const sized = targetEl.querySelector(":scope > .container > .gs-cb__sized") || targetEl;
          sized.style.maxWidth = `${currentPct}%`;
          sized.style.marginInline = "auto";
        };
        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          const colSpan = itemIdx !== null ? (currentPct > 65 ? 2 : 1) : null;
          window.parent?.postMessage({
            type: "GS_PREVIEW_RESIZE_BLOCK",
            secId,
            itemIdx,
            maxWidthPct: currentPct,
            colSpan,
          }, "*");
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    };

    const layoutItems = secEl.querySelectorAll(".gs-cb__layout-item");
    if (layoutItems.length) {
      layoutItems.forEach((it) => attachResizeHandle(it, Number(it.getAttribute("data-cb-item-idx"))));
    } else {
      attachResizeHandle(secEl, null);
    }
  });
}

function showWysiwygToolbar(targetEl, secId) {
  let bar = document.getElementById("gs-wysiwyg-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "gs-wysiwyg-bar";
    bar.innerHTML = `
      <button type="button" data-wcmd="bold" title="Fett"><b>B</b></button>
      <button type="button" data-wcmd="italic" title="Kursiv"><i>I</i></button>
      <button type="button" data-wcmd="underline" title="Unterstrichen"><u>U</u></button>
      <button type="button" data-wcmd="createLink" title="Link einfügen">Link</button>
      <button type="button" data-wcmd="removeFormat" title="Formatierung entfernen">Clear</button>
    `;
    bar.addEventListener("mousedown", (e) => e.preventDefault());
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-wcmd]");
      if (!btn) return;
      const cmd = btn.getAttribute("data-wcmd");
      if (cmd === "createLink") {
        const href = prompt("Link-URL eingeben (z. B. https://... oder /de/kontakt):");
        if (href) document.execCommand("createLink", false, href);
      } else {
        document.execCommand(cmd, false, null);
      }
      document.querySelector(".gs-wysiwyg-editing")?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    document.body.appendChild(bar);
  }
  const rect = targetEl.getBoundingClientRect();
  bar.style.display = "inline-flex";
  bar.style.top = `${Math.max(8, rect.top - 42)}px`;
  bar.style.left = `${Math.max(8, Math.min(window.innerWidth - 260, rect.left))}px`;
}

function bindPreviewMessaging(initialPageKey) {
  const isPreview = new URLSearchParams(location.search).get("cms_preview") === "1";
  if (!isPreview) return;

  // Klick auf eine Sektion in der Vorschau wählt sie im CMS-Editor aus
  document.addEventListener("click", (e) => {
    const secEl = e.target.closest("[data-cms-sec-id]");
    if (secEl) {
      window.parent?.postMessage(
        {
          type: "GS_PREVIEW_SECTION_CLICK",
          secId: secEl.getAttribute("data-cms-sec-id"),
        },
        "*"
      );
    }
  });

  // Live-Updates aus dem CMS-Editor empfangen und ohne Seiten-Reload rendern
  window.addEventListener("message", async (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "GS_CMS_LIVE_UPDATE") {
      const prevScrollY = window.scrollY;
      const overrides = {};
      if (msg.site) overrides["/data/site.json"] = msg.site;
      if (msg.layout) overrides["/data/layout.json"] = msg.layout;
      if (msg.pagesDe) overrides["/data/de/pages.json"] = msg.pagesDe;
      if (msg.pagesEn) overrides["/data/en/pages.json"] = msg.pagesEn;
      if (msg.projectsDe) overrides["/data/de/projects.json"] = msg.projectsDe;
      if (msg.projectsEn) overrides["/data/en/projects.json"] = msg.projectsEn;
      if (msg.membersDe) overrides["/data/de/members.json"] = msg.membersDe;
      if (msg.membersEn) overrides["/data/en/members.json"] = msg.membersEn;

      injectLiveCache(overrides);

      if (msg.layout?.themeOverrides) {
        applyThemeOverrides(msg.layout.themeOverrides, msg.site);
      }

      const isDetailPage = Boolean(document.querySelector("gs-journal-post, gs-member-detail, gs-project-detail"));
      const key = isDetailPage ? null : (msg.pageKey || initialPageKey || resolvePageKey(msg.layout));
      if (msg.layout && key) {
        await composeMainSections(msg.layout, key);
      }

      // Header, Footer & ggf. offene Detail-Ansichten (Mitglied/Projekt) live neu rendern
      document.querySelector("gs-header")?.connectedCallback?.();
      document.querySelector("gs-footer")?.connectedCallback?.();
      document.querySelector("gs-member-detail")?.connectedCallback?.();
      document.querySelector("gs-project-detail")?.connectedCallback?.();

      ensureSectionBackgrounds();
      mountPreviewBuilderTools();
      applyPageEnhancements(key, true);
      window.scrollTo(0, prevScrollY);
      requestAnimationFrame(() => window.scrollTo(0, prevScrollY));
    }

    if (msg.type === "GS_CMS_JOURNAL_PREVIEW" && msg.post) {
      const postEl = document.querySelector("gs-journal-post");
      if (postEl && typeof postEl.renderPostData === "function") {
        postEl.renderPostData(msg.post, false);
      }
    }

    if (msg.type === "GS_CMS_SCROLL_TO" && msg.secId) {
      document.querySelectorAll("main > [data-cms-sec-id].gs-pb-selected").forEach((s) => s.classList.remove("gs-pb-selected"));
      const el = document.querySelector(`[data-cms-sec-id="${msg.secId}"]`);
      if (el) {
        el.classList.add("gs-pb-selected");
        const r = el.getBoundingClientRect();
        if (r.bottom < 40 || r.top > window.innerHeight - 40) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  });
}

async function applyPageEnhancements(pageKey, isLivePreview = false) {
  const site = await loadSite().catch(() => null);
  const isPreview = isLivePreview || new URLSearchParams(location.search).get("cms_preview") === "1";

  // 1) Redirect-Manager (nicht in der CMSS-Vorschau auslösen)
  if (!isPreview && Array.isArray(site?.redirects)) {
    const here = location.pathname.replace(/\/+$/, "") || "/";
    const hit = site.redirects.find((r) => (r?.from || "").trim().replace(/\/+$/, "") === here && (r?.to || "").trim());
    if (hit) {
      location.replace(hit.to.trim());
      return true;
    }
  }

  // 2) Wartungsmodus & Remote-Killswitch (immer frisch über public_status ohne JSON-Cache)
  if (!isPreview) {
    try {
      const st = await fetch("/api/cms.php?action=public_status", { cache: "no-store" }).then((r) => r.json());
      if (st?.hubDisabled) {
        const msg = st.hubReason || "Diese Webseite wurde vorübergehend deaktiviert.";
        document.documentElement.classList.add("page-ready");
        document.body.innerHTML = `
          <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:2rem; background:#0a0a0b; color:#f5f5f6; font-family:system-ui,sans-serif; text-align:center;">
            <div style="max-width:460px;">
              <div style="font-size:2rem; margin-bottom:0.75rem;">⛔</div>
              <h1 style="font-size:1.5rem; margin:0 0 0.75rem;">Instanz deaktiviert</h1>
              <p style="color:#a1a1aa; line-height:1.6; margin:0;">${msg}</p>
            </div>
          </div>
        `;
        return true;
      }
      const maint = st?.maintenance?.enabled ? st.maintenance : (site?.maintenance?.enabled ? site.maintenance : null);
      if (maint?.enabled) {
        if (!st?.isTeam) {
          const msg = maint.message || "Wir führen gerade Wartungsarbeiten durch und sind gleich wieder für dich da.";
          const title = site?.brand?.name || "Gamet Studios";
          document.documentElement.classList.add("page-ready");
          document.body.innerHTML = `
            <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:2rem; background:#0a0a0b; color:#f5f5f6; font-family:system-ui,sans-serif; text-align:center;">
              <div style="max-width:460px;">
                <div style="font-size:2rem; margin-bottom:0.75rem;">🛠️</div>
                <h1 style="font-size:1.5rem; margin:0 0 0.75rem;">${title} — Wartungsmodus</h1>
                <p style="color:#a1a1aa; line-height:1.6; margin:0 0 1.5rem;">${msg}</p>
                <a href="/cms" style="font-size:0.8rem; color:#71717a; text-decoration:none;">Team-Login</a>
              </div>
            </div>
          `;
          return true;
        } else if (!document.getElementById("gs-maint-team-pill")) {
          const pill = document.createElement("div");
          pill.id = "gs-maint-team-pill";
          pill.style.cssText = "position:fixed;bottom:14px;left:14px;z-index:9998;padding:0.35rem 0.75rem;border-radius:999px;background:rgba(245,158,11,0.18);border:1px solid rgba(245,158,11,0.45);color:#fbbf24;font-size:12px;font-family:system-ui,sans-serif;backdrop-filter:blur(8px);";
          pill.textContent = "🛠️ Wartungsmodus aktiv (Team-Ansicht)";
          document.body?.appendChild(pill);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3) SEO & OpenGraph + editierbare Rechtstexte pro Seite
  if (pageKey) {
    try {
      const pages = await loadData("pages");
      const pd = pages?.[pageKey];
      if (pd?.seo) {
        if (pd.seo.title) {
          document.title = pd.seo.title;
          document.querySelector('meta[property="og:title"]')?.setAttribute("content", pd.seo.title);
          document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", pd.seo.title);
        }
        if (pd.seo.description) {
          document.querySelector('meta[name="description"]')?.setAttribute("content", pd.seo.description);
          document.querySelector('meta[property="og:description"]')?.setAttribute("content", pd.seo.description);
          document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", pd.seo.description);
        }
        if (pd.seo.ogImage) {
          document.querySelector('meta[property="og:image"]')?.setAttribute("content", pd.seo.ogImage);
          document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", pd.seo.ogImage);
        }
      }
      if (pd?.legalHtml && pd.legalHtml.trim() !== "") {
        const bodyEl = document.querySelector(".gs-text-block__body");
        if (bodyEl) {
          bodyEl.innerHTML = pd.legalHtml;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

function mountStartupSplash() {
  if (new URLSearchParams(location.search).get("cms_preview") === "1") return null;
  let isInternalNav = false;
  try {
    isInternalNav = sessionStorage.getItem("gs_internal_nav") === "1";
    sessionStorage.removeItem("gs_internal_nav");
  } catch { /* noop */ }
  const navType = performance.getEntriesByType?.("navigation")?.[0]?.type || "";
  if (isInternalNav && navType !== "reload") return null;
  if (document.getElementById("gs-startup-splash")) return document.getElementById("gs-startup-splash");
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const el = document.createElement("div");
  el.id = "gs-startup-splash";
  el.className = "gs-splash";
  el.style.cssText = `position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.85rem;background:${isLight ? "#fafaf9" : "#060607"};opacity:1;transition:opacity 0.62s cubic-bezier(0.22,1,0.36,1),transform 0.62s cubic-bezier(0.22,1,0.36,1);pointer-events:none;`;
  el.dataset.shownAt = String(performance.now());
  el.innerHTML = `
    <img class="gs-splash__logo" style="height:3.1rem;width:auto;" src="${isLight ? "/assets/icons/gs_logo_small_black.png" : "/assets/icons/gs_logo_small_white.png"}" alt="Gamet Studios" />
    <div class="gs-splash__bar" style="width:140px;height:3px;border-radius:999px;background:${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.14)"};overflow:hidden;">
      <div class="gs-splash__fill" style="width:0%;height:100%;border-radius:999px;background:${isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)"};transition:width 0.82s cubic-bezier(0.22,1,0.36,1);"></div>
    </div>
  `;
  document.body?.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const fill = el.querySelector(".gs-splash__fill");
      if (fill) fill.style.width = "100%";
    });
  });
  return el;
}

function hideStartupSplash(el) {
  if (!el || el.dataset.hiding === "1") return;
  el.dataset.hiding = "1";
  const elapsed = performance.now() - Number(el.dataset.shownAt || 0);
  const waitMs = Math.max(0, 860 - elapsed);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "scale(0.985)";
    el.classList.add("is-hiding");
    setTimeout(() => el.remove(), 660);
  }, waitMs);
}

async function start() {
  const splashEl = mountStartupSplash();
  const splashFallbackTimer = setTimeout(() => hideStartupSplash(splashEl), 1500);
  const layout = await loadLayout();
  const pageKey = resolvePageKey(layout);
  if (await applyPageEnhancements(pageKey, false)) {
    clearTimeout(splashFallbackTimer);
    hideStartupSplash(splashEl);
    return;
  }
  if (layout?.themeOverrides) {
    applyThemeOverrides(layout.themeOverrides);
  }
  if (layout && pageKey) {
    composeMainSections(layout, pageKey);
  }

  mountCmsFab();
  bindPreviewMessaging(pageKey);

  // Zuerst klaeren, ob die externen Libs geladen werden duerfen. Erst danach
  // die Komponenten registrieren — sonst rendern manche noch ohne GSAP und
  // andere schon mit, was zu versetzten Elementen fuehrt.
  await libsReady();
  await import("./components/index.js");

  clearTimeout(splashFallbackTimer);
  requestAnimationFrame(() => hideStartupSplash(splashEl));

  initPageTransitions();
  initSmoothScroll();
  // Nach dem ersten Render Layout neu vermessen
  requestAnimationFrame(() => {
    setTimeout(() => {
      ensureSectionBackgrounds();
      animateSectionCrossfades();
      refreshScrollTrigger();
    }, 100);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
