<?php
/**
 * Gamet Studios — Visual CMS API (api/cms.php)
 * Liest und speichert alle JSON-Daten, Seiten-Layouts, Sektions-Übergänge,
 * Journal-Markdown-Artikel sowie Bilduploads und triggert bei Bedarf tools/build.py.
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/discord.php';
require_once __DIR__ . '/../includes/oidc.php';
require_once __DIR__ . '/../includes/telemetry.php';
require_once __DIR__ . '/../includes/integrity.php';

$root = dirname(__DIR__);
$pdo = get_db();

function cms_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cms_read_json(string $relPath): array
{
    global $root;
    $full = $root . '/' . ltrim($relPath, '/');
    if (!is_file($full)) {
        return [];
    }
    $decoded = json_decode(file_get_contents($full) ?: '{}', true);
    return is_array($decoded) ? $decoded : [];
}

function cms_write_json(string $relPath, array $data): bool
{
    global $root;
    $full = $root . '/' . ltrim($relPath, '/');
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    return file_put_contents($full, $json . "\n", LOCK_EX) !== false;
}

function cms_load_journal_posts(): array
{
    global $root;
    $dir = $root . '/data/journal/de';
    $indexFile = $dir . '/index.json';
    $slugs = is_file($indexFile) ? (json_decode(file_get_contents($indexFile) ?: '[]', true) ?: []) : [];

    $posts = [];
    foreach ($slugs as $slug) {
        $mdFile = $dir . '/' . basename((string) $slug) . '.md';
        if (!is_file($mdFile)) {
            continue;
        }
        $raw = file_get_contents($mdFile) ?: '';
        $meta = [
            'slug'         => $slug,
            'title'        => $slug,
            'date'         => date('Y-m-d'),
            'excerpt'      => '',
            'category'     => 'Essay',
            'author'       => 'Gamet Studios',
            'cover'        => '',
            'cover_credit' => '',
            'body'         => $raw,
        ];
        if (preg_match('/^---\R(.*?)\R---\R?(.*)$/s', $raw, $m)) {
            $front = $m[1];
            $meta['body'] = ltrim($m[2]);
            foreach (preg_split('/\R/', $front) as $line) {
                if (strpos($line, ':') !== false) {
                    [$k, $v] = explode(':', $line, 2);
                    $k = trim($k);
                    $v = trim($v);
                    if (array_key_exists($k, $meta)) {
                        $meta[$k] = $v;
                    }
                }
            }
        }
        $meta['builtHtmlExists'] = is_file($root . '/de/journal/' . basename((string) $slug) . '.html');
        $posts[] = $meta;
    }
    return $posts;
}

function cms_save_journal_posts(array $posts): array
{
    global $root;
    $dir = $root . '/data/journal/de';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $slugs = [];
    foreach ($posts as $p) {
        $slug = preg_replace('/[^a-z0-9-]+/', '-', strtolower(trim((string) ($p['slug'] ?? ''))));
        $slug = trim($slug ?: 'post-' . time(), '-');
        if ($slug === 'post-template') {
            $slug = 'post-template-artikel';
        }
        $slugs[] = $slug;

        $frontLines = [
            '---',
            'title: ' . str_replace(["\r", "\n"], ' ', trim((string) ($p['title'] ?? $slug))),
            'date: ' . str_replace(["\r", "\n"], ' ', trim((string) ($p['date'] ?? date('Y-m-d')))),
            'excerpt: ' . str_replace(["\r", "\n"], ' ', trim((string) ($p['excerpt'] ?? ''))),
            'category: ' . str_replace(["\r", "\n"], ' ', trim((string) ($p['category'] ?? 'Essay'))),
            'author: ' . str_replace(["\r", "\n"], ' ', trim((string) ($p['author'] ?? 'Gamet Studios'))),
        ];
        if (!empty($p['cover'])) {
            $frontLines[] = 'cover: ' . str_replace(["\r", "\n"], ' ', trim((string) $p['cover']));
        }
        if (!empty($p['cover_credit'])) {
            $frontLines[] = 'cover_credit: ' . str_replace(["\r", "\n"], ' ', trim((string) $p['cover_credit']));
        }
        $frontLines[] = '---';
        $frontLines[] = '';
        $body = rtrim((string) ($p['body'] ?? '')) . "\n";

        file_put_contents($dir . '/' . $slug . '.md', implode("\n", $frontLines) . $body, LOCK_EX);
    }

    $uniqueSlugs = array_values(array_unique($slugs));

    // Verwaiste .md Dateien aufräumen, falls ein Artikel im CMS gelöscht oder umbenannt wurde
    foreach (scandir($dir) ?: [] as $existing) {
        if (substr($existing, -3) === '.md') {
            $existingSlug = substr($existing, 0, -3);
            if (!in_array($existingSlug, $uniqueSlugs, true)) {
                @unlink($dir . '/' . $existing);
            }
        }
    }

    file_put_contents(
        $dir . '/index.json',
        json_encode($uniqueSlugs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n",
        LOCK_EX
    );

    // tools/build.py ausführen, um vollwertige Blog-Posts (/de/journal/<slug>.html + /en/journal/<slug>.html) zu generieren
    $buildScript = $root . '/tools/build.py';
    $buildOut = [];
    $buildCode = -1;
    if (is_file($buildScript) && function_exists('exec')) {
        @exec('python3 ' . escapeshellarg($buildScript) . ' 2>&1', $buildOut, $buildCode);
    }

    return [
        'ok'     => ($buildCode === 0),
        'code'   => $buildCode,
        'output' => implode("\n", $buildOut),
        'slugs'  => $uniqueSlugs,
    ];
}

function cms_list_images(): array
{
    global $root;
    $folders = [
        ['key' => 'icons', 'dir' => '/assets/icons'],
        ['key' => 'backgrounds', 'dir' => '/assets/images/backgrounds'],
        ['key' => 'projects', 'dir' => '/assets/images/projects'],
        ['key' => 'members', 'dir' => '/assets/images/members'],
        ['key' => 'journal', 'dir' => '/assets/images/journal'],
        ['key' => 'og', 'dir' => '/assets/images/og'],
    ];
    $out = [];
    foreach ($folders as $f) {
        $dir = $root . $f['dir'];
        if (!is_dir($dir)) {
            continue;
        }
        foreach (scandir($dir) ?: [] as $file) {
            if ($file[0] === '.') {
                continue;
            }
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico', 'mp4', 'webm', 'mov'], true)) {
                $out[] = [
                    'folder' => $f['key'],
                    'name'   => $file,
                    'url'    => $f['dir'] . '/' . $file,
                    'type'   => in_array($ext, ['mp4', 'webm', 'mov'], true) ? 'video' : 'image',
                ];
            }
        }
    }
    return $out;
}

function cms_load_submissions(): array
{
    global $pdo;
    $rows = $pdo->query('SELECT * FROM submissions ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int) $r['id'];
        $r['fields'] = json_decode((string) ($r['data_json'] ?? '{}'), true) ?: [];
    }
    return $rows;
}

function cms_require_admin(): void
{
    if (!is_admin()) {
        cms_json(['ok' => false, 'error' => 'Diese Aktion erfordert Admin-Rechte.'], 403);
    }
}

function cms_safe_log_audit(?array $user, string $action, string $summary = ''): void
{
    if (function_exists('log_audit')) {
        log_audit($user, $action, $summary);
    }
}

function cms_safe_get_audit_log(int $limit = 60): array
{
    return function_exists('get_audit_log') ? get_audit_log($limit) : [];
}

function cms_load_changelog(): array
{
    global $root;
    $path = $root . '/cms/changelog.json';
    if (!is_file($path)) {
        return ['latestId' => '', 'releases' => []];
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : ['latestId' => '', 'releases' => []];
}

function cms_snapshot_dir(): string
{
    return STORAGE_DIR . '/snapshots';
}

function cms_snapshot_files(): array
{
    return [
        'site'       => 'data/site.json',
        'layout'     => 'data/layout.json',
        'pagesDe'    => 'data/de/pages.json',
        'pagesEn'    => 'data/en/pages.json',
        'projectsDe' => 'data/de/projects.json',
        'projectsEn' => 'data/en/projects.json',
        'membersDe'  => 'data/de/members.json',
        'membersEn'  => 'data/en/members.json',
    ];
}

function cms_create_snapshot(?array $user, string $reason = 'Speichern'): ?string
{
    global $root;
    $dir = cms_snapshot_dir();
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    if (!is_dir($dir) || !is_writable($dir)) {
        return null;
    }
    $files = [];
    foreach (cms_snapshot_files() as $key => $rel) {
        $abs = $root . '/' . $rel;
        if (is_file($abs)) {
            $files[$key] = json_decode((string) file_get_contents($abs), true);
        }
    }
    $id = date('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $payload = [
        'id'        => $id,
        'createdAt' => date('c'),
        'user'      => $user['name'] ?? 'System',
        'reason'    => $reason,
        'files'     => $files,
    ];
    @file_put_contents($dir . '/.ht_snap_' . $id . '.json', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    @chmod($dir . '/.ht_snap_' . $id . '.json', 0644);

    // Nur die letzten 15 Snapshots behalten
    $all = glob($dir . '/.ht_snap_*.json') ?: [];
    rsort($all);
    foreach (array_slice($all, 15) as $old) {
        @unlink($old);
    }
    return $id;
}

function cms_list_snapshots(): array
{
    $dir = cms_snapshot_dir();
    if (!is_dir($dir)) {
        return [];
    }
    $all = glob($dir . '/.ht_snap_*.json') ?: [];
    rsort($all);
    $out = [];
    foreach (array_slice($all, 0, 15) as $file) {
        $data = json_decode((string) @file_get_contents($file), true);
        if (is_array($data) && !empty($data['id'])) {
            $out[] = [
                'id'        => (string) $data['id'],
                'createdAt' => (string) ($data['createdAt'] ?? ''),
                'user'      => (string) ($data['user'] ?? ''),
                'reason'    => (string) ($data['reason'] ?? ''),
            ];
        }
    }
    return $out;
}

function cms_generate_sitemap(): bool
{
    global $root;
    $baseUrl = rtrim(get_setting('site_url', defined('SITE_URL') ? SITE_URL : ''), '/');
    if ($baseUrl === '' && !empty($_SERVER['HTTP_HOST'])) {
        $scheme = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')) ? 'https' : 'http';
        $baseUrl = $scheme . '://' . $_SERVER['HTTP_HOST'];
    }
    if ($baseUrl === '') {
        return false;
    }
    $layout = cms_read_json('data/layout.json');
    $urls = [];
    foreach (($layout['pages'] ?? []) as $pKey => $pCfg) {
        foreach (['pathDe', 'pathEn'] as $pk) {
            $path = trim((string) ($pCfg[$pk] ?? ''));
            if ($path !== '') {
                $urls[] = $baseUrl . '/' . ltrim($path, '/');
            }
        }
    }
    foreach (cms_load_journal_posts() as $post) {
        if (($post['status'] ?? 'published') === 'draft') {
            continue;
        }
        $slug = trim((string) ($post['slug'] ?? ''));
        if ($slug !== '') {
            $urls[] = $baseUrl . '/de/journal/' . $slug;
            $urls[] = $baseUrl . '/en/journal/' . $slug;
        }
    }
    $urls = array_values(array_unique($urls));
    $today = date('Y-m-d');
    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
    foreach ($urls as $u) {
        $xml .= "  <url><loc>" . htmlspecialchars($u, ENT_XML1, 'UTF-8') . "</loc><lastmod>{$today}</lastmod></url>\n";
    }
    $xml .= "</urlset>\n";
    $ok = @file_put_contents($root . '/sitemap.xml', $xml, LOCK_EX) !== false;
    if ($ok) {
        @chmod($root . '/sitemap.xml', 0644);
    }
    return $ok;
}

function cms_find_unused_images(): array
{
    global $root;
    $images = cms_list_images();
    $haystack = '';
    foreach (glob($root . '/data/*.json') ?: [] as $f) {
        $haystack .= @file_get_contents($f);
    }
    foreach (['de', 'en'] as $lang) {
        foreach (glob($root . '/data/' . $lang . '/*.json') ?: [] as $f) {
            $haystack .= @file_get_contents($f);
        }
        foreach (glob($root . '/' . $lang . '/*.html') ?: [] as $f) {
            $haystack .= @file_get_contents($f);
        }
    }
    $unused = [];
    foreach ($images as $img) {
        $url = (string) ($img['url'] ?? '');
        if ($url === '' || ($img['folder'] ?? '') === 'icons' || ($img['folder'] ?? '') === 'og') {
            continue;
        }
        if (!str_contains($haystack, $url)) {
            $unused[] = $url;
        }
    }
    return $unused;
}

function cms_health_check(): array
{
    global $root;
    $oidcCfg = oidc_config();
    $checks = [
        ['label' => 'PHP-Version', 'ok' => version_compare(PHP_VERSION, '8.1.0', '>='), 'detail' => 'PHP ' . PHP_VERSION],
        ['label' => 'SQLite Datenbank (644)', 'ok' => is_file(DB_PATH) && is_writable(DB_PATH), 'detail' => is_writable(DB_PATH) ? 'Beschreibbar' : 'Nicht beschreibbar (chmod 644 prüfen)'],
        ['label' => 'Ordner storage/ & data/', 'ok' => is_writable(STORAGE_DIR) && is_writable($root . '/data'), 'detail' => (is_writable(STORAGE_DIR) && is_writable($root . '/data')) ? 'Beschreibbar' : 'Schreibrechte fehlen'],
        ['label' => 'Ordner assets/images/', 'ok' => is_writable($root . '/assets/images'), 'detail' => is_writable($root . '/assets/images') ? 'Beschreibbar' : 'Schreibrechte fehlen'],
        ['label' => 'ZipArchive (Backup/Core-Update)', 'ok' => class_exists('ZipArchive'), 'detail' => class_exists('ZipArchive') ? 'Aktiv' : 'Fehlt'],
        ['label' => 'cURL (Authentik/Discord/Turnstile)', 'ok' => function_exists('curl_init'), 'detail' => function_exists('curl_init') ? 'Aktiv' : 'Fehlt'],
        ['label' => 'GD WebP-Konvertierung', 'ok' => function_exists('imagewebp'), 'detail' => function_exists('imagewebp') ? 'Aktiv (JPG/PNG → WebP)' : 'Nicht verfügbar (Upload ohne Konvertierung)'],
        ['label' => 'Authentik SSO (OIDC)', 'ok' => oidc_is_ready(), 'detail' => oidc_is_ready() ? 'Aktiv & konfiguriert' : ($oidcCfg['enabled'] ? 'Unvollständig' : 'Deaktiviert')],
    ];
    return $checks;
}

function cms_maybe_convert_webp(string $destPath, string $folder): string
{
    if ($folder === 'icons' || !function_exists('imagewebp')) {
        return $destPath;
    }
    $ext = strtolower(pathinfo($destPath, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
        return $destPath;
    }
    $src = ($ext === 'png') ? @imagecreatefrompng($destPath) : @imagecreatefromjpeg($destPath);
    if (!$src) {
        return $destPath;
    }
    $w = imagesx($src);
    $h = imagesy($src);
    $maxW = 1920;
    $target = $src;
    if ($w > $maxW && $w > 0 && $h > 0) {
        $newH = (int) round($h * ($maxW / $w));
        $resized = imagecreatetruecolor($maxW, $newH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $src, 0, 0, 0, 0, $maxW, $newH, $w, $h);
        imagedestroy($src);
        $target = $resized;
    } else {
        imagepalettetotruecolor($target);
        imagealphablending($target, true);
        imagesavealpha($target, true);
    }
    $webpPath = preg_replace('/\.(jpe?g|png)$/i', '.webp', $destPath);
    $ok = @imagewebp($target, $webpPath, 84);
    imagedestroy($target);
    if ($ok && is_file($webpPath)) {
        if ($webpPath !== $destPath) {
            @unlink($destPath);
        }
        @chmod($webpPath, 0644);
        return $webpPath;
    }
    return $destPath;
}

function cms_load_users(): array
{
    global $pdo;
    $rows = $pdo->query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$u) {
        $u['id'] = (int) $u['id'];
        $u['role'] = in_array(($u['role'] ?? 'admin'), ['admin', 'editor'], true) ? $u['role'] : 'admin';
    }
    return $rows;
}

function cms_load_system_settings(): array
{
    return [
        'discord_webhook_url'      => get_setting('discord_webhook_url', ''),
        'discord_role_id'          => get_setting('discord_role_id', ''),
        'site_url'                 => get_setting('site_url', defined('SITE_URL') ? SITE_URL : ''),
        'turnstile_site_key'       => get_setting('turnstile_site_key', ''),
        'turnstile_secret_key'     => get_setting('turnstile_secret_key', ''),
        'oidc_enabled'             => get_setting('oidc_enabled', '0'),
        'oidc_issuer'              => get_setting('oidc_issuer', ''),
        'oidc_client_id'           => get_setting('oidc_client_id', ''),
        'oidc_client_secret'       => get_setting('oidc_client_secret', ''),
        'oidc_admin_group'         => get_setting('oidc_admin_group', get_setting('oidc_allowed_group', '')),
        'oidc_editor_group'        => get_setting('oidc_editor_group', ''),
        'oidc_allow_local_fallback'=> get_setting('oidc_allow_local_fallback', '0'),
        'oidc_redirect_uri'        => oidc_redirect_uri(),
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (($_GET['action'] ?? '') === 'hub_sync') {
    $hub = gs_telemetry_sync(true);
    cms_json([
        'ok'       => true,
        'disabled' => $hub['disabled'],
    ]);
}

if (($_GET['action'] ?? '') !== 'public_status') {
    $tamper = gs_verify_integrity();
    if ($tamper['tampered']) {
        cms_json([
            'ok'    => false,
            'error' => 'Integritätsprüfung fehlgeschlagen (Code-Manipulation erkannt: ' . $tamper['file'] . '). System gesperrt.',
        ], 403);
    }
    $hub = gs_is_instance_disabled();
    if ($hub['disabled']) {
        cms_json([
            'ok'    => false,
            'error' => 'Diese CMSS-Instanz wurde deaktiviert' . ($hub['reason'] !== '' ? ': ' . $hub['reason'] : '.'),
        ], 403);
    }
}

if ($method === 'GET') {
    $user = current_user();
    if ($user && ($user['auth_provider'] ?? 'local') === 'local') {
        $chk = $pdo->prepare('SELECT id FROM users WHERE id = :id AND email = :email LIMIT 1');
        $chk->execute([':id' => (int) ($user['id'] ?? 0), ':email' => (string) ($user['email'] ?? '')]);
        if (!$chk->fetchColumn()) {
            unset($_SESSION['user']);
            $user = null;
        }
    }
    if (($_GET['action'] ?? '') === 'public_status') {
        $tamper = gs_verify_integrity();
        if ($tamper['tampered']) {
            cms_json([
                'ok'          => true,
                'isTeam'      => false,
                'hubDisabled' => true,
                'hubReason'   => 'Integritätsprüfung fehlgeschlagen (unzulässige Code-Änderung erkannt).',
            ]);
        }
        $hub = gs_is_instance_disabled();
        $sitePub = cms_read_json('data/site.json');
        cms_json([
            'ok'          => true,
            'isTeam'      => ($user !== null),
            'maintenance' => $sitePub['maintenance'] ?? ['enabled' => false, 'message' => ''],
            'hubDisabled' => $hub['disabled'],
            'hubReason'   => $hub['reason'],
        ]);
    }
    $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $siteData = cms_read_json('data/site.json');

    // Vollständiges ZIP-Backup herunterladen (nur mit gültigem Login!)
    if (($_GET['action'] ?? '') === 'export_zip') {
        if (!$user) {
            cms_json(['ok' => false, 'error' => 'Nicht angemeldet.'], 401);
        }
        cms_require_admin();
        if (!class_exists('ZipArchive')) {
            cms_json(['ok' => false, 'error' => 'PHP ZipArchive-Erweiterung ist auf diesem Server nicht aktiv.'], 500);
        }

        // WAL-Journal in die Haupt-SQLite-Datei flushen, damit die DB in der ZIP 100% vollständig ist
        $pdo->exec('PRAGMA wal_checkpoint(TRUNCATE)');

        $tmpZip = STORAGE_DIR . '/.ht_export_' . bin2hex(random_bytes(6)) . '.zip';
        $zip = new ZipArchive();
        if ($zip->open($tmpZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            cms_json(['ok' => false, 'error' => 'ZIP-Archiv konnte nicht erstellt werden.'], 500);
        }

        $addFolderToZip = function (string $relFolder) use ($zip, $root): void {
            $absDir = $root . '/' . trim($relFolder, '/');
            if (!is_dir($absDir)) {
                return;
            }
            $it = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($absDir, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($it as $file) {
                if (!$file->isFile()) {
                    continue;
                }
                $absPath = $file->getPathname();
                $relPath = ltrim(str_replace('\\', '/', substr($absPath, strlen($root))), '/');
                $zip->addFile($absPath, $relPath);
            }
        };

        $addFolderToZip('data');
        $addFolderToZip('assets/images');
        $addFolderToZip('assets/icons');

        if (is_file(DB_PATH)) {
            $dbRel = ltrim(str_replace('\\', '/', substr(DB_PATH, strlen($root))), '/');
            $zip->addFile(DB_PATH, $dbRel);
        }

        $zip->addFromString('gs-cmss-backup.json', json_encode([
            'type'       => 'gs-cmss-full-backup',
            'version'    => $siteData['version'] ?? '1.0',
            'brand'      => $siteData['brand']['name'] ?? 'Website',
            'exportedAt' => date('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $zip->close();

        $brandSlug = preg_replace('/[^a-z0-9-]+/i', '-', strtolower((string) ($siteData['brand']['name'] ?? 'website'))) ?: 'website';
        $downloadName = trim($brandSlug, '-') . '-cmss-vollbackup-' . date('Y-m-d') . '.zip';

        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $downloadName . '"');
        header('Content-Length: ' . filesize($tmpZip));
        header('Cache-Control: no-store');
        readfile($tmpZip);
        @unlink($tmpZip);
        exit;
    }

    // Systemordner-Export als schlanke Core-Update-ZIP (ohne Daten, Bilder & Datenbank)
    if (($_GET['action'] ?? '') === 'export_core_zip') {
        if (!$user) {
            cms_json(['ok' => false, 'error' => 'Nicht angemeldet.'], 401);
        }
        cms_require_admin();
        if (!class_exists('ZipArchive')) {
            cms_json(['ok' => false, 'error' => 'PHP ZipArchive-Erweiterung ist auf diesem Server nicht aktiv.'], 500);
        }

        $tmpZip = STORAGE_DIR . '/.ht_core_export_' . bin2hex(random_bytes(6)) . '.zip';
        $zip = new ZipArchive();
        if ($zip->open($tmpZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            cms_json(['ok' => false, 'error' => 'Core-ZIP konnte nicht erstellt werden.'], 500);
        }

        $addCoreFolder = function (string $relFolder) use ($zip, $root): void {
            $absDir = $root . '/' . trim($relFolder, '/');
            if (!is_dir($absDir)) {
                return;
            }
            $it = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($absDir, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($it as $file) {
                if (!$file->isFile()) {
                    continue;
                }
                $absPath = $file->getPathname();
                $relPath = ltrim(str_replace('\\', '/', substr($absPath, strlen($root))), '/');
                $zip->addFile($absPath, $relPath);
            }
        };

        foreach (['cms', 'api', 'includes', 'assets/js', 'assets/css', 'tools', 'admin'] as $coreDir) {
            $addCoreFolder($coreDir);
        }
        if (is_file($root . '/.htaccess')) {
            $zip->addFile($root . '/.htaccess', '.htaccess');
        }

        $ver = preg_replace('/[^a-z0-9._-]+/i', '', (string) ($siteData['version'] ?? '1.3')) ?: '1.3';
        $zip->addFromString('gs-cmss-core.json', json_encode([
            'type'       => 'gs-cmss-core-update',
            'version'    => $ver,
            'exportedAt' => date('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $coreSecret = defined('CMSS_CORE_ZIP_SECRET') ? (string) CMSS_CORE_ZIP_SECRET : '';
        if ($coreSecret !== '' && defined('ZipArchive::EM_AES_256')) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $zip->setEncryptionIndex($i, ZipArchive::EM_AES_256, $coreSecret);
            }
        }

        $zip->close();

        $downloadName = 'gs-cmss-core-v' . $ver . '-' . date('Y-m-d') . '.zip';
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $downloadName . '"');
        header('Content-Length: ' . filesize($tmpZip));
        header('Cache-Control: no-store');
        readfile($tmpZip);
        @unlink($tmpZip);
        exit;
    }

    // Blanko GS CMSS Framework Export (komplett funktionierendes Starter-Paket mit leeren DBs, 0 Accounts, Platzhalter-Seiten & SETUP.md)
    if (($_GET['action'] ?? '') === 'export_blanko_framework_zip') {
        if (!$user) {
            cms_json(['ok' => false, 'error' => 'Nicht angemeldet.'], 401);
        }
        cms_require_admin();
        if (!class_exists('ZipArchive')) {
            cms_json(['ok' => false, 'error' => 'PHP ZipArchive-Erweiterung ist auf diesem Server nicht aktiv.'], 500);
        }

        $tmpZip = STORAGE_DIR . '/.ht_blanko_export_' . bin2hex(random_bytes(6)) . '.zip';
        $zip = new ZipArchive();
        if ($zip->open($tmpZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            cms_json(['ok' => false, 'error' => 'Blanko-Framework-ZIP konnte nicht erstellt werden.'], 500);
        }

        $addFolderFiltered = function (string $relFolder, ?callable $filter = null) use ($zip, $root): void {
            $absDir = $root . '/' . trim($relFolder, '/');
            if (!is_dir($absDir)) {
                return;
            }
            $it = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($absDir, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($it as $file) {
                if (!$file->isFile()) {
                    continue;
                }
                $absPath = $file->getPathname();
                $relPath = ltrim(str_replace('\\', '/', substr($absPath, strlen($root))), '/');
                if ($filter && !$filter($relPath)) {
                    continue;
                }
                $zip->addFile($absPath, $relPath);
            }
        };

        // 1) Alle System-Ordner & statischen Seiten-Shells übernehmen
        foreach (['cms', 'api', 'includes', 'assets/js', 'assets/css', 'assets/fonts', 'tools', 'admin'] as $sysDir) {
            $addFolderFiltered($sysDir);
        }
        foreach (['de', 'en'] as $langDir) {
            $addFolderFiltered($langDir, function (string $relPath) {
                // Generierte Blogposts der aktuellen Seite weglassen (post-template.html bleibt)
                if (preg_match('#^(de|en)/journal/[^/]+\.html$#', $relPath) && !str_ends_with($relPath, '/post-template.html')) {
                    return false;
                }
                return true;
            });
        }

        foreach (['.htaccess', 'index.html', 'storage/.htaccess', 'storage/index.php'] as $singleFile) {
            if (is_file($root . '/' . $singleFile)) {
                $zip->addFile($root . '/' . $singleFile, $singleFile);
            }
        }
        if (is_file($root . '/assets/icons/favicon.png')) {
            $zip->addFile($root . '/assets/icons/favicon.png', 'assets/icons/favicon.png');
        }
        foreach (['backgrounds', 'projects', 'members', 'journal'] as $emptyImgDir) {
            $zip->addEmptyDir('assets/images/' . $emptyImgDir);
        }

        // 2) UI-Übersetzungen übernehmen, falls vorhanden
        foreach (['data/de/ui.json', 'data/en/ui.json'] as $uiRel) {
            if (is_file($root . '/' . $uiRel)) {
                $zip->addFile($root . '/' . $uiRel, $uiRel);
            }
        }

        // 3) Saubere Blanko-Platzhalter-Daten (3 Seiten, neutrales Branding, 1 Beispiel-Projekt/Mitglied/Journal)
        $ver = preg_replace('/[^a-z0-9._-]+/i', '', (string) ($siteData['version'] ?? '1.2')) ?: '1.2';
        $zip->addFromString('data/site.json', json_encode([
            'version' => $ver,
            'brand'   => [
                'name'    => 'Meine Marke',
                'logo'    => ['mode' => 'text', 'dark' => '', 'light' => '', 'height' => '2.2rem'],
                'favicon' => '/assets/icons/favicon.png',
                'tagline' => [
                    'de' => 'Eine kurze Beschreibung deines Projekts oder Unternehmens.',
                    'en' => 'A short description of your project or company.',
                ],
            ],
            'contact' => ['email' => 'kontakt@beispiel.de', 'endpoint' => '/api/submit.php'],
            'nav'     => [
                'de' => [
                    ['label' => 'Start', 'href' => '/de/'],
                    ['label' => 'Über uns', 'href' => '/de/ueber-uns'],
                    ['label' => 'Kontakt', 'href' => '/de/kontakt'],
                ],
                'en' => [
                    ['label' => 'Home', 'href' => '/en/'],
                    ['label' => 'About', 'href' => '/en/about'],
                    ['label' => 'Contact', 'href' => '/en/contact'],
                ],
            ],
            'pageMap' => [
                '/de/'            => '/en/',
                '/de/ueber-uns'   => '/en/about',
                '/de/kontakt'     => '/en/contact',
                '/de/impressum'   => '/en/imprint',
                '/de/datenschutz' => '/en/privacy',
                '/en/'            => '/de/',
                '/en/about'       => '/de/ueber-uns',
                '/en/contact'     => '/de/kontakt',
                '/en/imprint'     => '/de/impressum',
                '/en/privacy'     => '/de/datenschutz',
            ],
            'footer' => [
                'tagline' => [
                    'de' => 'Erstellt mit dem Gamet Studios CMSS Framework.',
                    'en' => 'Built with the Gamet Studios CMSS Framework.',
                ],
                'columns' => [
                    'de' => [[
                        'title' => 'Navigation',
                        'links' => [
                            ['label' => 'Startseite', 'href' => '/de/'],
                            ['label' => 'Über uns', 'href' => '/de/ueber-uns'],
                            ['label' => 'Kontakt', 'href' => '/de/kontakt'],
                        ],
                    ]],
                    'en' => [[
                        'title' => 'Navigation',
                        'links' => [
                            ['label' => 'Home', 'href' => '/en/'],
                            ['label' => 'About', 'href' => '/en/about'],
                            ['label' => 'Contact', 'href' => '/en/contact'],
                        ],
                    ]],
                ],
                'social'    => [],
                'legal'     => [
                    'de' => [['label' => 'Impressum', 'href' => '/de/impressum'], ['label' => 'Datenschutz', 'href' => '/de/datenschutz']],
                    'en' => [['label' => 'Imprint', 'href' => '/en/imprint'], ['label' => 'Privacy', 'href' => '/en/privacy']],
                ],
                'copyright' => [
                    'de' => '© {year} Meine Marke – Alle Rechte vorbehalten',
                    'en' => '© {year} My Brand – All rights reserved',
                ],
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");

        $zip->addFromString('data/layout.json', json_encode([
            'version'        => 1,
            'themeOverrides' => [
                'accentDark'      => '#ba52ba',
                'accentLight'     => '#A84DA8',
                'accentSecondary' => '#2dcdff',
                'accentGoldDark'  => '#e8b64a',
                'bgDark'          => '#060607',
                'bgLight'         => '#fafaf9',
                'cinemaDeco'      => false,
                'radiusStyle'     => 'default',
            ],
            'pages' => [
                'home' => [
                    'label'    => 'Startseite (Platzhalter 1)',
                    'pathDe'   => '/de/',
                    'pathEn'   => '/en/',
                    'sections' => [
                        ['id' => 'home-hero', 'component' => 'gs-hero', 'key' => 'home', 'transition' => 'none', 'visible' => true],
                        ['id' => 'home-features', 'component' => 'gs-feature-cards', 'key' => 'home', 'transition' => 'stage-curtain', 'visible' => true],
                        ['id' => 'home-cta', 'component' => 'gs-cta', 'key' => 'join', 'transition' => 'glow-bridge', 'visible' => true],
                    ],
                ],
                'about' => [
                    'label'    => 'Über uns (Platzhalter 2)',
                    'pathDe'   => '/de/ueber-uns',
                    'pathEn'   => '/en/about',
                    'sections' => [
                        ['id' => 'about-hero', 'component' => 'gs-hero', 'key' => 'about', 'variant' => 'sm', 'transition' => 'none', 'visible' => true],
                        ['id' => 'about-text', 'component' => 'gs-text-block', 'key' => 'about', 'transition' => 'stage-curtain', 'visible' => true],
                    ],
                ],
                'contact' => [
                    'label'    => 'Kontakt (Platzhalter 3)',
                    'pathDe'   => '/de/kontakt',
                    'pathEn'   => '/en/contact',
                    'sections' => [
                        ['id' => 'contact-hero', 'component' => 'gs-hero', 'key' => 'contact', 'variant' => 'sm', 'transition' => 'none', 'visible' => true],
                        ['id' => 'contact-form', 'component' => 'gs-contact-form', 'key' => 'contact', 'transition' => 'none', 'visible' => true],
                    ],
                ],
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");

        $zip->addFromString('data/de/pages.json', json_encode([
            'home' => [
                'hero' => [
                    'eyebrow'  => 'Willkommen',
                    'title'    => 'Deine neue <span class="accent">Webseite</span> mit CMSS.',
                    'subtitle' => 'Dies ist ein blanko Starter-Template. Öffne /cms, lege deinen ersten Account an und passe Texte, Farben, Logos und Abschnitte direkt live an.',
                    'ctas'     => [['label' => 'Über uns', 'href' => '/de/ueber-uns'], ['label' => 'Kontakt', 'href' => '/de/kontakt']],
                    'meta'     => [
                        ['value' => 'MODULAR', 'label' => 'Frei kombinierbare Blöcke'],
                        ['value' => 'WEISS-LABEL', 'label' => 'Eigene Farben & Logos'],
                        ['value' => 'SCHNELL', 'label' => 'Fertig für den Live-Gang'],
                    ],
                ],
                'features' => [
                    'eyebrow' => 'Platzhalter-Bereich',
                    'title'   => 'Drei Dinge, die dieses Template kann.',
                    'intro'   => 'Bearbeite diese Karten im CMSS oder füge weitere Abschnitte hinzu.',
                    'items'   => [
                        ['icon' => '✦', 'title' => 'Visueller Baukasten', 'body' => 'In /cms Texte, Übergänge und Hintergründe live anpassen.'],
                        ['icon' => '◐', 'title' => 'Eigene Marke & Farben', 'body' => 'Logos, Schriften und Akzentfarben unter Design & Framework ändern.'],
                        ['icon' => '△', 'title' => 'Postfach & Spam-Schutz', 'body' => 'Integriertes Postfach mit eigenem Discord-Webhook & Cloudflare Turnstile.'],
                    ],
                ],
            ],
            'about' => [
                'hero' => ['eyebrow' => 'Über uns', 'title' => 'Platzhalter-Seite für deine <span class="accent">Geschichte</span>.', 'subtitle' => 'Hier kannst du beschreiben, wer du bist.'],
                'text' => ['eyebrow' => 'Vorstellung', 'title' => 'Ein sauberer Text-Abschnitt.', 'body' => ['Dieser Text ist ein Platzhalter und kann direkt im Gamet Studios CMSS bearbeitet werden.']],
            ],
            'join' => [
                'cta' => ['eyebrow' => 'Nächster Schritt', 'title' => 'Bereit für deine eigene Seite?', 'subtitle' => 'Öffne /cms und lege deinen ersten Admin-Account an.', 'ctas' => [['label' => 'Zum Kontaktformular', 'href' => '/de/kontakt']]],
            ],
            'contact' => [
                'hero' => ['eyebrow' => 'Kontakt', 'title' => 'Schreib uns eine <span class="accent">Nachricht</span>.', 'subtitle' => 'Alle Einsendungen landen im geschützten Postfach unter /cms.'],
                'form' => [
                    'title'    => 'Kontaktformular',
                    'intro'    => 'Sende eine Test-Nachricht an dein Postfach.',
                    'endpoint' => '/api/submit.php',
                    'consent'  => 'Ich bin mit der Verarbeitung meiner Daten zum Zweck der Beantwortung einverstanden.',
                    'fields'   => [
                        ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'required' => true, 'placeholder' => 'Dein Name'],
                        ['name' => 'email', 'label' => 'E-Mail', 'type' => 'email', 'required' => true, 'placeholder' => 'name@beispiel.de'],
                        ['name' => 'subject', 'label' => 'Betreff', 'type' => 'text', 'required' => false, 'full' => true, 'placeholder' => 'Worum geht es?'],
                        ['name' => 'message', 'label' => 'Nachricht', 'type' => 'textarea', 'required' => true, 'full' => true, 'rows' => 5, 'placeholder' => 'Deine Nachricht…'],
                    ],
                ],
            ],
            'privacy' => ['hero' => ['eyebrow' => 'Rechtliches', 'title' => 'Datenschutzerklärung', 'subtitle' => 'Informationen zum Umgang mit deinen Daten.']],
            'imprint' => ['hero' => ['eyebrow' => 'Rechtliches', 'title' => 'Impressum', 'subtitle' => 'Angaben gemäß § 5 DDG.']],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");

        $zip->addFromString('data/en/pages.json', json_encode([
            'home' => [
                'hero' => [
                    'eyebrow'  => 'Welcome',
                    'title'    => 'Your new <span class="accent">website</span> powered by CMSS.',
                    'subtitle' => 'This is a blank starter template. Open /cms, create your first admin account, and customize everything live.',
                    'ctas'     => [['label' => 'About us', 'href' => '/en/about'], ['label' => 'Contact', 'href' => '/en/contact']],
                    'meta'     => [
                        ['value' => 'MODULAR', 'label' => 'Composable blocks'],
                        ['value' => 'WHITE-LABEL', 'label' => 'Custom brand & colors'],
                        ['value' => 'FAST', 'label' => 'Ready to launch'],
                    ],
                ],
                'features' => [
                    'eyebrow' => 'Placeholder section',
                    'title'   => 'Three things this template gives you.',
                    'intro'   => 'Edit these cards in the CMSS or add more sections.',
                    'items'   => [
                        ['icon' => '✦', 'title' => 'Visual page builder', 'body' => 'Edit copy, transitions, and backgrounds live in /cms.'],
                        ['icon' => '◐', 'title' => 'Custom brand & colors', 'body' => 'Customize logos, fonts, and colors under Design & Framework.'],
                        ['icon' => '△', 'title' => 'Inbox & spam protection', 'body' => 'Built-in inbox with custom Discord webhook & Cloudflare Turnstile.'],
                    ],
                ],
            ],
            'about' => [
                'hero' => ['eyebrow' => 'About us', 'title' => 'Placeholder page for your <span class="accent">story</span>.', 'subtitle' => 'Share who you are.'],
                'text' => ['eyebrow' => 'Introduction', 'title' => 'A clean text block.', 'body' => ['This is placeholder text you can edit directly in Gamet Studios CMSS.']],
            ],
            'join' => [
                'cta' => ['eyebrow' => 'Next step', 'title' => 'Ready to build your site?', 'subtitle' => 'Open /cms and create your first admin account.', 'ctas' => [['label' => 'Go to contact form', 'href' => '/en/contact']]],
            ],
            'contact' => [
                'hero' => ['eyebrow' => 'Contact', 'title' => 'Send us a <span class="accent">message</span>.', 'subtitle' => 'All submissions appear in your protected inbox at /cms.'],
                'form' => [
                    'title'    => 'Contact form',
                    'intro'    => 'Send a test message to your inbox.',
                    'endpoint' => '/api/submit.php',
                    'consent'  => 'I agree to the processing of my data for the purpose of answering my inquiry.',
                    'fields'   => [
                        ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'required' => true, 'placeholder' => 'Your name'],
                        ['name' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true, 'placeholder' => 'name@example.com'],
                        ['name' => 'subject', 'label' => 'Subject', 'type' => 'text', 'required' => false, 'full' => true, 'placeholder' => 'What is this about?'],
                        ['name' => 'message', 'label' => 'Message', 'type' => 'textarea', 'required' => true, 'full' => true, 'rows' => 5, 'placeholder' => 'Your message…'],
                    ],
                ],
            ],
            'privacy' => ['hero' => ['eyebrow' => 'Legal', 'title' => 'Privacy Policy', 'subtitle' => 'How we handle your personal data.']],
            'imprint' => ['hero' => ['eyebrow' => 'Legal', 'title' => 'Imprint', 'subtitle' => 'Legal disclosure.']],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");

        $zip->addFromString('data/de/projects.json', json_encode(['items' => [['slug' => 'beispiel-projekt', 'title' => 'Beispiel-Projekt', 'tagline' => 'Ein Platzhalter-Projekt.', 'tags' => ['Platzhalter'], 'image' => '', 'status' => 'Aktiv', 'year' => '2026', 'role' => 'Konzept', 'website' => 'https://beispiel.de', 'body' => ['Beispieltext im GS CMSS Framework.']]]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
        $zip->addFromString('data/en/projects.json', json_encode(['items' => [['slug' => 'beispiel-projekt', 'title' => 'Sample Project', 'tagline' => 'A placeholder project.', 'tags' => ['Placeholder'], 'image' => '', 'status' => 'Active', 'year' => '2026', 'role' => 'Concept', 'website' => 'https://example.com', 'body' => ['Sample text inside GS CMSS Framework.']]]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
        $zip->addFromString('data/de/members.json', json_encode(['items' => [['slug' => 'beispiel-mitglied', 'name' => 'Max Mustermann', 'role' => 'Gründer / Beispiel-Mitglied', 'since' => '2026', 'quote' => 'Ein kurzes Zitat als Platzhalter.', 'bio' => ['Hier steht eine kurze Biografie.'], 'skills' => [], 'links' => []]]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
        $zip->addFromString('data/en/members.json', json_encode(['items' => [['slug' => 'beispiel-mitglied', 'name' => 'Alex Example', 'role' => 'Founder / Sample Member', 'since' => '2026', 'quote' => 'A short placeholder quote.', 'bio' => ['A short biography.'], 'skills' => [], 'links' => []]]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
        $zip->addFromString('data/journal/de/willkommen.md', "---\ntitle: Willkommen im Journal\ndate: " . date('Y-m-d') . "\nexcerpt: Ein erster Platzhalter-Artikel im Markdown-Format.\ncategory: Info\nauthor: Redaktion\n---\n\n## Dein erster Blog-Post\n\nDies ist ein **Platzhalter-Artikel** im GS CMSS Framework.\n");
        $zip->addFromString('data/journal/de/index.json', json_encode(['willkommen'], JSON_PRETTY_PRINT) . "\n");

        // 4) Dokumentation & Lizenz (SETUP.md, README.md, LICENSE) immer aktuell aus dem System einbinden
        $docFiles = [
            'SETUP.md' => <<<'STP'
# GS CMSS Framework — Setup & Erste Schritte

Dieses Dokument beschreibt Schritt für Schritt, wie du auf Basis des **GS CMSS Frameworks** eine komplett neue, eigene Webseite aufsetzt, konfigurierst und live schaltest.

---

## 1. Voraussetzungen auf dem Server (oder lokal)

- **PHP 8.1+** mit aktivierten Erweiterungen `pdo_sqlite`, `sqlite3` und `curl` (für Datenbank, Bild-Uploads, Discord-Webhook, Social-Feed & Turnstile)
- **Apache / Plesk** mit aktiviertem `mod_rewrite` (damit `.htaccess` saubere URLs ohne `.html` ausliefert und `/storage`, `/includes`, `/tools` sperrt)
- **Python 3** (optional, aber empfohlen für `tools/build.py` zur Generierung statischer Journal-Blogposts & SEO-/OpenGraph-Karten)
- **Schreibrechte** für den Webserver-Benutzer auf:
  - `storage/` (SQLite-Tresor-Datenbank)
  - `data/` (Seiten-, Layout-, Projekt-, Mitglieder- & Journal-Dateien)
  - `assets/icons/` & `assets/images/` (Medien-Uploads aus dem CMSS)
  - `de/` & `en/` (für neue Seiten und generierte Journal-HTMLs)

### Lokal auf dem Mac testen
Im Projektordner im Terminal ausführen:
```bash 
php -S localhost:8080 tools/router.php
```
Danach erreichst du:
- Webseite: `http://localhost:8080/de/`
- Gamet Studios CMSS: `http://localhost:8080/cms`

---

## 2. Ersten Administrator-Account anmelden (`/cms`)

1. Öffne im Browser **`https://deine-domain.de/cms`** (oder lokal `http://localhost:8080/cms`, funktioniert bewusst nur am Desktop).
2. In der frischen Datenbank ist bereits ein **Erstaufsetz-Admin** hinterlegt:
   - **E-Mail (Benutzername):** `admin@example.com`
   - **Passwort:** `GS-Setup-2026!`
3. Melde dich damit im CMSS an.
4. **Wichtig:** Lege nach dem ersten Login unter **„Postfach & Accounts“ → „Accounts“** deinen eigenen Administrator-Account an (oder ändere das Passwort) und lösche den Standard-Account `admin@example.com`, bevor die Seite live geht.

---

## 3. Marke, Logos, Farben & Version einstellen

Öffne oben im CMSS den Reiter **„Design & Framework“ → „Marke & Farben“**:

1. **Webseiten- / Markenname & Version (`v:`):**
   - Ändere „Meine Marke“ auf deinen Projektnamen.
   - Rechts neben dem Logo in der oberen CMSS-Leiste (oder hier im Tab) kannst du über `v:` deine eigene Versionsnummer eintragen (z. B. `1.0`).
2. **Logos & Favicon hochladen:**
   - Wähle bei „Logo-Darstellung“ entweder **Text-Logo** oder **Eigenes Logo-Bild (Dark / Light)**.
   - Lade ein helles Logo für den Dark Mode, ein dunkles Logo für den Light Mode sowie dein **Favicon** hoch.
3. **Farbschema festlegen:**
   - Wähle eine der 1-Klick-Farbpaletten oder stelle **Akzentfarbe (Dark/Light)**, **Zweitfarbe** und **Hintergründe** individuell per Farbwähler ein.
4. **Kino-Dekorationen & Ecken:**
   - Entscheide, ob die filmischen Deko-Elemente (Klammern/Filmklappen-Optik) an oder aus sein sollen (`Aus` für neutrale Unternehmens-/Portfolio-Seiten).
5. **Navigation & Footer (`Menü & Footer`):**
   - Passe die Menüpunkte für **DE** und **EN** (oben rechts umschaltbar) sowie den Footer-Text an.

---

## 4. Seiten, Übergänge, Hintergründe & Social-Media-Feed

Öffne den Reiter **„Seiten“**:

- **Seiten bearbeiten:** Wähle oben links eine der 3 Platzhalter-Seiten (`Startseite`, `Über uns`, `Kontakt`) oder klicke auf **`+ Neue Seite anlegen`**, um weitere Seiten (z. B. Leistungen, Portfolio, Team) zu erzeugen. Beim Speichern werden automatisch die passenden HTML-Dateien angelegt.
- **Abschnitte hinzufügen & sortieren:** Unten über **`Neuen Abschnitt unten anfügen`** kannst du Bausteine wie Hero, Feature-Karten, Projekte-Auswahl, Team, Text-Block, CTA, Journal-Übersicht, Formular oder den **Social-Media Live-Feed (`<gs-social-feed>`)** hinzufügen und mit `↑` / `↓` sortieren.
- **Klick in die Vorschau:** Klicke rechts in der Live-Vorschau direkt auf einen Abschnitt, um ihn links zu öffnen.
- **Übergang & Hintergrund:**
  - Im Tab **„Übergang“** wählst du die Überblendung zum vorherigen Abschnitt.
  - Im Tab **„Hintergrund“** kannst du pro Abschnitt ein **Bild oder Video** hochladen und exakt festlegen, welche Ränder weich auslaufen sollen (alle Seiten, nur oben/unten, nur unten, links/rechts oder Wolken-Spotlight).
- **Social-Media-Live-Feed einrichten:**
  - Plattform wählen (**YouTube, Instagram, X, TikTok, Bluesky, Mastodon, RSS**), Kanal-/Account-URL eintragen und auf **„↻ Jetzt testen & neusten Inhalt ziehen“** klicken. Bei 1 Kanal entsteht ein großes Spotlight, ab 2 Kanälen ein Grid.

---

## 5. Journal-Artikel in Markdown schreiben

Öffne den Reiter **„Journal“**:

1. Klicke auf **`+ Neuer Artikel`** (oder bearbeite den Platzhalter-Artikel `Willkommen im Journal`).
2. Nutze die **Markdown-Leiste** (`H2`, `H3`, `B`, `I`, `❝ Zitat`, `• Liste`, `Link`, `Code`) und den Assistenten **„🖼 + Bild in Text einbauen“**, um Bilder direkt hochzuladen und inklusive Bildunterschrift/Quelle sowie Größe (*Standard*, *Breit*, *Schmal*) an der Cursor-Position einzufügen.
3. Klicke unten auf **„✦ Speichern & Blog-Post generieren (`build.py`)“**, damit daraus eine vollwertige statische Blog-Seite (`/de/journal/<slug>`) samt SEO-/OpenGraph-Tags generiert wird.

---

## 6. Postfach, Discord-Webhook & Cloudflare Turnstile einrichten

Öffne den Reiter **„Postfach & Accounts“**:

- **Tab `Postfach`:** Hier landen alle Einsendungen der Kontakt- und Bewerbungsformulare. Du kannst sie als gelesen/beantwortet markieren, direkt per `mailto:` antworten oder löschen.
- **Tab `Discord Webhook`:**
  1. **Discord Webhook-URL:** Trage hier den Webhook **deines eigenen** Discord-Kanals ein (falls gewünscht), optional mit **Rollen-ID** für Pings und deiner **öffentlichen Webseiten-URL**. Leer lassen = keine Discord-Benachrichtigungen. Mit **„🔔 Test-Nachricht an Discord senden“** direkt testen.
  2. **Cloudflare Turnstile (CAPTCHA):** Erstelle in deinem Cloudflare-Dashboard ein Turnstile-Widget für deine Domain und trage **Site Key** + **Secret Key** ein. Danach erscheint Turnstile automatisch in allen Formularen und wird serverseitig vor dem Speichern geprüft.
- **Tab `Accounts`:** Team-Mitglieder hinzufügen, eigene Passwörter ändern oder alte Accounts entfernen. Diese Accounts gelten gemeinsam für `/cms` und `/admin/`.

---

## 7. Rechtliches & Domain vor dem Live-Gang anpassen

Bevor die Seite öffentlich geht, unbedingt noch folgende Dateien mit deinen eigenen Daten aktualisieren:

1. **Impressum:** `de/impressum.html` und `en/imprint.html` (Name, Anschrift, E-Mail, Vertretungsberechtigte)
2. **Datenschutz:** `de/datenschutz.html` und `en/privacy.html` (Verantwortlicher in Abschnitt 1, ggf. eingesetzte Dienste prüfen)
3. **Domain für SEO / OpenGraph / Discord:**
   - In `includes/config.php`: `SITE_URL` auf deine Domain setzen (z. B. `https://meine-domain.de`)
   - In `tools/build.py`: `SITE_URL` prüfen/anpassen und danach einmal `python3 tools/build.py` ausführen, damit alle `<meta property="og:...">` und Canonical-URLs auf deine neue Domain zeigen.

---

## 8. Sicherheits-Checkliste vor dem Go-Live

- [ ] **HTTPS / SSL** aktivieren (Session-Cookies setzen dann automatisch das `Secure`-Flag).
- [ ] Prüfen, dass **`https://deine-domain.de/storage/`**, **`/includes/`** und **`/tools/`** im Browser mit **`403 Forbidden`** blockiert werden (`.htaccess` muss aktiv sein).
- [ ] Alle Änderungen im CMSS über **`● Speichern`** oben rechts sichern.
- [ ] Optionales Test-Postfach prüfen und Test-Einsendungen löschen.
STP,
            'README.md' => <<<'RDM'
# Gamet Studios CMSS (v1.4)

Ein schnelles, modulares **Visual-CMS & Multi-Site-Framework** ohne Build-Server, ohne Node.js-Pflicht im Hosting und ohne MySQL — entwickelt für klassisches Shared-Hosting (Plesk, Apache, nginx) sowie lokale Entwicklung.

> **Lizenz:** Source-Available — siehe [`LICENSE`](LICENSE).  
> **Setup-Anleitung:** Siehe [`SETUP.md`](SETUP.md).  
> **Updates & Community:** Die neusten verschlüsselten Core-Updates gibt es immer auf unserem [Discord](https://dsc.gg/gametstudios).

---

## Was dieses System besonders macht

- **Start-Dashboard & automatische Update-Benachrichtigung:** Übersicht über Seiten, Projekte, Mitglieder, Journal, Postfach und Medien. Zeigt automatisch ein Banner an, sobald eine neuere CMSS-Version verfügbar ist, plus Changelog-Modal nach jedem Update oder Hotfix.
- **Visual Drag & Drop Page Builder:**
  - Abschnitte direkt in der Live-Vorschau per **`⠿ Ziehen`** verschieben, duplizieren oder löschen.
  - **Bausteine-Palette:** `Spalten-Layout` (1–4 Spalten mit *Auto*-Sizing), `Textblock`, `Bild`, `Bild + Text`, `Video (YouTube/MP4)`, `Buttons`, `Zitat`, `FAQ / Accordion`, `Trenner / Abstand`, `CTA-Banner`, `Features`, `Projekte-Grid`, `Team-Grid`.
  - Bausteine lassen sich per Drag & Drop **ober-/unterhalb** oder **links/rechts neben** bestehende Elemente ziehen (erweitert automatisch um eine Spalte).
- **Siri-Style Command Palette (`Cmd + K` / `Strg + K`):** Natürliche Befehle wie *„Wartungsmodus an“*, *„Neuer Blogpost“*, *„Bild einfügen“*, *„Handy-Vorschau“* oder Seitennamen eintippen und direkt ausführen.
- **Cinema-Transition-Engine & Apple-Style Startbildschirm:** Flüssige Seitenübergänge, Scroll-Reveals (im Preview-Modus deaktiviert), Video-/Bild-Hintergründe pro Abschnitt (Blur, Opacity, Edge-Masking) und schneller Startbildschirm beim ersten Besuch / Neuladen.
- **Authentik SSO (OIDC) & Rollenmodell (`Admin` / `Editor`):**
  - OpenID Connect (PKCE) direkt in PHP ohne Composer.
  - Gruppen-Mapping für **Admins** (Vollzugriff) und **Editoren** (Inhalte, Journal, Medien & Postfach ohne System/Accounts/Export).
- **Medien & SEO-Automatisierung:**
  - Chunked Uploads (`512 KB` Multipart) + automatische **WebP-Konvertierung & Skalierung** (max. `1920px`).
  - Markierung ungenutzter Medien (`⚠ Ungenutzt`).
  - Pro-Seite **SEO- & OpenGraph-Editor**, **Redirect-Manager**, optional im CMSS editierbare **Rechtstexte** und automatische **`sitemap.xml`** beim Speichern.
- **Betrieb & Sicherheit:**
  - **System-Health-Check**, **automatische JSON-Snapshots** (letzte 15 Stände mit 1-Klick-Rollback), **SQLite-Audit-Log** und **Wartungsmodus** (Team arbeitet weiter normal).
  - Geschützte SQLite-Datenbank in `storage/.ht_gs_vault_9f4c2a8e1b7d3e6f.sqlite`, `.htaccess`-Sperren, Brute-Force-Rate-Limit, Cloudflare Turnstile & DSGVO-2-Klick-Blocker.
- **Multi-Site & verschlüsselte Core-Updates:**
  - Strikte Trennung von System (`cms/`, `api/`, `includes/`, `assets/js/`, `assets/css/`, `tools/`, `admin/`) und Inhalten (`data/`, `assets/images/`, `storage/`).
  - **AES-256-verschlüsselte Core-Update-ZIPs** + **1-Klick-Blanko-Framework-Export** inkl. `SETUP.md`, `README.md` und `LICENSE`.

---

## Verzeichnisstruktur

```text
├── index.html               # Einstieg (Standard: /de/)
├── .htaccess                # Clean URLs & Schutz für storage/, includes/, tools/
├── SETUP.md                 # Schritt-für-Schritt-Setup (Plesk / Server / Lokal)
├── LICENSE                  # Gamet Studios Source-Available License
├── cms/                     # Visual CMSS Oberfläche (cms.js, index.php, changelog.json)
├── api/                     # Backend-Endpunkte (cms.php, oidc.php, submit.php, social-feed.php)
├── includes/                # DB, Auth/RBAC, OIDC, Discord, Integritäts- & Lizenzprüfung
├── admin/                   # Klassisches Postfach- & Formular-Dashboard
├── assets/
│   ├── css/                 # Design-Tokens, Reset, Base, Components
│   ├── js/                  # Web Components (<gs-*>) & Core-Module
│   ├── images/              # Medien-Ordner (backgrounds, projects, members, journal, og)
│   └── icons/               # Logos & Favicon
├── data/                    # JSON-Inhalte (site.json, layout.json, de/, en/, journal/)
├── storage/                 # Geschützte SQLite-DB & automatische Snapshots
└── tools/                   # Python Markdown-Builder (build.py) & Dev-Router (router.php)
```

---

## Schnellstart (Plesk / Hosting)

1. Dateien auf den Webserver (z. B. `httpdocs/`) hochladen.
2. Dateirechte setzen: **Ordner `755`**, **Dateien `644`** (inkl. `storage/.ht_gs_vault_9f4c2a8e1b7d3e6f.sqlite`).
3. `https://deine-domain.de/cms` öffnen und anmelden (Details in [`SETUP.md`](SETUP.md)).

### Lokaler Testserver
```bash
php -S localhost:8080 tools/router.php
```
Danach im Browser **`http://localhost:8080/cms`** öffnen.
RDM,
            'LICENSE' => <<<'LIC'
# Gamet Studios CMSS — Source-Available License (v1.0)

Copyright (c) 2026 Gamet Studios – Pieter Mooldijk (`contact@gametstudios.media`)  
All Rights Reserved. / Alle Rechte vorbehalten.

---

## DEUTSCHE FASSUNG (Maßgebliche Bedingungen)

Diese Software („Gamet Studios CMSS“ bzw. „die Software“) ist **Source-Available** (der Quellcode ist einsehbar), jedoch **keine Open-Source-Software** im Sinne von MIT, Apache oder GPL. Mit dem Herunterladen, Kopieren, Installieren oder Betreiben der Software erklären Sie sich mit den folgenden Bedingungen einverstanden:

### 1. Erlaubte Nutzung
Ihnen wird ein einfaches, widerrufliches, nicht übertragbares und nicht unterlizenzierbares Recht eingeräumt, die Software auf einem eigenen Webserver oder Webhosting für **private, nicht-kommerzielle oder ausdrücklich von Gamet Studios freigegebene Projekte** zu betreiben. Sie dürfen eigene Inhalte (`data/`), eigene Medien (`assets/images/`, `assets/icons/`) sowie eigene Inhaltsseiten (`de/`, `en/`) frei erstellen und pflegen.

### 2. Verbotene Handlungen (Kein Eingriff in den Kern & kein Missbrauch)
Ohne vorherige schriftliche Genehmigung durch Gamet Studios ist es **ausdrücklich untersagt**:
1. **Veränderung des Systemkerns:** Dateien des CMSS-Systemkerns (`cms/`, `api/`, `includes/`, `assets/js/`, `assets/css/`, `tools/`, `admin/`) zu verändern, zu manipulieren, zu umgehen oder in abgeleiteter Form weiterzuverbreiten.
2. **Umgehung von Schutzmechanismen:** Die Integritätsprüfung (`includes/integrity.php`, `GS_INTEGRITY_SEAL`), den stündlichen Lizenz-Heartbeat (`includes/telemetry.php`), die Remote-Deaktivierung oder den Core-Update-Schutz zu entfernen, zu blockieren, zu verfälschen oder zu deaktivieren.
3. **Kommerzielle Nutzung & Weiterverkauf:** Die Software gegen Entgelt weiterzuverkaufen, zu vermieten, als eigene White-Label-Lösung oder als gehosteten Dienst (SaaS) Dritten anzubieten oder für kommerzielle Kundenprojekte einzusetzen.
4. **Missbrauch:** Die Software für rechtswidrige Zwecke, Phishing, Spam, Malware-Verbreitung, Betrug, Urheberrechtsverletzungen oder sonstige missbräuchliche Inhalte zu nutzen.

### 3. Telemetrie, Integritätsprüfung & Remote-Deaktivierung
1. Jede betriebene Instanz übermittelt zur Lizenz-, Versions- und Integritätsprüfung einmal pro Stunde sowie bei explizitem Abgleich technische Betriebsdaten (`site_id`, Domain/URL, Markenname, CMSS-Version, PHP-Version, Server-IP) an den zentralen Lizenz-Server von Gamet Studios (`https://gametstudios.media/control/api.php`).
2. Bei einem Verstoß gegen diese Lizenzbedingungen, bei Manipulation am geschützten Systemkern oder bei missbräuchlicher Nutzung der Software erlischt Ihr Nutzungsrecht automatisch mit sofortiger Wirkung. Gamet Studios ist in diesem Fall berechtigt, die betroffene Instanz technisch über den Remote-Notschalter zu deaktivieren.

### 4. Gewährleistungs- und Haftungsausschluss
DIE SOFTWARE WIRD „WIE BESEHEN“ („AS IS“) OHNE JEGLICHE AUSDRÜCKLICHE ODER STILLSCHWEIGENDE GEWÄHRLEISTUNG BEREITGESTELLT. IN KEINEM FALL HAFTET GAMET STUDIOS FÜR SCHÄDEN, DATENVERLUSTE ODER ENTGANGENEN GEWINN AUS DER NUTZUNG ODER NICHTNUTZBARKEIT DER SOFTWARE, SOWEIT GESETZLICH ZULÄSSIG.

### 5. Anwendbares Recht
Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.

---

## ENGLISH VERSION

This software ("Gamet Studios CMSS" or "the Software") is **Source-Available**, NOT Open Source (not MIT, Apache, or GPL). By downloading, copying, installing, or operating the Software, you agree to the following terms:

### 1. Permitted Use
You are granted a non-exclusive, revocable, non-transferable, non-sublicensable right to install and operate the Software on your own hosting/server for **personal, non-commercial, or explicitly Gamet Studios-approved projects**. You may freely create and edit your own content (`data/`), media (`assets/images/`, `assets/icons/`), and page shells (`de/`, `en/`).

### 2. Prohibited Actions (No Core Modification & No Abuse)
Without prior written permission from Gamet Studios, you are **strictly prohibited** from:
1. **Modifying the Core:** Modifying, patching, bypassing, or redistributing modified versions of the CMSS core files (`cms/`, `api/`, `includes/`, `assets/js/`, `assets/css/`, `tools/`, `admin/`).
2. **Bypassing Protections:** Removing, blocking, spoofing, or disabling the integrity check (`includes/integrity.php`, `GS_INTEGRITY_SEAL`), the hourly telemetry heartbeat (`includes/telemetry.php`), remote deactivation, or Core Update encryption.
3. **Commercial Use & Resale:** Selling, renting, sublicensing, rebranding as your own product, offering as SaaS, or deploying for commercial client projects.
4. **Abuse:** Using the Software for unlawful purposes, phishing, spam, malware distribution, fraud, copyright infringement, or abusive content.

### 3. Telemetry, Integrity & Remote Deactivation
1. Each active instance transmits technical status metadata (`site_id`, domain/URL, brand name, CMSS version, PHP version, server IP) once per hour and on explicit sync to Gamet Studios (`https://gametstudios.media/control/api.php`) to verify license and integrity status.
2. Any violation of these terms, tampering with protected core files, or abusive operation immediately terminates your license. Gamet Studios reserves the right to remotely deactivate non-compliant or abusive instances at any time.

### 4. Disclaimer of Warranty & Limitation of Liability
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY LAW, GAMET STUDIOS SHALL NOT BE LIABLE FOR ANY DAMAGES, DATA LOSS, OR LOSS OF PROFITS ARISING FROM THE USE OR INABILITY TO USE THE SOFTWARE.

### 5. Governing Law
This license is governed by the laws of the Federal Republic of Germany.

---

Kontakt / Licensing Inquiries: `contact@gametstudios.media`
LIC,
        ];
        foreach ($docFiles as $docName => $docContent) {
            $zip->addFromString($docName, $docContent);
        }

        $zip->close();

        $downloadName = 'gs-cmss-blanko-framework-v' . $ver . '-' . date('Y-m-d') . '.zip';
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $downloadName . '"');
        header('Content-Length: ' . filesize($tmpZip));
        header('Cache-Control: no-store');
        readfile($tmpZip);
        @unlink($tmpZip);
        exit;
    }

    // Ohne Login werden KEINERLEI interne CMSS-Daten, Dateilisten, Accounts oder Postfach-Inhalte ausgeliefert!
    if (!$user) {
        $oidcReady = oidc_is_ready();
        $allowLocal = !$oidcReady || get_setting('oidc_allow_local_fallback', '0') === '1';
        cms_json([
            'ok'        => true,
            'user'      => null,
            'bootstrap' => (!$oidcReady && $userCount === 0),
            'oidc'      => [
                'ready'      => $oidcReady,
                'allowLocal' => $allowLocal,
            ],
            'site'      => ['version' => $siteData['version'] ?? '1.2'],
        ]);
    }

    $changelogData = cms_load_changelog();
    cms_json([
        'ok'             => true,
        'user'           => $user,
        'bootstrap'      => false,
        'csrf'           => csrf_token(),
        'site'           => $siteData,
        'layout'         => cms_read_json('data/layout.json'),
        'pagesDe'        => cms_read_json('data/de/pages.json'),
        'pagesEn'        => cms_read_json('data/en/pages.json'),
        'projectsDe'     => cms_read_json('data/de/projects.json'),
        'projectsEn'     => cms_read_json('data/en/projects.json'),
        'membersDe'      => cms_read_json('data/de/members.json'),
        'membersEn'      => cms_read_json('data/en/members.json'),
        'journal'        => cms_load_journal_posts(),
        'images'         => cms_list_images(),
        'submissions'    => cms_load_submissions(),
        'changelog'      => $changelogData,
        'updateNotice'   => gs_get_update_notice($changelogData),
        'unusedImages'   => cms_find_unused_images(),
        'users'          => is_admin() ? cms_load_users() : [],
        'systemSettings' => is_admin() ? cms_load_system_settings() : [],
        'snapshots'      => is_admin() ? cms_list_snapshots() : [],
        'auditLog'       => is_admin() ? cms_safe_get_audit_log(60) : [],
        'health'         => is_admin() ? cms_health_check() : [],
        'hasControlHub'  => is_admin() && is_dir($root . '/control'),
    ]);
}

if ($method === 'POST') {
    // 0) Chunked ZIP-Import (Komplettes Daten-Backup ODER Framework-Core-Update)
    if (($_GET['action'] ?? '') === 'import_zip_chunk') {
        if (!current_user()) {
            cms_json(['ok' => false, 'error' => 'Nicht angemeldet.'], 401);
        }
        cms_require_admin();
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf'] ?? ($_GET['csrf'] ?? ''));
        if (!csrf_check((string) $token)) {
            cms_json(['ok' => false, 'error' => 'Ungültiges CSRF-Token.'], 403);
        }
        if (!class_exists('ZipArchive')) {
            cms_json(['ok' => false, 'error' => 'PHP ZipArchive-Erweiterung ist nicht aktiv.'], 500);
        }

        $mode = ($_GET['mode'] ?? 'full') === 'core' ? 'core' : 'full';
        if ($mode === 'core') {
            $tamperCore = gs_verify_integrity();
            if (!empty($tamperCore['tampered'])) {
                cms_json(['ok' => false, 'error' => 'Core-Update verweigert: Integritätsprüfung fehlgeschlagen (' . $tamperCore['file'] . ').'], 403);
            }
            $hubCore = gs_telemetry_sync(true);
            if (!empty($hubCore['disabled'])) {
                cms_json(['ok' => false, 'error' => 'Core-Update verweigert: Diese Instanz ist im Lizenz-Hub gesperrt.'], 403);
            }
        }
        $chunkIndex = (int) ($_GET['index'] ?? 0);
        $totalChunks = max(1, (int) ($_GET['total'] ?? 1));
        $tmpZip = STORAGE_DIR . '/.ht_import_' . (session_id() ?: bin2hex(random_bytes(4))) . '.zip';

        if (!empty($_FILES['chunk']['tmp_name']) && is_uploaded_file($_FILES['chunk']['tmp_name'])) {
            $chunkData = file_get_contents($_FILES['chunk']['tmp_name']);
        } else {
            $chunkData = file_get_contents('php://input');
        }
        if ($chunkData === false || $chunkData === '') {
            cms_json(['ok' => false, 'error' => 'ZIP-Chunk konnte nicht gelesen werden.'], 400);
        }

        $flags = ($chunkIndex === 0) ? LOCK_EX : (FILE_APPEND | LOCK_EX);
        if (file_put_contents($tmpZip, $chunkData, $flags) === false) {
            cms_json(['ok' => false, 'error' => 'ZIP-Chunk konnte nicht gespeichert werden.'], 500);
        }

        if (($chunkIndex + 1) < $totalChunks) {
            cms_json(['ok' => true, 'done' => false]);
        }

        $zip = new ZipArchive();
        if ($zip->open($tmpZip) !== true) {
            @unlink($tmpZip);
            cms_json(['ok' => false, 'error' => 'Ungültige oder beschädigte ZIP-Datei.'], 400);
        }

        $coreSecret = defined('CMSS_CORE_ZIP_SECRET') ? (string) CMSS_CORE_ZIP_SECRET : '';
        if ($mode === 'core' && $coreSecret !== '') {
            $zip->setPassword($coreSecret);
        }

        // Prüfen, ob alle Einträge in einem einzigen Unterordner (z. B. "GS CMSS FRAMEWORK/") liegen
        $stripPrefix = '';
        if ($zip->numFiles > 0) {
            $firstEntry = str_replace('\\', '/', (string) $zip->getNameIndex(0));
            $slashPos = strpos($firstEntry, '/');
            if ($slashPos !== false) {
                $candidate = substr($firstEntry, 0, $slashPos + 1);
                $knownRoots = ['data/', 'cms/', 'api/', 'includes/', 'assets/', 'tools/', 'admin/', 'storage/'];
                if (!in_array($candidate, $knownRoots, true)) {
                    $allMatch = true;
                    for ($i = 0; $i < $zip->numFiles; $i++) {
                        $n = str_replace('\\', '/', (string) $zip->getNameIndex($i));
                        if (!str_starts_with($n, $candidate) && $n !== rtrim($candidate, '/')) {
                            $allMatch = false;
                            break;
                        }
                    }
                    if ($allMatch) {
                        $stripPrefix = $candidate;
                    }
                }
            }
        }

        $allowedPrefixes = ($mode === 'core')
            ? ['cms/', 'api/', 'includes/', 'assets/js/', 'assets/css/', 'tools/', 'admin/', '.htaccess']
            : ['data/', 'assets/images/', 'assets/icons/', 'storage/'];

        $extractedCount = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $rawName = str_replace('\\', '/', (string) $zip->getNameIndex($i));
            if ($stripPrefix !== '' && str_starts_with($rawName, $stripPrefix)) {
                $relPath = substr($rawName, strlen($stripPrefix));
            } else {
                $relPath = $rawName;
            }
            $relPath = ltrim($relPath, '/');

            // Ordner-Einträge und Path-Traversal überspringen
            if ($relPath === '' || str_ends_with($relPath, '/') || str_contains($relPath, '..')) {
                continue;
            }

            $isAllowed = false;
            foreach ($allowedPrefixes as $pref) {
                if ($relPath === $pref || str_starts_with($relPath, $pref)) {
                    $isAllowed = true;
                    break;
                }
            }
            if (!$isAllowed) {
                continue;
            }

            // Niemals .htaccess im Root überschreiben, falls im Full-Backup
            if ($mode === 'full' && str_ends_with($relPath, '.htaccess')) {
                continue;
            }

            $destPath = $root . '/' . $relPath;
            $destDir = dirname($destPath);
            if (!is_dir($destDir)) {
                mkdir($destDir, 0755, true);
            }

            // Bei Datenbank-Import aus einem Backup direkt auf den aktiven DB_PATH schreiben
            if ($mode === 'full' && str_starts_with($relPath, 'storage/') && str_ends_with($relPath, '.sqlite')) {
                $destPath = DB_PATH;
                @unlink(DB_PATH . '-wal');
                @unlink(DB_PATH . '-shm');
            }

            if ($mode === 'core' && $coreSecret !== '') {
                $stat = $zip->statIndex($i);
                if (is_array($stat) && (int) ($stat['encryption_method'] ?? 0) === 0) {
                    $zip->close();
                    @unlink($tmpZip);
                    cms_json(['ok' => false, 'error' => 'Core-Update abgelehnt: Nur verschlüsselte Core-Update-ZIPs sind erlaubt.'], 403);
                }
            }

            $stream = $zip->getStream($zip->getNameIndex($i));
            if (!$stream && $mode === 'core') {
                $zip->close();
                @unlink($tmpZip);
                cms_json(['ok' => false, 'error' => 'Core-Update konnte nicht entschlüsselt werden (falsches Master-Passwort oder manipulierte ZIP).'], 403);
            }
            if ($stream) {
                $out = fopen($destPath, 'wb');
                if ($out) {
                    stream_copy_to_stream($stream, $out);
                    fclose($out);
                    if (str_ends_with($destPath, '.sqlite')) {
                        @chmod($destPath, 0644);
                    } else {
                        @chmod($destPath, 0644);
                    }
                    $extractedCount++;
                }
                fclose($stream);
            }
        }

        $zip->close();
        @unlink($tmpZip);

        // Bei Core-Updates automatisch die aktuelle Version aus cms/changelog.json in data/site.json übernehmen
        if ($mode === 'core') {
            $cl = cms_load_changelog();
            $newVer = trim((string) ($cl['releases'][0]['version'] ?? ''));
            if ($newVer !== '') {
                $curSite = cms_read_json('data/site.json');
                if (($curSite['version'] ?? '') !== $newVer) {
                    $curSite['version'] = $newVer;
                    cms_write_json('data/site.json', $curSite);
                }
            }
        }

        // Nach Import/Update Journal & SEO-Tags neu generieren
        $buildScript = $root . '/tools/build.py';
        if (is_file($buildScript) && function_exists('exec')) {
            @exec('python3 ' . escapeshellarg($buildScript) . ' >/dev/null 2>&1');
        }

        cms_safe_log_audit(current_user(), 'import_zip', $mode . ' (' . $extractedCount . ' Dateien)');
        cms_json([
            'ok'             => true,
            'done'           => true,
            'mode'           => $mode,
            'extractedCount' => $extractedCount,
        ]);
    }

    // 1) Chunked Binary Upload (umgeht das 2MB upload_max_filesize Limit von PHP für große Bilder & Videos)
    if (($_GET['action'] ?? '') === 'upload_chunk') {
        if (!current_user()) {
            cms_json(['ok' => false, 'error' => 'Nicht angemeldet.'], 401);
        }
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf'] ?? ($_GET['csrf'] ?? ''));
        if (!csrf_check((string) $token)) {
            cms_json(['ok' => false, 'error' => 'Ungültiges CSRF-Token.'], 403);
        }

        $folder = in_array($_GET['folder'] ?? '', ['icons', 'backgrounds', 'projects', 'members', 'journal'], true)
            ? (string) $_GET['folder']
            : 'backgrounds';
        $origName = (string) ($_GET['name'] ?? 'upload.png');
        $chunkIndex = (int) ($_GET['index'] ?? 0);
        $totalChunks = max(1, (int) ($_GET['total'] ?? 1));

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico', 'mp4', 'webm', 'mov'], true)) {
            cms_json(['ok' => false, 'error' => 'Ungültiges Dateiformat (' . $ext . '). Erlaubt: jpg, png, webp, gif, svg, ico, mp4, webm, mov.'], 415);
        }

        $safeBase = preg_replace('/[^a-z0-9_-]+/i', '_', pathinfo($origName, PATHINFO_FILENAME)) ?: 'media';
        $fileName = strtolower($safeBase) . '.' . $ext;
        $relDir = ($folder === 'icons') ? '/assets/icons' : ('/assets/images/' . $folder);
        $targetDir = $root . $relDir;
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }
        $dest = $targetDir . '/' . $fileName;

        if (!empty($_FILES['chunk']['tmp_name']) && is_uploaded_file($_FILES['chunk']['tmp_name'])) {
            $chunkData = file_get_contents($_FILES['chunk']['tmp_name']);
        } else {
            $chunkData = file_get_contents('php://input');
        }
        if ($chunkData === false) {
            cms_json(['ok' => false, 'error' => 'Chunk konnte nicht gelesen werden.'], 400);
        }

        $flags = ($chunkIndex === 0) ? LOCK_EX : (FILE_APPEND | LOCK_EX);
        if (file_put_contents($dest, $chunkData, $flags) === false) {
            cms_json(['ok' => false, 'error' => 'Datei konnte nicht geschrieben werden.'], 500);
        }

        $isDone = ($chunkIndex + 1) >= $totalChunks;
        $finalUrl = $relDir . '/' . $fileName;
        if ($isDone) {
            @chmod($dest, 0644);
            $converted = cms_maybe_convert_webp($dest, $folder);
            $finalUrl = $relDir . '/' . basename($converted);
            cms_safe_log_audit(current_user(), 'upload_image', $finalUrl);
        }
        cms_json([
            'ok'           => true,
            'done'         => $isDone,
            'uploaded'     => $finalUrl,
            'images'       => $isDone ? cms_list_images() : [],
            'unusedImages' => $isDone ? cms_find_unused_images() : [],
        ]);
    }

    // 2) Fallback: Klassischer Multipart Image Upload
    if (!empty($_FILES['file'])) {
        if (!current_user()) {
            cms_json(['ok' => false, 'error' => 'Nicht angemeldet.'], 401);
        }
        $token = $_POST['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if (!csrf_check((string) $token)) {
            cms_json(['ok' => false, 'error' => 'Ungültiges CSRF-Token.'], 403);
        }
        $folder = in_array($_POST['folder'] ?? '', ['backgrounds', 'projects', 'members', 'journal'], true)
            ? (string) $_POST['folder']
            : 'backgrounds';
        $origName = (string) $_FILES['file']['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'webm', 'mov'], true)) {
            cms_json(['ok' => false, 'error' => 'Ungültiges Dateiformat. Erlaubt sind Bilder und Videos (mp4/webm/mov).'], 415);
        }
        $safeBase = preg_replace('/[^a-z0-9_-]+/i', '_', pathinfo($origName, PATHINFO_FILENAME)) ?: 'image';
        $fileName = strtolower($safeBase) . '.' . $ext;
        $targetDir = $root . '/assets/images/' . $folder;
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }
        $dest = $targetDir . '/' . $fileName;
        if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
            cms_json(['ok' => false, 'error' => 'Datei konnte nicht gespeichert werden.'], 500);
        }
        @chmod($dest, 0644);
        $converted = cms_maybe_convert_webp($dest, $folder);
        $finalUrl = '/assets/images/' . $folder . '/' . basename($converted);
        cms_safe_log_audit(current_user(), 'upload_image', $finalUrl);
        cms_json([
            'ok'           => true,
            'uploaded'     => $finalUrl,
            'images'       => cms_list_images(),
            'unusedImages' => cms_find_unused_images(),
        ]);
    }

    $raw = file_get_contents('php://input') ?: '{}';
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $action = $input['action'] ?? '';

    // Bootstrap: Ersten Account für eine frisch aufgesetzte Framework-Webseite anlegen (wenn 0 Accounts existieren)
    if ($action === 'bootstrap_first_user') {
        $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if ($userCount > 0) {
            cms_json(['ok' => false, 'error' => 'Es existiert bereits mindestens ein Account.'], 403);
        }
        $name = trim((string) ($input['name'] ?? ''));
        $email = trim((string) ($input['email'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        if ($name === '' || $email === '' || strlen($password) < 8) {
            cms_json(['ok' => false, 'error' => 'Bitte Name, E-Mail und ein Passwort mit mindestens 8 Zeichen angeben.'], 422);
        }
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (:name, :email, :hash, :role, :created_at)');
        $stmt->execute([
            ':name'       => $name,
            ':email'      => $email,
            ':hash'       => password_hash($password, PASSWORD_DEFAULT),
            ':role'       => 'admin',
            ':created_at' => date('c'),
        ]);
        $newId = (int) $pdo->lastInsertId();
        $user = ['id' => $newId, 'name' => $name, 'email' => $email, 'role' => 'admin'];
        login($user);
        $sessionUser = current_user();
        $csrf = csrf_token();
        session_write_close();
        try {
            gs_telemetry_sync(true);
        } catch (Throwable $e) {
            // Telemetrie darf den ersten Login niemals blockieren
        }
        cms_json([
            'ok'   => true,
            'user' => $sessionUser,
            'csrf' => $csrf,
        ]);
    }

    if ($action === 'login') {
        if (oidc_is_ready() && get_setting('oidc_allow_local_fallback', '0') !== '1') {
            cms_json(['ok' => false, 'error' => 'Lokaler Login ist deaktiviert. Bitte über Authentik anmelden.'], 403);
        }
        $clientIp = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        if (!check_login_rate_limit($clientIp)) {
            cms_json(['ok' => false, 'error' => 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte warte 15 Minuten.'], 429);
        }
        $email = trim((string) ($input['email'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user && password_verify($password, $user['password_hash'])) {
            clear_failed_logins($clientIp);
            login($user);
            cms_json([
                'ok'   => true,
                'user' => current_user(),
                'csrf' => csrf_token(),
            ]);
        }
        record_failed_login($clientIp);
        cms_json(['ok' => false, 'error' => 'E-Mail oder Passwort falsch.'], 401);
    }

    if ($action === 'logout') {
        $u = current_user();
        $isOidc = ($u['auth_provider'] ?? '') === 'authentik';
        if ($isOidc) {
            cms_json(['ok' => true, 'redirect' => '/api/oidc.php?action=logout&app=cms']);
        }
        logout();
        cms_json(['ok' => true]);
    }

    if (!current_user()) {
        cms_json(['ok' => false, 'error' => 'Bitte zuerst im CMS anmelden.'], 401);
    }

    $token = $input['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!csrf_check((string) $token)) {
        cms_json(['ok' => false, 'error' => 'Ungültiges CSRF-Token.'], 403);
    }

    if ($action === 'save_all') {
        $saveTamper = gs_verify_integrity();
        if (!empty($saveTamper['tampered'])) {
            cms_json(['ok' => false, 'error' => 'Speichern blockiert: Integritätsprüfung fehlgeschlagen.'], 403);
        }
        $saveHub = gs_is_instance_disabled();
        if (!empty($saveHub['disabled'])) {
            cms_json(['ok' => false, 'error' => 'Speichern blockiert: Instanz deaktiviert.'], 403);
        }
        cms_create_snapshot(current_user(), 'Vor Speichern');
        if (isset($input['site']) && is_array($input['site'])) {
            if (!is_admin()) {
                $existingSite = cms_read_json('data/site.json');
                if (isset($existingSite['version'])) {
                    $input['site']['version'] = $existingSite['version'];
                }
            }
            cms_write_json('data/site.json', $input['site']);
        }
        if (isset($input['layout']) && is_array($input['layout'])) {
            cms_write_json('data/layout.json', $input['layout']);
            // Falls neue Seiten im CMS angelegt wurden, automatisch die passenden HTML-Shells erzeugen
            $brandName = $input['site']['brand']['name'] ?? 'Gamet Studios';
            foreach (($input['layout']['pages'] ?? []) as $pKey => $pCfg) {
                foreach ([['lang' => 'de', 'path' => $pCfg['pathDe'] ?? ''], ['lang' => 'en', 'path' => $pCfg['pathEn'] ?? '']] as $loc) {
                    $p = trim((string) $loc['path'], '/');
                    if ($p === '' || $p === 'de' || $p === 'en') {
                        continue;
                    }
                    $htmlFile = $root . '/' . $p . '.html';
                    if (!is_file($htmlFile)) {
                        $dir = dirname($htmlFile);
                        if (!is_dir($dir)) {
                            mkdir($dir, 0775, true);
                        }
                        $title = htmlspecialchars(($pCfg['label'] ?? $pKey) . ' - ' . $brandName, ENT_QUOTES);
                        $shell = "<!doctype html>\n<html lang=\"{$loc['lang']}\" data-theme=\"dark\">\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n  <title>{$title}</title>\n  <link rel=\"icon\" type=\"image/png\" href=\"/assets/icons/favicon.png\" />\n  <link rel=\"stylesheet\" href=\"/assets/css/fonts.css\" />\n  <link rel=\"stylesheet\" href=\"/assets/css/tokens.css\" />\n  <link rel=\"stylesheet\" href=\"/assets/css/reset.css\" />\n  <link rel=\"stylesheet\" href=\"/assets/css/base.css\" />\n  <link rel=\"stylesheet\" href=\"/assets/css/utilities.css\" />\n  <link rel=\"stylesheet\" href=\"/assets/css/components.css\" />\n  <script type=\"text/plain\" data-gs-src=\"https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js\"></script>\n  <script type=\"text/plain\" data-gs-src=\"https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js\"></script>\n  <script type=\"text/plain\" data-gs-src=\"https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js\"></script>\n  <script type=\"module\" src=\"/assets/js/main.js\"></script>\n</head>\n<body>\n  <a class=\"skip-link\" href=\"#main\">Skip</a>\n  <gs-header></gs-header>\n  <main id=\"main\"></main>\n  <gs-footer></gs-footer>\n  <gs-cookie-banner></gs-cookie-banner>\n</body>\n</html>\n";
                        file_put_contents($htmlFile, $shell, LOCK_EX);
                    }
                }
            }
        }
        if (isset($input['pagesDe']) && is_array($input['pagesDe'])) {
            cms_write_json('data/de/pages.json', $input['pagesDe']);
        }
        if (isset($input['pagesEn']) && is_array($input['pagesEn'])) {
            cms_write_json('data/en/pages.json', $input['pagesEn']);
        }
        if (isset($input['projectsDe']) && is_array($input['projectsDe'])) {
            cms_write_json('data/de/projects.json', $input['projectsDe']);
        }
        if (isset($input['projectsEn']) && is_array($input['projectsEn'])) {
            cms_write_json('data/en/projects.json', $input['projectsEn']);
        }
        if (isset($input['membersDe']) && is_array($input['membersDe'])) {
            cms_write_json('data/de/members.json', $input['membersDe']);
        }
        if (isset($input['membersEn']) && is_array($input['membersEn'])) {
            cms_write_json('data/en/members.json', $input['membersEn']);
        }
        $buildResult = null;
        if (isset($input['journal']) && is_array($input['journal'])) {
            $buildResult = cms_save_journal_posts($input['journal']);
        }
        if (is_admin() && isset($input['systemSettings']) && is_array($input['systemSettings'])) {
            $s = $input['systemSettings'];
            foreach (['discord_webhook_url', 'discord_role_id', 'site_url', 'turnstile_site_key', 'turnstile_secret_key'] as $sk) {
                if (array_key_exists($sk, $s)) {
                    set_setting($sk, (string) $s[$sk]);
                }
            }
        }

        $sitemapOk = cms_generate_sitemap();
        cms_safe_log_audit(current_user(), 'save_all', 'Inhalte & Konfiguration gespeichert');

        cms_json([
            'ok'             => true,
            'savedAt'        => date('H:i:s'),
            'build'          => $buildResult,
            'sitemap'        => $sitemapOk,
            'journal'        => cms_load_journal_posts(),
            'unusedImages'   => cms_find_unused_images(),
            'systemSettings' => is_admin() ? cms_load_system_settings() : [],
            'snapshots'      => is_admin() ? cms_list_snapshots() : [],
            'auditLog'       => is_admin() ? cms_safe_get_audit_log(60) : [],
        ]);
    }

    if ($action === 'restore_snapshot') {
        cms_require_admin();
        $snapId = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($input['id'] ?? ''));
        $snapFile = cms_snapshot_dir() . '/.ht_snap_' . $snapId . '.json';
        if ($snapId === '' || !is_file($snapFile)) {
            cms_json(['ok' => false, 'error' => 'Snapshot nicht gefunden.'], 404);
        }
        $snap = json_decode((string) file_get_contents($snapFile), true);
        if (!is_array($snap) || !is_array($snap['files'] ?? null)) {
            cms_json(['ok' => false, 'error' => 'Ungültige Snapshot-Datei.'], 400);
        }
        cms_create_snapshot(current_user(), 'Vor Rollback auf ' . $snapId);
        foreach (cms_snapshot_files() as $key => $rel) {
            if (isset($snap['files'][$key]) && is_array($snap['files'][$key])) {
                cms_write_json($rel, $snap['files'][$key]);
            }
        }
        cms_generate_sitemap();
        cms_safe_log_audit(current_user(), 'restore_snapshot', 'Rollback auf Snapshot ' . $snapId);
        cms_json(['ok' => true]);
    }

    if ($action === 'publish_journal') {
        $posts = isset($input['journal']) && is_array($input['journal']) ? $input['journal'] : [];
        $buildResult = cms_save_journal_posts($posts);
        cms_json([
            'ok'      => true,
            'savedAt' => date('H:i:s'),
            'build'   => $buildResult,
            'journal' => cms_load_journal_posts(),
        ]);
    }

    // --- POSTFACH (Formular-Einsendungen) ---
    if ($action === 'mark_submission_read') {
        $id = (int) ($input['id'] ?? 0);
        $stmt = $pdo->prepare('UPDATE submissions SET read_at = COALESCE(read_at, :now) WHERE id = :id');
        $stmt->execute([':now' => date('c'), ':id' => $id]);
        cms_json(['ok' => true, 'submissions' => cms_load_submissions()]);
    }

    if ($action === 'toggle_submission_answered') {
        $id = (int) ($input['id'] ?? 0);
        $answered = !empty($input['answered']);
        $stmt = $pdo->prepare('UPDATE submissions SET answered_at = :val, read_at = COALESCE(read_at, :now) WHERE id = :id');
        $stmt->execute([
            ':val' => $answered ? date('c') : null,
            ':now' => date('c'),
            ':id'  => $id,
        ]);
        cms_json(['ok' => true, 'submissions' => cms_load_submissions()]);
    }

    if ($action === 'delete_submission') {
        $id = (int) ($input['id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM submissions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        cms_json(['ok' => true, 'submissions' => cms_load_submissions()]);
    }

    // --- ACCOUNTS & TEAM-ZUGÄNGE (Gemeinsame Accounts für CMSS & Postfach) ---
    if ($action === 'create_user') {
        cms_require_admin();
        $name = trim((string) ($input['name'] ?? ''));
        $email = trim((string) ($input['email'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        $role = in_array(($input['role'] ?? 'editor'), ['admin', 'editor'], true) ? (string) $input['role'] : 'editor';
        if ($name === '' || $email === '' || strlen($password) < 8) {
            cms_json(['ok' => false, 'error' => 'Bitte Name, E-Mail und ein Passwort mit mindestens 8 Zeichen angeben.'], 422);
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (:name, :email, :hash, :role, :created_at)');
            $stmt->execute([
                ':name'       => $name,
                ':email'      => $email,
                ':hash'       => password_hash($password, PASSWORD_DEFAULT),
                ':role'       => $role,
                ':created_at' => date('c'),
            ]);
        } catch (Throwable $e) {
            cms_json(['ok' => false, 'error' => 'Diese E-Mail-Adresse ist bereits vergeben.'], 409);
        }
        cms_json(['ok' => true, 'users' => cms_load_users()]);
    }

    if ($action === 'update_user_role') {
        cms_require_admin();
        $id = (int) ($input['id'] ?? 0);
        $role = in_array(($input['role'] ?? ''), ['admin', 'editor'], true) ? (string) $input['role'] : '';
        if ($id <= 0 || $role === '') {
            cms_json(['ok' => false, 'error' => 'Ungültige Parameter.'], 422);
        }
        $cur = current_user();
        if ($id === (int) ($cur['id'] ?? 0) && $role !== 'admin') {
            cms_json(['ok' => false, 'error' => 'Du kannst dir nicht selbst die Admin-Rolle entziehen.'], 400);
        }
        $stmt = $pdo->prepare('UPDATE users SET role = :role WHERE id = :id');
        $stmt->execute([':role' => $role, ':id' => $id]);
        cms_json(['ok' => true, 'users' => cms_load_users()]);
    }

    if ($action === 'change_password') {
        $curId = (int) (current_user()['id'] ?? 0);
        $targetId = (int) ($input['id'] ?? $curId);
        if ($targetId !== $curId) {
            cms_require_admin();
        }
        if ($targetId <= 0) {
            cms_json(['ok' => false, 'error' => 'Passwortänderung ist für SSO-Accounts nicht verfügbar.'], 400);
        }
        $password = (string) ($input['password'] ?? '');
        if (strlen($password) < 8) {
            cms_json(['ok' => false, 'error' => 'Das neue Passwort muss mindestens 8 Zeichen lang sein.'], 422);
        }
        $stmt = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
        $stmt->execute([
            ':hash' => password_hash($password, PASSWORD_DEFAULT),
            ':id'   => $targetId,
        ]);
        cms_json(['ok' => true, 'users' => is_admin() ? cms_load_users() : []]);
    }

    if ($action === 'delete_user') {
        cms_require_admin();
        $id = (int) ($input['id'] ?? 0);
        $cur = current_user();
        if ($id === (int) ($cur['id'] ?? 0)) {
            cms_json(['ok' => false, 'error' => 'Du kannst deinen eigenen Account nicht selbst löschen.'], 400);
        }
        $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if ($count <= 1) {
            cms_json(['ok' => false, 'error' => 'Der letzte verbleibende Account kann nicht gelöscht werden.'], 400);
        }
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        cms_json(['ok' => true, 'users' => cms_load_users()]);
    }

    // --- FORMULAR-BENACHRICHTIGUNGEN & DISCORD WEBHOOK & TURNSTILE ---
    if ($action === 'save_system_settings') {
        cms_require_admin();
        $settings = isset($input['systemSettings']) && is_array($input['systemSettings']) ? $input['systemSettings'] : [];
        $allowedSettings = [
            'discord_webhook_url',
            'discord_role_id',
            'site_url',
            'turnstile_site_key',
            'turnstile_secret_key',
            'oidc_enabled',
            'oidc_issuer',
            'oidc_client_id',
            'oidc_client_secret',
            'oidc_admin_group',
            'oidc_editor_group',
            'oidc_allow_local_fallback',
        ];
        foreach ($allowedSettings as $sk) {
            if (array_key_exists($sk, $settings)) {
                set_setting($sk, trim((string) $settings[$sk]));
            }
        }
        cms_json([
            'ok'             => true,
            'systemSettings' => cms_load_system_settings(),
        ]);
    }

    if ($action === 'test_discord_webhook') {
        cms_require_admin();
        $settings = isset($input['systemSettings']) && is_array($input['systemSettings']) ? $input['systemSettings'] : [];
        if (array_key_exists('discord_webhook_url', $settings)) {
            set_setting('discord_webhook_url', (string) $settings['discord_webhook_url']);
        }
        if (array_key_exists('discord_role_id', $settings)) {
            set_setting('discord_role_id', (string) $settings['discord_role_id']);
        }
        if (array_key_exists('site_url', $settings)) {
            set_setting('site_url', (string) $settings['site_url']);
        }
        $res = notify_discord('test', ['subject' => 'Webhook-Test aus dem Gamet Studios CMSS'], true);
        cms_json([
            'ok'             => $res['ok'],
            'error'          => $res['error'] ?? '',
            'systemSettings' => cms_load_system_settings(),
        ]);
    }

    // --- MEDIEN LÖSCHEN ---
    if ($action === 'delete_media') {
        $relUrl = trim((string) ($input['url'] ?? ''));
        if ($relUrl === '' || str_contains($relUrl, '..') || str_contains($relUrl, '\\')) {
            cms_json(['ok' => false, 'error' => 'Ungültiger Dateipfad.'], 400);
        }
        $allowedDirs = [
            '/assets/icons/',
            '/assets/images/backgrounds/',
            '/assets/images/projects/',
            '/assets/images/members/',
            '/assets/images/journal/',
            '/assets/images/og/',
        ];
        $allowed = false;
        foreach ($allowedDirs as $prefix) {
            if (str_starts_with($relUrl, $prefix)) {
                $allowed = true;
                break;
            }
        }
        if (!$allowed) {
            cms_json(['ok' => false, 'error' => 'Dieser Ordner darf nicht gelöscht werden.'], 403);
        }

        $target = realpath($root . $relUrl);
        $assetsRoot = realpath($root . '/assets');
        if (!$target || !$assetsRoot || !str_starts_with($target, $assetsRoot . DIRECTORY_SEPARATOR) || !is_file($target)) {
            cms_json(['ok' => false, 'error' => 'Datei wurde nicht gefunden.'], 404);
        }

        if (!@unlink($target)) {
            cms_json(['ok' => false, 'error' => 'Datei konnte nicht gelöscht werden.'], 500);
        }

        cms_json([
            'ok'     => true,
            'images' => cms_list_images(),
        ]);
    }

    cms_json(['ok' => false, 'error' => 'Unbekannte Aktion.'], 400);
}
