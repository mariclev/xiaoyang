document.addEventListener('DOMContentLoaded', () => {
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

  if (searchInput && articleCards.length) {
    searchInput.addEventListener('input', updateResults);
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      filterButtons.forEach((item) => item.classList.toggle('active', item === button));
      updateResults();
    });
  });

  updateResults();

  const topButton = document.createElement('button');
  topButton.className = 'back-to-top';
  topButton.type = 'button';
  topButton.setAttribute('aria-label', '返回顶部');
  topButton.textContent = '↑';
  document.body.appendChild(topButton);

  const updateTopButton = () => {
    topButton.classList.toggle('show', window.scrollY > 500);
  };

  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', updateTopButton, { passive: true });
  updateTopButton();

  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.site-header nav a')];

  if ('IntersectionObserver' in window && sections.length && navLinks.length) {
    const observer = new IntersectionObserver((entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visibleEntry) return;

      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${visibleEntry.target.id}`);
      });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0.05, 0.2, 0.5] });

    sections.forEach((section) => observer.observe(section));
  }
});
