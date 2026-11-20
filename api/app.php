<?php
/**
 * Gamet Studios Engine — Einheitlicher App-API-Router (/api/app.php)
 *
 * Bietet integrierte Engine-Endpunkte (engine_info, store_*) sowie
 * automatisches Routing für eigene App-Module unter /apps/<slug>/api.php.
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
    gs_json([
        'ok'      => true,
        'engine'  => [
            'name'    => 'Gamet Studios Engine',
            'version' => $engine['version'],
        ],
        'user'    => $engine['user'],
        'csrf'    => $engine['csrf'],
        'apps'    => gs_list_apps(),
    ]);
}

if ($action === 'store_list') {
    gs_require_auth();
    $ns = (string) ($_GET['ns'] ?? '');
    try {
        gs_json(['ok' => true, 'items' => gs_store_list($ns)]);
    } catch (Throwable $e) {
        gs_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
}

if ($action === 'store_get') {
    gs_require_auth();
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
    $user = gs_require_auth();
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
    gs_require_auth();
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

gs_json(['ok' => false, 'error' => 'Unbekannte Engine-Aktion.'], 404);
