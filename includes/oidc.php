<?php
/**
 * Leichtgewichtige OpenID Connect (OIDC) / Authentik SSO-Anbindung
 * ohne externe Composer-Abhängigkeiten (PHP cURL + PKCE + Sessions).
 */

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function oidc_config(): array
{
    $adminGroup = trim(get_setting('oidc_admin_group', ''));
    if ($adminGroup === '') {
        $adminGroup = trim(get_setting('oidc_allowed_group', ''));
    }
    return [
        'enabled'              => get_setting('oidc_enabled', '0') === '1',
        'issuer'               => rtrim(trim(get_setting('oidc_issuer', '')), '/'),
        'client_id'            => trim(get_setting('oidc_client_id', '')),
        'client_secret'        => trim(get_setting('oidc_client_secret', '')),
        'admin_group'          => $adminGroup,
        'editor_group'         => trim(get_setting('oidc_editor_group', '')),
        'allow_local_fallback' => get_setting('oidc_allow_local_fallback', '0') === '1',
    ];
}

function oidc_is_ready(): bool
{
    $cfg = oidc_config();
    return $cfg['enabled']
        && $cfg['issuer'] !== ''
        && $cfg['client_id'] !== ''
        && $cfg['client_secret'] !== ''
        && function_exists('curl_init');
}

function oidc_base_url(): string
{
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') == 443)
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $isHttps ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    return $scheme . '://' . $host;
}

function oidc_redirect_uri(): string
{
    return oidc_base_url() . '/api/oidc.php?action=callback';
}

function oidc_b64url(string $raw): string
{
    return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

function oidc_http_json(string $url, ?array $postFields = null, array $headers = []): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL-Erweiterung ist auf diesem Server nicht aktiv.');
    }
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ];
    if ($postFields !== null) {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = http_build_query($postFields, '', '&', PHP_QUERY_RFC3986);
        $headers[] = 'Content-Type: application/x-www-form-urlencoded';
    }
    if (!empty($headers)) {
        $opts[CURLOPT_HTTPHEADER] = $headers;
    }
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    unset($ch);

    if ($errno !== 0 || $body === false) {
        throw new RuntimeException('Authentik-Verbindung fehlgeschlagen: ' . ($err ?: 'Unbekannter Fehler'));
    }
    $data = json_decode((string) $body, true);
    if (!is_array($data)) {
        throw new RuntimeException('Ungültige Antwort von Authentik (HTTP ' . $status . ').');
    }
    if ($status >= 400) {
        $msg = $data['error_description'] ?? $data['error'] ?? ('HTTP ' . $status);
        throw new RuntimeException('Authentik-Fehler: ' . $msg);
    }
    return $data;
}

function oidc_discover(string $issuer): array
{
    $issuer = rtrim($issuer, '/');
    if (str_ends_with($issuer, '/.well-known/openid-configuration')) {
        $discoveryUrl = $issuer;
    } else {
        $discoveryUrl = $issuer . '/.well-known/openid-configuration';
    }

    if (
        !empty($_SESSION['oidc_discovery'])
        && ($_SESSION['oidc_discovery']['url'] ?? '') === $discoveryUrl
        && (time() - (int) ($_SESSION['oidc_discovery']['at'] ?? 0)) < 300
    ) {
        return $_SESSION['oidc_discovery']['data'];
    }

    $data = oidc_http_json($discoveryUrl);
    if (empty($data['authorization_endpoint']) || empty($data['token_endpoint'])) {
        throw new RuntimeException('OIDC-Discovery unvollständig (authorization_endpoint / token_endpoint fehlen).');
    }
    $_SESSION['oidc_discovery'] = [
        'url'  => $discoveryUrl,
        'at'   => time(),
        'data' => $data,
    ];
    return $data;
}

function oidc_sanitize_return(string $returnTo): string
{
    $returnTo = trim($returnTo);
    if ($returnTo === '' || $returnTo[0] !== '/' || str_starts_with($returnTo, '//')) {
        return '/cms/';
    }
    return $returnTo;
}

function oidc_build_auth_url(string $returnTo = '/cms/'): string
{
    $cfg = oidc_config();
    if (!oidc_is_ready()) {
        throw new RuntimeException('Authentik SSO ist noch nicht vollständig konfiguriert.');
    }
    $disc = oidc_discover($cfg['issuer']);

    $state = oidc_b64url(random_bytes(24));
    $nonce = oidc_b64url(random_bytes(24));
    $verifier = oidc_b64url(random_bytes(32));
    $challenge = oidc_b64url(hash('sha256', $verifier, true));

    $_SESSION['oidc_flow'] = [
        'state'     => $state,
        'nonce'     => $nonce,
        'verifier'  => $verifier,
        'return_to' => oidc_sanitize_return($returnTo),
        'created'   => time(),
    ];

    $params = [
        'response_type'         => 'code',
        'client_id'             => $cfg['client_id'],
        'redirect_uri'          => oidc_redirect_uri(),
        'scope'                 => 'openid profile email',
        'state'                 => $state,
        'nonce'                 => $nonce,
        'code_challenge'        => $challenge,
        'code_challenge_method' => 'S256',
    ];
    $sep = str_contains($disc['authorization_endpoint'], '?') ? '&' : '?';
    return $disc['authorization_endpoint'] . $sep . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
}

function oidc_decode_jwt_payload(string $jwt): array
{
    $parts = explode('.', $jwt);
    if (count($parts) < 2) {
        return [];
    }
    $b64 = strtr($parts[1], '-_', '+/');
    $pad = strlen($b64) % 4;
    if ($pad > 0) {
        $b64 .= str_repeat('=', 4 - $pad);
    }
    $json = base64_decode($b64, true);
    $data = $json !== false ? json_decode($json, true) : null;
    return is_array($data) ? $data : [];
}

function oidc_handle_callback(array $query): string
{
    $cfg = oidc_config();
    if (!oidc_is_ready()) {
        throw new RuntimeException('Authentik SSO ist nicht konfiguriert.');
    }

    if (!empty($query['error'])) {
        $desc = (string) ($query['error_description'] ?? $query['error']);
        throw new RuntimeException('Anmeldung abgebrochen: ' . $desc);
    }

    $flow = $_SESSION['oidc_flow'] ?? null;
    unset($_SESSION['oidc_flow']);

    $state = (string) ($query['state'] ?? '');
    $code = (string) ($query['code'] ?? '');
    if (!is_array($flow) || $state === '' || $code === '' || !hash_equals((string) ($flow['state'] ?? ''), $state)) {
        throw new RuntimeException('Ungültiger oder abgelaufener OIDC-Status. Bitte erneut anmelden.');
    }
    if ((time() - (int) ($flow['created'] ?? 0)) > 600) {
        throw new RuntimeException('Die Anmelde-Session ist abgelaufen. Bitte erneut versuchen.');
    }

    $disc = oidc_discover($cfg['issuer']);
    $tokens = oidc_http_json($disc['token_endpoint'], [
        'grant_type'    => 'authorization_code',
        'code'          => $code,
        'redirect_uri'  => oidc_redirect_uri(),
        'client_id'     => $cfg['client_id'],
        'client_secret' => $cfg['client_secret'],
        'code_verifier' => (string) ($flow['verifier'] ?? ''),
    ]);

    $idClaims = !empty($tokens['id_token']) ? oidc_decode_jwt_payload((string) $tokens['id_token']) : [];
    if (!empty($idClaims['nonce']) && !hash_equals((string) $flow['nonce'], (string) $idClaims['nonce'])) {
        throw new RuntimeException('Ungültige OIDC-Nonce.');
    }

    $claims = $idClaims;
    if (!empty($disc['userinfo_endpoint']) && !empty($tokens['access_token'])) {
        $userInfo = oidc_http_json($disc['userinfo_endpoint'], null, [
            'Authorization: Bearer ' . $tokens['access_token'],
        ]);
        $claims = array_merge($claims, $userInfo);
    }

    // Rollen-Mapping über Authentik-Gruppen (Admin-Gruppe / Editor-Gruppe)
    $groups = $claims['groups'] ?? [];
    if (!is_array($groups)) {
        $groups = [];
    }
    $normalizedGroups = array_map(fn($g) => strtolower(trim((string) $g)), $groups);

    $role = 'admin';
    $hasAdminGroup = $cfg['admin_group'] !== '';
    $hasEditorGroup = $cfg['editor_group'] !== '';

    if ($hasAdminGroup || $hasEditorGroup) {
        if ($hasAdminGroup && in_array(strtolower($cfg['admin_group']), $normalizedGroups, true)) {
            $role = 'admin';
        } elseif ($hasEditorGroup && in_array(strtolower($cfg['editor_group']), $normalizedGroups, true)) {
            $role = 'editor';
        } else {
            throw new RuntimeException('Dein Authentik-Account besitzt keine berechtigte CMSS-Rolle (Admin/Editor).');
        }
    }

    $email = trim((string) ($claims['email'] ?? ''));
    $name = trim((string) ($claims['name'] ?? $claims['preferred_username'] ?? $email ?: 'Authentik User'));
    if ($email === '' && !empty($claims['preferred_username'])) {
        $email = trim((string) $claims['preferred_username']);
    }

    login([
        'id'            => 0,
        'name'          => $name,
        'email'         => $email,
        'role'          => $role,
        'auth_provider' => 'authentik',
    ]);

    if (!empty($tokens['id_token'])) {
        $_SESSION['oidc_id_token'] = (string) $tokens['id_token'];
    }

    return oidc_sanitize_return((string) ($flow['return_to'] ?? '/cms/'));
}

function oidc_logout_url(string $postLogoutReturn = '/cms/'): ?string
{
    $cfg = oidc_config();
    logout();

    if (!$cfg['enabled'] || $cfg['issuer'] === '') {
        return null;
    }
    try {
        $disc = oidc_discover($cfg['issuer']);
        if (empty($disc['end_session_endpoint'])) {
            return null;
        }
        return (string) $disc['end_session_endpoint'];
    } catch (Throwable $e) {
        return null;
    }
}
