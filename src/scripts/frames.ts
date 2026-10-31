// The page is a stack of frames. Each one starts playing when it arrives, and a stopped scroll is
// guided on to the next frame in the direction it was going. The guide never touches a scroll in
// progress: wheel, touch and keys stay native, and it only acts once the page has come to rest
// after one of them, so anchors, find-in-page and Tab are left exactly where they land.

import { reducedMotion } from './motion';

// How long the page has to sit still, in milliseconds, before it counts as having stopped.
const SETTLE = 160;
// Rests this close to a frame's edge go back to that edge rather than on to the next frame.
const NUDGE = 14;
// Close enough to a frame's edge to already be there.
const ALIGNED = 3;

const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

const watchArrivals = (frames: HTMLElement[]) => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const frame = entry.target as HTMLElement;
        frame.toggleAttribute('data-here', entry.isIntersecting);
        if (entry.isIntersecting) frame.toggleAttribute('data-played', true);
        frame.dispatchEvent(new CustomEvent('frame:change', { detail: entry.isIntersecting }));
      }
    },
    // The line across the middle of the screen, so exactly one frame is ever here.
    { rootMargin: '-50% 0px -50% 0px' },
  );
  frames.forEach((frame) => observer.observe(frame));
};

/** Where the page should come to rest from `y`, or undefined if it is fine where it is. */
const restingPlace = (frames: HTMLElement[], y: number, down: boolean) => {
  const spans = frames.map((frame) => {
    const { top, height } = frame.getBoundingClientRect();
    return { top: top + y, bottom: top + y + height, height };
  });
  const index = spans.findLastIndex(({ top }) => top <= y + ALIGNED);
  const current = spans[index];
  const next = spans[index + 1];
  if (!current || !next || Math.abs(y - current.top) <= ALIGNED) return undefined;

  // Tall frames scroll freely until their end comes on screen.
  const view = window.innerHeight;
  const tall = current.height > (frames[0]?.offsetHeight ?? view) + ALIGNED;
  if (tall && y + view < current.bottom - ALIGNED) return undefined;
  const back = tall ? current.bottom - view : current.top;

  if (Math.abs(y - back) <= NUDGE) return back;
  if (Math.abs(next.top - y) <= NUDGE) return next.top;
  return down ? next.top : back;
};

export const startFrames = () => {
  const frames = Array.from(document.querySelectorAll<HTMLElement>('[data-frame]'));
  watchArrivals(frames);
  if (reducedMotion()) return;

  let armed = false;
  let touching = false;
  let down = true;
  let lastY = window.scrollY;
  let timer = 0;
  // Where the page was sent, until it gets there. Anything can interrupt a smooth scroll, and an
  // address bar moving on iOS is one of them.
  let heading: number | undefined;
  let tries = 0;

  // Keyboard focus inside a frame brings the whole frame up, not just the focused element.
  document.addEventListener('focusin', (event) => {
    const target = event.target as HTMLElement;
    const frame = target.closest<HTMLElement>('[data-frame]');
    const full = frames[0]?.offsetHeight ?? window.innerHeight;
    if (!frame || frame.offsetHeight > full + ALIGNED || !target.matches(':focus-visible')) return;
    // Next frame, because the browser scrolls to the focused element after this event.
    window.requestAnimationFrame(() => {
      const top = frame.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  const go = (top: number) => {
    heading = top;
    tries += 1;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const settle = () => {
    if (touching || (window.visualViewport?.scale ?? 1) > 1.01) return;
    if (armed) {
      armed = false;
      tries = 0;
      const top = restingPlace(frames, window.scrollY, down);
      if (top !== undefined) go(top);
    } else if (heading !== undefined) {
      if (Math.abs(window.scrollY - heading) > ALIGNED && tries < 3) go(heading);
      else heading = undefined;
    }
  };

  // Any new input from the visitor outranks where the guide was going.
  const arm = () => {
    armed = true;
    heading = undefined;
  };

  const wait = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(settle, SETTLE);
  };

  window.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey && event.deltaY !== 0) arm();
    },
    { passive: true },
  );
  window.addEventListener('keydown', (event) => {
    if (SCROLL_KEYS.has(event.key)) arm();
  });
  window.addEventListener(
    'touchstart',
    () => {
      touching = true;
    },
    { passive: true },
  );
  window.addEventListener('touchmove', arm, { passive: true });
  for (const type of ['touchend', 'touchcancel']) {
    window.addEventListener(
      type,
      () => {
        touching = false;
        wait();
      },
      { passive: true },
    );
  }
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (y !== lastY) down = y > lastY;
      lastY = y;
      wait();
    },
    { passive: true },
  );
};
