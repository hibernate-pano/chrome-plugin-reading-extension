/**
 * TTS (Text-to-Speech) Module
 * 使用 Web Speech API 朗读文章
 */

const DEFAULT_TTS_OPTIONS = {
  rate: 1.0,
  pitch: 1.0,
  voice: '',
  volume: 1.0
};

class TTSReader {
  constructor() {
    this.synth = window.speechSynthesis;
    this.utterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.onEndCallback = null;
    this.onStartCallback = null;
  }

  /**
   * 获取可用语音列表
   */
  getVoices() {
    return this.synth.getVoices();
  }

  /**
   * 获取默认语音（优先中文）
   */
  getDefaultVoice() {
    const voices = this.getVoices();
    const cnVoice = voices.find(v => v.lang.startsWith('zh'));
    if (cnVoice) return cnVoice;
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    return enVoice || voices[0] || null;
  }

  /**
   * 朗读文本
   */
  speak(text, options = {}) {
    this.stop();

    const opts = { ...DEFAULT_TTS_OPTIONS, ...options };
    
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = opts.rate;
    this.utterance.pitch = opts.pitch;
    this.utterance.volume = opts.volume;

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
      if (this.onStartCallback) this.onStartCallback();
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      if (this.onEndCallback) this.onEndCallback();
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
  pause() {
    if (this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  /**
   * 继续
   */
  resume() {
    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  /**
   * 停止
   */
  stop() {
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
  }

  /**
   * 切换播放/暂停
   */
  toggle() {
    if (this.isPlaying && !this.isPaused) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    }
  }

  /**
   * 是否正在播放
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * 设置回调
   */
  onStart(callback) {
    this.onStartCallback = callback;
  }

  onEnd(callback) {
    this.onEndCallback = callback;
  }
}

export const ttsReader = new TTSReader();
