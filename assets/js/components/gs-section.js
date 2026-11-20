/* <gs-section> — Generischer Wrapper mit optionalem Padding und Container */

class GsSection extends HTMLElement {
  connectedCallback() {
    const variant = this.dataset.variant || "default";
    const inner = this.innerHTML;
    const wrap = this.dataset.container !== "false";
    this.innerHTML = `
      <section class="gs-section gs-section--${variant}">
        ${wrap ? `<div class="container">${inner}</div>` : inner}
      </section>
    `;
  }
}

customElements.define("gs-section", GsSection);
