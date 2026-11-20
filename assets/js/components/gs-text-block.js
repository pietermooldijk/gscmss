/* <gs-text-block data-key="manifest" [data-variant="wide"]> */

import { loadData } from "../core/data-loader.js";
import { animateReveal } from "../core/animations.js";

class GsTextBlock extends HTMLElement {
  async connectedCallback() {
    const key = this.dataset.key;
    const variant = this.dataset.variant || "";
    const pages = await loadData("pages");
    const block = pages?.[key]?.text || pages?.text?.[key];

    if (!block) {
      this.innerHTML = "";
      return;
    }

    const bodyHtml = renderBody(block.body);

    this.innerHTML = `
      <section class="gs-text-block ${variant === "wide" ? "gs-text-block--wide" : ""}">
        <div class="gs-text-block__inner">
          ${block.eyebrow ? `<div class="eyebrow" data-reveal>${block.eyebrow}</div>` : ""}
          ${block.title ? `<h2 class="gs-text-block__title" data-reveal>${block.title}</h2>` : ""}
          <div class="gs-text-block__body" data-reveal>${bodyHtml}</div>
        </div>
      </section>
    `;

    queueMicrotask(() => animateReveal(this));
  }
}

function renderBody(body) {
  if (!body) return "";
  if (Array.isArray(body)) {
    return body.map((p) => `<p>${p}</p>`).join("");
  }
  if (typeof body === "string") {
    if (typeof window.marked !== "undefined") {
      return window.marked.parse(body);
    }
    return body
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }
  return "";
}

customElements.define("gs-text-block", GsTextBlock);
