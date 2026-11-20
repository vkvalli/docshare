(() => {
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    user: $('#user-select'), newDoc: $('#new-doc'), welcomeNewDoc: $('#welcome-new-doc'), upload: $('#file-upload'),
    owned: $('#owned-list'), shared: $('#shared-list'), ownedEmpty: $('#owned-empty'), sharedEmpty: $('#shared-empty'),
    welcome: $('#welcome'), editorView: $('#editor-view'), title: $('#document-title'), topTitle: $('#topbar-title'),
    status: $('#save-status'), badge: $('#access-badge'), error: $('#error-banner'), toolbar: $('#quill-toolbar'),
    shareToggle: $('#share-toggle'), sharePanel: $('#share-panel'), shareUser: $('#share-user'), shareRole: $('#share-role'),
    shareSubmit: $('#share-submit'), shareList: $('#share-list'), readonlyNote: $('#readonly-note')
  };
  const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: { toolbar: '#quill-toolbar' },
    placeholder: 'Start writing…'
  });

  let currentDocument = null;
  let userNames = {};
  let saveTimer = null;
  let isLoadingDocument = false;
  let pendingSave = Promise.resolve();

  function showError(message) {
    ui.error.textContent = message;
    ui.error.hidden = false;
  }

  function clearError() {
    ui.error.textContent = '';
    ui.error.hidden = true;
  }

  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('X-User-Id', ui.user.value);
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(url, { ...options, headers });
    let body;
    try { body = await response.json(); } catch { body = {}; }
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
    return body;
  }

  function makeDocItem(doc, shared = false) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `doc-item${currentDocument?.id === doc.id ? ' active' : ''}`;
    button.dataset.id = doc.id;
    const title = document.createElement('span');
    title.className = 'doc-item-title';
    title.textContent = doc.title;
    button.append(title);
    if (shared) {
      const detail = document.createElement('span');
      detail.className = 'doc-item-detail';
      detail.textContent = `${doc.role} · ${userNames[doc.ownerId] || doc.ownerId}`;
      button.append(detail);
    }
    button.addEventListener('click', () => openDocument(doc.id));
    li.append(button);
    return li;
  }

  async function refreshDocuments() {
    const { owned, shared } = await api('/api/documents');
    ui.owned.replaceChildren(...owned.map((doc) => makeDocItem(doc)));
    ui.shared.replaceChildren(...shared.map((doc) => makeDocItem(doc, true)));
    ui.ownedEmpty.hidden = owned.length > 0;
    ui.sharedEmpty.hidden = shared.length > 0;
  }

  function setSaveStatus(value) {
    ui.status.textContent = value;
    ui.status.classList.toggle('is-saving', value === 'Saving…');
  }

  function showEditor(doc) {
    currentDocument = doc;
    const isReadOnly = doc.role === 'view';
    isLoadingDocument = true;
    ui.welcome.hidden = true;
    ui.editorView.hidden = false;
    ui.title.value = doc.title;
    ui.title.readOnly = isReadOnly;
    ui.topTitle.textContent = doc.title;
    quill.enable(!isReadOnly);
    quill.setText('');
    if (doc.content) quill.clipboard.dangerouslyPasteHTML(doc.content, 'silent');
    ui.toolbar.classList.toggle('toolbar-disabled', isReadOnly);
    ui.readonlyNote.hidden = !isReadOnly;
    ui.badge.hidden = false;
    ui.badge.textContent = isReadOnly ? 'Can view' : doc.role === 'edit' ? 'Can edit' : 'Owner';
    ui.shareToggle.hidden = doc.role !== 'owner';
    ui.sharePanel.hidden = true;
    ui.shareList.replaceChildren();
    setSaveStatus('Saved');
    isLoadingDocument = false;
  }

  async function openDocument(id) {
    clearError();
    if (saveTimer) await saveNow();
    try {
      const { document: doc } = await api(`/api/documents/${encodeURIComponent(id)}`);
      showEditor(doc);
      await refreshDocuments();
    } catch (error) { showError(error.message); }
  }

  async function createDocument() {
    clearError();
    try {
      if (saveTimer) await saveNow();
      const { document: doc } = await api('/api/documents', {
        method: 'POST', body: JSON.stringify({ title: 'Untitled document' })
      });
      showEditor(doc);
      await refreshDocuments();
      ui.title.focus();
      ui.title.select();
    } catch (error) { showError(error.message); }
  }

  function scheduleSave() {
    if (isLoadingDocument || !currentDocument || currentDocument.role === 'view') return;
    clearTimeout(saveTimer);
    setSaveStatus('Saving…');
    saveTimer = setTimeout(saveNow, 700);
  }

  async function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!currentDocument || currentDocument.role === 'view') return pendingSave;
    const id = currentDocument.id;
    const title = ui.title.value.trim();
    if (!title) {
      setSaveStatus('Not saved');
      showError('Document title cannot be blank.');
      return;
    }
    const content = quill.root.innerHTML === '<p><br></p>' ? '' : quill.root.innerHTML;
    setSaveStatus('Saving…');
    const operation = async () => {
      try {
        const { document: updated } = await api(`/api/documents/${encodeURIComponent(id)}`, {
          method: 'PATCH', body: JSON.stringify({ title, content })
        });
        if (currentDocument?.id === id) {
          currentDocument = updated;
          ui.title.value = updated.title;
          ui.topTitle.textContent = updated.title;
          setSaveStatus('Saved');
          clearError();
          await refreshDocuments();
        }
      } catch (error) {
        setSaveStatus('Not saved');
        showError(error.message);
      }
    };
    pendingSave = pendingSave.then(operation, operation);
    return pendingSave;
  }

  async function loadUsers() {
    const { users } = await api('/api/users');
    userNames = Object.fromEntries(users.map((user) => [user.id, user.name]));
    ui.shareUser.replaceChildren(...users
      .filter((user) => user.id !== ui.user.value)
      .map((user) => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        return option;
      }));
  }

  function renderShareList() {
    ui.shareList.replaceChildren();
    for (const share of currentDocument?.shares || []) {
      const row = document.createElement('div');
      row.className = 'share-row';
      const label = document.createElement('span');
      label.textContent = `${userNames[share.userId] || share.userId} · ${share.role}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'text-button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', async () => {
        try {
          const { document: updated } = await api(`/api/documents/${encodeURIComponent(currentDocument.id)}/shares/${encodeURIComponent(share.userId)}`, { method: 'DELETE' });
          currentDocument = updated;
          renderShareList();
          await refreshDocuments();
        } catch (error) { showError(error.message); }
      });
      row.append(label, remove);
      ui.shareList.append(row);
    }
  }

  ui.newDoc.addEventListener('click', createDocument);
  ui.welcomeNewDoc.addEventListener('click', createDocument);
  quill.on('text-change', scheduleSave);
  ui.title.addEventListener('input', () => {
    ui.topTitle.textContent = ui.title.value || 'Untitled document';
    scheduleSave();
  });

  ui.user.addEventListener('change', async () => {
    clearTimeout(saveTimer);
    saveTimer = null;
    currentDocument = null;
    ui.editorView.hidden = true;
    ui.welcome.hidden = false;
    ui.topTitle.textContent = 'No document open';
    ui.badge.hidden = true;
    setSaveStatus('');
    clearError();
    try {
      await loadUsers();
      await refreshDocuments();
    } catch (error) { showError(error.message); }
  });

  ui.upload.addEventListener('change', async () => {
    const file = ui.upload.files?.[0];
    if (!file) return;
    clearError();
    if (!/\.(txt|md|docx)$/i.test(file.name)) {
      showError('Unsupported file type. Choose a .txt, .md, or .docx file (maximum 2 MB).');
      ui.upload.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError('File is too large. The maximum upload size is 2 MB.');
      ui.upload.value = '';
      return;
    }
    try {
      if (saveTimer) await saveNow();
      const form = new FormData();
      form.append('file', file);
      const { document: doc } = await api('/api/documents/upload', { method: 'POST', body: form });
      showEditor(doc);
      await refreshDocuments();
    } catch (error) { showError(error.message); }
    finally { ui.upload.value = ''; }
  });

  ui.shareToggle.addEventListener('click', () => {
    ui.sharePanel.hidden = !ui.sharePanel.hidden;
    if (!ui.sharePanel.hidden) renderShareList();
  });
  ui.shareSubmit.addEventListener('click', async () => {
    if (!currentDocument || !ui.shareUser.value) return;
    clearError();
    try {
      const userId = ui.shareUser.value;
      const { document: updated } = await api(`/api/documents/${encodeURIComponent(currentDocument.id)}/shares/${encodeURIComponent(userId)}`, {
        method: 'PUT', body: JSON.stringify({ role: ui.shareRole.value })
      });
      currentDocument = updated;
      renderShareList();
      await refreshDocuments();
    } catch (error) { showError(error.message); }
  });

  async function initialize() {
    try {
      await loadUsers();
      await refreshDocuments();
    } catch (error) { showError(error.message); }
  }
  initialize();
})();
