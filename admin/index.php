<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/oidc.php';

$pdo = get_db();
$userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$oidcReady = oidc_is_ready();
$allowLocal = !$oidcReady || get_setting('oidc_allow_local_fallback', '0') === '1';

// Noch kein Team-Mitglied angelegt und kein OIDC aktiv -> erst den Bootstrap-Account einrichten.
if (!$oidcReady && $userCount === 0) {
    header('Location: users.php');
    exit;
}

if (current_user()) {
    header('Location: dashboard.php');
    exit;
}

$error = trim((string) ($_GET['oidc_error'] ?? ''));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$allowLocal) {
        $error = 'Lokaler Login ist deaktiviert. Bitte über Authentik anmelden.';
    } else {
        $clientIp = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        if (!check_login_rate_limit($clientIp)) {
            $error = 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte warte 15 Minuten.';
        } else {
            $email = trim($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';

            $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
            $stmt->execute([':email' => $email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password_hash'])) {
                clear_failed_logins($clientIp);
                login($user);
                header('Location: dashboard.php');
                exit;
            }
            record_failed_login($clientIp);
            $error = 'E-Mail oder Passwort ist falsch.';
        }
    }
}

$title = 'Login';
require __DIR__ . '/includes/layout-top.php';
?>
  <div class="admin-login">
    <div class="admin-login__card">
      <h1>Team-Dashboard</h1>
      <?php if ($error): ?><p class="admin-error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
      <?php if ($oidcReady): ?>
        <a class="btn btn--primary" href="/api/oidc.php?action=login&app=admin" style="width:100%; display:inline-flex; justify-content:center; text-decoration:none; margin-bottom:1rem;">Mit Authentik anmelden</a>
      <?php endif; ?>
      <?php if ($allowLocal): ?>
        <?php if ($oidcReady): ?>
          <details style="margin-top:0.5rem;">
            <summary style="cursor:pointer; font-size:0.85rem; opacity:0.75;">Lokaler Notfall-Login</summary>
            <div style="margin-top:0.75rem;">
        <?php endif; ?>
        <form method="post">
          <div class="admin-field">
            <label for="email">E-Mail</label>
            <input type="email" id="email" name="email" required autofocus />
          </div>
          <div class="admin-field">
            <label for="password">Passwort</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button class="btn <?= $oidcReady ? 'btn--secondary' : 'btn--primary' ?>" type="submit" style="width:100%;">Anmelden</button>
        </form>
        <?php if ($oidcReady): ?>
            </div>
          </details>
        <?php endif; ?>
      <?php endif; ?>
    </div>
  </div>
<?php require __DIR__ . '/includes/layout-bottom.php'; ?>
