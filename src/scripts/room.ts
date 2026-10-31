// AI Build Night's room, from above, scrubbed by scroll from doors to close. The figures are a
// drawing of how a night runs, not a head count.

import { onProgress, reducedMotion } from './scroll';

const INK = '#0e1113';
const SIGNAL = '#ff5b23';
const GLASS = '#bfe6da';
const HARBOUR = '#1f4e5a';

interface Seat {
  x: number;
  y: number;
  laptopX: number;
  laptopY: number;
  delay: number;
  stageX: number;
  stageY: number;
}

// The clock reaches 21:00 just before the scene ends, so the last step gets some time on screen.
const CLOSE_AT = 0.93;
const minutesAt = (t: number) => Math.min(180, (t / CLOSE_AT) * 180);
// Doors at 18:00, then show-and-tell at 20:15 and close at 21:00, as on the live site.
const STEP_STARTS = [0, 0.1, 0.28, (135 / 180) * CLOSE_AT, CLOSE_AT];

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const span = (t: number, start: number, end: number) => ease(clamp((t - start) / (end - start)));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

// The room is a 100 by 100 plan; the door is on the bottom wall, the stage along the top.
const DOOR = { x: 14, y: 100 };
const TABLES = [
  { x: 14, y: 34, w: 30, h: 6 },
  { x: 56, y: 34, w: 30, h: 6 },
  { x: 14, y: 58, w: 30, h: 6 },
  { x: 56, y: 58, w: 30, h: 6 },
];

const seats: Seat[] = [];
TABLES.forEach((table, tableIndex) => {
  for (let i = 0; i < 5; i += 1) {
    for (const side of [-1, 1]) {
      const x = table.x + 3 + i * 6;
      seats.push({
        x,
        y: table.y + table.h / 2 + side * 8,
        laptopX: x - 1.6,
        laptopY: table.y + (side < 0 ? 0.6 : table.h - 2.4),
        delay: (seats.length * 37) % 11,
        stageX: 22 + ((seats.length * 7) % 56),
        stageY: 21 + ((seats.length * 3) % 3) * 3 + tableIndex * 0.4,
      });
    }
  }
});

export const startRoom = () => {
  const track = document.querySelector<HTMLElement>('[data-room]');
  const canvas = track?.querySelector<HTMLCanvasElement>('canvas');
  const clock = track?.querySelector<HTMLElement>('[data-clock]');
  const context = canvas?.getContext('2d');
  if (!track || !canvas || !clock || !context) return;
  const steps = Array.from(track.querySelectorAll<HTMLElement>('[data-step]'));

  let size = 0;
  let scale = 1;
  let progress = 0;

  const resize = () => {
    size = canvas.getBoundingClientRect().width;
    scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * scale);
    canvas.height = Math.round(size * scale);
  };

  const draw = (t: number) => {
    const u = size / 100;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, size, size);

    // Floor and walls, with a gap for the door.
    context.fillStyle = '#fbfaf6';
    context.fillRect(0, 0, size, size);
    context.strokeStyle = INK;
    context.lineWidth = Math.max(3, u * 1);
    context.beginPath();
    context.moveTo(8 * u, 99 * u);
    context.lineTo(u, 99 * u);
    context.lineTo(u, u);
    context.lineTo(99 * u, u);
    context.lineTo(99 * u, 99 * u);
    context.lineTo(20 * u, 99 * u);
    context.stroke();

    // Stage, lit for show-and-tell.
    const showing = span(t, 0.66, 0.7) * (1 - span(t, 0.84, 0.9));
    context.fillStyle = `rgba(255, 91, 35, ${0.14 + showing * 0.86})`;
    context.fillRect(30 * u, 5 * u, 40 * u, 8 * u);
    context.fillStyle = showing > 0.5 ? INK : HARBOUR;
    context.font = `600 ${Math.max(8, u * 2)}px "JetBrains Mono Variable", monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('SHOW-AND-TELL', 50 * u, 9.2 * u);

    // Tables.
    context.fillStyle = GLASS;
    context.strokeStyle = INK;
    context.lineWidth = Math.max(1.5, u * 0.35);
    for (const table of TABLES) {
      context.fillRect(table.x * u, table.y * u, table.w * u, table.h * u);
      context.strokeRect(table.x * u, table.y * u, table.w * u, table.h * u);
    }

    seats.forEach((seat, index) => {
      const lag = seat.delay / 100;
      const arrive = span(t, 0.02 + lag, 0.2 + lag);
      const toStage = span(t, 0.58 + lag * 0.4, 0.66 + lag * 0.4);
      const leave = span(t, 0.84 + lag * 0.5, 0.97 + lag * 0.3);

      // Laptops wake in a wave and each one keeps its own flicker.
      const working = span(t, 0.2 + lag, 0.3 + lag) * (1 - toStage);
      const flicker = 0.75 + 0.25 * Math.sin(t * 90 + index);
      if (working > 0) {
        context.fillStyle = SIGNAL;
        context.globalAlpha = working * flicker;
        context.fillRect(seat.laptopX * u, seat.laptopY * u, 3.2 * u, 1.8 * u);
        context.globalAlpha = 1;
      }

      let x = mix(DOOR.x, seat.x, arrive);
      let y = mix(DOOR.y, seat.y, arrive);
      x = mix(x, seat.stageX, toStage);
      y = mix(y, seat.stageY, toStage);
      x = mix(x, DOOR.x, leave);
      y = mix(y, DOOR.y + 4, leave);
      if (arrive <= 0 || leave >= 1) return;
      context.fillStyle = INK;
      context.fillRect((x - 1.1) * u, (y - 1.1) * u, 2.2 * u, 2.2 * u);
    });

    // The clock runs 18:00 to 21:00.
    const minutes = Math.round(minutesAt(t) / 5) * 5;
    const hour = 18 + Math.floor(minutes / 60);
    clock.textContent = `${hour}:${String(minutes % 60).padStart(2, '0')}`;

    const active = STEP_STARTS.filter((start) => t >= start).length - 1;
    steps.forEach((step, index) => step.toggleAttribute('data-on', index === active));
  };

  resize();

  if (reducedMotion()) {
    draw(0.5);
    steps.forEach((step) => step.toggleAttribute('data-on', true));
    return;
  }

  onProgress(track, (next) => {
    progress = next;
    draw(next);
  });
  window.addEventListener('resize', () => {
    resize();
    draw(progress);
  });
  draw(0);
};
