<?php
/**
 * Zentrale Konfiguration für Formular-Backend + Gamet Studios CMSS.
 * Sensible Einstellungen (wie der Discord-Webhook) liegen geschützt in der
 * SQLite-Datenbank und werden direkt in der CMSS-Oberfläche verwaltet.
 */

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

date_default_timezone_set('Europe/Berlin');

// Fallback-Konstanten (die aktiven Werte liegen in der geschützten SQLite-Tabelle `settings`)
define('DISCORD_WEBHOOK_URL', '');
define('DISCORD_ROLE_ID', '');
define('SITE_URL', '');
define('ADMIN_BASE_URL', '/cms/');

// SQLite-Datenbank mit nicht-erratbarem .ht-Dateinamen außerhalb von /data,
// mehrfach geschützt durch .htaccess, Router-Blockade, index.php-Sperre und Dateinamen-Hash.
define('STORAGE_DIR', dirname(__DIR__) . '/storage');
define('DB_PATH', STORAGE_DIR . '/.ht_gs_vault_9f4c2a8e1b7d3e6f.sqlite');

// Master-Passwort für AES-256-verschlüsselte Core-Update-ZIPs (verhindert Manipulation & macOS Auto-Entpacken)
define('CMSS_CORE_ZIP_SECRET', 'GS-Core-AES256-9f4c2a8e1b7d3e6f-K8mP2xQ9vL4wR7zN!');
