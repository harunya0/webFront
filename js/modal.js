// モーダル制御モジュール

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;
  document.getElementById('apiBaseInput').value = getApiBase();
  document.getElementById('tokenInput').value = getToken();
  modal.classList.add('open');
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.remove('open');
}

function closeSettingsModalOnOutside(event) {
  if (event.target.id === 'settingsModal') {
    closeSettingsModal();
  }
}

function saveConnectionModal() {
  const base = document.getElementById('apiBaseInput').value.trim().replace(/\/+$/, '');
  localStorage.setItem('apiBase', base);
  localStorage.setItem('apiToken', document.getElementById('tokenInput').value);
  closeSettingsModal();
  logSystem('接続設定を更新しました');
  refreshStatus();
}
