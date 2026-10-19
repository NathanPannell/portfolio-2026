const startSectionReveals = () => {
  const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-reveal-toggle]'));
  if (toggles.length === 0) return;

  const controller = new AbortController();
  const { signal } = controller;

  toggles.forEach((toggle) => {
    const listId = toggle.getAttribute('aria-controls');
    const list = listId ? document.getElementById(listId) : null;
    if (!list) return;

    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-reveal-item]'));
    const collapsedCount = Number(list.dataset.collapsedCount ?? 3);
    const label = toggle.querySelector<HTMLElement>('[data-reveal-label]');
    const allLabel = label?.textContent?.trim() || 'Show all';
    const fewerLabel =
      allLabel === 'All projects'
        ? 'Show fewer projects'
        : allLabel === 'All writing'
          ? 'Show less writing'
          : 'Show fewer';

    if (items.length <= collapsedCount) {
      toggle.hidden = true;
      return;
    }

    const sync = (expanded: boolean) => {
      items.forEach((item, index) => {
        item.hidden = !expanded && index >= collapsedCount;
        if (item.hidden) item.removeAttribute('data-active');
      });
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.toggleAttribute('data-expanded', expanded);
      if (label) label.textContent = expanded ? fewerLabel : allLabel;
      window.dispatchEvent(new CustomEvent('portfolio:content-revealed'));
    };

    toggle.addEventListener(
      'click',
      () => {
        sync(toggle.getAttribute('aria-expanded') !== 'true');
      },
      { signal },
    );

    sync(false);
  });

  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) controller.abort();
    },
    { signal },
  );
};

startSectionReveals();
