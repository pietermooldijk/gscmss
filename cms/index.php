<?php
/**
 * Gamet Studios CMSS (/cms/)
 * Bearbeitet Seiten-Abschnitte, Übergänge, Hintergrund-Bilder/-Videos,
 * Texte, Projekte, Mitglieder und Journal-Posts mit Echtzeit-Vorschau.
 */

declare(strict_types=1);

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/telemetry.php';
require_once __DIR__ . '/../includes/integrity.php';

get_db();
$tamperCheck = gs_verify_integrity();
if ($tamperCheck['tampered']) {
    http_response_code(403);
    $fEsc = htmlspecialchars($tamperCheck['file'], ENT_QUOTES, 'UTF-8');
    echo "<!doctype html><html lang='de'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>System gesperrt</title></head><body style='margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0b;color:#f5f5f6;font-family:system-ui,sans-serif;text-align:center;padding:2rem;'><div style='max-width:460px;'><div style='font-size:2.2rem;margin-bottom:0.75rem;'>🔒</div><h1 style='margin:0 0 0.75rem;font-size:1.4rem;'>Integritätsprüfung fehlgeschlagen</h1><p style='color:#a1a1aa;line-height:1.6;margin:0;'>Unerlaubte Code-Änderung erkannt ({$fEsc}). Das System wurde automatisch gesperrt.</p></div></body></html>";
    exit;
}
$hubCheck = gs_is_instance_disabled();
if ($hubCheck['disabled']) {
    http_response_code(403);
    $msg = htmlspecialchars($hubCheck['reason'] !== '' ? $hubCheck['reason'] : 'Diese CMSS-Instanz wurde vorübergehend deaktiviert.', ENT_QUOTES, 'UTF-8');
    echo "<!doctype html><html lang='de'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>CMSS Deaktiviert</title></head><body style='margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0b;color:#f5f5f6;font-family:system-ui,sans-serif;text-align:center;padding:2rem;'><div style='max-width:460px;'><div style='font-size:2.2rem;margin-bottom:0.75rem;'>⛔</div><h1 style='margin:0 0 0.75rem;font-size:1.4rem;'>CMSS-Instanz deaktiviert</h1><p style='color:#a1a1aa;line-height:1.6;margin:0;'>{$msg}</p></div></body></html>";
    exit;
}
?>
<!doctype html>
<html lang="de" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Gamet Studios CMSS</title>
  <link rel="icon" type="image/png" href="/assets/icons/favicon.png" />
  <link rel="stylesheet" href="/assets/css/fonts.css" />
  <link rel="stylesheet" href="/assets/css/tokens.css" />
  <link rel="stylesheet" href="/assets/css/reset.css" />
  <link rel="stylesheet" href="/assets/css/utilities.css" />
  <link rel="stylesheet" href="/cms/cms.css" />
</head>
<body>
  <!-- Hinweis auf Smartphones/kleinen Screens: Das CMSS ist bewusst nur am Desktop nutzbar -->
  <div class="cms-mobile-guard">
    <div class="cms-mobile-guard__card">
      <img src="/assets/icons/gs_logo_small_white.png" alt="Gamet Studios" style="height:2rem; width:auto; margin-bottom:1.25rem;" />
      <h1 style="font-family:var(--font-display); font-size:1.35rem; margin-bottom:0.5rem;">Nur am Desktop verfügbar</h1>
      <p style="color:var(--fg-muted); font-size:14px; margin-bottom:1.5rem;">
        Das <strong>Gamet Studios CMSS</strong> ist für die Bearbeitung an größeren Bildschirmen (Mac / PC) ausgelegt. Die öffentliche Webseite selbst funktioniert auf deinem Smartphone uneingeschränkt.
      </p>
      <a href="/de/" class="btn btn--primary" style="width:100%;">← Zur mobilen Webseite</a>
    </div>
  </div>

  <div id="gs-cms-splash" style="position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.85rem;background:#0a0a0b;opacity:1;transition:opacity 0.62s cubic-bezier(0.22,1,0.36,1),transform 0.62s cubic-bezier(0.22,1,0.36,1);pointer-events:none;">
    <img src="/assets/icons/gs_logo_small_white.png" alt="Gamet Studios" style="height:3.1rem;width:auto;" />
    <div style="width:140px;height:3px;border-radius:999px;background:rgba(255,255,255,0.14);overflow:hidden;">
      <div id="gs-cms-splash-fill" style="width:20%;height:100%;border-radius:999px;background:rgba(255,255,255,0.92);transition:width 0.8s cubic-bezier(0.22,1,0.36,1);"></div>
    </div>
  </div>
  <script>
    if (new URLSearchParams(location.search).get('nosplash') === '1') {
      document.getElementById('gs-cms-splash')?.remove();
    } else {
      requestAnimationFrame(()=>{const f=document.getElementById('gs-cms-splash-fill');if(f)f.style.width='100%';});
    }
  </script>
  <div id="gs-cms-app"></div>
  <script type="module" src="/cms/cms.js"></script>
</body>
</html>
