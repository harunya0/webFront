// 高級 Markdown レンダラー (marked + highlight.js + mermaid + katex)

// Mermaid 初期化
if (window.mermaid) {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose'
  });
}

// marked カスタム設定
const renderer = new marked.Renderer();

// コードブロック描画のオーバーライド
renderer.code = function(code, lang) {
  const language = (lang || 'text').toLowerCase();
  
  // 1. Mermaid ダイアグラムの場合
  if (language === 'mermaid') {
    const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
    return `<div class="mermaid-wrapper"><div class="mermaid" id="${id}">${escapeHtml(code)}</div></div>`;
  }

  // 2. Highlight.js によるシンタックスハイライト
  let highlightedCode = escapeHtml(code);
  if (window.hljs) {
    if (hljs.getLanguage(language)) {
      try {
        highlightedCode = hljs.highlight(code, { language }).value;
      } catch (e) {}
    } else {
      try {
        highlightedCode = hljs.highlightAuto(code).value;
      } catch (e) {}
    }
  }

  // 3. Artifact 候補判定（HTML, SVG, React, Python, Code 等一定規模のブロック）
  const isArtifactLanguage = ['html', 'svg', 'javascript', 'js', 'jsx', 'tsx', 'typescript', 'ts', 'python', 'py', 'css', 'json'].includes(language);
  let artifactTriggerHtml = '';
  
  if (isArtifactLanguage && code.trim().split('\n').length > 5) {
    const artifactId = registerArtifactCandidate(language, code);
    artifactTriggerHtml = `
      <div class="artifact-card-trigger" onclick="openArtifactById('${artifactId}')">
        <div class="artifact-card-info">
          <div class="artifact-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div class="artifact-card-meta">
            <span class="artifact-card-title">${escapeHtml(language.toUpperCase())} Artifact</span>
            <span class="artifact-card-sub">クリックしてプレビュー / コードを表示</span>
          </div>
        </div>
        <div class="artifact-card-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </div>
    `;
  }

  const blockId = 'code-' + Math.random().toString(36).substr(2, 9);

  return `
    ${artifactTriggerHtml}
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span>${escapeHtml(language)}</span>
        <button class="copy-code-btn" onclick="copyCodeBlock('${blockId}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          コピー
        </button>
      </div>
      <pre><code id="${blockId}" class="hljs language-${escapeHtml(language)}">${highlightedCode}</code></pre>
    </div>
  `;
};

marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true
});

// KaTeX 数式処理ラッパー
function renderMarkdownWithMath(text) {
  if (!text) return '';
  
  // Markdownパース
  let html = marked.parse(text);

  // 一時要素で数式レンダリング
  const container = document.createElement('div');
  container.className = 'markdown-body';
  container.innerHTML = DOMPurify.sanitize(html);

  if (window.renderMathInElement) {
    try {
      renderMathInElement(container, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\(', right: '\\)', display: false},
          {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false
      });
    } catch (e) {}
  }

  // Mermaid レンダリング
  setTimeout(() => {
    if (window.mermaid) {
      const mermaids = container.querySelectorAll('.mermaid');
      if (mermaids.length > 0) {
        mermaid.run({ nodes: mermaids });
      }
    }
  }, 50);

  return container.innerHTML;
}

function copyCodeBlock(id) {
  const codeEl = document.getElementById(id);
  if (!codeEl) return;
  const text = codeEl.innerText || codeEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = codeEl.closest('.code-block-wrapper')?.querySelector('.copy-code-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ コピー完了';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });
}
