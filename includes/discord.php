<?php
require_once __DIR__ . '/db.php';

/**
 * Schickt eine Benachrichtigung an Discord per Incoming Webhook (über die im
 * Gamet Studios CMSS hinterlegte Webhook-URL) und pingt optional die hinterlegte
 * DISCORD_ROLE_ID.
 * Schlägt bewusst niemals fehl nach außen — eine kaputte Benachrichtigung
 * darf eine bereits gespeicherte Einsendung nicht verwerfen.
 */
function notify_discord(string $formKey, array $fields, bool $isTest = false): array
{
    $webhookUrl = trim(get_setting('discord_webhook_url', ''));
    $roleId     = preg_replace('/[^0-9]/', '', trim(get_setting('discord_role_id', '')));
    $siteUrl    = rtrim(trim(get_setting('site_url', defined('SITE_URL') ? SITE_URL : '')), '/');

    if ($webhookUrl === '') {
        return ['ok' => false, 'error' => 'Kein Discord-Webhook konfiguriert.'];
    }

    $labels = [
        'contact' => 'Kontaktformular',
        'careers' => 'Bewerbungsformular',
        'test'    => 'CMSS Webhook-Test',
    ];
    $label = $labels[$formKey] ?? $formKey;

    $preview = trim((string) ($fields['subject'] ?? $fields['project'] ?? ''));
    $pingPrefix = $roleId !== '' ? ('<@&' . $roleId . '> ') : '';

    if ($isTest) {
        $lines = [
            $pingPrefix . '✅ **Gamet Studios CMSS** – Test-Benachrichtigung erfolgreich verbunden!',
        ];
    } else {
        $lines = [
            $pingPrefix . '📬 Neue Einsendung über das **' . $label . '**',
        ];
    }

    if ($preview !== '') {
        $lines[] = '„' . $preview . '"';
    }
    if ($siteUrl !== '') {
        $lines[] = $siteUrl . '/cms/';
    }

    $payloadData = [
        'content' => implode("\n", $lines),
    ];
    if ($roleId !== '') {
        $payloadData['allowed_mentions'] = ['roles' => [$roleId]];
    } else {
        $payloadData['allowed_mentions'] = ['parse' => []];
    }

    $payload = json_encode($payloadData, JSON_UNESCAPED_UNICODE);

    $ch = curl_init($webhookUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $resp = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ok = ($resp !== false && $httpCode >= 200 && $httpCode < 300);

    return [
        'ok'       => $ok,
        'httpCode' => $httpCode,
        'error'    => $ok ? '' : ('Discord antwortete mit HTTP ' . $httpCode),
    ];
}
