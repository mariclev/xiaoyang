document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_PROFILE = {
    displayName: '小羊半夏',
    status: '持续学习与更新中',
    signature: '愿每一次学习，都有一点收获；\n愿每一次记录，都能照亮后来的人。',
    avatar: '/assets/avatar.svg'
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(date);
  };

  const fetchJson = async (url) => {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  };

  const prepareCloudUi = () => {
    const diaryForm = document.querySelector('#diary-form');
    const profileEditor = document.querySelector('#profile-editor');
    const editorButton = document.querySelector('#open-profile-editor');
    const diaryHeadingCopy = document.querySelector('#diary .section-heading > p');
    const diaryToolbarActions = document.querySelector('.diary-toolbar > div');
    const storageNote = document.querySelector('.storage-note');
    const heroDiaryLink = document.querySelector('.hero-actions a[href="#diary"]');

    if (diaryForm) diaryForm.hidden = true;
    if (profileEditor) profileEditor.hidden = true;
    if (storageNote) storageNote.hidden = true;

    if (diaryHeadingCopy) {
      diaryHeadingCopy.textContent = '公开日记由 GitHub 数据文件统一管理，并通过 Netlify 自动同步到所有设备。';
    }

    if (heroDiaryLink) heroDiaryLink.textContent = '查看公开日记';

    if (editorButton) {
      editorButton.textContent = '进入内容管理';
      editorButton.addEventListener('click', () => {
        window.location.href = '/admin/';
      });
    }

    if (diaryToolbarActions) {
      diaryToolbarActions.replaceChildren();
      const adminLink = document.createElement('a');
      adminLink.className = 'button ghost';
      adminLink.href = '/admin/';
      adminLink.textContent = '管理日记';
      diaryToolbarActions.appendChild(adminLink);
    }

    const archive = document.querySelector('.diary-archive');
    if (archive && !archive.querySelector('.cloud-sync-note')) {
      const note = document.createElement('p');
      note.className = 'storage-note cloud-sync-note';
      note.textContent = '☁️ 云端版本：公开日记和个人资料由 GitHub 保存，Netlify 发布后多设备同步。';
      archive.prepend(note);
    }
  };

  const applyProfile = (rawProfile) => {
    const profile = { ...DEFAULT_PROFILE, ...(rawProfile || {}) };
    const name = String(profile.displayName || DEFAULT_PROFILE.displayName).trim().slice(0, 30);
    const status = String(profile.status || DEFAULT_PROFILE.status).trim().slice(0, 80);
    const signature = String(profile.signature || DEFAULT_PROFILE.signature).trim().slice(0, 240);
    const avatar = String(profile.avatar || DEFAULT_PROFILE.avatar);

    document.querySelectorAll('[data-profile-name]').forEach((node) => {
      node.textContent = name;
    });
    const brandName = document.querySelector('.brand strong');
    const aboutHeading = document.querySelector('.profile-main h2');
    if (brandName) brandName.textContent = name;
    if (aboutHeading) aboutHeading.textContent = `你好，我是${name}`;

    document.querySelectorAll('.user-avatar').forEach((image) => {
      image.src = avatar;
      image.alt = `${name}头像`;
      image.addEventListener('error', () => {
        image.src = DEFAULT_PROFILE.avatar;
      }, { once: true });
    });

    const signatureNode = document.querySelector('#profile-signature');
    if (signatureNode) {
      signatureNode.replaceChildren();
      signature.split(/\r?\n/).forEach((line, index) => {
        if (index) signatureNode.appendChild(document.createElement('br'));
        signatureNode.appendChild(document.createTextNode(line));
      });
    }

    const statusNode = document.querySelector('#profile-status');
    const statusCopy = document.querySelector('#profile-status-copy');
    const signatureCopy = document.querySelector('#profile-signature-copy');
    if (statusNode) statusNode.textContent = status;
    if (statusCopy) statusCopy.textContent = status;
    if (signatureCopy) signatureCopy.textContent = signature.replace(/\s*\n+\s*/g, ' ');
  };

  const loadProfile = async () => {
    try {
      applyProfile(await fetchJson('/data/profile.json'));
    } catch (error) {
      console.warn('无法读取云端个人资料，已使用默认内容。', error);
      applyProfile(DEFAULT_PROFILE);
    }
  };

  const createDiaryCard = (entry) => {
    const article = document.createElement('article');
    article.className = 'diary-card public-diary-card';

    const head = document.createElement('div');
    head.className = 'diary-card-head';

    const mood = document.createElement('span');
    mood.className = 'diary-mood';
    mood.textContent = String(entry.mood || '☕').slice(0, 8);

    const meta = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = String(entry.title || '未命名日记').slice(0, 80);
    const time = document.createElement('time');
    time.dateTime = String(entry.date || '').slice(0, 10);
    time.textContent = formatDate(entry.date);
    meta.append(title, time);

    const badge = document.createElement('span');
    badge.className = 'public-badge';
    badge.textContent = '公开';

    const body = document.createElement('p');
    body.className = 'diary-card-content';
    body.textContent = String(entry.content || '').slice(0, 10000);

    head.append(mood, meta, badge);
    article.append(head, body);
    return article;
  };

  const renderDiaries = (entries) => {
    const list = document.querySelector('#diary-list');
    const empty = document.querySelector('#diary-empty');
    const count = document.querySelector('#diary-count');
    if (!list) return;

    const publicEntries = (Array.isArray(entries) ? entries : [])
      .filter((entry) => entry && entry.isPublic === true)
      .sort((a, b) => {
        const dateOrder = String(b.date || '').localeCompare(String(a.date || ''));
        return dateOrder || String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
      });

    list.replaceChildren();
    publicEntries.forEach((entry) => list.appendChild(createDiaryCard(entry)));
    if (count) count.textContent = String(publicEntries.length);
    if (empty) empty.hidden = publicEntries.length > 0;
  };

  const loadDiaries = async () => {
    try {
      renderDiaries(await fetchJson('/data/diaries.json'));
    } catch (error) {
      console.error('无法读取公开日记。', error);
      renderDiaries([]);
      const empty = document.querySelector('#diary-empty');
      if (empty) {
        const message = empty.querySelector('p');
        if (message) message.textContent = '日记数据暂时无法读取，请稍后刷新。';
      }
    }
  };

  const searchInput = document.querySelector('#article-search');
  const articleCards = [...document.querySelectorAll('.article-card')];
  const resultText = document.querySelector('#search-result');
  const emptyState = document.querySelector('#search-empty');
  const filterButtons = [...document.querySelectorAll('.tag-filter')];
  let activeFilter = 'all';

  const updateResults = () => {
    const keyword = (searchInput?.value || '').trim().toLowerCase();
    let visible = 0;

    articleCards.forEach((card) => {
      const searchableText = `${card.dataset.search || ''} ${card.textContent}`.toLowerCase();
      const tags = (card.dataset.tags || '').toLowerCase();
      const matchedKeyword = !keyword || searchableText.includes(keyword);
      const matchedFilter = activeFilter === 'all' || tags.includes(activeFilter.toLowerCase());
      const matched = matchedKeyword && matchedFilter;
      card.hidden = !matched;
      if (matched) visible += 1;
    });

    if (resultText) {
      const parts = [];
      if (activeFilter !== 'all') parts.push(`标签“${activeFilter}”`);
      if (keyword) parts.push(`关键词“${searchInput.value.trim()}”`);
      resultText.textContent = parts.length
        ? `${parts.join('、')}：找到 ${visible} 篇文章`
        : `共 ${articleCards.length} 篇文章`;
    }
    if (emptyState) emptyState.hidden = visible !== 0;
  };

  searchInput?.addEventListener('input', updateResults);
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      filterButtons.forEach((item) => item.classList.toggle('active', item === button));
      updateResults();
    });
  });
  updateResults();

  const navLinks = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`);
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: [0.01, 0.2, 0.5] });
    sections.forEach((section) => observer.observe(section));
  }

  const topButton = document.createElement('button');
  topButton.className = 'back-to-top';
  topButton.type = 'button';
  topButton.setAttribute('aria-label', '返回顶部');
  topButton.textContent = '↑';
  document.body.appendChild(topButton);

  const updateTopButton = () => {
    topButton.classList.toggle('visible', window.scrollY > 520);
  };
  window.addEventListener('scroll', updateTopButton, { passive: true });
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateTopButton();

  prepareCloudUi();
  Promise.allSettled([loadProfile(), loadDiaries()]);
});
