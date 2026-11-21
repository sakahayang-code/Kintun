<?php
/**
 * Kintun - Auto Cleanup Cron Job
 * 
 * Jalankan file ini secara otomatis via Cron Job cPanel (misalnya setiap 5 atau 10 menit):
 * Command: php -q /home/USER/public_html/kintun/cron.php
 * Atau via URL: https://multimediatama.com/kintun/cron.php
 */

$uploadDir = __DIR__ . '/uploads';

function deleteDir($dir) {
    if (!is_dir($dir)) return;
    $files = array_diff(scandir($dir), ['.', '..']);
    foreach ($files as $file) {
        (is_dir("$dir/$file")) ? deleteDir("$dir/$file") : @unlink("$dir/$file");
    }
    @rmdir($dir);
}

$deletedCount = 0;
if (is_dir($uploadDir)) {
    $now = round(microtime(true) * 1000);
    $nowSec = time();
    $items = scandir($uploadDir);

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $uploadDir . '/' . $item;

        // Bersihkan alias link_*.txt yang >= 10 menit (600 detik)
        if (is_file($path) && strpos($item, 'link_') === 0) {
            if (($nowSec - filemtime($path)) >= 600) {
                @unlink($path);
                $deletedCount++;
            }
            continue;
        }

        if (is_dir($path)) {
            $metaFile = $path . '/meta.json';
            $shouldDelete = false;

            if (is_file($metaFile)) {
                $meta = json_decode(file_get_contents($metaFile), true);
                if ($meta && isset($meta['expiresAt']) && $meta['expiresAt'] <= $now) {
                    $shouldDelete = true;
                }
            }

            // Fail-safe jika folder berumur >= 10 menit (600 detik)
            if (!$shouldDelete && ($nowSec - filemtime($path)) >= 600) {
                $shouldDelete = true;
            }

            if ($shouldDelete) {
                deleteDir($path);
                $deletedCount++;
            }
        }
    }
}

// Respon output
if (php_sapi_name() === 'cli') {
    echo "[" . date('Y-m-d H:i:s') . "] Kintun Cleanup: Berhasil menghapus $deletedCount berkas/folder kedaluwarsa.\n";
} else {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'success',
        'message' => "Berhasil membersihkan $deletedCount transfer kedaluwarsa",
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
