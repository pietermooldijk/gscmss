/* <gs-cookie-banner> — Einwilligung fuer externe Skripte (cdn.jsdelivr.net)

   Modaler Dialog: blockiert die Seite, bis eine Entscheidung vorliegt. Vorher
   wird nichts von cdn.jsdelivr.net geladen (Lenis/Smooth-Scroll, GSAP, marked).
   Erscheint nur, solange keine Entscheidung gespeichert ist. */

import { getConsent, grant, deny } from "../core/consent.js";
import { lang } from "../core/i18n.js";

/* Impressum und Datenschutzerklaerung muessen auch ohne Entscheidung frei
   erreichbar bleiben — ein blockierender Dialog darf sie nicht verdecken.
   Auf diesen Seiten erscheint er deshalb nicht; von cdn.jsdelivr.net wird
   dort ohnehin nichts geladen, solange keine Einwilligung vorliegt.
   Zusaetzlich verlinkt der Dialog selbst auf beide Seiten. */
const LEGAL_PAGES = [
  "/de/impressum",
  "/de/datenschutz",
  "/en/imprint",
  "/en/privacy",
];

function isLegalPage() {
  const path = location.pathname.replace(/\.html$/, "").replace(/\/$/, "");
  return LEGAL_PAGES.includes(path);
}

const COPY = {
  de: {
    title: "Externe Dienste & Inhalte",
    body:
      "Für Smooth-Scrolling, Animationen, Textformatierung (jsDelivr / cdn.jsdelivr.net) sowie den " +
      "Social-Media-Live-Feed (YouTube, Instagram, X & Co. inkl. Vorschaubildern und Video-Player) " +
      "werden Verbindungen zu externen Servern aufgebaut und deine IP-Adresse übertragen. " +
      "Ohne deine Einwilligung wird zu keinem dieser Dienste eine Verbindung hergestellt — die Webseite funktioniert auch ohne.",
    accept: "Akzeptieren",
    decline: "Ablehnen",
    imprint: "Impressum",
    imprintHref: "/de/impressum",
    privacy: "Datenschutz",
    privacyHref: "/de/datenschutz",
  },
  en: {
    title: "External services & content",
    body:
      "For smooth scrolling, animations, text formatting (jsDelivr / cdn.jsdelivr.net), and our " +
      "Social Media Live Feed (YouTube, Instagram, X & Co., including preview thumbnails and video playback), " +
      "connections to external servers are established and your IP address is transmitted. " +
      "Without your consent, no connection is made to any of these services — the site also works without them.",
    accept: "Accept",
    decline: "Decline",
    imprint: "Imprint",
    imprintHref: "/en/imprint",
    privacy: "Privacy",
    privacyHref: "/en/privacy",
  },
};

const FOCUSABLE = "a[href], button";

class GsCookieBanner extends HTMLElement {
  connectedCallback() {
    if (getConsent() !== null || isLegalPage()) {
      this.innerHTML = "";
      return;
    }
    this.render();
  }

  render() {
    const c = COPY[lang] || COPY.en;

    this.innerHTML = `
      <div class="gs-consent-backdrop">
        <div class="gs-consent" role="dialog" aria-modal="true"
             aria-labelledby="gs-consent-title" aria-describedby="gs-consent-body">
          <h2 class="gs-consent__title" id="gs-consent-title">${c.title}</h2>
          <p class="gs-consent__body" id="gs-consent-body">${c.body}</p>
          <div class="gs-consent__actions">
            <button type="button" class="btn btn--ghost" data-consent="deny">${c.decline}</button>
            <button type="button" class="btn btn--primary" data-consent="grant">${c.accept}</button>
          </div>
          <p class="gs-consent__links">
            <a href="${c.privacyHref}">${c.privacy}</a>
            <a href="${c.imprintHref}">${c.imprint}</a>
          </p>
        </div>
      </div>
    `;

    // grant() laedt die Seite neu, damit die Libs vor dem Rendern da sind
    this.querySelector('[data-consent="grant"]').addEventListener("click", grant);
    this.querySelector('[data-consent="deny"]').addEventListener("click", () => {
      deny();
      this.close();
    });

    this.lockScroll();
    this.trapFocus();

    requestAnimationFrame(() => {
      this.querySelector(".gs-consent-backdrop")?.classList.add("is-visible");
      this.querySelector('[data-consent="grant"]')?.focus();
    });
  }

  /* Seite hinter dem Dialog nicht scrollbar */
  lockScroll() {
    this.prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }

  unlockScroll() {
    document.documentElement.style.overflow = this.prevOverflow || "";
  }

  /* Fokus bleibt im Dialog. Escape schliesst NICHT — es braucht eine
     Entscheidung; die Links zu Datenschutz/Impressum sind Teil des Dialogs. */
  trapFocus() {
    this.onKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...this.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !this.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", this.onKeydown, true);
  }

  close() {
    document.removeEventListener("keydown", this.onKeydown, true);
    this.unlockScroll();
    const box = this.querySelector(".gs-consent-backdrop");
    if (!box) return;
    box.classList.remove("is-visible");
    box.addEventListener("transitionend", () => (this.innerHTML = ""), { once: true });
    // Falls Transitions deaktiviert sind (reduced motion), trotzdem aufraeumen.
    setTimeout(() => (this.innerHTML = ""), 500);
  }
}

customElements.define("gs-cookie-banner", GsCookieBanner);
