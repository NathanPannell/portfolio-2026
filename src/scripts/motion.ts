// Shared motion plumbing: resting loops and lazy video.

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Pauses the looping CSS inside each `[data-loops]` scene while it is off screen. */
export const startRests = () => {
  if (reducedMotion()) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        entry.target.toggleAttribute('data-resting', !entry.isIntersecting);
    },
    // Frames butt up against each other, and one that only touches the screen isn't on it.
    { rootMargin: '-1px 0px' },
  );
  document.querySelectorAll('[data-loops]').forEach((scene) => observer.observe(scene));
};

// Cloudflare Pages answers range requests with a plain 200, which iOS Safari refuses for video.
// A blob plays everywhere, and the poster stays up if the fetch fails.
const onScreen = new WeakSet<HTMLVideoElement>();

const playLoop = async (video: HTMLVideoElement) => {
  if (video.src && onScreen.has(video)) await video.play().catch(() => undefined);
};

const loadLoop = async (video: HTMLVideoElement) => {
  // Behind a closed screen it can't be seen, and may never be asked for.
  if (video.closest('[data-waiting]')) return;
  if (!video.src && !video.hasAttribute('data-loading')) {
    video.toggleAttribute('data-loading', true);
    // A loop with a tall cut uses it on an upright screen, the same way the game picks its own.
    const tall = window.innerHeight > window.innerWidth ? video.dataset['srcTall'] : undefined;
    const response = await fetch(tall ?? video.dataset['src'] ?? '').catch(() => undefined);
    if (!response?.ok) return;
    video.src = URL.createObjectURL(await response.blob());
  }
  // The fetch can outlast the visit, so this checks again before playing.
  await playLoop(video);
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
  document.addEventListener('moment:open', ({ target }) => {
    (target as HTMLElement)
      .querySelectorAll<HTMLVideoElement>('video[data-src]')
      .forEach((video) => void loadLoop(video));
  });
};
