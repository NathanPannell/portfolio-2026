// The toys on the Play by the Sandbox screen: a small physics yard. They tumble in once the rainbow
// has gone and can be picked up and thrown with a mouse or a finger. The loop sleeps once everything
// has settled.

import { reducedMotion } from './motion';

interface Toy {
  element: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  turn: number;
  spin: number;
  size: number;
  held: boolean;
}

const GRAVITY = 0.55;
const BOUNCE = 0.42;
const FRICTION = 0.985;
// How long after the box opens the toys drop in, in milliseconds. The rainbow has left by then.
const DROP_AT = 1500;

export const startToys = () => {
  const yard = document.querySelector<HTMLElement>('[data-yard]');
  if (!yard) return;
  const elements = Array.from(yard.querySelectorAll<HTMLElement>('[data-toy]'));
  let width = 0;
  let floor = 0;
  let running = false;

  const measure = () => {
    width = yard.clientWidth;
    floor = yard.clientHeight - Math.min(56, yard.clientHeight * 0.16);
  };
  measure();

  const toys: Toy[] = elements.map((element, index) => {
    const size = element.offsetWidth;
    return {
      element,
      x: ((index + 0.5) / elements.length) * (width - size),
      y: floor - size,
      vx: 0,
      vy: 0,
      turn: (index % 2 === 0 ? -1 : 1) * (6 + index * 5),
      spin: 0,
      size,
      held: false,
    };
  });

  const place = (toy: Toy) => {
    toy.element.style.transform = `translate3d(${toy.x}px, ${toy.y}px, 0) rotate(${toy.turn}deg)`;
  };
  toys.forEach(place);
  if (reducedMotion()) return;

  const tick = () => {
    let moving = false;
    for (const toy of toys) {
      if (toy.held) {
        moving = true;
        continue;
      }
      toy.vy += GRAVITY;
      toy.vx *= FRICTION;
      toy.x += toy.vx;
      toy.y += toy.vy;
      toy.turn += toy.spin;
      toy.spin *= 0.97;
      const bottom = floor - toy.size;
      if (toy.y > bottom) {
        toy.y = bottom;
        toy.vy *= -BOUNCE;
        toy.vx *= 0.8;
        toy.spin = toy.vx * 0.6;
        if (Math.abs(toy.vy) < 1) toy.vy = 0;
      }
      if (toy.x < 0) {
        toy.x = 0;
        toy.vx *= -0.7;
      }
      if (toy.x > width - toy.size) {
        toy.x = width - toy.size;
        toy.vx *= -0.7;
      }
      if (Math.abs(toy.vx) > 0.05 || toy.vy !== 0 || toy.y < bottom) moving = true;
      place(toy);
    }
    if (moving) window.requestAnimationFrame(tick);
    else running = false;
  };

  const wake = () => {
    if (running) return;
    running = true;
    window.requestAnimationFrame(tick);
  };

  const dropIn = () => {
    measure();
    toys.forEach((toy, index) => {
      toy.y = -toy.size - index * 130;
      toy.vx = (index % 2 === 0 ? 1 : -1) * 1.5;
      toy.spin = (index % 2 === 0 ? 1 : -1) * 3;
    });
    wake();
  };
  yard.closest('[data-moment]')?.addEventListener('moment:open', () => {
    window.setTimeout(dropIn, DROP_AT);
  });

  for (const toy of toys) {
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let offsetX = 0;
    let offsetY = 0;

    toy.element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const rect = yard.getBoundingClientRect();
      toy.element.setPointerCapture(event.pointerId);
      toy.held = true;
      offsetX = event.clientX - rect.left - toy.x;
      offsetY = event.clientY - rect.top - toy.y;
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = event.timeStamp;
      toy.vx = 0;
      toy.vy = 0;
      wake();
    });

    toy.element.addEventListener('pointermove', (event) => {
      if (!toy.held) return;
      const rect = yard.getBoundingClientRect();
      toy.x = Math.min(width - toy.size, Math.max(0, event.clientX - rect.left - offsetX));
      toy.y = Math.min(floor - toy.size, event.clientY - rect.top - offsetY);
      const elapsed = Math.max(1, event.timeStamp - lastTime);
      toy.vx = ((event.clientX - lastX) / elapsed) * 16;
      toy.vy = ((event.clientY - lastY) / elapsed) * 16;
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = event.timeStamp;
      place(toy);
    });

    const drop = () => {
      if (!toy.held) return;
      toy.held = false;
      toy.vx = Math.max(-34, Math.min(34, toy.vx));
      toy.vy = Math.max(-34, Math.min(34, toy.vy));
      toy.spin = toy.vx * 0.7;
      wake();
    };
    toy.element.addEventListener('pointerup', drop);
    toy.element.addEventListener('pointercancel', drop);
  }

  window.addEventListener('resize', () => {
    measure();
    wake();
  });
};
