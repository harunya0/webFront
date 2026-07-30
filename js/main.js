function autoGrowMessageInput() {
  const el = document.getElementById('messageInput');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    messageInput.addEventListener('input', autoGrowMessageInput);
  }

  initDragAndDrop();
  initSidebarAutoClose();

  refreshStatus();
  setInterval(refreshStatus, 30000);
});
