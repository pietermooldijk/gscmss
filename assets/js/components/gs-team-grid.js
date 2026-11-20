/* <gs-team-grid [data-limit="0"]> */

import { loadData } from "../core/data-loader.js";
import { animateReveal } from "../core/animations.js";
import { socialIcon } from "../core/social-icons.js";
import { lang, t } from "../core/i18n.js";

class GsTeamGrid extends HTMLElement {
  async connectedCallback() {
    const limit = parseInt(this.dataset.limit || "0", 10);
    const [pages, membersData] = await Promise.all([
      loadData("pages"),
      loadData("members"),
    ]);
    const items = (membersData?.items || []).slice(0, limit || undefined);
    const head = pages?.membersHead || {};
    const moreLabel = await t(
      "member.more",
      lang === "de" ? "Mehr erfahren" : "Learn more"
    );

    const detailDir = lang === "de" ? "mitglieder" : "members";
    const detailTemplate = lang === "de" ? "mitglied" : "member";

    const cards = items
      .map((m) => {
        const initials = m.name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("");
        // Bewusst OHNE Parallax-Ebene: bei Gesichtern zählt ein exakter,
        // unverzerrter Zuschnitt mehr als der Scroll-Effekt.
        const photo = m.photo
          ? `<img src="${m.photo}" alt="${m.name}" loading="lazy" />`
          : `<div class="gs-team-card__initials">${initials}</div>`;
        const links = (m.links || [])
          .map(
            (l) =>
              `<a href="${l.href}" aria-label="${l.platform}" target="_blank" rel="noopener">${socialIcon(l.platform)}</a>`
          )
          .join("");
        const href = `/${lang}/${detailDir}/${detailTemplate}?slug=${m.slug}`;
        // Karte ist bewusst kein <a>: die Social-Links darin sind selbst <a>-Tags,
        // und verschachtelte Anchors sind ungültiges HTML (der Browser-Parser
        // bricht das äußere <a> sonst in mehrere Fragmente auf). Stattdessen
        // deckt ein unsichtbarer "Stretched Link" die ganze Karte ab.
        return `
        <article class="gs-team-card" data-reveal>
          <a class="gs-team-card__stretched-link" href="${href}" aria-label="${m.name}"></a>
          <div class="gs-team-card__photo">${photo}</div>
          <div class="gs-team-card__body">
            <h3 class="gs-team-card__name">${m.name}</h3>
            <p class="gs-team-card__role">${m.role}</p>
            <span class="gs-team-card__more">
              ${moreLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
            ${links ? `<div class="gs-team-card__links">${links}</div>` : ""}
          </div>
        </article>`;
      })
      .join("");

    this.innerHTML = `
      <section class="gs-team">
        <div class="container">
          ${
            head.title || head.eyebrow
              ? `<div class="gs-team__head">
                  <div>
                    ${head.eyebrow ? `<div class="eyebrow" data-reveal>${head.eyebrow}</div>` : ""}
                    ${head.title ? `<h2 class="gs-features__title" data-reveal>${head.title}</h2>` : ""}
                    ${head.intro ? `<p class="gs-features__intro" data-reveal>${head.intro}</p>` : ""}
                  </div>
                  ${
                    head.ctaLabel && head.ctaHref
                      ? `<a class="btn btn--ghost" href="${head.ctaHref}" data-reveal>${head.ctaLabel}</a>`
                      : ""
                  }
                </div>`
              : ""
          }
          <div class="gs-team__grid">${cards}</div>
        </div>
      </section>
    `;

    queueMicrotask(() => animateReveal(this));
  }
}

customElements.define("gs-team-grid", GsTeamGrid);
