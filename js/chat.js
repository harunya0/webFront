function logSystem(text) {
  const log = document.getElementById('log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'msg system';
  div.innerHTML = `<div class="msg-body">${escapeHtml(text)}</div>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// role: 'user' | 'bot'。
async function appendMsg(role, text, files = []) {
  const log = document.getElementById('log');
  if (!log) return;

  const div = document.createElement('div');
  div.className = 'msg ' + role;
  
  const isUser = role === 'user';
  const authorName = isUser ? 'You' : 'Albot';
  const avatarLetter = isUser ? 'U' : 'A';

  // 高級 Markdown レンダラーを使用
  const htmlContent = renderMarkdownWithMath(text || '');

  div.innerHTML = `
    <div class="msg-header">
      <div class="msg-avatar">${avatarLetter}</div>
      <span class="msg-author">${authorName}</span>
    </div>
    <div class="msg-body">${htmlContent}</div>
  `;

  if (files.length > 0) {
    const attachDiv = document.createElement('div');
    attachDiv.className = 'chat-attachments';
    for (const file of files) {
      const card = await buildFileCard(file, { removable: false });
      attachDiv.appendChild(card);
    }
    div.querySelector('.msg-body').appendChild(attachDiv);
  }

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const text = input.value.trim();
  if (!text && selectedFiles.length === 0) return;

  sendBtn.disabled = true;

  const filesToDisplay = [...selectedFiles];
  await appendMsg('user', text, filesToDisplay);
  
  input.value = '';
  input.style.height = 'auto';

  const filePayloads = await Promise.all(selectedFiles.map(fileToBase64));
  selectedFiles = [];
  renderFilePreview();

  // ローディングアニメーション（タイピング中）
  const log = document.getElementById('log');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg bot typing-indicator-msg';
  typingDiv.innerHTML = `
    <div class="msg-header">
      <div class="msg-avatar">A</div>
      <span class="msg-author">Albot</span>
    </div>
    <div class="msg-body"><span class="typing-dots">思考中...</span></div>
  `;
  log.appendChild(typingDiv);
  log.scrollTop = log.scrollHeight;

  try {
    const data = await api('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        files: filePayloads
      })
    });
    
    log.removeChild(typingDiv);
    await appendMsg('bot', data.reply);
  } catch (e) {
    log.removeChild(typingDiv);
    logSystem('エラー: ' + e.message);
  } finally {
    sendBtn.disabled = false;
  }
}

async function loadHistory() {
  const log = document.getElementById('log');
  if (!log) return;
  log.innerHTML = '';
  state.artifactsList = []; // セッション切り替え時にArtifacts履歴リセット

  try {
    const history = await api('/history');
    if (!history || !Array.isArray(history) || history.length === 0) {
      logSystem('このセッションの過去の会話記録はありません');
      return;
    }
    for (const item of history) {
      await appendMsg(item.role, item.text);
    }
    logSystem('会話履歴を同期しました');
  } catch (e) {
    logSystem('履歴の読み込みに失敗しました: ' + (e.message || e));
  }
}
