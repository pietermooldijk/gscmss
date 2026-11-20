<?php
/** @var array $user aus current_user() */
?>
  <div class="admin-topbar">
    <div class="admin-topbar__brand">Gamet Studios — Dashboard</div>
    <nav class="admin-topbar__nav">
      <a href="/cms/" style="color:var(--accent); font-weight:600;">✦ Gamet Studios CMSS</a>
      <a href="dashboard.php">Einsendungen</a>
      <a href="users.php">Team</a>
      <span>Angemeldet als <?= htmlspecialchars($user['name']) ?></span>
      <a href="logout.php">Abmelden</a>
    </nav>
  </div>
