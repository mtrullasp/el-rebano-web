(() => {
  'use strict';

  const book = window.EL_REBANO;
  const art = window.EL_REBANO_ART || {};
  if (!book) {
    document.body.innerHTML = '<p style="padding:3rem">No se ha podido cargar el manuscrito.</p>';
    return;
  }

  const chapters = [];
  book.parts.forEach((part, partIndex) => {
    part.chapters.forEach(chapter => chapters.push({...chapter, part: part.title, partIndex}));
  });

  const elements = {
    progress: document.getElementById('readingProgress'),
    toc: document.getElementById('toc'),
    tocNav: document.getElementById('tocNav'),
    tocToggle: document.getElementById('tocToggle'),
    tocClose: document.getElementById('tocClose'),
    tocScrim: document.getElementById('tocScrim'),
    art: document.getElementById('chapterArt'),
    image: document.getElementById('chapterImage'),
    part: document.getElementById('partLabel'),
    number: document.getElementById('chapterNumber'),
    title: document.getElementById('chapterTitle'),
    text: document.getElementById('chapterText'),
    previous: document.getElementById('previousChapter'),
    next: document.getElementById('nextChapter'),
    quickPrevious: document.getElementById('quickPreviousChapter'),
    quickNext: document.getElementById('quickNextChapter'),
    fontDown: document.getElementById('fontDown'),
    fontUp: document.getElementById('fontUp'),
    theme: document.getElementById('themeToggle')
  };

  let currentIndex = 0;
  let fontSize = readSetting('reader-font-size', window.innerWidth <= 640 ? 20 : 22);

  function readSetting(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
  }

  function saveSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* local files may deny storage */ }
  }

  function chapterHash(chapter) {
    return `#capitulo-${String(chapter.number).padStart(2, '0')}`;
  }

  function chapterIndexFromHash() {
    if (location.hash === '#prefacio') return chapters.findIndex(chapter => chapter.number === 1);
    const match = location.hash.match(/^#capitulo-(\d{1,2})$/i);
    if (!match) return 0;
    const number = Number(match[1]);
    const index = chapters.findIndex(chapter => chapter.number === number);
    return index < 0 ? 0 : index;
  }

  function renderToc() {
    elements.tocNav.innerHTML = book.parts.map(part => `
      <section>
        <h2 class="toc-part">${part.title}</h2>
        <ol class="toc-list">
          ${part.chapters.map(chapter => `
            <li><a href="${chapterHash(chapter)}" data-chapter="${chapter.number}">
              <span>${String(chapter.number).padStart(2, '0')}</span>${chapter.title}
            </a></li>`).join('')}
        </ol>
      </section>`).join('');
  }

  function renderChapter(index, shouldScroll = true) {
    currentIndex = Math.max(0, Math.min(chapters.length - 1, index));
    const chapter = chapters[currentIndex];
    const imageMeta = art[chapter.artKey || chapter.slug] || {};

    elements.part.textContent = chapter.part;
    elements.number.textContent = `Capítulo ${chapter.number}`;
    elements.title.textContent = chapter.title;
    elements.text.innerHTML = chapter.paragraphs.map(paragraph =>
      `<p${paragraph.kind ? ` class="${paragraph.kind}"` : ''}>${paragraph.html}</p>`
    ).join('');

    elements.art.classList.remove('image-missing');
    elements.image.alt = imageMeta.alt || `Ilustración del capítulo ${chapter.number}, ${chapter.title}.`;
    elements.image.style.objectPosition = imageMeta.position || 'center';
    elements.image.src = chapter.image;
    elements.image.onload = () => elements.art.classList.remove('image-missing');
    elements.image.onerror = () => elements.art.classList.add('image-missing');

    updatePagination(elements.previous, chapters[currentIndex - 1]);
    updatePagination(elements.next, chapters[currentIndex + 1]);
    updateQuickNavigation(elements.quickPrevious, chapters[currentIndex - 1], 'Prev Chapter');
    updateQuickNavigation(elements.quickNext, chapters[currentIndex + 1], 'Next Chapter');
    document.title = `${chapter.number}. ${chapter.title} · ${book.title}`;

    document.querySelectorAll('[data-chapter]').forEach(link => {
      if (Number(link.dataset.chapter) === chapter.number) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    closeToc();
    if (shouldScroll) window.scrollTo({top: 0, behavior: 'smooth'});
    updateProgress();
    preload(chapters[currentIndex + 1]);
  }

  function updatePagination(link, chapter) {
    if (!chapter) {
      link.hidden = true;
      link.removeAttribute('href');
      return;
    }
    link.hidden = false;
    link.href = chapterHash(chapter);
    link.querySelector('b').textContent = `${chapter.number}. ${chapter.title}`;
  }

  function updateQuickNavigation(button, chapter, label) {
    button.disabled = !chapter;
    button.dataset.hash = chapter ? chapterHash(chapter) : '';
    button.title = chapter ? `${label}: ${chapter.title}` : `${label}: no disponible`;
    button.setAttribute('aria-label', button.title);
  }

  function navigateFromQuickButton(button) {
    if (!button.disabled && button.dataset.hash) location.hash = button.dataset.hash;
  }

  function preload(chapter) {
    if (!chapter) return;
    const image = new Image();
    image.src = chapter.image;
  }

  function updateProgress() {
    const pageHeight = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const withinChapter = Math.min(1, Math.max(0, scrollY / pageHeight));
    const total = ((currentIndex + withinChapter) / chapters.length) * 100;
    elements.progress.style.width = `${total}%`;
  }

  function openToc() {
    elements.toc.classList.add('open');
    elements.tocScrim.classList.add('open');
    elements.tocToggle.setAttribute('aria-expanded', 'true');
  }

  function closeToc() {
    elements.toc.classList.remove('open');
    elements.tocScrim.classList.remove('open');
    elements.tocToggle.setAttribute('aria-expanded', 'false');
  }

  function applyFontSize(value) {
    fontSize = Math.max(17, Math.min(28, Number(value)));
    document.documentElement.style.setProperty('--reading-size', `${fontSize}px`);
    saveSetting('reader-font-size', fontSize);
  }

  function applyTheme(theme) {
    const chosen = ['day', 'night'].includes(theme) ? theme : 'day';
    document.documentElement.dataset.theme = chosen;
    document.body.dataset.state = 'STANDARD';
    elements.theme.textContent = chosen === 'night' ? '◑' : '◐';
    elements.theme.setAttribute('aria-label', chosen === 'night' ? 'Activar el tema claro' : 'Activar el tema nocturno');
    saveSetting('reader-theme', chosen);
  }

  renderToc();
  applyFontSize(fontSize);
  applyTheme(readSetting('reader-theme', 'day'));
  renderChapter(chapterIndexFromHash(), false);

  addEventListener('hashchange', () => renderChapter(chapterIndexFromHash()));
  addEventListener('scroll', updateProgress, {passive:true});
  elements.tocToggle.addEventListener('click', openToc);
  elements.tocClose.addEventListener('click', closeToc);
  elements.tocScrim.addEventListener('click', closeToc);
  elements.fontDown.addEventListener('click', () => applyFontSize(fontSize - 1));
  elements.fontUp.addEventListener('click', () => applyFontSize(fontSize + 1));
  elements.theme.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'night' ? 'day' : 'night'));
  elements.quickPrevious.addEventListener('click', () => navigateFromQuickButton(elements.quickPrevious));
  elements.quickNext.addEventListener('click', () => navigateFromQuickButton(elements.quickNext));
  addEventListener('keydown', event => {
    if (event.key === 'Escape') closeToc();
  });
})();
