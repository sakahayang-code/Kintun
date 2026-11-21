const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { ZipArchive } = require('archiver');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join('/tmp', 'send-anywhere-uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// In-memory transfers store
// key -> transfer details
const transfers = new Map();

// Helper to generate 6-digit key
function generate6DigitKey() {
  let key;
  do {
    key = Math.floor(100000 + Math.random() * 900000).toString();
  } while (transfers.has(key));
  return key;
}

// Helper to generate share link ID (8 chars)
function generateLinkId() {
  return Math.random().toString(36).substring(2, 10);
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB per file for local demo
});

// Periodic cleanup of expired transfers
setInterval(() => {
  const now = Date.now();
  for (const [key, transfer] of transfers.entries()) {
    if (transfer.expiresAt <= now) {
      console.log(`[CLEANUP] Transfer expired: ${key}`);
      if (transfer.files && Array.isArray(transfer.files)) {
        for (const file of transfer.files) {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (err) {
            console.error(`Failed to delete file ${file.path}:`, err.message);
          }
        }
      }
      transfers.delete(key);
    }
  }
}, 30000);

// API: Upload files
app.post('/api/upload', upload.any(), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const mode = req.body.mode === 'link' ? 'link' : 'direct';
    const now = Date.now();
    
    // Direct transfer expires in 10 minutes (600,000ms), Link transfer expires in 48 hours
    const ttl = mode === 'direct' ? 10 * 60 * 1000 : 48 * 60 * 60 * 1000;
    const expiresAt = now + ttl;

    const key = generate6DigitKey();
    const linkId = generateLinkId();

    const fileList = req.files.map((f, index) => ({
      index,
      originalname: Buffer.from(f.originalname, 'latin1').toString('utf8'), // fix UTF8 filename
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype,
      path: f.path
    }));

    const totalSize = fileList.reduce((acc, f) => acc + f.size, 0);

    const transferData = {
      key,
      linkId,
      mode,
      createdAt: now,
      expiresAt,
      ttl,
      totalSize,
      files: fileList,
      downloadCount: 0,
      sockets: new Set()
    };

    transfers.set(key, transferData);
    transfers.set(linkId, transferData);

    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol || 'http';
    const shareUrl = `${protocol}://${host}/?key=${key}`;

    res.json({
      success: true,
      key,
      linkId,
      mode,
      expiresAt,
      ttlSeconds: Math.floor(ttl / 1000),
      totalSize,
      filesCount: fileList.length,
      files: fileList.map(f => ({
        index: f.index,
        name: f.originalname,
        size: f.size,
        type: f.mimetype
      })),
      shareUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// API: Verify & Get Transfer Metadata
app.get('/api/transfer/:identifier', (req, res) => {
  const { identifier } = req.params;
  const transfer = transfers.get(identifier);

  if (!transfer) {
    return res.status(404).json({ error: 'Kunci atau tautan transfer tidak ditemukan atau telah kedaluwarsa' });
  }

  const now = Date.now();
  if (transfer.expiresAt <= now) {
    transfers.delete(identifier);
    return res.status(410).json({ error: 'Transfer telah kedaluwarsa' });
  }

  const remainingSeconds = Math.max(0, Math.floor((transfer.expiresAt - now) / 1000));

  res.json({
    key: transfer.key,
    linkId: transfer.linkId,
    mode: transfer.mode,
    createdAt: transfer.createdAt,
    expiresAt: transfer.expiresAt,
    remainingSeconds,
    totalSize: transfer.totalSize,
    filesCount: transfer.files.length,
    downloadCount: transfer.downloadCount,
    files: transfer.files.map(f => ({
      index: f.index,
      name: f.originalname,
      size: f.size,
      type: f.mimetype
    }))
  });
});

// API: Download single file
app.get('/api/download/:identifier/:fileIndex', (req, res) => {
  const { identifier, fileIndex } = req.params;
  const transfer = transfers.get(identifier);

  if (!transfer) {
    return res.status(404).send('Transfer not found or expired');
  }

  const idx = parseInt(fileIndex, 10);
  const file = transfer.files.find(f => f.index === idx);

  if (!file || !fs.existsSync(file.path)) {
    return res.status(404).send('File not found on server');
  }

  transfer.downloadCount++;

  // Notify sender via WebSocket
  notifyTransferPeers(transfer, {
    type: 'file_download_started',
    fileIndex: idx,
    fileName: file.originalname,
    downloadCount: transfer.downloadCount
  });

  res.download(file.path, file.originalname, (err) => {
    if (!err) {
      notifyTransferPeers(transfer, {
        type: 'file_download_completed',
        fileIndex: idx,
        fileName: file.originalname,
        downloadCount: transfer.downloadCount
      });
    }
  });
});

// API: Download all files as ZIP
app.get('/api/download-all/:identifier', (req, res) => {
  const { identifier } = req.params;
  const transfer = transfers.get(identifier);

  if (!transfer) {
    return res.status(404).send('Transfer not found or expired');
  }

  transfer.downloadCount++;

  notifyTransferPeers(transfer, {
    type: 'zip_download_started',
    key: transfer.key,
    downloadCount: transfer.downloadCount
  });

  const zipName = `Kintun_${transfer.key}.zip`;
  res.attachment(zipName);

  const archive = new ZipArchive({
    zlib: { level: 9 }
  });

  archive.on('error', (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  for (const file of transfer.files) {
    if (fs.existsSync(file.path)) {
      archive.file(file.path, { name: file.originalname });
    }
  }

  archive.finalize();
});

// WebSocket Signaling & Real-time notifications
function notifyTransferPeers(transfer, message) {
  if (!transfer || !transfer.sockets) return;
  const payload = JSON.stringify(message);
  for (const ws of transfer.sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  let attachedKey = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe') {
        const { key } = data;
        const transfer = transfers.get(key);
        if (transfer) {
          attachedKey = key;
          transfer.sockets.add(ws);
          ws.send(JSON.stringify({ type: 'subscribed', key }));
          
          // If this is a receiver subscribing, notify the sender!
          if (data.role === 'receiver') {
            notifyTransferPeers(transfer, {
              type: 'receiver_connected',
              key,
              timestamp: Date.now()
            });
          }
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Transfer not found' }));
        }
      }

      // WebRTC or custom peer signaling passthrough
      if (data.type === 'signal') {
        const transfer = transfers.get(data.key);
        if (transfer) {
          for (const peer of transfer.sockets) {
            if (peer !== ws && peer.readyState === ws.OPEN) {
              peer.send(JSON.stringify({
                type: 'signal',
                payload: data.payload,
                fromRole: data.role
              }));
            }
          }
        }
      }
    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', () => {
    if (attachedKey && transfers.has(attachedKey)) {
      const transfer = transfers.get(attachedKey);
      transfer.sockets.delete(ws);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kintun server running on http://localhost:${PORT}`);
});
