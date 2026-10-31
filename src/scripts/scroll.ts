// One scroll listener for the page. Each [data-track] element gets --p, its progress through its
// own height, and any subscriber hears the same number.

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Listener = (progress: number) => void;

interface Track {
  element: HTMLElement;
  top: number;
  span: number;
  last: number;
  listeners: Listener[];
}

const tracks: Track[] = [];
let frame = 0;

const measure = () => {
  const scrollY = window.scrollY;
  for (const track of tracks) {
    const rect = track.element.getBoundingClientRect();
    track.top = rect.top + scrollY;
    track.span = Math.max(1, rect.height - window.innerHeight);
    track.last = -1;
  }
};

const update = () => {
  frame = 0;
  const scrollY = window.scrollY;
  for (const track of tracks) {
    const progress = Math.min(1, Math.max(0, (scrollY - track.top) / track.span));
    if (progress === track.last) continue;
    track.last = progress;
    track.element.style.setProperty('--p', progress.toFixed(4));
    for (const listener of track.listeners) listener(progress);
  }
};

const schedule = () => {
  if (!frame) frame = window.requestAnimationFrame(update);
};

/** Runs `listener` with the element's scroll progress, from 0 to 1. */
export const onProgress = (element: HTMLElement, listener: Listener) => {
  tracks.find((track) => track.element === element)?.listeners.push(listener);
};

export const startScroll = () => {
  if (reducedMotion()) return;
  for (const element of document.querySelectorAll<HTMLElement>('[data-track]')) {
    tracks.push({ element, top: 0, span: 1, last: -1, listeners: [] });
  }
  measure();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    schedule();
  });
  window.addEventListener('load', () => {
    measure();
    schedule();
  });
  schedule();
};

/** Re-reads every track, for scripts that change the page's height. */
export const remeasure = () => {
  measure();
  schedule();
};

export const startReveals = () => {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.toggleAttribute('data-in', true);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  targets.forEach((target) => observer.observe(target));
};

/** Plays each lazy loop only while it is on screen, and never under reduced motion. */
export const startLoops = () => {
  if (reducedMotion()) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (!entry.isIntersecting) {
          video.pause();
          continue;
        }
        if (!video.src) video.src = video.dataset['src'] ?? '';
        video.play().catch(() => {});
      }
    },
    { rootMargin: '200px 0px' },
  );
  document
    .querySelectorAll<HTMLVideoElement>('video[data-src]')
    .forEach((video) => observer.observe(video));
};
