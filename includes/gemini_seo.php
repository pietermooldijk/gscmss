<?php
/**
 * Gamet Studios CMSS — Google Gemini 2.5 Flash Auto-SEO & GEO Engine
 *
 * Generiert aus realen Seiten-, Projekt- und Journal-Inhalten automatisch:
 * - SEO Meta-Title, Meta-Description, OpenGraph-Tags & Keywords
 * - GEO-Zusammenfassung, Fakten-Liste & FAQ-Paare (Schema.org JSON-LD + /llms.txt)
 *
 * Arbeitet mit striktem JSON-Schema (`responseSchema`), niedrigem Temperature-Wert (0.2)
 * und Content-Hash-Caching, damit beim Speichern nur geänderte Inhalte angefragt werden.
 */

declare(strict_types=1);

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

require_once __DIR__ . '/engine.php';

define('GS_GEMINI_MODELS', ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.7-flash']);

/**
 * Ruft Google Gemini 2.5 Flash mit striktem JSON-Schema für SEO + GEO auf.
 */
function gs_gemini_generate_seo_geo(string $kind, string $title, string $contentText, string $lang = 'de', string $brandName = 'Gamet Studios', ?string &$errorOut = null): ?array
{
    $errorOut = null;
    $apiKey = trim(get_setting('gemini_api_key', ''));
    $contentText = trim(preg_replace('/\s+/', ' ', strip_tags($contentText)) ?? '');
    if ($apiKey === '' || $contentText === '') {
        return null;
    }

    $contentSlice = mb_substr($contentText, 0, 6000);
    $langLabel = ($lang === 'en') ? 'Englisch (en)' : 'Deutsch (de)';

    $systemPrompt = <<<PROMPT
Du bist eine präzise SEO- und GEO-Analyse-Engine (Generative Engine Optimization für Google, ChatGPT, Perplexity und AI Overviews).
Regeln (STRENG EINHALTEN):
1. Nutze AUSSCHLIESSLICH Fakten, Begriffe und Aussagen aus dem gelieferten Inhalt und dem Markennamen.
2. Erfinde NIEMALS Preise, Zahlen, Kunden, Auszeichnungen, Standorte oder Features, die nicht im Text stehen.
3. Schreibe konsequent in der Sprache: {$langLabel}.
4. Halte alle Längen strikt ein:
   - seo_title: max. 60 Zeichen (inkl. Markenname am Ende mit " — {$brandName}", falls sinnvoll).
   - meta_description: 120–160 Zeichen, konkret und ohne leere Marketing-Floskeln.
   - og_title: max. 65 Zeichen.
   - og_description: max. 160 Zeichen.
   - keywords: 5 bis 8 präzise Suchbegriffe aus dem Inhalt.
   - geo_summary: 2–3 sachliche, direkt zitierfähige Sätze über Thema, Nutzen und Fakten.
   - geo_facts: 3 bis 5 kurze, faktenbasierte Stichpunkte (nur belegte Fakten aus dem Text).
   - geo_faq: 2 bis 3 präzise Frage-Antwort-Paare, die reale Nutzer/KIs stellen würden (Antwort max. 2 Sätze).
PROMPT;

    $userPrompt = "Typ: {$kind}\nMarke: {$brandName}\nTitel: {$title}\n\nInhalt:\n{$contentSlice}";

    $payload = [
        'systemInstruction' => [
            'parts' => [['text' => $systemPrompt]],
        ],
        'contents' => [
            [
                'role'  => 'user',
                'parts' => [['text' => $userPrompt]],
            ],
        ],
        'generationConfig' => [
            'temperature'      => 0.2,
            'responseMimeType' => 'application/json',
            'responseSchema'   => [
                'type'       => 'OBJECT',
                'properties' => [
                    'seo_title'        => ['type' => 'STRING'],
                    'meta_description' => ['type' => 'STRING'],
                    'og_title'         => ['type' => 'STRING'],
                    'og_description'   => ['type' => 'STRING'],
                    'keywords'         => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                    'geo_summary'      => ['type' => 'STRING'],
                    'geo_facts'        => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                    'geo_faq'          => [
                        'type'  => 'ARRAY',
                        'items' => [
                            'type'       => 'OBJECT',
                            'properties' => [
                                'q' => ['type' => 'STRING'],
                                'a' => ['type' => 'STRING'],
                            ],
                            'required' => ['q', 'a'],
                        ],
                    ],
                ],
                'required' => ['seo_title', 'meta_description', 'og_title', 'og_description', 'keywords', 'geo_summary', 'geo_facts', 'geo_faq'],
            ],
        ],
    ];

    $parsed = null;
    $usedModel = '';
    $lastErr = 'Unbekannter Gemini-API-Fehler';

    foreach (GS_GEMINI_MODELS as $model) {
        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . rawurlencode($apiKey);
        $res = gs_http('POST', $endpoint, [
            'json'           => $payload,
            'timeout'        => 12,
            'connectTimeout' => 4,
        ]);
        if (empty($res['ok']) || !is_array($res['json'])) {
            $apiErr = (string) ($res['json']['error']['message'] ?? $res['error'] ?? ('HTTP ' . ($res['status'] ?? 0)));
            $lastErr = $model . ': ' . (trim($apiErr) ?: 'HTTP-Fehler');
            continue;
        }
        $rawText = (string) ($res['json']['candidates'][0]['content']['parts'][0]['text'] ?? '');
        $candidate = json_decode($rawText, true);
        if (is_array($candidate) && !empty($candidate['seo_title']) && !empty($candidate['meta_description'])) {
            $parsed = $candidate;
            $usedModel = $model;
            break;
        }
        $lastErr = $model . ': Unvollständiges SEO/GEO-JSON.';
    }

    if (!$parsed) {
        $errorOut = $lastErr;
        return null;
    }

    return [
        'seo_title'        => mb_substr(trim((string) $parsed['seo_title']), 0, 70),
        'meta_description' => mb_substr(trim((string) $parsed['meta_description']), 0, 175),
        'og_title'         => mb_substr(trim((string) ($parsed['og_title'] ?? $parsed['seo_title'])), 0, 70),
        'og_description'   => mb_substr(trim((string) ($parsed['og_description'] ?? $parsed['meta_description'])), 0, 175),
        'keywords'         => array_slice(array_values(array_filter(array_map('strval', (array) ($parsed['keywords'] ?? [])))), 0, 8),
        'geo_summary'      => trim((string) ($parsed['geo_summary'] ?? '')),
        'geo_facts'        => array_slice(array_values(array_filter(array_map('strval', (array) ($parsed['geo_facts'] ?? [])))), 0, 6),
        'geo_faq'          => array_slice(array_values(array_filter((array) ($parsed['geo_faq'] ?? []), fn($x) => is_array($x) && !empty($x['q']) && !empty($x['a']))), 0, 4),
        'generatedAt'      => date('c'),
        'model'            => $usedModel,
    ];
}

/**
 * Extrahiert lesbaren Volltext aus beliebigen JSON-Strukturen (Seiten, Projekte).
 */
function gs_extract_plain_text(mixed $node): string
{
    if (is_string($node)) {
        return trim(strip_tags($node));
    }
    if (!is_array($node)) {
        return '';
    }
    $parts = [];
    foreach ($node as $k => $v) {
        if (in_array((string) $k, ['id', 'component', 'transition', 'bgImage', 'bgVideo', 'image', 'href', 'src', 'slug', 'contentHash', 'generatedAt', 'model'], true)) {
            continue;
        }
        $t = gs_extract_plain_text($v);
        if ($t !== '') {
            $parts[] = $t;
        }
    }
    return implode(' ', $parts);
}

/**
 * Reichert Projekte, Journal-Posts und Seiten per Gemini 2.5 Flash an (nur bei geändertem Content-Hash).
 */
function gs_gemini_enrich_workspace(string $root, array $site, array $layout, array $pagesDe, array $pagesEn, array &$projectsDe, array &$projectsEn, array $journalPosts): array
{
    $apiKey = trim(get_setting('gemini_api_key', ''));
    $brandName = (string) ($site['brand']['name'] ?? 'Gamet Studios');
    $seoGeoPath = $root . '/data/seo-geo.json';
    $store = is_file($seoGeoPath) ? (json_decode((string) file_get_contents($seoGeoPath), true) ?: []) : [];
    if (!is_array($store)) {
        $store = [];
    }

    $stats = ['enabled' => ($apiKey !== ''), 'generated' => 0, 'cached' => 0, 'errors' => [], 'items' => []];
    if ($apiKey === '') {
        return $stats;
    }

    $maxCallsPerSave = 6; // Verhindert Timeouts beim gleichzeitigen Erst-Speichern vieler Einträge

    $processEntry = function (string $storeKey, string $kind, string $title, string $text, string $lang) use (&$store, &$stats, $brandName, $maxCallsPerSave): ?array {
        $hash = hash('sha256', $kind . '|' . $lang . '|' . $title . '|' . $text);
        if (!empty($store[$storeKey]['contentHash']) && $store[$storeKey]['contentHash'] === $hash) {
            $stats['cached']++;
            $stats['items'][] = [
                'key'              => $storeKey,
                'title'            => $title,
                'status'           => 'cached',
                'seo_title'        => $store[$storeKey]['seo_title'] ?? '',
                'meta_description' => $store[$storeKey]['meta_description'] ?? '',
                'geo_summary'      => $store[$storeKey]['geo_summary'] ?? '',
            ];
            return $store[$storeKey];
        }
        if ($stats['generated'] >= $maxCallsPerSave) {
            return $store[$storeKey] ?? null;
        }
        $err = null;
        $gen = gs_gemini_generate_seo_geo($kind, $title, $text, $lang, $brandName, $err);
        if ($gen) {
            $gen['contentHash'] = $hash;
            $store[$storeKey] = $gen;
            $stats['generated']++;
            $stats['items'][] = [
                'key'              => $storeKey,
                'title'            => $title,
                'status'           => 'generated',
                'seo_title'        => $gen['seo_title'],
                'meta_description' => $gen['meta_description'],
                'geo_summary'      => $gen['geo_summary'],
            ];
            return $gen;
        }
        if ($err) {
            $stats['errors'][] = $storeKey . ': ' . $err;
        }
        return $store[$storeKey] ?? null;
    };

    // 1) Projekte (DE + EN) — höchste Priorität
    foreach (['de' => &$projectsDe, 'en' => &$projectsEn] as $lang => &$projWrap) {
        if (empty($projWrap['items']) || !is_array($projWrap['items'])) {
            continue;
        }
        foreach ($projWrap['items'] as &$item) {
            if (!is_array($item) || empty($item['slug'])) {
                continue;
            }
            $slug = (string) $item['slug'];
            $title = (string) ($item['title'] ?? $slug);
            $text = gs_extract_plain_text($item);
            $res = $processEntry('project:' . $lang . ':' . $slug, 'Projekt', $title, $text, $lang);
            if ($res) {
                $item['seo'] = [
                    'title'       => $res['seo_title'],
                    'description' => $res['meta_description'],
                    'keywords'    => $res['keywords'],
                ];
                $item['geo'] = [
                    'summary' => $res['geo_summary'],
                    'facts'   => $res['geo_facts'],
                    'faq'     => $res['geo_faq'],
                ];
            }
        }
        unset($item);
    }
    unset($projWrap);

    // 2) Journal-Blogposts — höchste Priorität
    foreach ($journalPosts as $post) {
        if (!is_array($post) || empty($post['slug'])) {
            continue;
        }
        $slug = (string) $post['slug'];
        $lang = (($post['lang'] ?? 'de') === 'en') ? 'en' : 'de';
        $title = (string) ($post['title'] ?? $slug);
        $text = trim(((string) ($post['excerpt'] ?? '')) . "\n\n" . ((string) ($post['body'] ?? '')));
        $processEntry('journal:' . $lang . ':' . $slug, 'Blogpost / Journal-Artikel', $title, $text, $lang);
    }

    // 3) Statische Seiten aus layout.json + pages.json
    foreach (($layout['pages'] ?? []) as $pageKey => $pageCfg) {
        if (!is_array($pageCfg)) {
            continue;
        }
        $label = (string) ($pageCfg['label'] ?? $pageKey);
        foreach (['de' => $pagesDe, 'en' => $pagesEn] as $lang => $pagesData) {
            $path = (string) ($lang === 'en' ? ($pageCfg['pathEn'] ?? '') : ($pageCfg['pathDe'] ?? ''));
            if ($path === '') {
                continue;
            }
            $pageContent = $pagesData[$pageKey] ?? [];
            $text = gs_extract_plain_text($pageContent);
            if ($text === '') {
                continue;
            }
            $processEntry('page:' . $lang . ':' . $pageKey, 'Webseite', $label, $text, $lang);
        }
    }

    file_put_contents($seoGeoPath, json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    return $stats;
}

/**
 * Generiert /llms.txt im Webroot für KI-Suchmaschinen (GEO).
 */
function gs_generate_llms_txt(string $root, array $site, array $layout, array $projectsDe, array $journalPosts): bool
{
    $brand = (string) ($site['brand']['name'] ?? 'Gamet Studios');
    $tagline = (string) ($site['brand']['tagline']['de'] ?? '');
    $baseUrl = rtrim(get_setting('site_url', defined('SITE_URL') ? SITE_URL : ''), '/');
    $seoGeoPath = $root . '/data/seo-geo.json';
    $store = is_file($seoGeoPath) ? (json_decode((string) file_get_contents($seoGeoPath), true) ?: []) : [];

    $lines = [
        '# ' . $brand,
        '',
        '> ' . ($tagline !== '' ? $tagline : 'Offizielle Webseite von ' . $brand),
        '',
        '## Seiten',
    ];
    foreach (($layout['pages'] ?? []) as $key => $cfg) {
        $p = (string) ($cfg['pathDe'] ?? '');
        if ($p === '') {
            continue;
        }
        $url = ($baseUrl !== '' ? $baseUrl : '') . $p;
        $g = $store['page:de:' . $key]['geo_summary'] ?? '';
        $lines[] = '- [' . ($cfg['label'] ?? $key) . '](' . $url . ')' . ($g !== '' ? ': ' . $g : '');
    }

    $lines[] = '';
    $lines[] = '## Projekte';
    foreach (($projectsDe['items'] ?? []) as $proj) {
        if (!is_array($proj) || empty($proj['slug'])) {
            continue;
        }
        $slug = (string) $proj['slug'];
        $url = ($baseUrl !== '' ? $baseUrl : '') . '/de/projekte/' . $slug;
        $g = $store['project:de:' . $slug]['geo_summary'] ?? ($proj['tagline'] ?? '');
        $lines[] = '- [' . ($proj['title'] ?? $slug) . '](' . $url . ')' . ($g !== '' ? ': ' . $g : '');
    }

    $lines[] = '';
    $lines[] = '## Journal';
    foreach ($journalPosts as $post) {
        if (!is_array($post) || empty($post['slug'])) {
            continue;
        }
        $slug = (string) $post['slug'];
        $lang = (($post['lang'] ?? 'de') === 'en') ? 'en' : 'de';
        $url = ($baseUrl !== '' ? $baseUrl : '') . '/' . $lang . '/journal/' . $slug;
        $g = $store['journal:' . $lang . ':' . $slug]['geo_summary'] ?? ($post['excerpt'] ?? '');
        $lines[] = '- [' . ($post['title'] ?? $slug) . '](' . $url . ')' . ($g !== '' ? ': ' . $g : '');
    }

    return @file_put_contents($root . '/llms.txt', implode("\n", $lines) . "\n") !== false;
}
