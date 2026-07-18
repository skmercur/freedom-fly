/**
 * AudioEngine — a tiny WebAudio synthesizer.
 *
 * Everything (SFX and the background music loop) is generated procedurally so
 * the game ships without a single audio file. The engine is a lazily-created
 * singleton because AudioContext can only be constructed in the browser and
 * only started after a user gesture.
 */

type OscType = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private enabled = true;
  private musicEnabled = true;
  private volume = 0.7;

  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;

  // Continuous flight loop (engine drone + wind), driven per-frame by the sim.
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  /** Create/resume the context. Must be called from a user gesture. */
  ensure(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.createFlightLoop();
      this.applyGains();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private applyGains(): void {
    if (!this.master || !this.musicGain || !this.sfxGain) return;
    this.master.gain.value = this.volume;
    this.sfxGain.gain.value = this.enabled ? 0.9 : 0;
    this.musicGain.gain.value = this.musicEnabled ? 0.28 : 0;
  }

  /**
   * Build the always-running engine + wind voices (silent until the sim feeds
   * them). Engine = detuned sawtooth pair through a low-pass, a piston-y
   * rumble; wind = looped white noise through a band-pass that opens with
   * airspeed. Both live under sfxGain so the SFX toggle silences them.
   */
  private createFlightLoop(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 220;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 50;
    const sub = this.ctx.createOscillator();
    sub.type = "square";
    sub.frequency.value = 50;
    sub.detune.value = 8; // slight beat against the saw = mechanical texture
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.4;
    this.engineOsc.connect(this.engineFilter);
    sub.connect(subGain).connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain).connect(this.sfxGain);
    this.engineOsc.start(t0);
    sub.start(t0);

    const seconds = 2;
    const buffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * seconds,
      this.ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.6;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    noise.connect(this.windFilter).connect(this.windGain).connect(this.sfxGain);
    noise.start(t0);
  }

  /**
   * Per-frame update from the sim. `rpmFrac` is engine rpm as a fraction of
   * redline; `speedFrac` is airspeed as a fraction of "fast". Values are eased
   * with setTargetAtTime so per-frame stepping never zipper-clicks.
   */
  setFlightAudio(rpmFrac: number, speedFrac: number): void {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    const ease = 0.06;
    const running = rpmFrac > 0.02;
    this.engineOsc.frequency.setTargetAtTime(42 + rpmFrac * 76, t, ease);
    this.engineFilter!.frequency.setTargetAtTime(160 + rpmFrac * 700, t, ease);
    this.engineGain!.gain.setTargetAtTime(
      running ? 0.07 + 0.26 * rpmFrac : 0,
      t,
      ease,
    );
    const wind = Math.min(1, speedFrac);
    this.windFilter!.frequency.setTargetAtTime(400 + wind * 1700, t, ease);
    this.windGain!.gain.setTargetAtTime(wind * wind * 0.3, t, ease);
  }

  setVolume(v: number): void {
    this.volume = v;
    this.applyGains();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyGains();
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    this.applyGains();
  }

  // --- low-level voice ----------------------------------------------------
  private voice(
    freq: number,
    dur: number,
    type: OscType,
    peak: number,
    dest: GainNode,
    when = 0,
    detune = 0,
  ): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // --- sound effects ------------------------------------------------------
  /** Collect: pitch rises with the combo for a satisfying streak feel. */
  collect(combo: number): void {
    if (!this.enabled || !this.sfxGain) return;
    const base = 520 + Math.min(combo, 24) * 26;
    this.voice(base, 0.16, "triangle", 0.5, this.sfxGain);
    this.voice(base * 1.5, 0.13, "sine", 0.3, this.sfxGain, 0.04);
  }

  hit(): void {
    if (!this.enabled || !this.sfxGain) return;
    this.voice(180, 0.3, "sawtooth", 0.6, this.sfxGain);
    this.voice(90, 0.4, "square", 0.4, this.sfxGain, 0.02);
  }

  /** Terrain impact: a hard low boom with a metallic tail. */
  crash(): void {
    if (!this.enabled || !this.sfxGain) return;
    this.voice(60, 0.9, "sine", 0.9, this.sfxGain);
    this.voice(140, 0.5, "sawtooth", 0.7, this.sfxGain, 0.01);
    this.voice(97, 0.7, "square", 0.35, this.sfxGain, 0.05);
    this.voice(310, 0.25, "sawtooth", 0.3, this.sfxGain, 0.03);
  }

  /** Wheels-on-ground thump for a successful landing. */
  touchdown(): void {
    if (!this.enabled || !this.sfxGain) return;
    this.voice(75, 0.22, "sine", 0.6, this.sfxGain);
    this.voice(220, 0.1, "triangle", 0.25, this.sfxGain, 0.02);
  }

  power(): void {
    if (!this.enabled || !this.sfxGain) return;
    [0, 0.06, 0.12].forEach((d, i) =>
      this.voice(440 * (1 + i * 0.34), 0.2, "triangle", 0.45, this.sfxGain!, d),
    );
  }

  click(): void {
    if (!this.enabled || !this.sfxGain) return;
    this.voice(660, 0.08, "square", 0.3, this.sfxGain);
  }

  gameover(): void {
    if (!this.enabled || !this.sfxGain) return;
    [523, 392, 330, 262].forEach((f, i) =>
      this.voice(f, 0.5, "sawtooth", 0.4, this.sfxGain!, i * 0.14),
    );
  }

  // --- background music ---------------------------------------------------
  private static readonly PATTERN = [
    // Am - F - C - G arpeggio (16 steps), soothing but driving.
    220, 261, 329, 261, 174, 220, 261, 220, 261, 329, 392, 329, 196, 246, 293,
    246,
  ];

  startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    this.nextNoteTime = this.ctx.currentTime;
    this.step = 0;
    // Look-ahead scheduler: queue notes slightly ahead of the clock so timing
    // stays rock-solid even if the JS timer jitters.
    this.musicTimer = setInterval(() => this.schedule(), 25);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private schedule(): void {
    if (!this.ctx || !this.musicGain) return;
    const spb = 0.16; // seconds per step (~ 94 BPM in 16ths)
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      const note = AudioEngine.PATTERN[this.step % AudioEngine.PATTERN.length];
      const when = this.nextNoteTime - this.ctx.currentTime;
      this.voice(note, 0.22, "triangle", 0.5, this.musicGain, when);
      // Soft sub-bass on the down-beats.
      if (this.step % 4 === 0)
        this.voice(note / 2, 0.4, "sine", 0.6, this.musicGain, when);
      this.step += 1;
      this.nextNoteTime += spb;
    }
  }
}

let engine: AudioEngine | null = null;

/** Get the process-wide audio engine (created on first use). */
export const audio = (): AudioEngine => {
  if (!engine) engine = new AudioEngine();
  return engine;
};
