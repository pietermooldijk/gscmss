/**
 * Gamet Studios CMSS — Aufgeräumter Single-Sidebar Visual Editor & Multi-Site Framework
 */

const TRANSITIONS = [
  { id: 'stage-curtain', title: 'Weicher Übergang (Standard)', desc: 'Sanfte, fließende Überblendung zwischen den Abschnitten' },
  { id: 'glow-bridge', title: 'Farb-Überblendung (Akzent)', desc: 'Weicher Übergang in den eingestellten Markenfarben' },
  { id: 'film-perforation', title: 'Warme Überblendung', desc: 'Weicher Übergang mit warmem Akzentlicht' },
  { id: 'soft-wave', title: 'Dezente Überblendung', desc: 'Sehr leichter, zurückhaltender Übergang' },
  { id: 'diagonal-fade', title: 'Schräge Überblendung', desc: 'Sanfter diagonaler Übergangsverlauf' },
  { id: 'none', title: 'Kein Übergang (Direkt)', desc: 'Abschnitte schließen direkt aneinander an' },
];

const BG_EDGE_MODES = [
  { id: 'all-sides', title: 'Alle Seiten weich (Oben, Unten, Links & Rechts)', desc: 'Blendet das Bild/Video rundherum an allen 4 Rändern sanft aus' },
  { id: 'top-bottom', title: 'Oben & Unten weicher Übergang', desc: 'Fließender Übergang am oberen und unteren Rand' },
  { id: 'bottom', title: 'Nur unten weicher Übergang', desc: 'Oben voll sichtbar, nach unten sanft auslaufend' },
  { id: 'top', title: 'Nur oben weicher Übergang', desc: 'Von oben sanft einblendend, unten voll sichtbar' },
  { id: 'left-right', title: 'Links & Rechts weicher Übergang', desc: 'Blendet die linken und rechten Seitenränder weich aus' },
  { id: 'radial-cloud', title: 'Wolken-Spotlight (Extrem weich)', desc: 'Sehr weiter, wolkenartiger Übergang zu allen Seiten' },
  { id: 'none', title: 'Scharfe Ränder (Ohne Ausblendung)', desc: 'Füllt den gesamten Abschnitt bis zur Kante' },
];

const COMPONENT_NAMES = {
  'gs-hero': 'Hero-Kopfbereich',
  'gs-feature-cards': 'Manifest & Werte-Reihen',
  'gs-projects-grid': 'Projekte-Auswahl',
  'gs-marquee': 'Marken-Laufband (Marquee)',
  'gs-team-grid': 'Team & Mitglieder',
  'gs-text-block': 'Text-Abschnitt',
  'gs-cta': 'Call-to-Action Box',
  'gs-journal-list': 'Journal-Übersicht',
  'gs-contact-form': 'Kontakt- / Bewerbungsformular',
  'gs-social-feed': 'Social-Media Live-Feed (YouTube, Insta & Co.)',
  'gs-custom-block': 'Modularer Baustein',
};

const BUILDER_BLOCKS = [
  { tag: 'gs-custom-block', blockType: 'layout', icon: '📐', label: 'Spalten-Layout' },
  { tag: 'gs-custom-block', blockType: 'text', icon: '📝', label: 'Textblock' },
  { tag: 'gs-custom-block', blockType: 'image', icon: '🖼', label: 'Bild' },
  { tag: 'gs-custom-block', blockType: 'split', icon: '◧', label: 'Bild + Text' },
  { tag: 'gs-custom-block', blockType: 'video', icon: '🎬', label: 'Video' },
  { tag: 'gs-custom-block', blockType: 'buttons', icon: '🔘', label: 'Buttons' },
  { tag: 'gs-custom-block', blockType: 'quote', icon: '❝', label: 'Zitat' },
  { tag: 'gs-custom-block', blockType: 'faq', icon: '❓', label: 'FAQ / Accordion' },
  { tag: 'gs-custom-block', blockType: 'spacer', icon: '―', label: 'Trenner / Abstand' },
  { tag: 'gs-cta', blockType: '', icon: '📣', label: 'CTA-Banner' },
  { tag: 'gs-feature-cards', blockType: '', icon: '✦', label: 'Features / Werte' },
  { tag: 'gs-projects-grid', blockType: '', icon: '📁', label: 'Projekte-Grid' },
  { tag: 'gs-team-grid', blockType: '', icon: '👥', label: 'Team-Grid' },
];

const COMPONENT_TYPES = [
  { tag: 'gs-hero', label: 'Hero-Kopfbereich', defaultKey: 'home' },
  { tag: 'gs-feature-cards', label: 'Manifest & Werte-Reihen', defaultKey: 'home' },
  { tag: 'gs-projects-grid', label: 'Projekte-Auswahl', defaultKey: '' },
  { tag: 'gs-marquee', label: 'Marken-Laufband', defaultKey: 'brands' },
  { tag: 'gs-team-grid', label: 'Team & Mitglieder', defaultKey: '' },
  { tag: 'gs-social-feed', label: 'Social-Media Live-Feed (YouTube, Insta & Co.)', defaultKey: 'home' },
  { tag: 'gs-text-block', label: 'Text-Abschnitt', defaultKey: 'about' },
  { tag: 'gs-cta', label: 'Call-to-Action Box', defaultKey: 'join' },
  { tag: 'gs-journal-list', label: 'Journal-Übersicht', defaultKey: '' },
  { tag: 'gs-contact-form', label: 'Formular', defaultKey: 'contact' },
];

const state = {
  user: null,
  bootstrap: false,
  csrf: '',
  tab: 'dashboard', // 'dashboard' | 'pages' | 'projects' | 'members' | 'journal' | 'inbox' | 'framework' | 'media'
  lang: 'de',
  viewport: 'desktop',
  selectedPageKey: 'home',
  // Drill-down states (null = clean list view, number = focused item editor)
  editingSecIdx: null,
  secSubTab: 'content', // 'content' | 'transition'
  editingProjectIdx: null,
  editingMemberIdx: null,
  editingJournalIdx: null,
  inboxSubTab: 'messages', // 'messages' | 'webhook' | 'accounts'
  viewingSubmissionId: null,
  frameworkSubTab: 'brand', // 'brand' | 'nav' | 'portable'
  site: {},
  layout: { pages: {}, themeOverrides: {} },
  pagesDe: {},
  pagesEn: {},
  projectsDe: { items: [] },
  projectsEn: { items: [] },
  membersDe: { items: [] },
  membersEn: { items: [] },
  journal: [],
  images: [],
  submissions: [],
  users: [],
  systemSettings: {
    discord_webhook_url: '',
    discord_role_id: '',
    site_url: '',
  },
  dirty: false,
};

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(msg) {
  let el = document.querySelector('.cms-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'cms-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.remove(), 2800);
}

function activePagesData() {
  return state.lang === 'en' ? state.pagesEn : state.pagesDe;
}
function activeProjectsData() {
  return state.lang === 'en' ? state.projectsEn : state.projectsDe;
}
function activeMembersData() {
  return state.lang === 'en' ? state.membersEn : state.membersDe;
}

function transitionTitle(id) {
  return TRANSITIONS.find((t) => t.id === id)?.title || 'Direkt';
}

/**
 * Lädt beliebig große Bilder & Videos in 1-MB-Blöcken hoch,
 * damit niemals das 2-MB-Standardlimit von PHP greift.
 */
async function parseJsonResponse(res) {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(`HTTP ${res.status}: ${txt.replace(/<[^>]+>/g, ' ').trim().slice(0, 140) || 'Ungültige Server-Antwort'}`);
  }
}

async function uploadMediaFile(file, folder = 'backgrounds', onProgress = null) {
  const CHUNK_SIZE = 512 * 1024; // 512 KB pro Request (WAF- & Plesk-kompatibel)
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  let lastData = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
    const params = new URLSearchParams({
      action: 'upload_chunk',
      folder,
      name: file.name,
      index: String(i),
      total: String(totalChunks),
    });
    const fd = new FormData();
    fd.append('chunk', chunk, file.name);
    fd.append('csrf', state.csrf);

    const res = await fetch('/api/cms.php?' + params.toString(), {
      method: 'POST',
      headers: {
        'X-CSRF-Token': state.csrf,
      },
      body: fd,
    });
    lastData = await parseJsonResponse(res);
    if (!lastData.ok) {
      throw new Error(lastData.error || 'Upload fehlgeschlagen');
    }
    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }
  return lastData;
}

async function uploadZipFile(file, mode = 'full', onProgress = null) {
  const CHUNK_SIZE = 512 * 1024; // 512 KB Multipart-Chunks
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  let lastData = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
    const params = new URLSearchParams({
      action: 'import_zip_chunk',
      mode,
      index: String(i),
      total: String(totalChunks),
    });
    const fd = new FormData();
    fd.append('chunk', chunk, file.name);
    fd.append('csrf', state.csrf);

    const res = await fetch('/api/cms.php?' + params.toString(), {
      method: 'POST',
      headers: {
        'X-CSRF-Token': state.csrf,
      },
      body: fd,
    });
    lastData = await parseJsonResponse(res);
    if (!lastData.ok) {
      throw new Error(lastData.error || 'ZIP-Import fehlgeschlagen');
    }
    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }
  return lastData;
}

async function loadAll() {
  try {
    const res = await fetch('/api/cms.php', { cache: 'no-store' });
    const data = await parseJsonResponse(res);
    state.user = data.user || null;
  state.bootstrap = Boolean(data.bootstrap);
  state.oidc = data.oidc || { ready: false, allowLocal: true };
  state.csrf = data.csrf || '';
  state.site = data.site || {};
  state.layout = data.layout || { pages: {}, themeOverrides: {} };
  state.pagesDe = data.pagesDe || {};
  state.pagesEn = data.pagesEn || {};
  state.projectsDe = data.projectsDe || { items: [] };
  state.projectsEn = data.projectsEn || { items: [] };
  state.membersDe = data.membersDe || { items: [] };
  state.membersEn = data.membersEn || { items: [] };
  state.journal = data.journal || [];
  state.images = data.images || [];
  state.submissions = data.submissions || [];
  state.changelog = data.changelog || { latestId: '', releases: [] };
  state.updateNotice = data.updateNotice || null;
  state.unusedImages = data.unusedImages || [];
  state.snapshots = data.snapshots || [];
  state.auditLog = data.auditLog || [];
  state.health = data.health || [];
  state.hasControlHub = Boolean(data.hasControlHub);
  state.users = data.users || [];
  state.systemSettings = data.systemSettings || { discord_webhook_url: '', discord_role_id: '', site_url: '' };
  renderApp();
  } catch (err) {
    hideCmsSplash();
    const root = document.getElementById('gs-cms-app');
    if (root) {
      root.innerHTML = `<div class="cms-login"><div class="cms-login__card"><h2>CMSS-Ladefehler</h2><p style="color:var(--danger); font-size:13px;">${esc(err?.message || 'Unbekannter Fehler')}</p><button type="button" class="btn btn--primary" onclick="location.reload()">Neu laden</button></div></div>`;
    }
  }
}

function syncPreview(scrollSecId = null) {
  const iframe = document.getElementById('cms-preview-iframe');
  if (!iframe || !iframe.contentWindow) return;
  iframe.contentWindow.postMessage(
    {
      type: 'GS_CMS_LIVE_UPDATE',
      pageKey: state.selectedPageKey,
      site: state.site,
      layout: state.layout,
      pagesDe: state.pagesDe,
      pagesEn: state.pagesEn,
      projectsDe: state.projectsDe,
      projectsEn: state.projectsEn,
      membersDe: state.membersDe,
      membersEn: state.membersEn,
    },
    '*'
  );
  if (state.tab === 'journal' && state.editingJournalIdx !== null && state.journal[state.editingJournalIdx]) {
    iframe.contentWindow.postMessage(
      {
        type: 'GS_CMS_JOURNAL_PREVIEW',
        post: state.journal[state.editingJournalIdx],
      },
      '*'
    );
  }
  if (scrollSecId) {
    setTimeout(() => {
      iframe.contentWindow?.postMessage({ type: 'GS_CMS_SCROLL_TO', secId: scrollSecId }, '*');
    }, 60);
  }
}

function setPreviewFrameUrl(url) {
  const iframe = document.getElementById('cms-preview-iframe');
  const label = document.getElementById('cms-preview-url-label');
  if (iframe && !iframe.src.endsWith(url)) {
    iframe.src = url;
  }
  if (label) {
    label.textContent = url.replace(/[?&]cms_preview=1/, '');
  }
}

async function saveAll() {
  const btn = document.getElementById('cms-save-btn');
  if (btn) btn.textContent = 'Speichert…';

  const res = await fetch('/api/cms.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
    body: JSON.stringify({
      action: 'save_all',
      csrf: state.csrf,
      site: state.site,
      layout: state.layout,
      pagesDe: state.pagesDe,
      pagesEn: state.pagesEn,
      projectsDe: state.projectsDe,
      projectsEn: state.projectsEn,
      membersDe: state.membersDe,
      membersEn: state.membersEn,
      journal: state.journal,
      systemSettings: state.systemSettings,
    }),
  });
  const data = await res.json();
  if (data.ok) {
    state.dirty = false;
    if (Array.isArray(data.journal)) {
      state.journal = data.journal;
    }
    if (Array.isArray(data.unusedImages)) {
      state.unusedImages = data.unusedImages;
    }
    if (Array.isArray(data.snapshots)) {
      state.snapshots = data.snapshots;
    }
    if (Array.isArray(data.auditLog)) {
      state.auditLog = data.auditLog;
    }
    if (data.systemSettings) {
      state.systemSettings = data.systemSettings;
    }
    updateSaveBtn();
    const buildMsg = data.build?.ok ? ' · build.py ✓' : '';
    toast('✓ Gespeichert (' + data.savedAt + ')' + buildMsg);
    if (state.tab === 'journal' && state.editingJournalIdx !== null && state.journal[state.editingJournalIdx]) {
      const post = state.journal[state.editingJournalIdx];
      setPreviewFrameUrl(`/de/journal/${post.slug}?cms_preview=1`);
      renderSidebar();
    } else {
      syncPreview();
    }
  } else {
    updateSaveBtn();
    toast('Fehler: ' + (data.error || 'Unbekannt'));
  }
}

function markDirty() {
  state.dirty = true;
  updateSaveBtn();
}

function updateSaveBtn() {
  const btn = document.getElementById('cms-save-btn');
  if (!btn) return;
  btn.textContent = state.dirty ? '● Speichern' : '✓ Gespeichert';
}

function currentPreviewUrl() {
  const pageCfg = state.layout?.pages?.[state.selectedPageKey];
  const basePath = state.lang === 'en' ? (pageCfg?.pathEn || '/en/') : (pageCfg?.pathDe || '/de/');
  return `${basePath}?cms_preview=1`;
}

function isAdmin() {
  return (state.user?.role || 'admin') === 'admin';
}

function renderApp() {
  const root = document.getElementById('gs-cms-app');
  if (!root) return;

  const verVal = String(state.changelog?.releases?.[0]?.version || state.site?.version || '1.3').trim().replace(/^v/i, '');

  if (!state.user) {
    if (state.bootstrap) {
      root.innerHTML = `
        <div class="cms-login">
          <div class="cms-login__card">
            <img class="cms-login__logo" src="/assets/icons/gs_logo_small_white.png" alt="Gamet Studios" />
            <h1 style="font-family:var(--font-display); font-size:1.35rem; margin-bottom:0.35rem;">Gamet Studios CMSS ${verVal ? `<span style="font-size:0.85rem; color:var(--fg-subtle); font-weight:500;">v${esc(verVal)}</span>` : ''}</h1>
            <p style="color:var(--fg-muted); font-size:13px; margin-bottom:1.5rem;">
              Willkommen! Es gibt noch keinen Account für diese Webseite. Lege jetzt den ersten Administrator-Account an.
            </p>
            <form id="cms-bootstrap-form" style="display:flex; flex-direction:column; gap:0.85rem;">
              <div class="cms-field">
                <label>Dein Name</label>
                <input type="text" name="name" placeholder="z. B. Max Mustermann" required />
              </div>
              <div class="cms-field">
                <label>E-Mail-Adresse</label>
                <input type="email" name="email" placeholder="name@domain.de" required />
              </div>
              <div class="cms-field">
                <label>Passwort <span class="hint">mind. 8 Zeichen</span></label>
                <input type="password" name="password" minlength="8" required />
              </div>
              <div id="cms-login-err" style="color:var(--danger); font-size:12px; display:none;"></div>
              <button type="submit" class="btn btn--primary" style="width:100%; margin-top:0.25rem;">Account anlegen & CMSS starten</button>
            </form>
          </div>
        </div>
      `;

      document.getElementById('cms-bootstrap-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const err = document.getElementById('cms-login-err');
        if (err) {
          err.style.display = 'none';
          err.textContent = '';
        }
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Konto wird angelegt…';
        }
        try {
          const fd = new FormData(form);
          const res = await fetch('/api/cms.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'bootstrap_first_user',
              name: fd.get('name'),
              email: fd.get('email'),
              password: fd.get('password'),
            }),
          });
          const data = await parseJsonResponse(res);
          if (data.ok) {
            await loadAll();
            return;
          }
          if (err) {
            err.style.display = 'block';
            err.textContent = data.error || 'Fehler beim Anlegen des Accounts';
          }
        } catch (ex) {
          if (err) {
            err.style.display = 'block';
            err.textContent = ex?.message || 'Verbindungsfehler beim Anlegen des Accounts';
          }
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Account anlegen & CMSS starten';
        }
      });
      return;
    }

    const oidcErr = new URLSearchParams(location.search).get('oidc_error') || '';
    const oidcReady = Boolean(state.oidc?.ready);
    const allowLocal = state.oidc?.allowLocal !== false;

    const localFormHtml = `
      <form id="cms-login-form" style="display:flex; flex-direction:column; gap:0.85rem;">
        <div class="cms-field">
          <label>E-Mail</label>
          <input type="email" name="email" placeholder="deine@email.de" autocomplete="email" required />
        </div>
        <div class="cms-field">
          <label>Passwort</label>
          <input type="password" name="password" placeholder="••••••••" autocomplete="current-password" required />
        </div>
        <div id="cms-login-err" style="color:var(--danger); font-size:12px; display:${!oidcReady && oidcErr ? 'block' : 'none'};">${!oidcReady && oidcErr ? esc(oidcErr) : ''}</div>
        <button type="submit" class="btn ${oidcReady ? 'btn--secondary' : 'btn--primary'}" style="width:100%; margin-top:0.25rem;">Anmelden</button>
      </form>
    `;

    root.innerHTML = `
      <div class="cms-login">
        <div class="cms-login__card">
          <img class="cms-login__logo" src="/assets/icons/gs_logo_small_white.png" alt="Gamet Studios" />
          <h1 style="font-family:var(--font-display); font-size:1.35rem; margin-bottom:0.35rem;">Gamet Studios CMSS ${verVal ? `<span style="font-size:0.85rem; color:var(--fg-subtle); font-weight:500;">v${esc(verVal)}</span>` : ''}</h1>
          <p style="color:var(--fg-muted); font-size:13px; margin-bottom:1.5rem;">
            ${oidcReady
              ? 'Melde dich zentral über <strong>Authentik SSO</strong> an, um Seiten, Übergänge, Journal-Posts, Postfach und Einstellungen zu verwalten.'
              : 'Melde dich mit deinem Team-Account an, um Seiten, Übergänge, Journal-Posts, Postfach und Einstellungen zu verwalten.'}
          </p>
          ${oidcReady ? `
            ${oidcErr ? `<div style="color:var(--danger); font-size:12px; margin-bottom:0.85rem; padding:0.6rem 0.75rem; border:1px solid rgba(239,68,68,0.35); border-radius:8px; background:rgba(239,68,68,0.08);">${esc(oidcErr)}</div>` : ''}
            <a href="/api/oidc.php?action=login&app=cms" class="btn btn--primary" style="width:100%; justify-content:center; text-decoration:none;">
              Mit Authentik anmelden
            </a>
            ${allowLocal ? `
              <details style="margin-top:1.1rem; border-top:1px solid var(--border); padding-top:0.85rem;">
                <summary style="cursor:pointer; font-size:12px; color:var(--fg-subtle); text-align:center;">Lokaler Notfall-Login</summary>
                <div style="margin-top:0.85rem;">${localFormHtml}</div>
              </details>
            ` : ''}
          ` : localFormHtml}
          <div style="margin-top:1.25rem; text-align:center;">
            <a href="/de/" style="font-size:12px; color:var(--fg-subtle);">← Zurück zur Webseite</a>
          </div>
        </div>
      </div>
    `;

    document.getElementById('cms-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await fetch('/api/cms.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: fd.get('email'),
          password: fd.get('password'),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await loadAll();
      } else {
        const err = document.getElementById('cms-login-err');
        if (err) {
          err.style.display = 'block';
          err.textContent = data.error || 'Login fehlgeschlagen';
        }
      }
    });
    hideCmsSplash();
    return;
  }

  const previewUrl = currentPreviewUrl();
  const cleanLiveUrl = previewUrl.replace('?cms_preview=1', '');
  const admin = isAdmin();
  if (!admin && state.tab === 'framework') {
    state.tab = 'pages';
  }
  const roleLabel = admin ? 'Admin' : 'Editor';
  const unreadCount = (state.submissions || []).filter((s) => !s.read_at).length;

  root.innerHTML = `
    <div class="cms-shell">
      <header class="cms-topbar">
        <div class="cms-topbar__left" style="flex-shrink:0; gap:0.5rem;">
          <a href="/de/" class="cms-brand" style="gap:0.45rem; white-space:nowrap;">
            <img src="/assets/icons/gs_logo_small_white.png" alt="Gamet Studios" />
            <span>CMSS</span>
          </a>
          <button type="button" id="cms-changelog-btn" title="System-Version &amp; Neuigkeiten anzeigen" style="display:inline-flex; align-items:center; gap:0.25rem; background:var(--bg-card); border:1px solid var(--border); border-radius:99px; padding:0.18rem 0.55rem; font-size:11px; color:var(--fg-muted); font-weight:600; cursor:pointer; white-space:nowrap;">
            v${esc(verVal)}
          </button>
          <button type="button" id="cms-cmdk-btn" title="Befehls-Suche öffnen (Cmd+K / Strg+K)" style="display:inline-flex; align-items:center; gap:0.25rem; background:var(--bg-card); border:1px solid var(--border); border-radius:99px; padding:0.18rem 0.55rem; font-size:11px; color:var(--fg-subtle); font-weight:600; cursor:pointer; white-space:nowrap;">
            ⌘K
          </button>
        </div>

        <div class="cms-topbar__center">
          <nav class="cms-nav-pills">
            <button type="button" class="cms-tab ${state.tab === 'dashboard' ? 'is-active' : ''}" data-tab="dashboard">Dashboard</button>
            <button type="button" class="cms-tab ${state.tab === 'pages' ? 'is-active' : ''}" data-tab="pages">Seiten</button>
            <button type="button" class="cms-tab ${state.tab === 'projects' ? 'is-active' : ''}" data-tab="projects">Projekte</button>
            <button type="button" class="cms-tab ${state.tab === 'members' ? 'is-active' : ''}" data-tab="members">Mitglieder</button>
            <button type="button" class="cms-tab ${state.tab === 'journal' ? 'is-active' : ''}" data-tab="journal">Journal</button>
            <button type="button" class="cms-tab ${state.tab === 'inbox' ? 'is-active' : ''}" data-tab="inbox">
              Postfach ${unreadCount > 0 ? `<span id="cms-unread-pill" style="background:var(--accent); color:#fff; border-radius:99px; padding:0.05rem 0.42rem; font-size:10.5px; margin-left:0.25rem;">${unreadCount}</span>` : ''}
            </button>
            ${admin ? `<button type="button" class="cms-tab ${state.tab === 'framework' ? 'is-active' : ''}" data-tab="framework">System</button>` : ''}
            <button type="button" class="cms-tab ${state.tab === 'media' ? 'is-active' : ''}" data-tab="media">Medien</button>
          </nav>
        </div>

        <div class="cms-topbar__right" style="flex-shrink:0;">
          <div class="cms-nav-pills">
            <button type="button" class="cms-tab ${state.lang === 'de' ? 'is-active' : ''}" style="padding:0.28rem 0.6rem;" data-lang="de">DE</button>
            <button type="button" class="cms-tab ${state.lang === 'en' ? 'is-active' : ''}" style="padding:0.28rem 0.6rem;" data-lang="en">EN</button>
          </div>
          <a href="${esc(cleanLiveUrl)}" target="_blank" class="btn btn--secondary btn--sm" style="white-space:nowrap;">↗ Live</a>
          <button type="button" class="btn btn--primary btn--sm" id="cms-save-btn" style="white-space:nowrap;">
            ${state.dirty ? '● Speichern' : '✓ Gespeichert'}
          </button>
          <button type="button" class="btn btn--secondary btn--sm" id="cms-logout-btn" style="white-space:nowrap;" title="Angemeldet als ${esc(state.user.name)} (${esc(state.user.email)}) · Rolle: ${roleLabel} – Klicken zum Abmelden">
            Abmelden <span style="opacity:0.65; font-size:10.5px;">· ${roleLabel}</span>
          </button>
        </div>
      </header>

      <div class="cms-workspace">
        <aside class="cms-sidebar" id="cms-sidebar"></aside>
        <section class="cms-preview">
          <div class="cms-preview-bar">
            <span>Vorschau: <strong id="cms-preview-url-label">${esc(cleanLiveUrl)}</strong> · Klicke auf einen Abschnitt in der Vorschau zum Bearbeiten</span>
            <div style="display:flex; gap:0.25rem;">
              <button type="button" class="cms-tab ${state.viewport === 'desktop' ? 'is-active' : ''}" style="padding:0.2rem 0.6rem; font-size:11.5px;" data-vp="desktop">Desktop</button>
              <button type="button" class="cms-tab ${state.viewport === 'tablet' ? 'is-active' : ''}" style="padding:0.2rem 0.6rem; font-size:11.5px;" data-vp="tablet">Tablet</button>
              <button type="button" class="cms-tab ${state.viewport === 'mobile' ? 'is-active' : ''}" style="padding:0.2rem 0.6rem; font-size:11.5px;" data-vp="mobile">Mobile</button>
            </div>
          </div>
          <div class="cms-preview-stage">
            <iframe id="cms-preview-iframe" class="cms-preview-iframe" data-vp="${esc(state.viewport)}" src="${esc(previewUrl)}"></iframe>
          </div>
        </section>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.getAttribute('data-tab') || 'pages';
      state.editingSecIdx = null;
      state.editingProjectIdx = null;
      state.editingMemberIdx = null;
      state.editingJournalIdx = null;
      state.viewingSubmissionId = null;
      document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b === btn));

      // Vorschau automatisch auf die passende Unterseite wechseln
      const pageMapForTab = { projects: 'projects', members: 'members', journal: 'journal', inbox: 'contact' };
      if (pageMapForTab[state.tab] && state.layout?.pages?.[pageMapForTab[state.tab]]) {
        state.selectedPageKey = pageMapForTab[state.tab];
        const iframe = document.getElementById('cms-preview-iframe');
        const label = document.getElementById('cms-preview-url-label');
        const url = currentPreviewUrl();
        if (iframe && !iframe.src.endsWith(url)) iframe.src = url;
        if (label) label.textContent = url.replace('?cms_preview=1', '');
      }

      renderSidebar();
    });
  });

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lang = btn.getAttribute('data-lang') || 'de';
      document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('is-active', b === btn));
      const iframe = document.getElementById('cms-preview-iframe');
      const label = document.getElementById('cms-preview-url-label');
      const url = currentPreviewUrl();
      if (iframe) iframe.src = url;
      if (label) label.textContent = url.replace('?cms_preview=1', '');
      renderSidebar();
    });
  });

  document.querySelectorAll('[data-vp]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.viewport = btn.getAttribute('data-vp') || 'desktop';
      document.querySelectorAll('[data-vp]').forEach((b) => b.classList.toggle('is-active', b === btn));
      document.getElementById('cms-preview-iframe')?.setAttribute('data-vp', state.viewport);
    });
  });

  document.getElementById('cms-save-btn')?.addEventListener('click', saveAll);
  document.getElementById('cms-preview-iframe')?.addEventListener('load', () => syncPreview());

  document.getElementById('cms-topbar-version')?.addEventListener('input', (e) => {
    state.site.version = e.target.value.trim().replace(/^v/i, '');
    const fwVerInp = document.getElementById('cms-fw-version');
    if (fwVerInp) fwVerInp.value = state.site.version;
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-logout-btn')?.addEventListener('click', async () => {
    let redirectUrl = '';
    try {
      const res = await fetch('/api/cms.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
        body: JSON.stringify({ action: 'logout', csrf: state.csrf }),
      });
      const data = await res.json().catch(() => null);
      if (data?.redirect) redirectUrl = data.redirect;
    } catch {
      // ignore network error on logout
    }
    if (redirectUrl) {
      location.href = redirectUrl;
      return;
    }
    state.user = null;
    toast('✓ Aus dem Gamet Studios CMSS abgemeldet');
    renderApp();
  });

  document.getElementById('cms-changelog-btn')?.addEventListener('click', () => showChangelogModal(false));
  document.getElementById('cms-cmdk-btn')?.addEventListener('click', openCommandPalette);

  renderSidebar();
  hideCmsSplash();
  maybeShowChangelogModal();
}

const cmsSplashStart = performance.now();
const cmsNoSplash = new URLSearchParams(location.search).get('nosplash') === '1';
if (cmsNoSplash && history.replaceState) {
  const cleanUrl = location.pathname + (location.hash || '');
  history.replaceState(null, '', cleanUrl);
}

function hideCmsSplash() {
  const sp = document.getElementById('gs-cms-splash');
  if (!sp || sp.dataset.hiding === '1') return;
  sp.dataset.hiding = '1';
  if (cmsNoSplash) {
    sp.remove();
    return;
  }
  const waitMs = Math.max(0, 820 - (performance.now() - cmsSplashStart));
  setTimeout(() => {
    sp.style.opacity = '0';
    sp.style.transform = 'scale(0.985)';
    setTimeout(() => sp.remove(), 660);
  }, waitMs);
}

function showChangelogModal(markSeenOnClose = true) {
  const cl = state.changelog || { latestId: '', releases: [] };
  const releases = Array.isArray(cl.releases) ? cl.releases : [];
  if (!releases.length) return;
  const latest = releases[0];
  const older = releases.slice(1);
  const badgeColor = latest.type === 'hotfix' ? '#f59e0b' : 'var(--accent)';
  const badgeText = latest.type === 'hotfix' ? 'HOTFIX' : 'UPDATE';

  document.getElementById('gs-cms-changelog-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'gs-cms-changelog-modal';
  modal.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.72); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:1.5rem;';
  modal.innerHTML = `
    <div style="width:100%; max-width:560px; max-height:85vh; overflow:auto; background:var(--bg-elevated, #141417); border:1px solid var(--border); border-radius:14px; padding:1.5rem; box-shadow:0 24px 60px rgba(0,0,0,0.6);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; margin-bottom:0.75rem;">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:10.5px; font-weight:700; letter-spacing:0.06em; padding:0.18rem 0.5rem; border-radius:99px; background:${badgeColor}; color:#fff;">${badgeText}</span>
          <span style="font-size:12px; color:var(--fg-subtle);">v${esc(latest.version || '')} · ${esc(latest.date || '')}</span>
        </div>
        <button type="button" id="cms-cl-close-x" class="cms-icon-btn" style="font-size:1.25rem;">×</button>
      </div>
      <h2 style="font-family:var(--font-display); font-size:1.2rem; margin:0 0 0.85rem;">${esc(latest.title || 'Neues CMSS-Update')}</h2>
      <ul style="margin:0 0 1.15rem; padding-left:1.2rem; display:flex; flex-direction:column; gap:0.45rem; font-size:13px; color:var(--fg-muted); line-height:1.5;">
        ${(latest.changes || []).map((c) => `<li>${esc(c)}</li>`).join('')}
      </ul>
      ${older.length ? `
        <details style="margin-bottom:1.1rem; border-top:1px solid var(--border); padding-top:0.75rem;">
          <summary style="cursor:pointer; font-size:12px; color:var(--fg-subtle);">Frühere Updates & Hotfixes (${older.length})</summary>
          <div style="display:flex; flex-direction:column; gap:0.85rem; margin-top:0.75rem;">
            ${older.map((r) => `
              <div>
                <div style="font-size:12px; font-weight:600; color:var(--fg);">${r.type === 'hotfix' ? 'Hotfix' : 'Update'} · ${esc(r.title || r.id)} <span style="color:var(--fg-subtle); font-weight:400;">(${esc(r.date || '')})</span></div>
                <ul style="margin:0.35rem 0 0; padding-left:1.1rem; font-size:12px; color:var(--fg-muted); line-height:1.45;">
                  ${(r.changes || []).map((c) => `<li>${esc(c)}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </details>
      ` : ''}
      <button type="button" id="cms-cl-ack-btn" class="btn btn--primary" style="width:100%; justify-content:center;">Verstanden & schließen</button>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    if (markSeenOnClose && cl.latestId) {
      try {
        localStorage.setItem('gs_cmss_seen_release', String(cl.latestId));
      } catch { /* noop */ }
    }
    modal.remove();
  };
  document.getElementById('cms-cl-close-x')?.addEventListener('click', close);
  document.getElementById('cms-cl-ack-btn')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

function maybeShowChangelogModal() {
  const latestId = state.changelog?.latestId;
  if (!latestId) return;
  try {
    const seen = localStorage.getItem('gs_cmss_seen_release');
    if (seen !== String(latestId)) {
      showChangelogModal(true);
    }
  } catch { /* noop */ }
}

function renderSidebar(preserveScroll = true) {
  const sidebar = document.getElementById('cms-sidebar');
  if (!sidebar) return;
  const prevTop = preserveScroll ? sidebar.scrollTop : 0;

  if (state.tab === 'dashboard') {
    renderDashboardSidebar(sidebar);
  } else if (state.tab === 'pages') {
    if (state.editingSecIdx === null) {
      renderPagesOverview(sidebar);
    } else {
      renderFocusedSectionEditor(sidebar);
    }
  } else if (state.tab === 'projects') {
    renderProjectsSidebar(sidebar);
  } else if (state.tab === 'members') {
    renderMembersSidebar(sidebar);
  } else if (state.tab === 'journal') {
    renderJournalSidebar(sidebar);
  } else if (state.tab === 'inbox') {
    renderInboxSidebar(sidebar);
  } else if (state.tab === 'framework') {
    renderFrameworkSidebar(sidebar);
  } else if (state.tab === 'media') {
    renderMediaSidebar(sidebar);
  }

  if (preserveScroll && prevTop > 0) {
    sidebar.scrollTop = prevTop;
  }
}

function renderDashboardSidebar(sidebar) {
  const admin = isAdmin();
  const verVal = String(state.changelog?.releases?.[0]?.version || state.site?.version || '1.4').trim().replace(/^v/i, '');
  const upd = state.updateNotice || {};
  const discordUrl = upd.discordUrl || 'https://dsc.gg/gametstudios';
  const pageCount = Object.keys(state.layout?.pages || {}).length;
  const projCount = (activeProjectsData().items || []).length;
  const memCount = (activeMembersData().items || []).length;
  const jourCount = (state.journal || []).length;
  const unreadCount = (state.submissions || []).filter((s) => !s.read_at).length;
  const unusedCount = (state.unusedImages || []).length;

  sidebar.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.85rem;">
      <div>
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:var(--fg-subtle);">Willkommen zurück</div>
        <h2 style="font-family:var(--font-display); font-size:1.25rem; margin:0.15rem 0 0.25rem;">Hallo, ${esc(state.user?.name || 'Team')} 👋</h2>
        <div style="font-size:12px; color:var(--fg-muted);">
          Rolle: <strong>${admin ? 'Admin' : 'Editor'}</strong> · CMSS <strong>v${esc(verVal)}</strong> · Tipp: <code>⌘K</code> / <code>Strg+K</code>
        </div>
      </div>

      ${upd.hasUpdate ? `
        <div class="cms-upload-box" style="border-color:rgba(45,205,255,0.55); background:rgba(45,205,255,0.08);">
          <div style="font-size:12.5px; font-weight:700; color:#2dcdff; margin-bottom:0.25rem;">
            🚀 Neues CMSS-Update verfügbar (v${esc(upd.latestVersion || '')})
          </div>
          <div style="font-size:12px; color:var(--fg-muted); line-height:1.45; margin-bottom:0.65rem;">
            ${upd.latestTitle ? `<strong>${esc(upd.latestTitle)}</strong><br/>` : ''}
            Auf unserem Discord findest du immer das neuste verschlüsselte Core-Update.
          </div>
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            <a href="${esc(discordUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm" style="flex:1; justify-content:center; text-decoration:none;">
              💬 Zum Discord
            </a>
            ${admin ? `<button type="button" class="btn btn--secondary btn--sm" id="cms-dash-go-export">Update einspielen</button>` : ''}
          </div>
        </div>
      ` : `
        <div class="cms-acc" style="padding:0.65rem 0.8rem;">
          <div style="font-size:12px; color:var(--fg-muted); line-height:1.45;">
            ✓ System ist aktuell (<strong>v${esc(verVal)}</strong>). Neue Updates findest du immer auf unserem
            <a href="${esc(discordUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent); text-decoration:none; font-weight:600;">Discord ↗</a>.
          </div>
        </div>
      `}

      <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:0.5rem;">
        <button type="button" class="cms-row-card" data-dash-tab="pages" style="padding:0.65rem 0.75rem; text-align:left; cursor:pointer;">
          <div>
            <div style="font-size:1.1rem; font-weight:700;">${pageCount}</div>
            <div class="cms-row-card__meta">Seiten</div>
          </div>
          <span>📄</span>
        </button>
        <button type="button" class="cms-row-card" data-dash-tab="projects" style="padding:0.65rem 0.75rem; text-align:left; cursor:pointer;">
          <div>
            <div style="font-size:1.1rem; font-weight:700;">${projCount}</div>
            <div class="cms-row-card__meta">Projekte</div>
          </div>
          <span>📁</span>
        </button>
        <button type="button" class="cms-row-card" data-dash-tab="members" style="padding:0.65rem 0.75rem; text-align:left; cursor:pointer;">
          <div>
            <div style="font-size:1.1rem; font-weight:700;">${memCount}</div>
            <div class="cms-row-card__meta">Mitglieder</div>
          </div>
          <span>👥</span>
        </button>
        <button type="button" class="cms-row-card" data-dash-tab="journal" style="padding:0.65rem 0.75rem; text-align:left; cursor:pointer;">
          <div>
            <div style="font-size:1.1rem; font-weight:700;">${jourCount}</div>
            <div class="cms-row-card__meta">Journal-Posts</div>
          </div>
          <span>📰</span>
        </button>
        <button type="button" class="cms-row-card" data-dash-tab="inbox" style="padding:0.65rem 0.75rem; text-align:left; cursor:pointer;">
          <div>
            <div style="font-size:1.1rem; font-weight:700;">${unreadCount}</div>
            <div class="cms-row-card__meta">Ungelesen</div>
          </div>
          <span>📬</span>
        </button>
        <button type="button" class="cms-row-card" data-dash-tab="media" style="padding:0.65rem 0.75rem; text-align:left; cursor:pointer;">
          <div>
            <div style="font-size:1.1rem; font-weight:700;">${state.images.length}</div>
            <div class="cms-row-card__meta">Medien${unusedCount ? ` (${unusedCount} frei)` : ''}</div>
          </div>
          <span>🖼</span>
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.45rem;">
        <button type="button" class="btn btn--primary btn--sm" id="cms-dash-edit-pages" style="width:100%; justify-content:center;">
          ✏️ Seiten &amp; Bausteine bearbeiten
        </button>
        <button type="button" class="btn btn--secondary btn--sm" id="cms-dash-new-post" style="width:100%; justify-content:center;">
          + Neuen Journal-Artikel schreiben
        </button>
        <button type="button" class="btn btn--secondary btn--sm" id="cms-dash-cmdk" style="width:100%; justify-content:center;">
          ⌘K Befehlspalette öffnen
        </button>
        ${admin && state.hasControlHub ? `
          <a href="/control/" class="btn btn--secondary btn--sm" style="width:100%; justify-content:center; text-decoration:none; border-color:rgba(45,205,255,0.4); color:#2dcdff;">
            🛡️ Control Hub (/control/) öffnen
          </a>
        ` : ''}
      </div>
    </div>
  `;

  const goTab = (tab, fn = null) => {
    state.tab = tab;
    state.editingSecIdx = null;
    if (fn) fn();
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === tab));
    renderSidebar();
  };

  sidebar.querySelectorAll('[data-dash-tab]').forEach((el) => {
    el.addEventListener('click', () => goTab(el.getAttribute('data-dash-tab')));
  });
  document.getElementById('cms-dash-edit-pages')?.addEventListener('click', () => goTab('pages'));
  document.getElementById('cms-dash-new-post')?.addEventListener('click', () => { goTab('journal'); createNewJournalPostAndOpen(); });
  document.getElementById('cms-dash-cmdk')?.addEventListener('click', openCommandPalette);
  document.getElementById('cms-dash-go-export')?.addEventListener('click', () => goTab('framework', () => { state.frameworkSubTab = 'portable'; }));
}

/* ==========================================================================
   TAB 1: SEITEN (Aufgeräumte Übersicht -> Fokussierter Abschnitt-Editor)
   ========================================================================== */
function renderPagesOverview(sidebar) {
  const pages = state.layout?.pages || {};
  const pageCfg = pages[state.selectedPageKey] || { sections: [] };
  const sections = pageCfg.sections || [];

  sidebar.innerHTML = `
    <div class="cms-field">
      <label>
        <span>Aktuelle Seite</span>
        <button type="button" id="cms-new-page-btn" style="background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer;">+ Neue Seite anlegen</button>
      </label>
      <select id="cms-page-select">
        ${Object.entries(pages).map(([k, cfg]) => `
          <option value="${esc(k)}" ${k === state.selectedPageKey ? 'selected' : ''}>
            ${esc(cfg.label || k)} (${esc(state.lang === 'en' ? cfg.pathEn : cfg.pathDe)})
          </option>
        `).join('')}
      </select>
    </div>

    <div class="cms-pane-head" style="margin-top:0.25rem;">
      <span style="font-size:12.5px; font-weight:600; color:var(--fg-muted);">Abschnitte auf dieser Seite (${sections.length})</span>
    </div>

    <div class="cms-list">
      ${sections.map((sec, idx) => `
        <div class="cms-row-card ${sec.visible === false ? 'is-hidden' : ''}" data-open-sec="${idx}">
          <div>
            <div class="cms-row-card__title">${esc(COMPONENT_NAMES[sec.component] || sec.component)}</div>
            <div class="cms-row-card__meta">
              <span>◐ ${esc(transitionTitle(sec.transition || 'none'))}${sec.bgMedia ? ' · 🖼 Hintergrund aktiv' : ''}</span>
            </div>
          </div>
          <div class="cms-row-card__actions">
            <button type="button" class="cms-icon-btn" data-sec-up="${idx}" title="Nach oben">↑</button>
            <button type="button" class="cms-icon-btn" data-sec-down="${idx}" title="Nach unten">↓</button>
            <button type="button" class="cms-icon-btn" data-sec-vis="${idx}" title="Ein-/Ausblenden">${sec.visible === false ? '🚫' : '👁'}</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="cms-field" style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--border);">
      <label>🧩 Bausteine <span class="hint">in die Vorschau ziehen oder klicken</span></label>
      <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:0.4rem; margin-bottom:0.65rem;">
        ${BUILDER_BLOCKS.map((b, bi) => `
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            draggable="true"
            data-builder-idx="${bi}"
            style="justify-content:flex-start; gap:0.4rem; font-size:11.5px; padding:0.4rem 0.55rem; cursor:grab;"
          >
            <span>${b.icon}</span><span>${esc(b.label)}</span>
          </button>
        `).join('')}
      </div>
      <div style="display:flex; gap:0.5rem;">
        <select id="cms-add-sec-select">
          ${COMPONENT_TYPES.map((c) => `<option value="${esc(c.tag)}">${esc(c.label)}</option>`).join('')}
        </select>
        <button type="button" class="btn btn--secondary btn--sm" id="cms-add-sec-btn">+ Hinzufügen</button>
      </div>
    </div>

    <details class="cms-acc" style="margin-top:0.5rem;">
      <summary><span>🔍 SEO &amp; OpenGraph (${esc(state.lang.toUpperCase())})</span><span>▾</span></summary>
      <div class="cms-acc__body">
        <div class="cms-field">
          <label>Seitentitel (&lt;title&gt; / og:title)</label>
          <input type="text" id="cms-seo-title" value="${esc(activePagesData()[state.selectedPageKey]?.seo?.title || '')}" placeholder="Leer = Standard-HTML-Titel" />
        </div>
        <div class="cms-field">
          <label>Meta-Description</label>
          <textarea id="cms-seo-desc" rows="2" placeholder="Kurze Beschreibung für Google &amp; Social Media">${esc(activePagesData()[state.selectedPageKey]?.seo?.description || '')}</textarea>
        </div>
        <div class="cms-field">
          <label>OpenGraph-Bild URL <span class="hint">z. B. /assets/images/og/og-default.png</span></label>
          <input type="text" id="cms-seo-img" value="${esc(activePagesData()[state.selectedPageKey]?.seo?.ogImage || '')}" placeholder="/assets/images/og/..." />
        </div>
      </div>
    </details>

    ${(state.selectedPageKey === 'imprint' || state.selectedPageKey === 'privacy') ? `
      <details class="cms-acc">
        <summary><span>⚖️ Rechtstext direkt bearbeiten (${esc(state.lang.toUpperCase())})</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <p style="font-size:11.5px; color:var(--fg-muted); margin:0 0 0.45rem;">
            Optional: Wenn ausgefüllt, überschreibt dieser HTML-Text den statischen Text in der HTML-Datei. Leer lassen = statische HTML-Datei bleibt aktiv.
          </p>
          <div class="cms-field">
            <label>HTML-Inhalt</label>
            <textarea id="cms-legal-html" rows="6" style="font-family:var(--font-mono); font-size:11.5px;" placeholder="<h2>...</h2><p>...</p>">${esc(activePagesData()[state.selectedPageKey]?.legalHtml || '')}</textarea>
          </div>
        </div>
      </details>
    ` : ''}
  `;

  const ensurePageData = () => {
    const pagesObj = activePagesData();
    if (!pagesObj[state.selectedPageKey]) pagesObj[state.selectedPageKey] = {};
    if (!pagesObj[state.selectedPageKey].seo) pagesObj[state.selectedPageKey].seo = {};
    return pagesObj[state.selectedPageKey];
  };
  document.getElementById('cms-seo-title')?.addEventListener('input', (e) => {
    ensurePageData().seo.title = e.target.value;
    markDirty();
  });
  document.getElementById('cms-seo-desc')?.addEventListener('input', (e) => {
    ensurePageData().seo.description = e.target.value;
    markDirty();
  });
  document.getElementById('cms-seo-img')?.addEventListener('input', (e) => {
    ensurePageData().seo.ogImage = e.target.value;
    markDirty();
  });
  document.getElementById('cms-legal-html')?.addEventListener('input', (e) => {
    ensurePageData().legalHtml = e.target.value;
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-page-select')?.addEventListener('change', (e) => {
    state.selectedPageKey = e.target.value;
    state.editingSecIdx = null;
    const iframe = document.getElementById('cms-preview-iframe');
    const label = document.getElementById('cms-preview-url-label');
    const url = currentPreviewUrl();
    if (iframe) iframe.src = url;
    if (label) label.textContent = url.replace('?cms_preview=1', '');
    renderSidebar();
  });

  document.getElementById('cms-new-page-btn')?.addEventListener('click', () => {
    const name = prompt('Name der neuen Seite (z.B. Studio oder Showcase):');
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seite';
    state.layout.pages[slug] = {
      label: name,
      pathDe: `/de/${slug}`,
      pathEn: `/en/${slug}`,
      sections: [
        { id: `${slug}-hero`, component: 'gs-hero', key: slug, variant: 'sm', transition: 'none', visible: true },
        { id: `${slug}-text`, component: 'gs-text-block', key: slug, transition: 'stage-curtain', visible: true },
      ],
    };
    state.pagesDe[slug] = {
      hero: { eyebrow: name, title: name, subtitle: 'Willkommen auf der neuen Seite.' },
      text: { eyebrow: 'Überblick', title: 'Inhalt der Seite', body: ['Bearbeite diesen Text direkt im Gamet Studios CMSS.'] },
    };
    state.pagesEn[slug] = JSON.parse(JSON.stringify(state.pagesDe[slug]));
    state.selectedPageKey = slug;
    markDirty();
    saveAll();
    renderApp();
  });

  sidebar.querySelectorAll('[data-open-sec]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      state.editingSecIdx = Number(card.getAttribute('data-open-sec'));
      state.secSubTab = 'content';
      renderSidebar();
      const sec = sections[state.editingSecIdx];
      if (sec) syncPreview(sec.id);
    });
  });

  sidebar.querySelectorAll('[data-sec-up]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-sec-up'));
      if (i <= 0) return;
      [sections[i - 1], sections[i]] = [sections[i], sections[i - 1]];
      markDirty();
      renderSidebar();
      syncPreview(sections[i - 1].id);
    });
  });

  sidebar.querySelectorAll('[data-sec-down]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-sec-down'));
      if (i >= sections.length - 1) return;
      [sections[i + 1], sections[i]] = [sections[i], sections[i + 1]];
      markDirty();
      renderSidebar();
      syncPreview(sections[i + 1].id);
    });
  });

  sidebar.querySelectorAll('[data-sec-vis]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-sec-vis'));
      sections[i].visible = sections[i].visible === false ? true : false;
      markDirty();
      renderSidebar();
      syncPreview();
    });
  });

  document.getElementById('cms-add-sec-btn')?.addEventListener('click', () => {
    const tag = document.getElementById('cms-add-sec-select')?.value || 'gs-text-block';
    const def = COMPONENT_TYPES.find((c) => c.tag === tag);
    insertBuilderBlock({ tag, defaultKey: def?.defaultKey || state.selectedPageKey });
  });

  sidebar.querySelectorAll('[data-builder-idx]').forEach((btn) => {
    const block = BUILDER_BLOCKS[Number(btn.getAttribute('data-builder-idx'))];
    if (!block) return;
    btn.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('application/x-gs-block', JSON.stringify(block));
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
    });
    btn.addEventListener('click', () => insertBuilderBlock(block));
  });
}

function defaultBlockData(blockType) {
  if (blockType === 'layout') {
    return {
      blockType: 'layout',
      eyebrow: '',
      title: '',
      columns: 'auto',
      gap: 'md',
      items: [
        defaultBlockData('text'),
        defaultBlockData('image'),
      ],
    };
  }
  if (blockType === 'image') return { blockType: 'image', image: '/assets/images/og/og-default.png', alt: '', caption: '', width: 'narrow' };
  if (blockType === 'split') return { blockType: 'split', imagePos: 'left', image: '/assets/images/og/og-default.png', eyebrow: 'Highlight', title: 'Überschrift', body: ['Hier steht dein Text neben dem Bild.'], ctaLabel: '', ctaHref: '' };
  if (blockType === 'video') return { blockType: 'video', title: '', videoUrl: '', caption: '' };
  if (blockType === 'buttons') return { blockType: 'buttons', align: 'center', buttons: [{ label: 'Mehr erfahren', href: '/de/', style: 'primary' }] };
  if (blockType === 'quote') return { blockType: 'quote', quote: 'Gutes Design entsteht, wenn Form und Funktion zusammenfinden.', author: 'Gamet Studios' };
  if (blockType === 'faq') return { blockType: 'faq', title: 'Häufige Fragen', items: [{ q: 'Wie funktioniert das?', a: 'Du kannst jede Frage direkt im CMSS anpassen.' }] };
  if (blockType === 'spacer') return { blockType: 'spacer', height: 'md', line: true };
  return { blockType: 'text', eyebrow: '', title: 'Neuer Textblock', body: ['Schreibe hier deinen Absatz.'], align: 'left' };
}

function insertBuilderBlock(block, insertIdx = null) {
  const pageKey = state.selectedPageKey;
  const pageCfg = state.layout?.pages?.[pageKey];
  if (!pageCfg) return;
  if (!Array.isArray(pageCfg.sections)) pageCfg.sections = [];
  const uid = Date.now().toString(36);
  const tag = block.tag || 'gs-custom-block';
  const secKey = tag === 'gs-custom-block' ? `cb_${uid}` : (block.defaultKey || pageKey);
  const newSec = {
    id: `${pageKey}-${uid}`,
    component: tag,
    key: secKey,
    transition: tag === 'gs-custom-block' ? 'none' : 'stage-curtain',
    visible: true,
  };
  if (tag === 'gs-custom-block') {
    const seed = defaultBlockData(block.blockType || 'text');
    for (const langObj of [state.pagesDe, state.pagesEn]) {
      if (!langObj[pageKey]) langObj[pageKey] = {};
      langObj[pageKey][secKey] = JSON.parse(JSON.stringify(seed));
    }
  }
  const idx = insertIdx !== null && insertIdx >= 0 && insertIdx <= pageCfg.sections.length
    ? insertIdx
    : pageCfg.sections.length;
  pageCfg.sections.splice(idx, 0, newSec);
  state.tab = 'pages';
  state.editingSecIdx = idx;
  state.secSubTab = 'content';
  markDirty();
  renderSidebar();
  syncPreview(newSec.id);
}

function renderFocusedSectionEditor(sidebar) {
  const pageCfg = state.layout?.pages?.[state.selectedPageKey];
  const sections = pageCfg?.sections || [];
  const sec = sections[state.editingSecIdx];
  if (!sec) {
    state.editingSecIdx = null;
    renderPagesOverview(sidebar);
    return;
  }

  const pagesData = activePagesData();
  const dataKey = sec.key || state.selectedPageKey;

  sidebar.innerHTML = `
    <button type="button" class="cms-back-btn" id="cms-back-to-sections">
      ← Alle Abschnitte (${esc(pageCfg.label || state.selectedPageKey)})
    </button>

    <div class="cms-pane-head">
      <div class="cms-pane-title">${esc(COMPONENT_NAMES[sec.component] || sec.component)}</div>
      <span class="pill pill--outline">${state.lang.toUpperCase()}</span>
    </div>

    <div class="cms-subtabs" style="grid-template-columns:repeat(3,1fr);">
      <button type="button" class="cms-subtab ${state.secSubTab === 'content' ? 'is-active' : ''}" data-sec-subtab="content">Inhalt</button>
      <button type="button" class="cms-subtab ${state.secSubTab === 'background' ? 'is-active' : ''}" data-sec-subtab="background">Hintergrund</button>
      <button type="button" class="cms-subtab ${state.secSubTab === 'transition' ? 'is-active' : ''}" data-sec-subtab="transition">Übergang</button>
    </div>

    <div id="cms-sec-subbody" style="display:flex; flex-direction:column; gap:1rem;"></div>
  `;

  document.getElementById('cms-back-to-sections')?.addEventListener('click', () => {
    state.editingSecIdx = null;
    renderSidebar();
  });

  sidebar.querySelectorAll('[data-sec-subtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.secSubTab = btn.getAttribute('data-sec-subtab') || 'content';
      renderFocusedSectionEditor(sidebar);
    });
  });

  const subBody = document.getElementById('cms-sec-subbody');
  if (!subBody) return;

  if (state.secSubTab === 'background') {
    const curEdges = sec.bgEdges || 'all-sides';
    const curFeather = sec.bgFeather !== undefined ? sec.bgFeather : 32;
    const curOpacity = sec.bgOpacity !== undefined ? sec.bgOpacity : 0.32;
    const curBlur = sec.bgBlur !== undefined ? sec.bgBlur : 0;

    subBody.innerHTML = `
      <div class="cms-field">
        <label>
          <span>Hintergrund-Bild oder -Video</span>
          ${sec.bgMedia ? `<button type="button" id="cms-clear-bg" style="background:none; border:none; color:var(--danger); font-size:12px; cursor:pointer;">✕ Entfernen</button>` : ''}
        </label>
        <select id="cms-bg-pick">
          <option value="">— Aus Mediathek wählen —</option>
          ${state.images.map((m) => `<option value="${esc(m.url)}" ${sec.bgMedia === m.url ? 'selected' : ''}>[${esc(m.folder)}] ${esc(m.name)}</option>`).join('')}
        </select>
        <input type="text" id="cms-bg-url" value="${esc(sec.bgMedia || '')}" placeholder="Oder Bild-/Video-URL (/assets/... oder .mp4)" style="margin-top:0.35rem;" />
      </div>

      <form id="cms-bg-upload-form" class="cms-upload-box">
        <div class="cms-field">
          <label>Eigenes Bild oder Video (.mp4/.webm) hochladen</label>
          <input type="file" id="cms-bg-file-input" name="file" accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.mov" style="font-size:12.5px;" />
        </div>
        <button type="submit" class="btn btn--primary btn--sm" id="cms-bg-up-btn" style="width:100%;">Jetzt hochladen & als Hintergrund setzen</button>
      </form>

      <div class="cms-grid-2">
        <div class="cms-field">
          <label>Deckkraft <span id="cms-bg-op-val">${Math.round(curOpacity * 100)}%</span></label>
          <input type="range" id="cms-bg-opacity" min="0.05" max="1" step="0.05" value="${curOpacity}" />
        </div>
        <div class="cms-field">
          <label>Weichzeichner <span id="cms-bg-blur-val">${curBlur}px</span></label>
          <input type="range" id="cms-bg-blur" min="0" max="40" step="2" value="${curBlur}" />
        </div>
      </div>

      <div class="cms-field">
        <label>Breite des weichen Rand-Übergangs <span id="cms-bg-feather-val">${curFeather}%</span></label>
        <input type="range" id="cms-bg-feather" min="10" max="48" step="2" value="${curFeather}" />
      </div>

      <div class="cms-field">
        <label>Ränder-Darstellung (Weicher Übergang an den Seiten)</label>
        <div class="cms-trans-list">
          ${BG_EDGE_MODES.map((m) => `
            <div class="cms-trans-option ${curEdges === m.id ? 'is-active' : ''}" data-pick-edges="${esc(m.id)}">
              <div>
                <div class="cms-trans-option__title">${esc(m.title)}</div>
                <div class="cms-trans-option__desc">${esc(m.desc)}</div>
              </div>
              <span style="color:var(--accent); font-weight:700;">${curEdges === m.id ? '✓' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('cms-bg-pick')?.addEventListener('change', (e) => {
      sec.bgMedia = e.target.value;
      if (!sec.bgEdges) sec.bgEdges = 'all-sides';
      markDirty();
      renderFocusedSectionEditor(sidebar);
      syncPreview(sec.id);
    });

    document.getElementById('cms-bg-url')?.addEventListener('input', (e) => {
      sec.bgMedia = e.target.value.trim();
      if (!sec.bgEdges) sec.bgEdges = 'all-sides';
      markDirty();
      syncPreview(sec.id);
    });

    document.getElementById('cms-clear-bg')?.addEventListener('click', () => {
      delete sec.bgMedia;
      markDirty();
      renderFocusedSectionEditor(sidebar);
      syncPreview(sec.id);
    });

    const doBgUpload = async () => {
      const fileInput = document.getElementById('cms-bg-file-input');
      const file = fileInput?.files?.[0];
      if (!file) return;
      const upBtn = document.getElementById('cms-bg-up-btn');
      try {
        const data = await uploadMediaFile(file, 'backgrounds', (pct) => {
          if (upBtn) upBtn.textContent = `Lädt hoch (${pct}%)…`;
        });
        state.images = data.images || [];
        sec.bgMedia = data.uploaded;
        if (!sec.bgEdges) sec.bgEdges = 'all-sides';
        markDirty();
        toast('✓ Hintergrund hochgeladen & aktiviert');
        renderFocusedSectionEditor(sidebar);
        syncPreview(sec.id);
      } catch (err) {
        if (upBtn) upBtn.textContent = 'Jetzt hochladen & als Hintergrund setzen';
        toast('Fehler: ' + err.message);
      }
    };

    document.getElementById('cms-bg-upload-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      doBgUpload();
    });

    document.getElementById('cms-bg-file-input')?.addEventListener('change', () => {
      doBgUpload();
    });

    document.getElementById('cms-bg-feather')?.addEventListener('input', (e) => {
      sec.bgFeather = parseInt(e.target.value, 10) || 32;
      const lbl = document.getElementById('cms-bg-feather-val');
      if (lbl) lbl.textContent = `${sec.bgFeather}%`;
      markDirty();
      syncPreview(sec.id);
    });

    document.getElementById('cms-bg-opacity')?.addEventListener('input', (e) => {
      sec.bgOpacity = parseFloat(e.target.value);
      const lbl = document.getElementById('cms-bg-op-val');
      if (lbl) lbl.textContent = `${Math.round(sec.bgOpacity * 100)}%`;
      markDirty();
      syncPreview(sec.id);
    });

    document.getElementById('cms-bg-blur')?.addEventListener('input', (e) => {
      sec.bgBlur = parseInt(e.target.value, 10) || 0;
      const lbl = document.getElementById('cms-bg-blur-val');
      if (lbl) lbl.textContent = `${sec.bgBlur}px`;
      markDirty();
      syncPreview(sec.id);
    });

    subBody.querySelectorAll('[data-pick-edges]').forEach((el) => {
      el.addEventListener('click', () => {
        sec.bgEdges = el.getAttribute('data-pick-edges') || 'all-sides';
        markDirty();
        renderFocusedSectionEditor(sidebar);
        syncPreview(sec.id);
      });
    });
    return;
  }

  if (state.secSubTab === 'transition') {
    subBody.innerHTML = `
      <div class="cms-field">
        <label>Weiche Überblendung zum vorherigen Abschnitt</label>
        <div class="cms-trans-list">
          ${TRANSITIONS.map((t) => `
            <div class="cms-trans-option ${(sec.transition || 'none') === t.id ? 'is-active' : ''}" data-pick-trans="${esc(t.id)}">
              <div>
                <div class="cms-trans-option__title">${esc(t.title)}</div>
                <div class="cms-trans-option__desc">${esc(t.desc)}</div>
              </div>
              <span style="color:var(--accent); font-weight:700;">${(sec.transition || 'none') === t.id ? '✓' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>

      ${['gs-projects-grid', 'gs-team-grid'].includes(sec.component) ? `
        <div class="cms-field">
          <label>Maximale Anzahl gezeigter Kacheln <span class="hint">0 = Alle zeigen</span></label>
          <input type="number" id="cms-sec-limit" value="${Number(sec.limit) || 0}" min="0" max="50" />
        </div>
      ` : `
        <div class="cms-field">
          <label>Darstellungs-Größe</label>
          <select id="cms-sec-variant">
            <option value="" ${!sec.variant ? 'selected' : ''}>Groß (Standard)</option>
            <option value="sm" ${sec.variant === 'sm' ? 'selected' : ''}>Kompakt</option>
            <option value="wide" ${sec.variant === 'wide' ? 'selected' : ''}>Breit</option>
          </select>
        </div>
      `}

      <div style="padding-top:1rem; border-top:1px solid var(--border); display:flex; justify-content:space-between;">
        <button type="button" class="btn btn--secondary btn--sm" id="cms-del-sec-btn" style="color:var(--danger); border-color:var(--danger);">
          Abschnitt von Seite entfernen
        </button>
      </div>
    `;

    subBody.querySelectorAll('[data-pick-trans]').forEach((el) => {
      el.addEventListener('click', () => {
        sec.transition = el.getAttribute('data-pick-trans') || 'none';
        markDirty();
        renderFocusedSectionEditor(sidebar);
        syncPreview(sec.id);
      });
    });

    document.getElementById('cms-sec-limit')?.addEventListener('input', (e) => {
      sec.limit = parseInt(e.target.value, 10) || 0;
      markDirty();
      syncPreview(sec.id);
    });

    document.getElementById('cms-sec-variant')?.addEventListener('change', (e) => {
      sec.variant = e.target.value;
      markDirty();
      syncPreview(sec.id);
    });

    document.getElementById('cms-del-sec-btn')?.addEventListener('click', () => {
      if (!confirm('Diesen Abschnitt wirklich von der Seite entfernen?')) return;
      sections.splice(state.editingSecIdx, 1);
      state.editingSecIdx = null;
      markDirty();
      renderSidebar();
      syncPreview();
    });
  } else {
    subBody.innerHTML = renderCleanSectionContentHtml(sec, pagesData, dataKey);
    bindCleanSectionContentEvents(subBody, sec, pagesData, dataKey, sidebar);
  }
}

function renderCleanSectionContentHtml(sec, pagesData, key) {
  if (sec.component === 'gs-hero') {
    if (!pagesData[key]) pagesData[key] = {};
    if (!pagesData[key].hero) pagesData[key].hero = { eyebrow: '', title: '', subtitle: '', ctas: [], meta: [] };
    const h = pagesData[key].hero;
    return `
      <div class="cms-field">
        <label>Kleines Label oben (Eyebrow)</label>
        <input type="text" data-hero="eyebrow" value="${esc(h.eyebrow || '')}" />
      </div>
      <div class="cms-field">
        <label>Haupt-Überschrift</label>
        <textarea rows="3" data-hero="title">${esc(h.title || '')}</textarea>
      </div>
      <div class="cms-field">
        <label>Einleitungstext darunter</label>
        <textarea rows="3" data-hero="subtitle">${esc(h.subtitle || '')}</textarea>
      </div>
      <div class="cms-field">
        <label>
          <span>Buttons (${(h.ctas || []).length})</span>
          <button type="button" id="cms-add-hero-cta" style="background:none; border:none; color:var(--accent); font-size:12px; cursor:pointer;">+ Button</button>
        </label>
        ${(h.ctas || []).map((c, i) => `
          <details class="cms-acc" ${i === 0 ? 'open' : ''}>
            <summary><span>Button ${i + 1}: ${esc(c.label)}</span><span>▾</span></summary>
            <div class="cms-acc__body">
              <div class="cms-field"><label>Beschriftung</label><input type="text" data-hero-cta="${i}" data-k="label" value="${esc(c.label)}" /></div>
              <div class="cms-field"><label>Ziel-Link</label><input type="text" data-hero-cta="${i}" data-k="href" value="${esc(c.href)}" /></div>
            </div>
          </details>
        `).join('')}
      </div>
    `;
  }

  if (sec.component === 'gs-feature-cards') {
    if (!pagesData[key]) pagesData[key] = {};
    if (!pagesData[key].features) pagesData[key].features = { eyebrow: '', title: '', intro: '', items: [] };
    const f = pagesData[key].features;
    return `
      <div class="cms-field"><label>Kleines Label oben</label><input type="text" data-feat="eyebrow" value="${esc(f.eyebrow || '')}" /></div>
      <div class="cms-field"><label>Überschrift</label><input type="text" data-feat="title" value="${esc(f.title || '')}" /></div>
      <div class="cms-field"><label>Einleitung</label><textarea rows="2" data-feat="intro">${esc(f.intro || '')}</textarea></div>
      <div class="cms-field">
        <label>
          <span>Einträge (${(f.items || []).length})</span>
          <button type="button" id="cms-add-feat-item" style="background:none; border:none; color:var(--accent); font-size:12px; cursor:pointer;">+ Eintrag</button>
        </label>
        <div>
          ${(f.items || []).map((it, i) => `
            <details class="cms-acc" ${i === 0 ? 'open' : ''}>
              <summary><span>0${i + 1} · ${esc(it.title)}</span><span>▾</span></summary>
              <div class="cms-acc__body">
                <div class="cms-field"><label>Titel</label><input type="text" data-feat-item="${i}" data-k="title" value="${esc(it.title)}" /></div>
                <div class="cms-field"><label>Beschreibung</label><textarea rows="2" data-feat-item="${i}" data-k="body">${esc(it.body)}</textarea></div>
                <button type="button" class="btn btn--secondary btn--sm" data-del-feat-item="${i}" style="color:var(--danger);">Eintrag löschen</button>
              </div>
            </details>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (sec.component === 'gs-text-block') {
    if (!pagesData[key]) pagesData[key] = {};
    if (!pagesData[key].text) pagesData[key].text = { eyebrow: '', title: '', body: [] };
    const t = pagesData[key].text;
    const paragraphs = Array.isArray(t.body) ? t.body.join('\n\n') : String(t.body || '');
    return `
      <div class="cms-field"><label>Kleines Label oben</label><input type="text" data-txt="eyebrow" value="${esc(t.eyebrow || '')}" /></div>
      <div class="cms-field"><label>Überschrift</label><input type="text" data-txt="title" value="${esc(t.title || '')}" /></div>
      <div class="cms-field">
        <label>Fließtext <span class="hint">Leerzeile = neuer Absatz</span></label>
        <textarea rows="9" id="cms-txt-body">${esc(paragraphs)}</textarea>
      </div>
    `;
  }

  if (sec.component === 'gs-marquee') {
    if (!pagesData[key]) pagesData[key] = {};
    if (!pagesData[key].marquee) pagesData[key].marquee = { items: [] };
    const m = pagesData[key].marquee;
    return `
      <div class="cms-field">
        <label>Begriffe im Laufband <span class="hint">Ein Begriff pro Zeile</span></label>
        <textarea rows="8" id="cms-marquee-items">${esc((m.items || []).join('\n'))}</textarea>
      </div>
    `;
  }

  if (sec.component === 'gs-cta') {
    if (!pagesData[key]) pagesData[key] = {};
    if (!pagesData[key].cta) pagesData[key].cta = { eyebrow: '', title: '', subtitle: '', ctas: [] };
    const c = pagesData[key].cta;
    return `
      <div class="cms-field"><label>Kleines Label oben</label><input type="text" data-cta="eyebrow" value="${esc(c.eyebrow || '')}" /></div>
      <div class="cms-field"><label>Überschrift</label><input type="text" data-cta="title" value="${esc(c.title || '')}" /></div>
      <div class="cms-field"><label>Untertitel</label><textarea rows="2" data-cta="subtitle">${esc(c.subtitle || '')}</textarea></div>
      <div class="cms-field">
        <label>Buttons</label>
        ${(c.ctas || []).map((btn, i) => `
          <details class="cms-acc" ${i === 0 ? 'open' : ''}>
            <summary><span>Button ${i + 1}: ${esc(btn.label)}</span><span>▾</span></summary>
            <div class="cms-acc__body">
              <div class="cms-field"><label>Text</label><input type="text" data-cta-btn="${i}" data-k="label" value="${esc(btn.label)}" /></div>
              <div class="cms-field"><label>Link</label><input type="text" data-cta-btn="${i}" data-k="href" value="${esc(btn.href)}" /></div>
            </div>
          </details>
        `).join('')}
      </div>
    `;
  }

  if (sec.component === 'gs-projects-grid') {
    if (!pagesData.projectsHead) pagesData.projectsHead = { eyebrow: '', title: '', ctaLabel: '', ctaHref: '' };
    const ph = pagesData.projectsHead;
    const pList = activeProjectsData().items || [];
    return `
      <div class="cms-field"><label>Kleines Label oben</label><input type="text" data-phead="eyebrow" value="${esc(ph.eyebrow || '')}" /></div>
      <div class="cms-field"><label>Überschrift</label><input type="text" data-phead="title" value="${esc(ph.title || '')}" /></div>
      <div class="cms-grid-2">
        <div class="cms-field"><label>Button-Text</label><input type="text" data-phead="ctaLabel" value="${esc(ph.ctaLabel || '')}" /></div>
        <div class="cms-field"><label>Button-Link</label><input type="text" data-phead="ctaHref" value="${esc(ph.ctaHref || '')}" /></div>
      </div>
      <div class="cms-field" style="margin-top:0.5rem; padding-top:0.85rem; border-top:1px solid var(--border);">
        <label>
          <span>Projekte verwalten (${pList.length})</span>
          <button type="button" class="btn btn--primary btn--sm" id="cms-inline-add-proj" style="padding:0.25rem 0.65rem; font-size:12px;">+ Projekt hinzufügen</button>
        </label>
        <div class="cms-list" style="margin-top:0.35rem;">
          ${pList.map((p, i) => `
            <div class="cms-row-card" data-inline-edit-proj="${i}" style="padding:0.6rem 0.8rem;">
              <div class="cms-row-card__title" style="font-size:13px; margin:0;">${esc(p.title)}</div>
              <span style="font-size:12px; color:var(--accent);">Bearbeiten →</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (sec.component === 'gs-team-grid') {
    if (!pagesData.membersHead) pagesData.membersHead = { eyebrow: '', title: '', intro: '', ctaLabel: '', ctaHref: '' };
    const mh = pagesData.membersHead;
    const mList = activeMembersData().items || [];
    return `
      <div class="cms-field"><label>Kleines Label oben</label><input type="text" data-mhead="eyebrow" value="${esc(mh.eyebrow || '')}" /></div>
      <div class="cms-field"><label>Überschrift</label><input type="text" data-mhead="title" value="${esc(mh.title || '')}" /></div>
      <div class="cms-field"><label>Einleitung</label><textarea rows="2" data-mhead="intro">${esc(mh.intro || '')}</textarea></div>
      <div class="cms-field" style="margin-top:0.5rem; padding-top:0.85rem; border-top:1px solid var(--border);">
        <label>
          <span>Mitglieder verwalten (${mList.length})</span>
          <button type="button" class="btn btn--primary btn--sm" id="cms-inline-add-mem" style="padding:0.25rem 0.65rem; font-size:12px;">+ Mitglied hinzufügen</button>
        </label>
        <div class="cms-list" style="margin-top:0.35rem;">
          ${mList.map((m, i) => `
            <div class="cms-row-card" data-inline-edit-mem="${i}" style="padding:0.6rem 0.8rem;">
              <div>
                <div class="cms-row-card__title" style="font-size:13px; margin:0;">${esc(m.name)}</div>
                <div class="cms-row-card__meta" style="font-size:11px;">${esc(m.role || '')}</div>
              </div>
              <span style="font-size:12px; color:var(--accent);">Bearbeiten →</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (sec.component === 'gs-journal-list') {
    const jList = state.journal || [];
    return `
      <div class="cms-field">
        <label>
          <span>Journal-Artikel verwalten (${jList.length})</span>
          <button type="button" class="btn btn--primary btn--sm" id="cms-inline-add-journal" style="padding:0.25rem 0.65rem; font-size:12px;">+ Neuer Artikel</button>
        </label>
        <div class="cms-list" style="margin-top:0.35rem;">
          ${jList.map((j, i) => `
            <div class="cms-row-card" data-inline-edit-journal="${i}" style="padding:0.6rem 0.8rem;">
              <div>
                <div class="cms-row-card__title" style="font-size:13px; margin:0;">${esc(j.title)}</div>
                <div class="cms-row-card__meta" style="font-size:11px;">${esc(j.date || '')} · ${esc(j.category || 'Essay')}</div>
              </div>
              <span style="font-size:12px; color:var(--accent);">Markdown →</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (sec.component === 'gs-social-feed') {
    if (!pagesData[key]) pagesData[key] = {};
    if (!pagesData[key].socialFeed) {
      pagesData[key].socialFeed = {
        eyebrow: state.lang === 'en' ? 'Live from the collective' : 'Live aus dem Kollektiv',
        title: state.lang === 'en' ? 'Latest <span class="accent">content</span> & releases' : 'Neuste <span class="accent">Inhalte</span> & Releases',
        intro: state.lang === 'en'
          ? 'Automatically synced with our channels – always showing the latest video and newest post.'
          : 'Automatisch synchronisiert mit unseren Kanälen – immer das aktuellste Video und der neuste Beitrag.',
        items: [
          { platform: 'youtube', url: 'https://www.youtube.com/@gametstudios', label: '' },
          { platform: 'instagram', url: 'https://www.instagram.com/gametstudios', label: '' },
        ],
      };
    }
    const sf = pagesData[key].socialFeed;
    if (!Array.isArray(sf.items)) sf.items = [];

    const PLATFORMS = [
      { id: 'youtube', label: 'YouTube (Neustes Video vom Kanal)' },
      { id: 'instagram', label: 'Instagram (Neuster Post / Reel vom Account)' },
      { id: 'x', label: 'X / Twitter (Neuster Post vom Account)' },
      { id: 'tiktok', label: 'TikTok (Neustes Video vom Account)' },
      { id: 'bluesky', label: 'Bluesky (Neuster Post vom Account)' },
      { id: 'mastodon', label: 'Mastodon (Neuster Tröt vom Account)' },
      { id: 'rss', label: 'RSS / Podcast Feed (Neuste Folge / Beitrag)' },
    ];

    const PLACEHOLDERS = {
      youtube: 'https://www.youtube.com/@gametstudios',
      instagram: 'https://www.instagram.com/gametstudios',
      x: 'https://x.com/gametstudios',
      tiktok: 'https://www.tiktok.com/@gametstudios',
      bluesky: 'https://bsky.app/profile/handle.bsky.social',
      mastodon: 'https://mastodon.social/@user',
      rss: 'https://example.com/feed.xml',
    };

    return `
      <div class="cms-field"><label>Kleines Label oben</label><input type="text" data-sfeed="eyebrow" value="${esc(sf.eyebrow || '')}" /></div>
      <div class="cms-field"><label>Überschrift <span class="hint">Tipp: &lt;span class="accent"&gt;Wort&lt;/span&gt;</span></label><input type="text" data-sfeed="title" value="${esc(sf.title || '')}" /></div>
      <div class="cms-field"><label>Einleitung</label><textarea rows="2" data-sfeed="intro">${esc(sf.intro || '')}</textarea></div>

      <div class="cms-field" style="margin-top:0.35rem; padding-top:0.75rem; border-top:1px solid var(--border);">
        <label>
          <span>Verbundene Kanäle / Accounts (${sf.items.length})</span>
          <button type="button" id="cms-add-sfeed-item" style="background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer;">+ Kanal hinzufügen</button>
        </label>
        <span class="hint" style="margin-bottom:0.35rem;">
          Tipp: Bei <strong>1 Kanal</strong> wird ein großes Cinema-Spotlight dargestellt, ab <strong>2 Kanälen</strong> ein mehrspaltiges Grid. Das System zieht immer automatisch das neuste Video / den neusten Post!
        </span>

        <div>
          ${sf.items.map((it, i) => `
            <details class="cms-acc" ${i === 0 ? 'open' : ''}>
              <summary>
                <span>0${i + 1} · ${esc((it.platform || 'youtube').toUpperCase())} — ${esc(it.url || 'URL eingeben')}</span>
                <span>▾</span>
              </summary>
              <div class="cms-acc__body">
                <div class="cms-field">
                  <label>Plattform auswählen</label>
                  <select data-sfeed-item="${i}" data-k="platform">
                    ${PLATFORMS.map((p) => `<option value="${esc(p.id)}" ${it.platform === p.id ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
                  </select>
                </div>

                <div class="cms-field">
                  <label>Account- / Kanal-URL</label>
                  <input
                    type="text"
                    data-sfeed-item="${i}"
                    data-k="url"
                    value="${esc(it.url || '')}"
                    placeholder="${esc(PLACEHOLDERS[it.platform] || 'https://...')}"
                  />
                </div>

                <div class="cms-field">
                  <label>Eigenes Badge-Label <span class="hint">optional (leer = automatisch)</span></label>
                  <input
                    type="text"
                    data-sfeed-item="${i}"
                    data-k="label"
                    value="${esc(it.label || '')}"
                    placeholder="z. B. Neustes YouTube-Video"
                  />
                </div>

                <div id="cms-sfeed-test-res-${i}" style="display:none; padding:0.5rem 0.65rem; border-radius:6px; background:#09090c; border:1px solid var(--border); font-size:11.5px; color:#34d399; line-height:1.45;"></div>

                <div style="display:flex; gap:0.4rem;">
                  <button type="button" class="btn btn--secondary btn--sm" data-test-sfeed-item="${i}" style="flex:1; justify-content:center;">
                    ↻ Jetzt testen & neusten Inhalt ziehen
                  </button>
                  <button type="button" class="btn btn--secondary btn--sm" data-del-sfeed-item="${i}" style="color:var(--danger);">
                    Löschen
                  </button>
                </div>
              </div>
            </details>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (sec.component === 'gs-custom-block') {
    const pKey = state.selectedPageKey;
    if (!pagesData[pKey]) pagesData[pKey] = {};
    if (!pagesData[pKey][key]) pagesData[pKey][key] = defaultBlockData('text');
    const cb = pagesData[pKey][key];
    const bType = cb.blockType || 'text';
    const mediaOpts = (state.images || [])
      .filter((m) => m.type !== 'video')
      .map((m) => `<option value="${esc(m.url)}" ${cb.image === m.url ? 'selected' : ''}>${esc(m.folder)}/${esc(m.name)}</option>`)
      .join('');
    const bodyText = Array.isArray(cb.body) ? cb.body.join('\n\n') : String(cb.body || '');

    return `
      <div class="cms-field">
        <label>Baustein-Typ</label>
        <select id="cms-cb-type">
          ${[
            ['layout', '📐 Spalten-Layout (1–4 Spalten)'],
            ['text', '📝 Textblock'],
            ['image', '🖼 Bild'],
            ['split', '◧ Bild + Text (2-Spalten)'],
            ['video', '🎬 Video (MP4 / YouTube)'],
            ['buttons', '🔘 Buttons'],
            ['quote', '❝ Zitat'],
            ['faq', '❓ FAQ / Accordion'],
            ['spacer', '― Trenner / Abstand'],
          ].map(([v, l]) => `<option value="${v}" ${bType === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      ${bType === 'layout' ? `
        <div class="cms-grid-2">
          <div class="cms-field">
            <label>Spalten</label>
            <select id="cms-cb-cols">
              <option value="auto" ${(!cb.columns || cb.columns === 'auto') ? 'selected' : ''}>Auto (passt sich Elementen an)</option>
              ${[1, 2, 3, 4].map((n) => `<option value="${n}" ${Number(cb.columns) === n ? 'selected' : ''}>${n} Spalte${n > 1 ? 'n' : ''}</option>`).join('')}
            </select>
          </div>
          <div class="cms-field">
            <label>Abstand</label>
            <select data-cb="gap">
              <option value="sm" ${cb.gap === 'sm' ? 'selected' : ''}>Kompakt</option>
              <option value="md" ${(!cb.gap || cb.gap === 'md') ? 'selected' : ''}>Normal</option>
              <option value="lg" ${cb.gap === 'lg' ? 'selected' : ''}>Groß</option>
            </select>
          </div>
        </div>
        <div class="cms-field"><label>Überschrift über Layout (optional)</label><input type="text" data-cb="title" value="${esc(cb.title || '')}" /></div>
        <div class="cms-field">
          <label>
            <span>Elemente im Layout (${(cb.items || []).length})</span>
            <select id="cms-cb-layout-add" style="width:auto; font-size:11.5px; padding:0.2rem 0.4rem;">
              <option value="">+ Element einfügen…</option>
              <option value="text">📝 Textblock</option>
              <option value="image">🖼 Bild</option>
              <option value="video">🎬 Video</option>
              <option value="buttons">🔘 Buttons</option>
              <option value="quote">❝ Zitat</option>
              <option value="faq">❓ FAQ</option>
            </select>
          </label>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${(cb.items || []).map((it, li) => `
              <details class="cms-acc" ${li === 0 ? 'open' : ''}>
                <summary>
                  <span>${li + 1}. ${esc(it.blockType || 'text')} ${it.title ? `· ${esc(it.title).slice(0, 18)}` : ''}</span>
                  <span style="display:inline-flex; gap:0.2rem;">
                    <button type="button" class="cms-icon-btn" data-li-up="${li}" title="Vor">↑</button>
                    <button type="button" class="cms-icon-btn" data-li-down="${li}" title="Zurück">↓</button>
                    <button type="button" class="cms-icon-btn" data-li-del="${li}" style="color:var(--danger);" title="Löschen">×</button>
                  </span>
                </summary>
                <div class="cms-acc__body">
                  ${it.blockType === 'text' ? `
                    <div class="cms-field"><label>Titel</label><input type="text" data-li-f="${li}" data-k="title" value="${esc(it.title || '')}" /></div>
                    <div class="cms-field"><label>Text</label><textarea rows="3" data-li-body="${li}">${esc(Array.isArray(it.body) ? it.body.join('\n\n') : (it.body || ''))}</textarea></div>
                  ` : ''}
                  ${it.blockType === 'image' ? `
                    <div class="cms-field"><label>Bild wählen</label><select data-li-f="${li}" data-k="image"><option value="">— Bild —</option>${(state.images || []).filter((m) => m.type !== 'video').map((m) => `<option value="${esc(m.url)}" ${it.image === m.url ? 'selected' : ''}>${esc(m.folder)}/${esc(m.name)}</option>`).join('')}</select></div>
                    <div class="cms-field"><label>Bildunterschrift</label><input type="text" data-li-f="${li}" data-k="caption" value="${esc(it.caption || '')}" /></div>
                  ` : ''}
                  ${it.blockType === 'video' ? `
                    <div class="cms-field"><label>Video-URL (YouTube / MP4)</label><input type="text" data-li-f="${li}" data-k="videoUrl" value="${esc(it.videoUrl || '')}" /></div>
                    <div class="cms-field"><label>Titel</label><input type="text" data-li-f="${li}" data-k="title" value="${esc(it.title || '')}" /></div>
                  ` : ''}
                  ${it.blockType === 'quote' ? `
                    <div class="cms-field"><label>Zitat</label><textarea rows="2" data-li-f="${li}" data-k="quote">${esc(it.quote || '')}</textarea></div>
                    <div class="cms-field"><label>Autor</label><input type="text" data-li-f="${li}" data-k="author" value="${esc(it.author || '')}" /></div>
                  ` : ''}
                  ${it.blockType === 'buttons' ? `
                    <div class="cms-field"><label>Button-Text</label><input type="text" data-li-btn="${li}" data-k="label" value="${esc(it.buttons?.[0]?.label || 'Mehr erfahren')}" /></div>
                    <div class="cms-field"><label>Button-Link</label><input type="text" data-li-btn="${li}" data-k="href" value="${esc(it.buttons?.[0]?.href || '/de/')}" /></div>
                  ` : ''}
                  ${it.blockType === 'faq' ? `
                    <div class="cms-field"><label>Frage</label><input type="text" data-li-faq="${li}" data-k="q" value="${esc(it.items?.[0]?.q || '')}" /></div>
                    <div class="cms-field"><label>Antwort</label><textarea rows="2" data-li-faq="${li}" data-k="a">${esc(it.items?.[0]?.a || '')}</textarea></div>
                  ` : ''}
                </div>
              </details>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${bType === 'text' ? `
        <div class="cms-field"><label>Kleines Label oben</label><input type="text" data-cb="eyebrow" value="${esc(cb.eyebrow || '')}" /></div>
        <div class="cms-field"><label>Überschrift</label><input type="text" data-cb="title" value="${esc(cb.title || '')}" /></div>
        <div class="cms-field"><label>Absätze <span class="hint">Leerzeile = neuer Absatz</span></label><textarea rows="5" id="cms-cb-body">${esc(bodyText)}</textarea></div>
        <div class="cms-field"><label>Ausrichtung</label><select data-cb="align"><option value="left" ${cb.align !== 'center' ? 'selected' : ''}>Links</option><option value="center" ${cb.align === 'center' ? 'selected' : ''}>Zentriert</option></select></div>
      ` : ''}
      ${bType === 'image' ? `
        <div class="cms-field"><label>Bild aus Medien wählen</label><select id="cms-cb-img-pick"><option value="">— Bild wählen —</option>${mediaOpts}</select></div>
        <div class="cms-field"><label>Oder Bild-URL</label><input type="text" data-cb="image" id="cms-cb-img" value="${esc(cb.image || '')}" /></div>
        <div class="cms-field"><label>Bildunterschrift</label><input type="text" data-cb="caption" value="${esc(cb.caption || '')}" /></div>
        <div class="cms-field"><label>Alt-Text</label><input type="text" data-cb="alt" value="${esc(cb.alt || '')}" /></div>
        <div class="cms-field"><label>Breite</label><select data-cb="width"><option value="narrow" ${cb.width !== 'wide' ? 'selected' : ''}>Normal (820px)</option><option value="wide" ${cb.width === 'wide' ? 'selected' : ''}>Breit (1180px)</option></select></div>
      ` : ''}
      ${bType === 'split' ? `
        <div class="cms-field"><label>Bild-Position</label><select data-cb="imagePos"><option value="left" ${cb.imagePos !== 'right' ? 'selected' : ''}>Bild links · Text rechts</option><option value="right" ${cb.imagePos === 'right' ? 'selected' : ''}>Text links · Bild rechts</option></select></div>
        <div class="cms-field"><label>Bild wählen</label><select id="cms-cb-img-pick"><option value="">— Bild wählen —</option>${mediaOpts}</select></div>
        <div class="cms-field"><label>Bild-URL</label><input type="text" data-cb="image" id="cms-cb-img" value="${esc(cb.image || '')}" /></div>
        <div class="cms-field"><label>Kleines Label oben</label><input type="text" data-cb="eyebrow" value="${esc(cb.eyebrow || '')}" /></div>
        <div class="cms-field"><label>Überschrift</label><input type="text" data-cb="title" value="${esc(cb.title || '')}" /></div>
        <div class="cms-field"><label>Text</label><textarea rows="4" id="cms-cb-body">${esc(bodyText)}</textarea></div>
        <div class="cms-grid-2">
          <div class="cms-field"><label>Button-Text (optional)</label><input type="text" data-cb="ctaLabel" value="${esc(cb.ctaLabel || '')}" /></div>
          <div class="cms-field"><label>Button-Link</label><input type="text" data-cb="ctaHref" value="${esc(cb.ctaHref || '')}" /></div>
        </div>
      ` : ''}
      ${bType === 'video' ? `
        <div class="cms-field"><label>Überschrift (optional)</label><input type="text" data-cb="title" value="${esc(cb.title || '')}" /></div>
        <div class="cms-field"><label>Video-URL <span class="hint">YouTube-Link oder /assets/images/...mp4</span></label><input type="text" data-cb="videoUrl" value="${esc(cb.videoUrl || '')}" placeholder="https://www.youtube.com/watch?v=..." /></div>
        <div class="cms-field"><label>Unterschrift (optional)</label><input type="text" data-cb="caption" value="${esc(cb.caption || '')}" /></div>
      ` : ''}
      ${bType === 'buttons' ? `
        <div class="cms-field"><label>Ausrichtung</label><select data-cb="align"><option value="center" ${cb.align !== 'left' ? 'selected' : ''}>Zentriert</option><option value="left" ${cb.align === 'left' ? 'selected' : ''}>Links</option></select></div>
        <div class="cms-field">
          <label><span>Buttons</span><button type="button" id="cms-cb-add-btn" style="background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer;">+ Button</button></label>
          <div style="display:flex; flex-direction:column; gap:0.45rem;">
            ${(cb.buttons || []).map((b, bi) => `
              <div style="display:flex; gap:0.35rem; align-items:center;">
                <input type="text" data-cb-btn="${bi}" data-k="label" value="${esc(b.label || '')}" placeholder="Text" style="flex:1; min-width:0; font-size:11.5px;" />
                <input type="text" data-cb-btn="${bi}" data-k="href" value="${esc(b.href || '')}" placeholder="/de/..." style="flex:1; min-width:0; font-size:11.5px;" />
                <select data-cb-btn="${bi}" data-k="style" style="width:5.5rem; font-size:11px;"><option value="primary" ${b.style !== 'secondary' ? 'selected' : ''}>Primär</option><option value="secondary" ${b.style === 'secondary' ? 'selected' : ''}>Sekundär</option></select>
                <button type="button" class="cms-icon-btn" data-cb-del-btn="${bi}" style="color:var(--danger);">×</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${bType === 'quote' ? `
        <div class="cms-field"><label>Zitat</label><textarea rows="3" data-cb="quote">${esc(cb.quote || '')}</textarea></div>
        <div class="cms-field"><label>Autor / Quelle</label><input type="text" data-cb="author" value="${esc(cb.author || '')}" /></div>
      ` : ''}
      ${bType === 'faq' ? `
        <div class="cms-field"><label>Überschrift</label><input type="text" data-cb="title" value="${esc(cb.title || '')}" /></div>
        <div class="cms-field">
          <label><span>Fragen &amp; Antworten</span><button type="button" id="cms-cb-add-faq" style="background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer;">+ Frage</button></label>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${(cb.items || []).map((it, fi) => `
              <div class="cms-acc" style="padding:0.55rem; display:flex; flex-direction:column; gap:0.35rem;">
                <input type="text" data-cb-faq="${fi}" data-k="q" value="${esc(it.q || '')}" placeholder="Frage..." style="font-size:12px;" />
                <textarea rows="2" data-cb-faq="${fi}" data-k="a" placeholder="Antwort..." style="font-size:12px;">${esc(it.a || '')}</textarea>
                <button type="button" class="btn btn--secondary btn--sm" data-cb-del-faq="${fi}" style="color:var(--danger); align-self:flex-end;">Entfernen</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${bType === 'spacer' ? `
        <div class="cms-field"><label>Abstand</label><select data-cb="height"><option value="sm" ${cb.height === 'sm' ? 'selected' : ''}>Klein</option><option value="md" ${(!cb.height || cb.height === 'md') ? 'selected' : ''}>Mittel</option><option value="lg" ${cb.height === 'lg' ? 'selected' : ''}>Groß</option></select></div>
        <label style="display:flex; align-items:center; gap:0.5rem; font-size:12.5px; cursor:pointer;"><input type="checkbox" id="cms-cb-line" ${cb.line ? 'checked' : ''} /><span>Trennlinie anzeigen</span></label>
      ` : ''}
    `;
  }

  if (sec.component === 'gs-contact-form') {
    const unread = (state.submissions || []).filter((s) => !s.read_at).length;
    const hasWebhook = Boolean(state.systemSettings?.discord_webhook_url);
    return `
      <div class="cms-field">
        <label>Formular-Typ</label>
        <select id="cms-form-key-select">
          <option value="contact" ${sec.key === 'contact' ? 'selected' : ''}>Kontaktformular (contact)</option>
          <option value="careers" ${sec.key === 'careers' ? 'selected' : ''}>Bewerbungsformular (careers)</option>
        </select>
      </div>
      <div class="cms-upload-box" style="margin-top:0.35rem;">
        <div style="font-size:12.5px; font-weight:600; color:#fff;">📬 Postfach & Discord-Benachrichtigungen</div>
        <div style="font-size:12px; color:var(--fg-muted);">
          Eingänge im Postfach: <strong>${(state.submissions || []).length}</strong> ${unread > 0 ? `(${unread} ungelesen)` : ''}<br/>
          Discord Webhook: <strong style="color:${hasWebhook ? '#34d399' : '#fbbf24'};">${hasWebhook ? 'Aktiv' : 'Deaktiviert / Nicht gesetzt'}</strong>
        </div>
        <div style="display:flex; gap:0.4rem; margin-top:0.25rem;">
          <button type="button" class="btn btn--primary btn--sm" id="cms-inline-open-inbox" style="flex:1; justify-content:center;">Zum Postfach →</button>
          <button type="button" class="btn btn--secondary btn--sm" id="cms-inline-open-webhook" style="flex:1; justify-content:center;">Discord Webhook →</button>
        </div>
      </div>
    `;
  }

  return `<p style="color:var(--fg-muted); font-size:13px;">Die Inhalte dieses Bereichs werden automatisch geladen.</p>`;
}

function bindCleanSectionContentEvents(container, sec, pagesData, key, sidebar) {
  container.querySelectorAll('[data-hero]').forEach((inp) => {
    inp.addEventListener('input', () => {
      pagesData[key].hero[inp.getAttribute('data-hero')] = inp.value;
      markDirty();
      syncPreview();
    });
  });
  container.querySelectorAll('[data-hero-cta]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const i = Number(inp.getAttribute('data-hero-cta'));
      const k = inp.getAttribute('data-k');
      pagesData[key].hero.ctas[i][k] = inp.value;
      markDirty();
      syncPreview();
    });
  });
  document.getElementById('cms-add-hero-cta')?.addEventListener('click', () => {
    if (!pagesData[key].hero.ctas) pagesData[key].hero.ctas = [];
    pagesData[key].hero.ctas.push({ label: 'Mehr erfahren', href: '/de/projekte' });
    markDirty();
    renderFocusedSectionEditor(sidebar);
    syncPreview();
  });

  container.querySelectorAll('[data-feat]').forEach((inp) => {
    inp.addEventListener('input', () => {
      pagesData[key].features[inp.getAttribute('data-feat')] = inp.value;
      markDirty();
      syncPreview();
    });
  });
  container.querySelectorAll('[data-feat-item]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const i = Number(inp.getAttribute('data-feat-item'));
      const k = inp.getAttribute('data-k');
      pagesData[key].features.items[i][k] = inp.value;
      markDirty();
      syncPreview();
    });
  });
  container.querySelectorAll('[data-del-feat-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-del-feat-item'));
      pagesData[key].features.items.splice(i, 1);
      markDirty();
      renderFocusedSectionEditor(sidebar);
      syncPreview();
    });
  });
  document.getElementById('cms-add-feat-item')?.addEventListener('click', () => {
    if (!pagesData[key].features.items) pagesData[key].features.items = [];
    pagesData[key].features.items.push({ icon: '✦', title: 'Neuer Punkt', body: 'Beschreibung…' });
    markDirty();
    renderFocusedSectionEditor(sidebar);
    syncPreview();
  });

  container.querySelectorAll('[data-txt]').forEach((inp) => {
    inp.addEventListener('input', () => {
      pagesData[key].text[inp.getAttribute('data-txt')] = inp.value;
      markDirty();
      syncPreview();
    });
  });
  document.getElementById('cms-txt-body')?.addEventListener('input', (e) => {
    pagesData[key].text.body = e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-marquee-items')?.addEventListener('input', (e) => {
    pagesData[key].marquee.items = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
    markDirty();
    syncPreview();
  });

  container.querySelectorAll('[data-cta]').forEach((inp) => {
    inp.addEventListener('input', () => {
      pagesData[key].cta[inp.getAttribute('data-cta')] = inp.value;
      markDirty();
      syncPreview();
    });
  });
  container.querySelectorAll('[data-cta-btn]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const i = Number(inp.getAttribute('data-cta-btn'));
      const k = inp.getAttribute('data-k');
      pagesData[key].cta.ctas[i][k] = inp.value;
      markDirty();
      syncPreview();
    });
  });

  container.querySelectorAll('[data-phead]').forEach((inp) => {
    inp.addEventListener('input', () => {
      pagesData.projectsHead[inp.getAttribute('data-phead')] = inp.value;
      markDirty();
      syncPreview();
    });
  });
  container.querySelectorAll('[data-mhead]').forEach((inp) => {
    inp.addEventListener('input', () => {
      pagesData.membersHead[inp.getAttribute('data-mhead')] = inp.value;
      markDirty();
      syncPreview();
    });
  });

  if (sec.component === 'gs-custom-block') {
    const pKey = state.selectedPageKey;
    const cb = pagesData?.[pKey]?.[key];
    if (cb) {
      document.getElementById('cms-cb-cols')?.addEventListener('change', (e) => {
        cb.columns = e.target.value === 'auto' ? 'auto' : (Number(e.target.value) || 'auto');
        markDirty();
        syncPreview();
      });
      document.getElementById('cms-cb-layout-add')?.addEventListener('change', (e) => {
        const bt = e.target.value;
        if (!bt) return;
        if (!Array.isArray(cb.items)) cb.items = [];
        cb.items.push(defaultBlockData(bt));
        markDirty();
        renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
        syncPreview();
      });
      container.querySelectorAll('[data-li-up]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const i = Number(btn.getAttribute('data-li-up'));
          if (i > 0 && cb.items) {
            [cb.items[i - 1], cb.items[i]] = [cb.items[i], cb.items[i - 1]];
            markDirty();
            renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
            syncPreview();
          }
        });
      });
      container.querySelectorAll('[data-li-down]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const i = Number(btn.getAttribute('data-li-down'));
          if (cb.items && i < cb.items.length - 1) {
            [cb.items[i + 1], cb.items[i]] = [cb.items[i], cb.items[i + 1]];
            markDirty();
            renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
            syncPreview();
          }
        });
      });
      container.querySelectorAll('[data-li-del]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          cb.items?.splice(Number(btn.getAttribute('data-li-del')), 1);
          markDirty();
          renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
          syncPreview();
        });
      });
      container.querySelectorAll('[data-li-f]').forEach((inp) => {
        const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
        inp.addEventListener(ev, () => {
          const i = Number(inp.getAttribute('data-li-f'));
          const k = inp.getAttribute('data-k');
          if (cb.items?.[i]) cb.items[i][k] = inp.value;
          markDirty();
          syncPreview();
        });
      });
      container.querySelectorAll('[data-li-body]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const i = Number(inp.getAttribute('data-li-body'));
          if (cb.items?.[i]) cb.items[i].body = inp.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
          markDirty();
          syncPreview();
        });
      });
      container.querySelectorAll('[data-li-btn]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const i = Number(inp.getAttribute('data-li-btn'));
          const k = inp.getAttribute('data-k');
          if (cb.items?.[i]) {
            if (!Array.isArray(cb.items[i].buttons) || !cb.items[i].buttons.length) {
              cb.items[i].buttons = [{ label: 'Button', href: '/de/', style: 'primary' }];
            }
            cb.items[i].buttons[0][k] = inp.value;
          }
          markDirty();
          syncPreview();
        });
      });
      container.querySelectorAll('[data-li-faq]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const i = Number(inp.getAttribute('data-li-faq'));
          const k = inp.getAttribute('data-k');
          if (cb.items?.[i]) {
            if (!Array.isArray(cb.items[i].items) || !cb.items[i].items.length) {
              cb.items[i].items = [{ q: '', a: '' }];
            }
            cb.items[i].items[0][k] = inp.value;
          }
          markDirty();
          syncPreview();
        });
      });
      document.getElementById('cms-cb-type')?.addEventListener('change', (e) => {
        const nextType = e.target.value;
        const fresh = defaultBlockData(nextType);
        pagesData[pKey][key] = fresh;
        markDirty();
        renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
        syncPreview();
      });
      container.querySelectorAll('[data-cb]').forEach((inp) => {
        const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
        inp.addEventListener(ev, () => {
          cb[inp.getAttribute('data-cb')] = inp.value;
          markDirty();
          syncPreview();
        });
      });
      document.getElementById('cms-cb-body')?.addEventListener('input', (e) => {
        cb.body = e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
        markDirty();
        syncPreview();
      });
      document.getElementById('cms-cb-img-pick')?.addEventListener('change', (e) => {
        cb.image = e.target.value;
        const imgInp = document.getElementById('cms-cb-img');
        if (imgInp) imgInp.value = e.target.value;
        markDirty();
        syncPreview();
      });
      document.getElementById('cms-cb-line')?.addEventListener('change', (e) => {
        cb.line = e.target.checked;
        markDirty();
        syncPreview();
      });
      container.querySelectorAll('[data-cb-btn]').forEach((inp) => {
        const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
        inp.addEventListener(ev, () => {
          const idx = Number(inp.getAttribute('data-cb-btn'));
          const k = inp.getAttribute('data-k');
          if (cb.buttons?.[idx]) cb.buttons[idx][k] = inp.value;
          markDirty();
          syncPreview();
        });
      });
      document.getElementById('cms-cb-add-btn')?.addEventListener('click', () => {
        if (!Array.isArray(cb.buttons)) cb.buttons = [];
        cb.buttons.push({ label: 'Button', href: '/de/', style: 'secondary' });
        markDirty();
        renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
        syncPreview();
      });
      container.querySelectorAll('[data-cb-del-btn]').forEach((btn) => {
        btn.addEventListener('click', () => {
          cb.buttons?.splice(Number(btn.getAttribute('data-cb-del-btn')), 1);
          markDirty();
          renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
          syncPreview();
        });
      });
      container.querySelectorAll('[data-cb-faq]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const idx = Number(inp.getAttribute('data-cb-faq'));
          const k = inp.getAttribute('data-k');
          if (cb.items?.[idx]) cb.items[idx][k] = inp.value;
          markDirty();
          syncPreview();
        });
      });
      document.getElementById('cms-cb-add-faq')?.addEventListener('click', () => {
        if (!Array.isArray(cb.items)) cb.items = [];
        cb.items.push({ q: 'Neue Frage', a: 'Antwort...' });
        markDirty();
        renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
        syncPreview();
      });
      container.querySelectorAll('[data-cb-del-faq]').forEach((btn) => {
        btn.addEventListener('click', () => {
          cb.items?.splice(Number(btn.getAttribute('data-cb-del-faq')), 1);
          markDirty();
          renderFocusedSectionEditor(document.getElementById('cms-sidebar'));
          syncPreview();
        });
      });
    }
  }

  // Direktes Hinzufügen / Bearbeiten von Mitgliedern & Projekten aus der Sektion heraus
  document.getElementById('cms-inline-add-mem')?.addEventListener('click', () => {
    createNewMemberAndOpen();
  });
  container.querySelectorAll('[data-inline-edit-mem]').forEach((el) => {
    el.addEventListener('click', () => {
      state.tab = 'members';
      state.editingMemberIdx = Number(el.getAttribute('data-inline-edit-mem'));
      document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'members'));
      renderSidebar();
    });
  });

  document.getElementById('cms-inline-add-proj')?.addEventListener('click', () => {
    createNewProjectAndOpen();
  });
  container.querySelectorAll('[data-inline-edit-proj]').forEach((el) => {
    el.addEventListener('click', () => {
      state.tab = 'projects';
      state.editingProjectIdx = Number(el.getAttribute('data-inline-edit-proj'));
      document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'projects'));
      renderSidebar();
    });
  });

  document.getElementById('cms-inline-add-journal')?.addEventListener('click', () => {
    createNewJournalPostAndOpen();
  });
  container.querySelectorAll('[data-inline-edit-journal]').forEach((el) => {
    el.addEventListener('click', () => {
      state.tab = 'journal';
      state.editingJournalIdx = Number(el.getAttribute('data-inline-edit-journal'));
      document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'journal'));
      renderSidebar();
    });
  });

  document.getElementById('cms-form-key-select')?.addEventListener('change', (e) => {
    sec.key = e.target.value;
    markDirty();
    syncPreview();
  });
  document.getElementById('cms-inline-open-inbox')?.addEventListener('click', () => {
    state.tab = 'inbox';
    state.inboxSubTab = 'messages';
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'inbox'));
    renderSidebar();
  });
  document.getElementById('cms-inline-open-webhook')?.addEventListener('click', () => {
    state.tab = 'inbox';
    state.inboxSubTab = 'webhook';
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'inbox'));
    renderSidebar();
  });

  // Social-Media Live-Feed Events
  const syncSocialFeedBothLangs = () => {
    const otherPages = state.lang === 'en' ? state.pagesDe : state.pagesEn;
    if (!otherPages[key]) otherPages[key] = {};
    if (!otherPages[key].socialFeed) {
      otherPages[key].socialFeed = JSON.parse(JSON.stringify(pagesData[key].socialFeed));
    } else {
      otherPages[key].socialFeed.items = JSON.parse(JSON.stringify(pagesData[key].socialFeed.items || []));
    }
  };

  container.querySelectorAll('[data-sfeed]').forEach((inp) => {
    inp.addEventListener('input', () => {
      pagesData[key].socialFeed[inp.getAttribute('data-sfeed')] = inp.value;
      markDirty();
      syncPreview();
    });
  });

  container.querySelectorAll('[data-sfeed-item]').forEach((inp) => {
    const evtName = inp.tagName === 'SELECT' ? 'change' : 'input';
    inp.addEventListener(evtName, () => {
      const i = Number(inp.getAttribute('data-sfeed-item'));
      const k = inp.getAttribute('data-k');
      pagesData[key].socialFeed.items[i][k] = inp.value.trim();
      syncSocialFeedBothLangs();
      markDirty();
      if (inp.tagName === 'SELECT') {
        renderFocusedSectionEditor(sidebar);
      }
      syncPreview();
    });
  });

  document.getElementById('cms-add-sfeed-item')?.addEventListener('click', () => {
    if (!pagesData[key].socialFeed.items) pagesData[key].socialFeed.items = [];
    pagesData[key].socialFeed.items.push({
      platform: 'youtube',
      url: 'https://www.youtube.com/@gametstudios',
      label: '',
    });
    syncSocialFeedBothLangs();
    markDirty();
    renderFocusedSectionEditor(sidebar);
    syncPreview();
  });

  container.querySelectorAll('[data-del-sfeed-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-del-sfeed-item'));
      pagesData[key].socialFeed.items.splice(i, 1);
      syncSocialFeedBothLangs();
      markDirty();
      renderFocusedSectionEditor(sidebar);
      syncPreview();
    });
  });

  container.querySelectorAll('[data-test-sfeed-item]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const i = Number(btn.getAttribute('data-test-sfeed-item'));
      const item = pagesData[key].socialFeed.items[i];
      const resBox = document.getElementById(`cms-sfeed-test-res-${i}`);
      if (!item || !item.url) {
        toast('Bitte zuerst eine Kanal-/Account-URL eingeben.');
        return;
      }
      btn.textContent = 'Lädt neusten Inhalt…';
      try {
        const params = new URLSearchParams({
          platform: item.platform || 'youtube',
          url: item.url,
          refresh: '1',
        });
        const r = await fetch(`/api/social-feed.php?${params.toString()}`);
        const d = await r.json();
        btn.textContent = '↻ Jetzt testen & neusten Inhalt ziehen';
        if (d.ok) {
          if (resBox) {
            resBox.style.display = 'block';
            resBox.style.color = '#34d399';
            resBox.textContent = `✓ Aktuellster Inhalt von ${d.authorName || d.authorHandle}: „${d.title}“ (${String(d.publishedAt || '').slice(0, 10)})`;
          }
          toast('✓ Aktuellster Inhalt erfolgreich abgerufen!');
          syncPreview();
        } else {
          if (resBox) {
            resBox.style.display = 'block';
            resBox.style.color = 'var(--danger)';
            resBox.textContent = `✗ ${d.error || 'Konnte nicht geladen werden'}`;
          }
          toast('Fehler: ' + (d.error || 'Unbekannt'));
        }
      } catch (err) {
        btn.textContent = '↻ Jetzt testen & neusten Inhalt ziehen';
        toast('Fehler: ' + err.message);
      }
    });
  });
}

function createNewProjectAndOpen() {
  if (!Array.isArray(state.projectsDe.items)) state.projectsDe.items = [];
  if (!Array.isArray(state.projectsEn.items)) state.projectsEn.items = [];
  const newProj = {
    slug: 'projekt-' + Date.now(),
    title: 'Neues Projekt',
    tagline: 'Kurze Beschreibung in einem Satz.',
    tags: ['Eigenprojekt'],
    image: '/assets/images/projects/greenforce.jpg',
    status: 'In Entwicklung',
    year: '2026 –',
    role: 'Produktion',
    website: 'https://gametstudios.media',
    body: ['Erster Absatz zur Projektbeschreibung.'],
  };
  state.projectsDe.items.unshift(JSON.parse(JSON.stringify(newProj)));
  state.projectsEn.items.unshift(JSON.parse(JSON.stringify(newProj)));
  state.tab = 'projects';
  state.editingProjectIdx = 0;
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'projects'));
  markDirty();
  renderSidebar();
  syncPreview();
  toast('✓ Neues Projekt angelegt');
}

function createNewMemberAndOpen() {
  if (!Array.isArray(state.membersDe.items)) state.membersDe.items = [];
  if (!Array.isArray(state.membersEn.items)) state.membersEn.items = [];
  const newMem = {
    slug: 'mitglied-' + Date.now(),
    name: 'Neues Mitglied',
    role: 'Aufgabe / Bereich',
    since: '2026',
    quote: 'Kurzes Zitat.',
    bio: ['Biografie-Text.'],
    skills: [{ name: 'Kreation', level: 85 }],
    links: [{ platform: 'instagram', href: 'https://instagram.com/gametstudios' }],
  };
  state.membersDe.items.unshift(JSON.parse(JSON.stringify(newMem)));
  state.membersEn.items.unshift(JSON.parse(JSON.stringify(newMem)));
  state.tab = 'members';
  state.editingMemberIdx = 0;
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'members'));
  markDirty();
  renderSidebar();
  syncPreview();
  toast('✓ Neues Mitglied angelegt');
}

/* ==========================================================================
   TAB 2: PROJEKTE (Übersicht -> Einzel-Editor)
   ========================================================================== */
function renderProjectsSidebar(sidebar) {
  const list = activeProjectsData().items || [];

  if (state.editingProjectIdx === null) {
    sidebar.innerHTML = `
      <div class="cms-pane-head">
        <div class="cms-pane-title">Projekte (${list.length})</div>
        <button type="button" class="btn btn--secondary btn--sm" id="cms-add-project">+ Neues Projekt</button>
      </div>
      <div class="cms-list">
        ${list.map((p, idx) => `
          <div class="cms-row-card" data-open-proj="${idx}">
            <div>
              <div class="cms-row-card__title">${esc(p.title)}</div>
              <div class="cms-row-card__meta">${esc(p.status || '')} · ${esc(p.year || '')}</div>
            </div>
            <div class="cms-row-card__actions">
              <button type="button" class="cms-icon-btn" data-proj-up="${idx}">↑</button>
              <button type="button" class="cms-icon-btn" data-proj-down="${idx}">↓</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    sidebar.querySelectorAll('[data-open-proj]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        state.editingProjectIdx = Number(el.getAttribute('data-open-proj'));
        renderSidebar();
      });
    });

    sidebar.querySelectorAll('[data-proj-up]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-proj-up'));
        if (i <= 0) return;
        [list[i - 1], list[i]] = [list[i], list[i - 1]];
        markDirty();
        renderSidebar();
        syncPreview();
      });
    });

    sidebar.querySelectorAll('[data-proj-down]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-proj-down'));
        if (i >= list.length - 1) return;
        [list[i + 1], list[i]] = [list[i], list[i + 1]];
        markDirty();
        renderSidebar();
        syncPreview();
      });
    });

    document.getElementById('cms-add-project')?.addEventListener('click', () => {
      createNewProjectAndOpen();
    });
    return;
  }

  const p = list[state.editingProjectIdx];
  const projectImages = state.images.filter((img) => img.folder === 'projects');

  sidebar.innerHTML = `
    <button type="button" class="cms-back-btn" id="cms-back-proj">← Alle Projekte</button>
    <div class="cms-pane-head">
      <div class="cms-pane-title">${esc(p.title)}</div>
    </div>
    <div class="cms-field"><label>Titel</label><input type="text" data-p="title" value="${esc(p.title || '')}" /></div>
    <div class="cms-field"><label>Kurzbeschreibung (Tagline)</label><textarea rows="2" data-p="tagline">${esc(p.tagline || '')}</textarea></div>
    <div class="cms-grid-2">
      <div class="cms-field"><label>Status</label><input type="text" data-p="status" value="${esc(p.status || '')}" /></div>
      <div class="cms-field"><label>Jahr</label><input type="text" data-p="year" value="${esc(p.year || '')}" /></div>
    </div>
    <div class="cms-field"><label>Tags <span class="hint">Komma-getrennt</span></label><input type="text" id="cms-p-tags" value="${esc((p.tags || []).join(', '))}" /></div>
    <div class="cms-field">
      <label>Projekt-Bild</label>
      <select id="cms-p-img-pick">
        ${projectImages.map((img) => `<option value="${esc(img.url)}" ${p.image === img.url ? 'selected' : ''}>${esc(img.name)}</option>`).join('')}
      </select>
      <input type="text" data-p="image" id="cms-p-img" value="${esc(p.image || '')}" style="margin-top:0.35rem;" />
    </div>
    <div class="cms-field">
      <label>Ausführlicher Text <span class="hint">Leerzeile = neuer Absatz</span></label>
      <textarea rows="6" id="cms-p-body">${esc((p.body || []).join('\n\n'))}</textarea>
    </div>
    <div class="cms-grid-2">
      <div class="cms-field">
        <label>Veröffentlichungsstatus</label>
        <select data-p="status">
          <option value="published" ${(p.status || 'published') !== 'draft' ? 'selected' : ''}>Veröffentlicht</option>
          <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Entwurf (nur Vorschau)</option>
        </select>
      </div>
      <div class="cms-field">
        <label>Veröffentlichen ab <span class="hint">optional</span></label>
        <input type="date" data-p="publishAt" value="${esc(p.publishAt || '')}" />
      </div>
    </div>
    <button type="button" class="btn btn--secondary btn--sm" id="cms-del-proj" style="color:var(--danger);">Projekt löschen</button>
  `;

  document.getElementById('cms-back-proj')?.addEventListener('click', () => {
    state.editingProjectIdx = null;
    renderSidebar();
  });

  sidebar.querySelectorAll('[data-p]').forEach((inp) => {
    inp.addEventListener('input', () => {
      p[inp.getAttribute('data-p')] = inp.value;
      markDirty();
      syncPreview();
    });
  });

  document.getElementById('cms-p-img-pick')?.addEventListener('change', (e) => {
    p.image = e.target.value;
    document.getElementById('cms-p-img').value = e.target.value;
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-p-tags')?.addEventListener('input', (e) => {
    p.tags = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-p-body')?.addEventListener('input', (e) => {
    p.body = e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-del-proj')?.addEventListener('click', () => {
    if (!confirm('Projekt wirklich löschen?')) return;
    list.splice(state.editingProjectIdx, 1);
    state.editingProjectIdx = null;
    markDirty();
    renderSidebar();
    syncPreview();
  });
}

/* ==========================================================================
   TAB 3: MITGLIEDER (Übersicht -> Einzel-Editor)
   ========================================================================== */
function renderMembersSidebar(sidebar) {
  const list = activeMembersData().items || [];

  if (state.editingMemberIdx === null) {
    sidebar.innerHTML = `
      <div class="cms-pane-head">
        <div class="cms-pane-title">Mitglieder (${list.length})</div>
        <button type="button" class="btn btn--secondary btn--sm" id="cms-add-member">+ Mitglied</button>
      </div>
      <div class="cms-list">
        ${list.map((m, idx) => `
          <div class="cms-row-card" data-open-mem="${idx}">
            <div>
              <div class="cms-row-card__title">${esc(m.name)}</div>
              <div class="cms-row-card__meta">${esc(m.role || '')}</div>
            </div>
            <div class="cms-row-card__actions">
              <button type="button" class="cms-icon-btn" data-mem-up="${idx}">↑</button>
              <button type="button" class="cms-icon-btn" data-mem-down="${idx}">↓</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    sidebar.querySelectorAll('[data-open-mem]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        state.editingMemberIdx = Number(el.getAttribute('data-open-mem'));
        renderSidebar();
      });
    });

    sidebar.querySelectorAll('[data-mem-up]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-mem-up'));
        if (i <= 0) return;
        [list[i - 1], list[i]] = [list[i], list[i - 1]];
        markDirty();
        renderSidebar();
        syncPreview();
      });
    });

    sidebar.querySelectorAll('[data-mem-down]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-mem-down'));
        if (i >= list.length - 1) return;
        [list[i + 1], list[i]] = [list[i], list[i + 1]];
        markDirty();
        renderSidebar();
        syncPreview();
      });
    });

    document.getElementById('cms-add-member')?.addEventListener('click', () => {
      createNewMemberAndOpen();
    });
    return;
  }

  const m = list[state.editingMemberIdx];
  const otherList = (state.lang === 'en' ? state.membersDe : state.membersEn).items || [];
  const otherM = otherList[state.editingMemberIdx] || null;
  const memberImages = state.images.filter((img) => img.folder === 'members');
  if (!Array.isArray(m.skills)) m.skills = [];
  if (!Array.isArray(m.links)) m.links = [];

  const LINK_PLATFORMS = [
    'instagram', 'x', 'linkedin', 'youtube', 'tiktok',
    'twitch', 'discord', 'github', 'spotify', 'telegram',
    'facebook', 'pinterest', 'website', 'email',
  ];

  // Vorschau auf die Profil-Detailseite des Mitglieds schalten, damit Kenntnisse & Socials live sichtbar sind
  const memberDetailUrl = `/${state.lang}/${state.lang === 'de' ? 'mitglieder/mitglied' : 'members/member'}?slug=${encodeURIComponent(m.slug)}&cms_preview=1`;
  setPreviewFrameUrl(memberDetailUrl);

  sidebar.innerHTML = `
    <button type="button" class="cms-back-btn" id="cms-back-mem">← Alle Mitglieder</button>
    <div class="cms-pane-head">
      <div class="cms-pane-title">${esc(m.name)}</div>
    </div>
    <div class="cms-grid-2">
      <div class="cms-field"><label>Name</label><input type="text" data-m="name" value="${esc(m.name || '')}" /></div>
      <div class="cms-field"><label>Dabei seit</label><input type="text" data-m="since" value="${esc(m.since || '')}" /></div>
    </div>
    <div class="cms-field"><label>Rolle / Bereich</label><input type="text" data-m="role" value="${esc(m.role || '')}" /></div>
    <div class="cms-field">
      <label>
        <span>Foto</span>
        <label style="color:var(--accent); font-size:12px; cursor:pointer; font-weight:600;">
          ↑ Foto hochladen
          <input type="file" id="cms-up-mem-photo" accept=".jpg,.jpeg,.png,.webp,.gif" style="display:none;" />
        </label>
      </label>
      <select id="cms-m-photo-pick">
        <option value="">— Initialen-Platzhalter (kein Foto) —</option>
        ${memberImages.map((img) => `<option value="${esc(img.url)}" ${m.photo === img.url ? 'selected' : ''}>${esc(img.name)}</option>`).join('')}
      </select>
    </div>
    <div class="cms-field"><label>Zitat</label><input type="text" data-m="quote" value="${esc(m.quote || '')}" /></div>
    <div class="cms-field"><label>Biografie <span class="hint">Leerzeile = neuer Absatz</span></label><textarea rows="4" id="cms-m-bio">${esc((m.bio || []).join('\n\n'))}</textarea></div>

    <!-- Kenntnisse / Skills -->
    <div class="cms-field" style="padding-top:0.5rem; border-top:1px solid var(--border);">
      <label>
        <span>Kenntnisse (${m.skills.length})</span>
        <button type="button" id="cms-add-m-skill" style="background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer;">+ Kenntnis</button>
      </label>
      <div style="display:flex; flex-direction:column; gap:0.45rem;">
        ${m.skills.length === 0 ? `<div style="font-size:12px; color:var(--fg-muted);">Noch keine Kenntnisse eingetragen.</div>` : ''}
        ${m.skills.map((sk, idx) => `
          <div class="cms-acc" style="padding:0.55rem 0.65rem; display:flex; flex-direction:column; gap:0.35rem;">
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <input type="text" data-m-skill-name="${idx}" value="${esc(sk.name || '')}" placeholder="z. B. Video-Produktion" style="flex:1; padding:0.35rem 0.55rem; font-size:12.5px;" />
              <button type="button" class="cms-icon-btn" data-del-m-skill="${idx}" title="Kenntnis entfernen" style="color:var(--danger); flex-shrink:0;">×</button>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" min="5" max="100" step="1" data-m-skill-lvl="${idx}" value="${Number(sk.level ?? 80)}" style="flex:1;" />
              <span id="cms-m-skill-val-${idx}" style="font-family:var(--font-mono); font-size:11.5px; color:var(--fg-muted); min-width:2.6rem; text-align:right;">${Number(sk.level ?? 80)}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Social Links -->
    <details class="cms-acc" id="cms-m-links-acc" ${state.memberLinksOpen ? 'open' : ''}>
      <summary><span>Social Links (${m.links.length})</span><span>▾</span></summary>
      <div class="cms-acc__body">
        <div style="display:flex; justify-content:flex-end;">
          <button type="button" id="cms-add-m-link" style="background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer;">+ Link hinzufügen</button>
        </div>
        ${m.links.map((lk, idx) => `
          <div style="display:flex; gap:0.35rem; align-items:center;">
            <select data-m-link-plat="${idx}" style="width:6.8rem; flex-shrink:0; padding:0.35rem;">
              ${LINK_PLATFORMS.map((p) => `<option value="${esc(p)}" ${lk.platform === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
            </select>
            <input type="text" data-m-link-href="${idx}" value="${esc(lk.href || '')}" placeholder="https://..." style="flex:1; min-width:0; padding:0.35rem 0.5rem; font-size:12px;" />
            <button type="button" class="cms-icon-btn" data-del-m-link="${idx}" title="Link entfernen" style="color:var(--danger); flex-shrink:0;">×</button>
          </div>
        `).join('')}
      </div>
    </details>

    <button type="button" class="btn btn--secondary btn--sm" id="cms-del-mem" style="color:var(--danger);">Mitglied entfernen</button>
  `;

  document.getElementById('cms-back-mem')?.addEventListener('click', () => {
    state.editingMemberIdx = null;
    setPreviewFrameUrl(`/${state.lang}/${state.lang === 'de' ? 'mitglieder' : 'members'}?cms_preview=1`);
    renderSidebar();
  });

  sidebar.querySelectorAll('[data-m]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const k = inp.getAttribute('data-m');
      m[k] = inp.value;
      if (k === 'name' && otherM) otherM.name = inp.value;
      markDirty();
      syncPreview();
    });
  });

  document.getElementById('cms-m-photo-pick')?.addEventListener('change', (e) => {
    m.photo = e.target.value;
    if (otherM) otherM.photo = e.target.value;
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-up-mem-photo')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast('Lädt Foto hoch…');
      const data = await uploadMediaFile(file, 'members');
      state.images = data.images || [];
      m.photo = data.uploaded;
      if (otherM) otherM.photo = data.uploaded;
      markDirty();
      toast('✓ Foto aktualisiert');
      renderSidebar();
      syncPreview();
    } catch (err) {
      toast('Fehler: ' + err.message);
    }
  });

  document.getElementById('cms-m-bio')?.addEventListener('input', (e) => {
    m.bio = e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    markDirty();
    syncPreview();
  });

  // Kenntnisse Events
  document.getElementById('cms-add-m-skill')?.addEventListener('click', () => {
    m.skills.push({ name: 'Neue Kenntnis', level: 80 });
    markDirty();
    renderSidebar();
    syncPreview();
  });

  sidebar.querySelectorAll('[data-m-skill-name]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const i = Number(inp.getAttribute('data-m-skill-name'));
      if (m.skills[i]) m.skills[i].name = inp.value;
      markDirty();
      syncPreview();
    });
  });

  sidebar.querySelectorAll('[data-m-skill-lvl]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const i = Number(inp.getAttribute('data-m-skill-lvl'));
      const val = Number(inp.value);
      if (m.skills[i]) m.skills[i].level = val;
      const lbl = document.getElementById(`cms-m-skill-val-${i}`);
      if (lbl) lbl.textContent = `${val}%`;
      markDirty();
      syncPreview();
    });
  });

  sidebar.querySelectorAll('[data-del-m-skill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-del-m-skill'));
      m.skills.splice(i, 1);
      markDirty();
      renderSidebar();
      syncPreview();
    });
  });

  // Social Links Events
  const linksAcc = document.getElementById('cms-m-links-acc');
  linksAcc?.addEventListener('toggle', () => {
    state.memberLinksOpen = linksAcc.open;
  });

  document.getElementById('cms-add-m-link')?.addEventListener('click', () => {
    state.memberLinksOpen = true;
    m.links.push({ platform: 'instagram', href: 'https://instagram.com/' });
    if (otherM) otherM.links = JSON.parse(JSON.stringify(m.links));
    markDirty();
    renderSidebar();
    syncPreview();
  });

  sidebar.querySelectorAll('[data-m-link-plat]').forEach((sel) => {
    sel.addEventListener('change', () => {
      state.memberLinksOpen = true;
      const i = Number(sel.getAttribute('data-m-link-plat'));
      if (m.links[i]) m.links[i].platform = sel.value;
      if (otherM) otherM.links = JSON.parse(JSON.stringify(m.links));
      markDirty();
      syncPreview();
    });
  });

  sidebar.querySelectorAll('[data-m-link-href]').forEach((inp) => {
    inp.addEventListener('input', () => {
      state.memberLinksOpen = true;
      const i = Number(inp.getAttribute('data-m-link-href'));
      let val = inp.value.trim();
      if (m.links[i]?.platform === 'email' && val && !val.startsWith('mailto:') && val.includes('@')) {
        val = 'mailto:' + val;
      }
      if (m.links[i]) m.links[i].href = val;
      if (otherM) otherM.links = JSON.parse(JSON.stringify(m.links));
      markDirty();
      syncPreview();
    });
  });

  sidebar.querySelectorAll('[data-del-m-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.memberLinksOpen = true;
      const i = Number(btn.getAttribute('data-del-m-link'));
      m.links.splice(i, 1);
      if (otherM) otherM.links = JSON.parse(JSON.stringify(m.links));
      markDirty();
      renderSidebar();
      syncPreview();
    });
  });

  document.getElementById('cms-del-mem')?.addEventListener('click', () => {
    if (!confirm('Mitglied wirklich löschen?')) return;
    state.membersDe.items?.splice(state.editingMemberIdx, 1);
    state.membersEn.items?.splice(state.editingMemberIdx, 1);
    state.editingMemberIdx = null;
    markDirty();
    renderSidebar();
    syncPreview();
  });
}

/* ==========================================================================
   TAB 4: JOURNAL (Markdown-Studio + Bild-Baukasten + build.py Generator)
   ========================================================================== */
function slugifyTitle(str = '') {
  return String(str)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || ('artikel-' + Date.now());
}

function createNewJournalPostAndOpen() {
  if (!Array.isArray(state.journal)) state.journal = [];
  const newSlug = 'neuer-artikel-' + new Date().toISOString().slice(0, 10);
  state.journal.unshift({
    slug: newSlug,
    title: 'Neuer Journal-Artikel',
    date: new Date().toISOString().slice(0, 10),
    excerpt: 'Kurzer Teaser für die Journal-Übersicht und Social-Media-Vorschau.',
    category: 'Essay',
    author: 'Pieter Mooldijk',
    cover: '/assets/images/journal/gs_jounal_cover_1.png',
    cover_credit: '',
    builtHtmlExists: false,
    body: '## Einstieg\n\nSchreibe hier deinen Artikel in **Markdown**.\n\n> Ein hervorgehobenes Zitat im Artikel.\n\n### Zwischenüberschrift\n\nNutze die Werkzeugleiste oben, um Bilder, Formatierungen oder Zitate mit einem Klick einzufügen.',
  });
  state.tab = 'journal';
  state.editingJournalIdx = 0;
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'journal'));
  markDirty();
  renderSidebar();
  toast('✓ Neuer Artikel-Entwurf angelegt');
}

async function publishJournalAndBuild(openPostAfter = true) {
  const pubBtn = document.getElementById('cms-publish-journal-btn');
  const buildLogEl = document.getElementById('cms-build-log');
  if (pubBtn) pubBtn.textContent = 'Speichert & führt build.py aus…';

  try {
    const res = await fetch('/api/cms.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
      body: JSON.stringify({
        action: 'publish_journal',
        csrf: state.csrf,
        journal: state.journal,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || 'Speichern fehlgeschlagen');
    }
    state.dirty = false;
    const currentIdx = state.editingJournalIdx;
    if (Array.isArray(data.journal)) {
      state.journal = data.journal;
    }
    updateSaveBtn();

    const buildOut = data.build?.output || 'build.py erfolgreich ausgeführt.';
    if (buildLogEl) {
      buildLogEl.style.display = 'block';
      buildLogEl.textContent = buildOut;
    }

    const activePost = (currentIdx !== null && state.journal[currentIdx]) ? state.journal[currentIdx] : null;
    if (activePost && openPostAfter) {
      setPreviewFrameUrl(`/de/journal/${activePost.slug}?cms_preview=1`);
    } else {
      setPreviewFrameUrl(`/de/journal?cms_preview=1`);
    }

    toast('✓ Blog-Post via build.py generiert!');
    renderSidebar();
  } catch (err) {
    if (pubBtn) pubBtn.textContent = '✦ Speichern & Blog-Post generieren (build.py)';
    toast('Fehler: ' + err.message);
  }
}

function renderJournalSidebar(sidebar) {
  if (state.editingJournalIdx === null) {
    // Übersicht in der Vorschau zeigen
    setPreviewFrameUrl('/de/journal?cms_preview=1');

    sidebar.innerHTML = `
      <div class="cms-pane-head">
        <div class="cms-pane-title">Journal-Artikel (${state.journal.length})</div>
        <button type="button" class="btn btn--primary btn--sm" id="cms-add-journal">+ Neuer Artikel</button>
      </div>
      <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin-top:-0.25rem;">
        Schreibe Beiträge in <strong>Markdown</strong>, füge Bilder & Bildunterschriften per Klick ein und generiere über <code>build.py</code> fertige Blog-Posts inkl. SEO- & Social-Cards.
      </p>
      <div class="cms-list">
        ${state.journal.map((post, idx) => `
          <div class="cms-row-card" data-open-j="${idx}">
            <div>
              <div class="cms-row-card__title">${esc(post.title)}</div>
              <div class="cms-row-card__meta">
                <span>${esc(post.date)} · ${esc(post.category || 'Essay')} · ${esc(post.author)}</span>
              </div>
              <div style="margin-top:0.25rem; font-size:11px; color:${post.builtHtmlExists ? '#34d399' : '#fbbf24'};">
                ${post.builtHtmlExists ? `✓ Live unter /de/journal/${esc(post.slug)}` : '● Entwurf (noch nicht via build.py generiert)'}
              </div>
            </div>
            <div class="cms-row-card__actions">
              <button type="button" class="cms-icon-btn" data-j-up="${idx}" title="Nach oben">↑</button>
              <button type="button" class="cms-icon-btn" data-j-down="${idx}" title="Nach unten">↓</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:auto; padding-top:0.85rem; border-top:1px solid var(--border);">
        <button type="button" class="btn btn--secondary btn--sm" id="cms-rebuild-all-j" style="width:100%; justify-content:center;">
          ↻ Alle Blog-Posts neu generieren (build.py)
        </button>
      </div>
    `;

    sidebar.querySelectorAll('[data-open-j]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        state.editingJournalIdx = Number(el.getAttribute('data-open-j'));
        renderSidebar();
      });
    });

    sidebar.querySelectorAll('[data-j-up]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-j-up'));
        if (i <= 0) return;
        [state.journal[i - 1], state.journal[i]] = [state.journal[i], state.journal[i - 1]];
        markDirty();
        renderSidebar();
      });
    });

    sidebar.querySelectorAll('[data-j-down]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-j-down'));
        if (i >= state.journal.length - 1) return;
        [state.journal[i + 1], state.journal[i]] = [state.journal[i], state.journal[i + 1]];
        markDirty();
        renderSidebar();
      });
    });

    document.getElementById('cms-add-journal')?.addEventListener('click', () => {
      createNewJournalPostAndOpen();
    });

    document.getElementById('cms-rebuild-all-j')?.addEventListener('click', () => {
      publishJournalAndBuild(false);
    });
    return;
  }

  const post = state.journal[state.editingJournalIdx];
  const journalImages = state.images.filter((img) => img.folder === 'journal' || img.folder === 'projects' || img.folder === 'backgrounds');

  // Vorschau rechts automatisch auf diesen Blog-Post schalten
  const previewTarget = post.builtHtmlExists
    ? `/de/journal/${post.slug}?cms_preview=1`
    : `/de/journal/post-template?slug=${encodeURIComponent(post.slug)}&cms_preview=1`;
  setPreviewFrameUrl(previewTarget);
  setTimeout(() => syncPreview(), 120);

  sidebar.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between;">
      <button type="button" class="cms-back-btn" id="cms-back-j">← Alle Artikel</button>
      <a href="/de/journal/${esc(post.slug)}" target="_blank" style="font-size:11.5px; color:var(--accent); text-decoration:none;">
        ↗ /de/journal/${esc(post.slug)}
      </a>
    </div>

    <div class="cms-field">
      <label>Titel des Blog-Posts</label>
      <input type="text" data-j="title" id="cms-j-title" value="${esc(post.title || '')}" placeholder="z. B. Warum ein Kollektiv?" />
    </div>

    <div class="cms-grid-2">
      <div class="cms-field">
        <label>
          <span>URL-Slug</span>
          <button type="button" id="cms-j-autoslug" style="background:none; border:none; color:var(--accent); font-size:11px; cursor:pointer; padding:0;">Aus Titel</button>
        </label>
        <input type="text" data-j="slug" id="cms-j-slug" value="${esc(post.slug || '')}" />
      </div>
      <div class="cms-field">
        <label>Kategorie</label>
        <input type="text" data-j="category" value="${esc(post.category || 'Essay')}" placeholder="Essay, Gedanken, Update…" />
      </div>
    </div>

    <div class="cms-grid-2">
      <div class="cms-field">
        <label>Datum</label>
        <input type="date" data-j="date" value="${esc(post.date || '')}" />
      </div>
      <div class="cms-field">
        <label>Autor</label>
        <input type="text" data-j="author" value="${esc(post.author || '')}" />
      </div>
    </div>

    <div class="cms-grid-2">
      <div class="cms-field">
        <label>Status</label>
        <select data-j="status">
          <option value="published" ${(post.status || 'published') !== 'draft' ? 'selected' : ''}>Veröffentlicht</option>
          <option value="draft" ${post.status === 'draft' ? 'selected' : ''}>Entwurf (nur Vorschau)</option>
        </select>
      </div>
      <div class="cms-field">
        <label>Veröffentlichen ab <span class="hint">optional</span></label>
        <input type="date" data-j="publishAt" value="${esc(post.publishAt || '')}" />
      </div>
    </div>

    <div class="cms-field">
      <label>Kurzer Teaser (Vorschau-Text & SEO-Beschreibung)</label>
      <textarea rows="2" data-j="excerpt">${esc(post.excerpt || '')}</textarea>
    </div>

    <!-- Titelbild / Cover -->
    <details class="cms-acc">
      <summary><span>Titelbild (Cover) & Bildquelle</span><span>▾</span></summary>
      <div class="cms-acc__body">
        <div class="cms-field">
          <label>
            <span>Cover-Bild wählen</span>
            <label style="color:var(--accent); font-size:12px; cursor:pointer; font-weight:600;">
              ↑ Cover hochladen
              <input type="file" id="cms-j-cover-upload" accept=".jpg,.jpeg,.png,.webp,.gif" style="display:none;" />
            </label>
          </label>
          <select id="cms-j-cover-pick">
            <option value="">— Kein Cover-Bild —</option>
            ${journalImages.map((img) => `<option value="${esc(img.url)}" ${post.cover === img.url ? 'selected' : ''}>[${esc(img.folder)}] ${esc(img.name)}</option>`).join('')}
          </select>
          <input type="text" data-j="cover" id="cms-j-cover-input" value="${esc(post.cover || '')}" placeholder="/assets/images/journal/..." style="margin-top:0.35rem;" />
        </div>
        <div class="cms-field">
          <label>Cover-Bildquelle / Credit <span class="hint">optional</span></label>
          <input type="text" data-j="cover_credit" value="${esc(post.cover_credit || '')}" placeholder="z. B. Quelle: ARTE / Screenshot" />
        </div>
      </div>
    </details>

    <!-- Markdown Editor mit Toolbar & Bild-Einfüge-Assistent -->
    <div class="cms-field" style="margin-top:0.25rem;">
      <label>
        <span>Artikel-Inhalt (Markdown)</span>
        <button type="button" id="cms-toggle-md-img-box" style="background:rgba(186,82,186,0.16); border:1px solid rgba(186,82,186,0.4); color:#f5d0fe; border-radius:6px; padding:0.2rem 0.55rem; font-size:11.5px; font-weight:600; cursor:pointer;">
          🖼 + Bild in Text einbauen
        </button>
      </label>

      <!-- Bild-Baukasten für Markdown -->
      <div id="cms-md-img-assistant" class="cms-upload-box" style="display:none; margin-bottom:0.45rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:12px; color:#fff;">Bild an Cursor-Position einfügen</strong>
          <label style="color:var(--accent); font-size:12px; cursor:pointer; font-weight:600;">
            ↑ Neues Bild hochladen
            <input type="file" id="cms-md-img-upload" accept=".jpg,.jpeg,.png,.webp,.gif,.svg" style="display:none;" />
          </label>
        </div>
        <div class="cms-field">
          <label>Bild auswählen</label>
          <select id="cms-md-img-select">
            ${journalImages.map((img) => `<option value="${esc(img.url)}">[${esc(img.folder)}] ${esc(img.name)}</option>`).join('')}
          </select>
        </div>
        <div class="cms-grid-2">
          <div class="cms-field">
            <label>Alt-Text (Beschreibung)</label>
            <input type="text" id="cms-md-img-alt" placeholder="z. B. Blick ins Studio" />
          </div>
          <div class="cms-field">
            <label>Darstellungsgröße</label>
            <select id="cms-md-img-size">
              <option value="standard">Standard (Textbreite)</option>
              <option value="wide">Breit (über Textspalte hinaus)</option>
              <option value="narrow">Kompakt / Schmal</option>
            </select>
          </div>
        </div>
        <div class="cms-field">
          <label>Bildunterschrift / Quelle <span class="hint">wird unter dem Bild angezeigt</span></label>
          <input type="text" id="cms-md-img-caption" placeholder="z. B. Quelle: Eigene Aufnahme / Making-of" />
        </div>
        <button type="button" class="btn btn--primary btn--sm" id="cms-md-img-insert-btn" style="width:100%; justify-content:center;">
          ✓ Bild jetzt in Markdown-Text einfügen
        </button>
      </div>

      <!-- Markdown Formatierungs-Leiste -->
      <div style="display:flex; flex-wrap:wrap; gap:0.25rem; padding:0.4rem; background:var(--bg-card); border:1px solid var(--border); border-bottom:none; border-radius:8px 8px 0 0;">
        <button type="button" class="cms-icon-btn" data-md-act="h2" title="Zwischenüberschrift H2" style="width:auto; padding:0 0.45rem; font-weight:700;">H2</button>
        <button type="button" class="cms-icon-btn" data-md-act="h3" title="Unterüberschrift H3" style="width:auto; padding:0 0.45rem; font-weight:600;">H3</button>
        <button type="button" class="cms-icon-btn" data-md-act="bold" title="Fett (**Text**)" style="width:auto; padding:0 0.45rem; font-weight:700;">B</button>
        <button type="button" class="cms-icon-btn" data-md-act="italic" title="Kursiv (*Text*)" style="width:auto; padding:0 0.45rem; font-style:italic;">I</button>
        <button type="button" class="cms-icon-btn" data-md-act="quote" title="Zitat (> Text)" style="width:auto; padding:0 0.45rem;">❝ Zitat</button>
        <button type="button" class="cms-icon-btn" data-md-act="ul" title="Aufzählung (- Punkt)" style="width:auto; padding:0 0.45rem;">• Liste</button>
        <button type="button" class="cms-icon-btn" data-md-act="ol" title="Nummerierte Liste (1. Punkt)" style="width:auto; padding:0 0.45rem;">1. Liste</button>
        <button type="button" class="cms-icon-btn" data-md-act="link" title="Link ([Text](https://...))" style="width:auto; padding:0 0.45rem;">🔗 Link</button>
        <button type="button" class="cms-icon-btn" data-md-act="code" title="Code-Block" style="width:auto; padding:0 0.45rem;">&lt;/&gt;</button>
        <button type="button" class="cms-icon-btn" data-md-act="hr" title="Horizontale Trennlinie (---)" style="width:auto; padding:0 0.45rem;">― Linie</button>
      </div>

      <textarea
        rows="16"
        data-j="body"
        id="cms-j-body"
        style="border-top-left-radius:0; border-top-right-radius:0; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12.5px; line-height:1.6;"
      >${esc(post.body || '')}</textarea>
    </div>

    <!-- WICHTIG: Speichern & build.py ausführen -->
    <div style="display:flex; flex-direction:column; gap:0.5rem; padding-top:0.5rem; border-top:1px solid var(--border);">
      <button type="button" class="btn btn--primary" id="cms-publish-journal-btn" style="width:100%; justify-content:center; padding:0.7rem 1rem; font-weight:600;">
        ✦ Speichern & Blog-Post generieren (build.py)
      </button>
      <pre id="cms-build-log" style="display:none; margin:0; padding:0.6rem; border-radius:8px; background:#09090c; border:1px solid var(--border); color:#34d399; font-size:11px; white-space:pre-wrap;"></pre>
      <button type="button" class="btn btn--secondary btn--sm" id="cms-del-j" style="color:var(--danger); align-self:flex-start;">
        Artikel löschen
      </button>
    </div>
  `;

  document.getElementById('cms-back-j')?.addEventListener('click', () => {
    state.editingJournalIdx = null;
    renderSidebar();
  });

  const bodyTextarea = document.getElementById('cms-j-body');

  sidebar.querySelectorAll('[data-j]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const k = inp.getAttribute('data-j');
      if (k === 'slug') {
        post.slug = slugifyTitle(inp.value);
      } else {
        post[k] = inp.value;
      }
      markDirty();
      syncPreview();
    });
  });

  document.getElementById('cms-j-autoslug')?.addEventListener('click', () => {
    post.slug = slugifyTitle(post.title);
    const slugInp = document.getElementById('cms-j-slug');
    if (slugInp) slugInp.value = post.slug;
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-j-cover-pick')?.addEventListener('change', (e) => {
    post.cover = e.target.value;
    const covInp = document.getElementById('cms-j-cover-input');
    if (covInp) covInp.value = e.target.value;
    markDirty();
    syncPreview();
  });

  document.getElementById('cms-j-cover-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast('Lädt Cover-Bild hoch…');
      const data = await uploadMediaFile(file, 'journal');
      state.images = data.images || [];
      post.cover = data.uploaded;
      markDirty();
      toast('✓ Cover-Bild hochgeladen');
      renderSidebar();
      syncPreview();
    } catch (err) {
      toast('Fehler: ' + err.message);
    }
  });

  // Bild-Einfüge-Assistent ein-/ausklappen
  document.getElementById('cms-toggle-md-img-box')?.addEventListener('click', () => {
    const box = document.getElementById('cms-md-img-assistant');
    if (box) {
      box.style.display = box.style.display === 'none' ? 'flex' : 'none';
    }
  });

  // Direkt-Upload im Markdown-Bild-Assistenten
  document.getElementById('cms-md-img-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast('Lädt Artikel-Bild hoch…');
      const data = await uploadMediaFile(file, 'journal');
      state.images = data.images || [];
      toast('✓ Bild hochgeladen: ' + data.uploaded);
      renderSidebar();
      const box = document.getElementById('cms-md-img-assistant');
      const sel = document.getElementById('cms-md-img-select');
      if (box) box.style.display = 'flex';
      if (sel) sel.value = data.uploaded;
    } catch (err) {
      toast('Fehler: ' + err.message);
    }
  });

  // Hilfsfunktion: Text an aktueller Cursor-Position in Markdown-Textarea einfügen
  const insertAtCursor = (snippet) => {
    if (!bodyTextarea) return;
    const start = bodyTextarea.selectionStart ?? bodyTextarea.value.length;
    const end = bodyTextarea.selectionEnd ?? bodyTextarea.value.length;
    const before = bodyTextarea.value.slice(0, start);
    const after = bodyTextarea.value.slice(end);
    bodyTextarea.value = before + snippet + after;
    post.body = bodyTextarea.value;
    bodyTextarea.focus();
    const newPos = start + snippet.length;
    bodyTextarea.setSelectionRange(newPos, newPos);
    markDirty();
    syncPreview();
  };

  document.getElementById('cms-md-img-insert-btn')?.addEventListener('click', () => {
    const url = document.getElementById('cms-md-img-select')?.value || '';
    const alt = (document.getElementById('cms-md-img-alt')?.value || '').trim() || post.title || 'Artikelbild';
    const caption = (document.getElementById('cms-md-img-caption')?.value || '').trim();
    const size = document.getElementById('cms-md-img-size')?.value || 'standard';

    if (!url) {
      toast('Bitte zuerst ein Bild auswählen oder hochladen.');
      return;
    }

    let mdSnippet = '';
    if (size === 'standard') {
      mdSnippet = caption
        ? `\n\n![${alt}](${url} "${caption.replace(/"/g, "'")}")\n\n`
        : `\n\n![${alt}](${url})\n\n`;
    } else {
      const cls = size === 'wide' ? 'is-wide' : 'is-narrow';
      const capHtml = caption ? `\n  <figcaption>${caption}</figcaption>` : '';
      mdSnippet = `\n\n<figure class="${cls}">\n  <img src="${url}" alt="${alt.replace(/"/g, "'")}" loading="lazy" />${capHtml}\n</figure>\n\n`;
    }

    insertAtCursor(mdSnippet);
    toast('✓ Bild in den Artikel eingefügt');
  });

  // Markdown Formatierungs-Buttons
  sidebar.querySelectorAll('[data-md-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!bodyTextarea) return;
      const act = btn.getAttribute('data-md-act');
      const start = bodyTextarea.selectionStart ?? 0;
      const end = bodyTextarea.selectionEnd ?? 0;
      const sel = bodyTextarea.value.slice(start, end);

      let rep = '';
      if (act === 'h2') rep = `\n## ${sel || 'Zwischenüberschrift'}\n`;
      else if (act === 'h3') rep = `\n### ${sel || 'Unterüberschrift'}\n`;
      else if (act === 'bold') rep = `**${sel || 'Fetter Text'}**`;
      else if (act === 'italic') rep = `*${sel || 'Kursiver Text'}*`;
      else if (act === 'quote') rep = `\n> ${sel || 'Zitat-Text…'}\n`;
      else if (act === 'ul') rep = `\n- ${sel || 'Listenpunkt'}\n`;
      else if (act === 'ol') rep = `\n1. ${sel || 'Erster Punkt'}\n`;
      else if (act === 'link') rep = `[${sel || 'Link-Text'}](https://)`;
      else if (act === 'code') rep = sel.includes('\n') ? `\n\`\`\`\n${sel}\n\`\`\`\n` : `\`${sel || 'code'}\``;
      else if (act === 'hr') rep = `\n\n---\n\n`;

      insertAtCursor(rep);
    });
  });

  document.getElementById('cms-publish-journal-btn')?.addEventListener('click', () => {
    publishJournalAndBuild(true);
  });

  document.getElementById('cms-del-j')?.addEventListener('click', () => {
    if (!confirm('Artikel wirklich löschen?')) return;
    state.journal.splice(state.editingJournalIdx, 1);
    state.editingJournalIdx = null;
    markDirty();
    publishJournalAndBuild(false);
  });
}

/* ==========================================================================
   TAB 5: POSTFACH, DISCORD-WEBHOOK & ACCOUNTS (Alles an einem Ort!)
   ========================================================================== */
function updateUnreadPill() {
  const unreadCount = (state.submissions || []).filter((s) => !s.read_at).length;
  const tabBtn = document.querySelector('[data-tab="inbox"]');
  if (!tabBtn) return;
  tabBtn.innerHTML = `Postfach & Accounts ${unreadCount > 0 ? `<span id="cms-unread-pill" style="background:var(--accent); color:#fff; border-radius:99px; padding:0.05rem 0.42rem; font-size:10.5px; margin-left:0.25rem;">${unreadCount}</span>` : ''}`;
}

function renderInboxSidebar(sidebar) {
  const subs = state.submissions || [];
  const admin = isAdmin();
  if (!admin && state.inboxSubTab !== 'messages') {
    state.inboxSubTab = 'messages';
  }
  const unreadCount = subs.filter((s) => !s.read_at).length;

  sidebar.innerHTML = `
    <div class="cms-pane-title">${admin ? 'Postfach & System' : 'Postfach'}</div>
    ${admin ? `
      <div class="cms-subtabs" style="grid-template-columns:repeat(3,1fr);">
        <button type="button" class="cms-subtab ${state.inboxSubTab === 'messages' ? 'is-active' : ''}" data-inb-tab="messages">
          Postfach (${subs.length}${unreadCount ? ` · ${unreadCount} neu` : ''})
        </button>
        <button type="button" class="cms-subtab ${state.inboxSubTab === 'webhook' ? 'is-active' : ''}" data-inb-tab="webhook">
          Discord Webhook
        </button>
        <button type="button" class="cms-subtab ${state.inboxSubTab === 'accounts' ? 'is-active' : ''}" data-inb-tab="accounts">
          Accounts (${(state.users || []).length})
        </button>
      </div>
    ` : ''}
    <div id="cms-inbox-body" style="display:flex; flex-direction:column; gap:0.9rem;"></div>
  `;

  sidebar.querySelectorAll('[data-inb-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.inboxSubTab = btn.getAttribute('data-inb-tab') || 'messages';
      state.viewingSubmissionId = null;
      renderInboxSidebar(sidebar);
    });
  });

  const body = document.getElementById('cms-inbox-body');
  if (!body) return;

  // --- SUBTAB 1: POSTFACH (Formular-Einsendungen) ---
  if (state.inboxSubTab === 'messages') {
    const formLabels = { contact: 'Kontakt', careers: 'Bewerbung' };
    const fieldLabels = {
      name: 'Name',
      email: 'E-Mail',
      subject: 'Betreff',
      project: 'Projekt / Marke',
      links: 'Links / Portfolio',
      message: 'Nachricht',
    };

    if (state.viewingSubmissionId !== null) {
      const sub = subs.find((s) => Number(s.id) === Number(state.viewingSubmissionId));
      if (!sub) {
        state.viewingSubmissionId = null;
        renderInboxSidebar(sidebar);
        return;
      }

      const fields = sub.fields || {};
      const dateStr = String(sub.created_at || '').replace('T', ' ').slice(0, 16);

      body.innerHTML = `
        <button type="button" class="cms-back-btn" id="cms-back-subs">← Alle Einsendungen</button>

        <div class="cms-upload-box" style="background:var(--bg-card); border-color:var(--border);">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
            <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--accent); border:1px solid rgba(186,82,186,0.4); border-radius:99px; padding:0.15rem 0.55rem;">
              ${esc(formLabels[sub.form_key] || sub.form_key)}
            </span>
            <span style="font-size:11.5px; color:${sub.answered_at ? '#34d399' : '#fbbf24'}; font-weight:600;">
              ${sub.answered_at ? '✓ Beantwortet' : '● Offen / Unbeantwortet'}
            </span>
          </div>

          <div style="font-size:15px; font-weight:600; color:#fff; margin-top:0.2rem;">
            ${esc(sub.name || 'Unbekannt')}
          </div>
          <div style="font-size:12px; color:var(--fg-muted);">
            Eingegangen am ${esc(dateStr)}
          </div>

          <div style="display:flex; flex-direction:column; gap:0.65rem; margin-top:0.5rem; padding-top:0.65rem; border-top:1px solid var(--border);">
            ${Object.entries(fields).map(([k, v]) => {
              if (v === '' || v === null || v === undefined) return '';
              const isEmail = k === 'email';
              return `
                <div>
                  <div style="font-size:11px; color:var(--fg-subtle); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.15rem;">
                    ${esc(fieldLabels[k] || k)}
                  </div>
                  <div style="font-size:13px; color:#fff; line-height:1.55; white-space:pre-wrap; word-break:break-word;">${isEmail ? `<a href="mailto:${esc(String(v))}?subject=${encodeURIComponent('Re: ' + (sub.subject || 'Deine Nachricht an ' + (state.site?.brand?.name || 'Gamet Studios')))}" style="color:var(--accent); text-decoration:underline;">${esc(String(v))} ↗</a>` : esc(String(v))}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          ${sub.email ? `
            <a href="mailto:${esc(sub.email)}?subject=${encodeURIComponent('Re: ' + (sub.subject || 'Deine Anfrage'))}" class="btn btn--primary btn--sm" style="width:100%; justify-content:center; text-decoration:none;">
              ✉ Direkt per E-Mail antworten (${esc(sub.email)})
            </a>
          ` : ''}
          <button type="button" class="btn btn--secondary btn--sm" id="cms-toggle-sub-answered" style="width:100%; justify-content:center;">
            ${sub.answered_at ? 'Als unbeantwortet markieren' : '✓ Als beantwortet markieren'}
          </button>
          <button type="button" class="btn btn--secondary btn--sm" id="cms-del-sub" style="color:var(--danger); align-self:flex-start;">
            Einsendung unwiderruflich löschen
          </button>
        </div>
      `;

      document.getElementById('cms-back-subs')?.addEventListener('click', () => {
        state.viewingSubmissionId = null;
        renderInboxSidebar(sidebar);
      });

      document.getElementById('cms-toggle-sub-answered')?.addEventListener('click', async () => {
        const res = await fetch('/api/cms.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
          body: JSON.stringify({
            action: 'toggle_submission_answered',
            csrf: state.csrf,
            id: sub.id,
            answered: !sub.answered_at,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          state.submissions = data.submissions || [];
          updateUnreadPill();
          toast(sub.answered_at ? 'Als offen markiert' : '✓ Als beantwortet markiert');
          renderInboxSidebar(sidebar);
        }
      });

      document.getElementById('cms-del-sub')?.addEventListener('click', async () => {
        if (!confirm('Diese Formular-Einsendung wirklich unwiderruflich löschen?')) return;
        const res = await fetch('/api/cms.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
          body: JSON.stringify({
            action: 'delete_submission',
            csrf: state.csrf,
            id: sub.id,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          state.submissions = data.submissions || [];
          state.viewingSubmissionId = null;
          updateUnreadPill();
          toast('✓ Einsendung gelöscht');
          renderInboxSidebar(sidebar);
        }
      });
      return;
    }

    if (subs.length === 0) {
      body.innerHTML = `
        <div style="padding:1.5rem 1rem; text-align:center; background:var(--bg-card); border:1px solid var(--border); border-radius:10px; color:var(--fg-muted); font-size:13px;">
          Noch keine Formular-Einsendungen im Postfach.
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="cms-list">
        ${subs.map((s) => {
          const isUnread = !s.read_at;
          const dateStr = String(s.created_at || '').replace('T', ' ').slice(0, 16);
          return `
            <div class="cms-row-card" data-open-sub="${s.id}" style="${isUnread ? 'border-color:var(--accent); background:rgba(186,82,186,0.1);' : ''}">
              <div>
                <div class="cms-row-card__title" style="display:flex; align-items:center; gap:0.4rem;">
                  ${isUnread ? `<span style="width:7px; height:7px; border-radius:50%; background:var(--accent); display:inline-block;"></span>` : ''}
                  <span>${esc(s.name || 'Unbekannt')}</span>
                  <span style="font-size:10.5px; font-weight:600; color:var(--fg-muted); border:1px solid var(--border); border-radius:99px; padding:0.05rem 0.45rem;">
                    ${esc(formLabels[s.form_key] || s.form_key)}
                  </span>
                </div>
                <div class="cms-row-card__meta" style="margin-top:0.2rem;">
                  <span>${esc(s.subject || '(Kein Betreff)')} · ${esc(dateStr)}</span>
                </div>
                ${s.answered_at ? `<div style="font-size:11px; color:#34d399; margin-top:0.2rem;">✓ Beantwortet</div>` : ''}
              </div>
              <span style="font-size:12px; color:var(--accent);">Öffnen →</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    body.querySelectorAll('[data-open-sub]').forEach((el) => {
      el.addEventListener('click', async () => {
        const id = Number(el.getAttribute('data-open-sub'));
        state.viewingSubmissionId = id;
        const target = subs.find((x) => Number(x.id) === id);
        if (target && !target.read_at) {
          target.read_at = new Date().toISOString();
          updateUnreadPill();
          fetch('/api/cms.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
            body: JSON.stringify({ action: 'mark_submission_read', csrf: state.csrf, id }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.ok && Array.isArray(d.submissions)) {
                state.submissions = d.submissions;
                updateUnreadPill();
              }
            });
        }
        renderInboxSidebar(sidebar);
      });
    });
    return;
  }

  // --- SUBTAB 2: DISCORD WEBHOOK & CLOUDFLARE TURNSTILE (Pro Webseite frei einstellbar!) ---
  if (state.inboxSubTab === 'webhook') {
    const sys = state.systemSettings || {
      discord_webhook_url: '',
      discord_role_id: '',
      site_url: '',
      turnstile_site_key: '',
      turnstile_secret_key: '',
    };

    body.innerHTML = `
      <div class="cms-upload-box">
        <div style="font-size:13px; font-weight:600; color:#fff;">🔔 Discord Webhook für Formular-Einsendungen</div>
        <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin:0;">
          Hier legst du fest, an welchen Discord-Server/Kanal neue Kontakt- und Bewerbungs-Einsendungen geschickt werden.
          <strong>Wichtig für andere Webseiten auf diesem Framework:</strong> Trage hier einfach den eigenen Discord-Webhook der jeweiligen Webseite ein (oder leere das Feld), damit Einsendungen nicht auf dem Gamet Studios Discord landen!
        </p>

        <div class="cms-field" style="margin-top:0.35rem;">
          <label>
            <span>Discord Webhook-URL</span>
            <button type="button" id="cms-clear-webhook-btn" style="background:none; border:none; color:var(--danger); font-size:11.5px; cursor:pointer; padding:0;">
              × Webhook leeren (Deaktivieren)
            </button>
          </label>
          <input
            type="url"
            id="cms-sys-webhook-url"
            value="${esc(sys.discord_webhook_url || '')}"
            placeholder="https://discord.com/api/webhooks/..."
          />
          <span class="hint">In Discord: Kanal bearbeiten → Integrationen → Webhooks → Neuer Webhook → Webhook-URL kopieren.</span>
        </div>

        <div class="cms-field">
          <label>Discord Rollen-ID für Ping <span class="hint">optional</span></label>
          <input
            type="text"
            id="cms-sys-role-id"
            value="${esc(sys.discord_role_id || '')}"
            placeholder="z. B. 1252316323648639039 (leer lassen = ohne @Rollen-Ping)"
          />
        </div>

        <div class="cms-field">
          <label>Öffentliche Webseiten-URL <span class="hint">für den Direktlink zum CMSS</span></label>
          <input
            type="url"
            id="cms-sys-site-url"
            value="${esc(sys.site_url || '')}"
            placeholder="https://gametstudios.media"
          />
        </div>
      </div>

      <div class="cms-upload-box">
        <div style="font-size:13px; font-weight:600; color:#fff;">🛡 Cloudflare Turnstile (CAPTCHA Spam-Schutz)</div>
        <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin:0;">
          Schützt Kontakt- und Bewerbungsformulare vor Spam-Bots. Sobald beide Keys aus dem Cloudflare-Dashboard eingetragen sind, erscheint das Turnstile-Widget automatisch in allen Formularen und wird serverseitig geprüft.
        </p>

        <div class="cms-field">
          <label>Site Key (Öffentlicher Schlüssel)</label>
          <input
            type="text"
            id="cms-sys-ts-site"
            value="${esc(sys.turnstile_site_key || '')}"
            placeholder="0x4AAAAAAA..."
          />
        </div>

        <div class="cms-field">
          <label>Secret Key (Geheimer Schlüssel)</label>
          <input
            type="password"
            id="cms-sys-ts-secret"
            value="${esc(sys.turnstile_secret_key || '')}"
            placeholder="0x4AAAAAAA..."
          />
          <span class="hint">Beide Felder leer lassen, um Turnstile zu deaktivieren.</span>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.45rem;">
        <button type="button" class="btn btn--primary btn--sm" id="cms-save-webhook-btn" style="width:100%; justify-content:center;">
          ✓ Webhook &amp; Turnstile speichern
        </button>
        <button type="button" class="btn btn--secondary btn--sm" id="cms-test-webhook-btn" style="width:100%; justify-content:center;">
          🔔 Test-Nachricht an Discord senden
        </button>
      </div>
    `;

    const syncSysInputs = () => {
      state.systemSettings.discord_webhook_url = (document.getElementById('cms-sys-webhook-url')?.value || '').trim();
      state.systemSettings.discord_role_id = (document.getElementById('cms-sys-role-id')?.value || '').trim();
      state.systemSettings.site_url = (document.getElementById('cms-sys-site-url')?.value || '').trim();
      state.systemSettings.turnstile_site_key = (document.getElementById('cms-sys-ts-site')?.value || '').trim();
      state.systemSettings.turnstile_secret_key = (document.getElementById('cms-sys-ts-secret')?.value || '').trim();
    };

    ['cms-sys-webhook-url', 'cms-sys-role-id', 'cms-sys-site-url', 'cms-sys-ts-site', 'cms-sys-ts-secret'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => {
        syncSysInputs();
        markDirty();
      });
    });

    document.getElementById('cms-clear-webhook-btn')?.addEventListener('click', () => {
      const u = document.getElementById('cms-sys-webhook-url');
      const r = document.getElementById('cms-sys-role-id');
      if (u) u.value = '';
      if (r) r.value = '';
      syncSysInputs();
      markDirty();
      toast('Webhook geleert – klicke unten auf Speichern zum Übernehmen.');
    });

    document.getElementById('cms-save-webhook-btn')?.addEventListener('click', async () => {
      syncSysInputs();
      const res = await fetch('/api/cms.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
        body: JSON.stringify({
          action: 'save_system_settings',
          csrf: state.csrf,
          systemSettings: state.systemSettings,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        state.systemSettings = data.systemSettings || state.systemSettings;
        toast('✓ Discord-Webhook-Einstellungen gespeichert');
      } else {
        toast('Fehler: ' + (data.error || 'Unbekannt'));
      }
    });

    document.getElementById('cms-test-webhook-btn')?.addEventListener('click', async (e) => {
      syncSysInputs();
      const btn = e.currentTarget;
      btn.textContent = 'Sendet Test-Nachricht…';
      const res = await fetch('/api/cms.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
        body: JSON.stringify({
          action: 'test_discord_webhook',
          csrf: state.csrf,
          systemSettings: state.systemSettings,
        }),
      });
      const data = await res.json();
      btn.textContent = '🔔 Test-Nachricht an Discord senden';
      if (data.ok) {
        toast('✓ Test-Nachricht erfolgreich an Discord gesendet!');
      } else {
        toast('Fehler: ' + (data.error || 'Webhook nicht erreichbar'));
      }
    });
    hideCmsSplash();
    return;
  }

  // --- SUBTAB 3: ACCOUNTS & AUTHENTIK SSO ---
  if (state.inboxSubTab === 'accounts') {
    const users = state.users || [];
    const sys = state.systemSettings || {};
    const oidcOn = sys.oidc_enabled === '1';
    const oidcFallback = sys.oidc_allow_local_fallback === '1';
    const redirectUri = sys.oidc_redirect_uri || `${location.origin}/api/oidc.php?action=callback`;

    body.innerHTML = `
      <details class="cms-acc" open>
        <summary><span>🔐 Authentik SSO (OIDC) – Haupt-Login</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin:0 0 0.65rem;">
            Verbinde deine Authentik-Instanz per OpenID Connect. Sobald aktiviert, wird <strong>Authentik als Haupt-Login</strong> verwendet.
          </p>

          <label style="display:flex; align-items:center; gap:0.5rem; font-size:12.5px; cursor:pointer; margin-bottom:0.65rem;">
            <input type="checkbox" id="cms-oidc-enabled" ${oidcOn ? 'checked' : ''} />
            <span><strong>Authentik SSO aktivieren</strong></span>
          </label>

          <div class="cms-field">
            <label>Issuer / Discovery URL <span class="hint">aus Authentik-Provider</span></label>
            <input type="url" id="cms-oidc-issuer" value="${esc(sys.oidc_issuer || '')}" placeholder="https://auth.deine-domain.de/application/o/gamet-cmss/" />
          </div>

          <div class="cms-field">
            <label>Client ID</label>
            <input type="text" id="cms-oidc-client-id" value="${esc(sys.oidc_client_id || '')}" placeholder="Client ID aus Authentik" />
          </div>

          <div class="cms-field">
            <label>Client Secret</label>
            <input type="password" id="cms-oidc-client-secret" value="${esc(sys.oidc_client_secret || '')}" placeholder="Client Secret aus Authentik" />
          </div>

          <div class="cms-field">
            <label>Admin-Gruppe <span class="hint">Vollzugriff (optional, z. B. cmss-admins)</span></label>
            <input type="text" id="cms-oidc-admin-group" value="${esc(sys.oidc_admin_group || '')}" placeholder="z. B. cmss-admins" />
          </div>

          <div class="cms-field">
            <label>Editor-Gruppe <span class="hint">nur Inhalte & Postfach (optional, z. B. cmss-editors)</span></label>
            <input type="text" id="cms-oidc-editor-group" value="${esc(sys.oidc_editor_group || '')}" placeholder="z. B. cmss-editors" />
          </div>

          <div class="cms-field">
            <label>Redirect URI <span class="hint">in Authentik eintragen</span></label>
            <div style="display:flex; gap:0.4rem;">
              <input type="text" id="cms-oidc-redirect" value="${esc(redirectUri)}" readonly style="font-size:11.5px; color:var(--fg-muted);" />
              <button type="button" class="btn btn--secondary btn--sm" id="cms-oidc-copy-uri">Kopieren</button>
            </div>
          </div>

          <label style="display:flex; align-items:center; gap:0.5rem; font-size:12px; color:var(--fg-muted); cursor:pointer; margin:0.4rem 0 0.75rem;">
            <input type="checkbox" id="cms-oidc-fallback" ${oidcFallback ? 'checked' : ''} />
            <span>Lokalen Notfall-Login als Fallback erlauben</span>
          </label>

          <button type="button" class="btn btn--primary btn--sm" id="cms-oidc-save-btn" style="width:100%; justify-content:center;">
            ✓ Authentik-Einstellungen speichern
          </button>
        </div>
      </details>

      <details class="cms-acc" ${oidcOn ? '' : 'open'}>
        <summary><span>Lokale Team-Accounts (${users.length})</span><span>▾</span></summary>
        <div class="cms-acc__body">
      <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin:0;">
        Diese lokalen Accounts dienen als Fallback bzw. für den Erstzugang vor Aktivierung von Authentik.
      </p>

      <div class="cms-list">
        ${users.map((u) => {
          const isMe = Number(u.id) === Number(state.user?.id);
          const uRole = (u.role === 'editor') ? 'editor' : 'admin';
          return `
            <div class="cms-row-card" style="cursor:default;">
              <div>
                <div class="cms-row-card__title">
                  ${esc(u.name)}
                  <span style="font-size:10.5px; padding:0.1rem 0.4rem; border-radius:99px; background:${uRole === 'admin' ? 'rgba(168,77,168,0.22)' : 'rgba(255,255,255,0.08)'}; color:${uRole === 'admin' ? 'var(--accent)' : 'var(--fg-muted)'}; margin-left:0.35rem;">${uRole === 'admin' ? 'Admin' : 'Editor'}</span>
                  ${isMe ? `<span style="font-size:11px; color:var(--accent); font-weight:600; margin-left:0.25rem;">(Du)</span>` : ''}
                </div>
                <div class="cms-row-card__meta">${esc(u.email)} · seit ${esc(String(u.created_at || '').slice(0, 10))}</div>
              </div>
              <div class="cms-row-card__actions" style="display:flex; align-items:center; gap:0.35rem;">
                ${!isMe ? `
                  <select data-role-user="${u.id}" style="font-size:11px; padding:0.15rem 0.35rem; background:var(--bg-card); color:var(--fg); border:1px solid var(--border); border-radius:6px;">
                    <option value="admin" ${uRole === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="editor" ${uRole === 'editor' ? 'selected' : ''}>Editor</option>
                  </select>
                ` : ''}
                ${!isMe && users.length > 1 ? `<button type="button" class="cms-icon-btn" data-del-user="${u.id}" data-del-name="${esc(u.name)}" title="Account löschen" style="color:var(--danger);">×</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <details class="cms-acc" open>
        <summary><span>+ Neuen Team-Account anlegen</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div class="cms-field">
            <label>Name</label>
            <input type="text" id="cms-new-u-name" placeholder="z. B. Max" />
          </div>
          <div class="cms-field">
            <label>E-Mail-Adresse</label>
            <input type="email" id="cms-new-u-email" placeholder="max@gametstudios.media" />
          </div>
          <div class="cms-field">
            <label>Rolle</label>
            <select id="cms-new-u-role">
              <option value="editor">Editor (Seiten, Journal, Projekte, Mitglieder, Postfach)</option>
              <option value="admin">Admin (Vollzugriff inkl. Accounts, Webhook & Export)</option>
            </select>
          </div>
          <div class="cms-field">
            <label>Passwort <span class="hint">mind. 8 Zeichen</span></label>
            <input type="password" id="cms-new-u-pass" placeholder="Mindestens 8 Zeichen" />
          </div>
          <button type="button" class="btn btn--primary btn--sm" id="cms-create-user-btn" style="width:100%; justify-content:center;">
            + Account erstellen
          </button>
        </div>
      </details>

      <details class="cms-acc">
        <summary><span>Eigenes Passwort ändern (${esc(state.user?.name || '')})</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div class="cms-field">
            <label>Neues Passwort <span class="hint">mind. 8 Zeichen</span></label>
            <input type="password" id="cms-my-new-pass" placeholder="Neues Passwort eingeben" />
          </div>
          <button type="button" class="btn btn--secondary btn--sm" id="cms-change-pass-btn" style="width:100%; justify-content:center;">
            ✓ Neues Passwort speichern
          </button>
        </div>
      </details>
        </div>
      </details>
    `;

    document.getElementById('cms-oidc-copy-uri')?.addEventListener('click', async () => {
      const val = document.getElementById('cms-oidc-redirect')?.value || '';
      if (val && navigator.clipboard) {
        await navigator.clipboard.writeText(val).catch(() => {});
        toast('✓ Redirect URI kopiert');
      }
    });

    document.getElementById('cms-oidc-save-btn')?.addEventListener('click', async () => {
      const enabled = document.getElementById('cms-oidc-enabled')?.checked ? '1' : '0';
      const issuer = (document.getElementById('cms-oidc-issuer')?.value || '').trim();
      const clientId = (document.getElementById('cms-oidc-client-id')?.value || '').trim();
      const clientSecret = (document.getElementById('cms-oidc-client-secret')?.value || '').trim();
      const adminGroup = (document.getElementById('cms-oidc-admin-group')?.value || '').trim();
      const editorGroup = (document.getElementById('cms-oidc-editor-group')?.value || '').trim();
      const allowFallback = document.getElementById('cms-oidc-fallback')?.checked ? '1' : '0';

      if (enabled === '1' && (!issuer || !clientId || !clientSecret)) {
        toast('Bitte Issuer URL, Client ID und Client Secret ausfüllen, bevor du Authentik aktivierst.');
        return;
      }

      const res = await fetch('/api/cms.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
        body: JSON.stringify({
          action: 'save_system_settings',
          csrf: state.csrf,
          systemSettings: {
            oidc_enabled: enabled,
            oidc_issuer: issuer,
            oidc_client_id: clientId,
            oidc_client_secret: clientSecret,
            oidc_admin_group: adminGroup,
            oidc_editor_group: editorGroup,
            oidc_allow_local_fallback: allowFallback,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        state.systemSettings = data.systemSettings || state.systemSettings;
        toast('✓ Authentik-Einstellungen gespeichert');
      } else {
        toast('Fehler: ' + (data.error || 'Speichern fehlgeschlagen'));
      }
    });

    document.getElementById('cms-create-user-btn')?.addEventListener('click', async () => {
      const name = (document.getElementById('cms-new-u-name')?.value || '').trim();
      const email = (document.getElementById('cms-new-u-email')?.value || '').trim();
      const role = document.getElementById('cms-new-u-role')?.value || 'editor';
      const password = document.getElementById('cms-new-u-pass')?.value || '';
      const res = await fetch('/api/cms.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
        body: JSON.stringify({
          action: 'create_user',
          csrf: state.csrf,
          name,
          email,
          role,
          password,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        state.users = data.users || [];
        toast(`✓ Account für ${name} angelegt`);
        renderInboxSidebar(sidebar);
      } else {
        toast('Fehler: ' + (data.error || 'Konnte Account nicht anlegen'));
      }
    });

    body.querySelectorAll('[data-role-user]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const id = Number(sel.getAttribute('data-role-user'));
        const role = sel.value;
        const res = await fetch('/api/cms.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
          body: JSON.stringify({ action: 'update_user_role', csrf: state.csrf, id, role }),
        });
        const data = await res.json();
        if (data.ok) {
          state.users = data.users || [];
          toast('✓ Rolle aktualisiert');
          renderInboxSidebar(sidebar);
        } else {
          toast('Fehler: ' + (data.error || 'Unbekannt'));
        }
      });
    });

    document.getElementById('cms-change-pass-btn')?.addEventListener('click', async () => {
      const password = document.getElementById('cms-my-new-pass')?.value || '';
      const res = await fetch('/api/cms.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
        body: JSON.stringify({
          action: 'change_password',
          csrf: state.csrf,
          id: state.user?.id,
          password,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast('✓ Dein Passwort wurde aktualisiert');
        const inp = document.getElementById('cms-my-new-pass');
        if (inp) inp.value = '';
      } else {
        toast('Fehler: ' + (data.error || 'Passwort zu kurz'));
      }
    });

    body.querySelectorAll('[data-del-user]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-del-user'));
        const uName = btn.getAttribute('data-del-name') || 'diesen Account';
        if (!confirm(`Account von ${uName} wirklich löschen?`)) return;
        const res = await fetch('/api/cms.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
          body: JSON.stringify({
            action: 'delete_user',
            csrf: state.csrf,
            id,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          state.users = data.users || [];
          toast('✓ Account gelöscht');
          renderInboxSidebar(sidebar);
        } else {
          toast('Fehler: ' + (data.error || 'Löschen fehlgeschlagen'));
        }
      });
    });
  }
}

/* ==========================================================================
   TAB 5: DESIGN & MULTI-SITE FRAMEWORK (Für beliebige Webseiten nutzbar!)
   ========================================================================== */
function renderFrameworkSidebar(sidebar) {
  const brand = state.site.brand || {};
  const overrides = state.layout.themeOverrides || {};
  const nav = state.site.nav?.[state.lang] || [];

  sidebar.innerHTML = `
    <div class="cms-pane-title">Design & Framework</div>
    <div class="cms-subtabs" style="grid-template-columns:repeat(4,1fr);">
      <button type="button" class="cms-subtab ${state.frameworkSubTab === 'brand' ? 'is-active' : ''}" data-fw-tab="brand">Marke</button>
      <button type="button" class="cms-subtab ${state.frameworkSubTab === 'nav' ? 'is-active' : ''}" data-fw-tab="nav">Menü</button>
      <button type="button" class="cms-subtab ${state.frameworkSubTab === 'ops' ? 'is-active' : ''}" data-fw-tab="ops">Betrieb</button>
      <button type="button" class="cms-subtab ${state.frameworkSubTab === 'portable' ? 'is-active' : ''}" data-fw-tab="portable">Export</button>
    </div>
    <div id="cms-fw-body" style="display:flex; flex-direction:column; gap:1rem;"></div>
  `;

  sidebar.querySelectorAll('[data-fw-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.frameworkSubTab = btn.getAttribute('data-fw-tab') || 'brand';
      renderFrameworkSidebar(sidebar);
    });
  });

  const body = document.getElementById('cms-fw-body');
  if (!body) return;

  if (state.frameworkSubTab === 'brand') {
    if (!state.site.brand) state.site.brand = { name: 'Gamet Studios', logo: {} };
    if (!state.site.brand.logo) state.site.brand.logo = {};
    const logo = state.site.brand.logo;
    const iconFiles = state.images.filter((m) => m.folder === 'icons' || m.folder === 'backgrounds');

    const COLOR_PRESETS = [
      { name: 'Gamet Violet', accentDark: '#ba52ba', accentLight: '#A84DA8', accentSecondary: '#2dcdff', accentGoldDark: '#e8b64a', bgDark: '#060607', bgLight: '#fafaf9' },
      { name: 'Emerald Studio', accentDark: '#10b981', accentLight: '#059669', accentSecondary: '#06b6d4', accentGoldDark: '#84cc16', bgDark: '#050908', bgLight: '#f6faf8' },
      { name: 'Oceanic Blue', accentDark: '#3b82f6', accentLight: '#2563eb', accentSecondary: '#38bdf8', accentGoldDark: '#f59e0b', bgDark: '#050811', bgLight: '#f8fafc' },
      { name: 'Crimson Pulse', accentDark: '#f43f5e', accentLight: '#e11d48', accentSecondary: '#fb923c', accentGoldDark: '#facc15', bgDark: '#090506', bgLight: '#fffafa' },
      { name: 'Solar Amber', accentDark: '#f59e0b', accentLight: '#d97706', accentSecondary: '#ec4899', accentGoldDark: '#fbbf24', bgDark: '#090704', bgLight: '#fdfbf7' },
      { name: 'Monochrome', accentDark: '#e4e4e7', accentLight: '#18181b', accentSecondary: '#71717a', accentGoldDark: '#a1a1aa', bgDark: '#09090b', bgLight: '#fafafa' },
    ];

    body.innerHTML = `
      <details class="cms-acc" open>
        <summary><span>1. Markenname, Version & Logos</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div class="cms-grid-2">
            <div class="cms-field">
              <label>Webseiten- / Markenname</label>
              <input type="text" id="cms-brand-name" value="${esc(brand.name || '')}" />
            </div>
            <div class="cms-field">
              <label>Versionsnummer (v:)</label>
              <div style="display:flex; align-items:center; gap:0.35rem;">
                <span style="font-size:13px; font-weight:600; color:var(--fg-muted);">v:</span>
                <input type="text" id="cms-fw-version" value="${esc(String(state.site.version ?? '1.0').replace(/^v/i, ''))}" placeholder="1.0" />
              </div>
            </div>
          </div>

          <div class="cms-field">
            <label>Logo-Darstellung in Header & Footer</label>
            <select id="cms-logo-mode">
              <option value="image" ${(logo.mode || 'image') === 'image' ? 'selected' : ''}>Eigenes Logo-Bild (Dark / Light)</option>
              <option value="text" ${logo.mode === 'text' ? 'selected' : ''}>Text-Logo (Markenname + Farbpunkt)</option>
            </select>
          </div>

          <div id="cms-logo-image-fields" style="display:${logo.mode === 'text' ? 'none' : 'flex'}; flex-direction:column; gap:0.75rem;">
            <div class="cms-field">
              <label>Logo für Dark Mode (Helles Logo)</label>
              <div style="display:flex; gap:0.4rem; align-items:center;">
                <input type="text" id="cms-logo-dark" value="${esc(logo.dark || '')}" placeholder="/assets/icons/..." />
                <label class="btn btn--secondary btn--sm" style="cursor:pointer; margin:0; white-space:nowrap;">
                  ↑ Upload
                  <input type="file" id="cms-up-logo-dark" accept=".png,.svg,.webp,.jpg,.gif" style="display:none;" />
                </label>
              </div>
            </div>

            <div class="cms-field">
              <label>Logo für Light Mode (Dunkles Logo)</label>
              <div style="display:flex; gap:0.4rem; align-items:center;">
                <input type="text" id="cms-logo-light" value="${esc(logo.light || '')}" placeholder="/assets/icons/..." />
                <label class="btn btn--secondary btn--sm" style="cursor:pointer; margin:0; white-space:nowrap;">
                  ↑ Upload
                  <input type="file" id="cms-up-logo-light" accept=".png,.svg,.webp,.jpg,.gif" style="display:none;" />
                </label>
              </div>
            </div>

            <div class="cms-field">
              <label>Logo-Höhe <span id="cms-logo-h-val">${esc(logo.height || '2.2rem')}</span></label>
              <input type="range" id="cms-logo-height" min="1.4" max="3.8" step="0.1" value="${parseFloat(logo.height) || 2.2}" />
            </div>
          </div>

          <div class="cms-field">
            <label>Favicon (Browser-Tab-Icon)</label>
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <input type="text" id="cms-favicon" value="${esc(brand.favicon || '/assets/icons/favicon.png')}" />
              <label class="btn btn--secondary btn--sm" style="cursor:pointer; margin:0; white-space:nowrap;">
                ↑ Upload
                <input type="file" id="cms-up-favicon" accept=".png,.svg,.ico" style="display:none;" />
              </label>
            </div>
          </div>
        </div>
      </details>

      <details class="cms-acc" open>
        <summary><span>2. Farbschema & Schnell-Vorlagen</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div class="cms-field">
            <label>1-Klick Farbpaletten-Vorlagen</label>
            <div class="cms-grid-2">
              ${COLOR_PRESETS.map((p, idx) => `
                <button type="button" class="cms-trans-option" data-color-preset="${idx}" style="padding:0.5rem 0.65rem;">
                  <span style="font-size:12px; font-weight:600;">${esc(p.name)}</span>
                  <span style="display:inline-flex; gap:3px;">
                    <span style="width:11px; height:11px; border-radius:50%; background:${p.accentDark};"></span>
                    <span style="width:11px; height:11px; border-radius:50%; background:${p.accentSecondary};"></span>
                  </span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="cms-grid-2">
            <div class="cms-field">
              <label>Hauptfarbe (Dark)</label>
              <div style="display:flex; gap:0.35rem;">
                <input type="color" data-color="accentDark" value="${esc(overrides.accentDark || '#ba52ba')}" style="width:38px; height:36px; border:none; background:none;" />
                <input type="text" data-color="accentDark" value="${esc(overrides.accentDark || '#ba52ba')}" />
              </div>
            </div>
            <div class="cms-field">
              <label>Hauptfarbe (Light)</label>
              <div style="display:flex; gap:0.35rem;">
                <input type="color" data-color="accentLight" value="${esc(overrides.accentLight || '#A84DA8')}" style="width:38px; height:36px; border:none; background:none;" />
                <input type="text" data-color="accentLight" value="${esc(overrides.accentLight || '#A84DA8')}" />
              </div>
            </div>
          </div>

          <div class="cms-grid-2">
            <div class="cms-field">
              <label>Zweitfarbe (Glow)</label>
              <div style="display:flex; gap:0.35rem;">
                <input type="color" data-color="accentSecondary" value="${esc(overrides.accentSecondary || '#2dcdff')}" style="width:38px; height:36px; border:none; background:none;" />
                <input type="text" data-color="accentSecondary" value="${esc(overrides.accentSecondary || '#2dcdff')}" />
              </div>
            </div>
            <div class="cms-field">
              <label>Highlight-Akzent</label>
              <div style="display:flex; gap:0.35rem;">
                <input type="color" data-color="accentGoldDark" value="${esc(overrides.accentGoldDark || '#e8b64a')}" style="width:38px; height:36px; border:none; background:none;" />
                <input type="text" data-color="accentGoldDark" value="${esc(overrides.accentGoldDark || '#e8b64a')}" />
              </div>
            </div>
          </div>

          <div class="cms-grid-2">
            <div class="cms-field">
              <label>Hintergrund (Dark)</label>
              <div style="display:flex; gap:0.35rem;">
                <input type="color" data-color="bgDark" value="${esc(overrides.bgDark || '#060607')}" style="width:38px; height:36px; border:none; background:none;" />
                <input type="text" data-color="bgDark" value="${esc(overrides.bgDark || '#060607')}" />
              </div>
            </div>
            <div class="cms-field">
              <label>Hintergrund (Light)</label>
              <div style="display:flex; gap:0.35rem;">
                <input type="color" data-color="bgLight" value="${esc(overrides.bgLight || '#fafaf9')}" style="width:38px; height:36px; border:none; background:none;" />
                <input type="text" data-color="bgLight" value="${esc(overrides.bgLight || '#fafaf9')}" />
              </div>
            </div>
          </div>
        </div>
      </details>

      <details class="cms-acc">
        <summary><span>3. Stil, Ecken & Kino-Dekorationen</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div class="cms-field">
            <label>Kino-Dekorationen (Filmklappe, Sucher-Ecken, Glühbirnen)</label>
            <select id="cms-cinema-deco">
              <option value="on" ${overrides.cinemaDeco !== false ? 'selected' : ''}>Aktiv (Gamet Studios Kino-Stil)</option>
              <option value="off" ${overrides.cinemaDeco === false ? 'selected' : ''}>Aus (Clean & Neutral für andere Marken)</option>
            </select>
          </div>
          <div class="cms-field">
            <label>Ecken-Rundung der Karten & Boxen</label>
            <select id="cms-radius-style">
              <option value="default" ${(!overrides.radiusStyle || overrides.radiusStyle === 'default') ? 'selected' : ''}>Standard (Ausgewogen)</option>
              <option value="sharp" ${overrides.radiusStyle === 'sharp' ? 'selected' : ''}>Kantig / Technisch</option>
              <option value="pill" ${overrides.radiusStyle === 'pill' ? 'selected' : ''}>Extra Weich / Rund</option>
            </select>
          </div>
        </div>
      </details>
    `;

    document.getElementById('cms-brand-name')?.addEventListener('input', (e) => {
      state.site.brand.name = e.target.value;
      markDirty();
      syncPreview();
    });

    document.getElementById('cms-fw-version')?.addEventListener('input', (e) => {
      state.site.version = e.target.value.trim().replace(/^v/i, '');
      const topVer = document.getElementById('cms-topbar-version');
      if (topVer) topVer.value = state.site.version;
      markDirty();
      syncPreview();
    });

    document.getElementById('cms-logo-mode')?.addEventListener('change', (e) => {
      state.site.brand.logo.mode = e.target.value;
      markDirty();
      renderFrameworkSidebar(sidebar);
      syncPreview();
    });

    document.getElementById('cms-logo-dark')?.addEventListener('input', (e) => {
      state.site.brand.logo.dark = e.target.value.trim();
      markDirty();
      syncPreview();
    });

    document.getElementById('cms-logo-light')?.addEventListener('input', (e) => {
      state.site.brand.logo.light = e.target.value.trim();
      markDirty();
      syncPreview();
    });

    document.getElementById('cms-logo-height')?.addEventListener('input', (e) => {
      const val = `${e.target.value}rem`;
      state.site.brand.logo.height = val;
      const lbl = document.getElementById('cms-logo-h-val');
      if (lbl) lbl.textContent = val;
      markDirty();
      syncPreview();
    });

    document.getElementById('cms-favicon')?.addEventListener('input', (e) => {
      state.site.brand.favicon = e.target.value.trim();
      markDirty();
      syncPreview();
    });

    // Direkt-Uploads für Dark Logo, Light Logo und Favicon
    const bindBrandUpload = (inputId, onDone) => {
      document.getElementById(inputId)?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          toast('Lädt Logo hoch…');
          const data = await uploadMediaFile(file, 'icons');
          state.images = data.images || [];
          onDone(data.uploaded);
          markDirty();
          toast('✓ Logo aktualisiert');
          renderFrameworkSidebar(sidebar);
          syncPreview();
        } catch (err) {
          toast('Fehler: ' + err.message);
        }
      });
    };

    bindBrandUpload('cms-up-logo-dark', (url) => { state.site.brand.logo.dark = url; });
    bindBrandUpload('cms-up-logo-light', (url) => { state.site.brand.logo.light = url; });
    bindBrandUpload('cms-up-favicon', (url) => { state.site.brand.favicon = url; });

    body.querySelectorAll('[data-color-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = COLOR_PRESETS[Number(btn.getAttribute('data-color-preset'))];
        if (!preset) return;
        if (!state.layout.themeOverrides) state.layout.themeOverrides = {};
        Object.assign(state.layout.themeOverrides, {
          accentDark: preset.accentDark,
          accentLight: preset.accentLight,
          accentSecondary: preset.accentSecondary,
          accentGoldDark: preset.accentGoldDark,
          bgDark: preset.bgDark,
          bgLight: preset.bgLight,
        });
        markDirty();
        renderFrameworkSidebar(sidebar);
        syncPreview();
        toast(`✓ Farbschema „${preset.name}“ aktiviert`);
      });
    });

    body.querySelectorAll('[data-color]').forEach((inp) => {
      inp.addEventListener('input', () => {
        if (!state.layout.themeOverrides) state.layout.themeOverrides = {};
        const key = inp.getAttribute('data-color');
        state.layout.themeOverrides[key] = inp.value;
        // Synchronisiere das Partner-Feld (Hex-Text <-> Color-Picker)
        body.querySelectorAll(`[data-color="${key}"]`).forEach((other) => {
          if (other !== inp) other.value = inp.value;
        });
        markDirty();
        syncPreview();
      });
    });

    document.getElementById('cms-cinema-deco')?.addEventListener('change', (e) => {
      if (!state.layout.themeOverrides) state.layout.themeOverrides = {};
      state.layout.themeOverrides.cinemaDeco = e.target.value !== 'off';
      markDirty();
      syncPreview();
    });

    document.getElementById('cms-radius-style')?.addEventListener('change', (e) => {
      if (!state.layout.themeOverrides) state.layout.themeOverrides = {};
      state.layout.themeOverrides.radiusStyle = e.target.value;
      markDirty();
      syncPreview();
    });
  } else if (state.frameworkSubTab === 'nav') {
    if (!state.site.contact) state.site.contact = { email: '', endpoint: '/api/submit.php' };
    if (!state.site.footer) state.site.footer = {};
    if (!Array.isArray(state.site.footer.social)) state.site.footer.social = [];
    const fSocial = state.site.footer.social;
    const FOOTER_PLATFORMS = ['instagram', 'x', 'discord', 'youtube', 'email'];

    body.innerHTML = `
      <div class="cms-field">
        <label>
          <span>Menüpunkte (${state.lang.toUpperCase()})</span>
          <button type="button" id="cms-add-nav" style="background:none; border:none; color:var(--accent); font-size:12px; cursor:pointer;">+ Link</button>
        </label>
        <div>
          ${nav.map((n, i) => `
            <details class="cms-acc">
              <summary><span>${esc(n.label)}</span><span style="color:var(--fg-subtle); font-size:11px;">${esc(n.href)}</span></summary>
              <div class="cms-acc__body">
                <div class="cms-field"><label>Name</label><input type="text" data-nav="${i}" data-k="label" value="${esc(n.label)}" /></div>
                <div class="cms-field"><label>URL</label><input type="text" data-nav="${i}" data-k="href" value="${esc(n.href)}" /></div>
                <button type="button" class="btn btn--secondary btn--sm" data-del-nav="${i}" style="color:var(--danger);">Link löschen</button>
              </div>
            </details>
          `).join('')}
        </div>
      </div>

      <div class="cms-field">
        <label>Footer Beschreibung (${state.lang.toUpperCase()})</label>
        <textarea rows="2" id="cms-footer-tagline">${esc(state.site.footer?.tagline?.[state.lang] || '')}</textarea>
      </div>

      <div class="cms-field">
        <label>Kontakt-E-Mail (Allgemein)</label>
        <input type="email" id="cms-site-contact-email" value="${esc(state.site.contact?.email || '')}" placeholder="hello@beispiel.de" />
      </div>

      <div class="cms-field" style="padding-top:0.5rem; border-top:1px solid var(--border);">
        <label>
          <span>Footer Social-Media-Kanäle (${fSocial.length})</span>
          <button type="button" id="cms-add-fsocial" style="background:none; border:none; color:var(--accent); font-size:12px; font-weight:600; cursor:pointer;">+ Kanal</button>
        </label>
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          ${fSocial.map((s, i) => `
            <div style="display:flex; gap:0.35rem; align-items:center;">
              <select data-fsocial-plat="${i}" style="width:6.8rem; flex-shrink:0; padding:0.35rem;">
                ${FOOTER_PLATFORMS.map((p) => `<option value="${esc(p)}" ${s.platform === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
              </select>
              <input type="text" data-fsocial-href="${i}" value="${esc(s.href || '')}" placeholder="https://... oder mailto:..." style="flex:1; min-width:0; padding:0.35rem 0.5rem; font-size:12px;" />
              <button type="button" class="cms-icon-btn" data-del-fsocial="${i}" style="color:var(--danger); flex-shrink:0;">×</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    body.querySelectorAll('[data-nav]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = Number(inp.getAttribute('data-nav'));
        const k = inp.getAttribute('data-k');
        nav[i][k] = inp.value;
        markDirty();
        syncPreview();
      });
    });
    body.querySelectorAll('[data-del-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        nav.splice(Number(btn.getAttribute('data-del-nav')), 1);
        markDirty();
        renderFrameworkSidebar(sidebar);
        syncPreview();
      });
    });
    document.getElementById('cms-add-nav')?.addEventListener('click', () => {
      nav.push({ label: 'Neuer Link', href: `/${state.lang}/` });
      markDirty();
      renderFrameworkSidebar(sidebar);
      syncPreview();
    });
    document.getElementById('cms-footer-tagline')?.addEventListener('input', (e) => {
      if (!state.site.footer.tagline) state.site.footer.tagline = {};
      state.site.footer.tagline[state.lang] = e.target.value;
      markDirty();
      syncPreview();
    });
    document.getElementById('cms-site-contact-email')?.addEventListener('input', (e) => {
      state.site.contact.email = e.target.value.trim();
      markDirty();
    });
    document.getElementById('cms-add-fsocial')?.addEventListener('click', () => {
      fSocial.push({ platform: 'instagram', href: 'https://instagram.com/', label: 'Instagram' });
      markDirty();
      renderFrameworkSidebar(sidebar);
      syncPreview();
    });
    body.querySelectorAll('[data-fsocial-plat]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const i = Number(sel.getAttribute('data-fsocial-plat'));
        if (fSocial[i]) {
          fSocial[i].platform = sel.value;
          fSocial[i].label = sel.value.charAt(0).toUpperCase() + sel.value.slice(1);
        }
        markDirty();
        syncPreview();
      });
    });
    body.querySelectorAll('[data-fsocial-href]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = Number(inp.getAttribute('data-fsocial-href'));
        let val = inp.value.trim();
        if (fSocial[i]?.platform === 'email' && val && !val.startsWith('mailto:') && val.includes('@')) {
          val = 'mailto:' + val;
        }
        if (fSocial[i]) fSocial[i].href = val;
        markDirty();
        syncPreview();
      });
    });
    body.querySelectorAll('[data-del-fsocial]').forEach((btn) => {
      btn.addEventListener('click', () => {
        fSocial.splice(Number(btn.getAttribute('data-del-fsocial')), 1);
        markDirty();
        renderFrameworkSidebar(sidebar);
        syncPreview();
      });
    });
  } else {
    body.innerHTML = `
      <div class="cms-upload-box">
        <div style="font-size:13px; font-weight:600; color:#fff;">✨ Blanko GS CMSS Framework Export (.zip)</div>
        <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin:0;">
          Exportiert eine komplett eigenständige, leere Starter-Webseite inkl. <strong>SETUP.md</strong>, 3 Platzhalter-Seiten, <strong>leerer Datenbank (0 Accounts → automatischer Admin-Aufsetz-Screen)</strong> und allen aktuellen CMSS-Features.
        </p>
        <a href="/api/cms.php?action=export_blanko_framework_zip" class="btn btn--primary btn--sm" style="width:100%; justify-content:center; text-decoration:none;">
          ↓ Blanko GS CMSS Framework (.zip) herunterladen
        </a>
      </div>

      ${state.hasControlHub ? `
        <div class="cms-upload-box" style="border-color:rgba(45,205,255,0.35);">
          <div style="font-size:13px; font-weight:600; color:#fff;">🛠️ Gamet Studios Engine-Basis (.zip)</div>
          <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin:0;">
            Exportiert nur die reine <strong>App-Engine</strong> (<code>includes/engine.php</code>, <code>api/app.php</code>, <code>assets/js/core/engine.js</code>, Auth/OIDC, SQLite App-Store &amp; Beispiel-App unter <code>apps/example-notes/</code>) für eigene Projekte ohne CMSS-Seiteninhalte.
          </p>
          <a href="/api/cms.php?action=export_engine_zip" class="btn btn--secondary btn--sm" style="width:100%; justify-content:center; text-decoration:none;">
            ↓ Standalone Engine (.zip) herunterladen
          </a>
        </div>
      ` : ''}

      <div class="cms-upload-box">
        <div style="font-size:13px; font-weight:600; color:#fff;">📦 Komplettes Webseiten-Backup (.zip)</div>
        <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin:0;">
          Sichert oder überträgt <strong>alles</strong> in einer einzigen ZIP-Datei: alle Seiten, Texte, Journal-Posts, Logos, Bilder, Videos sowie die komplette Datenbank (Accounts, Postfach, Discord-Webhook &amp; Turnstile).
        </p>
        <a href="/api/cms.php?action=export_zip" class="btn btn--primary btn--sm" style="width:100%; justify-content:center; text-decoration:none;">
          ↓ Komplettes ZIP-Backup herunterladen
        </a>
        <div class="cms-field" style="margin-top:0.25rem;">
          <label>ZIP-Backup wiederherstellen / einspielen</label>
          <input type="file" id="cms-import-full-zip" accept=".zip" />
          <span class="hint" id="cms-full-zip-status">Überschreibt Daten, Medien &amp; Datenbank mit dem Inhalt der Backup-ZIP.</span>
        </div>
      </div>

      <div class="cms-upload-box" style="border-color:rgba(186,82,186,0.45);">
        <div style="font-size:13px; font-weight:600; color:#fff;">⚡ Schlaues CMSS Core-Update (.zip)</div>
        <p style="font-size:12px; color:var(--fg-muted); line-height:1.5; margin:0;">
          Der <strong>einfachste Weg für Framework-Updates</strong>: Exportiere hier die reinen Systemordner (<code>cms/</code>, <code>api/</code>, <code>includes/</code>, <code>assets/js/</code>, <code>assets/css/</code>, <code>tools/</code>, <code>admin/</code>) ohne Daten/Bilder/Datenbank — und spiele sie auf jeder anderen Seite ein, ohne dass deren Inhalte überschrieben werden.
        </p>
        <a href="/api/cms.php?action=export_core_zip" class="btn btn--secondary btn--sm" style="width:100%; justify-content:center; text-decoration:none;">
          ↓ Systemordner als Core-ZIP exportieren
        </a>
        <div class="cms-field" style="margin-top:0.25rem;">
          <label>Core-Update-ZIP einspielen</label>
          <input type="file" id="cms-import-core-zip" accept=".zip" />
          <span class="hint" id="cms-core-zip-status">Deine Webseite bleibt zu 100 % erhalten – nur das CMSS-System wird aktualisiert.</span>
        </div>
      </div>

      <details class="cms-acc">
        <summary><span>Nur Struktur/Texte (.json) &amp; Reset</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div class="cms-row-card" id="cms-export-bundle">
            <div>
              <div class="cms-row-card__title">Nur JSON-Preset exportieren (.json)</div>
              <div class="cms-row-card__meta">Leichtgewichtige Vorlage ohne Bilder &amp; Datenbank</div>
            </div>
            <span>↓</span>
          </div>
          <div class="cms-field">
            <label>JSON-Preset importieren (.json)</label>
            <input type="file" id="cms-import-bundle" accept=".json" />
          </div>
          <div class="cms-row-card" id="cms-starter-reset" style="margin-top:0.25rem;">
            <div>
              <div class="cms-row-card__title">Neues Webseiten-Projekt initialisieren</div>
              <div class="cms-row-card__meta">Setzt Name &amp; Webhook für eine neue Marke zurück</div>
            </div>
            <span>✦</span>
          </div>
        </div>
      </details>
    `;

    document.getElementById('cms-import-full-zip')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!confirm('Möchtest du dieses komplette ZIP-Backup wirklich einspielen? Bestehende Inhalte, Medien und die Datenbank werden durch das Backup ersetzt.')) {
        e.target.value = '';
        return;
      }
      const statusEl = document.getElementById('cms-full-zip-status');
      try {
        const res = await uploadZipFile(file, 'full', (pct) => {
          if (statusEl) statusEl.textContent = `Spielt Backup ein (${pct}%)…`;
        });
        toast(`✓ Backup eingespielt (${res.extractedCount} Dateien)! Seite wird neu geladen…`);
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Fehler: ' + err.message;
        toast('Fehler: ' + err.message);
      }
    });

    document.getElementById('cms-import-core-zip')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!confirm('CMSS Framework-Core-Update jetzt einspielen? Alle Systemdateien werden aktualisiert, deine Inhalte, Bilder und Datenbank bleiben erhalten.')) {
        e.target.value = '';
        return;
      }
      const statusEl = document.getElementById('cms-core-zip-status');
      try {
        const res = await uploadZipFile(file, 'core', (pct) => {
          if (statusEl) statusEl.textContent = `Installiert Core-Update (${pct}%)…`;
        });
        toast(`✓ Core-Update installiert (${res.extractedCount} Systemdateien)! Lade CMSS neu…`);
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Fehler: ' + err.message;
        toast('Fehler: ' + err.message);
      }
    });

    document.getElementById('cms-export-bundle')?.addEventListener('click', () => {
      const ver = String(state.site.version ?? '1.0').replace(/^v/i, '') || '1.0';
      const bundle = {
        framework: `Gamet Studios CMSS v${ver}`,
        exportedAt: new Date().toISOString(),
        site: state.site,
        layout: state.layout,
        pagesDe: state.pagesDe,
        pagesEn: state.pagesEn,
        projectsDe: state.projectsDe,
        projectsEn: state.projectsEn,
        membersDe: state.membersDe,
        membersEn: state.membersEn,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(state.site.brand?.name || 'website').toLowerCase().replace(/\s+/g, '-')}-cms-preset.json`;
      a.click();
      toast('✓ Preset exportiert');
    });

    document.getElementById('cms-import-bundle')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (parsed.site) state.site = parsed.site;
        if (parsed.layout) state.layout = parsed.layout;
        if (parsed.pagesDe) state.pagesDe = parsed.pagesDe;
        if (parsed.pagesEn) state.pagesEn = parsed.pagesEn;
        if (parsed.projectsDe) state.projectsDe = parsed.projectsDe;
        if (parsed.projectsEn) state.projectsEn = parsed.projectsEn;
        if (parsed.membersDe) state.membersDe = parsed.membersDe;
        if (parsed.membersEn) state.membersEn = parsed.membersEn;
        markDirty();
        syncPreview();
        toast('✓ Preset geladen! Klicke oben auf Speichern zum Übernehmen.');
      } catch {
        toast('Ungültige Preset-Datei');
      }
    });

    document.getElementById('cms-starter-reset')?.addEventListener('click', async () => {
      const newBrand = prompt('Name der neuen Webseite / Marke:', 'Neue Marke');
      if (!newBrand) return;
      state.site.brand.name = newBrand;
      if (state.pagesDe.home?.hero) {
        state.pagesDe.home.hero.eyebrow = newBrand;
        state.pagesDe.home.hero.title = `Willkommen bei <span class="accent">${newBrand}</span>.`;
      }
      // Wichtig: Discord-Webhook für neue Webseiten zurücksetzen, damit nichts auf dem Gamet Studios Discord landet!
      state.systemSettings.discord_webhook_url = '';
      state.systemSettings.discord_role_id = '';
      state.systemSettings.site_url = '';
      try {
        await fetch('/api/cms.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
          body: JSON.stringify({
            action: 'save_system_settings',
            csrf: state.csrf,
            systemSettings: state.systemSettings,
          }),
        });
      } catch {
        // wird beim nächsten Speichern ohnehin übernommen
      }
      markDirty();
      syncPreview();
      toast(`✓ Auf „${newBrand}“ umgestellt & Discord-Webhook zurückgesetzt!`);
    });
  }

  if (state.frameworkSubTab === 'ops') {
    if (!state.site.maintenance) state.site.maintenance = { enabled: false, message: '' };
    if (!Array.isArray(state.site.redirects)) state.site.redirects = [];
    const maint = state.site.maintenance;
    const redirects = state.site.redirects;
    const health = state.health || [];
    const snaps = state.snapshots || [];
    const logs = state.auditLog || [];

    body.innerHTML = `
      ${state.hasControlHub ? `
        <div class="cms-upload-box" style="border-color:rgba(45,205,255,0.45);">
          <div style="font-size:12px; color:var(--fg-muted); margin-bottom:0.5rem;">
            <strong>🛡️ CMSS Control Hub</strong> — Alle verbundenen Webseiten ansehen, anpingen oder remote sperren/freigeben.
          </div>
          <a href="/control/" class="btn btn--primary btn--sm" style="width:100%; justify-content:center; text-decoration:none;">
            🛡️ Control Hub öffnen (/control/)
          </a>
        </div>
      ` : ''}
      <details class="cms-acc" open>
        <summary><span>🛠️ Wartungsmodus</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:12.5px; cursor:pointer; margin-bottom:0.6rem;">
            <input type="checkbox" id="cms-maint-enabled" ${maint.enabled ? 'checked' : ''} />
            <span><strong>Wartungsmodus aktivieren</strong> (Team sieht Seite weiter normal)</span>
          </label>
          <div class="cms-field">
            <label>Hinweis für Besucher</label>
            <textarea id="cms-maint-msg" rows="2" placeholder="Wir führen gerade Wartungsarbeiten durch...">${esc(maint.message || '')}</textarea>
          </div>
        </div>
      </details>

      <details class="cms-acc">
        <summary><span>🔀 Redirect-Manager (${redirects.length})</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div style="display:flex; flex-direction:column; gap:0.4rem; margin-bottom:0.6rem;">
            ${redirects.map((r, i) => `
              <div style="display:flex; gap:0.35rem; align-items:center;">
                <input type="text" data-redir-from="${i}" value="${esc(r.from || '')}" placeholder="/alt" style="flex:1; min-width:0; font-size:11.5px;" />
                <span style="color:var(--fg-subtle);">→</span>
                <input type="text" data-redir-to="${i}" value="${esc(r.to || '')}" placeholder="/de/projekte" style="flex:1; min-width:0; font-size:11.5px;" />
                <button type="button" class="cms-icon-btn" data-del-redir="${i}" style="color:var(--danger);">×</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="btn btn--secondary btn--sm" id="cms-add-redir" style="width:100%; justify-content:center;">+ Weiterleitung hinzufügen</button>
        </div>
      </details>

      <details class="cms-acc" open>
        <summary><span>🩺 System-Health-Check (${health.filter((h) => h.ok).length}/${health.length})</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div style="display:flex; flex-direction:column; gap:0.45rem;">
            ${health.map((h) => `
              <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; font-size:12px; padding:0.35rem 0.5rem; border-radius:6px; background:var(--bg-card);">
                <span>${h.ok ? '✅' : '⚠️'} <strong>${esc(h.label)}</strong></span>
                <span style="color:${h.ok ? 'var(--fg-muted)' : '#fbbf24'}; font-size:11px; text-align:right;">${esc(h.detail)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </details>

      <details class="cms-acc">
        <summary><span>⏪ Snapshots &amp; 1-Klick-Rollback (${snaps.length})</span><span>▾</span></summary>
        <div class="cms-acc__body">
          ${snaps.length === 0 ? '<p style="font-size:12px; color:var(--fg-muted); margin:0;">Noch keine Snapshots vorhanden. Beim nächsten Speichern wird automatisch einer erstellt.</p>' : `
            <div style="display:flex; flex-direction:column; gap:0.4rem;">
              ${snaps.map((s) => `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; font-size:11.5px; padding:0.4rem 0.5rem; border-radius:6px; background:var(--bg-card);">
                  <div>
                    <div style="font-weight:600;">${esc(s.createdAt.slice(0, 19).replace('T', ' '))}</div>
                    <div style="color:var(--fg-subtle);">${esc(s.user)} · ${esc(s.reason)}</div>
                  </div>
                  <button type="button" class="btn btn--secondary btn--sm" data-restore-snap="${esc(s.id)}">Rollback</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </details>

      <details class="cms-acc">
        <summary><span>📜 Audit-Log (${logs.length})</span><span>▾</span></summary>
        <div class="cms-acc__body">
          <div style="display:flex; flex-direction:column; gap:0.35rem; max-height:240px; overflow:auto;">
            ${logs.length === 0 ? '<p style="font-size:12px; color:var(--fg-muted); margin:0;">Noch keine Einträge.</p>' : logs.map((l) => `
              <div style="font-size:11px; padding:0.35rem 0.5rem; border-radius:6px; background:var(--bg-card);">
                <div><strong>${esc(l.user_name)}</strong> (${esc(l.user_role)}) · <code>${esc(l.action)}</code></div>
                <div style="color:var(--fg-muted);">${esc(l.summary || '')} <span style="color:var(--fg-subtle);">· ${esc(String(l.created_at || '').slice(0, 19).replace('T', ' '))}</span></div>
              </div>
            `).join('')}
          </div>
        </div>
      </details>
    `;

    document.getElementById('cms-maint-enabled')?.addEventListener('change', (e) => {
      state.site.maintenance.enabled = e.target.checked;
      markDirty();
    });
    document.getElementById('cms-maint-msg')?.addEventListener('input', (e) => {
      state.site.maintenance.message = e.target.value;
      markDirty();
    });
    body.querySelectorAll('[data-redir-from]').forEach((inp) => {
      inp.addEventListener('input', () => {
        redirects[Number(inp.getAttribute('data-redir-from'))].from = inp.value;
        markDirty();
      });
    });
    body.querySelectorAll('[data-redir-to]').forEach((inp) => {
      inp.addEventListener('input', () => {
        redirects[Number(inp.getAttribute('data-redir-to'))].to = inp.value;
        markDirty();
      });
    });
    body.querySelectorAll('[data-del-redir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        redirects.splice(Number(btn.getAttribute('data-del-redir')), 1);
        markDirty();
        renderFrameworkSidebar(sidebar);
      });
    });
    document.getElementById('cms-add-redir')?.addEventListener('click', () => {
      redirects.push({ from: '', to: '' });
      markDirty();
      renderFrameworkSidebar(sidebar);
    });
    body.querySelectorAll('[data-restore-snap]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-restore-snap');
        if (!confirm(`Wirklich auf Snapshot ${id} zurückrollen? Der aktuelle Stand wird vorher als Sicherheits-Snapshot gesichert.`)) return;
        const res = await fetch('/api/cms.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
          body: JSON.stringify({ action: 'restore_snapshot', csrf: state.csrf, id }),
        });
        const data = await res.json();
        if (data.ok) {
          toast('✓ Snapshot wiederhergestellt! Lade Daten neu...');
          await loadAll();
        } else {
          toast('Fehler: ' + (data.error || 'Rollback fehlgeschlagen'));
        }
      });
    });
  }
}

/* ==========================================================================
   TAB 6: MEDIEN (Sortiert nach Ordnern)
   ========================================================================== */
function renderMediaSidebar(sidebar) {
  const FOLDER_DEFS = [
    { key: 'backgrounds', label: 'Hintergründe (Bilder & Videos)' },
    { key: 'icons', label: 'Logos & Icons' },
    { key: 'projects', label: 'Projekte' },
    { key: 'members', label: 'Mitglieder' },
    { key: 'journal', label: 'Journal' },
    { key: 'og', label: 'OG / Social-Vorschau' },
  ];

  const activeFilter = state.mediaFolderFilter || 'all';
  const visibleFolders = activeFilter === 'all'
    ? FOLDER_DEFS
    : FOLDER_DEFS.filter((f) => f.key === activeFilter);

  const unusedSet = new Set(state.unusedImages || []);
  const renderMediaCard = (img) => `
    <div class="cms-acc" style="padding:0.5rem; display:flex; flex-direction:column; gap:0.4rem; min-width:0; overflow:hidden; ${unusedSet.has(img.url) ? 'border-color:rgba(245,158,11,0.45);' : ''}">
      ${img.type === 'video' || /\.(mp4|webm|mov)$/i.test(img.url)
        ? `<video src="${esc(img.url)}" muted loop playsinline preload="metadata" onmouseenter="this.play().catch(()=>{})" onmouseleave="this.pause()" style="width:100%; height:84px; object-fit:cover; border-radius:6px; background:var(--bg-elev-2); display:block;"></video>`
        : `<img src="${esc(img.url)}" alt="${esc(img.name)}" style="width:100%; height:84px; object-fit:cover; border-radius:6px; background:var(--bg-elev-2); display:block;" loading="lazy" decoding="async" />`
      }
      <div style="font-family:var(--font-mono); font-size:10.5px; color:var(--fg-subtle); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(img.name)}">${esc(img.name)}</div>
      ${unusedSet.has(img.url) ? `<div style="font-size:10px; color:#fbbf24;">⚠ Ungenutzt</div>` : ''}
      <div style="display:flex; gap:0.3rem; min-width:0;">
        <button type="button" class="btn btn--secondary btn--sm" data-copy-img="${esc(img.url)}" title="Pfad kopieren" style="flex:1; min-width:0; font-size:11px; padding:0.32rem 0.4rem;">Kopieren</button>
        <button type="button" class="btn btn--secondary btn--sm" data-del-img="${esc(img.url)}" data-del-img-name="${esc(img.name)}" title="Datei endgültig löschen" style="flex-shrink:0; font-size:11px; padding:0.32rem 0.45rem; color:var(--danger);">🗑</button>
      </div>
    </div>
  `;

  sidebar.innerHTML = `
    <div class="cms-pane-title">Medien (${state.images.length}${unusedSet.size ? ` · ${unusedSet.size} ungenutzt` : ''})</div>
    <form id="cms-upload-form" class="cms-upload-box">
      <div style="font-size:11px; color:var(--fg-muted); margin-bottom:0.5rem;">
        ✨ JPG/PNG-Bilder werden beim Upload automatisch auf max. 1920px skaliert und als <strong>.webp</strong> komprimiert.
      </div>
      <div class="cms-field">
        <label>1. Ziel-Ordner wählen</label>
        <select name="folder" id="cms-media-folder">
          <option value="backgrounds">Hintergründe (Bilder & Videos)</option>
          <option value="icons">Logos & Icons</option>
          <option value="projects">Projekte</option>
          <option value="members">Mitglieder</option>
          <option value="journal">Journal</option>
        </select>
      </div>
      <div class="cms-field">
        <label>2. Bild oder Video auswählen</label>
        <input type="file" id="cms-media-file" name="file" accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.mov" required />
      </div>
      <button type="submit" class="btn btn--primary btn--sm" id="cms-media-submit" style="width:100%;">
        ↑ Datei jetzt hochladen
      </button>
    </form>

    <div class="cms-field">
      <label>Nach Ordner filtern</label>
      <select id="cms-media-filter">
        <option value="all" ${activeFilter === 'all' ? 'selected' : ''}>Alle Ordner anzeigen (${state.images.length})</option>
        ${FOLDER_DEFS.map((f) => {
          const cnt = state.images.filter((img) => img.folder === f.key).length;
          return `<option value="${esc(f.key)}" ${activeFilter === f.key ? 'selected' : ''}>${esc(f.label)} (${cnt})</option>`;
        }).join('')}
      </select>
    </div>

    <div style="display:flex; flex-direction:column; gap:0.65rem;">
      ${visibleFolders.map((f) => {
        const items = state.images.filter((img) => img.folder === f.key);
        if (activeFilter === 'all' && items.length === 0) return '';
        return `
          <details class="cms-acc" open>
            <summary>
              <span>📁 ${esc(f.label)}</span>
              <span style="font-size:11.5px; color:var(--fg-subtle);">${items.length}</span>
            </summary>
            <div class="cms-acc__body">
              ${items.length === 0
                ? `<div style="font-size:12px; color:var(--fg-muted); padding:0.25rem 0;">Keine Dateien in diesem Ordner.</div>`
                : `<div class="cms-grid-2">${items.map(renderMediaCard).join('')}</div>`
              }
            </div>
          </details>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('cms-media-filter')?.addEventListener('change', (e) => {
    state.mediaFolderFilter = e.target.value;
    renderMediaSidebar(sidebar);
  });

  const doMediaUpload = async () => {
    const fileInput = document.getElementById('cms-media-file');
    const folderSel = document.getElementById('cms-media-folder');
    const subBtn = document.getElementById('cms-media-submit');
    const file = fileInput?.files?.[0];
    if (!file) {
      toast('Bitte zuerst eine Datei auswählen.');
      return;
    }
    try {
      const data = await uploadMediaFile(file, folderSel?.value || 'backgrounds', (pct) => {
        if (subBtn) subBtn.textContent = `Lädt hoch (${pct}%)…`;
      });
      state.images = data.images || [];
      toast('✓ Datei hochgeladen: ' + data.uploaded);
      renderSidebar();
    } catch (err) {
      if (subBtn) subBtn.textContent = '↑ Datei jetzt hochladen';
      toast('Fehler: ' + err.message);
    }
  };

  document.getElementById('cms-upload-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    doMediaUpload();
  });

  // Automatisch hochladen sobald eine Datei im Dialog ausgewählt wurde
  document.getElementById('cms-media-file')?.addEventListener('change', () => {
    doMediaUpload();
  });

  sidebar.querySelectorAll('[data-copy-img]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(btn.getAttribute('data-copy-img') || '');
      toast('✓ Pfad kopiert');
    });
  });

  sidebar.querySelectorAll('[data-del-img]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-del-img') || '';
      const name = btn.getAttribute('data-del-img-name') || url;
      if (!confirm(`Medium „${name}“ wirklich endgültig vom Server löschen?`)) return;
      try {
        const res = await fetch('/api/cms.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
          body: JSON.stringify({
            action: 'delete_media',
            csrf: state.csrf,
            url,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || 'Löschen fehlgeschlagen');
        }
        state.images = data.images || [];
        toast('✓ Datei gelöscht: ' + name);
        renderSidebar();
      } catch (err) {
        toast('Fehler: ' + err.message);
      }
    });
  });
}

function placeBlockBesideSection(targetSecId, pos, blockDataDe, blockDataEn = null) {
  const pKey = state.selectedPageKey;
  const sections = state.layout?.pages?.[pKey]?.sections || [];
  const idx = sections.findIndex((s) => s.id === targetSecId);
  if (idx === -1) return false;
  const targetSec = sections[idx];
  if (targetSec.component !== 'gs-custom-block') return false;

  const insertAtStart = pos === 'left';
  const pairs = [
    [state.pagesDe, blockDataDe],
    [state.pagesEn, blockDataEn || blockDataDe],
  ];
  for (const [langObj, newData] of pairs) {
    if (!langObj[pKey]) langObj[pKey] = {};
    const cur = langObj[pKey][targetSec.key];
    const clonedNew = JSON.parse(JSON.stringify(newData));
    if (cur?.blockType === 'layout') {
      if (!Array.isArray(cur.items)) cur.items = [];
      if (insertAtStart) cur.items.unshift(clonedNew);
      else cur.items.push(clonedNew);
      if (!cur.columns) cur.columns = 'auto';
    } else {
      const existing = cur ? JSON.parse(JSON.stringify(cur)) : defaultBlockData('text');
      langObj[pKey][targetSec.key] = {
        blockType: 'layout',
        eyebrow: '',
        title: '',
        columns: 'auto',
        gap: 'md',
        items: insertAtStart ? [clonedNew, existing] : [existing, clonedNew],
      };
    }
  }
  state.tab = 'pages';
  state.editingSecIdx = idx;
  state.secSubTab = 'content';
  markDirty();
  renderSidebar();
  syncPreview(targetSec.id);
  return true;
}

// Klick in der Live-Vorschau öffnet sofort den passenden Abschnitt-Editor
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg) return;
  if (msg.type === 'GS_PREVIEW_SECTION_CLICK' && msg.secId) {
    const sections = state.layout?.pages?.[state.selectedPageKey]?.sections || [];
    const idx = sections.findIndex((s) => s.id === msg.secId);
    if (idx !== -1) {
      state.tab = 'pages';
      state.editingSecIdx = idx;
      document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'pages'));
      renderSidebar();
    }
  }
  if (msg.type === 'GS_PREVIEW_REORDER_SECTION' && msg.sourceSecId && msg.targetSecId) {
    const pKey = state.selectedPageKey;
    const sections = state.layout?.pages?.[pKey]?.sections || [];
    const fromIdx = sections.findIndex((s) => s.id === msg.sourceSecId);
    const toIdx = sections.findIndex((s) => s.id === msg.targetSecId);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const srcSec = sections[fromIdx];
      const tgtSec = sections[toIdx];
      if ((msg.pos === 'left' || msg.pos === 'right') && srcSec.component === 'gs-custom-block' && tgtSec.component === 'gs-custom-block') {
        const srcDe = state.pagesDe?.[pKey]?.[srcSec.key];
        const srcEn = state.pagesEn?.[pKey]?.[srcSec.key];
        if (srcDe && srcDe.blockType !== 'layout') {
          sections.splice(fromIdx, 1);
          placeBlockBesideSection(msg.targetSecId, msg.pos, srcDe, srcEn || srcDe);
          return;
        }
      }
      const [moved] = sections.splice(fromIdx, 1);
      const newTo = sections.findIndex((s) => s.id === msg.targetSecId);
      const insertAt = msg.pos === 'after' ? newTo + 1 : newTo;
      sections.splice(insertAt, 0, moved);
      state.tab = 'pages';
      state.editingSecIdx = insertAt;
      markDirty();
      renderSidebar();
      syncPreview(moved.id);
    }
  }
  if (msg.type === 'GS_PREVIEW_INSERT_BLOCK' && msg.block) {
    const sections = state.layout?.pages?.[state.selectedPageKey]?.sections || [];
    if ((msg.pos === 'left' || msg.pos === 'right') && msg.targetSecId) {
      const bType = msg.block.blockType || 'text';
      if (bType !== 'layout' && placeBlockBesideSection(msg.targetSecId, msg.pos, defaultBlockData(bType))) {
        return;
      }
    }
    const toIdx = sections.findIndex((s) => s.id === msg.targetSecId);
    const insertAt = toIdx === -1 ? sections.length : (msg.pos === 'after' ? toIdx + 1 : toIdx);
    insertBuilderBlock(msg.block, insertAt);
  }
  if (msg.type === 'GS_PREVIEW_INSERT_INTO_LAYOUT' && msg.targetSecId && msg.block) {
    const pKey = state.selectedPageKey;
    const sections = state.layout?.pages?.[pKey]?.sections || [];
    const idx = sections.findIndex((s) => s.id === msg.targetSecId);
    if (idx !== -1) {
      const sec = sections[idx];
      const bType = msg.block.blockType || 'text';
      if (bType !== 'layout' && sec.component === 'gs-custom-block') {
        const seed = defaultBlockData(bType);
        for (const langObj of [state.pagesDe, state.pagesEn]) {
          if (langObj?.[pKey]?.[sec.key]?.blockType === 'layout') {
            if (!Array.isArray(langObj[pKey][sec.key].items)) langObj[pKey][sec.key].items = [];
            langObj[pKey][sec.key].items.push(JSON.parse(JSON.stringify(seed)));
          }
        }
        state.tab = 'pages';
        state.editingSecIdx = idx;
        state.secSubTab = 'content';
        markDirty();
        renderSidebar();
        syncPreview(sec.id);
      }
    }
  }
  if (msg.type === 'GS_PREVIEW_SECTION_ACTION' && msg.secId && msg.act) {
    const pKey = state.selectedPageKey;
    const sections = state.layout?.pages?.[pKey]?.sections || [];
    const idx = sections.findIndex((s) => s.id === msg.secId);
    if (idx === -1) return;
    if (msg.act === 'up' && idx > 0) {
      [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
      state.editingSecIdx = idx - 1;
      markDirty();
      renderSidebar();
      syncPreview(sections[idx - 1].id);
    } else if (msg.act === 'down' && idx < sections.length - 1) {
      [sections[idx + 1], sections[idx]] = [sections[idx], sections[idx + 1]];
      state.editingSecIdx = idx + 1;
      markDirty();
      renderSidebar();
      syncPreview(sections[idx + 1].id);
    } else if (msg.act === 'dup') {
      const clone = JSON.parse(JSON.stringify(sections[idx]));
      const uid = Date.now().toString(36);
      clone.id = `${pKey}-${uid}`;
      if (clone.component === 'gs-custom-block') {
        const oldKey = clone.key;
        const newKey = `cb_${uid}`;
        clone.key = newKey;
        for (const langObj of [state.pagesDe, state.pagesEn]) {
          if (langObj?.[pKey]?.[oldKey]) {
            langObj[pKey][newKey] = JSON.parse(JSON.stringify(langObj[pKey][oldKey]));
          }
        }
      }
      sections.splice(idx + 1, 0, clone);
      state.editingSecIdx = idx + 1;
      markDirty();
      renderSidebar();
      syncPreview(clone.id);
    } else if (msg.act === 'del') {
      if (!confirm('Diesen Abschnitt wirklich von der Seite entfernen?')) return;
      sections.splice(idx, 1);
      state.editingSecIdx = null;
      markDirty();
      renderSidebar();
      syncPreview();
    }
  }
  if (msg.type === 'GS_PREVIEW_JOURNAL_READY') {
    syncPreview();
  }
});

/* ==========================================================================
   SIRI-STYLE COMMAND PALETTE (Cmd+K / Strg+K)
   ========================================================================== */
function normalizeCmdText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCommandCatalog() {
  const admin = isAdmin();
  const switchTab = (tab, subAction = null) => {
    state.tab = tab;
    state.editingSecIdx = null;
    state.editingProjectIdx = null;
    state.editingMemberIdx = null;
    state.editingJournalIdx = null;
    state.viewingSubmissionId = null;
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === tab));
    if (subAction) subAction();
    renderSidebar();
  };
  const openPage = (pageKey) => {
    state.selectedPageKey = pageKey;
    switchTab('pages');
    const iframe = document.getElementById('cms-preview-iframe');
    const label = document.getElementById('cms-preview-url-label');
    const url = currentPreviewUrl();
    if (iframe) iframe.src = url;
    if (label) label.textContent = url.replace('?cms_preview=1', '');
  };

  const cmds = [
    {
      icon: '💾',
      title: 'Änderungen speichern',
      subtitle: 'Alle Seiten, Projekte, Mitglieder & Journal-Posts sichern',
      category: 'Aktion',
      synonyms: ['save', 'sichern', 'alles speichern', 'speichere', 'veroeffentlichen', 'publish', 'changes'],
      run: () => saveAll(),
    },
    {
      icon: '📝',
      title: 'Neuen Journal-Post schreiben',
      subtitle: 'Erstellt einen neuen Blog-Artikel im Markdown-Studio',
      category: 'Erstellen',
      synonyms: ['neuer artikel', 'blogpost erstellen', 'journal anlegen', 'beitrag schreiben', 'new post', 'blog', 'news schreiben'],
      run: () => { switchTab('journal'); createNewJournalPostAndOpen(); },
    },
    {
      icon: '📁',
      title: 'Neues Projekt anlegen',
      subtitle: 'Fügt ein neues Projekt zur Liste hinzu',
      category: 'Erstellen',
      synonyms: ['projekt erstellen', 'projekt hinzufuegen', 'new project', 'portfolio'],
      run: () => { switchTab('projects'); createNewProjectAndOpen(); },
    },
    {
      icon: '👤',
      title: 'Neues Teammitglied anlegen',
      subtitle: 'Fügt ein neues Mitglied im Team-Bereich hinzu',
      category: 'Erstellen',
      synonyms: ['mitglied erstellen', 'person hinzufuegen', 'teammitglied anlegen', 'new member', 'user'],
      run: () => { switchTab('members'); createNewMemberAndOpen(); },
    },
    {
      icon: '🇩🇪',
      title: 'Auf Deutsch wechseln',
      subtitle: 'Vorschau & Editor auf Deutsch (DE) umschalten',
      category: 'Ansicht',
      synonyms: ['sprache deutsch', 'german', 'de', 'auf deutsch stellen'],
      run: () => document.querySelector('[data-lang="de"]')?.click(),
    },
    {
      icon: '🇬🇧',
      title: 'Auf Englisch wechseln',
      subtitle: 'Vorschau & Editor auf Englisch (EN) umschalten',
      category: 'Ansicht',
      synonyms: ['sprache englisch', 'english', 'en', 'auf englisch stellen'],
      run: () => document.querySelector('[data-lang="en"]')?.click(),
    },
    {
      icon: '📱',
      title: 'Handy-Vorschau (Mobile)',
      subtitle: 'Live-Vorschau auf Smartphone-Größe umschalten',
      category: 'Ansicht',
      synonyms: ['mobile', 'smartphone', 'handy', 'responsive', 'klein'],
      run: () => document.querySelector('[data-vp="mobile"]')?.click(),
    },
    {
      icon: '📲',
      title: 'Tablet-Vorschau',
      subtitle: 'Live-Vorschau auf Tablet-Größe umschalten',
      category: 'Ansicht',
      synonyms: ['tablet', 'ipad'],
      run: () => document.querySelector('[data-vp="tablet"]')?.click(),
    },
    {
      icon: '🖥',
      title: 'Desktop-Vorschau',
      subtitle: 'Live-Vorschau auf volle Breite umschalten',
      category: 'Ansicht',
      synonyms: ['desktop', 'pc', 'vollbild', 'gross'],
      run: () => document.querySelector('[data-vp="desktop"]')?.click(),
    },
    {
      icon: '📬',
      title: 'Postfach öffnen',
      subtitle: 'Kontakt- & Bewerbungsanfragen ansehen',
      category: 'Navigation',
      synonyms: ['nachrichten', 'inbox', 'kontaktformular', 'anfragen', 'post'],
      run: () => switchTab('inbox', () => { state.inboxSubTab = 'messages'; }),
    },
    {
      icon: '🖼',
      title: 'Medienbibliothek öffnen',
      subtitle: 'Bilder & Videos hochladen, kopieren oder löschen',
      category: 'Navigation',
      synonyms: ['bilder', 'fotos', 'videos', 'upload', 'media', 'dateien', 'ungenutzt'],
      run: () => switchTab('media'),
    },
    {
      icon: '✨',
      title: 'Neuigkeiten & Update-Verlauf anzeigen',
      subtitle: 'Zeigt alle Änderungen der aktuellen Version',
      category: 'Info',
      synonyms: ['changelog', 'updates', 'was ist neu', 'version', 'hotfix'],
      run: () => showChangelogModal(false),
    },
    {
      icon: '🚪',
      title: 'Abmelden / Ausloggen',
      subtitle: 'Beendet die aktuelle CMSS-Sitzung',
      category: 'Konto',
      synonyms: ['logout', 'ausloggen', 'abmelden', 'sign out', 'sitzung beenden'],
      run: () => document.getElementById('cms-logout-btn')?.click(),
    },
  ];

  // Alle Bausteine als direkte "Einfügen"-Befehle
  for (const b of BUILDER_BLOCKS) {
    cmds.push({
      icon: b.icon,
      title: `Baustein einfügen: ${b.label}`,
      subtitle: 'Fügt diesen Baustein direkt auf der aktuellen Seite ein',
      category: 'Baustein',
      synonyms: [`${b.label} hinzufuegen`, `${b.label} einbauen`, `${b.label} einfuegen`, 'neues element', 'element', 'block'],
      run: () => insertBuilderBlock(b),
    });
  }

  // Alle Seiten dynamisch
  for (const [k, cfg] of Object.entries(state.layout?.pages || {})) {
    cmds.push({
      icon: '📄',
      title: `Seite öffnen: ${cfg.label || k}`,
      subtitle: `${cfg.pathDe || ''} · ${cfg.pathEn || ''}`,
      category: 'Seiten',
      synonyms: [`gehe zu ${cfg.label || k}`, `oeffne ${cfg.label || k}`, `bearbeite ${cfg.label || k}`, k, cfg.pathDe || '', cfg.pathEn || ''],
      run: () => openPage(k),
    });
  }

  // Alle Projekte dynamisch
  (activeProjectsData().items || []).forEach((p, idx) => {
    cmds.push({
      icon: '📁',
      title: `Projekt bearbeiten: ${p.title || p.slug}`,
      subtitle: p.tagline || p.year || '',
      category: 'Projekte',
      synonyms: ['projekt', p.title || '', p.slug || ''],
      run: () => { state.tab = 'projects'; state.editingProjectIdx = idx; document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'projects')); renderSidebar(); },
    });
  });

  // Alle Mitglieder dynamisch
  (activeMembersData().items || []).forEach((m, idx) => {
    cmds.push({
      icon: '👤',
      title: `Mitglied bearbeiten: ${m.name || m.slug}`,
      subtitle: m.role || '',
      category: 'Mitglieder',
      synonyms: ['mitglied', 'team', m.name || '', m.slug || ''],
      run: () => { state.tab = 'members'; state.editingMemberIdx = idx; document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'members')); renderSidebar(); },
    });
  });

  // Alle Journal-Posts dynamisch
  (state.journal || []).forEach((j, idx) => {
    cmds.push({
      icon: '📰',
      title: `Artikel bearbeiten: ${j.title || j.slug}`,
      subtitle: `${j.date || ''} · ${j.author || ''}`,
      category: 'Journal',
      synonyms: ['artikel', 'journal', 'blog', j.title || '', j.slug || ''],
      run: () => { state.tab = 'journal'; state.editingJournalIdx = idx; document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === 'journal')); renderSidebar(); },
    });
  });

  // Admin-Befehle
  if (admin) {
    cmds.push(
      {
        icon: '🛠️',
        title: 'Wartungsmodus einschalten (Seite offline nehmen)',
        subtitle: 'Besucher sehen die Wartungsseite, Team arbeitet weiter',
        category: 'System (Admin)',
        synonyms: ['wartung an', 'wartungsmodus aktivieren', 'maintenance on', 'offline nehmen', 'seite sperren', 'wartungsseite an'],
        run: () => {
          if (!state.site.maintenance) state.site.maintenance = { enabled: true, message: '' };
          state.site.maintenance.enabled = true;
          markDirty();
          switchTab('framework', () => { state.frameworkSubTab = 'ops'; });
          toast('🛠️ Wartungsmodus aktiviert — jetzt noch „Speichern“ klicken!');
        },
      },
      {
        icon: '🟢',
        title: 'Wartungsmodus ausschalten (Seite wieder live)',
        subtitle: 'Öffnet die Webseite wieder für alle Besucher',
        category: 'System (Admin)',
        synonyms: ['wartung aus', 'wartungsmodus deaktivieren', 'maintenance off', 'online schalten', 'wartung beenden', 'live schalten'],
        run: () => {
          if (!state.site.maintenance) state.site.maintenance = { enabled: false, message: '' };
          state.site.maintenance.enabled = false;
          markDirty();
          switchTab('framework', () => { state.frameworkSubTab = 'ops'; });
          toast('🟢 Wartungsmodus ausgeschaltet — jetzt noch „Speichern“ klicken!');
        },
      },
      {
        icon: '🔐',
        title: 'Authentik SSO & Accounts öffnen',
        subtitle: 'OpenID Connect & Team-Zugänge verwalten',
        category: 'System (Admin)',
        synonyms: ['authentik', 'oidc', 'sso', 'accounts', 'benutzer', 'login einstellungen', 'rollen'],
        run: () => switchTab('inbox', () => { state.inboxSubTab = 'accounts'; }),
      },
      {
        icon: '🔔',
        title: 'Discord Webhook & Turnstile öffnen',
        subtitle: 'Formular-Benachrichtigungen & Bot-Schutz',
        category: 'System (Admin)',
        synonyms: ['discord', 'webhook', 'turnstile', 'captcha', 'benachrichtigung'],
        run: () => switchTab('inbox', () => { state.inboxSubTab = 'webhook'; }),
      },
      {
        icon: '🩺',
        title: 'System-Health-Check, Snapshots & Audit-Log',
        subtitle: 'Server-Diagnose, Rollback & Änderungsprotokoll öffnen',
        category: 'System (Admin)',
        synonyms: ['health', 'diagnose', 'snapshot', 'rollback', 'audit', 'log', 'redirects', 'weiterleitung', 'betrieb'],
        run: () => switchTab('framework', () => { state.frameworkSubTab = 'ops'; }),
      },
      {
        icon: '📦',
        title: 'Core-Update-ZIP herunterladen',
        subtitle: 'Exportiert die verschlüsselte Core-Update-Datei',
        category: 'Export (Admin)',
        synonyms: ['core update exportieren', 'core zip', 'system export', 'update paket'],
        run: () => { location.href = '/api/cms.php?action=export_core_zip'; },
      },
      {
        icon: '🗄️',
        title: 'Vollbackup (ZIP) herunterladen',
        subtitle: 'Sichert alle Inhalte, Medien & die SQLite-Datenbank',
        category: 'Export (Admin)',
        synonyms: ['backup', 'vollbackup', 'sicherung herunterladen', 'zip backup'],
        run: () => { location.href = '/api/cms.php?action=export_zip'; },
      },
    );
    if (state.hasControlHub) {
      cmds.push({
        icon: '🛡️',
        title: 'CMSS Control Hub öffnen (/control/)',
        subtitle: 'Alle verbundenen Instanzen ansehen, anpingen oder sperren',
        category: 'System (Admin)',
        synonyms: ['control hub', 'notschalter', 'instanzen', 'lizenzen', 'remote'],
        run: () => { location.href = '/control/'; },
      });
    }
  }
  return cmds;
}

function scoreCommand(cmd, rawQuery) {
  const q = normalizeCmdText(rawQuery);
  if (!q) return 1;
  const hayTitle = normalizeCmdText(cmd.title);
  const haySub = normalizeCmdText(cmd.subtitle);
  const haySyn = (cmd.synonyms || []).map(normalizeCmdText).join(' ');
  const combined = `${hayTitle} ${haySub} ${haySyn}`;

  if (hayTitle === q) return 1000;
  if (hayTitle.startsWith(q)) return 500;
  if (combined.includes(q)) return 250;

  const stopWords = new Set(['bitte', 'mal', 'mir', 'den', 'die', 'das', 'der', 'ein', 'eine', 'auf', 'zu', 'und', 'ich', 'will', 'moechte', 'kannst', 'du', 'mach', 'stelle', 'schalte']);
  const tokens = q.split(' ').filter((t) => t && !stopWords.has(t));
  if (!tokens.length) return 1;

  let hits = 0;
  for (const tok of tokens) {
    if (hayTitle.includes(tok)) hits += 3;
    else if (haySyn.includes(tok)) hits += 2;
    else if (haySub.includes(tok)) hits += 1;
  }
  return hits > 0 ? hits * 10 : 0;
}

function openCommandPalette() {
  if (!state.user) return;
  document.getElementById('gs-cmdk-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'gs-cmdk-modal';
  modal.style.cssText = 'position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.68); backdrop-filter:blur(6px); display:flex; align-items:flex-start; justify-content:center; padding:10vh 1.25rem 2rem;';
  modal.innerHTML = `
    <div style="width:100%; max-width:600px; background:var(--bg-elevated, #141417); border:1px solid var(--border); border-radius:14px; overflow:hidden; box-shadow:0 24px 70px rgba(0,0,0,0.65);">
      <div style="display:flex; align-items:center; gap:0.65rem; padding:0.85rem 1rem; border-bottom:1px solid var(--border);">
        <span style="font-size:1rem; opacity:0.75;">⌘K</span>
        <input id="gs-cmdk-input" type="text" placeholder="Befehl eintippen… z. B. „Wartungsmodus an“, „Neuer Blogpost“, „Bild einfügen“" style="flex:1; background:transparent; border:none; color:#fff; font-size:14px; outline:none;" autocomplete="off" />
        <span style="font-size:11px; color:var(--fg-subtle);">ESC</span>
      </div>
      <div id="gs-cmdk-list" style="max-height:52vh; overflow-y:auto; padding:0.4rem;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = document.getElementById('gs-cmdk-input');
  const listEl = document.getElementById('gs-cmdk-list');
  const catalog = buildCommandCatalog();
  let selectedIdx = 0;
  let currentResults = [];

  const renderList = () => {
    const q = input.value;
    currentResults = catalog
      .map((cmd) => ({ cmd, score: scoreCommand(cmd, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 14)
      .map((r) => r.cmd);

    if (selectedIdx >= currentResults.length) selectedIdx = 0;
    if (!currentResults.length) {
      listEl.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--fg-subtle); font-size:13px;">Kein passender Befehl gefunden.</div>`;
      return;
    }
    listEl.innerHTML = currentResults.map((c, i) => `
      <button type="button" data-cmdk-idx="${i}" style="width:100%; display:flex; align-items:center; justify-content:space-between; gap:0.75rem; text-align:left; padding:0.6rem 0.75rem; border:0; border-radius:9px; background:${i === selectedIdx ? 'rgba(186,82,186,0.22)' : 'transparent'}; color:var(--fg); cursor:pointer;">
        <div style="display:flex; align-items:center; gap:0.65rem; min-width:0;">
          <span style="font-size:1rem; flex-shrink:0;">${c.icon}</span>
          <div style="min-width:0;">
            <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(c.title)}</div>
            <div style="font-size:11px; color:var(--fg-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(c.subtitle)}</div>
          </div>
        </div>
        <span style="font-size:10.5px; color:var(--fg-subtle); flex-shrink:0;">${esc(c.category)}</span>
      </button>
    `).join('');

    listEl.querySelectorAll('[data-cmdk-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const c = currentResults[Number(btn.getAttribute('data-cmdk-idx'))];
        modal.remove();
        c?.run();
      });
    });
  };

  input.addEventListener('input', () => { selectedIdx = 0; renderList(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { modal.remove(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = (selectedIdx + 1) % Math.max(1, currentResults.length); renderList(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = (selectedIdx - 1 + currentResults.length) % Math.max(1, currentResults.length); renderList(); }
    if (e.key === 'Enter' && currentResults[selectedIdx]) {
      e.preventDefault();
      const c = currentResults[selectedIdx];
      modal.remove();
      c.run();
    }
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  renderList();
  input.focus();
}

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (document.getElementById('gs-cmdk-modal')) {
      document.getElementById('gs-cmdk-modal')?.remove();
    } else {
      openCommandPalette();
    }
  }
});

loadAll();
