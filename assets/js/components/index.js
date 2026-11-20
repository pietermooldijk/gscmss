/* Sammelmodul aller Web Components.

   Wird von main.js bewusst ERST dynamisch importiert, wenn feststeht, ob die
   externen Libs (GSAP & Co.) geladen werden — customElements.define() startet
   sofort das Rendern, und die Komponenten fragen beim Rendern GSAP ab. Wuerden
   sie frueher laufen, bekaemen schnelle Komponenten den Fallback und langsame
   (die erst JSON laden) die GSAP-Variante — mit sichtbar versetzten Elementen. */

import "./gs-header.js";
import "./gs-footer.js";
import "./gs-section.js";
import "./gs-hero.js";
import "./gs-feature-cards.js";
import "./gs-projects-grid.js";
import "./gs-project-detail.js";
import "./gs-team-grid.js";
import "./gs-member-detail.js";
import "./gs-journal-list.js";
import "./gs-journal-post.js";
import "./gs-text-block.js";
import "./gs-custom-block.js";
import "./gs-cta.js";
import "./gs-contact-form.js";
import "./gs-marquee.js";
import "./gs-social-feed.js";
import "./gs-cookie-banner.js";
