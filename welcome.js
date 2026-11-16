(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const onboarding = document.getElementById('onboarding');
  const dots = document.getElementById('dots');
  const progress = document.getElementById('progressFill');
  const prev = document.getElementById('prevBtn');
  const next = document.getElementById('nextBtn');
  const skip = document.getElementById('skipBtn');
  const SLIDE_MS = 6000;
  let current = 0;
  let startX = 0;
  let timer = null;

  if (!slides.length) return;

  // Keep local images as the first choice. If a host does not deploy the
  // images folder correctly, use the matching online fallback instead.
  const imageFallbacks = {
    'welcome-bg.jpg': 'https://files.manuscdn.com/search-media/310519664080918235/gBoqnpmfqZuKQ8LN73tzbE/BKEzHJwq9KQAgfiMxz427F.jpg',
    'security.jpg': 'https://files.manuscdn.com/search-media/310519664080918235/gBoqnpmfqZuKQ8LN73tzbE/9iiizTtRcWtgPY3VdNYNUF.jpg',
    'calls.jpg': 'https://files.manuscdn.com/search-media/310519664080918235/gBoqnpmfqZuKQ8LN73tzbE/qTaVDFuizEoXCwLirjPjYK.jpg',
    'groups.jpg': 'https://files.manuscdn.com/search-media/310519664080918235/gBoqnpmfqZuKQ8LN73tzbE/w6gmxKP4temawnD8gzgLzU.jpg',
    'founders.jpg': 'https://files.manuscdn.com/search-media/310519664080918235/gBoqnpmfqZuKQ8LN73tzbE/e3eRaSb9ox3xQJK6FxQaWi.jpg',
    'logo.jpg': 'https://files.manuscdn.com/search-media/310519664080918235/gBoqnpmfqZuKQ8LN73tzbE/BKEzHJwq9KQAgfiMxz427F.jpg'
  };

  document.querySelectorAll('img[src^="images/"]').forEach((image) => {
    image.loading = 'eager';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      const name = image.getAttribute('src').split('/').pop();
      const fallback = imageFallbacks[name];
      if (fallback && image.dataset.fallback !== 'used') {
        image.dataset.fallback = 'used';
        image.src = fallback;
      }
    }, { once: false });
    if (image.complete && image.naturalWidth === 0) image.dispatchEvent(new Event('error'));
  });

  function restartTimer() {
    window.clearTimeout(timer);
    timer = null;
    if (current < slides.length - 1) timer = window.setTimeout(() => goTo(current + 1), SLIDE_MS);
  }

  function render() {
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === current);
      slide.setAttribute('aria-hidden', index === current ? 'false' : 'true');
    });
    onboarding?.classList.toggle('is-last', current === slides.length - 1);
    [...(dots?.children || [])].forEach((dot, index) => {
      dot.classList.toggle('is-active', index === current);
      dot.setAttribute('aria-selected', index === current ? 'true' : 'false');
    });
    if (progress) {
      progress.classList.remove('is-running');
      progress.style.width = `${((current + 1) / slides.length) * 100}%`;
      if (current < slides.length - 1) {
        void progress.offsetWidth;
        progress.style.setProperty('--slide-ms', `${SLIDE_MS}ms`);
        progress.classList.add('is-running');
      }
    }
    if (prev) prev.disabled = current === 0;
    if (next) next.setAttribute('aria-label', current === slides.length - 1 ? 'Back to first slide' : 'Next slide');
    restartTimer();
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, slides.length - 1));
    render();
  }

  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    dot.addEventListener('click', () => goTo(index));
    dots?.appendChild(dot);
  });

  prev?.addEventListener('click', () => goTo(current - 1));
  next?.addEventListener('click', () => goTo(current === slides.length - 1 ? 0 : current + 1));
  skip?.addEventListener('click', () => goTo(slides.length - 1));

  const container = document.getElementById('slides');
  container?.addEventListener('touchstart', (event) => {
    startX = event.changedTouches[0].screenX;
  }, { passive: true });
  container?.addEventListener('touchend', (event) => {
    const distance = event.changedTouches[0].screenX - startX;
    if (Math.abs(distance) >= 45) goTo(distance < 0 ? current + 1 : current - 1);
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') goTo(current + 1);
    if (event.key === 'ArrowLeft') goTo(current - 1);
  });

  render();
})();
