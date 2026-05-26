const musicStorageKey = "courier-rush.musicEnabled";

type NoteName = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";

type Step = {
  melody?: string;
  bass?: string;
  kick?: boolean;
  snare?: boolean;
  hat?: boolean;
};

const noteOffsets: Record<NoteName, number> = {
  C: -9,
  "C#": -8,
  D: -7,
  "D#": -6,
  E: -5,
  F: -4,
  "F#": -3,
  G: -2,
  "G#": -1,
  A: 0,
  "A#": 1,
  B: 2
};

export class RetroMusicPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private timerId: number | null = null;
  private stepIndex = 0;
  private isPlaying = false;
  private readonly stepSeconds = 0.18;
  private readonly sequence: Step[] = [
    { melody: "E5", bass: "E2", kick: true, hat: true },
    { melody: "G5", hat: true },
    { melody: "B5", bass: "E2", snare: true, hat: true },
    { melody: "G5", hat: true },
    { melody: "D5", bass: "C2", kick: true, hat: true },
    { melody: "E5", hat: true },
    { melody: "G5", bass: "C2", snare: true, hat: true },
    { melody: "B4", hat: true },
    { melody: "C5", bass: "G2", kick: true, hat: true },
    { melody: "E5", hat: true },
    { melody: "G5", bass: "G2", snare: true, hat: true },
    { melody: "E5", hat: true },
    { melody: "B4", bass: "D2", kick: true, hat: true },
    { melody: "D5", hat: true },
    { melody: "F#5", bass: "D2", snare: true, hat: true },
    { melody: "A5", hat: true }
  ];

  mount(container: HTMLElement): void {
    const button = document.createElement("button");
    button.className = "retro-button music-toggle";
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.textContent = "♫ Музика";
    button.addEventListener("click", () => {
      void this.toggle(button);
    });
    container.appendChild(button);

    if (localStorage.getItem(musicStorageKey) === "on") {
      button.classList.add("music-ready");
      button.title = "Натисни, щоб увімкнути ретро-музику";
    }
  }

  private async toggle(button: HTMLButtonElement): Promise<void> {
    if (this.isPlaying) {
      this.stop(button);
      return;
    }
    await this.start(button);
  }

  private async start(button: HTMLButtonElement): Promise<void> {
    this.ensureAudioGraph();
    const context = this.audioContext;
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      await context.resume();
    }
    this.isPlaying = true;
    this.stepIndex = 0;
    button.classList.add("active-music");
    button.classList.remove("music-ready");
    button.setAttribute("aria-pressed", "true");
    button.textContent = "■ Музика";
    localStorage.setItem(musicStorageKey, "on");
    this.scheduleStep();
    this.timerId = window.setInterval(() => this.scheduleStep(), this.stepSeconds * 1000);
  }

  private stop(button: HTMLButtonElement): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isPlaying = false;
    button.classList.remove("active-music");
    button.classList.remove("music-ready");
    button.setAttribute("aria-pressed", "false");
    button.textContent = "♫ Музика";
    localStorage.setItem(musicStorageKey, "off");
    const context = this.audioContext;
    const gain = this.masterGain;
    if (context && gain) {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(0, context.currentTime, 0.04);
      window.setTimeout(() => {
        if (!this.isPlaying && this.audioContext && this.masterGain) {
          this.masterGain.gain.setValueAtTime(0.07, this.audioContext.currentTime);
        }
      }, 140);
    }
  }

  private ensureAudioGraph(): void {
    if (this.audioContext) {
      return;
    }
    const context = new AudioContext();
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const delay = context.createDelay(0.6);
    const delayGain = context.createGain();

    master.gain.value = 0.07;
    filter.type = "lowpass";
    filter.frequency.value = 7200;
    filter.Q.value = 0.8;
    delay.delayTime.value = 0.19;
    delayGain.gain.value = 0.17;

    filter.connect(master);
    filter.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(master);
    master.connect(context.destination);

    this.audioContext = context;
    this.masterGain = master;
    this.filterNode = filter;
    this.delayNode = delay;
    this.delayGain = delayGain;
  }

  private scheduleStep(): void {
    const context = this.audioContext;
    const destination = this.filterNode;
    if (!context || !destination) {
      return;
    }
    const step = this.sequence[this.stepIndex % this.sequence.length];
    if (!step) {
      return;
    }
    const now = context.currentTime + 0.01;
    if (step.melody) {
      this.playTone(step.melody, now, 0.12, "square", 0.055, destination);
    }
    if (step.bass) {
      this.playTone(step.bass, now, 0.16, "sawtooth", 0.038, destination);
    }
    if (step.kick) {
      this.playKick(now);
    }
    if (step.snare) {
      this.playSnare(now);
    }
    if (step.hat) {
      this.playHat(now);
    }
    this.stepIndex = (this.stepIndex + 1) % this.sequence.length;
  }

  private playTone(note: string, startTime: number, duration: number, type: OscillatorType, volume: number, destination: AudioNode): void {
    const context = this.audioContext;
    if (!context) {
      return;
    }
    const frequency = this.noteToFrequency(note);
    if (frequency === null) {
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  private playKick(startTime: number): void {
    const context = this.audioContext;
    const destination = this.filterNode;
    if (!context || !destination) {
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(110, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(45, startTime + 0.12);
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.16);
  }

  private playSnare(startTime: number): void {
    const context = this.audioContext;
    const destination = this.filterNode;
    if (!context || !destination) {
      return;
    }
    const buffer = this.createNoiseBuffer(0.08);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.9;
    gain.gain.setValueAtTime(0.07, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.08);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(startTime);
    source.stop(startTime + 0.09);
  }

  private playHat(startTime: number): void {
    const context = this.audioContext;
    const destination = this.filterNode;
    if (!context || !destination) {
      return;
    }
    const buffer = this.createNoiseBuffer(0.035);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 6200;
    gain.gain.setValueAtTime(0.035, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(startTime);
    source.stop(startTime + 0.04);
  }

  private createNoiseBuffer(durationSeconds: number): AudioBuffer {
    const context = this.audioContext;
    if (!context) {
      throw new Error("Audio context is not initialized.");
    }
    const length = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private noteToFrequency(note: string): number | null {
    const match = /^(C#|D#|F#|G#|A#|C|D|E|F|G|A|B)(\d)$/.exec(note);
    if (!match) {
      return null;
    }
    const name = match[1] as NoteName;
    const octave = Number(match[2]);
    const semitone = noteOffsets[name] + (octave - 4) * 12;
    return 440 * Math.pow(2, semitone / 12);
  }
}
