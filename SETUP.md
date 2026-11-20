# GS CMSS Framework — Setup & Erste Schritte

Dieses Dokument beschreibt Schritt für Schritt, wie du auf Basis des **GS CMSS Frameworks** eine komplett neue, eigene Webseite aufsetzt, konfigurierst und live schaltest.

---

## 1. Voraussetzungen auf dem Server (oder lokal)

- **PHP 8.1+** mit aktivierten Erweiterungen `pdo_sqlite`, `sqlite3` und `curl` (für Datenbank, Bild-Uploads, Discord-Webhook, Social-Feed & Turnstile)
- **Apache / Plesk** mit aktiviertem `mod_rewrite` (damit `.htaccess` saubere URLs ohne `.html` ausliefert und `/storage`, `/includes`, `/tools` sperrt)
- **Python 3** (optional, aber empfohlen für `tools/build.py` zur Generierung statischer Journal-Blogposts & SEO-/OpenGraph-Karten)
- **Schreibrechte** für den Webserver-Benutzer auf:
  - `storage/` (SQLite-Tresor-Datenbank)
  - `data/` (Seiten-, Layout-, Projekt-, Mitglieder- & Journal-Dateien)
  - `assets/icons/` & `assets/images/` (Medien-Uploads aus dem CMSS)
  - `de/` & `en/` (für neue Seiten und generierte Journal-HTMLs)

### Lokal auf dem Mac testen
Im Projektordner im Terminal ausführen:
```bash 
php -S localhost:8080 tools/router.php
```
Danach erreichst du:
- Webseite: `http://localhost:8080/de/`
- Gamet Studios CMSS: `http://localhost:8080/cms`

---

## 2. Ersten Administrator-Account anlegen (`/cms`)

1. Öffne im Browser **`https://deine-domain.de/cms`** (oder lokal `http://localhost:8080/cms`, funktioniert bewusst nur am Desktop).
2. Beim ersten Start mit einer frischen Blanko-Datenbank (`0` Accounts) erscheint automatisch der Einrichtungs-Screen **„Ersten Administrator-Account anlegen“** (Name, E-Mail, Passwort mit mind. 8 Zeichen).
3. Sobald du auf **„Account anlegen & CMSS starten“** klickst, wird dein Admin-Konto erstellt, du wirst direkt eingeloggt und die neue Instanz meldet sich beim Lizenz-Hub.
4. Weitere Team-Mitglieder (als `Admin` oder `Editor`) kannst du jederzeit unter **„Postfach & Accounts“ → „Accounts“** anlegen oder später **Authentik SSO (OIDC)** verbinden.

---

## 3. Marke, Logos, Farben & Version einstellen

Öffne oben im CMSS den Reiter **„Design & Framework“ → „Marke & Farben“**:

1. **Webseiten- / Markenname & Version (`v:`):**
   - Ändere „Meine Marke“ auf deinen Projektnamen.
   - Rechts neben dem Logo in der oberen CMSS-Leiste (oder hier im Tab) kannst du über `v:` deine eigene Versionsnummer eintragen (z. B. `1.0`).
2. **Logos & Favicon hochladen:**
   - Wähle bei „Logo-Darstellung“ entweder **Text-Logo** oder **Eigenes Logo-Bild (Dark / Light)**.
   - Lade ein helles Logo für den Dark Mode, ein dunkles Logo für den Light Mode sowie dein **Favicon** hoch.
3. **Farbschema festlegen:**
   - Wähle eine der 1-Klick-Farbpaletten oder stelle **Akzentfarbe (Dark/Light)**, **Zweitfarbe** und **Hintergründe** individuell per Farbwähler ein.
4. **Kino-Dekorationen & Ecken:**
   - Entscheide, ob die filmischen Deko-Elemente (Klammern/Filmklappen-Optik) an oder aus sein sollen (`Aus` für neutrale Unternehmens-/Portfolio-Seiten).
5. **Navigation & Footer (`Menü & Footer`):**
   - Passe die Menüpunkte für **DE** und **EN** (oben rechts umschaltbar) sowie den Footer-Text an.

---

## 4. Seiten, Übergänge, Hintergründe & Social-Media-Feed

Öffne den Reiter **„Seiten“**:

- **Seiten bearbeiten:** Wähle oben links eine der 3 Platzhalter-Seiten (`Startseite`, `Über uns`, `Kontakt`) oder klicke auf **`+ Neue Seite anlegen`**, um weitere Seiten (z. B. Leistungen, Portfolio, Team) zu erzeugen. Beim Speichern werden automatisch die passenden HTML-Dateien angelegt.
- **Abschnitte hinzufügen & sortieren:** Unten über **`Neuen Abschnitt unten anfügen`** kannst du Bausteine wie Hero, Feature-Karten, Projekte-Auswahl, Team, Text-Block, CTA, Journal-Übersicht, Formular oder den **Social-Media Live-Feed (`<gs-social-feed>`)** hinzufügen und mit `↑` / `↓` sortieren.
- **Klick in die Vorschau:** Klicke rechts in der Live-Vorschau direkt auf einen Abschnitt, um ihn links zu öffnen.
- **Übergang & Hintergrund:**
  - Im Tab **„Übergang“** wählst du die Überblendung zum vorherigen Abschnitt.
  - Im Tab **„Hintergrund“** kannst du pro Abschnitt ein **Bild oder Video** hochladen und exakt festlegen, welche Ränder weich auslaufen sollen (alle Seiten, nur oben/unten, nur unten, links/rechts oder Wolken-Spotlight).
- **Social-Media-Live-Feed einrichten:**
  - Plattform wählen (**YouTube, Instagram, X, TikTok, Bluesky, Mastodon, RSS**), Kanal-/Account-URL eintragen und auf **„↻ Jetzt testen & neusten Inhalt ziehen“** klicken. Bei 1 Kanal entsteht ein großes Spotlight, ab 2 Kanälen ein Grid.

---

## 5. Journal-Artikel in Markdown schreiben

Öffne den Reiter **„Journal“**:

1. Klicke auf **`+ Neuer Artikel`** (oder bearbeite den Platzhalter-Artikel `Willkommen im Journal`).
2. Nutze die **Markdown-Leiste** (`H2`, `H3`, `B`, `I`, `❝ Zitat`, `• Liste`, `Link`, `Code`) und den Assistenten **„🖼 + Bild in Text einbauen“**, um Bilder direkt hochzuladen und inklusive Bildunterschrift/Quelle sowie Größe (*Standard*, *Breit*, *Schmal*) an der Cursor-Position einzufügen.
3. Klicke unten auf **„✦ Speichern & Blog-Post generieren (`build.py`)“**, damit daraus eine vollwertige statische Blog-Seite (`/de/journal/<slug>`) samt SEO-/OpenGraph-Tags generiert wird.

---

## 6. Postfach, Discord-Webhook & Cloudflare Turnstile einrichten

Öffne den Reiter **„Postfach & Accounts“**:

- **Tab `Postfach`:** Hier landen alle Einsendungen der Kontakt- und Bewerbungsformulare. Du kannst sie als gelesen/beantwortet markieren, direkt per `mailto:` antworten oder löschen.
- **Tab `Discord Webhook`:**
  1. **Discord Webhook-URL:** Trage hier den Webhook **deines eigenen** Discord-Kanals ein (falls gewünscht), optional mit **Rollen-ID** für Pings und deiner **öffentlichen Webseiten-URL**. Leer lassen = keine Discord-Benachrichtigungen. Mit **„🔔 Test-Nachricht an Discord senden“** direkt testen.
  2. **Cloudflare Turnstile (CAPTCHA):** Erstelle in deinem Cloudflare-Dashboard ein Turnstile-Widget für deine Domain und trage **Site Key** + **Secret Key** ein. Danach erscheint Turnstile automatisch in allen Formularen und wird serverseitig vor dem Speichern geprüft.
- **Tab `Accounts`:** Team-Mitglieder hinzufügen, eigene Passwörter ändern oder alte Accounts entfernen. Diese Accounts gelten gemeinsam für `/cms` und `/admin/`.

---

## 7. Rechtliches & Domain vor dem Live-Gang anpassen

Bevor die Seite öffentlich geht, unbedingt noch folgende Dateien mit deinen eigenen Daten aktualisieren:

1. **Impressum:** `de/impressum.html` und `en/imprint.html` (Name, Anschrift, E-Mail, Vertretungsberechtigte)
2. **Datenschutz:** `de/datenschutz.html` und `en/privacy.html` (Verantwortlicher in Abschnitt 1, ggf. eingesetzte Dienste prüfen)
3. **Domain für SEO / OpenGraph / Discord:**
   - In `includes/config.php`: `SITE_URL` auf deine Domain setzen (z. B. `https://meine-domain.de`)
   - In `tools/build.py`: `SITE_URL` prüfen/anpassen und danach einmal `python3 tools/build.py` ausführen, damit alle `<meta property="og:...">` und Canonical-URLs auf deine neue Domain zeigen.

---

## 8. Sicherheits-Checkliste vor dem Go-Live

- [ ] **HTTPS / SSL** aktivieren (Session-Cookies setzen dann automatisch das `Secure`-Flag).
- [ ] Prüfen, dass **`https://deine-domain.de/storage/`**, **`/includes/`** und **`/tools/`** im Browser mit **`403 Forbidden`** blockiert werden (`.htaccess` muss aktiv sein).
- [ ] Alle Änderungen im CMSS über **`● Speichern`** oben rechts sichern.
- [ ] Optionales Test-Postfach prüfen und Test-Einsendungen löschen.