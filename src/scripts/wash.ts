// Touch equivalent for the index's image fill: with no hover to fill a row, the row nearest the
// middle of the screen takes the image while the list is on screen.

export const startWash = () => {
  const list = document.querySelector<HTMLElement>('[data-wash-list]');
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-wash]'));
  if (!list || rows.length === 0) return;

  const touch = window.matchMedia('(hover: none)');
  let frame = 0;

  const clear = () => rows.forEach((row) => row.removeAttribute('data-active'));

  const update = () => {
    frame = 0;
    if (!touch.matches) {
      clear();
      return;
    }
    const listRect = list.getBoundingClientRect();
    if (listRect.bottom <= 0 || listRect.top >= window.innerHeight) {
      clear();
      return;
    }
    const middle = window.innerHeight / 2;
    let nearest: HTMLElement | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - middle);
      if (distance < nearestDistance) {
        nearest = row;
        nearestDistance = distance;
      }
    }
    rows.forEach((row) => row.toggleAttribute('data-active', row === nearest));
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  touch.addEventListener('change', schedule);
  schedule();
};
