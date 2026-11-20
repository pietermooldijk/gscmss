/* <gs-marquee data-key="brands"> — laufende Marken/Text-Schleife */

import { loadData } from "../core/data-loader.js";

class GsMarquee extends HTMLElement {
  async connectedCallback() {
    const key = this.dataset.key || "brands";
    const pages = await loadData("pages");
    const block = pages?.[key]?.marquee || pages?.marquee?.[key];

    if (!block) {
      this.innerHTML = "";
      return;
    }

    const items = (block.items || [])
      .map(
        (it) =>
          `<span class="gs-marquee__item"><span class="gs-marquee__item-dot"></span>${it}</span>`
      )
      .join("");

    // Doppelt für nahtlose Schleife
    this.innerHTML = `
      <div class="gs-marquee" aria-hidden="true">
        <div class="gs-marquee__track">
          ${items}${items}
        </div>
      </div>
    `;
  }
}

customElements.define("gs-marquee", GsMarquee);
