#!/usr/bin/env php
<?php
/**
 * Gamet Studios WARP Engine — CLI Tool (`php tools/warp.php <command>`)
 *
 * Zero-Dependency Kommandozeilen-Werkzeug für App-Scaffolding, Cronjobs,
 * Cache-Wartung, Feature-Flags und Systemdiagnose.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
require_once dirname(__DIR__) . '/includes/engine.php';

$args = array_slice($argv, 1);
$cmd = $args[0] ?? 'help';

function warp_out(string $msg): void
{
    fwrite(STDOUT, $msg . PHP_EOL);
}

function warp_err(string $msg, int $code = 1): never
{
    fwrite(STDERR, 'Fehler: ' . $msg . PHP_EOL);
    exit($code);
}

switch ($cmd) {
    case 'version':
    case '-v':
    case '--version':
        warp_out(GS_ENGINE_NAME . ' v' . GS_ENGINE_VERSION . ' (' . GS_ENGINE_CODENAME . ')');
        exit(0);

    case 'health':
        $h = gs_health();
        warp_out(json_encode($h, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        exit(0);

    case 'new-app':
        $slug = strtolower(trim((string) ($args[1] ?? '')));
        if ($slug === '' || !preg_match('/^[a-z0-9][a-z0-9_-]{1,48}$/', $slug)) {
            warp_err('Ungültiger Slug. Beispiel: php tools/warp.php new-app my-dashboard "Mein Dashboard"');
        }
        $name = trim((string) ($args[2] ?? ucwords(str_replace(['-', '_'], ' ', $slug))));
        $appDir = dirname(__DIR__) . '/apps/' . $slug;
        if (is_dir($appDir)) {
            warp_err('App-Verzeichnis existiert bereits: apps/' . $slug);
        }
        mkdir($appDir, 0755, true);

        file_put_contents($appDir . '/manifest.json', json_encode([
            'name'        => $name,
            'version'     => '1.0.0',
            'description' => $name . ' — erstellt mit der ' . GS_ENGINE_NAME . '.',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL);

        $apiTemplate = <<<PHP
<?php
/**
 * WARP App-Backend: {$name}
 * Aufruf: /api/app.php?app={$slug}&action=ping
 */

declare(strict_types=1);

\$in = gs_input();
\$action = (string) (\$_GET['action'] ?? (\$in['action'] ?? 'ping'));

if (\$action === 'ping') {
    gs_json([
        'ok'      => true,
        'app'     => '{$slug}',
        'engine'  => GS_ENGINE_NAME . ' v' . GS_ENGINE_VERSION,
        'message' => '{$name} API aktiv.',
    ]);
}

gs_json(['ok' => false, 'error' => 'Unbekannte App-Aktion.'], 404);
PHP;
        file_put_contents($appDir . '/api.php', $apiTemplate . PHP_EOL);

        $htmlTemplate = <<<HTML
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{$name} — WARP Engine</title>
  <link rel="stylesheet" href="/assets/css/reset.css">
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/base.css">
</head>
<body style="padding:2rem; max-width:920px; margin:0 auto;">
  <h1 style="margin-bottom:0.5rem;">{$name}</h1>
  <p id="status" style="opacity:0.75; margin-bottom:1.5rem;">Verbinde mit WARP Engine…</p>
  <div id="app"></div>

  <script type="module">
    import { warp } from '/assets/js/core/engine.js';

    const status = document.getElementById('status');
    try {
      const info = await warp.auth();
      const ping = await warp.api('ping', null, { app: '{$slug}', method: 'GET' });
      status.textContent = `\${info.engine.name} v\${info.engine.version} — \${ping.message}`;
    } catch (err) {
      status.textContent = err.message;
    }
  </script>
</body>
</html>
HTML;
        file_put_contents($appDir . '/index.html', $htmlTemplate . PHP_EOL);

        warp_out('App erstellt unter apps/' . $slug . '/');
        warp_out('URL (lokal): http://localhost:8080/apps/' . $slug . '/');
        exit(0);

    case 'jobs:run':
        $limit = max(1, (int) ($args[1] ?? 25));
        $queue = (string) ($args[2] ?? 'default');
        $processed = gs_job_run_pending($limit, $queue);
        warp_out(json_encode(['queue' => $queue, 'processed' => $processed], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        exit(0);

    case 'jobs:stats':
        $queue = isset($args[1]) && $args[1] !== '' ? (string) $args[1] : null;
        warp_out(json_encode(gs_job_stats($queue), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        exit(0);

    case 'jobs:retry':
        $queue = isset($args[1]) && $args[1] !== '' ? (string) $args[1] : null;
        warp_out('Erneut eingereiht: ' . gs_job_retry_failed($queue));
        exit(0);

    case 'cache:prune':
        warp_out('Abgelaufene Cache-Einträge entfernt: ' . gs_cache_prune());
        exit(0);

    case 'cache:flush':
        $prefix = (string) ($args[1] ?? '');
        warp_out('Cache-Einträge geleert: ' . gs_cache_flush($prefix));
        exit(0);

    case 'flag:list':
        warp_out(json_encode(gs_flags_list(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        exit(0);

    case 'flag:set':
        $name = (string) ($args[1] ?? '');
        $val = strtolower((string) ($args[2] ?? ''));
        if ($name === '' || !in_array($val, ['on', 'off', '1', '0', 'true', 'false'], true)) {
            warp_err('Verwendung: php tools/warp.php flag:set <name> <on|off>');
        }
        $enabled = in_array($val, ['on', '1', 'true'], true);
        gs_flag_set($name, $enabled);
        warp_out('Flag "' . $name . '" = ' . ($enabled ? 'ON' : 'OFF'));
        exit(0);

    case 'help':
    default:
        warp_out(GS_ENGINE_NAME . ' v' . GS_ENGINE_VERSION . ' — CLI');
        warp_out('');
        warp_out('Befehle:');
        warp_out('  version                         Engine-Version anzeigen');
        warp_out('  health                          System- & Extension-Check als JSON');
        warp_out('  new-app <slug> [Name]           Neue App unter apps/<slug>/ generieren');
        warp_out('  jobs:run [limit] [queue]        Fällige Background-Jobs ausführen (Cron)');
        warp_out('  jobs:stats [queue]              Job-Queue-Statistiken anzeigen');
        warp_out('  jobs:retry [queue]              Fehlgeschlagene Jobs erneut einreihen');
        warp_out('  cache:prune                     Abgelaufene Cache-Einträge entfernen');
        warp_out('  cache:flush [prefix]            Cache komplett oder nach Präfix leeren');
        warp_out('  flag:list                       Alle Feature-Flags auflisten');
        warp_out('  flag:set <name> <on|off>        Feature-Flag aktivieren/deaktivieren');
        exit(0);
}
