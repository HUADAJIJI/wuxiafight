/**
 * Simple Web Audio API based sound synthesizer for Wuxia Duel
 */
export class AudioManager {
    private ctx: AudioContext | null = null;
    private windGain: GainNode | null = null;
    private windFilter: BiquadFilterNode | null = null;

    constructor() {
        // AudioContext should be initialized on user interaction
    }

    public init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.startAmbient();
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    private ambientStarted = false;

    /**
     * Synthesize a metallic sword clash sound
     * @param volume 0.0 to 1.0
     */
    public playClash(volume: number = 0.5) {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = 0.08; // 极短的持续时间

        // 主“叮”声
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(3200, now); // 保持固定高频
        
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // 只有音量在衰减

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);

        // 高频点击声 (加重起始瞬间的清脆感)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(4800, now);
        
        gain2.gain.setValueAtTime(volume * 0.4, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.02); // 极短，仅提供“叮”的敲击瞬间

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);

        osc2.start(now);
        osc2.stop(now + 0.04);
        
        // 极短的打击白噪音
        const bufferSize = this.ctx.sampleRate * 0.02;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
    }

    /**
     * Synthesize a "flesh hit" sound (Thud + Squelch)
     */
    public playHit(volume: number = 0.4) {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // 1. 沉闷的撞击声 (Thud - smoother and deeper)
        const thudOsc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thudOsc.type = 'sine'; // Use sine for a cleaner, non-explosive thud
        thudOsc.frequency.setValueAtTime(80, now); // Lower starting frequency
        thudOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        
        thudGain.gain.setValueAtTime(0, now);
        thudGain.gain.linearRampToValueAtTime(volume, now + 0.01); // Soft attack to avoid "pop"
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        thudOsc.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thudOsc.start(now);
        thudOsc.stop(now + 0.2);

        // 2. 飙血的噗嗤声 (Squelch - deeper and wetter)
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; // Use lowpass for a muffled, meaty sound
        filter.frequency.setValueAtTime(600, now); // Lower frequency
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.03); 
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.25);
    }
    public startAmbient() {
        if (this.ambientStarted) return;
        this.ambientStarted = true;
        
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Wind / Jungle (Low-frequency moving noise)
        const windSource = this.createNoiseSource(3.0);
        this.windFilter = this.ctx.createBiquadFilter();
        this.windGain = this.ctx.createGain();

        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.setValueAtTime(300, now); // Lower frequency for "whooshing"
        
        this.windGain.gain.setValueAtTime(0.05, now); // Slightly more audible base
        
        windSource.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.ctx.destination);
        windSource.start();
    }

    /**
     * Update wind audio based on visual wind strength
     */
    public updateWind(strength: number) {
        if (!this.ctx || !this.windGain || !this.windFilter) return;
        
        const now = this.ctx.currentTime;
        // Map strength (approx -0.05 to 0.15) to volume and frequency
        const normalizedStrength = Math.max(0, strength + 0.05);
        
        // Volume: 0.03 (breeze) to 0.35+ (strong gust) - Increased for immersion
        const targetVol = 0.03 + normalizedStrength * 1.8;
        this.windGain.gain.setTargetAtTime(targetVol, now, 0.2); // Smooth transition

        // Frequency: 200Hz to 600Hz (whooshing becomes higher as it gets faster)
        const targetFreq = 200 + normalizedStrength * 1500;
        this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.3);
    }

    private createNoiseSource(duration: number): AudioBufferSourceNode {
        if (!this.ctx) throw new Error("AudioContext not initialized");
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        return source;
    }
}

export const audioManager = new AudioManager();
