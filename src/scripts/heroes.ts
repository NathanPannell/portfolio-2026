// The five hero concepts and the toggle between them, a review tool: `?hero=3` links straight to one.
// It only exists on staging and local builds. See OPERATIONS.md for how to settle on one.

import { reducedMotion } from './motion';

type Stop = () => void;

const REVIEW_HOSTS = ['staging.nathanpannell.com', 'localhost', '127.0.0.1'];

const startSentence = (root: HTMLElement): Stop => {
  const clause = root.querySelector<HTMLElement>('[data-clause]');
  const links = Array.from(root.querySelectorAll<HTMLElement>('[data-clause-of]'));
  const owner = clause?.parentElement;
  if (!clause || !owner) return () => {};
  const opening = clause.textContent ?? '';
  // The opening line comes round again after the four worlds.
  const lines = [...links.map((link) => link.dataset['clauseOf'] ?? ''), opening];
  let line = -1;
  let timer = 0;

  const show = (index: number) => {
    links.forEach((link, i) => link.toggleAttribute('data-current', i === index));
    owner.style.setProperty('--clause', links[index]?.dataset['colour'] ?? 'var(--signal)');
  };

  const type = (text: string, length: number) => {
    clause.textContent = text.slice(0, length);
    timer =
      length < text.length
        ? window.setTimeout(() => type(text, length + 1), 42)
        : window.setTimeout(next, line === lines.length - 1 ? 4200 : 2400);
  };

  const erase = (text: string, length: number) => {
    clause.textContent = text.slice(0, length);
    if (length > 0) {
      timer = window.setTimeout(() => erase(text, length - 1), 18);
      return;
    }
    line = (line + 1) % lines.length;
    show(line);
    type(lines[line] ?? '', 0);
  };

  const next = () => erase(clause.textContent ?? '', (clause.textContent ?? '').length);

  timer = window.setTimeout(next, 2600);
  return () => window.clearTimeout(timer);
};

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

  const tick = () => {
    frame = 0;
    if (held) return;
    speed = (speed - angle * 0.016) * 0.975;
    angle += speed;
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
    startX = event.clientX;
    startAngle = angle;
    speed = 0;
    badge.setPointerCapture(event.pointerId);
  });
  badge.addEventListener('pointermove', (event) => {
    if (!held) return;
    const next = Math.max(-34, Math.min(34, startAngle - (event.clientX - startX) * 0.09));
    speed = next - angle;
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

// The door swings first, and the page moves on once it has.
const DOOR_SWING = 430;

const startDoors = (root: HTMLElement): Stop => {
  const timers: number[] = [];
  for (const link of root.querySelectorAll<HTMLAnchorElement>('.door a')) {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      const door = link.parentElement;
      door?.toggleAttribute('data-opening', true);
      timers.push(
        window.setTimeout(() => {
          window.location.hash = link.hash;
          door?.removeAttribute('data-opening');
        }, DOOR_SWING),
      );
    });
  }
  return () => timers.forEach((timer) => window.clearTimeout(timer));
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
  doors: startDoors,
  sentence: startSentence,
  badge: startBadge,
  board: startBoard,
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

  const show = (id: string, remember: boolean) => {
    const option = options.get(id);
    if (!option) return;
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
