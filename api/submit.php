<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/discord.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'config') {
    $siteKey = trim(get_setting('turnstile_site_key', ''));
    $secretKey = trim(get_setting('turnstile_secret_key', ''));
    echo json_encode([
        'ok'               => true,
        'turnstileSiteKey' => ($siteKey !== '' && $secretKey !== '') ? $siteKey : '',
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// Honeypot — für echte Nutzer:innen unsichtbares Feld (siehe gs-contact-form.js).
// Bots füllen es oft trotzdem aus. Stiller Erfolg, ohne etwas zu speichern.
if (!empty($_POST['_hp'])) {
    echo json_encode(['ok' => true]);
    exit;
}

$formKey = trim((string) ($_POST['_form'] ?? 'contact'));
if (!in_array($formKey, ['contact', 'careers'], true)) {
    $formKey = 'contact';
}

$fields = [];
foreach ($_POST as $key => $value) {
    if (in_array($key, ['_form', '_hp', 'consent'], true)) {
        continue;
    }
    $fields[$key] = is_string($value) ? trim($value) : $value;
}

if (empty($fields['name']) || empty($fields['email'])) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'missing_fields']);
    exit;
}

// Cloudflare Turnstile Serverseitige Prüfung (wenn Site-Key & Secret-Key im CMSS hinterlegt sind)
$tsSiteKey = trim(get_setting('turnstile_site_key', ''));
$tsSecretKey = trim(get_setting('turnstile_secret_key', ''));
if ($tsSiteKey !== '' && $tsSecretKey !== '') {
    $tsToken = trim((string) ($_POST['cf-turnstile-response'] ?? ''));
    if ($tsToken === '') {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'captcha_failed']);
        exit;
    }
    $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'secret'   => $tsSecretKey,
            'response' => $tsToken,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $verifyRaw = curl_exec($ch);
    $verifyData = json_decode(is_string($verifyRaw) ? $verifyRaw : '{}', true);
    if (empty($verifyData['success'])) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'captcha_failed']);
        exit;
    }
}

$subject = $fields['subject'] ?? $fields['project'] ?? null;

try {
    $pdo = get_db();
    $stmt = $pdo->prepare('
        INSERT INTO submissions (form_key, name, email, subject, data_json, created_at)
        VALUES (:form_key, :name, :email, :subject, :data_json, :created_at)
    ');
    $stmt->execute([
        ':form_key' => $formKey,
        ':name' => $fields['name'],
        ':email' => $fields['email'],
        ':subject' => $subject,
        ':data_json' => json_encode($fields, JSON_UNESCAPED_UNICODE),
        ':created_at' => date('c'),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'storage_failed']);
    exit;
}

// Benachrichtigung ist best-effort — ein Discord-Ausfall darf die bereits
// gespeicherte Einsendung nicht als Fehler an die Nutzer:in zurückmelden.
try {
    notify_discord($formKey, $fields);
} catch (Throwable $e) {
    // absichtlich ignoriert
}

echo json_encode(['ok' => true]);
