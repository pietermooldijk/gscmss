/* <gs-projects-grid [data-limit="6"]> — Karten-Grid mit Projekten/Tochtermarken */

import { loadData } from "../core/data-loader.js";
import { lang, t } from "../core/i18n.js";
import { animateReveal, animateParallax } from "../core/animations.js";

class GsProjectsGrid extends HTMLElement {
  async connectedCallback() {
    const limit = parseInt(this.dataset.limit || "0", 10);
    const [pages, projectsData] = await Promise.all([
      loadData("pages"),
      loadData("projects"),
    ]);
    const isPreview = new URLSearchParams(location.search).get("cms_preview") === "1";
    const today = new Date().toISOString().slice(0, 10);
    const visibleItems = (projectsData?.items || []).filter((p) => {
      if (isPreview) return true;
      if (p?.status === "draft") return false;
      if (p?.publishAt && String(p.publishAt).slice(0, 10) > today) return false;
      return true;
    });
    const items = visibleItems.slice(0, limit || undefined);
    const head = pages?.projectsHead || {};
    const moreLabel = await t(
      "project.more",
      lang === "de" ? "Mehr erfahren" : "Learn more"
    );

    const detailDir = lang === "de" ? "projekte" : "projects";
    const detailTemplate =
      lang === "de" ? "projekt" : "project";

    const cardsHtml = items
      .map((p) => {
        const href = `/${lang}/${detailDir}/${detailTemplate}?slug=${p.slug}`;
        const media = p.image
          ? `<div class="gs-parallax-layer" data-parallax="0.08"><img src="${p.image}" alt="${p.title}" loading="lazy" /></div>`
          : `<div class="gs-project-card__media-fallback">${p.title?.[0] || "·"}</div>`;
        const tags = (p.tags || [])
          .map((tag) => `<span class="pill pill--outline">${tag}</span>`)
          .join("");
        return `
        <a class="gs-project-card" href="${href}" data-reveal>
          <span class="gs-corner gs-corner--tl" aria-hidden="true"></span>
          <span class="gs-corner gs-corner--tr" aria-hidden="true"></span>
          <span class="gs-corner gs-corner--bl" aria-hidden="true"></span>
          <span class="gs-corner gs-corner--br" aria-hidden="true"></span>
          <div class="gs-project-card__media">${media}</div>
          <div class="gs-project-card__body">
            <div class="gs-project-card__meta">${tags}</div>
            <h3 class="gs-project-card__title">${p.title}</h3>
            <p class="gs-project-card__desc">${p.tagline || ""}</p>
            <span class="gs-project-card__more">
              ${moreLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
          </div>
        </a>`;
      })
      .join("");

    this.innerHTML = `
      <section class="gs-projects">
        <div class="container">
          <div class="gs-projects__head">
            <div>
              ${head.eyebrow ? `<div class="eyebrow" data-reveal>${head.eyebrow}</div>` : ""}
              ${head.title ? `<h2 class="gs-projects__title" data-reveal>${head.title}</h2>` : ""}
            </div>
            ${
              head.ctaLabel && head.ctaHref
                ? `<a class="btn btn--ghost" href="${head.ctaHref}" data-reveal>${head.ctaLabel}</a>`
                : ""
            }
          </div>
          <div class="gs-projects__grid">${cardsHtml}</div>
        </div>
      </section>
    `;

    queueMicrotask(() => {
      animateReveal(this);
      animateParallax(this);
    });
  }
}

customElements.define("gs-projects-grid", GsProjectsGrid);
