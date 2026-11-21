// Kintun - Client Application

// Internationalization Dictionaries
const i18n = {
  id: {
    heroTitle: 'Kirim apa saja, <span>ke mana saja</span>',
    heroSubtitle: 'Transfer file berkecepatan tinggi tanpa batas secara real-time atau buat tautan berbagi yang aman dan praktis.',
    navTransfer: 'Transfer',
    navHistory: 'Riwayat',
    navAbout: 'Cara Kerja',
    sendCardTitle: 'Kirim File',
    receiveCardTitle: 'Terima File',
    dropText: 'Tarik & lepas file di sini atau klik untuk memilih',
    dropSubtext: 'Mendukung semua format file hingga 10 GB',
    btnAddFiles: '+ Tambah File',
    btnAddFolder: '+ Tambah Folder',
    filesSelected: 'file terpilih',
    clearAll: 'Hapus Semua',
    modeDirect: 'Langsung (Kunci 6-Digit)',
    modeDirectDesc: '1:1 Real-time • Aktif selama 10 Menit',
    modeLink: 'Tautan Berbagi',
    modeLinkDesc: 'Bisa diunduh banyak orang • Aktif 48 Jam',
    btnSend: 'Kirim File Sekarang',
    keyTitle: 'KUNCI TRANSFER ANDA',
    btnCopyKey: 'Salin Kunci',
    expiresIn: 'Kedaluwarsa dalam:',
    qrScanHint: 'Pindai kode QR ini dengan ponsel Anda untuk mengunduh langsung',
    waitingReceiver: 'Menunggu penerima terhubung...',
    receiverConnected: '✓ Penerima terhubung! Sedang mengunduh...',
    copyLink: 'Salin Tautan',
    sendMore: '+ Kirim Berkas Lain',
    receivePlaceholder: 'Masukkan 6 Digit Kunci',
    btnScanQr: 'Pindai Kode QR Kamera / Gambar',
    recentKeys: 'Kunci Terkini',
    noRecentKeys: 'Belum ada riwayat kunci',
    modalReceiveTitle: 'Berkas Siap Diunduh',
    downloadAllZip: 'Unduh Semua (.ZIP)',
    downloadSingle: 'Unduh',
    preview: 'Pratinjau',
    historyTitle: 'Riwayat Transfer',
    clearHistory: 'Bersihkan Riwayat',
    noHistory: 'Belum ada riwayat transfer.',
    copiedSuccess: 'Berhasil disalin ke papan klip!',
    uploadSuccess: 'File berhasil disiapkan untuk transfer!',
    keyNotFound: 'Kunci atau tautan tidak ditemukan atau sudah kedaluwarsa.',
    serverStatus: 'Server Terhubung'
  },
  en: {
    heroTitle: 'Send whatever you want, <span>wherever you want</span>',
    heroSubtitle: 'Unlimited high-speed real-time file transfer or create secure, temporary shareable links.',
    navTransfer: 'Transfer',
    navHistory: 'History',
    navAbout: 'How it works',
    sendCardTitle: 'Send Files',
    receiveCardTitle: 'Receive Files',
    dropText: 'Drag & drop files here or click to browse',
    dropSubtext: 'Supports all formats up to 10 GB',
    btnAddFiles: '+ Add Files',
    btnAddFolder: '+ Add Folder',
    filesSelected: 'files selected',
    clearAll: 'Clear All',
    modeDirect: 'Direct (6-Digit Key)',
    modeDirectDesc: '1:1 Real-time • Expires in 10 Minutes',
    modeLink: 'Share Link',
    modeLinkDesc: 'Multi-download • Active for 48 Hours',
    btnSend: 'Send Files Now',
    keyTitle: 'YOUR TRANSFER KEY',
    btnCopyKey: 'Copy Key',
    expiresIn: 'Expires in:',
    qrScanHint: 'Scan this QR code with your phone to download immediately',
    waitingReceiver: 'Waiting for receiver to connect...',
    receiverConnected: '✓ Receiver connected! Downloading files...',
    copyLink: 'Copy Link',
    sendMore: '+ Send More Files',
    receivePlaceholder: 'Enter 6-Digit Key',
    btnScanQr: 'Scan QR with Camera / Image',
    recentKeys: 'Recent Keys',
    noRecentKeys: 'No recent keys',
    modalReceiveTitle: 'Files Ready to Download',
    downloadAllZip: 'Download All (.ZIP)',
    downloadSingle: 'Download',
    preview: 'Preview',
    historyTitle: 'Transfer History',
    clearHistory: 'Clear History',
    noHistory: 'No transfer history yet.',
    copiedSuccess: 'Copied to clipboard!',
    uploadSuccess: 'Files ready for transfer!',
    keyNotFound: 'Key or link not found or already expired.',
    serverStatus: 'Server Connected'
  }
};

let currentLang = 'id';
let selectedFiles = [];
let activeTransferKey = null;
let activeCountdownInterval = null;
let activeWs = null;

// Sound Synthesizer via Web Audio API
class SoundEffects {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }
  playTone(freq, type = 'sine', duration = 0.15) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }
  click() { this.playTone(520, 'sine', 0.08); }
  success() {
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(659.25, t + 0.1);
      osc.frequency.setValueAtTime(880, t + 0.2);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 0.4);
    } catch(e) {}
  }
}
const sfx = new SoundEffects();

// Format file size
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Get icon class and label by MIME/extension
function getFileTypeInfo(file) {
  const name = file.name.toLowerCase();
  const type = file.type || '';
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) {
    return { class: 'img', label: 'IMG' };
  }
  if (type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm)$/.test(name)) {
    return { class: 'video', label: 'VID' };
  }
  if (type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a)$/.test(name)) {
    return { class: 'audio', label: 'AUD' };
  }
  if (type.includes('pdf') || /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/.test(name)) {
    return { class: 'doc', label: 'DOC' };
  }
  if (/\.(zip|tar|gz|rar|7z)$/.test(name)) {
    return { class: 'zip', label: 'ZIP' };
  }
  return { class: 'other', label: 'FILE' };
}

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Local Storage Transfer History
const HISTORY_KEY = 'kintun_history';
function getHistory() {
  try {
    const val = localStorage.getItem(HISTORY_KEY) || localStorage.getItem('send_anywhere_history');
    return JSON.parse(val || '[]');
  } catch(e) {
    return [];
  }
}
function saveHistoryItem(item) {
  const history = getHistory();
  history.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
  renderHistory();
  renderRecentKeys();
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupLanguage();
  setupNavigation();
  setupDropzone();
  setupReceiveCard();
  setupModals();
  renderHistory();
  renderRecentKeys();

  // Check URL params (e.g. ?key=123456)
  const urlParams = new URLSearchParams(window.location.search);
  const keyParam = urlParams.get('key');
  if (keyParam) {
    document.getElementById('receiveKeyInput').value = keyParam.trim();
    executeReceive(keyParam.trim());
  }
});

// Setup Language
function setupLanguage() {
  const btnId = document.getElementById('langId');
  const btnEn = document.getElementById('langEn');

  function updateTexts() {
    const t = i18n[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        if (t[key].includes('<span')) {
          el.innerHTML = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (t[key]) el.placeholder = t[key];
    });

    btnId.classList.toggle('active', currentLang === 'id');
    btnEn.classList.toggle('active', currentLang === 'en');
  }

  btnId.addEventListener('click', () => {
    currentLang = 'id';
    updateTexts();
  });
  btnEn.addEventListener('click', () => {
    currentLang = 'en';
    updateTexts();
  });

  updateTexts();
}

// Navigation Tabs
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = {
    navTransfer: document.getElementById('viewTransfer'),
    navHistory: document.getElementById('viewHistory'),
    navAbout: document.getElementById('viewAbout')
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      sfx.click();
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const targetId = item.id;
      Object.keys(views).forEach(key => {
        if (views[key]) {
          views[key].classList.toggle('hidden', key !== targetId);
        }
      });
    });
  });

  document.querySelector('.brand').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('navTransfer').click();
  });
}

// Dropzone & File Handling
function setupDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');
  const queueSection = document.getElementById('fileQueueSection');
  const queueList = document.getElementById('fileQueueList');
  const queueSummary = document.getElementById('queueSummary');
  const btnClearQueue = document.getElementById('btnClearQueue');
  const btnStartSend = document.getElementById('btnStartSend');

  // Trigger file dialog
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    fileInput.click();
  });

  document.getElementById('btnBrowseFiles').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  document.getElementById('btnBrowseFolder').addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput.click();
  });

  fileInput.addEventListener('change', (e) => handleFilesAdded(e.target.files));
  folderInput.addEventListener('change', (e) => handleFilesAdded(e.target.files));

  // Drag & drop events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFilesAdded(dt.files);
    }
  });

  function handleFilesAdded(files) {
    sfx.click();
    for (let i = 0; i < files.length; i++) {
      selectedFiles.push(files[i]);
    }
    renderQueue();
  }

  function renderQueue() {
    if (selectedFiles.length === 0) {
      queueSection.classList.add('hidden');
      btnStartSend.disabled = true;
      return;
    }

    queueSection.classList.remove('hidden');
    btnStartSend.disabled = false;
    queueList.innerHTML = '';

    const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const t = i18n[currentLang];
    queueSummary.textContent = `${selectedFiles.length} ${t.filesSelected} (Total: ${formatBytes(totalBytes)})`;

    selectedFiles.forEach((file, index) => {
      const typeInfo = getFileTypeInfo(file);
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <div class="file-info">
          <div class="file-icon ${typeInfo.class}">${typeInfo.label}</div>
          <div class="file-meta">
            <span class="file-name" title="${file.name}">${file.name}</span>
            <span class="file-size">${formatBytes(file.size)}</span>
          </div>
        </div>
        <div class="file-actions">
          <button class="icon-btn delete" data-index="${index}" title="Hapus">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `;

      item.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles.splice(index, 1);
        renderQueue();
      });

      queueList.appendChild(item);
    });
  }

  btnClearQueue.addEventListener('click', () => {
    sfx.click();
    selectedFiles = [];
    fileInput.value = '';
    folderInput.value = '';
    renderQueue();
  });

  // Transfer Mode toggling
  const modeOptions = document.querySelectorAll('.mode-option');
  modeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      modeOptions.forEach(m => m.classList.remove('active'));
      opt.classList.add('active');
      opt.querySelector('input[type="radio"]').checked = true;
    });
  });

  // Start Send Action
  btnStartSend.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    sfx.click();

    const selectedMode = document.querySelector('input[name="transferMode"]:checked').value;
    await executeSend(selectedFiles, selectedMode);
  });
}

// Execute File Send Upload
async function executeSend(files, mode) {
  const btnStartSend = document.getElementById('btnStartSend');
  const uploadProgress = document.getElementById('sendUploadProgress');
  const progressBarFill = document.getElementById('sendProgressBarFill');
  const progressPercent = document.getElementById('sendProgressPercent');
  const sendSetupView = document.getElementById('sendSetupView');
  const transferActiveBox = document.getElementById('transferActiveBox');

  btnStartSend.disabled = true;
  uploadProgress.classList.remove('hidden');

  const formData = new FormData();
  formData.append('mode', mode);
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBarFill.style.width = percent + '%';
        progressPercent.textContent = `${percent}% (${formatBytes(e.loaded)} / ${formatBytes(e.total)})`;
      }
    };

    xhr.onload = function() {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        sfx.success();
        showToast(i18n[currentLang].uploadSuccess, 'success');
        displayActiveKey(response);
      } else {
        throw new Error('Upload gagal dengan status: ' + xhr.status);
      }
    };

    xhr.onerror = function() {
      // Fallback: If running purely client-side without backend server
      console.warn('Backend server not reachable, using client-side fallback store');
      fallbackClientSend(files, mode);
    };

    xhr.send(formData);
  } catch (err) {
    console.warn('Network upload exception, falling back to local simulation:', err);
    fallbackClientSend(files, mode);
  }
}

// Fallback for purely client-side demonstration or offline usage
function fallbackClientSend(files, mode) {
  const key = Math.floor(100000 + Math.random() * 900000).toString();
  const linkId = Math.random().toString(36).substring(2, 10);
  const now = Date.now();
  const ttl = mode === 'direct' ? 10 * 60 * 1000 : 48 * 60 * 60 * 1000;
  
  const fileItems = files.map((f, i) => ({
    index: i,
    name: f.name,
    size: f.size,
    type: f.type,
    fileObj: f
  }));

  const mockTransfer = {
    key,
    linkId,
    mode,
    expiresAt: now + ttl,
    ttlSeconds: Math.floor(ttl / 1000),
    totalSize: files.reduce((acc, f) => acc + f.size, 0),
    filesCount: files.length,
    files: fileItems,
    shareUrl: `${window.location.origin}/?key=${key}`
  };

  // Cache in window session & broadcast channel
  window.__clientTransfers = window.__clientTransfers || {};
  window.__clientTransfers[key] = mockTransfer;
  window.__clientTransfers[linkId] = mockTransfer;

  if (window.BroadcastChannel) {
    const bc = new BroadcastChannel('kintun_channel');
    bc.postMessage({ type: 'transfer_created', key });
  }

  setTimeout(() => {
    sfx.success();
    showToast(i18n[currentLang].uploadSuccess, 'success');
    displayActiveKey(mockTransfer);
  }, 600);
}

// Display Active Key and QR Code
function displayActiveKey(transfer) {
  activeTransferKey = transfer.key;
  const sendSetupView = document.getElementById('sendSetupView');
  const transferActiveBox = document.getElementById('transferActiveBox');
  const displayDigits = document.getElementById('keyDisplayDigits');
  const countdownTimer = document.getElementById('keyCountdownTimer');
  const shareLinkInput = document.getElementById('shareLinkInput');
  const qrWrapper = document.getElementById('qrCodeWrapper');
  const peerStatusPill = document.getElementById('peerStatusPill');

  sendSetupView.classList.add('hidden');
  transferActiveBox.classList.remove('hidden');

  // Format 6 digits with a space in the middle: "123 456"
  const formattedKey = transfer.key.slice(0, 3) + ' ' + transfer.key.slice(3);
  displayDigits.textContent = formattedKey;

  const currentOrigin = window.location.origin;
  const shareUrl = `${currentOrigin}/?key=${transfer.key}`;
  shareLinkInput.value = shareUrl;

  // Render QR Code
  qrWrapper.innerHTML = '';
  if (window.QRCode) {
    new QRCode(qrWrapper, {
      text: shareUrl,
      width: 140,
      height: 140,
      colorDark: "#1C2025",
      colorLight: "#FFFFFF",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    // Canvas/SVG simple QR placeholder
    qrWrapper.innerHTML = `<div style="width:140px;height:140px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:11px;font-family:monospace;padding:8px;text-align:center;">SCAN KEY:<br><b>${transfer.key}</b></div>`;
  }

  // Save to history
  saveHistoryItem({
    key: transfer.key,
    mode: transfer.mode,
    type: 'sent',
    filesCount: transfer.filesCount,
    totalSize: transfer.totalSize,
    timestamp: Date.now(),
    expiresAt: transfer.expiresAt
  });

  // Start Live Countdown Timer
  if (activeCountdownInterval) clearInterval(activeCountdownInterval);
  function updateCountdown() {
    const remainingMs = Math.max(0, transfer.expiresAt - Date.now());
    const totalSec = Math.floor(remainingMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    countdownTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (totalSec < 60) {
      countdownTimer.parentElement.classList.add('expiring');
    } else {
      countdownTimer.parentElement.classList.remove('expiring');
    }

    if (totalSec <= 0) {
      clearInterval(activeCountdownInterval);
      countdownTimer.textContent = '00:00 (Expired)';
      peerStatusPill.textContent = 'Kunci telah kedaluwarsa.';
      peerStatusPill.style.background = '#FEE2E2';
      peerStatusPill.style.color = '#DC2626';
    }
  }
  updateCountdown();
  activeCountdownInterval = setInterval(updateCountdown, 1000);

  // Subscribe to WebSocket for real-time peer connection
  connectSenderWs(transfer.key);

  // Setup Copy Actions
  document.getElementById('btnCopyKey').onclick = () => {
    sfx.click();
    navigator.clipboard.writeText(transfer.key);
    showToast(i18n[currentLang].copiedSuccess, 'success');
  };

  document.getElementById('btnCopyLink').onclick = () => {
    sfx.click();
    navigator.clipboard.writeText(shareUrl);
    showToast(i18n[currentLang].copiedSuccess, 'success');
  };

  document.getElementById('btnSendMore').onclick = () => {
    sfx.click();
    if (activeCountdownInterval) clearInterval(activeCountdownInterval);
    if (activeWs) activeWs.close();
    selectedFiles = [];
    document.getElementById('fileInput').value = '';
    document.getElementById('folderInput').value = '';
    document.getElementById('sendProgressBarFill').style.width = '0%';
    document.getElementById('sendUploadProgress').classList.add('hidden');
    document.getElementById('fileQueueSection').classList.add('hidden');
    document.getElementById('btnStartSend').disabled = true;
    transferActiveBox.classList.add('hidden');
    sendSetupView.classList.remove('hidden');
  };
}

// WebSocket Sender Listener
function connectSenderWs(key) {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    activeWs = new WebSocket(wsUrl);

    activeWs.onopen = () => {
      activeWs.send(JSON.stringify({ type: 'subscribe', key, role: 'sender' }));
    };

    activeWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const pill = document.getElementById('peerStatusPill');
        if (msg.type === 'receiver_connected') {
          pill.className = 'peer-status-pill connected';
          pill.innerHTML = `<span>${i18n[currentLang].receiverConnected}</span>`;
          sfx.success();
        }
      } catch (err) {}
    };
  } catch (e) {
    console.log('WS not available, using BroadcastChannel');
  }

  if (window.BroadcastChannel) {
    const bc = new BroadcastChannel('kintun_channel');
    bc.onmessage = (e) => {
      if (e.data && e.data.key === key && e.data.type === 'receiver_joined') {
        const pill = document.getElementById('peerStatusPill');
        pill.className = 'peer-status-pill connected';
        pill.innerHTML = `<span>${i18n[currentLang].receiverConnected}</span>`;
        sfx.success();
      }
    };
  }
}

// Setup Receive Card
function setupReceiveCard() {
  const input = document.getElementById('receiveKeyInput');
  const btnSubmit = document.getElementById('btnReceiveSubmit');
  const btnScanQr = document.getElementById('btnScanQr');

  // Input formatting (only allow numbers, max 6 digits)
  input.addEventListener('input', (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
    e.target.value = raw;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const key = input.value.trim();
      if (key.length === 6) executeReceive(key);
    }
  });

  btnSubmit.addEventListener('click', () => {
    sfx.click();
    const key = input.value.trim();
    if (key.length >= 6) {
      executeReceive(key);
    } else {
      showToast('Masukkan 6 digit kunci transfer', 'error');
    }
  });

  btnScanQr.addEventListener('click', () => {
    sfx.click();
    openQrScannerModal();
  });
}

// Execute Receive Flow
async function executeReceive(key) {
  const t = i18n[currentLang];
  let transferData = null;

  try {
    const res = await fetch(`/api/transfer/${key}`);
    if (res.ok) {
      transferData = await res.json();
    } else {
      throw new Error('Not found on server');
    }
  } catch (err) {
    // Check client fallback store
    if (window.__clientTransfers && window.__clientTransfers[key]) {
      transferData = window.__clientTransfers[key];
    }
  }

  if (!transferData) {
    sfx.playTone(220, 'square', 0.2);
    showToast(t.keyNotFound, 'error');
    return;
  }

  sfx.success();

  // Notify sender via BroadcastChannel
  if (window.BroadcastChannel) {
    const bc = new BroadcastChannel('kintun_channel');
    bc.postMessage({ type: 'receiver_joined', key });
  }

  // Save to history
  saveHistoryItem({
    key: transferData.key,
    mode: transferData.mode,
    type: 'received',
    filesCount: transferData.filesCount,
    totalSize: transferData.totalSize,
    timestamp: Date.now(),
    expiresAt: transferData.expiresAt
  });

  openDownloadModal(transferData);
}

// Open Download Modal for Received Files
function openDownloadModal(transfer) {
  const modal = document.getElementById('downloadModal');
  const modalFilesList = document.getElementById('modalFilesList');
  const modalMetaInfo = document.getElementById('modalMetaInfo');
  const btnDownloadAll = document.getElementById('btnDownloadAllZip');
  const t = i18n[currentLang];

  modalMetaInfo.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <strong style="font-size:1.1rem; color:var(--text-primary);">${transfer.filesCount} ${t.filesSelected}</strong>
        <div style="font-size:0.85rem; color:var(--text-secondary);">${formatBytes(transfer.totalSize)} • Kunci: <b>${transfer.key}</b></div>
      </div>
      <div style="font-size:0.85rem; color:#EF4444; font-weight:700;">
        ⏱ ${transfer.remainingSeconds ? Math.floor(transfer.remainingSeconds / 60) + ' Menit' : 'Aktif'}
      </div>
    </div>
  `;

  modalFilesList.innerHTML = '';
  transfer.files.forEach(file => {
    const typeInfo = getFileTypeInfo(file);
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-info">
        <div class="file-icon ${typeInfo.class}">${typeInfo.label}</div>
        <div class="file-meta">
          <span class="file-name" title="${file.name}">${file.name}</span>
          <span class="file-size">${formatBytes(file.size)}</span>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-secondary download-file-btn" style="padding:6px 12px; font-size:0.8rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
          </svg>
          ${t.downloadSingle}
        </button>
      </div>
    `;

    item.querySelector('.download-file-btn').addEventListener('click', () => {
      sfx.click();
      if (file.fileObj) {
        // Direct client blob download
        const url = URL.createObjectURL(file.fileObj);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.location.href = `/api/download/${transfer.key}/${file.index}`;
      }
    });

    modalFilesList.appendChild(item);
  });

  // Download All as ZIP
  btnDownloadAll.onclick = async () => {
    sfx.click();
    showToast('Menyiapkan file ZIP...', 'info');

    if (transfer.files[0] && transfer.files[0].fileObj && window.JSZip) {
      // Client-side zip via JSZip
      const zip = new JSZip();
      for (const f of transfer.files) {
        zip.file(f.name, f.fileObj);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kintun_${transfer.key}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Backend archiver stream
      window.location.href = `/api/download-all/${transfer.key}`;
    }
  };

  modal.classList.add('open');
}

// Setup Modals & QR Scanner
function setupModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        stopCamera();
      }
    });
  });

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.remove('open');
      stopCamera();
    });
  });
}

let html5QrScannerInstance = null;
function openQrScannerModal() {
  const modal = document.getElementById('qrScannerModal');
  modal.classList.add('open');

  const readerDiv = document.getElementById('qrReaderContainer');
  readerDiv.innerHTML = `
    <div id="cameraPreview" style="width:100%; min-height:240px; background:#000; border-radius:8px; overflow:hidden; position:relative;"></div>
    <div style="margin-top:16px; text-align:center;">
      <label class="btn-secondary" style="display:inline-flex; cursor:pointer;">
        <span>Unggah Gambar QR</span>
        <input type="file" id="qrFileInput" accept="image/*" style="display:none;">
      </label>
    </div>
  `;

  // Image QR Upload handler
  document.getElementById('qrFileInput').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (window.Html5Qrcode) {
        const html5QrCode = new Html5Qrcode("cameraPreview");
        html5QrCode.scanFile(file, true)
          .then(decodedText => onQrDecoded(decodedText))
          .catch(() => showToast('Tidak dapat mendeteksi kode QR pada gambar ini', 'error'));
      }
    }
  });

  // Start Camera if supported
  if (window.Html5Qrcode) {
    try {
      html5QrScannerInstance = new Html5Qrcode("cameraPreview");
      html5QrScannerInstance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => onQrDecoded(decodedText),
        () => {}
      ).catch(() => {
        readerDiv.querySelector('#cameraPreview').innerHTML = `
          <div style="color:#FFF; padding:40px 20px; text-align:center;">
            Kamera tidak tersedia atau izin ditolak.<br>Silakan masukkan 6 digit kunci secara manual atau unggah gambar QR.
          </div>
        `;
      });
    } catch(e) {}
  }
}

function onQrDecoded(text) {
  sfx.success();
  stopCamera();
  document.getElementById('qrScannerModal').classList.remove('open');

  // Extract key: could be "123456" or "http://...?key=123456"
  let key = text.trim();
  if (text.includes('key=')) {
    const match = text.match(/key=([0-9a-zA-Z]+)/);
    if (match) key = match[1];
  }

  showToast(`QR Terdeteksi: ${key}`, 'success');
  document.getElementById('receiveKeyInput').value = key;
  executeReceive(key);
}

function stopCamera() {
  if (html5QrScannerInstance) {
    html5QrScannerInstance.stop().then(() => {
      html5QrScannerInstance.clear();
      html5QrScannerInstance = null;
    }).catch(() => {});
  }
}

// Render Recent Keys
function renderRecentKeys() {
  const container = document.getElementById('recentKeysList');
  const history = getHistory();
  const keys = [...new Set(history.map(h => h.key))].slice(0, 5);

  if (keys.length === 0) {
    container.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">${i18n[currentLang].noRecentKeys}</span>`;
    return;
  }

  container.innerHTML = '';
  keys.forEach(key => {
    const chip = document.createElement('button');
    chip.className = 'key-chip';
    chip.textContent = key;
    chip.addEventListener('click', () => {
      sfx.click();
      document.getElementById('receiveKeyInput').value = key;
      executeReceive(key);
    });
    container.appendChild(chip);
  });
}

// Render History
function renderHistory() {
  const historyList = document.getElementById('historyList');
  const history = getHistory();
  const t = i18n[currentLang];

  if (history.length === 0) {
    historyList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-secondary);">${t.noHistory}</div>`;
    return;
  }

  historyList.innerHTML = '';
  history.forEach(item => {
    const isExpired = Date.now() > item.expiresAt;
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:14px;">
        <div style="width:40px; height:40px; border-radius:8px; background:${item.type === 'sent' ? '#FEE2E2' : '#DBEAFE'}; color:${item.type === 'sent' ? '#EF4444' : '#2563EB'}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem;">
          ${item.type === 'sent' ? '↗' : '↙'}
        </div>
        <div>
          <div style="font-weight:700; color:var(--text-primary); font-family:monospace; font-size:1.05rem;">
            ${item.key}
          </div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">
            ${item.filesCount} File • ${formatBytes(item.totalSize)} • ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:0.75rem; font-weight:700; padding:4px 8px; border-radius:12px; background:${isExpired ? '#F3F4F6' : '#ECFDF5'}; color:${isExpired ? '#9CA3AF' : '#059669'};">
          ${isExpired ? 'Kedaluwarsa' : 'Aktif'}
        </span>
        <button class="btn-secondary load-history-key-btn" style="padding:6px 12px; font-size:0.8rem;">
          Buka
        </button>
      </div>
    `;

    card.querySelector('.load-history-key-btn').addEventListener('click', () => {
      sfx.click();
      document.getElementById('navTransfer').click();
      document.getElementById('receiveKeyInput').value = item.key;
      executeReceive(item.key);
    });

    historyList.appendChild(card);
  });

  document.getElementById('btnClearHistory').onclick = () => {
    sfx.click();
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    renderRecentKeys();
    showToast('Riwayat berhasil dibersihkan', 'info');
  };
}
