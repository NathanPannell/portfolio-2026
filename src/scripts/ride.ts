// Parkdex's ride. Planting the flag sends Kip down the vine on a timer: the sky lifts away, the forest
// moves at its own speeds behind and in front, and Kip follows the vine's curve all the way to the
// clearing, where each stop swings in and scores.

const FLAGS = ['#ff5a1f', '#7a3fb0', '#1fa08d', '#f7c948', '#e0483a', '#2b6cd4'];
// As drawn in vine.svg: one full curve is 1200 tall on a tile 460 wide, swinging 84 either way.
const VINE_PERIOD = 1200 / 460;
const VINE_SWING = 84 / 460;
// How long the ride takes, and the beat the flag gets before it starts, in milliseconds.
const RIDE = 2800;
const BEAT = 520;
// Each stop's phone lands this long after the last. Parkdex.astro's --stop delays match.
const STOP_GAP = 260;
const STOP_POINTS = 12;
const PLANT_POINTS = 6;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2);

export const startRide = () => {
  const trip = document.querySelector<HTMLElement>('[data-trip]');
  const world = trip?.querySelector<HTMLElement>('[data-world]');
  const forest = trip?.querySelector<HTMLElement>('[data-forest-floor]');
  const vine = trip?.querySelector<HTMLElement>('[data-vine]');
  const rider = trip?.querySelector<HTMLElement>('[data-rider]');
  const scoreLabel = trip?.querySelector<HTMLElement>('[data-score]');
  if (!trip || !world || !forest || !vine || !rider || !scoreLabel) return;

  const layers = Array.from(trip.querySelectorAll<HTMLElement>('[data-layer]')).map((element) => ({
    element,
    speed: Number(element.dataset['layer']),
  }));
  const poses = Array.from(rider.querySelectorAll<HTMLElement>('[data-pose]'));
  const stops = trip.querySelectorAll('[data-stop]').length;

  let score = 0;
  let landed = false;

  const award = (points: number) => {
    score += points;
    scoreLabel.textContent = String(score);
    const pop = document.createElement('span');
    pop.className = 'pk-points';
    pop.textContent = `+${points}`;
    pop.style.translate = `${Math.round(Math.random() * 60 - 30)}px 0`;
    // On a timer, because a scene's animations rest while it is off screen.
    window.setTimeout(() => pop.remove(), 900);
    trip.append(pop);
  };

  // Where Kip is along the vine, in pixels from the vine's top.
  const riderDepth = () =>
    rider.getBoundingClientRect().top + rider.offsetHeight / 2 - vine.getBoundingClientRect().top;

  const place = (travelled: number) => {
    world.style.transform = `translate3d(0, ${(-travelled).toFixed(1)}px, 0)`;
    const width = vine.offsetWidth;
    const phase = (riderDepth() / (width * VINE_PERIOD)) * Math.PI * 2;
    const x = Math.sin(phase) * width * VINE_SWING;
    const lean = Math.cos(phase) * -11;
    rider.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) rotate(${lean.toFixed(1)}deg)`;
    for (const { element, speed } of layers) {
      // Each layer is two tiles tall and wraps, so it can pass at any speed.
      const tile = element.offsetHeight / 2;
      if (tile === 0) continue;
      const offset = ((travelled * speed) % tile) * -1;
      element.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
  };

  const land = (quietly: boolean) => {
    landed = true;
    place(forest.offsetTop);
    trip.removeAttribute('data-riding');
    trip.toggleAttribute('data-landed', true);
    for (let stop = 0; stop < stops; stop += 1) {
      if (quietly) score += STOP_POINTS;
      else window.setTimeout(() => award(STOP_POINTS), 500 + stop * STOP_GAP);
    }
    if (quietly) scoreLabel.textContent = String(score);
  };

  const ride = () => {
    const distance = forest.offsetTop;
    const start = performance.now();
    trip.toggleAttribute('data-riding', true);
    // Kip waves at the sky, then points the way down.
    poses.forEach((pose, index) => pose.toggleAttribute('data-on', index === 1));
    const step = (now: number) => {
      const elapsed = clamp((now - start) / RIDE);
      place(ease(elapsed) * distance);
      if (elapsed < 1) window.requestAnimationFrame(step);
      else land(false);
    };
    window.requestAnimationFrame(step);
  };

  const plant = () => {
    award(PLANT_POINTS);
    const mark = document.createElement('i');
    mark.className = 'pk-mark';
    const depth = riderDepth();
    const swing = Math.sin((depth / (vine.offsetWidth * VINE_PERIOD)) * Math.PI * 2);
    mark.style.top = `${Math.round(depth)}px`;
    mark.style.left = `${50 + swing * VINE_SWING * 100}%`;
    mark.style.setProperty('--flag', FLAGS[0] ?? '#ff5a1f');
    vine.append(mark);
    window.setTimeout(ride, BEAT);
  };

  // A scene that was already past when the page loaded has nothing left to play.
  if (trip.hasAttribute('data-settled')) {
    score = PLANT_POINTS;
    land(true);
  } else if (trip.hasAttribute('data-waiting')) {
    place(0);
    trip.addEventListener('moment:open', plant);
  } else {
    return;
  }

  window.addEventListener('resize', () => {
    if (landed) place(forest.offsetTop);
  });
};
