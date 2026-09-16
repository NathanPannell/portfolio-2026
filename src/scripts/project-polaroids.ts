type MotionValue = {
  current: number;
  target: number;
  velocity: number;
};

type CardMotion = {
  element: HTMLElement;
  surface: HTMLElement;
  pointerRx: MotionValue;
  pointerRy: MotionValue;
  scrollRx: MotionValue;
  scrollRz: MotionValue;
  lift: MotionValue;
  depth: MotionValue;
  scale: MotionValue;
  glare: MotionValue;
  glareX: MotionValue;
  glareY: MotionValue;
  proximity: number;
  pointerInside: boolean;
  touching: boolean;
  rect: DOMRect | undefined;
};

const makeMotionValue = (value = 0): MotionValue => ({ current: value, target: value, velocity: 0 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const startProjectPolaroids = () => {
  const deck = document.querySelector<HTMLElement>('.project-deck');
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-polaroid]'));
  if (!deck || elements.length === 0) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return;

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const hardware = navigator as Navigator & { deviceMemory?: number };
  const liteEffects = Boolean(
    connection?.saveData ||
      (hardware.deviceMemory && hardware.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4),
  );

  if (liteEffects) document.documentElement.classList.add('effects-lite');

  const controller = new AbortController();
  const { signal } = controller;
  const cards: CardMotion[] = elements.map((element) => ({
    element,
    surface: element.querySelector<HTMLElement>('.project-polaroid__surface') ?? element,
    pointerRx: makeMotionValue(),
    pointerRy: makeMotionValue(),
    scrollRx: makeMotionValue(),
    scrollRz: makeMotionValue(),
    lift: makeMotionValue(),
    depth: makeMotionValue(),
    scale: makeMotionValue(1),
    glare: makeMotionValue(),
    glareX: makeMotionValue(50),
    glareY: makeMotionValue(50),
    proximity: 0,
    pointerInside: false,
    touching: false,
    rect: undefined,
  }));

  let frame = 0;
  let previousTime = performance.now();
  let deckVisible = false;
  let scrollDirty = true;
  let activeCard: CardMotion | undefined;
  let focusedCard: CardMotion | undefined;

  const spring = (value: MotionValue, deltaTime: number) => {
    const stiffness = 190;
    const damping = 24;
    value.velocity += ((value.target - value.current) * stiffness - value.velocity * damping) * deltaTime;
    value.current += value.velocity * deltaTime;
    return Math.abs(value.target - value.current) > 0.01 || Math.abs(value.velocity) > 0.01;
  };

  const writeCard = (card: CardMotion) => {
    const style = card.surface.style;
    style.setProperty('--pointer-rx', `${card.pointerRx.current.toFixed(3)}deg`);
    style.setProperty('--pointer-ry', `${card.pointerRy.current.toFixed(3)}deg`);
    style.setProperty('--scroll-rx', `${card.scrollRx.current.toFixed(3)}deg`);
    style.setProperty('--scroll-rz', `${card.scrollRz.current.toFixed(3)}deg`);
    style.setProperty('--motion-lift', `${card.lift.current.toFixed(3)}rem`);
    style.setProperty('--motion-depth', `${card.depth.current.toFixed(2)}px`);
    style.setProperty('--motion-scale', card.scale.current.toFixed(4));
    style.setProperty('--glare-opacity', card.glare.current.toFixed(3));
    style.setProperty('--glare-x', `${card.glareX.current.toFixed(1)}%`);
    style.setProperty('--glare-y', `${card.glareY.current.toFixed(1)}%`);
  };

  const chooseActiveCard = () => {
    if (!deckVisible || focusedCard) return;

    const firstCard = cards[0];
    if (!firstCard) return;
    const candidate = cards.reduce(
      (best, card) => (card.proximity > best.proximity ? card : best),
      firstCard,
    );
    if (!candidate || candidate.proximity < 0.08) {
      activeCard = undefined;
    } else if (!activeCard || candidate === activeCard || candidate.proximity > activeCard.proximity + 0.08) {
      activeCard = candidate;
    }

    cards.forEach((card) => card.element.toggleAttribute('data-active', card === activeCard));
  };

  const updateScrollTargets = () => {
    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight * 0.5;
    const mobile = window.innerWidth <= 720;
    const amplitude = liteEffects ? 0.35 : mobile ? 1 : 0.52;

    cards.forEach((card, index) => {
      const rect = card.element.getBoundingClientRect();
      const delta = (rect.top + rect.height / 2 - viewportCenter) / (viewportHeight * 0.58);
      const proximity = 1 - clamp(Math.abs(delta), 0, 1);
      const direction = index % 2 === 0 ? 1 : -1;

      card.proximity = proximity;
      card.scrollRx.target = clamp(-delta * 3.4, -3.4, 3.4) * amplitude;
      card.scrollRz.target = clamp(delta * 1.7 * direction, -1.7, 1.7) * amplitude;
      card.depth.target = liteEffects ? 0 : proximity * (mobile ? 13 : 8);
      card.lift.target = proximity * (mobile ? -0.34 : -0.22);
      card.scale.target = 1 + proximity * (mobile ? 0.014 : 0.009);
      if (!card.pointerInside && !card.touching) {
        card.glare.target = proximity * (mobile ? 0.24 : 0.12);
        card.glareX.target = 50;
        card.glareY.target = clamp(68 - delta * 16, 30, 72);
      }
    });

    chooseActiveCard();
    scrollDirty = false;
  };

  const animate = (time: number) => {
    frame = 0;
    const deltaTime = clamp((time - previousTime) / 1000, 0.001, 0.032);
    previousTime = time;
    if (scrollDirty) updateScrollTargets();

    let unsettled = false;
    cards.forEach((card) => {
      unsettled = spring(card.pointerRx, deltaTime) || unsettled;
      unsettled = spring(card.pointerRy, deltaTime) || unsettled;
      unsettled = spring(card.scrollRx, deltaTime) || unsettled;
      unsettled = spring(card.scrollRz, deltaTime) || unsettled;
      unsettled = spring(card.lift, deltaTime) || unsettled;
      unsettled = spring(card.depth, deltaTime) || unsettled;
      unsettled = spring(card.scale, deltaTime) || unsettled;
      unsettled = spring(card.glare, deltaTime) || unsettled;
      unsettled = spring(card.glareX, deltaTime) || unsettled;
      unsettled = spring(card.glareY, deltaTime) || unsettled;
      writeCard(card);
    });

    if (deckVisible && (unsettled || scrollDirty)) {
      frame = requestAnimationFrame(animate);
    } else {
      cards.forEach((card) => card.surface.removeAttribute('data-animating'));
    }
  };

  const ensureFrame = () => {
    if (reducedMotion.matches || frame || !deckVisible) return;
    cards.forEach((card) => card.surface.setAttribute('data-animating', ''));
    previousTime = performance.now();
    frame = requestAnimationFrame(animate);
  };

  const resetPointer = (card: CardMotion) => {
    card.pointerInside = false;
    card.touching = false;
    card.rect = undefined;
    card.pointerRx.target = 0;
    card.pointerRy.target = 0;
    card.glare.target = card.proximity * (window.innerWidth <= 720 ? 0.24 : 0.12);
    card.glareX.target = 50;
    card.glareY.target = 50;
    ensureFrame();
  };

  const updatePointer = (card: CardMotion, event: PointerEvent, touching = false) => {
    card.rect ??= card.element.getBoundingClientRect();
    const x = clamp((event.clientX - card.rect.left) / card.rect.width, 0, 1);
    const y = clamp((event.clientY - card.rect.top) / card.rect.height, 0, 1);
    const mobileCap = touching || !finePointer.matches;
    const rx = mobileCap ? 2.6 : 6;
    const ry = mobileCap ? 2.8 : 8;

    card.pointerRx.target = (0.5 - y) * rx * (liteEffects ? 0.5 : 1);
    card.pointerRy.target = (x - 0.5) * ry * (liteEffects ? 0.5 : 1);
    card.glare.target = liteEffects ? 0.14 : mobileCap ? 0.3 : 0.44;
    card.glareX.target = x * 100;
    card.glareY.target = y * 100;
    ensureFrame();
  };

  cards.forEach((card) => {
    card.element.addEventListener(
      'pointerenter',
      (event) => {
        if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
        card.pointerInside = true;
        card.rect = card.element.getBoundingClientRect();
        card.element.setAttribute('data-inspecting', '');
        updatePointer(card, event);
      },
      { signal, passive: true },
    );

    card.element.addEventListener(
      'pointermove',
      (event) => {
        if (reducedMotion.matches) return;
        if (card.touching) updatePointer(card, event, true);
        else if (card.pointerInside && finePointer.matches) updatePointer(card, event);
      },
      { signal, passive: true },
    );

    card.element.addEventListener(
      'pointerleave',
      () => {
        card.element.removeAttribute('data-inspecting');
        resetPointer(card);
      },
      { signal, passive: true },
    );

    card.element.addEventListener(
      'pointerdown',
      (event) => {
        if (reducedMotion.matches || event.pointerType === 'mouse') return;
        card.touching = true;
        card.rect = card.element.getBoundingClientRect();
        card.element.setAttribute('data-inspecting', '');
        updatePointer(card, event, true);
      },
      { signal, passive: true },
    );

    ['pointerup', 'pointercancel'].forEach((eventName) => {
      card.element.addEventListener(
        eventName,
        () => {
          card.element.removeAttribute('data-inspecting');
          resetPointer(card);
        },
        { signal, passive: true },
      );
    });

    card.element.addEventListener(
      'focusin',
      () => {
        if (reducedMotion.matches) return;
        focusedCard = card;
        activeCard = card;
        cards.forEach((item) => item.element.toggleAttribute('data-active', item === card));
        card.pointerRx.target = 0;
        card.pointerRy.target = 0;
        card.glare.target = 0.24;
        card.glareX.target = 38;
        card.glareY.target = 24;
        ensureFrame();
      },
      { signal },
    );

    card.element.addEventListener(
      'focusout',
      () => {
        focusedCard = undefined;
        scrollDirty = true;
        ensureFrame();
      },
      { signal },
    );
  });

  const observer = new IntersectionObserver(
    ([entry]) => {
      deckVisible = Boolean(entry?.isIntersecting);
      if (deckVisible) {
        scrollDirty = true;
        ensureFrame();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        cards.forEach((card) => card.surface.removeAttribute('data-animating'));
      }
    },
    { rootMargin: '35% 0px 35%' },
  );
  observer.observe(deck);

  window.addEventListener('scroll', () => {
    cards.forEach((card) => {
      card.rect = undefined;
      if (!card.touching) return;
      card.element.removeAttribute('data-inspecting');
      resetPointer(card);
    });
    scrollDirty = true;
    ensureFrame();
  }, { signal, passive: true });

  window.addEventListener('resize', () => {
    cards.forEach((card) => { card.rect = undefined; });
    scrollDirty = true;
    ensureFrame();
  }, { signal, passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      scrollDirty = true;
      ensureFrame();
    }
  }, { signal });

  const syncMotionPreference = () => {
    if (!reducedMotion.matches) {
      scrollDirty = true;
      ensureFrame();
      return;
    }
    cancelAnimationFrame(frame);
    frame = 0;
    cards.forEach((card) => {
      card.element.removeAttribute('data-active');
      card.element.removeAttribute('data-inspecting');
      card.surface.removeAttribute('data-animating');
      card.surface.removeAttribute('style');
    });
  };

  reducedMotion.addEventListener('change', syncMotionPreference, { signal });
  window.addEventListener('pageshow', () => {
    scrollDirty = true;
    ensureFrame();
  }, { signal });

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    controller.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
  }, { signal, once: true });
};

startProjectPolaroids();
