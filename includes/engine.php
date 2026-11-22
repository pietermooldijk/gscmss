<?php
/**
 * Gamet Studios WARP Engine (Web Application Runtime Platform)
 * Modularer Full-Stack App-Kernel (PHP 8.1–8.5)
 *
 * Umfassende Engine-Grundlage für Web-Apps, Portale, Dashboards und ganze Systeme:
 * - SQLite Collection & Query Store (`app_records`) mit Suche, Filter, Sortierung & Pagination
 * - TTL-Cache (`app_cache`) & Background-Job-Queue (`app_jobs`)
 * - Session-, RBAC- & Bearer-API-Token-Auth (`api_tokens`) + CSRF + Rate-Limiter
 * - Deklarative Input-Validierung (`gs_validate`)
 * - AES-256-GCM Verschlüsselung (`gs_encrypt`/`gs_decrypt`) & HMAC-Signatur (`gs_hmac_sign`)
 * - cURL HTTP-Client (`gs_http`) & signierte Webhooks (`gs_webhook_send`)
 * - Sicherer Datei-/Bild-Upload mit automatischer WebP-Konvertierung (`gs_upload_handle`)
 * - Event-/Hook-Bus (`gs_on`/`gs_emit`), Audit-Log (`gs_audit`) & Health-Check (`gs_health`)
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

define('GS_ENGINE_NAME', 'Gamet Studios WARP Engine');
define('GS_ENGINE_CODENAME', 'WARP');
define('GS_ENGINE_VERSION', '2.2.0');

// ============================================================================
// 1. HTTP Request / Response & Boot
// ============================================================================

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
    $user = current_user();
    if (!$user) {
        $user = gs_bearer_user();
    }

    return [
        'version' => GS_ENGINE_VERSION,
        'pdo'     => $pdo,
        'user'    => $user,
        'csrf'    => csrf_token(),
    ];
}

// ============================================================================
// 2. Auth, RBAC & Bearer API Tokens
// ============================================================================

function gs_bearer_user(): ?array
{
    $hdr = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
    if (!preg_match('/^Bearer\s+([A-Za-z0-9_.-]{16,})$/i', trim($hdr), $m)) {
        return null;
    }
    return gs_token_verify($m[1]);
}

function gs_active_user(): ?array
{
    return current_user() ?: gs_bearer_user();
}

function gs_require_auth(?string $requiredRole = null): array
{
    $user = gs_active_user();
    if (!$user) {
        gs_json(['ok' => false, 'error' => 'Nicht angemeldet.'], 401);
    }
    if ($requiredRole !== null && (($user['role'] ?? 'editor') !== $requiredRole)) {
        gs_json(['ok' => false, 'error' => 'Keine ausreichende Berechtigung (' . $requiredRole . ' erforderlich).'], 403);
    }
    return $user;
}

function gs_can(string $scope): bool
{
    $user = gs_active_user();
    if (!$user) {
        return false;
    }
    if (($user['role'] ?? 'editor') === 'admin') {
        $scopes = $user['token_scopes'] ?? null;
        return $scopes === null || in_array('*', $scopes, true) || in_array($scope, $scopes, true);
    }
    $scopes = $user['token_scopes'] ?? ['content', 'store', 'upload'];
    return in_array('*', $scopes, true) || in_array($scope, $scopes, true);
}

function gs_require_perm(string $scope): array
{
    $user = gs_require_auth();
    if (!gs_can($scope)) {
        gs_json(['ok' => false, 'error' => 'Fehlende Berechtigung: ' . $scope], 403);
    }
    return $user;
}

function gs_require_csrf(): void
{
    // Bearer-Token-Requests sind nicht anfällig für Browser-Cookie-CSRF
    if (gs_bearer_user() !== null) {
        return;
    }
    $input = gs_input();
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($input['csrf'] ?? ($_POST['csrf'] ?? ''));
    if (!csrf_check(is_string($token) ? $token : null)) {
        gs_json(['ok' => false, 'error' => 'Ungültiges CSRF-Token.'], 403);
    }
}

function gs_token_create(int $userId, string $name, array $scopes = ['*'], int $ttlDays = 90): array
{
    $pdo = get_db();
    $plain = 'gse_' . bin2hex(random_bytes(24));
    $hash = hash('sha256', $plain);
    $expiresAt = $ttlDays > 0 ? date('c', time() + $ttlDays * 86400) : null;
    $stmt = $pdo->prepare(
        'INSERT INTO api_tokens (user_id, name, token_hash, scopes_json, expires_at, created_at)
         VALUES (:uid, :name, :hash, :scopes, :exp, :c)'
    );
    $stmt->execute([
        ':uid'    => $userId,
        ':name'   => trim($name) ?: 'API Token',
        ':hash'   => $hash,
        ':scopes' => json_encode(array_values($scopes)),
        ':exp'    => $expiresAt,
        ':c'      => date('c'),
    ]);
    return [
        'id'        => (int) $pdo->lastInsertId(),
        'name'      => trim($name) ?: 'API Token',
        'token'     => $plain,
        'scopes'    => array_values($scopes),
        'expiresAt' => $expiresAt,
    ];
}

function gs_token_verify(string $plainToken): ?array
{
    $pdo = get_db();
    $hash = hash('sha256', trim($plainToken));
    $stmt = $pdo->prepare(
        'SELECT t.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
         FROM api_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = :h
         LIMIT 1'
    );
    $stmt->execute([':h' => $hash]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    if (!empty($row['expires_at']) && strtotime((string) $row['expires_at']) < time()) {
        return null;
    }
    $pdo->prepare('UPDATE api_tokens SET last_used_at = :now WHERE id = :id')
        ->execute([':now' => date('c'), ':id' => (int) $row['id']]);
    return [
        'id'            => (int) $row['user_id'],
        'name'          => (string) $row['user_name'],
        'email'         => (string) $row['user_email'],
        'role'          => (string) ($row['user_role'] ?: 'editor'),
        'auth_provider' => 'token',
        'token_id'      => (int) $row['id'],
        'token_scopes'  => json_decode((string) $row['scopes_json'], true) ?: ['*'],
    ];
}

function gs_token_list(int $userId): array
{
    $pdo = get_db();
    $stmt = $pdo->prepare('SELECT id, name, scopes_json, last_used_at, expires_at, created_at FROM api_tokens WHERE user_id = :uid ORDER BY id DESC');
    $stmt->execute([':uid' => $userId]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $out[] = [
            'id'         => (int) $r['id'],
            'name'       => $r['name'],
            'scopes'     => json_decode((string) $r['scopes_json'], true) ?: [],
            'lastUsedAt' => $r['last_used_at'],
            'expiresAt'  => $r['expires_at'],
            'createdAt'  => $r['created_at'],
        ];
    }
    return $out;
}

function gs_token_revoke(int $tokenId, int $userId): bool
{
    $pdo = get_db();
    $stmt = $pdo->prepare('DELETE FROM api_tokens WHERE id = :id AND user_id = :uid');
    $stmt->execute([':id' => $tokenId, ':uid' => $userId]);
    return $stmt->rowCount() > 0;
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

// ============================================================================
// 3. Validierung & Krypto (AES-256-GCM & HMAC-SHA256)
// ============================================================================

function gs_validate(array $data, array $rules): array
{
    $clean = [];
    $errors = [];

    foreach ($rules as $field => $ruleSpec) {
        $parts = is_array($ruleSpec) ? $ruleSpec : explode('|', (string) $ruleSpec);
        $val = $data[$field] ?? null;
        $isEmpty = ($val === null || $val === '' || $val === []);

        if (in_array('required', $parts, true) && $isEmpty) {
            $errors[$field] = 'Dieses Feld ist erforderlich.';
            continue;
        }
        if ($isEmpty) {
            $clean[$field] = $val;
            continue;
        }

        foreach ($parts as $rule) {
            if ($rule === 'required') {
                continue;
            }
            if ($rule === 'string') {
                $val = trim((string) $val);
            } elseif ($rule === 'int') {
                if (filter_var($val, FILTER_VALIDATE_INT) === false) {
                    $errors[$field] = 'Muss eine Ganzzahl sein.';
                    break;
                }
                $val = (int) $val;
            } elseif ($rule === 'float') {
                if (filter_var($val, FILTER_VALIDATE_FLOAT) === false) {
                    $errors[$field] = 'Muss eine Zahl sein.';
                    break;
                }
                $val = (float) $val;
            } elseif ($rule === 'array') {
                if (!is_array($val)) {
                    $errors[$field] = 'Muss eine Liste/Array sein.';
                    break;
                }
            } elseif ($rule === 'slug') {
                $val = trim((string) $val);
                if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $val)) {
                    $errors[$field] = 'Ungültiger Slug (nur Kleinbuchstaben, Zahlen und Bindestriche).';
                    break;
                }
            } elseif (str_starts_with($rule, 'regex:')) {
                $pattern = substr($rule, 6);
                if (@preg_match($pattern, (string) $val) !== 1) {
                    $errors[$field] = 'Ungültiges Format.';
                    break;
                }
            } elseif ($rule === 'bool') {
                $val = filter_var($val, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($val === null) {
                    $errors[$field] = 'Muss ein Wahrheitswert (true/false) sein.';
                    break;
                }
            } elseif ($rule === 'email') {
                $val = trim((string) $val);
                if (!filter_var($val, FILTER_VALIDATE_EMAIL)) {
                    $errors[$field] = 'Ungültige E-Mail-Adresse.';
                    break;
                }
            } elseif ($rule === 'url') {
                $val = trim((string) $val);
                if (!filter_var($val, FILTER_VALIDATE_URL)) {
                    $errors[$field] = 'Ungültige URL.';
                    break;
                }
            } elseif (str_starts_with($rule, 'min:')) {
                $min = (int) substr($rule, 4);
                $len = is_int($val) ? $val : mb_strlen((string) $val);
                if ($len < $min) {
                    $errors[$field] = 'Mindestens ' . $min . (is_int($val) ? '' : ' Zeichen') . ' erforderlich.';
                    break;
                }
            } elseif (str_starts_with($rule, 'max:')) {
                $max = (int) substr($rule, 4);
                $len = is_int($val) ? $val : mb_strlen((string) $val);
                if ($len > $max) {
                    $errors[$field] = 'Maximal ' . $max . (is_int($val) ? '' : ' Zeichen') . ' erlaubt.';
                    break;
                }
            } elseif (str_starts_with($rule, 'in:')) {
                $allowed = explode(',', substr($rule, 3));
                if (!in_array((string) $val, $allowed, true)) {
                    $errors[$field] = 'Ungültiger Wert.';
                    break;
                }
            }
        }
        $clean[$field] = $val;
    }

    if ($errors) {
        gs_json(['ok' => false, 'error' => 'Validierung fehlgeschlagen.', 'fields' => $errors], 422);
    }
    return $clean;
}

function gs_app_secret(): string
{
    $secret = get_setting('gs_engine_app_secret', '');
    if ($secret === '') {
        $secret = bin2hex(random_bytes(32));
        set_setting('gs_engine_app_secret', $secret);
    }
    return $secret;
}

function gs_encrypt(string $plaintext, ?string $secret = null): string
{
    $key = hash('sha256', $secret ?? gs_app_secret(), true);
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($cipher === false) {
        throw new RuntimeException('Verschlüsselung fehlgeschlagen.');
    }
    return base64_encode($iv . $tag . $cipher);
}

function gs_decrypt(string $encoded, ?string $secret = null): ?string
{
    $raw = base64_decode($encoded, true);
    if (!is_string($raw) || strlen($raw) <= 28) {
        return null;
    }
    $iv = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $cipher = substr($raw, 28);
    $key = hash('sha256', $secret ?? gs_app_secret(), true);
    $plain = openssl_decrypt($cipher, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    return $plain === false ? null : $plain;
}

function gs_hmac_sign(array $payload, ?string $secret = null, int $ttlSeconds = 3600): string
{
    $payload['_exp'] = time() + max(1, $ttlSeconds);
    $b64 = rtrim(strtr(base64_encode((string) json_encode($payload, JSON_UNESCAPED_UNICODE)), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', $b64, $secret ?? gs_app_secret());
    return $b64 . '.' . $sig;
}

function gs_hmac_verify(string $token, ?string $secret = null): ?array
{
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) {
        return null;
    }
    [$b64, $sig] = $parts;
    $expected = hash_hmac('sha256', $b64, $secret ?? gs_app_secret());
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $json = base64_decode(strtr($b64, '-_', '+/'), true);
    $data = is_string($json) ? json_decode($json, true) : null;
    if (!is_array($data) || ((int) ($data['_exp'] ?? 0) < time())) {
        return null;
    }
    return $data;
}

// ============================================================================
// 4. Queryable App-Store (`app_records`)
// ============================================================================

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
    return gs_store_query($ns, [
        'ownerId' => $ownerId,
        'perPage' => $limit,
        'page'    => 1,
    ])['items'];
}

function gs_store_query(string $ns, array $opts = []): array
{
    $ns = gs_sanitize_ns($ns);
    $pdo = get_db();
    $whereSql = ['namespace = :ns'];
    $params = [':ns' => $ns];

    if (isset($opts['ownerId']) && $opts['ownerId'] !== null) {
        $whereSql[] = 'owner_id = :oid';
        $params[':oid'] = (int) $opts['ownerId'];
    }
    $q = trim((string) ($opts['q'] ?? ''));
    if ($q !== '') {
        $whereSql[] = '(record_key LIKE :q OR data_json LIKE :q)';
        $params[':q'] = '%' . $q . '%';
    }

    $sql = 'SELECT * FROM app_records WHERE ' . implode(' AND ', $whereSql) . ' ORDER BY updated_at DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $rows = [];
    $filters = is_array($opts['where'] ?? null) ? $opts['where'] : [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $data = json_decode((string) $row['data_json'], true) ?: [];
        $match = true;
        foreach ($filters as $fk => $fv) {
            if (($data[$fk] ?? null) != $fv) {
                $match = false;
                break;
            }
        }
        if ($match) {
            $rows[] = [
                'key'       => $row['record_key'],
                'ownerId'   => $row['owner_id'] !== null ? (int) $row['owner_id'] : null,
                'data'      => $data,
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at'],
            ];
        }
    }

    $sortBy = (string) ($opts['sortBy'] ?? 'updatedAt');
    $sortDir = strtolower((string) ($opts['sortDir'] ?? 'desc')) === 'asc' ? 1 : -1;
    if ($sortBy !== '' && $sortBy !== 'updatedAt') {
        usort($rows, function ($a, $b) use ($sortBy, $sortDir) {
            $va = $a[$sortBy] ?? ($a['data'][$sortBy] ?? '');
            $vb = $b[$sortBy] ?? ($b['data'][$sortBy] ?? '');
            return ($va <=> $vb) * $sortDir;
        });
    } elseif ($sortDir === 1) {
        $rows = array_reverse($rows);
    }

    $total = count($rows);
    $perPage = max(1, min(500, (int) ($opts['perPage'] ?? 50)));
    $page = max(1, (int) ($opts['page'] ?? 1));
    $pages = max(1, (int) ceil($total / $perPage));
    $offset = ($page - 1) * $perPage;

    return [
        'items'   => array_slice($rows, $offset, $perPage),
        'total'   => $total,
        'page'    => $page,
        'perPage' => $perPage,
        'pages'   => $pages,
    ];
}

function gs_store_delete(string $ns, string $key): bool
{
    $ns = gs_sanitize_ns($ns);
    $pdo = get_db();
    $stmt = $pdo->prepare('DELETE FROM app_records WHERE namespace = :ns AND record_key = :k');
    $stmt->execute([':ns' => $ns, ':k' => trim($key)]);
    return $stmt->rowCount() > 0;
}

function gs_store_patch(string $ns, string $key, array $patch, ?int $ownerId = null): array
{
    $existing = gs_store_get($ns, $key);
    $merged = array_replace_recursive($existing['data'] ?? [], $patch);
    return gs_store_put($ns, $key, $merged, $ownerId ?? ($existing['ownerId'] ?? null));
}

function gs_store_count(string $ns, array $where = [], ?int $ownerId = null): int
{
    $ns = gs_sanitize_ns($ns);
    if ($where === []) {
        $pdo = get_db();
        if ($ownerId !== null) {
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM app_records WHERE namespace = :ns AND owner_id = :oid');
            $stmt->execute([':ns' => $ns, ':oid' => $ownerId]);
        } else {
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM app_records WHERE namespace = :ns');
            $stmt->execute([':ns' => $ns]);
        }
        return (int) $stmt->fetchColumn();
    }
    return gs_store_query($ns, ['where' => $where, 'ownerId' => $ownerId, 'perPage' => 1])['total'];
}

function gs_store_bulk_put(string $ns, array $items, ?int $ownerId = null): int
{
    $ns = gs_sanitize_ns($ns);
    $pdo = get_db();
    $count = 0;
    $pdo->beginTransaction();
    try {
        foreach ($items as $key => $data) {
            if (is_array($data) && isset($data['key'], $data['data']) && is_string($data['key']) && is_array($data['data'])) {
                gs_store_put($ns, $data['key'], $data['data'], $ownerId);
                $count++;
            } elseif (is_string($key) && is_array($data)) {
                gs_store_put($ns, $key, $data, $ownerId);
                $count++;
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    return $count;
}

function gs_store_namespaces(): array
{
    $pdo = get_db();
    $rows = $pdo->query(
        'SELECT namespace, COUNT(*) AS total, MAX(updated_at) AS last_updated
         FROM app_records
         GROUP BY namespace
         ORDER BY namespace ASC'
    )->fetchAll(PDO::FETCH_ASSOC);

    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'namespace'   => (string) $r['namespace'],
            'count'       => (int) $r['total'],
            'lastUpdated' => $r['last_updated'],
        ];
    }
    return $out;
}

function gs_store_export(string $ns): array
{
    $ns = gs_sanitize_ns($ns);
    $res = gs_store_query($ns, ['perPage' => 500, 'page' => 1]);
    $items = $res['items'];
    for ($p = 2; $p <= $res['pages']; $p++) {
        $next = gs_store_query($ns, ['perPage' => 500, 'page' => $p]);
        $items = array_merge($items, $next['items']);
    }
    return [
        'namespace'  => $ns,
        'exportedAt' => date('c'),
        'count'      => count($items),
        'items'      => $items,
    ];
}

function gs_store_import(string $ns, array $items, ?int $ownerId = null): int
{
    if (isset($items['items']) && is_array($items['items'])) {
        $items = $items['items'];
    }
    return gs_store_bulk_put($ns, $items, $ownerId);
}

function gs_csv_download(string $filename, array $rows, array $columns = []): never
{
    $safeName = preg_replace('/[^a-z0-9_.-]+/i', '_', $filename) ?: 'export.csv';
    if (!str_ends_with(strtolower($safeName), '.csv')) {
        $safeName .= '.csv';
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $safeName . '"');
    header('Cache-Control: no-store, no-cache, must-revalidate');

    $out = fopen('php://output', 'w');
    if ($out === false) {
        exit;
    }
    fwrite($out, "\xEF\xBB\xBF");

    if ($columns === [] && isset($rows[0]) && is_array($rows[0])) {
        $columns = array_keys($rows[0]);
    }
    if ($columns !== []) {
        fputcsv($out, $columns, ';');
    }
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $line = [];
        foreach ($columns as $col) {
            $val = $row[$col] ?? '';
            if (is_array($val) || is_object($val)) {
                $val = json_encode($val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $str = (string) $val;
            if ($str !== '' && in_array($str[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
                $str = "'" . $str;
            }
            $line[] = $str;
        }
        fputcsv($out, $line, ';');
    }
    fclose($out);
    exit;
}

// ============================================================================
// 5. TTL Cache (`app_cache`)
// ============================================================================

function gs_cache_set(string $key, mixed $value, int $ttlSeconds = 300): void
{
    $pdo = get_db();
    $stmt = $pdo->prepare(
        'INSERT INTO app_cache (cache_key, value_json, expires_at)
         VALUES (:k, :v, :e)
         ON CONFLICT(cache_key) DO UPDATE SET value_json = excluded.value_json, expires_at = excluded.expires_at'
    );
    $stmt->execute([
        ':k' => $key,
        ':v' => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':e' => time() + max(1, $ttlSeconds),
    ]);
}

function gs_cache_get(string $key, mixed $default = null): mixed
{
    $pdo = get_db();
    $stmt = $pdo->prepare('SELECT value_json, expires_at FROM app_cache WHERE cache_key = :k LIMIT 1');
    $stmt->execute([':k' => $key]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return $default;
    }
    if ((int) $row['expires_at'] < time()) {
        gs_cache_forget($key);
        return $default;
    }
    return json_decode((string) $row['value_json'], true);
}

function gs_cache_forget(string $key): void
{
    $pdo = get_db();
    $pdo->prepare('DELETE FROM app_cache WHERE cache_key = :k')->execute([':k' => $key]);
}

function gs_cache_remember(string $key, int $ttlSeconds, callable $resolver): mixed
{
    $sentinel = '__GS_CACHE_MISS__';
    $hit = gs_cache_get($key, $sentinel);
    if ($hit !== $sentinel) {
        return $hit;
    }
    $val = $resolver();
    gs_cache_set($key, $val, $ttlSeconds);
    return $val;
}

function gs_cache_prune(): int
{
    $pdo = get_db();
    $stmt = $pdo->prepare('DELETE FROM app_cache WHERE expires_at < :now');
    $stmt->execute([':now' => time()]);
    return $stmt->rowCount();
}

function gs_cache_flush(string $prefix = ''): int
{
    $pdo = get_db();
    if ($prefix === '') {
        return (int) $pdo->exec('DELETE FROM app_cache');
    }
    $stmt = $pdo->prepare('DELETE FROM app_cache WHERE cache_key LIKE :p');
    $stmt->execute([':p' => $prefix . '%']);
    return $stmt->rowCount();
}

// ============================================================================
// 6. Background Job Queue (`app_jobs`)
// ============================================================================

function &gs_job_handlers(): array
{
    static $handlers = [];
    return $handlers;
}

function gs_job_register(string $handler, callable $fn): void
{
    $reg = &gs_job_handlers();
    $reg[$handler] = $fn;
}

function gs_job_dispatch(string $handler, array $payload = [], int $delaySeconds = 0, string $queue = 'default', int $maxAttempts = 3): int
{
    $pdo = get_db();
    $now = date('c');
    $stmt = $pdo->prepare(
        'INSERT INTO app_jobs (queue, handler, payload_json, status, attempts, max_attempts, run_at, created_at, updated_at)
         VALUES (:q, :h, :p, "pending", 0, :ma, :ra, :c, :u)'
    );
    $stmt->execute([
        ':q'  => $queue,
        ':h'  => $handler,
        ':p'  => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':ma' => max(1, $maxAttempts),
        ':ra' => time() + max(0, $delaySeconds),
        ':c'  => $now,
        ':u'  => $now,
    ]);
    return (int) $pdo->lastInsertId();
}

function gs_job_run_pending(int $limit = 10, string $queue = 'default'): array
{
    $pdo = get_db();
    $reg = &gs_job_handlers();
    $stmt = $pdo->prepare(
        'SELECT * FROM app_jobs WHERE queue = :q AND status = "pending" AND run_at <= :now ORDER BY id ASC LIMIT ' . max(1, min(100, $limit))
    );
    $stmt->execute([':q' => $queue, ':now' => time()]);

    $processed = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $job) {
        $id = (int) $job['id'];
        $handler = (string) $job['handler'];
        $attempts = (int) $job['attempts'] + 1;
        $payload = json_decode((string) $job['payload_json'], true) ?: [];

        if (!isset($reg[$handler])) {
            $pdo->prepare('UPDATE app_jobs SET status = "failed", attempts = :a, last_error = :err, updated_at = :u WHERE id = :id')
                ->execute([':a' => $attempts, ':err' => 'Unbekannter Handler: ' . $handler, ':u' => date('c'), ':id' => $id]);
            $processed[] = ['id' => $id, 'status' => 'failed'];
            continue;
        }

        try {
            $reg[$handler]($payload);
            $pdo->prepare('UPDATE app_jobs SET status = "done", attempts = :a, updated_at = :u WHERE id = :id')
                ->execute([':a' => $attempts, ':u' => date('c'), ':id' => $id]);
            $processed[] = ['id' => $id, 'status' => 'done'];
        } catch (Throwable $e) {
            $nextStatus = $attempts >= (int) $job['max_attempts'] ? 'failed' : 'pending';
            $pdo->prepare('UPDATE app_jobs SET status = :s, attempts = :a, run_at = :ra, last_error = :err, updated_at = :u WHERE id = :id')
                ->execute([
                    ':s'   => $nextStatus,
                    ':a'   => $attempts,
                    ':ra'  => time() + ($attempts * 60),
                    ':err' => $e->getMessage(),
                    ':u'   => date('c'),
                    ':id'  => $id,
                ]);
            $processed[] = ['id' => $id, 'status' => $nextStatus, 'error' => $e->getMessage()];
        }
    }
    return $processed;
}

function gs_job_stats(?string $queue = null): array
{
    $pdo = get_db();
    $sql = 'SELECT status, COUNT(*) AS cnt FROM app_jobs';
    $params = [];
    if ($queue !== null && $queue !== '') {
        $sql .= ' WHERE queue = :q';
        $params[':q'] = $queue;
    }
    $sql .= ' GROUP BY status';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $stats = ['pending' => 0, 'done' => 0, 'failed' => 0, 'total' => 0];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $s = (string) $r['status'];
        $c = (int) $r['cnt'];
        $stats[$s] = $c;
        $stats['total'] += $c;
    }
    return $stats;
}

function gs_job_retry_failed(?string $queue = null): int
{
    $pdo = get_db();
    $now = time();
    $iso = date('c');
    if ($queue !== null && $queue !== '') {
        $stmt = $pdo->prepare(
            'UPDATE app_jobs SET status = "pending", attempts = 0, run_at = :now, last_error = "", updated_at = :u
             WHERE status = "failed" AND queue = :q'
        );
        $stmt->execute([':now' => $now, ':u' => $iso, ':q' => $queue]);
    } else {
        $stmt = $pdo->prepare(
            'UPDATE app_jobs SET status = "pending", attempts = 0, run_at = :now, last_error = "", updated_at = :u
             WHERE status = "failed"'
        );
        $stmt->execute([':now' => $now, ':u' => $iso]);
    }
    return $stmt->rowCount();
}

function gs_job_prune(int $olderThanDays = 14): int
{
    $pdo = get_db();
    $cutoff = date('c', time() - max(1, $olderThanDays) * 86400);
    $stmt = $pdo->prepare('DELETE FROM app_jobs WHERE status IN ("done", "failed") AND updated_at < :c');
    $stmt->execute([':c' => $cutoff]);
    return $stmt->rowCount();
}

// ============================================================================
// 7. HTTP Client, Signierte Webhooks & Mail
// ============================================================================

function gs_http(string $method, string $url, array $opts = []): array
{
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'status' => 0, 'body' => '', 'json' => null, 'error' => 'cURL nicht verfügbar'];
    }
    $ch = curl_init($url);
    $headers = $opts['headers'] ?? [];
    $curlOpts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => strtoupper($method),
        CURLOPT_TIMEOUT        => (int) ($opts['timeout'] ?? 8),
        CURLOPT_CONNECTTIMEOUT => (int) ($opts['connectTimeout'] ?? 4),
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ];
    if (isset($opts['json'])) {
        $headers[] = 'Content-Type: application/json';
        $curlOpts[CURLOPT_POSTFIELDS] = json_encode($opts['json'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } elseif (isset($opts['body'])) {
        $curlOpts[CURLOPT_POSTFIELDS] = $opts['body'];
    }
    if ($headers) {
        $curlOpts[CURLOPT_HTTPHEADER] = $headers;
    }
    curl_setopt_array($ch, $curlOpts);
    $raw = (string) curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    unset($ch);

    $decoded = json_decode($raw, true);
    return [
        'ok'     => $err === '' && $code >= 200 && $code < 300,
        'status' => $code,
        'body'   => $raw,
        'json'   => is_array($decoded) ? $decoded : null,
        'error'  => $err,
    ];
}

function gs_webhook_send(string $url, array $payload, ?string $secret = null): array
{
    $json = (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $headers = ['Content-Type: application/json'];
    if ($secret !== null && $secret !== '') {
        $headers[] = 'X-GS-Signature: sha256=' . hash_hmac('sha256', $json, $secret);
    }
    return gs_http('POST', $url, ['body' => $json, 'headers' => $headers]);
}

function gs_webhook_verify(string $secret, ?string $rawBody = null, ?string $signatureHeader = null): bool
{
    if ($secret === '') {
        return false;
    }
    $body = $rawBody ?? (string) file_get_contents('php://input');
    $sig = trim((string) ($signatureHeader ?? ($_SERVER['HTTP_X_GS_SIGNATURE'] ?? ($_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? ''))));
    if ($sig === '') {
        return false;
    }
    if (str_starts_with($sig, 'sha256=')) {
        $sig = substr($sig, 7);
    }
    $expected = hash_hmac('sha256', $body, $secret);
    return hash_equals($expected, $sig);
}

function gs_mail(string $to, string $subject, string $htmlBody, array $opts = []): bool
{
    $from = (string) ($opts['from'] ?? ('no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost')));
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . $from,
    ];
    if (!empty($opts['replyTo'])) {
        $headers[] = 'Reply-To: ' . (string) $opts['replyTo'];
    }
    $encSubj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    return @mail($to, $encSubj, $htmlBody, implode("\r\n", $headers));
}

// ============================================================================
// 8. Sichere Uploads & WebP-Pipeline (`app_uploads`)
// ============================================================================

function gs_upload_handle(string $field, string $namespace = 'general', array $opts = []): array
{
    $ns = gs_sanitize_ns($namespace);
    if (empty($_FILES[$field]['tmp_name']) || !is_uploaded_file($_FILES[$field]['tmp_name'])) {
        throw new RuntimeException('Keine gültige Datei hochgeladen.');
    }
    $file = $_FILES[$field];
    $maxBytes = (int) ($opts['maxBytes'] ?? 10 * 1024 * 1024);
    if ((int) $file['size'] > $maxBytes) {
        throw new RuntimeException('Datei ist zu groß (max. ' . round($maxBytes / 1048576, 1) . ' MB).');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($file['tmp_name']);
    $allowed = $opts['allowedMimes'] ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!in_array($mime, $allowed, true)) {
        throw new RuntimeException('Dateityp nicht erlaubt: ' . $mime);
    }

    $extMap = [
        'image/jpeg'      => 'jpg',
        'image/png'       => 'png',
        'image/webp'      => 'webp',
        'image/gif'       => 'gif',
        'application/pdf' => 'pdf',
    ];
    $ext = $extMap[$mime] ?? 'bin';
    $baseDir = dirname(__DIR__) . '/assets/images/apps/' . $ns;
    if (!is_dir($baseDir)) {
        mkdir($baseDir, 0755, true);
    }

    $name = bin2hex(random_bytes(8)) . '.' . $ext;
    $dest = $baseDir . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new RuntimeException('Datei konnte nicht gespeichert werden.');
    }

    // Optionale WebP-Konvertierung & Skalierung für JPEG/PNG (Standard: aktiv)
    $convertWebp = (bool) ($opts['convertWebp'] ?? true);
    $maxWidth = (int) ($opts['maxWidth'] ?? 1920);
    $webpQuality = max(40, min(100, (int) ($opts['webpQuality'] ?? 84)));
    if ($convertWebp && in_array($mime, ['image/jpeg', 'image/png'], true) && function_exists('imagewebp')) {
        $src = $mime === 'image/jpeg' ? @imagecreatefromjpeg($dest) : @imagecreatefrompng($dest);
        if ($src !== false) {
            $w = imagesx($src);
            $h = imagesy($src);
            $img = $src;
            if ($maxWidth > 0 && $w > $maxWidth) {
                $newH = max(1, (int) round($h * ($maxWidth / $w)));
                $resized = imagecreatetruecolor($maxWidth, $newH);
                if ($resized !== false) {
                    imagealphablending($resized, false);
                    imagesavealpha($resized, true);
                    imagecopyresampled($resized, $src, 0, 0, 0, 0, $maxWidth, $newH, $w, $h);
                    imagedestroy($src);
                    $img = $resized;
                }
            } else {
                imagepalettetotruecolor($img);
                imagealphablending($img, true);
                imagesavealpha($img, true);
            }
            $webpName = pathinfo($name, PATHINFO_FILENAME) . '.webp';
            $webpDest = $baseDir . '/' . $webpName;
            if (@imagewebp($img, $webpDest, $webpQuality)) {
                @unlink($dest);
                $name = $webpName;
                $dest = $webpDest;
                $mime = 'image/webp';
            }
            imagedestroy($img);
        }
    }

    $relPath = '/assets/images/apps/' . $ns . '/' . $name;
    $user = gs_active_user();
    $pdo = get_db();
    $stmt = $pdo->prepare(
        'INSERT INTO app_uploads (namespace, filename, rel_path, mime, size_bytes, owner_id, created_at)
         VALUES (:ns, :fn, :rp, :m, :sb, :oid, :c)'
    );
    $stmt->execute([
        ':ns'  => $ns,
        ':fn'  => (string) ($file['name'] ?? $name),
        ':rp'  => $relPath,
        ':m'   => $mime,
        ':sb'  => (int) filesize($dest),
        ':oid' => $user['id'] ?? null,
        ':c'   => date('c'),
    ]);

    return [
        'id'       => (int) $pdo->lastInsertId(),
        'namespace'=> $ns,
        'filename' => (string) ($file['name'] ?? $name),
        'url'      => $relPath,
        'mime'     => $mime,
        'size'     => (int) filesize($dest),
    ];
}

function gs_uploads_list(?string $namespace = null, int $limit = 100): array
{
    $pdo = get_db();
    $lim = max(1, min(500, $limit));
    if ($namespace !== null && trim($namespace) !== '') {
        $ns = gs_sanitize_ns($namespace);
        $stmt = $pdo->prepare('SELECT * FROM app_uploads WHERE namespace = :ns ORDER BY id DESC LIMIT ' . $lim);
        $stmt->execute([':ns' => $ns]);
    } else {
        $stmt = $pdo->query('SELECT * FROM app_uploads ORDER BY id DESC LIMIT ' . $lim);
    }
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $out[] = [
            'id'        => (int) $r['id'],
            'namespace' => (string) $r['namespace'],
            'filename'  => (string) $r['filename'],
            'url'       => (string) $r['rel_path'],
            'mime'      => (string) $r['mime'],
            'size'      => (int) $r['size_bytes'],
            'ownerId'   => $r['owner_id'] !== null ? (int) $r['owner_id'] : null,
            'createdAt' => (string) $r['created_at'],
        ];
    }
    return $out;
}

// ============================================================================
// 9. Event-/Hook-Bus, Audit-Log, Health-Check & App-Registry
// ============================================================================

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

function gs_audit(string $action, string $summary = '', ?array $user = null): void
{
    $u = $user ?: gs_active_user();
    $pdo = get_db();
    $pdo->prepare(
        'INSERT INTO audit_log (user_name, user_email, user_role, action, summary, created_at)
         VALUES (:n, :e, :r, :a, :s, :c)'
    )->execute([
        ':n' => (string) ($u['name'] ?? 'System'),
        ':e' => (string) ($u['email'] ?? 'system@local'),
        ':r' => (string) ($u['role'] ?? 'system'),
        ':a' => $action,
        ':s' => $summary,
        ':c' => date('c'),
    ]);
}

function gs_health(): array
{
    return [
        'engineVersion' => GS_ENGINE_VERSION,
        'phpVersion'    => PHP_VERSION,
        'extensions'    => [
            'pdo_sqlite' => extension_loaded('pdo_sqlite'),
            'curl'       => extension_loaded('curl'),
            'openssl'    => extension_loaded('openssl'),
            'gd'         => extension_loaded('gd'),
            'zip'        => class_exists('ZipArchive'),
        ],
        'storageWritable' => is_writable(STORAGE_DIR),
        'diskFreeMb'      => (int) round((@disk_free_space(__DIR__) ?: 0) / 1048576),
    ];
}

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

// ============================================================================
// 10. Server-Sent Events (SSE), App-Settings & Feature-Flags
// ============================================================================

function gs_sse_headers(): void
{
    if (function_exists('session_status') && session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');
    while (ob_get_level() > 0) {
        @ob_end_flush();
    }
    @flush();
}

function gs_sse_send(string $event, mixed $data, ?string $id = null): void
{
    if ($id !== null && $id !== '') {
        echo 'id: ' . str_replace(["\r", "\n"], '', $id) . "\n";
    }
    echo 'event: ' . str_replace(["\r", "\n"], '', $event) . "\n";
    $payload = is_string($data) ? $data : (string) json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    foreach (explode("\n", $payload) as $line) {
        echo 'data: ' . $line . "\n";
    }
    echo "\n";
    @flush();
}

function gs_app_setting_get(string $appSlug, string $key, mixed $default = null): mixed
{
    $slug = gs_sanitize_ns($appSlug);
    $k = gs_sanitize_ns($key);
    $raw = get_setting('app:' . $slug . ':' . $k, '__GS_UNSET__');
    if ($raw === '__GS_UNSET__') {
        return $default;
    }
    $decoded = json_decode($raw, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $raw;
}

function gs_app_setting_set(string $appSlug, string $key, mixed $value): void
{
    $slug = gs_sanitize_ns($appSlug);
    $k = gs_sanitize_ns($key);
    set_setting('app:' . $slug . ':' . $k, (string) json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function gs_app_settings(string $appSlug): array
{
    $slug = gs_sanitize_ns($appSlug);
    $prefix = 'app:' . $slug . ':';
    $pdo = get_db();
    $stmt = $pdo->prepare('SELECT key, value FROM settings WHERE key LIKE :p ORDER BY key ASC');
    $stmt->execute([':p' => $prefix . '%']);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $shortKey = substr((string) $r['key'], strlen($prefix));
        $decoded = json_decode((string) $r['value'], true);
        $out[$shortKey] = json_last_error() === JSON_ERROR_NONE ? $decoded : $r['value'];
    }
    return $out;
}

function gs_flag(string $name, bool $default = false): bool
{
    $k = 'flag:' . gs_sanitize_ns($name);
    $raw = get_setting($k, '__GS_UNSET__');
    if ($raw === '__GS_UNSET__') {
        return $default;
    }
    return in_array(strtolower($raw), ['1', 'true', 'yes', 'on'], true);
}

function gs_flag_set(string $name, bool $enabled): void
{
    $k = 'flag:' . gs_sanitize_ns($name);
    set_setting($k, $enabled ? '1' : '0');
}

function gs_flags_list(): array
{
    $pdo = get_db();
    $rows = $pdo->query("SELECT key, value FROM settings WHERE key LIKE 'flag:%' ORDER BY key ASC")->fetchAll(PDO::FETCH_ASSOC);
    $out = [];
    foreach ($rows as $r) {
        $name = substr((string) $r['key'], 5);
        $out[$name] = in_array(strtolower((string) $r['value']), ['1', 'true', 'yes', 'on'], true);
    }
    return $out;
}
