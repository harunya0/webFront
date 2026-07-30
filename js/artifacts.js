/*
 * Artifacts JS: Side panel viewer, code header generator, live sandbox preview & download
 */
let currentArtifact = {
  filename: 'snippet.txt',
  language: 'text',
  code: ''
};

function openArtifact(title, lang, code) {
  currentArtifact = {
    filename: title || `artifact.${lang || 'txt'}`,
    language: lang || 'text',
    code: code || ''
  };

  const panel = document.getElementById('artifactsPanel');
  const titleEl = document.getElementById('artifactsTitle');
  const badgeEl = document.getElementById('artifactsBadge');
  const codeView = document.getElementById('artifactsCodeView');
  const previewFrame = document.getElementById('artifactsPreviewFrame');
  const previewTab = document.getElementById('artTabPreview');

  if (!panel || !titleEl || !codeView) return;

  titleEl.textContent = currentArtifact.filename;
  badgeEl.textContent = (lang || 'text').toUpperCase();

  // コードビューにハイライト適用
  codeView.textContent = currentArtifact.code;
  codeView.className = 'artifacts-code-view language-' + (lang || 'plaintext');
  if (window.hljs) {
    hljs.highlightElement(codeView);
  }

  // HTML / SVG の場合はプレビュータブを表示・レンダリング可能に
  const isRenderable = ['html', 'svg', 'xml'].includes((lang || '').toLowerCase());
  if (previewTab) {
    previewTab.style.display = isRenderable ? 'inline-block' : 'none';
  }

  if (isRenderable && previewFrame) {
    previewFrame.srcdoc = currentArtifact.code;
  }

  switchArtifactTab('code');
  panel.classList.add('open');
}

function closeArtifact() {
  const panel = document.getElementById('artifactsPanel');
  if (panel) panel.classList.remove('open');
}

function switchArtifactTab(tab) {
  const codeView = document.getElementById('artifactsCodeView');
  const previewFrame = document.getElementById('artifactsPreviewFrame');
  const tabCode = document.getElementById('artTabCode');
  const tabPreview = document.getElementById('artTabPreview');

  if (tab === 'preview') {
    if (codeView) codeView.style.display = 'none';
    if (previewFrame) previewFrame.style.display = 'block';
    if (tabCode) tabCode.classList.remove('active');
    if (tabPreview) tabPreview.classList.add('active');
  } else {
    if (codeView) codeView.style.display = 'block';
    if (previewFrame) previewFrame.style.display = 'none';
    if (tabCode) tabCode.classList.add('active');
    if (tabPreview) tabPreview.classList.remove('active');
  }
}

// アーティファクトファイルのダウンロード機能
function downloadArtifact() {
  if (!currentArtifact.code) return;

  const blob = new Blob([currentArtifact.code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentArtifact.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// クリップボードコピーユーティリティ
function copyCodeToClipboard(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    if (btnElement) {
      const orig = btnElement.textContent;
      btnElement.textContent = 'コピー完了!';
      setTimeout(() => { btnElement.textContent = orig; }, 1800);
    }
  }).catch(err => {
    console.error('Copy failed:', err);
  });
}
