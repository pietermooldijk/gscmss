/**
 * Gamet Studios WARP Engine v2.2 — Frontend App-Framework SDK
 * (Web Application Runtime Platform)
 *
 * Zero-Dependency ES-Modul für komplette Web-Apps auf Basis der Gamet Studios WARP Engine:
 *   import { gsEngine } from '/assets/js/core/engine.js';
 *   // oder: import { warp } from '/assets/js/core/engine.js';
 */

let _csrf = '';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function throttle(fn, wait = 200) {
  let last = 0;
  let timer = null;
  return (...args) => {
    const now = Date.now();
    const rem = wait - (now - last);
    if (rem <= 0) {
      clearTimeout(timer);
      timer = null;
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...args);
      }, rem);
    }
  };
}

export async function copyText(text, toastMessage = 'In Zwischenablage kopiert') {
  try {
    await navigator.clipboard.writeText(String(text ?? ''));
    if (toastMessage) toast(toastMessage, 'success');
    return true;
  } catch {
    return false;
  }
}

export function createEvents() {
  const map = new Map();
  return {
    on(event, fn) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(fn);
      return () => map.get(event)?.delete(fn);
    },
    off(event, fn) {
      map.get(event)?.delete(fn);
    },
    emit(event, payload) {
      map.get(event)?.forEach((fn) => fn(payload));
    },
  };
}

export function fmtDate(iso, locale = 'de-DE') {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

async function parseJson(res) {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(`HTTP ${res.status}: ${txt.replace(/<[^>]+>/g, ' ').trim().slice(0, 160)}`);
  }
}

export async function api(action, payload = null, { app = '', method = null } = {}) {
  const httpMethod = method || (payload ? 'POST' : 'GET');
  const params = new URLSearchParams();
  if (app) params.set('app', app);
  if (httpMethod === 'GET' && action) params.set('action', action);

  if (httpMethod === 'GET' && payload && typeof payload === 'object') {
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined && v !== null) {
        params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    }
  }

  const url = `/api/app.php${params.toString() ? '?' + params.toString() : ''}`;
  const init = {
    method: httpMethod,
    cache: 'no-store',
    headers: {},
  };

  if (httpMethod !== 'GET') {
    init.headers['Content-Type'] = 'application/json';
    if (_csrf) init.headers['X-CSRF-Token'] = _csrf;
    init.body = JSON.stringify({ action, ...(payload || {}), csrf: _csrf });
  }

  const res = await fetch(url, init);
  const data = await parseJson(res);
  if (data.csrf) _csrf = data.csrf;
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request fehlgeschlagen (HTTP ${res.status})`);
  }
  return data;
}

export async function auth() {
  return api('engine_info', null, { method: 'GET' });
}

export const store = {
  list: (ns) => api('store_list', { ns }, { method: 'GET' }),
  query: (ns, opts = {}) => api('store_query', { ns, ...opts }, { method: 'GET' }),
  get: (ns, key) => api('store_get', { ns, key }, { method: 'GET' }),
  put: (ns, key, data) => api('store_put', { ns, key, data }, { method: 'POST' }),
  patch: (ns, key, patch) => api('store_patch', { ns, key, patch }, { method: 'POST' }),
  count: (ns, where = null) => api('store_count', where ? { ns, where } : { ns }, { method: 'GET' }),
  namespaces: () => api('store_namespaces', null, { method: 'GET' }),
  export: (ns) => api('store_export', { ns }, { method: 'GET' }),
  import: (ns, items) => api('store_import', { ns, items }, { method: 'POST' }),
  remove: (ns, key) => api('store_delete', { ns, key }, { method: 'POST' }),
};

export const flags = {
  list: () => api('flags_list', null, { method: 'GET' }),
  set: (name, enabled) => api('flag_set', { name, enabled: Boolean(enabled) }, { method: 'POST' }),
};

export const appSettings = {
  get: (appSlug) => api('app_settings_get', { appSlug }, { method: 'GET' }),
  set: (appSlug, key, value) => api('app_setting_set', { appSlug, key, value }, { method: 'POST' }),
};

export function sse(url, handlers = {}) {
  const es = new EventSource(url);
  const parse = (raw) => {
    try { return JSON.parse(raw); } catch { return raw; }
  };
  for (const [ev, fn] of Object.entries(handlers)) {
    if (typeof fn !== 'function') continue;
    if (ev === 'open') es.addEventListener('open', fn);
    else if (ev === 'error') es.addEventListener('error', fn);
    else if (ev === 'message') es.addEventListener('message', (e) => fn(parse(e.data), e));
    else es.addEventListener(ev, (e) => fn(parse(e.data), e));
  }
  return {
    source: es,
    close: () => es.close(),
  };
}

export const uploads = {
  list: (ns = '', limit = 100) => api('uploads_list', ns ? { ns, limit } : { limit }, { method: 'GET' }),
  upload: (file, ns = 'general') => upload(file, ns),
};

export const tokens = {
  list: () => api('tokens_list', null, { method: 'GET' }),
  create: (name, scopes = ['*'], ttlDays = 90) => api('token_create', { name, scopes, ttlDays }, { method: 'POST' }),
  revoke: (id) => api('token_revoke', { id }, { method: 'POST' }),
};

export async function upload(file, ns = 'general') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('ns', ns);
  if (_csrf) fd.append('csrf', _csrf);
  const res = await fetch(`/api/app.php?action=upload&ns=${encodeURIComponent(ns)}`, {
    method: 'POST',
    headers: _csrf ? { 'X-CSRF-Token': _csrf } : {},
    body: fd,
  });
  const data = await parseJson(res);
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Upload fehlgeschlagen');
  }
  return data.file;
}

// --- Reaktives State-Management ---

export function createStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = new Set();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      listeners.forEach((fn) => fn(state));
    },
    subscribe: (fn) => {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
  };
}

// --- Leichtgewichtiger Hash-SPA-Router ---

export function createRouter() {
  const routes = [];
  function add(pattern, handler) {
    const keys = [];
    const regexStr = pattern
      .replace(/:([A-Za-z0-9_]+)/g, (_, k) => {
        keys.push(k);
        return '([^/]+)';
      });
    routes.push({ regex: new RegExp(`^${regexStr}$`), keys, handler });
  }
  function resolve() {
    const hash = location.hash.replace(/^#/, '') || '/';
    for (const r of routes) {
      const m = hash.match(r.regex);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        r.handler(params);
        return;
      }
    }
  }
  function navigate(path) {
    location.hash = path.startsWith('#') ? path : '#' + path;
  }
  function start() {
    window.addEventListener('hashchange', resolve);
    resolve();
  }
  return { add, navigate, start, resolve };
}

// --- UI-Komponenten (Toast, Modal, Confirm, Table, Form) ---

export function toast(message, type = 'info') {
  let wrap = document.getElementById('gs-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'gs-toast-wrap';
    Object.assign(wrap.style, {
      position: 'fixed', right: '1rem', bottom: '1rem', zIndex: '99999',
      display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '360px',
    });
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.textContent = message;
  const bg = type === 'error' ? '#dc2626' : (type === 'success' ? '#16a34a' : '#18181b');
  Object.assign(el.style, {
    padding: '0.65rem 1rem', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
    color: '#fff', background: bg, border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
  });
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

export function modal({ title = '', bodyHtml = '', width = '520px', onMount = null }) {
  const backdrop = document.createElement('div');
  Object.assign(backdrop.style, {
    position: 'fixed', inset: '0', zIndex: '99998', background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    backdropFilter: 'blur(6px)',
  });
  backdrop.innerHTML = `
    <div style="width:100%; max-width:${esc(width)}; background:#111114; color:#f4f4f5; border:1px solid rgba(255,255,255,0.14); border-radius:14px; padding:1.25rem; box-shadow:0 24px 60px rgba(0,0,0,0.6);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.9rem;">
        <strong style="font-size:1.05rem;">${esc(title)}</strong>
        <button type="button" data-gs-close style="background:none; border:none; color:#a1a1aa; font-size:1.2rem; cursor:pointer;">✕</button>
      </div>
      <div data-gs-body>${bodyHtml}</div>
    </div>
  `;
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('[data-gs-close]')?.addEventListener('click', close);
  document.body.appendChild(backdrop);
  if (typeof onMount === 'function') onMount(backdrop.querySelector('[data-gs-body]'), close);
  return { close, el: backdrop };
}

export function confirmDialog(message, { title = 'Bestätigen', okLabel = 'Ja, fortfahren', cancelLabel = 'Abbrechen' } = {}) {
  return new Promise((resolve) => {
    modal({
      title,
      width: '420px',
      bodyHtml: `
        <p style="color:#d4d4d8; font-size:14px; line-height:1.5; margin:0 0 1.25rem;">${esc(message)}</p>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
          <button type="button" data-no class="btn btn--secondary btn--sm">${esc(cancelLabel)}</button>
          <button type="button" data-yes class="btn btn--primary btn--sm">${esc(okLabel)}</button>
        </div>
      `,
      onMount(body, close) {
        body.querySelector('[data-no]')?.addEventListener('click', () => { close(); resolve(false); });
        body.querySelector('[data-yes]')?.addEventListener('click', () => { close(); resolve(true); });
      },
    });
  });
}

export function hotkey(combo, handler) {
  const parts = combo.toLowerCase().split('+').map((s) => s.trim());
  const fn = (e) => {
    const needMod = parts.includes('cmd') || parts.includes('ctrl') || parts.includes('mod');
    const key = parts[parts.length - 1];
    if (needMod && !(e.metaKey || e.ctrlKey)) return;
    if (e.key.toLowerCase() === key) {
      e.preventDefault();
      handler(e);
    }
  };
  window.addEventListener('keydown', fn);
  return () => window.removeEventListener('keydown', fn);
}

export function renderTable(container, { columns = [], rows = [], emptyText = 'Keine Einträge vorhanden.', onRowClick = null } = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return null;
  let sortKey = null;
  let sortDir = 1;

  function draw() {
    const sorted = [...rows];
    if (sortKey) {
      sorted.sort((a, b) => {
        const va = a?.[sortKey] ?? '';
        const vb = b?.[sortKey] ?? '';
        return String(va).localeCompare(String(vb), 'de', { numeric: true }) * sortDir;
      });
    }
    if (!sorted.length) {
      el.innerHTML = `<p style="color:#a1a1aa; font-size:14px; padding:1rem 0;">${esc(emptyText)}</p>`;
      return;
    }
    const thead = columns.map((c) => `
      <th data-sort="${esc(c.key)}" style="text-align:left; padding:0.65rem 0.75rem; border-bottom:1px solid rgba(255,255,255,0.12); cursor:${c.sortable !== false ? 'pointer' : 'default'}; user-select:none; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; color:#a1a1aa;">
        ${esc(c.label || c.key)}${sortKey === c.key ? (sortDir === 1 ? ' ▲' : ' ▼') : ''}
      </th>
    `).join('');
    const tbody = sorted.map((row, idx) => `
      <tr data-row="${idx}" style="border-bottom:1px solid rgba(255,255,255,0.06); ${onRowClick ? 'cursor:pointer;' : ''}">
        ${columns.map((c) => {
          const content = typeof c.render === 'function' ? c.render(row[c.key], row) : esc(row[c.key] ?? '');
          return `<td style="padding:0.65rem 0.75rem; font-size:14px;">${content}</td>`;
        }).join('')}
      </tr>
    `).join('');
    el.innerHTML = `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse;"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
    el.querySelectorAll('th[data-sort]').forEach((th) => {
      const col = columns.find((c) => c.key === th.dataset.sort);
      if (col && col.sortable !== false) {
        th.addEventListener('click', () => {
          if (sortKey === col.key) sortDir *= -1;
          else { sortKey = col.key; sortDir = 1; }
          draw();
        });
      }
    });
    if (typeof onRowClick === 'function') {
      el.querySelectorAll('tbody tr[data-row]').forEach((tr) => {
        tr.addEventListener('click', () => onRowClick(sorted[Number(tr.dataset.row)]));
      });
    }
  }
  draw();
  return { update(nextRows) { rows = nextRows || []; draw(); } };
}

export function renderForm(container, { fields = [], submitLabel = 'Speichern', onSubmit = null } = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return null;
  const fieldStyle = 'width:100%; padding:0.55rem 0.75rem; border-radius:8px; border:1px solid rgba(255,255,255,0.16); background:#18181b; color:#f4f4f5; font-size:14px; box-sizing:border-box;';
  const inputsHtml = fields.map((f) => {
    const val = f.value ?? '';
    const req = f.required ? 'required' : '';
    let control = '';
    if (f.type === 'textarea') {
      control = `<textarea name="${esc(f.name)}" rows="${Number(f.rows || 4)}" placeholder="${esc(f.placeholder || '')}" ${req} style="${fieldStyle}">${esc(val)}</textarea>`;
    } else if (f.type === 'select') {
      const opts = (f.options || []).map((o) => {
        const ov = typeof o === 'object' ? o.value : o;
        const ol = typeof o === 'object' ? o.label : o;
        return `<option value="${esc(ov)}"${String(ov) === String(val) ? ' selected' : ''}>${esc(ol)}</option>`;
      }).join('');
      control = `<select name="${esc(f.name)}" ${req} style="${fieldStyle}">${opts}</select>`;
    } else if (f.type === 'checkbox') {
      control = `<label style="display:flex; align-items:center; gap:0.5rem; font-size:14px;"><input type="checkbox" name="${esc(f.name)}"${val ? ' checked' : ''}> ${esc(f.label || f.name)}</label>`;
    } else {
      control = `<input type="${esc(f.type || 'text')}" name="${esc(f.name)}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" ${req} style="${fieldStyle}">`;
    }
    return f.type === 'checkbox'
      ? `<div style="margin-bottom:0.85rem;">${control}</div>`
      : `<div style="margin-bottom:0.85rem;"><label style="display:block; font-size:12px; color:#a1a1aa; margin-bottom:0.3rem;">${esc(f.label || f.name)}</label>${control}</div>`;
  }).join('');

  el.innerHTML = `<form data-gs-form>${inputsHtml}<button type="submit" class="btn btn--primary btn--sm">${esc(submitLabel)}</button></form>`;
  const form = el.querySelector('form[data-gs-form]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = {};
    for (const f of fields) {
      const input = form.elements.namedItem(f.name);
      if (!input) continue;
      values[f.name] = f.type === 'checkbox' ? Boolean(input.checked) : input.value;
    }
    if (typeof onSubmit === 'function') await onSubmit(values, form);
  });
  return form;
}

export function commandPalette(commands = [], { shortcut = 'mod+k', placeholder = 'Befehl suchen…' } = {}) {
  let activeModal = null;
  const open = () => {
    if (activeModal) return;
    let selectedIdx = 0;
    let filtered = [...commands];
    activeModal = modal({
      title: 'Command Palette',
      width: '540px',
      bodyHtml: `
        <input type="search" data-pal-input placeholder="${esc(placeholder)}" autocomplete="off"
          style="width:100%; padding:0.65rem 0.85rem; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:#18181b; color:#f4f4f5; font-size:14px; box-sizing:border-box; margin-bottom:0.65rem;">
        <div data-pal-list style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:0.25rem;"></div>
      `,
      onMount(body, close) {
        const input = body.querySelector('[data-pal-input]');
        const list = body.querySelector('[data-pal-list]');
        const origClose = close;
        const closePalette = () => { activeModal = null; origClose(); };

        const run = (cmd) => {
          closePalette();
          if (cmd && typeof cmd.run === 'function') cmd.run();
        };

        const render = () => {
          if (!filtered.length) {
            list.innerHTML = '<div style="padding:0.75rem; color:#71717a; font-size:13px;">Keine passenden Befehle.</div>';
            return;
          }
          list.innerHTML = filtered.map((c, i) => `
            <button type="button" data-idx="${i}" style="text-align:left; width:100%; padding:0.6rem 0.75rem; border-radius:8px; border:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:${i === selectedIdx ? 'rgba(255,255,255,0.12)' : 'transparent'}; color:#f4f4f5; font-size:14px;">
              <span>${esc(c.label || '')}${c.hint ? ` <small style="color:#a1a1aa; margin-left:0.4rem;">${esc(c.hint)}</small>` : ''}</span>
              ${c.shortcut ? `<kbd style="font-size:11px; color:#a1a1aa; border:1px solid rgba(255,255,255,0.16); border-radius:4px; padding:0.1rem 0.35rem;">${esc(c.shortcut)}</kbd>` : ''}
            </button>
          `).join('');
          list.querySelectorAll('button[data-idx]').forEach((btn) => {
            btn.addEventListener('click', () => run(filtered[Number(btn.dataset.idx)]));
          });
        };

        input.addEventListener('input', () => {
          const q = input.value.trim().toLowerCase();
          filtered = commands.filter((c) => `${c.label || ''} ${c.hint || ''} ${(c.keywords || []).join(' ')}`.toLowerCase().includes(q));
          selectedIdx = 0;
          render();
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(filtered.length - 1, selectedIdx + 1); render(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(0, selectedIdx - 1); render(); }
          else if (e.key === 'Enter' && filtered[selectedIdx]) { e.preventDefault(); run(filtered[selectedIdx]); }
        });
        render();
        input.focus();
      },
    });
  };
  const unbind = shortcut ? hotkey(shortcut, open) : () => {};
  return { open, destroy: unbind };
}

export function dropzone(container, { ns = 'general', accept = '', multiple = true, label = 'Dateien hierher ziehen oder klicken', onUpload = null, onError = null } = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return null;
  el.innerHTML = `
    <div data-gs-dz style="border:2px dashed rgba(255,255,255,0.22); border-radius:12px; padding:1.5rem; text-align:center; cursor:pointer; transition:border-color 150ms, background 150ms;">
      <div data-gs-dz-label style="font-size:14px; color:#d4d4d8;">${esc(label)}</div>
      <input type="file" data-gs-dz-input style="display:none;" ${accept ? `accept="${esc(accept)}"` : ''} ${multiple ? 'multiple' : ''}>
    </div>
  `;
  const box = el.querySelector('[data-gs-dz]');
  const lbl = el.querySelector('[data-gs-dz-label]');
  const inp = el.querySelector('[data-gs-dz-input]');

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const origText = lbl.textContent;
    for (let i = 0; i < files.length; i++) {
      lbl.textContent = `Lade hoch (${i + 1}/${files.length}): ${files[i].name}…`;
      try {
        const res = await upload(files[i], ns);
        if (typeof onUpload === 'function') onUpload(res, files[i]);
      } catch (err) {
        if (typeof onError === 'function') onError(err, files[i]);
        else toast(err.message || 'Upload fehlgeschlagen', 'error');
      }
    }
    lbl.textContent = origText;
    inp.value = '';
  };

  box.addEventListener('click', () => inp.click());
  inp.addEventListener('change', () => handleFiles(inp.files));
  box.addEventListener('dragover', (e) => { e.preventDefault(); box.style.borderColor = '#38bdf8'; box.style.background = 'rgba(56,189,248,0.08)'; });
  box.addEventListener('dragleave', () => { box.style.borderColor = 'rgba(255,255,255,0.22)'; box.style.background = 'transparent'; });
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.style.borderColor = 'rgba(255,255,255,0.22)';
    box.style.background = 'transparent';
    handleFiles(e.dataTransfer?.files);
  });
  return { el: box };
}

export const ui = { toast, modal, confirm: confirmDialog, table: renderTable, form: renderForm, palette: commandPalette, dropzone };
export const gsEngine = {
  api, auth, store, tokens, upload, uploads, flags, appSettings, sse,
  createStore, createRouter, createEvents, ui, toast, hotkey, debounce, throttle, copyText, fmtDate, esc,
};
export const warp = gsEngine;
export default gsEngine;
