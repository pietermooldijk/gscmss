<?php
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') == 443)
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('X-Content-Type-Options: nosniff');

define('GS_INTEGRITY_SEAL', 'e2b2821afd3e8ec3f821d87070e197a82651d7308bc09bf223f00dd7678545bd');

function current_user(): ?array
{
    $user = $_SESSION['user'] ?? null;
    if (!is_array($user)) {
        return null;
    }
    if (defined('DB_PATH') && (($user['db_path'] ?? '') !== DB_PATH)) {
        unset($_SESSION['user']);
        return null;
    }
    return $user;
}

/** Leitet zum Login um, falls niemand eingeloggt ist. Gibt sonst den User zurück. */
function require_login(): array
{
    $user = current_user();
    if (!$user) {
        header('Location: index.php');
        exit;
    }
    return $user;
}

function is_admin(): bool
{
    $user = current_user();
    return $user !== null && (($user['role'] ?? 'admin') === 'admin');
}

function login(array $user): void
{
    $role = (string) ($user['role'] ?? 'admin');
    if (!in_array($role, ['admin', 'editor'], true)) {
        $role = 'editor';
    }
    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id'            => (int) ($user['id'] ?? 0),
        'name'          => (string) ($user['name'] ?? ''),
        'email'         => (string) ($user['email'] ?? ''),
        'role'          => $role,
        'auth_provider' => (string) ($user['auth_provider'] ?? 'local'),
        'db_path'       => defined('DB_PATH') ? DB_PATH : '',
    ];
}

function logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }
    session_destroy();
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_check(?string $token): bool
{
    return $token !== null && !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $token);
}
