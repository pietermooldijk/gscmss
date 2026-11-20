<?php
/**
 * Gamet Studios CMSS — Automatischer Social-Media Live-Feed Resolver & Cache (api/social-feed.php)
 *
 * Zieht automatisch den jeweils aktuellsten Inhalt eines Accounts / Kanals:
 *  - YouTube   -> Neustes Video via Channel-ID Auflösung + offiziellem YouTube Atom-Feed
 *  - Instagram -> Neuster Post (chronologisch sortiert) via Profile-Embed contextJSON + Image-Proxy
 *  - X/Twitter -> Neuster Post (chronologisch sortiert) via Syndication Timeline JSON + oEmbed Fallback
 *  - TikTok    -> Neustes Video / Profil via oEmbed & Rehydration-Daten
 *  - Bluesky   -> Neuster Post via offiziellem AT-Protocol Public XRPC API
 *  - Mastodon  -> Neuster Post via öffentlichem Profil-RSS-Feed (@user.rss)
 *  - RSS/Atom  -> Neuster Beitrag / Podcast-Folge aus beliebigem Feed
 *
 * Ergebnisse werden für 15 Minuten in der geschützten SQLite-Datenbank gecacht,
 * damit die Webseite blitzschnell lädt und keine Rate-Limits reißt.
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/db.php';

$pdo = get_db();
$pdo->exec('
    CREATE TABLE IF NOT EXISTS social_cache (
        cache_key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        fetched_at INTEGER NOT NULL
    )
');

// 1) Image-Proxy für Instagram / X / TikTok CDN-Bilder (verhindert Cross-Origin-Resource-Policy Blockaden im Browser)
if (($_GET['action'] ?? '') === 'image_proxy') {
    $rawUrl = trim((string) ($_GET['url'] ?? ''));
    if ($rawUrl === '' || !preg_match('#^https://([a-z0-9.-]+)/(.*)$#i', $rawUrl, $m)) {
        http_response_code(400);
        exit('Invalid URL');
    }
    $host = strtolower($m[1]);
    $allowedHosts = [
        'cdninstagram.com',
        'fbcdn.net',
        'twimg.com',
        'ytimg.com',
        'ggpht.com',
        'tiktokcdn.com',
        'tiktokcdn-eu.com',
        'bsky.app',
    ];
    $allowed = false;
    foreach ($allowedHosts as $ah) {
        if ($host === $ah || str_ends_with($host, '.' . $ah)) {
            $allowed = true;
            break;
        }
    }
    if (!$allowed) {
        http_response_code(403);
        exit('Host not allowed');
    }

    $ch = curl_init($rawUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ]);
    $bin = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ctype = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if ($bin === false || $code >= 400) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: ' . ($ctype ?: 'image/jpeg'));
    header('Cache-Control: public, max-age=86400');
    echo $bin;
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$platform = strtolower(trim((string) ($_GET['platform'] ?? 'auto')));
$accountUrl = trim((string) ($_GET['url'] ?? ''));
$forceRefresh = !empty($_GET['refresh']);

if ($accountUrl === '') {
    echo json_encode(['ok' => false, 'error' => 'Keine Account- oder Kanal-URL angegeben.']);
    exit;
}

// Plattform automatisch erkennen, falls "auto" gewählt oder URL eindeutig ist
if ($platform === 'auto' || $platform === '') {
    if (stripos($accountUrl, 'youtube.com') !== false || stripos($accountUrl, 'youtu.be') !== false) {
        $platform = 'youtube';
    } elseif (stripos($accountUrl, 'instagram.com') !== false) {
        $platform = 'instagram';
    } elseif (stripos($accountUrl, 'x.com') !== false || stripos($accountUrl, 'twitter.com') !== false) {
        $platform = 'x';
    } elseif (stripos($accountUrl, 'tiktok.com') !== false) {
        $platform = 'tiktok';
    } elseif (stripos($accountUrl, 'bsky.app') !== false) {
        $platform = 'bluesky';
    } else {
        $platform = 'rss';
    }
}

$cacheKey = $platform . '|' . strtolower($accountUrl);
$cacheTtl = 1800; // 30 Minuten Cache (schützt vor API-Rate-Limits)

$stmtCache = $pdo->prepare('SELECT payload_json, fetched_at FROM social_cache WHERE cache_key = :k LIMIT 1');
$stmtCache->execute([':k' => $cacheKey]);
$existingCache = $stmtCache->fetch(PDO::FETCH_ASSOC);

if (!$forceRefresh && $existingCache && (time() - (int) $existingCache['fetched_at']) < $cacheTtl) {
    $decoded = json_decode((string) $existingCache['payload_json'], true);
    if (is_array($decoded) && !empty($decoded['ok'])) {
        $decoded['cached'] = true;
        echo json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

function sf_http_get(string $url, string $ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', array $headers = [], bool $sendConsentCookie = false): string
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_USERAGENT      => $ua,
    ];
    if (!empty($headers)) {
        $opts[CURLOPT_HTTPHEADER] = $headers;
    }
    if ($sendConsentCookie) {
        $opts[CURLOPT_COOKIE] = 'CONSENT=YES+cb.20210328-17-p0.de+FX+999';
    }
    curl_setopt_array($ch, $opts);
    $res = curl_exec($ch);
    return is_string($res) ? $res : '';
}

function sf_proxy_img(string $url): string
{
    if ($url === '') {
        return '';
    }
    return '/api/social-feed.php?action=image_proxy&url=' . rawurlencode($url);
}

/* ==========================================================================
   1. YOUTUBE (Neustes Video vom Kanal)
   ========================================================================== */
function sf_fetch_youtube(string $inputUrl): array
{
    $channelId = '';
    if (preg_match('#youtube\.com/channel/(UC[a-zA-Z0-9_-]+)#i', $inputUrl, $m)) {
        $channelId = $m[1];
    } elseif (preg_match('#^UC[a-zA-Z0-9_-]{16,}$#', $inputUrl)) {
        $channelId = $inputUrl;
    } else {
        $url = $inputUrl;
        if (!preg_match('#^https?://#i', $url)) {
            $handle = ltrim($url, '@/');
            $url = 'https://www.youtube.com/@' . $handle;
        }
        $html = sf_http_get($url, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', ['Accept-Language: de-DE,de;q=0.9,en;q=0.8'], true);
        if (
            preg_match('/"externalId":"(UC[a-zA-Z0-9_-]+)"/', $html, $m) ||
            preg_match('#https://www\.youtube\.com/channel/(UC[a-zA-Z0-9_-]+)#', $html, $m) ||
            preg_match('/"channelId":"(UC[a-zA-Z0-9_-]+)"/', $html, $m)
        ) {
            $channelId = $m[1];
        }
    }

    if ($channelId === '') {
        return ['ok' => false, 'error' => 'YouTube-Kanal-ID konnte aus dieser URL nicht ermittelt werden.'];
    }

    $feedXml = sf_http_get('https://www.youtube.com/feeds/videos.xml?channel_id=' . rawurlencode($channelId));
    if ($feedXml === '' || strpos($feedXml, '<entry>') === false) {
        return ['ok' => false, 'error' => 'YouTube-Feed enthält noch keine öffentlichen Videos.'];
    }

    $xml = @simplexml_load_string($feedXml);
    if (!$xml || !isset($xml->entry[0])) {
        return ['ok' => false, 'error' => 'YouTube-XML konnte nicht gelesen werden.'];
    }

    $channelTitle = (string) ($xml->title ?? 'YouTube');
    $channelUri = 'https://www.youtube.com/channel/' . $channelId;

    $entry = $xml->entry[0];
    $yt = $entry->children('http://www.youtube.com/xml/schemas/2015');
    $media = $entry->children('http://search.yahoo.com/mrss/');

    $videoId = (string) ($yt->videoId ?? '');
    $title = (string) ($entry->title ?? '');
    $published = (string) ($entry->published ?? date('c'));
    $desc = '';
    $views = 0;
    if (isset($media->group->description)) {
        $desc = trim((string) $media->group->description);
    }
    if (isset($media->group->community->statistics)) {
        $attrs = $media->group->community->statistics->attributes();
        $views = (int) ($attrs['views'] ?? 0);
    }

    $thumbUrl = 'https://i.ytimg.com/vi/' . $videoId . '/maxresdefault.jpg';

    return [
        'ok'          => true,
        'platform'    => 'youtube',
        'contentType' => 'video',
        'authorName'  => $channelTitle,
        'authorHandle'=> '@' . preg_replace('#^https?://(www\.)?youtube\.com/@?#i', '', rtrim($inputUrl, '/')),
        'authorUrl'   => $inputUrl,
        'authorAvatar'=> '',
        'title'       => $title,
        'text'        => mb_substr($desc, 0, 280),
        'mediaUrl'    => $thumbUrl,
        'videoId'     => $videoId,
        'embedUrl'    => 'https://www.youtube-nocookie.com/embed/' . rawurlencode($videoId),
        'postUrl'     => 'https://www.youtube.com/watch?v=' . rawurlencode($videoId),
        'publishedAt' => date('c', strtotime($published)),
        'metrics'     => $views > 0 ? (number_format($views, 0, ',', '.') . ' Aufrufe') : 'Neustes Video',
    ];
}

/* ==========================================================================
   2. INSTAGRAM (Neuster Post vom Account, chronologisch sortiert)
   ========================================================================== */
function sf_fetch_instagram(string $inputUrl): array
{
    $handle = '';
    if (preg_match('#instagram\.com/([a-zA-Z0-9._]+)#i', $inputUrl, $m)) {
        $handle = $m[1];
    } else {
        $handle = ltrim($inputUrl, '@/ ');
    }
    $handle = trim($handle, '/');
    if ($handle === '' || in_array(strtolower($handle), ['p', 'reel', 'reels', 'explore', 'stories'], true)) {
        return ['ok' => false, 'error' => 'Bitte eine Instagram-Profil-URL angeben (z. B. https://www.instagram.com/gametstudios).'];
    }

    $embedUrl = 'https://www.instagram.com/' . rawurlencode($handle) . '/embed/';
    $html = sf_http_get($embedUrl, 'facebookexternalhit/1.1');

    $marker = '"contextJSON":';
    $pos = strpos($html, $marker);
    if ($pos === false) {
        return ['ok' => false, 'error' => 'Instagram-Profil konnte nicht geladen werden (@' . $handle . ').'];
    }

    $start = $pos + strlen($marker);
    $i = $start + 1;
    $len = strlen($html);
    while ($i < $len) {
        if ($html[$i] === '\\') {
            $i += 2;
            continue;
        }
        if ($html[$i] === '"') {
            break;
        }
        $i++;
    }

    $rawLiteral = substr($html, $start, $i - $start + 1);
    $ctxStr = json_decode($rawLiteral, true);
    $ctx = is_string($ctxStr) ? json_decode($ctxStr, true) : null;
    $context = $ctx['context'] ?? null;

    if (!is_array($context)) {
        return ['ok' => false, 'error' => 'Instagram-Daten für @' . $handle . ' nicht verfügbar.'];
    }

    $mediaList = $context['graphql_media'] ?? [];
    if (empty($mediaList)) {
        return ['ok' => false, 'error' => 'Keine öffentlichen Instagram-Posts bei @' . $handle . ' gefunden.'];
    }

    // Chronologisch nach taken_at_timestamp sortieren, damit immer der WIRKLICH neuste Post gewählt wird
    usort($mediaList, function ($a, $b) {
        $ta = (int) ($a['shortcode_media']['taken_at_timestamp'] ?? 0);
        $tb = (int) ($b['shortcode_media']['taken_at_timestamp'] ?? 0);
        return $tb <=> $ta;
    });

    $latest = $mediaList[0]['shortcode_media'] ?? [];
    $shortcode = (string) ($latest['shortcode'] ?? '');
    $displayUrl = (string) ($latest['display_url'] ?? '');
    $caption = trim((string) ($latest['edge_media_to_caption']['edges'][0]['node']['text'] ?? ''));
    $timestamp = (int) ($latest['taken_at_timestamp'] ?? time());
    $likes = (int) ($latest['edge_liked_by']['count'] ?? ($latest['edge_media_preview_like']['count'] ?? 0));
    $isVideo = !empty($latest['is_video']);

    // Erste Zeile der Caption als kompakter Titel, Rest als Text
    $lines = preg_split('/\R+/', $caption) ?: [];
    $firstLine = trim($lines[0] ?? '');
    $title = mb_strlen($firstLine) > 85 ? (mb_substr($firstLine, 0, 82) . '…') : ($firstLine ?: ('Neuster Beitrag von @' . $handle));

    return [
        'ok'          => true,
        'platform'    => 'instagram',
        'contentType' => $isVideo ? 'reel' : 'post',
        'authorName'  => (string) ($context['full_name'] ?: $handle),
        'authorHandle'=> '@' . ($context['username'] ?? $handle),
        'authorUrl'   => 'https://www.instagram.com/' . rawurlencode($handle) . '/',
        'authorAvatar'=> sf_proxy_img((string) ($context['profile_pic_url'] ?? '')),
        'title'       => $title,
        'text'        => mb_substr($caption, 0, 320),
        'mediaUrl'    => sf_proxy_img($displayUrl),
        'videoId'     => '',
        'embedUrl'    => '',
        'postUrl'     => 'https://www.instagram.com/p/' . rawurlencode($shortcode) . '/',
        'publishedAt' => date('c', $timestamp),
        'metrics'     => $likes > 0 ? (number_format($likes, 0, ',', '.') . ' Likes') : 'Neuster Post',
    ];
}

/* ==========================================================================
   3. X / TWITTER (Neuster Post vom Account, chronologisch sortiert)
   ========================================================================== */
function sf_fetch_x(string $inputUrl): array
{
    $handle = '';
    if (preg_match('#(?:x|twitter)\.com/([a-zA-Z0-9_]+)#i', $inputUrl, $m)) {
        $handle = $m[1];
    } else {
        $handle = ltrim($inputUrl, '@/ ');
    }
    $handle = trim($handle, '/');
    if ($handle === '') {
        return ['ok' => false, 'error' => 'Bitte eine gültige X / Twitter URL angeben.'];
    }

    $synUrl = 'https://syndication.twitter.com/srv/timeline-profile/screen-name/' . rawurlencode($handle);
    $html = sf_http_get($synUrl);

    $startTag = '<script id="__NEXT_DATA__" type="application/json">';
    $sPos = strpos($html, $startTag);
    if ($sPos !== false) {
        $jsonStart = $sPos + strlen($startTag);
        $ePos = strpos($html, '</script>', $jsonStart);
        $rawJson = $ePos !== false ? substr($html, $jsonStart, $ePos - $jsonStart) : '';
        $data = json_decode($rawJson, true);
        $entries = $data['props']['pageProps']['timeline']['entries'] ?? [];
        $tweets = [];
        foreach ($entries as $ent) {
            if (!empty($ent['content']['tweet'])) {
                $tweets[] = $ent['content']['tweet'];
            }
        }

        if (!empty($tweets)) {
            // Chronologisch nach Datum / ID absteigend sortieren, damit der aktuellste Post oben steht
            usort($tweets, function ($a, $b) {
                $ta = strtotime((string) ($a['created_at'] ?? '')) ?: 0;
                $tb = strtotime((string) ($b['created_at'] ?? '')) ?: 0;
                return $tb <=> $ta;
            });

            $tw = $tweets[0];
            $user = $tw['user'] ?? [];
            $fullText = trim((string) ($tw['full_text'] ?? $tw['text'] ?? ''));
            // t.co Links am Ende kürzen
            $cleanText = trim(preg_replace('#https://t\.co/[a-zA-Z0-9]+$#', '', $fullText));
            $mediaUrl = '';
            if (!empty($tw['entities']['media'][0]['media_url_https'])) {
                $mediaUrl = (string) $tw['entities']['media'][0]['media_url_https'];
            } elseif (!empty($tw['extended_entities']['media'][0]['media_url_https'])) {
                $mediaUrl = (string) $tw['extended_entities']['media'][0]['media_url_https'];
            }

            $idStr = (string) ($tw['id_str'] ?? '');
            $likes = (int) ($tw['favorite_count'] ?? 0);
            $createdAt = strtotime((string) ($tw['created_at'] ?? '')) ?: time();

            $firstLine = strtok($cleanText, "\n") ?: ('Post von @' . $handle);
            $title = mb_strlen($firstLine) > 85 ? (mb_substr($firstLine, 0, 82) . '…') : $firstLine;

            return [
                'ok'          => true,
                'platform'    => 'x',
                'contentType' => 'post',
                'authorName'  => (string) ($user['name'] ?? $handle),
                'authorHandle'=> '@' . ($user['screen_name'] ?? $handle),
                'authorUrl'   => 'https://x.com/' . rawurlencode($handle),
                'authorAvatar'=> sf_proxy_img((string) ($user['profile_image_url_https'] ?? '')),
                'title'       => $title,
                'text'        => $cleanText ?: $fullText,
                'mediaUrl'    => sf_proxy_img($mediaUrl),
                'videoId'     => '',
                'embedUrl'    => '',
                'postUrl'     => $idStr ? ('https://x.com/' . rawurlencode($handle) . '/status/' . $idStr) : ('https://x.com/' . rawurlencode($handle)),
                'publishedAt' => date('c', $createdAt),
                'metrics'     => $likes > 0 ? (number_format($likes, 0, ',', '.') . ' Likes') : 'Neuster X-Post',
            ];
        }
    }

    // Fallback, falls Account noch keine öffentlichen Posts in der Syndication-API hat
    return [
        'ok'          => true,
        'platform'    => 'x',
        'contentType' => 'profile',
        'authorName'  => ucfirst($handle),
        'authorHandle'=> '@' . $handle,
        'authorUrl'   => 'https://x.com/' . rawurlencode($handle),
        'authorAvatar'=> '',
        'title'       => 'Folge @' . $handle . ' auf X',
        'text'        => 'Aktuelle Updates, Kurznachrichten und Einblicke direkt auf unserem X-Profil @' . $handle . '.',
        'mediaUrl'    => '',
        'videoId'     => '',
        'embedUrl'    => '',
        'postUrl'     => 'https://x.com/' . rawurlencode($handle),
        'publishedAt' => date('c'),
        'metrics'     => 'X Profil',
    ];
}

/* ==========================================================================
   4. BLUESKY (Offizielle Public API)
   ========================================================================== */
function sf_fetch_bluesky(string $inputUrl): array
{
    $handle = $inputUrl;
    if (preg_match('#bsky\.app/profile/([^/?#]+)#i', $inputUrl, $m)) {
        $handle = $m[1];
    }
    $handle = ltrim(trim($handle, '/'), '@');
    if (strpos($handle, '.') === false) {
        $handle .= '.bsky.social';
    }

    $apiUrl = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=' . rawurlencode($handle) . '&limit=5&filter=posts_no_replies';
    $raw = sf_http_get($apiUrl);
    $data = json_decode($raw, true);
    $feed = $data['feed'] ?? [];
    if (empty($feed[0]['post'])) {
        return ['ok' => false, 'error' => 'Keine öffentlichen Bluesky-Posts für ' . $handle . ' gefunden.'];
    }

    $post = $feed[0]['post'];
    $author = $post['author'] ?? [];
    $record = $post['record'] ?? [];
    $text = trim((string) ($record['text'] ?? ''));
    $createdAt = (string) ($record['createdAt'] ?? date('c'));
    $uriParts = explode('/', (string) ($post['uri'] ?? ''));
    $rkey = end($uriParts);

    $mediaUrl = '';
    if (!empty($post['embed']['images'][0]['fullsize'])) {
        $mediaUrl = (string) $post['embed']['images'][0]['fullsize'];
    } elseif (!empty($post['embed']['thumbnail'])) {
        $mediaUrl = (string) $post['embed']['thumbnail'];
    }

    $firstLine = strtok($text, "\n") ?: ('Post von @' . $handle);
    $title = mb_strlen($firstLine) > 85 ? (mb_substr($firstLine, 0, 82) . '…') : $firstLine;

    return [
        'ok'          => true,
        'platform'    => 'bluesky',
        'contentType' => 'post',
        'authorName'  => (string) ($author['displayName'] ?: $handle),
        'authorHandle'=> '@' . ($author['handle'] ?? $handle),
        'authorUrl'   => 'https://bsky.app/profile/' . rawurlencode($handle),
        'authorAvatar'=> (string) ($author['avatar'] ?? ''),
        'title'       => $title,
        'text'        => $text,
        'mediaUrl'    => $mediaUrl,
        'videoId'     => '',
        'embedUrl'    => '',
        'postUrl'     => 'https://bsky.app/profile/' . rawurlencode($handle) . '/post/' . rawurlencode((string) $rkey),
        'publishedAt' => date('c', strtotime($createdAt)),
        'metrics'     => ((int) ($post['likeCount'] ?? 0)) . ' Likes',
    ];
}

/* ==========================================================================
   5. TIKTOK (Video / Profil oEmbed)
   ========================================================================== */
function sf_fetch_tiktok(string $inputUrl): array
{
    $handle = '';
    if (preg_match('#tiktok\.com/@([a-zA-Z0-9._-]+)#i', $inputUrl, $m)) {
        $handle = $m[1];
    } else {
        $handle = ltrim(trim($inputUrl), '@/');
    }
    $cleanUrl = strpos($inputUrl, 'http') === 0 ? $inputUrl : ('https://www.tiktok.com/@' . $handle);

    $oembedRaw = sf_http_get('https://www.tiktok.com/oembed?url=' . rawurlencode($cleanUrl));
    $oe = json_decode($oembedRaw, true);
    if (is_array($oe) && !empty($oe['title'])) {
        return [
            'ok'          => true,
            'platform'    => 'tiktok',
            'contentType' => 'video',
            'authorName'  => (string) ($oe['author_name'] ?? $handle),
            'authorHandle'=> '@' . ($oe['author_unique_id'] ?? $handle),
            'authorUrl'   => (string) ($oe['author_url'] ?? $cleanUrl),
            'authorAvatar'=> '',
            'title'       => mb_substr((string) $oe['title'], 0, 90),
            'text'        => (string) $oe['title'],
            'mediaUrl'    => sf_proxy_img((string) ($oe['thumbnail_url'] ?? '')),
            'videoId'     => '',
            'embedUrl'    => '',
            'postUrl'     => $cleanUrl,
            'publishedAt' => date('c'),
            'metrics'     => 'TikTok Video',
        ];
    }

    return [
        'ok'          => true,
        'platform'    => 'tiktok',
        'contentType' => 'profile',
        'authorName'  => $handle ?: 'TikTok',
        'authorHandle'=> '@' . ($handle ?: 'tiktok'),
        'authorUrl'   => $cleanUrl,
        'authorAvatar'=> '',
        'title'       => 'Neuste Clips von @' . ($handle ?: 'tiktok'),
        'text'        => 'Entdecke unsere aktuellen Kurzvideos und Behind-the-Scenes Clips auf TikTok.',
        'mediaUrl'    => '',
        'videoId'     => '',
        'embedUrl'    => '',
        'postUrl'     => $cleanUrl,
        'publishedAt' => date('c'),
        'metrics'     => 'TikTok Kanal',
    ];
}

/* ==========================================================================
   6. MASTODON & RSS / PODCAST FEEDS
   ========================================================================== */
function sf_fetch_rss_or_mastodon(string $inputUrl, string $platform): array
{
    $feedUrl = $inputUrl;
    if ($platform === 'mastodon' && !str_ends_with($feedUrl, '.rss')) {
        $feedUrl = rtrim($feedUrl, '/') . '.rss';
    }

    $xmlRaw = sf_http_get($feedUrl);
    $xml = @simplexml_load_string($xmlRaw);
    if (!$xml) {
        return ['ok' => false, 'error' => 'Feed unter ' . $feedUrl . ' konnte nicht gelesen werden.'];
    }

    // RSS 2.0 (<channel><item>)
    if (isset($xml->channel->item[0])) {
        $chTitle = (string) ($xml->channel->title ?? 'Feed');
        $item = $xml->channel->item[0];
        $title = trim((string) ($item->title ?? ''));
        $desc = trim(strip_tags((string) ($item->description ?? '')));
        $link = (string) ($item->link ?? $inputUrl);
        $pubDate = (string) ($item->pubDate ?? date('c'));

        $mediaUrl = '';
        if (isset($item->enclosure['url'])) {
            $type = (string) ($item->enclosure['type'] ?? '');
            if (strpos($type, 'image/') === 0) {
                $mediaUrl = (string) $item->enclosure['url'];
            }
        }
        $mediaNs = $item->children('http://search.yahoo.com/mrss/');
        if ($mediaUrl === '' && isset($mediaNs->content)) {
            $attrs = $mediaNs->content->attributes();
            if (!empty($attrs['url'])) {
                $mediaUrl = (string) $attrs['url'];
            }
        }

        return [
            'ok'          => true,
            'platform'    => $platform,
            'contentType' => 'post',
            'authorName'  => $chTitle,
            'authorHandle'=> $platform === 'mastodon' ? ('@' . basename(rtrim($inputUrl, '/'))) : $chTitle,
            'authorUrl'   => $inputUrl,
            'authorAvatar'=> '',
            'title'       => $title ?: (mb_substr($desc, 0, 80) . '…'),
            'text'        => mb_substr($desc, 0, 320),
            'mediaUrl'    => $mediaUrl,
            'videoId'     => '',
            'embedUrl'    => '',
            'postUrl'     => $link,
            'publishedAt' => date('c', strtotime($pubDate) ?: time()),
            'metrics'     => 'Aktuellster Beitrag',
        ];
    }

    return ['ok' => false, 'error' => 'Keine Einträge im Feed gefunden.'];
}

try {
    if ($platform === 'youtube') {
        $result = sf_fetch_youtube($accountUrl);
    } elseif ($platform === 'instagram') {
        $result = sf_fetch_instagram($accountUrl);
    } elseif ($platform === 'x' || $platform === 'twitter') {
        $result = sf_fetch_x($accountUrl);
    } elseif ($platform === 'bluesky') {
        $result = sf_fetch_bluesky($accountUrl);
    } elseif ($platform === 'tiktok') {
        $result = sf_fetch_tiktok($accountUrl);
    } else {
        $result = sf_fetch_rss_or_mastodon($accountUrl, $platform);
    }
} catch (Throwable $e) {
    $result = ['ok' => false, 'error' => 'Fehler beim Abrufen: ' . $e->getMessage()];
}

if (!empty($result['ok'])) {
    // Wenn X/TikTok bei einem Refresh temporär Rate-Limited ist (contentType === 'profile')
    // und wir bereits einen echten gecachten Post in der DB haben, behalten wir den echten Post!
    if (($result['contentType'] ?? '') === 'profile' && !empty($existingCache['payload_json'])) {
        $prev = json_decode((string) $existingCache['payload_json'], true);
        if (is_array($prev) && !empty($prev['ok']) && ($prev['contentType'] ?? '') !== 'profile') {
            $prev['cached'] = true;
            echo json_encode($prev, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    $stmt = $pdo->prepare('
        INSERT INTO social_cache (cache_key, payload_json, fetched_at)
        VALUES (:k, :v, :t)
        ON CONFLICT(cache_key) DO UPDATE SET payload_json = excluded.payload_json, fetched_at = excluded.fetched_at
    ');
    $stmt->execute([
        ':k' => $cacheKey,
        ':v' => json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':t' => time(),
    ]);
} elseif (!empty($existingCache['payload_json'])) {
    // Stale-While-Error Fallback: lieber letzten funktionierenden Stand zeigen als Fehler
    $prev = json_decode((string) $existingCache['payload_json'], true);
    if (is_array($prev) && !empty($prev['ok'])) {
        $prev['cached'] = true;
        echo json_encode($prev, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
