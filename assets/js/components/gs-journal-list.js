/* <gs-journal-list [data-limit="0"] [data-eyebrow="..."] [data-title="..."]>
   Liest Posts aus data/journal/<lang>/*.md
   Optional: data-eyebrow und data-title rendern einen Inline-Header
   (z.B. "Mehr aus dem Journal" auf der Detail-Seite). Sonst kein Header — die
   Seite hat normalerweise eine Hero-Section darüber. */

import { loadAllPosts } from "../core/markdown.js";
import { lang, formatDate } from "../core/i18n.js";
import { animateReveal, animateParallax } from "../core/animations.js";

class GsJournalList extends HTMLElement {
  async connectedCallback() {
    const limit = parseInt(this.dataset.limit || "0", 10);
    const eyebrow = this.dataset.eyebrow || "";
    const title = this.dataset.title || "";

    const isPreview = new URLSearchParams(location.search).get("cms_preview") === "1";
    const today = new Date().toISOString().slice(0, 10);
    const posts = (await loadAllPosts()).filter((p) => {
      if (isPreview) return true;
      if (p?.status === "draft") return false;
      const pub = p?.publishAt || p?.date;
      if (pub && String(pub).slice(0, 10) > today) return false;
      return true;
    });
    const items = posts.slice(0, limit || undefined);

    const dir = "journal";

    const headHtml =
      eyebrow || title
        ? `<div class="gs-journal__head">
            ${eyebrow ? `<div class="eyebrow" data-reveal>${eyebrow}</div>` : ""}
            ${title ? `<h2 class="gs-features__title" data-reveal>${title}</h2>` : ""}
          </div>`
        : "";

    let bodyHtml;
    if (items.length === 0) {
      const msg =
        lang === "de"
          ? "Noch keine Einträge im Journal."
          : "No journal entries yet.";
      bodyHtml = `<p class="gs-journal__empty" data-reveal>${msg}</p>`;
    } else {
      bodyHtml = `<div class="gs-journal__list">${items
        .map((p) => {
          const href = `/${lang}/${dir}/${p.slug}`;
          const media = p.cover
            ? `<div class="gs-parallax-layer" data-parallax="0.08"><img src="${p.cover}" alt="${p.title}" loading="lazy" /></div>`
            : `<div class="gs-project-card__media-fallback">${p.title?.[0] || "·"}</div>`;
          return `
            <a class="gs-journal-card" href="${href}" data-reveal>
              <div class="gs-journal-card__media">${media}</div>
              <div class="gs-journal-card__body">
                <div class="gs-journal-card__meta">
                  <span>${formatDate(p.date)}</span>
                  ${p.category ? `<span>·</span><span>${p.category}</span>` : ""}
                </div>
                <h3 class="gs-journal-card__title">${p.title}</h3>
                <p class="gs-journal-card__excerpt">${p.excerpt || ""}</p>
              </div>
            </a>`;
        })
        .join("")}</div>`;
    }

    this.innerHTML = `
      <section class="gs-journal">
        <div class="container">
          ${headHtml}
          ${bodyHtml}
        </div>
      </section>
    `;

    queueMicrotask(() => {
      animateReveal(this);
      animateParallax(this);
    });
  }
}

customElements.define("gs-journal-list", GsJournalList);
