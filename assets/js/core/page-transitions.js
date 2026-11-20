/* Smooth Page Transitions — fade out beim Verlassen, fade in beim Ankommen */

import { getLenis } from "./smooth-scroll.js";

const FADE_OUT_MS = 360;

function isInternalNavigation(a, e) {
  if (!a) return false;
  const href = a.getAttribute("href");
  if (!href) return false;
  if (a.target && a.target !== "_self") return false;
  if (a.hasAttribute("download")) return false;
  if (a.hasAttribute("data-no-transition")) return false;
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  )
    return false;

  // Modifier-Klicks (Cmd/Ctrl/Shift/Alt + Klick) und Middle-Click in Ruhe lassen
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (e.button !== undefined && e.button !== 0) return false;

  let url;
  try {
    url = new URL(a.href, location.href);
  } catch {
    return false;
  }
  if (url.origin !== location.origin) return false;
  if (url.pathname === location.pathname && url.search === location.search)
    return false;

  return url;
}

function reveal() {
  // Doppelter rAF um sicherzustellen, dass der Start-State gerendert wurde,
  // bevor wir page-ready setzen — sonst springt der Veil sofort weg statt zu faden.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add("page-ready");
    });
  });
}

// Kino-Balken oben/unten, die beim Seitenwechsel wie eine Blende auf-/zugehen.
// Werden einmalig injiziert statt in jede HTML-Vorlage kopiert zu werden.
function createLetterbox() {
  if (document.querySelector(".gs-letterbox")) return;
  const top = document.createElement("div");
  top.className = "gs-letterbox gs-letterbox--top";
  const bottom = document.createElement("div");
  bottom.className = "gs-letterbox gs-letterbox--bottom";
  document.body.prepend(bottom);
  document.body.prepend(top);
}

export function initPageTransitions() {
  createLetterbox();

  // Page Enter
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal, { once: true });
  } else {
    reveal();
  }

  // Page Leave (Click-Interceptor mit Delegation)
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    const url = isInternalNavigation(a, e);
    if (!url) return;

    e.preventDefault();

    // Lenis pausieren, damit der Scroll während des Fades nicht zappelt
    const lenis = getLenis();
    if (lenis && typeof lenis.stop === "function") lenis.stop();

    document.documentElement.classList.remove("page-ready");
    document.documentElement.classList.add("page-leaving");

    setTimeout(() => {
      try {
        sessionStorage.setItem("gs_internal_nav", "1");
      } catch { /* noop */ }
      location.href = a.href;
    }, FADE_OUT_MS);
  });

  // BFCache: wenn der Browser eine Seite aus dem Back-Forward-Cache wiederherstellt,
  // hat sie noch die page-leaving Klasse → manuell zurücksetzen.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      document.documentElement.classList.remove("page-leaving");
      document.documentElement.classList.add("page-ready");
      const lenis = getLenis();
      if (lenis && typeof lenis.start === "function") lenis.start();
    }
  });
}
