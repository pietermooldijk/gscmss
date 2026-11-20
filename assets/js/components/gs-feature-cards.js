/* <gs-feature-cards data-key="capabilities"> */

import { loadData } from "../core/data-loader.js";
import { animateReveal } from "../core/animations.js";

class GsFeatureCards extends HTMLElement {
  async connectedCallback() {
    const key = this.dataset.key || "capabilities";
    const pages = await loadData("pages");
    const block = pages?.[key]?.features || pages?.features?.[key];

    if (!block) {
      this.innerHTML = "";
      return;
    }

    const cards = (block.items || [])
      .map(
        (it, idx) => `
        <div class="gs-manifesto-row" data-reveal>
          <div class="gs-manifesto-row__meta">
            <span class="gs-manifesto-row__num">0${idx + 1}</span>
            <span class="gs-manifesto-row__icon">${it.icon || "✦"}</span>
          </div>
          <h3 class="gs-manifesto-row__title">${it.title}</h3>
          <p class="gs-manifesto-row__body">${it.body}</p>
        </div>`
      )
      .join("");

    this.innerHTML = `
      <section class="gs-features">
        <div class="container">
          <div class="gs-features__head">
            ${block.eyebrow ? `<div class="eyebrow" data-reveal>${block.eyebrow}</div>` : ""}
            ${block.title ? `<h2 class="gs-features__title" data-reveal>${block.title}</h2>` : ""}
            ${block.intro ? `<p class="gs-features__intro" data-reveal>${block.intro}</p>` : ""}
          </div>
          <div class="gs-features__grid">${cards}</div>
        </div>
      </section>
    `;

    queueMicrotask(() => {
      animateReveal(this);
    });
  }
}

customElements.define("gs-feature-cards", GsFeatureCards);
