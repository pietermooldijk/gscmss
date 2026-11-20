<?php
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

require_once __DIR__ . '/config.php';

/**
 * Liefert eine gemeinsame PDO-SQLite-Verbindung und legt die Tabellen beim
 * ersten Aufruf an, falls sie noch nicht existieren.
 */
function get_db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    if (function_exists('gs_verify_integrity')) {
        $tamper = gs_verify_integrity();
        if (!empty($tamper['tampered'])) {
            throw new RuntimeException('Integritätsprüfung fehlgeschlagen (' . (string) ($tamper['file'] ?? 'core') . ').');
        }
    }

    if (!is_dir(STORAGE_DIR)) {
        mkdir(STORAGE_DIR, 0700, true);
    }

    $pdo = new PDO('sqlite:' . DB_PATH);
    if (is_file(DB_PATH)) {
        @chmod(DB_PATH, 0600);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA foreign_keys = ON');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            form_key TEXT NOT NULL,
            name TEXT,
            email TEXT,
            subject TEXT,
            data_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            read_at TEXT
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT "admin",
            created_at TEXT NOT NULL
        )
    ');

    // Migration: Rollen (admin / editor) für bestehende Datenbanken nachrüsten.
    $userColumns = $pdo->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('role', $userColumns, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'");
    }

    // Migration: "beantwortet"-Status wurde nachträglich ergänzt.
    $columns = $pdo->query("PRAGMA table_info(submissions)")->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('answered_at', $columns, true)) {
        $pdo->exec('ALTER TABLE submissions ADD COLUMN answered_at TEXT');
    }

    // Systemeinstellungen (z. B. Discord-Webhook für Formular-Benachrichtigungen),
    // direkt über die Gamet Studios CMSS UI pro Webseite konfigurierbar.
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ');

    // Brute-Force-Schutz für Login-Versuche
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            attempted_at INTEGER NOT NULL
        )
    ');

    // Audit-Log für Änderungen im CMSS
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_name TEXT NOT NULL,
            user_email TEXT NOT NULL,
            user_role TEXT NOT NULL,
            action TEXT NOT NULL,
            summary TEXT NOT NULL DEFAULT "",
            created_at TEXT NOT NULL
        )
    ');

    $settingsCount = (int) $pdo->query('SELECT COUNT(*) FROM settings')->fetchColumn();
    if ($settingsCount === 0) {
        $seed = $pdo->prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (:k, :v)');
        $seed->execute([':k' => 'discord_webhook_url', ':v' => defined('DISCORD_WEBHOOK_URL') ? DISCORD_WEBHOOK_URL : '']);
        $seed->execute([':k' => 'discord_role_id', ':v' => defined('DISCORD_ROLE_ID') ? DISCORD_ROLE_ID : '']);
        $seed->execute([':k' => 'site_url', ':v' => defined('SITE_URL') ? SITE_URL : '']);
    }

    return $pdo;
}

function get_setting(string $key, string $default = ''): string
{
    $pdo = get_db();
    $stmt = $pdo->prepare('SELECT value FROM settings WHERE key = :k LIMIT 1');
    $stmt->execute([':k' => $key]);
    $val = $stmt->fetchColumn();
    return $val !== false ? (string) $val : $default;
}

function set_setting(string $key, string $value): void
{
    $pdo = get_db();
    $stmt = $pdo->prepare('
        INSERT INTO settings (key, value) VALUES (:k, :v)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    ');
    $stmt->execute([':k' => $key, ':v' => trim($value)]);
}

/**
 * Prüft, ob von dieser IP in den letzten 15 Minuten weniger als 5 Fehlversuche kamen.
 */
function check_login_rate_limit(string $ip): bool
{
    $pdo = get_db();
    $cutoff = time() - 900; // 15 Minuten
    $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < :cutoff')->execute([':cutoff' => $cutoff]);
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = :ip AND attempted_at >= :cutoff');
    $stmt->execute([':ip' => $ip, ':cutoff' => $cutoff]);
    return ((int) $stmt->fetchColumn()) < 5;
}

function record_failed_login(string $ip): void
{
    $pdo = get_db();
    $stmt = $pdo->prepare('INSERT INTO login_attempts (ip, attempted_at) VALUES (:ip, :now)');
    $stmt->execute([':ip' => $ip, ':now' => time()]);
}

function clear_failed_logins(string $ip): void
{
    $pdo = get_db();
    $stmt = $pdo->prepare('DELETE FROM login_attempts WHERE ip = :ip');
    $stmt->execute([':ip' => $ip]);
}

function log_audit(?array $user, string $action, string $summary = ''): void
{
    if (!$user) {
        return;
    }
    try {
        $pdo = get_db();
        $stmt = $pdo->prepare('
            INSERT INTO audit_log (user_name, user_email, user_role, action, summary, created_at)
            VALUES (:name, :email, :role, :action, :summary, :created_at)
        ');
        $stmt->execute([
            ':name'       => (string) ($user['name'] ?? 'Unbekannt'),
            ':email'      => (string) ($user['email'] ?? ''),
            ':role'       => (string) ($user['role'] ?? 'admin'),
            ':action'     => $action,
            ':summary'    => $summary,
            ':created_at' => date('c'),
        ]);
        // Alte Einträge (> 250) automatisch aufräumen
        $pdo->exec('DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY id DESC LIMIT 250)');
    } catch (Throwable $e) {
        // Audit-Log darf den Haupt-Workflow nicht blockieren
    }
}

function get_audit_log(int $limit = 60): array
{
    $pdo = get_db();
    $stmt = $pdo->prepare('SELECT id, user_name, user_email, user_role, action, summary, created_at FROM audit_log ORDER BY id DESC LIMIT :lim');
    $stmt->bindValue(':lim', max(1, min(250, $limit)), PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}
