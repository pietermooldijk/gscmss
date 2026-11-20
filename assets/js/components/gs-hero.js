/* <gs-hero data-key="home" [data-variant="sm"]> */

import { loadData } from "../core/data-loader.js";
import { animateReveal, animateTextReveal, bindMagnetic, animateHeroGlow } from "../core/animations.js";

class GsHero extends HTMLElement {
  async connectedCallback() {
    const key = this.dataset.key || "home";
    const variant = this.dataset.variant || "lg";
    const pages = await loadData("pages");
    const hero = pages?.[key]?.hero;

    if (!hero) {
      this.innerHTML = `<section class="gs-hero"><div class="gs-hero__inner"><h1 class="gs-hero__title">${key}</h1></div></section>`;
      return;
    }

    const eyebrow = hero.eyebrow
      ? `<div class="gs-hero__eyebrow" data-reveal>${hero.eyebrow}</div>`
      : "";

    const cta = (hero.ctas || [])
      .map((c, i) => {
        const cls = i === 0 ? "btn btn--primary btn--lg" : "btn btn--ghost btn--lg";
        const magnetic = i === 0 ? 'data-magnetic="0.2"' : "";
        return `<a class="${cls}" href="${c.href}" ${magnetic}>${c.label}</a>`;
      })
      .join("");

    const meta = hero.meta
      ? `<div class="gs-hero__meta" data-reveal>
          ${hero.meta
            .map(
              (m) =>
                `<div class="gs-hero__meta-item"><span class="gs-hero__meta-value">${m.value}</span><span>${m.label}</span></div>`
            )
            .join("")}
        </div>`
      : "";

    this.innerHTML = `
      <section class="gs-hero ${variant === "sm" ? "gs-hero--sm" : ""}">
        <div class="gs-hero__shape" data-hero-glow></div>
        <div class="gs-hero__inner">
          ${eyebrow}
          <h1 class="gs-hero__title" data-text-reveal>${hero.title}</h1>
          ${hero.subtitle ? `<p class="gs-hero__subtitle" data-reveal>${hero.subtitle}</p>` : ""}
          ${cta ? `<div class="gs-hero__cta-row" data-reveal>${cta}</div>` : ""}
          ${meta}
        </div>
      </section>
    `;

    queueMicrotask(() => {
      animateTextReveal(this);
      animateReveal(this);
      bindMagnetic(this);
      animateHeroGlow(this);
    });
  }
}

customElements.define("gs-hero", GsHero);
