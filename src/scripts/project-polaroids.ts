const startCardInteractions = () => {
  const deck = document.querySelector<HTMLElement>('.project-deck');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-polaroid]'));
  const essayList = document.querySelector<HTMLElement>('.essay-list');
  const essays = Array.from(document.querySelectorAll<HTMLElement>('[data-essay-item]'));

  if (cards.length === 0 && essays.length === 0) return;

  const mobileLayout = window.matchMedia('(max-width: 720px)');
  const controller = new AbortController();
  const { signal } = controller;
  let frame = 0;

  const clearActiveCard = () => {
    cards.forEach((card) => card.removeAttribute('data-active'));
  };

  const updateActiveCard = () => {
    if (!mobileLayout.matches || !deck) {
      clearActiveCard();
      return;
    }

    const deckRect = deck.getBoundingClientRect();
    if (deckRect.bottom <= 0 || deckRect.top >= window.innerHeight) {
      clearActiveCard();
      return;
    }

    const viewportX = window.innerWidth / 2;
    const viewportY = window.innerHeight / 2;
    let nearest: HTMLElement | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card) => {
      if (card.hidden || card.getClientRects().length === 0) {
        card.removeAttribute('data-active');
        return;
      }

      const rect = card.getBoundingClientRect();
      const deltaX = (rect.left + rect.width / 2 - viewportX) * 0.16;
      const deltaY = rect.top + rect.height / 2 - viewportY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance < nearestDistance) {
        nearest = card;
        nearestDistance = distance;
      }
    });

    cards.forEach((card) => card.toggleAttribute('data-active', card === nearest));
  };

  const clearActiveEssay = () => {
    essays.forEach((essay) => essay.removeAttribute('data-active'));
  };

  const updateActiveEssay = () => {
    if (!mobileLayout.matches || !essayList) {
      clearActiveEssay();
      return;
    }

    const listRect = essayList.getBoundingClientRect();
    if (listRect.bottom <= 0 || listRect.top >= window.innerHeight) {
      clearActiveEssay();
      return;
    }

    const viewportY = window.innerHeight / 2;
    let nearest: HTMLElement | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    essays.forEach((essay) => {
      if (essay.hidden || essay.getClientRects().length === 0) {
        essay.removeAttribute('data-active');
        return;
      }

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
    updateActiveCard();
    updateActiveEssay();
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
  });

  window.addEventListener('scroll', schedule, { signal, passive: true });
  window.addEventListener('resize', schedule, { signal, passive: true });
  window.addEventListener('portfolio:content-revealed', schedule, { signal });
  window.addEventListener('pageshow', schedule, { signal });
  window.addEventListener('pagehide', (event) => {
    window.cancelAnimationFrame(frame);
    frame = 0;

    if (!event.persisted) controller.abort();
  }, { signal });

  update();
};

startCardInteractions();
