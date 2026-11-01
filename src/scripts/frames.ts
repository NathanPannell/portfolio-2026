// The page is a stack of full screens, and scrolling it belongs to the visitor. Each screen starts
// playing when it arrives, and the only help is a gentle one: when a scroll has been left alone for
// a moment, the page eases to frame the nearest screen. Any input stops that at once, whether it has
// started or not. It only follows wheel, touch and keys, so anchors and find-in-page are left where
// they land, and it leaves anywhere inside a zone taller than the screen alone.

import { reducedMotion } from './motion';

// How long a scroll has to be left alone, in milliseconds, before the page frames itself.
const IDLE = 1500;
// How long that takes, in milliseconds.
const GLIDE = 800;
// Close enough to an edge to already be there.
const ALIGNED = 3;
// How long after a wheel turn or key press a scroll has to start, to count as theirs.
const DISARM = 400;

const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

const ease = (value: number) => value * value * (3 - 2 * value);

const watchArrivals = (frames: HTMLElement[]) => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const frame = entry.target as HTMLElement;
        frame.toggleAttribute('data-here', entry.isIntersecting);
      }
    },
    // The line across the middle of the screen, so exactly one frame is ever here.
    { rootMargin: '-50% 0px -50% 0px' },
  );
  frames.forEach((frame) => observer.observe(frame));
};

/** The nearest place that frames a screen from `y`, or undefined if `y` should be left alone. */
const restingPlace = (frames: HTMLElement[], y: number) => {
  const view = window.innerHeight;
  const screen = frames[0]?.offsetHeight ?? view;
  const spans = frames.map((frame) => {
    const { top, height } = frame.getBoundingClientRect();
    return { top: top + y, bottom: top + y + height, tall: height > screen + ALIGNED };
  });
  const last = spans.at(-1);
  // The footer runs on after the last frame.
  if (!last || y + view > last.bottom + ALIGNED) return undefined;
  const inside = ({ top, bottom }: { top: number; bottom: number }) =>
    y >= top - ALIGNED && y + view <= bottom + ALIGNED;
  if (spans.some((span) => span.tall && inside(span))) return undefined;

  const places = spans.flatMap(({ top, bottom, tall }) => (tall ? [top, bottom - view] : [top]));
  const nearest = places.reduce((best, place) =>
    Math.abs(place - y) < Math.abs(best - y) ? place : best,
  );
  return Math.abs(nearest - y) <= ALIGNED ? undefined : nearest;
};

export const startFrames = () => {
  const frames = Array.from(document.querySelectorAll<HTMLElement>('[data-frame]'));
  watchArrivals(frames);
  if (reducedMotion()) return;

  let armed = false;
  let touching = false;
  let timer = 0;
  let scrolled = false;
  let disarm = 0;
  let tabbed = false;
  let glide = 0;
  let expected = 0;

  const stop = () => {
    window.cancelAnimationFrame(glide);
    glide = 0;
  };

  // Input that isn't a scroll means the page wasn't left alone after all.
  const standDown = () => {
    stop();
    armed = false;
    window.clearTimeout(timer);
  };

  // By hand, not a smooth scrollTo, so that it can be stopped dead on every browser.
  const glideTo = (top: number) => {
    stop();
    const from = window.scrollY;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = Math.min(1, (now - start) / GLIDE);
      expected = from + (top - from) * ease(elapsed);
      window.scrollTo({ top: expected, behavior: 'instant' });
      glide = elapsed < 1 ? window.requestAnimationFrame(step) : 0;
    };
    glide = window.requestAnimationFrame(step);
  };

  const frameUp = () => {
    if (!armed || touching) return;
    armed = false;
    if ((window.visualViewport?.scale ?? 1) > 1.01) return;
    if (window.getSelection()?.isCollapsed === false) return;
    const top = restingPlace(frames, window.scrollY);
    if (top !== undefined) glideTo(top);
  };

  const wait = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(frameUp, IDLE);
  };

  // Input that moved nothing, like Home at the top of the page, must not stay armed for the next
  // scroll that isn't theirs.
  const arm = () => {
    stop();
    armed = true;
    scrolled = false;
    window.clearTimeout(disarm);
    disarm = window.setTimeout(() => {
      if (!scrolled && !touching) armed = false;
    }, DISARM);
  };

  // Tabbing into a frame brings the whole frame up, not just the focused element. Only Tab: focus
  // also moves when a control opens its scene.
  document.addEventListener('focusin', (event) => {
    if (!tabbed) return;
    tabbed = false;
    const frame = (event.target as HTMLElement).closest<HTMLElement>('[data-frame]');
    const screen = frames[0]?.offsetHeight ?? window.innerHeight;
    if (!frame || frame.offsetHeight > screen + ALIGNED) return;
    // Next frame, because the browser scrolls to the focused element after this event, and smooth
    // because that takes over from the browser's own smooth scroll.
    window.requestAnimationFrame(() => {
      const top = frame.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // A press that opens a scene part way up the screen brings all of it into view.
  document.addEventListener('moment:open', (event) => {
    armed = false;
    window.clearTimeout(timer);
    const top = (event.target as HTMLElement).getBoundingClientRect().top + window.scrollY;
    if (Math.abs(top - window.scrollY) > ALIGNED) glideTo(top);
  });

  window.addEventListener(
    'wheel',
    (event) => {
      // A trackpad's stray sideways event stops a glide, and leaves a waiting settle waiting.
      if (event.ctrlKey) standDown();
      else if (event.deltaY !== 0) arm();
      else stop();
    },
    { passive: true },
  );
  // Taking hold of the page ends any plan to move it.
  window.addEventListener('pointerdown', standDown, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (SCROLL_KEYS.has(event.key)) arm();
    else standDown();
    tabbed = event.key === 'Tab';
  });
  window.addEventListener(
    'touchstart',
    () => {
      stop();
      touching = true;
    },
    { passive: true },
  );
  // A finger that has moved stays armed: the scroll it caused may already have happened by now.
  window.addEventListener(
    'touchmove',
    () => {
      stop();
      armed = true;
      window.clearTimeout(disarm);
    },
    { passive: true },
  );
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
  // A turned phone has a different page, and the old target means nothing on it. The address bar
  // only changes the height.
  let width = window.innerWidth;
  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth !== width) stop();
      width = window.innerWidth;
    },
    { passive: true },
  );
  window.addEventListener(
    'scroll',
    () => {
      // Anything else moving the page while it glides wins.
      if (glide) {
        if (Math.abs(window.scrollY - expected) > 2) stop();
        return;
      }
      scrolled = true;
      wait();
    },
    { passive: true },
  );
};
