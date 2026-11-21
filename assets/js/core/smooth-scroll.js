/* Smooth Scroll mit Lenis (lädt aus CDN) + GSAP-Sync */

let lenis = null;
let initialized = false;

export function getLenis() {
  return lenis;
}

export function initSmoothScroll() {
  if (initialized) return lenis;
  initialized = true;

  if (typeof window === "undefined") return null;

  // Reduced motion: kein Smooth Scroll
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }

  if (typeof Lenis === "undefined") {
    console.warn("[smooth-scroll] Lenis not loaded. Add Lenis CDN script in <head>.");
    return null;
  }

  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    lerp: 0.085,
  });

  function raf(time) {
    lenis.raf(time);
  }

  let rafId = 0;

  // Sync mit GSAP ScrollTrigger
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const tick = (time) => {
      if (document.hidden) {
        rafId = 0;
        return;
      }
      raf(time);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  // Bei verstecktem Tab Animationen & Smooth-Scroll pausieren (spart RAM & CPU)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      lenis?.stop();
      if (typeof gsap !== "undefined") gsap.ticker.sleep();
    } else {
      if (typeof gsap !== "undefined") gsap.ticker.wake();
      lenis?.start();
      if (typeof gsap === "undefined" && !rafId) {
        const tick = (time) => {
          if (document.hidden) {
            rafId = 0;
            return;
          }
          raf(time);
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      }
    }
  });

  // Anchor-Links sanft scrollen
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -80 });
  });

  return lenis;
}
