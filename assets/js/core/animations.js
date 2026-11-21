/* Scroll-Animationen mit GSAP + ScrollTrigger (lädt aus CDN) */

const isCmsPreview =
  typeof window !== "undefined" &&
  (new URLSearchParams(window.location.search).get("cms_preview") === "1" ||
    document.documentElement.hasAttribute("data-cms-preview"));

const reduceMotion =
  isCmsPreview ||
  (typeof window !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches);

function hasGsap() {
  return (
    typeof window !== "undefined" &&
    typeof window.gsap !== "undefined" &&
    typeof window.ScrollTrigger !== "undefined"
  );
}

let registered = false;
function ensureRegistered() {
  if (registered || !hasGsap()) return hasGsap();
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
  return true;
}

/**
 * Reveal-Effekt für alle `[data-reveal]` Kinder eines Scopes.
 */
export function animateReveal(scope = document) {
  if (reduceMotion) {
    scope.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.setAttribute("data-reveal-ready", "");
    });
    return;
  }
  if (!ensureRegistered()) {
    scope.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.setAttribute("data-reveal-ready", "");
    });
    return;
  }

  const targets = scope.querySelectorAll("[data-reveal]:not([data-reveal-ready])");
  targets.forEach((el, i) => {
    const dir = el.dataset.reveal || "up";
    const delay = parseFloat(el.dataset.revealDelay || "0") || i * 0.06;
    const from = { opacity: 0 };
    if (dir === "up") from.y = 40;
    if (dir === "down") from.y = -40;
    if (dir === "left") from.x = 40;
    if (dir === "right") from.x = -40;
    if (dir === "scale") from.scale = 0.92;

    gsap.fromTo(
      el,
      from,
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 1.05,
        ease: "expo.out",
        delay,
        clearProps: "transform,willChange",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true,
        },
        onStart: () => el.setAttribute("data-reveal-ready", ""),
      }
    );
  });
}

/**
 * Parallax-Bewegung beim Scrollen.
 */
export function animateParallax(scope = document) {
  if (reduceMotion || !ensureRegistered()) return;

  scope.querySelectorAll("[data-parallax]").forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || 0.2;
    gsap.to(el, {
      yPercent: -speed * 30,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
      },
    });
  });
}

/**
 * Text-Reveal: zerlegt Headline in Zeilen/Wörter und animiert sie nacheinander.
 */
export function animateTextReveal(scope = document) {
  if (reduceMotion || !ensureRegistered()) return;

  scope.querySelectorAll("[data-text-reveal]").forEach((el) => {
    if (el.dataset.textRevealReady) return;

    // Recursive function to parse and wrap text node words, preserving tag structures like <span class="accent">
    function wrapTextNodes(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const parts = text.split(/(\s+)/);
        const fragment = document.createDocumentFragment();

        parts.forEach((part) => {
          if (part.trim() === "") {
            fragment.appendChild(document.createTextNode(part));
          } else if (/^[.,;:!?—–-]+$/.test(part.trim())) {
            // Do not wrap standalone punctuation, so it doesn't wrap to a new line on its own
            fragment.appendChild(document.createTextNode(part));
          } else {
            const wrap = document.createElement("span");
            wrap.className = "word-wrap";
            wrap.style.display = "inline-block";
            // Allow shadows and text-shadows to render outside the wrap
            // while preserving inline-block layout for the reveal animation.
            wrap.style.overflow = "visible";
            wrap.style.verticalAlign = "bottom";
            // Extra padding/margin to prevent italic side-clipping and descender bottom-clipping
            wrap.style.paddingRight = "0.15em";
            wrap.style.marginRight = "-0.15em";
            wrap.style.paddingBottom = "0.25em";
            wrap.style.marginBottom = "-0.25em";

            const word = document.createElement("span");
            word.className = "word";
            word.style.display = "inline-block";
            word.style.opacity = "0";
            word.textContent = part;

            wrap.appendChild(word);
            fragment.appendChild(wrap);
          }
        });
        return fragment;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const children = Array.from(node.childNodes);
        children.forEach((child) => {
          const replacement = wrapTextNodes(child);
          if (replacement) {
            node.replaceChild(replacement, child);
          }
        });
        return null;
      }
    }

    wrapTextNodes(el);
    el.dataset.textRevealReady = "true";

    const wordEls = el.querySelectorAll(".word");
    gsap.fromTo(
      wordEls,
      { yPercent: 110, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.04,
        clearProps: "transform,willChange",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
        },
      }
    );
  });
}

/**
 * Magnetischer Hover-Effekt (z.B. für Buttons).
 */
export function bindMagnetic(scope = document) {
  if (reduceMotion) return;
  scope.querySelectorAll("[data-magnetic]").forEach((el) => {
    if (el.dataset.magneticBound) return;
    el.dataset.magneticBound = "true";
    const strength = parseFloat(el.dataset.magnetic) || 0.3;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

/**
 * Hover-Glow für Feature-Cards (Mouse-Tracking für Gradient-Position).
 */
export function bindCardGlow(scope = document) {
  scope.querySelectorAll(".gs-feature-card").forEach((card) => {
    if (card.dataset.glowBound) return;
    card.dataset.glowBound = "true";
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

export function animateHeroGlow(scope = document) {
  if (reduceMotion || !ensureRegistered()) return;

  scope.querySelectorAll("[data-hero-glow]").forEach((el) => {
    if (el.dataset.heroGlowReady) return;
    el.dataset.heroGlowReady = "true";

    let breathTween = null;
    const hero = el.closest(".gs-hero") || el;

    // 1) Einmaliges Einblenden beim Laden.
    gsap.fromTo(
      el,
      { scale: 0.95, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 1.2,
        ease: "expo.out",
        onComplete: () => {
          // 2) Erst NACHDEM das Einblenden fertig ist, startet ein sehr
          // langsames, zeitbasiertes "Atmen" — pausiert automatisch außerhalb des Viewports.
          breathTween = gsap.to(el, {
            scale: 1.05,
            duration: 5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            paused: document.hidden,
          });
        },
      }
    );

    // 3) Dezenter Scroll-Tween + automatisches Pausieren des Atmens außerhalb des Viewports
    gsap.to(el, {
      yPercent: 10,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
        onLeave: () => breathTween?.pause(),
        onEnterBack: () => {
          if (!document.hidden) breathTween?.resume();
        },
      },
    });
  });
}

/**
 * Füllt Skill-Balken (z.B. auf der Mitglieder-Detailseite) beim Scrollen
 * ins Bild von 0 auf ihren Ziel-Wert (`data-level`, Prozent).
 */
export function animateSkillBars(scope = document) {
  const bars = scope.querySelectorAll("[data-skill-fill]:not([data-skill-ready])");

  if (reduceMotion || !ensureRegistered()) {
    bars.forEach((el) => {
      el.dataset.skillReady = "true";
      el.style.width = `${parseFloat(el.dataset.level) || 0}%`;
    });
    return;
  }

  bars.forEach((el, i) => {
    el.dataset.skillReady = "true";
    const level = Math.max(0, Math.min(100, parseFloat(el.dataset.level) || 0));
    gsap.fromTo(
      el,
      { width: "0%" },
      {
        width: `${level}%`,
        duration: 1.1,
        ease: "expo.out",
        delay: i * 0.06,
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          once: true,
        },
      }
    );
  });
}

export function animateSectionCrossfades(scope = document) {
  if (reduceMotion || !ensureRegistered()) return;

  const sections = scope.querySelectorAll('main > [data-transition]:not([data-transition="none"]):not([data-crossfade-ready])');
  sections.forEach((sec) => {
    sec.dataset.crossfadeReady = "true";
    gsap.fromTo(
      sec,
      { opacity: 0.35, y: 28 },
      {
        opacity: 1,
        y: 0,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sec,
          start: "top 96%",
          end: "top 58%",
          scrub: 0.65,
        },
      }
    );
  });
}

export function refreshScrollTrigger() {
  if (typeof ScrollTrigger !== "undefined") {
    ScrollTrigger.refresh();
  }
}
