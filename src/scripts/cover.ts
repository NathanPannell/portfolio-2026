// AI Build Night's cover. Its cursor is where the live site opens out from, and its Enter key thoccs.

// A deep plastic thump with a short clack on top, made here so there is no file to fetch. The clack
// and the higher tone are what carry on a phone speaker, which can't play the thump at all.
const thocc = (context: AudioContext) => {
  const now = context.currentTime;
  const out = context.createGain();
  out.gain.value = 0.72;
  out.connect(context.destination);

  const thump = (type: OscillatorType, from: number, to: number, level: number, length: number) => {
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = type;
    tone.frequency.setValueAtTime(from, now);
    tone.frequency.exponentialRampToValueAtTime(to, now + length * 0.7);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    tone.connect(gain).connect(out);
    tone.start(now);
    tone.stop(now + length);
  };
  thump('sine', 240, 96, 0.8, 0.11);
  thump('triangle', 780, 420, 0.5, 0.06);

  const samples = Math.ceil(context.sampleRate * 0.026);
  const noise = context.createBuffer(1, samples, context.sampleRate);
  const data = noise.getChannelData(0);
  for (let index = 0; index < samples; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / samples) ** 2;
  }
  const clack = context.createBufferSource();
  const band = context.createBiquadFilter();
  const level = context.createGain();
  clack.buffer = noise;
  band.type = 'bandpass';
  band.frequency.value = 1100;
  band.Q.value = 0.8;
  level.gain.value = 0.85;
  clack.connect(band).connect(level).connect(out);
  clack.start(now);
};

const startKey = (key: HTMLElement) => {
  let context: AudioContext | undefined;
  let struck = false;

  const strike = () => {
    struck = true;
    try {
      context ??= new AudioContext();
      // iOS leaves a new context suspended until it is resumed inside the visitor's gesture.
      void context.resume();
      thocc(context);
    } catch (error) {
      console.error(error);
    }
  };

  // A mouse can sound on the way down. A finger only counts as a gesture for audio when it lifts,
  // which is the click, and so does the keyboard.
  key.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') strike();
  });
  key.addEventListener('click', () => {
    if (!struck) strike();
  });
};

export const startCover = () => {
  const cover = document.querySelector<HTMLElement>('[data-cover]');
  const cursor = cover?.querySelector<HTMLElement>('[data-cursor]');
  const key = cover?.querySelector<HTMLElement>('[data-moment-control]');
  if (!cover || !cursor || !key || !cover.hasAttribute('data-waiting')) return;
  startKey(key);

  const measure = () => {
    if (!cover.hasAttribute('data-waiting')) return;
    const box = cover.getBoundingClientRect();
    const mark = cursor.getBoundingClientRect();
    const sides = [mark.top - box.top, box.right - mark.right, box.bottom - mark.bottom];
    const inset = [...sides, mark.left - box.left].map((side) => `${side.toFixed(1)}px`);
    cover.style.setProperty('--cursor', inset.join(' '));
  };
  measure();
  void document.fonts.ready.then(measure);
  window.addEventListener('resize', measure);

  // The strip of captures scrolls past the edge of its window, where lazy images wouldn't load.
  cover.addEventListener('moment:open', () => {
    cover.querySelectorAll('img').forEach((image) => {
      image.loading = 'eager';
    });
  });
};
