<?php
/**
 * Nur für lokale Entwicklung mit `php -S` gedacht:
 *   php -S localhost:8080 tools/router.php
 *
 * Bildet dieselbe Logik inkl. Sicherheits-Sperren wie die .htaccess nach.
 */

$root = dirname(__DIR__);
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$cleanUri = rtrim($uri, '/');
$file = $root . $uri;

// Sicherheits-Sperre: Niemals Zugriff auf /storage, /includes, /tools, Dotfiles oder Datenbank-/Python-Dateien erlauben!
if (
    preg_match('#^/(storage|includes|tools)(/|$)#i', $uri) ||
    preg_match('#(^|/)\.(?!well-known/)#', $uri) ||
    preg_match('#\.(db|sqlite|sqlite3|wal|shm|py|sh|sql|env|log)$#i', $uri)
) {
    http_response_code(403);
    exit('403 Forbidden');
}

// Existierende Datei (css/js/php/bilder/…) direkt ausliefern bzw. ausführen lassen.
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}

// Saubere URL ohne .html -> passende .html-Datei ausliefern (z.B. /de/projekte -> de/projekte.html)
if ($cleanUri !== '' && file_exists($root . $cleanUri . '.html')) {
    readfile($root . $cleanUri . '.html');
    return true;
}

// Verzeichnis -> index.php oder index.html
if (is_dir($file)) {
    $indexPhp = rtrim($file, '/') . '/index.php';
    if (file_exists($indexPhp)) {
        require $indexPhp;
        return true;
    }
    $index = rtrim($file, '/') . '/index.html';
    if (file_exists($index)) {
        readfile($index);
        return true;
    }
}

return false; // 404 vom eingebauten PHP-Server
