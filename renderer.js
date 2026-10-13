(() => {
  'use strict';

  const state = {
    documents: [],
    current: null,
    fontScale: Number(localStorage.getItem('ming-reader-font-scale') || 1),
    theme: localStorage.getItem('ming-reader-theme') || 'dark'
  };

  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    $('#themeToggle').textContent = state.theme === 'dark' ? '☀' : '☾';
    localStorage.setItem('ming-reader-theme', state.theme);
  }

  function setFontScale(next) {
    state.fontScale = Math.min(1.24, Math.max(0.88, next));
    document.documentElement.style.setProperty('--reader-scale', state.fontScale.toFixed(2));
    localStorage.setItem('ming-reader-font-scale', state.fontScale.toFixed(2));
  }

  function paintFullscreenButton(on) {
    const button = $('#fullscreenToggle');
    if (!button) return;
    button.textContent = '⛶';
    button.setAttribute('aria-pressed', String(on));
    button.title = on ? '退出全屏阅读（Esc）' : '全屏阅读（F11）';
    button.setAttribute('aria-label', button.title);
  }

  async function setFullscreenMode(on, syncNative = true) {
    const enabled = Boolean(on && state.current);
    document.body.classList.toggle('reader-fullscreen', enabled);
    paintFullscreenButton(enabled);
    if (syncNative && window.reader.setFullscreen) {
      try { await window.reader.setFullscreen(enabled); } catch (error) { /* 布局全屏仍可用 */ }
    }
    requestAnimationFrame(updateProgress);
  }

  function toggleFullscreen() {
    if (!state.current) return;
    setFullscreenMode(!document.body.classList.contains('reader-fullscreen'));
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function normalizeLocalImages(source, baseDir) {
    const pattern = /(!\[[^\]]*\]\()([^\s)]+)(\))/g;
    const matches = [...String(source).matchAll(pattern)];
    if (!matches.length) return source;
    const urls = await Promise.all(matches.map((match) => window.reader.toFileUrl(baseDir, match[2])));
    let index = 0;
    return String(source).replace(pattern, (full, prefix, _target, suffix) => `${prefix}${urls[index++]}${suffix}`);
  }

  function makeHeadingIds() {
    const used = new Map();
    const headings = [...$('#readerBody').querySelectorAll('h1,h2,h3,h4,h5,h6')];
    return headings.map((heading) => {
      const base = (heading.textContent || 'section').trim().toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
      const count = used.get(base) || 0;
      used.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      heading.id = id;
      return { heading, id };
    });
  }

  function renderToc(headings) {
    const toc = $('#toc');
    const nav = $('#tocNav');
    if (!headings.length) {
      toc.hidden = true;
      nav.innerHTML = '';
      return;
    }
    toc.hidden = false;
    nav.innerHTML = headings.map(({ heading, id }) => `<button class="toc-${heading.tagName.toLowerCase()}" data-target="${escapeHtml(id)}">${escapeHtml(heading.textContent)}</button>`).join('');
    nav.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => document.getElementById(button.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  }

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable <= 0 ? 0 : window.scrollY / scrollable;
    $('#progress').style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }

  function renderList() {
    const list = $('#documentList');
    $('#fileCount').textContent = `${state.documents.length} 篇文档`;
    list.innerHTML = state.documents.length
      ? state.documents.map((doc) => `<button class="doc-item ${state.current?.id === doc.id ? 'active' : ''}" data-id="${escapeHtml(doc.id)}"><span class="doc-dot">◌</span><span class="doc-name">${escapeHtml(doc.title)}</span><small>${escapeHtml(doc.name)}</small></button>`).join('')
      : '<div class="empty-list">还没有打开的文档</div>';
    list.querySelectorAll('.doc-item').forEach((button) => button.addEventListener('click', () => selectDocument(button.dataset.id)));
  }

  async function selectDocument(id) {
    const doc = state.documents.find((item) => item.id === id);
    if (!doc) return;
    state.current = doc;
    renderList();
    $('#welcome').hidden = true;
    $('#readerWrap').hidden = false;
    $('#currentFile').textContent = doc.name;
    $('#readerTitle').textContent = doc.title;
    $('#readerMeta').textContent = `MARKDOWN · ${pathLabel(doc.path)}`;
    $('#readerStats').textContent = `${formatBytes(doc.bytes)} · ${doc.content.length.toLocaleString('zh-CN')} 字符`;
    $('#pathButton').textContent = doc.path;
    $('#pathButton').title = doc.path;
    $('#revealFile').disabled = false;
    $('#fullscreenToggle').disabled = false;
    const content = await normalizeLocalImages(doc.content, doc.dir);
    $('#readerBody').innerHTML = window.MingLongMarkdownRenderer.render(content);
    window.MingLongMarkdownRenderer.hydrateMath($('#readerBody'), window.katex);
    renderToc(makeHeadingIds());
    window.scrollTo({ top: 0, behavior: 'instant' });
    updateProgress();
  }

  function pathLabel(filePath) {
    const parts = String(filePath).split(/[\\/]/);
    return parts.length > 1 ? parts[parts.length - 2].toUpperCase() : 'LOCAL';
  }

  function addDocuments(result) {
    if (!result || !result.documents?.length) {
      if (result?.errors?.length) toast(result.errors[0].message || '无法打开文档');
      return;
    }
    const byId = new Map(state.documents.map((doc) => [doc.id, doc]));
    result.documents.forEach((doc) => byId.set(doc.id, doc));
    state.documents = [...byId.values()].sort((a, b) => b.modifiedAt - a.modifiedAt);
    renderList();
    selectDocument(result.documents[0].id);
  }

  async function openFiles() { addDocuments(await window.reader.openFiles()); }
  async function openFolder() { addDocuments(await window.reader.openFolder()); }

  $('#openFile').addEventListener('click', openFiles);
  $('#welcomeOpen').addEventListener('click', openFiles);
  $('#openFolder').addEventListener('click', openFolder);
  $('#themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });
  $('#fontDown').addEventListener('click', () => setFontScale(state.fontScale - 0.04));
  $('#fontUp').addEventListener('click', () => setFontScale(state.fontScale + 0.04));
  $('#fullscreenToggle').addEventListener('click', toggleFullscreen);
  $('#printDoc').addEventListener('click', () => state.current && window.print());
  $('#revealFile').addEventListener('click', () => state.current && window.reader.reveal(state.current.path));
  $('#pathButton').addEventListener('click', () => state.current && window.reader.reveal(state.current.path));
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  window.addEventListener('dragover', (event) => { event.preventDefault(); document.body.classList.add('dragging'); });
  window.addEventListener('dragleave', (event) => { if (event.relatedTarget === null) document.body.classList.remove('dragging'); });
  window.addEventListener('drop', async (event) => {
    event.preventDefault();
    document.body.classList.remove('dragging');
    const paths = [...event.dataTransfer.files].map((file) => file.path).filter(Boolean);
    if (paths.length) addDocuments(await window.reader.openPaths(paths));
  });
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); openFiles(); }
    if (event.key === 'F11') { event.preventDefault(); toggleFullscreen(); }
    if (event.key === 'Escape') {
      document.body.classList.remove('dragging');
      if (document.body.classList.contains('reader-fullscreen')) { event.preventDefault(); setFullscreenMode(false); }
    }
  });

  window.reader.onFullscreenChange((enabled) => setFullscreenMode(enabled, false));

  applyTheme();
  setFontScale(state.fontScale);
  $('#revealFile').disabled = true;
  $('#fullscreenToggle').disabled = true;
  paintFullscreenButton(false);
  renderList();
  window.reader.onInitialDocuments(addDocuments);
})();
