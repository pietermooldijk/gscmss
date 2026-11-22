#!/usr/bin/env python3
"""
Gamet Studios Build Script
==========================
Erledigt zwei Dinge:

  1) Injiziert vollständige SEO/OG/Twitter-Meta-Tags in alle statischen
     HTML-Seiten (Liste unten in STATIC_PAGES). Diese Seiten werden nur
     inhaltlich gepatcht (Meta-Tags), NICHT gelöscht+neu erzeugt — ihr
     Body-Inhalt existiert nirgendwo sonst als Quelltext.

  2) Generiert pro Journal-Post eine eigene HTML-Datei
     (z.B. de/journal/warum-kollektiv.html), damit Discord, Slack, Twitter
     und Co. korrekte Preview-Karten zeigen können. Bevor neu generiert
     wird, räumt das Skript zuerst alle vorher generierten Journal-Seiten
     auf (siehe clean_journal_dir) — so bleiben keine Leichen von
     umbenannten/gelöschten Posts liegen. Betrifft NUR die generierten
     Dateien, nicht handgeschriebene Templates (siehe JOURNAL_PRESERVE).

Vor jedem Deploy ausführen:

    python3 tools/build.py

Idempotent — kann beliebig oft laufen, das Ergebnis ist stabil.
Kein externes Python-Package nötig (Standardbibliothek reicht).
"""

from __future__ import annotations
import os
import re
import json
import html
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ─── Globale Konfiguration ─────────────────────────────────────────────────
SITE_URL = os.environ.get("SITE_URL", "https://gametstudios.media").rstrip("/")
SITE_NAME = "Gamet Studios"
OG_IMAGE = "/assets/images/og/og-default.png"
OG_IMAGE_ALT = "Gamet Studios – Kreativ-Kollektiv"

# ─── Stage 1: statische Seiten ─────────────────────────────────────────────
# Jede Seite kann eigene title/description/og:image überschreiben.
# Wenn kein og_image angegeben ist, wird OG_IMAGE (Default) verwendet.

STATIC_PAGES = {
    # DE
    "de/index.html": {
        "title": "Gamet Studios - Kreativ-Kollektiv",
        "description": "Gamet Studios — ein Kreativ-Kollektiv. Wir bündeln Kräfte, teilen Ressourcen und holen das Beste aus uns allen heraus.",
        "og_title": "Gamet Studios — Kreativ-Kollektiv",
        "og_description": "Wir bündeln Kräfte, teilen Ressourcen und holen das Beste aus uns allen heraus.",
        "locale": "de_DE",
        "url": "/de/",
    },
    "de/ueber-uns.html": {
        "title": "Über uns - Gamet Studios",
        "description": "Manifest und Werte von Gamet Studios — einem Kreativ-Kollektiv für Tochtermarken und gemeinsame Projekte.",
        "og_title": "Über Gamet Studios",
        "og_description": "Worum es uns geht: ein Kollektiv für alles, was im Alleingang nicht entsteht.",
        "locale": "de_DE",
        "url": "/de/ueber-uns",
    },
    "de/projekte.html": {
        "title": "Projekte & Marken - Gamet Studios",
        "description": "Tochterprojekte und Tochtermarken von Gamet Studios — Design, Musik, Print, Werkstatt.",
        "og_title": "Projekte & Tochtermarken",
        "og_description": "Alles, was unter unserem Dach entsteht.",
        "locale": "de_DE",
        "url": "/de/projekte",
    },
    "de/mitglieder.html": {
        "title": "Mitglieder - Gamet Studios",
        "description": "Die Köpfe hinter Gamet Studios. Designer, Entwicklerinnen, Autoren, Musikerinnen — und alles dazwischen.",
        "og_title": "Das Kollektiv",
        "og_description": "Wer wir sind, was wir tun, woran wir arbeiten.",
        "locale": "de_DE",
        "url": "/de/mitglieder",
    },
    "de/journal.html": {
        "title": "Journal - Gamet Studios",
        "description": "Notizen, Essays und Updates aus dem Gamet Studios Kollektiv.",
        "og_title": "Journal",
        "og_description": "Notizen, Essays und Updates aus dem Kollektiv.",
        "locale": "de_DE",
        "url": "/de/journal",
    },
    "de/karriere.html": {
        "title": "Karriere - Gamet Studios",
        "description": "Werde Teil des Kreativ-Kollektivs Gamet Studios. Wir suchen Menschen, Projekte und Marken, die zu uns passen.",
        "og_title": "Werde Teil des Kollektivs",
        "og_description": "Wir suchen Menschen, Projekte und Marken, die zu uns passen.",
        "locale": "de_DE",
        "url": "/de/karriere",
    },
    "de/kontakt.html": {
        "title": "Kontakt - Gamet Studios",
        "description": "Schreib uns. Wir hören zu.",
        "og_title": "Kontakt",
        "og_description": "Frage, Idee, Bewerbung oder einfach Hallo — schreib uns.",
        "locale": "de_DE",
        "url": "/de/kontakt",
    },
    "de/404.html": {
        "title": "404 - Gamet Studios",
        "description": "Diese Seite existiert nicht (mehr).",
        "og_title": "404 — Nicht gefunden",
        "og_description": "Diese Seite existiert nicht (mehr).",
        "locale": "de_DE",
        "url": "/de/404",
    },
    "de/projekte/projekt.html": {
        "title": "Projekt - Gamet Studios",
        "description": "Ein Projekt von Gamet Studios.",
        "og_title": "Projekt — Gamet Studios",
        "og_description": "Tochterprojekte und Tochtermarken von Gamet Studios.",
        "locale": "de_DE",
        "url": "/de/projekte/",
    },
    "de/journal/post-template.html": {
        "title": "Journal - Gamet Studios",
        "description": "Notizen, Essays und Updates aus dem Kollektiv.",
        "og_title": "Journal — Gamet Studios",
        "og_description": "Notizen, Essays und Updates aus dem Kollektiv.",
        "locale": "de_DE",
        "url": "/de/journal/",
    },
    "de/mitglieder/mitglied.html": {
        "title": "Mitglied - Gamet Studios",
        "description": "Ein Mitglied von Gamet Studios.",
        "og_title": "Mitglied — Gamet Studios",
        "og_description": "Die Köpfe hinter Gamet Studios.",
        "locale": "de_DE",
        "url": "/de/mitglieder/",
    },
    "de/impressum.html": {
        "title": "Impressum - Gamet Studios",
        "description": "Impressum von Gamet Studios — Angaben gemäß § 5 TMG.",
        "og_title": "Impressum",
        "og_description": "Angaben gemäß § 5 TMG und Kontaktinformationen.",
        "locale": "de_DE",
        "url": "/de/impressum",
    },
    "de/datenschutz.html": {
        "title": "Datenschutz - Gamet Studios",
        "description": "Datenschutzerklärung von Gamet Studios — wie wir mit personenbezogenen Daten umgehen.",
        "og_title": "Datenschutzerklärung",
        "og_description": "Wie wir mit deinen personenbezogenen Daten umgehen.",
        "locale": "de_DE",
        "url": "/de/datenschutz",
    },

    # EN
    "en/index.html": {
        "title": "Gamet Studios - Creative Collective",
        "description": "Gamet Studios — a creative collective. We pool forces, share resources, and bring out the best in each of us.",
        "og_title": "Gamet Studios — Creative Collective",
        "og_description": "We pool forces, share resources, and bring out the best in each of us.",
        "locale": "en_US",
        "url": "/en/",
    },
    "en/about.html": {
        "title": "About - Gamet Studios",
        "description": "Manifesto and values of Gamet Studios — a creative collective for subsidiary brands and shared projects.",
        "og_title": "About Gamet Studios",
        "og_description": "What we're after: a collective for everything that doesn't grow alone.",
        "locale": "en_US",
        "url": "/en/about",
    },
    "en/projects.html": {
        "title": "Projects & Brands - Gamet Studios",
        "description": "Subsidiary projects and brands of Gamet Studios — design, music, print, workshop.",
        "og_title": "Projects & Subsidiary Brands",
        "og_description": "Everything growing under our roof.",
        "locale": "en_US",
        "url": "/en/projects",
    },
    "en/members.html": {
        "title": "Members - Gamet Studios",
        "description": "The people behind Gamet Studios. Designers, developers, writers, musicians — and everything in between.",
        "og_title": "The Collective",
        "og_description": "Who we are, what we do, what we're working on.",
        "locale": "en_US",
        "url": "/en/members",
    },
    "en/journal.html": {
        "title": "Journal - Gamet Studios",
        "description": "Our Journal is currently only available in German.",
        "og_title": "Journal (German only)",
        "og_description": "Our Journal is currently only available in German.",
        "locale": "en_US",
        "url": "/en/journal",
    },
    "en/careers.html": {
        "title": "Careers - Gamet Studios",
        "description": "Join the creative collective Gamet Studios. We're looking for people, projects, and brands that fit us.",
        "og_title": "Join the collective",
        "og_description": "We're looking for people, projects, and brands that fit us.",
        "locale": "en_US",
        "url": "/en/careers",
    },
    "en/contact.html": {
        "title": "Contact - Gamet Studios",
        "description": "Write to us. We're listening.",
        "og_title": "Contact",
        "og_description": "Question, idea, application or just hello — write to us.",
        "locale": "en_US",
        "url": "/en/contact",
    },
    "en/404.html": {
        "title": "404 - Gamet Studios",
        "description": "This page does not exist (anymore).",
        "og_title": "404 — Not found",
        "og_description": "This page does not exist (anymore).",
        "locale": "en_US",
        "url": "/en/404",
    },
    "en/projects/project.html": {
        "title": "Project - Gamet Studios",
        "description": "A project by Gamet Studios.",
        "og_title": "Project — Gamet Studios",
        "og_description": "Subsidiary projects and brands of Gamet Studios.",
        "locale": "en_US",
        "url": "/en/projects/",
    },
    "en/journal/post-template.html": {
        "title": "Journal - Gamet Studios",
        "description": "Notes, essays and updates from the collective.",
        "og_title": "Journal — Gamet Studios",
        "og_description": "Notes, essays and updates from the collective.",
        "locale": "en_US",
        "url": "/en/journal/",
    },
    "en/members/member.html": {
        "title": "Member - Gamet Studios",
        "description": "A member of Gamet Studios.",
        "og_title": "Member — Gamet Studios",
        "og_description": "The minds behind Gamet Studios.",
        "locale": "en_US",
        "url": "/en/members/",
    },
    "en/imprint.html": {
        "title": "Legal Notice - Gamet Studios",
        "description": "Legal notice (Impressum) of Gamet Studios — information pursuant to Section 5 TMG.",
        "og_title": "Legal Notice",
        "og_description": "Information pursuant to Section 5 TMG and contact details.",
        "locale": "en_US",
        "url": "/en/imprint",
    },
    "en/privacy.html": {
        "title": "Privacy Policy - Gamet Studios",
        "description": "Privacy policy of Gamet Studios — how we handle personal data.",
        "og_title": "Privacy Policy",
        "og_description": "How we handle your personal data.",
        "locale": "en_US",
        "url": "/en/privacy",
    },
    "de/pressekit.html": {
        "title": "Pressekit - Gamet Studios",
        "description": "Logos, Bilder und Informationen für Presse und Medien.",
        "og_title": "Pressekit",
        "og_description": "Logos, Bilder und Informationen für Presse und Medien.",
        "locale": "de_DE",
        "url": "/de/pressekit",
    },
    "en/press-kit.html": {
        "title": "Press Kit - Gamet Studios",
        "description": "Logos, images, and information for press and media.",
        "og_title": "Press Kit",
        "og_description": "Logos, images, and information for press and media.",
        "locale": "en_US",
        "url": "/en/press-kit",
    },
    "de/markenrichtlinien.html": {
        "title": "Markenrichtlinien - Gamet Studios",
        "description": "Wie unser Name, Logo und Look korrekt verwendet werden.",
        "og_title": "Markenrichtlinien",
        "og_description": "Wie unser Name, Logo und Look korrekt verwendet werden.",
        "locale": "de_DE",
        "url": "/de/markenrichtlinien",
    },
    "en/brand-guidelines.html": {
        "title": "Brand Guidelines - Gamet Studios",
        "description": "How to correctly use our name, logo, and look.",
        "og_title": "Brand Guidelines",
        "og_description": "How to correctly use our name, logo, and look.",
        "locale": "en_US",
        "url": "/en/brand-guidelines",
    },
    # Bewusst ohne /de/ oder /en/ Prefix — diese Seite gibt es nur auf
    # Englisch, direkt unter /copyright (i18n.js fällt ohne Sprach-Prefix
    # automatisch auf Englisch zurück, siehe DEFAULT_LANG in i18n.js).
    "copyright.html": {
        "title": "Copyright - Gamet Studios",
        "description": "Copyright and usage information for Gamet Studios content.",
        "og_title": "Copyright",
        "og_description": "Copyright and usage information for Gamet Studios content.",
        "locale": "en_US",
        "url": "/copyright",
    },
}


# ─── Meta-Tag-Block bauen + in HTML injizieren ────────────────────────────

# Tags die wir verwalten — alle anderen bleiben unangetastet.
MANAGED_TAGS_PATTERN = re.compile(
    r'\s*<meta\s+(?:'
    r'name="(?:description|twitter:[:\w-]+)"|'
    r'property="og:[\w:]+"'
    r')[^>]*/?>\s*\n?',
    re.IGNORECASE,
)

# Title bleibt unverändert (wenn schon vorhanden) — wir injizieren nach dem
# <title> Tag. Falls kein <title> vorhanden ist, vor </head>.
TITLE_PATTERN = re.compile(r"(<title>[^<]*</title>)", re.IGNORECASE)


def absolute_url(path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return SITE_URL + ("/" + path.lstrip("/"))


def build_meta_block(cfg: dict, image: str | None = None, image_alt: str | None = None, og_type: str = "website") -> str:
    desc = cfg.get("description", "")
    og_title = cfg.get("og_title", cfg.get("title", SITE_NAME))
    og_desc = cfg.get("og_description", desc)
    locale = cfg.get("locale", "de_DE")
    page_url = absolute_url(cfg.get("url", "/"))
    og_image = absolute_url(image or cfg.get("og_image") or OG_IMAGE)
    og_image_alt = image_alt or cfg.get("og_image_alt") or OG_IMAGE_ALT

    e = html.escape
    lines = [
        f'<meta name="description" content="{e(desc)}" />',
        '<meta property="og:type" content="' + e(og_type) + '" />',
        f'<meta property="og:site_name" content="{e(SITE_NAME)}" />',
        f'<meta property="og:locale" content="{e(locale)}" />',
        f'<meta property="og:title" content="{e(og_title)}" />',
        f'<meta property="og:description" content="{e(og_desc)}" />',
        f'<meta property="og:url" content="{e(page_url)}" />',
        f'<meta property="og:image" content="{e(og_image)}" />',
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        f'<meta property="og:image:alt" content="{e(og_image_alt)}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{e(og_title)}" />',
        f'<meta name="twitter:description" content="{e(og_desc)}" />',
        f'<meta name="twitter:image" content="{e(og_image)}" />',
        f'<meta name="twitter:image:alt" content="{e(og_image_alt)}" />',
    ]
    return "\n  ".join(lines)


def inject_meta(html_text: str, cfg: dict, image: str | None = None, image_alt: str | None = None, og_type: str = "website") -> str:
    # 1) Alte managed Tags entfernen
    cleaned = MANAGED_TAGS_PATTERN.sub("", html_text)

    # 2) Neuen Block bauen
    block = build_meta_block(cfg, image=image, image_alt=image_alt, og_type=og_type)

    # 3) Nach <title> einfügen (oder vor </head> falls kein <title> da)
    if TITLE_PATTERN.search(cleaned):
        new = TITLE_PATTERN.sub(lambda m: m.group(1) + "\n  " + block, cleaned, count=1)
    elif "</head>" in cleaned:
        new = cleaned.replace("</head>", "  " + block + "\n</head>", 1)
    else:
        new = cleaned + "\n" + block

    return new


def update_static_pages():
    print("→ Stage 1: SEO/OG/Twitter Tags in statischen Seiten aktualisieren")
    updated = 0
    for rel_path, cfg in STATIC_PAGES.items():
        path = ROOT / rel_path
        if not path.exists():
            print(f"   ✗ {rel_path} (Datei fehlt — übersprungen)")
            continue
        original = path.read_text(encoding="utf-8")
        new = inject_meta(original, cfg)
        if new != original:
            path.write_text(new, encoding="utf-8")
            print(f"   ✓ {rel_path}")
            updated += 1
        else:
            print(f"   – {rel_path} (unverändert)")
    print(f"  → {updated} Datei(en) aktualisiert.\n")


# ─── Stage 2: Journal-Posts pro Slug eine HTML-Datei generieren ────────────

FRONTMATTER_RE = re.compile(r"^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$")


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        line = line.rstrip()
        if not line.strip():
            continue
        kv = re.match(r"^([\w-]+)\s*:\s*(.*)$", line)
        if kv:
            val = kv.group(2).strip()
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            meta[kv.group(1)] = val
    return meta, m.group(2)


# Minimaler Markdown → HTML Renderer (für Pre-Render im Body).
# Unterstützt: Headings, Paragraphen, Listen (ul/ol), Code, Blockquote, Links,
# Bold, Italic, Bilder, HR.

def render_markdown(text: str) -> str:
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    in_para: list[str] = []

    def flush_para():
        if in_para:
            joined = " ".join(in_para).strip()
            if joined:
                out.append(f"<p>{render_inline(joined)}</p>")
            in_para.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Leerzeile
        if not stripped:
            flush_para()
            i += 1
            continue

        # Headings
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            flush_para()
            lvl = len(m.group(1))
            out.append(f"<h{lvl}>{render_inline(m.group(2))}</h{lvl}>")
            i += 1
            continue

        # HR
        if re.match(r"^---+$", stripped) or re.match(r"^\*\*\*+$", stripped):
            flush_para()
            out.append("<hr />")
            i += 1
            continue

        # Blockquote
        if stripped.startswith(">"):
            flush_para()
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip().lstrip(">").strip())
                i += 1
            out.append(f"<blockquote><p>{render_inline(' '.join(quote_lines))}</p></blockquote>")
            continue

        # Code block (```)
        if stripped.startswith("```"):
            flush_para()
            i += 1
            code_lines = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            code = html.escape("\n".join(code_lines))
            out.append(f"<pre><code>{code}</code></pre>")
            continue

        # Unordered list
        if re.match(r"^[-*]\s+", stripped):
            flush_para()
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append(re.sub(r"^[-*]\s+", "", lines[i].strip()))
                i += 1
            out.append("<ul>" + "".join(f"<li>{render_inline(it)}</li>" for it in items) + "</ul>")
            continue

        # Ordered list
        if re.match(r"^\d+\.\s+", stripped):
            flush_para()
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
                items.append(re.sub(r"^\d+\.\s+", "", lines[i].strip()))
                i += 1
            out.append("<ol>" + "".join(f"<li>{render_inline(it)}</li>" for it in items) + "</ol>")
            continue

        # Raw HTML line (Block-Level, beginnt mit < und nicht <a/<em/<strong/etc.)
        if stripped.startswith("<") and re.match(r"^<(figure|div|table|section|article|aside|video|iframe)\b", stripped, re.I):
            flush_para()
            # Hier sammeln bis zur schließenden Zeile — primitiv: bis Leerzeile
            block_lines = [line]
            i += 1
            while i < len(lines) and lines[i].strip():
                block_lines.append(lines[i])
                i += 1
            out.append("\n".join(block_lines))
            continue

        # Default: Paragraph
        in_para.append(stripped)
        i += 1

    flush_para()
    return "\n".join(out)


def render_inline(text: str) -> str:
    # Image: ![alt](url "title?")
    def repl_img(m):
        alt = m.group(1)
        url = m.group(2)
        title = m.group(3)
        img = f'<img src="{html.escape(url)}" alt="{html.escape(alt)}" loading="lazy" />'
        if not title:
            return img
        return f'{img}<span class="gs-journal-post__credit">{html.escape(title)}</span>'
    text = re.sub(r'!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)', repl_img, text)

    # Link: [text](url)
    def repl_link(m):
        return f'<a href="{html.escape(m.group(2))}">{render_inline(m.group(1))}</a>'
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', repl_link, text)

    # Bold **x**, italic *x*
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", text)

    # Inline code `x`
    text = re.sub(r"`([^`]+)`", lambda m: f"<code>{html.escape(m.group(1))}</code>", text)

    return text


def build_journal_redirect_stub(slug: str, de_title: str, target_dir: Path) -> None:
    """
    Das Journal gibt es bewusst nur auf Deutsch (keine Übersetzungen, damit
    nichts doppelt gepflegt werden muss). Statt einer leeren/fehlenden
    englischen Artikelseite erzeugen wir hier pro deutschem Slug eine
    schlanke Hinweis-Seite: kurze Erklärung + automatische Weiterleitung
    (Meta-Refresh, funktioniert auch ohne JavaScript) zum deutschen Original.
    """
    de_url = f"/de/journal/{slug}"
    cfg = {
        "title": "German only - Gamet Studios Journal",
        "description": f'"{de_title}" is currently only available in German.',
        "og_title": "This article is only available in German",
        "og_description": f'"{de_title}" is currently only available in German.',
        "locale": "en_US",
        "url": f"/en/journal/{slug}",
    }
    meta_block = build_meta_block(cfg, og_type="article")

    html_doc = f"""<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{html.escape(cfg['title'])}</title>
  {meta_block}
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="{absolute_url(de_url)}" />
  <meta http-equiv="refresh" content="3;url={de_url}" />
  <link rel="icon" type="image/png" href="/assets/icons/favicon.png" />
  <link rel="stylesheet" href="/assets/css/fonts.css" />
  <link rel="stylesheet" href="/assets/css/tokens.css" />
  <link rel="stylesheet" href="/assets/css/reset.css" />
  <link rel="stylesheet" href="/assets/css/base.css" />
  <link rel="stylesheet" href="/assets/css/utilities.css" />
  <!-- Diese Seite lädt bewusst kein main.js (reiner Hinweis + Redirect, kein
       main.js/GSAP nötig) — der Seiten-Übergangs-Vorhang aus base.css würde
       sonst bis zu seinem 1,6s-CSS-Fallback komplett schwarz bleiben, weil
       ihn sonst nur JS vorzeitig ausblendet. Hier direkt deaktiviert. -->
  <style>html::before {{ display: none !important; }}</style>
</head>
<body>
  <main class="container-narrow" style="min-height:70vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:1.5rem;">
    <div class="eyebrow" style="justify-content:center;">German only</div>
    <h1 style="font-size:var(--fs-4xl);">This article is only available in German.</h1>
    <p style="color:var(--fg-muted); max-width:520px;">We keep the Journal German-only, to stay true to our voice. Taking you to &ldquo;{html.escape(de_title)}&rdquo; now &hellip;</p>
    <a class="btn btn--primary" href="{de_url}">Read it in German →</a>
  </main>
  <gs-cookie-banner></gs-cookie-banner>
</body>
</html>
"""
    out_path = target_dir / f"{slug}.html"
    out_path.write_text(html_doc, encoding="utf-8")
    print(f"   ✓ {out_path.relative_to(ROOT)} (Weiterleitung → {de_url})")


# Dateien in de/journal/ bzw. en/journal/, die NICHT von diesem Skript
# generiert werden (handgeschriebene Templates) — beim Aufräumen tabu.
JOURNAL_PRESERVE = {"post-template.html"}


def clean_journal_dir(target_dir: Path) -> None:
    """Löscht alle vorher generierten .html-Dateien in einem Journal-Ordner,
    außer den in JOURNAL_PRESERVE gelisteten. Läuft vor jeder Neu-Generierung,
    damit Posts, die umbenannt oder aus index.json entfernt wurden, nicht als
    verwaiste Leichen liegen bleiben."""
    if not target_dir.exists():
        return
    for f in sorted(target_dir.glob("*.html")):
        if f.name in JOURNAL_PRESERVE:
            continue
        f.unlink()
        print(f"   🗑 {f.relative_to(ROOT)} (alt, entfernt)")


def build_journal_pages():
    print("→ Stage 2: Journal-Posts generieren (nur Deutsch) + englische Weiterleitungsseiten")

    index_path = ROOT / "data" / "journal" / "de" / "index.json"
    if not index_path.exists():
        print(f"   ✗ {index_path} fehlt")
        print()
        return

    slugs = json.loads(index_path.read_text(encoding="utf-8"))
    target_dir = ROOT / "de" / "journal"
    target_dir.mkdir(parents=True, exist_ok=True)
    en_target_dir = ROOT / "en" / "journal"
    en_target_dir.mkdir(parents=True, exist_ok=True)

    clean_journal_dir(target_dir)
    clean_journal_dir(en_target_dir)

    seo_geo_path = ROOT / "data" / "seo-geo.json"
    seo_geo_store = {}
    if seo_geo_path.exists():
        try:
            seo_geo_store = json.loads(seo_geo_path.read_text(encoding="utf-8"))
        except Exception:
            seo_geo_store = {}

    for slug in slugs:
        md_path = ROOT / "data" / "journal" / "de" / f"{slug}.md"
        if not md_path.exists():
            print(f"   ✗ {md_path} fehlt — übersprungen")
            continue
        meta, body_md = parse_frontmatter(md_path.read_text(encoding="utf-8"))
        title = meta.get("title", slug)
        excerpt = meta.get("excerpt", "")
        cover = meta.get("cover", "")
        cover_credit = meta.get("cover_credit", "")
        body_html = render_markdown(body_md)
        cover_html = ""
        if cover:
            cover_html = f'<p><img src="{html.escape(cover)}" alt="{html.escape(title)}" /></p>'
            if cover_credit:
                cover_html += f'<p class="gs-journal-post__credit">{html.escape(cover_credit)}</p>'

        ai_seo = seo_geo_store.get(f"journal:de:{slug}", {}) if isinstance(seo_geo_store, dict) else {}
        cfg = {
            "title": ai_seo.get("seo_title") or f"{title} - Gamet Studios Journal",
            "description": ai_seo.get("meta_description") or excerpt or meta.get("title", ""),
            "og_title": ai_seo.get("og_title") or title,
            "og_description": ai_seo.get("og_description") or excerpt or meta.get("title", ""),
            "locale": "de_DE",
            "url": f"/de/journal/{slug}",
        }
        meta_block = build_meta_block(
            cfg,
            image=cover if cover else None,
            image_alt=title,
            og_type="article",
        )
        faq_items = ai_seo.get("geo_faq") or []
        faq_ld = ""
        if isinstance(faq_items, list) and faq_items:
            faq_ld = '\n  <script type="application/ld+json">\n' + json.dumps({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": f.get("q", ""),
                        "acceptedAnswer": {"@type": "Answer", "text": f.get("a", "")},
                    }
                    for f in faq_items if isinstance(f, dict) and f.get("q") and f.get("a")
                ],
            }, indent=2, ensure_ascii=False) + "\n  </script>"

        html_doc = f"""<!doctype html>
<html lang="de" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{html.escape(cfg['title'])}</title>
  {meta_block}
  <link rel="icon" type="image/png" href="/assets/icons/favicon.png" />
  <link rel="stylesheet" href="/assets/css/fonts.css" />
  <link rel="stylesheet" href="/assets/css/tokens.css" />
  <link rel="stylesheet" href="/assets/css/reset.css" />
  <link rel="stylesheet" href="/assets/css/base.css" />
  <link rel="stylesheet" href="/assets/css/utilities.css" />
  <link rel="stylesheet" href="/assets/css/components.css" />
  <script type="text/plain" data-gs-src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
  <script type="text/plain" data-gs-src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
  <script type="text/plain" data-gs-src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script type="text/plain" data-gs-src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
  <script type="module" src="/assets/js/main.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <gs-header></gs-header>
  <main id="main">
    <gs-journal-post data-slug="{html.escape(slug)}"></gs-journal-post>
    <gs-journal-list data-limit="3" data-eyebrow="Weiterlesen" data-title="Mehr aus dem Journal"></gs-journal-list>
  </main>
  <gs-footer></gs-footer>

  <!-- Pre-rendered Post-Content (versteckt — nur für SEO/Crawler) -->
  <script type="application/ld+json">
{json.dumps({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": cfg["description"],
    "abstract": ai_seo.get("geo_summary") or excerpt,
    "keywords": ", ".join(ai_seo.get("keywords") or []),
    "author": {"@type": "Person", "name": meta.get("author", SITE_NAME)},
    "datePublished": meta.get("date", ""),
    "image": absolute_url(cover) if cover else absolute_url(OG_IMAGE),
    "url": absolute_url(f"/de/journal/{slug}"),
    "publisher": {"@type": "Organization", "name": SITE_NAME},
}, indent=2, ensure_ascii=False)}
  </script>{faq_ld}
  <noscript>
    <article class="container-narrow" style="padding-block:6rem;">
      <h1>{html.escape(title)}</h1>
      {cover_html}
      {body_html}
    </article>
  </noscript>
  <gs-cookie-banner></gs-cookie-banner>
</body>
</html>
"""
        out_path = target_dir / f"{slug}.html"
        out_path.write_text(html_doc, encoding="utf-8")
        print(f"   ✓ {out_path.relative_to(ROOT)}")

        build_journal_redirect_stub(slug, title, en_target_dir)
    print()


# ─── Entry ─────────────────────────────────────────────────────────────────

def main(argv: list[str]) -> int:
    print(f"Build root: {ROOT}")
    print(f"Site URL:   {SITE_URL}\n")

    update_static_pages()
    build_journal_pages()

    print("Fertig.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
