/**
 * Simple Web Audio API based sound synthesizer for Wuxia Duel
 */
export class AudioManager {
    private ctx: AudioContext | null = null;

    constructor() {
        // AudioContext should be initialized on user interaction
    }

    private init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

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
        
        // 1. 沉闷的撞击声 (Thud)
        const thudOsc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thudOsc.type = 'triangle';
        thudOsc.frequency.setValueAtTime(120, now);
        thudOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        
        thudGain.gain.setValueAtTime(volume, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        thudOsc.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thudOsc.start(now);
        thudOsc.stop(now + 0.15);

        // 2. 飙血的噗嗤声 (Squelch/Splatter)
        // 使用带通滤波的白噪音
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);
        filter.Q.setValueAtTime(1.0, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(volume * 0.6, now + 0.02); // 稍微延迟一点点达到峰值
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.2);
    }
}

export const audioManager = new AudioManager();
