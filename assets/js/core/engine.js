/**
 * Gamet Studios Engine — Frontend App-SDK
 *
 * Wiederverwendbares ES-Modul für eigene Web-Apps & Module auf Basis der Engine:
 *   import { gsEngine } from '/assets/js/core/engine.js';
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
      if (v !== undefined && v !== null) params.set(k, String(v));
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
  const info = await api('engine_info', null, { method: 'GET' });
  return info;
}

export const store = {
  list: (ns) => api('store_list', { ns }, { method: 'GET' }),
  get: (ns, key) => api('store_get', { ns, key }, { method: 'GET' }),
  put: (ns, key, data) => api('store_put', { ns, key, data }, { method: 'POST' }),
  remove: (ns, key) => api('store_delete', { ns, key }, { method: 'POST' }),
};

export function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed',
    right: '1rem',
    bottom: '1rem',
    zIndex: '99999',
    padding: '0.65rem 1rem',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    background: type === 'error' ? '#dc2626' : '#18181b',
    border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export const gsEngine = { api, auth, store, toast, esc };
export default gsEngine;
