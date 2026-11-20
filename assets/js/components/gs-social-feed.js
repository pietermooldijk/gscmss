/* <gs-social-feed data-key="home">
   Zieht über /api/social-feed.php automatisch den jeweils aktuellsten Beitrag
   (YouTube-Video, Instagram-Post, X-Post, TikTok-Clip, Bluesky-Post, Mastodon/RSS)
   der hinterlegten Account-/Kanal-URLs und stellt ihn im Gamet-Studios-Design dar. */

import { loadData } from "../core/data-loader.js";
import { lang, formatDate } from "../core/i18n.js";
import { animateReveal } from "../core/animations.js";
import { getConsent, grant } from "../core/consent.js";

const PLATFORM_META = {
  youtube: {
    label: "YouTube",
    badgeDe: "Aktuellstes Video",
    badgeEn: "Latest Video",
    ctaDe: "Auf YouTube ansehen",
    ctaEn: "Watch on YouTube",
    color: "#ff0033",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.5a3 3 0 0 0-2.1-2.12C19.5 4 12 4 12 4s-7.5 0-9.4.38A3 3 0 0 0 .5 6.5C.1 8.4.1 12 .1 12s0 3.6.4 5.5a3 3 0 0 0 2.1 2.12C4.5 20 12 20 12 20s7.5 0 9.4-.38A3 3 0 0 0 23.5 17.5c.4-1.9.4-5.5.4-5.5s0-3.6-.4-5.5zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>`,
  },
  instagram: {
    label: "Instagram",
    badgeDe: "Aktuellster Post",
    badgeEn: "Latest Post",
    ctaDe: "Auf Instagram öffnen",
    ctaEn: "Open on Instagram",
    color: "#e1306c",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
  },
  x: {
    label: "X",
    badgeDe: "Aktuellster Post",
    badgeEn: "Latest Post",
    ctaDe: "Auf X ansehen",
    ctaEn: "View on X",
    color: "#a1a1aa",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 3H21l-6.41 7.32L22 21h-6.18l-4.83-6.31L5.27 21H2.5l6.86-7.83L2 3h6.34l4.36 5.77L18.24 3zm-1.08 16h1.7L7.92 4.97H6.1l11.06 14.03z"/></svg>`,
  },
  tiktok: {
    label: "TikTok",
    badgeDe: "Aktuellster Clip",
    badgeEn: "Latest Clip",
    ctaDe: "Auf TikTok ansehen",
    ctaEn: "Watch on TikTok",
    color: "#00f2fe",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>`,
  },
  bluesky: {
    label: "Bluesky",
    badgeDe: "Aktuellster Post",
    badgeEn: "Latest Post",
    ctaDe: "Auf Bluesky ansehen",
    ctaEn: "View on Bluesky",
    color: "#0285ff",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>`,
  },
  mastodon: {
    label: "Mastodon",
    badgeDe: "Aktuellster Tröt",
    badgeEn: "Latest Post",
    ctaDe: "Im Fediverse öffnen",
    ctaEn: "Open on Mastodon",
    color: "#6364ff",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.327 8.566c0-4.339-2.843-5.61-2.843-5.61-1.433-.658-3.894-.935-6.451-.956h-.063c-2.557.021-5.016.298-6.45.956 0 0-2.843 1.272-2.843 5.61 0 .993-.019 2.181.012 3.441.103 4.243.778 8.425 4.701 9.463 1.809.479 3.362.579 4.612.51 2.268-.126 3.541-.809 3.541-.809l-.075-1.646s-1.621.511-3.441.449c-1.804-.062-3.707-.194-3.999-2.409a4.523 4.523 0 0 1-.04-.621s1.77.432 4.014.535c1.372.063 2.658-.08 3.965-.236 2.506-.299 4.688-1.843 4.962-3.254.434-2.223.398-5.424.398-5.424zm-3.353 5.59h-2.081V9.057c0-1.075-.452-1.62-1.357-1.62-1 0-1.501.647-1.501 1.927v2.791h-2.069V9.364c0-1.28-.501-1.927-1.502-1.927-.905 0-1.357.546-1.357 1.62v5.099H6.026V8.903c0-1.074.273-1.927.823-2.558.566-.631 1.307-.955 2.228-.955 1.065 0 1.872.409 2.405 1.228l.518.869.519-.869c.533-.819 1.34-1.228 2.405-1.228.92 0 1.662.324 2.228.955.55.631.822 1.484.822 2.558v5.253z"/></svg>`,
  },
  rss: {
    label: "Feed",
    badgeDe: "Aktuellster Beitrag",
    badgeEn: "Latest Entry",
    ctaDe: "Beitrag öffnen",
    ctaEn: "Open entry",
    color: "#f59e0b",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>`,
  },
};

const DEFAULT_SOCIAL_FEED = {
  eyebrowDe: "Live aus dem Kollektiv",
  eyebrowEn: "Live from the collective",
  titleDe: "Neuste <span class=\"accent\">Inhalte</span> & Releases",
  titleEn: "Latest <span class=\"accent\">content</span> & releases",
  introDe: "Automatisch synchronisiert mit unseren Kanälen – immer das aktuellste Video und der neuste Beitrag.",
  introEn: "Automatically synced with our channels – always showing the latest video and newest post.",
  items: [
    {
      platform: "youtube",
      url: "https://www.youtube.com/@gametstudios",
      label: "",
    },
    {
      platform: "instagram",
      url: "https://www.instagram.com/gametstudios",
      label: "",
    },
  ],
};

function escHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

class GsSocialFeed extends HTMLElement {
  async connectedCallback() {
    const key = this.dataset.key || "home";
    const pages = await loadData("pages");
    const cfg = pages?.[key]?.socialFeed || pages?.socialFeed || {
      eyebrow: lang === "en" ? DEFAULT_SOCIAL_FEED.eyebrowEn : DEFAULT_SOCIAL_FEED.eyebrowDe,
      title: lang === "en" ? DEFAULT_SOCIAL_FEED.titleEn : DEFAULT_SOCIAL_FEED.titleDe,
      intro: lang === "en" ? DEFAULT_SOCIAL_FEED.introEn : DEFAULT_SOCIAL_FEED.introDe,
      items: DEFAULT_SOCIAL_FEED.items,
    };

    const items = Array.isArray(cfg.items) && cfg.items.length > 0 ? cfg.items : DEFAULT_SOCIAL_FEED.items;
    const isSingle = items.length === 1;
    const hasConsent = getConsent() === "granted";

    // Datenschutz-Sperre (DSGVO): Wenn keine Einwilligung vorliegt (oder abgelehnt wurde),
    // darf KEINERLEI Verbindung zu YouTube, Instagram, X & Co. aufgebaut werden!
    if (!hasConsent) {
      this.innerHTML = `
        <section class="gs-section gs-social-feed">
          <div class="container">
            <div class="gs-section__head" data-reveal>
              ${cfg.eyebrow ? `<div class="eyebrow">${cfg.eyebrow}</div>` : ""}
              ${cfg.title ? `<h2 class="gs-section__title">${cfg.title}</h2>` : ""}
              ${cfg.intro ? `<p class="gs-section__intro">${cfg.intro}</p>` : ""}
            </div>
            <div class="gs-social-feed__grid ${isSingle ? "gs-social-feed__grid--single" : "gs-social-feed__grid--multi"}">
              ${items
                .map((it) => {
                  const pMeta = PLATFORM_META[(it.platform || "youtube").toLowerCase()] || PLATFORM_META.rss;
                  return `
                  <article class="gs-social-card gs-social-card--blocked" data-reveal>
                    <div class="gs-social-card__inner is-text-only">
                      <div class="gs-social-card__content">
                        <div class="gs-social-card__top">
                          <span class="gs-social-card__plat-badge" style="--plat-color:${pMeta.color};">
                            ${pMeta.icon}
                            <span>${escHtml(pMeta.label)}</span>
                          </span>
                          <span class="gs-social-card__inline-badge" style="margin:0;">
                            <span>${lang === "en" ? "Privacy protected" : "Datenschutz aktiv"}</span>
                          </span>
                        </div>
                        <h3 class="gs-social-card__title">
                          ${lang === "en" ? `${escHtml(pMeta.label)} content blocked` : `${escHtml(pMeta.label)}-Inhalte ausgeblendet`}
                        </h3>
                        <p class="gs-social-card__text" style="-webkit-line-clamp:unset;">
                          ${
                            lang === "en"
                              ? `You declined external services. No connection is made to ${escHtml(pMeta.label)} or external servers. You can enable external content anytime.`
                              : `Du hast externe Dienste abgelehnt. Es wird keine Verbindung zu ${escHtml(pMeta.label)} oder externen Servern hergestellt. Du kannst externe Inhalte jederzeit aktivieren.`
                          }
                        </p>
                        <div class="gs-social-card__footer" style="flex-wrap:wrap; gap:0.75rem;">
                          <button type="button" class="btn btn--primary btn--sm" data-social-grant>
                            ${lang === "en" ? "Accept & load feed" : "Zustimmen & Feed laden"}
                          </button>
                          <a href="${escHtml(it.url || "#")}" target="_blank" rel="noopener" class="gs-social-card__cta">
                            <span>${lang === "en" ? `Open ${escHtml(pMeta.label)} directly` : `${escHtml(pMeta.label)} direkt öffnen`}</span>
                            <span aria-hidden="true">↗</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>`;
                })
                .join("")}
            </div>
          </div>
        </section>
      `;

      this.querySelectorAll("[data-social-grant]").forEach((btn) => {
        btn.addEventListener("click", () => grant());
      });
      queueMicrotask(() => animateReveal(this));
      return;
    }

    this.innerHTML = `
      <section class="gs-section gs-social-feed">
        <div class="container">
          <div class="gs-section__head" data-reveal>
            ${cfg.eyebrow ? `<div class="eyebrow">${cfg.eyebrow}</div>` : ""}
            ${cfg.title ? `<h2 class="gs-section__title">${cfg.title}</h2>` : ""}
            ${cfg.intro ? `<p class="gs-section__intro">${cfg.intro}</p>` : ""}
          </div>
          <div class="gs-social-feed__grid ${isSingle ? "gs-social-feed__grid--single" : "gs-social-feed__grid--multi"}">
            ${items
              .map(
                (it, idx) => `
              <article class="gs-social-card is-loading" data-feed-idx="${idx}" data-reveal>
                <div class="gs-social-card__skeleton">
                  <span class="gs-social-card__pulse"></span>
                  <span>Lade aktuellsten Inhalt von ${escHtml((PLATFORM_META[it.platform] || PLATFORM_META.rss).label)}…</span>
                </div>
              </article>
            `
              )
              .join("")}
          </div>
        </div>
      </section>
    `;

    queueMicrotask(() => animateReveal(this));

    // Alle konfigurierten Kanäle parallel abrufen
    items.forEach((item, idx) => {
      this.loadChannelCard(item, idx, isSingle);
    });
  }

  async loadChannelCard(item, idx, isSingle) {
    const cardEl = this.querySelector(`[data-feed-idx="${idx}"]`);
    if (!cardEl) return;

    const platform = (item.platform || "youtube").toLowerCase();
    const meta = PLATFORM_META[platform] || PLATFORM_META.rss;

    try {
      const params = new URLSearchParams({
        platform,
        url: item.url || "",
      });
      const res = await fetch(`/api/social-feed.php?${params.toString()}`);
      const data = await res.json();

      if (!data || !data.ok) {
        throw new Error(data?.error || "Inhalt konnte nicht geladen werden");
      }

      const pMeta = PLATFORM_META[data.platform] || meta;
      const badgeText = item.label || (lang === "en" ? pMeta.badgeEn : pMeta.badgeDe);
      const ctaText = lang === "en" ? pMeta.ctaEn : pMeta.ctaDe;
      const dateFormatted = data.publishedAt ? formatDate(data.publishedAt.slice(0, 10)) : "";
      const hasVideoEmbed = data.platform === "youtube" && data.videoId;
      const mediaUrl = data.mediaUrl || item.fallbackImage || "";
      const bodyText = data.text || item.fallbackText || "";

      cardEl.classList.remove("is-loading");
      cardEl.setAttribute("data-platform", data.platform || platform);

      cardEl.innerHTML = `
        <div class="gs-social-card__inner ${isSingle ? "is-spotlight" : ""} ${!mediaUrl ? "is-text-only" : ""}">
          ${
            mediaUrl
              ? `
            <div class="gs-social-card__media" data-video-id="${escHtml(data.videoId || "")}">
              <img
                src="${escHtml(mediaUrl)}"
                alt="${escHtml(data.title || pMeta.label)}"
                loading="lazy"
                onerror="if(this.src.includes('maxresdefault.jpg')){this.src=this.src.replace('maxresdefault.jpg','hqdefault.jpg');}"
              />
              <div class="gs-social-card__media-overlay">
                <span class="gs-social-card__live-pill" style="--plat-color:${pMeta.color};">
                  <span class="gs-social-card__live-dot"></span>
                  <span>${escHtml(badgeText)}</span>
                </span>
                ${
                  hasVideoEmbed
                    ? `
                  <button type="button" class="gs-social-card__play-btn" data-play-yt="${escHtml(data.videoId)}" aria-label="Video abspielen">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <span>${lang === "en" ? "Play video" : "Video abspielen"}</span>
                  </button>
                `
                    : ""
                }
              </div>
            </div>
          `
              : ""
          }

          <div class="gs-social-card__content">
            <div class="gs-social-card__top">
              <a href="${escHtml(data.authorUrl || item.url)}" target="_blank" rel="noopener" class="gs-social-card__author">
                ${
                  data.authorAvatar
                    ? `<img class="gs-social-card__avatar" src="${escHtml(data.authorAvatar)}" alt="${escHtml(data.authorName)}" loading="lazy" />`
                    : `<span class="gs-social-card__plat-icon" style="--plat-color:${pMeta.color};">${pMeta.icon}</span>`
                }
                <div class="gs-social-card__author-info">
                  <span class="gs-social-card__author-name">${escHtml(data.authorName || pMeta.label)}</span>
                  <span class="gs-social-card__author-handle">${escHtml(data.authorHandle || "")}</span>
                </div>
              </a>
              <span class="gs-social-card__plat-badge" style="--plat-color:${pMeta.color};" title="${escHtml(pMeta.label)}">
                ${pMeta.icon}
                <span>${escHtml(pMeta.label)}</span>
              </span>
            </div>

            ${
              !mediaUrl
                ? `<div class="gs-social-card__inline-badge">
                     <span class="gs-social-card__live-dot"></span>
                     <span>${escHtml(badgeText)}</span>
                   </div>`
                : ""
            }

            <h3 class="gs-social-card__title">
              <a href="${escHtml(data.postUrl || item.url)}" target="_blank" rel="noopener">
                ${escHtml(data.title || "")}
              </a>
            </h3>

            ${
              bodyText && bodyText !== data.title
                ? `<p class="gs-social-card__text">${escHtml(bodyText)}</p>`
                : ""
            }

            <div class="gs-social-card__footer">
              <div class="gs-social-card__meta">
                ${dateFormatted ? `<span>${escHtml(dateFormatted)}</span>` : ""}
                ${data.metrics ? `<span>·</span><span>${escHtml(data.metrics)}</span>` : ""}
              </div>
              <a href="${escHtml(data.postUrl || item.url)}" target="_blank" rel="noopener" class="gs-social-card__cta">
                <span>${escHtml(ctaText)}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      `;

      // Klick auf Play-Button lädt das YouTube-Video direkt im Karten-Frame
      const playBtn = cardEl.querySelector("[data-play-yt]");
      if (playBtn) {
        playBtn.addEventListener("click", () => {
          const vid = playBtn.getAttribute("data-play-yt");
          const mediaBox = cardEl.querySelector(".gs-social-card__media");
          if (mediaBox && vid) {
            mediaBox.innerHTML = `
              <iframe
                src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(vid)}?autoplay=1&rel=0"
                title="${escHtml(data.title || "YouTube Video")}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                style="width:100%; height:100%; border:0; position:absolute; inset:0;"
              ></iframe>
            `;
          }
        });
      }
    } catch (err) {
      cardEl.classList.remove("is-loading");
      cardEl.innerHTML = `
        <div class="gs-social-card__inner is-text-only">
          <div class="gs-social-card__content">
            <div class="gs-social-card__top">
              <span class="gs-social-card__plat-badge" style="--plat-color:${meta.color};">
                ${meta.icon}
                <span>${escHtml(meta.label)}</span>
              </span>
            </div>
            <h3 class="gs-social-card__title">
              <a href="${escHtml(item.url || "#")}" target="_blank" rel="noopener">
                ${escHtml(meta.label)} Kanal besuchen
              </a>
            </h3>
            <p class="gs-social-card__text">${escHtml(err.message || "")}</p>
            <div class="gs-social-card__footer">
              <span></span>
              <a href="${escHtml(item.url || "#")}" target="_blank" rel="noopener" class="gs-social-card__cta">
                <span>Kanal öffnen</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      `;
    }
  }
}

customElements.define("gs-social-feed", GsSocialFeed);
