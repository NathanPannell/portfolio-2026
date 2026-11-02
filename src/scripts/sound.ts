// Every sound on the page, made with Web Audio so there are no files to fetch. Each one follows a
// press, never a scroll or a timer. iOS keeps a new context suspended until it is resumed inside a
// gesture, and a finger only counts as one when it lifts. Anything scheduled before then waits for
// it, which is what a rope pulled by hand relies on. The phone's silent switch still silences it all.

type Draw = (context: BaseAudioContext, out: AudioNode) => void;

interface Tone {
  type: OscillatorType;
  from: number;
  to: number;
  level: number;
  at: number;
  length: number;
}

interface Burst {
  filter: BiquadFilterType;
  frequency: number;
  q?: number;
  level: number;
  at: number;
  length: number;
}

const noises = new WeakMap<BaseAudioContext, AudioBuffer>();
const papers = new WeakMap<BaseAudioContext, AudioBuffer>();

const noiseFor = (context: BaseAudioContext) => {
  const known = noises.get(context);
  if (known) return known;
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  noises.set(context, buffer);
  return buffer;
};

/** Noise that catches and lets go a few hundred times a second, like wax dragged over paper's tooth. */
const paperFor = (context: BaseAudioContext) => {
  const known = papers.get(context);
  if (known) return known;
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  const hold = Math.round(context.sampleRate / 260);
  let grip = 0;
  for (let index = 0; index < data.length; index += 1) {
    if (index % hold === 0) grip = Math.random() ** 2;
    data[index] = (Math.random() * 2 - 1) * (0.2 + grip * 0.8);
  }
  papers.set(context, buffer);
  return buffer;
};

const tone = (
  context: BaseAudioContext,
  out: AudioNode,
  { type, from, to, level, at, length }: Tone,
) => {
  const start = context.currentTime + at;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, start + length * 0.7);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(level, start + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(out);
  oscillator.start(start);
  oscillator.stop(start + length);
};

/** A short hit of filtered noise, for anything struck rather than sung. */
const burst = (
  context: BaseAudioContext,
  out: AudioNode,
  { filter, frequency, q = 0.8, level, at, length }: Burst,
) => {
  const start = context.currentTime + at;
  const source = context.createBufferSource();
  const shape = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = noiseFor(context);
  shape.type = filter;
  shape.frequency.value = frequency;
  shape.Q.value = q;
  gain.gain.setValueAtTime(level, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(shape).connect(gain).connect(out);
  source.start(start, Math.random(), length);
};

/** Noise that swells to `level` and back, for things that move past rather than hit. */
const swell = (
  context: BaseAudioContext,
  out: AudioNode,
  filter: BiquadFilterType,
  sweep: readonly number[],
  level: number,
  at: number,
  length: number,
  peak: number,
) => {
  const start = context.currentTime + at;
  const source = context.createBufferSource();
  const shape = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = noiseFor(context);
  source.loop = true;
  shape.type = filter;
  shape.Q.value = 0.7;
  shape.frequency.setValueCurveAtTime(Float32Array.from(sweep), start, length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(level, start + length * peak);
  gain.gain.linearRampToValueAtTime(0.0001, start + length);
  source.connect(shape).connect(gain).connect(out);
  source.start(start, Math.random());
  source.stop(start + length);
};

/** A slide whistle falling along the vine, with a wobble in it. */
const whistle = (
  context: BaseAudioContext,
  out: AudioNode,
  high: number,
  low: number,
  level: number,
  length: number,
) => {
  const start = context.currentTime;
  const oscillator = context.createOscillator();
  const wobble = context.createOscillator();
  const depth = context.createGain();
  const gain = context.createGain();
  const steps = 32;
  const fall = Float32Array.from({ length: steps }, (_, index) => {
    const along = index / (steps - 1);
    // The same ease as the ride, so the pitch falls fastest where Kip does.
    const eased = along < 0.5 ? 4 * along ** 3 : 1 - (-2 * along + 2) ** 3 / 2;
    return high * (low / high) ** eased;
  });
  oscillator.type = 'triangle';
  oscillator.frequency.setValueCurveAtTime(fall, start, length);
  wobble.frequency.value = 7;
  depth.gain.value = 14;
  wobble.connect(depth).connect(oscillator.detune);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(level, start + 0.12);
  gain.gain.setValueAtTime(level, start + length * 0.8);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(out);
  oscillator.start(start);
  wobble.start(start);
  oscillator.stop(start + length);
  wobble.stop(start + length);
};

// The sounds themselves, kept apart from playing them so they can be rendered and measured.

/** A deep plastic thump. The clack and higher tone are what carry on a phone's small speaker. */
export const thocc: Draw = (context, out) => {
  tone(context, out, { type: 'sine', from: 240, to: 96, level: 0.8, at: 0, length: 0.11 });
  tone(context, out, { type: 'triangle', from: 780, to: 420, level: 0.5, at: 0, length: 0.06 });
  burst(context, out, { filter: 'bandpass', frequency: 1100, level: 0.85, at: 0, length: 0.026 });
};

const RINGS = [0.14, 0.23, 0.3, 0.41, 0.49, 0.62, 0.7, 0.84, 1.02];

/** Heavy velvet going past, and the curtain rings running along their rail. */
export const curtains: Draw = (context, out) => {
  swell(context, out, 'lowpass', [260, 520, 420, 240], 1.2, 0.1, 1.35, 0.32);
  swell(context, out, 'bandpass', [700, 1900, 1300, 500], 0.42, 0.1, 1.35, 0.4);
  RINGS.forEach((at, index) => {
    const frequency = 3000 + (index % 3) * 420;
    burst(context, out, { filter: 'bandpass', frequency, q: 7, level: 0.9, at, length: 0.03 });
  });
};

/** The flag going into the dirt. */
export const plant: Draw = (context, out) => {
  tone(context, out, { type: 'sine', from: 190, to: 70, level: 0.6, at: 0, length: 0.14 });
  tone(context, out, { type: 'triangle', from: 620, to: 330, level: 0.32, at: 0, length: 0.06 });
  burst(context, out, { filter: 'lowpass', frequency: 900, level: 0.35, at: 0, length: 0.07 });
  burst(context, out, { filter: 'bandpass', frequency: 1300, level: 0.55, at: 0.05, length: 0.05 });
};

/** Down the vine and through the leaves, and a soft bump at the bottom. */
export const ride =
  (seconds: number): Draw =>
  (context, out) => {
    whistle(context, out, 1250, 240, 0.116, seconds);
    swell(
      context,
      out,
      'bandpass',
      [1800, 3200, 2400, 1500],
      0.152,
      seconds * 0.3,
      seconds * 0.7,
      0.5,
    );
    tone(context, out, {
      type: 'sine',
      from: 280,
      to: 110,
      level: 0.4,
      at: seconds,
      length: 0.1,
    });
  };

/** On down the rest of the vine. */
export const slide =
  (seconds: number): Draw =>
  (context, out) => {
    whistle(context, out, 900, 300, 0.125, seconds);
  };

/** Up off the end of the vine, over, and down on top of the sign. */
export const jump =
  (seconds: number): Draw =>
  (context, out) => {
    tone(context, out, {
      type: 'triangle',
      from: 300,
      to: 880,
      level: 0.34,
      at: 0,
      length: seconds * 0.55,
    });
    tone(context, out, {
      type: 'sine',
      from: 240,
      to: 95,
      level: 0.5,
      at: seconds,
      length: 0.1,
    });
    burst(context, out, {
      filter: 'bandpass',
      frequency: 900,
      level: 0.3,
      at: seconds,
      length: 0.03,
    });
  };

/**
 * A crayon going back and forth on paper from `at` for `length` seconds: uneven strokes, the hand
 * lifting a little at each turn, and bearing down hardest in the middle, where the rainbow is fastest.
 */
const scribble = (context: BaseAudioContext, out: AudioNode, at: number, length: number) => {
  const start = context.currentTime + at;
  const end = start + length;
  const source = context.createBufferSource();
  const body = context.createBiquadFilter();
  const edge = context.createBiquadFilter();
  const hand = context.createGain();
  source.buffer = paperFor(context);
  source.loop = true;
  body.type = 'bandpass';
  body.Q.value = 0.6;
  edge.type = 'highpass';
  edge.frequency.value = 900;
  hand.gain.setValueAtTime(0, start);
  let time = start;
  let rising = true;
  while (time < end) {
    const stroke = Math.min(0.07 + Math.random() * 0.1, end - time);
    const along = (time - start + stroke / 2) / length;
    const weight = 0.18 + 0.34 * Math.sin(Math.PI * along) ** 1.5;
    const pressure = weight * (0.75 + Math.random() * 0.5);
    // Up the page the crayon bites a little higher than on the way back.
    body.frequency.setValueAtTime(rising ? 2600 : 3400, time);
    body.frequency.linearRampToValueAtTime(rising ? 3400 : 2600, time + stroke);
    hand.gain.setValueAtTime(0.0001, time);
    hand.gain.linearRampToValueAtTime(pressure, time + stroke * 0.25);
    hand.gain.linearRampToValueAtTime(pressure * 0.7, time + stroke * 0.8);
    hand.gain.linearRampToValueAtTime(0.0001, time + stroke);
    time += stroke + 0.008 + Math.random() * 0.03;
    rising = !rising;
  }
  source.connect(edge).connect(body).connect(hand).connect(out);
  source.start(start, Math.random());
  source.stop(end + 0.05);
};

const CRAYONS = [0.05, 0.09, 0.14, 0.17, 0.23, 0.29, 0.36];

/** The lid, the crayons jumping out, and a crayon scribbling as the rainbow crosses. */
export const toyBox: Draw = (context, out) => {
  tone(context, out, { type: 'triangle', from: 170, to: 90, level: 0.5, at: 0, length: 0.12 });
  burst(context, out, { filter: 'lowpass', frequency: 1100, level: 0.3, at: 0, length: 0.06 });
  CRAYONS.forEach((at, index) => {
    const frequency = 1700 + (index % 4) * 330;
    burst(context, out, { filter: 'bandpass', frequency, q: 4, level: 0.5, at, length: 0.018 });
  });
  scribble(context, out, 0.2, 1.95);
};

/** A stick on the snare: the crack, the wires, the shell, and the empty room after it. */
export const snare: Draw = (context, out) => {
  burst(context, out, { filter: 'highpass', frequency: 1400, level: 0.8, at: 0, length: 0.19 });
  burst(context, out, { filter: 'bandpass', frequency: 4200, level: 0.55, at: 0, length: 0.05 });
  tone(context, out, { type: 'triangle', from: 250, to: 165, level: 0.65, at: 0, length: 0.09 });
  burst(context, out, { filter: 'bandpass', frequency: 800, level: 0.1, at: 0.05, length: 0.5 });
};

let context: AudioContext | undefined;

const resume = () => {
  if (context?.state === 'running') return;
  void context?.resume();
};

const awake = () => {
  if (context) return context;
  // Not every browser has Web Audio, and the page doesn't need it.
  if (typeof AudioContext === 'undefined') return undefined;
  context = new AudioContext();
  for (const type of ['pointerup', 'touchend', 'click', 'keydown']) {
    window.addEventListener(type, resume, { passive: true });
  }
  return context;
};

export const play = (draw: Draw, level = 0.72) => {
  try {
    const room = awake();
    if (!room) return;
    resume();
    const out = room.createGain();
    out.gain.value = level;
    out.connect(room.destination);
    draw(room, out);
  } catch (error) {
    console.error(error);
  }
};

/** Sounds a control the moment it is struck, for the two that are struck rather than pulled. */
export const soundOnPress = (control: HTMLElement, draw: Draw) => {
  let struck = false;

  const strike = () => {
    struck = true;
    play(draw);
  };

  // A mouse can sound on the way down. A finger only counts as a gesture for audio when it lifts,
  // which is the click, and so does the keyboard.
  control.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    strike();
    // After the click, if there is one. A press dragged off the control has none.
    window.addEventListener(
      'pointerup',
      () => {
        window.setTimeout(() => {
          struck = false;
        });
      },
      { once: true },
    );
  });
  control.addEventListener('click', () => {
    if (!struck) strike();
  });
};

export const startSounds = () => {
  document.querySelector('[data-curtains]')?.addEventListener('moment:open', () => play(curtains));
  document.querySelector('[data-toy-box]')?.addEventListener('moment:open', () => play(toyBox));
};
