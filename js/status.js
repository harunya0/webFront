async function refreshStatus() {
  try {
    const status = await api('/status');
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('sbModel', status.current_model);
    setEl('sbSession', status.current_session);
    setEl('sbUptime', formatUptime(status.uptime_seconds));
    
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) modelSelect.value = status.current_model;

    const channelLabel = status.current_channel_id === "0" ? "0 (Web単独)" : status.current_channel_id;
    setEl('sbChannel', channelLabel);

    // モバイル用・サブ用要素
    setEl('sbModelM', status.current_model);
    setEl('sbSessionM', status.current_session);
    setEl('sbUptimeM', formatUptime(status.uptime_seconds));
    setEl('sbChannelM', channelLabel);
    
    const channelInput = document.getElementById('channelInput');
    if (channelInput && channelInput.value === "") {
      channelInput.value = status.current_channel_id === "0" ? "" : status.current_channel_id;
    }

    // チャンネル/セッションが変わっていたら履歴を再読み込み
    if (currentLoadedChannel !== status.current_channel_id || currentLoadedSession !== status.current_session) {
      currentLoadedChannel = status.current_channel_id;
      currentLoadedSession = status.current_session;
      await loadHistory();
    }

    await refreshSessionList(status.current_session);
  } catch (e) {
    logSystem('ステータス取得失敗: ' + (e.message || e));
    console.error('詳細エラー:', e);
  }
}

async function refreshSessionList(currentSession) {
  const sessions = await api('/sessions');
  const list = document.getElementById('sessionList');
  list.innerHTML = '';
  sessions.forEach(s => {
    const li = document.createElement('li');
    if (s === currentSession) li.classList.add('active');
    li.innerHTML = '<span>' + s + '</span><span class="del">削除</span>';
    li.onclick = (e) => {
      if (e.target.classList.contains('del')) {
        if (confirm('セッション「' + s + '」を削除しますか?')) {
          api('/sessions/' + encodeURIComponent(s), { method: 'DELETE' }).then(refreshStatus);
        }
      } else {
        document.getElementById('newSession').value = s;
        switchSession();
      }
    };
    list.appendChild(li);
  });
}

async function switchModel() {
  const name = document.getElementById('modelSelect').value;
  await api('/model', { method: 'POST', body: JSON.stringify({ name }) });
  logSystem('モデルを ' + name + ' に切り替えました');
  refreshStatus();
}

async function switchSession() {
  const name = document.getElementById('newSession').value.trim();
  if (!name) return;
  await api('/sessions/switch', { method: 'POST', body: JSON.stringify({ name }) });
  logSystem('セッションを「' + name + '」に切り替えました');
  document.getElementById('newSession').value = '';
  refreshStatus();
}

async function switchChannel() {
  const channel_id = document.getElementById('channelInput').value.trim() || "0";
  try {
    await api('/channel', { method: 'POST', body: JSON.stringify({ channel_id }) });
    logSystem('同期チャンネルを「' + (channel_id === "0" ? "Web単独 (0)" : channel_id) + '」に切り替えました');
    currentLoadedChannel = null;
    currentLoadedSession = null;
    await refreshStatus();
  } catch (e) {
    logSystem('チャンネル切り替え失敗: サーバー側の更新や再起動が完了しているか確認してください (' + e.message + ')');
  }
}
