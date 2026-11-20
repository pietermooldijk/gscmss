/* <gs-footer> — Footer mit Columns, Social Links, Legal */

import { loadSite } from "../core/data-loader.js";
import { lang, t } from "../core/i18n.js";

const SOCIAL_ICONS = {
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
  twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 3H21l-6.41 7.32L22 21h-6.18l-4.83-6.31L5.27 21H2.5l6.86-7.83L2 3h6.34l4.36 5.77L18.24 3zm-1.08 16h1.7L7.92 4.97H6.1l11.06 14.03z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 3H21l-6.41 7.32L22 21h-6.18l-4.83-6.31L5.27 21H2.5l6.86-7.83L2 3h6.34l4.36 5.77L18.24 3zm-1.08 16h1.7L7.92 4.97H6.1l11.06 14.03z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.5a3 3 0 0 0-2.1-2.12C19.5 4 12 4 12 4s-7.5 0-9.4.38A3 3 0 0 0 .5 6.5C.1 8.4.1 12 .1 12s0 3.6.4 5.5a3 3 0 0 0 2.1 2.12C4.5 20 12 20 12 20s7.5 0 9.4-.38A3 3 0 0 0 23.5 17.5c.4-1.9.4-5.5.4-5.5s0-3.6-.4-5.5zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>`,
  email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
  discord: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.618-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .079.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.06.06 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.157 2.42 0 1.334-.956 2.42-2.157 2.42Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.156 2.42 0 1.334-.946 2.42-2.156 2.42Z"/></svg>`,
};

function socialIcon(name) {
  return SOCIAL_ICONS[name?.toLowerCase()] || SOCIAL_ICONS.email;
}

class GsFooter extends HTMLElement {
  async connectedCallback() {
    const site = await loadSite();
    if (!site) {
      this.innerHTML = `<footer class="gs-footer"><div class="container">© Gamet Studios</div></footer>`;
      return;
    }

    const brand = site.brand || { name: "Gamet Studios" };
    const footer = site.footer || {};
    const columns = footer.columns?.[lang] || [];
    const tagline = footer.tagline?.[lang] || "";
    const social = footer.social || [];
    const legal = footer.legal?.[lang] || [];
    // {year} wird immer durch das aktuelle Jahr ersetzt, damit das Copyright
    // nie händisch aktualisiert werden muss.
    const copyTemplate = footer.copyright?.[lang] || `© {year} ${brand.name}`;
    const copy = copyTemplate.replace("{year}", new Date().getFullYear());

    const columnsHtml = columns
      .map(
        (col) => `
        <div class="gs-footer__col">
          <h4 class="gs-footer__col-title">${col.title}</h4>
          <ul class="gs-footer__col-list">
            ${col.links
              .map(
                (l) =>
                  `<li><a href="${l.href}"${
                    l.external ? ' target="_blank" rel="noopener"' : ""
                  }>${l.label}</a></li>`
              )
              .join("")}
          </ul>
        </div>`
      )
      .join("");

    const socialHtml = social
      .map(
        (s) => `
        <a href="${s.href}" aria-label="${s.label || s.platform}" target="_blank" rel="noopener">
          ${socialIcon(s.platform)}
        </a>`
      )
      .join("");

    const legalHtml = legal
      .map((l) => `<a href="${l.href}">${l.label}</a>`)
      .join("");

    // Einwilligung fuer externe Skripte jederzeit widerrufbar (Art. 7 Abs. 3 DSGVO)
    const consentLabel = lang === "de" ? "Cookie-Einstellungen" : "Cookie settings";
    const consentHtml = `<button type="button" class="gs-footer__consent-btn" data-consent-reset>${consentLabel}</button>`;
    const rawVer = String(site?.version ?? "1.3").trim().replace(/^v/i, "");
    const cmssBadgeHtml = `<a href="/cms?nosplash=1" class="gs-footer__cmss-badge" data-no-transition>Gamet Studios CMSS${rawVer ? ` – v${rawVer}` : ""}</a>`;

    this.innerHTML = `
      <footer class="gs-footer" role="contentinfo">
        <div class="container">
          <div class="gs-footer__top">
            <div class="gs-footer__brand-col">
              <a class="gs-footer__brand" href="/${lang}/" aria-label="${brand.name}">
                ${renderBrandLogo(brand)}
              </a>
              <p class="gs-footer__tagline">${tagline}</p>
              <div class="gs-footer__social">${socialHtml}</div>
            </div>
            ${columnsHtml}
          </div>
          <div class="gs-footer__bottom">
            <div class="gs-footer__copy">${copy}</div>
            <div class="gs-footer__legal">${legalHtml}${consentHtml}${cmssBadgeHtml}</div>
          </div>
        </div>
      </footer>
    `;

    this.querySelector("[data-consent-reset]")?.addEventListener("click", () => {
      window.gsConsent?.revoke();
    });
  }
}

function renderBrandLogo(brand) {
  const mode = brand?.logo?.mode || "image";
  const dark = brand?.logo?.dark || brand?.logo?.light || "";
  const light = brand?.logo?.light || brand?.logo?.dark || "";
  const heightStyle = brand?.logo?.height ? `style="--brand-logo-h: ${brand.logo.height};"` : "";

  if (mode === "text" || (!dark && !light)) {
    return `<span class="gs-footer__brand-name"><span class="gs-brand-badge-dot"></span><span>${brand?.name || "Brand"}</span></span>`;
  }
  const name = brand?.name || "";
  return `
    ${dark ? `<img class="gs-brand-logo gs-brand-logo--on-dark" src="${dark}" alt="${name}" ${heightStyle} />` : ""}
    ${light ? `<img class="gs-brand-logo gs-brand-logo--on-light" src="${light}" alt="${name}" ${heightStyle} />` : ""}
  `;
}

customElements.define("gs-footer", GsFooter);
