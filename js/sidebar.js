function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (!sidebar || !overlay) return;

  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

function startNewSession() {
  const name = 'session_' + Date.now().toString().slice(-4);
  document.getElementById('newSession').value = name;
  switchSession();
}

function initSidebarAutoClose() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('li')) {
        setTimeout(closeSidebar, 150);
      }
    }
  });
}
