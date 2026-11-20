/* <gs-project-detail> — Liest ?slug=... aus URL und zeigt Projekt-Detailseite */

import { findBySlug, loadData } from "../core/data-loader.js";
import { lang, t } from "../core/i18n.js";
import { animateReveal, animateParallax } from "../core/animations.js";

class GsProjectDetail extends HTMLElement {
  async connectedCallback() {
    const slug = new URLSearchParams(location.search).get("slug");
    if (!slug) {
      this.renderNotFound();
      return;
    }

    const project = await findBySlug("projects", slug);
    if (!project) {
      this.renderNotFound();
      return;
    }

    document.title = `${project.title} - Gamet Studios`;

    const tags = (project.tags || [])
      .map((tag) => `<span class="pill">${tag}</span>`)
      .join("");

    const media = project.image
      ? `<img src="${project.image}" alt="${project.title}" />`
      : `<div class="gs-project-card__media-fallback" style="position:relative">${project.title?.[0] || "·"}</div>`;

    const bodyHtml = renderBody(project.body);

    const sidebar = [];
    if (project.status)
      sidebar.push([await t("project.status", lang === "de" ? "Status" : "Status"), project.status]);
    if (project.year) sidebar.push([await t("project.year", lang === "de" ? "Jahr" : "Year"), project.year]);
    if (project.role) sidebar.push([await t("project.role", lang === "de" ? "Rolle" : "Role"), project.role]);
    if (project.website)
      sidebar.push([
        await t("project.website", "Website"),
        `<a href="${project.website}" target="_blank" rel="noopener">${project.website.replace(/^https?:\/\//, "")} ↗</a>`,
      ]);

    const sidebarHtml = sidebar
      .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
      .join("");

    this.innerHTML = `
      <section class="gs-project-detail">
        <div class="gs-project-detail__inner">
          <div class="gs-project-detail__meta" data-reveal>${tags}</div>
          <h1 class="gs-project-detail__title" data-reveal>${project.title}</h1>
          ${project.tagline ? `<p class="gs-project-detail__lead" data-reveal>${project.tagline}</p>` : ""}
          <div class="gs-project-detail__hero" data-reveal data-parallax="0.15">${media}</div>
          <div class="gs-project-detail__body">
            <div data-reveal>${bodyHtml}</div>
            ${
              sidebarHtml
                ? `<aside class="gs-project-detail__sidebar" data-reveal><dl>${sidebarHtml}</dl></aside>`
                : ""
            }
          </div>
        </div>
      </section>
    `;

    queueMicrotask(() => {
      animateReveal(this);
      animateParallax(this);
    });
  }

  renderNotFound() {
    const msg = lang === "de" ? "Projekt nicht gefunden." : "Project not found.";
    const back = lang === "de" ? "Zur Übersicht" : "Back to projects";
    const href = `/${lang}/${lang === "de" ? "projekte" : "projects"}`;
    this.innerHTML = `
      <section class="gs-project-detail">
        <div class="gs-project-detail__inner" style="text-align:center;">
          <h1 class="gs-project-detail__title">404</h1>
          <p class="gs-project-detail__lead">${msg}</p>
          <a class="btn btn--primary" href="${href}">${back}</a>
        </div>
      </section>
    `;
  }
}

function renderBody(body) {
  if (!body) return "";
  if (Array.isArray(body)) {
    return body.map((p) => `<p>${p}</p>`).join("");
  }
  if (typeof body === "string") {
    // Falls Markdown via "marked" verfügbar ist, sonst Plain
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

customElements.define("gs-project-detail", GsProjectDetail);
