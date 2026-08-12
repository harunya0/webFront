// テキストエリアの高さを内容に合わせて自動調整（CSSのmax-heightで上限）
function autoGrowMessageInput() {
  const el = document.getElementById('messageInput');
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  // 単一の改行(Enter1回)もMarkdown上で改行として描画されるようにする
  // (デフォルトのbreaks:falseだと、送信後に改行が詰まってしまう)
  marked.setOptions({ breaks: true });

  document.getElementById('apiBaseInput').value = getApiBase();
  document.getElementById('tokenInput').value = getToken();

  const messageInput = document.getElementById('messageInput');
  messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  messageInput.addEventListener('input', autoGrowMessageInput);

  initDragAndDrop();
  initSidebarAutoClose();

  refreshStatus();
  setInterval(refreshStatus, 30000);
});