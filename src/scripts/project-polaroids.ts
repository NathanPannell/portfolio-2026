const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const startScrollHighlights = () => {
  const deck = document.querySelector<HTMLElement>('.project-deck');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-polaroid]'));
  const essayList = document.querySelector<HTMLElement>('.essay-list');
  const essays = Array.from(document.querySelectorAll<HTMLElement>('[data-essay-item]'));

  if (!deck && !essayList) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const controller = new AbortController();
  const { signal } = controller;
  let frame = 0;

  const sectionIsVisible = (section: HTMLElement) => {
    const rect = section.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  };

  const updateCards = () => {
    if (!deck || cards.length === 0 || !sectionIsVisible(deck)) {
      cards.forEach((card) => card.removeAttribute('data-active'));
      return;
    }

    const viewportX = window.innerWidth / 2;
    const viewportY = window.innerHeight / 2;
    const horizontalWeight = window.innerWidth <= 720 ? 0.16 : 0.42;
    let nearest: HTMLElement | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const deltaX = (rect.left + rect.width / 2 - viewportX) * horizontalWeight;
      const deltaY = rect.top + rect.height / 2 - viewportY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance < nearestDistance) {
        nearest = card;
        nearestDistance = distance;
      }

      if (!card.hasAttribute('data-tilting')) {
        const normalized = clamp(deltaY / (window.innerHeight * 0.72), -1, 1);
        card.style.setProperty('--glare-x', `${index % 2 === 0 ? 38 : 62}%`);
        card.style.setProperty('--glare-y', `${clamp(50 - normalized * 28, 18, 82)}%`);
        card.style.setProperty('--sheen-position', `${clamp(50 - normalized * 44, 4, 96)}%`);
      }
    });

    cards.forEach((card) => card.toggleAttribute('data-active', card === nearest));
  };

  const updateEssays = () => {
    if (!essayList || essays.length === 0 || !sectionIsVisible(essayList)) {
      essays.forEach((essay) => essay.removeAttribute('data-active'));
      return;
    }

    const viewportY = window.innerHeight / 2;
    let nearest: HTMLElement | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    essays.forEach((essay) => {
      const rect = essay.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - viewportY);
      if (distance < nearestDistance) {
        nearest = essay;
        nearestDistance = distance;
      }
    });

    essays.forEach((essay) => essay.toggleAttribute('data-active', essay === nearest));
  };

  const update = () => {
    frame = 0;
    updateCards();
    updateEssays();
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  cards.forEach((card) => {
    card.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'mouse') return;

      window.requestAnimationFrame(() => {
        if (document.activeElement === card) card.blur();
        schedule();
      });
    }, { signal, passive: true });

    if (!finePointer.matches || reducedMotion.matches) return;

    let pointerFrame = 0;
    const resetPointer = () => {
      card.removeAttribute('data-tilting');
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      schedule();
    };

    card.addEventListener('pointermove', (event) => {
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const rect = card.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        card.setAttribute('data-tilting', '');
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 7}deg`);
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 9}deg`);
        card.style.setProperty('--glare-x', `${x * 100}%`);
        card.style.setProperty('--glare-y', `${y * 100}%`);
      });
    }, { signal, passive: true });

    card.addEventListener('pointerleave', resetPointer, { signal, passive: true });
    card.addEventListener('blur', resetPointer, { signal });
  });

  window.addEventListener('scroll', schedule, { signal, passive: true });
  window.addEventListener('resize', schedule, { signal, passive: true });
  window.addEventListener('pageshow', schedule, { signal });
  window.addEventListener('pagehide', (event) => {
    window.cancelAnimationFrame(frame);
    frame = 0;

    if (!event.persisted) controller.abort();
  }, { signal });

  update();
};

startScrollHighlights();
