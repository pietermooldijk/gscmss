<?php
/**
 * Gamet Studios WARP Engine v2.2 — Einheitlicher App-API-Router (/api/app.php)
 *
 * Bietet integrierte Engine-Endpunkte (Auth/Tokens, Query-Store, Uploads, Jobs, Audit)
 * sowie automatisches Routing für eigene App-Module unter /apps/<slug>/api.php.
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/engine.php';

$engine = gs_boot_engine();
$appSlug = (string) ($_GET['app'] ?? '');

if ($appSlug !== '') {
    if (!preg_match('/^[a-z0-9_-]+$/', $appSlug)) {
        gs_json(['ok' => false, 'error' => 'Ungültiger App-Name.'], 400);
    }
    $appApi = dirname(__DIR__) . '/apps/' . $appSlug . '/api.php';
    if (!is_file($appApi)) {
        gs_json(['ok' => false, 'error' => 'App-API nicht gefunden.'], 404);
    }
    require $appApi;
    exit;
}

$action = (string) ($_GET['action'] ?? (gs_input()['action'] ?? 'engine_info'));

if ($action === 'engine_info') {
    $isAdmin = ($engine['user']['role'] ?? '') === 'admin';
    gs_json([
        'ok'      => true,
        'engine'  => [
            'name'     => GS_ENGINE_NAME,
            'codename' => GS_ENGINE_CODENAME,
            'version'  => $engine['version'],
        ],
        'user'    => $engine['user'],
        'csrf'    => $engine['csrf'],
        'apps'    => gs_list_apps(),
        'health'  => $isAdmin ? gs_health() : null,
    ]);
}

// --- App-Store CRUD & Query ---

if ($action === 'store_list') {
    gs_require_perm('store');
    $ns = (string) ($_GET['ns'] ?? '');
    try {
        gs_json(['ok' => true, 'items' => gs_store_list($ns)]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_query') {
    gs_require_perm('store');
    $ns = (string) ($_GET['ns'] ?? (gs_input()['ns'] ?? ''));
    $in = gs_input();
    $where = is_array($in['where'] ?? null) ? $in['where'] : [];
    if (!empty($_GET['where']) && is_string($_GET['where'])) {
        $decodedWhere = json_decode($_GET['where'], true);
        if (is_array($decodedWhere)) {
            $where = $decodedWhere;
        }
    }
    try {
        $res = gs_store_query($ns, [
            'q'       => (string) ($_GET['q'] ?? ($in['q'] ?? '')),
            'where'   => $where,
            'sortBy'  => (string) ($_GET['sortBy'] ?? ($in['sortBy'] ?? 'updatedAt')),
            'sortDir' => (string) ($_GET['sortDir'] ?? ($in['sortDir'] ?? 'desc')),
            'page'    => (int) ($_GET['page'] ?? ($in['page'] ?? 1)),
            'perPage' => (int) ($_GET['perPage'] ?? ($in['perPage'] ?? 50)),
        ]);
        gs_json(['ok' => true] + $res);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_get') {
    gs_require_perm('store');
    $ns = (string) ($_GET['ns'] ?? '');
    $key = (string) ($_GET['key'] ?? '');
    try {
        $item = gs_store_get($ns, $key);
        if (!$item) {
            gs_json(['ok' => false, 'error' => 'Eintrag nicht gefunden.'], 404);
        }
        gs_json(['ok' => true, 'item' => $item]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_put' && gs_method() === 'POST') {
    $user = gs_require_perm('store');
    gs_require_csrf();
    $in = gs_input();
    $ns = (string) ($in['ns'] ?? '');
    $key = (string) ($in['key'] ?? '');
    $data = is_array($in['data'] ?? null) ? $in['data'] : [];
    try {
        $saved = gs_store_put($ns, $key, $data, (int) ($user['id'] ?? 0));
        gs_json(['ok' => true, 'item' => $saved]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_delete' && gs_method() === 'POST') {
    gs_require_perm('store');
    gs_require_csrf();
    $in = gs_input();
    $ns = (string) ($in['ns'] ?? '');
    $key = (string) ($in['key'] ?? '');
    try {
        $deleted = gs_store_delete($ns, $key);
        gs_json(['ok' => true, 'deleted' => $deleted]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_patch' && gs_method() === 'POST') {
    $user = gs_require_perm('store');
    gs_require_csrf();
    $in = gs_input();
    $ns = (string) ($in['ns'] ?? '');
    $key = (string) ($in['key'] ?? '');
    $patch = is_array($in['patch'] ?? null) ? $in['patch'] : (is_array($in['data'] ?? null) ? $in['data'] : []);
    try {
        $saved = gs_store_patch($ns, $key, $patch, (int) ($user['id'] ?? 0));
        gs_json(['ok' => true, 'item' => $saved]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_count') {
    gs_require_perm('store');
    $ns = (string) ($_GET['ns'] ?? (gs_input()['ns'] ?? ''));
    $where = [];
    if (!empty($_GET['where']) && is_string($_GET['where'])) {
        $decoded = json_decode($_GET['where'], true);
        if (is_array($decoded)) {
            $where = $decoded;
        }
    }
    try {
        gs_json(['ok' => true, 'count' => gs_store_count($ns, $where)]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_namespaces') {
    gs_require_perm('store');
    gs_json(['ok' => true, 'namespaces' => gs_store_namespaces()]);
}

if ($action === 'store_export') {
    gs_require_perm('store');
    $ns = (string) ($_GET['ns'] ?? '');
    try {
        gs_json(['ok' => true] + gs_store_export($ns));
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_import' && gs_method() === 'POST') {
    $user = gs_require_perm('store');
    gs_require_csrf();
    $in = gs_input();
    $ns = (string) ($in['ns'] ?? '');
    $items = is_array($in['items'] ?? null) ? $in['items'] : [];
    try {
        $imported = gs_store_import($ns, $items, (int) ($user['id'] ?? 0));
        gs_audit('store_import', $ns . ' (' . $imported . ' Einträge)', $user);
        gs_json(['ok' => true, 'imported' => $imported]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

// --- Feature-Flags & App-Settings ---

if ($action === 'flags_list') {
    gs_json(['ok' => true, 'flags' => gs_flags_list()]);
}

if ($action === 'flag_set' && gs_method() === 'POST') {
    $user = gs_require_auth('admin');
    gs_require_csrf();
    $in = gs_input();
    $name = (string) ($in['name'] ?? '');
    $enabled = filter_var($in['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
    try {
        gs_flag_set($name, $enabled);
        gs_audit('flag_set', $name . '=' . ($enabled ? 'on' : 'off'), $user);
        gs_json(['ok' => true, 'name' => $name, 'enabled' => $enabled]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'app_settings_get') {
    gs_require_perm('store');
    $slug = (string) ($_GET['appSlug'] ?? ($_GET['slug'] ?? ''));
    try {
        gs_json(['ok' => true, 'settings' => gs_app_settings($slug)]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'app_setting_set' && gs_method() === 'POST') {
    $user = gs_require_auth('admin');
    gs_require_csrf();
    $in = gs_input();
    $slug = (string) ($in['appSlug'] ?? ($in['slug'] ?? ''));
    $key = (string) ($in['key'] ?? '');
    try {
        gs_app_setting_set($slug, $key, $in['value'] ?? null);
        gs_audit('app_setting_set', $slug . '.' . $key, $user);
        gs_json(['ok' => true, 'appSlug' => $slug, 'key' => $key]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

// --- API Tokens ---

if ($action === 'tokens_list') {
    $user = gs_require_auth();
    gs_json(['ok' => true, 'tokens' => gs_token_list((int) $user['id'])]);
}

if ($action === 'token_create' && gs_method() === 'POST') {
    $user = gs_require_auth();
    gs_require_csrf();
    $in = gs_input();
    $clean = gs_validate($in, [
        'name'    => 'required|string|min:2|max:80',
        'ttlDays' => 'int|min:1|max:3650',
    ]);
    $scopes = is_array($in['scopes'] ?? null) ? $in['scopes'] : ['*'];
    $created = gs_token_create((int) $user['id'], (string) $clean['name'], $scopes, (int) ($clean['ttlDays'] ?? 90));
    gs_audit('token_create', 'API-Token erstellt: ' . $created['name'], $user);
    gs_json(['ok' => true, 'token' => $created]);
}

if ($action === 'token_revoke' && gs_method() === 'POST') {
    $user = gs_require_auth();
    gs_require_csrf();
    $in = gs_input();
    $id = (int) ($in['id'] ?? 0);
    $ok = gs_token_revoke($id, (int) $user['id']);
    gs_json(['ok' => $ok]);
}

// --- Datei-Upload ---

if ($action === 'upload' && gs_method() === 'POST') {
    gs_require_perm('upload');
    gs_require_csrf();
    $ns = (string) ($_POST['ns'] ?? ($_GET['ns'] ?? 'general'));
    try {
        $file = gs_upload_handle('file', $ns);
        gs_audit('app_upload', $file['url']);
        gs_json(['ok' => true, 'file' => $file]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'uploads_list') {
    gs_require_perm('upload');
    $ns = isset($_GET['ns']) ? (string) $_GET['ns'] : null;
    $limit = (int) ($_GET['limit'] ?? 100);
    try {
        gs_json(['ok' => true, 'items' => gs_uploads_list($ns, $limit)]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

// --- Admin: Jobs, Cache & Audit Log ---

if ($action === 'jobs_run' && gs_method() === 'POST') {
    gs_require_auth('admin');
    gs_require_csrf();
    $res = gs_job_run_pending(25);
    gs_json(['ok' => true, 'processed' => $res]);
}

if ($action === 'jobs_stats') {
    gs_require_auth('admin');
    $queue = isset($_GET['queue']) ? (string) $_GET['queue'] : null;
    gs_json(['ok' => true, 'stats' => gs_job_stats($queue)]);
}

if ($action === 'jobs_retry' && gs_method() === 'POST') {
    gs_require_auth('admin');
    gs_require_csrf();
    $in = gs_input();
    $queue = isset($in['queue']) ? (string) $in['queue'] : null;
    gs_json(['ok' => true, 'retried' => gs_job_retry_failed($queue)]);
}

if ($action === 'cache_flush' && gs_method() === 'POST') {
    gs_require_auth('admin');
    gs_require_csrf();
    $in = gs_input();
    $prefix = (string) ($in['prefix'] ?? '');
    gs_json(['ok' => true, 'cleared' => gs_cache_flush($prefix)]);
}

if ($action === 'audit_list') {
    gs_require_auth('admin');
    $pdo = get_db();
    $rows = $pdo->query('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);
    gs_json(['ok' => true, 'items' => $rows]);
}

gs_json(['ok' => false, 'error' => 'Unbekannte Engine-Aktion.'], 404);
