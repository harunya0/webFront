function logSystem(text) {
  const log = document.getElementById('log');
  const div = document.createElement('div');
  div.className = 'msg system';
  div.innerHTML = '<div class="content">' + text + '</div>';
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function appendMsg(role, text, files = []) {
  const log = document.getElementById('log');
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const label = role === 'user' ? 'you' : 'albot';

  // GFM (GitHub Flavored Markdown) オプション設定（改行 \n を <br> に変換する breaks: true）
  if (typeof marked !== 'undefined' && marked.setOptions) {
    marked.setOptions({
      gfm: true,
      breaks: true
    });
  }

  // マークダウンをHTMLに変換し、DOMPurifyでサニタイズ（DOMPurifyにKaTeX/SVG/Tasklistタグ・属性を許可）
  const rawHtml = marked.parse(text || '');
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover', 'munder', 'mspace', 'msqrt', 'mtable', 'mtr', 'mtd', 'svg', 'path', 'g', 'input', 'del', 'ins', 'sub', 'sup', 'mark'],
    ADD_ATTR: ['encoding', 'xmlns', 'display', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'type', 'checked', 'disabled']
  });

  div.innerHTML = `<div class="role">${label}</div><div class="content">${cleanHtml}</div>`;

  // 1. KaTeX 数式自動レンダリング ($...$, $$...$$, \(...\), \[...\])
  if (window.renderMathInElement) {
    renderMathInElement(div, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }

  // 2. Highlight.js コードブロック構文ハイライト
  if (window.hljs) {
    div.querySelectorAll('pre code').forEach((block) => {
      if (!block.classList.contains('language-mermaid')) {
        hljs.highlightElement(block);
      }
    });
  }

  // 3. Mermaid.js ダイアグラムレンダリング
  if (window.mermaid) {
    const mermaidBlocks = div.querySelectorAll('pre code.language-mermaid');
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const codeBlock = mermaidBlocks[i];
      const pre = codeBlock.parentElement;
      const graphDefinition = codeBlock.textContent;
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid';
      mermaidDiv.textContent = graphDefinition;
      pre.replaceWith(mermaidDiv);
    }
    try {
      await mermaid.run({ nodes: div.querySelectorAll('.mermaid') });
    } catch (err) {
      console.warn('Mermaid render error:', err);
    }
  }

  if (files.length > 0) {
    const attachDiv = document.createElement('div');
    attachDiv.className = 'chat-attachments';
    for (const file of files) {
      const card = await buildFileCard(file, { removable: false });
      attachDiv.appendChild(card);
    }
    div.appendChild(attachDiv);
  }

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text && selectedFiles.length === 0) return;

  // チャットログにテキストとファイルのカードを描画
  const filesToDisplay = [...selectedFiles];
  await appendMsg('user', text, filesToDisplay);
  input.value = '';
  input.style.height = 'auto';

  const filePayloads = await Promise.all(selectedFiles.map(fileToBase64));
  selectedFiles = [];
  renderFilePreview();

  try {
    const data = await api('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        files: filePayloads
      })
    });
    appendMsg('bot', data.reply);
  } catch (e) {
    logSystem('エラー: ' + e.message);
  }
}

async function loadHistory() {
  const log = document.getElementById('log');
  if (!log) return;
  log.innerHTML = '';

  try {
    const history = await api('/history');
    if (!history || !Array.isArray(history) || history.length === 0) {
      logSystem('このチャンネル・セッションの過去の会話記録はありません');
      return;
    }
    for (const item of history) {
      await appendMsg(item.role, item.text);
    }
    logSystem('過去の会話履歴を同期しました');
  } catch (e) {
    logSystem('履歴の読み込みに失敗しました: ' + (e.message || e));
  }
}
