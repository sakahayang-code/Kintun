<?php
/**
 * Kintun - PHP Backend Handler
 * Mendukung Apache / cPanel / Shared Hosting (PHP 7.4 - 8.x)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0777, true);
}

// Bersihkan transfer kedaluwarsa secara berkala
function cleanupExpiredTransfers($uploadDir) {
    if (!is_dir($uploadDir)) return;
    $now = round(microtime(true) * 1000);
    $items = scandir($uploadDir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $folder = $uploadDir . '/' . $item;
        $metaFile = $folder . '/meta.json';
        if (is_file($metaFile)) {
            $meta = json_decode(file_get_contents($metaFile), true);
            if ($meta && isset($meta['expiresAt']) && $meta['expiresAt'] <= $now) {
                deleteDir($folder);
            }
        }
    }
}

function deleteDir($dir) {
    if (!is_dir($dir)) return;
    $files = array_diff(scandir($dir), ['.', '..']);
    foreach ($files as $file) {
        (is_dir("$dir/$file")) ? deleteDir("$dir/$file") : @unlink("$dir/$file");
    }
    @rmdir($dir);
}

// Jalankan pembersihan berkas kedaluwarsa
cleanupExpiredTransfers($uploadDir);

// Ekstraksi route dari request URL
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
if (empty($route) && isset($_SERVER['PATH_INFO'])) {
    $route = trim($_SERVER['PATH_INFO'], '/');
}
if (empty($route)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#/api/(.*)$#', $uri, $m)) {
        $route = $m[1];
    }
}

$parts = explode('/', $route);
$endpoint = $parts[0] ?? '';

// 1. ENDPOINT: Upload File (POST api/upload)
if ($endpoint === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $uploadedFiles = $_FILES['files'] ?? (!empty($_FILES) ? reset($_FILES) : null);
    if (empty($uploadedFiles) || empty($uploadedFiles['name'])) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Tidak ada berkas yang diunggah']);
        exit;
    }

    $mode = (isset($_POST['mode']) && $_POST['mode'] === 'link') ? 'link' : 'direct';
    $now = round(microtime(true) * 1000);
    $ttl = ($mode === 'direct') ? (10 * 60 * 1000) : (48 * 60 * 60 * 1000);
    $expiresAt = $now + $ttl;

    // Buat 6-digit key unik
    do {
        $key = (string) rand(100000, 999999);
        $keyDir = $uploadDir . '/' . $key;
    } while (is_dir($keyDir));

    @mkdir($keyDir, 0777, true);
    $linkId = substr(md5(uniqid(rand(), true)), 0, 8);

    $fileList = [];
    $totalSize = 0;

    $names = is_array($uploadedFiles['name']) ? $uploadedFiles['name'] : [$uploadedFiles['name']];
    $tmpNames = is_array($uploadedFiles['tmp_name']) ? $uploadedFiles['tmp_name'] : [$uploadedFiles['tmp_name']];
    $sizes = is_array($uploadedFiles['size']) ? $uploadedFiles['size'] : [$uploadedFiles['size']];
    $types = is_array($uploadedFiles['type']) ? $uploadedFiles['type'] : [$uploadedFiles['type']];

    for ($i = 0; $i < count($names); $i++) {
        $origName = $names[$i];
        $safeName = time() . '_' . $i . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $origName);
        $destPath = $keyDir . '/' . $safeName;
        if (move_uploaded_file($tmpNames[$i], $destPath)) {
            $sz = (int) $sizes[$i];
            $totalSize += $sz;
            $fileList[] = [
                'index' => $i,
                'name' => $origName,
                'filename' => $safeName,
                'size' => $sz,
                'type' => $types[$i]
            ];
        }
    }

    $meta = [
        'key' => $key,
        'linkId' => $linkId,
        'mode' => $mode,
        'createdAt' => $now,
        'expiresAt' => $expiresAt,
        'ttl' => $ttl,
        'totalSize' => $totalSize,
        'filesCount' => count($fileList),
        'downloadCount' => 0,
        'files' => $fileList
    ];

    file_put_contents($keyDir . '/meta.json', json_encode($meta, JSON_PRETTY_PRINT));
    file_put_contents($uploadDir . '/link_' . $linkId . '.txt', $key);

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
    $baseAppUrl = rtrim($protocol . "://" . $host . $scriptDir, '/');
    $shareUrl = $baseAppUrl . '/?key=' . $key;

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'key' => $key,
        'linkId' => $linkId,
        'mode' => $mode,
        'expiresAt' => $expiresAt,
        'ttlSeconds' => round($ttl / 1000),
        'totalSize' => $totalSize,
        'filesCount' => count($fileList),
        'files' => array_map(function($f) {
            return [
                'index' => $f['index'],
                'name' => $f['name'],
                'size' => $f['size'],
                'type' => $f['type']
            ];
        }, $fileList),
        'shareUrl' => $shareUrl
    ]);
    exit;
}

// 2. ENDPOINT: Transfer Info (GET api/transfer/<key>)
if ($endpoint === 'transfer' && isset($parts[1])) {
    $identifier = $parts[1];
    $key = $identifier;
    if (file_exists($uploadDir . '/link_' . $identifier . '.txt')) {
        $key = trim(file_get_contents($uploadDir . '/link_' . $identifier . '.txt'));
    }

    $keyDir = $uploadDir . '/' . $key;
    $metaFile = $keyDir . '/meta.json';

    if (!is_dir($keyDir) || !file_exists($metaFile)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Kunci atau tautan transfer tidak ditemukan atau telah kedaluwarsa']);
        exit;
    }

    $meta = json_decode(file_get_contents($metaFile), true);
    $now = round(microtime(true) * 1000);
    if ($meta['expiresAt'] <= $now) {
        deleteDir($keyDir);
        http_response_code(410);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Transfer telah kedaluwarsa']);
        exit;
    }

    $remainingSeconds = max(0, round(($meta['expiresAt'] - $now) / 1000));

    header('Content-Type: application/json');
    echo json_encode([
        'key' => $meta['key'],
        'linkId' => $meta['linkId'],
        'mode' => $meta['mode'],
        'createdAt' => $meta['createdAt'],
        'expiresAt' => $meta['expiresAt'],
        'remainingSeconds' => $remainingSeconds,
        'totalSize' => $meta['totalSize'],
        'filesCount' => $meta['filesCount'],
        'downloadCount' => $meta['downloadCount'],
        'files' => array_map(function($f) {
            return [
                'index' => $f['index'],
                'name' => $f['name'],
                'size' => $f['size'],
                'type' => $f['type']
            ];
        }, $meta['files'])
    ]);
    exit;
}

// 3. ENDPOINT: Download Satuan (GET api/download/<key>/<index>)
if ($endpoint === 'download' && isset($parts[1]) && isset($parts[2])) {
    $key = $parts[1];
    $fileIndex = (int) $parts[2];

    $keyDir = $uploadDir . '/' . $key;
    $metaFile = $keyDir . '/meta.json';

    if (!is_dir($keyDir) || !file_exists($metaFile)) {
        http_response_code(404);
        die('Transfer tidak ditemukan atau telah kedaluwarsa');
    }

    $meta = json_decode(file_get_contents($metaFile), true);
    $targetFile = null;
    foreach ($meta['files'] as $f) {
        if ($f['index'] === $fileIndex) {
            $targetFile = $f;
            break;
        }
    }

    if (!$targetFile) {
        http_response_code(404);
        die('Berkas tidak ditemukan');
    }

    $filePath = $keyDir . '/' . $targetFile['filename'];
    if (!file_exists($filePath)) {
        http_response_code(404);
        die('Berkas fisik tidak ditemukan di server');
    }

    $meta['downloadCount']++;
    file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT));

    header('Content-Description: File Transfer');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . basename($targetFile['name']) . '"');
    header('Expires: 0');
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . filesize($filePath));
    readfile($filePath);
    exit;
}

// 4. ENDPOINT: Download Semua Format ZIP (GET api/download-all/<key>)
if ($endpoint === 'download-all' && isset($parts[1])) {
    $key = $parts[1];
    $keyDir = $uploadDir . '/' . $key;
    $metaFile = $keyDir . '/meta.json';

    if (!is_dir($keyDir) || !file_exists($metaFile)) {
        http_response_code(404);
        die('Transfer tidak ditemukan atau telah kedaluwarsa');
    }

    $meta = json_decode(file_get_contents($metaFile), true);
    $meta['downloadCount']++;
    file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT));

    $zipName = "Kintun_" . $key . ".zip";
    $zipTempPath = $keyDir . '/' . $zipName;

    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($zipTempPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            foreach ($meta['files'] as $f) {
                $filePath = $keyDir . '/' . $f['filename'];
                if (file_exists($filePath)) {
                    $zip->addFile($filePath, $f['name']);
                }
            }
            $zip->close();

            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $zipName . '"');
            header('Content-Length: ' . filesize($zipTempPath));
            readfile($zipTempPath);
            @unlink($zipTempPath);
            exit;
        }
    }

    http_response_code(500);
    die('Modul ZipArchive belum aktif di server PHP');
}

// Fallback status
header('Content-Type: application/json');
echo json_encode([
    'status' => 'online',
    'app' => 'Kintun API (PHP Backend)',
    'time' => date('Y-m-d H:i:s')
]);
