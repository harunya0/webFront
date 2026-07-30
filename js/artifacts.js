// Claudeスタイル Artifacts 制御モジュール

function registerArtifactCandidate(language, code) {
  const id = 'art-' + Math.random().toString(36).substr(2, 9);
  const title = `${language.toUpperCase()} Snippet (${code.trim().split('\n').length} lines)`;
  
  state.artifactsList.push({
    id,
    language,
    code,
    title
  });
  return id;
}

function openArtifactById(id) {
  const artifact = state.artifactsList.find(a => a.id === id);
  if (!artifact) return;

  state.currentArtifact = artifact;
  
  const panel = document.getElementById('artifactsPanel');
  const titleEl = document.getElementById('artifactsTitle');
  const codeBlock = document.getElementById('artifactCodeBlock');
  
  if (!panel || !titleEl || !codeBlock) return;

  titleEl.textContent = artifact.title;
  codeBlock.textContent = artifact.code;
  
  if (window.hljs) {
    codeBlock.className = `hljs language-${artifact.language}`;
    hljs.highlightElement(codeBlock);
  }

  // プレビュー表示設定（HTML / SVG / Mermaid の場合）
  updateArtifactPreview(artifact);

  panel.classList.add('open');
}

function closeArtifactsPanel() {
  const panel = document.getElementById('artifactsPanel');
  if (panel) panel.classList.remove('open');
}

function switchArtifactTab(tab) {
  state.activeArtifactTab = tab;
  
  const codeBtn = document.getElementById('tabCodeBtn');
  const prevBtn = document.getElementById('tabPreviewBtn');
  const codeView = document.getElementById('artifactCodeView');
  const prevView = document.getElementById('artifactPreviewView');

  if (tab === 'code') {
    codeBtn.classList.add('active');
    prevBtn.classList.remove('active');
    codeView.classList.add('active');
    prevView.classList.remove('active');
  } else {
    prevBtn.classList.add('active');
    codeBtn.classList.remove('active');
    prevView.classList.add('active');
    codeView.classList.remove('active');
  }
}

function updateArtifactPreview(artifact) {
  const iframe = document.getElementById('artifactSandboxFrame');
  const mermaidContainer = document.getElementById('artifactMermaidContainer');

  iframe.style.display = 'none';
  mermaidContainer.style.display = 'none';

  if (!artifact) return;

  const lang = artifact.language.toLowerCase();

  if (lang === 'html' || lang === 'svg') {
    iframe.style.display = 'block';
    const blob = new Blob([artifact.code], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);
  } else if (lang === 'mermaid') {
    mermaidContainer.style.display = 'flex';
    mermaidContainer.innerHTML = `<div class="mermaid">${escapeHtml(artifact.code)}</div>`;
    if (window.mermaid) {
      mermaid.run({ nodes: mermaidContainer.querySelectorAll('.mermaid') });
    }
  }
}

function copyArtifactCode() {
  if (!state.currentArtifact) return;
  navigator.clipboard.writeText(state.currentArtifact.code).then(() => {
    alert('Artifactのコードをコピーしました');
  });
}

function downloadArtifact() {
  if (!state.currentArtifact) return;
  const extMap = { html: 'html', svg: 'svg', javascript: 'js', js: 'js', python: 'py', css: 'css', json: 'json' };
  const ext = extMap[state.currentArtifact.language.toLowerCase()] || 'txt';
  
  const blob = new Blob([state.currentArtifact.code], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `artifact_${state.currentArtifact.id}.${ext}`;
  a.click();
}
