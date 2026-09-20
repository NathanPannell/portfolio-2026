const startCardInteractions = () => {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-polaroid]'));

  if (cards.length === 0) return;

  const controller = new AbortController();
  const { signal } = controller;

  cards.forEach((card) => {
    card.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'mouse') return;

      window.requestAnimationFrame(() => {
        if (document.activeElement === card) card.blur();
      });
    }, { signal, passive: true });
  });

  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) controller.abort();
  }, { signal });
};

startCardInteractions();
