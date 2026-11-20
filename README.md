# Gamet Studios CMSS (v1.4)

Ein schnelles, modulares **Visual-CMS & Multi-Site-Framework** ohne Build-Server, ohne Node.js-Pflicht im Hosting und ohne MySQL — entwickelt für klassisches Shared-Hosting (Plesk, Apache, nginx) sowie lokale Entwicklung.

> **Lizenz:** Source-Available — siehe [`LICENSE`](LICENSE).  
> **Setup-Anleitung:** Siehe [`SETUP.md`](SETUP.md).  
> **Dokumentation:** Siehe [`DOCUMENTATION.md`](DOCUMENTATION.md).  
> **Updates & Community:** Die neusten verschlüsselten Core-Updates gibt es immer auf unserem [Discord](https://dsc.gg/gametstudios).

---

## Was dieses System besonders macht

- **Start-Dashboard & automatische Update-Benachrichtigung:** Übersicht über Seiten, Projekte, Mitglieder, Journal, Postfach und Medien. Zeigt automatisch ein Banner an, sobald eine neuere CMSS-Version verfügbar ist, plus Changelog-Modal nach jedem Update oder Hotfix.
- **Visual Drag & Drop Page Builder:**
  - Abschnitte direkt in der Live-Vorschau per **`⠿ Ziehen`** verschieben, duplizieren oder löschen.
  - **Bausteine-Palette:** `Spalten-Layout` (1–4 Spalten mit *Auto*-Sizing), `Textblock`, `Bild`, `Bild + Text`, `Video (YouTube/MP4)`, `Buttons`, `Zitat`, `FAQ / Accordion`, `Trenner / Abstand`, `CTA-Banner`, `Features`, `Projekte-Grid`, `Team-Grid`.
  - Bausteine lassen sich per Drag & Drop **ober-/unterhalb** oder **links/rechts neben** bestehende Elemente ziehen (erweitert automatisch um eine Spalte).
- **Siri-Style Command Palette (`Cmd + K` / `Strg + K`):** Natürliche Befehle wie *„Wartungsmodus an“*, *„Neuer Blogpost“*, *„Bild einfügen“*, *„Handy-Vorschau“* oder Seitennamen eintippen und direkt ausführen.
- **Cinema-Transition-Engine & Apple-Style Startbildschirm:** Flüssige Seitenübergänge, Scroll-Reveals (im Preview-Modus deaktiviert), Video-/Bild-Hintergründe pro Abschnitt (Blur, Opacity, Edge-Masking) und schneller Startbildschirm beim ersten Besuch / Neuladen.
- **Authentik SSO (OIDC) & Rollenmodell (`Admin` / `Editor`):**
  - OpenID Connect (PKCE) direkt in PHP ohne Composer.
  - Gruppen-Mapping für **Admins** (Vollzugriff) und **Editoren** (Inhalte, Journal, Medien & Postfach ohne System/Accounts/Export).
- **Medien & SEO-Automatisierung:**
  - Chunked Uploads (`512 KB` Multipart) + automatische **WebP-Konvertierung & Skalierung** (max. `1920px`).
  - Markierung ungenutzter Medien (`⚠ Ungenutzt`).
  - Pro-Seite **SEO- & OpenGraph-Editor**, **Redirect-Manager**, optional im CMSS editierbare **Rechtstexte** und automatische **`sitemap.xml`** beim Speichern.
- **Betrieb & Sicherheit:**
  - **System-Health-Check**, **automatische JSON-Snapshots** (letzte 15 Stände mit 1-Klick-Rollback), **SQLite-Audit-Log** und **Wartungsmodus** (Team arbeitet weiter normal).
  - Geschützte SQLite-Datenbank in `storage/.ht_gs_vault_9f4c2a8e1b7d3e6f.sqlite`, `.htaccess`-Sperren, Brute-Force-Rate-Limit, Cloudflare Turnstile, **SHA-256-Integritätssiegel** & **signierte Lizenz-Prüfung**.
- **Multi-Site & verschlüsselte Core-Updates:**
  - Strikte Trennung von System (`cms/`, `api/`, `includes/`, `assets/js/`, `assets/css/`, `tools/`, `admin/`) und Inhalten (`data/`, `assets/images/`, `storage/`).
  - **AES-256-verschlüsselte Core-Update-ZIPs** + **1-Klick-Blanko-Framework-Export** inkl. `SETUP.md`, `README.md`, `DOCUMENTATION.md` und `LICENSE`.

---

## Verzeichnisstruktur

```text
├── index.html               # Einstieg (Standard: /de/)
├── .htaccess                # Clean URLs & Schutz für storage/, includes/, tools/
├── SETUP.md                 # Schritt-für-Schritt-Setup (Plesk / Server / Lokal)
├── DOCUMENTATION.md         # Vollständiges CMSS-Handbuch
├── LICENSE                  # Gamet Studios Source-Available License
├── cms/                     # Visual CMSS Oberfläche (cms.js, index.php, changelog.json)
├── api/                     # Backend-Endpunkte (cms.php, oidc.php, submit.php, social-feed.php)
├── includes/                # DB, Auth/RBAC, OIDC, Discord, Integritäts- & Lizenzprüfung
├── admin/                   # Klassisches Postfach- & Formular-Dashboard
├── assets/
│   ├── css/                 # Design-Tokens, Reset, Base, Components
│   ├── js/                  # Web Components (<gs-*>) & Core-Module
│   ├── images/              # Medien-Ordner (backgrounds, projects, members, journal, og)
│   └── icons/               # Logos & Favicon
├── data/                    # JSON-Inhalte (site.json, layout.json, de/, en/, journal/)
├── storage/                 # Geschützte SQLite-DB & automatische Snapshots
└── tools/                   # Python Markdown-Builder (build.py) & Dev-Router (router.php)
```

---

## Schnellstart (Plesk / Hosting)

1. Dateien auf den Webserver (z. B. `httpdocs/`) hochladen.
2. Dateirechte setzen: **Ordner `755`**, **Dateien `644`** (inkl. `storage/.ht_gs_vault_9f4c2a8e1b7d3e6f.sqlite`).
3. `https://deine-domain.de/cms` öffnen und anmelden (Details in [`SETUP.md`](SETUP.md)).

### Lokaler Testserver
```bash
php -S localhost:8080 tools/router.php
```
Danach im Browser **`http://localhost:8080/cms`** öffnen.