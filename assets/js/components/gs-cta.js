/* <gs-cta data-key="join"> */

import { loadData } from "../core/data-loader.js";
import { animateReveal, bindMagnetic } from "../core/animations.js";

class GsCta extends HTMLElement {
  async connectedCallback() {
    const key = this.dataset.key || "join";
    const pages = await loadData("pages");
    const block = pages?.[key]?.cta || pages?.cta?.[key];

    if (!block) {
      this.innerHTML = "";
      return;
    }

    const buttons = (block.ctas || [])
      .map((c, i) => {
        const cls =
          i === 0 ? "btn btn--primary btn--lg" : "btn btn--ghost btn--lg";
        const magnetic = i === 0 ? 'data-magnetic="0.2"' : "";
        return `<a class="${cls}" href="${c.href}" ${magnetic}>${c.label}</a>`;
      })
      .join("");

    this.innerHTML = `
      <section class="gs-cta">
        <div class="container">
          <div class="gs-cta__inner">
            ${block.eyebrow ? `<div class="eyebrow" data-reveal>${block.eyebrow}</div>` : ""}
            <h2 class="gs-cta__title" data-reveal>${block.title}</h2>
            ${block.subtitle ? `<p class="gs-cta__subtitle" data-reveal>${block.subtitle}</p>` : ""}
            ${buttons ? `<div class="gs-cta__row" data-reveal>${buttons}</div>` : ""}
          </div>
        </div>
      </section>
    `;

    queueMicrotask(() => {
      animateReveal(this);
      bindMagnetic(this);
    });
  }
}

customElements.define("gs-cta", GsCta);
