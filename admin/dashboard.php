<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = require_login();
$pdo = get_db();

$rows = $pdo->query('SELECT * FROM submissions ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
$labels = ['contact' => 'Kontakt', 'careers' => 'Bewerbung'];

$title = 'Einsendungen';
require __DIR__ . '/includes/layout-top.php';
require __DIR__ . '/includes/topbar.php';
?>
  <main class="admin-main">
    <h1 class="admin-h1">Einsendungen</h1>
    <?php if (isset($_GET['deleted'])): ?><p class="admin-success">Einsendung gelöscht.</p><?php endif; ?>
    <?php if (!$rows): ?>
      <p class="admin-empty">Noch keine Einsendungen.</p>
    <?php else: ?>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Typ</th>
            <th>Name</th>
            <th>Betreff</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($rows as $r): ?>
            <tr class="<?= $r['read_at'] ? '' : 'is-unread' ?>" onclick="location.href='submission.php?id=<?= (int) $r['id'] ?>'">
              <td><?= htmlspecialchars(str_replace('T', ' ', substr($r['created_at'], 0, 16))) ?></td>
              <td><span class="pill pill--outline"><?= htmlspecialchars($labels[$r['form_key']] ?? $r['form_key']) ?></span></td>
              <td><?= htmlspecialchars($r['name'] ?? '') ?></td>
              <td><?= htmlspecialchars($r['subject'] ?? '') ?></td>
              <td><?php if ($r['answered_at']): ?><span class="pill admin-pill--answered">Beantwortet</span><?php endif; ?></td>
              <td>
                <form method="post" action="actions.php" onclick="event.stopPropagation();" onsubmit="return confirm('Diese Einsendung wirklich unwiderruflich löschen?');">
                  <input type="hidden" name="csrf" value="<?= csrf_token() ?>" />
                  <input type="hidden" name="id" value="<?= (int) $r['id'] ?>" />
                  <input type="hidden" name="action" value="delete_submission" />
                  <button class="admin-icon-btn" type="submit" title="Löschen" aria-label="Löschen">&times;</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </main>
<?php require __DIR__ . '/includes/layout-bottom.php'; ?>
