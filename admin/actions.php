<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = require_login();
$pdo = get_db();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_check($_POST['csrf'] ?? null)) {
    http_response_code(400);
    exit('Ungültige Anfrage.');
}

$action = $_POST['action'] ?? '';
$id = (int) ($_POST['id'] ?? 0);

switch ($action) {
    case 'mark_answered':
    case 'mark_unanswered':
        $stmt = $pdo->prepare('UPDATE submissions SET answered_at = :v WHERE id = :id');
        $stmt->execute([':v' => $action === 'mark_answered' ? date('c') : null, ':id' => $id]);
        header('Location: submission.php?id=' . $id);
        exit;

    case 'delete_submission':
        $stmt = $pdo->prepare('DELETE FROM submissions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        header('Location: dashboard.php?deleted=1');
        exit;

    case 'delete_user':
        if ($id === (int) $user['id']) {
            header('Location: users.php?error=self');
            exit;
        }
        $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if ($count <= 1) {
            header('Location: users.php?error=last');
            exit;
        }
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        header('Location: users.php?deleted=1');
        exit;

    default:
        http_response_code(400);
        exit('Unbekannte Aktion.');
}
