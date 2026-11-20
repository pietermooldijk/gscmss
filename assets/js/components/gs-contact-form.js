/* <gs-contact-form data-key="contact"> — Kontakt-/Bewerbungsformular */

import { loadData, loadSite } from "../core/data-loader.js";
import { lang, t } from "../core/i18n.js";
import { animateReveal } from "../core/animations.js";

let turnstilePromise = null;
function loadTurnstileScript() {
  if (typeof window.turnstile !== "undefined") return Promise.resolve();
  if (turnstilePromise) return turnstilePromise;
  turnstilePromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
  return turnstilePromise;
}

class GsContactForm extends HTMLElement {
  async connectedCallback() {
    const key = this.dataset.key || "contact";
    const [pages, site, submitCfg] = await Promise.all([
      loadData("pages"),
      loadSite(),
      fetch("/api/submit.php?action=config")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    const block = pages?.[key]?.form;
    if (!block) {
      this.innerHTML = "";
      return;
    }
    const turnstileSiteKey = submitCfg?.turnstileSiteKey || "";

    const submitLabel = await t("form.submit", lang === "de" ? "Senden" : "Send");
    const sending = await t("form.sending", lang === "de" ? "Wird gesendet…" : "Sending…");
    const success = await t(
      "form.success",
      lang === "de" ? "Danke! Wir melden uns bald." : "Thanks! We'll be in touch."
    );
    const error = await t(
      "form.error",
      lang === "de" ? "Fehler beim Senden. Bitte später erneut versuchen." : "Could not send. Please try again later."
    );

    const fields = (block.fields || [])
      .map((f) => {
        const id = `gs-field-${f.name}`;
        const req = f.required ? '<span class="req">*</span>' : "";
        const label = `<label class="gs-form__label" for="${id}">${f.label} ${req}</label>`;
        if (f.type === "textarea") {
          return `
            <div class="gs-form__field" ${f.full ? 'style="grid-column:1/-1"' : ""}>
              ${label}
              <textarea class="gs-form__textarea" id="${id}" name="${f.name}" rows="${f.rows || 5}" ${f.required ? "required" : ""} placeholder="${f.placeholder || ""}"></textarea>
            </div>`;
        }
        if (f.type === "select") {
          const opts = (f.options || [])
            .map((o) => `<option value="${o.value || o}">${o.label || o}</option>`)
            .join("");
          return `
            <div class="gs-form__field" ${f.full ? 'style="grid-column:1/-1"' : ""}>
              ${label}
              <select class="gs-form__select" id="${id}" name="${f.name}" ${f.required ? "required" : ""}>${opts}</select>
            </div>`;
        }
        return `
          <div class="gs-form__field" ${f.full ? 'style="grid-column:1/-1"' : ""}>
            ${label}
            <input class="gs-form__input" id="${id}" name="${f.name}" type="${f.type || "text"}" ${f.required ? "required" : ""} placeholder="${f.placeholder || ""}" />
          </div>`;
      })
      .join("");

    const endpoint = block.endpoint || site?.contact?.endpoint || "";

    this.innerHTML = `
      <section class="gs-form">
        <div class="gs-form__inner">
          ${
            block.title || block.intro
              ? `<div class="gs-form__intro" data-reveal>
                  ${block.title ? `<h2>${block.title}</h2>` : ""}
                  ${block.intro ? `<p>${block.intro}</p>` : ""}
                </div>`
              : ""
          }
          <form data-reveal novalidate>
            <input type="hidden" name="_form" value="${key}" />
            <input type="text" name="_hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;" aria-hidden="true" />
            <div class="gs-form__row">${fields}</div>
            ${
              block.consent
                ? `<label class="gs-form__consent">
                    <input type="checkbox" name="consent" required />
                    <span>${block.consent}</span>
                  </label>`
                : ""
            }
            ${turnstileSiteKey ? `<div class="gs-form__captcha" data-turnstile-wrap style="margin-bottom: var(--space-4);"></div>` : ""}
            <div class="gs-form__submit-row">
              <button class="btn btn--primary btn--lg" type="submit" data-submit>${submitLabel}</button>
              <span class="gs-form__status" data-status></span>
            </div>
          </form>
        </div>
      </section>
    `;

    let widgetId = null;
    if (turnstileSiteKey) {
      const wrap = this.querySelector("[data-turnstile-wrap]");
      loadTurnstileScript().then(() => {
        if (wrap && typeof window.turnstile !== "undefined") {
          const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
          widgetId = window.turnstile.render(wrap, {
            sitekey: turnstileSiteKey,
            theme,
          });
        }
      });
    }

    queueMicrotask(() => animateReveal(this));
    this._bind({ endpoint, sending, success, error, submitLabel, getWidgetId: () => widgetId });
  }

  _bind({ endpoint, sending, success, error, submitLabel, getWidgetId }) {
    const form = this.querySelector("form");
    const status = this.querySelector("[data-status]");
    const btn = this.querySelector("[data-submit]");
    const consentCb = form.querySelector('input[name="consent"]');
    let isSubmitting = false;

    const syncSubmitState = () => {
      const blocked = isSubmitting || (consentCb ? !consentCb.checked : false);
      btn.disabled = blocked;
      if (blocked) {
        btn.setAttribute("aria-disabled", "true");
      } else {
        btn.removeAttribute("aria-disabled");
      }
    };

    if (consentCb) {
      consentCb.addEventListener("change", syncSubmitState);
    }
    syncSubmitState();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (consentCb && !consentCb.checked) {
        syncSubmitState();
        return;
      }
      isSubmitting = true;
      status.removeAttribute("data-state");
      status.textContent = sending;
      syncSubmitState();

      const data = new FormData(form);

      if (!endpoint) {
        // Demo: kein echter Endpoint konfiguriert
        setTimeout(() => {
          status.setAttribute("data-state", "success");
          status.textContent = success + " (Demo: kein Endpoint konfiguriert)";
          isSubmitting = false;
          form.reset();
          syncSubmitState();
        }, 800);
        return;
      }

      try {
        const r = await fetch(endpoint, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" },
        });
        const resJson = await r.json().catch(() => null);
        if (!r.ok || !resJson?.ok) {
          if (resJson?.error === "captcha_failed") {
            throw new Error(
              lang === "de"
                ? "Bitte bestätige zuerst die Sicherheitsprüfung (Cloudflare Turnstile)."
                : "Please complete the security check (Cloudflare Turnstile) first."
            );
          }
          throw new Error(error);
        }
        status.setAttribute("data-state", "success");
        status.textContent = success;
        form.reset();
        const wid = getWidgetId?.();
        if (wid !== null && typeof window.turnstile !== "undefined") {
          window.turnstile.reset(wid);
        }
      } catch (err) {
        status.setAttribute("data-state", "error");
        status.textContent = err?.message || error;
      } finally {
        isSubmitting = false;
        syncSubmitState();
      }
    });
  }
}

customElements.define("gs-contact-form", GsContactForm);
