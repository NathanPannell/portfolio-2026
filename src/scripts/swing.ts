// Parkdex's four stops hang from vines. Each is a pendulum: it sways a little by itself, and swings
// properly when a pointer or finger pushes it, and a push that carries it into its neighbour passes
// on, like two people on rope swings. All of this runs on elapsed time, so a slow phone swings at the
// same speed as a fast one, only in fewer frames. Under reduced motion this never starts, so the stops
// hang still, and without it they hang still too.

import { reducedMotion } from './motion';

// How fast a vine swings for its length: a stop on a vine 700px long takes about 3 seconds there and
// back. Shorter vines swing faster, as they do.
const GRAVITY = 3000;
// How quickly a swing dies away, as a share of its speed per second.
const DRAG = 0.32;
// The sway a stop has by itself, at the phone's foot, in pixels.
const SWAY = 0.012;
const SWAY_MOST = 7;
// How much of a pointer's own speed a stop picks up, and a tap's push, in pixels a second.
const CATCH = 0.1;
const TAP = 150;
const FASTEST = 420;
// As far as a vine swings, as a share of its length. Past this a sign is hard to read.
const WIDEST = 0.1;
// Each of the two ways a neighbour can be met loses a little to the bump.
const BOUNCE = 0.8;
// The phone hangs from its sign on a short link, so it trails behind the swing and wobbles after it.
const LINK_SPEED = 7;
const LINK_DRAG = 1.6;
const LINK_TRAIL = 0.7;
// A phone trailing on its link can reach this much past its stop, in pixels.
const TRAIL_ROOM = 12;
// The physics' own step, in seconds, and the most time a frame can stand for: past that the tab was
// asleep, and nothing should jump.
const TICK = 1 / 120;
const LONGEST = 0.25;
// How long after a stop lands it wakes, in milliseconds, one after another.
const WAKE = 260;
const LANDING = 50;

const clamp = (value: number, most: number) => Math.min(most, Math.max(-most, value));

// The angle that takes a stop's foot this far to the right. Turning clockwise takes it left.
const tiltOf = (x: number, length: number) => (Math.atan(x / length) * -180) / Math.PI;

interface Stop {
  element: HTMLElement;
  phone: HTMLElement;
  // Sideways from rest at the phone's foot, in pixels, and how fast that's changing.
  x: number;
  speed: number;
  // The phone's own angle on its link, in degrees, and how fast that's changing.
  twist: number;
  spin: number;
  // The vine's length, its natural speed, and how far it can go before the screen's edge.
  length: number;
  rate: number;
  left: number;
  right: number;
  sway: number;
  phase: number;
  wakes: number;
  // The stop next along this row, and the room between them.
  next: Stop | undefined;
  gap: number;
}

const measure = (stops: Stop[], forest: HTMLElement) => {
  const parts = stops.map(({ element, phone }) => {
    const title = element.querySelector('h3') as HTMLElement;
    const wide = Math.max(title.offsetWidth, phone.offsetWidth);
    const middle = element.offsetLeft + element.offsetWidth / 2;
    return { left: middle - wide / 2, right: middle + wide / 2, top: element.offsetTop };
  });
  stops.forEach((stop, index) => {
    const part = parts[index];
    if (!part) return;
    const pivot = part.top + 40;
    stop.element.style.setProperty('--pivot', `${pivot}px`);
    stop.length = pivot + stop.element.offsetHeight;
    stop.rate = Math.sqrt(GRAVITY / stop.length);
    stop.left = Math.min(stop.length * WIDEST, Math.max(0, part.left - 6));
    stop.right = Math.min(stop.length * WIDEST, Math.max(0, forest.clientWidth - part.right - 6));
    stop.sway = Math.min(SWAY_MOST, stop.length * SWAY, stop.left, stop.right);
    const after = stops[index + 1];
    const beside = parts[index + 1];
    const sameRow = !!beside && Math.abs(beside.top - part.top) < stop.element.offsetHeight / 2;
    stop.next = sameRow ? after : undefined;
    stop.gap = sameRow && beside ? Math.max(0, beside.left - part.right - TRAIL_ROOM) : Infinity;
  });
};

/** Where a stop is at this moment: its swing, plus the sway it would have left alone. */
const place = (stop: Stop, seconds: number) =>
  stop.x + stop.sway * Math.sin(seconds * stop.rate * 0.7 + stop.phase);

const advance = (stops: Stop[], seconds: number, step: number, from: number) => {
  const now = from + seconds;
  for (const stop of stops) {
    if (now * 1000 < stop.wakes) continue;
    stop.speed += (-stop.rate * stop.rate * stop.x - DRAG * 2 * stop.speed) * step;
    stop.x += stop.speed * step;
    const at = place(stop, now);
    const tilt = tiltOf(at, stop.length);
    stop.spin +=
      (LINK_SPEED * LINK_SPEED * (-tilt * LINK_TRAIL - stop.twist) - LINK_DRAG * 2 * stop.spin) *
      step;
    stop.twist += stop.spin * step;
    if (at < -stop.left) {
      stop.x += -stop.left - at;
      stop.speed = Math.abs(stop.speed) * BOUNCE;
    } else if (at > stop.right) {
      stop.x -= at - stop.right;
      stop.speed = -Math.abs(stop.speed) * BOUNCE;
    }
  }
  for (const stop of stops) {
    const { next } = stop;
    if (!next) continue;
    const over = place(stop, now) - place(next, now) - stop.gap;
    if (over <= 0) continue;
    stop.x -= over / 2;
    next.x += over / 2;
    // Moving together, a swap changes nothing. Moving apart, they already have.
    if (stop.speed > next.speed) {
      const passed = stop.speed;
      stop.speed = next.speed * BOUNCE;
      next.speed = passed * BOUNCE;
    }
  }
};

export const startSwing = () => {
  const trip = document.querySelector<HTMLElement>('[data-trip]');
  const forest = trip?.querySelector<HTMLElement>('[data-forest-floor]');
  if (!trip || !forest || !trip.hasAttribute('data-waiting') || reducedMotion()) return;

  const stops: Stop[] = Array.from(forest.querySelectorAll<HTMLElement>('[data-stop]')).map(
    (element, index) => ({
      element,
      phone: element.querySelector('figure') as HTMLElement,
      x: 0,
      speed: 0,
      twist: 0,
      spin: 0,
      length: 1,
      rate: 1,
      left: 0,
      right: 0,
      sway: 0,
      phase: index * 2.1,
      wakes: 0,
      next: undefined,
      gap: Infinity,
    }),
  );

  const clock = performance.now();
  let last = 0;
  let frame = 0;
  let here = false;
  let landed = false;

  const draw = () => {
    const seconds = (last - clock) / 1000;
    for (const stop of stops) {
      stop.element.style.rotate = `${tiltOf(place(stop, seconds), stop.length).toFixed(3)}deg`;
      stop.phone.style.rotate = `${stop.twist.toFixed(3)}deg`;
    }
  };

  const tick = (now: number) => {
    frame = window.requestAnimationFrame(tick);
    const passed = Math.min((now - last) / 1000, LONGEST);
    const from = (now - clock) / 1000 - passed;
    for (let done = 0; done < passed; done += TICK) {
      advance(stops, done, Math.min(TICK, passed - done), from);
    }
    last = now;
    draw();
  };

  const run = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    if (!here || !landed) return;
    last = performance.now();
    frame = window.requestAnimationFrame(tick);
  };

  const push = (stop: Stop, by: number) => {
    stop.speed = clamp(stop.speed + by, FASTEST);
  };

  // Each stop comes down still swinging, one after the other.
  trip.addEventListener(
    'moment:landed',
    () => {
      landed = true;
      measure(stops, forest);
      const now = performance.now() - clock;
      stops.forEach((stop, index) => {
        stop.wakes = now + index * WAKE;
        stop.speed = (index % 2 === 0 ? 1 : -1) * LANDING;
      });
      run();
    },
    { once: true },
  );

  let lastX = 0;
  let lastAt = 0;
  forest.addEventListener(
    'pointermove',
    (event) => {
      const seconds = (event.timeStamp - lastAt) / 1000;
      const moved = event.clientX - lastX;
      lastX = event.clientX;
      lastAt = event.timeStamp;
      if (seconds <= 0 || seconds > 0.1) return;
      const element = (event.target as HTMLElement).closest<HTMLElement>('[data-stop]');
      const stop = stops.find((known) => known.element === element);
      if (stop) push(stop, (moved / seconds) * CATCH);
    },
    { passive: true },
  );

  // A tap pushes away from where it lands.
  forest.addEventListener(
    'pointerdown',
    (event) => {
      lastX = event.clientX;
      lastAt = event.timeStamp;
      const element = (event.target as HTMLElement).closest<HTMLElement>('[data-stop]');
      const stop = stops.find((known) => known.element === element);
      if (!stop || !element) return;
      const { left, width } = element.getBoundingClientRect();
      push(stop, event.clientX < left + width / 2 ? TAP : -TAP);
    },
    { passive: true },
  );

  new IntersectionObserver(([entry]) => {
    here = !!entry?.isIntersecting;
    run();
  }).observe(forest);

  window.addEventListener('resize', () => {
    if (landed) measure(stops, forest);
  });
};
