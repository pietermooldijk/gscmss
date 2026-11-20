# Gamet Studios CMSS — Dokumentation (v1.4)

Vollständiges Handbuch für Redakteure und Administratoren.  
Für die Erstinstallation siehe [`SETUP.md`](SETUP.md) · Lizenzbedingungen siehe [`LICENSE`](LICENSE) · Kurzüberblick siehe [`README.md`](README.md).

---

## 1. System-Überblick

Das **Gamet Studios CMSS** besteht aus zwei klar getrennten Schichten:
1. **Systemkern (updatefähig per Core-Update):** `cms/`, `api/`, `includes/`, `assets/js/`, `assets/css/`, `tools/`, `admin/`, `.htaccess`
2. **Deine Inhalte & Daten (bleiben bei Updates erhalten):** `data/`, `assets/images/`, `assets/icons/`, `storage/`, `de/`, `en/`

---

## 2. Start-Dashboard, Update-Hinweise & Command Palette

### Start-Dashboard
Direkt nach dem Login unter `/cms` landest du auf dem **Start-Dashboard** mit:
- Schnellstatistiken (Seiten, Projekte, Mitglieder, Journal-Posts, ungelesene Postfach-Nachrichten, Medien)
- Direktaktionen (*Seiten bearbeiten*, *Neuer Blogpost*, *Design & Marke*, *System & Backups*)
- **Automatischer Update-Benachrichtigung:** Sobald auf `gametstudios.media` eine neuere CMSS-Version verfügbar ist, erscheint ein Hinweis-Banner mit direktem Link zum Discord (`https://dsc.gg/gametstudios`).

### Siri-Style Command Palette (`Cmd + K` / `Strg + K`)
Drücke überall im CMSS **`Cmd + K`** (Mac) bzw. **`Strg + K`** (Windows/Linux), um Aktionen per natürlicher Sprache auszuführen, z. B.:
- *„Startseite“*, *„Journal“*, *„Medien“*, *„Postfach“*
- *„Wartungsmodus an“* / *„Wartungsmodus aus“*
- *„Neuer Blogpost“*, *„Bild einfügen“*, *„Handy-Vorschau“*, *„Desktop-Vorschau“*
- *„Speichern“*

---

## 3. Visual Drag & Drop Page Builder

Im Reiter **„Seiten“** bearbeitest du bestehende Seiten oder legst über **`+ Neue Seite anlegen`** neue Seiten (DE & EN) an.

- **Direkt in der Live-Vorschau arbeiten:**
  - Klicke auf einen Abschnitt in der Vorschau, um ihn links im Editor zu öffnen.
  - Ziehe Abschnitte per **`⠿ Ziehen`** direkt an eine neue Position oder nutze die Toolbar (`↑`, `↓`, Duplizieren, Löschen).
- **Bausteine-Palette:**
  - `Spalten-Layout` (1–4 Spalten mit *Auto*-Sizing), `Textblock`, `Bild`, `Bild + Text`, `Video (YouTube/MP4)`, `Buttons`, `Zitat`, `FAQ / Accordion`, `Trenner / Abstand`, `CTA-Banner`, `Features`, `Projekte-Grid`, `Team-Grid`, `Social-Media-Feed`, `Kontaktformular`.
  - Bausteine lassen sich **ober-/unterhalb** oder **links/rechts neben** bestehende Elemente ziehen (erweitert automatisch um eine Spalte).
- **Übergänge & Hintergründe:** Pro Abschnitt lassen sich Überblendungen (`stage-curtain`, `glow-bridge` etc.) sowie Bild-/Video-Hintergründe inkl. Blur, Opacity und Edge-Masking konfigurieren.

---

## 4. Inhalte, Journal, Medien & SEO

### Journal (Markdown-Blog)
- Artikel liegen als Markdown unter `data/journal/{de,en}/`.
- Der Editor bietet eine Markdown-Toolbar, direkten Bild-Upload in den Text und **Draft-/Zeitplan-Steuerung** (`publishAt`).
- Beim Speichern erzeugt `tools/build.py` (falls Python 3 verfügbar) statische HTML-Blogposts samt OpenGraph-/Twitter-Karten.

### Medien-Manager
- **Chunked Uploads (`512 KB` Multipart):** Funktioniert zuverlässig auch bei großen Dateien auf Shared-Hosting.
- **Automatische WebP-Konvertierung & Skalierung:** Hochgeladene Bilder werden automatisch optimiert (max. `1920px`).
- **Ungenutzte Medien:** Bilder, die auf keiner Seite/Projekt/Mitglied/Journal verlinkt sind, werden mit `⚠ Ungenutzt` markiert.

### SEO, Redirects, Rechtstexte & Sitemap
- Pro Seite lassen sich **Meta-Title**, **Meta-Description** und **OpenGraph-Bild** pflegen.
- **Redirect-Manager:** Weiterleitungen (`von` → `nach`) direkt im CMSS pflegen.
- **Rechtstexte:** Impressum und Datenschutz können optional direkt im CMSS (`legalHtml`) bearbeitet werden.
- **`sitemap.xml`:** Wird beim Speichern im CMSS automatisch aktualisiert.

---

## 5. Benutzer, Authentik SSO & Sicherheit

### Rollenmodell (`Admin` vs. `Editor`)
- **`Admin`:** Vollzugriff inklusive Design/Framework, Accounts, System-Einstellungen, Snapshots, Audit-Log und ZIP-Import/-Export.
- **`Editor`:** Kann Seiten, Projekte, Mitglieder, Journal, Medien und Postfach bearbeiten — kein Zugriff auf System, Accounts oder Exporte.

### Authentik SSO (OIDC / PKCE)
- Unter *System / Einstellungen* konfigurierbar (`Issuer`, `Client ID`, `Client Secret`, `Admin-Gruppe`, `Editor-Gruppe`).
- Optionaler lokaler Notfall-Login über einstellbares Flag (`oidc_allow_local_fallback`).

### Betrieb & Notfall-Funktionen
- **Automatische Snapshots:** Vor jedem Speichern und Rollback wird automatisch ein JSON-Snapshot unter `storage/snapshots/` abgelegt (letzte 15 Stände, 1-Klick-Rollback).
- **System-Health-Check:** Prüft PHP-Version, Erweiterungen (`pdo_sqlite`, `gd`, `curl`, `zip`, `openssl`), Schreibrechte und Python-Verfügbarkeit.
- **Audit-Log:** Protokolliert alle wichtigen Änderungen (Speichern, Uploads, Rollback, Imports) in SQLite.
- **Wartungsmodus:** Sperrt das öffentliche Frontend mit individueller Meldung; eingeloggte Team-Mitglieder sehen die Seite normal weiter.

---

## 6. Core-Updates & Backups

- **Komplettes Backup (`.zip`):** Sichert `data/`, `assets/images/`, `assets/icons/` und `storage/` (inkl. SQLite-DB).
- **Core-Update (`.zip`):** Aktualisiert ausschließlich den Systemkern (`cms/`, `api/`, `includes/`, `assets/js/`, `assets/css/`, `tools/`, `admin/`, `.htaccess`). Alle Seiteninhalte und Bilder bleiben vollständig erhalten. Core-Update-ZIPs sind **AES-256-verschlüsselt** und werden vor dem Einspielen gegen Integrität und Hub-Status geprüft.
- **Blanko-Framework-Export:** Exportiert ein sauberes Starter-Paket ohne Kundendaten (`0` Accounts → automatischer Einrichtungs-Screen beim ersten Aufruf von `/cms`).

---

## 7. Lizenz & Integritätsschutz

Diese Software unterliegt der **Gamet Studios CMSS Source-Available License** ([`LICENSE`](LICENSE)).  
Der Systemkern ist durch ein **SHA-256-Integritätssiegel** (`includes/integrity.php`, `GS_INTEGRITY_SEAL`) sowie eine **signierte Lizenzprüfung** (`includes/telemetry.php`) geschützt. Veränderungen am geschützten Systemkern oder Umgehungen der Schutzmechanismen führen zur automatischen Deaktivierung der Instanz.