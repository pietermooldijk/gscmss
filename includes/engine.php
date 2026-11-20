<?php
/**
 * Gamet Studios Engine — Modularer App-Kernel (PHP 8.1–8.5)
 *
 * Einheitliche Codebasis für Web-Apps, Dashboards, Portale und Module auf Basis von
 * SQLite, Session/RBAC, Authentik OIDC, Integritätsprüfung und Masterserver-Lizenzierung.
 */

declare(strict_types=1);

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/integrity.php';
require_once __DIR__ . '/telemetry.php';

define('GS_ENGINE_VERSION', '1.4.0');

function gs_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function gs_method(): string
{
    return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
}

function gs_input(): array
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $raw = file_get_contents('php://input');
    if (is_string($raw) && trim($raw) !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $cached = $decoded;
        }
    }
    return $cached = ($_POST ?: []);
}

/**
 * Initialisiert die Engine, prüft Integrität & Hub-Status und liefert den App-Kontext.
 */
function gs_boot_engine(array $opts = []): array
{
    $tamper = gs_verify_integrity();
    if (!empty($tamper['tampered'])) {
        gs_json([
            'ok'    => false,
            'error' => 'Integritätsprüfung fehlgeschlagen (' . ($tamper['file'] ?? 'core') . ').',
        ], 403);
    }

    if (empty($opts['skipTelemetry'])) {
        $hub = gs_is_instance_disabled();
        if (!empty($hub['disabled'])) {
            gs_json([
                'ok'    => false,
                'error' => 'Diese Instanz wurde deaktiviert' . (($hub['reason'] ?? '') !== '' ? ': ' . $hub['reason'] : '.'),
            ], 403);
        }
    }

    $pdo = get_db();
    return [
        'version' => GS_ENGINE_VERSION,
        'pdo'     => $pdo,
        'user'    => current_user(),
        'csrf'    => csrf_token(),
    ];
}

function gs_require_auth(?string $requiredRole = null): array
{
    $user = current_user();
    if (!$user) {
        gs_json(['ok' => false, 'error' => 'Nicht angemeldet.'], 401);
    }
    if ($requiredRole !== null && (($user['role'] ?? 'editor') !== $requiredRole)) {
        gs_json(['ok' => false, 'error' => 'Keine ausreichende Berechtigung (' . $requiredRole . ' erforderlich).'], 403);
    }
    return $user;
}

function gs_require_csrf(): void
{
    $input = gs_input();
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($input['csrf'] ?? ($_POST['csrf'] ?? ''));
    if (!csrf_check(is_string($token) ? $token : null)) {
        gs_json(['ok' => false, 'error' => 'Ungültiges CSRF-Token.'], 403);
    }
}

function gs_rate_limit(string $bucket, int $maxAttempts = 30, int $windowSeconds = 60): bool
{
    $pdo = get_db();
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $key = 'rl:' . preg_replace('/[^a-z0-9_.-]/i', '_', $bucket) . ':' . $ip;
    $cutoff = time() - max(1, $windowSeconds);

    $pdo->prepare('DELETE FROM login_attempts WHERE ip = :ip AND attempted_at < :cutoff')
        ->execute([':ip' => $key, ':cutoff' => $cutoff]);

    $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = :ip AND attempted_at >= :cutoff');
    $stmt->execute([':ip' => $key, ':cutoff' => $cutoff]);
    if ((int) $stmt->fetchColumn() >= $maxAttempts) {
        return false;
    }

    $pdo->prepare('INSERT INTO login_attempts (ip, attempted_at) VALUES (:ip, :ts)')
        ->execute([':ip' => $key, ':ts' => time()]);
    return true;
}

// --- Generischer App-Datenspeicher (SQLite `app_records`) ---

function gs_sanitize_ns(string $ns): string
{
    $clean = preg_replace('/[^a-z0-9_.-]+/i', '', trim($ns));
    if ($clean === '') {
        throw new InvalidArgumentException('Ungültiger Namespace.');
    }
    return $clean;
}

function gs_store_put(string $ns, string $key, array $data, ?int $ownerId = null): array
{
    $ns = gs_sanitize_ns($ns);
    $key = trim($key);
    if ($key === '' || strlen($key) > 120) {
        throw new InvalidArgumentException('Ungültiger Datensatz-Schlüssel.');
    }
    $pdo = get_db();
    $now = date('c');
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $stmt = $pdo->prepare(
        'INSERT INTO app_records (namespace, record_key, owner_id, data_json, created_at, updated_at)
         VALUES (:ns, :k, :oid, :dj, :c, :u)
         ON CONFLICT(namespace, record_key) DO UPDATE SET
           data_json = excluded.data_json,
           owner_id = COALESCE(excluded.owner_id, app_records.owner_id),
           updated_at = excluded.updated_at'
    );
    $stmt->execute([
        ':ns'  => $ns,
        ':k'   => $key,
        ':oid' => $ownerId,
        ':dj'  => $json,
        ':c'   => $now,
        ':u'   => $now,
    ]);

    return gs_store_get($ns, $key) ?? [];
}

function gs_store_get(string $ns, string $key): ?array
{
    $ns = gs_sanitize_ns($ns);
    $pdo = get_db();
    $stmt = $pdo->prepare('SELECT * FROM app_records WHERE namespace = :ns AND record_key = :k LIMIT 1');
    $stmt->execute([':ns' => $ns, ':k' => trim($key)]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    return [
        'key'       => $row['record_key'],
        'ownerId'   => $row['owner_id'] !== null ? (int) $row['owner_id'] : null,
        'data'      => json_decode((string) $row['data_json'], true) ?: [],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function gs_store_list(string $ns, ?int $ownerId = null, int $limit = 100): array
{
    $ns = gs_sanitize_ns($ns);
    $pdo = get_db();
    $limit = max(1, min(500, $limit));
    if ($ownerId !== null) {
        $stmt = $pdo->prepare('SELECT * FROM app_records WHERE namespace = :ns AND owner_id = :oid ORDER BY updated_at DESC LIMIT ' . $limit);
        $stmt->execute([':ns' => $ns, ':oid' => $ownerId]);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM app_records WHERE namespace = :ns ORDER BY updated_at DESC LIMIT ' . $limit);
        $stmt->execute([':ns' => $ns]);
    }
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[] = [
            'key'       => $row['record_key'],
            'ownerId'   => $row['owner_id'] !== null ? (int) $row['owner_id'] : null,
            'data'      => json_decode((string) $row['data_json'], true) ?: [],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }
    return $out;
}

function gs_store_delete(string $ns, string $key): bool
{
    $ns = gs_sanitize_ns($ns);
    $pdo = get_db();
    $stmt = $pdo->prepare('DELETE FROM app_records WHERE namespace = :ns AND record_key = :k');
    $stmt->execute([':ns' => $ns, ':k' => trim($key)]);
    return $stmt->rowCount() > 0;
}

// --- Event / Hook-Bus ---

function &gs_hook_registry(): array
{
    static $hooks = [];
    return $hooks;
}

function gs_on(string $event, callable $listener): void
{
    $reg = &gs_hook_registry();
    $reg[$event][] = $listener;
}

function gs_emit(string $event, array $context = []): array
{
    $reg = &gs_hook_registry();
    foreach ($reg[$event] ?? [] as $fn) {
        $res = $fn($context);
        if (is_array($res)) {
            $context = $res;
        }
    }
    return $context;
}

// --- Modulare App-Registry (`apps/*/manifest.json`) ---

function gs_list_apps(): array
{
    $appsDir = dirname(__DIR__) . '/apps';
    if (!is_dir($appsDir)) {
        return [];
    }
    $items = [];
    foreach (scandir($appsDir) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..' || !preg_match('/^[a-z0-9_-]+$/', $entry)) {
            continue;
        }
        $manifestPath = $appsDir . '/' . $entry . '/manifest.json';
        if (!is_file($manifestPath)) {
            continue;
        }
        $manifest = json_decode((string) file_get_contents($manifestPath), true);
        if (!is_array($manifest)) {
            continue;
        }
        $items[] = [
            'slug'        => $entry,
            'name'        => (string) ($manifest['name'] ?? $entry),
            'version'     => (string) ($manifest['version'] ?? '1.0'),
            'description' => (string) ($manifest['description'] ?? ''),
            'entry'       => is_file($appsDir . '/' . $entry . '/index.html') ? '/apps/' . $entry . '/' : null,
            'hasApi'      => is_file($appsDir . '/' . $entry . '/api.php'),
        ];
    }
    return $items;
}
