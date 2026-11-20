/* <gs-custom-block data-key="..."> — Modularer Page-Builder-Baustein
   Unterstützt: text, image, split, video, buttons, quote, faq, spacer, layout */

import { loadData } from "../core/data-loader.js";
import { lang } from "../core/i18n.js";
import { animateReveal } from "../core/animations.js";

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function youtubeEmbedUrl(rawUrl) {
  const u = String(rawUrl || "").trim();
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : "";
}

function renderBlockPiece(d) {
  const type = d?.blockType || "text";

  if (type === "text") {
    const align = d.align === "center" ? "text-align:center; margin-inline:auto;" : "";
    const paras = Array.isArray(d.body)
      ? d.body
      : String(d.body || "Hier steht dein Textblock. Bearbeite ihn direkt im CMSS.").split(/\n\s*\n/).filter(Boolean);
    return `
      <div class="gs-cb__text" style="max-width:740px; ${align}" data-reveal>
        ${d.eyebrow ? `<div class="eyebrow">${escHtml(d.eyebrow)}</div>` : ""}
        ${d.title ? `<h2 class="gs-cb__title">${d.title}</h2>` : ""}
        <div class="gs-cb__body">${paras.map((p) => `<p>${p}</p>`).join("")}</div>
      </div>
    `;
  }
  if (type === "image") {
    const wideClass = d.width === "wide" ? "gs-cb__media--wide" : "";
    const src = d.image || "/assets/images/og/og-default.png";
    return `
      <figure class="gs-cb__figure ${wideClass}" data-reveal>
        <img src="${escHtml(src)}" alt="${escHtml(d.alt || d.caption || "")}" loading="lazy" />
        ${d.caption ? `<figcaption>${escHtml(d.caption)}</figcaption>` : ""}
      </figure>
    `;
  }
  if (type === "split") {
    const imgRight = d.imagePos === "right";
    const src = d.image || "/assets/images/og/og-default.png";
    const paras = Array.isArray(d.body)
      ? d.body
      : String(d.body || "Kombiniere Bild und Text flexibel nebeneinander.").split(/\n\s*\n/).filter(Boolean);
    return `
      <div class="gs-cb__split ${imgRight ? "is-reversed" : ""}" data-reveal>
        <div class="gs-cb__split-media">
          <img src="${escHtml(src)}" alt="${escHtml(d.alt || d.title || "")}" loading="lazy" />
        </div>
        <div class="gs-cb__split-text">
          ${d.eyebrow ? `<div class="eyebrow">${escHtml(d.eyebrow)}</div>` : ""}
          ${d.title ? `<h2 class="gs-cb__title">${d.title}</h2>` : ""}
          <div class="gs-cb__body">${paras.map((p) => `<p>${p}</p>`).join("")}</div>
          ${d.ctaLabel && d.ctaHref ? `<div style="margin-top:1.25rem;"><a class="btn btn--primary" href="${escHtml(d.ctaHref)}">${escHtml(d.ctaLabel)}</a></div>` : ""}
        </div>
      </div>
    `;
  }
  if (type === "video") {
    const yt = youtubeEmbedUrl(d.videoUrl);
    const videoHtml = yt
      ? `<div class="gs-cb__video-wrap"><iframe src="${escHtml(yt)}" title="${escHtml(d.title || "Video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
      : d.videoUrl
        ? `<div class="gs-cb__video-wrap"><video src="${escHtml(d.videoUrl)}" controls playsinline preload="metadata"></video></div>`
        : `<div class="gs-cb__video-placeholder">${lang === "de" ? "Video-URL im CMSS eintragen (MP4 oder YouTube)" : "Enter video URL in CMSS (MP4 or YouTube)"}</div>`;
    return `
      <div class="gs-cb__video" data-reveal>
        ${d.title ? `<h2 class="gs-cb__title" style="margin-bottom:1rem;">${d.title}</h2>` : ""}
        ${videoHtml}
        ${d.caption ? `<p class="gs-cb__caption">${escHtml(d.caption)}</p>` : ""}
      </div>
    `;
  }
  if (type === "buttons") {
    const btns = Array.isArray(d.buttons) && d.buttons.length
      ? d.buttons
      : [{ label: "Mehr erfahren", href: `/${lang}/`, style: "primary" }];
    const align = d.align === "left" ? "flex-start" : "center";
    return `
      <div class="gs-cb__buttons" style="justify-content:${align};" data-reveal>
        ${btns.map((b) => `<a class="btn ${b.style === "secondary" ? "btn--secondary" : "btn--primary"}" href="${escHtml(b.href || "#")}">${escHtml(b.label || "Button")}</a>`).join("")}
      </div>
    `;
  }
  if (type === "quote") {
    return `
      <blockquote class="gs-cb__quote" data-reveal>
        <p>“${d.quote || "Gutes Design entsteht, wenn Form und Funktion zusammenfinden."}”</p>
        ${d.author ? `<footer>— ${escHtml(d.author)}</footer>` : ""}
      </blockquote>
    `;
  }
  if (type === "faq") {
    const items = Array.isArray(d.items) && d.items.length
      ? d.items
      : [{ q: "Wie funktioniert das?", a: "Du kannst jede Frage und Antwort direkt im CMSS bearbeiten." }];
    return `
      <div class="gs-cb__faq" data-reveal>
        ${d.title ? `<h2 class="gs-cb__title" style="margin-bottom:1.25rem;">${d.title}</h2>` : ""}
        <div class="gs-cb__faq-list">
          ${items.map((it) => `
            <details class="gs-cb__faq-item">
              <summary>${escHtml(it.q || "")}</summary>
              <div class="gs-cb__faq-ans">${escHtml(it.a || "")}</div>
            </details>
          `).join("")}
        </div>
      </div>
    `;
  }
  if (type === "spacer") {
    const hMap = { sm: "1.5rem", md: "3.5rem", lg: "6rem" };
    const pad = hMap[d.height] || "3.5rem";
    return `<div class="gs-cb__spacer" style="padding-block:${pad};">${d.line ? '<hr class="gs-cb__hr" />' : ""}</div>`;
  }
  return "";
}

class GsCustomBlock extends HTMLElement {
  async connectedCallback() {
    const key = this.dataset.key || "";
    const pageKey = this.dataset.pageKey || document.documentElement.dataset.pageKey || "";
    const pages = await loadData("pages").catch(() => ({}));
    const d = (pageKey && pages?.[pageKey]?.[key]) || pages?.[key] || {};
    const type = d.blockType || "text";
    const isPreview = new URLSearchParams(location.search).get("cms_preview") === "1";

    let inner = "";
    if (type === "layout") {
      const items = Array.isArray(d.items) ? d.items : [];
      const cols = (!d.columns || d.columns === "auto")
        ? Math.max(1, Math.min(4, items.length || 1))
        : Math.max(1, Math.min(4, Number(d.columns)));
      const gapMap = { sm: "1rem", md: "2rem", lg: "3.5rem" };
      const gap = gapMap[d.gap] || "2rem";
      inner = `
        <div class="gs-cb__layout-wrap">
          ${d.eyebrow ? `<div class="eyebrow" style="margin-bottom:0.4rem;">${escHtml(d.eyebrow)}</div>` : ""}
          ${d.title ? `<h2 class="gs-cb__title" style="margin-bottom:1.5rem;">${d.title}</h2>` : ""}
          <div class="gs-cb__layout" style="--cb-cols:${cols}; --cb-gap:${gap};">
            ${items.map((item, idx) => `
              <div class="gs-cb__layout-item" data-cb-item-idx="${idx}">
                ${renderBlockPiece(item)}
              </div>
            `).join("")}
            ${isPreview ? `<div class="gs-cb__layout-dropzone">+ Baustein hier in Spalten-Layout ziehen</div>` : ""}
          </div>
        </div>
      `;
    } else {
      inner = renderBlockPiece(d);
    }

    this.innerHTML = `
      <section class="gs-custom-block gs-custom-block--${escHtml(type)}">
        <div class="container">${inner}</div>
      </section>
    `;
    animateReveal(this);
  }
}

customElements.define("gs-custom-block", GsCustomBlock);
