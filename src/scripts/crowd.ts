// The hero's crowd. Thousands of tiny squares spell out who the work is for, scatter away from a
// cursor or finger, and funnel into the orange build cursor as the page scrolls.

import { onProgress, reducedMotion } from './scroll';

interface Word {
  text: string;
  colour: string;
  caption: string;
  points: Float32Array;
}

const FONT = '"Archivo Variable", Arial, sans-serif';

const sampleWord = (text: string, width: number, height: number, gap: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return new Float32Array();
  // Fit the width, then stretch the word to fill the height, so short phones still get tall type.
  let size = 200;
  context.font = `900 ${size}px ${FONT}`;
  size = (size * width * 0.985) / context.measureText(text).width;
  context.font = `900 ${size}px ${FONT}`;
  const metrics = context.measureText(text);
  const ink = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const stretch = Math.min(3, height / ink);
  const baseline = height / 2 + (ink / 2 - metrics.actualBoundingBoxDescent) * stretch;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.setTransform(1, 0, 0, stretch, width / 2, baseline);
  context.fillText(text, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const points: number[] = [];
  for (let y = 0; y < canvas.height; y += gap) {
    for (let x = 0; x < canvas.width; x += gap) {
      if ((pixels[(y * canvas.width + x) * 4 + 3] ?? 0) > 128) points.push(x, y);
    }
  }
  return Float32Array.from(points);
};

export const startCrowd = async () => {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const canvas = hero?.querySelector<HTMLCanvasElement>('[data-crowd]');
  const block = hero?.querySelector<HTMLElement>('[data-block]');
  const caption = hero?.querySelector<HTMLElement>('[data-caption]');
  const context = canvas?.getContext('2d');
  if (!hero || !canvas || !block || !caption || !context) return;

  const chips = Array.from(hero.querySelectorAll<HTMLElement>('[data-word]'));
  const words: Word[] = chips.map((chip) => ({
    text: chip.dataset['word'] ?? '',
    colour: chip.dataset['colour'] ?? '#ffffff',
    caption: chip.dataset['caption'] ?? '',
    points: new Float32Array(),
  }));

  // Registered before the font wait, so a reload part-way down the hero is heard straight away.
  let scrollProgress = 0;
  let afterScroll = () => {};
  onProgress(hero, (progress) => {
    scrollProgress = progress;
    block.toggleAttribute('data-solid', progress > 0.02);
    hero.toggleAttribute('data-leaving', progress > 0.2);
    afterScroll();
  });

  await document.fonts.load(`900 120px ${FONT}`).catch(() => undefined);

  const still = reducedMotion();
  let width = 0;
  let height = 0;
  let scale = 1;
  let wordTop = 0;
  let count = 0;
  let current = 0;
  let px = new Float32Array();
  let py = new Float32Array();
  let vx = new Float32Array();
  let vy = new Float32Array();
  let tx = new Float32Array();
  let ty = new Float32Array();
  let pull = new Float32Array();
  let jitterX = new Float32Array();
  let jitterY = new Float32Array();
  let order = new Uint32Array();
  let blockX = 0;
  let blockY = 0;
  let squareSize = 2;

  const assign = (index: number) => {
    const points = words[index]?.points;
    if (!points || points.length === 0) return;
    const total = points.length / 2;
    // Reshuffle so every change of word sends each square somewhere new.
    for (let i = count - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = order[i] ?? 0;
      order[i] = order[j] ?? 0;
      order[j] = swap;
    }
    for (let i = 0; i < count; i += 1) {
      // Spread the squares across the whole word, even when there are fewer squares than points.
      const point = Math.floor(((order[i] ?? 0) * total) / count) % total;
      tx[i] = points[point * 2] ?? 0;
      ty[i] = (points[point * 2 + 1] ?? 0) + wordTop;
    }
  };

  const showWord = (index: number) => {
    current = (index + words.length) % words.length;
    assign(current);
    caption.textContent = words[current]?.caption ?? '';
    chips.forEach((chip, i) => chip.toggleAttribute('data-current', i === current));
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const phone = width < 640;
    const limit = phone ? 2600 : 8000;
    const inset = phone ? 16 : Math.max(24, width * 0.035);
    const wordWidth = width - inset * 2;
    const wordHeight = phone
      ? Math.min(height * 0.4, wordWidth * 0.86)
      : Math.min(height * 0.46, wordWidth * 0.34);
    wordTop = height * (phone ? 0.47 : 0.52) - wordHeight / 2;
    // Letters cover about half their box, so this spacing lands close to the square limit.
    const gap = Math.max(3, Math.ceil(Math.sqrt((wordWidth * wordHeight * 0.55) / limit)));
    squareSize = Math.max(2, gap - 1.25);

    for (const word of words) {
      const points = sampleWord(word.text, wordWidth, wordHeight, gap);
      for (let i = 0; i < points.length; i += 2) points[i] = (points[i] ?? 0) + inset;
      word.points = points;
    }

    const most = Math.max(...words.map((word) => word.points.length / 2));
    const previous = count;
    count = Math.min(most, limit);
    if (count !== previous) {
      px = new Float32Array(count);
      py = new Float32Array(count);
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      tx = new Float32Array(count);
      ty = new Float32Array(count);
      pull = new Float32Array(count);
      jitterX = new Float32Array(count);
      jitterY = new Float32Array(count);
      order = new Uint32Array(count);
      for (let i = 0; i < count; i += 1) {
        px[i] = Math.random() * width;
        py[i] = Math.random() * height;
        pull[i] = 0.03 + Math.random() * 0.055;
        jitterX[i] = (Math.random() - 0.5) * 16;
        jitterY[i] = (Math.random() - 0.5) * 26;
        order[i] = i;
      }
    }

    const canvasRect = canvas.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    blockX = blockRect.left - canvasRect.left + blockRect.width / 2;
    blockY = blockRect.top - canvasRect.top + blockRect.height / 2;
    showWord(current);
  };

  let pointerX = -9999;
  let pointerY = -9999;
  let running = false;
  let visible = true;
  let lastSwap = performance.now();
  let holding = false;

  const draw = (colour: string) => {
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = colour;
    for (let i = 0; i < count; i += 1) {
      context.fillRect(px[i] ?? 0, py[i] ?? 0, squareSize, squareSize);
    }
  };

  const tick = (now: number) => {
    if (!running) return;
    if (!holding && now - lastSwap > 2600 && scrollProgress < 0.05) {
      lastSwap = now;
      showWord(current + 1);
    }

    // The funnel starts early and finishes before the orange block takes the screen.
    const funnel = Math.min(1, Math.max(0, (scrollProgress - 0.04) / 0.44));
    const eased = funnel * funnel * (3 - 2 * funnel);
    const reach = Math.max(width * 0.13, 110);
    const reachSquared = reach * reach;

    for (let i = 0; i < count; i += 1) {
      const homeX = (tx[i] ?? 0) + (blockX + (jitterX[i] ?? 0) - (tx[i] ?? 0)) * eased;
      const homeY = (ty[i] ?? 0) + (blockY + (jitterY[i] ?? 0) - (ty[i] ?? 0)) * eased;
      let velocityX = (vx[i] ?? 0) + (homeX - (px[i] ?? 0)) * (pull[i] ?? 0.05);
      let velocityY = (vy[i] ?? 0) + (homeY - (py[i] ?? 0)) * (pull[i] ?? 0.05);
      const dx = (px[i] ?? 0) - pointerX;
      const dy = (py[i] ?? 0) - pointerY;
      const distance = dx * dx + dy * dy;
      if (distance < reachSquared) {
        const force = (1 - distance / reachSquared) * 9;
        const length = Math.sqrt(distance) || 1;
        velocityX += (dx / length) * force;
        velocityY += (dy / length) * force;
      }
      velocityX *= 0.8;
      velocityY *= 0.8;
      vx[i] = velocityX;
      vy[i] = velocityY;
      px[i] = (px[i] ?? 0) + velocityX;
      py[i] = (py[i] ?? 0) + velocityY;
    }

    draw(words[current]?.colour ?? '#ffffff');
    window.requestAnimationFrame(tick);
  };

  const setRunning = (next: boolean) => {
    if (next === running) return;
    running = next;
    if (running) window.requestAnimationFrame(tick);
  };

  resize();

  if (still) {
    for (let i = 0; i < count; i += 1) {
      px[i] = tx[i] ?? 0;
      py[i] = ty[i] ?? 0;
    }
    draw(words[current]?.colour ?? '#ffffff');
    chips.forEach((chip, index) => {
      chip.addEventListener('focus', () => {
        showWord(index);
        for (let i = 0; i < count; i += 1) {
          px[i] = tx[i] ?? 0;
          py[i] = ty[i] ?? 0;
        }
        draw(words[current]?.colour ?? '#ffffff');
      });
    });
    return;
  }

  const stage = canvas.parentElement ?? canvas;
  const press = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
  };
  stage.addEventListener('pointermove', press, { passive: true });
  stage.addEventListener('pointerdown', press, { passive: true });
  stage.addEventListener('pointerleave', () => {
    pointerX = -9999;
    pointerY = -9999;
  });
  stage.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse') return;
    pointerX = -9999;
    pointerY = -9999;
  });
  chips.forEach((chip, index) => {
    const hold = () => {
      holding = true;
      showWord(index);
    };
    const release = () => {
      holding = false;
      lastSwap = performance.now();
    };
    chip.addEventListener('pointerenter', hold);
    chip.addEventListener('pointerleave', release);
    chip.addEventListener('focus', hold);
    chip.addEventListener('blur', release);
  });

  afterScroll = () => setRunning(visible && scrollProgress < 0.62);
  new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    setRunning(visible && scrollProgress < 0.62);
  }).observe(hero);

  let resizeTimer = 0;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    // Phone address bars change the height while scrolling; only a new width resamples the words.
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });
  afterScroll();
};
