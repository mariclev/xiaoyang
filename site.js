document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEYS = {
    diary: 'xiaoyang_diary_v1',
    profile: 'xiaoyang_profile_v1'
  };

  const safeJsonParse = (value, fallback) => {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    }).format(date);
  };

  /* 文章搜索与标签筛选 */
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

  /* 日记：本地增删改、导入、导出 */
  const diaryForm = document.querySelector('#diary-form');
  const diaryId = document.querySelector('#diary-id');
  const diaryDate = document.querySelector('#diary-date');
  const diaryMood = document.querySelector('#diary-mood');
  const diaryTitle = document.querySelector('#diary-title');
  const diaryContent = document.querySelector('#diary-content');
  const diarySubmit = document.querySelector('#diary-submit');
  const diaryCancel = document.querySelector('#diary-cancel');
  const diaryList = document.querySelector('#diary-list');
  const diaryEmpty = document.querySelector('#diary-empty');
  const diaryCount = document.querySelector('#diary-count');
  const diaryExport = document.querySelector('#diary-export');
  const diaryImport = document.querySelector('#diary-import');

  let diaries = safeJsonParse(localStorage.getItem(STORAGE_KEYS.diary), []);
  if (!Array.isArray(diaries)) diaries = [];

  const persistDiaries = () => {
    localStorage.setItem(STORAGE_KEYS.diary, JSON.stringify(diaries));
  };

  const resetDiaryForm = () => {
    diaryForm?.reset();
    if (diaryDate) diaryDate.value = new Date().toISOString().slice(0, 10);
    if (diaryId) diaryId.value = '';
    if (diarySubmit) diarySubmit.textContent = '保存日记';
    if (diaryCancel) diaryCancel.hidden = true;
  };

  const createDiaryCard = (entry) => {
    const article = document.createElement('article');
    article.className = 'diary-card';
    article.dataset.id = entry.id;

    const head = document.createElement('div');
    head.className = 'diary-card-head';

    const mood = document.createElement('span');
    mood.className = 'diary-mood';
    mood.textContent = entry.mood || '☕';

    const meta = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = entry.title;
    const time = document.createElement('time');
    time.dateTime = entry.date;
    time.textContent = formatDate(entry.date);
    meta.append(title, time);

    const actions = document.createElement('div');
    actions.className = 'diary-card-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = '编辑';
    edit.addEventListener('click', () => {
      if (diaryId) diaryId.value = entry.id;
      if (diaryDate) diaryDate.value = entry.date;
      if (diaryMood) diaryMood.value = entry.mood || '☕';
      if (diaryTitle) diaryTitle.value = entry.title;
      if (diaryContent) diaryContent.value = entry.content;
      if (diarySubmit) diarySubmit.textContent = '更新日记';
      if (diaryCancel) diaryCancel.hidden = false;
      diaryForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      diaryTitle?.focus();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = '删除';
    remove.addEventListener('click', () => {
      if (!window.confirm(`确定删除《${entry.title}》吗？此操作不能撤销。`)) return;
      diaries = diaries.filter((item) => item.id !== entry.id);
      persistDiaries();
      renderDiaries();
      if (diaryId?.value === entry.id) resetDiaryForm();
    });

    actions.append(edit, remove);
    head.append(mood, meta, actions);

    const body = document.createElement('p');
    body.className = 'diary-card-content';
    body.textContent = entry.content;

    article.append(head, body);
    return article;
  };

  const renderDiaries = () => {
    if (!diaryList) return;
    diaryList.replaceChildren();
    const sorted = [...diaries].sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date));
      return byDate || Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    });
    sorted.forEach((entry) => diaryList.appendChild(createDiaryCard(entry)));
    if (diaryCount) diaryCount.textContent = String(sorted.length);
    if (diaryEmpty) diaryEmpty.hidden = sorted.length > 0;
  };

  diaryForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = diaryTitle?.value.trim() || '';
    const content = diaryContent?.value.trim() || '';
    const date = diaryDate?.value || '';
    if (!title || !content || !date) return;

    const now = Date.now();
    const currentId = diaryId?.value || '';
    if (currentId) {
      diaries = diaries.map((item) => item.id === currentId
        ? { ...item, date, mood: diaryMood?.value || '☕', title, content, updatedAt: now }
        : item);
    } else {
      diaries.push({
        id: `${now}-${Math.random().toString(16).slice(2)}`,
        date,
        mood: diaryMood?.value || '☕',
        title,
        content,
        createdAt: now,
        updatedAt: now
      });
    }
    persistDiaries();
    renderDiaries();
    resetDiaryForm();
  });

  diaryCancel?.addEventListener('click', resetDiaryForm);

  diaryExport?.addEventListener('click', () => {
    const payload = {
      app: '小羊半夏的温馨小家',
      version: 1,
      exportedAt: new Date().toISOString(),
      diaries
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `小羊半夏-日记备份-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  diaryImport?.addEventListener('change', async () => {
    const file = diaryImport.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = Array.isArray(parsed) ? parsed : parsed.diaries;
      if (!Array.isArray(imported)) throw new Error('备份格式无效');
      const valid = imported.filter((item) => item && typeof item.title === 'string' && typeof item.content === 'string' && typeof item.date === 'string')
        .map((item) => ({
          id: String(item.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
          date: item.date.slice(0, 10),
          mood: String(item.mood || '☕').slice(0, 4),
          title: item.title.slice(0, 60),
          content: item.content.slice(0, 3000),
          createdAt: Number(item.createdAt || Date.now()),
          updatedAt: Number(item.updatedAt || Date.now())
        }));
      if (!valid.length && imported.length) throw new Error('没有可识别的日记');
      if (!window.confirm(`将导入 ${valid.length} 篇日记，并替换当前浏览器中的日记，是否继续？`)) return;
      diaries = valid;
      persistDiaries();
      renderDiaries();
      resetDiaryForm();
      window.alert('日记导入成功。');
    } catch (error) {
      window.alert(`导入失败：${error.message}`);
    } finally {
      diaryImport.value = '';
    }
  });

  resetDiaryForm();
  renderDiaries();

  /* 个人资料：头像、说说、签名 */
  const defaultProfile = {
    avatar: 'assets/avatar.svg',
    status: '持续学习与更新中',
    signature: '愿每一次学习，都有一点收获；\n愿每一次记录，都能照亮后来的人。'
  };
  let profile = { ...defaultProfile, ...safeJsonParse(localStorage.getItem(STORAGE_KEYS.profile), {}) };

  const profileEditor = document.querySelector('#profile-editor');
  const profileForm = document.querySelector('#profile-form');
  const profileOpen = document.querySelector('#open-profile-editor');
  const profileCancel = document.querySelector('#profile-cancel');
  const statusInput = document.querySelector('#status-input');
  const signatureInput = document.querySelector('#signature-input');
  const avatarUpload = document.querySelector('#avatar-upload');
  const avatarSelect = document.querySelector('#avatar-select');
  const avatarReset = document.querySelector('#avatar-reset');
  const avatarPreview = document.querySelector('#avatar-preview');
  let pendingAvatar = profile.avatar;

  const applyProfile = () => {
    document.querySelectorAll('.user-avatar').forEach((image) => {
      image.src = profile.avatar || defaultProfile.avatar;
    });
    const signature = document.querySelector('#profile-signature');
    const signatureCopy = document.querySelector('#profile-signature-copy');
    const status = document.querySelector('#profile-status');
    const statusCopy = document.querySelector('#profile-status-copy');
    if (signature) {
      signature.replaceChildren();
      profile.signature.split('\n').forEach((line, index) => {
        if (index) signature.appendChild(document.createElement('br'));
        signature.appendChild(document.createTextNode(line));
      });
    }
    if (signatureCopy) signatureCopy.textContent = profile.signature.replace(/\n+/g, ' ');
    if (status) status.textContent = profile.status;
    if (statusCopy) statusCopy.textContent = profile.status;
  };

  const openProfileEditor = () => {
    pendingAvatar = profile.avatar;
    if (statusInput) statusInput.value = profile.status;
    if (signatureInput) signatureInput.value = profile.signature;
    if (avatarPreview) avatarPreview.src = pendingAvatar;
    if (profileEditor) profileEditor.hidden = false;
    profileEditor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  profileOpen?.addEventListener('click', openProfileEditor);
  profileCancel?.addEventListener('click', () => {
    if (profileEditor) profileEditor.hidden = true;
  });
  avatarSelect?.addEventListener('click', () => avatarUpload?.click());

  const loadImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取图片'));
    image.src = url;
  });

  const compressAvatar = async (file) => {
    if (file.size > 8 * 1024 * 1024) throw new Error('图片不能超过 8MB');
    if (file.type === 'image/svg+xml') {
      const text = await file.text();
      if (!text.includes('<svg')) throw new Error('SVG 文件格式无效');
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    }
    const source = URL.createObjectURL(file);
    try {
      const image = await loadImage(source);
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - side) / 2;
      const sy = (image.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff8f0';
      context.fillRect(0, 0, 512, 512);
      context.drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
      return canvas.toDataURL('image/webp', 0.82);
    } finally {
      URL.revokeObjectURL(source);
    }
  };

  avatarUpload?.addEventListener('change', async () => {
    const file = avatarUpload.files?.[0];
    if (!file) return;
    try {
      pendingAvatar = await compressAvatar(file);
      if (avatarPreview) avatarPreview.src = pendingAvatar;
    } catch (error) {
      window.alert(`头像处理失败：${error.message}`);
    } finally {
      avatarUpload.value = '';
    }
  });

  avatarReset?.addEventListener('click', () => {
    pendingAvatar = defaultProfile.avatar;
    if (avatarPreview) avatarPreview.src = pendingAvatar;
  });

  profileForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    profile = {
      avatar: pendingAvatar || defaultProfile.avatar,
      status: statusInput?.value.trim().slice(0, 40) || defaultProfile.status,
      signature: signatureInput?.value.trim().slice(0, 120) || defaultProfile.signature
    };
    try {
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
      applyProfile();
      if (profileEditor) profileEditor.hidden = true;
    } catch {
      window.alert('保存失败：浏览器存储空间可能不足，请选择更小的头像。');
    }
  });

  applyProfile();

  /* 返回顶部与导航高亮 */
  const topButton = document.createElement('button');
  topButton.className = 'back-to-top';
  topButton.type = 'button';
  topButton.setAttribute('aria-label', '返回顶部');
  topButton.textContent = '↑';
  document.body.appendChild(topButton);

  const updateTopButton = () => topButton.classList.toggle('show', window.scrollY > 500);
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', updateTopButton, { passive: true });
  updateTopButton();

  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.site-header nav a')];
  if ('IntersectionObserver' in window && sections.length && navLinks.length) {
    const observer = new IntersectionObserver((entries) => {
      const visibleEntry = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visibleEntry) return;
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${visibleEntry.target.id}`);
      });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0.05, 0.2, 0.5] });
    sections.forEach((section) => observer.observe(section));
  }
});
