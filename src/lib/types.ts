export interface VideoState {
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
  effects: VideoEffects;
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  isRemotePlayback: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  isSeeking: boolean;
  isWaiting: boolean;
  isStalled: boolean;
  canPlay: boolean;
  canPlayThrough: boolean;
  hasLoadedMetadata: boolean;
  hasLoadedData: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  hasEnded: boolean;
  hasError: boolean;
  readyState: number;
  networkState: number;
}

export interface VideoEffects {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
  hueRotate: number;
}

export interface VideoStateOptions {
  initialPlaybackRate?: number;
  initialVolume?: number;
  initialMuted?: boolean;
  initialEffects?: VideoEffects;
} 