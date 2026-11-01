// The hero concepts and the toggle between them, a review tool: `?hero=3` links straight to one.
// It only exists on staging and local builds. See OPERATIONS.md for how to settle on one.

import { reducedMotion } from './motion';

type Stop = () => void;

const REVIEW_HOSTS = ['staging.nathanpannell.com', 'localhost', '127.0.0.1'];

// One step of the pendulum, in milliseconds, however fast the screen happens to draw.
const SWING_STEP = 1000 / 60;

// A damped pendulum. Sideways drags swing it, and up-and-down swipes stay with the page.
const startBadge = (root: HTMLElement): Stop => {
  const badge = root.querySelector<HTMLElement>('[data-badge]');
  if (!badge) return () => {};
  let angle = -26;
  let speed = 0;
  let frame = 0;
  let held = false;
  let startX = 0;
  let startAngle = 0;

  const draw = () => {
    badge.style.transform = `rotate(${angle.toFixed(2)}deg)`;
  };

  let last = 0;
  // Half a step, so frames on a 60 Hz screen don't land right on a step's edge and jitter.
  let behind = SWING_STEP / 2;
  let lastMove = 0;

  const tick = (now: number) => {
    frame = 0;
    if (held) return;
    behind = Math.min(SWING_STEP * 8, behind + now - (last || now));
    last = now;
    for (; behind >= SWING_STEP; behind -= SWING_STEP) {
      speed = (speed - angle * 0.016) * 0.975;
      angle += speed;
    }
    draw();
    if (Math.abs(angle) > 0.02 || Math.abs(speed) > 0.02) frame = requestAnimationFrame(tick);
    else {
      angle = 0;
      draw();
    }
  };

  badge.addEventListener('pointerdown', (event) => {
    if ((event.target as HTMLElement).closest('a')) return;
    held = true;
    last = 0;
    behind = SWING_STEP / 2;
    lastMove = event.timeStamp;
    startX = event.clientX;
    startAngle = angle;
    speed = 0;
    badge.setPointerCapture(event.pointerId);
  });
  badge.addEventListener('pointermove', (event) => {
    if (!held) return;
    const next = Math.max(-34, Math.min(34, startAngle - (event.clientX - startX) * 0.09));
    // Per step of the pendulum, so the same flick swings as far on any screen.
    speed = ((next - angle) / Math.max(1, event.timeStamp - lastMove)) * SWING_STEP;
    lastMove = event.timeStamp;
    angle = next;
    draw();
  });
  const letGo = () => {
    if (!held) return;
    held = false;
    if (!frame) frame = requestAnimationFrame(tick);
  };
  badge.addEventListener('pointerup', letGo);
  badge.addEventListener('pointercancel', letGo);

  draw();
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
};

// The thing a hero does when it is pressed, and then the page moves on: `press` gets the link.
const movesOnAfter = (
  links: Iterable<HTMLAnchorElement>,
  wait: number,
  press: (link: HTMLAnchorElement) => void,
): Stop => {
  const timers: number[] = [];
  for (const link of links) {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      press(link);
      timers.push(
        window.setTimeout(() => {
          // Not location.hash, which does nothing if the page is already at that address.
          window.location.href = link.href;
          link.parentElement?.removeAttribute('data-opening');
          link.removeAttribute('data-pressed');
        }, wait),
      );
    });
  }
  return () => timers.forEach((timer) => window.clearTimeout(timer));
};

const DOOR_SWING = 430;

const startSwinging = (root: HTMLElement, selector: string) =>
  movesOnAfter(root.querySelectorAll<HTMLAnchorElement>(selector), DOOR_SWING, (link) => {
    link.parentElement?.toggleAttribute('data-opening', true);
  });

// The floors count down on the display before the page goes.
const FLOOR_TIME = 170;

const startLift = (root: HTMLElement): Stop => {
  const display = root.querySelector<HTMLElement>('[data-lift-floor]');
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-floor]'));
  let ticking = 0;
  const stopMoving = movesOnAfter(links, FLOOR_TIME * 4 + 120, (link) => {
    window.clearInterval(ticking);
    links.forEach((other) => other.removeAttribute('data-pressed'));
    link.toggleAttribute('data-pressed', true);
    const floors = ['G', ...links.map((other) => other.dataset['floor'] ?? '')];
    const last = floors.indexOf(link.dataset['floor'] ?? '');
    let floor = 0;
    ticking = window.setInterval(() => {
      floor += 1;
      if (display) display.textContent = floors[floor] ?? '';
      if (floor >= last) window.clearInterval(ticking);
    }, FLOOR_TIME);
  });
  return () => {
    window.clearInterval(ticking);
    stopMoving();
  };
};

// Changes by itself every few seconds until someone reaches for the dial.
const CHANNEL_TIME = 4200;
const SNOW = 170;

const startChannels = (root: HTMLElement): Stop => {
  const set = root.querySelector<HTMLElement>('[data-channels]');
  const pictures = Array.from(root.querySelectorAll<HTMLElement>('[data-picture]'));
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-channel]'));
  const snow = root.querySelector<HTMLElement>('.tv__static');
  let on = 0;
  let timer = 0;

  const tune = (channel: number) => {
    on = channel;
    set?.toggleAttribute('data-tuning', true);
    pictures.forEach((picture, index) => picture.toggleAttribute('data-on', index === channel));
    links.forEach((link, index) => link.toggleAttribute('data-on', index === channel));
    if (!snow) return;
    // Taken off and put back, so it plays again.
    snow.removeAttribute('data-on');
    void snow.offsetWidth;
    snow.toggleAttribute('data-on', true);
  };
  const drift = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => tune((on + 1) % pictures.length), CHANNEL_TIME);
  };

  links.forEach((link, index) => {
    const reach = () => {
      window.clearInterval(timer);
      tune(index);
    };
    link.addEventListener('pointerenter', reach);
    link.addEventListener('focus', reach);
    link.addEventListener('pointerleave', drift);
  });
  tune(0);
  drift();
  const stopMoving = movesOnAfter(links, SNOW + 130, (link) => tune(links.indexOf(link)));
  return () => {
    window.clearInterval(timer);
    stopMoving();
  };
};

const FLAP_CHARACTERS = 'ABCDEFGHIJKLMNOPRSTUVWY0123456789';

const startBoard = (root: HTMLElement): Stop => {
  const flaps = Array.from(root.querySelectorAll<HTMLElement>('[data-flap]'));
  let interval = 0;
  const turning = new Map<HTMLElement, number>();

  const turn = (flap: HTMLElement, character: string) => {
    flap.textContent = character;
    // Two identical animations, so changing between them restarts it.
    flap.dataset['turn'] = flap.dataset['turn'] === 'a' ? 'b' : 'a';
  };

  const run = () => {
    for (const [flap, remaining] of turning) {
      if (remaining <= 0) {
        turn(flap, flap.dataset['flap'] ?? '');
        turning.delete(flap);
        continue;
      }
      turn(flap, FLAP_CHARACTERS[Math.floor(Math.random() * FLAP_CHARACTERS.length)] ?? 'A');
      turning.set(flap, remaining - 1);
    }
    if (turning.size > 0) return;
    window.clearInterval(interval);
    interval = 0;
  };

  const spin = (targets: HTMLElement[]) => {
    targets.forEach((flap, index) => turning.set(flap, 4 + Math.floor(index / 8)));
    if (!interval) interval = window.setInterval(run, 70);
  };

  spin(flaps);
  for (const row of root.querySelectorAll<HTMLElement>('[data-board-row]')) {
    row.addEventListener('pointerenter', () => {
      spin(Array.from(row.querySelectorAll<HTMLElement>('[data-flap]')));
    });
  }
  return () => window.clearInterval(interval);
};

const starts: Record<string, (root: HTMLElement) => Stop> = {
  doors: (root) => startSwinging(root, '.door a'),
  cards: (root) => startSwinging(root, '[data-card]'),
  badge: startBadge,
  board: startBoard,
  lift: startLift,
  channels: startChannels,
};

export const startHeroes = () => {
  const hero = document.querySelector<HTMLElement>('[data-heroes]');
  const slot = hero?.querySelector<HTMLElement>('[data-hero-slot]');
  const toggle = hero?.querySelector<HTMLElement>('[data-hero-toggle]');
  const nameLabel = hero?.querySelector<HTMLElement>('[data-hero-name]');
  if (!hero || !slot || !toggle || !nameLabel) return;

  const still = reducedMotion();
  const buttons = Array.from(toggle.querySelectorAll<HTMLElement>('[data-hero-pick]'));
  const opening = slot.dataset['heroShown'] ?? '';
  const options = new Map<string, Node>();
  options.set(opening, slot.firstElementChild?.cloneNode(true) as Node);
  for (const template of hero.querySelectorAll<HTMLTemplateElement>('template')) {
    options.set(template.dataset['heroOption'] ?? '', template.content.firstElementChild as Node);
  }

  let stop: Stop = () => {};
  const play = (id: string) => {
    stop();
    const start = starts[id];
    stop = !still && start ? start(slot) : () => {};
  };

  const reviewing = REVIEW_HOSTS.includes(window.location.hostname);
  if (!reviewing) {
    play(opening);
    return;
  }

  let playing = '';
  const show = (id: string, remember: boolean) => {
    const option = options.get(id);
    if (!option || id === playing) return;
    playing = id;
    if (slot.dataset['heroShown'] !== id) {
      stop();
      slot.replaceChildren(option.cloneNode(true));
      slot.dataset['heroShown'] = id;
    }
    play(id);
    buttons.forEach((button) => {
      const on = button.dataset['heroPick'] === id;
      button.setAttribute('aria-pressed', String(on));
      if (on) nameLabel.textContent = button.getAttribute('aria-label')?.split(': ')[1] ?? '';
    });
    if (!remember) return;
    const url = new URL(window.location.href);
    url.searchParams.set(
      'hero',
      String(buttons.findIndex((b) => b.dataset['heroPick'] === id) + 1),
    );
    window.history.replaceState(null, '', url);
  };

  const asked = Number(new URLSearchParams(window.location.search).get('hero'));
  show(buttons[asked - 1]?.dataset['heroPick'] ?? opening, false);
  toggle.hidden = false;
  buttons.forEach((button) => {
    button.addEventListener('click', () => show(button.dataset['heroPick'] ?? opening, true));
  });
};
