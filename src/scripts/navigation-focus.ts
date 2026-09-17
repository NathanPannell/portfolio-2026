const pointerNavigationKey = 'portfolio:pointer-navigation-source';

document.addEventListener('click', (event) => {
  if (
    event.detail === 0
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest<HTMLAnchorElement>('a[href]');
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

  try {
    window.sessionStorage.setItem(pointerNavigationKey, window.location.href);
  } catch {
    // History focus cleanup is a progressive enhancement.
  }
}, { capture: true });

window.addEventListener('pageshow', (event) => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!event.persisted && navigation?.type !== 'back_forward') return;

  let pointerSource: string | null = null;
  try {
    pointerSource = window.sessionStorage.getItem(pointerNavigationKey);
  } catch {
    return;
  }

  if (pointerSource !== window.location.href) return;

  window.requestAnimationFrame(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLAnchorElement) activeElement.blur();

    try {
      window.sessionStorage.removeItem(pointerNavigationKey);
    } catch {
      // The focus state has already been cleared.
    }
  });
});
