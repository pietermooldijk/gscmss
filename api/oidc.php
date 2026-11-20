<?php
/**
 * Authentik / OIDC Endpoint (/api/oidc.php)
 * Actions: login, callback, logout
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/oidc.php';

function oidc_resolve_target(): string
{
    $app = (string) ($_GET['app'] ?? '');
    if ($app === 'admin') {
        return '/admin/dashboard.php';
    }
    if ($app === 'cms') {
        return '/cms/';
    }
    return oidc_sanitize_return((string) ($_GET['return'] ?? '/cms/'));
}

$action = (string) ($_GET['action'] ?? 'login');

if ($action === 'login') {
    $returnTo = oidc_resolve_target();
    try {
        $url = oidc_build_auth_url($returnTo);
        header('Location: ' . $url);
        exit;
    } catch (Throwable $e) {
        $target = strtok($returnTo, '?') ?: '/cms/';
        header('Location: ' . $target . '?oidc_error=' . rawurlencode($e->getMessage()));
        exit;
    }
}

if ($action === 'callback') {
    $fallbackReturn = oidc_sanitize_return((string) ($_SESSION['oidc_flow']['return_to'] ?? '/cms/'));
    try {
        $returnTo = oidc_handle_callback($_GET);
        header('Location: ' . $returnTo);
        exit;
    } catch (Throwable $e) {
        $target = strtok($fallbackReturn, '?') ?: '/cms/';
        header('Location: ' . $target . '?oidc_error=' . rawurlencode($e->getMessage()));
        exit;
    }
}

if ($action === 'logout') {
    $returnTo = oidc_resolve_target();
    $endSessionUrl = oidc_logout_url($returnTo);
    header('Location: ' . ($endSessionUrl ?: $returnTo));
    exit;
}

http_response_code(400);
echo 'Unbekannte OIDC-Aktion.';
