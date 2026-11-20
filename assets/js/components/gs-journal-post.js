/* <gs-journal-post> — liest ?slug=... aus URL und lädt data/journal/<lang>/<slug>.md */

import { loadPost, renderMarkdown } from "../core/markdown.js";
import { lang, formatDate } from "../core/i18n.js";
import { animateReveal, animateParallax } from "../core/animations.js";

class GsJournalPost extends HTMLElement {
  async connectedCallback() {
    // Slug: in dieser Reihenfolge
    //   1) data-slug Attribut  (statisch generierte Seiten)
    //   2) ?slug=... Query     (post-template Fallback)
    //   3) Letztes Pfadsegment der URL  (z.B. /de/journal/warum-kollektiv)
    const slug =
      this.dataset.slug ||
      new URLSearchParams(location.search).get("slug") ||
      slugFromPath();

    if (new URLSearchParams(location.search).get("cms_preview") === "1") {
      window.parent?.postMessage({ type: "GS_PREVIEW_JOURNAL_READY" }, "*");
    }

    if (!slug) {
      this.renderNotFound();
      return;
    }
    const post = await loadPost(slug);
    if (!post || !post.title) {
      if (new URLSearchParams(location.search).get("cms_preview") === "1") {
        return;
      }
      this.renderNotFound(slug);
      return;
    }
    this.renderPostData(post, true);
  }

  renderPostData(post, animate = false) {
    if (!post) return;
    document.title = `${post.title || "Artikel"} - Gamet Studios Journal`;

    const bodyHtml = renderMarkdown(post.body || "");
    const revealAttr = animate ? "data-reveal" : "";
    const hero = post.cover
      ? `<div class="gs-journal-post__hero-wrap" ${revealAttr}>
          <div class="gs-journal-post__hero" ${animate ? 'data-parallax="0.12"' : ""}>
            <img src="${post.cover}" alt="${post.title || ""}" />
          </div>
          ${post.cover_credit ? `<p class="gs-journal-post__credit">${post.cover_credit}</p>` : ""}
        </div>`
      : "";

    this.innerHTML = `
      <article class="gs-journal-post">
        <div class="gs-journal-post__inner">
          <div class="gs-journal-post__meta" ${revealAttr}>
            <span>${formatDate(post.date || new Date().toISOString().slice(0, 10))}</span>
            ${post.category ? `<span>·</span><span>${post.category}</span>` : ""}
            ${post.author ? `<span>·</span><span>${post.author}</span>` : ""}
          </div>
          <h1 class="gs-journal-post__title" ${revealAttr}>${post.title || ""}</h1>
          ${hero}
          <div class="gs-journal-post__body" ${revealAttr}>${bodyHtml}</div>
        </div>
      </article>
    `;

    if (animate) {
      queueMicrotask(() => {
        animateReveal(this);
        animateParallax(this);
      });
    }
  }

  renderNotFound(slug) {
    // Journal gibt es bewusst nur auf Deutsch. Falls hier ein Slug bekannt
    // ist (nur kein englischer Post dazu existiert), auf den deutschen
    // Artikel verweisen statt ein generisches "nicht gefunden" zu zeigen —
    // deckt z.B. direkte ?slug=...-Aufrufe von post-template.html ab. Die
    // vorgenerierten /en/journal/<slug>-Seiten (via tools/build.py) leiten
    // ohnehin schon per Meta-Refresh weiter, das hier ist nur der
    // clientseitige Fallback für alles, was diese Seiten nicht abdecken.
    if (lang === "en" && slug) {
      const deHref = `/de/journal/${slug}`;
      this.innerHTML = `
        <section class="gs-journal-post">
          <div class="gs-journal-post__inner" style="text-align:center;">
            <div class="eyebrow" style="justify-content:center;">German only</div>
            <h1 class="gs-journal-post__title">This article is only available in German.</h1>
            <p>We keep the Journal German-only, to stay true to our voice.</p>
            <a class="btn btn--primary" href="${deHref}">Read it in German →</a>
          </div>
        </section>
      `;
      return;
    }

    const msg = lang === "de" ? "Beitrag nicht gefunden." : "Post not found.";
    const back = lang === "de" ? "Zum Journal" : "Back to journal";
    const href = `/${lang}/journal`;
    this.innerHTML = `
      <section class="gs-journal-post">
        <div class="gs-journal-post__inner" style="text-align:center;">
          <h1 class="gs-journal-post__title">404</h1>
          <p>${msg}</p>
          <a class="btn btn--primary" href="${href}">${back}</a>
        </div>
      </section>
    `;
  }
}

function slugFromPath() {
  const m = location.pathname.match(/\/journal\/([^/]+?)(?:\.html)?$/);
  if (!m) return null;
  // post-template ist KEIN Slug — wenn das matched, ignorieren
  if (m[1] === "post-template") return null;
  return m[1];
}

customElements.define("gs-journal-post", GsJournalPost);
