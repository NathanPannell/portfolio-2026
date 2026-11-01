// Not Quite My Tempo's closed screen is the game's own warm-up: a ring closes on the beat, and the one
// press that opens the scene is judged against it, in the game's words and to the game's windows. Any
// press opens it. The beat is silent, so the only sound is the visitor's own stick on the snare.

import { soundOnPress, snare } from './sound';

// The warm-up's tempo, 96 beats a minute. `.tp-tap__closing` closes once a beat.
const BEAT = 60000 / 96;
const PERFECT = 45;
const GOOD = 90;

const offBeat = (closing: HTMLElement, event: Event) => {
  const start = closing.getAnimations()[0]?.startTime;
  if (typeof start !== 'number') return 0;
  // A beat lands as the ring closes, at the end of each run. The two clocks are the same clock.
  const through = (event.timeStamp - start) % BEAT;
  return through > BEAT / 2 ? through - BEAT : through;
};

const wordFor = (off: number) => {
  const away = Math.abs(off);
  if (away <= PERFECT) return 'Perfect';
  if (away <= GOOD) return 'Good';
  return off < 0 ? 'Rushing' : 'Dragging';
};

export const startTempo = () => {
  const scene = document.querySelector<HTMLElement>('[data-tempo]');
  const control = scene?.querySelector<HTMLElement>('[data-moment-control]');
  const closing = scene?.querySelector<HTMLElement>('[data-beat]');
  const word = scene?.querySelector<HTMLElement>('[data-verdict]');
  const by = scene?.querySelector<HTMLElement>('[data-verdict-by]');
  if (!scene?.hasAttribute('data-waiting') || !control || !closing || !word || !by) return;
  soundOnPress(control, snare);

  // A press counts from when it lands, not from the click that follows it. A mouse's click waits for
  // the button to come back up, and so does the space bar.
  let pressed: number | undefined;
  const note = (event: Event) => {
    pressed = offBeat(closing, event);
  };
  control.addEventListener('pointerdown', note);
  control.addEventListener('keydown', (event) => {
    if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) note(event);
  });
  // A press with neither, like a screen reader's, is judged on the click. It has to be read before
  // the scene opens and stops the ring.
  control.addEventListener(
    'click',
    (event) => {
      pressed ??= offBeat(closing, event);
    },
    { capture: true },
  );

  scene.addEventListener(
    'moment:open',
    () => {
      const off = Math.round(pressed ?? 0);
      word.textContent = wordFor(off);
      word.dataset['word'] = word.textContent.toLowerCase();
      by.textContent = `${off > 0 ? '+' : ''}${off} ms`;
    },
    { once: true },
  );
};
