document.addEventListener('DOMContentLoaded', () => {
  const article = document.querySelector('.article-content');
  const tocList = document.querySelector('#toc-list');
  const progressBar = document.querySelector('#reading-progress');
  const readingTime = document.querySelector('[data-reading-time]');

  if (article && readingTime) {
    const text = article.innerText.replace(/\s+/g, ' ').trim();
    const minutes = Math.max(1, Math.ceil(text.length / 350));
    readingTime.textContent = `约 ${minutes} 分钟`;
  }

  if (article && tocList) {
    const headings = [...article.querySelectorAll('h2, h3')];
    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = `section-${index + 1}`;
      const item = document.createElement('li');
      item.className = heading.tagName === 'H3' ? 'toc-subitem' : '';
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.appendChild(link);
      tocList.appendChild(item);
    });

    if ('IntersectionObserver' in window && headings.length) {
      const tocLinks = [...tocList.querySelectorAll('a')];
      const observer = new IntersectionObserver((entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!active) return;
        tocLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${active.target.id}`);
        });
      }, { rootMargin: '-15% 0px -72% 0px', threshold: [0, 0.2, 0.6] });
      headings.forEach((heading) => observer.observe(heading));
    }
  }

  document.querySelectorAll('pre').forEach((pre) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const button = document.createElement('button');
    button.className = 'copy-code';
    button.type = 'button';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');
    wrapper.appendChild(button);

    button.addEventListener('click', async () => {
      const code = pre.innerText;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = '已复制';
      } catch (error) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        button.textContent = '已复制';
      }
      window.setTimeout(() => { button.textContent = '复制'; }, 1600);
    });
  });

  const updateProgress = () => {
    if (!progressBar || !article) return;
    const articleTop = article.offsetTop;
    const articleHeight = article.offsetHeight;
    const viewport = window.innerHeight;
    const passed = window.scrollY - articleTop + viewport * 0.15;
    const total = Math.max(1, articleHeight - viewport * 0.7);
    const percent = Math.min(100, Math.max(0, (passed / total) * 100));
    progressBar.style.width = `${percent}%`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  const topButton = document.querySelector('#article-top');
  if (topButton) {
    const toggleTop = () => topButton.classList.toggle('show', window.scrollY > 650);
    topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', toggleTop, { passive: true });
    toggleTop();
  }
});
