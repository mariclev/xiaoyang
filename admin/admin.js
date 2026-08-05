document.addEventListener('DOMContentLoaded', () => {
  const PROFILE_URL = '/data/profile.json';
  const DIARIES_URL = '/data/diaries.json';
  const LOCAL_KEYS = {
    profile: 'xiaoyang_profile_v1',
    diaries: 'xiaoyang_diary_v1'
  };

  const state = {
    profile: {
      displayName: '小羊半夏',
      status: '持续学习与更新中',
      signature: '愿每一次学习，都有一点收获；\n愿每一次记录，都能照亮后来的人。',
      avatar: '/assets/avatar.svg',
      updatedAt: new Date().toISOString()
    },
    diaries: []
  };

  const $ = (selector) => document.querySelector(selector);
  const statusNode = $('#save-status');

  const setStatus = (text, tone = '') => {
    if (!statusNode) return;
    statusNode.textContent = text;
    statusNode.dataset.tone = tone;
  };

  const safeJsonParse = (value, fallback) => {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const fetchJson = async (url) => {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  };

  const cleanProfile = (raw = {}) => ({
    displayName: String(raw.displayName || '小羊半夏').trim().slice(0, 30),
    status: String(raw.status || '持续学习与更新中').trim().slice(0, 80),
    signature: String(raw.signature || '愿每一次学习，都有一点收获；\n愿每一次记录，都能照亮后来的人。').trim().slice(0, 240),
    avatar: String(raw.avatar || '/assets/avatar.svg').trim().slice(0, 500),
    updatedAt: new Date().toISOString()
  });

  const cleanDiary = (raw = {}) => ({
    id: String(raw.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 100),
    date: String(raw.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
    mood: String(raw.mood || '☕').slice(0, 8),
    title: String(raw.title || '').trim().slice(0, 80),
    content: String(raw.content || '').trim().slice(0, 10000),
    isPublic: raw.isPublic === true,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const sortDiaries = () => {
    state.diaries.sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date));
      return byDate || String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
  };

  const downloadText = (filename, text, type = 'application/json') => {
    const blob = new Blob([text], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const copyText = async (text, successText) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(successText, 'ok');
    } catch {
      window.prompt('浏览器无法自动复制，请手动复制下面内容：', text);
    }
  };

  const profileJson = () => `${JSON.stringify(cleanProfile(state.profile), null, 2)}\n`;
  const diariesJson = () => `${JSON.stringify(state.diaries.map(cleanDiary), null, 2)}\n`;

  const syncProfileForm = () => {
    $('#display-name').value = state.profile.displayName;
    $('#status-input').value = state.profile.status;
    $('#signature-input').value = state.profile.signature;
    $('#avatar-path').value = state.profile.avatar;
    $('#avatar-preview').src = state.profile.avatar || '/assets/avatar.svg';
  };

  const resetDiaryForm = () => {
    $('#diary-form').reset();
    $('#diary-id').value = '';
    $('#diary-date').value = new Date().toISOString().slice(0, 10);
    $('#diary-mood').value = '🌱';
    $('#cancel-edit').hidden = true;
  };

  const renderDiaries = () => {
    sortDiaries();
    const list = $('#diary-list');
    list.replaceChildren();
    $('#diary-count').textContent = String(state.diaries.length);

    if (!state.diaries.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = '暂时没有日记，先写一篇吧。';
      list.appendChild(empty);
      return;
    }

    state.diaries.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'diary-item';

      const head = document.createElement('div');
      head.className = 'diary-item-head';

      const info = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = `${entry.mood || '☕'} ${entry.title || '未命名日记'}`;
      const meta = document.createElement('p');
      meta.textContent = `${entry.date} · ${entry.isPublic ? '公开' : '私密'}`;
      info.append(title, meta);

      const actions = document.createElement('div');
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = '编辑';
      edit.addEventListener('click', () => {
        $('#diary-id').value = entry.id;
        $('#diary-date').value = entry.date;
        $('#diary-mood').value = entry.mood || '☕';
        $('#diary-title').value = entry.title;
        $('#diary-content').value = entry.content;
        $('#diary-public').checked = entry.isPublic === true;
        $('#cancel-edit').hidden = false;
        $('#diary-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'danger';
      remove.textContent = '删除';
      remove.addEventListener('click', () => {
        if (!window.confirm(`确定删除《${entry.title}》吗？`)) return;
        state.diaries = state.diaries.filter((item) => item.id !== entry.id);
        renderDiaries();
        resetDiaryForm();
        setStatus('日记已从草稿中删除，下载 JSON 并提交 GitHub 后才会生效。', 'warn');
      });

      actions.append(edit, remove);
      head.append(info, actions);

      const content = document.createElement('p');
      content.className = 'diary-content';
      content.textContent = entry.content;

      card.append(head, content);
      list.appendChild(card);
    });
  };

  const loadData = async () => {
    try {
      const [profile, diaries] = await Promise.all([
        fetchJson(PROFILE_URL),
        fetchJson(DIARIES_URL)
      ]);
      state.profile = cleanProfile(profile);
      state.diaries = Array.isArray(diaries)
        ? diaries.filter(Boolean).map(cleanDiary)
        : [];
      syncProfileForm();
      renderDiaries();
      resetDiaryForm();
      setStatus('云端数据已读取。', 'ok');
    } catch (error) {
      console.error(error);
      syncProfileForm();
      renderDiaries();
      resetDiaryForm();
      setStatus('云端数据读取失败，当前使用默认草稿。', 'error');
    }
  };

  $('#profile-form').addEventListener('submit', (event) => {
    event.preventDefault();
    state.profile = cleanProfile({
      displayName: $('#display-name').value,
      status: $('#status-input').value,
      signature: $('#signature-input').value,
      avatar: $('#avatar-path').value
    });
    syncProfileForm();
    setStatus('个人资料草稿已保存，下载 profile.json 后提交 GitHub。', 'warn');
  });

  $('#avatar-path').addEventListener('input', () => {
    $('#avatar-preview').src = $('#avatar-path').value.trim() || '/assets/avatar.svg';
  });

  $('#download-profile').addEventListener('click', () => {
    state.profile = cleanProfile({
      displayName: $('#display-name').value,
      status: $('#status-input').value,
      signature: $('#signature-input').value,
      avatar: $('#avatar-path').value
    });
    downloadText('profile.json', profileJson());
    setStatus('profile.json 已下载。', 'ok');
  });

  $('#copy-profile').addEventListener('click', () => {
    state.profile = cleanProfile({
      displayName: $('#display-name').value,
      status: $('#status-input').value,
      signature: $('#signature-input').value,
      avatar: $('#avatar-path').value
    });
    copyText(profileJson(), '个人资料 JSON 已复制。');
  });

  $('#diary-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const draft = cleanDiary({
      id: $('#diary-id').value || undefined,
      date: $('#diary-date').value,
      mood: $('#diary-mood').value,
      title: $('#diary-title').value,
      content: $('#diary-content').value,
      isPublic: $('#diary-public').checked
    });

    if (!draft.title || !draft.content) return;
    const index = state.diaries.findIndex((item) => item.id === draft.id);
    if (index >= 0) {
      draft.createdAt = state.diaries[index].createdAt || draft.createdAt;
      state.diaries[index] = draft;
    } else {
      state.diaries.push(draft);
    }
    renderDiaries();
    resetDiaryForm();
    setStatus('日记草稿已保存，下载 diaries.json 后提交 GitHub。', 'warn');
  });

  $('#cancel-edit').addEventListener('click', resetDiaryForm);

  $('#download-diaries').addEventListener('click', () => {
    sortDiaries();
    downloadText('diaries.json', diariesJson());
    setStatus('diaries.json 已下载。', 'ok');
  });

  $('#copy-diaries').addEventListener('click', () => {
    sortDiaries();
    copyText(diariesJson(), '日记 JSON 已复制。');
  });

  $('#migrate-local').addEventListener('click', () => {
    const oldProfile = safeJsonParse(localStorage.getItem(LOCAL_KEYS.profile), null);
    const oldDiaries = safeJsonParse(localStorage.getItem(LOCAL_KEYS.diaries), []);
    let imported = 0;

    if (oldProfile && typeof oldProfile === 'object') {
      state.profile = cleanProfile({
        displayName: state.profile.displayName,
        status: oldProfile.status || state.profile.status,
        signature: oldProfile.signature || state.profile.signature,
        avatar: oldProfile.avatar || state.profile.avatar
      });
      syncProfileForm();
    }

    if (Array.isArray(oldDiaries)) {
      oldDiaries.forEach((entry) => {
        if (!entry || typeof entry.title !== 'string' || typeof entry.content !== 'string') return;
        const diary = cleanDiary({
          ...entry,
          date: entry.date,
          isPublic: false
        });
        if (!state.diaries.some((item) => item.id === diary.id)) {
          state.diaries.push(diary);
          imported += 1;
        }
      });
    }

    renderDiaries();
    setStatus(`本机旧数据迁移完成：新增 ${imported} 篇日记。旧日记默认设为私密。`, 'ok');
  });

  const loadImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取图片'));
    image.src = url;
  });

  $('#avatar-file').addEventListener('change', async () => {
    const file = $('#avatar-file').files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      window.alert('图片不能超过 10MB。');
      $('#avatar-file').value = '';
      return;
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

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
      if (!blob) throw new Error('图片压缩失败');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'avatar.webp';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      $('#avatar-preview').src = canvas.toDataURL('image/webp', 0.86);
      $('#avatar-path').value = '/assets/avatar.webp';
      setStatus('avatar.webp 已下载。请上传到仓库 assets 目录。', 'ok');
    } catch (error) {
      window.alert(`头像处理失败：${error.message}`);
    } finally {
      URL.revokeObjectURL(source);
      $('#avatar-file').value = '';
    }
  });

  loadData();
});
