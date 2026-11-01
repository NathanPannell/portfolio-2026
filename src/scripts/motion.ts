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

/** Plays a loop that can be seen. A rotating window stacks its pictures, so being on screen isn't enough. */
export const playLoop = async (video: HTMLVideoElement) => {
  if (video.matches('[data-steps-view] figure:not([data-current]) video')) return;
  if (video.src && onScreen.has(video)) await video.play().catch(() => undefined);
};

const loadLoop = async (video: HTMLVideoElement) => {
  if (!video.src && !video.hasAttribute('data-loading')) {
    video.toggleAttribute('data-loading', true);
    const response = await fetch(video.dataset['src'] ?? '').catch(() => undefined);
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
};
