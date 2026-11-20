/* <gs-member-detail> — Liest ?slug=... aus URL und zeigt die Profilseite eines Mitglieds */

import { findBySlug } from "../core/data-loader.js";
import { lang, t } from "../core/i18n.js";
import { socialIcon } from "../core/social-icons.js";
import { animateReveal, animateSkillBars } from "../core/animations.js";

class GsMemberDetail extends HTMLElement {
  async connectedCallback() {
    const slug = new URLSearchParams(location.search).get("slug");
    if (!slug) {
      this.renderNotFound();
      return;
    }

    const member = await findBySlug("members", slug);
    if (!member) {
      this.renderNotFound();
      return;
    }

    document.title = `${member.name} - Gamet Studios`;

    const initials = member.name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("");
    const photo = member.photo
      ? `<img src="${member.photo}" alt="${member.name}" />`
      : `<div class="gs-team-card__initials">${initials}</div>`;

    const links = (member.links || [])
      .map(
        (l) =>
          `<a href="${l.href}" aria-label="${l.platform}" target="_blank" rel="noopener">${socialIcon(l.platform)}</a>`
      )
      .join("");

    const since = member.since
      ? `<div class="eyebrow" data-reveal>${await t("member.since", lang === "de" ? "Mitglied seit" : "Member since")} ${member.since}</div>`
      : "";

    const bioHtml = (member.bio || [])
      .map((p) => `<p>${p}</p>`)
      .join("");

    const skillsTitle = await t("member.skills", lang === "de" ? "Kenntnisse" : "Skills");
    const skillsHtml = (member.skills || [])
      .map(
        (s) => `
          <div class="gs-skill">
            <div class="gs-skill__label">
              <span>${s.name}</span>
              <span class="gs-skill__value">${s.level}%</span>
            </div>
            <div class="gs-skill__track">
              <div class="gs-skill__fill" data-skill-fill data-level="${s.level}"></div>
            </div>
          </div>`
      )
      .join("");

    this.innerHTML = `
      <section class="gs-member-detail">
        <div class="gs-member-detail__inner">
          <div class="gs-member-detail__header" data-reveal>
            <div class="gs-member-detail__photo">${photo}</div>
            <div class="gs-member-detail__intro">
              ${since}
              <h1 class="gs-member-detail__name">${member.name}</h1>
              ${member.role ? `<p class="gs-member-detail__role">${member.role}</p>` : ""}
              ${member.quote ? `<p class="gs-member-detail__quote">„${member.quote}"</p>` : ""}
              ${links ? `<div class="gs-member-detail__links">${links}</div>` : ""}
            </div>
          </div>
          <div class="gs-member-detail__body">
            <div class="gs-member-detail__bio" data-reveal>${bioHtml}</div>
            ${
              (member.skills || []).length
                ? `<aside class="gs-member-detail__skills" data-reveal>
                    <h2 class="gs-member-detail__skills-title">${skillsTitle}</h2>
                    ${skillsHtml}
                  </aside>`
                : ""
            }
          </div>
        </div>
      </section>
    `;

    queueMicrotask(() => {
      animateReveal(this);
      animateSkillBars(this);
    });
  }

  renderNotFound() {
    const msg = lang === "de" ? "Mitglied nicht gefunden." : "Member not found.";
    const back = lang === "de" ? "Zur Übersicht" : "Back to members";
    const href = `/${lang}/${lang === "de" ? "mitglieder" : "members"}`;
    this.innerHTML = `
      <section class="gs-member-detail">
        <div class="gs-member-detail__inner" style="text-align:center;">
          <h1 class="gs-member-detail__name">404</h1>
          <p style="color:var(--fg-muted); margin-bottom: var(--space-5);">${msg}</p>
          <a class="btn btn--primary" href="${href}">${back}</a>
        </div>
      </section>
    `;
  }
}

customElements.define("gs-member-detail", GsMemberDetail);
