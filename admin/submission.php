<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = require_login();
$pdo = get_db();

$id = (int) ($_GET['id'] ?? 0);
$stmt = $pdo->prepare('SELECT * FROM submissions WHERE id = :id');
$stmt->execute([':id' => $id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    header('Location: dashboard.php');
    exit;
}

if (!$row['read_at']) {
    $upd = $pdo->prepare('UPDATE submissions SET read_at = :now WHERE id = :id');
    $upd->execute([':now' => date('c'), ':id' => $id]);
}

$fields = json_decode($row['data_json'], true) ?: [];
$labels = ['contact' => 'Kontakt', 'careers' => 'Bewerbung'];

// Menschlich lesbare Labels, wo bekannt — unbekannte Felder zeigen den rohen Namen.
$fieldLabels = [
    'name' => 'Name',
    'email' => 'E-Mail',
    'subject' => 'Betreff',
    'project' => 'Projekt/Marke',
    'links' => 'Links',
    'message' => 'Nachricht',
];

$title = 'Einsendung #' . $id;
require __DIR__ . '/includes/layout-top.php';
require __DIR__ . '/includes/topbar.php';
?>
  <main class="admin-main">
    <a class="admin-back" href="dashboard.php">&larr; Zurück zur Liste</a>
    <h1 class="admin-h1">
      <span class="pill pill--outline"><?= htmlspecialchars($labels[$row['form_key']] ?? $row['form_key']) ?></span>
      <?= htmlspecialchars($row['name'] ?? '') ?>
      <?php if ($row['answered_at']): ?><span class="pill admin-pill--answered">Beantwortet</span><?php endif; ?>
    </h1>

    <div class="admin-actions">
      <form method="post" action="actions.php">
        <input type="hidden" name="csrf" value="<?= csrf_token() ?>" />
        <input type="hidden" name="id" value="<?= (int) $row['id'] ?>" />
        <input type="hidden" name="action" value="<?= $row['answered_at'] ? 'mark_unanswered' : 'mark_answered' ?>" />
        <button class="btn btn--secondary" type="submit">
          <?= $row['answered_at'] ? 'Als unbeantwortet markieren' : 'Als beantwortet markieren' ?>
        </button>
      </form>
      <form method="post" action="actions.php" onsubmit="return confirm('Diese Einsendung wirklich unwiderruflich löschen?');">
        <input type="hidden" name="csrf" value="<?= csrf_token() ?>" />
        <input type="hidden" name="id" value="<?= (int) $row['id'] ?>" />
        <input type="hidden" name="action" value="delete_submission" />
        <button class="btn btn--ghost admin-btn--danger" type="submit">Einsendung löschen</button>
      </form>
    </div>

    <div class="admin-detail">
      <div class="admin-detail__row">
        <div class="admin-detail__label">Eingegangen</div>
        <div class="admin-detail__value"><?= htmlspecialchars(date('d.m.Y H:i', strtotime($row['created_at']))) ?> <?= htmlspecialchars(date('T', strtotime($row['created_at']))) ?></div>
      </div>
      <?php foreach ($fields as $key => $value): ?>
        <?php if ($value === '' || $value === null) continue; ?>
        <div class="admin-detail__row">
          <div class="admin-detail__label"><?= htmlspecialchars($fieldLabels[$key] ?? $key) ?></div>
          <div class="admin-detail__value"><?= nl2br(htmlspecialchars((string) $value)) ?></div>
        </div>
      <?php endforeach; ?>
    </div>
  </main>
<?php require __DIR__ . '/includes/layout-bottom.php'; ?>
