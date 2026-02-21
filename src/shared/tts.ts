/**
 * TTS (Text-to-Speech) Module
 * 使用 Web Speech API 朗读文章
 */

export interface TTSOptions {
  rate: number;      // 0.1 - 10
  pitch: number;    // 0 - 2
  voice: string;    // voice URI
  volume: number;   // 0 - 1
}

const DEFAULT_TTS_OPTIONS: TTSOptions = {
  rate: 1.0,
  pitch: 1.0,
  voice: '',
  volume: 1.0
};

class TTSReader {
  constructor() {
    this.synth = window.speechSynthesis;
    this.utterance: SpeechSynthesisUtterance | null = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.onEndCallback: (() => void) | null = null;
    this.onStartCallback: (() => void) | null = null;
  }

  /**
   * 获取可用语音列表
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  /**
   * 获取默认语音（优先中文）
   */
  getDefaultVoice(): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    // 优先中文语音
    const cnVoice = voices.find(v => v.lang.startsWith('zh'));
    if (cnVoice) return cnVoice;
    // 其次英文
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    return enVoice || voices[0] || null;
  }

  /**
   * 朗读文本
   */
  speak(text: string, options: Partial<TTSOptions> = {}): void {
    this.stop();

    const opts = { ...DEFAULT_TTS_OPTIONS, ...options };
    
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = opts.rate;
    this.utterance.pitch = opts.pitch;
    this.utterance.volume = opts.volume;

    // 设置语音
    if (opts.voice) {
      const voice = this.getVoices().find(v => v.voiceURI === opts.voice);
      if (voice) this.utterance.voice = voice;
    } else {
      const defaultVoice = this.getDefaultVoice();
      if (defaultVoice) this.utterance.voice = defaultVoice;
    }

    this.utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.onStartCallback?.();
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.onEndCallback?.();
    };

    this.utterance.onerror = () => {
      this.isPlaying = false;
      this.isPaused = false;
    };

    this.synth.speak(this.utterance);
  }

  /**
   * 暂停
   */
  pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  /**
   * 继续
   */
  resume(): void {
    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  /**
   * 停止
   */
  stop(): void {
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
  }

  /**
   * 切换播放/暂停
   */
  toggle(): void {
    if (this.isPlaying && !this.isPaused) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    }
  }

  /**
   * 是否正在播放
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 是否暂停
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * 设置回调
   */
  onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }
}

export const ttsReader = new TTSReader();
