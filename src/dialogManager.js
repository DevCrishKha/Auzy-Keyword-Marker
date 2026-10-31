/**
 * Dialog Manager for Auzy-Keyword-Marker
 * 
 * Provides:
 * 1. Floating dialogue box on top of the editor for marking keywords.
 * 2. Dynamic sub-fields for Variable (Input, Output, Default with values, Pin Value).
 * 3. Interactive Tut-Tag Canvas Authoring with:
 *    - Click & drag resizable Text, Images, and Code Snippets
 *    - Colorful Code-Editor styled widgets with syntax highlighting
 *    - In-canvas Image & Link modals
 * 4. Read-Only Tutorial Viewer with syntax-highlighted code cards.
 */

const vscode = require('vscode');

class DialogManager {
  /**
   * Shows a floating modal dialogue box on top of the editor to mark a keyword.
   * Allows filling Category, Sub-type, Title, and Description together in one view.
   * 
   * @param {string} selectedWord 
   * @returns {Promise<object | null>} Marked tag details or null if canceled
   */
  static promptMarkKeyword(selectedWord) {
    return new Promise(resolve => {
      const panel = vscode.window.createWebviewPanel(
        'auzyMarkDialog',
        `Mark "${selectedWord}"`,
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      panel.webview.html = this.getMarkDialogHtml(selectedWord);

      let finished = false;

      panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'submit') {
          finished = true;
          panel.dispose();

          const result = message.payload;

          // If Tut-Tag, launch the interactive Canvas Authoring editor
          if (result.category === 'tut-tag') {
            const tutData = await DialogManager.openTutorialAuthoringCanvas(selectedWord);
            if (!tutData) {
              resolve(null);
              return;
            }
            result.tutData = tutData;
          }

          resolve(result);
        } else if (message.command === 'cancel') {
          finished = true;
          panel.dispose();
          resolve(null);
        }
      });

      panel.onDidDispose(() => {
        if (!finished) resolve(null);
      });
    });
  }

  /**
   * HTML for Mark Keyword Dialogue Box
   */
  static getMarkDialogHtml(selectedWord) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
      user-select: none;
    }
    .dialog-card {
      background: var(--vscode-editorWidget-background, #252526);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 8px;
      padding: 22px 26px;
      width: 440px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      gap: 13px;
      box-sizing: border-box;
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      background: var(--vscode-badge-background, #4d4d4d);
      color: var(--vscode-badge-foreground, #fff);
      border-radius: 4px;
      font-family: monospace;
      font-weight: 600;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground, #999);
    }
    select, input[type="text"], textarea {
      width: 100%;
      padding: 7px 10px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #ccc);
      border: 1px solid var(--vscode-input-border, #555);
      border-radius: 4px;
      box-sizing: border-box;
      outline: none;
      font-family: inherit;
      font-size: 12px;
    }
    select:focus, input[type="text"]:focus, textarea:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }
    textarea {
      resize: vertical;
      min-height: 60px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 6px;
    }
    button {
      padding: 7px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .btn-cancel {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #fff);
      border: none;
    }
    .btn-primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
      border: none;
    }
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
  </style>
</head>
<body>
  <div class="dialog-card">
    <div class="badge-row">
      <strong>Mark Keyword:</strong>
      <span class="badge">${selectedWord}</span>
    </div>

    <div class="form-group">
      <label for="categorySelect">Category</label>
      <select id="categorySelect">
        <option value="variable">Variable</option>
        <option value="function">Function</option>
        <option value="tut-tag">Tut-Tag (Interactive Tutorial)</option>
        <option value="keyword">Keyword</option>
      </select>
    </div>

    <div class="form-group" id="subTypeGroup">
      <label for="subTypeSelect">Variable Sub-Type</label>
      <select id="subTypeSelect">
        <option value="Input">Input (Empty placeholder)</option>
        <option value="Output">Output (Wires into Input)</option>
        <option value="Default">Default (Orange tag with default values)</option>
        <option value="Pin Value">Pin Value</option>
      </select>
    </div>

    <div class="form-group" id="defaultGroup" style="display:none;">
      <label for="defaultInput">Default Values (comma-separated)</label>
      <input type="text" id="defaultInput" placeholder="e.g. 10, 20, auto" />
    </div>

    <div class="form-group">
      <label for="titleInput">Title (Optional)</label>
      <input type="text" id="titleInput" placeholder="e.g. User Score Calculation" autofocus />
    </div>

    <div class="form-group">
      <label for="descInput">Description (Optional)</label>
      <textarea id="descInput" placeholder="Add a description or note..."></textarea>
    </div>

    <div class="actions">
      <button class="btn-cancel" id="cancelBtn">Cancel (Esc)</button>
      <button class="btn-primary" id="submitBtn">Mark Keyword ↵</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const categorySelect = document.getElementById('categorySelect');
    const subTypeGroup = document.getElementById('subTypeGroup');
    const subTypeSelect = document.getElementById('subTypeSelect');
    const defaultGroup = document.getElementById('defaultGroup');
    const defaultInput = document.getElementById('defaultInput');
    const titleInput = document.getElementById('titleInput');
    const descInput = document.getElementById('descInput');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    function updateVisibility() {
      const isVar = categorySelect.value === 'variable';
      subTypeGroup.style.display = isVar ? 'flex' : 'none';
      defaultGroup.style.display = (isVar && subTypeSelect.value === 'Default') ? 'flex' : 'none';
    }

    categorySelect.addEventListener('change', updateVisibility);
    subTypeSelect.addEventListener('change', updateVisibility);

    function submitForm() {
      const category = categorySelect.value;
      const variableSubType = category === 'variable' ? subTypeSelect.value : undefined;
      const defaultValues = (category === 'variable' && subTypeSelect.value === 'Default' && defaultInput.value.trim())
        ? defaultInput.value.split(',').map(s => s.trim()).filter(Boolean)
        : undefined;
      const title = titleInput.value.trim();
      const description = descInput.value.trim();

      vscode.postMessage({
        command: 'submit',
        payload: {
          category,
          variableSubType,
          defaultValues,
          title,
          description
        }
      });
    }

    submitBtn.addEventListener('click', submitForm);

    cancelBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'cancel' });
    });

    // Enter in Title submits immediately
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitForm();
      }
    });

    // Enter in Description (without Shift) submits immediately
    descInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitForm();
      }
    });

    // Escape cancels
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        vscode.postMessage({ command: 'cancel' });
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Opens the freeform canvas authoring editor for a Tut-Tag.
   * 
   * @param {string} word 
   * @returns {Promise<object | null>}
   */
  static openTutorialAuthoringCanvas(word) {
    return new Promise(resolve => {
      const panel = vscode.window.createWebviewPanel(
        'auzyTutCanvas',
        `Tut-Tag Canvas: "${word}"`,
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      panel.webview.html = this.getTutAuthoringHtml(word);

      let saved = false;

      panel.webview.onDidReceiveMessage(message => {
        if (message.command === 'save') {
          saved = true;
          panel.dispose();
          resolve(message.payload);
        } else if (message.command === 'cancel') {
          panel.dispose();
          resolve(null);
        }
      });

      panel.onDidDispose(() => {
        if (!saved) resolve(null);
      });
    });
  }

  /**
   * Opens the read-only tutorial viewer when a user left-clicks a Tut-Tag.
   * 
   * @param {object} tag 
   */
  static openTutorialViewer(tag) {
    const panel = vscode.window.createWebviewPanel(
      'auzyTutViewer',
      `Tutorial: ${tag.word}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true
      }
    );

    panel.webview.html = this.getTutViewerHtml(tag);
  }

  /**
   * HTML for Tut-Tag Canvas Authoring with Resizable Cards & Code Snippets
   */
  static getTutAuthoringHtml(word) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      margin: 0;
      padding: 12px;
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
      overflow: hidden;
      user-select: none;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border, #333);
    }
    .toolbar button {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .toolbar button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .canvas-container {
      flex: 1;
      position: relative;
      margin-top: 10px;
      background: var(--vscode-editorWidget-background, #1e1e1e);
      border: 1px dashed var(--vscode-focusBorder, #007acc);
      border-radius: 4px;
      overflow: auto;
      cursor: default;
    }
    .canvas-hint {
      position: absolute;
      top: 10px;
      left: 10px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      pointer-events: none;
    }
    .element {
      position: absolute;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border, #444);
      border-radius: 6px;
      padding: 0;
      cursor: move;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .element-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.04);
      border-bottom: 1px solid var(--vscode-widget-border, #333);
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      user-select: none;
    }
    .window-dots {
      display: flex;
      gap: 5px;
      align-items: center;
    }
    .window-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }

    .element-delete-btn {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      line-height: 1;
      padding: 0 4px;
    }
    .element-delete-btn:hover {
      color: #e74c3c;
    }
    .element-body {
      flex: 1;
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 8px;
      box-sizing: border-box;
    }
    .element-body textarea {
      width: 100%;
      height: 100%;
      background: transparent;
      color: inherit;
      border: none;
      resize: none;
      outline: none;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      box-sizing: border-box;
    }

    /* Code Snippet Card Styling */
    .code-editor-card {
      background: #181818 !important;
      border-color: #333 !important;
    }
    .code-body {
      background: #181818;
      padding: 0 !important;
    }
    .code-body textarea {
      font-family: 'Fira Code', 'Consolas', 'Courier New', monospace !important;
      font-size: 12px;
      line-height: 1.5;
      color: #9cdcfe;
      background: #181818;
      padding: 8px 10px;
      white-space: pre;
      tab-size: 2;
    }
    .code-lang-badge {
      font-family: monospace;
      font-size: 10px;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 3px;
      color: #dcdcaa;
    }

    /* Resize Handle */
    .resize-handle {
      position: absolute;
      right: 2px;
      bottom: 2px;
      width: 14px;
      height: 14px;
      cursor: se-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--vscode-descriptionForeground);
      font-size: 10px;
      opacity: 0.6;
      user-select: none;
      z-index: 50;
    }
    .resize-handle:hover {
      opacity: 1;
      color: var(--vscode-focusBorder, #007acc);
    }

    /* In-Canvas Modal Overlay */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    .modal-card {
      background: var(--vscode-editorWidget-background, #252526);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 6px;
      padding: 18px 22px;
      width: 400px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .modal-card h3 {
      margin: 0;
      font-size: 14px;
    }
    .modal-card label {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      font-weight: 600;
    }
    .modal-card input[type="text"], .modal-card select {
      width: 100%;
      padding: 7px 9px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, #444);
      border-radius: 3px;
      box-sizing: border-box;
      outline: none;
      font-size: 12px;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
    }
    .modal-actions button {
      padding: 6px 14px;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .btn-cancel {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #fff);
      border: none;
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>Tutorial Canvas: "${word}"</strong>
    <button id="addTextBtn">📝 + Add Note</button>
    <button id="addCodeBtn">💻 + Add Code</button>
    <button id="addImageBtn">🖼️ + Add Image</button>
    <button id="addLinkBtn">🔗 + Add Link</button>
    <div style="flex:1"></div>
    <button id="saveBtn" style="background:#2ecc71; color:white;">💾 Save Tutorial</button>
  </div>

  <div class="canvas-container" id="canvas">
    <div class="canvas-hint">Use the toolbar buttons above to add Notes, Code, Images, or Links. Drag cards to arrange, and drag ⇲ to resize.</div>
  </div>

  <!-- Image Insertion Modal -->
  <div class="modal-overlay" id="imageModal">
    <div class="modal-card">
      <h3>Insert Image</h3>
      <label for="imgUrlInput">Image Web URL</label>
      <input type="text" id="imgUrlInput" placeholder="https://example.com/diagram.png" />
      <label for="imgFileInput" style="margin-top: 4px;">Or Select Local Image</label>
      <input type="file" id="imgFileInput" accept="image/*" />
      <div class="modal-actions">
        <button class="btn-cancel" id="cancelImgBtn">Cancel</button>
        <button class="btn-primary" id="confirmImgBtn">Insert Image</button>
      </div>
    </div>
  </div>

  <!-- Link Insertion Modal -->
  <div class="modal-overlay" id="linkModal">
    <div class="modal-card">
      <h3>Insert Link</h3>
      <label for="linkUrlInput">Link Destination URL</label>
      <input type="text" id="linkUrlInput" placeholder="https://developer.mozilla.org" />
      <label for="linkTitleInput" style="margin-top: 4px;">Display Text</label>
      <input type="text" id="linkTitleInput" placeholder="e.g. MDN Documentation" />
      <div class="modal-actions">
        <button class="btn-cancel" id="cancelLinkBtn">Cancel</button>
        <button class="btn-primary" id="confirmLinkBtn">Insert Link</button>
      </div>
    </div>
  </div>

  <!-- Code Snippet Insertion Modal -->
  <div class="modal-overlay" id="codeModal">
    <div class="modal-card">
      <h3>Insert Code Snippet</h3>
      <label for="codeLangSelect">Language</label>
      <select id="codeLangSelect">
        <option value="javascript">JavaScript / TypeScript</option>
        <option value="python">Python</option>
        <option value="html">HTML / CSS</option>
        <option value="json">JSON</option>
        <option value="cpp">C++ / C#</option>
        <option value="sql">SQL</option>
      </select>
      <label for="codeTitleInput" style="margin-top: 4px;">Title / Filename (Optional)</label>
      <input type="text" id="codeTitleInput" placeholder="e.g. solution.js or calculateTotal()" />
      <div class="modal-actions">
        <button class="btn-cancel" id="cancelCodeBtn">Cancel</button>
        <button class="btn-primary" id="confirmCodeBtn">Insert Code Editor</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const canvas = document.getElementById('canvas');
    const elements = [];

    // Dragging helper
    function makeDraggable(el, item) {
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      el.addEventListener('mousedown', (e) => {
        if (['TEXTAREA', 'INPUT', 'BUTTON', 'A', 'SELECT'].includes(e.target.tagName)) return;
        if (e.target.classList.contains('resize-handle')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseInt(el.style.left, 10) || 0;
        initialTop = parseInt(el.style.top, 10) || 0;
        el.style.zIndex = '100';
        e.stopPropagation();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(0, initialLeft + dx);
        const newTop = Math.max(0, initialTop + dy);
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
        item.x = newLeft;
        item.y = newTop;
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          el.style.zIndex = '10';
        }
      });
    }

    // Resizing helper
    function makeResizable(el, item) {
      const handle = el.querySelector('.resize-handle');
      if (!handle) return;

      let isResizing = false;
      let startX, startY, startWidth, startHeight;

      handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = el.offsetWidth;
        startHeight = el.offsetHeight;
        e.stopPropagation();
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = Math.max(160, startWidth + (e.clientX - startX));
        const newHeight = Math.max(80, startHeight + (e.clientY - startY));
        el.style.width = newWidth + 'px';
        el.style.height = newHeight + 'px';
        item.width = newWidth;
        item.height = newHeight;
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
        }
      });
    }

    function addElement(type, x, y, content, title, lang, initialWidth, initialHeight) {
      const w = initialWidth || (type === 'code' ? 320 : type === 'image' ? 260 : 220);
      const h = initialHeight || (type === 'code' ? 180 : type === 'image' ? 200 : 120);

      const item = {
        type,
        x,
        y,
        width: w,
        height: h,
        content: content || '',
        title: title || '',
        language: lang || 'javascript'
      };

      const el = document.createElement('div');
      el.className = 'element' + (type === 'code' ? ' code-editor-card' : '');
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.width = w + 'px';
      el.style.height = h + 'px';

      // Header with Window Dots
      const header = document.createElement('div');
      header.className = 'element-header';

      let headerLeft = '';
      if (type === 'code') {
        headerLeft = '<div class="window-dots"><span class="window-dot dot-red"></span><span class="window-dot dot-yellow"></span><span class="window-dot dot-green"></span></div><span class="code-lang-badge">' + (title ? title : item.language.toUpperCase()) + '</span>';
      } else {
        headerLeft = '<span>' + (type === 'image' ? '🖼️ IMAGE' : type === 'link' ? '🔗 LINK' : '📝 NOTE') + '</span>';
      }

      header.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' + headerLeft + '</div>';

      const delBtn = document.createElement('button');
      delBtn.className = 'element-delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.title = 'Delete element';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        el.remove();
        const idx = elements.indexOf(item);
        if (idx !== -1) elements.splice(idx, 1);
      };
      header.appendChild(delBtn);
      el.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.className = 'element-body' + (type === 'code' ? ' code-body' : '');

      if (type === 'image') {
        const img = document.createElement('img');
        img.src = content;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.borderRadius = '3px';
        body.appendChild(img);
      } else if (type === 'link') {
        const link = document.createElement('a');
        link.href = content;
        link.target = '_blank';
        link.style.color = 'var(--vscode-textLink-foreground)';
        link.style.textDecoration = 'underline';
        link.style.fontSize = '12px';
        link.style.wordBreak = 'break-all';
        link.textContent = title ? title + ' (' + content + ')' : content;
        body.appendChild(link);
      } else if (type === 'code') {
        const codeTa = document.createElement('textarea');
        codeTa.placeholder = '// Write or paste code snippet here...';
        codeTa.value = content || '// ' + (title || 'Code Snippet') + '\\nfunction run() {\\n  return true;\\n}';
        body.appendChild(codeTa);
      } else {
        const ta = document.createElement('textarea');
        ta.placeholder = 'Type tutorial notes here...';
        ta.value = content;
        body.appendChild(ta);
      }

      el.appendChild(body);

      // Resize Handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      resizeHandle.innerHTML = '&#8690;'; // ⇲ icon
      resizeHandle.title = 'Click & drag to resize';
      el.appendChild(resizeHandle);

      item.elementRef = el;
      makeDraggable(el, item);
      makeResizable(el, item);

      canvas.appendChild(el);
      elements.push(item);
    }

    document.getElementById('addTextBtn').addEventListener('click', () => {
      addElement('text', 40, 40, 'Tutorial Note');
    });

    // --- Image Modal Logic ---
    const imgModal = document.getElementById('imageModal');
    const imgUrlInput = document.getElementById('imgUrlInput');
    const imgFileInput = document.getElementById('imgFileInput');

    document.getElementById('addImageBtn').addEventListener('click', () => {
      imgUrlInput.value = '';
      imgFileInput.value = '';
      imgModal.style.display = 'flex';
      imgUrlInput.focus();
    });

    document.getElementById('cancelImgBtn').addEventListener('click', () => {
      imgModal.style.display = 'none';
    });

    document.getElementById('confirmImgBtn').addEventListener('click', () => {
      let url = imgUrlInput.value.trim();
      if (imgFileInput.files && imgFileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          addElement('image', 60, 60, e.target.result);
          imgModal.style.display = 'none';
        };
        reader.readAsDataURL(imgFileInput.files[0]);
      } else if (url) {
        addElement('image', 60, 60, url);
        imgModal.style.display = 'none';
      } else {
        alert('Please enter an Image URL or select an image file.');
      }
    });

    // --- Link Modal Logic ---
    const linkModal = document.getElementById('linkModal');
    const linkUrlInput = document.getElementById('linkUrlInput');
    const linkTitleInput = document.getElementById('linkTitleInput');

    document.getElementById('addLinkBtn').addEventListener('click', () => {
      linkUrlInput.value = '';
      linkTitleInput.value = '';
      linkModal.style.display = 'flex';
      linkUrlInput.focus();
    });

    document.getElementById('cancelLinkBtn').addEventListener('click', () => {
      linkModal.style.display = 'none';
    });

    document.getElementById('confirmLinkBtn').addEventListener('click', () => {
      const url = linkUrlInput.value.trim();
      const title = linkTitleInput.value.trim();
      if (url) {
        addElement('link', 80, 80, url, title || url);
        linkModal.style.display = 'none';
      } else {
        alert('Please enter a Link URL.');
      }
    });

    // --- Code Snippet Modal Logic ---
    const codeModal = document.getElementById('codeModal');
    const codeLangSelect = document.getElementById('codeLangSelect');
    const codeTitleInput = document.getElementById('codeTitleInput');

    document.getElementById('addCodeBtn').addEventListener('click', () => {
      codeTitleInput.value = '';
      codeModal.style.display = 'flex';
      codeTitleInput.focus();
    });

    document.getElementById('cancelCodeBtn').addEventListener('click', () => {
      codeModal.style.display = 'none';
    });

    document.getElementById('confirmCodeBtn').addEventListener('click', () => {
      const lang = codeLangSelect.value;
      const title = codeTitleInput.value.trim() || (lang.toUpperCase() + ' Snippet');
      addElement('code', 50, 50, '', title, lang);
      codeModal.style.display = 'none';
    });

    // Save Tutorial
    document.getElementById('saveBtn').addEventListener('click', () => {
      const payload = elements.map(item => {
        let content = item.content;
        const textarea = item.elementRef.querySelector('textarea');
        if (textarea) content = textarea.value;

        return {
          type: item.type,
          x: parseInt(item.elementRef.style.left, 10),
          y: parseInt(item.elementRef.style.top, 10),
          width: parseInt(item.elementRef.style.width, 10) || item.width || 240,
          height: parseInt(item.elementRef.style.height, 10) || item.height || 140,
          content: content,
          title: item.title || '',
          language: item.language || 'javascript'
        };
      });

      vscode.postMessage({
        command: 'save',
        payload: { canvasElements: payload }
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * HTML for Read-Only Tutorial Viewer with Syntax Highlighted Code Cards
   */
  static getTutViewerHtml(tag) {
    const elements = (tag.tutData && tag.tutData.canvasElements) || [];

    // Client-side syntax highlighter for code cards
    const elementsHtml = elements.map(el => {
      const width = el.width || 260;
      const height = el.height || 140;

      let inner = '';

      if (el.type === 'code') {
        const highlightedCode = DialogManager.highlightSyntax(el.content);
        inner = `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:rgba(255,255,255,0.05); border-bottom:1px solid #333;">
            <div style="display:flex; gap:5px; align-items:center;">
              <span style="width:8px;height:8px;border-radius:50%;background:#ff5f56;display:inline-block;"></span>
              <span style="width:8px;height:8px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span>
              <span style="width:8px;height:8px;border-radius:50%;background:#27c93f;display:inline-block;"></span>
              <span style="font-family:monospace; font-size:10px; background:rgba(255,255,255,0.1); padding:1px 6px; border-radius:3px; color:#dcdcaa; margin-left:6px;">
                ${el.title ? el.title : (el.language || 'code').toUpperCase()}
              </span>
            </div>
            <button onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(el.content)}'))" style="background:transparent; border:1px solid #444; color:#ccc; border-radius:3px; padding:2px 6px; font-size:10px; cursor:pointer;" title="Copy Code">Copy</button>
          </div>
          <pre style="margin:0; padding:10px; font-family:'Fira Code', Consolas, monospace; font-size:12px; line-height:1.5; color:#d4d4d4; background:#181818; overflow:auto; height:calc(100% - 32px); box-sizing:border-box;"><code>${highlightedCode}</code></pre>
        `;
      } else if (el.type === 'image') {
        inner = `
          <div style="font-size:10px; color:var(--vscode-descriptionForeground); margin-bottom:4px; font-weight:600; text-transform:uppercase;">🖼️ Image</div>
          <img src="${el.content}" style="width:100%; height:calc(100% - 20px); object-fit:contain; display:block; border-radius:3px;"/>
        `;
      } else if (el.type === 'link') {
        inner = `
          <div style="font-size:10px; color:var(--vscode-descriptionForeground); margin-bottom:4px; font-weight:600; text-transform:uppercase;">🔗 Link</div>
          <a href="${el.content}" target="_blank" style="color:var(--vscode-textLink-foreground); font-size:12px; font-weight:600; text-decoration:underline; word-break:break-all;">
            ${el.title ? el.title : el.content}
          </a>
        `;
      } else {
        inner = `
          <div style="font-size:10px; color:var(--vscode-descriptionForeground); margin-bottom:4px; font-weight:600; text-transform:uppercase;">📝 Note</div>
          <div style="white-space:pre-wrap; font-size:12px; height:calc(100% - 20px); overflow:auto;">${el.content}</div>
        `;
      }

      const cardBg = el.type === 'code' ? '#181818' : 'var(--vscode-editorWidget-background)';
      const cardBorder = el.type === 'code' ? '#333' : 'var(--vscode-widget-border)';

      return `<div style="position:absolute; left:${el.x}px; top:${el.y}px; width:${width}px; height:${height}px; background:${cardBg}; border:1px solid ${cardBorder}; border-radius:6px; box-shadow:0 6px 18px rgba(0,0,0,0.4); box-sizing:border-box; overflow:hidden; display:flex; flex-direction:column; padding:${el.type === 'code' ? '0' : '8px 10px'};">${inner}</div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      margin: 0;
      padding: 16px;
      height: 100vh;
      box-sizing: border-box;
      position: relative;
      overflow: auto;
    }
    .header {
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border);
      margin-bottom: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0 0 4px 0;">Tutorial: ${tag.word}</h2>
    <small style="color:var(--vscode-descriptionForeground);">Interactive tutorial notes, code snippets, and diagrams.</small>
  </div>
  <div style="position:relative; width:100%; height:calc(100vh - 90px); background:var(--vscode-editorWidget-background); border-radius:6px; border:1px dashed var(--vscode-widget-border); overflow:auto;">
    ${elementsHtml || '<p style="padding:16px; color:var(--vscode-descriptionForeground);">No tutorial elements found.</p>'}
  </div>
</body>
</html>`;
  }

  /**
   * Helper: Colorful syntax highlighter for code snippets
   */
  static highlightSyntax(code) {
    if (!code) return '';
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Comments (green)
    escaped = escaped.replace(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm, '<span style="color:#6a9955;font-style:italic;">$1</span>');
    // Strings (orange/amber)
    escaped = escaped.replace(/(&quot;[\s\S]*?&quot;|'[\s\S]*?'|`[\s\S]*?`)/g, '<span style="color:#ce9178;">$1</span>');
    // Keywords (purple)
    escaped = escaped.replace(/\b(const|let|var|function|return|if|else|for|while|import|export|class|async|await|def|from|true|false|null|undefined|new|this)\b/g, '<span style="color:#c586c0;font-weight:600;">$1</span>');
    // Numbers (light green)
    escaped = escaped.replace(/\b(\d+)\b/g, '<span style="color:#b5cea8;">$1</span>');
    // Function calls (yellow)
    escaped = escaped.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span style="color:#dcdcaa;">$1</span>');

    return escaped;
  }
}

module.exports = {
  DialogManager
};
