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
    // A pinned stage lets go when its own bottom meets the track's, whatever the address bar is doing.
    const stage = track.element.querySelector<HTMLElement>('[data-stage]');
    track.top = rect.top + scrollY;
    track.span = Math.max(1, rect.height - (stage?.offsetHeight ?? window.innerHeight));
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
  // Keyboard focus inside a pinned scene jumps to the point where its links can be seen.
  document.addEventListener('focusin', (event) => {
    const target = event.target as HTMLElement;
    const scene = target.closest<HTMLElement>('[data-focus-at]');
    const track = tracks.find(({ element }) => element === scene);
    if (!track || !target.matches(':focus-visible')) return;
    const at = Number(track.element.dataset['focusAt']);
    // Next frame, because the browser scrolls to the focused element after this event.
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: track.top + track.span * at, behavior: 'instant' });
    });
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    schedule();
  });
  // Late fonts and images move everything below them, so the tracks follow the page's height.
  new ResizeObserver(() => {
    measure();
    schedule();
  }).observe(document.body);
  schedule();
};

export const startReveals = () => {
  document.documentElement.classList.add('reveals');
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

/** Pauses the looping CSS inside each `[data-loops]` scene while it is off screen. */
export const startRests = () => {
  if (reducedMotion()) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries)
      entry.target.toggleAttribute('data-resting', !entry.isIntersecting);
  });
  document.querySelectorAll('[data-loops]').forEach((scene) => observer.observe(scene));
};

// Cloudflare Pages answers range requests with a plain 200, which iOS Safari refuses for video.
// A blob plays everywhere, and the poster stays up if the fetch fails.
const onScreen = new WeakSet<HTMLVideoElement>();

const loadLoop = async (video: HTMLVideoElement) => {
  if (!video.src && !video.hasAttribute('data-loading')) {
    video.toggleAttribute('data-loading', true);
    const response = await fetch(video.dataset['src'] ?? '').catch(() => undefined);
    if (!response?.ok) return;
    video.src = URL.createObjectURL(await response.blob());
  }
  // The fetch can outlast the visit, so check again before playing.
  if (video.src && onScreen.has(video)) await video.play().catch(() => undefined);
};

/** Plays each lazy loop only while it is on screen, and never under reduced motion. */
export const startLoops = () => {
  if (reducedMotion()) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (!entry.isIntersecting) {
          onScreen.delete(video);
          video.pause();
          continue;
        }
        onScreen.add(video);
        void loadLoop(video);
      }
    },
    { rootMargin: '200px 0px' },
  );
  document
    .querySelectorAll<HTMLVideoElement>('video[data-src]')
    .forEach((video) => observer.observe(video));
};
