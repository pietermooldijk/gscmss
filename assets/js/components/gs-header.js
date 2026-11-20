/* <gs-header> — Sticky Header mit Logo, Nav, Theme-Toggle, Sprach-Switcher, Mobile-Menu */

import { loadSite } from "../core/data-loader.js";
import { lang, otherLang, alternateUrl, t } from "../core/i18n.js";
import { getTheme, toggleTheme } from "../core/theme.js";

const ICON_SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
const ICON_MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const ICON_MENU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="17" x2="21" y2="17"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>`;

class GsHeader extends HTMLElement {
  async connectedCallback() {
    const site = await loadSite();
    if (!site) {
      this.innerHTML = `<header class="gs-header"><span class="gs-header__brand">Gamet Studios</span></header>`;
      return;
    }

    const nav = site.nav?.[lang] || [];
    const brand = site.brand || { name: "Gamet Studios" };
    const alt = alternateUrl(site.pageMap);
    const themeLabel = await t("header.toggleTheme", "Toggle theme");
    const menuLabel = await t("header.menu", "Menu");
    const closeLabel = await t("header.close", "Close");

    const navLinks = nav
      .map((item) => {
        const active = location.pathname === item.href ? `aria-current="page"` : "";
        return `<li><a class="gs-header__nav-link" href="${item.href}" ${active}>${item.label}</a></li>`;
      })
      .join("");

    const drawerLinks = nav
      .map((item) => `<a href="${item.href}">${item.label}</a>`)
      .join("");

    const currentTheme = getTheme();
    const themeIcon = currentTheme === "dark" ? ICON_SUN : ICON_MOON;

    this.innerHTML = `
      <header class="gs-header" role="banner">
        <a class="gs-header__brand" href="/${lang}/" aria-label="${brand.name}">
          ${renderBrandLogo(brand)}
        </a>

        <nav class="gs-header__nav" aria-label="${await t("header.primaryNav", "Primary")}">
          <ul class="gs-header__nav-list">${navLinks}</ul>
        </nav>

        <div class="gs-header__actions">
          <a class="gs-header__lang" href="${alt}" aria-label="${await t("header.switchLang", "Switch language")}">
            ${otherLang.toUpperCase()}
          </a>
          <button class="gs-header__toggle" data-theme-toggle aria-label="${themeLabel}" type="button">
            ${themeIcon}
          </button>
          <button class="gs-header__menu-btn" data-menu-open aria-label="${menuLabel}" aria-controls="gs-drawer" type="button">
            ${ICON_MENU}
          </button>
        </div>
      </header>

      <div id="gs-drawer" class="gs-header__drawer" data-open="false" aria-hidden="true">
        <div class="gs-header__drawer-head">
          <a class="gs-header__brand" href="/${lang}/" aria-label="${brand.name}">
            ${renderBrandLogo(brand)}
          </a>
          <button class="gs-header__toggle" data-menu-close aria-label="${closeLabel}" type="button">
            ${ICON_CLOSE}
          </button>
        </div>
        <nav class="gs-header__drawer-nav" aria-label="${await t("header.mobileNav", "Mobile navigation")}">
          ${drawerLinks}
        </nav>
        <div class="gs-header__drawer-foot">
          <a class="btn btn--secondary" href="${alt}">
            ${otherLang.toUpperCase()} — ${await t("header.switchLang", "Switch language")}
          </a>
        </div>
      </div>
    `;

    this._bind();
  }

  _bind() {
    const header = this.querySelector(".gs-header");
    const drawer = this.querySelector(".gs-header__drawer");
    const toggleBtns = this.querySelectorAll("[data-theme-toggle]");
    const openBtn = this.querySelector("[data-menu-open]");
    const closeBtn = this.querySelector("[data-menu-close]");

    // Theme-Toggle
    toggleBtns.forEach((btn) =>
      btn.addEventListener("click", () => {
        toggleTheme();
        const newTheme = getTheme();
        btn.innerHTML = newTheme === "dark" ? ICON_SUN : ICON_MOON;
      })
    );

    // Mobile-Menu
    openBtn?.addEventListener("click", () => {
      drawer.setAttribute("data-open", "true");
      drawer.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
    closeBtn?.addEventListener("click", () => {
      drawer.setAttribute("data-open", "false");
      drawer.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    });
    drawer?.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        drawer.setAttribute("data-open", "false");
        drawer.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      })
    );

    // Scroll-Class
    const onScroll = () => {
      header.setAttribute("data-scrolled", window.scrollY > 12 ? "true" : "false");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}

/** Rendert beide Logo-Varianten (CSS blendet je nach Theme das Passende ein) oder Text-Logo. */
function renderBrandLogo(brand) {
  const mode = brand?.logo?.mode || "image";
  const dark = brand?.logo?.dark || brand?.logo?.light || "";
  const light = brand?.logo?.light || brand?.logo?.dark || "";
  const heightStyle = brand?.logo?.height ? `style="--brand-logo-h: ${brand.logo.height};"` : "";

  if (mode === "text" || (!dark && !light)) {
    return `<span class="gs-header__brand-name"><span class="gs-brand-badge-dot"></span><span>${brand?.name || "Brand"}</span></span>`;
  }
  const name = brand?.name || "";
  return `
    ${dark ? `<img class="gs-brand-logo gs-brand-logo--on-dark" src="${dark}" alt="${name}" ${heightStyle} />` : ""}
    ${light ? `<img class="gs-brand-logo gs-brand-logo--on-light" src="${light}" alt="${name}" ${heightStyle} />` : ""}
  `;
}

customElements.define("gs-header", GsHeader);
