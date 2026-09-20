const startHeroPrintRotation = () => {
  const stack = document.querySelector<HTMLElement>('.hero__prints');
  const prints = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-print]'));
  const toggle = document.querySelector<HTMLButtonElement>('[data-hero-print-toggle]');

  if (!stack || prints.length < 2) return;

  const mobileLayout = window.matchMedia('(max-width: 720px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const { signal } = controller;
  let activeIndex = 0;
  let timer = 0;
  let isVisible = true;
  let isInteracting = false;
  let userPaused = false;

  const show = (index: number) => {
    activeIndex = index % prints.length;
    prints.forEach((print, printIndex) => {
      print.toggleAttribute('data-hero-front', printIndex === activeIndex);
    });
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };

  const start = () => {
    stop();
    if (!mobileLayout.matches || reducedMotion.matches || document.hidden || !isVisible || isInteracting || userPaused) return;
    timer = window.setInterval(() => show(activeIndex + 1), 5000);
  };

  const sync = () => {
    if (!mobileLayout.matches) {
      prints.forEach((print) => print.removeAttribute('data-hero-front'));
      stop();
      return;
    }

    show(activeIndex);
    start();
  };

  prints.forEach((print, index) => {
    print.addEventListener('focus', () => show(index), { signal });
  });
  stack.addEventListener('focusin', (event) => {
    if (event.target === toggle) return;
    isInteracting = true;
    stop();
  }, { signal });
  stack.addEventListener('focusout', (event) => {
    if (event.target === toggle || event.relatedTarget === toggle) {
      isInteracting = false;
      start();
      return;
    }
    if (event.relatedTarget instanceof Node && stack.contains(event.relatedTarget)) return;
    isInteracting = false;
    start();
  }, { signal });
  stack.addEventListener('pointerenter', () => {
    isInteracting = true;
    stop();
  }, { signal });
  stack.addEventListener('pointerleave', () => {
    isInteracting = stack.contains(document.activeElement) && document.activeElement !== toggle;
    start();
  }, { signal });
  toggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    toggle.toggleAttribute('data-paused', userPaused);
    toggle.setAttribute('aria-pressed', String(userPaused));
    toggle.setAttribute('aria-label', userPaused ? 'Resume rotating photos' : 'Pause rotating photos');
    if (userPaused) stop();
    else start();
  }, { signal });
  document.addEventListener('visibilitychange', start, { signal });
  mobileLayout.addEventListener('change', sync, { signal });
  reducedMotion.addEventListener('change', sync, { signal });
  window.addEventListener('pageshow', sync, { signal });
  window.addEventListener('pagehide', (event) => {
    stop();
    if (!event.persisted) controller.abort();
  }, { signal });

  const observer = new IntersectionObserver(([entry]) => {
    isVisible = entry?.isIntersecting ?? false;
    start();
  }, { threshold: 0.01 });
  observer.observe(stack);
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });

  sync();
};

startHeroPrintRotation();
