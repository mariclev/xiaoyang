document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('#article-search');
  const articleCards = [...document.querySelectorAll('.article-card')];
  const resultText = document.querySelector('#search-result');
  const emptyState = document.querySelector('#search-empty');

  if (searchInput && articleCards.length) {
    const updateResults = () => {
      const keyword = searchInput.value.trim().toLowerCase();
      let visible = 0;

      articleCards.forEach((card) => {
        const searchableText = `${card.dataset.search || ''} ${card.textContent}`.toLowerCase();
        const matched = !keyword || searchableText.includes(keyword);
        card.hidden = !matched;
        if (matched) visible += 1;
      });

      if (resultText) {
        resultText.textContent = keyword ? `找到 ${visible} 篇相关文章` : `共 ${articleCards.length} 篇文章`;
      }
      if (emptyState) emptyState.hidden = visible !== 0;
    };

    searchInput.addEventListener('input', updateResults);
    updateResults();
  }

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
});
