<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$pdo = get_db();
$userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$bootstrap = $userCount === 0;

if (!$bootstrap) {
    require_login();
}

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$bootstrap && !csrf_check($_POST['csrf'] ?? null)) {
        $error = 'Sitzung abgelaufen, bitte Seite neu laden.';
    } else {
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if ($name === '' || $email === '' || strlen($password) < 8) {
            $error = 'Bitte Name, E-Mail und ein Passwort mit mindestens 8 Zeichen angeben.';
        } else {
            try {
                $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (:name, :email, :hash, :created_at)');
                $stmt->execute([
                    ':name' => $name,
                    ':email' => $email,
                    ':hash' => password_hash($password, PASSWORD_DEFAULT),
                    ':created_at' => date('c'),
                ]);
                if ($bootstrap) {
                    header('Location: index.php');
                    exit;
                }
                $success = "Account für {$name} wurde angelegt.";
            } catch (Throwable $e) {
                $error = 'Diese E-Mail-Adresse ist schon vergeben.';
            }
        }
    }
}

$users = $pdo->query('SELECT id, name, email, created_at FROM users ORDER BY created_at ASC')->fetchAll(PDO::FETCH_ASSOC);

$deleteError = '';
if (($_GET['error'] ?? '') === 'self') {
    $deleteError = 'Du kannst deinen eigenen Account nicht selbst löschen.';
} elseif (($_GET['error'] ?? '') === 'last') {
    $deleteError = 'Der letzte verbleibende Account kann nicht gelöscht werden.';
}

$title = $bootstrap ? 'Ersten Account anlegen' : 'Team verwalten';
require __DIR__ . '/includes/layout-top.php';
if (!$bootstrap) {
    require __DIR__ . '/includes/topbar.php';
}
?>
  <main class="admin-main">
    <h1 class="admin-h1"><?= $bootstrap ? 'Willkommen — ersten Account anlegen' : 'Team verwalten' ?></h1>
    <?php if ($bootstrap): ?>
      <p style="color:var(--fg-muted); margin-bottom: var(--space-6); max-width: 480px;">Es gibt noch keinen Account. Lege hier den ersten an — danach ist diese Seite nur noch für eingeloggte Team-Mitglieder erreichbar.</p>
    <?php endif; ?>
    <?php if ($error): ?><p class="admin-error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
    <?php if ($success): ?><p class="admin-success"><?= htmlspecialchars($success) ?></p><?php endif; ?>
    <form method="post" class="admin-form-narrow">
      <?php if (!$bootstrap): ?><input type="hidden" name="csrf" value="<?= csrf_token() ?>" /><?php endif; ?>
      <div class="admin-field">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" required />
      </div>
      <div class="admin-field">
        <label for="email">E-Mail</label>
        <input type="email" id="email" name="email" required />
      </div>
      <div class="admin-field">
        <label for="password">Passwort (mind. 8 Zeichen)</label>
        <input type="password" id="password" name="password" minlength="8" required />
      </div>
      <button class="btn btn--primary" type="submit"><?= $bootstrap ? 'Account anlegen & einloggen' : 'Teammitglied hinzufügen' ?></button>
    </form>

    <?php if (!$bootstrap): ?>
      <h2 class="admin-h2">Bestehende Accounts</h2>
      <?php if ($deleteError): ?><p class="admin-error"><?= htmlspecialchars($deleteError) ?></p><?php endif; ?>
      <?php if (isset($_GET['deleted'])): ?><p class="admin-success">Account gelöscht.</p><?php endif; ?>
      <table class="admin-table admin-table--static">
        <thead><tr><th>Name</th><th>E-Mail</th><th>Erstellt</th><th></th></tr></thead>
        <tbody>
          <?php foreach ($users as $u): ?>
            <tr>
              <td><?= htmlspecialchars($u['name']) ?></td>
              <td><?= htmlspecialchars($u['email']) ?></td>
              <td><?= htmlspecialchars(substr($u['created_at'], 0, 10)) ?></td>
              <td>
                <?php if ((int) $u['id'] !== (int) current_user()['id']): ?>
                  <form method="post" action="actions.php" onsubmit="return confirm('Account von <?= htmlspecialchars(addslashes($u['name'])) ?> wirklich löschen?');">
                    <input type="hidden" name="csrf" value="<?= csrf_token() ?>" />
                    <input type="hidden" name="id" value="<?= (int) $u['id'] ?>" />
                    <input type="hidden" name="action" value="delete_user" />
                    <button class="admin-icon-btn" type="submit" title="Löschen" aria-label="Löschen">&times;</button>
                  </form>
                <?php else: ?>
                  <span class="admin-self-hint">(du)</span>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </main>
<?php require __DIR__ . '/includes/layout-bottom.php'; ?>
